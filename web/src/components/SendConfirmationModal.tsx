import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from './ui/dialog';
import { Button } from './ui/button';
import { Send, AlertTriangle } from 'lucide-react';
import { useTemplates } from '../hooks/useTemplates';
import { TemplateSelector } from './TemplateSelector';
import { countBodyVariables, describeTemplateError } from '../lib/template-utils';

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
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      {isOpen && (
        <SendConfirmationContent
          onClose={onClose}
          onConfirm={onConfirm}
          recipientCount={recipientCount}
          warningsCount={warningsCount}
        />
      )}
    </Dialog>
  );
}

interface SendConfirmationContentProps {
  onClose: () => void;
  onConfirm: (templateName: string, language: string, variablesCount: number) => void;
  recipientCount: number;
  warningsCount: number;
}

function SendConfirmationContent({
  onClose,
  onConfirm,
  recipientCount,
  warningsCount,
}: SendConfirmationContentProps) {
  const { templates, selectedTemplate, setSelectedTemplate, isLoading, apiError, engine } = useTemplates(true);

  const handleConfirm = () => {
    const tpl = templates.find(t => t.name === selectedTemplate);
    onConfirm(selectedTemplate, tpl?.language || 'es', countBodyVariables(tpl));
  };

  const isSubmitDisabled = !selectedTemplate || isLoading || templates.length === 0 || apiError !== null;

  return (
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
                <p>{describeTemplateError(engine, apiError)}</p>
              </div>
            </div>
          ) : (
            <div className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-900 rounded-lg border">
              <span className="text-sm text-slate-500">Plantilla</span>
              <div className="w-1/2">
                <TemplateSelector
                  templates={templates}
                  selectedTemplate={selectedTemplate}
                  onSelect={setSelectedTemplate}
                  isLoading={isLoading}
                  engine={engine}
                />
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button 
            className="bg-emerald-600 hover:bg-emerald-700 text-white" 
            onClick={handleConfirm}
            disabled={isSubmitDisabled}
          >
            <Send className="w-4 h-4 mr-2" />
            Iniciar Envío
          </Button>
        </DialogFooter>
      </DialogContent>
  );
}
