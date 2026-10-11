import { useState, useEffect, useCallback } from "react";
import { ipc } from "../lib/ipc";
import type { Client, ClientFilter } from "../lib/types";

const LAST_SHEET_KEY = "lastSelectedSheet";

function buildInitialFilter(): ClientFilter {
  const savedSheet =
    typeof localStorage !== "undefined" ? localStorage.getItem(LAST_SHEET_KEY) : null;
  return {
    page: 1,
    page_size: 50,
    status: "all",
    sheet_name: savedSheet || undefined,
  };
}

/**
 * Owns the client list, the available sheets and the active filter,
 * keeping both in sync with the backend.
 */
export function useClients() {
  const [filter, setFilter] = useState<ClientFilter>(buildInitialFilter);
  const [clients, setClients] = useState<Client[]>([]);
  const [total, setTotal] = useState(0);
  const [availableSheets, setAvailableSheets] = useState<string[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);
  const [loading, setLoading] = useState(false);

  const loadSheets = useCallback(async () => {
    try {
      const sheets = await ipc.getAvailableSheets();
      setAvailableSheets(sheets);

      if (sheets.length > 0) {
        setFilter((prev) => {
          if (prev.sheet_name && sheets.includes(prev.sheet_name)) return prev;
          const savedSheet = localStorage.getItem(LAST_SHEET_KEY);
          const sheetToUse = savedSheet && sheets.includes(savedSheet) ? savedSheet : sheets[0];
          return { ...prev, sheet_name: sheetToUse, page: 1 };
        });
      } else {
        setFilter((prev) =>
          prev.sheet_name ? { ...prev, sheet_name: undefined, page: 1 } : prev
        );
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsInitialized(true);
    }
  }, []);

  const loadClients = useCallback(async () => {
    if (!isInitialized) return;
    if (availableSheets.length > 0 && !filter.sheet_name) return;

    setLoading(true);
    try {
      const res = await ipc.getClients(filter);
      setClients(res.data);
      setTotal(res.total);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [filter, isInitialized, availableSheets]);

  useEffect(() => {
    loadSheets();
  }, [loadSheets]);

  useEffect(() => {
    let mounted = true;

    const fetch = async () => {
      if (!mounted || !isInitialized) return;
      if (availableSheets.length > 0 && !filter.sheet_name) return;

      setLoading(true);
      try {
        const res = await ipc.getClients(filter);
        if (mounted) {
          setClients(res.data);
          setTotal(res.total);
        }
      } catch (err) {
        console.error(err);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetch();
    return () => {
      mounted = false;
    };
  }, [filter, isInitialized, availableSheets]);

  const updateFilter = useCallback((patch: Partial<ClientFilter>) => {
    setFilter((prev) => ({ ...prev, ...patch }));
  }, []);

  const selectSheet = useCallback((sheet: string) => {
    localStorage.setItem(LAST_SHEET_KEY, sheet);
    setFilter((prev) => ({ ...prev, sheet_name: sheet, page: 1 }));
  }, []);

  return {
    filter,
    updateFilter,
    selectSheet,
    clients,
    total,
    availableSheets,
    loading,
    loadClients,
    loadSheets,
  };
}
