import { useState, useEffect, useCallback } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { ipc } from '../lib/ipc';
import type { TemplateItem, Channel } from '../lib/types';
import { formatError, parseMetaError } from '../lib/utils';
import { getComponentText } from '../lib/template-utils';
import { TemplateActionBar, TemplateGrid } from '../components/TemplateGrid';
import { CreateTemplateModal } from '../components/CreateTemplateModal';
import { ViewTemplateModal } from '../components/ViewTemplateModal';
import { ImportTemplateModal } from '../components/ImportTemplateModal';

export function TemplateManagement() {
  const { apiStatus } = useOutletContext<{ apiStatus: string }>() || { apiStatus: 'checking' };

  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
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
  const [hasOfficialChannels, setHasOfficialChannels] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const fetchTemplates = useCallback(async () => {
    setLoading(true);
    setApiError(null);
    try {
      const currentEngine = await ipc.getEngine();
      setEngine(currentEngine);

      // Check official channels availability for import action
      try {
        const channels: Channel[] = await ipc.getChannels();
        const hasOfficial = channels.some(
          (c) => c.engine === 'meta' || c.engine === 'ycloud'
        );
        setHasOfficialChannels(hasOfficial);
      } catch {
        // Fallback to false if channel fetch fails
        setHasOfficialChannels(false);
      }

      const data = await ipc.getTemplates(currentEngine);
      setTemplates(data);
    } catch (err: unknown) {
      setApiError(parseMetaError(formatError(err)));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (apiStatus === 'error') {
      setApiError('Tu sesión o conexión ha expirado. Por favor, ve a Configuración y actualiza tus credenciales.');
      setLoading(false);
      return;
    }

    if (apiStatus === 'checking') {
      return; // Wait for layout to finish checking
    }

    const timeoutId = setTimeout(() => fetchTemplates(), 0);
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

  const handleImportTemplate = async (tpl: TemplateItem) => {
    try {
      await ipc.importTemplateToLocal(tpl);
      setTemplates((prev) =>
        prev.map((item) => (item.name === tpl.name ? { ...item, hasLocalCopy: true } : item))
      );
      if (selectedTemplate?.name === tpl.name) {
        setSelectedTemplate({ ...selectedTemplate, hasLocalCopy: true });
      }
    } catch (err: unknown) {
      setApiError(formatError(err));
    }
  };

  const handleDeleteTemplate = async (tpl: TemplateItem) => {
    try {
      await ipc.deleteLocalTemplate(tpl.name);
      setTemplates((prev) => prev.filter((item) => item.name !== tpl.name));
      setSelectedTemplate(null);
    } catch (err: unknown) {
      setApiError(formatError(err));
    }
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

  const getSubheaderText = () => {
    if (engine === 'unofficial') {
      return 'Plantillas guardadas en tu base de datos local para WhatsApp no oficial.';
    }
    if (engine === 'ycloud') {
      return 'Plantillas sincronizadas desde tu cuenta de YCloud API.';
    }
    return 'Plantillas de mensajes aprobadas por Meta Cloud API.';
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4">
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {getSubheaderText()}
        </p>
        <TemplateActionBar
          engine={engine}
          loading={loading}
          apiError={apiError}
          hasOfficialChannels={hasOfficialChannels}
          onRefresh={() => fetchTemplates()}
          onCreate={() => setShowCreateModal(true)}
          onImport={() => setShowImportModal(true)}
        />
      </div>

      <TemplateGrid
        templates={templates}
        engine={engine}
        loading={loading}
        apiError={apiError}
        hasOfficialChannels={hasOfficialChannels}
        onSelect={setSelectedTemplate}
        onRefresh={() => fetchTemplates()}
        onCreate={() => setShowCreateModal(true)}
        onImport={() => setShowImportModal(true)}
      />

      <CreateTemplateModal
        isOpen={showCreateModal}
        engine={engine}
        cloneMode={createModeOverride}
        initialValues={cloneValues}
        onClose={handleCloseCreateModal}
        onCreated={() => fetchTemplates()}
      />

      <ImportTemplateModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onImportSuccess={() => fetchTemplates()}
      />

      <ViewTemplateModal
        template={selectedTemplate}
        onClose={() => setSelectedTemplate(null)}
        onClone={handleCloneTemplate}
        onImport={handleImportTemplate}
        onDelete={handleDeleteTemplate}
      />
    </div>
  );
}
