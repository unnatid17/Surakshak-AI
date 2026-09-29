import React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle } from "lucide-react";
import { api } from "../api/client";
import { Card, Badge, RiskBadge, Spinner, ErrorState, EmptyState } from "../components/ui";
import { useToast } from "../hooks/useToast";
import type { Escalation, Borewell } from "../lib/types";

const LEVELS = ["Panchayat", "Block Office", "District Administration"];

export default function Escalations() {
  const { notify } = useToast();
  const qc = useQueryClient();
  const { data: escalations, isLoading, error } = useQuery({ queryKey: ["escalations"], queryFn: () => api.get<Escalation[]>("/escalations") });
  const { data: borewells } = useQuery({ queryKey: ["borewells"], queryFn: () => api.get<Borewell[]>("/borewells") });
  const bwById = (id: string) => borewells?.find((b) => b.id === id);

  const escalate = async (id: string) => {
    await api.post(`/escalations/${id}/escalate`);
    notify("Case escalated.");
    qc.invalidateQueries({ queryKey: ["escalations"] });
  };
  const resolve = async (id: string) => {
    await api.post(`/escalations/${id}/resolve`);
    notify("Case marked resolved.");
    qc.invalidateQueries({ queryKey: ["escalations"] });
  };

  if (isLoading) return <Spinner label="Loading escalations…" />;
  if (error || !escalations) return <ErrorState message="Could not load escalations." />;

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-slate-900">Escalation Center</h1>
      <div className="space-y-3">
        {escalations.map((esc) => {
          const bw = bwById(esc.borewellId);
          const idx = LEVELS.indexOf(esc.currentLevel);
          return (
            <Card key={esc.id}>
              <div className="flex flex-wrap items-start justify-between gap-2 mb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-800">{esc.caseCode}</span>
                    {bw && <span className="text-xs text-teal-700">{bw.borewellCode}</span>}
                    <RiskBadge level={esc.riskLevel} />
                    <Badge bg={esc.status === "Overdue" ? "#FEE2E2" : esc.status === "Resolved" ? "#DCFCE7" : "#FEF3C7"} fg={esc.status === "Overdue" ? "#B91C1C" : esc.status === "Resolved" ? "#15803D" : "#92400E"}>{esc.status}</Badge>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">{esc.reason}</p>
                  <p className="text-xs text-slate-400">Assigned to {esc.assignedTo}</p>
                </div>
                {esc.status !== "Resolved" && (
                  <div className="flex gap-2 shrink-0">
                    <button onClick={() => escalate(esc.id)} className="text-xs font-medium px-3 py-1.5 rounded-md text-white bg-[#DC2626]">Escalate Now</button>
                    <button onClick={() => resolve(esc.id)} className="text-xs font-medium px-3 py-1.5 rounded-md text-white bg-[#16A34A]">Mark Resolved</button>
                  </div>
                )}
              </div>
              <div className="flex items-center">
                {LEVELS.map((l, i) => (
                  <React.Fragment key={l}>
                    <div className="flex flex-col items-center">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: i <= idx ? "#0F2C4C" : "#E2E8F0" }} />
                      <span className={`text-[11px] mt-1 ${i <= idx ? "text-slate-700 font-medium" : "text-slate-400"}`}>{l}</span>
                    </div>
                    {i < LEVELS.length - 1 && <div className="flex-1 h-0.5 mx-1" style={{ backgroundColor: i < idx ? "#0F2C4C" : "#E2E8F0" }} />}
                  </React.Fragment>
                ))}
              </div>
            </Card>
          );
        })}
        {escalations.length === 0 && <EmptyState icon={AlertTriangle} title="No escalation cases" />}
      </div>
    </div>
  );
}
