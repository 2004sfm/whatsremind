import { useEffect, useState } from 'react';
import { ipc } from '../lib/ipc';
import { BulkSendProgressEvent } from '../lib/types';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from './ui/dialog';
import { Button } from './ui/button';
import { Progress } from './ui/progress';
import { Loader2, XCircle, CheckCircle2, AlertCircle } from 'lucide-react';

const translateError = (detail: string | undefined | null) => {
  if (!detail) return "Error desconocido";
  if (detail.includes("Template name does not exist in the translation") || detail.includes("does not exist in") || detail.includes("132001")) {
    return "La plantilla seleccionada no existe en el idioma de tu cuenta (ingresa a Meta para revisar el idioma).";
  }
  if (detail.includes("number of localizable_params") || detail.includes("does not match the expected number of params") || detail.includes("132000")) {
    return "Error de variables: La plantilla no tiene la misma cantidad de huecos {{1}} que los datos enviados.";
  }
  if (detail.includes("TokenExpired") || detail.includes("401") || detail.includes("403")) {
    return "El token de Meta ha expirado. Ve a Configuración y re-vincula tu cuenta.";
  }
  if (detail.includes("131047") || detail.includes("more than 24 hours")) {
    return "Han pasado más de 24 horas desde el último mensaje (Regla de Meta).";
  }
  return detail; // Default raw fallback
};

interface SendProgressPanelProps {
  isOpen: boolean;
  onClose: () => void;
  totalRecipients: number;
}

export function SendProgressPanel({ isOpen, onClose, totalRecipients }: SendProgressPanelProps) {
  const [progress, setProgress] = useState<BulkSendProgressEvent | null>(null);
  const [logs, setLogs] = useState<BulkSendProgressEvent['latest_log'][]>([]);
  const [isCancelled, setIsCancelled] = useState(false);
  const [isDone, setIsDone] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    
    setProgress({ sent: 0, failed: 0, total: totalRecipients });
    setLogs([]);
    setIsCancelled(false);
    setIsDone(false);

    const unlistenProgress = ipc.listenBulkSendProgress((evt) => {
      setProgress(evt);
      if (evt.latest_log) {
        setLogs(prev => [evt.latest_log!, ...prev].slice(0, 50)); // keep last 50
      }
      if (evt.sent + evt.failed >= evt.total) {
        setIsDone(true);
      }
    });

    const unlistenHalted = ipc.listenBulkSendHalted(() => {
      setIsCancelled(true);
      setIsDone(true);
    });

    return () => {
      unlistenProgress.then(fn => fn());
      unlistenHalted.then(fn => fn());
    };
  }, [isOpen, totalRecipients]);

  const handleCancel = async () => {
    await ipc.cancelBulkSend();
    setIsCancelled(true);
    setIsDone(true);
  };

  if (!isOpen) return null;

  const currentTotal = progress ? progress.sent + progress.failed : 0;
  const percent = totalRecipients > 0 ? (currentTotal / totalRecipients) * 100 : 0;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open && isDone) onClose();
    }}>
      <DialogContent className="sm:max-w-xl max-h-[85vh] flex flex-col p-0 gap-0 overflow-hidden">
        <DialogHeader className="p-6 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
          <DialogTitle className="flex items-center gap-2 text-xl">
            {isDone ? <CheckCircle2 className="w-6 h-6 text-emerald-500" /> : <Loader2 className="w-6 h-6 animate-spin text-emerald-500" />}
            {isDone ? 'Envío Finalizado' : 'Enviando Mensajes...'}
          </DialogTitle>
          <DialogDescription>
            {isDone ? 'La campaña ha finalizado. Revisa el registro.' : 'Por favor no cierres esta ventana hasta que termine el envío.'}
          </DialogDescription>
        </DialogHeader>

        <div className="p-6 bg-white dark:bg-slate-900 space-y-5">
          <div className="flex justify-between text-sm font-medium">
            <span className="text-slate-500">Progreso de la campaña</span>
            <span className="text-slate-900 dark:text-white font-mono">{currentTotal} / {totalRecipients} ({Math.round(percent)}%)</span>
          </div>
          <Progress value={percent} className="h-2.5 bg-slate-100 dark:bg-slate-800" />
          
          <div className="grid grid-cols-2 gap-4 mt-2">
            <div className="bg-emerald-50 dark:bg-emerald-500/10 p-4 rounded-xl border border-emerald-100 dark:border-emerald-900/50 flex flex-col items-center">
              <p className="text-xs text-emerald-600 dark:text-emerald-400 font-bold uppercase tracking-wider mb-1">Enviados</p>
              <p className="text-3xl font-black text-emerald-700 dark:text-emerald-300">{progress?.sent || 0}</p>
            </div>
            <div className="bg-red-50 dark:bg-red-500/10 p-4 rounded-xl border border-red-100 dark:border-red-900/50 flex flex-col items-center">
              <p className="text-xs text-red-600 dark:text-red-400 font-bold uppercase tracking-wider mb-1">Fallidos</p>
              <p className="text-3xl font-black text-red-700 dark:text-red-300">{progress?.failed || 0}</p>
            </div>
          </div>

          {isCancelled && (
            <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 text-sm bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-900/50 p-3 rounded-lg font-medium">
              <AlertCircle size={18} className="shrink-0" /> Campaña detenida o cancelada por el usuario.
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-6 bg-slate-50 dark:bg-slate-950 border-t border-slate-100 dark:border-slate-800 min-h-[250px] shadow-inner">
          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Registro en Vivo</h4>
          <div className="space-y-3">
            {logs.map((log, i) => (
              <div key={i} className="flex items-start gap-3 p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm text-sm transition-all hover:shadow-md">
                {log?.status === 'sent' ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 mt-0.5 flex-shrink-0" />
                ) : (
                  <XCircle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-semibold text-slate-700 dark:text-slate-200">{log?.phone_number}</span>
                  </div>
                  {log?.status === 'failed' && (
                    <p className="text-xs text-red-600 dark:text-red-400 font-medium leading-relaxed">{translateError(log.error_detail)}</p>
                  )}
                </div>
              </div>
            ))}
            {logs.length === 0 && (
              <div className="flex flex-col items-center justify-center text-slate-400 py-8 gap-2">
                <Loader2 className="w-6 h-6 animate-spin opacity-50" />
                <p className="text-sm font-medium">Esperando resultados del servidor...</p>
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="p-4 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 sm:justify-center">
          {!isDone ? (
            <Button variant="destructive" className="w-full sm:w-auto font-medium" onClick={handleCancel}>
              Detener Envío
            </Button>
          ) : (
            <Button className="w-full sm:w-auto bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-white dark:text-slate-900 font-semibold px-8" onClick={onClose}>
              Cerrar y Volver
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
