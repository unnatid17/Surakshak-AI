import { Router } from "express";
import { z } from "zod";
import { pool } from "../db/pool";
import { requireAuth } from "../middleware/auth";
import { writeAuditLog } from "../middleware/auditLog";
import { randomCode } from "../utils/codes";

const router = Router();

function rowToIncident(row: any) {
  return {
    id: row.id,
    incidentCode: row.incident_code,
    borewellId: row.borewell_id,
    reportedBy: row.reported_by,
    reporterPhone: row.reporter_phone,
    latitude: row.lat,
    longitude: row.lng,
    timeObserved: row.time_observed,
    peopleAffected: row.people_affected,
    personTrapped: row.person_trapped,
    accessRoute: row.access_route,
    description: row.description,
    status: row.status,
    createdAt: row.created_at,
  };
}

const incidentSchema = z.object({
  borewellId: z.string().uuid().nullable().optional(),
  reportedBy: z.string().optional(),
  reporterPhone: z.string().optional(),
  latitude: z.number(),
  longitude: z.number(),
  timeObserved: z.string().optional(),
  peopleAffected: z.number().optional(),
  personTrapped: z.string().optional(),
  accessRoute: z.string().optional(),
  description: z.string().optional(),
});

router.get("/", requireAuth, async (req, res) => {
  const { status } = req.query as Record<string, string | undefined>;
  const where = status ? "WHERE status = $1" : "";
  const { rows } = await pool.query(
    `SELECT *, ST_Y(location::geometry) AS lat, ST_X(location::geometry) AS lng FROM incidents ${where} ORDER BY created_at DESC`,
    status ? [status] : []
  );
  res.json(rows.map(rowToIncident));
});

router.post("/", requireAuth, async (req, res) => {
  const parsed = incidentSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const d = parsed.data;
  const code = randomCode("INC-NK", 4);

  const { rows } = await pool.query(
    `INSERT INTO incidents (incident_code, borewell_id, reported_by, reporter_phone, location, time_observed,
       people_affected, person_trapped, access_route, description, status)
     VALUES ($1,$2,$3,$4, ST_SetSRID(ST_MakePoint($6,$5),4326)::geography, $7,$8,$9,$10,$11,'Active')
     RETURNING *, ST_Y(location::geometry) AS lat, ST_X(location::geometry) AS lng`,
    [code, d.borewellId ?? null, d.reportedBy ?? "Anonymous", d.reporterPhone, d.latitude, d.longitude,
     d.timeObserved ?? new Date().toISOString(), d.peopleAffected ?? 0, d.personTrapped ?? "Unknown", d.accessRoute, d.description]
  );

  if (d.borewellId) {
    await pool.query("UPDATE borewells SET status = 'Open/Unsafe', updated_at = now() WHERE id = $1", [d.borewellId]);
  }

  await writeAuditLog({
    userId: req.user!.id, userName: req.user!.name, action: "Reported emergency incident",
    entityType: "Incident", entityId: code, newValue: "Active",
  });

  res.status(201).json(rowToIncident(rows[0]));
});

export default router;
