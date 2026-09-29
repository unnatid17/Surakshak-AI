/**
 * Suraksha AI — Geo-verification engine.
 *
 * Distance is computed in the database via PostGIS ST_Distance on the
 * `geography` type, which correctly accounts for the earth's curvature —
 * this is more accurate than a hand-rolled Haversine formula and keeps the
 * calculation in one authoritative place. The classification thresholds
 * below are pure JS so they're easy to unit test in isolation.
 */
import { pool } from "../db/pool";

export type LocationStatus = "verified" | "needs_review" | "mismatch" | "unavailable" | "low_confidence";

export function classifyLocation(opts: {
  distanceMeters: number | null;
  accuracyMeters: number | null;
  locationDenied: boolean;
}): LocationStatus {
  const { distanceMeters, accuracyMeters, locationDenied } = opts;
  if (locationDenied || distanceMeters === null || distanceMeters === undefined) return "unavailable";
  if (accuracyMeters && accuracyMeters > 100) return "low_confidence";
  if (distanceMeters <= 50) return "verified";
  if (distanceMeters <= 150) return "needs_review";
  return "mismatch";
}

export function locationMessage(status: LocationStatus, distanceMeters: number | null): string {
  const d = distanceMeters !== null && distanceMeters !== undefined ? Math.round(distanceMeters) : null;
  switch (status) {
    case "verified":
      return `Location verified — evidence captured ${d}m from the registered borewell.`;
    case "needs_review":
      return `Location needs review — evidence captured ${d}m from the registered point.`;
    case "mismatch":
      return `Location mismatch — evidence captured ${d}m from the registered point.`;
    case "low_confidence":
      return `Low GPS confidence — accuracy too wide to reliably confirm distance.`;
    default:
      return "Location unavailable — this submission requires manual review.";
  }
}

/**
 * Computes the great-circle distance (meters) between a captured point and a
 * borewell's registered location using PostGIS. Returns null if either
 * coordinate is missing (i.e. location permission was denied).
 */
export async function distanceToBorewellMeters(
  borewellId: string,
  lat: number | null,
  lng: number | null
): Promise<number | null> {
  if (lat === null || lng === null) return null;
  const { rows } = await pool.query<{ distance: string }>(
    `SELECT ST_Distance(location, ST_SetSRID(ST_MakePoint($2, $3), 4326)::geography) AS distance
     FROM borewells WHERE id = $1`,
    [borewellId, lng, lat]
  );
  if (!rows[0]) return null;
  return Number(rows[0].distance);
}

/** Honest disclaimer surfaced alongside every geo-verification result. */
export const GEO_VERIFICATION_DISCLAIMER =
  "Location metadata supports field verification and is subject to manual review. " +
  "GPS evidence is a supporting verification signal, not a replacement for official inspection.";
