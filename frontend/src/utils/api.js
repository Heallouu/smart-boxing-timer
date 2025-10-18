// frontend/src/utils/api.js
import { Capacitor } from "@capacitor/core";
import { generateLocalSession } from "./localSession";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:4000";

export async function fetchSession(level) {
  const isNative = Capacitor.isNativePlatform?.() || false;

  // Sur mobile natif (Capacitor) -> offline direct
  if (isNative) {
    return generateLocalSession(level);
  }

  // Sur web: tente l'API, sinon fallback offline
  try {
    const res = await fetch(
      `${API_BASE}/api/session?level=${encodeURIComponent(level)}`
    );
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch {
    // Fallback web si backend off
    return generateLocalSession(level);
  }
}
