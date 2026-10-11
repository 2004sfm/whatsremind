import { useState, useEffect, useCallback } from "react";
import { ipc } from "../lib/ipc";
import type { WhatsAppProfile } from "../lib/types";

export type ApiStatus = "checking" | "connected" | "error" | "disconnected";
export type Engine = "meta" | "unofficial";

export interface ApiStatusState {
  status: ApiStatus;
  engine: Engine;
  phoneId: string | null;
  profile: WhatsAppProfile | null;
  /** True when the initial check has finished (used to hide the splash screen). */
  hasChecked: boolean;
  check: (event?: Event) => void;
}

/** Background poll interval per engine. */
const POLL_INTERVAL: Record<Engine, number> = {
  unofficial: 3000,
  meta: 5 * 60 * 1000,
};

/**
 * Tracks the WhatsApp connection status and the active engine, refreshing in
 * the background and whenever the credentials change.
 */
export function useApiStatus(): ApiStatusState {
  const [status, setStatus] = useState<ApiStatus>("checking");
  const [engine, setEngine] = useState<Engine>("meta");
  const [phoneId, setPhoneId] = useState<string | null>(null);
  const [profile, setProfile] = useState<WhatsAppProfile | null>(null);

  const check = useCallback((event?: Event) => {
    const isManualUpdate = event?.type === "credentials-updated";
    const isBackgroundPoll = event?.type === "background-poll";

    if (!isBackgroundPoll) setStatus("checking");

    ipc
      .getEngine()
      .then(async (currentEngine) => {
        const normalized = currentEngine as Engine;
        setEngine(normalized);

        if (normalized === "unofficial") {
          await checkSidecar();
        } else {
          await checkMeta();
        }
      })
      .catch(() => {
        setStatus("error");
        if (!isManualUpdate && !isBackgroundPoll) {
          setTimeout(() => window.dispatchEvent(new Event("api-error")), 400);
        }
      });

    async function checkSidecar() {
      try {
        const sidecar = await ipc.getSidecarStatus();
        if (sidecar.connected) {
          setStatus("connected");
          setPhoneId(sidecar.phone);
          setProfile(sidecar.phone ? { display_phone_number: sidecar.phone, verified_name: undefined } : null);
        } else {
          setPhoneId(null);
          setProfile(null);
          setStatus("error");
        }
      } catch (err) {
        console.error("❌ Sidecar API Error:", err);
        setPhoneId(null);
        setProfile(null);
        setStatus("error");
      }
    }

    async function checkMeta() {
      try {
        const creds = await ipc.getCredentials();
        if (!creds) {
          setStatus("disconnected");
          return;
        }

        setPhoneId(creds.phone_id);
        try {
          const prof = await ipc.getWhatsAppProfile();
          if (prof) {
            setProfile(prof);
            setStatus("connected");
          } else {
            setProfile(null);
            setStatus("error");
          }
        } catch (err) {
          console.error("❌ Meta API Verify Error:", err);
          setProfile(null);
          setStatus("error");
        }
      } catch {
        setStatus("error");
        if (!isManualUpdate && !isBackgroundPoll) {
          setTimeout(() => window.dispatchEvent(new Event("api-error")), 400);
        }
      }
    }
  }, []);

  useEffect(() => {
    check();
    window.addEventListener("credentials-updated", check);
    return () => window.removeEventListener("credentials-updated", check);
  }, [check]);

  useEffect(() => {
    const interval = setInterval(() => check(new Event("background-poll")), POLL_INTERVAL[engine]);
    return () => clearInterval(interval);
  }, [engine, check]);

  const hasChecked = status !== "checking";

  return { status, engine, phoneId, profile, hasChecked, check };
}
