import { Router } from "express";
import { z } from "zod";
import { pool } from "../db/pool";
import { requireAuth, requireRole } from "../middleware/auth";
import { writeAuditLog } from "../middleware/auditLog";
import { randomCode } from "../utils/codes";

const router = Router();

function rowToInspection(row: any) {
  return {
    id: row.id,
    inspectionCode: row.inspection_code,
    borewellId: row.borewell_id,
    assignedInspectorId: row.assigned_inspector_id,
    assignedInspectorName: row.assigned_inspector_name,
    priority: row.priority,
    instructions: row.instructions,
    assignedDate: row.assigned_date,
    dueDate: row.due_date,
    completedDate: row.completed_date,
    status: row.status,
    checklist: row.checklist,
    observations: row.observations,
    result: row.result,
    reviewerComments: row.reviewer_comments,
  };
}

// GET /api/inspections?status=&inspector=
router.get("/", requireAuth, async (req, res) => {
  const { status, inspector, borewellId } = req.query as Record<string, string | undefined>;
  const clauses: string[] = [];
  const params: any[] = [];
  if (status) { params.push(status); clauses.push(`status = $${params.length}`); }
  if (inspector) { params.push(inspector); clauses.push(`assigned_inspector_name = $${params.length}`); }
  if (borewellId) { params.push(borewellId); clauses.push(`borewell_id = $${params.length}`); }
  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  const { rows } = await pool.query(`SELECT * FROM inspections ${where} ORDER BY due_date ASC NULLS LAST`, params);
  res.json(rows.map(rowToInspection));
});

const assignSchema = z.object({
  borewellId: z.string().uuid(),
  inspectorName: z.string(),
  priority: z.string().default("Normal"),
  dueDate: z.string(),
  instructions: z.string().optional(),
});

// POST /api/inspections — assign
router.post("/", requireAuth, requireRole("district_admin", "block_officer"), async (req, res) => {
  const parsed = assignSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const { borewellId, inspectorName, priority, dueDate, instructions } = parsed.data;
  const code = randomCode("INS", 4);

  const { rows } = await pool.query(
    `INSERT INTO inspections (inspection_code, borewell_id, assigned_inspector_name, priority, due_date, instructions, status)
     VALUES ($1,$2,$3,$4,$5,$6,'Assigned') RETURNING *`,
    [code, borewellId, inspectorName, priority, dueDate, instructions]
  );

  const { rows: bw } = await pool.query("SELECT borewell_code FROM borewells WHERE id = $1", [borewellId]);
  await writeAuditLog({
    userId: req.user!.id, userName: req.user!.name, action: "Assigned inspection",
    entityType: "Borewell", entityId: bw[0]?.borewell_code, newValue: `Assigned to ${inspectorName}`,
  });

  res.status(201).json(rowToInspection(rows[0]));
});

// PATCH /api/inspections/:id — general update (e.g. mark overdue, edit instructions)
router.patch("/:id", requireAuth, async (req, res) => {
  const fields = ["status", "priority", "instructions", "due_date"];
  const sets: string[] = [];
  const params: any[] = [];
  for (const f of fields) {
    if (req.body[f] !== undefined) {
      params.push(req.body[f]);
      sets.push(`${f} = $${params.length}`);
    }
  }
  if (!sets.length) return res.status(400).json({ error: "No valid fields to update." });
  params.push(req.params.id);
  const { rows } = await pool.query(`UPDATE inspections SET ${sets.join(", ")} WHERE id = $${params.length} RETURNING *`, params);
  if (!rows[0]) return res.status(404).json({ error: "Inspection not found." });
  res.json(rowToInspection(rows[0]));
});

const submitSchema = z.object({
  checklist: z.record(z.boolean()),
  observations: z.string().optional(),
});

// POST /api/inspections/:id/submit — inspector submits for verification
// (evidence photos are uploaded separately via POST /api/evidence, referencing this inspection id)
router.post("/:id/submit", requireAuth, requireRole("field_inspector", "block_officer"), async (req, res) => {
  const parsed = submitSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const { rows } = await pool.query(
    `UPDATE inspections SET status = 'Submitted', checklist = $2::jsonb, observations = $3 WHERE id = $1 RETURNING *`,
    [req.params.id, JSON.stringify(parsed.data.checklist), parsed.data.observations ?? null]
  );
  if (!rows[0]) return res.status(404).json({ error: "Inspection not found." });

  const { rows: bw } = await pool.query("SELECT borewell_code FROM borewells WHERE id = $1", [rows[0].borewell_id]);
  await writeAuditLog({
    userId: req.user!.id, userName: req.user!.name, action: "Submitted geo-tagged evidence",
    entityType: "Borewell", entityId: bw[0]?.borewell_code, newValue: "Sent to Verification Queue",
  });

  res.json(rowToInspection(rows[0]));
});

export default router;
