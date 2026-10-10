import { useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { ipc } from '../lib/ipc';
import { parsePhoneNumberFromString } from 'libphonenumber-js';
import type { WhatsAppProfile } from '../lib/types';
import { Users, History, Settings, Phone, Menu, Sun, Moon, AlertCircle, ChevronRight, FileText, HelpCircle, Download, CheckCircle2, FileSpreadsheet, Code, Briefcase, Smartphone, Cloud } from 'lucide-react';
import * as XLSX from 'xlsx';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { Button } from './ui/button';
import logo from '../assets/logo.webp';

export function Layout() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [phoneId, setPhoneId] = useState<string | null>(null);
  const [profile, setProfile] = useState<WhatsAppProfile | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(() => document.documentElement.classList.contains('dark'));
  const [apiStatus, setApiStatus] = useState<'checking' | 'connected' | 'error' | 'disconnected'>('checking');
  const [engine, setEngine] = useState<'meta' | 'unofficial'>('meta');
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [showDownloadSuccessModal, setShowDownloadSuccessModal] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const getBreadcrumb = () => {
    switch (location.pathname) {
      case '/': return 'Gestión de clientes';
      case '/history': return 'Historial de envíos';
      case '/templates': return 'Gestor de Plantillas';
      case '/settings': return 'Configuración';
      default: return 'WhatsRemind';
    }
  };

  const checkApiConnection = (e?: Event) => {
    const isManualUpdate = e && e.type === 'credentials-updated';
    const isBackgroundPoll = e && e.type === 'background-poll';
    
    if (!isBackgroundPoll) setApiStatus('checking');

    ipc.getEngine().then((currentEngine) => {
      setEngine(currentEngine as 'meta' | 'unofficial');
      
      if (currentEngine === 'unofficial') {
        ipc.getSidecarStatus().then((status) => {
          if (status.connected) {
            setApiStatus('connected');
            setPhoneId(status.phone);
            if (status.phone) {
              setProfile({ display_phone_number: status.phone, verified_name: undefined });
            } else {
              setProfile(null);
            }
          } else {
            setPhoneId(null);
            setProfile(null);
            setApiStatus('error');
          }
        }).catch((err) => {
          console.error('❌ Sidecar API Error:', err);
          setPhoneId(null);
          setProfile(null);
          setApiStatus('error');
        });
      } else {
        ipc.getCredentials().then((creds) => {
          if (creds) {
            setPhoneId(creds.phone_id);
            // Extraer el perfil real de WhatsApp
            ipc.getWhatsAppProfile().then((prof) => {
              if (prof) {
                setProfile(prof);
                setApiStatus('connected');
              } else {
                setProfile(null);
                setApiStatus('error');
              }
            }).catch((err) => {
              console.error('❌ Meta API Verify Error:', err);
              setProfile(null);
              setApiStatus('error');
            });
          } else {
            setApiStatus('disconnected');
          }
        }).catch(() => {
          setApiStatus('error');
          if (!isManualUpdate && !isBackgroundPoll) {
            setTimeout(() => setShowErrorModal(true), 400);
          }
        });
      }
    }).catch(() => {
      setApiStatus('error');
    });
  };

  useEffect(() => {
    // Tema oscuro
    const isDark = document.documentElement.classList.contains('dark') || localStorage.theme === 'dark';
    setIsDarkMode(isDark);
    if (isDark) document.documentElement.classList.add('dark');

    // Primera verificación al abrir
    checkApiConnection();

    // Escuchar cuando el usuario guarde un nuevo token desde configuración o cambie el motor
    window.addEventListener('credentials-updated', checkApiConnection);
    
    // Escuchar cambios de tema desde la configuración
    const handleThemeChange = () => {
      setIsDarkMode(document.documentElement.classList.contains('dark'));
    };
    window.addEventListener('theme-changed', handleThemeChange);
    
    return () => {
      window.removeEventListener('credentials-updated', checkApiConnection);
      window.removeEventListener('theme-changed', handleThemeChange);
    };
  }, []);

  useEffect(() => {
    // Un poll de fondo cada 3 segundos si es local (no oficial) o 5 minutos si es internet (Meta)
    const interval = setInterval(() => checkApiConnection(new Event('background-poll')), engine === 'unofficial' ? 3000 : 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [engine]);

  // Manejar la pantalla de carga inicial (Splash Screen)
  useEffect(() => {
    const removeSplash = () => {
      const splash = document.getElementById('splash');
      if (splash) {
        splash.style.opacity = '0';
        setTimeout(() => splash.remove(), 400);
      }
    };

    if (apiStatus !== 'checking') {
      removeSplash();
    } else {
      // Failsafe: Si se queda verificando más de 5 segundos (por internet lento, etc.), quita el splash
      const failsafe = setTimeout(removeSplash, 5000);
      return () => clearTimeout(failsafe);
    }
  }, [apiStatus]);

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
    window.dispatchEvent(new Event('theme-changed'));
  };

  const handleDownloadTemplate = () => {
    const ws = XLSX.utils.aoa_to_sheet([
      [], // Fila 1 (vacía)
      [null, 'Nombre de condominio'], // Fila 2: B2 = Nombre de condominio
      [], // Fila 3 (vacía)
      [null, 'Código', 'Nombre', 'Teléfono', 'Deuda'], // Fila 4: B4 a E4
      [null, '101A', 'Juan Pérez', '+584241234567', '150.50'], // Fila 5 (ejemplo)
      [null, '102B', 'María García', '+584149876543', '0.00']  // Fila 6 (ejemplo)
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Plantilla');
    XLSX.writeFile(wb, 'formato_whatsremind.xlsx');
    setShowDownloadSuccessModal(true);
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
              title={apiStatus === 'connected' ? (engine === 'meta' ? 'Cuenta corporativa' : 'Dispositivo vinculado') : apiStatus === 'error' ? (engine === 'meta' ? 'Error de Meta' : 'WhatsApp desconectado') : 'Sin configuración'}
            >
              <div 
                className={`w-2 h-2 rounded-full shrink-0 ${
                  apiStatus === 'connected' ? 'bg-emerald-500 animate-pulse' :
                  apiStatus === 'error' ? 'bg-red-500' :
                  'bg-slate-400'
                }`} 
              />
              <span className={`${isCollapsed ? 'md:hidden block' : 'block'} whitespace-nowrap`}>
                {apiStatus === 'connected' ? (engine === 'meta' ? 'Cuenta corporativa' : 'Dispositivo vinculado') : 
                 apiStatus === 'error' ? (engine === 'meta' ? 'Error de Meta' : 'Desconectado') : 
                 apiStatus === 'checking' ? 'Verificando...' : 'Sin configurar'}
              </span>
            </button>

            {/* Phone Pill */}
            {(apiStatus === 'connected' && (profile?.display_phone_number || phoneId)) && (
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
          <div className="flex items-center gap-2 md:gap-4">
            <button
              onClick={() => setShowHelpModal(true)}
              className="p-2 rounded-full text-slate-400 hover:bg-slate-100 hover:text-emerald-600 dark:hover:bg-slate-800 transition-colors"
              title="Centro de ayuda"
            >
              <HelpCircle size={20} />
            </button>
            <button
              onClick={toggleTheme}
              className="p-2 rounded-full text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title="Cambiar tema"
            >
              {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
            </button>
          </div>
        </header>

        {apiStatus === 'error' && (engine === 'unofficial' || phoneId) && (
          <div className="bg-red-50 dark:bg-red-900/30 border-b border-red-200 dark:border-red-800/50 px-8 py-3 flex items-center justify-between z-10 shrink-0">
            <div className="flex items-center gap-3 text-red-700 dark:text-red-400 text-sm font-medium">
              <AlertCircle size={18} className="shrink-0" />
              <span>
                {engine === 'meta' 
                  ? 'Tu token de acceso a Meta ha expirado o no hay conexión. Los envíos fallarán.'
                  : 'Tu dispositivo no está vinculado. Escanea el código QR desde la configuración para conectar WhatsApp.'}
              </span>
            </div>
            <Button size="sm" variant="outline" className="border-red-200 text-red-700 hover:bg-red-100 dark:border-red-800/50 dark:text-red-400 dark:hover:bg-red-900/50 ml-4 shrink-0" onClick={() => navigate('/settings')}>
              {engine === 'meta' ? 'Renovar token' : 'Vincular dispositivo'}
            </Button>
          </div>
        )}

        <div className="flex-1 overflow-auto p-4 md:p-8 pt-4 relative z-0 flex flex-col">
          <div className="max-w-6xl mx-auto w-full flex-1 mb-8">
            <Outlet context={{ apiStatus }} />
          </div>
          
          {/* Global Footer */}
          <footer className="mt-auto pt-4 text-center text-sm font-medium text-slate-400 dark:text-slate-500 w-full shrink-0">
            &copy; {new Date().getFullYear()} <span className="font-bold text-emerald-600 dark:text-emerald-500 tracking-wide">famtiago</span>. Todos los derechos reservados.
          </footer>
        </div>
      </main>

      {/* Modal de Error de API (User-Friendly) */}
      <Dialog open={showErrorModal} onOpenChange={setShowErrorModal}>
        {/* ... existing error modal content remains below ... */}
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
            {engine === 'meta' ? (
               <>
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
               </>
            ) : (
               <>
                  <p>
                    ¡Hola! WhatsApp detectó que tu teléfono celular se ha desconectado. Esto puede ocurrir porque:
                  </p>
                  <ul className="list-disc pl-5 space-y-2 text-sm font-medium">
                    <li>Cerraste la sesión desde la aplicación de WhatsApp en tu teléfono.</li>
                    <li>Tu computadora perdió la conexión a internet.</li>
                  </ul>
                  <p className="text-sm">
                    <strong>¿Cómo solucionarlo?</strong><br/>
                    Asegúrate de tener internet y ve a la sección de <span className="font-semibold text-emerald-600 dark:text-emerald-400">Configuración</span> para escanear el código QR nuevamente y vincular tu dispositivo.
                  </p>
               </>
            )}
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
              Ir a configuración
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Ayuda / Info */}
      <Dialog open={showHelpModal} onOpenChange={setShowHelpModal}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl text-slate-900 dark:text-white">
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600">
                <HelpCircle size={24} />
              </div>
              Centro de ayuda
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6 py-4 text-slate-600 dark:text-slate-300">
            {/* Sección Formato Excel */}
            <div className="space-y-3">
              <h3 className="font-semibold text-slate-900 dark:text-white">
                Formato de Clientes (Excel)
              </h3>
              <div className="bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-lg p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3 text-sm">
                  <div className="bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 p-2 rounded-lg shrink-0">
                    <FileSpreadsheet size={24} />
                  </div>
                  <div>
                    <p className="font-medium text-slate-900 dark:text-white">formato_whatsremind.xlsx</p>
                    <p className="text-slate-500">Plantilla oficial con las 4 columnas necesarias.</p>
                  </div>
                </div>
                <Button 
                  onClick={handleDownloadTemplate} 
                  className="w-full sm:w-auto shrink-0 bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  <Download size={16} className="mr-2" /> Descargar
                </Button>
              </div>
            </div>

            <hr className="border-slate-200 dark:border-slate-800" />

            {/* Sección Modos de Envío */}
            <div className="space-y-3">
              <h3 className="font-semibold text-slate-900 dark:text-white">
                Modos de Envío
              </h3>
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-lg p-4">
                  <h4 className="font-semibold text-slate-900 dark:text-white mb-2 flex items-center gap-2">
                    <Smartphone size={16} className="text-indigo-500" />
                    Dispositivo vinculado
                  </h4>
                  <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                    Conexión por código QR. <strong>Gratuito</strong>, pero con riesgo de bloqueo si recibes reportes.
                  </p>
                </div>
                <div className="bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-lg p-4">
                  <h4 className="font-semibold text-slate-900 dark:text-white mb-2 flex items-center gap-2">
                    <Cloud size={16} className="text-blue-500" />
                    Cuenta corporativa
                  </h4>
                  <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                    API oficial de Meta. Usa saldo y plantillas, pero es <strong>100% segura</strong> y sin bloqueos.
                  </p>
                </div>
              </div>
            </div>

            <hr className="border-slate-200 dark:border-slate-800" />

            {/* Sección Meta */}
            <div className="space-y-3">
              <h3 className="font-semibold text-slate-900 dark:text-white">
                Cuenta corporativa (API de Meta)
              </h3>
              <p className="text-sm leading-relaxed">
                Para configurar el envío masivo oficial y evitar el riesgo de bloqueos de línea, <br className="hidden sm:block" />
                necesitas habilitar las siguientes herramientas:
              </p>
              <div className="grid sm:grid-cols-2 gap-3 mt-2">
                <a href="https://developers.facebook.com/" target="_blank" rel="noreferrer" className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                  <div className="bg-blue-100 dark:bg-blue-500/20 text-blue-600 p-2 rounded-md shrink-0">
                    <Code size={20} />
                  </div>
                  <div className="text-sm">
                    <p className="font-medium text-slate-900 dark:text-white">Meta for Developers</p>
                    <p className="text-slate-500 text-xs">Para generar el Token y el Identificador.</p>
                  </div>
                </a>
                <a href="https://business.facebook.com/" target="_blank" rel="noreferrer" className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                  <div className="bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 p-2 rounded-md shrink-0">
                    <Briefcase size={20} />
                  </div>
                  <div className="text-sm">
                    <p className="font-medium text-slate-900 dark:text-white">Meta Business Suite</p>
                    <p className="text-slate-500 text-xs">Para crear plantillas y recargar saldo.</p>
                  </div>
                </a>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowHelpModal(false)}>
              Entendido
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Descarga exitosa */}
      <Dialog open={showDownloadSuccessModal} onOpenChange={setShowDownloadSuccessModal}>
        <DialogContent className="sm:max-w-sm text-center">
          <div className="flex flex-col items-center justify-center py-4">
            <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 rounded-full flex items-center justify-center mb-4">
              <CheckCircle2 size={32} />
            </div>
            <DialogTitle className="text-xl mb-2">¡Descarga exitosa!</DialogTitle>
            <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">
              El archivo <strong>formato_whatsremind.xlsx</strong> ha sido guardado en tu computadora. Puedes abrirlo con Excel para comenzar a llenarlo.
            </p>
          </div>
          <DialogFooter className="sm:justify-center">
            <Button className="bg-emerald-600 hover:bg-emerald-700 text-white w-full" onClick={() => setShowDownloadSuccessModal(false)}>
              Entendido
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
