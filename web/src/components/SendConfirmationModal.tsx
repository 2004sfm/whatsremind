import { useState, useEffect, useMemo, useCallback, useRef, memo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "./ui/dialog";
import { Button } from "./ui/button";
import { Send, AlertTriangle, Eye, X, ChevronLeft } from "lucide-react";
import { cn } from "../lib/utils";
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
import type { Channel, TemplateItem } from "../lib/types";

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

  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [variableMap, setVariableMap] = useState<Record<number, "code" | "debt" | "name">>({});
  const contentRef = useRef<HTMLDivElement>(null);

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

  const handleTogglePreview = useCallback(() => {
    setIsPreviewOpen((prev) => !prev);
  }, []);

  const handleClosePreview = useCallback(() => {
    setIsPreviewOpen(false);
  }, []);

  // When preview is closed, reset scroll position on mobile/tablet so the modal is cleanly centered in view
  useEffect(() => {
    if (!isPreviewOpen && contentRef.current) {
      contentRef.current.scrollTop = 0;
    }
  }, [isPreviewOpen]);

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
    <DialogContent
      ref={contentRef}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
      className={cn(
        "p-0 border-0 bg-transparent shadow-none max-w-none [&>button]:hidden",
        "fixed inset-0 left-0 top-0 translate-x-0 translate-y-0 w-full h-full overflow-y-auto overflow-x-hidden p-4 pt-[max(1.5rem,calc(50vh-270px))] pb-8 flex flex-col items-center gap-3",
        "lg:inset-auto lg:left-1/2 lg:top-1/2 lg:-translate-x-1/2 lg:-translate-y-1/2 lg:w-auto lg:h-auto lg:p-0 lg:flex-row lg:items-stretch lg:overflow-visible"
      )}
    >
      {/* 1. Modal original (Left Box) */}
      <div className="w-[95vw] sm:w-[460px] h-[540px] max-h-[85vh] shrink-0 flex flex-col p-4 sm:p-6 rounded-xl border bg-background text-foreground shadow-xl overflow-hidden relative">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 rounded-sm text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 p-1 cursor-pointer"
          aria-label="Cerrar modal"
        >
          <X className="h-4 w-4" />
        </button>

        <DialogHeader className="shrink-0 text-left pr-6">
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

          <TemplateSelectorRow
            templates={templates}
            selectedTemplate={selectedTemplate}
            onSelect={setSelectedTemplate}
            isLoading={isLoading}
            engine={engine}
            apiError={apiError}
            hasVariables={variableIndices.length > 0}
            hasBody={Boolean(bodyText)}
            isPreviewOpen={isPreviewOpen}
            onTogglePreview={handleTogglePreview}
          />

          {/* Seccion de mapeo de variables con boton de preview integrado */}
          {variableIndices.length > 0 && (
            <VariableMappingCard
              variableIndices={variableIndices}
              varCount={varCount}
              variableMap={variableMap}
              onMappingChange={handleMappingChange}
              isPreviewOpen={isPreviewOpen}
              onTogglePreview={handleTogglePreview}
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
      </div>

      {/* 2. Desplegable lateral derecho adosado (Right Box con <) */}
      {isPreviewOpen && (
        <CompanionPreviewDrawer
          onClose={handleClosePreview}
          headerText={headerText}
          bodyText={bodyText}
          footerText={footerText}
          variableMap={variableMap as Record<number, ClientVariableField>}
        />
      )}
    </DialogContent>
  );
}

const TemplateSelectorRow = memo(function TemplateSelectorRow({
  templates,
  selectedTemplate,
  onSelect,
  isLoading,
  engine,
  apiError,
  hasVariables,
  hasBody,
  isPreviewOpen,
  onTogglePreview,
}: {
  templates: TemplateItem[];
  selectedTemplate: string;
  onSelect: (val: string) => void;
  isLoading: boolean;
  engine: string;
  apiError: string | null;
  hasVariables: boolean;
  hasBody: boolean;
  isPreviewOpen: boolean;
  onTogglePreview: () => void;
}) {
  if (apiError) {
    return (
      <div className="flex items-start gap-3 p-4 bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400 rounded-lg border border-red-200 dark:border-red-900/50 mt-4">
        <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
        <div className="text-sm">
          <p className="font-semibold mb-1">Conexión interrumpida</p>
          <p>{describeTemplateError(engine, apiError)}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-900 rounded-lg border">
      <span className="text-sm text-slate-500">Plantilla</span>
      <div className="w-1/2 flex flex-col items-end gap-1.5">
        <TemplateSelector
          templates={templates}
          selectedTemplate={selectedTemplate}
          onSelect={onSelect}
          isLoading={isLoading}
          engine={engine}
        />
        {!hasVariables && hasBody && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onTogglePreview}
            className="h-6 px-1.5 text-xs text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 gap-1 font-medium"
          >
            <Eye className="w-3.5 h-3.5" />
            {isPreviewOpen ? "Ocultar preview" : "Ver preview"}
          </Button>
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
  isPreviewOpen,
  onTogglePreview,
}: {
  variableIndices: number[];
  varCount: number;
  variableMap: Record<number, "code" | "debt" | "name">;
  onMappingChange: (idx: number, val: "code" | "debt" | "name") => void;
  isPreviewOpen: boolean;
  onTogglePreview: () => void;
}) {
  return (
    <div className="rounded-xl border border-slate-200/90 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/40 p-3 space-y-2.5">
      <div className="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
        <span>Mapeo de variables</span>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onTogglePreview}
          className="h-6 px-2 text-xs text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/60 gap-1 font-medium"
        >
          <Eye className="w-3.5 h-3.5" />
          {isPreviewOpen ? "Ocultar preview" : "Ver preview"}
        </Button>
      </div>
      <div className="grid grid-cols-1 gap-2">
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

const CompanionPreviewDrawer = memo(function CompanionPreviewDrawer({
  onClose,
  headerText,
  bodyText,
  footerText,
  variableMap,
}: {
  onClose: () => void;
  headerText?: string;
  bodyText?: string;
  footerText?: string;
  variableMap: Record<number, ClientVariableField>;
}) {
  return (
    <div className="w-[95vw] sm:w-[460px] lg:w-[380px] h-[540px] max-h-[85vh] shrink-0 flex flex-col p-4 sm:p-5 rounded-xl border bg-background text-foreground shadow-xl overflow-hidden relative animate-in fade-in-50 slide-in-from-top-4 lg:slide-in-from-left-4 duration-200">
      <div className="flex items-center justify-between pb-3 mb-2 border-b border-slate-100 dark:border-slate-800 shrink-0">
        <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">
          Vista previa
        </span>
        <button
          type="button"
          onClick={onClose}
          className="rounded-md p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 cursor-pointer"
          title="Ocultar vista previa"
          aria-label="Ocultar vista previa"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto pr-1 min-h-0">
        {bodyText ? (
          <TemplatePreview
            header={headerText}
            body={bodyText}
            footer={footerText}
            variableMap={variableMap}
            defaultShowSample={true}
            className="border-0 bg-transparent p-0"
          />
        ) : (
          <div className="rounded-xl border border-dashed border-slate-300 dark:border-slate-800 p-8 text-center text-sm text-muted-foreground bg-slate-50/50 dark:bg-slate-950/20">
            Selecciona una plantilla para ver la vista previa.
          </div>
        )}
      </div>
    </div>
  );
});

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
