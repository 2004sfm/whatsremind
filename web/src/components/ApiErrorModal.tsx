import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "./ui/dialog";
import { Button } from "./ui/button";
import { AlertCircle } from "lucide-react";
import type { Engine } from "../hooks/useApiStatus";

interface ApiErrorModalProps {
  isOpen: boolean;
  engine: Engine;
  onClose: () => void;
}

export function ApiErrorModal({ isOpen, engine, onClose }: ApiErrorModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      {isOpen && <ApiErrorContent engine={engine} onClose={onClose} />}
    </Dialog>
  );
}

function ApiErrorContent({ engine, onClose }: { engine: Engine; onClose: () => void }) {
  const navigate = useNavigate();

  return (
    <DialogContent className="sm:max-w-md w-[95vw] sm:w-full max-h-[85vh] flex flex-col p-4 sm:p-6 overflow-hidden">
      <DialogHeader className="shrink-0">
        <DialogTitle className="flex items-center gap-2 text-xl text-slate-900 dark:text-white">
          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-red-100 dark:bg-red-500/20 text-red-600">
            <AlertCircle size={24} />
          </div>
          Problema de conexión
        </DialogTitle>
      </DialogHeader>

      <div className="space-y-4 py-4 text-slate-600 dark:text-slate-300 overflow-y-auto pr-1 flex-1 min-h-0">
        {engine === "meta" ? (
          <>
            <p>
              ¡Hola! No pudimos conectar tu sistema con los servidores de WhatsApp. Esto ocurre por una de dos razones:
            </p>
            <ul className="list-disc pl-5 space-y-2 text-sm font-medium">
              <li>Tu computadora no tiene conexión a internet en este momento.</li>
              <li>
                El &quot;Token de Acceso&quot; que guardaste en la configuración ha vencido o fue revocado por Meta.
              </li>
            </ul>
            <p className="text-sm">
              <strong>¿Cómo solucionarlo?</strong>
              <br />
              Si tienes internet, ve a la sección de{" "}
              <span className="font-semibold text-emerald-600 dark:text-emerald-400">Configuración</span>, asegúrate de
              que tu Token permanente esté actualizado y presiona &quot;Validar y Guardar&quot;.
            </p>
          </>
        ) : (
          <>
            <p>¡Hola! WhatsApp detectó que tu teléfono celular se ha desconectado. Esto puede ocurrir porque:</p>
            <ul className="list-disc pl-5 space-y-2 text-sm font-medium">
              <li>Cerraste la sesión desde la aplicación de WhatsApp en tu teléfono.</li>
              <li>Tu computadora perdió la conexión a internet.</li>
            </ul>
            <p className="text-sm">
              <strong>¿Cómo solucionarlo?</strong>
              <br />
              Asegúrate de tener internet y ve a la sección de{" "}
              <span className="font-semibold text-emerald-600 dark:text-emerald-400">Configuración</span> para
              escanear el código QR nuevamente y vincular tu dispositivo.
            </p>
          </>
        )}
      </div>

      <DialogFooter className="shrink-0 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
        <Button variant="outline" onClick={onClose} className="w-full sm:w-auto">
          Cerrar
        </Button>
        <Button
          className="bg-emerald-600 hover:bg-emerald-700 text-white w-full sm:w-auto"
          onClick={() => {
            onClose();
            navigate("/settings");
          }}
        >
          Ir a configuración
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
