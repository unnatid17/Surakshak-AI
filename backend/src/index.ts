import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import path from "path";
import dotenv from "dotenv";
import cron from "node-cron";

import authRoutes from "./routes/auth";
import borewellRoutes from "./routes/borewells";
import inspectionRoutes from "./routes/inspections";
import evidenceRoutes from "./routes/evidence";
import escalationRoutes from "./routes/escalations";
import incidentRoutes from "./routes/incidents";
import publicRoutes from "./routes/public";
import reportRoutes from "./routes/reports";
import auditLogRoutes from "./routes/auditLog";
import insightsRoutes from "./routes/insights";
import { runAutoEscalationSweep } from "./lib/escalationEngine";

dotenv.config();

const app = express();

app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(cors({ origin: process.env.CORS_ORIGIN || "http://localhost:5173", credentials: true }));
app.use(express.json({ limit: "2mb" }));
app.use(cookieParser());
app.use(morgan("dev"));

// Locally-stored evidence photos (only used when STORAGE_DRIVER=local — see src/lib/storage.ts)
app.use("/uploads", express.static(path.join(process.cwd(), process.env.LOCAL_UPLOAD_DIR || "./uploads")));

app.get("/health", (_req, res) => res.json({ ok: true, service: "suraksha-ai-backend" }));

app.use("/api/auth", authRoutes);
app.use("/api/borewells", borewellRoutes);
app.use("/api/inspections", inspectionRoutes);
app.use("/api/evidence", evidenceRoutes);
app.use("/api/escalations", escalationRoutes);
app.use("/api/incidents", incidentRoutes);
app.use("/api/public", publicRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/audit-log", auditLogRoutes);
app.use("/api/insights", insightsRoutes);

// Central error handler — keeps failures from leaking stack traces to clients.
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  // eslint-disable-next-line no-console
  console.error(err);
  res.status(err.status || 500).json({ error: err.message || "Internal server error." });
});

const PORT = Number(process.env.PORT) || 4000;
app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Suraksha AI backend listening on http://localhost:${PORT}`);
});

// Hourly sweep for overdue escalations (Panchayat -> Block -> District).
cron.schedule("0 * * * *", () => {
  runAutoEscalationSweep().catch((err) => console.error("Escalation sweep failed:", err));
});
