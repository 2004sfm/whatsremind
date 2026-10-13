import { useState, useEffect, memo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "./ui/dialog";
import { Button } from "./ui/button";
import { Loader2, Download, Check, AlertCircle, FileText } from "lucide-react";
import { ipc } from "../lib/ipc";
import type { TemplateItem, Channel } from "../lib/types";
import { formatError } from "../lib/utils";
import { getComponentText } from "../lib/template-utils";

interface ImportTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportSuccess: () => void;
}

export function ImportTemplateModal({ isOpen, onClose, onImportSuccess }: ImportTemplateModalProps) {
  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <ImportTemplateContent onClose={onClose} onImportSuccess={onImportSuccess} />
    </Dialog>
  );
}

function ImportTemplateContent({
  onClose,
  onImportSuccess,
}: {
  onClose: () => void;
  onImportSuccess: () => void;
}) {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [selectedEngine, setSelectedEngine] = useState<"meta" | "ycloud">("ycloud");
  const [templates, setTemplates] = useState<TemplateItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [importingName, setImportingName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // 1. Detect available official channels
  useEffect(() => {
    let cancelled = false;

    ipc
      .getChannels()
      .then((allChannels) => {
        if (cancelled) return;
        const official = allChannels.filter(
          (c) => c.engine === "meta" || c.engine === "ycloud"
        );
        setChannels(official);

        const hasYCloud = official.some((c) => c.engine === "ycloud");
        const hasMeta = official.some((c) => c.engine === "meta");

        if (hasYCloud) {
          setSelectedEngine("ycloud");
        } else if (hasMeta) {
          setSelectedEngine("meta");
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(formatError(err));
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // 2. Load templates for selected engine
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    ipc
      .getTemplates(selectedEngine)
      .then((data) => {
        if (!cancelled) setTemplates(data);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(formatError(err));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [selectedEngine]);

  const handleImport = async (tpl: TemplateItem) => {
    setImportingName(tpl.name);
    try {
      await ipc.importTemplateToLocal(tpl);
      setTemplates((prev) =>
        prev.map((item) =>
          item.name === tpl.name ? { ...item, hasLocalCopy: true } : item
        )
      );
      onImportSuccess();
    } catch (err: unknown) {
      setError(formatError(err));
    } finally {
      setImportingName(null);
    }
  };

  const hasMeta = channels.some((c) => c.engine === "meta");
  const hasYCloud = channels.some((c) => c.engine === "ycloud");

  return (
    <DialogContent className="sm:max-w-xl w-[95vw] sm:w-full max-h-[85vh] flex flex-col p-4 sm:p-6 overflow-hidden" onInteractOutside={(e) => e.preventDefault()}>
      <DialogHeader className="shrink-0">
        <DialogTitle className="flex items-center gap-2">
          <Download className="w-5 h-5 text-emerald-600" />
          Importar plantilla a local
        </DialogTitle>
        <DialogDescription>
          Copia una plantilla oficial a tu base de datos local para usarla con WhatsApp no oficial.
        </DialogDescription>
      </DialogHeader>

      {/* Engine Switcher (if both are present) */}
      {hasMeta && hasYCloud && (
        <div className="shrink-0 flex gap-2 pt-1">
          <Button
            type="button"
            size="sm"
            variant={selectedEngine === "ycloud" ? "default" : "outline"}
            className={selectedEngine === "ycloud" ? "bg-emerald-600 text-white" : ""}
            onClick={() => setSelectedEngine("ycloud")}
          >
            YCloud
          </Button>
          <Button
            type="button"
            size="sm"
            variant={selectedEngine === "meta" ? "default" : "outline"}
            className={selectedEngine === "meta" ? "bg-emerald-600 text-white" : ""}
            onClick={() => setSelectedEngine("meta")}
          >
            Meta
          </Button>
        </div>
      )}

      {error && (
        <div className="shrink-0 flex items-start gap-2 text-red-600 bg-red-50 dark:bg-red-500/10 p-3 rounded-lg text-sm">
          <AlertCircle size={16} className="shrink-0 mt-0.5" />
          <p className="flex-1">{error}</p>
        </div>
      )}

      <div className="py-2 overflow-y-auto space-y-2 pr-1 flex-1 min-h-0">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-emerald-500" />
          </div>
        ) : templates.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center text-slate-500">
            <FileText className="w-8 h-8 text-slate-400 mb-2" />
            <p className="text-sm font-medium">No se encontraron plantillas en este proveedor</p>
          </div>
        ) : (
          templates.map((tpl) => (
            <ImportRow
              key={tpl.id || tpl.name}
              template={tpl}
              isImporting={importingName === tpl.name}
              onImport={() => handleImport(tpl)}
            />
          ))
        )}
      </div>

      <DialogFooter className="shrink-0 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
        <Button variant="outline" onClick={onClose} className="w-full sm:w-auto">
          Cerrar
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}

const ImportRow = memo(function ImportRow({
  template,
  isImporting,
  onImport,
}: {
  template: TemplateItem;
  isImporting: boolean;
  onImport: () => void;
}) {
  const bodyText = getComponentText(template, "BODY") || "Sin contenido de texto";

  return (
    <div className="flex items-center justify-between p-3 rounded-lg border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900 gap-3">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-semibold text-sm truncate text-slate-900 dark:text-white">
            {template.name}
          </span>
          <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
            {template.language}
          </span>
        </div>
        <p className="text-xs text-slate-500 line-clamp-1">{bodyText}</p>
      </div>

      <div className="shrink-0">
        {template.hasLocalCopy ? (
          <Button
            size="sm"
            variant="outline"
            disabled
            className="gap-1 text-xs border-emerald-200 text-emerald-700 bg-emerald-50/50 dark:bg-emerald-950/20 dark:text-emerald-400"
          >
            <Check className="w-3.5 h-3.5 text-emerald-600" />
            Importada
          </Button>
        ) : (
          <Button
            size="sm"
            disabled={isImporting}
            onClick={onImport}
            className="gap-1 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            {isImporting ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Download className="w-3.5 h-3.5" />
            )}
            Importar
          </Button>
        )}
      </div>
    </div>
  );
});
