import { FileSpreadsheet } from "lucide-react";

interface ImportError {
  row: number;
  reason: string;
}

interface ImportErrorsListProps {
  errors: ImportError[];
  title?: string;
}

export function ImportErrorsList({ errors, title = "Detalle de avisos:" }: ImportErrorsListProps) {
  if (errors.length === 0) return null;

  return (
    <div className="mt-4 border border-amber-200 bg-amber-50 dark:bg-amber-900/10 dark:border-amber-500/20 rounded-md p-4 max-h-48 overflow-y-auto text-sm">
      <div className="flex items-center gap-2 mb-3">
        <FileSpreadsheet className="text-amber-600 dark:text-amber-400" size={16} />
        <p className="font-semibold text-amber-700 dark:text-amber-400">{title}</p>
      </div>
      <div className="space-y-3 text-amber-800 dark:text-amber-300">
        {Object.entries(
          errors.reduce((acc, e) => {
            const reason = e.reason.replace(/^Aviso:\s*/i, "");
            acc[reason] = acc[reason] || [];
            acc[reason].push(e.row);
            return acc;
          }, {} as Record<string, number[]>)
        ).map(([reason, rows]) => (
          <div key={reason} className="bg-amber-100/50 dark:bg-amber-900/20 p-3 rounded-md">
            <p className="font-medium text-amber-900 dark:text-amber-200">{reason}</p>
            <p className="text-xs mt-1.5 text-amber-700 dark:text-amber-400/80">
              <span className="font-semibold">Filas:</span> {rows.join(", ")}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
