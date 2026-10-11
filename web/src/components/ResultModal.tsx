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
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isSuccess ? (
              <>
                <CheckCircle2 className="text-emerald-500" size={24} /> Conexión exitosa
              </>
            ) : (
              <>
                <AlertCircle className="text-red-500" size={24} /> Error de Conexión
              </>
            )}
          </DialogTitle>
        </DialogHeader>
        <div className="py-4">
          <p className="text-slate-600 dark:text-slate-300">{message}</p>
        </div>
        <DialogFooter>
          <Button
            className={isSuccess ? "bg-emerald-600 hover:bg-emerald-700 text-white" : ""}
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
