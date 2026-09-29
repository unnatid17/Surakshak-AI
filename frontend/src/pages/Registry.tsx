import React, { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Search, Plus, Download, Eye } from "lucide-react";
import { api } from "../api/client";
import { Card, StatusBadge, RiskBadge, VerifyBadge, Spinner, ErrorState, EmptyState, Select, TextInput } from "../components/ui";
import { STATUS_LIST, RISK_LIST } from "../lib/constants";
import type { Borewell } from "../lib/types";
import RegisterWizard from "./RegisterWizard";

export default function Registry() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [search, setSearch] = useState("");
  const [showRegister, setShowRegister] = useState(false);

  const status = params.get("status") || "";
  const risk = params.get("risk") || "";
  const verification = params.get("verification") || "";

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["borewells", status, risk, verification, search],
    queryFn: () => {
      const qs = new URLSearchParams();
      if (status) qs.set("status", status);
      if (risk) qs.set("risk", risk);
      if (verification) qs.set("verification", verification);
      if (search) qs.set("search", search);
      return api.get<Borewell[]>(`/borewells?${qs.toString()}`);
    },
  });

  const exportCsv = () => {
    window.open("/api/borewells/export.csv", "_blank");
  };

  const setFilter = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value); else next.delete(key);
    setParams(next);
  };

  if (isLoading) return <Spinner label="Loading registry…" />;
  if (error || !data) return <ErrorState message="Could not load the borewell registry." />;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold text-slate-900">Borewell Registry</h1>
        <div className="flex gap-2">
          <button onClick={exportCsv} className="flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-md border border-slate-300 bg-white"><Download size={14} />Export CSV</button>
          <button onClick={() => setShowRegister(true)} className="flex items-center gap-1.5 text-xs font-semibold px-3.5 py-2 rounded-md text-white bg-[#0F2C4C]"><Plus size={14} />Register Borewell</button>
        </div>
      </div>

      <Card>
        <div className="flex flex-col lg:flex-row gap-3">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-2.5 top-2.5 text-slate-400" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by ID, owner, village, landmark…" className="w-full pl-8 pr-3 py-2 rounded-md border border-slate-300 text-sm" />
          </div>
          <Select value={status} onChange={(e) => setFilter("status", e.target.value)}>
            <option value="">All statuses</option>
            {STATUS_LIST.map((s) => <option key={s} value={s}>{s}</option>)}
          </Select>
          <Select value={risk} onChange={(e) => setFilter("risk", e.target.value)}>
            <option value="">All risk levels</option>
            {RISK_LIST.map((s) => <option key={s} value={s}>{s}</option>)}
          </Select>
        </div>
      </Card>

      <p className="text-xs text-slate-500">{data.length} borewell{data.length !== 1 ? "s" : ""} found</p>

      <div className="bg-white rounded-lg border border-slate-200 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
            <tr>{["ID", "Village", "Owner", "Status", "Verification", "Risk", "Last Inspected", ""].map((h) => <th key={h} className="text-left px-3 py-2.5 whitespace-nowrap">{h}</th>)}</tr>
          </thead>
          <tbody>
            {data.map((r) => (
              <tr key={r.id} className="border-t border-slate-100 hover:bg-slate-50/70">
                <td className="px-3 py-2.5 font-medium text-slate-800 whitespace-nowrap">{r.borewellCode}</td>
                <td className="px-3 py-2.5 text-slate-600">{r.village}</td>
                <td className="px-3 py-2.5 text-slate-600">{r.ownerName}</td>
                <td className="px-3 py-2.5"><StatusBadge status={r.status} /></td>
                <td className="px-3 py-2.5"><VerifyBadge status={r.verificationStatus} /></td>
                <td className="px-3 py-2.5"><RiskBadge level={r.riskLevel} /> <span className="text-[11px] text-slate-400 ml-1">{r.riskScore}</span></td>
                <td className="px-3 py-2.5 text-slate-500">{r.lastInspectionDate ? new Date(r.lastInspectionDate).toLocaleDateString() : "—"}</td>
                <td className="px-3 py-2.5"><button onClick={() => navigate(`/registry/${r.id}`)} aria-label={`View ${r.borewellCode}`} className="p-1.5 rounded hover:bg-slate-100 text-slate-500"><Eye size={14} /></button></td>
              </tr>
            ))}
          </tbody>
        </table>
        {data.length === 0 && <EmptyState icon={Search} title="No borewells match these filters" />}
      </div>

      {showRegister && <RegisterWizard onClose={() => setShowRegister(false)} onDone={(id) => { refetch(); setShowRegister(false); navigate(`/registry/${id}`); }} />}
    </div>
  );
}
