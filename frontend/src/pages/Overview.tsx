import React from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, ClipboardList, Droplet, ShieldAlert, BadgeCheck, AlertCircle, CheckSquare, Siren } from "lucide-react";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend } from "recharts";
import { api } from "../api/client";
import { Card, KPI, Spinner, ErrorState, Badge } from "../components/ui";
import { RISK_COLORS } from "../lib/constants";
import type { Borewell } from "../lib/types";

export default function Overview() {
  const navigate = useNavigate();
  const { data: borewells, isLoading, error } = useQuery({
    queryKey: ["borewells"],
    queryFn: () => api.get<Borewell[]>("/borewells"),
  });
  const { data: summary } = useQuery({
    queryKey: ["compliance-summary"],
    queryFn: () => api.get<any>("/reports/compliance-summary"),
  });

  if (isLoading) return <Spinner label="Loading dashboard…" />;
  if (error || !borewells) return <ErrorState message="Could not load the dashboard. Please try again." />;

  const total = borewells.length;
  const active = borewells.filter((b) => b.status === "Active").length;
  const abandoned = borewells.filter((b) => b.status === "Abandoned").length;
  const verified = borewells.filter((b) => b.verificationStatus === "Verified").length;
  const unverified = total - verified;
  const critical = borewells.filter((b) => b.riskLevel === "Critical").length;

  const statusDonut = ["Active", "Abandoned", "Capped", "Open/Unsafe"].map((s) => ({ name: s, value: borewells.filter((b) => b.status === s).length }));
  const riskBars = ["Low", "Medium", "High", "Critical"].map((r) => ({ name: r, value: borewells.filter((b) => b.riskLevel === r).length }));
  const donutColors = ["#2563EB", "#6B7280", "#16A34A", "#DC2626"];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Borewell Safety Overview</h1>
        <div className="flex flex-wrap gap-2 mt-2 text-xs text-slate-500">
          <span className="px-2 py-1 bg-white border border-slate-200 rounded-md">District: Nashik</span>
          <Badge bg="#F1F5F9" fg="#475569">Live data</Badge>
        </div>
      </div>

      {critical > 0 && (
        <div onClick={() => navigate("/registry?risk=Critical")} className="cursor-pointer rounded-lg border border-red-300 bg-red-50 px-4 py-3 flex items-center gap-3 hover:bg-red-100 transition">
          <AlertTriangle className="text-red-600 shrink-0" size={20} />
          <p className="text-sm font-semibold text-red-800">{critical} critical-risk borewells require immediate action.</p>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KPI label="Total Registered" value={total} tone="navy" onClick={() => navigate("/registry")} />
        <KPI label="Active Borewells" value={active} tone="teal" onClick={() => navigate("/registry?status=Active")} />
        <KPI label="Abandoned" value={abandoned} onClick={() => navigate("/registry?status=Abandoned")} />
        <KPI label="Verified Safe" value={verified} onClick={() => navigate("/registry?verification=Verified")} />
        <KPI label="Unverified" value={unverified} tone="amber" onClick={() => navigate("/registry?verification=not-verified")} />
        <KPI label="Critical Risk" value={critical} tone="red" onClick={() => navigate("/registry?risk=Critical")} />
        <KPI label="Inspections Overdue" value={summary?.inspectionsOverdue ?? "—"} tone="amber" onClick={() => navigate("/inspections")} />
        <KPI label="Open Escalations" value={summary?.pendingEscalations ?? "—"} tone="red" onClick={() => navigate("/escalations")} />
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <Card title="Borewell Status Distribution">
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={statusDonut} dataKey="value" nameKey="name" innerRadius={55} outerRadius={85} paddingAngle={2}>
                {statusDonut.map((_, i) => <Cell key={i} fill={donutColors[i]} />)}
              </Pie>
              <Tooltip /><Legend />
            </PieChart>
          </ResponsiveContainer>
        </Card>
        <Card title="Risk Distribution">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={riskBars}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" fontSize={12} /><YAxis allowDecimals={false} fontSize={12} />
              <Tooltip />
              <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                {riskBars.map((r, i) => <Cell key={i} fill={RISK_COLORS[r.name].dot} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>
    </div>
  );
}
