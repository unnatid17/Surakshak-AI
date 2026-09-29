import { Router } from "express";
import { requireAuth, requireRole } from "../middleware/auth";
import { getInspectionPatternInsights } from "../lib/aiInsights";

const router = Router();

// GET /api/insights — advisory-only pattern flags. Never used to drive risk,
// verification, or escalation decisions (see src/lib/aiInsights.ts).
router.get("/", requireAuth, requireRole("district_admin"), async (_req, res) => {
  const flags = await getInspectionPatternInsights();
  res.json({
    disclaimer: "Pattern-based suggestions for manual review — not a compliance decision or risk prediction.",
    flags,
  });
});

export default router;
