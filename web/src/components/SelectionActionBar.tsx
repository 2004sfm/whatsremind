import { Button } from "./ui/button";
import { Send } from "lucide-react";

interface SelectionActionBarProps {
  selectedCount: number;
  onCancel: () => void;
  onConfirm: () => void;
}

export function SelectionActionBar({
  selectedCount,
  onCancel,
  onConfirm,
}: SelectionActionBarProps) {
  if (selectedCount === 0) return null;

  return (
    <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-8 fade-in duration-300">
      <div className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-6 border border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div className="bg-emerald-500 text-white w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold shadow-inner">
            {selectedCount}
          </div>
          <span className="font-medium text-slate-600 dark:text-slate-300">seleccionados</span>
        </div>

        <div className="h-5 w-px bg-slate-200 dark:bg-slate-700"></div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            onClick={onCancel}
            className="text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
          >
            Cancelar
          </Button>
          <Button
            onClick={onConfirm}
            className="bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl shadow-lg shadow-emerald-900/20 px-6"
          >
            <Send className="mr-2 h-4 w-4" /> Iniciar envío
          </Button>
        </div>
      </div>
    </div>
  );
}
