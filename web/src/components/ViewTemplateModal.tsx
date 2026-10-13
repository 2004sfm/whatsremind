import { useState, memo } from "react";
import { Button } from "./ui/button";
import { Label } from "./ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "./ui/dialog";
import { FileText, Languages, Tag, CheckCircle2, HardDrive, Download, Trash2, Loader2, Check } from "lucide-react";
import type { TemplateItem } from "../lib/types";
import { translateCategory, translateLanguage, translateStatus, getComponentText } from "../lib/template-utils";
import { cn } from "../lib/utils";

interface ViewTemplateModalProps {
  template: TemplateItem | null;
  onClose: () => void;
  onClone?: () => void;
  onImport?: (template: TemplateItem) => Promise<void> | void;
  onDelete?: (template: TemplateItem) => Promise<void> | void;
}

export function ViewTemplateModal({
  template,
  onClose,
  onImport,
  onDelete,
}: ViewTemplateModalProps) {
  const [loadingAction, setLoadingAction] = useState(false);

  if (!template) return null;

  const handleImport = async () => {
    if (!onImport) return;
    setLoadingAction(true);
    try {
      await onImport(template);
    } finally {
      setLoadingAction(false);
    }
  };

  const handleDelete = async () => {
    if (!onDelete) return;
    setLoadingAction(true);
    try {
      await onDelete(template);
    } finally {
      setLoadingAction(false);
    }
  };

  return (
    <Dialog open={template !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 pr-6 text-lg font-semibold">
            <FileText className="h-5 w-5 text-emerald-600 shrink-0" />
            <span className="truncate">{template.name}</span>
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground truncate whitespace-nowrap">
            Vista previa y detalles de la plantilla.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <TemplateDetailCard template={template} />
          <TemplateMessageBody template={template} />
        </div>

        <DialogFooter className="flex flex-row items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
          <TemplateFooterAction
            template={template}
            loadingAction={loadingAction}
            onImport={onImport ? handleImport : undefined}
            onDelete={onDelete ? handleDelete : undefined}
          />
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function getStatusTextColor(status: string, isLocal?: boolean): string {
  if (isLocal) return "text-blue-600 dark:text-blue-400";
  if (status === "APPROVED") return "text-emerald-600 dark:text-emerald-400";
  if (status === "REJECTED") return "text-red-600 dark:text-red-400";
  return "text-amber-600 dark:text-amber-400";
}

function getStatusDotColor(status: string, isLocal?: boolean): string {
  if (isLocal) return "bg-blue-500";
  if (status === "APPROVED") return "bg-emerald-500";
  if (status === "REJECTED") return "bg-red-500";
  return "bg-amber-500";
}

const TemplateDetailCard = memo(function TemplateDetailCard({
  template,
}: {
  template: TemplateItem;
}) {
  const textColor = getStatusTextColor(template.status, template.isLocal);
  const dotColor = getStatusDotColor(template.status, template.isLocal);

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800/80 bg-slate-50/50 dark:bg-slate-900/40">
      <div className="flex items-center justify-between p-3.5 gap-3">
        <span className="text-sm text-muted-foreground flex items-center gap-2 shrink-0">
          <Languages className="h-4 w-4 text-slate-400" />
          Idioma
        </span>
        <span className="text-sm font-medium text-slate-900 dark:text-slate-100 text-right">
          {translateLanguage(template.language || "es")}
        </span>
      </div>

      <div className="flex items-center justify-between p-3.5 gap-3">
        <span className="text-sm text-muted-foreground flex items-center gap-2 shrink-0">
          <Tag className="h-4 w-4 text-slate-400" />
          Categoría
        </span>
        <span className="text-sm font-medium text-slate-900 dark:text-slate-100 text-right">
          {template.isLocal ? "Personalizada" : translateCategory(template.category)}
        </span>
      </div>

      <div className="flex items-center justify-between p-3.5 gap-3">
        <span className="text-sm text-muted-foreground flex items-center gap-2 shrink-0">
          <CheckCircle2 className="h-4 w-4 text-slate-400" />
          Estado
        </span>
        <span className={cn("text-sm font-semibold flex items-center gap-1.5 text-right", textColor)}>
          <span className={cn("h-2 w-2 rounded-full", dotColor)} />
          {template.isLocal ? "Local" : translateStatus(template.status)}
        </span>
      </div>

      {!template.isLocal && (
        <div className="flex items-center justify-between p-3.5 gap-3">
          <span className="text-sm text-muted-foreground flex items-center gap-2 shrink-0">
            <HardDrive className="h-4 w-4 text-slate-400" />
            Copia en local
          </span>
          {template.hasLocalCopy ? (
            <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 text-right">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              Importada
            </span>
          ) : (
            <span className="text-sm text-slate-500 dark:text-slate-400 text-right">
              No importada
            </span>
          )}
        </div>
      )}
    </div>
  );
});

const TemplateMessageBody = memo(function TemplateMessageBody({
  template,
}: {
  template: TemplateItem;
}) {
  const header = getComponentText(template, "HEADER");
  const body = getComponentText(template, "BODY");
  const footer = getComponentText(template, "FOOTER");

  return (
    <div className="space-y-1.5">
      <Label className="text-slate-500 text-xs font-medium">Cuerpo del mensaje</Label>
      <div className="bg-emerald-50/50 dark:bg-emerald-950/20 p-4 rounded-xl text-sm text-slate-700 dark:text-slate-200 min-h-[90px] border border-emerald-100 dark:border-emerald-900/30 whitespace-pre-wrap leading-relaxed">
        {header && (
          <div className="font-bold mb-3 pb-3 border-b border-emerald-900/10 dark:border-emerald-100/10">
            {header}
          </div>
        )}
        {body ? body : <span className="italic text-slate-400">Sin cuerpo de texto</span>}
        {footer && (
          <div className="text-xs text-slate-500 mt-3 pt-3 border-t border-emerald-900/10 dark:border-emerald-100/10">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
});

function TemplateFooterAction({
  template,
  loadingAction,
  onImport,
  onDelete,
}: {
  template: TemplateItem;
  loadingAction: boolean;
  onImport?: () => void;
  onDelete?: () => void;
}) {
  if (template.isLocal) {
    if (!onDelete) return null;
    return (
      <Button
        variant="outline"
        disabled={loadingAction}
        onClick={onDelete}
        className="w-full sm:w-auto text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/40 border-red-200 dark:border-red-900/50 gap-1.5"
      >
        {loadingAction ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
        Eliminar plantilla
      </Button>
    );
  }

  if (template.hasLocalCopy) {
    return (
      <Button
        variant="outline"
        disabled
        className="w-full sm:w-auto gap-1.5 border-emerald-200 text-emerald-700 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/20"
      >
        <Check className="w-4 h-4 text-emerald-600" />
        Importada en local
      </Button>
    );
  }

  if (onImport) {
    return (
      <Button
        variant="default"
        disabled={loadingAction}
        onClick={onImport}
        className="w-full sm:w-auto bg-emerald-600 text-white hover:bg-emerald-700 gap-1.5"
      >
        {loadingAction ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
        Importar a local
      </Button>
    );
  }

  return null;
}
