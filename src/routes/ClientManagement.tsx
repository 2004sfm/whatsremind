import { useEffect, useState } from 'react';
import { ipc } from '../lib/ipc';
import { Client, ClientFilter, ImportStats } from '../lib/types';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Checkbox } from '../components/ui/checkbox';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Pagination } from '../components/Pagination';
import { ExcelImportModal } from '../components/ExcelImportModal';
import { SendConfirmationModal } from '../components/SendConfirmationModal';
import { SendProgressPanel } from '../components/SendProgressPanel';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../components/ui/dialog';
import { RefreshCw, Search, Send, CheckCircle2, FileSpreadsheet, AlertCircle, AlertTriangle, FileUp, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { parsePhoneNumberFromString } from 'libphonenumber-js';

const formatPhone = (phone: string) => {
  const pn = parsePhoneNumberFromString(phone);
  return pn ? pn.formatInternational() : phone;
};


export function ClientManagement() {
  const [filter, setFilter] = useState<ClientFilter>({ page: 1, page_size: 50, status: 'all' });
  const [clients, setClients] = useState<Client[]>([]);
  const [total, setTotal] = useState(0);
  const [availableSheets, setAvailableSheets] = useState<string[]>([]);
  const [fileName, setFileName] = useState<string | null>(() => typeof window !== 'undefined' ? localStorage.getItem('lastImportedFileName') : null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  // Modals state
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isProgressOpen, setIsProgressOpen] = useState(false);

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [hasConfig, setHasConfig] = useState(!!localStorage.getItem('lastImportConfig'));
  const [refreshResult, setRefreshResult] = useState<ImportStats | null>(null);

  // App Config
  // const [templateName, setTemplateName] = useState<string>(''); // Needs to come from somewhere, maybe hardcoded for now or fetched via a new command if needed. But we don't have a command for it. Let's use a default string.
  
  const handleRefresh = async () => {
    if (!filter.sheet_name) return;
    const configStr = localStorage.getItem('lastImportConfig');
    if (!configStr) return;
    
    try {
      setIsRefreshing(true);
      const config = JSON.parse(configStr);
      const result = await ipc.importExcel(config.filePath, config.mapping, true, filter.sheet_name);
      
      await loadSheets();
      await loadClients();
      
      setRefreshResult(result);
    } catch (err: any) {
      console.error(err);
      alert(`Error al refrescar: ${err.message || err}`);
    } finally {
      setIsRefreshing(false);
    }
  };

  const loadClients = async () => {
    if (!isInitialized) return;
    if (availableSheets.length > 0 && !filter.sheet_name) return;
    
    setLoading(true);
    try {
      const res = await ipc.getClients(filter);
      setClients(res.data);
      setTotal(res.total);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadSheets = async () => {
    try {
      const sheets = await ipc.getAvailableSheets();
      setAvailableSheets(sheets);
      
      if (sheets.length > 0) {
        setFilter(prev => {
          if (!prev.sheet_name || !sheets.includes(prev.sheet_name)) {
            const savedSheet = localStorage.getItem('lastSelectedSheet');
            if (savedSheet && sheets.includes(savedSheet)) {
              return { ...prev, sheet_name: savedSheet, page: 1 };
            }
            return { ...prev, sheet_name: sheets[0], page: 1 };
          }
          return prev;
        });
      } else {
        setFilter(prev => prev.sheet_name ? { ...prev, sheet_name: undefined, page: 1 } : prev);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsInitialized(true);
    }
  };

  useEffect(() => {
    loadSheets();
  }, []);

  useEffect(() => {
    loadClients();
  }, [filter, isInitialized]);

  useEffect(() => {
    // Escuchar el evento cuando se importa un archivo nuevo
    const handleFile = (e: Event) => {
      setFileName((e as CustomEvent).detail);
      setHasConfig(true);
    };
    window.addEventListener('file-imported', handleFile);
    return () => window.removeEventListener('file-imported', handleFile);
  }, []);

  const isClientSelectable = (c: Client) => c.is_sendable && c.debt > 0;

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const sendableIds = clients.filter(isClientSelectable).map(c => c.id);
      setSelectedIds(new Set([...selectedIds, ...sendableIds]));
    } else {
      const pageIds = clients.map(c => c.id);
      const newSet = new Set(selectedIds);
      pageIds.forEach(id => newSet.delete(id));
      setSelectedIds(newSet);
    }
  };

  const handleSelectOne = (id: number, checked: boolean) => {
    const newSet = new Set(selectedIds);
    if (checked) newSet.add(id);
    else newSet.delete(id);
    setSelectedIds(newSet);
  };

  const calculateTotalDebt = () => {
    // This is approximate as it only calculates for loaded clients if we don't have a backend endpoint.
    // Assuming backend returns total balance in a separate endpoint? The design says "Stats cards (Total Debt)".
    // We only have `getClients`. Let's just sum the current page or what we have. 
    // Ideally we need an endpoint, but we'll approximate with the client list we have.
    return clients.reduce((acc, c) => acc + c.debt, 0);
  };

  const allPageSendableSelected = clients.length > 0 && clients.filter(isClientSelectable).every(c => selectedIds.has(c.id));

  // 24h warning check
  const warningsCount = clients.filter(c => 
    selectedIds.has(c.id) && 
    c.last_sent && 
    (new Date().getTime() - new Date(c.last_sent).getTime()) < 24 * 60 * 60 * 1000
  ).length;

  const handleStartSend = async (selectedTemplateName: string, selectedLanguage: string) => {
    setIsConfirmOpen(false);
    setIsProgressOpen(true);
    
    try {
      await ipc.startBulkSend(Array.from(selectedIds), selectedTemplateName, selectedLanguage);
    } catch (error) {
      console.error("Error starting bulk send", error);
      setIsProgressOpen(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Bar with actions */}
      <div className="flex flex-col gap-4 w-full">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 w-full min-h-[44px]">
          <div className={`flex items-center justify-between sm:justify-start gap-2 bg-slate-100 dark:bg-slate-900 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 w-full lg:w-auto transition-opacity ${availableSheets.length === 0 ? 'opacity-50 pointer-events-none' : ''}`}>
            {fileName && (
              <div 
                className="flex items-center gap-2 text-sm font-medium text-slate-500 max-w-[120px] md:max-w-[200px] cursor-default group relative pr-2 border-r border-slate-300 dark:border-slate-700"
              >
                <FileSpreadsheet size={16} className="text-emerald-500 shrink-0 hidden sm:block" />
                <span className="truncate" title={fileName}>{fileName}</span>
              </div>
            )}
            <span className="text-sm font-medium text-slate-500 whitespace-nowrap ml-1 sm:ml-0">Hoja:</span>
            <Select 
              value={filter.sheet_name || ''} 
              onValueChange={(val) => {
                localStorage.setItem('lastSelectedSheet', val);
                setFilter(prev => ({ ...prev, sheet_name: val, page: 1 }));
              }}
              disabled={availableSheets.length === 0}
            >
              <SelectTrigger className="w-full sm:w-[180px] h-8 bg-white dark:bg-slate-950 border-none shadow-sm text-sm font-semibold text-emerald-700 dark:text-emerald-400 disabled:opacity-50">
                <SelectValue placeholder={availableSheets.length === 0 ? "Sin datos" : "Seleccionar hoja"} />
              </SelectTrigger>
              <SelectContent>
                {availableSheets.map(s => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-row items-center gap-2 w-full lg:w-auto overflow-hidden">
            {hasConfig && filter.sheet_name && (
              <Button 
                variant="outline" 
                className="flex-1 lg:flex-none bg-white dark:bg-slate-950 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 px-3" 
                onClick={handleRefresh}
                disabled={isRefreshing}
                title="Sincronizar cambios"
              >
                <RefreshCw className={`w-4 h-4 mr-0 sm:mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">Refrescar</span>
              </Button>
            )}
            <Button variant="outline" className="flex-1 lg:flex-none bg-white dark:bg-slate-950 px-3" onClick={() => setIsImportOpen(true)}>
              <FileUp className="w-4 h-4 mr-0 sm:mr-2" />
              <span className="hidden sm:inline">Importar archivo</span>
              <span className="sm:hidden">Importar</span>
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="border-none shadow-sm bg-gradient-to-br from-emerald-500 to-teal-600 text-white">
          <CardContent className="p-5 flex flex-col justify-center">
            <p className="text-emerald-100 font-medium text-sm">Deuda total (Página actual)</p>
            <p className="text-3xl font-bold mt-2 tracking-tight">${calculateTotalDebt().toFixed(2)}</p>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm bg-white dark:bg-slate-900">
          <CardContent className="p-5 flex flex-col justify-center">
             <p className="text-slate-500 dark:text-slate-400 font-medium text-sm">Tasa de éxito</p>
             <p className="text-3xl font-bold mt-2 tracking-tight text-slate-900 dark:text-white">
               N/A <span className="text-sm font-normal text-slate-400 dark:text-slate-500">Sin historial</span>
             </p>
          </CardContent>
        </Card>
      </div>

      <div className="bg-white dark:bg-slate-900 border rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex flex-col xl:flex-row xl:items-center justify-between gap-4">
          {/* Selector Shadcn para móviles y tablets (oculto en pantallas muy grandes) */}
          <div className="block xl:hidden w-full">
            <Select 
              value={filter.status || 'all'}
              onValueChange={(val) => {
                setSelectedIds(new Set());
                setFilter({ ...filter, status: val === 'all' ? undefined : val as any, page: 1 });
              }}
            >
              <SelectTrigger className="w-full h-10 bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300">
                <SelectValue placeholder="Filtrar por estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="pending">Pendientes</SelectItem>
                <SelectItem value="paid">Pagados</SelectItem>
                <SelectItem value="invalid">Teléf. inválidos</SelectItem>
                <SelectItem value="noname">Sin nombre</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Botones de pestañas para PC (oculto en móviles/tablets) */}
          <div className="hidden xl:block">
            <Tabs 
              value={filter.status || 'all'} 
              onValueChange={(val) => {
                setSelectedIds(new Set());
                setFilter({ ...filter, status: val === 'all' ? undefined : val as any, page: 1 });
              }}
            >
              <TabsList>
                <TabsTrigger value="all">Todos</TabsTrigger>
                <TabsTrigger value="pending">Pendientes</TabsTrigger>
                <TabsTrigger value="paid">Pagados</TabsTrigger>
                <TabsTrigger value="invalid">Teléf. inválidos</TabsTrigger>
                <TabsTrigger value="noname">Sin nombre</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          <div className="flex w-full xl:w-auto items-center gap-2">
            <label className="flex items-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-900/50 px-3 h-10 rounded-md border border-slate-200 dark:border-slate-800 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0">
              <Checkbox 
                checked={filter.exclude_recent_24h || false}
                onCheckedChange={(c) => {
                  setSelectedIds(new Set());
                  setFilter({ ...filter, exclude_recent_24h: c as boolean, page: 1 });
                }}
              />
              <span className="hidden sm:inline">Ocultar recientes (24h)</span>
              <span className="inline sm:hidden" title="Ocultar envíos recientes (24h)">24h</span>
            </label>
            <div className="relative flex-1 xl:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input 
                  placeholder="Buscar cliente..." 
                  className="pl-9 bg-slate-50 dark:bg-slate-900/50" 
                  value={filter.search || ''}
                  onChange={(e) => {
                    setSelectedIds(new Set()); // Limpiar selección por seguridad
                    setFilter({ ...filter, search: e.target.value, page: 1 });
                  }}
                />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto min-h-[400px]">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50/50 dark:bg-slate-800/50 text-slate-500 font-medium border-b">
              <tr>
                <th className="px-4 py-3 w-10">
                  <Checkbox 
                    checked={allPageSendableSelected}
                    onCheckedChange={(c) => handleSelectAll(c as boolean)}
                  />
                </th>
                <th className="px-3 py-3 w-10 font-medium text-slate-500 text-center">#</th>
                <th className="px-6 py-4 font-medium text-slate-500 whitespace-nowrap">Código</th>
                <th className="px-4 py-3 whitespace-nowrap">Cliente</th>
                <th className="px-6 py-4 font-medium text-slate-500 whitespace-nowrap">Deuda</th>
                <th className="px-4 py-3 whitespace-nowrap">Último envío</th>
                <th className="px-4 py-3 whitespace-nowrap">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? (
                <tr><td colSpan={7} className="h-32 text-center"><Loader2 className="animate-spin mx-auto text-emerald-500" /></td></tr>
              ) : clients.length === 0 ? (
                <tr><td colSpan={7} className="h-32 text-center text-slate-500">No hay clientes para mostrar. Importa un archivo Excel.</td></tr>
              ) : (
                clients.map(client => (
                  <tr key={client.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/20 transition-colors">
                    <td className="px-4 py-3">
                      <Checkbox 
                        checked={selectedIds.has(client.id)}
                        disabled={!isClientSelectable(client)}
                        onCheckedChange={(c) => handleSelectOne(client.id, c as boolean)}
                      />
                    </td>
                    <td className="px-3 py-3 text-center text-xs font-semibold text-slate-400 dark:text-slate-500">
                      {client.excel_row || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-md text-sm font-medium bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                        {client.code}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex flex-col">
                        <div className="font-medium text-slate-900 dark:text-white">{client.name}</div>
                        <div className="text-slate-600 dark:text-slate-400 text-xs flex items-center gap-1">
                          {formatPhone(client.phone_number)}
                          {!client.is_sendable && (
                            <span title="Número inválido"><AlertCircle className="w-3 h-3 text-red-500" /></span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`font-medium ${client.debt > 0 ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                        ${client.debt.toFixed(2)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                      {client.last_sent ? format(new Date(client.last_sent), 'dd/MM/yyyy HH:mm') : '-'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {client.debt === 0 ? (
                        <Badge className="w-24 justify-center bg-emerald-100 text-emerald-700 hover:bg-emerald-200 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20">Pagado</Badge>
                      ) : (
                        <Badge className="w-24 justify-center bg-amber-100 text-amber-700 hover:bg-amber-200 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20">Pendiente</Badge>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          <Pagination 
            page={filter.page} 
            pageSize={filter.page_size} 
            total={total} 
            onPageChange={(p) => setFilter({ ...filter, page: p })} 
          />
        </div>
      </div>

      {/* Floating Action Bar */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-8 fade-in duration-300">
          <div className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-6 border border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <div className="bg-emerald-500 text-white w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold shadow-inner">
                {selectedIds.size}
              </div>
              <span className="font-medium text-slate-600 dark:text-slate-300">seleccionados</span>
            </div>
            
            <div className="h-5 w-px bg-slate-200 dark:bg-slate-700"></div>

            <div className="flex items-center gap-2">
              <Button 
                variant="ghost"
                onClick={() => setSelectedIds(new Set())}
                className="text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
              >
                Cancelar
              </Button>
              <Button 
                onClick={() => setIsConfirmOpen(true)} 
                className="bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl shadow-lg shadow-emerald-900/20 px-6"
              >
                <Send className="mr-2 h-4 w-4" /> Iniciar envío
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      <ExcelImportModal 
        isOpen={isImportOpen} 
        onClose={() => setIsImportOpen(false)}
        onSuccess={() => {
          loadSheets(); // Reload sheets in case a new file was imported
          loadClients();
        }} 
      />
      
      <SendConfirmationModal 
        isOpen={isConfirmOpen} 
        onClose={() => setIsConfirmOpen(false)} 
        onConfirm={handleStartSend} 
        recipientCount={selectedIds.size} 
        warningsCount={warningsCount}
      />

      <SendProgressPanel 
        isOpen={isProgressOpen} 
        onClose={() => {
          setIsProgressOpen(false);
          setSelectedIds(new Set()); // Auto-limpiar selección al terminar
          loadClients(); // Recargar estados (pagados/pendientes)
        }} 
        totalRecipients={selectedIds.size}
      />

      <Dialog open={!!refreshResult} onOpenChange={(open) => !open && setRefreshResult(null)}>
        <DialogContent className="max-w-4xl w-[95vw] sm:w-[90vw] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              {refreshResult ? (
                refreshResult.errors.length > 0 ? <AlertTriangle className="text-amber-500" /> : <CheckCircle2 className="text-emerald-500" />
              ) : <CheckCircle2 className="text-emerald-500" />}
              {refreshResult 
                ? (refreshResult.errors.length > 0 ? "Sincronización completada con avisos" : "Sincronización exitosa") 
                : "Sincronización exitosa"}
            </DialogTitle>
            <DialogDescription>
              {refreshResult ? `La hoja "${filter.sheet_name}" se ha refrescado correctamente.` : `La hoja "${filter.sheet_name}" se ha refrescado correctamente usando los últimos cambios del Excel.`}
            </DialogDescription>
          </DialogHeader>

          {refreshResult && (
            <div className="py-4 space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-slate-50 dark:bg-slate-800/50 border rounded-lg p-4 text-center">
                  <p className="text-sm font-medium text-slate-500 mb-1">Nuevos</p>
                  <p className="text-3xl font-bold text-emerald-600">{refreshResult.created}</p>
                </div>
                <div className="bg-slate-50 dark:bg-slate-800/50 border rounded-lg p-4 text-center">
                  <p className="text-sm font-medium text-slate-500 mb-1">Actualizados</p>
                  <p className="text-3xl font-bold text-blue-600">{refreshResult.updated}</p>
                </div>
                <div className="bg-slate-50 dark:bg-slate-800/50 border rounded-lg p-4 text-center">
                  <p className="text-sm font-medium text-slate-500 mb-1">Desactivados</p>
                  <p className="text-3xl font-bold text-amber-600">{refreshResult.deactivated}</p>
                </div>
                <div className="bg-slate-50 dark:bg-slate-800/50 border rounded-lg p-4 text-center">
                  <p className="text-sm font-medium text-slate-500 mb-1">Avisos</p>
                  <p className="text-3xl font-bold text-amber-500">{refreshResult.errors.length}</p>
                </div>
              </div>
              
              {refreshResult.errors.length > 0 && (
                <div className="mt-4 border border-amber-200 bg-amber-50 dark:bg-amber-900/10 dark:border-amber-500/20 rounded-md p-4 max-h-48 overflow-y-auto text-sm">
                  <div className="flex items-center gap-2 mb-3">
                    <FileSpreadsheet className="text-amber-600 dark:text-amber-400" size={16} />
                    <p className="font-semibold text-amber-700 dark:text-amber-400">Detalle de avisos:</p>
                  </div>
                  <div className="space-y-3 text-amber-800 dark:text-amber-300">
                    {Object.entries(
                      refreshResult.errors.reduce((acc, e) => {
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
          )}
          <DialogFooter>
            <Button onClick={() => setRefreshResult(null)} className="bg-emerald-600 hover:bg-emerald-700">
              Entendido
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
