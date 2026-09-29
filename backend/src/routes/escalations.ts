import { Router } from "express";
import { z } from "zod";
import { pool } from "../db/pool";
import { requireAuth, requireRole } from "../middleware/auth";
import { writeAuditLog } from "../middleware/auditLog";

const router = Router();
const LEVEL_ORDER = ["Panchayat", "Block Office", "District Administration"];

function rowToEscalation(row: any) {
  return {
    id: row.id,
    caseCode: row.case_code,
    borewellId: row.borewell_id,
    reason: row.reason,
    riskLevel: row.risk_level,
    currentLevel: row.current_level,
    assignedTo: row.assigned_to,
    openedAt: row.opened_at,
    dueAt: row.due_at,
    resolvedAt: row.resolved_at,
    status: row.status,
    notes: row.notes,
    history: row.history,
  };
}

router.get("/", requireAuth, async (req, res) => {
  const { status, borewellId } = req.query as Record<string, string | undefined>;
  const clauses: string[] = [];
  const params: any[] = [];
  if (status) { params.push(status); clauses.push(`status = $${params.length}`); }
  if (borewellId) { params.push(borewellId); clauses.push(`borewell_id = $${params.length}`); }
  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  const { rows } = await pool.query(`SELECT * FROM escalations ${where} ORDER BY opened_at DESC`, params);
  res.json(rows.map(rowToEscalation));
});

router.post("/:id/escalate", requireAuth, requireRole("district_admin", "block_officer"), async (req, res) => {
  const { rows: existingRows } = await pool.query("SELECT * FROM escalations WHERE id = $1", [req.params.id]);
  const esc = existingRows[0];
  if (!esc) return res.status(404).json({ error: "Escalation not found." });

  const idx = LEVEL_ORDER.indexOf(esc.current_level);
  const level = LEVEL_ORDER[Math.min(idx + 1, LEVEL_ORDER.length - 1)];
  const history = Array.isArray(esc.history) ? esc.history : [];
  history.push({ level, at: new Date().toISOString() });

  const { rows } = await pool.query(
    `UPDATE escalations SET current_level = $2, status = 'In Progress', history = $3::jsonb WHERE id = $1 RETURNING *`,
    [req.params.id, level, JSON.stringify(history)]
  );

  await writeAuditLog({
    userId: req.user!.id, userName: req.user!.name, action: "Escalated case",
    entityType: "Escalation", entityId: esc.case_code, previousValue: esc.current_level, newValue: level,
  });

  res.json(rowToEscalation(rows[0]));
});

router.post("/:id/resolve", requireAuth, requireRole("district_admin", "block_officer"), async (req, res) => {
  const { rows } = await pool.query(
    `UPDATE escalations SET status = 'Resolved', resolved_at = now() WHERE id = $1 RETURNING *`,
    [req.params.id]
  );
  if (!rows[0]) return res.status(404).json({ error: "Escalation not found." });
  await writeAuditLog({
    userId: req.user!.id, userName: req.user!.name, action: "Resolved escalation",
    entityType: "Escalation", entityId: rows[0].case_code, newValue: "Resolved",
  });
  res.json(rowToEscalation(rows[0]));
});

const noteSchema = z.object({ note: z.string().min(1) });

router.post("/:id/notes", requireAuth, async (req, res) => {
  const parsed = noteSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "A note is required." });
  const { rows: existingRows } = await pool.query("SELECT notes FROM escalations WHERE id = $1", [req.params.id]);
  if (!existingRows[0]) return res.status(404).json({ error: "Escalation not found." });
  const notes = Array.isArray(existingRows[0].notes) ? existingRows[0].notes : [];
  notes.push(parsed.data.note);
  const { rows } = await pool.query(`UPDATE escalations SET notes = $2::jsonb WHERE id = $1 RETURNING *`, [req.params.id, JSON.stringify(notes)]);
  res.json(rowToEscalation(rows[0]));
});

export default router;
