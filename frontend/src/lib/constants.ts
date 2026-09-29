import type { Role } from "./types";

export const STATUS_LIST = ["Active", "Abandoned", "Dry", "Under Construction", "Capped", "Open/Unsafe"];
export const RISK_LIST = ["Low", "Medium", "High", "Critical"] as const;
export const OWNERSHIP_LIST = ["Private", "Panchayat", "Government", "Unknown"];
export const PURPOSE_LIST = ["Irrigation", "Drinking Water", "Industrial", "Construction", "Exploratory", "Other"];
export const SENSITIVE_LIST = ["School", "Anganwadi", "Residential Area", "Road", "Playground", "Hospital", "None"];
export const HAZARD_LIST = ["Loose Soil", "Flooding", "Construction Activity", "Electric Equipment", "None"];
export const EVIDENCE_CATEGORIES = [
  "Borewell opening", "Cap condition", "Fence or barricade", "Warning sign",
  "Surrounding area", "Access route", "Other",
];
export const SAFETY_CATEGORIES = ["Cap condition", "Fence or barricade", "Warning sign"];

export const STATUS_COLORS: Record<string, { bg: string; fg: string }> = {
  Active: { bg: "#DBEAFE", fg: "#1D4ED8" },
  Abandoned: { bg: "#E5E7EB", fg: "#374151" },
  Capped: { bg: "#DCFCE7", fg: "#15803D" },
  "Open/Unsafe": { bg: "#FEE2E2", fg: "#B91C1C" },
  Dry: { bg: "#F1F5F9", fg: "#475569" },
  "Under Construction": { bg: "#EDE9FE", fg: "#6D28D9" },
};

export const RISK_COLORS: Record<string, { bg: string; fg: string; dot: string }> = {
  Low: { bg: "#DCFCE7", fg: "#15803D", dot: "#16A34A" },
  Medium: { bg: "#FEF9C3", fg: "#854D0E", dot: "#CA8A04" },
  High: { bg: "#FFEDD5", fg: "#9A3412", dot: "#EA580C" },
  Critical: { bg: "#FEE2E2", fg: "#B91C1C", dot: "#DC2626" },
};

export const VERIFY_COLORS: Record<string, { bg: string; fg: string }> = {
  Verified: { bg: "#DCFCE7", fg: "#15803D" },
  Pending: { bg: "#FEF3C7", fg: "#92400E" },
  Rejected: { bg: "#FEE2E2", fg: "#B91C1C" },
  "Not Submitted": { bg: "#E5E7EB", fg: "#374151" },
};

export const LOCATION_STATUS_META: Record<string, { label: string; bg: string; fg: string }> = {
  verified: { label: "Location verified", bg: "#DCFCE7", fg: "#15803D" },
  needs_review: { label: "Location needs review", bg: "#FEF3C7", fg: "#92400E" },
  mismatch: { label: "Location mismatch", bg: "#FEE2E2", fg: "#B91C1C" },
  unavailable: { label: "Location unavailable", bg: "#E5E7EB", fg: "#374151" },
  low_confidence: { label: "Low GPS confidence", bg: "#FEF3C7", fg: "#92400E" },
};

export const ROLE_LABELS: Record<Role, string> = {
  district_admin: "District Administrator",
  block_officer: "Block/Panchayat Officer",
  field_inspector: "Field Inspector",
  emergency_responder: "Emergency Responder",
  public_reporter: "Public Reporter",
};

export const NAV_BY_ROLE: Record<Role, { to: string; label: string }[]> = {
  district_admin: [
    { to: "/", label: "Overview" },
    { to: "/registry", label: "Borewell Registry" },
    { to: "/map", label: "Risk Map" },
    { to: "/inspections", label: "Inspections" },
    { to: "/verification", label: "Verification Queue" },
    { to: "/escalations", label: "Escalations" },
    { to: "/emergency", label: "Emergency Response" },
    { to: "/reports", label: "Reports" },
  ],
  block_officer: [
    { to: "/", label: "Overview" },
    { to: "/registry", label: "Borewell Registry" },
    { to: "/map", label: "Risk Map" },
    { to: "/inspections", label: "Inspections" },
    { to: "/escalations", label: "Escalations" },
    { to: "/reports", label: "Reports" },
  ],
  field_inspector: [
    { to: "/inspections", label: "Inspections" },
    { to: "/registry", label: "Borewell Registry" },
    { to: "/map", label: "Risk Map" },
  ],
  emergency_responder: [
    { to: "/emergency", label: "Emergency Response" },
    { to: "/map", label: "Risk Map" },
  ],
  public_reporter: [
    { to: "/report", label: "Report a Borewell" },
    { to: "/track", label: "Track Report" },
  ],
};
