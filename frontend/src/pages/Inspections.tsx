import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Camera, Upload, Loader2, LocateFixed, Trash2, AlertCircle } from "lucide-react";
import { api, ApiError } from "../api/client";
import { Card, Modal, Field, Select, TextArea, Toggle, LocationStatusBadge, Spinner, ErrorState, EmptyState } from "../components/ui";
import { EVIDENCE_CATEGORIES, SAFETY_CATEGORIES } from "../lib/constants";
import { useGeolocation, getFreshPosition } from "../hooks/useGeolocation";
import { useToast } from "../hooks/useToast";
import type { Inspection, Borewell } from "../lib/types";

const CHECKLIST_ITEMS: [string, string][] = [
  ["capPresent", "Cap is present"], ["capSecure", "Cap is secure"],
  ["fencePresent", "Fence is present"], ["signVisible", "Warning sign is visible"],
  ["inaccessibleToChildren", "Borewell is inaccessible to children"],
  ["surroundingSafe", "Surrounding area is safe"], ["noHazards", "No visible hazards"],
];

export default function Inspections() {
  const [tab, setTab] = useState("Overdue");
  const [active, setActive] = useState<Inspection | null>(null);
  const { data: inspections, isLoading, error, refetch } = useQuery({
    queryKey: ["inspections", tab],
    queryFn: () => api.get<Inspection[]>(`/inspections?status=${tab}`),
  });
  const { data: borewells } = useQuery({ queryKey: ["borewells"], queryFn: () => api.get<Borewell[]>("/borewells") });

  const bwById = (id: string) => borewells?.find((b) => b.id === id);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-slate-900">Inspection Management</h1>
      <div className="flex gap-2 overflow-x-auto">
        {["Assigned", "Overdue", "Submitted", "Completed", "Needs Reinspection"].map((s) => (
          <button key={s} onClick={() => setTab(s)} className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap border ${tab === s ? "text-white bg-[#0F2C4C] border-[#0F2C4C]" : "text-slate-600 bg-white border-slate-300"}`}>{s}</button>
        ))}
      </div>

      {isLoading && <Spinner />}
      {error && <ErrorState message="Could not load inspections." />}
      {inspections && (
        <div className="bg-white rounded-lg border border-slate-200 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs text-slate-500 uppercase">
              <tr>{["Inspection", "Borewell", "Inspector", "Due", "Status", ""].map((h) => <th key={h} className="text-left px-3 py-2.5">{h}</th>)}</tr>
            </thead>
            <tbody>
              {inspections.map((i) => {
                const bw = bwById(i.borewellId);
                return (
                  <tr key={i.id} className="border-t border-slate-100">
                    <td className="px-3 py-2.5 font-medium">{i.inspectionCode}</td>
                    <td className="px-3 py-2.5">{bw?.borewellCode ?? i.borewellId}</td>
                    <td className="px-3 py-2.5">{i.assignedInspectorName}</td>
                    <td className="px-3 py-2.5 text-slate-500">{new Date(i.dueDate).toLocaleDateString()}</td>
                    <td className="px-3 py-2.5">{i.status}</td>
                    <td className="px-3 py-2.5">
                      {(i.status === "Assigned" || i.status === "Overdue" || i.status === "Needs Reinspection") && bw && (
                        <button onClick={() => setActive(i)} className="text-xs font-medium px-2.5 py-1 rounded-md text-white bg-[#0E7C86]">Start Inspection</button>
                      )}
                    </td>
                  </tr>
                );
              })}
              {inspections.length === 0 && <tr><td colSpan={6}><EmptyState icon={Camera} title="No inspections in this section" /></td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {active && bwById(active.borewellId) && (
        <EvidenceCaptureModal
          inspection={active}
          bw={bwById(active.borewellId)!}
          onClose={() => setActive(null)}
          onDone={() => { setActive(null); refetch(); }}
        />
      )}
    </div>
  );
}

type LocalPhoto = {
  file: File; previewUrl: string; category: string;
  lat: number | null; lng: number | null; accuracy: number | null; denied: boolean;
};

function EvidenceCaptureModal({ inspection, bw, onClose, onDone }: { inspection: Inspection; bw: Borewell; onClose: () => void; onDone: () => void }) {
  const geo = useGeolocation();
  const { notify } = useToast();
  const qc = useQueryClient();

  const [category, setCategory] = useState("Borewell opening");
  const [photos, setPhotos] = useState<LocalPhoto[]>([]);
  const [checklist, setChecklist] = useState<Record<string, boolean>>(Object.fromEntries(CHECKLIST_ITEMS.map(([k]) => [k, true])));
  const [observations, setObservations] = useState("");
  const [manualReview, setManualReview] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const denied = ["denied", "timeout", "unavailable"].includes(geo.status);

  const addPhoto = (file: File | undefined) => {
    if (!file) return;
    if (photos.length >= 8) { setError("Maximum 8 photos per inspection."); return; }
    setPhotos((p) => [...p, {
      file, previewUrl: URL.createObjectURL(file), category,
      lat: denied ? null : geo.lat, lng: denied ? null : geo.lng, accuracy: denied ? null : geo.accuracy, denied,
    }]);
  };
  const removePhoto = (idx: number) => setPhotos((p) => p.filter((_, i) => i !== idx));

  const hasOpening = photos.some((p) => p.category === "Borewell opening");
  const hasSafety = photos.some((p) => SAFETY_CATEGORIES.includes(p.category));

  const submit = async () => {
    setError("");
    if (!hasOpening) { setError('At least one "Borewell opening" photo is required.'); return; }
    if (!hasSafety) { setError("At least one safety-condition photo (cap, fence, or warning sign) is required."); return; }
    if (denied && !manualReview) { setError('Location is unavailable. Check "Submit for manual review" to continue.'); return; }

    setSubmitting(true);
    try {
      // Refresh GPS immediately before final submission, per spec.
      await getFreshPosition();

      for (const p of photos) {
        const fd = new FormData();
        fd.append("file", p.file);
        fd.append("borewellId", bw.id);
        fd.append("inspectionId", inspection.id);
        fd.append("category", p.category);
        if (p.lat !== null) fd.append("latitude", String(p.lat));
        if (p.lng !== null) fd.append("longitude", String(p.lng));
        if (p.accuracy !== null) fd.append("accuracyMeters", String(p.accuracy));
        fd.append("locationDenied", String(p.denied));
        await api.post("/evidence", fd);
      }

      await api.post(`/inspections/${inspection.id}/submit`, { checklist, observations });
      notify(`Evidence submitted for ${bw.borewellCode} — sent to Verification Queue.`);
      qc.invalidateQueries({ queryKey: ["inspections"] });
      onDone();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Submission failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal title={`Submit Geo-tagged Evidence — ${bw.borewellCode}`} onClose={onClose} width="max-w-2xl">
      <Card title="Location Status" className="mb-4">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-xs mb-2">
          <p><span className="text-slate-400">Registered:</span> {bw.latitude.toFixed(4)}, {bw.longitude.toFixed(4)}</p>
          <p><span className="text-slate-400">Current:</span> {geo.lat ? `${geo.lat.toFixed(4)}, ${geo.lng!.toFixed(4)}` : "—"}</p>
          <p><span className="text-slate-400">Accuracy:</span> {geo.accuracy ? `${Math.round(geo.accuracy)}m` : "—"}</p>
        </div>
        {geo.status === "loading" && <p className="text-xs text-slate-500 flex items-center gap-1.5"><Loader2 size={13} className="animate-spin" /> Waiting for accurate location…</p>}
        {denied && (
          <div className="mt-2 rounded-md bg-amber-50 border border-amber-200 p-2.5">
            <p className="text-xs text-red-600 mb-2">Location access is required to verify that this evidence was captured at the borewell site.</p>
            <Toggle checked={manualReview} onChange={setManualReview} label="Submit for manual review (location unavailable)" />
          </div>
        )}
        <button onClick={() => geo.refresh()} className="mt-2 flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-md border border-slate-300">
          <LocateFixed size={13} /> Refresh location
        </button>
      </Card>

      <Card title="Evidence Photos" className="mb-4">
        <div className="flex flex-wrap gap-2 items-end mb-3">
          <Field label="Category">
            <Select value={category} onChange={(e) => setCategory(e.target.value)}>{EVIDENCE_CATEGORIES.map((c) => <option key={c}>{c}</option>)}</Select>
          </Field>
          <label className="flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-md text-white cursor-pointer bg-[#0F2C4C]">
            <Camera size={14} /> Capture Photo
            <input type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => addPhoto(e.target.files?.[0])} />
          </label>
          <label className="flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-md border border-slate-300 cursor-pointer">
            <Upload size={14} /> Upload from Gallery
            <input type="file" accept="image/*" className="hidden" onChange={(e) => addPhoto(e.target.files?.[0])} />
          </label>
          <span className="text-[11px] text-slate-400">{photos.length}/8 photos</span>
        </div>
        {photos.length === 0 && <EmptyState icon={Camera} title="No evidence photos yet" note='Requires a "Borewell opening" photo and one safety-condition photo.' />}
        <div className="grid sm:grid-cols-2 gap-3">
          {photos.map((p, idx) => (
            <div key={idx} className="border border-slate-200 rounded-md p-2.5 flex gap-2.5">
              <img src={p.previewUrl} alt={p.category} className="w-16 h-16 rounded object-cover shrink-0" />
              <div className="flex-1 min-w-0 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-slate-700">{p.category}</span>
                  <button onClick={() => removePhoto(idx)} aria-label="Remove photo" className="text-slate-400 hover:text-red-600"><Trash2 size={13} /></button>
                </div>
                <LocationStatusBadge status={p.denied ? "unavailable" : "verified"} />
                <p className="text-slate-400 mt-1">{p.lat ? `${p.lat.toFixed(4)}, ${p.lng!.toFixed(4)}` : "no GPS"}</p>
              </div>
            </div>
          ))}
        </div>
        {error && <p className="text-xs text-red-600 mt-3 flex items-center gap-1"><AlertCircle size={13} />{error}</p>}
      </Card>

      <Card title="Inspection Checklist" className="mb-4">
        <div className="grid sm:grid-cols-2 gap-y-1.5">
          {CHECKLIST_ITEMS.map(([key, label]) => (
            <Toggle key={key} checked={checklist[key]} onChange={(v) => setChecklist((c) => ({ ...c, [key]: v }))} label={label} />
          ))}
        </div>
      </Card>

      <Field label="Inspector Observations"><TextArea value={observations} onChange={(e) => setObservations(e.target.value)} /></Field>

      <div className="flex justify-end gap-2 mt-4 pt-3 border-t border-slate-100">
        <button onClick={onClose} className="px-4 py-2 text-sm rounded-md border border-slate-300">Cancel</button>
        <button onClick={submit} disabled={submitting} className="flex items-center gap-1.5 px-4 py-2 text-sm rounded-md text-white font-semibold bg-[#0E7C86] disabled:opacity-60">
          {submitting && <Loader2 size={14} className="animate-spin" />} Submit for Verification
        </button>
      </div>
    </Modal>
  );
}
