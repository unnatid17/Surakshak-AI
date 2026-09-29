-- Suraksha AI — database schema
-- Requires the PostGIS extension. Run once via `npm run migrate`.

CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pgcrypto; -- for gen_random_uuid()

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('district_admin','block_officer','field_inspector','emergency_responder','public_reporter')),
  district TEXT,
  block TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS borewells (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  borewell_code TEXT UNIQUE NOT NULL,
  owner_name TEXT,
  owner_phone TEXT,
  ownership_type TEXT,
  purpose TEXT,
  state TEXT,
  district TEXT,
  block TEXT,
  panchayat TEXT,
  village TEXT,
  address TEXT,
  landmark TEXT,
  location GEOGRAPHY(POINT, 4326) NOT NULL,
  status TEXT NOT NULL DEFAULT 'Active',
  depth_feet NUMERIC,
  diameter_inches NUMERIC,
  casing_diameter NUMERIC,
  water_status TEXT,
  year_drilled INT,
  accessibility TEXT,
  hazards TEXT[] DEFAULT '{}',
  is_capped BOOLEAN DEFAULT false,
  has_fence BOOLEAN DEFAULT false,
  has_warning_sign BOOLEAN DEFAULT false,
  has_photo_evidence BOOLEAN DEFAULT false,
  nearest_sensitive_place TEXT DEFAULT 'None',
  distance_to_sensitive_place NUMERIC,
  verification_status TEXT NOT NULL DEFAULT 'Not Submitted',
  risk_score INT NOT NULL DEFAULT 0,
  risk_level TEXT NOT NULL DEFAULT 'Low',
  risk_reasons JSONB DEFAULT '[]',
  last_inspection_date TIMESTAMPTZ,
  next_inspection_date TIMESTAMPTZ,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS borewells_location_idx ON borewells USING GIST(location);
CREATE INDEX IF NOT EXISTS borewells_risk_idx ON borewells (risk_level);
CREATE INDEX IF NOT EXISTS borewells_status_idx ON borewells (status);

CREATE TABLE IF NOT EXISTS inspections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inspection_code TEXT UNIQUE NOT NULL,
  borewell_id UUID NOT NULL REFERENCES borewells(id) ON DELETE CASCADE,
  assigned_inspector_id UUID REFERENCES users(id),
  assigned_inspector_name TEXT,
  priority TEXT DEFAULT 'Normal',
  instructions TEXT,
  assigned_date TIMESTAMPTZ DEFAULT now(),
  due_date TIMESTAMPTZ,
  completed_date TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'Assigned', -- Assigned/Overdue/Submitted/Completed/Needs Reinspection
  checklist JSONB,
  observations TEXT,
  result TEXT,
  reviewer_comments TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS inspections_borewell_idx ON inspections (borewell_id);
CREATE INDEX IF NOT EXISTS inspections_status_idx ON inspections (status);

CREATE TABLE IF NOT EXISTS evidence_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inspection_id UUID REFERENCES inspections(id) ON DELETE CASCADE,
  borewell_id UUID NOT NULL REFERENCES borewells(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  file_name TEXT,
  file_path TEXT,
  mime_type TEXT,
  file_size INT,
  location GEOGRAPHY(POINT, 4326),
  gps_accuracy_meters NUMERIC,
  distance_from_borewell_meters NUMERIC,
  location_status TEXT NOT NULL, -- verified/needs_review/mismatch/unavailable/low_confidence
  integrity_hash TEXT,
  captured_at TIMESTAMPTZ,
  uploaded_at TIMESTAMPTZ DEFAULT now(),
  uploaded_by UUID REFERENCES users(id),
  uploaded_by_name TEXT,
  review_status TEXT NOT NULL DEFAULT 'pending', -- pending/approved/rejected/manual_review
  reviewer_id UUID REFERENCES users(id),
  reviewer_comment TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS evidence_borewell_idx ON evidence_photos (borewell_id);
CREATE INDEX IF NOT EXISTS evidence_inspection_idx ON evidence_photos (inspection_id);

CREATE TABLE IF NOT EXISTS escalations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_code TEXT UNIQUE NOT NULL,
  borewell_id UUID NOT NULL REFERENCES borewells(id) ON DELETE CASCADE,
  reason TEXT,
  risk_level TEXT,
  current_level TEXT NOT NULL DEFAULT 'Panchayat', -- Panchayat/Block Office/District Administration
  assigned_to TEXT,
  opened_at TIMESTAMPTZ DEFAULT now(),
  due_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'In Progress', -- In Progress/Overdue/Resolved
  notes JSONB DEFAULT '[]',
  history JSONB DEFAULT '[]'
);
CREATE INDEX IF NOT EXISTS escalations_borewell_idx ON escalations (borewell_id);
CREATE INDEX IF NOT EXISTS escalations_status_idx ON escalations (status);

CREATE TABLE IF NOT EXISTS incidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_code TEXT UNIQUE NOT NULL,
  borewell_id UUID REFERENCES borewells(id) ON DELETE SET NULL,
  reported_by TEXT,
  reporter_phone TEXT,
  location GEOGRAPHY(POINT, 4326),
  time_observed TIMESTAMPTZ,
  people_affected INT DEFAULT 0,
  person_trapped TEXT DEFAULT 'Unknown',
  access_route TEXT,
  description TEXT,
  photo_path TEXT,
  status TEXT NOT NULL DEFAULT 'Active', -- Active/Resolved
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_code TEXT UNIQUE NOT NULL,
  reporter_name TEXT,
  reporter_phone TEXT,
  location GEOGRAPHY(POINT, 4326),
  landmark TEXT,
  issue_type TEXT,
  description TEXT,
  photo_path TEXT,
  status TEXT NOT NULL DEFAULT 'Received', -- Received/Pending Verification/Resolved
  linked_borewell_id UUID REFERENCES borewells(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  user_name TEXT,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  previous_value TEXT,
  new_value TEXT,
  timestamp TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS audit_entity_idx ON audit_log (entity_type, entity_id);
