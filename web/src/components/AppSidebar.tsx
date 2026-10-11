import { NavLink } from "react-router-dom";
import { Users, History, Settings, Phone, FileText } from "lucide-react";
import { parsePhoneNumberFromString } from "libphonenumber-js";
import logo from "../assets/logo.webp";
import type { Engine, ApiStatus } from "../hooks/useApiStatus";
import type { WhatsAppProfile } from "../lib/types";

const NAV_ITEMS = [
  { to: "/", icon: Users, label: "Clientes", collapsedTitle: "Clientes" },
  { to: "/history", icon: History, label: "Historial", collapsedTitle: "Historial" },
  { to: "/templates", icon: FileText, label: "Plantillas", collapsedTitle: "Plantillas" },
  { to: "/settings", icon: Settings, label: "Configuración", collapsedTitle: "Configuración" },
];

interface AppSidebarProps {
  isCollapsed: boolean;
  isMobileMenuOpen: boolean;
  apiStatus: ApiStatus;
  engine: Engine;
  phoneId: string | null;
  profile: WhatsAppProfile | null;
  onNavigate: () => void;
  onStatusClick: () => void;
}

export function AppSidebar({
  isCollapsed,
  isMobileMenuOpen,
  apiStatus,
  engine,
  phoneId,
  profile,
  onNavigate,
  onStatusClick,
}: AppSidebarProps) {
  const statusLabel = getStatusLabel(apiStatus, engine);
  const statusTitle = getStatusTitle(apiStatus, engine);

  return (
    <aside
      className={`
        fixed md:relative inset-y-0 left-0 z-50 md:z-10 flex flex-col bg-emerald-700 dark:bg-slate-900 border-r border-emerald-800 dark:border-slate-800 shadow-xl shadow-emerald-900/10 transition-all duration-300 shrink-0
        ${isMobileMenuOpen ? "translate-x-0 w-64" : "-translate-x-full md:translate-x-0 w-64"}
        ${isCollapsed ? "md:w-20" : "md:w-64"}
      `}
    >
      {/* Header Logo */}
      <div className="h-20 flex items-center gap-3 border-b border-emerald-600/50 dark:border-slate-800/50 px-5 overflow-hidden shrink-0">
        <div className="flex items-center justify-center w-10 h-10 shrink-0 rounded-xl bg-white dark:bg-slate-800 text-white shadow-lg shadow-black/10 overflow-hidden border border-emerald-100 dark:border-emerald-900">
          <img src={logo} alt="WhatsRemind Logo" className="w-full h-full object-cover" />
        </div>
        <h1
          className={`text-xl font-bold text-white whitespace-nowrap transition-opacity duration-200 ${
            isCollapsed ? "md:opacity-0" : "opacity-100"
          }`}
        >
          WhatsRemind
        </h1>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-5 py-6 space-y-2 overflow-y-auto overflow-x-hidden">
        {NAV_ITEMS.map((item) => (
          <SidebarLink key={item.to} {...item} isCollapsed={isCollapsed} onClick={onNavigate} />
        ))}
      </nav>

      {/* Footer (Account & Status) */}
      <div className="flex flex-col p-4 border-t border-emerald-600/50 dark:border-slate-800/50 overflow-hidden shrink-0 gap-3">
        <div
          className={`flex flex-col gap-2 transition-all duration-200 bg-white dark:bg-slate-900 p-3 rounded-2xl border border-emerald-100/50 dark:border-slate-800 shadow-md shadow-black/5 w-full items-start ${
            isCollapsed ? "md:items-center md:bg-transparent md:p-0 md:border-transparent md:shadow-none" : ""
          }`}
        >
          <ApiStatusBadge
            apiStatus={apiStatus}
            isCollapsed={isCollapsed}
            label={statusLabel}
            title={statusTitle}
            onClick={onStatusClick}
          />

          {apiStatus === "connected" && (profile?.display_phone_number || phoneId) && (
            <PhonePill phoneId={phoneId} profile={profile} isCollapsed={isCollapsed} />
          )}
        </div>
      </div>
    </aside>
  );
}

function SidebarLink({
  to,
  icon: Icon,
  label,
  collapsedTitle,
  isCollapsed,
  onClick,
}: {
  to: string;
  icon: typeof Users;
  label: string;
  collapsedTitle: string;
  isCollapsed: boolean;
  onClick: () => void;
}) {
  return (
    <NavLink
      to={to}
      onClick={onClick}
      className={({ isActive }) =>
        `flex items-center gap-3 px-2.5 min-h-[48px] rounded-xl font-medium transition-colors duration-200 ${
          isActive
            ? "bg-emerald-900/40 text-white dark:bg-emerald-500/10 dark:text-emerald-400 shadow-inner"
            : "text-emerald-100 hover:bg-emerald-600/50 hover:text-white dark:text-slate-400 dark:hover:bg-slate-800/50 dark:hover:text-slate-200"
        }`
      }
      title={isCollapsed ? collapsedTitle : undefined}
    >
      <Icon size={20} className="shrink-0" />
      <span
        className={`whitespace-nowrap transition-opacity duration-200 ${
          isCollapsed ? "md:opacity-0 md:hidden" : "opacity-100"
        }`}
      >
        {label}
      </span>
    </NavLink>
  );
}

const DOT_CLASSES: Record<ApiStatus, string> = {
  connected: "bg-emerald-500 animate-pulse",
  error: "bg-red-500",
  checking: "bg-slate-400",
  disconnected: "bg-slate-400",
};

const BADGE_CLASSES: Record<ApiStatus, string> = {
  connected:
    "bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-500/10 dark:border-emerald-500/20 dark:text-emerald-400",
  error:
    "bg-red-50 border-red-200 text-red-700 dark:bg-red-500/10 dark:border-red-500/20 dark:text-red-400 cursor-pointer hover:bg-red-100 dark:hover:bg-red-900/30",
  checking:
    "bg-slate-50 border-slate-200 text-slate-500 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400",
  disconnected:
    "bg-slate-50 border-slate-200 text-slate-500 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400",
};

function ApiStatusBadge({
  apiStatus,
  isCollapsed,
  label,
  title,
  onClick,
}: {
  apiStatus: ApiStatus;
  isCollapsed: boolean;
  label: string;
  title: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center justify-center gap-2 rounded-full border text-xs font-semibold tracking-wide transition-colors px-3 py-1.5 w-full ${
        isCollapsed ? "md:w-10 md:h-10 md:p-0 md:rounded-xl" : ""
      } ${BADGE_CLASSES[apiStatus]}`}
      title={title}
    >
      <div className={`w-2 h-2 rounded-full shrink-0 ${DOT_CLASSES[apiStatus]}`} />
      <span className={`${isCollapsed ? "md:hidden block" : "block"} whitespace-nowrap`}>{label}</span>
    </button>
  );
}

function PhonePill({
  phoneId,
  profile,
  isCollapsed,
}: {
  phoneId: string | null;
  profile: WhatsAppProfile | null;
  isCollapsed: boolean;
}) {
  return (
    <div
      className={`flex items-center gap-2.5 transition-all px-1 pt-1 w-full text-slate-700 dark:text-slate-300 ${
        isCollapsed ? "md:p-0 md:justify-center" : ""
      }`}
      title={`ID Configurado: ${phoneId}`}
    >
      <div
        className={`flex items-center justify-center shrink-0 rounded-full bg-slate-100 dark:bg-slate-800 ${
          isCollapsed ? "md:hidden w-8 h-8" : "w-8 h-8"
        }`}
      >
        <Phone size={14} className="text-slate-500 dark:text-slate-400" />
      </div>
      <span
        className={`text-sm font-semibold tracking-wide truncate ${
          isCollapsed ? "md:hidden block" : "block"
        }`}
      >
        {formatPhoneValue(profile?.display_phone_number || phoneId)}
      </span>
    </div>
  );
}

function formatPhoneValue(value: string | null | undefined): string {
  if (!value) return "";
  const withPrefix = value.startsWith("+") ? value : `+${value}`;
  return parsePhoneNumberFromString(withPrefix)?.formatInternational() || value;
}

function getStatusLabel(apiStatus: ApiStatus, engine: Engine): string {
  if (apiStatus === "connected") {
    return engine === "meta" ? "Cuenta corporativa" : "Dispositivo vinculado";
  }
  if (apiStatus === "error") {
    return engine === "meta" ? "Error de Meta" : "Desconectado";
  }
  if (apiStatus === "checking") return "Verificando...";
  return "Sin configurar";
}

function getStatusTitle(apiStatus: ApiStatus, engine: Engine): string {
  if (apiStatus === "connected") {
    return engine === "meta" ? "Cuenta corporativa" : "Dispositivo vinculado";
  }
  if (apiStatus === "error") {
    return engine === "meta" ? "Error de Meta" : "WhatsApp desconectado";
  }
  return "Sin configuración";
}
