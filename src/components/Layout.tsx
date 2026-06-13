import { useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { ipc } from '../lib/ipc';
import { parsePhoneNumberFromString } from 'libphonenumber-js';
import type { WhatsAppProfile } from '../lib/types';
import { Users, History, Settings, Phone, Menu, Sun, Moon, AlertCircle, ChevronRight, FileText } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { Button } from './ui/button';
import logo from '../assets/logo.webp';

export function Layout() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [phoneId, setPhoneId] = useState<string | null>(null);
  const [profile, setProfile] = useState<WhatsAppProfile | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [apiStatus, setApiStatus] = useState<'checking' | 'connected' | 'error' | 'disconnected'>('checking');
  const [showErrorModal, setShowErrorModal] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const getBreadcrumb = () => {
    switch (location.pathname) {
      case '/': return 'Gestión de Clientes';
      case '/history': return 'Historial de Envíos';
      case '/templates': return 'Gestor de Plantillas';
      case '/settings': return 'Configuración';
      default: return 'WhatsRemind';
    }
  };

  const checkApiConnection = (e?: Event) => {
    const isManualUpdate = e && e.type === 'credentials-updated';
    const isBackgroundPoll = e && e.type === 'background-poll';
    
    if (!isBackgroundPoll) setApiStatus('checking');

    ipc.getCredentials().then((creds) => {
      if (creds) {
        setPhoneId(creds.phone_id);
        // Extraer el perfil real de WhatsApp
        ipc.getWhatsAppProfile().then((prof) => {
          if (prof) {
            setProfile(prof);
            setApiStatus('connected');
          } else {
            setApiStatus('error');
            // Sólo mostrar el modal si no venimos de guardar o de un chequeo silencioso
            if (!isManualUpdate && !isBackgroundPoll) setShowErrorModal(true);
          }
        }).catch((err) => {
          console.error('❌ Meta API Error:', err);
          setApiStatus('error');
          if (!isManualUpdate && !isBackgroundPoll) setShowErrorModal(true);
        });
      } else {
        setApiStatus('disconnected');
      }
    }).catch(() => {
      setApiStatus('error');
      if (!isManualUpdate && !isBackgroundPoll) setShowErrorModal(true);
    });
  };

  useEffect(() => {
    // Tema oscuro
    const isDark = document.documentElement.classList.contains('dark') || localStorage.theme === 'dark';
    setIsDarkMode(isDark);
    if (isDark) document.documentElement.classList.add('dark');

    // Primera verificación al abrir
    checkApiConnection();

    // Escuchar cuando el usuario guarde un nuevo token desde configuración
    window.addEventListener('credentials-updated', checkApiConnection);

    // Latido silencioso cada 5 minutos (300,000 ms)
    const interval = setInterval(() => {
      checkApiConnection(new Event('background-poll'));
    }, 5 * 60 * 1000);

    return () => {
      window.removeEventListener('credentials-updated', checkApiConnection);
      clearInterval(interval);
    };
  }, []);

  const toggleTheme = () => {
    if (isDarkMode) {
      document.documentElement.classList.remove('dark');
      localStorage.theme = 'light';
      setIsDarkMode(false);
    } else {
      document.documentElement.classList.add('dark');
      localStorage.theme = 'dark';
      setIsDarkMode(true);
    }
  };

  return (
    <div className="flex h-screen w-full bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-50 overflow-hidden font-sans transition-colors duration-300">
      
      {/* Mobile Backdrop Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40 md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar - Green Theme / Dark Theme */}
      <aside className={`
        fixed md:relative inset-y-0 left-0 z-50 md:z-10 flex flex-col bg-emerald-700 dark:bg-slate-900 border-r border-emerald-800 dark:border-slate-800 shadow-xl shadow-emerald-900/10 transition-all duration-300 shrink-0
        ${isMobileMenuOpen ? 'translate-x-0 w-64' : '-translate-x-full md:translate-x-0 w-64'}
        ${isCollapsed ? 'md:w-20' : 'md:w-64'}
      `}>
        
        {/* Header Logo */}
        <div className="h-20 flex items-center gap-3 border-b border-emerald-600/50 dark:border-slate-800/50 px-5 overflow-hidden shrink-0">
          <div className="flex items-center justify-center w-10 h-10 shrink-0 rounded-xl bg-white dark:bg-slate-800 text-white shadow-lg shadow-black/10 overflow-hidden border border-emerald-100 dark:border-emerald-900">
            <img src={logo} alt="WhatsRemind Logo" className="w-full h-full object-cover" />
          </div>
          <h1 className={`text-xl font-bold text-white whitespace-nowrap transition-opacity duration-200 ${isCollapsed ? 'md:opacity-0' : 'opacity-100'}`}>
            WhatsRemind
          </h1>
        </div>

        {/* Navegación */}
        <nav className="flex-1 px-5 py-6 space-y-2 overflow-y-auto overflow-x-hidden">
          <NavLink
            to="/"
            onClick={() => setIsMobileMenuOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 px-2.5 min-h-[48px] rounded-xl font-medium transition-colors duration-200 ${
                isActive
                  ? 'bg-emerald-900/40 text-white dark:bg-emerald-500/10 dark:text-emerald-400 shadow-inner'
                  : 'text-emerald-100 hover:bg-emerald-600/50 hover:text-white dark:text-slate-400 dark:hover:bg-slate-800/50 dark:hover:text-slate-200'
              }`
            }
            title={isCollapsed ? "Clientes" : undefined}
          >
            <Users size={20} className="shrink-0" />
            <span className={`whitespace-nowrap transition-opacity duration-200 ${isCollapsed ? 'md:opacity-0 md:hidden' : 'opacity-100'}`}>Clientes</span>
          </NavLink>
          
          <NavLink
            to="/history"
            onClick={() => setIsMobileMenuOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 px-2.5 min-h-[48px] rounded-xl font-medium transition-colors duration-200 ${
                isActive
                  ? 'bg-emerald-900/40 text-white dark:bg-emerald-500/10 dark:text-emerald-400 shadow-inner'
                  : 'text-emerald-100 hover:bg-emerald-600/50 hover:text-white dark:text-slate-400 dark:hover:bg-slate-800/50 dark:hover:text-slate-200'
              }`
            }
            title={isCollapsed ? "Historial" : undefined}
          >
            <History size={20} className="shrink-0" />
            <span className={`whitespace-nowrap transition-opacity duration-200 ${isCollapsed ? 'md:opacity-0 md:hidden' : 'opacity-100'}`}>Historial</span>
          </NavLink>

          <NavLink
            to="/templates"
            onClick={() => setIsMobileMenuOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 px-2.5 min-h-[48px] rounded-xl font-medium transition-colors duration-200 ${
                isActive
                  ? 'bg-emerald-900/40 text-white dark:bg-emerald-500/10 dark:text-emerald-400 shadow-inner'
                  : 'text-emerald-100 hover:bg-emerald-600/50 hover:text-white dark:text-slate-400 dark:hover:bg-slate-800/50 dark:hover:text-slate-200'
              }`
            }
            title={isCollapsed ? "Plantillas" : undefined}
          >
            <FileText size={20} className="shrink-0" />
            <span className={`whitespace-nowrap transition-opacity duration-200 ${isCollapsed ? 'md:opacity-0 md:hidden' : 'opacity-100'}`}>Plantillas</span>
          </NavLink>

          <NavLink
            to="/settings"
            onClick={() => setIsMobileMenuOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 px-2.5 min-h-[48px] rounded-xl font-medium transition-colors duration-200 ${
                isActive
                  ? 'bg-emerald-900/40 text-white dark:bg-emerald-500/10 dark:text-emerald-400 shadow-inner'
                  : 'text-emerald-100 hover:bg-emerald-600/50 hover:text-white dark:text-slate-400 dark:hover:bg-slate-800/50 dark:hover:text-slate-200'
              }`
            }
            title={isCollapsed ? "Configuración" : undefined}
          >
            <Settings size={20} className="shrink-0" />
            <span className={`whitespace-nowrap transition-opacity duration-200 ${isCollapsed ? 'md:opacity-0 md:hidden' : 'opacity-100'}`}>Configuración</span>
          </NavLink>
        </nav>
        
        {/* Footer (Account & Version) */}
        <div className="flex flex-col p-4 border-t border-emerald-600/50 dark:border-slate-800/50 overflow-hidden shrink-0 gap-3">
          {/* Status & Phone */}
          {phoneId ? (
            <div className={`flex flex-col gap-2 transition-all duration-200 bg-white dark:bg-slate-900 p-3 rounded-2xl border border-emerald-100/50 dark:border-slate-800 shadow-md shadow-black/5 w-full items-start ${isCollapsed ? 'md:items-center md:bg-transparent md:p-0 md:border-transparent md:shadow-none' : ''}`}>
              {/* API Status Badge */}
              <button 
                onClick={() => apiStatus === 'error' && setShowErrorModal(true)}
                className={`flex items-center justify-center gap-2 rounded-full border text-xs font-semibold tracking-wide transition-colors px-3 py-1.5 w-full ${isCollapsed ? 'md:w-10 md:h-10 md:p-0 md:rounded-xl' : ''} ${
                  apiStatus === 'connected' 
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-500/10 dark:border-emerald-500/20 dark:text-emerald-400' 
                    : apiStatus === 'error'
                    ? 'bg-red-50 border-red-200 text-red-700 dark:bg-red-500/10 dark:border-red-500/20 dark:text-red-400 cursor-pointer hover:bg-red-100 dark:hover:bg-red-900/30'
                    : 'bg-slate-50 border-slate-200 text-slate-500 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400'
                }`}
                title={apiStatus === 'connected' ? 'API Conectada' : apiStatus === 'error' ? 'Error de API' : 'Verificando...'}
              >
                <div 
                  className={`w-2 h-2 rounded-full shrink-0 ${
                    apiStatus === 'connected' ? 'bg-emerald-500 animate-pulse' :
                    apiStatus === 'error' ? 'bg-red-500' :
                    'bg-slate-400 animate-pulse'
                  }`} 
                />
                <span className={`${isCollapsed ? 'md:hidden block' : 'block'} whitespace-nowrap`}>
                  {apiStatus === 'connected' ? 'API Conectada' : 
                   apiStatus === 'error' ? 'Error de API' : 
                   'Verificando...'}
                </span>
              </button>

              {/* Phone Pill */}
              {apiStatus !== 'error' && (
                <div 
                  className={`flex items-center gap-2.5 transition-all px-1 pt-1 w-full text-slate-700 dark:text-slate-300 ${isCollapsed ? 'md:p-0 md:justify-center' : ''}`}
                  title={`ID Configurado: ${phoneId}`}
                >
                  <div className={`flex items-center justify-center shrink-0 rounded-full bg-slate-100 dark:bg-slate-800 ${isCollapsed ? 'md:hidden w-8 h-8' : 'w-8 h-8'}`}>
                    <Phone size={14} className="text-slate-500 dark:text-slate-400" />
                  </div>
                  <span className={`text-sm font-semibold tracking-wide truncate ${isCollapsed ? 'md:hidden block' : 'block'}`}>
                    {profile?.display_phone_number 
                      ? (parsePhoneNumberFromString(profile.display_phone_number.startsWith('+') ? profile.display_phone_number : `+${profile.display_phone_number}`)?.formatInternational() || profile.display_phone_number)
                      : (phoneId ? (parsePhoneNumberFromString(phoneId.startsWith('+') ? phoneId : `+${phoneId}`)?.formatInternational() || phoneId) : '')}
                  </span>
                </div>
              )}
            </div>
          ) : (
            <div className={`flex items-center gap-2 text-sm font-medium text-emerald-200/50 dark:text-slate-500 transition-all ${isCollapsed ? 'md:justify-center' : 'justify-start px-2'}`} title="Sin configuración">
              <Phone size={20} className="shrink-0" />
              <span className={`${isCollapsed ? 'md:hidden block' : 'block'} whitespace-nowrap`}>Sin configuración</span>
            </div>
          )}
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col relative overflow-hidden bg-slate-50 dark:bg-slate-950 transition-colors duration-300">
        <div className="absolute top-0 left-0 right-0 h-64 bg-gradient-to-b from-emerald-50/50 to-transparent dark:from-emerald-950/20 pointer-events-none" />
        
        {/* Top Header */}
        <header className="h-20 flex items-center justify-between px-8 border-b border-slate-200 dark:border-slate-800/50 bg-white/40 dark:bg-slate-950/40 backdrop-blur-md relative z-10 shrink-0">
          
          {/* Toggle Button and Breadcrumbs */}
          <div className="flex items-center gap-4">
            {/* Desktop Toggle */}
            <button 
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="hidden md:block p-2 -ml-2 text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors focus:outline-none shrink-0"
              title={isCollapsed ? "Expandir menú" : "Colapsar menú"}
            >
              <Menu size={24} strokeWidth={2} />
            </button>
            {/* Mobile Toggle */}
            <button 
              onClick={() => setIsMobileMenuOpen(true)}
              className="md:hidden p-2 -ml-2 text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors focus:outline-none shrink-0"
              title="Abrir menú"
            >
              <Menu size={24} strokeWidth={2} />
            </button>

            {/* Breadcrumbs */}
            <div className="flex items-center gap-2 text-sm font-medium text-slate-500 dark:text-slate-400">
              <span className="text-slate-400 dark:text-slate-500 hidden md:block">WhatsRemind</span>
              <ChevronRight size={16} className="text-slate-300 dark:text-slate-600 hidden md:block" />
              <span className="text-slate-800 dark:text-slate-200">{getBreadcrumb()}</span>
            </div>
          </div>

          {/* Acciones Derecha */}
          <div className="flex items-center gap-4">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-full text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title="Cambiar tema"
            >
              {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
            </button>
          </div>
        </header>

        {apiStatus === 'error' && phoneId && (
          <div className="bg-red-50 dark:bg-red-900/30 border-b border-red-200 dark:border-red-800/50 px-8 py-3 flex items-center justify-between z-10 shrink-0 animate-in slide-in-from-top-2 fade-in duration-300">
            <div className="flex items-center gap-3 text-red-700 dark:text-red-400 text-sm font-medium">
              <AlertCircle size={18} className="shrink-0" />
              <span>Tu token de acceso a Meta ha expirado o no hay conexión. Los envíos fallarán.</span>
            </div>
            <Button size="sm" variant="outline" className="border-red-200 text-red-700 hover:bg-red-100 dark:border-red-800/50 dark:text-red-400 dark:hover:bg-red-900/50 ml-4 shrink-0" onClick={() => navigate('/settings')}>
              Renovar Token
            </Button>
          </div>
        )}

        <div className="flex-1 overflow-auto p-8 pt-4 relative z-0">
          <div className="max-w-6xl mx-auto">
            <Outlet context={{ apiStatus }} />
          </div>
        </div>
      </main>

      {/* Modal de Error de API (User-Friendly) */}
      <Dialog open={showErrorModal} onOpenChange={setShowErrorModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl text-slate-900 dark:text-white">
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-red-100 dark:bg-red-500/20 text-red-600">
                <AlertCircle size={24} />
              </div>
              Problema de Conexión
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4 text-slate-600 dark:text-slate-300">
            <p>
              ¡Hola! No pudimos conectar tu sistema con los servidores de WhatsApp. Esto ocurre por una de dos razones:
            </p>
            <ul className="list-disc pl-5 space-y-2 text-sm font-medium">
              <li>Tu computadora no tiene conexión a internet en este momento.</li>
              <li>El "Token de Acceso" que guardaste en la configuración ha vencido o fue revocado por Meta.</li>
            </ul>
            <p className="text-sm">
              <strong>¿Cómo solucionarlo?</strong><br/>
              Si tienes internet, ve a la sección de <span className="font-semibold text-emerald-600 dark:text-emerald-400">Configuración</span>, asegúrate de que tu Token permanente esté actualizado y presiona "Validar y Guardar".
            </p>
          </div>
          <DialogFooter className="sm:justify-end">
            <Button variant="outline" onClick={() => setShowErrorModal(false)}>
              Cerrar
            </Button>
            <Button 
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={() => {
                setShowErrorModal(false);
                navigate('/settings');
              }}
            >
              Ir a Configuración
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
