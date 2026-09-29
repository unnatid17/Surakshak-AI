import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./hooks/useAuth";
import Layout from "./components/Layout";
import Login from "./pages/Login";
import Overview from "./pages/Overview";
import Registry from "./pages/Registry";
import BorewellDetail from "./pages/BorewellDetail";
import RiskMap from "./pages/RiskMap";
import Inspections from "./pages/Inspections";
import VerificationQueue from "./pages/VerificationQueue";
import Escalations from "./pages/Escalations";
import Emergency from "./pages/Emergency";
import PublicReport from "./pages/PublicReport";
import TrackReport from "./pages/TrackReport";
import Reports from "./pages/Reports";
import { Spinner } from "./components/ui";

function RequireAuth({ children }: { children: React.ReactElement }) {
  const { user, loading } = useAuth();
  if (loading) return <Spinner label="Loading Suraksha AI…" />;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          element={
            <RequireAuth>
              <Layout />
            </RequireAuth>
          }
        >
          <Route path="/" element={<Overview />} />
          <Route path="/registry" element={<Registry />} />
          <Route path="/registry/:id" element={<BorewellDetail />} />
          <Route path="/map" element={<RiskMap />} />
          <Route path="/inspections" element={<Inspections />} />
          <Route path="/verification" element={<VerificationQueue />} />
          <Route path="/escalations" element={<Escalations />} />
          <Route path="/emergency" element={<Emergency />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/report" element={<PublicReport />} />
          <Route path="/track" element={<TrackReport />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
