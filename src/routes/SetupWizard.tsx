import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ipc } from '../lib/ipc';
import { KeyRound, Phone, CheckCircle2, AlertCircle, Loader2, Briefcase } from 'lucide-react';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { Label } from '../components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../components/ui/dialog';
import { formatError } from '../lib/utils';
import logo from '../assets/logo.webp';
import { useEffect } from 'react';


export function SetupWizard() {
  const navigate = useNavigate();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [token, setToken] = useState('');
  const [phoneId, setPhoneId] = useState('');
  const [wabaId, setWabaId] = useState('');
  const [error, setError] = useState<string | null>(null);

  const [showQrModal, setShowQrModal] = useState(false);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [isQrConnected, setIsQrConnected] = useState(false);
  const [isStarting, setIsStarting] = useState(false);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (showQrModal && !isQrConnected) {
      interval = setInterval(async () => {
        try {
          const status = await ipc.getSidecarStatus();
          setQrCode(status.qr);
          if (status.connected) {
            setIsQrConnected(true);
            setShowQrModal(false);
            localStorage.setItem('setupCompleted', 'true');
            navigate('/');
          }
        } catch (e) {
          console.error(e);
        }
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [showQrModal, isQrConnected, navigate]);

  const handleValidate = async () => {
    if (!token || !phoneId || !wabaId) {
      setError('Por favor completa todos los campos.');
      return;
    }

    setError(null);
    setStep(2);

    try {
      await ipc.setupWizardValidateAndSave(token, phoneId, wabaId);
      setStep(3);
    } catch (err: unknown) {
      setError(formatError(err));
      setStep(1);
    }
  };

  const handleFinish = () => {
    navigate('/');
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-slate-50 dark:bg-slate-950 relative overflow-hidden font-sans">
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-emerald-500/20 rounded-full blur-[100px]" />
      <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-teal-500/20 rounded-full blur-[100px]" />

      <div className="max-w-md w-full bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl p-8 z-10">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-white dark:bg-slate-800 shadow-lg mb-4 border border-emerald-100 dark:border-slate-700 overflow-hidden p-2">
            <img src={logo} alt="WhatsRemind Logo" className="w-full h-full object-contain" />
          </div>
          <div className="flex flex-col gap-1.5">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Bienvenido a WhatsRemind</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">Selecciona el motor de envío y configura tu conexión</p>
          </div>
        </div>

        {step === 1 && (
          <div className="space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <Tabs defaultValue="meta" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="meta">API Oficial</TabsTrigger>
                <TabsTrigger value="qr">Versión QR</TabsTrigger>
              </TabsList>

              <TabsContent value="meta" className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="wabaId" className="text-slate-700 dark:text-slate-300">ID de Cuenta WhatsApp Business (WABA ID)</Label>
                  <div className="relative">
                    <Briefcase className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                    <Input
                      id="wabaId"
                      placeholder="10234567890"
                      className="pl-9 h-11"
                      value={wabaId}
                      onChange={(e) => setWabaId(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phoneId" className="text-slate-700 dark:text-slate-300">ID del Número de Teléfono</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                    <Input
                      id="phoneId"
                      placeholder="10123456789"
                      className="pl-9 h-11"
                      value={phoneId}
                      onChange={(e) => setPhoneId(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="token" className="text-slate-700 dark:text-slate-300">Token de Acceso</Label>
                  <div className="relative">
                    <KeyRound className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                    <Input
                      id="token"
                      type="password"
                      placeholder="EAAL..."
                      className="pl-9 h-11"
                      value={token}
                      onChange={(e) => setToken(e.target.value)}
                    />
                  </div>
                </div>

                {error && (
                  <div className="flex items-center gap-2 text-red-600 bg-red-50 dark:bg-red-500/10 dark:text-red-400 p-3 rounded-lg text-sm">
                    <AlertCircle size={16} />
                    <p>{error}</p>
                  </div>
                )}

                <Button
                  className="w-full h-11 bg-emerald-600 hover:bg-emerald-700 text-white shadow-md transition-all mt-4"
                  onClick={handleValidate}
                >
                  Validar y Guardar
                </Button>
              </TabsContent>

              <TabsContent value="qr" className="space-y-4">
                <div className="bg-slate-100 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-200 dark:border-slate-700 text-left">
                  <p className="text-sm text-slate-600 dark:text-slate-300 mb-3">
                    La versión no oficial te permite vincular tu número personal o de negocios simplemente escaneando un código QR, igual que WhatsApp Web.
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    No requiere configuración de Meta ni verificaciones comerciales.
                  </p>
                </div>
                <Button
                  className="w-full h-11 bg-emerald-600 hover:bg-emerald-700 text-white shadow-md transition-all mt-4"
                  disabled={isStarting}
                  onClick={async () => {
                    setIsStarting(true);
                    try {
                      await ipc.setEngine('unofficial');
                      await ipc.startSidecar();
                      setShowQrModal(true);
                    } catch (err: any) {
                      setError(formatError(err));
                    } finally {
                      setIsStarting(false);
                    }
                  }}
                >
                  {isStarting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                  {isStarting ? "Encendiendo servicio..." : "Continuar y Escanear QR"}
                </Button>
              </TabsContent>
            </Tabs>

            <Button
              variant="ghost"
              className="w-full h-11 text-slate-500 mt-2"
              onClick={() => {
                localStorage.setItem('setupCompleted', 'true');
                navigate('/');
              }}
            >
              Vincular luego
            </Button>
          </div>
        )}

        {step === 2 && (
          <div className="flex flex-col items-center justify-center py-12 animate-in fade-in zoom-in-95 duration-300">
            <Loader2 className="h-12 w-12 text-emerald-600 animate-spin mb-4" />
            <h2 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-white">Validando Credenciales...</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 text-center">
              Estamos conectando con los servidores de Meta.
            </p>
          </div>
        )}

        {step === 3 && (
          <div className="flex flex-col items-center justify-center py-8 animate-in fade-in zoom-in-95 duration-500">
            <div className="w-20 h-20 bg-green-100 dark:bg-green-500/20 text-green-600 rounded-full flex items-center justify-center mb-6">
              <CheckCircle2 size={40} />
            </div>
            <h2 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-white mb-2">¡Todo Listo!</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 text-center mb-2">
              Tu conexión con WhatsApp ha sido verificada.
            </p>
            <p className="text-xs text-slate-400 dark:text-slate-500 text-center mb-8">
              Serás redirigido al panel principal.
            </p>
            <Button
              className="w-full h-11 bg-emerald-600 hover:bg-emerald-700 text-white shadow-md transition-all"
              onClick={() => {
                localStorage.setItem('setupCompleted', 'true');
                handleFinish();
              }}
            >
              Ir al Dashboard
            </Button>
          </div>
        )}
      </div>

      <Dialog open={showQrModal} onOpenChange={setShowQrModal}>
        <DialogContent className="sm:max-w-md flex flex-col items-center">
          <DialogHeader>
            <DialogTitle className="text-center">Vincular Dispositivo</DialogTitle>
            <DialogDescription className="text-center">
              Abre WhatsApp en tu teléfono, toca el menú y selecciona "Dispositivos vinculados", luego escanea este código.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center justify-center p-6 min-h-[300px]">
            {qrCode ? (
              <img 
                src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(qrCode)}`} 
                alt="QR Code" 
                className="w-64 h-64 border-4 border-white rounded-lg shadow-sm" 
              />
            ) : (
              <div className="flex flex-col items-center gap-4 text-emerald-600">
                <Loader2 className="h-10 w-10 animate-spin" />
                <span className="text-sm font-medium text-slate-500">Generando código QR...</span>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
