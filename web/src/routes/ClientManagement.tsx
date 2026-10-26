import { useState, useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import { ipc } from "../lib/ipc";
import type { ImportStats } from "../lib/types";
import { ExcelImportModal } from "../components/ExcelImportModal";
import { SendConfirmationModal } from "../components/SendConfirmationModal";
import { SendProgressPanel } from "../components/SendProgressPanel";
import { Pagination } from "../components/Pagination";
import { ClientTopBar } from "../components/ClientTopBar";
import { ClientStatsCards } from "../components/ClientStatsCards";
import { ClientFilters } from "../components/ClientFilters";
import { ClientTable } from "../components/ClientTable";
import { SelectionActionBar } from "../components/SelectionActionBar";
import { RefreshResultDialog } from "../components/RefreshResultDialog";
import { useClients } from "../hooks/useClients";
import { useClientSelection } from "../hooks/useClientSelection";

const IMPORT_CONFIG_KEY = "lastImportConfig";
const IMPORTED_FILE_KEY = "lastImportedFileName";

export function ClientManagement() {
  const { isCollapsed } = useOutletContext<{ isCollapsed?: boolean }>() || {};
  const { filter, updateFilter, selectSheet, clients, total, availableSheets, loading, loadClients, loadSheets } = useClients();
  const { selectedIds, handleSelectAll, handleSelectOne, clearSelection, allPageSendableSelected, warningsCount } = useClientSelection(clients);

  const [fileName, setFileName] = useState<string | null>(() =>
    typeof window !== "undefined" ? localStorage.getItem(IMPORTED_FILE_KEY) : null
  );
  const [hasConfig, setHasConfig] = useState(!!localStorage.getItem(IMPORT_CONFIG_KEY));
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isProgressOpen, setIsProgressOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshResult, setRefreshResult] = useState<ImportStats | null>(null);

  useEffect(() => {
    // Listen for a newly imported file to refresh the top bar metadata
    const handleFile = (e: Event) => {
      setFileName((e as CustomEvent).detail);
      setHasConfig(true);
    };
    window.addEventListener("file-imported", handleFile);
    return () => window.removeEventListener("file-imported", handleFile);
  }, []);

  const handleRefresh = async () => {
    if (!filter.sheet_name) return;
    const configStr = localStorage.getItem(IMPORT_CONFIG_KEY);
    if (!configStr) return;

    try {
      setIsRefreshing(true);
      const config = JSON.parse(configStr);
      const result = await ipc.importExcel(config.filePath, config.mapping, true, filter.sheet_name);

      await loadSheets();
      await loadClients();

      setRefreshResult(result);
    } catch (err: unknown) {
      console.error(err);
      alert(`Error al refrescar: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleFilterChange = (patch: Partial<typeof filter>) => {
    // Any filter change invalidates the current selection
    clearSelection();
    updateFilter(patch);
  };

  const handleFinishProgress = () => {
    setIsProgressOpen(false);
    clearSelection();
    loadClients();
  };

  const handleStartSend = async (
    selectedTemplateName: string,
    selectedLanguage: string,
    variablesCount: number,
    variableMap?: Array<"code" | "debt" | "name">
  ) => {
    setIsConfirmOpen(false);
    setIsProgressOpen(true);

    try {
      await ipc.startBulkSend(
        Array.from(selectedIds),
        selectedTemplateName,
        selectedLanguage,
        variablesCount,
        variableMap
      );
    } catch (error) {
      console.error("Error starting bulk send", error);
      setIsProgressOpen(false);
    }
  };

  const totalDebt = clients.reduce((acc, c) => acc + c.debt, 0);

  return (
    <div className="space-y-6">
      <ClientTopBar
        filter={filter}
        fileName={fileName}
        availableSheets={availableSheets}
        hasConfig={hasConfig}
        isRefreshing={isRefreshing}
        onSelectSheet={selectSheet}
        onRefresh={handleRefresh}
        onImport={() => setIsImportOpen(true)}
      />

      <ClientStatsCards totalDebt={totalDebt} />

      <div className="bg-white dark:bg-slate-900 border rounded-xl shadow-sm overflow-hidden">
        <ClientFilters filter={filter} onChange={handleFilterChange} />

        <ClientTable
          clients={clients}
          loading={loading}
          selectedIds={selectedIds}
          allPageSendableSelected={allPageSendableSelected}
          onSelectAll={handleSelectAll}
          onSelectOne={handleSelectOne}
        />

        <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          <Pagination
            page={filter.page}
            pageSize={filter.page_size}
            total={total}
            onPageChange={(p) => updateFilter({ page: p })}
          />
        </div>
      </div>

      <SelectionActionBar
        selectedCount={selectedIds.size}
        onCancel={clearSelection}
        onConfirm={() => setIsConfirmOpen(true)}
        isCollapsed={isCollapsed}
      />

      <ExcelImportModal
        key={isImportOpen ? "import-open" : "import-closed"}
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        onSuccess={() => {
          loadSheets();
          loadClients();
        }}
      />

      <SendConfirmationModal
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={handleStartSend}
        recipientCount={selectedIds.size}
        warningsCount={warningsCount}
      />

      <SendProgressPanel
        isOpen={isProgressOpen}
        onClose={handleFinishProgress}
        totalRecipients={selectedIds.size}
      />

      <RefreshResultDialog result={refreshResult} onClose={() => setRefreshResult(null)} />
    </div>
  );
}
