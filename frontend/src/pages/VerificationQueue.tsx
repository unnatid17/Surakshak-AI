import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ScanLine } from "lucide-react";
import { api } from "../api/client";
import { Card, LocationStatusBadge, Spinner, ErrorState, EmptyState, Select } from "../components/ui";
import { useToast } from "../hooks/useToast";
import type { EvidencePhoto, Borewell } from "../lib/types";

export default function VerificationQueue() {
  const { notify } = useToast();
  const qc = useQueryClient();
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [reason, setReason] = useState("Photo unclear");

  const { data: photos, isLoading, error } = useQuery({
    queryKey: ["evidence", "pending"],
    queryFn: () => api.get<EvidencePhoto[]>("/evidence?reviewStatus=pending"),
  });
  const { data: manualReview } = useQuery({
    queryKey: ["evidence", "manual_review"],
    queryFn: () => api.get<EvidencePhoto[]>("/evidence?reviewStatus=manual_review"),
  });
  const { data: borewells } = useQuery({ queryKey: ["borewells"], queryFn: () => api.get<Borewell[]>("/borewells") });

  const bwById = (id: string) => borewells?.find((b) => b.id === id);
  const all = [...(photos ?? []), ...(manualReview ?? [])];

  const review = async (id: string, decision: "approve" | "reject", reasonText?: string) => {
    try {
      await api.patch(`/evidence/${id}/review`, { decision, reason: reasonText });
      notify(decision === "approve" ? "Evidence approved. Risk recalculated." : "Evidence rejected.");
      qc.invalidateQueries({ queryKey: ["evidence"] });
      qc.invalidateQueries({ queryKey: ["borewells"] });
      setRejectingId(null);
    } catch {
      notify("Action failed. Please try again.", "error");
    }
  };

  if (isLoading) return <Spinner label="Loading verification queue…" />;
  if (error) return <ErrorState message="Could not load the verification queue." />;

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-slate-900">Verification Queue</h1>
      <p className="text-xs text-slate-500">{all.length} submission{all.length !== 1 ? "s" : ""} awaiting review</p>

      <div className="grid md:grid-cols-2 gap-4">
        {all.map((p) => {
          const bw = bwById(p.borewellId);
          return (
            <Card key={p.id}>
              <div className="flex justify-between items-start mb-2">
                <div>
                  <p className="font-semibold text-slate-800">{bw?.borewellCode ?? p.borewellId}</p>
                  <p className="text-xs text-slate-500">{p.category} · by {p.uploadedByName}</p>
                </div>
                <LocationStatusBadge status={p.locationStatus} />
              </div>
              <p className="text-xs text-slate-400 mb-2">
                {p.distanceFromBorewellMeters != null ? `${Math.round(p.distanceFromBorewellMeters)}m from registered point` : "No GPS on file"}
                {p.gpsAccuracyMeters ? ` · ±${Math.round(p.gpsAccuracyMeters)}m accuracy` : ""}
              </p>
              {rejectingId === p.id ? (
                <div className="space-y-2">
                  <Select value={reason} onChange={(e) => setReason(e.target.value)}>
                    {["Photo unclear", "Cap not secure", "Fence missing", "GPS mismatch", "Borewell still unsafe", "Other"].map((r) => <option key={r}>{r}</option>)}
                  </Select>
                  <div className="flex gap-2">
                    <button onClick={() => review(p.id, "reject", reason)} className="flex-1 text-xs font-medium py-1.5 rounded-md text-white bg-[#DC2626]">Confirm Reject</button>
                    <button onClick={() => setRejectingId(null)} className="flex-1 text-xs font-medium py-1.5 rounded-md border border-slate-300">Cancel</button>
                  </div>
                </div>
              ) : (
                <div className="flex gap-2">
                  <button onClick={() => review(p.id, "approve")} className="flex-1 text-xs font-medium py-1.5 rounded-md text-white bg-[#16A34A]">Approve</button>
                  <button onClick={() => setRejectingId(p.id)} className="flex-1 text-xs font-medium py-1.5 rounded-md text-white bg-[#DC2626]">Reject</button>
                </div>
              )}
            </Card>
          );
        })}
        {all.length === 0 && <EmptyState icon={ScanLine} title="No evidence awaiting review" />}
      </div>
    </div>
  );
}
