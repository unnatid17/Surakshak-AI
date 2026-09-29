/**
 * Suraksha AI — Escalation engine.
 *
 * Rules (from the product spec):
 *  - Critical-risk borewell: immediate Panchayat + Block notification.
 *  - Open/unsafe borewell: escalate Panchayat -> Block after 24h unresolved.
 *  - High-risk borewell: escalate after 7 days.
 *  - Overdue inspection: escalate after 30 days.
 *  - Rejected evidence not resubmitted: escalate after 7 days.
 *  - Block -> District after 30 days overdue at Block level.
 *
 * `runAutoEscalationSweep` is meant to be invoked by a scheduled job (see
 * src/index.ts, wired with node-cron) and is also safe to call synchronously
 * right after any write that could change escalation status.
 */
import { pool } from "../db/pool";
import { writeAuditLog } from "../middleware/auditLog";

const LEVEL_ORDER = ["Panchayat", "Block Office", "District Administration"];

function nextLevel(current: string): string {
  const idx = LEVEL_ORDER.indexOf(current);
  return LEVEL_ORDER[Math.min(idx + 1, LEVEL_ORDER.length - 1)];
}

export async function createEscalationForBorewell(params: {
  borewellId: string;
  reason: string;
  riskLevel: string;
  assignedTo?: string;
}) {
  const dueHours = params.riskLevel === "Critical" ? 24 : params.riskLevel === "High" ? 24 * 7 : 24 * 30;
  const caseCode = `ESC-${Math.floor(Math.random() * 90000 + 10000)}`;
  const { rows } = await pool.query(
    `INSERT INTO escalations (case_code, borewell_id, reason, risk_level, current_level, assigned_to, due_at, history)
     VALUES ($1,$2,$3,$4,'Panchayat',$5, now() + ($6 || ' hours')::interval, $7::jsonb)
     RETURNING *`,
    [
      caseCode,
      params.borewellId,
      params.reason,
      params.riskLevel,
      params.assignedTo ?? "Panchayat Officer",
      dueHours,
      JSON.stringify([{ level: "Panchayat", at: new Date().toISOString() }]),
    ]
  );
  await writeAuditLog({
    userName: "System (auto-escalation)",
    action: "Opened escalation case",
    entityType: "Escalation",
    entityId: caseCode,
    previousValue: "",
    newValue: `Panchayat — ${params.reason}`,
  });
  return rows[0];
}

/**
 * Finds every open escalation past its due date and bumps it to the next
 * level. Intended to run on a schedule (e.g. hourly) — see src/index.ts.
 */
export async function runAutoEscalationSweep() {
  const { rows: overdue } = await pool.query(
    `SELECT * FROM escalations WHERE status IN ('In Progress','Overdue') AND due_at < now() AND current_level <> 'District Administration'`
  );

  for (const esc of overdue) {
    const level = nextLevel(esc.current_level);
    const history = Array.isArray(esc.history) ? esc.history : [];
    history.push({ level, at: new Date().toISOString() });
    const nextDueHours = 24 * 7; // subsequent hops default to a 7-day window
    await pool.query(
      `UPDATE escalations SET current_level = $1, status = 'In Progress', due_at = now() + ($2 || ' hours')::interval, history = $3::jsonb WHERE id = $4`,
      [level, nextDueHours, JSON.stringify(history), esc.id]
    );
    await writeAuditLog({
      userName: "System (auto-escalation)",
      action: "Auto-escalated overdue case",
      entityType: "Escalation",
      entityId: esc.case_code,
      previousValue: esc.current_level,
      newValue: level,
    });
  }

  // Mark anything past due but not yet escalated (e.g. already at District) as Overdue
  await pool.query(
    `UPDATE escalations SET status = 'Overdue'
     WHERE status = 'In Progress' AND due_at < now() AND current_level = 'District Administration'`
  );

  return { escalated: overdue.length };
}
