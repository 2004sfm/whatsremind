import { useNavigate } from "react-router-dom";
import { Menu, Sun, Moon, HelpCircle, ChevronRight, AlertCircle } from "lucide-react";
import { Button } from "./ui/button";
import { toggleTheme, useTheme } from "../hooks/useTheme";
import type { Engine } from "../hooks/useApiStatus";

const BREADCRUMBS: Record<string, string> = {
  "/": "Gestión de clientes",
  "/history": "Historial de envíos",
  "/templates": "Gestor de Plantillas",
  "/settings": "Configuración",
};

interface TopHeaderProps {
  onToggleCollapse: () => void;
  onOpenMobileMenu: () => void;
  onOpenHelp: () => void;
  pathname: string;
}

export function TopHeader({
  onToggleCollapse,
  onOpenMobileMenu,
  onOpenHelp,
  pathname,
}: TopHeaderProps) {
  const isDark = useTheme();
  const breadcrumb = BREADCRUMBS[pathname] || "WhatsRemind";

  return (
    <header className="h-20 flex items-center justify-between px-8 border-b border-slate-200 dark:border-slate-800/50 bg-white/40 dark:bg-slate-950/40 backdrop-blur-md relative z-10 shrink-0">
      {/* Toggle Button and Breadcrumbs */}
      <div className="flex items-center gap-4">
        <button
          onClick={onToggleCollapse}
          className="hidden md:block p-2 -ml-2 text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors focus:outline-none shrink-0"
          title="Colapsar menú"
        >
          <Menu size={24} strokeWidth={2} />
        </button>
        <button
          onClick={onOpenMobileMenu}
          className="md:hidden p-2 -ml-2 text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors focus:outline-none shrink-0"
          title="Abrir menú"
        >
          <Menu size={24} strokeWidth={2} />
        </button>

        {/* Breadcrumbs */}
        <div className="flex items-center gap-2 text-sm font-medium text-slate-500 dark:text-slate-400">
          <span className="text-slate-400 dark:text-slate-500 hidden md:block">WhatsRemind</span>
          <ChevronRight size={16} className="text-slate-300 dark:text-slate-600 hidden md:block" />
          <span className="text-slate-800 dark:text-slate-200">{breadcrumb}</span>
        </div>
      </div>

      {/* Right actions */}
      <div className="flex items-center gap-2 md:gap-4">
        <button
          onClick={onOpenHelp}
          className="p-2 rounded-full text-slate-400 hover:bg-slate-100 hover:text-emerald-600 dark:hover:bg-slate-800 transition-colors"
          title="Centro de ayuda"
        >
          <HelpCircle size={20} />
        </button>
        <button onClick={toggleTheme} className="p-2 rounded-full text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors" title="Cambiar tema">
          {isDark ? <Sun size={20} /> : <Moon size={20} />}
        </button>
      </div>
    </header>
  );
}

interface ConnectionBannerProps {
  engine: Engine;
}

export function ConnectionBanner({ engine }: ConnectionBannerProps) {
  const navigate = useNavigate();

  return (
    <div className="bg-red-50 dark:bg-red-900/30 border-b border-red-200 dark:border-red-800/50 px-8 py-3 flex items-center justify-between z-10 shrink-0">
      <div className="flex items-center gap-3 text-red-700 dark:text-red-400 text-sm font-medium">
        <AlertCircle size={18} className="shrink-0" />
        <span>
          {engine === "meta"
            ? "Tu token de acceso a Meta ha expirado o no hay conexión. Los envíos fallarán."
            : "Tu dispositivo no está vinculado. Escanea el código QR desde la configuración para conectar WhatsApp."}
        </span>
      </div>
      <Button
        size="sm"
        variant="outline"
        className="border-red-200 text-red-700 hover:bg-red-100 dark:border-red-800/50 dark:text-red-400 dark:hover:bg-red-900/50 ml-4 shrink-0"
        onClick={() => navigate("/settings")}
      >
        {engine === "meta" ? "Renovar token" : "Vincular dispositivo"}
      </Button>
    </div>
  );
}
