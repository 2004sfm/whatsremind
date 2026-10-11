import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import type { UIColumnMapping } from "../lib/types";
import { NONE_VALUE, REQUIRED_FIELDS } from "../lib/excel-mapping";

interface ColumnMapperProps {
  headers: string[];
  mapping: Partial<UIColumnMapping>;
  onChange: (field: keyof UIColumnMapping, value: string) => void;
}

export function ColumnMapper({ headers, mapping, onChange }: ColumnMapperProps) {
  return (
    <div className="grid grid-cols-2 gap-4">
      {REQUIRED_FIELDS.map((field) => (
        <div key={field.key} className="space-y-1">
          <Label>
            {field.label}
            {field.required ? (
              <span className="text-red-500"> *</span>
            ) : (
              <span className="text-slate-400 text-xs ml-1">(opcional)</span>
            )}
          </Label>
          <Select
            value={mapping[field.key] || ""}
            onValueChange={(val) => onChange(field.key, val)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Seleccionar columna..." />
            </SelectTrigger>
            <SelectContent>
              {!field.required && <SelectItem value={NONE_VALUE}>— Ninguna —</SelectItem>}
              {headers.map((h) => (
                <SelectItem key={h} value={h}>
                  {h}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ))}
    </div>
  );
}
