import { useState, useRef } from 'react';
import { ipc } from '../lib/ipc';
import { ExcelPreview, ColumnMapping, UIColumnMapping, ImportStats } from '../lib/types';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from './ui/dialog';
import { Button } from './ui/button';
import { FileSpreadsheet, Loader2, AlertCircle } from 'lucide-react';
import { formatError } from '../lib/utils';
import { FileSelectionView } from './FileSelectionView';
import { ImportSummaryView, ImportSummaryTitle } from './ImportSummaryView';
import { autoMapHeaders, isValidMapping, buildBackendMapping } from '../lib/excel-mapping';

const translateBackendError = (errString: string): string => {
  const err = errString.toLowerCase();
  if (err.includes("invalid type")) return "Hubo un problema de comunicación interna (tipo de dato incorrecto).";
  if (err.includes("no sheets found")) return "El archivo Excel está vacío o no tiene hojas válidas.";
  if (err.includes("not found")) return "No se encontró el archivo especificado. Por favor, inténtalo de nuevo.";
  if (err.includes("missing")) return "Faltan datos obligatorios en algunas filas de tu tabla.";
  if (err.includes("invalid debt format")) return "Hay letras o símbolos en la columna de Deuda donde solo deberían haber números.";
  if (err.includes("io error")) return "El archivo está abierto por otro programa o no se puede leer.";
  return "Ocurrió un error inesperado. Por favor, revisa el archivo Excel y vuelve a intentarlo.";
};

interface ExcelImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function ExcelImportModal({ isOpen, onClose, onSuccess }: ExcelImportModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      {isOpen && (
        <ExcelImportContent onClose={onClose} onSuccess={onSuccess} />
      )}
    </Dialog>
  );
}

interface ExcelImportContentProps {
  onClose: () => void;
  onSuccess: () => void;
}

function ExcelImportContent({ onClose, onSuccess }: ExcelImportContentProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<ExcelPreview | null>(null);
  const [mapping, setMapping] = useState<Partial<UIColumnMapping>>({});
  const [importResult, setImportResult] = useState<ImportStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSelectFile = () => {
    fileInputRef.current?.click();
  };

  const loadPreview = async (file: File, sheet?: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await ipc.previewExcel(file, sheet);
      setPreview(data);
      setMapping(autoMapHeaders(data));
    } catch (err: unknown) {
      setError(translateBackendError(formatError(err)));
    } finally {
      setLoading(false);
    }
  };

  const onFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);
    await loadPreview(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSheetChange = async (sheet: string) => {
    if (!selectedFile) return;
    await loadPreview(selectedFile, sheet);
  };

  const persistImportMetadata = (file: File, rustMapping: ColumnMapping) => {
    localStorage.setItem('lastImportedFileName', file.name);
    localStorage.setItem('lastImportConfig', JSON.stringify({ filePath: file.name, mapping: rustMapping }));
    window.dispatchEvent(new CustomEvent('file-imported', { detail: file.name }));
  };

  const handleImport = async () => {
    if (!selectedFile || !isValidMapping(mapping) || !preview) return;

    setLoading(true);
    setError(null);
    try {
      const rustMapping = buildBackendMapping(mapping, preview.headers);
      const result = await ipc.importExcel(selectedFile, rustMapping, true, preview.current_sheet);
      setImportResult(result);
      persistImportMetadata(selectedFile, rustMapping);
      onSuccess();
    } catch (err: unknown) {
      setError(translateBackendError(formatError(err)));
    } finally {
      setLoading(false);
    }
  };

  const handleMappingChange = (field: keyof UIColumnMapping, value: string) => {
    setMapping((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <DialogContent className="max-w-4xl w-[95vw] sm:w-[90vw] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            {importResult ? (
              <ImportSummaryTitle result={importResult} />
            ) : (
              <>
                <FileSpreadsheet className="text-emerald-500" />
                Importar clientes
              </>
            )}
          </DialogTitle>
          <DialogDescription>
            {importResult ? "El proceso de sincronización con la base de datos ha finalizado." : "Sube un archivo Excel (.xlsx) y vincula las columnas."}
          </DialogDescription>
        </DialogHeader>

        {importResult ? (
          <ImportSummaryView result={importResult} />
        ) : !selectedFile ? (
          <div className="flex flex-col items-center justify-center py-12 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-900/50">
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx, .xls"
              className="hidden"
              onChange={onFileInputChange}
            />
            <Button
              onClick={handleSelectFile}
              disabled={loading}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileSpreadsheet className="mr-2 h-4 w-4" />}
              Seleccionar archivo
            </Button>
            <p className="text-sm text-slate-500 mt-4">Solo archivos .xlsx o .xls</p>
          </div>
        ) : (
          <FileSelectionView
            fileInputRef={fileInputRef}
            selectedFile={selectedFile}
            preview={preview}
            loading={loading}
            mapping={mapping}
            onSelectFile={handleSelectFile}
            onFileChange={onFileInputChange}
            onSheetChange={handleSheetChange}
            onMappingChange={handleMappingChange}
          />
        )}

        {error && (
          <div className="flex items-center gap-2 text-red-600 bg-red-50 dark:bg-red-500/10 p-3 rounded-lg text-sm mt-4">
            <AlertCircle size={16} />
            <p>{error}</p>
          </div>
        )}

        <DialogFooter>
          {importResult ? (
            <Button onClick={onClose} className="bg-emerald-600 hover:bg-emerald-700">Entendido</Button>
          ) : (
            <>
              <Button variant="ghost" onClick={onClose} disabled={loading}>Cancelar</Button>
              <Button
                onClick={handleImport}
                disabled={loading || !selectedFile || !isValidMapping(mapping)}
                className="bg-emerald-600 hover:bg-emerald-700 shadow-md shadow-emerald-500/20"
              >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Importar datos
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
  );
}
