import { useState, useEffect, useCallback } from 'react';
import { ipc } from '../lib/ipc';
import { formatError, parseMetaError } from '../lib/utils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { AppearanceCard } from '../components/AppearanceCard';
import { EngineSelector } from '../components/EngineSelector';
import { GowaEngineConfig } from '../components/GowaEngineConfig';
import { NumbersManagerModal } from '../components/NumbersManagerModal';
import { UnofficialQrModal } from '../components/UnofficialQrModal';
import { MetaCredentialsForm, type MetaCredentials } from '../components/MetaCredentialsForm';
import { YCloudCredentialsForm, type YCloudCredentials } from '../components/YCloudCredentialsForm';
import { ConfirmModal } from '../components/ConfirmModal';
import { ResultModal } from '../components/ResultModal';
import { useResultModal } from '../hooks/useResultModal';
import { Phone } from 'lucide-react';

const EMPTY_CREDENTIALS: MetaCredentials = { wabaId: '', phoneId: '', token: '' };

export function Settings() {
  const [meta, setMeta] = useState<MetaCredentials>(EMPTY_CREDENTIALS);
  const [originalMeta, setOriginalMeta] = useState<MetaCredentials>(EMPTY_CREDENTIALS);
  const [ycloud, setYcloud] = useState<YCloudCredentials>({ apiKey: '', phone: '' });
  const [engine, setEngine] = useState('meta');
  const [showToken, setShowToken] = useState(false);
  const [credsLoading, setCredsLoading] = useState(false);
  const [showRevealModal, setShowRevealModal] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [isNumbersModalOpen, setIsNumbersModalOpen] = useState(false);
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const resultModal = useResultModal();

  const loadConfig = useCallback(() => {
    ipc.getCredentials().then((creds) => {
      if (creds) {
        const loaded = {
          wabaId: creds.waba_id ?? '',
          phoneId: creds.phone_id ?? '',
          token: creds.token ?? '',
        };
        setMeta(loaded);
        setOriginalMeta(loaded);
      }
    }).catch(() => { /* ignore if fails or does not exist */ });

    ipc.getYCloudConfig?.().then((cfg: { ycloudApiKey?: string; ycloudPhone?: string }) => {
      if (cfg) {
        if (cfg.ycloudApiKey) setYcloud((prev) => ({ ...prev, apiKey: cfg.ycloudApiKey! }));
        if (cfg.ycloudPhone) setYcloud((prev) => ({ ...prev, phone: cfg.ycloudPhone! }));
      }
    }).catch(() => {});

    ipc.getEngine().then(setEngine).catch(() => {});
  }, []);

  useEffect(() => {
    loadConfig();
    window.addEventListener('credentials-updated', loadConfig);
    return () => {
      window.removeEventListener('credentials-updated', loadConfig);
    };
  }, [loadConfig]);

  const handleEngineChange = async (newEngine: string) => {
    try {
      await ipc.setEngine(newEngine);
      setEngine(newEngine);
      window.dispatchEvent(new Event('credentials-updated'));
    } catch (err: unknown) {
      resultModal.showError(formatError(err));
    }
  };

  const handleMetaChange = (field: keyof MetaCredentials, value: string) => {
    setMeta((prev) => ({ ...prev, [field]: value }));
  };

  const handleYCloudChange = (field: keyof YCloudCredentials, value: string) => {
    setYcloud((prev) => ({ ...prev, [field]: value }));
  };

  const handleSaveMeta = async () => {
    setShowSaveModal(false);
    if (!meta.token || !meta.phoneId || !meta.wabaId) {
      resultModal.showError('Ingresa todos los valores (Token, Teléfono y WABA ID) para actualizar.');
      return;
    }

    setCredsLoading(true);
    try {
      await ipc.setupWizardValidateAndSave(meta.token, meta.phoneId, meta.wabaId);
      setOriginalMeta(meta);
      setShowToken(false);
      window.dispatchEvent(new Event('credentials-updated'));
      resultModal.showSuccess('Credenciales validadas y actualizadas correctamente.');
    } catch (err: unknown) {
      resultModal.showError(parseMetaError(formatError(err)));
    } finally {
      setCredsLoading(false);
    }
  };

  const handleSaveYCloud = async () => {
    if (!ycloud.apiKey || !ycloud.phone) {
      resultModal.showError('Ingresa la API Key y el Teléfono emisor de YCloud.');
      return;
    }

    setCredsLoading(true);
    try {
      await ipc.saveYCloudConfig(ycloud.apiKey, ycloud.phone);
      resultModal.showSuccess('Credenciales de YCloud guardadas correctamente.');
    } catch (err: unknown) {
      resultModal.showError(formatError(err));
    } finally {
      setCredsLoading(false);
    }
  };

  return (
    <div className="space-y-10 max-w-2xl mx-auto mt-8 relative pb-12">
      <section className="space-y-4">
        <h2 className="text-lg font-semibold tracking-tight text-slate-900 dark:text-white border-b border-slate-200 dark:border-slate-800 pb-2 mb-4">
          Apariencia
        </h2>
        <AppearanceCard />
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold tracking-tight text-slate-900 dark:text-white border-b border-slate-200 dark:border-slate-800 pb-2 mb-4">
          Motor de envío
        </h2>

        <Card className="border-slate-200 dark:border-slate-800 shadow-md">
          <CardHeader className="border-b border-slate-100 dark:border-slate-800/50 bg-slate-50/50 dark:bg-slate-900/50 pb-6">
            <CardTitle className="text-xl flex items-center gap-2">
              Motor de envío
            </CardTitle>
            <CardDescription>
              Elige entre Meta Cloud API, YCloud API o GOWA (WhatsApp Web).
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <EngineSelector engine={engine} onChange={handleEngineChange} />

            {engine === 'ycloud' && (
              <div className="space-y-4">
                <YCloudCredentialsForm
                  values={ycloud}
                  loading={credsLoading}
                  onChange={handleYCloudChange}
                  onSave={handleSaveYCloud}
                />
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <span className="text-xs text-muted-foreground">
                    ¿Usas múltiples números emisores de YCloud?
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setIsNumbersModalOpen(true)}
                    className="text-xs w-full sm:w-auto"
                  >
                    <Phone className="mr-1.5 h-3.5 w-3.5 text-emerald-600" />
                    Administrar números de YCloud
                  </Button>
                </div>
              </div>
            )}

            {engine === 'meta' && (
              <div className="space-y-4">
                <MetaCredentialsForm
                  values={meta}
                  originals={originalMeta}
                  showToken={showToken}
                  loading={credsLoading}
                  onChange={handleMetaChange}
                  onRevealToken={() => setShowRevealModal(true)}
                  onValidate={() => setShowSaveModal(true)}
                />
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <span className="text-xs text-muted-foreground">
                    ¿Tienes más de una línea corporativa de Meta?
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setIsNumbersModalOpen(true)}
                    className="text-xs w-full sm:w-auto"
                  >
                    <Phone className="mr-1.5 h-3.5 w-3.5 text-emerald-600" />
                    Administrar números de Meta
                  </Button>
                </div>
              </div>
            )}

            {engine === 'unofficial' && (
              <GowaEngineConfig
                onOpenQr={() => setIsQrModalOpen(true)}
                onOpenNumbers={() => setIsNumbersModalOpen(true)}
              />
            )}
          </CardContent>
        </Card>
      </section>

      <ConfirmModal
        isOpen={showRevealModal}
        title="Advertencia de Seguridad"
        description={
          <>
            Estás a punto de revelar tu Token de acceso permanente.
            <br /><br />
            <strong>No compartas esta información con nadie.</strong> Si alguien obtiene este token,
            podrá enviar mensajes en nombre de tu número de WhatsApp y tu cuenta podría ser
            suspendida por Meta.
          </>
        }
        confirmLabel="Sí, mostrar Token"
        destructive
        onConfirm={() => {
          setShowToken(true);
          setShowRevealModal(false);
        }}
        onCancel={() => setShowRevealModal(false)}
      />

      <ConfirmModal
        isOpen={showSaveModal}
        title="Confirmar cambios"
        description={
          <>
            ¿Estás seguro que deseas actualizar las credenciales?
            <br /><br />
            Al presionar continuar, la aplicación realizará una petición de validación a los
            servidores de Meta. Si los datos son inválidos, no podrás enviar mensajes.
          </>
        }
        confirmLabel="Validar y guardar"
        onConfirm={handleSaveMeta}
        onCancel={() => setShowSaveModal(false)}
      />

      <ResultModal
        isOpen={resultModal.isOpen}
        type={resultModal.type}
        message={resultModal.message}
        onClose={resultModal.close}
      />

      <NumbersManagerModal
        isOpen={isNumbersModalOpen}
        engine={engine}
        onClose={() => setIsNumbersModalOpen(false)}
      />

      <UnofficialQrModal
        isOpen={isQrModalOpen}
        onClose={() => setIsQrModalOpen(false)}
        onSuccess={() => window.dispatchEvent(new Event('credentials-updated'))}
      />
    </div>
  );
}
