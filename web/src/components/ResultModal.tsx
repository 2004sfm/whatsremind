import { Dialog, DialogContent, DialogHeader, DialogFooter } from "./ui/dialog";
import { DialogTitle } from "./ui/dialog";
import { Button } from "./ui/button";
import { CheckCircle2, AlertCircle } from "lucide-react";

interface ResultModalProps {
  isOpen: boolean;
  type: "success" | "error";
  message: string;
  onClose: () => void;
}

export function ResultModal({ isOpen, type, message, onClose }: ResultModalProps) {
  const isSuccess = type === "success";

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md w-[95vw] sm:w-full max-h-[85vh] flex flex-col p-4 sm:p-6 overflow-hidden">
        <DialogHeader className="shrink-0">
          <DialogTitle className="flex items-center gap-2">
            {isSuccess ? (
              <>
                <CheckCircle2 className="text-emerald-500" size={24} /> Conexión exitosa
              </>
            ) : (
              <>
                <AlertCircle className="text-red-500" size={24} /> Error de conexión
              </>
            )}
          </DialogTitle>
        </DialogHeader>
        <div className="py-4 overflow-y-auto pr-1 flex-1 min-h-0">
          <p className="text-slate-600 dark:text-slate-300">{message}</p>
        </div>
        <DialogFooter className="shrink-0 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
          <Button
            className={isSuccess ? "bg-emerald-600 hover:bg-emerald-700 text-white w-full sm:w-auto" : "w-full sm:w-auto"}
            variant={isSuccess ? "default" : "outline"}
            onClick={onClose}
          >
            Aceptar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
