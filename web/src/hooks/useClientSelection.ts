import { useState, useCallback } from "react";
import type { Client } from "../lib/types";

const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

export const isClientSelectable = (c: Client) => c.is_sendable && c.debt > 0;

/**
 * Owns the multi-select state over the client table, including the
 * "all sendable on page" master checkbox and the recent-send warning count.
 */
export function useClientSelection(clients: Client[]) {
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  const clearSelection = useCallback(() => setSelectedIds(new Set()), []);

  const handleSelectAll = useCallback(
    (checked: boolean) => {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        if (checked) {
          clients.filter(isClientSelectable).forEach((c) => next.add(c.id));
        } else {
          clients.forEach((c) => next.delete(c.id));
        }
        return next;
      });
    },
    [clients]
  );

  const handleSelectOne = useCallback((id: number, checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }, []);

  const allPageSendableSelected =
    clients.length > 0 && clients.filter(isClientSelectable).every((c) => selectedIds.has(c.id));

  const warningsCount = clients.filter(
    (c) =>
      selectedIds.has(c.id) &&
      c.last_sent &&
      Date.now() - new Date(c.last_sent).getTime() < TWENTY_FOUR_HOURS_MS
  ).length;

  return {
    selectedIds,
    handleSelectAll,
    handleSelectOne,
    clearSelection,
    allPageSendableSelected,
    warningsCount,
  };
}
