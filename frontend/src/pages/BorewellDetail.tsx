import React from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import { ChevronLeft, Siren, Printer } from "lucide-react";
import { api } from "../api/client";
import { Card, StatusBadge, RiskBadge, VerifyBadge, ProgressBar, Spinner, ErrorState } from "../components/ui";
import { RISK_COLORS } from "../lib/constants";
import type { Borewell } from "../lib/types";

export default function BorewellDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: bw, isLoading, error } = useQuery({
    queryKey: ["borewell", id],
    queryFn: () => api.get<Borewell>(`/borewells/${id}`),
    enabled: !!id,
  });

  if (isLoading) return <Spinner label="Loading borewell…" />;
  if (error || !bw) return <ErrorState message="Could not load this borewell." />;

  return (
    <div className="space-y-4">
      <button onClick={() => navigate("/registry")} className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1"><ChevronLeft size={13} /> Back to registry</button>

      <Card>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg font-bold text-slate-900">{bw.borewellCode}</h1>
              <StatusBadge status={bw.status} /><RiskBadge level={bw.riskLevel} /><VerifyBadge status={bw.verificationStatus} />
            </div>
            <p className="text-xs text-slate-500 mt-1">{bw.village}, {bw.block}</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => navigate(`/emergency?borewellId=${bw.id}`)} className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-md text-white bg-[#DC2626]"><Siren size={13} />Report Incident</button>
            <button onClick={() => window.print()} className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-md border border-slate-300"><Printer size={13} />Print</button>
          </div>
        </div>
      </Card>

      <div className="grid md:grid-cols-3 gap-4">
        <Card className="md:col-span-2" title="Details">
          <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            <Info label="Owner" value={bw.ownerName} />
            <Info label="Ownership Type" value={bw.ownershipType} />
            <Info label="Purpose" value={bw.purpose} />
            <Info label="Depth / Diameter" value={`${bw.depthFeet}ft / ${bw.diameterInches}in`} />
            <Info label="Last Inspection" value={bw.lastInspectionDate ? new Date(bw.lastInspectionDate).toLocaleDateString() : "—"} />
            <Info label="Fenced / Signage" value={`${bw.hasFence ? "Yes" : "No"} / ${bw.hasWarningSign ? "Yes" : "No"}`} />
          </div>
        </Card>
        <Card title="Explainable Risk Score">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-2xl font-bold" style={{ color: RISK_COLORS[bw.riskLevel].fg }}>{bw.riskScore}/100</span>
            <div className="flex-1"><ProgressBar value={bw.riskScore} color={RISK_COLORS[bw.riskLevel].dot} /></div>
          </div>
          <ul className="text-xs text-slate-600 space-y-1">
            {bw.riskReasons.length === 0 && <li className="text-slate-400">No risk factors identified.</li>}
            {bw.riskReasons.map((r, i) => <li key={i} className="flex justify-between"><span>{r.label}</span><span className="font-medium">+{r.points}</span></li>)}
          </ul>
          <p className="text-[10.5px] text-slate-400 mt-2 italic">Explainable rule-based risk score — computed server-side, not a machine-learning prediction.</p>
        </Card>
      </div>

      <Card title="Location">
        <MapContainer center={[bw.latitude, bw.longitude]} zoom={15} style={{ height: 300 }} scrollWheelZoom={false}>
          <TileLayer attribution="&copy; OpenStreetMap contributors" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          <Marker position={[bw.latitude, bw.longitude]}>
            <Popup>{bw.borewellCode} — {bw.landmark}</Popup>
          </Marker>
        </MapContainer>
      </Card>
    </div>
  );
}

function Info({ label, value }: { label: string; value: React.ReactNode }) {
  return <p><span className="text-slate-400">{label}:</span> <span className="font-medium text-slate-700">{value ?? "—"}</span></p>;
}
