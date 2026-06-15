import { useState, useEffect } from 'react';
import { ipc } from '../lib/ipc';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { KeyRound, Phone, FileText, CheckCircle2, AlertCircle, Loader2, Eye, EyeOff, Moon, Sun, QrCode, Send } from 'lucide-react';
import { formatError, parseMetaError } from '../lib/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../components/ui/dialog';

export function Settings() {
  const [token, setToken] = useState('');
  const [phoneId, setPhoneId] = useState('');
  const [wabaId, setWabaId] = useState('');
  
  const [originalToken, setOriginalToken] = useState('');
  const [originalPhoneId, setOriginalPhoneId] = useState('');
  const [originalWabaId, setOriginalWabaId] = useState('');
  
  // Security toggles & modals
  const [showToken, setShowToken] = useState(false);
  const [showRevealModal, setShowRevealModal] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  
  // Sidecar modals
  const [showConnectModal, setShowConnectModal] = useState(false);
  const [showDisconnectModal, setShowDisconnectModal] = useState(false);
  const [showUnlinkModal, setShowUnlinkModal] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);
  const [isSidecarStarting, setIsSidecarStarting] = useState(false);

  const [credsLoading, setCredsLoading] = useState(false);
  const [showResultModal, setShowResultModal] = useState(false);
  const [resultType, setResultType] = useState<'success' | 'error'>('success');
  const [resultMessage, setResultMessage] = useState('');

  const [engine, setEngine] = useState('meta');
  const [isSidecarRunning, setIsSidecarRunning] = useState(false);
  const [sidecarConnected, setSidecarConnected] = useState(false);
  const [sidecarQr, setSidecarQr] = useState<string | null>(null);
  
  const [, setRenderTrigger] = useState(0);

  useEffect(() => {
    // Escuchar si el tema cambia desde la barra superior (Layout) para actualizar este botón
    const handleThemeChange = () => setRenderTrigger(prev => prev + 1);
    window.addEventListener('theme-changed', handleThemeChange);
    return () => window.removeEventListener('theme-changed', handleThemeChange);
  }, []);

  useEffect(() => {
    ipc.getCredentials().then((creds) => {
      if (creds) {
        setToken(creds.token);
        setPhoneId(creds.phone_id);
        setWabaId(creds.waba_id);
        setOriginalToken(creds.token);
        setOriginalPhoneId(creds.phone_id);
        setOriginalWabaId(creds.waba_id);
      }
    }).catch(() => {/* ignore if fails or doesn't exist */});

    ipc.getEngine().then((eng) => {
      setEngine(eng);
      if (eng === 'unofficial') {
        fetchSidecarStatus();
      }
    }).catch(() => {});
  }, []);

  const fetchSidecarStatus = async () => {
    try {
      const status = await ipc.getSidecarStatus();
      setIsSidecarRunning(true);
      setSidecarConnected(status.connected);
      setSidecarQr(status.qr);
      setIsSidecarStarting(false);
      if (status.connected) {
        setShowQrModal(false);
      }
    } catch {
      setIsSidecarRunning(false);
      setSidecarConnected(false);
      setSidecarQr(null);
    }
  };

  useEffect(() => {
    if (engine === 'unofficial') {
      const interval = setInterval(fetchSidecarStatus, 2000);
      return () => clearInterval(interval);
    }
  }, [engine]);

  const handleEngineChange = async (newEngine: string) => {
    try {
      await ipc.setEngine(newEngine);
      setEngine(newEngine);
      if (newEngine === 'unofficial') {
        fetchSidecarStatus();
      }
      window.dispatchEvent(new Event('credentials-updated'));
    } catch (err: any) {
      setResultType('error');
      setResultMessage(formatError(err));
      setShowResultModal(true);
    }
  };

  const handleRevealConfirm = () => {
    setShowToken(true);
    setShowRevealModal(false);
  };

  const handleConnectConfirm = async () => {
    setShowConnectModal(false);
    setIsSidecarStarting(true);
    try {
      await ipc.startSidecar();
      window.dispatchEvent(new Event('credentials-updated'));
      setTimeout(() => {
        setIsSidecarStarting(prev => {
          if (prev) return false;
          return prev;
        });
      }, 10000);
    } catch (err: any) {
      setResultType('error');
      setResultMessage(formatError(err));
      setShowResultModal(true);
      setIsSidecarStarting(false);
    }
  };

  const handleDisconnectConfirm = async () => {
    setShowDisconnectModal(false);
    try {
      await ipc.stopSidecar();
      await fetchSidecarStatus();
      window.dispatchEvent(new Event('credentials-updated'));
    } catch (err: any) {
      setResultType('error');
      setResultMessage(formatError(err));
      setShowResultModal(true);
    }
  };

  const handleUnlinkConfirm = async () => {
    setShowUnlinkModal(false);
    try {
      await ipc.logoutSidecar();
      // wait a bit for baileys to process logout and restart
      setTimeout(fetchSidecarStatus, 1500);
      setResultType('success');
      setResultMessage('Teléfono desvinculado correctamente. Se generará un nuevo QR en breve.');
      setShowResultModal(true);
    } catch (err: any) {
      setResultType('error');
      setResultMessage(formatError(err));
      setShowResultModal(true);
    }
  };

  const handleSaveConfirm = async () => {
    setShowSaveModal(false);
    if (!token || !phoneId || !wabaId) {
      setResultType('error');
      setResultMessage('Ingresa todos los valores (Token, Teléfono y WABA ID) para actualizar.');
      setShowResultModal(true);
      return;
    }
    setCredsLoading(true);
    try {
      await ipc.setupWizardValidateAndSave(token, phoneId, wabaId);
      setOriginalToken(token);
      setOriginalPhoneId(phoneId);
      setOriginalWabaId(wabaId);
      setShowToken(false); // Hide token after saving automatically for safety
      window.dispatchEvent(new Event('credentials-updated'));
      setResultType('success');
      setResultMessage('Credenciales validadas y actualizadas correctamente.');
      setShowResultModal(true);
    } catch (err: unknown) {
      setResultType('error');
      setResultMessage(parseMetaError(formatError(err)));
      setShowResultModal(true);
    } finally {
      setCredsLoading(false);
    }
  };

  return (
    <div className="space-y-10 max-w-2xl mx-auto mt-8 relative pb-12">
      {/* SECCIÓN: APARIENCIA */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold tracking-tight text-slate-900 dark:text-white border-b border-slate-200 dark:border-slate-800 pb-2 mb-4">
          Apariencia
        </h2>
        
        <Card className="border-slate-200 dark:border-slate-800 shadow-md">
          <CardHeader className="border-b border-slate-100 dark:border-slate-800/50 bg-slate-50/50 dark:bg-slate-900/50 pb-6">
            <CardTitle className="text-xl flex items-center gap-2">
              <Moon className="text-emerald-500" />
              Apariencia
            </CardTitle>
            <CardDescription>
              Personaliza el tema visual de la aplicación.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-base font-medium text-slate-900 dark:text-slate-100">Modo oscuro</Label>
                <p className="text-sm text-slate-500">Cambia entre el tema claro y oscuro.</p>
              </div>
              <Button
                variant="outline"
                onClick={() => {
                  const isDark = document.documentElement.classList.contains('dark');
                  if (isDark) {
                    document.documentElement.classList.remove('dark');
                    localStorage.theme = 'light';
                  } else {
                    document.documentElement.classList.add('dark');
                    localStorage.theme = 'dark';
                  }
                  window.dispatchEvent(new Event('theme-changed'));
                  setRenderTrigger(prev => prev + 1);
                }}
                className="w-12 h-12 rounded-full p-0 flex items-center justify-center bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border-none shadow-sm transition-colors"
              >
                {document.documentElement.classList.contains('dark') ? <Sun size={20} className="text-amber-500" /> : <Moon size={20} className="text-slate-600" />}
              </Button>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* SECCIÓN: MOTOR DE ENVÍO */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold tracking-tight text-slate-900 dark:text-white border-b border-slate-200 dark:border-slate-800 pb-2 mb-4">
          Motor de Envío
        </h2>
        
        <Card className="border-slate-200 dark:border-slate-800 shadow-md">
          <CardHeader className="border-b border-slate-100 dark:border-slate-800/50 bg-slate-50/50 dark:bg-slate-900/50 pb-6">
            <CardTitle className="text-xl flex items-center gap-2">
              <Send className="text-emerald-500" />
              Modo de envío
            </CardTitle>
            <CardDescription>
              Elige entre usar una Cuenta corporativa (Meta) o un Dispositivo vinculado mediante código QR.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <div className="flex gap-4">
              <Button
                variant={engine === 'meta' ? 'default' : 'outline'}
                className={engine === 'meta' ? 'bg-emerald-600 hover:bg-emerald-700' : ''}
                onClick={() => handleEngineChange('meta')}
              >
                Cuenta corporativa (Meta)
              </Button>
              <Button
                variant={engine === 'unofficial' ? 'default' : 'outline'}
                className={engine === 'unofficial' ? 'bg-emerald-600 hover:bg-emerald-700' : ''}
                onClick={() => handleEngineChange('unofficial')}
              >
                Dispositivo vinculado (QR)
              </Button>
            </div>

            {engine === 'unofficial' && (
              <div className="space-y-6 mt-6">
                <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 text-amber-800 dark:text-amber-400 p-4 rounded-lg flex gap-3 text-sm">
                  <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                  <div>
                    <strong className="block font-bold mb-2">Aviso sobre el Dispositivo vinculado</strong>
                    <div className="opacity-90 leading-relaxed space-y-2">
                      <p><span className="font-bold">Ventaja:</span> Sin costos por mensaje ni revisión de plantillas.</p>
                      <p><span className="font-bold">Riesgo:</span> Aunque el sistema aplica pausas automáticas para simular un envío manual, enviar mensajes masivos siempre conlleva riesgo de suspensión de línea, especialmente si los destinatarios no te tienen en sus contactos o reportan el mensaje.</p>
                      <p className="pt-1 font-medium">Por favor, usa esta función con prudencia.</p>
                    </div>
                  </div>
                </div>

                <div className="p-5 border border-slate-200 dark:border-slate-800 rounded-lg bg-slate-50/30 dark:bg-slate-900/30">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 border-b border-slate-100 dark:border-slate-800/50 pb-4">
                  <h3 className="text-lg font-medium flex items-center gap-2">
                    <QrCode className={sidecarConnected ? "text-emerald-500" : isSidecarRunning ? "text-amber-500" : "text-slate-400"} />
                    Estado de Conexión
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {sidecarConnected && (
                      <Button
                        variant="outline"
                        className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200 dark:hover:bg-red-900/20 dark:border-red-900/50"
                        onClick={() => setShowUnlinkModal(true)}
                        disabled={isSidecarStarting}
                      >
                        Desvincular
                      </Button>
                    )}
                    <Button
                      variant={isSidecarRunning ? "outline" : "default"}
                      className={!isSidecarRunning ? "bg-emerald-600 hover:bg-emerald-700 text-white" : ""}
                      onClick={() => isSidecarRunning ? setShowDisconnectModal(true) : setShowConnectModal(true)}
                      disabled={isSidecarStarting}
                    >
                      {isSidecarStarting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                      {isSidecarRunning ? "Detener servicio" : "Iniciar servicio"}
                    </Button>
                  </div>
                </div>
                
                {sidecarConnected ? (
                  <div className="flex items-center gap-3 text-emerald-600 dark:text-emerald-400 font-medium bg-emerald-50 dark:bg-emerald-500/10 p-4 rounded-lg border border-emerald-100 dark:border-emerald-500/20">
                    <div className="relative flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                    </div>
                    WhatsApp conectado y listo para enviar.
                  </div>
                ) : isSidecarRunning ? (
                  sidecarQr ? (
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-amber-50 dark:bg-amber-500/10 p-4 rounded-lg border border-amber-100 dark:border-amber-500/20">
                      <div className="flex items-center gap-3 text-amber-700 dark:text-amber-400 font-medium">
                        <div className="relative flex h-3 w-3">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
                        </div>
                        Servicio en espera de vinculación.
                      </div>
                      <Button 
                        className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-md w-full sm:w-auto"
                        onClick={() => setShowQrModal(true)}
                      >
                        <QrCode className="w-4 h-4 mr-2" />
                        Mostrar código QR
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3 text-amber-700 dark:text-amber-400 font-medium bg-amber-50 dark:bg-amber-500/10 p-4 rounded-lg border border-amber-100 dark:border-amber-500/20">
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Iniciando servicio y generando código QR...
                    </div>
                  )
                ) : (
                  <div className="flex items-center gap-2 text-slate-500">
                    {isSidecarStarting ? (
                      <><Loader2 className="w-5 h-5 animate-spin" /> Iniciando servicio de WhatsApp...</>
                    ) : (
                      "El servicio está detenido. Pulsa 'Iniciar servicio' para conectar WhatsApp."
                    )}
                  </div>
                )}
              </div>
              </div>
            )}

            {engine === 'meta' && (
              <div className="mt-6 p-5 border border-slate-200 dark:border-slate-800 rounded-lg space-y-6">
                <div>
                  <h3 className="text-lg font-medium flex items-center gap-2 mb-1">
                    <KeyRound className="text-emerald-500" />
                    Credenciales de API
                  </h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Tus credenciales de Meta for Developers.</p>
                </div>

                <div className="space-y-4">
                  <div className="space-y-3">
                    <Label htmlFor="wabaId" className="text-slate-700 dark:text-slate-300">ID de cuenta WhatsApp Business (WABA ID)</Label>
                    <div className="relative">
                      <FileText className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                      <Input
                        id="wabaId"
                        className="pl-9 h-11 bg-slate-50 focus:bg-white dark:bg-slate-900"
                        value={wabaId}
                        onChange={(e) => setWabaId(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="space-y-3">
                    <Label htmlFor="phoneId" className="text-slate-700 dark:text-slate-300">ID del Número de Teléfono</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                      <Input
                        id="phoneId"
                        className="pl-9 h-11 bg-slate-50 focus:bg-white dark:bg-slate-900"
                        value={phoneId}
                        onChange={(e) => setPhoneId(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="space-y-3">
                    <Label htmlFor="token" className="text-slate-700 dark:text-slate-300">Token de acceso permanente</Label>
                    <div className="relative">
                      <KeyRound className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                      <Input
                        id="token"
                        type={showToken ? "text" : "password"}
                        className="pl-9 pr-10 h-11 bg-slate-50 focus:bg-white dark:bg-slate-900"
                        value={token}
                        onChange={(e) => setToken(e.target.value)}
                        readOnly={!showToken}
                      />
                      <button
                        type="button"
                        className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 transition-colors"
                        onClick={() => showToken ? setShowToken(false) : setShowRevealModal(true)}
                      >
                        {showToken ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>

                  <Button
                    className="w-full h-11 bg-emerald-600 hover:bg-emerald-700 text-white shadow-md transition-all mt-2"
                    onClick={() => setShowSaveModal(true)}
                    disabled={credsLoading || (token === originalToken && phoneId === originalPhoneId && wabaId === originalWabaId)}
                  >
                    {credsLoading ? (
                      <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Validando...</>
                    ) : (
                      'Validar y guardar Credenciales'
                    )}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      {/* Reveal Modal */}
      <Dialog open={showRevealModal} onOpenChange={setShowRevealModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertCircle size={20} />
              Advertencia de Seguridad
            </DialogTitle>
            <DialogDescription className="pt-3 pb-2 text-base">
              Estás a punto de revelar tu Token de acceso permanente.
              <br /><br />
              <strong>No compartas esta información con nadie.</strong> Si alguien obtiene este token, podrá enviar mensajes en nombre de tu número de WhatsApp y tu cuenta podría ser suspendida por Meta.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4 flex gap-2">
            <Button variant="outline" onClick={() => setShowRevealModal(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleRevealConfirm}>
              Sí, mostrar Token
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Save Modal */}
      <Dialog open={showSaveModal} onOpenChange={setShowSaveModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar cambios</DialogTitle>
            <DialogDescription className="pt-3 pb-2 text-base">
              ¿Estás seguro que deseas actualizar las credenciales?
              <br /><br />
              Al presionar continuar, la aplicación realizará una petición de validación a los servidores de Meta. Si los datos son inválidos, no podrás enviar mensajes.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4 flex gap-2">
            <Button variant="outline" onClick={() => setShowSaveModal(false)}>
              Cancelar
            </Button>
            <Button className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={handleSaveConfirm}>
              Validar y guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Connect Sidecar Modal */}
      <Dialog open={showConnectModal} onOpenChange={setShowConnectModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Iniciar servicio de WhatsApp</DialogTitle>
            <DialogDescription className="pt-3 pb-2 text-base">
              ¿Estás seguro de que deseas iniciar la conexión por Dispositivo vinculado?
              <br /><br />
              Esto iniciará un proceso interno para enlazar tu WhatsApp mediante código QR. Asegúrate de tener tu teléfono a la mano.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4 flex gap-2">
            <Button variant="outline" onClick={() => setShowConnectModal(false)}>
              Cancelar
            </Button>
            <Button className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={handleConnectConfirm}>
              Sí, conectar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Disconnect Sidecar Modal */}
      <Dialog open={showDisconnectModal} onOpenChange={setShowDisconnectModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertCircle size={20} />
              Apagar motor de WhatsApp
            </DialogTitle>
            <DialogDescription className="pt-3 pb-2 text-base">
              ¿Estás seguro de que deseas apagar el motor?
              <br /><br />
              Si lo apagas, se detendrán las conexiones actuales y no podrás enviar mensajes hasta que vuelvas a conectarlo. Esto <strong>no desvincula</strong> tu teléfono, solo apaga el servidor local.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4 flex gap-2">
            <Button variant="outline" onClick={() => setShowDisconnectModal(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleDisconnectConfirm}>
              Sí, apagar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Unlink Sidecar Modal */}
      <Dialog open={showUnlinkModal} onOpenChange={setShowUnlinkModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertCircle size={20} />
              Desvincular teléfono
            </DialogTitle>
            <DialogDescription className="pt-3 pb-2 text-base">
              ¿Estás seguro de que deseas desvincular el teléfono actual?
              <br /><br />
              Esto cerrará la sesión de WhatsApp Web en el servidor local. Tendrás que escanear un nuevo código QR para volver a conectar.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4 flex gap-2">
            <Button variant="outline" onClick={() => setShowUnlinkModal(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleUnlinkConfirm}>
              Sí, desvincular
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Result Modal */}
      <Dialog open={showResultModal} onOpenChange={setShowResultModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {resultType === 'success' ? (
                <><CheckCircle2 className="text-emerald-500" size={24} /> Conexión exitosa</>
              ) : (
                <><AlertCircle className="text-red-500" size={24} /> Error de Conexión</>
              )}
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-slate-600 dark:text-slate-300">
              {resultMessage}
            </p>
          </div>
          <DialogFooter>
            <Button 
              className={resultType === 'success' ? "bg-emerald-600 hover:bg-emerald-700 text-white" : ""}
              variant={resultType === 'error' ? "outline" : "default"}
              onClick={() => setShowResultModal(false)}
            >
              Aceptar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={showQrModal} onOpenChange={setShowQrModal}>
        <DialogContent className="sm:max-w-md flex flex-col items-center">
          <DialogHeader>
            <DialogTitle className="text-center">Vincular Dispositivo</DialogTitle>
            <DialogDescription className="text-center">
              Abre WhatsApp en tu teléfono, toca el menú y selecciona "Dispositivos vinculados", luego escanea este código.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center justify-center p-6 min-h-[300px]">
            {sidecarQr ? (
              <img 
                src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(sidecarQr)}`} 
                alt="QR Code" 
                className="w-64 h-64 border-4 border-white rounded-lg shadow-sm" 
              />
            ) : (
              <div className="flex flex-col items-center gap-4 text-emerald-600">
                <Loader2 className="h-10 w-10 animate-spin" />
                <span className="text-sm font-medium text-slate-500">Iniciando servicio y generando código QR...</span>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
