import { Router } from "express";
import { pool } from "../db/pool";
import { requireAuth } from "../middleware/auth";

const router = Router();

// GET /api/reports/compliance-summary?district=&block=&from=&to=
router.get("/compliance-summary", requireAuth, async (req, res) => {
  const { district, block } = req.query as Record<string, string | undefined>;
  const clauses: string[] = [];
  const params: any[] = [];
  if (district) { params.push(district); clauses.push(`district = $${params.length}`); }
  if (block) { params.push(block); clauses.push(`block = $${params.length}`); }
  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";

  const { rows } = await pool.query(
    `SELECT
       COUNT(*)::int AS total,
       COUNT(*) FILTER (WHERE status = 'Capped' AND verification_status = 'Verified')::int AS capped_verified,
       COUNT(*) FILTER (WHERE status = 'Capped' AND verification_status <> 'Verified')::int AS capped_unverified,
       COUNT(*) FILTER (WHERE status = 'Open/Unsafe')::int AS open_unsafe,
       COUNT(*) FILTER (WHERE nearest_sensitive_place = 'School' AND risk_level IN ('High','Critical'))::int AS near_schools
     FROM borewells ${where}`,
    params
  );

  const { rows: overdueRows } = await pool.query(`SELECT COUNT(*)::int AS c FROM inspections WHERE status = 'Overdue'`);
  const { rows: escRows } = await pool.query(`SELECT COUNT(*)::int AS c FROM escalations WHERE status <> 'Resolved'`);

  res.json({
    ...rows[0],
    inspectionsOverdue: overdueRows[0].c,
    pendingEscalations: escRows[0].c,
  });
});

router.get("/by-village", requireAuth, async (_req, res) => {
  const { rows } = await pool.query(
    `SELECT village AS name, COUNT(*)::int AS value FROM borewells GROUP BY village ORDER BY value DESC`
  );
  res.json(rows);
});

router.get("/by-status", requireAuth, async (_req, res) => {
  const { rows } = await pool.query(`SELECT status AS name, COUNT(*)::int AS value FROM borewells GROUP BY status`);
  res.json(rows);
});

router.get("/by-risk", requireAuth, async (_req, res) => {
  const { rows } = await pool.query(`SELECT risk_level AS name, COUNT(*)::int AS value FROM borewells GROUP BY risk_level`);
  res.json(rows);
});

export default router;
