import { Button } from "./ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { FileSpreadsheet, FileUp, RefreshCw } from "lucide-react";
import type { ClientFilter } from "../lib/types";

interface ClientTopBarProps {
  filter: ClientFilter;
  fileName: string | null;
  availableSheets: string[];
  hasConfig: boolean;
  isRefreshing: boolean;
  onSelectSheet: (sheet: string) => void;
  onRefresh: () => void;
  onImport: () => void;
}

export function ClientTopBar({
  filter,
  fileName,
  availableSheets,
  hasConfig,
  isRefreshing,
  onSelectSheet,
  onRefresh,
  onImport,
}: ClientTopBarProps) {
  return (
    <div className="flex flex-col gap-4 w-full">
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 w-full min-h-[44px]">
        <div
          className={`flex items-center justify-between sm:justify-start gap-2 bg-slate-100 dark:bg-slate-900 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 w-full lg:w-auto transition-opacity ${
            availableSheets.length === 0 ? "opacity-50 pointer-events-none" : ""
          }`}
        >
          {fileName && (
            <div
              className="flex items-center gap-2 text-sm font-medium text-slate-500 max-w-[120px] md:max-w-[200px] cursor-default group relative pr-2 border-r border-slate-300 dark:border-slate-700"
            >
              <FileSpreadsheet size={16} className="text-emerald-500 shrink-0 hidden sm:block" />
              <span className="truncate" title={fileName}>
                {fileName}
              </span>
            </div>
          )}
          <span className="text-sm font-medium text-slate-500 whitespace-nowrap ml-1 sm:ml-0">
            Hoja:
          </span>
          <Select
            value={filter.sheet_name || ""}
            onValueChange={onSelectSheet}
            disabled={availableSheets.length === 0}
          >
            <SelectTrigger className="w-full sm:w-[180px] h-8 bg-white dark:bg-slate-950 border-none shadow-sm text-sm font-semibold text-emerald-700 dark:text-emerald-400 disabled:opacity-50">
              <SelectValue
                placeholder={availableSheets.length === 0 ? "Sin datos" : "Seleccionar hoja"}
              />
            </SelectTrigger>
            <SelectContent>
              {availableSheets.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-row items-center gap-2 w-full lg:w-auto overflow-hidden">
          {hasConfig && filter.sheet_name && (
            <Button
              variant="outline"
              className="flex-1 lg:flex-none bg-white dark:bg-slate-950 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 px-3"
              onClick={onRefresh}
              disabled={isRefreshing}
              title="Sincronizar cambios"
            >
              <RefreshCw className={`w-4 h-4 mr-0 sm:mr-2 ${isRefreshing ? "animate-spin" : ""}`} />
              <span className="hidden sm:inline">Refrescar</span>
            </Button>
          )}
          <Button
            variant="outline"
            className="flex-1 lg:flex-none bg-white dark:bg-slate-950 px-3"
            onClick={onImport}
          >
            <FileUp className="w-4 h-4 mr-0 sm:mr-2" />
            <span className="hidden sm:inline">Importar archivo</span>
            <span className="sm:hidden">Importar</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
