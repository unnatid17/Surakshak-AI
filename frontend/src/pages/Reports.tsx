import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Download } from "lucide-react";
import { api } from "../api/client";
import { Card, KPI, Spinner, ErrorState } from "../components/ui";

export default function Reports() {
  const { data: summary, isLoading, error } = useQuery({ queryKey: ["compliance-summary"], queryFn: () => api.get<any>("/reports/compliance-summary") });

  if (isLoading) return <Spinner label="Loading reports…" />;
  if (error || !summary) return <ErrorState message="Could not load reports." />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-900">Reports and Analytics</h1>
        <button onClick={() => window.open("/api/borewells/export.csv", "_blank")} className="flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-md border border-slate-300 bg-white"><Download size={14} />Export CSV</button>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KPI label="Total Registered" value={summary.total} tone="navy" />
        <KPI label="Capped & Verified" value={summary.capped_verified} />
        <KPI label="Capped, Unverified" value={summary.capped_unverified} tone="amber" />
        <KPI label="Open / Unsafe" value={summary.open_unsafe} tone="red" />
      </div>
      <Card title="Compliance Summary">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
          <p><span className="text-slate-400">Inspections Overdue:</span> <b>{summary.inspectionsOverdue}</b></p>
          <p><span className="text-slate-400">High-risk near Schools:</span> <b>{summary.near_schools}</b></p>
          <p><span className="text-slate-400">Pending Escalations:</span> <b>{summary.pendingEscalations}</b></p>
        </div>
      </Card>
    </div>
  );
}
