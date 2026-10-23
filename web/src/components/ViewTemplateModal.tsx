import { useState, useCallback, memo } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { TemplatePreview } from "./TemplatePreview";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "./ui/dialog";
import {
  FileText,
  Languages,
  Tag,
  CheckCircle2,
  HardDrive,
  Download,
  Trash2,
  Loader2,
  Check,
} from "lucide-react";
import type { TemplateItem } from "../lib/types";
import {
  translateCategory,
  translateLanguage,
  translateStatus,
  getComponentText,
} from "../lib/template-utils";
import { cn } from "../lib/utils";

interface ViewTemplateModalProps {
  template: TemplateItem | null;
  onClose: () => void;
  onClone?: () => void;
  onImport?: (template: TemplateItem) => Promise<void> | void;
  onDelete?: (template: TemplateItem) => Promise<void> | void;
  onUpdate?: (
    template: TemplateItem,
    components: Array<{ type: string; text?: string; format?: string }>
  ) => Promise<void> | void;
}

export function ViewTemplateModal({
  template,
  onClose,
  onImport,
  onDelete,
  onUpdate,
}: ViewTemplateModalProps) {
  if (!template) return null;

  return (
    <Dialog open={template !== null} onOpenChange={(open) => !open && onClose()}>
      <ViewTemplateContent
        key={template.name}
        template={template}
        onClose={onClose}
        onImport={onImport}
        onDelete={onDelete}
        onUpdate={onUpdate}
      />
    </Dialog>
  );
}

interface ViewTemplateContentProps {
  template: TemplateItem;
  onClose: () => void;
  onImport?: (template: TemplateItem) => Promise<void> | void;
  onDelete?: (template: TemplateItem) => Promise<void> | void;
  onUpdate?: (
    template: TemplateItem,
    components: Array<{ type: string; text?: string; format?: string }>
  ) => Promise<void> | void;
}

function ViewTemplateContent({
  template,
  onImport,
  onDelete,
  onUpdate,
}: ViewTemplateContentProps) {
  const [header, setHeader] = useState(() => getComponentText(template, "HEADER") || "");
  const [body, setBody] = useState(() => getComponentText(template, "BODY") || "");
  const [footer, setFooter] = useState(() => getComponentText(template, "FOOTER") || "");
  const [loadingAction, setLoadingAction] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleImport = useCallback(async () => {
    if (!onImport) return;
    setLoadingAction(true);
    try {
      await onImport(template);
    } finally {
      setLoadingAction(false);
    }
  }, [onImport, template]);

  const handleDelete = useCallback(async () => {
    if (!onDelete) return;
    setLoadingAction(true);
    try {
      await onDelete(template);
    } finally {
      setLoadingAction(false);
    }
  }, [onDelete, template]);

  const handleSave = useCallback(async () => {
    if (!onUpdate || !body.trim()) return;
    setIsSaving(true);
    try {
      const components: Array<{ type: string; text?: string; format?: string }> = [
        header.trim() ? { type: "HEADER", text: header.trim() } : null,
        { type: "BODY", text: body.trim() },
        footer.trim() ? { type: "FOOTER", text: footer.trim() } : null,
      ].filter(Boolean) as Array<{ type: string; text?: string; format?: string }>;

      await onUpdate(template, components);
    } finally {
      setIsSaving(false);
    }
  }, [body, footer, header, onUpdate, template]);

  return (
    <DialogContent className="sm:max-w-lg w-[95vw] sm:w-full max-h-[85vh] flex flex-col p-4 sm:p-6 overflow-hidden">
      {template.isLocal && onDelete && (
        <button
          type="button"
          onClick={handleDelete}
          aria-label="Eliminar"
          className="absolute right-10 top-4 rounded-sm text-slate-400 hover:text-red-600 transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 p-0.5 cursor-pointer"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      )}

      <DialogHeader className="shrink-0">
        <DialogTitle className="flex items-center gap-2 pr-6 text-lg font-semibold">
          <FileText className="h-5 w-5 text-emerald-600 shrink-0" />
          <span className="truncate">{template.name}</span>
        </DialogTitle>
        <DialogDescription className="text-sm text-muted-foreground truncate whitespace-nowrap">
          {template.isLocal ? "Detalles y edición de plantilla local." : "Vista previa y detalles de la plantilla."}
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-4 py-2 overflow-y-auto pr-1 flex-1 min-h-0">
        <TemplateDetailCard template={template} />

        {template.isLocal ? (
          <>
            <LocalTemplateEditFields
              header={header}
              body={body}
              footer={footer}
              onChangeHeader={setHeader}
              onChangeBody={setBody}
              onChangeFooter={setFooter}
            />
            <div className="pt-2">
              <TemplatePreview header={header} body={body} footer={footer} />
            </div>
          </>
        ) : (
          <TemplatePreview header={header} body={body} footer={footer} />
        )}
      </div>

      <ViewTemplateFooter
        isLocal={template.isLocal}
        hasLocalCopy={template.hasLocalCopy}
        loadingAction={loadingAction}
        isSaving={isSaving}
        canSave={Boolean(body.trim())}
        hasDelete={Boolean(onDelete)}
        onImport={onImport ? handleImport : undefined}
        onDelete={onDelete ? handleDelete : undefined}
        onSave={onUpdate ? handleSave : undefined}
      />
    </DialogContent>
  );
}

const LocalTemplateFooter = memo(function LocalTemplateFooter({
  loadingAction,
  isSaving,
  canSave,
  hasDelete,
  onDelete,
  onSave,
}: {
  loadingAction: boolean;
  isSaving: boolean;
  canSave: boolean;
  hasDelete: boolean;
  onDelete?: () => void;
  onSave?: () => void;
}) {
  return (
    <DialogFooter className="shrink-0 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
      {hasDelete ? (
        <Button
          type="button"
          variant="outline"
          disabled={loadingAction || isSaving}
          onClick={onDelete}
          className="h-9 px-3 w-full sm:w-auto text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200 dark:border-red-900/40 dark:hover:bg-red-950/30 font-medium"
        >
          {loadingAction ? (
            <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
          ) : (
            <Trash2 className="mr-1.5 h-4 w-4" />
          )}
          Eliminar
        </Button>
      ) : (
        <div />
      )}
      {onSave && (
        <Button
          type="button"
          disabled={isSaving || !canSave}
          onClick={onSave}
          className="h-9 px-4 w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white font-medium shadow-xs"
        >
          {isSaving ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Check className="mr-2 h-4 w-4" />
          )}
          {isSaving ? "Guardando..." : "Guardar"}
        </Button>
      )}
    </DialogFooter>
  );
});

const OfficialTemplateFooter = memo(function OfficialTemplateFooter({
  hasLocalCopy,
  loadingAction,
  onImport,
}: {
  hasLocalCopy?: boolean;
  loadingAction: boolean;
  onImport?: () => void;
}) {
  return (
    <DialogFooter className="shrink-0 flex flex-row items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
      <div className="flex items-center justify-end w-full gap-2">
        {hasLocalCopy ? (
          <Button
            variant="outline"
            disabled
            className="w-full sm:w-auto gap-1.5 border-emerald-200 text-emerald-700 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/20"
          >
            <Check className="w-4 h-4 text-emerald-600" />
            Importada en local
          </Button>
        ) : onImport ? (
          <Button
            variant="default"
            disabled={loadingAction}
            onClick={onImport}
            className="w-full sm:w-auto bg-emerald-600 text-white hover:bg-emerald-700 gap-1.5"
          >
            {loadingAction ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            Importar a local
          </Button>
        ) : null}
      </div>
    </DialogFooter>
  );
});

const ViewTemplateFooter = memo(function ViewTemplateFooter({
  isLocal,
  hasLocalCopy,
  loadingAction,
  isSaving,
  canSave,
  hasDelete,
  onImport,
  onDelete,
  onSave,
}: {
  isLocal?: boolean;
  hasLocalCopy?: boolean;
  loadingAction: boolean;
  isSaving: boolean;
  canSave: boolean;
  hasDelete: boolean;
  onImport?: () => void;
  onDelete?: () => void;
  onSave?: () => void;
}) {
  if (isLocal) {
    return (
      <LocalTemplateFooter
        loadingAction={loadingAction}
        isSaving={isSaving}
        canSave={canSave}
        hasDelete={hasDelete}
        onDelete={onDelete}
        onSave={onSave}
      />
    );
  }

  return (
    <OfficialTemplateFooter
      hasLocalCopy={hasLocalCopy}
      loadingAction={loadingAction}
      onImport={onImport}
    />
  );
});

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

const LocalTemplateEditFields = memo(function LocalTemplateEditFields({
  header,
  body,
  footer,
  onChangeHeader,
  onChangeBody,
  onChangeFooter,
}: {
  header: string;
  body: string;
  footer: string;
  onChangeHeader: (val: string) => void;
  onChangeBody: (val: string) => void;
  onChangeFooter: (val: string) => void;
}) {
  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Label htmlFor="local_tpl_header">
          Título en negrita (opcional)
        </Label>
        <Input
          id="local_tpl_header"
          placeholder="Ej. Aviso de Cobranza"
          value={header}
          onChange={(e) => onChangeHeader(e.target.value)}
        />
      </div>

      <div className="space-y-1.5">
        <div className="flex justify-between items-center">
          <Label htmlFor="local_tpl_body">
            Cuerpo del mensaje
          </Label>
        </div>
        <textarea
          id="local_tpl_body"
          rows={6}
          placeholder="{{0}} {{3}}, le recordamos que su apartamento {{1}} presenta un saldo pendiente de {{2}}..."
          value={body}
          onChange={(e) => onChangeBody(e.target.value)}
          className="flex min-h-[150px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-base md:text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-emerald-500 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-800 dark:focus-visible:ring-emerald-500 resize-y"
        />
        <p className="text-[11px] text-slate-500">
          Variables: <strong>{"{{0}}"}</strong> saludo, <strong>{"{{1}}"}</strong> código/apto, <strong>{"{{2}}"}</strong> saldo, <strong>{"{{3}}"}</strong> nombre.
        </p>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="local_tpl_footer">
          Pie de página (opcional)
        </Label>
        <Input
          id="local_tpl_footer"
          placeholder="Ej. Condominio Terrazas del Mar"
          value={footer}
          onChange={(e) => onChangeFooter(e.target.value)}
        />
      </div>
    </div>
  );
});
