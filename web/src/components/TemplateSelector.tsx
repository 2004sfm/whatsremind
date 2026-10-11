import { Loader2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import type { TemplateItem } from "../lib/types";

interface TemplateSelectorProps {
  templates: TemplateItem[];
  selectedTemplate: string;
  onSelect: (name: string) => void;
  isLoading: boolean;
  engine: string;
}

export function TemplateSelector({
  templates,
  selectedTemplate,
  onSelect,
  isLoading,
  engine,
}: TemplateSelectorProps) {
  if (isLoading) {
    return (
      <div className="flex items-center text-xs text-slate-400">
        <Loader2 className="w-3 h-3 mr-2 animate-spin" /> Cargando...
      </div>
    );
  }

  return (
    <Select value={selectedTemplate} onValueChange={onSelect}>
      <SelectTrigger className="h-8 text-xs font-mono bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
        <SelectValue placeholder="Seleccionar" />
      </SelectTrigger>
      <SelectContent>
        {templates.length === 0 ? (
          <SelectItem value="none" disabled>
            {engine === "unofficial" ? "No hay plantillas locales" : "No hay plantillas aprobadas"}
          </SelectItem>
        ) : (
          templates.map((tpl) => (
            <SelectItem key={tpl.id} value={tpl.name} className="font-mono text-xs">
              {tpl.name}
            </SelectItem>
          ))
        )}
      </SelectContent>
    </Select>
  );
}
