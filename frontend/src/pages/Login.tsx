import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Droplet } from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { ApiError } from "../api/client";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("admin@suraksha.demo");
  const [password, setPassword] = useState("password123");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email, password);
      navigate("/");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#EEF2F6] p-4">
      <div className="w-full max-w-sm bg-white rounded-lg border border-slate-200 shadow-sm p-6">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-9 h-9 rounded-md flex items-center justify-center bg-[#0E7C86] text-white"><Droplet size={18} /></div>
          <h1 className="text-lg font-bold text-[#0F2C4C]">Suraksha AI</h1>
        </div>
        <p className="text-xs text-slate-500 mb-5">Borewell Safety Registry &amp; Compliance System</p>

        <form onSubmit={submit}>
          <label className="block mb-3.5">
            <span className="block text-xs font-medium text-slate-700 mb-1">Email</span>
            <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" required className="w-full px-3 py-2 rounded-md border border-slate-300 text-sm" />
          </label>
          <label className="block mb-4">
            <span className="block text-xs font-medium text-slate-700 mb-1">Password</span>
            <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" required className="w-full px-3 py-2 rounded-md border border-slate-300 text-sm" />
          </label>
          {error && <p className="text-xs text-red-600 mb-3">{error}</p>}
          <button disabled={loading} type="submit" className="w-full py-2.5 rounded-md text-white font-semibold text-sm bg-[#0F2C4C] disabled:opacity-60">
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <div className="mt-5 pt-4 border-t border-slate-100 text-[11px] text-slate-400 space-y-0.5">
          <p className="font-medium text-slate-500">Demo accounts (password: password123)</p>
          <p>admin@suraksha.demo — District Administrator</p>
          <p>officer@suraksha.demo — Block/Panchayat Officer</p>
          <p>inspector@suraksha.demo — Field Inspector</p>
          <p>responder@suraksha.demo — Emergency Responder</p>
        </div>
      </div>
    </div>
  );
}
