import React, { useState } from "react";
import { LocateFixed, Check } from "lucide-react";
import { api, ApiError } from "../api/client";
import { Modal, Field, TextInput, Select, Toggle, ErrorState } from "../components/ui";
import { OWNERSHIP_LIST, PURPOSE_LIST, STATUS_LIST, SENSITIVE_LIST, RISK_COLORS } from "../lib/constants";
import { useToast } from "../hooks/useToast";
import { useGeolocation } from "../hooks/useGeolocation";
import type { Borewell } from "../lib/types";

export default function RegisterWizard({ onClose, onDone }: { onClose: () => void; onDone: (id: string) => void }) {
  const { notify } = useToast();
  const geo = useGeolocation();
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<Borewell | null>(null);

  const [form, setForm] = useState({
    ownerName: "", ownerPhone: "", ownershipType: "Private", purpose: "Drinking Water",
    state: "Maharashtra", district: "Nashik", block: "", panchayat: "", village: "",
    landmark: "", latitude: 19.998, longitude: 73.79,
    status: "Active", depthFeet: 60, diameterInches: 6, waterStatus: "Available",
    hasFence: false, hasWarningSign: false, hasPhotoEvidence: false,
    nearestSensitivePlace: "None", distanceToSensitivePlace: 500,
  });
  const set = (patch: Partial<typeof form>) => setForm((f) => ({ ...f, ...patch }));

  const useCurrentLocation = async () => {
    const r = await geo.refresh();
    if (r.status === "success" && r.lat && r.lng) set({ latitude: r.lat, longitude: r.lng });
    else notify("Could not get your location — enter coordinates manually.", "error");
  };

  const submit = async () => {
    setError("");
    if (!form.village || !form.panchayat) { setError("Village and Gram Panchayat are required."); return; }
    setSubmitting(true);
    try {
      const created = await api.post<Borewell>("/borewells", form);
      setResult(created);
      notify(`${created.borewellCode} registered successfully.`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Registration failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (result) {
    return (
      <Modal title="Registration complete" onClose={() => onDone(result.id)} width="max-w-md">
        <div className="text-center py-4">
          <Check size={32} className="mx-auto text-green-600 mb-2" />
          <p className="text-lg font-bold text-slate-800">{result.borewellCode}</p>
          <p className="text-sm text-slate-500 mt-1">Registered and risk-scored by the server.</p>
          <div className="mt-4 inline-flex items-center gap-2">
            <span className="text-2xl font-bold" style={{ color: RISK_COLORS[result.riskLevel].fg }}>{result.riskScore}/100</span>
            <span className="text-sm text-slate-500">({result.riskLevel})</span>
          </div>
          <ul className="text-xs text-slate-600 mt-3 text-left inline-block">
            {result.riskReasons.map((r, i) => <li key={i}>• {r.label} (+{r.points})</li>)}
          </ul>
          <button onClick={() => onDone(result.id)} className="mt-5 w-full py-2.5 rounded-md text-white font-semibold text-sm bg-[#0F2C4C]">View Borewell</button>
        </div>
      </Modal>
    );
  }

  return (
    <Modal title="Register Borewell" onClose={onClose} width="max-w-2xl">
      <div className="grid grid-cols-2 gap-3">
        <Field label="Owner Name" required><TextInput value={form.ownerName} onChange={(e) => set({ ownerName: e.target.value })} /></Field>
        <Field label="Owner Phone"><TextInput value={form.ownerPhone} onChange={(e) => set({ ownerPhone: e.target.value })} /></Field>
        <Field label="Ownership Type"><Select value={form.ownershipType} onChange={(e) => set({ ownershipType: e.target.value })}>{OWNERSHIP_LIST.map((o) => <option key={o}>{o}</option>)}</Select></Field>
        <Field label="Purpose"><Select value={form.purpose} onChange={(e) => set({ purpose: e.target.value })}>{PURPOSE_LIST.map((o) => <option key={o}>{o}</option>)}</Select></Field>
        <Field label="Block" required><TextInput value={form.block} onChange={(e) => set({ block: e.target.value })} /></Field>
        <Field label="Gram Panchayat" required><TextInput value={form.panchayat} onChange={(e) => set({ panchayat: e.target.value })} /></Field>
        <Field label="Village" required><TextInput value={form.village} onChange={(e) => set({ village: e.target.value })} /></Field>
        <Field label="Landmark"><TextInput value={form.landmark} onChange={(e) => set({ landmark: e.target.value })} /></Field>
      </div>

      <div className="flex items-center gap-2 mb-3">
        <button type="button" onClick={useCurrentLocation} className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md border border-slate-300">
          <LocateFixed size={13} /> Use current location
        </button>
        {geo.status === "loading" && <span className="text-xs text-slate-400">Locating…</span>}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Latitude"><TextInput type="number" step="0.0001" value={form.latitude} onChange={(e) => set({ latitude: Number(e.target.value) })} /></Field>
        <Field label="Longitude"><TextInput type="number" step="0.0001" value={form.longitude} onChange={(e) => set({ longitude: Number(e.target.value) })} /></Field>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Status"><Select value={form.status} onChange={(e) => set({ status: e.target.value })}>{STATUS_LIST.map((o) => <option key={o}>{o}</option>)}</Select></Field>
        <Field label="Water Status"><Select value={form.waterStatus} onChange={(e) => set({ waterStatus: e.target.value })}><option>Available</option><option>Seasonal</option><option>Dry</option><option>Unknown</option></Select></Field>
        <Field label="Depth (feet)"><TextInput type="number" value={form.depthFeet} onChange={(e) => set({ depthFeet: Number(e.target.value) })} /></Field>
        <Field label="Diameter (inches)"><TextInput type="number" value={form.diameterInches} onChange={(e) => set({ diameterInches: Number(e.target.value) })} /></Field>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Nearest Sensitive Place">
          <Select value={form.nearestSensitivePlace} onChange={(e) => set({ nearestSensitivePlace: e.target.value })}>{SENSITIVE_LIST.map((o) => <option key={o}>{o}</option>)}</Select>
        </Field>
        <Field label="Distance (meters)">
          <TextInput type="number" value={form.distanceToSensitivePlace} disabled={form.nearestSensitivePlace === "None"} onChange={(e) => set({ distanceToSensitivePlace: Number(e.target.value) })} />
        </Field>
      </div>

      <div className="flex gap-6 mb-4">
        <Toggle checked={form.hasFence} onChange={(v) => set({ hasFence: v })} label="Fencing installed" />
        <Toggle checked={form.hasWarningSign} onChange={(v) => set({ hasWarningSign: v })} label="Warning sign installed" />
        <Toggle checked={form.hasPhotoEvidence} onChange={(v) => set({ hasPhotoEvidence: v })} label="Photo evidence attached" />
      </div>

      {error && <div className="mb-3"><ErrorState message={error} /></div>}

      <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
        <button onClick={onClose} className="px-4 py-2 text-sm rounded-md border border-slate-300">Cancel</button>
        <button onClick={submit} disabled={submitting} className="px-5 py-2 text-sm rounded-md text-white font-semibold bg-[#0E7C86] disabled:opacity-60">
          {submitting ? "Submitting…" : "Submit Registration"}
        </button>
      </div>
    </Modal>
  );
}
