import { useState, useEffect, useMemo, useCallback, memo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "./ui/dialog";
import { Button } from "./ui/button";
import { Send, AlertTriangle } from "lucide-react";
import { useTemplates } from "../hooks/useTemplates";
import { useChannels } from "../hooks/useChannels";
import { TemplateSelector } from "./TemplateSelector";
import { TemplatePreview } from "./TemplatePreview";
import {
  countBodyVariables,
  describeTemplateError,
  getComponentText,
  extractTemplateVariableIndices,
  type ClientVariableField,
} from "../lib/template-utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import type { Channel } from "../lib/types";

interface SendConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (
    templateName: string,
    language: string,
    variablesCount: number,
    variableMap?: Array<"code" | "debt" | "name">
  ) => void;
  recipientCount: number;
  warningsCount: number;
}

export function SendConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  recipientCount,
  warningsCount,
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
  onConfirm: (
    templateName: string,
    language: string,
    variablesCount: number,
    variableMap?: Array<"code" | "debt" | "name">
  ) => void;
  recipientCount: number;
  warningsCount: number;
}

function SendConfirmationContent({
  onClose,
  onConfirm,
  recipientCount,
  warningsCount,
}: SendConfirmationContentProps) {
  const {
    templates,
    selectedTemplate,
    setSelectedTemplate,
    isLoading,
    apiError,
    engine,
  } = useTemplates(true);
  const { activeChannel } = useChannels(engine);

  const [variableMap, setVariableMap] = useState<Record<number, "code" | "debt" | "name">>({});

  const currentTemplate = templates.find((t) => t.name === selectedTemplate);
  const headerText = currentTemplate ? getComponentText(currentTemplate, "HEADER") : undefined;
  const bodyText = currentTemplate ? getComponentText(currentTemplate, "BODY") || "" : "";
  const footerText = currentTemplate ? getComponentText(currentTemplate, "FOOTER") : undefined;

  const variableIndices = useMemo(
    () => extractTemplateVariableIndices(bodyText).filter((idx) => idx > 0),
    [bodyText]
  );
  const varCount = countBodyVariables(currentTemplate);

  const handleMappingChange = useCallback((idx: number, val: "code" | "debt" | "name") => {
    setVariableMap((prev) => ({ ...prev, [idx]: val }));
  }, []);

  useEffect(() => {
    if (!selectedTemplate) {
      setVariableMap({});
      return;
    }

    const tpl = templates.find((t) => t.name === selectedTemplate);
    const body = tpl ? getComponentText(tpl, "BODY") || "" : "";
    const indices = extractTemplateVariableIndices(body).filter((idx) => idx > 0);
    const count = countBodyVariables(tpl);

    const initialMap: Record<number, "code" | "debt" | "name"> = {};
    for (const idx of indices) {
      if (idx === 1 && count === 1) {
        initialMap[idx] = "debt";
      } else if (idx === 1) {
        initialMap[idx] = "code";
      } else if (idx === 2) {
        initialMap[idx] = "debt";
      } else if (idx === 3) {
        initialMap[idx] = "name";
      } else {
        initialMap[idx] = "code";
      }
    }
    setVariableMap(initialMap);
  }, [selectedTemplate, templates]);

  const handleConfirm = () => {
    const tpl = templates.find((t) => t.name === selectedTemplate);
    const count = countBodyVariables(tpl);

    let mappingArray: Array<"code" | "debt" | "name"> | undefined;
    if (count > 0) {
      mappingArray = [];
      for (let i = 1; i <= count; i++) {
        mappingArray.push(
          variableMap[i] ||
            (i === 1 && count === 1
              ? "debt"
              : i === 2
                ? "debt"
                : i === 3
                  ? "name"
                  : "code")
        );
      }
    }

    onConfirm(selectedTemplate, tpl?.language || "es", count, mappingArray);
  };

  const isSubmitDisabled =
    !selectedTemplate || isLoading || templates.length === 0 || apiError !== null;

  return (
    <DialogContent className="sm:max-w-xl w-[95vw] sm:w-full max-h-[88vh] flex flex-col p-4 sm:p-6 overflow-hidden">
      <DialogHeader className="shrink-0 text-left">
        <DialogTitle className="flex items-center gap-2">
          <Send className="text-emerald-500" />
          Confirmar envío
        </DialogTitle>
        <DialogDescription>
          Estás a punto de iniciar una campaña de mensajes.
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-4 py-3 overflow-y-auto pr-1 flex-1 min-h-0">
        {warningsCount > 0 && !apiError && (
          <FrequentSendWarning warningsCount={warningsCount} />
        )}

        {activeChannel && <ActiveChannelCard activeChannel={activeChannel} />}

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

        {/* Variable mapping selector when template has positional variables */}
        {variableIndices.length > 0 && (
          <VariableMappingCard
            variableIndices={variableIndices}
            varCount={varCount}
            variableMap={variableMap}
            onMappingChange={handleMappingChange}
          />
        )}

        {/* Live Template Preview Card */}
        {selectedTemplate && bodyText && (
          <TemplatePreview
            header={headerText}
            body={bodyText}
            footer={footerText}
            variableMap={variableMap as Record<number, ClientVariableField>}
            defaultShowSample={true}
          />
        )}
      </div>

      <DialogFooter className="shrink-0 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
        <Button variant="outline" onClick={onClose} className="w-full sm:w-auto">
          Cancelar
        </Button>
        <Button
          className="bg-emerald-600 hover:bg-emerald-700 text-white w-full sm:w-auto"
          onClick={handleConfirm}
          disabled={isSubmitDisabled}
        >
          <Send className="w-4 h-4 mr-2" />
          Iniciar envío
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}

const FrequentSendWarning = memo(function FrequentSendWarning({
  warningsCount,
}: {
  warningsCount: number;
}) {
  return (
    <div className="flex items-start gap-3 p-3 bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 rounded-lg border border-amber-200 dark:border-amber-900">
      <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
      <div className="text-sm">
        <p className="font-bold mb-1">Aviso de envío frecuente</p>
        <p>
          Destinatarios notificados en las últimas 24h: <strong>{warningsCount}</strong>.
          <br />
          ¿Deseas enviar el mensaje de todos modos?
        </p>
      </div>
    </div>
  );
});

const ActiveChannelCard = memo(function ActiveChannelCard({
  activeChannel,
}: {
  activeChannel: Channel;
}) {
  return (
    <div className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-900 rounded-lg border">
      <span className="text-sm text-slate-500">Línea de envío</span>
      <div className="text-right">
        {activeChannel.displayName ? (
          <div>
            <span className="font-semibold text-sm text-slate-900 dark:text-white">
              {activeChannel.displayName}
            </span>
            <span className="text-xs text-slate-500 ml-1.5 font-mono">
              ({activeChannel.phoneNumber})
            </span>
          </div>
        ) : (
          <span className="font-semibold text-sm text-slate-900 dark:text-white font-mono">
            {activeChannel.phoneNumber}
          </span>
        )}
      </div>
    </div>
  );
});

const VariableMappingCard = memo(function VariableMappingCard({
  variableIndices,
  varCount,
  variableMap,
  onMappingChange,
}: {
  variableIndices: number[];
  varCount: number;
  variableMap: Record<number, "code" | "debt" | "name">;
  onMappingChange: (idx: number, val: "code" | "debt" | "name") => void;
}) {
  return (
    <div className="rounded-xl border border-slate-200/90 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/40 p-3 space-y-2.5">
      <div className="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
        <span>Mapeo de variables</span>
        <span className="text-[11px] font-normal text-muted-foreground">
          Asigna el campo de cliente a cada variable
        </span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {variableIndices.map((idx) => {
          const fallbackVal =
            idx === 1 && varCount === 1
              ? "debt"
              : idx === 2
                ? "debt"
                : idx === 3
                  ? "name"
                  : "code";

          return (
            <div
              key={idx}
              className="flex items-center gap-2 bg-white dark:bg-slate-900 p-2 rounded-lg border border-slate-200/80 dark:border-slate-800"
            >
              <span className="font-mono text-xs font-semibold px-2 py-1 rounded bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 shrink-0">
                {`{{${idx}}}`}
              </span>
              <Select
                value={variableMap[idx] || fallbackVal}
                onValueChange={(val: "code" | "debt" | "name") =>
                  onMappingChange(idx, val)
                }
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="code">Código / Apartamento</SelectItem>
                  <SelectItem value="debt">Saldo pendiente</SelectItem>
                  <SelectItem value="name">Nombre del cliente</SelectItem>
                </SelectContent>
              </Select>
            </div>
          );
        })}
      </div>
    </div>
  );
});
