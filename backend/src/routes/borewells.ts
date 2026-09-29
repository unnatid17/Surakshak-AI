import { Router } from "express";
import { z } from "zod";
import { pool } from "../db/pool";
import { requireAuth, requireRole } from "../middleware/auth";
import { writeAuditLog } from "../middleware/auditLog";
import { computeRiskScore } from "../lib/riskEngine";
import { createEscalationForBorewell } from "../lib/escalationEngine";
import { nextBorewellCode } from "../utils/codes";

const router = Router();

const borewellInput = z.object({
  ownerName: z.string().optional(),
  ownerPhone: z.string().optional(),
  ownershipType: z.string().optional(),
  purpose: z.string().optional(),
  state: z.string().optional(),
  district: z.string().optional(),
  block: z.string().optional(),
  panchayat: z.string().optional(),
  village: z.string().optional(),
  address: z.string().optional(),
  landmark: z.string().optional(),
  latitude: z.number(),
  longitude: z.number(),
  status: z.string(),
  depthFeet: z.number().nullable().optional(),
  diameterInches: z.number().nullable().optional(),
  casingDiameter: z.number().nullable().optional(),
  waterStatus: z.string().optional(),
  yearDrilled: z.number().nullable().optional(),
  accessibility: z.string().optional(),
  hazards: z.array(z.string()).optional(),
  isCapped: z.boolean().optional(),
  hasFence: z.boolean().optional(),
  hasWarningSign: z.boolean().optional(),
  hasPhotoEvidence: z.boolean().optional(),
  nearestSensitivePlace: z.string().optional(),
  distanceToSensitivePlace: z.number().nullable().optional(),
});

function rowToBorewell(row: any) {
  return {
    id: row.id,
    borewellCode: row.borewell_code,
    ownerName: row.owner_name,
    ownerPhone: row.owner_phone,
    ownershipType: row.ownership_type,
    purpose: row.purpose,
    state: row.state,
    district: row.district,
    block: row.block,
    panchayat: row.panchayat,
    village: row.village,
    address: row.address,
    landmark: row.landmark,
    latitude: row.lat,
    longitude: row.lng,
    status: row.status,
    depthFeet: row.depth_feet,
    diameterInches: row.diameter_inches,
    casingDiameter: row.casing_diameter,
    waterStatus: row.water_status,
    yearDrilled: row.year_drilled,
    accessibility: row.accessibility,
    hazards: row.hazards,
    isCapped: row.is_capped,
    hasFence: row.has_fence,
    hasWarningSign: row.has_warning_sign,
    hasPhotoEvidence: row.has_photo_evidence,
    nearestSensitivePlace: row.nearest_sensitive_place,
    distanceToSensitivePlace: row.distance_to_sensitive_place,
    verificationStatus: row.verification_status,
    riskScore: row.risk_score,
    riskLevel: row.risk_level,
    riskReasons: row.risk_reasons,
    lastInspectionDate: row.last_inspection_date,
    nextInspectionDate: row.next_inspection_date,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const SELECT_BASE = `
  SELECT b.*, ST_Y(b.location::geometry) AS lat, ST_X(b.location::geometry) AS lng
  FROM borewells b
`;

// GET /api/borewells?status=&risk=&district=&search=
router.get("/", requireAuth, async (req, res) => {
  const { status, risk, district, verification, search } = req.query as Record<string, string | undefined>;
  const clauses: string[] = [];
  const params: any[] = [];
  if (status) { params.push(status); clauses.push(`b.status = $${params.length}`); }
  if (risk) { params.push(risk); clauses.push(`b.risk_level = $${params.length}`); }
  if (district) { params.push(district); clauses.push(`b.district = $${params.length}`); }
  if (verification === "Verified") { clauses.push(`b.verification_status = 'Verified'`); }
  if (verification === "not-verified") { clauses.push(`b.verification_status <> 'Verified'`); }
  if (search) {
    params.push(`%${search.toLowerCase()}%`);
    clauses.push(
      `(lower(b.borewell_code) LIKE $${params.length} OR lower(b.owner_name) LIKE $${params.length} OR lower(b.village) LIKE $${params.length} OR lower(b.landmark) LIKE $${params.length})`
    );
  }
  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  const { rows } = await pool.query(`${SELECT_BASE} ${where} ORDER BY b.created_at DESC`, params);
  res.json(rows.map(rowToBorewell));
});

// GET /api/borewells/export.csv  (must be declared before /:id)
router.get("/export.csv", requireAuth, async (_req, res) => {
  const { rows } = await pool.query(`${SELECT_BASE} ORDER BY b.created_at DESC`);
  const header = "Borewell ID,Village,Owner,Status,Verification,Risk Score,Risk Level,Last Inspected\n";
  const body = rows
    .map((r) =>
      [r.borewell_code, r.village, r.owner_name, r.status, r.verification_status, r.risk_score, r.risk_level, r.last_inspection_date ?? ""]
        .map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`)
        .join(",")
    )
    .join("\n");
  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", "attachment; filename=borewell_registry.csv");
  res.send(header + body);
});

// GET /api/borewells/:id
router.get("/:id", requireAuth, async (req, res) => {
  const { rows } = await pool.query(`${SELECT_BASE} WHERE b.id = $1`, [req.params.id]);
  if (!rows[0]) return res.status(404).json({ error: "Borewell not found." });
  res.json(rowToBorewell(rows[0]));
});

// GET /api/borewells/:id/rescue-card — restricted to authorized responder roles
router.get(
  "/:id/rescue-card",
  requireAuth,
  requireRole("district_admin", "block_officer", "field_inspector", "emergency_responder"),
  async (req, res) => {
    const { rows } = await pool.query(`${SELECT_BASE} WHERE b.id = $1`, [req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: "Borewell not found." });
    const { rows: incidentRows } = await pool.query(
      `SELECT * FROM incidents WHERE borewell_id = $1 ORDER BY created_at DESC`,
      [req.params.id]
    );
    const { rows: photoRows } = await pool.query(
      `SELECT * FROM evidence_photos WHERE borewell_id = $1 AND review_status = 'approved' ORDER BY captured_at DESC LIMIT 1`,
      [req.params.id]
    );
    await writeAuditLog({
      userId: req.user!.id,
      userName: req.user!.name,
      action: "Accessed rescue card",
      entityType: "Borewell",
      entityId: rows[0].borewell_code,
      newValue: "Viewed",
    });
    res.json({ borewell: rowToBorewell(rows[0]), incidents: incidentRows, latestApprovedPhoto: photoRows[0] ?? null });
  }
);

// POST /api/borewells — register (server computes risk)
router.post("/", requireAuth, requireRole("district_admin", "block_officer"), async (req, res) => {
  const parsed = borewellInput.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const b = parsed.data;

  const risk = computeRiskScore({
    status: b.status,
    waterStatus: b.waterStatus,
    lastInspectionDate: null,
    nearestSensitivePlace: b.nearestSensitivePlace,
    distanceToSensitivePlace: b.distanceToSensitivePlace,
    hasFence: b.hasFence,
    hasWarningSign: b.hasWarningSign,
    depthFeet: b.depthFeet,
    hazards: b.hazards,
    hasPhotoEvidence: b.hasPhotoEvidence,
  });

  const code = await nextBorewellCode(pool, (b.district || "NK").slice(0, 2).toUpperCase());

  const { rows } = await pool.query(
    `INSERT INTO borewells (
       borewell_code, owner_name, owner_phone, ownership_type, purpose, state, district, block,
       panchayat, village, address, landmark, location, status, depth_feet, diameter_inches,
       casing_diameter, water_status, year_drilled, accessibility, hazards, is_capped, has_fence,
       has_warning_sign, has_photo_evidence, nearest_sensitive_place, distance_to_sensitive_place,
       verification_status, risk_score, risk_level, risk_reasons, created_by
     ) VALUES (
       $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12, ST_SetSRID(ST_MakePoint($14,$13),4326)::geography,
       $15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,'Not Submitted',$28,$29,$30::jsonb,$31
     ) RETURNING *, ST_Y(location::geometry) AS lat, ST_X(location::geometry) AS lng`,
    [
      code, b.ownerName, b.ownerPhone, b.ownershipType, b.purpose, b.state, b.district, b.block,
      b.panchayat, b.village, b.address, b.landmark, b.latitude, b.longitude,
      b.status, b.depthFeet, b.diameterInches, b.casingDiameter, b.waterStatus, b.yearDrilled,
      b.accessibility, b.hazards ?? [], b.isCapped ?? false, b.hasFence ?? false,
      b.hasWarningSign ?? false, b.hasPhotoEvidence ?? false, b.nearestSensitivePlace ?? "None",
      b.distanceToSensitivePlace ?? null, risk.score, risk.level, JSON.stringify(risk.reasons), req.user!.id,
    ]
  );
  const created = rows[0];

  await writeAuditLog({
    userId: req.user!.id, userName: req.user!.name, action: "Registered borewell",
    entityType: "Borewell", entityId: code, newValue: "Created",
  });

  if (b.status === "Open/Unsafe") {
    await createEscalationForBorewell({ borewellId: created.id, reason: "Open/unsafe borewell registered", riskLevel: risk.level });
  }

  res.status(201).json(rowToBorewell(created));
});

// PATCH /api/borewells/:id — edit (server recomputes risk)
router.patch("/:id", requireAuth, requireRole("district_admin", "block_officer", "field_inspector"), async (req, res) => {
  const { rows: existingRows } = await pool.query(`${SELECT_BASE} WHERE b.id = $1`, [req.params.id]);
  const existing = existingRows[0];
  if (!existing) return res.status(404).json({ error: "Borewell not found." });

  const merged = { ...existing, ...req.body };
  const risk = computeRiskScore({
    status: merged.status,
    waterStatus: merged.water_status ?? merged.waterStatus,
    lastInspectionDate: merged.last_inspection_date ?? merged.lastInspectionDate,
    nearestSensitivePlace: merged.nearest_sensitive_place ?? merged.nearestSensitivePlace,
    distanceToSensitivePlace: merged.distance_to_sensitive_place ?? merged.distanceToSensitivePlace,
    hasFence: merged.has_fence ?? merged.hasFence,
    hasWarningSign: merged.has_warning_sign ?? merged.hasWarningSign,
    depthFeet: merged.depth_feet ?? merged.depthFeet,
    hazards: merged.hazards,
    hasPhotoEvidence: merged.has_photo_evidence ?? merged.hasPhotoEvidence,
  });

  const { rows } = await pool.query(
    `UPDATE borewells SET
       status = $2, verification_status = $3, is_capped = $4, has_fence = $5, has_warning_sign = $6,
       has_photo_evidence = $7, last_inspection_date = $8, next_inspection_date = $9,
       risk_score = $10, risk_level = $11, risk_reasons = $12::jsonb, updated_at = now()
     WHERE id = $1
     RETURNING *, ST_Y(location::geometry) AS lat, ST_X(location::geometry) AS lng`,
    [
      req.params.id,
      merged.status,
      merged.verification_status ?? merged.verificationStatus ?? existing.verification_status,
      merged.is_capped ?? merged.isCapped ?? existing.is_capped,
      merged.has_fence ?? merged.hasFence ?? existing.has_fence,
      merged.has_warning_sign ?? merged.hasWarningSign ?? existing.has_warning_sign,
      merged.has_photo_evidence ?? merged.hasPhotoEvidence ?? existing.has_photo_evidence,
      merged.last_inspection_date ?? merged.lastInspectionDate ?? existing.last_inspection_date,
      merged.next_inspection_date ?? merged.nextInspectionDate ?? existing.next_inspection_date,
      risk.score, risk.level, JSON.stringify(risk.reasons),
    ]
  );

  await writeAuditLog({
    userId: req.user!.id, userName: req.user!.name, action: "Edited borewell",
    entityType: "Borewell", entityId: existing.borewell_code,
    previousValue: `Risk ${existing.risk_score}`, newValue: `Risk ${risk.score}`,
  });

  if (merged.status === "Open/Unsafe" && existing.status !== "Open/Unsafe") {
    await createEscalationForBorewell({ borewellId: req.params.id, reason: "Borewell status changed to open/unsafe", riskLevel: risk.level });
  }

  res.json(rowToBorewell(rows[0]));
});

export default router;
