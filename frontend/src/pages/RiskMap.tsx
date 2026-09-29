import React from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { MapContainer, TileLayer, CircleMarker, Popup } from "react-leaflet";
import { api } from "../api/client";
import { Card, KPI, Spinner, ErrorState } from "../components/ui";
import { RISK_COLORS } from "../lib/constants";
import type { Borewell } from "../lib/types";

export default function RiskMap() {
  const navigate = useNavigate();
  const { data, isLoading, error } = useQuery({ queryKey: ["borewells"], queryFn: () => api.get<Borewell[]>("/borewells") });

  if (isLoading) return <Spinner label="Loading risk map…" />;
  if (error || !data) return <ErrorState message="Could not load the risk map." />;

  const center: [number, number] = data.length ? [data[0].latitude, data[0].longitude] : [19.99, 73.79];

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-slate-900">Geo-tagged Borewell Risk Map</h1>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KPI label="Critical" value={data.filter((b) => b.riskLevel === "Critical").length} tone="red" />
        <KPI label="High" value={data.filter((b) => b.riskLevel === "High").length} tone="amber" />
        <KPI label="Unverified" value={data.filter((b) => b.verificationStatus !== "Verified").length} />
        <KPI label="Open/Unsafe" value={data.filter((b) => b.status === "Open/Unsafe").length} />
      </div>
      <Card>
        <MapContainer center={center} zoom={10} style={{ height: 480 }}>
          <TileLayer attribution="&copy; OpenStreetMap contributors" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          {data.map((b) => (
            <CircleMarker
              key={b.id}
              center={[b.latitude, b.longitude]}
              radius={8}
              pathOptions={{ color: RISK_COLORS[b.riskLevel].dot, fillColor: RISK_COLORS[b.riskLevel].dot, fillOpacity: 0.8 }}
            >
              <Popup>
                <div className="text-sm">
                  <p className="font-semibold">{b.borewellCode}</p>
                  <p>{b.status} · Risk {b.riskScore}/100 ({b.riskLevel})</p>
                  <button onClick={() => navigate(`/registry/${b.id}`)} className="text-teal-700 underline text-xs mt-1">View details</button>
                </div>
              </Popup>
            </CircleMarker>
          ))}
        </MapContainer>
      </Card>
    </div>
  );
}
