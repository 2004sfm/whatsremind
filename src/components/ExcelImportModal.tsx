import { useState, useEffect } from 'react';
import { open } from '@tauri-apps/plugin-dialog';
import { ipc } from '../lib/ipc';
import { ExcelPreview, ColumnMapping, UIColumnMapping, ImportStats } from '../lib/types';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from './ui/dialog';
import { Button } from './ui/button';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { FileSpreadsheet, Loader2, CheckCircle2, AlertCircle, AlertTriangle } from 'lucide-react';
import { formatError } from '../lib/utils';


interface ExcelImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

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

export function ExcelImportModal({ isOpen, onClose, onSuccess }: ExcelImportModalProps) {
  const [filePath, setFilePath] = useState<string | null>(null);
  const [preview, setPreview] = useState<ExcelPreview | null>(null);
  const [mapping, setMapping] = useState<Partial<UIColumnMapping>>({});
  const [importResult, setImportResult] = useState<ImportStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [isSelectingFile, setIsSelectingFile] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setFilePath(null);
      setPreview(null);
      setMapping({});
      setImportResult(null);
      setError(null);
      setLoading(false);
      setIsSelectingFile(false);
    }
  }, [isOpen]);

  const handleSelectFile = async () => {
    if (isSelectingFile) return;
    setIsSelectingFile(true);
    try {
      const selected = await open({
        multiple: false,
        filters: [{ name: 'Excel', extensions: ['xlsx', 'xls'] }]
      });
      
      if (selected && typeof selected === 'string') {
        setFilePath(selected);
        setLoading(true);
        setError(null);
        
        const data = await ipc.previewExcel(selected);
        setPreview(data);
        autoMapHeaders(data);
        setLoading(false);
      }
    } catch (err: unknown) {
      setError(translateBackendError(formatError(err)));
      setLoading(false);
    } finally {
      setIsSelectingFile(false);
    }
  };

  const handleSheetChange = async (sheet: string) => {
    if (!filePath) return;
    setLoading(true);
    setError(null);
    try {
      const data = await ipc.previewExcel(filePath, sheet);
      setPreview(data);
      autoMapHeaders(data);
    } catch (err: unknown) {
      setError(translateBackendError(formatError(err)));
    } finally {
      setLoading(false);
    }
  };

  const autoMapHeaders = (data: ExcelPreview) => {
    const newMap: Partial<UIColumnMapping> = {};
    const headersLower = data.headers.map(h => h.toLowerCase().trim());
    
    const tryMap = (field: keyof UIColumnMapping, keywords: string[]) => {
      const idx = headersLower.findIndex(h => keywords.some(k => h.includes(k)));
      if (idx !== -1) newMap[field] = data.headers[idx];
    };
    
    tryMap('phone_number', ['telefono', 'teléfono', 'celular', 'phone']);
    tryMap('name', ['nombre', 'name', 'grupo familiar']);
    tryMap('code', ['apartamento', 'apto', 'apt', 'unidad', 'codigo', 'código']);
    tryMap('debt', ['saldo', 'deuda', 'balance', 'monto']);
    
    setMapping(newMap);
  };

  const handleImport = async () => {
    if (!filePath || !isValidMapping(mapping) || !preview) return;
    
    setLoading(true);
    setError(null);
    try {
      const getIndex = (val?: string) => preview.headers.findIndex(h => h === val);
      
      const rustMapping: ColumnMapping = {
        phone: getIndex(mapping.phone_number),
        name: getIndex(mapping.name),
        code: getIndex(mapping.code),
        debt: getIndex(mapping.debt),
      };

      const result = await ipc.importExcel(filePath, rustMapping, true, preview.current_sheet);
      setImportResult(result);
      
      const fileName = filePath.split(/[/\\]/).pop() || '';
      localStorage.setItem('lastImportedFileName', fileName);
      localStorage.setItem('lastImportConfig', JSON.stringify({
        filePath,
        mapping: rustMapping
      }));
      window.dispatchEvent(new CustomEvent('file-imported', { detail: fileName }));

      onSuccess();
    } catch (err: unknown) {
      setError(translateBackendError(formatError(err)));
    } finally {
      setLoading(false);
    }
  };

  const isValidMapping = (map: Partial<UIColumnMapping>) => {
    return !!(map.phone_number && map.name && map.code && map.debt);
  };

  const requiredFields: { key: keyof UIColumnMapping, label: string }[] = [
    { key: 'phone_number', label: 'Teléfono' },
    { key: 'name', label: 'Nombre' },
    { key: 'code', label: 'Código' },
    { key: 'debt', label: 'Deuda' },
  ];

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl w-[95vw] sm:w-[90vw] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            {importResult ? (
              importResult.errors.length > 0 ? <AlertTriangle className="text-amber-500" /> : <CheckCircle2 className="text-emerald-500" />
            ) : <FileSpreadsheet className="text-emerald-500" />}
            {importResult 
              ? (importResult.errors.length > 0 ? "Sincronización completada con avisos" : "Sincronización exitosa") 
              : "Importar clientes"}
          </DialogTitle>
          <DialogDescription>
            {importResult ? "El proceso de sincronización con la base de datos ha finalizado." : "Sube un archivo Excel (.xlsx) y vincula las columnas."}
          </DialogDescription>
        </DialogHeader>

        {importResult ? (
          <div className="py-4 space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-slate-50 dark:bg-slate-800/50 border rounded-lg p-4 text-center">
                <p className="text-sm font-medium text-slate-500 mb-1">Nuevos</p>
                <p className="text-3xl font-bold text-emerald-600">{importResult.created}</p>
              </div>
              <div className="bg-slate-50 dark:bg-slate-800/50 border rounded-lg p-4 text-center">
                <p className="text-sm font-medium text-slate-500 mb-1">Actualizados</p>
                <p className="text-3xl font-bold text-blue-600">{importResult.updated}</p>
              </div>
              <div className="bg-slate-50 dark:bg-slate-800/50 border rounded-lg p-4 text-center">
                <p className="text-sm font-medium text-slate-500 mb-1">Desactivados</p>
                <p className="text-3xl font-bold text-amber-600">{importResult.deactivated}</p>
              </div>
              <div className="bg-slate-50 dark:bg-slate-800/50 border rounded-lg p-4 text-center">
                <p className="text-sm font-medium text-slate-500 mb-1">Avisos</p>
                <p className="text-3xl font-bold text-amber-500">{importResult.errors.length}</p>
              </div>
            </div>
            
            {importResult.errors.length > 0 && (
              <div className="mt-4 border border-amber-200 bg-amber-50 dark:bg-amber-900/10 dark:border-amber-500/20 rounded-md p-4 max-h-48 overflow-y-auto text-sm">
                <div className="flex items-center gap-2 mb-3">
                  <FileSpreadsheet className="text-amber-600 dark:text-amber-400" size={16} />
                  <p className="font-semibold text-amber-700 dark:text-amber-400">Detalle de avisos:</p>
                </div>
                <div className="space-y-3 text-amber-800 dark:text-amber-300">
                  {Object.entries(
                    importResult.errors.reduce((acc, e) => {
                      const reason = e.reason.replace(/^Aviso:\s*/i, '');
                      acc[reason] = acc[reason] || [];
                      acc[reason].push(e.row);
                      return acc;
                    }, {} as Record<string, number[]>)
                  ).map(([reason, rows], idx) => (
                    <div key={idx} className="bg-amber-100/50 dark:bg-amber-900/20 p-3 rounded-md">
                      <p className="font-medium text-amber-900 dark:text-amber-200">{reason}</p>
                      <p className="text-xs mt-1.5 text-amber-700 dark:text-amber-400/80">
                        <span className="font-semibold">Filas:</span> {rows.join(', ')}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : !filePath ? (
          <div className="flex flex-col items-center justify-center py-12 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-900/50">
            <Button 
              onClick={handleSelectFile} 
              disabled={isSelectingFile}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {isSelectingFile ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileSpreadsheet className="mr-2 h-4 w-4" />}
              Seleccionar archivo
            </Button>
            <p className="text-sm text-slate-500 mt-4">Solo archivos .xlsx o .xls</p>
          </div>
        ) : (
          <div className="space-y-6 min-w-0">
            <div className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between bg-slate-50 dark:bg-slate-900 p-3 rounded-lg border border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2 overflow-hidden flex-1">
                <FileSpreadsheet className="text-slate-400 shrink-0" size={18} />
                <span className="text-sm font-medium truncate" title={filePath}>{filePath}</span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {preview?.sheets && preview.sheets.length > 1 && (
                  <Select value={preview.current_sheet} onValueChange={handleSheetChange}>
                    <SelectTrigger className="w-[180px] h-9 bg-white dark:bg-slate-950">
                      <SelectValue placeholder="Hoja..." />
                    </SelectTrigger>
                    <SelectContent>
                      {preview.sheets.map(s => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                <Button variant="outline" size="sm" onClick={handleSelectFile} disabled={isSelectingFile || loading}>
                  Cambiar
                </Button>
              </div>
            </div>

            {loading ? (
              <div className="flex justify-center py-8"><Loader2 className="animate-spin text-emerald-600" /></div>
            ) : preview && (
              <div className="space-y-4">
                <div className="bg-amber-50 dark:bg-amber-500/10 text-amber-800 dark:text-amber-400 p-3 rounded-md text-sm border border-amber-200 dark:border-amber-500/20 flex gap-2 items-start shadow-sm">
                  <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  <p>
                    <strong>Sincronización automática:</strong> El sistema leerá este Excel y desactivará automáticamente a los clientes y hojas antiguas que ya no estén aquí, manteniendo tu base de datos exactamente igual a tu Excel.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {requiredFields.map(field => (
                    <div key={field.key} className="space-y-1">
                      <Label>{field.label} <span className="text-red-500">*</span></Label>
                      <Select 
                        value={mapping[field.key] || ''} 
                        onValueChange={(val) => setMapping(prev => ({ ...prev, [field.key]: val }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar columna..." />
                        </SelectTrigger>
                        <SelectContent>
                          {preview.headers.map(h => (
                            <SelectItem key={h} value={h}>{h}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ))}
                </div>

                <div className="border rounded-md overflow-hidden">
                  <div className="bg-slate-100 dark:bg-slate-800 px-3 py-2 text-sm font-medium border-b">
                    Vista previa (Primeras {Math.min(preview.rows.length, 3)} filas)
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                      <thead className="bg-slate-50 dark:bg-slate-900/50 border-b">
                        <tr>
                          {preview.headers.map(h => (
                            <th key={h} className="px-4 py-2 font-medium text-slate-500 whitespace-nowrap">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {preview.rows.slice(0, 3).map((row, i) => (
                          <tr key={i} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20">
                            {row.map((cell, j) => (
                              <td key={j} className="px-4 py-2 whitespace-nowrap">{cell}</td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
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
                disabled={loading || !filePath || !isValidMapping(mapping)}
                className="bg-emerald-600 hover:bg-emerald-700 shadow-md shadow-emerald-500/20"
              >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Importar datos
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
