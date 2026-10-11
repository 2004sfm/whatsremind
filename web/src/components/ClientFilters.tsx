import { Input } from "./ui/input";
import { Checkbox } from "./ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Tabs, TabsList, TabsTrigger } from "./ui/tabs";
import { Search } from "lucide-react";
import type { ClientFilter } from "../lib/types";

const STATUS_OPTIONS = [
  { value: "all", label: "Todos" },
  { value: "pending", label: "Pendientes" },
  { value: "paid", label: "Pagados" },
  { value: "invalid", label: "Teléf. inválidos" },
  { value: "noname", label: "Sin nombre" },
];

const toStatus = (value: string) => (value === "all" ? undefined : (value as ClientFilter["status"]));

interface ClientFiltersProps {
  filter: ClientFilter;
  onChange: (patch: Partial<ClientFilter>) => void;
}

export function ClientFilters({ filter, onChange }: ClientFiltersProps) {
  const status = filter.status || "all";

  return (
    <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex flex-col xl:flex-row xl:items-center justify-between gap-4">
      {/* Selector for mobile and tablets (hidden on very large screens) */}
      <div className="block xl:hidden w-full">
        <Select
          value={status}
          onValueChange={(val) => onChange({ status: toStatus(val), page: 1 })}
        >
          <SelectTrigger className="w-full h-10 bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300">
            <SelectValue placeholder="Filtrar por estado" />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Tabs for desktop (hidden on mobile/tablets) */}
      <div className="hidden xl:block">
        <Tabs value={status} onValueChange={(val) => onChange({ status: toStatus(val), page: 1 })}>
          <TabsList>
            {STATUS_OPTIONS.map((opt) => (
              <TabsTrigger key={opt.value} value={opt.value}>
                {opt.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      <div className="flex w-full xl:w-auto items-center gap-2">
        <label className="flex items-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-900/50 px-3 h-10 rounded-md border border-slate-200 dark:border-slate-800 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0">
          <Checkbox
            checked={filter.exclude_recent_24h || false}
            onCheckedChange={(c) => onChange({ exclude_recent_24h: c as boolean, page: 1 })}
          />
          <span className="hidden sm:inline">Ocultar recientes (24h)</span>
          <span className="inline sm:hidden" title="Ocultar envíos recientes (24h)">
            24h
          </span>
        </label>
        <div className="relative flex-1 xl:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Buscar cliente..."
            className="pl-9 bg-slate-50 dark:bg-slate-900/50"
            value={filter.search || ""}
            onChange={(e) => onChange({ search: e.target.value, page: 1 })}
          />
        </div>
      </div>
    </div>
  );
}
