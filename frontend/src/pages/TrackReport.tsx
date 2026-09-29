import React, { useState } from "react";
import { api, ApiError } from "../api/client";
import { Card, TextInput, Badge, EmptyState } from "../components/ui";
import { Search } from "lucide-react";

export default function TrackReport() {
  const [code, setCode] = useState("");
  const [result, setResult] = useState<any>(undefined);

  const search = async () => {
    try {
      const r = await api.get<any>(`/public/reports/${code.trim()}`);
      setResult(r);
    } catch (err) {
      setResult(null);
    }
  };

  return (
    <div className="max-w-lg mx-auto space-y-4">
      <h1 className="text-xl font-bold text-slate-900">Track Report</h1>
      <Card>
        <div className="flex gap-2">
          <TextInput value={code} onChange={(e) => setCode(e.target.value)} onKeyDown={(e) => e.key === "Enter" && search()} placeholder="Enter your report ID e.g. REP-NK-1042" />
          <button onClick={search} className="px-4 py-2 rounded-md text-white text-sm font-medium shrink-0 bg-[#0F2C4C]">Track</button>
        </div>
      </Card>
      {result === null && <EmptyState icon={Search} title="No report found with that ID" />}
      {result && (
        <Card>
          <div className="flex justify-between items-center mb-2">
            <span className="font-semibold text-slate-800">{result.reportCode}</span>
            <Badge bg="#FEF3C7" fg="#92400E">{result.status}</Badge>
          </div>
          <p className="text-sm text-slate-600">{result.issueType} — {result.generalLocation}</p>
          <p className="text-xs text-slate-400 mt-1">Submitted {new Date(result.submittedAt).toLocaleDateString()}</p>
        </Card>
      )}
    </div>
  );
}
