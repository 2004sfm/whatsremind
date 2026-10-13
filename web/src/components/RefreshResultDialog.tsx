import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "./ui/dialog";
import { Button } from "./ui/button";
import { CheckCircle2, AlertTriangle } from "lucide-react";
import type { ImportStats } from "../lib/types";
import { ImportErrorsList } from "./ImportErrorsList";

interface RefreshResultDialogProps {
  result: ImportStats | null;
  onClose: () => void;
}

const STAT_CARDS = (result: ImportStats) => [
  { label: "Nuevos", value: result.created, color: "text-emerald-600" },
  { label: "Actualizados", value: result.updated, color: "text-blue-600" },
  { label: "Desactivados", value: result.deactivated, color: "text-amber-600" },
  { label: "Avisos", value: result.errors.length, color: "text-amber-500" },
];

export function RefreshResultDialog({ result, onClose }: RefreshResultDialogProps) {
  if (!result) return null;

  const hasWarnings = result.errors.length > 0;

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg w-[95vw] sm:w-full max-h-[85vh] flex flex-col p-4 sm:p-6 overflow-hidden">
        <DialogHeader className="shrink-0">
          <DialogTitle className="flex items-center gap-2 text-xl">
            {hasWarnings ? (
              <AlertTriangle className="text-amber-500" />
            ) : (
              <CheckCircle2 className="text-emerald-500" />
            )}
            {hasWarnings ? "Sincronización completada con avisos" : "Sincronización exitosa"}
          </DialogTitle>
          <DialogDescription>
            La hoja se ha refrescado correctamente usando los últimos cambios del Excel.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4 overflow-y-auto pr-1 flex-1 min-h-0">
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

          <ImportErrorsList errors={result.errors} />
        </div>

        <DialogFooter className="shrink-0 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
          <Button onClick={onClose} className="bg-emerald-600 hover:bg-emerald-700 text-white w-full sm:w-auto">
            Entendido
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
