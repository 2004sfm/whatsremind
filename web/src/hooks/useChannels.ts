import { useState, useEffect, useCallback } from "react";
import { ipc } from "../lib/ipc";
import type { Channel } from "../lib/types";

export interface UseChannelsResult {
  channels: Channel[];
  activeChannel: Channel | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  activate: (id: number) => Promise<void>;
  remove: (id: number) => Promise<void>;
  update: (
    id: number,
    data: {
      displayName?: string | null;
      credentials?: Record<string, unknown> | string;
      phoneNumber?: string;
      status?: string;
    }
  ) => Promise<Channel>;
}

export function useChannels(engine?: string): UseChannelsResult {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const data = await ipc.getChannels(engine);
      setChannels(data);
      setError(null);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Error al cargar canales";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [engine]);

  useEffect(() => {
    refresh();

    // If unofficial engine is selected, GOWA may take 1-3 seconds to auto-connect on startup.
    // Poll quickly after 1.5s and 3.5s to ensure the connected state is detected seamlessly.
    let timer1: ReturnType<typeof setTimeout> | null = null;
    let timer2: ReturnType<typeof setTimeout> | null = null;
    if (engine === "unofficial") {
      timer1 = setTimeout(() => {
        refresh();
      }, 1500);
      timer2 = setTimeout(() => {
        refresh();
      }, 3500);
    }

    const handleUpdate = () => {
      refresh();
    };

    window.addEventListener("credentials-updated", handleUpdate);
    return () => {
      if (timer1) clearTimeout(timer1);
      if (timer2) clearTimeout(timer2);
      window.removeEventListener("credentials-updated", handleUpdate);
    };
  }, [refresh, engine]);

  const activeChannel = channels.find((c) => c.isActive === 1) || null;

  const activate = useCallback(
    async (id: number) => {
      await ipc.activateChannel(id);
      await refresh();
    },
    [refresh]
  );

  const remove = useCallback(
    async (id: number) => {
      await ipc.deleteChannel(id);
      await refresh();
    },
    [refresh]
  );

  const update = useCallback(
    async (
      id: number,
      data: {
        displayName?: string | null;
        credentials?: Record<string, unknown> | string;
        phoneNumber?: string;
        status?: string;
      }
    ) => {
      const res = await ipc.updateChannel(id, data);
      await refresh();
      return res;
    },
    [refresh]
  );

  return {
    channels,
    activeChannel,
    loading,
    error,
    refresh,
    activate,
    remove,
    update,
  };
}
