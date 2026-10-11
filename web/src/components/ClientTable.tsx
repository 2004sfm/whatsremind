import { Badge } from "./ui/badge";
import { Checkbox } from "./ui/checkbox";
import { AlertCircle, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { parsePhoneNumberFromString } from "libphonenumber-js";
import type { Client } from "../lib/types";
import { isClientSelectable } from "../hooks/useClientSelection";

const formatPhone = (phone: string) => {
  const pn = parsePhoneNumberFromString(phone);
  return pn ? pn.formatInternational() : phone;
};

interface ClientTableProps {
  clients: Client[];
  loading: boolean;
  selectedIds: Set<number>;
  allPageSendableSelected: boolean;
  onSelectAll: (checked: boolean) => void;
  onSelectOne: (id: number, checked: boolean) => void;
}

export function ClientTable({
  clients,
  loading,
  selectedIds,
  allPageSendableSelected,
  onSelectAll,
  onSelectOne,
}: ClientTableProps) {
  return (
    <div className="overflow-x-auto min-h-[400px]">
      <table className="w-full text-sm text-left">
        <thead className="bg-slate-50/50 dark:bg-slate-800/50 text-slate-500 font-medium border-b">
          <tr>
            <th className="px-4 py-3 w-10">
              <Checkbox checked={allPageSendableSelected} onCheckedChange={(c) => onSelectAll(c as boolean)} />
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
            <tr>
              <td colSpan={7} className="h-32 text-center">
                <Loader2 className="animate-spin mx-auto text-emerald-500" />
              </td>
            </tr>
          ) : clients.length === 0 ? (
            <tr>
              <td colSpan={7} className="h-32 text-center text-slate-500">
                No hay clientes para mostrar. Importa un archivo Excel.
              </td>
            </tr>
          ) : (
            clients.map((client) => (
              <ClientRow
                key={client.id}
                client={client}
                checked={selectedIds.has(client.id)}
                onSelect={onSelectOne}
              />
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

function ClientRow({
  client,
  checked,
  onSelect,
}: {
  client: Client;
  checked: boolean;
  onSelect: (id: number, checked: boolean) => void;
}) {
  return (
    <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/20 transition-colors">
      <td className="px-4 py-3">
        <Checkbox
          checked={checked}
          disabled={!isClientSelectable(client)}
          onCheckedChange={(c) => onSelect(client.id, c as boolean)}
        />
      </td>
      <td className="px-3 py-3 text-center text-xs font-semibold text-slate-400 dark:text-slate-500">
        {client.excel_row || "-"}
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
              <span title="Número inválido">
                <AlertCircle className="w-3 h-3 text-red-500" />
              </span>
            )}
          </div>
          {client.phone_number_2 && (
            <div className="text-slate-500 dark:text-slate-500 text-xs">
              {formatPhone(client.phone_number_2)}
            </div>
          )}
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <span
          className={`font-medium ${
            client.debt > 0 ? "text-red-600 dark:text-red-400" : "text-emerald-600 dark:text-emerald-400"
          }`}
        >
          ${client.debt.toFixed(2)}
        </span>
      </td>
      <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
        {client.last_sent ? format(new Date(client.last_sent), "dd/MM/yyyy HH:mm") : "-"}
      </td>
      <td className="px-4 py-3 whitespace-nowrap">
        {client.debt === 0 ? (
          <Badge className="w-24 justify-center bg-emerald-100 text-emerald-700 hover:bg-emerald-200 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20">
            Pagado
          </Badge>
        ) : (
          <Badge className="w-24 justify-center bg-amber-100 text-amber-700 hover:bg-amber-200 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20">
            Pendiente
          </Badge>
        )}
      </td>
    </tr>
  );
}
