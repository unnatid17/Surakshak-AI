import { Router } from "express";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import { pool } from "../db/pool";
import { writeAuditLog } from "../middleware/auditLog";
import { randomCode } from "../utils/codes";

const router = Router();

const publicLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20, standardHeaders: true, legacyHeaders: false });

const reportSchema = z.object({
  reporterName: z.string().optional(),
  reporterPhone: z.string().optional(),
  latitude: z.number(),
  longitude: z.number(),
  landmark: z.string().min(1),
  issueType: z.string(),
  description: z.string().optional(),
});

// POST /api/public/reports — no auth required
router.post("/reports", publicLimiter, async (req, res) => {
  const parsed = reportSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Location and issue type are required." });
  const d = parsed.data;
  const code = randomCode("REP-NK", 4);

  await pool.query(
    `INSERT INTO public_reports (report_code, reporter_name, reporter_phone, location, landmark, issue_type, description, status)
     VALUES ($1,$2,$3, ST_SetSRID(ST_MakePoint($5,$4),4326)::geography, $6,$7,$8,'Received')`,
    [code, d.reporterName || "Anonymous", d.reporterPhone, d.latitude, d.longitude, d.landmark, d.issueType, d.description]
  );

  await writeAuditLog({
    userName: d.reporterName || "Public Reporter", action: "Submitted public report",
    entityType: "PublicReport", entityId: code, newValue: "Received",
  });

  res.status(201).json({ reportCode: code, message: "Thank you. Your report has been received and will be reviewed." });
});

// GET /api/public/reports/:reportCode — status lookup only, no owner/private info ever
router.get("/reports/:reportCode", publicLimiter, async (req, res) => {
  const { rows } = await pool.query(
    "SELECT report_code, status, landmark, issue_type, description, created_at FROM public_reports WHERE report_code = $1",
    [req.params.reportCode]
  );
  if (!rows[0]) return res.status(404).json({ error: "No report found with that ID." });
  res.json({
    reportCode: rows[0].report_code,
    status: rows[0].status,
    generalLocation: rows[0].landmark,
    issueType: rows[0].issue_type,
    submittedAt: rows[0].created_at,
  });
});

export default router;
