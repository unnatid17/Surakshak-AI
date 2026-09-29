import { Router } from "express";
import multer from "multer";
import crypto from "crypto";
import { z } from "zod";
import { pool } from "../db/pool";
import { requireAuth, requireRole } from "../middleware/auth";
import { writeAuditLog } from "../middleware/auditLog";
import { classifyLocation, distanceToBorewellMeters, GEO_VERIFICATION_DISCLAIMER } from "../lib/geoEngine";
import { computeRiskScore } from "../lib/riskEngine";
import { uploadBuffer, sha256Hex } from "../lib/storage";

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 15 * 1024 * 1024 } });

function rowToPhoto(row: any) {
  return {
    id: row.id,
    inspectionId: row.inspection_id,
    borewellId: row.borewell_id,
    category: row.category,
    fileName: row.file_name,
    filePath: row.file_path,
    mimeType: row.mime_type,
    fileSize: row.file_size,
    latitude: row.lat,
    longitude: row.lng,
    gpsAccuracyMeters: row.gps_accuracy_meters,
    distanceFromBorewellMeters: row.distance_from_borewell_meters,
    locationStatus: row.location_status,
    integrityHash: row.integrity_hash,
    capturedAt: row.captured_at,
    uploadedAt: row.uploaded_at,
    uploadedByName: row.uploaded_by_name,
    reviewStatus: row.review_status,
    reviewerComment: row.reviewer_comment,
  };
}

const uploadMetaSchema = z.object({
  borewellId: z.string().uuid(),
  inspectionId: z.string().uuid().optional(),
  category: z.enum([
    "Borewell opening", "Cap condition", "Fence or barricade", "Warning sign",
    "Surrounding area", "Access route", "Other",
  ]),
  latitude: z.coerce.number().nullable().optional(),
  longitude: z.coerce.number().nullable().optional(),
  accuracyMeters: z.coerce.number().nullable().optional(),
  locationDenied: z.coerce.boolean().optional(),
  capturedAt: z.string().optional(),
});

// POST /api/evidence  (multipart/form-data: file + fields above)
// The server — not the client — computes distance, classifies location status,
// and hashes the file. This prevents a tampered client from self-certifying evidence.
router.post("/", requireAuth, upload.single("file"), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "A photo file is required." });
  const parsed = uploadMetaSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const meta = parsed.data;

  const denied = !!meta.locationDenied || meta.latitude == null || meta.longitude == null;
  const distance = denied ? null : await distanceToBorewellMeters(meta.borewellId, meta.latitude!, meta.longitude!);
  const status = classifyLocation({ distanceMeters: distance, accuracyMeters: meta.accuracyMeters ?? null, locationDenied: denied });

  const hash = sha256Hex(req.file.buffer);
  const photoId = crypto.randomUUID();
  const { filePath } = await uploadBuffer(
    req.file.buffer,
    `inspections/${meta.inspectionId ?? "unassigned"}/${photoId}-${req.file.originalname}`
  );

  const { rows } = await pool.query(
    `INSERT INTO evidence_photos (
       id, inspection_id, borewell_id, category, file_name, file_path, mime_type, file_size,
       location, gps_accuracy_meters, distance_from_borewell_meters, location_status,
       integrity_hash, captured_at, uploaded_by, uploaded_by_name, review_status
     ) VALUES (
       $1,$2,$3,$4,$5,$6,$7,$8,
       ${denied ? "NULL" : "ST_SetSRID(ST_MakePoint($10,$9),4326)::geography"},
       $11,$12,$13,$14,$15,$16,$17,
       $18
     ) RETURNING *, ST_Y(location::geometry) AS lat, ST_X(location::geometry) AS lng`,
    [
      photoId, meta.inspectionId ?? null, meta.borewellId, meta.category, req.file.originalname,
      filePath, req.file.mimetype, req.file.size,
      meta.latitude ?? null, meta.longitude ?? null,
      meta.accuracyMeters ?? null, distance, status, hash,
      meta.capturedAt ?? new Date().toISOString(), req.user!.id, req.user!.name,
      status === "unavailable" || status === "mismatch" ? "manual_review" : "pending",
    ]
  );

  const warnings: string[] = [];
  if (denied) warnings.push("No location information available for this photo.");
  if (meta.accuracyMeters && meta.accuracyMeters > 100) warnings.push("Low GPS confidence (accuracy over 100m).");
  if (distance !== null && distance > 150) warnings.push("Capture location is outside the allowed radius.");
  for (const w of warnings) {
    await writeAuditLog({
      userId: req.user!.id, userName: req.user!.name, action: "Evidence warning",
      entityType: "EvidencePhoto", entityId: photoId, newValue: w,
    });
  }

  res.status(201).json({ photo: rowToPhoto(rows[0]), warnings, disclaimer: GEO_VERIFICATION_DISCLAIMER });
});

const reviewSchema = z.object({
  decision: z.enum(["approve", "reject", "override"]),
  reason: z.string().optional(),
  overrideStatus: z.enum(["verified", "needs_review", "mismatch", "unavailable", "low_confidence"]).optional(),
});

// PATCH /api/evidence/:id/review
router.patch(
  "/:id/review",
  requireAuth,
  requireRole("district_admin", "block_officer"),
  async (req, res) => {
    const parsed = reviewSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    const { decision, reason, overrideStatus } = parsed.data;

    if ((decision === "reject" || decision === "override") && !reason?.trim()) {
      return res.status(400).json({ error: "A written reason is required to reject or override a review." });
    }

    const { rows: existingRows } = await pool.query("SELECT * FROM evidence_photos WHERE id = $1", [req.params.id]);
    const existing = existingRows[0];
    if (!existing) return res.status(404).json({ error: "Evidence photo not found." });

    let newReviewStatus = existing.review_status;
    let newLocationStatus = existing.location_status;
    if (decision === "approve") newReviewStatus = "approved";
    if (decision === "reject") newReviewStatus = "rejected";
    if (decision === "override" && overrideStatus) newLocationStatus = overrideStatus;

    const { rows } = await pool.query(
      `UPDATE evidence_photos SET review_status = $2, location_status = $3, reviewer_id = $4, reviewer_comment = $5
       WHERE id = $1 RETURNING *, ST_Y(location::geometry) AS lat, ST_X(location::geometry) AS lng`,
      [req.params.id, newReviewStatus, newLocationStatus, req.user!.id, reason ?? existing.reviewer_comment]
    );

    const { rows: bw } = await pool.query("SELECT borewell_code FROM borewells WHERE id = $1", [existing.borewell_id]);
    await writeAuditLog({
      userId: req.user!.id, userName: req.user!.name,
      action: decision === "approve" ? "Approved evidence" : decision === "reject" ? "Rejected evidence" : "Overrode location status",
      entityType: "Borewell", entityId: bw[0]?.borewell_code,
      previousValue: existing.location_status, newValue: reason ? `${newReviewStatus} — ${reason}` : newReviewStatus,
    });

    // If approved, recompute the parent borewell's risk score (photo evidence now on file).
    if (decision === "approve") {
      const { rows: bwRows } = await pool.query("SELECT * FROM borewells WHERE id = $1", [existing.borewell_id]);
      const b = bwRows[0];
      const risk = computeRiskScore({
        status: b.status, waterStatus: b.water_status, lastInspectionDate: new Date().toISOString(),
        nearestSensitivePlace: b.nearest_sensitive_place, distanceToSensitivePlace: b.distance_to_sensitive_place,
        hasFence: b.has_fence, hasWarningSign: b.has_warning_sign, depthFeet: b.depth_feet,
        hazards: b.hazards, hasPhotoEvidence: true,
      });
      await pool.query(
        `UPDATE borewells SET has_photo_evidence = true, verification_status = 'Verified',
         last_inspection_date = now(), next_inspection_date = now() + interval '180 days',
         risk_score = $2, risk_level = $3, risk_reasons = $4::jsonb, updated_at = now() WHERE id = $1`,
        [existing.borewell_id, risk.score, risk.level, JSON.stringify(risk.reasons)]
      );
    }

    res.json(rowToPhoto(rows[0]));
  }
);

// GET /api/evidence?borewellId=&inspectionId=&reviewStatus=
router.get("/", requireAuth, async (req, res) => {
  const { borewellId, inspectionId, reviewStatus } = req.query as Record<string, string | undefined>;
  const clauses: string[] = [];
  const params: any[] = [];
  if (borewellId) { params.push(borewellId); clauses.push(`borewell_id = $${params.length}`); }
  if (inspectionId) { params.push(inspectionId); clauses.push(`inspection_id = $${params.length}`); }
  if (reviewStatus) { params.push(reviewStatus); clauses.push(`review_status = $${params.length}`); }
  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  const { rows } = await pool.query(
    `SELECT *, ST_Y(location::geometry) AS lat, ST_X(location::geometry) AS lng FROM evidence_photos ${where} ORDER BY uploaded_at DESC`,
    params
  );
  res.json(rows.map(rowToPhoto));
});

export default router;
