import { useState, useEffect, useCallback } from 'react';
import { ipc } from '../lib/ipc';
import { formatError } from '../lib/utils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { AppearanceCard } from '../components/AppearanceCard';
import { EngineSelector } from '../components/EngineSelector';
import { ActiveEngineCardContent } from '../components/ActiveEngineCardContent';
import { AddChannelModal } from '../components/AddChannelModal';
import { NumbersManagerModal } from '../components/NumbersManagerModal';
import { UnofficialQrModal } from '../components/UnofficialQrModal';
import { GowaWarningModal } from '../components/GowaWarningModal';
import { ResultModal } from '../components/ResultModal';
import { useResultModal } from '../hooks/useResultModal';

export function Settings() {
  const [engine, setEngine] = useState('meta');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isNumbersModalOpen, setIsNumbersModalOpen] = useState(false);
  const [isGowaWarningOpen, setIsGowaWarningOpen] = useState(false);
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const resultModal = useResultModal();

  const loadEngine = useCallback(() => {
    ipc.getEngine().then(setEngine).catch(() => {});
  }, []);

  useEffect(() => {
    loadEngine();
    window.addEventListener('credentials-updated', loadEngine);
    return () => {
      window.removeEventListener('credentials-updated', loadEngine);
    };
  }, [loadEngine]);

  const handleEngineChange = async (newEngine: string) => {
    try {
      await ipc.setEngine(newEngine);
      setEngine(newEngine);
      window.dispatchEvent(new Event('credentials-updated'));
    } catch (err: unknown) {
      resultModal.showError(formatError(err));
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

            <ActiveEngineCardContent
              engine={engine}
              onOpenAddModal={() => setIsAddModalOpen(true)}
              onOpenQrModal={() => setIsGowaWarningOpen(true)}
              onOpenNumbersModal={() => setIsNumbersModalOpen(true)}
            />
          </CardContent>
        </Card>
      </section>

      <AddChannelModal
        isOpen={isAddModalOpen}
        engine={engine}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={() => {
          setIsAddModalOpen(false);
          window.dispatchEvent(new Event('credentials-updated'));
        }}
      />

      <NumbersManagerModal
        isOpen={isNumbersModalOpen}
        engine={engine}
        onClose={() => setIsNumbersModalOpen(false)}
      />

      <GowaWarningModal
        isOpen={isGowaWarningOpen}
        onClose={() => setIsGowaWarningOpen(false)}
        onConfirm={() => {
          setIsGowaWarningOpen(false);
          setIsQrModalOpen(true);
        }}
      />

      <UnofficialQrModal
        isOpen={isQrModalOpen}
        onClose={() => setIsQrModalOpen(false)}
        onSuccess={() => window.dispatchEvent(new Event('credentials-updated'))}
      />

      <ResultModal
        isOpen={resultModal.isOpen}
        type={resultModal.type}
        message={resultModal.message}
        onClose={resultModal.close}
      />
    </div>
  );
}
