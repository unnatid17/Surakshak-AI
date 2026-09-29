import { pool } from "../db/pool";

export type AuditEntry = {
  userId?: string | null;
  userName: string;
  action: string;
  entityType: string;
  entityId?: string | null;
  previousValue?: string | null;
  newValue?: string | null;
};

/**
 * Writes one row to audit_log. This is the accountability trail that is the
 * product's core value proposition — every mutating route handler should
 * call this exactly once per meaningful state change. Never let a route
 * silently skip it.
 */
export async function writeAuditLog(entry: AuditEntry) {
  await pool.query(
    `INSERT INTO audit_log (user_id, user_name, action, entity_type, entity_id, previous_value, new_value)
     VALUES ($1,$2,$3,$4,$5,$6,$7)`,
    [
      entry.userId ?? null,
      entry.userName,
      entry.action,
      entry.entityType,
      entry.entityId ?? null,
      entry.previousValue ?? null,
      entry.newValue ?? null,
    ]
  );
}
