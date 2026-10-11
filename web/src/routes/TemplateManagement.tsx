import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { AlertCircle, Loader2, Settings } from 'lucide-react';
import { ipc } from '../lib/ipc';
import type { TemplateItem } from '../lib/types';
import { formatError, parseMetaError } from '../lib/utils';
import { getComponentText } from '../lib/template-utils';
import { TemplateActionBar, TemplateGrid } from '../components/TemplateGrid';
import { CreateTemplateModal } from '../components/CreateTemplateModal';
import { ViewTemplateModal } from '../components/ViewTemplateModal';

export function TemplateManagement() {
  const { apiStatus } = useOutletContext<{ apiStatus: string }>() || { apiStatus: 'checking' };
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [hasWabaId, setHasWabaId] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createModeOverride, setCreateModeOverride] = useState<'unofficial' | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateItem | null>(null);
  const [cloneValues, setCloneValues] = useState<{
    name: string;
    header: string;
    body: string;
    footer: string;
  } | undefined>(undefined);
  const [templates, setTemplates] = useState<TemplateItem[]>([]);
  const [engine, setEngine] = useState('meta');
  const [apiError, setApiError] = useState<string | null>(null);

  const fetchTemplates = useCallback(async (isWabaIdValid?: boolean) => {
    setLoading(true);
    setApiError(null);
    try {
      let combined: TemplateItem[] = [];
      const currentEngine = await ipc.getEngine();
      setEngine(currentEngine);

      const localData = await ipc.getLocalTemplates();
      combined = localData.map(t => ({ ...t, isLocal: true }));

      const checkWaba = isWabaIdValid !== undefined ? isWabaIdValid : hasWabaId;

      if (currentEngine === 'meta' && checkWaba && apiStatus !== 'error') {
        try {
          const metaData = await ipc.getMetaTemplates();
          const metaWithFlags = metaData.map(t => ({ ...t, isLocal: false }));
          combined = [...combined, ...metaWithFlags];
        } catch (err: unknown) {
          // If meta fails but we have local, don't fail entirely unless only meta is used
          if (currentEngine === 'meta') {
            throw err;
          } else {
            console.warn('Meta templates failed but engine is unofficial, ignoring error:', err);
          }
        }
      }
      setTemplates(combined);
    } catch (err: unknown) {
      setApiError(parseMetaError(formatError(err)));
    } finally {
      setLoading(false);
    }
  }, [hasWabaId, apiStatus]);

  useEffect(() => {
    if (apiStatus === 'error') {
      setHasWabaId(true); // Bypass missing config to show error card
      setApiError('Tu sesión de Meta ha expirado o no hay conexión. Por favor, ve a Configuración y actualiza tu Token de Acceso.');
      setLoading(false);
      return;
    }

    if (apiStatus === 'checking') {
      return; // Wait for layout to finish checking
    }

    let timeoutId = setTimeout(() => fetchTemplates(), 0);

    return () => clearTimeout(timeoutId);
  }, [apiStatus, fetchTemplates]);

  const handleCloneTemplate = () => {
    if (!selectedTemplate) return;

    setCloneValues({
      name: `${selectedTemplate.name}_local`,
      header: getComponentText(selectedTemplate, 'HEADER') || '',
      body: getComponentText(selectedTemplate, 'BODY') || '',
      footer: getComponentText(selectedTemplate, 'FOOTER') || '',
    });
    setSelectedTemplate(null);
    setCreateModeOverride('unofficial');
    setShowCreateModal(true);
  };

  const handleCloseCreateModal = () => {
    setShowCreateModal(false);
    setCreateModeOverride(null);
    setCloneValues(undefined);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  if (!hasWabaId && engine === 'meta') {
    return (
      <Card className="border-dashed border-2 border-slate-200 dark:border-slate-800 bg-transparent shadow-none max-w-2xl mx-auto mt-10">
        <CardContent className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-16 h-16 bg-amber-50 dark:bg-amber-500/10 rounded-full flex items-center justify-center mb-4">
            <AlertCircle className="w-8 h-8 text-amber-500" />
          </div>
          <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Configuración Incompleta</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mb-8">
            Para poder gestionar, crear y sincronizar tus plantillas de Meta, necesitas configurar tu{' '}
            <strong>ID de Cuenta WhatsApp Business (WABA ID)</strong>.
          </p>
          <Button
            className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-md"
            onClick={() => navigate('/settings')}
          >
            <Settings className="w-4 h-4 mr-2" />
            Ir a Configuración
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4">
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Administra las plantillas de mensajes aprobadas por WhatsApp Business.
        </p>
        <TemplateActionBar
          engine={engine}
          loading={loading}
          apiError={apiError}
          onRefresh={() => fetchTemplates()}
          onCreate={() => setShowCreateModal(true)}
        />
      </div>

      <TemplateGrid
        templates={templates}
        engine={engine}
        loading={loading}
        apiError={apiError}
        onSelect={setSelectedTemplate}
        onRefresh={() => fetchTemplates()}
        onCreate={() => setShowCreateModal(true)}
      />

      <CreateTemplateModal
        isOpen={showCreateModal}
        engine={engine}
        cloneMode={createModeOverride}
        initialValues={cloneValues}
        onClose={handleCloseCreateModal}
        onCreated={() => fetchTemplates()}
      />

      <ViewTemplateModal
        template={selectedTemplate}
        onClose={() => setSelectedTemplate(null)}
        onClone={handleCloneTemplate}
      />
    </div>
  );
}
