import { useState, useEffect } from 'react';
import { ipc } from '../lib/ipc';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { KeyRound, Phone, FileText, CheckCircle2, AlertCircle, Loader2, Eye, EyeOff, Moon, Sun } from 'lucide-react';
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
  
  // Result Modal State
  const [showResultModal, setShowResultModal] = useState(false);
  const [resultType, setResultType] = useState<'success' | 'error'>('success');
  const [resultMessage, setResultMessage] = useState('');
  
  const [, setRenderTrigger] = useState(0);

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
  }, []);

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
                <Label className="text-base font-medium text-slate-900 dark:text-slate-100">Modo Oscuro</Label>
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

      {/* SECCIÓN: CONEXIÓN META */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold tracking-tight text-slate-900 dark:text-white border-b border-slate-200 dark:border-slate-800 pb-2 mb-4">
          WhatsApp Cloud API
        </h2>

        {/* Credentials card */}
        <Card className="border-slate-200 dark:border-slate-800 shadow-md">
          <CardHeader className="border-b border-slate-100 dark:border-slate-800/50 bg-slate-50/50 dark:bg-slate-900/50 pb-6">
            <CardTitle className="text-xl flex items-center gap-2">
              <KeyRound className="text-emerald-500" />
              Credenciales de API
            </CardTitle>
            <CardDescription>
              Tus credenciales de Meta for Developers.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <div className="space-y-3">
              <Label htmlFor="token" className="text-slate-700 dark:text-slate-300">Token de Acceso</Label>
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
              <p className="text-xs text-slate-500">Token permanente generado en el portal de desarrolladores de Meta.</p>
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
              <Label htmlFor="wabaId" className="text-slate-700 dark:text-slate-300">ID de Cuenta WhatsApp Business (WABA ID)</Label>
              <div className="relative">
                <FileText className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <Input
                  id="wabaId"
                  className="pl-9 h-11 bg-slate-50 focus:bg-white dark:bg-slate-900"
                  value={wabaId}
                  onChange={(e) => setWabaId(e.target.value)}
                />
              </div>
              <p className="text-xs text-slate-500">Requerido para administrar plantillas desde la aplicación.</p>
            </div>

            <Button
              className="w-full h-11 bg-emerald-600 hover:bg-emerald-700 text-white shadow-md transition-all"
              onClick={() => setShowSaveModal(true)}
              disabled={credsLoading || (token === originalToken && phoneId === originalPhoneId && wabaId === originalWabaId)}
            >
              {credsLoading ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Validando...</>
              ) : (
                'Validar y Guardar Credenciales'
              )}
            </Button>
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
              Estás a punto de revelar tu Token de Acceso Permanente.
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
              Validar y Guardar
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
                <><CheckCircle2 className="text-emerald-500" size={24} /> Conexión Exitosa</>
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
