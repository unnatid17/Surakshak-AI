/**
 * Suraksha AI — Inspection Pattern Insights (OPTIONAL module).
 *
 * IMPORTANT — read before wiring this into any route:
 * This module NEVER touches risk score, verification status, or escalation
 * level. It only produces advisory flags for a District Administrator to
 * look at manually. If you find yourself tempted to use its output to
 * auto-approve, auto-reject, or auto-escalate anything — don't. That would
 * quietly turn an "advisory suggestion" into a decision-making black box,
 * which is exactly what this product's design deliberately avoids.
 *
 * This is a simple statistical heuristic (not a trained ML model) — good
 * enough to demo the concept honestly. If you want a real anomaly-detection
 * model (e.g. isolation forest via scikit-learn), run it as a separate
 * offline/batch Python job that writes results to a table this reads from;
 * don't put a live ML call in the request path of any core workflow.
 */
import { pool } from "../db/pool";

export type InsightFlag = {
  type: "fast_inspections" | "repeated_location_mismatch" | "rejection_cluster";
  subject: string; // inspector name, borewell code, etc.
  detail: string;
  severity: "info" | "watch";
};

/**
 * Flags inspectors whose completed inspections consistently take unusually
 * little time between assignment and completion — a pattern worth a manual
 * look, not proof of anything wrong.
 */
async function flagFastInspections(): Promise<InsightFlag[]> {
  const { rows } = await pool.query(`
    SELECT assigned_inspector_name AS inspector,
           COUNT(*)::int AS n,
           AVG(EXTRACT(EPOCH FROM (completed_date - assigned_date)) / 3600)::numeric(10,1) AS avg_hours
    FROM inspections
    WHERE status = 'Completed' AND completed_date IS NOT NULL
    GROUP BY assigned_inspector_name
    HAVING COUNT(*) >= 3
  `);
  return rows
    .filter((r) => Number(r.avg_hours) < 1) // completed in under an hour, on average, across 3+ inspections
    .map((r) => ({
      type: "fast_inspections" as const,
      subject: r.inspector,
      detail: `${r.n} completed inspections averaging ${r.avg_hours}h from assignment to completion — worth a spot check.`,
      severity: "watch" as const,
    }));
}

/** Flags borewells with more than one evidence submission classified as location mismatch. */
async function flagRepeatedLocationMismatch(): Promise<InsightFlag[]> {
  const { rows } = await pool.query(`
    SELECT b.borewell_code AS code, COUNT(*)::int AS n
    FROM evidence_photos e JOIN borewells b ON b.id = e.borewell_id
    WHERE e.location_status = 'mismatch'
    GROUP BY b.borewell_code HAVING COUNT(*) > 1
  `);
  return rows.map((r) => ({
    type: "repeated_location_mismatch" as const,
    subject: r.code,
    detail: `${r.n} separate evidence submissions flagged as location mismatch for this borewell.`,
    severity: "watch" as const,
  }));
}

/** Flags inspectors with an unusually high rejection rate on submitted evidence. */
async function flagRejectionClusters(): Promise<InsightFlag[]> {
  const { rows } = await pool.query(`
    SELECT uploaded_by_name AS inspector,
           COUNT(*)::int AS total,
           COUNT(*) FILTER (WHERE review_status = 'rejected')::int AS rejected
    FROM evidence_photos GROUP BY uploaded_by_name HAVING COUNT(*) >= 3
  `);
  return rows
    .filter((r) => r.rejected / r.total > 0.4)
    .map((r) => ({
      type: "rejection_cluster" as const,
      subject: r.inspector,
      detail: `${r.rejected} of ${r.total} submitted photos were rejected (${Math.round((r.rejected / r.total) * 100)}%).`,
      severity: "info" as const,
    }));
}

/** Advisory only — see the module-level warning above before using this anywhere. */
export async function getInspectionPatternInsights(): Promise<InsightFlag[]> {
  const [a, b, c] = await Promise.all([flagFastInspections(), flagRepeatedLocationMismatch(), flagRejectionClusters()]);
  return [...a, ...b, ...c];
}
