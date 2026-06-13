import { useEffect, useState } from 'react';
import { ipc } from '../lib/ipc';
import { Client, ClientFilter } from '../lib/types';
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
import { FileUp, Send, Search, Loader2, AlertCircle, FileSpreadsheet } from 'lucide-react';
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
  const [fileName, setFileName] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  // Modals state
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isProgressOpen, setIsProgressOpen] = useState(false);

  // App Config
  // const [templateName, setTemplateName] = useState<string>(''); // Needs to come from somewhere, maybe hardcoded for now or fetched via a new command if needed. But we don't have a command for it. Let's use a default string.
  
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
      
      if (sheets.length > 0 && !filter.sheet_name) {
        setFilter(prev => ({ ...prev, sheet_name: sheets[0] }));
      } else if (sheets.length === 0 && filter.sheet_name) {
        setFilter(prev => ({ ...prev, sheet_name: undefined }));
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
    setFileName(localStorage.getItem('lastImportedFileName'));
    const handleFile = (e: Event) => setFileName((e as CustomEvent).detail);
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
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-end gap-3 w-full">
          {availableSheets.length > 0 && (
            <div className="flex items-center justify-between md:justify-start gap-2 bg-slate-100 dark:bg-slate-900 px-3 py-2 md:py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 w-full md:w-auto">
              {fileName && (
                <div 
                  className="flex items-center gap-2 text-sm font-medium text-slate-500 max-w-[120px] md:max-w-[200px] cursor-default group relative pr-2 border-r border-slate-300 dark:border-slate-700"
                >
                  <FileSpreadsheet size={16} className="text-emerald-500 shrink-0 hidden sm:block" />
                  <span className="truncate" title={fileName}>{fileName}</span>
                </div>
              )}
              <span className="text-sm font-medium text-slate-500 whitespace-nowrap">Hoja:</span>
              <Select 
                value={filter.sheet_name || ''} 
                onValueChange={(val) => setFilter(prev => ({ ...prev, sheet_name: val, page: 1 }))}
              >
                <SelectTrigger className="w-[160px] h-8 bg-white dark:bg-slate-950 border-none shadow-sm text-sm font-semibold text-emerald-700 dark:text-emerald-400">
                  <SelectValue placeholder="Seleccionar hoja" />
                </SelectTrigger>
                <SelectContent>
                  {availableSheets.map(s => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="flex flex-col md:flex-row items-stretch md:items-center gap-2 w-full md:w-auto">
            <Button variant="outline" className="w-full md:w-auto bg-white dark:bg-slate-950" onClick={() => setIsImportOpen(true)}>
              <FileUp className="w-4 h-4 mr-2" />
              Importar Archivo
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="border-none shadow-sm bg-gradient-to-br from-emerald-500 to-teal-600 text-white">
          <CardContent className="p-5 flex flex-col justify-center">
            <p className="text-emerald-100 font-medium text-sm">Deuda Total (Página actual)</p>
            <p className="text-3xl font-bold mt-2 tracking-tight">${calculateTotalDebt().toFixed(2)}</p>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm bg-white dark:bg-slate-900">
          <CardContent className="p-5 flex flex-col justify-center">
             <p className="text-slate-500 dark:text-slate-400 font-medium text-sm">Tasa de Éxito</p>
             <p className="text-3xl font-bold mt-2 tracking-tight text-slate-900 dark:text-white">
               N/A <span className="text-sm font-normal text-slate-400 dark:text-slate-500">Sin historial</span>
             </p>
          </CardContent>
        </Card>
      </div>

      <div className="bg-white dark:bg-slate-900 border rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex flex-col md:flex-row justify-between gap-4">
          {/* Selector nativo para móviles y tablets (oculto en PC) */}
          <div className="block md:hidden w-full">
            <select
              className="w-full h-10 px-3 rounded-md border border-slate-200 bg-white dark:bg-slate-950 text-sm text-slate-700 dark:text-slate-300 dark:border-slate-800 outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
              value={filter.status || 'all'}
              onChange={(e) => {
                setSelectedIds(new Set());
                setFilter({ ...filter, status: e.target.value === 'all' ? undefined : e.target.value as any, page: 1 });
              }}
            >
              <option value="all">Todos</option>
              <option value="pending">Pendientes</option>
              <option value="paid">Pagados</option>
              <option value="invalid">Teléf. Inválidos</option>
              <option value="noname">Sin Nombre</option>
            </select>
          </div>

          {/* Botones de pestañas para PC (oculto en móviles/tablets) */}
          <div className="hidden md:block">
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
                <TabsTrigger value="invalid">Teléf. Inválidos</TabsTrigger>
                <TabsTrigger value="noname">Sin Nombre</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          <div className="flex w-full md:w-auto items-center gap-2">
            <div className="relative flex-1 md:w-64">
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
            <label className="flex items-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-900/50 px-3 h-10 rounded-md border border-slate-200 dark:border-slate-800 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0">
              <Checkbox 
                checked={filter.exclude_recent_24h || false}
                onCheckedChange={(c) => {
                  setSelectedIds(new Set());
                  setFilter({ ...filter, exclude_recent_24h: c as boolean, page: 1 });
                }}
              />
              <span className="hidden lg:inline">Ocultar recientes (24h)</span>
              <span className="inline lg:hidden" title="Ocultar envíos recientes (24h)">24h</span>
            </label>
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
                <th className="px-6 py-4 font-medium text-slate-500">Código</th>
                <th className="px-4 py-3">Cliente</th>
                <th className="px-6 py-4 font-medium text-slate-500">Deuda</th>
                <th className="px-4 py-3">Último Envío</th>
                <th className="px-4 py-3">Estado</th>
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
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-md text-sm font-medium bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                        {client.code}
                      </span>
                    </td>
                    <td className="px-4 py-3">
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
                    <td className="px-6 py-4">
                      <span className={`font-medium ${client.debt > 0 ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                        ${client.debt.toFixed(2)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-500">
                      {client.last_sent ? format(new Date(client.last_sent), 'dd/MM/yyyy HH:mm') : '-'}
                    </td>
                    <td className="px-4 py-3">
                      {client.debt === 0 ? (
                        <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-200 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20">Pagado</Badge>
                      ) : (
                        <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-200 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20">Pendiente</Badge>
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
                <Send className="mr-2 h-4 w-4" /> Iniciar Envío
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
          setIsImportOpen(false);
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
    </div>
  );
}
