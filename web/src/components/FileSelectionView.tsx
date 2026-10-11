import { Button } from "./ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { FileSpreadsheet, Loader2, AlertCircle } from "lucide-react";
import type { ExcelPreview, UIColumnMapping } from "../lib/types";
import { ColumnMapper } from "./ColumnMapper";
import { FilePreviewTable } from "./FilePreviewTable";

interface FileSelectionViewProps {
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  selectedFile: File;
  preview: ExcelPreview | null;
  loading: boolean;
  mapping: Partial<UIColumnMapping>;
  onSelectFile: () => void;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSheetChange: (sheet: string) => void;
  onMappingChange: (field: keyof UIColumnMapping, value: string) => void;
}

export function FileSelectionView({
  fileInputRef,
  selectedFile,
  preview,
  loading,
  mapping,
  onSelectFile,
  onFileChange,
  onSheetChange,
  onMappingChange,
}: FileSelectionViewProps) {
  return (
    <div className="space-y-6 min-w-0">
      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx, .xls"
        className="hidden"
        onChange={onFileChange}
      />

      <div className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between bg-slate-50 dark:bg-slate-900 p-3 rounded-lg border border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2 overflow-hidden flex-1">
          <FileSpreadsheet className="text-slate-400 shrink-0" size={18} />
          <span className="text-sm font-medium truncate" title={selectedFile.name}>
            {selectedFile.name}
          </span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {preview?.sheets && preview.sheets.length > 1 && (
            <Select value={preview.current_sheet} onValueChange={onSheetChange}>
              <SelectTrigger className="w-[180px] h-9 bg-white dark:bg-slate-950">
                <SelectValue placeholder="Hoja..." />
              </SelectTrigger>
              <SelectContent>
                {preview.sheets.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Button variant="outline" size="sm" onClick={onSelectFile} disabled={loading}>
            Cambiar
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="animate-spin text-emerald-600" />
        </div>
      ) : (
        preview && (
          <div className="space-y-4">
            <div className="bg-amber-50 dark:bg-amber-500/10 text-amber-800 dark:text-amber-400 p-3 rounded-md text-sm border border-amber-200 dark:border-amber-500/20 flex gap-2 items-start shadow-sm">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <p>
                <strong>Sincronización automática:</strong> El sistema leerá este Excel y
                desactivará automáticamente a los clientes y hojas antiguas que ya no estén aquí,
                manteniendo tu base de datos exactamente igual a tu Excel.
              </p>
            </div>

            <ColumnMapper headers={preview.headers} mapping={mapping} onChange={onMappingChange} />

            <FilePreviewTable preview={preview} />
          </div>
        )
      )}
    </div>
  );
}
