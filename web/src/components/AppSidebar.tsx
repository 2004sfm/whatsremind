import { useState, useEffect, useRef, useCallback, memo } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  Users,
  History,
  Settings,
  Phone,
  FileText,
  ChevronsUpDown,
  Check,
  Loader2,
} from "lucide-react";
import logo from "../assets/logo.webp";
import type { Engine, ApiStatus } from "../hooks/useApiStatus";
import type { Channel } from "../lib/types";
import { useChannels } from "../hooks/useChannels";
import { cn, formatPhoneValue } from "../lib/utils";

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
  onNavigate: () => void;
  onStatusClick: () => void;
}

export function AppSidebar({
  isCollapsed,
  isMobileMenuOpen,
  apiStatus,
  engine,
  onNavigate,
  onStatusClick,
}: AppSidebarProps) {
  const navigate = useNavigate();
  const { channels, activeChannel, activate } = useChannels(engine);

  const hasChannels = channels.length > 0;
  const isDisconnected = hasChannels && (apiStatus === "disconnected" || (activeChannel ? activeChannel.status === "disconnected" : true));

  const statusLabel = getStatusLabel(apiStatus, engine, hasChannels);
  const statusTitle = getStatusTitle(apiStatus, engine, hasChannels);
  const displayPhone = activeChannel?.phoneNumber || (hasChannels ? channels[0]?.phoneNumber : null);
  const displayName = activeChannel?.displayName ?? (hasChannels ? channels[0]?.displayName : null);

  const handleSelectChannel = async (id: number) => {
    await activate(id);
  };

  const handleManageChannels = () => {
    navigate("/settings");
    onNavigate();
  };

  const handleStatusClick = () => {
    if (apiStatus === "error") {
      onStatusClick();
    } else if (isDisconnected || !hasChannels) {
      navigate("/settings");
      onNavigate();
    }
  };

  return (
    <>
      <aside
        className={cn(
          "fixed md:relative inset-y-0 left-0 z-50 md:z-10 flex flex-col bg-emerald-700 dark:bg-slate-900 border-r border-emerald-800 dark:border-slate-800 shadow-xl shadow-emerald-900/10 transition-all duration-300 shrink-0",
          isMobileMenuOpen ? "translate-x-0 w-64" : "-translate-x-full md:translate-x-0 w-64",
          isCollapsed ? "md:w-20" : "md:w-64"
        )}
      >
        {/* Header Logo */}
        <div className="h-20 flex items-center gap-3 border-b border-emerald-600/50 dark:border-slate-800/50 px-5 overflow-hidden shrink-0">
          <div className="flex items-center justify-center w-10 h-10 shrink-0 rounded-xl bg-white dark:bg-slate-800 text-white shadow-lg shadow-black/10 overflow-hidden border border-emerald-100 dark:border-emerald-900">
            <img src={logo} alt="WhatsRemind Logo" className="w-full h-full object-cover" />
          </div>
          <h1
            className={cn(
              "text-xl font-bold text-white whitespace-nowrap transition-opacity duration-200",
              isCollapsed ? "md:opacity-0" : "opacity-100"
            )}
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
        <div className="relative flex flex-col p-4 border-t border-emerald-600/50 dark:border-slate-800/50 shrink-0 gap-3">
          <ConnectedChannelCard
            displayPhone={displayPhone}
            displayName={displayName}
            channels={channels}
            activeChannelId={activeChannel?.id}
            isDisconnected={isDisconnected}
            hasChannels={hasChannels}
            isCollapsed={isCollapsed}
            onSelectChannel={handleSelectChannel}
            onManageChannels={handleManageChannels}
            apiStatus={apiStatus}
            statusLabel={statusLabel}
            statusTitle={statusTitle}
            onStatusClick={handleStatusClick}
          />
        </div>
      </aside>
    </>
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
        cn(
          "flex items-center gap-3 px-2.5 min-h-[48px] rounded-xl font-medium transition-colors duration-200",
          isActive
            ? "bg-emerald-900/40 text-white dark:bg-emerald-500/10 dark:text-emerald-400 shadow-inner"
            : "text-emerald-100 hover:bg-emerald-600/50 hover:text-white dark:text-slate-400 dark:hover:bg-slate-800/50 dark:hover:text-slate-200"
        )
      }
      title={isCollapsed ? collapsedTitle : undefined}
    >
      <Icon size={20} className="shrink-0" />
      <span
        className={cn(
          "whitespace-nowrap transition-opacity duration-200",
          isCollapsed ? "md:opacity-0 md:hidden" : "opacity-100"
        )}
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
  disconnected: "bg-amber-500",
};

const BADGE_CLASSES: Record<ApiStatus, string> = {
  connected:
    "bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-500/10 dark:border-emerald-500/20 dark:text-emerald-400",
  error:
    "bg-red-50 border-red-200 text-red-700 dark:bg-red-500/10 dark:border-red-500/20 dark:text-red-400 cursor-pointer hover:bg-red-100 dark:hover:bg-red-900/30",
  checking:
    "bg-slate-50 border-slate-200 text-slate-500 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400",
  disconnected:
    "bg-amber-50 border-amber-200 text-amber-700 dark:bg-amber-500/10 dark:border-amber-500/20 dark:text-amber-400 cursor-pointer hover:bg-amber-100 dark:hover:bg-amber-900/30",
};

function ApiStatusBadge({
  apiStatus,
  hasChannels,
  isCollapsed,
  label,
  title,
  onClick,
}: {
  apiStatus: ApiStatus;
  hasChannels: boolean;
  isCollapsed: boolean;
  label: string;
  title: string;
  onClick: () => void;
}) {
  const isUnconfigured = !hasChannels && apiStatus === "disconnected";
  const badgeStyle = isUnconfigured
    ? "bg-slate-50 border-slate-200 text-slate-500 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400"
    : BADGE_CLASSES[apiStatus];

  const dotStyle = isUnconfigured ? "bg-slate-400" : DOT_CLASSES[apiStatus];

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex items-center justify-center gap-2 rounded-full border text-xs font-semibold tracking-wide transition-colors px-3 py-1.5 w-full cursor-pointer",
        isCollapsed && "md:w-10 md:h-10 md:p-0 md:rounded-xl",
        badgeStyle
      )}
      title={title}
    >
      <div className={cn("w-2 h-2 rounded-full shrink-0", dotStyle)} />
      <span className={cn(isCollapsed ? "md:hidden block" : "block", "whitespace-nowrap")}>
        {label}
      </span>
    </button>
  );
}

interface ConnectedChannelCardProps {
  displayPhone: string | null;
  displayName?: string | null;
  channels: Channel[];
  activeChannelId?: number;
  isDisconnected: boolean;
  hasChannels: boolean;
  isCollapsed: boolean;
  onSelectChannel: (id: number) => Promise<void>;
  onManageChannels: () => void;
  apiStatus: ApiStatus;
  statusLabel: string;
  statusTitle: string;
  onStatusClick: () => void;
}

interface ChannelsDropdownListProps {
  channels: Channel[];
  activeChannelId?: number;
  switchingId: number | null;
  displayPhone: string | null;
  isDisconnected: boolean;
  onSelect: (id: number) => void;
  onManageChannels: () => void;
  onClose: () => void;
}

const ChannelsDropdownList = memo(function ChannelsDropdownList({
  channels,
  activeChannelId,
  switchingId,
  displayPhone,
  isDisconnected,
  onSelect,
  onManageChannels,
  onClose,
}: ChannelsDropdownListProps) {
  return (
    <div className="absolute bottom-full left-[-1px] right-[-1px] mb-[-1px] z-30 flex flex-col bg-white dark:bg-slate-900 border border-emerald-100/50 dark:border-slate-800 border-b border-b-slate-100 dark:border-b-slate-800 rounded-t-2xl shadow-xl overflow-hidden">
      <div className="flex items-center justify-between px-3 pt-3 pb-2 border-b border-slate-100 dark:border-slate-800/60">
        <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
          Líneas disponibles
        </span>
        <button
          type="button"
          onClick={() => {
            onClose();
            onManageChannels();
          }}
          aria-label="Administrar líneas en Configuración"
          title="Administrar líneas en Configuración"
          className="h-6 w-6 flex items-center justify-center rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
        >
          <Settings className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="max-h-60 overflow-y-auto overflow-x-hidden space-y-1 p-2">
        {channels.length > 0 ? (
          channels.map((ch) => {
            const isActive = ch.isActive === 1 || ch.id === activeChannelId;
            const isChDisconnected = ch.status === "disconnected";

            return (
              <button
                key={ch.id}
                type="button"
                disabled={Boolean(switchingId) || isChDisconnected}
                onClick={() => onSelect(ch.id)}
                className={cn(
                  "w-full flex items-center justify-between gap-2.5 px-2.5 py-2 rounded-xl text-left transition-colors cursor-pointer text-xs",
                  isActive
                    ? isChDisconnected
                      ? "bg-amber-50/80 dark:bg-amber-950/30 text-amber-900 dark:text-amber-200 font-medium border border-amber-300/70 dark:border-amber-800/40"
                      : "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 font-medium border border-emerald-200/50 dark:border-emerald-900/40"
                    : isChDisconnected
                    ? "text-amber-800/80 dark:text-amber-300/80 opacity-75 hover:bg-amber-50/50 dark:hover:bg-amber-950/20"
                    : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800",
                  (switchingId || isChDisconnected) && "cursor-not-allowed"
                )}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div
                    className={cn(
                      "flex h-8 w-8 shrink-0 items-center justify-center rounded-xl",
                      isActive
                        ? isChDisconnected
                          ? "bg-amber-500 text-white"
                          : "bg-emerald-600 text-white"
                        : isChDisconnected
                        ? "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400"
                        : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
                    )}
                  >
                    <Phone className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <span className="font-semibold block truncate">
                      {formatPhoneValue(ch.phoneNumber)}
                    </span>
                    <span
                      className={cn(
                        "text-[10px] block truncate",
                        isChDisconnected
                          ? "text-amber-700 dark:text-amber-400 font-medium"
                          : "text-slate-500 dark:text-slate-400"
                      )}
                    >
                      {isChDisconnected ? "Sesión desconectada" : ch.displayName ?? null}
                    </span>
                  </div>
                </div>

                {switchingId === ch.id ? (
                  <Loader2 className="h-4 w-4 animate-spin text-emerald-600 shrink-0" />
                ) : isActive ? (
                  isChDisconnected ? (
                    <span className="text-[10px] font-semibold text-amber-700 dark:text-amber-400 shrink-0">
                      Inactiva
                    </span>
                  ) : (
                    <Check className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  )
                ) : isChDisconnected ? (
                  <span className="text-[10px] text-amber-600 dark:text-amber-400 shrink-0">
                    Desconectada
                  </span>
                ) : null}
              </button>
            );
          })
        ) : (
          <div className="px-2.5 py-3 text-center text-xs text-slate-500 dark:text-slate-400">
            {displayPhone ? (
              <div
                className={cn(
                  "flex items-center gap-2 px-2 py-1.5 rounded-lg",
                  isDisconnected
                    ? "bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200"
                    : "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200"
                )}
              >
                <Phone
                  className={cn(
                    "h-3.5 w-3.5 shrink-0",
                    isDisconnected ? "text-amber-600" : "text-emerald-600"
                  )}
                />
                <span className="truncate font-semibold">{formatPhoneValue(displayPhone)}</span>
                {isDisconnected ? (
                  <span className="text-[10px] text-amber-600 ml-auto shrink-0 font-medium">
                    Desconectada
                  </span>
                ) : (
                  <Check className="h-3.5 w-3.5 text-emerald-600 ml-auto shrink-0" />
                )}
              </div>
            ) : (
              "No hay líneas registradas"
            )}
          </div>
        )}
      </div>
    </div>
  );
});

interface ActivePhoneRowProps {
  displayPhone: string | null;
  displayName?: string | null;
  isDisconnected: boolean;
  isOpen: boolean;
  onToggle: () => void;
}

const ActivePhoneRow = memo(function ActivePhoneRow({
  displayPhone,
  displayName,
  isDisconnected,
  isOpen,
  onToggle,
}: ActivePhoneRowProps) {
  return (
    <button
      type="button"
      aria-label="Seleccionar línea de WhatsApp"
      aria-expanded={isOpen}
      onClick={onToggle}
      className={cn(
        "group flex items-center justify-between gap-2 transition-colors p-1.5 w-full rounded-xl text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 text-left cursor-pointer",
        isDisconnected
          ? "focus-visible:ring-amber-500 hover:bg-amber-50/70 dark:hover:bg-amber-950/20 border border-amber-200/80 dark:border-amber-900/40 bg-amber-50/40 dark:bg-amber-950/10"
          : "focus-visible:ring-emerald-500"
      )}
      title="Seleccionar línea de WhatsApp"
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <div
          className={cn(
            "flex items-center justify-center shrink-0 rounded-full shadow-xs transition-colors w-8 h-8",
            isDisconnected
              ? "bg-amber-500 text-white"
              : "bg-slate-100 group-hover:bg-white dark:bg-slate-800 dark:group-hover:bg-slate-700"
          )}
        >
          <Phone
            size={14}
            className={isDisconnected ? "text-white" : "text-emerald-600 dark:text-emerald-400"}
          />
        </div>
        <div className="min-w-0">
          <span
            className={cn(
              "text-xs font-semibold tracking-wide truncate block",
              isDisconnected
                ? "text-amber-950 dark:text-amber-200"
                : "text-slate-800 dark:text-slate-100"
            )}
          >
            {formatPhoneValue(displayPhone)}
          </span>
          <span
            className={cn(
              "text-[10px] truncate block",
              isDisconnected
                ? "text-amber-700 dark:text-amber-400 font-medium"
                : "text-slate-500 dark:text-slate-400"
            )}
          >
            {isDisconnected ? "Sesión desconectada" : displayName ?? null}
          </span>
        </div>
      </div>
      <ChevronsUpDown
        size={14}
        className={cn(
          "text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-200 shrink-0 transition-transform",
          isOpen && (isDisconnected ? "text-amber-600 rotate-180" : "text-emerald-500 rotate-180")
        )}
      />
    </button>
  );
});

function ConnectedChannelCard({
  displayPhone,
  displayName,
  channels,
  activeChannelId,
  isDisconnected,
  hasChannels,
  isCollapsed,
  onSelectChannel,
  onManageChannels,
  apiStatus,
  statusLabel,
  statusTitle,
  onStatusClick,
}: ConnectedChannelCardProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [switchingId, setSwitchingId] = useState<number | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (cardRef.current && !cardRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside, { passive: true });
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const handleSelect = useCallback(
    async (id: number) => {
      if (id === activeChannelId) {
        setIsOpen(false);
        return;
      }
      setSwitchingId(id);
      try {
        await onSelectChannel(id);
        setIsOpen(false);
      } catch {
        // Handled upstream
      } finally {
        setSwitchingId(null);
      }
    },
    [activeChannelId, onSelectChannel]
  );

  const handleToggleOpen = useCallback(() => {
    setIsOpen((prev) => !prev);
  }, []);

  const handleClose = useCallback(() => {
    setIsOpen(false);
  }, []);

  return (
    <div
      ref={cardRef}
      className={cn(
        "relative flex flex-col gap-2 transition-all duration-200 bg-white dark:bg-slate-900 p-3 border border-emerald-100/50 dark:border-slate-800 shadow-md shadow-black/5 w-full items-start",
        isOpen && !isCollapsed
          ? "rounded-b-2xl rounded-t-none border-t border-slate-100 dark:border-slate-800"
          : "rounded-2xl",
        isCollapsed && "md:items-center md:bg-transparent md:p-0 md:border-transparent md:shadow-none"
      )}
    >
      {/* Upward Extension */}
      {!isCollapsed && isOpen && (
        <ChannelsDropdownList
          channels={channels}
          activeChannelId={activeChannelId}
          switchingId={switchingId}
          displayPhone={displayPhone}
          isDisconnected={isDisconnected}
          onSelect={handleSelect}
          onManageChannels={onManageChannels}
          onClose={handleClose}
        />
      )}

      {/* Current Active Phone Row */}
      {!isCollapsed && (displayPhone || channels.length > 0) && (
        <ActivePhoneRow
          displayPhone={displayPhone}
          displayName={displayName}
          isDisconnected={isDisconnected}
          isOpen={isOpen}
          onToggle={handleToggleOpen}
        />
      )}

      {/* Engine Status Badge */}
      <ApiStatusBadge
        apiStatus={apiStatus}
        hasChannels={hasChannels}
        isCollapsed={isCollapsed}
        label={statusLabel}
        title={statusTitle}
        onClick={onStatusClick}
      />
    </div>
  );
}

function getStatusLabel(apiStatus: ApiStatus, engine: Engine, hasChannels: boolean): string {
  if (!hasChannels) return "Sin configurar";
  if (apiStatus === "connected") {
    if (engine === "meta") return "Cuenta corporativa";
    if (engine === "ycloud") return "Cuenta YCloud";
    return "GOWA Vinculado";
  }
  if (apiStatus === "error") {
    if (engine === "meta") return "Error de Meta";
    if (engine === "ycloud") return "Error de YCloud";
    return "Error de conexión";
  }
  if (apiStatus === "checking") return "Verificando...";
  if (engine === "unofficial") return "GOWA Desconectado";
  return "Desconectado";
}

function getStatusTitle(apiStatus: ApiStatus, engine: Engine, hasChannels: boolean): string {
  if (!hasChannels) return "Sin líneas configuradas";
  if (apiStatus === "connected") {
    if (engine === "meta") return "Cuenta corporativa";
    if (engine === "ycloud") return "Cuenta YCloud";
    return "GOWA Vinculado";
  }
  if (apiStatus === "error") {
    if (engine === "meta") return "Error de Meta";
    if (engine === "ycloud") return "Error de YCloud";
    return "Error de conexión";
  }
  if (apiStatus === "checking") return "Verificando conexión...";
  return "Sesión desconectada. Requiere reconexión en Configuración.";
}
