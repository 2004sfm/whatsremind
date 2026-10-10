import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from './ui/dialog';
import { Button } from './ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Send, AlertTriangle, Loader2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import { ipc } from '../lib/ipc';
import type { TemplateItem } from '../lib/types';
import { formatError, parseMetaError } from '../lib/utils';

interface SendConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (templateName: string, language: string, variablesCount: number) => void;
  recipientCount: number;
  warningsCount: number;
}

export function SendConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  recipientCount,
  warningsCount
}: SendConfirmationModalProps) {
  const [templates, setTemplates] = useState<TemplateItem[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [engine, setEngine] = useState<string>('meta');

  useEffect(() => {
    if (isOpen) {
      setIsLoading(true);
      setApiError(null);
      ipc.getEngine().then((currentEngine) => {
        setEngine(currentEngine);
        if (currentEngine === 'unofficial') {
          ipc.getLocalTemplates()
            .then((data) => {
              setTemplates(data);
              if (data.length > 0) {
                setSelectedTemplate(data[0].name);
              }
            })
            .catch((err) => setApiError(formatError(err)))
            .finally(() => setIsLoading(false));
        } else {
          ipc.getMetaTemplates()
            .then((data) => {
              const approved = data.filter(t => t.status === 'APPROVED');
              setTemplates(approved);
              if (approved.length > 0) {
                setSelectedTemplate(approved[0].name);
              }
            })
            .catch((err) => setApiError(parseMetaError(formatError(err))))
            .finally(() => setIsLoading(false));
        }
      });
    } else {
      setSelectedTemplate('');
      setTemplates([]);
      setApiError(null);
    }
  }, [isOpen]);
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="text-emerald-500" />
            Confirmar envío
          </DialogTitle>
          <DialogDescription>
            Estás a punto de iniciar una campaña de mensajes.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {warningsCount > 0 && !apiError && (
            <div className="flex items-start gap-3 p-3 bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 rounded-lg border border-amber-200 dark:border-amber-900">
              <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-bold mb-1">Aviso de envío frecuente</p>
                <p>Destinatarios notificados en las últimas 24h: <strong>{warningsCount}</strong>.<br/>¿Deseas enviar el mensaje de todos modos?</p>
              </div>
            </div>
          )}

          <div className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-900 rounded-lg border">
            <span className="text-sm text-slate-500">Destinatarios</span>
            <span className="font-bold text-slate-900 dark:text-white">{recipientCount}</span>
          </div>

          {apiError ? (
            <div className="flex items-start gap-3 p-4 bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400 rounded-lg border border-red-200 dark:border-red-900/50 mt-4">
              <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-semibold mb-1">Conexión interrumpida</p>
                <p>{engine === 'meta' && (apiError.includes('expirado') || apiError.includes('inválido')) ? 'No se pueden enviar mensajes en este momento porque tu token de acceso a Meta ha expirado. Por favor, renuévalo en Configuración.' : apiError}</p>
              </div>
            </div>
          ) : (
            <div className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-900 rounded-lg border">
              <span className="text-sm text-slate-500">Plantilla</span>
              <div className="w-1/2">
                {isLoading ? (
                  <div className="flex items-center text-xs text-slate-400">
                    <Loader2 className="w-3 h-3 mr-2 animate-spin" /> Cargando...
                  </div>
                ) : (
                  <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                    <SelectTrigger className="h-8 text-xs font-mono bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                      <SelectValue placeholder="Seleccionar" />
                    </SelectTrigger>
                    <SelectContent>
                      {templates.length === 0 ? (
                        <SelectItem value="none" disabled>{engine === 'unofficial' ? 'No hay plantillas locales' : 'No hay plantillas aprobadas'}</SelectItem>
                      ) : (
                        templates.map(tpl => (
                          <SelectItem key={tpl.id} value={tpl.name} className="font-mono text-xs">
                            {tpl.name}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                )}
              </div>
            </div>
          )}

        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button 
            className="bg-emerald-600 hover:bg-emerald-700 text-white" 
            onClick={() => {
              const tpl = templates.find(t => t.name === selectedTemplate);
              let variablesCount = 0;
              if (tpl) {
                const bodyComp = tpl.components.find(c => c.type === 'BODY' || (c as any).component_type === 'BODY');
                if (bodyComp && bodyComp.text) {
                  for (let i = 1; i <= 10; i++) {
                    if (bodyComp.text.includes(`{{${i}}}`)) {
                      variablesCount = i;
                    }
                  }
                }
              }
              onConfirm(selectedTemplate, tpl?.language || 'es', variablesCount);
            }}
            disabled={!selectedTemplate || isLoading || templates.length === 0 || apiError !== null}
          >
            <Send className="w-4 h-4 mr-2" />
            Iniciar Envío
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
