import bcrypt from "bcryptjs";
import { pool } from "./pool";
import { computeRiskScore } from "../lib/riskEngine";

const monthsAgo = (n: number) => new Date(Date.now() - n * 30.44 * 86400000).toISOString();
const daysAgo = (n: number) => new Date(Date.now() - n * 86400000).toISOString();
const daysFromNow = (n: number) => new Date(Date.now() + n * 86400000).toISOString();

async function seed() {
  console.log("Seeding demo data...");

  // --- Users (one per role, password: "password123" for every demo account) ---
  const pw = await bcrypt.hash("password123", 10);
  const users = [
    { name: "Anita Deshmukh", email: "admin@suraksha.demo", role: "district_admin" },
    { name: "Vinod Kale", email: "officer@suraksha.demo", role: "block_officer" },
    { name: "Ravi Patil", email: "inspector@suraksha.demo", role: "field_inspector" },
    { name: "NDRF Demo User", email: "responder@suraksha.demo", role: "emergency_responder" },
  ];
  const userIds: Record<string, string> = {};
  for (const u of users) {
    const { rows } = await pool.query(
      `INSERT INTO users (name, email, password_hash, role, district)
       VALUES ($1,$2,$3,$4,'Nashik')
       ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name
       RETURNING id, role`,
      [u.name, u.email, pw, u.role]
    );
    userIds[u.role] = rows[0].id;
  }
  console.log("Demo accounts (password: password123):", users.map((u) => u.email).join(", "));

  // --- Borewells ---
  type Seed = {
    code: string; village: string; block: string; panchayat: string; lat: number; lng: number;
    status: string; verification: string; owner: string; phone: string; depth: number;
    fence: boolean; sign: boolean; photo: boolean; lastInspMonthsAgo: number | null;
    sensitivePlace: string; distance: number | null; landmark: string; createdMonthsAgo: number;
    hazards?: string[];
  };
  const seeds: Seed[] = [
    { code: "BW-NK-0001", village: "Sinnar", block: "Sinnar", panchayat: "Sinnar GP", lat: 19.851, lng: 73.981, status: "Active", verification: "Verified", owner: "Dattatray Gaikwad", phone: "9822011001", depth: 65, fence: true, sign: true, photo: true, lastInspMonthsAgo: 2, sensitivePlace: "None", distance: null, landmark: "Near Sinnar bus stand", createdMonthsAgo: 10 },
    { code: "BW-NK-0002", village: "Sinnar", block: "Sinnar", panchayat: "Vadangali GP", lat: 19.858, lng: 73.99, status: "Open/Unsafe", verification: "Not Submitted", owner: "Unknown / Untraced", phone: "", depth: 45, fence: false, sign: true, photo: true, lastInspMonthsAgo: 14, sensitivePlace: "School", distance: 70, landmark: "Behind Zilla Parishad Primary School", createdMonthsAgo: 18 },
    { code: "BW-NK-0003", village: "Nashik City", block: "Nashik Rural", panchayat: "Panchavati GP", lat: 20.006, lng: 73.79, status: "Open/Unsafe", verification: "Not Submitted", owner: "Suresh Bhosale", phone: "9834011003", depth: 60, fence: false, sign: true, photo: true, lastInspMonthsAgo: 13, sensitivePlace: "Road", distance: 300, landmark: "Near Panchavati water tank", createdMonthsAgo: 15 },
    { code: "BW-NK-0004", village: "Niphad", block: "Niphad", panchayat: "Niphad GP", lat: 20.086, lng: 74.115, status: "Capped", verification: "Pending", owner: "Kisan Pawar", phone: "9822011004", depth: 70, fence: true, sign: true, photo: true, lastInspMonthsAgo: null, sensitivePlace: "None", distance: null, landmark: "Pawar farm, Niphad-Yeola road", createdMonthsAgo: 1 },
    { code: "BW-NK-0005", village: "Yeola", block: "Yeola", panchayat: "Yeola GP", lat: 20.045, lng: 74.479, status: "Active", verification: "Pending", owner: "Anita Shinde", phone: "9876511005", depth: 115, fence: false, sign: false, photo: true, lastInspMonthsAgo: 8, sensitivePlace: "Residential Area", distance: 90, landmark: "Near Shinde Wasti", createdMonthsAgo: 9, hazards: ["Loose Soil"] },
    { code: "BW-NK-0006", village: "Igatpuri", block: "Igatpuri", panchayat: "Igatpuri GP", lat: 19.699, lng: 73.565, status: "Active", verification: "Rejected", owner: "Vitthal More", phone: "9822011006", depth: 50, fence: true, sign: true, photo: false, lastInspMonthsAgo: 3, sensitivePlace: "None", distance: null, landmark: "Near Igatpuri railway colony", createdMonthsAgo: 7 },
    { code: "BW-NK-0007", village: "Sinnar", block: "Sinnar", panchayat: "Musalgaon GP", lat: 19.842, lng: 73.965, status: "Active", verification: "Verified", owner: "Ramesh Kad", phone: "9822011007", depth: 55, fence: true, sign: true, photo: true, lastInspMonthsAgo: 1, sensitivePlace: "None", distance: null, landmark: "Musalgaon MIDC road", createdMonthsAgo: 11 },
    { code: "BW-NK-0008", village: "Nashik City", block: "Nashik Rural", panchayat: "Adgaon GP", lat: 19.995, lng: 73.81, status: "Active", verification: "Pending", owner: "Sunita Jadhav", phone: "9876511008", depth: 65, fence: true, sign: true, photo: true, lastInspMonthsAgo: 4, sensitivePlace: "Anganwadi", distance: 220, landmark: "Adgaon Anganwadi road", createdMonthsAgo: 3 },
    { code: "BW-NK-0009", village: "Niphad", block: "Niphad", panchayat: "Pimpalgaon GP", lat: 20.078, lng: 74.098, status: "Open/Unsafe", verification: "Not Submitted", owner: "Balasaheb Wagh", phone: "9822011009", depth: 95, fence: false, sign: false, photo: true, lastInspMonthsAgo: 5, sensitivePlace: "None", distance: null, landmark: "Pimpalgaon grape farm belt", createdMonthsAgo: 4 },
    { code: "BW-NK-0010", village: "Yeola", block: "Yeola", panchayat: "Andarsul GP", lat: 20.03, lng: 74.46, status: "Open/Unsafe", verification: "Not Submitted", owner: "Prakash Deore", phone: "9822011010", depth: 40, fence: true, sign: true, photo: true, lastInspMonthsAgo: 2, sensitivePlace: "None", distance: null, landmark: "Andarsul MIDC frontage", createdMonthsAgo: 6 },
    { code: "BW-NK-0011", village: "Igatpuri", block: "Igatpuri", panchayat: "Ghoti GP", lat: 19.72, lng: 73.54, status: "Dry", verification: "Verified", owner: "Manisha Ahire", phone: "9876511011", depth: 80, fence: true, sign: true, photo: true, lastInspMonthsAgo: 3, sensitivePlace: "None", distance: null, landmark: "Ghoti bypass", createdMonthsAgo: 14 },
    { code: "BW-NK-0012", village: "Sinnar", block: "Sinnar", panchayat: "Dodi GP", lat: 19.86, lng: 73.965, status: "Active", verification: "Not Submitted", owner: "Ganesh Thorat", phone: "9822011012", depth: 30, fence: true, sign: true, photo: true, lastInspMonthsAgo: null, sensitivePlace: "None", distance: null, landmark: "Dodi crossroad", createdMonthsAgo: 0 },
  ];

  const idByCode: Record<string, string> = {};
  for (const s of seeds) {
    const lastInspection = s.lastInspMonthsAgo !== null ? monthsAgo(s.lastInspMonthsAgo) : null;
    const risk = computeRiskScore({
      status: s.status, waterStatus: s.status === "Dry" ? "Dry" : "Available",
      lastInspectionDate: lastInspection, nearestSensitivePlace: s.sensitivePlace,
      distanceToSensitivePlace: s.distance, hasFence: s.fence, hasWarningSign: s.sign,
      depthFeet: s.depth, hazards: s.hazards ?? ["None"], hasPhotoEvidence: s.photo,
    });
    const { rows } = await pool.query(
      `INSERT INTO borewells (
         borewell_code, owner_name, owner_phone, ownership_type, purpose, state, district, block,
         panchayat, village, address, landmark, location, status, depth_feet, diameter_inches,
         water_status, hazards, has_fence, has_warning_sign, has_photo_evidence,
         nearest_sensitive_place, distance_to_sensitive_place, verification_status,
         risk_score, risk_level, risk_reasons, last_inspection_date, created_by, created_at
       ) VALUES (
         $1,$2,$3,'Private','Drinking Water','Maharashtra','Nashik',$4,$5,$6,'',$7,
         ST_SetSRID(ST_MakePoint($9,$8),4326)::geography,$10,$11,6,$12,$13,$14,$15,$16,$17,$18,
         $19,$20,$21,jsonb '[]',$22,$23,$24
       ) ON CONFLICT (borewell_code) DO NOTHING RETURNING id`,
      [
        s.code, s.owner, s.phone, s.block, s.panchayat, s.village, s.landmark,
        s.lat, s.lng, s.status, s.depth, s.status === "Dry" ? "Dry" : "Available",
        s.hazards ?? ["None"], s.fence, s.sign, s.photo, s.sensitivePlace, s.distance,
        s.verification, risk.score, risk.level, lastInspection, userIds.district_admin, monthsAgo(s.createdMonthsAgo),
      ]
    );
    if (rows[0]) {
      idByCode[s.code] = rows[0].id;
      await pool.query(
        `UPDATE borewells SET risk_reasons = $2::jsonb WHERE id = $1`,
        [rows[0].id, JSON.stringify(risk.reasons)]
      );
    } else {
      const existing = await pool.query("SELECT id FROM borewells WHERE borewell_code = $1", [s.code]);
      idByCode[s.code] = existing.rows[0].id;
    }
  }

  // --- Inspections ---
  const inspections = [
    { code: "INS-0101", bw: "BW-NK-0007", inspector: "Ravi Patil", assigned: monthsAgo(1), due: monthsAgo(1), completed: monthsAgo(1), status: "Completed", result: "Safe and compliant" },
    { code: "INS-0102", bw: "BW-NK-0002", inspector: "Ravi Patil", assigned: monthsAgo(1), due: daysAgo(10), completed: null, status: "Overdue", result: null },
    { code: "INS-0103", bw: "BW-NK-0003", inspector: "Sunita More", assigned: daysAgo(35), due: daysAgo(20), completed: null, status: "Overdue", result: null },
    { code: "INS-0104", bw: "BW-NK-0005", inspector: "Sunita More", assigned: daysAgo(2), due: daysFromNow(5), completed: null, status: "Assigned", result: null },
  ];
  for (const i of inspections) {
    if (!idByCode[i.bw]) continue;
    await pool.query(
      `INSERT INTO inspections (inspection_code, borewell_id, assigned_inspector_name, assigned_date, due_date, completed_date, status, result)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT (inspection_code) DO NOTHING`,
      [i.code, idByCode[i.bw], i.inspector, i.assigned, i.due, i.completed, i.status, i.result]
    );
  }

  // --- Escalations ---
  const escalations = [
    { code: "ESC-2201", bw: "BW-NK-0002", reason: "Open/unsafe borewell within 100m of school", risk: "Critical", level: "Block Office", assigned: "Block Development Officer, Sinnar", opened: daysAgo(6), due: daysAgo(0), status: "In Progress" },
    { code: "ESC-2202", bw: "BW-NK-0010", reason: "Open/unsafe borewell — resolution overdue", risk: "Medium", level: "Block Office", assigned: "Block Development Officer, Yeola", opened: daysAgo(15), due: daysAgo(8), status: "Overdue" },
  ];
  for (const e of escalations) {
    if (!idByCode[e.bw]) continue;
    await pool.query(
      `INSERT INTO escalations (case_code, borewell_id, reason, risk_level, current_level, assigned_to, opened_at, due_at, status, history)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9, $10::jsonb) ON CONFLICT (case_code) DO NOTHING`,
      [e.code, idByCode[e.bw], e.reason, e.risk, e.level, e.assigned, e.opened, e.due, e.status,
       JSON.stringify([{ level: "Panchayat", at: e.opened }, { level: e.level, at: e.opened }])]
    );
  }

  // --- Incidents ---
  if (idByCode["BW-NK-0009"]) {
    await pool.query(
      `INSERT INTO incidents (incident_code, borewell_id, reported_by, reporter_phone, location, time_observed,
         people_affected, person_trapped, access_route, description, status)
       VALUES ('INC-NK-0001',$1,'Local Farmer (Demo)','9822099001',
         ST_SetSRID(ST_MakePoint(74.098,20.078),4326)::geography, now(), 0, 'No',
         'Via Pimpalgaon farm road, 200m from main road',
         'Open borewell casing exposed after recent rain, livestock at risk.', 'Active')
       ON CONFLICT (incident_code) DO NOTHING`,
      [idByCode["BW-NK-0009"]]
    );
  }

  // --- Public reports ---
  await pool.query(
    `INSERT INTO public_reports (report_code, reporter_name, location, landmark, issue_type, description, status, linked_borewell_id)
     VALUES ('REP-NK-1041','Anonymous', ST_SetSRID(ST_MakePoint(73.81,19.995),4326)::geography,
       'Near Adgaon Anganwadi','Missing warning sign',
       'No warning sign near an active borewell close to the anganwadi playground.', 'Pending Verification', $1)
     ON CONFLICT (report_code) DO NOTHING`,
    [idByCode["BW-NK-0008"] ?? null]
  );
  await pool.query(
    `INSERT INTO public_reports (report_code, reporter_name, reporter_phone, location, landmark, issue_type, description, status)
     VALUES ('REP-NK-1042','Sameer K.','9876543210', ST_SetSRID(ST_MakePoint(73.99,19.86),4326)::geography,
       'Behind old cotton mill, Sinnar','Open borewell',
       'Fully open borewell, no cap, close to a footpath used by school children.', 'Received')
     ON CONFLICT (report_code) DO NOTHING`
  );

  console.log("Seed complete:", Object.keys(idByCode).length, "borewells.");
  await pool.end();
}

seed().catch((err) => {
  console.error("Seeding failed:", err);
  process.exit(1);
});
