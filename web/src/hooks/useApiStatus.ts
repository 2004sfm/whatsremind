import { useState, useEffect, useCallback } from "react";
import { ipc } from "../lib/ipc";
import type { WhatsAppProfile } from "../lib/types";

export type ApiStatus = "checking" | "connected" | "error" | "disconnected";
export type Engine = "meta" | "ycloud" | "unofficial";

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
  ycloud: 5 * 60 * 1000,
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

        try {
          const channels = await ipc.getChannels(normalized);
          const active = channels.find((c) => c.isActive === 1);

          if (!active) {
            setPhoneId(null);
            setProfile(null);
            setStatus("disconnected");
            return;
          }

          if (normalized === "unofficial") {
            if (active.status === "connected") {
              setStatus("connected");
              setPhoneId(active.phoneNumber);
              setProfile({
                display_phone_number: active.phoneNumber,
                verified_name: active.displayName ?? undefined,
              });
            } else {
              setPhoneId(null);
              setProfile(null);
              setStatus("disconnected");
            }
          } else {
            setPhoneId(active.phoneNumber);
            setProfile({
              display_phone_number: active.phoneNumber,
              verified_name: active.displayName ?? (normalized === "meta" ? "Meta Cloud API" : "YCloud API"),
            });
            setStatus(active.status === "connected" ? "connected" : "error");
          }
        } catch (err) {
          console.error(`❌ ${normalized} Status Error:`, err);
          setPhoneId(null);
          setProfile(null);
          setStatus("error");
        }
      })
      .catch(() => {
        setStatus("error");
        if (!isManualUpdate && !isBackgroundPoll) {
          setTimeout(() => window.dispatchEvent(new Event("api-error")), 400);
        }
      });
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
