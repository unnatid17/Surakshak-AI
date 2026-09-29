export function randomCode(prefix: string, digits = 5): string {
  const max = 10 ** digits;
  const min = 10 ** (digits - 1);
  return `${prefix}-${Math.floor(Math.random() * (max - min) + min)}`;
}

export async function nextBorewellCode(pool: import("pg").Pool, district = "NK"): Promise<string> {
  const { rows } = await pool.query<{ count: string }>("SELECT COUNT(*)::text AS count FROM borewells");
  const n = Number(rows[0].count) + 1;
  return `BW-${district}-${String(n).padStart(4, "0")}`;
}
