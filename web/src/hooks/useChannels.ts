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

    const handleUpdate = () => {
      refresh();
    };

    window.addEventListener("credentials-updated", handleUpdate);
    return () => {
      window.removeEventListener("credentials-updated", handleUpdate);
    };
  }, [refresh]);

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

  return {
    channels,
    activeChannel,
    loading,
    error,
    refresh,
    activate,
    remove,
  };
}
