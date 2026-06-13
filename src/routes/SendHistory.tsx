import { useEffect, useState } from 'react';
import { ipc } from '../lib/ipc';
import { HistoryFilter, MessageLog } from '../lib/types';
import { Input } from '../components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Pagination } from '../components/Pagination';
import { Search, Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { format } from 'date-fns';
import { parsePhoneNumberFromString } from 'libphonenumber-js';


export function SendHistory() {
  const [filter, setFilter] = useState<HistoryFilter>({ page: 1, page_size: 50 });
  const [logs, setLogs] = useState<MessageLog[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadHistory = async () => {
      setLoading(true);
      try {
        const res = await ipc.getSendHistory(filter);
        setLogs(res.data);
        setTotal(res.total);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    loadHistory();
  }, [filter]);

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-slate-900 border rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex flex-col md:flex-row justify-between gap-4">
          {/* Selector nativo para móviles y tablets */}
          <div className="block md:hidden w-full">
            <select
              className="w-full h-10 px-3 rounded-md border border-slate-200 bg-white dark:bg-slate-950 text-sm text-slate-700 dark:text-slate-300 dark:border-slate-800 outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
              value={filter.status || 'all'}
              onChange={(e) => setFilter({ ...filter, status: e.target.value === 'all' ? undefined : e.target.value as 'sent' | 'failed', page: 1 })}
            >
              <option value="all">Todos</option>
              <option value="sent">Enviados</option>
              <option value="failed">Fallidos</option>
            </select>
          </div>

          {/* Botones de pestañas para PC */}
          <div className="hidden md:block">
            <Tabs 
              value={filter.status || 'all'} 
              onValueChange={(val) => setFilter({ ...filter, status: val === 'all' ? undefined : val as 'sent' | 'failed', page: 1 })}
            >
              <TabsList>
                <TabsTrigger value="all">Todos</TabsTrigger>
                <TabsTrigger value="sent">Enviados</TabsTrigger>
                <TabsTrigger value="failed">Fallidos</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          <div className="relative w-full md:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input 
              placeholder="Buscar por cliente o teléfono..." 
              className="pl-9 h-10 bg-slate-50 dark:bg-slate-800 border-transparent focus:bg-white focus:border-emerald-500"
              value={filter.search || ''}
              onChange={(e) => setFilter({ ...filter, search: e.target.value, page: 1 })}
            />
          </div>
        </div>

        <div className="overflow-x-auto min-h-[400px]">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50/50 dark:bg-slate-800/50 text-slate-500 font-medium border-b">
              <tr>
                <th className="px-4 py-3">Fecha y Hora</th>
                <th className="px-4 py-3">Cliente</th>
                <th className="px-4 py-3">Apto</th>
                <th className="px-4 py-3">Teléfono</th>
                <th className="px-4 py-3">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? (
                <tr><td colSpan={7} className="h-32 text-center"><Loader2 className="animate-spin mx-auto text-emerald-500" /></td></tr>
              ) : logs.length === 0 ? (
                <tr><td colSpan={7} className="h-32 text-center text-slate-500">No hay registros para mostrar.</td></tr>
              ) : (
                logs.map(log => (
                  <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/20 transition-colors">
                    <td className="px-4 py-3 font-medium text-slate-700 dark:text-slate-300">
                      {format(new Date(log.sent_at), 'dd/MM/yyyy HH:mm:ss')}
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-900 dark:text-slate-100 whitespace-nowrap">
                      {log.client_name || '-'}
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                      {log.client_code || '-'}
                    </td>
                    <td className="px-4 py-3 font-mono text-slate-600 dark:text-slate-400">
                      {log.client_phone ? (
                        parsePhoneNumberFromString(
                          log.client_phone.startsWith('+') ? log.client_phone : `+${log.client_phone}`
                        )?.formatInternational() || log.client_phone
                      ) : '-'}
                    </td>
                    <td className="px-4 py-3">
                      {log.status === 'sent' ? (
                        <div className="flex items-center text-emerald-600 dark:text-emerald-400 gap-1 font-medium" title="Mensaje entregado a Meta">
                          <CheckCircle2 size={16} /> Enviado
                        </div>
                      ) : (
                        <div 
                          className="flex items-center text-red-600 dark:text-red-400 gap-1 font-medium cursor-help" 
                          title={log.error_detail || `Error HTTP ${log.http_status}`}
                        >
                          <XCircle size={16} /> Fallido
                        </div>
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
    </div>
  );
}
