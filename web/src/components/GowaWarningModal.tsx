import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "./ui/dialog";
import { Button } from "./ui/button";
import { AlertTriangle, ShieldAlert } from "lucide-react";

interface GowaWarningModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export function GowaWarningModal({
  isOpen,
  onClose,
  onConfirm,
}: GowaWarningModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
            <ShieldAlert className="h-5 w-5 text-amber-500" />
            Aviso de conexión no oficial (GOWA)
          </DialogTitle>
          <DialogDescription>
            Lee esta información de seguridad antes de vincular tu WhatsApp.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2 text-sm">
          <div className="rounded-lg border border-amber-200 bg-amber-50/70 p-3.5 dark:border-amber-900/60 dark:bg-amber-950/20 text-slate-700 dark:text-slate-300 space-y-2">
            <div className="flex items-center gap-2 font-medium text-amber-800 dark:text-amber-300">
              <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
              Riesgo de suspensión de cuenta
            </div>
            <p className="leading-relaxed">
              Esta integración emula una sesión web no oficial. WhatsApp monitorea el tráfico y puede suspender o banear números que envíen mensajes masivos a contactos que no los tienen agendados.
            </p>
          </div>

          <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-3 dark:border-slate-800 dark:bg-slate-900/30 text-slate-600 dark:text-slate-400 space-y-1.5 leading-relaxed">
            <p className="font-medium text-slate-800 dark:text-slate-200">
              Recomendaciones del sistema:
            </p>
            <ul className="list-disc pl-4 space-y-1">
              <li>Utiliza este motor como respaldo o para contingencias.</li>
              <li>Recomendamos vincular un número o chip secundario.</li>
              <li>El sistema aplicará pausas aleatorias de protección entre cada envío.</li>
            </ul>
          </div>
        </div>

        <DialogFooter className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2 pt-3">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="w-full sm:w-auto"
          >
            Cancelar
          </Button>
          <Button
            type="button"
            variant="default"
            onClick={onConfirm}
            className="w-full sm:w-auto bg-amber-600 hover:bg-amber-700 text-white font-medium"
          >
            Continuar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
