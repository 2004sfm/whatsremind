import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "./ui/dialog";
import { Button } from "./ui/button";
import { AlertCircle } from "lucide-react";

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  description: React.ReactNode;
  confirmLabel: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmModal({
  isOpen,
  title,
  description,
  confirmLabel,
  destructive = false,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="sm:max-w-md w-[95vw] sm:w-full max-h-[85vh] flex flex-col p-4 sm:p-6 overflow-hidden">
        <DialogHeader className="shrink-0">
          <DialogTitle className={`flex items-center gap-2 ${destructive ? "text-red-600" : ""}`}>
            {destructive && <AlertCircle size={20} />}
            {title}
          </DialogTitle>
        </DialogHeader>
        <div className="overflow-y-auto pr-1 flex-1 min-h-0 py-2">
          <DialogDescription className="text-sm text-muted-foreground">{description}</DialogDescription>
        </div>
        <DialogFooter className="shrink-0 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
          <Button variant="outline" onClick={onCancel} className="w-full sm:w-auto">
            Cancelar
          </Button>
          <Button
            variant={destructive ? "destructive" : "default"}
            className={destructive ? "w-full sm:w-auto" : "bg-emerald-600 hover:bg-emerald-700 text-white w-full sm:w-auto"}
            onClick={onConfirm}
          >
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
