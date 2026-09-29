/**
 * Suraksha AI — Risk Scoring Engine.
 *
 * This is deliberately a transparent, rule-based scorer, not a machine-learning
 * model. Every point added is traceable to a named reason. This file is the
 * single source of truth for risk — it must be called (and its result persisted)
 * every time a borewell, inspection, or evidence record changes.
 */

export type RiskReason = { label: string; points: number };

export type RiskInput = {
  status: string;
  waterStatus?: string | null;
  lastInspectionDate?: string | Date | null;
  nearestSensitivePlace?: string | null;
  distanceToSensitivePlace?: number | null;
  hasFence?: boolean | null;
  hasWarningSign?: boolean | null;
  depthFeet?: number | null;
  hazards?: string[] | null;
  hasPhotoEvidence?: boolean | null;
};

export type RiskResult = {
  score: number;
  level: "Low" | "Medium" | "High" | "Critical";
  reasons: RiskReason[];
  recommendedAction: string;
};

function monthsSince(date: string | Date | null | undefined): number {
  if (!date) return Infinity;
  const d = new Date(date);
  if (isNaN(d.getTime())) return Infinity;
  return (Date.now() - d.getTime()) / (1000 * 60 * 60 * 24 * 30.44);
}

export function computeRiskScore(input: RiskInput): RiskResult {
  let score = 0;
  const reasons: RiskReason[] = [];
  const add = (label: string, points: number) => {
    score += points;
    reasons.push({ label, points });
  };

  if (input.status === "Open/Unsafe") add("Open / unsafe condition", 40);

  if (input.status === "Abandoned" || input.waterStatus === "Dry") {
    add(input.status === "Abandoned" ? "Abandoned borewell" : "Dry borewell", 20);
  }

  const overdueMonths = monthsSince(input.lastInspectionDate);
  if (overdueMonths > 12) {
    add(
      input.lastInspectionDate
        ? `No verified inspection in ${Math.floor(overdueMonths)} months`
        : "Never formally inspected",
      20
    );
  }

  if (input.nearestSensitivePlace && input.nearestSensitivePlace !== "None") {
    const dist = Number(input.distanceToSensitivePlace ?? 9999);
    if (dist <= 100) add(`${dist}m from ${input.nearestSensitivePlace}`, 20);
    else if (dist <= 250) add(`${dist}m from ${input.nearestSensitivePlace}`, 10);
  }

  if (!input.hasFence) add("No fencing installed", 10);
  if (!input.hasWarningSign) add("No warning signage", 5);
  if (Number(input.depthFeet ?? 0) > 100) add(`Depth ${input.depthFeet}ft exceeds 100ft`, 5);

  const hazards = (input.hazards ?? []).filter((h) => h && h !== "None");
  if (hazards.length) add(`Hazard present: ${hazards.join(", ")}`, 10);

  if (!input.hasPhotoEvidence) add("Photo evidence missing", 10);

  score = Math.min(score, 100);
  const level: RiskResult["level"] =
    score >= 75 ? "Critical" : score >= 50 ? "High" : score >= 25 ? "Medium" : "Low";

  const recommendedAction =
    level === "Critical"
      ? "Immediate inspection & escalation to Block/District required"
      : level === "High"
      ? "Schedule priority inspection within 7 days"
      : level === "Medium"
      ? "Schedule routine inspection"
      : "Monitor as per regular schedule";

  return { score, level, reasons, recommendedAction };
}
