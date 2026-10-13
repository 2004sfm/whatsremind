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

interface EngineCacheEntry {
  status: ApiStatus;
  phoneId: string | null;
  profile: WhatsAppProfile | null;
  verifiedAt: number;
}

const engineCache: Partial<Record<Engine, EngineCacheEntry>> = {};
const TTL_MS = 10 * 60 * 1000; // 10 minutes TTL cache
const POLL_INTERVAL = 10 * 60 * 1000; // 10 minutes background check

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

    ipc
      .getEngine()
      .then(async (currentEngine) => {
        const normalized = currentEngine as Engine;
        setEngine(normalized);

        // If credentials were manually updated, invalidate this engine's TTL cache
        if (isManualUpdate) {
          delete engineCache[normalized];
        }

        // If not a background poll and cache is still fresh within TTL, reuse without network calls
        const cached = engineCache[normalized];
        if (!isBackgroundPoll && cached && Date.now() - cached.verifiedAt < TTL_MS) {
          setStatus(cached.status);
          setPhoneId(cached.phoneId);
          setProfile(cached.profile);
          return;
        }

        if (!isBackgroundPoll) setStatus("checking");

        try {
          const channels = await ipc.getChannels(normalized);
          const active = channels.find((c) => c.isActive === 1);

          if (!active) {
            setPhoneId(null);
            setProfile(null);
            setStatus("disconnected");
            engineCache[normalized] = {
              status: "disconnected",
              phoneId: null,
              profile: null,
              verifiedAt: Date.now(),
            };
            return;
          }

          if (normalized === "unofficial") {
            const isConnected = active.status === "connected";
            const newStatus: ApiStatus = isConnected ? "connected" : "disconnected";
            const newPhoneId = isConnected ? active.phoneNumber : null;
            const newProfile: WhatsAppProfile | null = isConnected
              ? {
                  display_phone_number: active.phoneNumber,
                  verified_name: active.displayName ?? undefined,
                }
              : null;

            setStatus(newStatus);
            setPhoneId(newPhoneId);
            setProfile(newProfile);
            engineCache[normalized] = {
              status: newStatus,
              phoneId: newPhoneId,
              profile: newProfile,
              verifiedAt: Date.now(),
            };
          } else {
            const newStatus: ApiStatus = active.status === "connected" ? "connected" : "error";
            const newPhoneId = active.phoneNumber;
            const newProfile: WhatsAppProfile = {
              display_phone_number: active.phoneNumber,
              verified_name: active.displayName ?? (normalized === "meta" ? "Meta Cloud API" : "YCloud API"),
            };

            setStatus(newStatus);
            setPhoneId(newPhoneId);
            setProfile(newProfile);
            engineCache[normalized] = {
              status: newStatus,
              phoneId: newPhoneId,
              profile: newProfile,
              verifiedAt: Date.now(),
            };
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
    // Background polling every 10 minutes checking only the active engine's active line
    const interval = setInterval(() => check(new Event("background-poll")), POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [engine, check]);

  const hasChecked = status !== "checking";

  return { status, engine, phoneId, profile, hasChecked, check };
}
