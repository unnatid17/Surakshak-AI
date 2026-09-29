/**
 * Minimal assertion-based tests (no test runner dependency — run with:
 *   npx tsx src/lib/riskEngine.test.ts
 * Swap in Jest/Vitest for a real project if preferred.
 */
import { computeRiskScore } from "./riskEngine";

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(`FAILED: ${msg}`);
  console.log(`OK: ${msg}`);
}

// Matches the worked example from the product spec: open/unsafe (+40),
// no fencing (+10), 70m from a school (+20), 14 months overdue (+20) = 90.
const result = computeRiskScore({
  status: "Open/Unsafe",
  waterStatus: "Available",
  lastInspectionDate: new Date(Date.now() - 14 * 30.44 * 86400000).toISOString(),
  nearestSensitivePlace: "School",
  distanceToSensitivePlace: 70,
  hasFence: false,
  hasWarningSign: true,
  depthFeet: 45,
  hazards: ["None"],
  hasPhotoEvidence: true,
});

assert(result.score === 90, `score should be 90, got ${result.score}`);
assert(result.level === "Critical", `level should be Critical, got ${result.level}`);
assert(result.reasons.length === 4, `should have 4 reasons, got ${result.reasons.length}`);

const capped = computeRiskScore({
  status: "Open/Unsafe",
  hasFence: false,
  hasWarningSign: false,
  depthFeet: 200,
  hazards: ["Loose Soil", "Flooding"],
  hasPhotoEvidence: false,
  nearestSensitivePlace: "School",
  distanceToSensitivePlace: 10,
  lastInspectionDate: null,
});
assert(capped.score === 100, `score should cap at 100, got ${capped.score}`);

const safe = computeRiskScore({
  status: "Active",
  hasFence: true,
  hasWarningSign: true,
  depthFeet: 40,
  hazards: ["None"],
  hasPhotoEvidence: true,
  nearestSensitivePlace: "None",
  lastInspectionDate: new Date().toISOString(),
});
assert(safe.score === 0 && safe.level === "Low", "fully compliant borewell should score 0 / Low");

console.log("All risk engine tests passed.");
