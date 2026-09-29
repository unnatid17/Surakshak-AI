import React from "react";
import { X, Check, AlertTriangle, Loader2 } from "lucide-react";
import { STATUS_COLORS, RISK_COLORS, VERIFY_COLORS, LOCATION_STATUS_META } from "../lib/constants";

export function Badge({ children, bg, fg, icon: Icon }: { children: React.ReactNode; bg: string; fg: string; icon?: React.ComponentType<any> }) {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium whitespace-nowrap" style={{ backgroundColor: bg, color: fg }}>
      {Icon && <Icon size={12} />}
      {children}
    </span>
  );
}
export function StatusBadge({ status }: { status: string }) {
  const c = STATUS_COLORS[status] || STATUS_COLORS.Active;
  return <Badge bg={c.bg} fg={c.fg}>{status}</Badge>;
}
export function RiskBadge({ level }: { level: string }) {
  const c = RISK_COLORS[level] || RISK_COLORS.Low;
  const Icon = level === "Critical" || level === "High" ? AlertTriangle : Check;
  return <Badge bg={c.bg} fg={c.fg} icon={Icon}>{level}</Badge>;
}
export function VerifyBadge({ status }: { status: string }) {
  const c = VERIFY_COLORS[status] || VERIFY_COLORS.Pending;
  return <Badge bg={c.bg} fg={c.fg}>{status}</Badge>;
}
export function LocationStatusBadge({ status }: { status: string }) {
  const m = LOCATION_STATUS_META[status] || LOCATION_STATUS_META.unavailable;
  return <Badge bg={m.bg} fg={m.fg}>{m.label}</Badge>;
}

export function Card({ title, subtitle, right, children, className = "" }: { title?: string; subtitle?: string; right?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white rounded-lg border border-slate-200 shadow-sm ${className}`}>
      {(title || right) && (
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
          <div>
            {title && <h3 className="text-sm font-semibold text-slate-800">{title}</h3>}
            {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
          </div>
          {right}
        </div>
      )}
      <div className="p-4">{children}</div>
    </div>
  );
}

export function KPI({ label, value, tone = "plain", onClick, note }: { label: string; value: React.ReactNode; tone?: "navy" | "teal" | "amber" | "red" | "plain"; onClick?: () => void; note?: string }) {
  const toneMap: Record<string, { bg: string; fg: string; border?: string }> = {
    navy: { bg: "#0F2C4C", fg: "#fff" },
    teal: { bg: "#0E7C86", fg: "#fff" },
    amber: { bg: "#FFFBEB", fg: "#92400E", border: "#FDE68A" },
    red: { bg: "#FEF2F2", fg: "#B91C1C", border: "#FECACA" },
    plain: { bg: "#fff", fg: "#0F2C4C", border: "#E2E8F0" },
  };
  const t = toneMap[tone];
  return (
    <button onClick={onClick} className="text-left rounded-lg p-3.5 border shadow-sm transition hover:-translate-y-0.5 hover:shadow-md" style={{ backgroundColor: t.bg, color: t.fg, borderColor: t.border || "transparent" }}>
      <div className="text-xs font-medium opacity-80">{label}</div>
      <div className="text-2xl font-bold mt-1">{value}</div>
      {note && <div className="text-[11px] mt-1 opacity-75">{note}</div>}
    </button>
  );
}

export function ProgressBar({ value, color }: { value: number; color: string }) {
  return (
    <div className="w-full h-2.5 rounded-full bg-slate-100 overflow-hidden">
      <div className="h-full rounded-full" style={{ width: `${value}%`, backgroundColor: color }} />
    </div>
  );
}

export function Modal({ title, onClose, children, width = "max-w-lg" }: { title: string; onClose: () => void; children: React.ReactNode; width?: string }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4" onClick={onClose}>
      <div className={`bg-white rounded-lg shadow-xl w-full ${width} max-h-[90vh] overflow-y-auto`} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 sticky top-0 bg-white z-10">
          <h3 className="font-semibold text-slate-800">{title}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700" aria-label="Close"><X size={18} /></button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

export function ConfirmDialog({ title, message, confirmLabel = "Confirm", danger = true, onConfirm, onCancel }: { title: string; message: string; confirmLabel?: string; danger?: boolean; onConfirm: () => void; onCancel: () => void }) {
  return (
    <Modal title={title} onClose={onCancel} width="max-w-sm">
      <p className="text-sm text-slate-600 mb-5">{message}</p>
      <div className="flex justify-end gap-2">
        <button onClick={onCancel} className="px-4 py-2 text-sm rounded-md border border-slate-300">Cancel</button>
        <button onClick={onConfirm} className="px-4 py-2 text-sm rounded-md text-white font-medium" style={{ backgroundColor: danger ? "#DC2626" : "#0F2C4C" }}>{confirmLabel}</button>
      </div>
    </Modal>
  );
}

export function Field({ label, required, children, hint, error }: { label: string; required?: boolean; children: React.ReactNode; hint?: string; error?: string }) {
  return (
    <label className="block mb-3.5">
      <span className="block text-xs font-medium text-slate-700 mb-1">{label}{required && <span className="text-red-600"> *</span>}</span>
      {children}
      {hint && !error && <span className="block text-[11px] text-slate-400 mt-1">{hint}</span>}
      {error && <span className="block text-[11px] text-red-600 mt-1">{error}</span>}
    </label>
  );
}

const inputCls = "w-full px-3 py-2 rounded-md border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-teal-600";
export function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) { return <input {...props} className={inputCls} />; }
export function Select({ children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) { return <select {...props} className={inputCls}>{children}</select>; }
export function TextArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) { return <textarea {...props} className={inputCls} rows={props.rows || 3} />; }

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button type="button" onClick={() => onChange(!checked)} className="flex items-center gap-2 text-sm text-slate-700">
      <span className="w-9 h-5 rounded-full relative transition" style={{ backgroundColor: checked ? "#0E7C86" : "#CBD5E1" }}>
        <span className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition" style={{ left: checked ? 18 : 2 }} />
      </span>
      {label}
    </button>
  );
}

export function EmptyState({ icon: Icon, title, note }: { icon: React.ComponentType<any>; title: string; note?: string }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-10 text-slate-400">
      <Icon size={30} className="mb-2" />
      <p className="text-sm font-medium text-slate-500">{title}</p>
      {note && <p className="text-xs mt-1">{note}</p>}
    </div>
  );
}

export function Spinner({ label }: { label?: string }) {
  return (
    <div className="flex items-center gap-2 text-sm text-slate-500 py-6 justify-center">
      <Loader2 size={16} className="animate-spin" /> {label || "Loading…"}
    </div>
  );
}

export function ErrorState({ message }: { message: string }) {
  return (
    <div className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700 flex items-center gap-2">
      <AlertTriangle size={16} /> {message}
    </div>
  );
}
