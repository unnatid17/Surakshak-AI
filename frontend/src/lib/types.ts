export type Role = "district_admin" | "block_officer" | "field_inspector" | "emergency_responder" | "public_reporter";

export type AuthUser = { id: string; name: string; role: Role };

export type RiskReason = { label: string; points: number };
export type RiskLevel = "Low" | "Medium" | "High" | "Critical";

export type Borewell = {
  id: string;
  borewellCode: string;
  ownerName: string;
  ownerPhone: string;
  ownershipType: string;
  purpose: string;
  state: string;
  district: string;
  block: string;
  panchayat: string;
  village: string;
  address: string;
  landmark: string;
  latitude: number;
  longitude: number;
  status: string;
  depthFeet: number;
  diameterInches: number;
  casingDiameter: number;
  waterStatus: string;
  yearDrilled: number;
  accessibility: string;
  hazards: string[];
  isCapped: boolean;
  hasFence: boolean;
  hasWarningSign: boolean;
  hasPhotoEvidence: boolean;
  nearestSensitivePlace: string;
  distanceToSensitivePlace: number | null;
  verificationStatus: string;
  riskScore: number;
  riskLevel: RiskLevel;
  riskReasons: RiskReason[];
  lastInspectionDate: string | null;
  nextInspectionDate: string | null;
  createdAt: string;
  updatedAt: string;
};

export type Inspection = {
  id: string;
  inspectionCode: string;
  borewellId: string;
  assignedInspectorName: string;
  priority: string;
  instructions: string | null;
  assignedDate: string;
  dueDate: string;
  completedDate: string | null;
  status: string;
  checklist: Record<string, boolean> | null;
  observations: string | null;
  result: string | null;
};

export type LocationStatus = "verified" | "needs_review" | "mismatch" | "unavailable" | "low_confidence";

export type EvidencePhoto = {
  id: string;
  inspectionId: string | null;
  borewellId: string;
  category: string;
  fileName: string;
  filePath: string;
  mimeType: string;
  fileSize: number;
  latitude: number | null;
  longitude: number | null;
  gpsAccuracyMeters: number | null;
  distanceFromBorewellMeters: number | null;
  locationStatus: LocationStatus;
  integrityHash: string | null;
  capturedAt: string;
  uploadedAt: string;
  uploadedByName: string;
  reviewStatus: "pending" | "approved" | "rejected" | "manual_review";
  reviewerComment: string | null;
};

export type Escalation = {
  id: string;
  caseCode: string;
  borewellId: string;
  reason: string;
  riskLevel: string;
  currentLevel: string;
  assignedTo: string;
  openedAt: string;
  dueAt: string | null;
  resolvedAt: string | null;
  status: string;
  notes: string[];
  history: { level: string; at: string }[];
};

export type Incident = {
  id: string;
  incidentCode: string;
  borewellId: string | null;
  reportedBy: string;
  reporterPhone: string;
  latitude: number;
  longitude: number;
  timeObserved: string;
  peopleAffected: number;
  personTrapped: string;
  accessRoute: string;
  description: string;
  status: string;
  createdAt: string;
};
