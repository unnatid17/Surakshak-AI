# Suraksha AI — Borewell Safety Registry & Compliance System

A full-stack rebuild of the JalRakshak prototype: real PostgreSQL + PostGIS
database, a Node/Express API that owns every risk and verification decision,
and a React frontend that only ever *displays* what the server computed.

**Honesty note on the name:** "Suraksha AI" does not use machine learning for
its core decisions. Risk scoring, geo-verification, and escalation are all
transparent rule-based engines — see `backend/src/lib/riskEngine.ts` and
`geoEngine.ts`. There is one small, clearly-labeled, advisory-only anomaly
detection module (`backend/src/lib/aiInsights.ts`) that never affects risk,
verification, or escalation. If asked "where's the AI?", point here.

This was built and verified end-to-end (real Postgres+PostGIS, real file
hashing, real GPS distance math) during development — see the test commands
below to reproduce that verification yourself.

## Prerequisites

- Node.js 18+
- PostgreSQL 14+ with the PostGIS extension available (`postgresql-contrib`
  and `postgis` packages on Debian/Ubuntu)

## 1. Database setup

```bash
# Create a role and database (adjust names/passwords as you like)
sudo -u postgres psql -c "CREATE USER suraksha WITH PASSWORD 'suraksha';"
sudo -u postgres psql -c "CREATE DATABASE suraksha_ai OWNER suraksha;"
sudo -u postgres psql -d suraksha_ai -c "CREATE EXTENSION IF NOT EXISTS postgis; CREATE EXTENSION IF NOT EXISTS pgcrypto;"
sudo -u postgres psql -d suraksha_ai -c "GRANT ALL ON SCHEMA public TO suraksha;"
```

## 2. Backend

```bash
cd backend
cp .env.example .env
# edit .env — at minimum set DATABASE_URL and JWT_SECRET

npm install
npm run migrate   # creates all tables
npm run seed      # loads 12 demo borewells + demo user accounts
npm run dev       # starts on http://localhost:4000
```

Demo accounts (all use password `password123`):
| Email | Role |
|---|---|
| admin@suraksha.demo | District Administrator |
| officer@suraksha.demo | Block/Panchayat Officer |
| inspector@suraksha.demo | Field Inspector |
| responder@suraksha.demo | Emergency Responder |

Run the risk-engine unit tests any time with:
```bash
npx tsx src/lib/riskEngine.test.ts
```

## 3. Frontend

```bash
cd frontend
npm install
npm run dev       # starts on http://localhost:5173, proxies /api to :4000
```

Open http://localhost:5173 and log in with any demo account above.

## What's real vs. what's a stub

**Fully working, verified against a live database:**
- Auth (JWT), role-based access control
- Borewell CRUD with server-side risk scoring (matches the spec's worked
  example exactly: open/unsafe + no fence + near school + overdue = 90/Critical)
- Geo-tagged evidence upload with real PostGIS distance calculation,
  SHA-256 file hashing, and location status classification
- Evidence review (approve/reject/override) with mandatory reasons and
  automatic risk recalculation
- Escalation chain (Panchayat → Block → District) with a scheduled
  auto-escalation sweep (node-cron)
- Public reporting (rate-limited, no auth, never exposes private data)
- Full audit logging on every mutating action
- CSV export, compliance summary reports

**Stubbed / needs your input before real deployment:**
- File storage defaults to local disk (`backend/src/lib/storage.ts`) — swap
  in S3 or Supabase Storage for anything beyond a demo (the interface is
  ready, the cloud implementation is not written in)
- Emergency Response's "incident timeline" map marker uses simple Leaflet
  circles, not a custom icon set
- The AI Insights module is a basic statistical heuristic, not a trained
  model — treat it as a placeholder for whatever real analysis you want later
- No automated test suite beyond the risk-engine unit tests — add
  integration tests before relying on this for anything real

## Project structure

```
suraksha-ai/
├── backend/
│   ├── src/
│   │   ├── db/            schema.sql, migrate.ts, seed.ts, pool.ts
│   │   ├── lib/            riskEngine, geoEngine, escalationEngine, storage, aiInsights
│   │   ├── middleware/      auth.ts, auditLog.ts
│   │   ├── routes/          one file per resource
│   │   └── index.ts         Express app entrypoint
│   └── package.json
└── frontend/
    ├── src/
    │   ├── api/client.ts     typed fetch wrapper
    │   ├── components/       shared UI + Layout
    │   ├── hooks/             useAuth, useGeolocation, useToast
    │   ├── pages/             one per route
    │   └── App.tsx / main.tsx
    └── package.json
```
