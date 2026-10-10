import { useState, useEffect } from 'react';
import { ipc } from '../lib/ipc';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { KeyRound, Phone, FileText, CheckCircle2, AlertCircle, Loader2, Eye, EyeOff, Moon, Sun, Send } from 'lucide-react';
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
  
  const [credsLoading, setCredsLoading] = useState(false);
  const [showResultModal, setShowResultModal] = useState(false);
  const [resultType, setResultType] = useState<'success' | 'error'>('success');
  const [resultMessage, setResultMessage] = useState('');

  const [engine, setEngine] = useState('meta');
  const [ycloudApiKey, setYcloudApiKey] = useState('');
  const [ycloudPhone, setYcloudPhone] = useState('');
  const [showYcloudKey, setShowYcloudKey] = useState(false);
  
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

    ipc.getYCloudConfig?.().then((cfg: any) => {
      if (cfg) {
        if (cfg.ycloudApiKey) setYcloudApiKey(cfg.ycloudApiKey);
        if (cfg.ycloudPhone) setYcloudPhone(cfg.ycloudPhone);
      }
    }).catch(() => {});

    ipc.getEngine().then((eng) => {
      setEngine(eng);
    }).catch(() => {});
  }, []);

  const handleEngineChange = async (newEngine: string) => {
    try {
      await ipc.setEngine(newEngine);
      setEngine(newEngine);
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
              Elige entre Meta Cloud API, YCloud API o Evolution API.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <div className="flex flex-wrap gap-3">
              <Button
                variant={engine === 'meta' ? 'default' : 'outline'}
                className={engine === 'meta' ? 'bg-emerald-600 hover:bg-emerald-700' : ''}
                onClick={() => handleEngineChange('meta')}
              >
                Meta Cloud API
              </Button>
              <Button
                variant={engine === 'ycloud' ? 'default' : 'outline'}
                className={engine === 'ycloud' ? 'bg-emerald-600 hover:bg-emerald-700' : ''}
                onClick={() => handleEngineChange('ycloud')}
              >
                YCloud API
              </Button>
              <Button
                variant={engine === 'evolution' ? 'default' : 'outline'}
                className={engine === 'evolution' ? 'bg-amber-600 hover:bg-amber-700' : ''}
                onClick={() => {
                  alert("⚠️ Evolution API se encuentra actualmente en desarrollo.");
                  handleEngineChange('evolution');
                }}
              >
                Evolution API (En desarrollo)
              </Button>
            </div>

            {engine === 'evolution' && (
              <div className="p-5 border border-amber-200 dark:border-amber-800 rounded-lg bg-amber-50/50 dark:bg-amber-900/20 space-y-3 mt-4">
                <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 font-semibold text-base">
                  <AlertCircle className="w-5 h-5 shrink-0" />
                  Evolution API - En desarrollo
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                  Esta integración no oficial reemplazará la antigua sidecar de Baileys. Al enviar mensajes con esta opción seleccionada, el sistema mostrará un aviso de advertencia.
                </p>
              </div>
            )}

            {engine === 'ycloud' && (
              <div className="mt-6 p-5 border border-slate-200 dark:border-slate-800 rounded-lg space-y-6">
                <div>
                  <h3 className="text-lg font-medium flex items-center gap-2 mb-1">
                    <KeyRound className="text-emerald-500" />
                    Credenciales de YCloud API
                  </h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Configura tu API Key de YCloud y el número de WhatsApp registrado.</p>
                </div>

                <div className="space-y-4">
                  <div className="space-y-3">
                    <Label htmlFor="ycloudApiKey" className="text-slate-700 dark:text-slate-300">YCloud API Key</Label>
                    <div className="relative">
                      <KeyRound className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                      <Input
                        id="ycloudApiKey"
                        type={showYcloudKey ? "text" : "password"}
                        className="pl-9 pr-10 h-11 bg-slate-50 focus:bg-white dark:bg-slate-900"
                        placeholder="tu_api_key_de_ycloud"
                        value={ycloudApiKey}
                        onChange={(e) => setYcloudApiKey(e.target.value)}
                      />
                      <button
                        type="button"
                        onClick={() => setShowYcloudKey(!showYcloudKey)}
                        className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                      >
                        {showYcloudKey ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <Label htmlFor="ycloudPhone" className="text-slate-700 dark:text-slate-300">Número de teléfono emisor (formato internacional E.164)</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                      <Input
                        id="ycloudPhone"
                        placeholder="+584248167536"
                        className="pl-9 h-11 bg-slate-50 focus:bg-white dark:bg-slate-900"
                        value={ycloudPhone}
                        onChange={(e) => setYcloudPhone(e.target.value)}
                      />
                    </div>
                    <p className="text-xs text-slate-400">Debe incluir el código de país y el prefijo + (ej. +584248167536).</p>
                  </div>

                  <div className="pt-2 flex justify-end">
                    <Button
                      onClick={async () => {
                        if (!ycloudApiKey || !ycloudPhone) {
                          setResultType('error');
                          setResultMessage('Ingresa la API Key y el Teléfono emisor de YCloud.');
                          setShowResultModal(true);
                          return;
                        }
                        setCredsLoading(true);
                        try {
                          await ipc.saveYCloudConfig(ycloudApiKey, ycloudPhone);
                          setResultType('success');
                          setResultMessage('Credenciales de YCloud guardadas correctamente.');
                          setShowResultModal(true);
                        } catch (err: any) {
                          setResultType('error');
                          setResultMessage(formatError(err));
                          setShowResultModal(true);
                        } finally {
                          setCredsLoading(false);
                        }
                      }}
                      disabled={credsLoading}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white"
                    >
                      {credsLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                      Guardar credenciales YCloud
                    </Button>
                  </div>
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
                        readOnly={!showToken && token.length > 0}
                      />
                      {token.length > 0 && (
                        <button
                          type="button"
                          className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 transition-colors"
                          onClick={() => showToken ? setShowToken(false) : setShowRevealModal(true)}
                        >
                          {showToken ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      )}
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
    </div>
  );
}
