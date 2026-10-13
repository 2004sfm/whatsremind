import { memo } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "./ui/dialog";
import { AlertCircle, Loader2 } from "lucide-react";
import { parseMetaError } from "../lib/utils";
import {
  useTemplateForm,
  limitsFor,
  TEMPLATE_LIMITS,
  sanitizeName,
  sanitizeHeader,
  isMetaBodyInvalid,
  isFormSubmittable,
  type TemplateFormValues,
} from "../hooks/useTemplateForm";

const VARIABLE_HINTS = [
  { variable: "{{1}}", title: "Saludo dinámico", hint: '(Ej: "¡Buenos días!", "¡Buenas tardes!")' },
  { variable: "{{2}}", title: "Nombre del Cliente", hint: '(Extraído del Excel, ej: "Juan Pérez")' },
  { variable: "{{3}}", title: "Código / Inmueble", hint: '(Extraído del Excel, ej: "4.PH.D")' },
  { variable: "{{4}}", title: "Saldo Pendiente", hint: '(Monto de la deuda, ej: "432.40")' },
];

interface CreateTemplateModalProps {
  isOpen: boolean;
  engine: string;
  /** When set, the modal clones a Meta template into a local one. */
  cloneMode: string | null;
  /** Pre-populates the form when cloning an existing template. */
  initialValues?: Partial<TemplateFormValues>;
  onClose: () => void;
  onCreated: () => void;
}

export function CreateTemplateModal({
  isOpen,
  engine,
  cloneMode,
  initialValues,
  onClose,
  onCreated,
}: CreateTemplateModalProps) {
  if (!isOpen) return null;

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <CreateTemplateContent
        key={cloneMode ? `clone-${initialValues?.name || "tpl"}` : "new"}
        engine={engine}
        cloneMode={cloneMode}
        initialValues={initialValues}
        onClose={onClose}
        onCreated={onCreated}
      />
    </Dialog>
  );
}

interface CreateTemplateContentProps {
  engine: string;
  cloneMode: string | null;
  initialValues?: Partial<TemplateFormValues>;
  onClose: () => void;
  onCreated: () => void;
}

function CreateTemplateContent({
  engine,
  cloneMode,
  initialValues,
  onClose,
  onCreated,
}: CreateTemplateContentProps) {
  const form = useTemplateForm(onCreated, initialValues);
  const effectiveEngine = cloneMode || engine;
  const isLocal = effectiveEngine === "unofficial";
  const limits = limitsFor(effectiveEngine);

  const handleClose = () => {
    form.reset();
    onClose();
  };

  return (
    <DialogContent
      className="sm:max-w-2xl max-h-[85vh] flex flex-col p-4 sm:p-6 overflow-hidden w-[95vw] sm:w-full"
      onInteractOutside={(e) => e.preventDefault()}
    >
      <DialogHeader className="shrink-0 text-left">
        <DialogTitle>
          {cloneMode === "unofficial" ? "Clonar plantilla a local" : "Crear plantilla"}
        </DialogTitle>
        <DialogDescription>
          {effectiveEngine === "meta"
            ? "Diseña una plantilla de texto básica."
            : "Plantillas locales sin restricciones."}
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-4 py-2 overflow-y-auto px-1 flex-1 min-h-0">
        <VariableHints />

        {form.error && (
          <div className="flex items-start gap-2 text-red-600 bg-red-50 dark:bg-red-500/10 dark:text-red-400 p-3 rounded-lg text-sm break-words overflow-hidden">
            <AlertCircle size={16} className="shrink-0 mt-0.5" />
            <p className="flex-1 whitespace-pre-wrap">{parseMetaError(form.error)}</p>
          </div>
        )}

        <TemplateField
          id="template_name"
          label="Nombre de la plantilla"
          hint={
            isLocal
              ? "Nombre descriptivo para identificarla en tu lista local."
              : "Solo letras minúsculas, números y guiones bajos (_)."
          }
          placeholder={isLocal ? "Ej. Recordatorio de Pago V2" : "ej. recordatorio_pago_v2"}
          max={TEMPLATE_LIMITS.name}
          value={form.values.name}
          onChange={(value) => form.setField("name", sanitizeName(effectiveEngine, value))}
        />

        <TemplateField
          id="template_header"
          label="Título en negrita (opcional)"
          hint="Se mostrará resaltado arriba. No usa asteriscos (*)."
          placeholder="Ej. Aviso de Cobranza"
          max={limits.header}
          value={form.values.header}
          onChange={(value) => form.setField("header", sanitizeHeader(value))}
        />

        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <Label htmlFor="template_body">Cuerpo del mensaje</Label>
            <CharCounter value={form.values.body} max={limits.body} />
          </div>
          <textarea
            id="template_body"
            placeholder="Hola, {{1}}. Te recordamos que tu saldo es de {{2}}..."
            className="flex min-h-[100px] w-full rounded-md border border-slate-200 bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-emerald-500 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-800 dark:placeholder:text-slate-400 dark:focus-visible:ring-emerald-500 resize-y"
            value={form.values.body}
            maxLength={limits.body}
            onChange={(e) => form.setField("body", e.target.value)}
          />
          <p
            className={`text-[11px] ${
              effectiveEngine === "meta" && isMetaBodyInvalid(form.values.body)
                ? "text-red-500 font-medium"
                : "text-slate-500"
            }`}
          >
            {isLocal
              ? "Usa {{1}}, {{2}}, etc. para insertar datos del Excel. Puedes usar {Hola|Buenos días} para rotar saludos aleatorios."
              : "Usa {{1}}, {{2}} para las variables dinámicas. Nota: Las variables no pueden ser la primera ni la última palabra del mensaje."}
          </p>
        </div>

        <TemplateField
          id="template_footer"
          label="Pie de página (opcional)"
          hint="Texto pequeño gris en la parte inferior de la burbuja."
          placeholder="Ej. Condominio Terrazas del Mar"
          max={limits.footer}
          value={form.values.footer}
          onChange={(value) => form.setField("footer", value)}
        />
      </div>

      <DialogFooter className="shrink-0 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
        <Button variant="outline" onClick={handleClose} disabled={form.isSaving} className="w-full sm:w-auto">
          Cancelar
        </Button>
        <Button
          className="bg-emerald-600 hover:bg-emerald-700 text-white w-full sm:w-auto"
          disabled={!isFormSubmittable(form.values, effectiveEngine, form.isSaving)}
          onClick={() => form.submit(effectiveEngine)}
        >
          {form.isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
          {form.isSaving
            ? "Guardando..."
            : isLocal
              ? "Guardar plantilla local"
              : "Solicitar aprobación"}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}

const VariableHints = memo(function VariableHints() {
  return (
    <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 text-left">
      <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 block">
        Variables disponibles
      </span>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 text-xs text-slate-600 dark:text-slate-300">
        {VARIABLE_HINTS.map((item) => (
          <div key={item.variable} className="flex gap-2 items-start">
            <code className="bg-slate-200/80 dark:bg-slate-800 px-1.5 py-0.5 rounded text-emerald-600 dark:text-emerald-400 font-bold shrink-0">
              {item.variable}
            </code>
            <span className="leading-tight">
              <strong>{item.title}</strong>
              <br />
              <span className="text-[10px] text-slate-500">{item.hint}</span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
});

const TemplateField = memo(function TemplateField({
  id,
  label,
  hint,
  placeholder,
  max,
  value,
  onChange,
}: {
  id: string;
  label: string;
  hint: string;
  placeholder: string;
  max: number;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <Label htmlFor={id}>{label}</Label>
        <CharCounter value={value} max={max} />
      </div>
      <Input
        id={id}
        placeholder={placeholder}
        value={value}
        maxLength={max}
        onChange={(e) => onChange(e.target.value)}
      />
      <p className="text-[11px] text-slate-500">{hint}</p>
    </div>
  );
});

const CharCounter = memo(function CharCounter({ value, max }: { value: string; max: number }) {
  return (
    <span className={`text-[10px] ${value.length > max ? "text-red-500 font-bold" : "text-slate-400"}`}>
      {value.length}/{max}
    </span>
  );
});
