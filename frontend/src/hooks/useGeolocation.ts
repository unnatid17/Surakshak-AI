import { useCallback, useEffect, useState } from "react";

export type GeoState = {
  status: "idle" | "loading" | "success" | "denied" | "timeout" | "unavailable";
  lat: number | null;
  lng: number | null;
  accuracy: number | null;
  timestamp: number | null;
};

function getPosition(): Promise<GeoState> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve({ status: "unavailable", lat: null, lng: null, accuracy: null, timestamp: null });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        resolve({
          status: "success",
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          timestamp: pos.timestamp,
        }),
      (err) =>
        resolve({
          status: err.code === 1 ? "denied" : err.code === 3 ? "timeout" : "unavailable",
          lat: null,
          lng: null,
          accuracy: null,
          timestamp: null,
        }),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  });
}

/** Reusable location hook: requests high-accuracy location on mount and exposes a refresh(). */
export function useGeolocation() {
  const [state, setState] = useState<GeoState>({ status: "idle", lat: null, lng: null, accuracy: null, timestamp: null });

  const refresh = useCallback(async () => {
    setState((s) => ({ ...s, status: "loading" }));
    const r = await getPosition();
    setState(r);
    return r;
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { ...state, refresh };
}

/** Grabs one fresh reading without hook state — used right before final evidence submission. */
export const getFreshPosition = getPosition;
