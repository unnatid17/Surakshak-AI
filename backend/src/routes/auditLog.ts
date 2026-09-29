import { Router } from "express";
import { pool } from "../db/pool";
import { requireAuth, requireRole } from "../middleware/auth";

const router = Router();

// GET /api/audit-log?entityType=&entityId=  (district admin only)
router.get("/", requireAuth, requireRole("district_admin"), async (req, res) => {
  const { entityType, entityId, limit } = req.query as Record<string, string | undefined>;
  const clauses: string[] = [];
  const params: any[] = [];
  if (entityType) { params.push(entityType); clauses.push(`entity_type = $${params.length}`); }
  if (entityId) { params.push(entityId); clauses.push(`entity_id = $${params.length}`); }
  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  params.push(Number(limit) || 100);
  const { rows } = await pool.query(
    `SELECT * FROM audit_log ${where} ORDER BY timestamp DESC LIMIT $${params.length}`,
    params
  );
  res.json(
    rows.map((r) => ({
      id: r.id, userName: r.user_name, action: r.action, entityType: r.entity_type,
      entityId: r.entity_id, previousValue: r.previous_value, newValue: r.new_value, timestamp: r.timestamp,
    }))
  );
});

export default router;
