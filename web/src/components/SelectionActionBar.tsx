import { Button } from "./ui/button";
import { Send } from "lucide-react";
import { cn } from "../lib/utils";

interface SelectionActionBarProps {
  selectedCount: number;
  onCancel: () => void;
  onConfirm: () => void;
  isCollapsed?: boolean;
}

export function SelectionActionBar({
  selectedCount,
  onCancel,
  onConfirm,
  isCollapsed = false,
}: SelectionActionBarProps) {
  if (selectedCount === 0) return null;

  return (
    <div
      className={cn(
        "fixed bottom-6 z-30 animate-in slide-in-from-bottom-8 fade-in duration-300",
        "left-1/2 -translate-x-1/2",
        isCollapsed ? "md:left-[calc(50%+2.5rem)]" : "md:left-[calc(50%+8rem)]",
        "max-w-[calc(100vw-1.5rem)] w-auto"
      )}
    >
      <div className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white px-4 sm:px-6 py-3 sm:py-4 rounded-2xl shadow-2xl flex items-center gap-3 sm:gap-6 border border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <div className="bg-emerald-500 text-white w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center text-xs sm:text-sm font-bold shadow-inner shrink-0">
            {selectedCount}
          </div>
          <span className="font-medium text-xs sm:text-sm text-slate-600 dark:text-slate-300 whitespace-nowrap">
            seleccionados
          </span>
        </div>

        <div className="h-5 w-px bg-slate-200 dark:bg-slate-700 shrink-0" />

        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="ghost"
            onClick={onCancel}
            size="sm"
            className="text-xs sm:text-sm text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl px-2.5 sm:px-4"
          >
            Cancelar
          </Button>
          <Button
            onClick={onConfirm}
            size="sm"
            className="text-xs sm:text-sm bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl shadow-lg shadow-emerald-900/20 px-3.5 sm:px-6"
          >
            <Send className="mr-1.5 sm:mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4" /> Iniciar envío
          </Button>
        </div>
      </div>
    </div>
  );
}
