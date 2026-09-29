import React, { useState } from "react";
import { Check } from "lucide-react";
import { api, ApiError } from "../api/client";
import { Card, Field, TextInput, Select, TextArea } from "../components/ui";

export default function PublicReport() {
  const [form, setForm] = useState({ reporterName: "", reporterPhone: "", landmark: "", issueType: "Open borewell", description: "" });
  const [consent, setConsent] = useState(false);
  const [reportCode, setReportCode] = useState<string | null>(null);
  const [error, setError] = useState("");

  const submit = async () => {
    setError("");
    if (!consent || !form.landmark) { setError("Please add a location and accept the consent checkbox."); return; }
    try {
      const r = await api.post<{ reportCode: string; message: string }>("/public/reports", { ...form, latitude: 20.0, longitude: 73.8 });
      setReportCode(r.reportCode);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not submit report.");
    }
  };

  if (reportCode) {
    return (
      <div className="max-w-lg mx-auto">
        <Card>
          <div className="text-center py-8">
            <Check size={36} className="mx-auto text-green-600 mb-3" />
            <h2 className="text-lg font-bold text-slate-800">Thank you. Your report has been received and will be reviewed.</h2>
            <p className="text-sm text-slate-500 mt-2">Your tracking ID:</p>
            <p className="text-2xl font-mono font-bold text-slate-800 mt-1">{reportCode}</p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto space-y-4">
      <h1 className="text-xl font-bold text-slate-900">Report an Unsafe Borewell</h1>
      <Card>
        <Field label="Reporter Name (optional)"><TextInput value={form.reporterName} onChange={(e) => setForm({ ...form, reporterName: e.target.value })} /></Field>
        <Field label="Phone (optional)"><TextInput value={form.reporterPhone} onChange={(e) => setForm({ ...form, reporterPhone: e.target.value })} /></Field>
        <Field label="Landmark / Location" required><TextInput value={form.landmark} onChange={(e) => setForm({ ...form, landmark: e.target.value })} /></Field>
        <Field label="What did you observe?">
          <Select value={form.issueType} onChange={(e) => setForm({ ...form, issueType: e.target.value })}>
            {["Open borewell", "Broken cap", "Missing fence", "Missing warning sign", "Child-accessible location", "Other"].map((o) => <option key={o}>{o}</option>)}
          </Select>
        </Field>
        <Field label="Description"><TextArea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Field>
        <label className="flex items-start gap-2 text-xs text-slate-600 mb-3">
          <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5" />
          I consent to this report being shared with local authorities for verification.
        </label>
        {error && <p className="text-xs text-red-600 mb-3">{error}</p>}
        <button onClick={submit} className="w-full py-2.5 rounded-md text-white font-semibold text-sm bg-[#0F2C4C]">Submit Report</button>
      </Card>
    </div>
  );
}
