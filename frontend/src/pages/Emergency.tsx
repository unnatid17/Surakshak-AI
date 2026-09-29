import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Siren, Copy, Printer } from "lucide-react";
import { api, ApiError } from "../api/client";
import { Card, Badge, RiskBadge, Spinner } from "../components/ui";
import { useToast } from "../hooks/useToast";
import type { Borewell, Incident } from "../lib/types";

export default function Emergency() {
  const { notify } = useToast();
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<{ borewell: Borewell; incidents: Incident[]; latestApprovedPhoto: any } | null>(null);
  const [searching, setSearching] = useState(false);

  const { data: activeIncidents } = useQuery({ queryKey: ["incidents", "active"], queryFn: () => api.get<Incident[]>("/incidents?status=Active") });
  const { data: borewells } = useQuery({ queryKey: ["borewells"], queryFn: () => api.get<Borewell[]>("/borewells") });

  const search = async () => {
    const match = borewells?.find((b) => b.borewellCode.toLowerCase() === query.trim().toLowerCase());
    if (!match) { notify("No matching borewell found.", "error"); return; }
    setSearching(true);
    try {
      const r = await api.get<any>(`/borewells/${match.id}/rescue-card`);
      setResult(r);
    } catch (err) {
      notify(err instanceof ApiError ? err.message : "Could not load rescue card.", "error");
    } finally {
      setSearching(false);
    }
  };

  const copyLocation = async () => {
    if (!result) return;
    await navigator.clipboard.writeText(`${result.borewell.latitude}, ${result.borewell.longitude}`);
    notify("Coordinates copied to clipboard.");
  };

  return (
    <div className="space-y-4">
      <div className="rounded-lg text-white p-5 bg-[#7F1D1D]">
        <div className="flex items-center gap-2 mb-1"><Siren size={20} /><h1 className="text-lg font-bold">Emergency Response</h1></div>
        <p className="text-sm text-red-100">This system supports coordination. It does not replace emergency services, trained rescuers, or official rescue protocols.</p>
        <p className="text-xs mt-2">Active incidents: {activeIncidents?.length ?? 0}</p>
      </div>

      <Card title="Search Borewell for Rescue Card">
        <div className="flex gap-2">
          <input value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => e.key === "Enter" && search()} placeholder="Enter Borewell ID e.g. BW-NK-0009" className="flex-1 px-3 py-2 rounded-md border border-slate-300 text-sm" />
          <button onClick={search} disabled={searching} className="px-4 py-2 rounded-md text-white text-sm font-medium bg-[#0F2C4C]">{searching ? "Searching…" : "Search"}</button>
        </div>
      </Card>

      {result && (
        <Card title={`Rescue Card — ${result.borewell.borewellCode}`} right={<Badge bg="#FEE2E2" fg="#B91C1C">Emergency Reference</Badge>}>
          <div className="grid md:grid-cols-2 gap-4 text-sm">
            <div className="space-y-1.5">
              <p><span className="text-slate-400">Coordinates:</span> {result.borewell.latitude}, {result.borewell.longitude}</p>
              <p><span className="text-slate-400">Depth / Diameter:</span> {result.borewell.depthFeet}ft / {result.borewell.diameterInches}in</p>
              <p><span className="text-slate-400">Status:</span> {result.borewell.status}</p>
              <p><span className="text-slate-400">Owner / Contact:</span> {result.borewell.ownerName} · {result.borewell.ownerPhone || "Not on file"}</p>
              <p><span className="text-slate-400">Landmark:</span> {result.borewell.landmark}</p>
              <p><span className="text-slate-400">Risk:</span> <RiskBadge level={result.borewell.riskLevel} /> {result.borewell.riskScore}/100</p>
            </div>
            <div>
              {result.incidents.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-slate-600 mb-1">Incident History</p>
                  {result.incidents.map((i: Incident) => (
                    <p key={i.id} className="text-xs text-slate-500">{i.incidentCode} — {i.status} ({new Date(i.createdAt).toLocaleDateString()})</p>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <button onClick={copyLocation} className="flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-md border border-slate-300"><Copy size={13} />Copy Location</button>
            <button onClick={() => window.print()} className="flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-md border border-slate-300"><Printer size={13} />Print</button>
          </div>
        </Card>
      )}
    </div>
  );
}
