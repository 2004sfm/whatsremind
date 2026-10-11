import { Button } from "./ui/button";
import { Label } from "./ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "./ui/dialog";
import type { TemplateItem } from "../lib/types";
import { translateCategory, translateLanguage, translateStatus, hasComponent, getComponentText } from "../lib/template-utils";

interface ViewTemplateModalProps {
  template: TemplateItem | null;
  onClose: () => void;
  onClone: () => void;
}

export function ViewTemplateModal({ template, onClose, onClone }: ViewTemplateModalProps) {
  return (
    <Dialog open={template !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-2xl">
        {template && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center justify-between pr-6 text-xl">
                <span className="truncate pr-4">{template.name}</span>
              </DialogTitle>
              <DialogDescription>
                Vista previa del contenido de la plantilla sincronizada con Meta.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-5 py-3">
              <TemplateBadges template={template} />

              <div className="space-y-1.5">
                <Label className="text-slate-500 text-xs">Cuerpo del Mensaje</Label>
                <div className="bg-emerald-50/50 dark:bg-emerald-950/20 p-4 rounded-xl text-sm text-slate-700 dark:text-slate-200 min-h-[100px] border border-emerald-100 dark:border-emerald-900/30 whitespace-pre-wrap leading-relaxed">
                  {hasComponent(template, "HEADER") && (
                    <div className="font-bold mb-3 pb-3 border-b border-emerald-900/10 dark:border-emerald-100/10">
                      {getComponentText(template, "HEADER")}
                    </div>
                  )}
                  {getComponentText(template, "BODY") || (
                    <span className="italic text-slate-400">Sin cuerpo de texto</span>
                  )}
                  {hasComponent(template, "FOOTER") && (
                    <div className="text-xs text-slate-500 mt-3 pt-3 border-t border-emerald-900/10 dark:border-emerald-100/10">
                      {getComponentText(template, "FOOTER")}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <DialogFooter>
              {!template.isLocal && (
                <Button
                  variant="secondary"
                  onClick={onClone}
                  className="w-full sm:w-auto bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-900/20 dark:text-blue-400 dark:hover:bg-blue-900/40 border-none"
                >
                  Clonar para Dispositivo Vinculado
                </Button>
              )}
              <Button variant="outline" onClick={onClose} className="w-full sm:w-auto">
                Cerrar
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function TemplateBadges({ template }: { template: TemplateItem }) {
  if (template.isLocal) {
    return (
      <div className="flex flex-wrap gap-3 text-sm">
        <div className="flex items-center gap-1.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 px-3 py-1.5 rounded-lg font-bold text-xs uppercase tracking-wide">
          Plantilla local
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-3 text-sm">
      <MetaBadge label="Idioma:" value={translateLanguage(template.language)} />
      <MetaBadge label="Categoría:" value={translateCategory(template.category)} />
      <MetaBadge label="Estado:" value={translateStatus(template.status)} tone={statusTone(template.status)} />
    </div>
  );
}

function MetaBadge({ label, value, tone = "slate" }: { label: string; value: string; tone?: string }) {
  const toneClass =
    tone === "emerald"
      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
      : tone === "red"
        ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
        : tone === "amber"
          ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
          : "bg-slate-100 dark:bg-slate-800";

  return (
    <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium text-slate-700 dark:text-slate-200 ${toneClass}`}>
      <span className="text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wide">{label}</span>
      {value}
    </div>
  );
}

function statusTone(status: string): string {
  if (status === "APPROVED") return "emerald";
  if (status === "REJECTED") return "red";
  return "amber";
}
