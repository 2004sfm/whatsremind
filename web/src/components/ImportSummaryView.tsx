import { CheckCircle2, AlertTriangle } from "lucide-react";
import type { ImportStats } from "../lib/types";
import { ImportErrorsList } from "./ImportErrorsList";

interface ImportSummaryViewProps {
  result: ImportStats;
}

const STAT_CARDS = (result: ImportStats) => [
  { label: "Nuevos", value: result.created, color: "text-emerald-600" },
  { label: "Actualizados", value: result.updated, color: "text-blue-600" },
  { label: "Desactivados", value: result.deactivated, color: "text-amber-600" },
  { label: "Avisos", value: result.errors.length, color: "text-amber-500" },
];

export function ImportSummaryView({ result }: ImportSummaryViewProps) {
  return (
    <div className="py-4 space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {STAT_CARDS(result).map((stat) => (
          <div
            key={stat.label}
            className="bg-slate-50 dark:bg-slate-800/50 border rounded-lg p-4 text-center"
          >
            <p className="text-sm font-medium text-slate-500 mb-1">{stat.label}</p>
            <p className={`text-3xl font-bold ${stat.color}`}>{stat.value}</p>
          </div>
        ))}
      </div>

      {result.errors.length > 0 && <ImportErrorsList errors={result.errors} />}
    </div>
  );
}

interface ImportSummaryTitleProps {
  result: ImportStats;
}

export function ImportSummaryTitle({ result }: ImportSummaryTitleProps) {
  const hasWarnings = result.errors.length > 0;

  return (
    <>
      {hasWarnings ? (
        <AlertTriangle className="text-amber-500" />
      ) : (
        <CheckCircle2 className="text-emerald-500" />
      )}
      {hasWarnings ? "Sincronización completada con avisos" : "Sincronización exitosa"}
    </>
  );
}
