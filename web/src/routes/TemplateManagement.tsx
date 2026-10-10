import { useState, useEffect } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../components/ui/dialog';
import { FileText, Plus, Loader2, RefreshCw, AlertCircle, Settings, CheckCircle2, Cloud, Smartphone, ExternalLink } from 'lucide-react';
import { ipc } from '../lib/ipc';
import type { TemplateItem } from '../lib/types';
import { formatError, parseMetaError } from '../lib/utils';

// Utilidades de traducción para valores de Meta
const translateStatus = (status: string) => {
  switch (status.toUpperCase()) {
    case 'APPROVED': return 'Aprobada';
    case 'REJECTED': return 'Rechazada';
    case 'PENDING': return 'Pendiente';
    case 'PAUSED': return 'Pausada';
    default: return status;
  }
};

const translateCategory = (category: string) => {
  switch (category.toUpperCase()) {
    case 'UTILITY': return 'Utilidad';
    case 'MARKETING': return 'Marketing';
    case 'AUTHENTICATION': return 'Autenticación';
    default: return category;
  }
};

const translateLanguage = (lang: string) => {
  const map: Record<string, string> = {
    'es': 'Español',
    'es_AR': 'Español (Argentina)',
    'es_MX': 'Español (México)',
    'es_ES': 'Español (España)',
    'en': 'Inglés',
    'en_US': 'Inglés (EEUU)'
  };
  return map[lang] || lang.toUpperCase();
};

export function TemplateManagement() {
  const { apiStatus } = useOutletContext<{ apiStatus: string }>() || { apiStatus: 'checking' };
  const [loading, setLoading] = useState(true);
  const [hasWabaId, setHasWabaId] = useState(false);
  const navigate = useNavigate();

  // Create Template Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState('');
  const [newTemplateHeader, setNewTemplateHeader] = useState('');
  const [newTemplateBody, setNewTemplateBody] = useState('');
  const [newTemplateFooter, setNewTemplateFooter] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [createModeOverride, setCreateModeOverride] = useState<'unofficial' | null>(null);

  // View Template Modal State
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateItem | null>(null);

  const [templates, setTemplates] = useState<TemplateItem[]>([]);
  const [engine, setEngine] = useState('meta');
  const [apiError, setApiError] = useState<string | null>(null);
  const [createError, setCreateError] = useState<string | null>(null);

  const fetchTemplates = async (isWabaIdValid?: boolean) => {
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
        } catch (err: any) {
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
  };

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

    ipc.getCredentials().then((creds) => {
      const validWaba = creds && creds.waba_id && creds.waba_id.trim() !== '';
      setHasWabaId(!!validWaba);
      // Always fetch templates (local at least)
      setTimeout(() => fetchTemplates(!!validWaba), 0);
    }).catch(() => {
      setHasWabaId(false);
      setLoading(false);
    });
  }, [apiStatus]);

  const handleRefresh = () => {
    fetchTemplates();
  };

  const handleSubmit = async () => {
    setIsCreating(true);
    setCreateError(null);
    try {
      const targetEngine = createModeOverride || await ipc.getEngine();
      if (targetEngine === 'unofficial') {
        await ipc.createLocalTemplate(
          newTemplateName.trim(), 
          newTemplateHeader.trim() || null,
          newTemplateBody.trim(), 
          newTemplateFooter.trim() || null,
          'UTILITY', 
          'es'
        );
      } else {
        await ipc.createMetaTemplate(
          newTemplateName.trim(), 
          newTemplateHeader.trim() || null,
          newTemplateBody.trim(), 
          newTemplateFooter.trim() || null,
          'UTILITY', 
          'es'
        );
      }
      setShowCreateModal(false);
      setNewTemplateName('');
      setNewTemplateHeader('');
      setNewTemplateBody('');
      setNewTemplateFooter('');
      fetchTemplates();
    } catch (err: unknown) {
      setCreateError(formatError(err));
    } finally {
      setIsCreating(false);
    }
  };

  const handleCloseModal = () => {
    setNewTemplateName('');
    setNewTemplateHeader('');
    setNewTemplateBody('');
    setNewTemplateFooter('');
    setCreateError(null);
    setCreateModeOverride(null);
    setShowCreateModal(false);
  };

  const handleCloneTemplate = () => {
    if (!selectedTemplate) return;
    const header = selectedTemplate.components.find(c => c.type === 'HEADER')?.text || '';
    const body = selectedTemplate.components.find(c => c.type === 'BODY')?.text || '';
    const footer = selectedTemplate.components.find(c => c.type === 'FOOTER')?.text || '';

    setNewTemplateName(selectedTemplate.name + '_local');
    setNewTemplateHeader(header);
    setNewTemplateBody(body);
    setNewTemplateFooter(footer);
    setSelectedTemplate(null);
    setCreateModeOverride('unofficial');
    setShowCreateModal(true);
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
            Para poder gestionar, crear y sincronizar tus plantillas de Meta, necesitas configurar tu <strong>ID de Cuenta WhatsApp Business (WABA ID)</strong>.
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
      {/* Barra de Acciones */}
      <div className="flex flex-col gap-4">
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Administra las plantillas de mensajes aprobadas por WhatsApp Business.
        </p>
        {(!apiError || (!apiError.includes('expirado') && !apiError.includes('inválido'))) && (
          <div className="grid grid-cols-1 sm:flex sm:flex-row sm:justify-end sm:items-center gap-3 w-full">
            {engine === 'meta' && (
              <>
                <a 
                  href="https://business.facebook.com/latest/whatsapp_manager/message_templates/" 
                  target="_blank" 
                  rel="noreferrer"
                  className="block w-full sm:w-auto"
                >
                  <Button 
                    variant="outline" 
                    className="w-full bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-blue-600 dark:text-blue-400 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/30"
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Gestionar en Meta
                  </Button>
                </a>
                <Button 
                  variant="outline" 
                  onClick={handleRefresh}
                  disabled={loading}
                  className="w-full sm:w-auto bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800"
                >
                  <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin text-emerald-500' : 'text-slate-500'}`} />
                  Sincronizar
                </Button>
              </>
            )}
            <Button 
              className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={() => setShowCreateModal(true)}
            >
              <Plus className="w-4 h-4 mr-2" />
              Nueva plantilla
            </Button>
          </div>
        )}
      </div>

      {/* Grid de Plantillas / Estado Vacío o Error */}
      {apiError ? (
        <Card className="border-dashed border-2 border-red-200 dark:border-red-900/50 bg-transparent shadow-none">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 bg-red-50 dark:bg-red-500/10 rounded-full flex items-center justify-center mb-4">
              <AlertCircle className="w-8 h-8 text-red-500" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-1">Conexión Interrumpida</h3>
            <p className="text-sm text-slate-500 max-w-md mb-6 font-medium">
              {apiError}
            </p>
            <Button 
              variant="outline" 
              className="bg-white dark:bg-slate-900 border-red-200 text-red-600 hover:bg-red-50 dark:border-red-900/50 dark:text-red-400 dark:hover:bg-red-900/30 shadow-sm"
              onClick={() => navigate('/settings')}
            >
              <Settings className="w-4 h-4 mr-2" />
              Ir a Configuración
            </Button>
          </CardContent>
        </Card>
      ) : templates.length === 0 ? (
        <Card className="border-dashed border-2 border-slate-200 dark:border-slate-800 bg-transparent shadow-none">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 bg-emerald-50 dark:bg-emerald-500/10 rounded-full flex items-center justify-center mb-4">
              <FileText className="w-8 h-8 text-emerald-500" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-1">
              {engine === 'unofficial' ? 'Sin plantillas locales' : 'Sin plantillas sincronizadas'}
            </h3>
            <p className="text-sm text-slate-500 max-w-sm mb-6">
              {engine === 'unofficial' 
                ? 'Aún no has creado ninguna plantilla local para tu Dispositivo Vinculado. Haz clic en Nueva plantilla para comenzar.'
                : 'Aún no has sincronizado ninguna plantilla desde tu cuenta de Meta. Haz clic en Sincronizar para cargarlas.'}
            </p>
            {engine === 'meta' ? (
              <Button variant="outline" onClick={handleRefresh} disabled={loading} className="bg-white dark:bg-slate-900">
                {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
                {loading ? 'Buscando en Meta...' : 'Sincronizar ahora'}
              </Button>
            ) : (
              <Button className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => setShowCreateModal(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Crear mi primera plantilla
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {templates.map((tpl) => {
            const isApproved = tpl.status === 'APPROVED';
            const isRejected = tpl.status === 'REJECTED';
            
            return (
              <Card 
                key={tpl.id} 
                className="border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md hover:border-emerald-500/30 transition-all cursor-pointer bg-white dark:bg-slate-900 h-full flex flex-col"
                onClick={() => setSelectedTemplate(tpl)}
              >
                <CardContent className="p-5 flex flex-col h-full">
                  <div className="flex justify-between items-start mb-3">
                    <h3 className="font-semibold text-slate-900 dark:text-white truncate pr-3 flex items-center gap-2" title={tpl.name}>
                      {tpl.isLocal ? (
                        <Smartphone className="w-4 h-4 text-blue-500 shrink-0" />
                      ) : (
                        <Cloud className="w-4 h-4 text-emerald-500 shrink-0" />
                      )}
                      <span className="truncate">{tpl.name}</span>
                    </h3>
                    
                    {tpl.isLocal ? (
                      <div className="text-[10px] uppercase font-bold tracking-wider px-2 py-1 rounded-full shrink-0 flex items-center gap-1 bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                        Local
                      </div>
                    ) : (
                      <div className={`text-[10px] uppercase font-bold tracking-wider px-2 py-1 rounded-full shrink-0 flex items-center gap-1
                        ${isApproved ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 
                          isRejected ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' : 
                          'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'}`}
                      >
                        {isApproved && <CheckCircle2 className="w-3 h-3" />}
                        {isRejected && <AlertCircle className="w-3 h-3" />}
                        {translateStatus(tpl.status)}
                      </div>
                    )}
                  </div>
                  
                  <div className="mb-4 mt-1">
                    <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                      {tpl.components.find(c => c.type === 'BODY')?.text || <span className="italic opacity-70">Sin contenido</span>}
                    </p>
                  </div>

                  <div className="mt-auto">
                    <div className="flex items-center justify-between text-xs text-slate-500 border-t border-slate-100 dark:border-slate-800/60 pt-3">
                      <span className="bg-slate-100 dark:bg-slate-800/80 px-2.5 py-1 rounded-md font-medium">Idioma: {translateLanguage(tpl.language || 'es')}</span>
                      <span className="text-slate-400">Categoría: {tpl.isLocal ? 'Personalizada' : translateCategory(tpl.category)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Modal Crear Plantilla */}
      <Dialog open={showCreateModal} onOpenChange={(open) => {
        if (!open) {
          handleCloseModal();
        } else {
          setShowCreateModal(true);
        }
      }}>
        {(() => {
          const effectiveEngine = createModeOverride || engine;
          return (
            <DialogContent 
              className="sm:max-w-2xl"
              onInteractOutside={(e) => e.preventDefault()}
            >
              <DialogHeader>
                <DialogTitle>{createModeOverride === 'unofficial' ? 'Clonar Plantilla a Local' : 'Crear Plantilla'}</DialogTitle>
                <DialogDescription>
                  {effectiveEngine === 'meta' 
                    ? "Diseña una plantilla de texto básica." 
                    : "Plantillas locales sin restricciones."
                  }
                </DialogDescription>
                <div className="pt-4 mt-2 border-t border-slate-100 dark:border-slate-800/60 text-left">
                  <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2.5 block">
                    Variables Disponibles
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2.5 text-xs text-slate-600 dark:text-slate-300">
                    <div className="flex gap-2 items-start">
                      <code className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-emerald-600 dark:text-emerald-400 font-bold shrink-0">{`{{1}}`}</code> 
                      <span className="leading-tight"><strong>Saludo dinámico</strong><br/><span className="text-[10px] text-slate-500">(Ej: "¡Buenos días!", "¡Buenas tardes!")</span></span>
                    </div>
                    <div className="flex gap-2 items-start">
                      <code className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-emerald-600 dark:text-emerald-400 font-bold shrink-0">{`{{2}}`}</code> 
                      <span className="leading-tight"><strong>Nombre del Cliente</strong><br/><span className="text-[10px] text-slate-500">(Extraído del Excel, ej: "Juan Pérez")</span></span>
                    </div>
                    <div className="flex gap-2 items-start">
                      <code className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-emerald-600 dark:text-emerald-400 font-bold shrink-0">{`{{3}}`}</code> 
                      <span className="leading-tight"><strong>Código / Inmueble</strong><br/><span className="text-[10px] text-slate-500">(Extraído del Excel, ej: "4.PH.D")</span></span>
                    </div>
                    <div className="flex gap-2 items-start">
                      <code className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-emerald-600 dark:text-emerald-400 font-bold shrink-0">{`{{4}}`}</code> 
                      <span className="leading-tight"><strong>Saldo Pendiente</strong><br/><span className="text-[10px] text-slate-500">(Monto de la deuda, ej: "432.40")</span></span>
                    </div>
                  </div>
                </div>
              </DialogHeader>
              
              <div className="space-y-5 py-4 max-h-[65vh] overflow-y-auto pl-1 pr-4 scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-800">
                {createError && (
                  <div className="flex items-start gap-2 text-red-600 bg-red-50 dark:bg-red-500/10 dark:text-red-400 p-3 rounded-lg text-sm break-words overflow-hidden">
                    <AlertCircle size={16} className="shrink-0 mt-0.5" />
                    <p className="flex-1 whitespace-pre-wrap">{parseMetaError(createError)}</p>
                  </div>
                )}
                
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <Label htmlFor="template_name">Nombre de la Plantilla</Label>
                    <span className={`text-[10px] ${newTemplateName.length > 512 ? 'text-red-500 font-bold' : 'text-slate-400'}`}>
                      {newTemplateName.length}/512
                    </span>
                  </div>
                  <Input 
                    id="template_name" 
                    placeholder={effectiveEngine === 'unofficial' ? "Ej. Recordatorio de Pago V2" : "ej. recordatorio_pago_v2"}
                    value={newTemplateName}
                    maxLength={512}
                    onChange={(e) => setNewTemplateName(effectiveEngine === 'unofficial' ? e.target.value : e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                  />
                  <p className="text-[11px] text-slate-500">
                    {effectiveEngine === 'unofficial' ? 'Nombre descriptivo para identificarla en tu lista local.' : 'Solo letras minúsculas, números y guiones bajos (_).'}
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <Label htmlFor="template_header">Título en Negrita (Opcional)</Label>
                    <span className={`text-[10px] ${newTemplateHeader.length > (effectiveEngine === 'unofficial' ? 120 : 60) ? 'text-red-500 font-bold' : 'text-slate-400'}`}>
                      {newTemplateHeader.length}/{effectiveEngine === 'unofficial' ? 120 : 60}
                    </span>
                  </div>
                  <Input 
                    id="template_header" 
                    placeholder="Ej. Aviso de Cobranza" 
                    value={newTemplateHeader}
                    maxLength={effectiveEngine === 'unofficial' ? 120 : 60}
                    onChange={(e) => setNewTemplateHeader(e.target.value.replace(/\*/g, ''))}
                  />
                  <p className="text-[11px] text-slate-500">Se mostrará resaltado arriba. No uses asteriscos (*).</p>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <Label htmlFor="template_body">Cuerpo del Mensaje</Label>
                    <span className={`text-[10px] ${newTemplateBody.length > (effectiveEngine === 'unofficial' ? 4096 : 1024) ? 'text-red-500 font-bold' : 'text-slate-400'}`}>
                      {newTemplateBody.length}/{effectiveEngine === 'unofficial' ? 4096 : 1024}
                    </span>
                  </div>
                  <textarea 
                    id="template_body" 
                    placeholder="Hola, {{1}}. Te recordamos que tu saldo es de {{2}}..." 
                    className="flex min-h-[120px] w-full rounded-md border border-slate-200 bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-emerald-500 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-800 dark:placeholder:text-slate-400 dark:focus-visible:ring-emerald-500 resize-y"
                    value={newTemplateBody}
                    maxLength={effectiveEngine === 'unofficial' ? 4096 : 1024}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setNewTemplateBody(e.target.value)}
                  />
                  <p className={`text-[11px] ${(effectiveEngine === 'meta' && (/^\s*\{\{/.test(newTemplateBody) || /\}\}\s*$/.test(newTemplateBody))) ? 'text-red-500 font-medium' : 'text-slate-500'}`}>
                    {effectiveEngine === 'unofficial' 
                      ? "Usa {{1}}, {{2}}, etc. para insertar datos del Excel. Puedes usar {Hola|Buenos días} para rotar saludos aleatorios."
                      : "Usa {{1}}, {{2}} para las variables dinámicas. Nota: Las variables no pueden ser la primera ni la última palabra del mensaje."}
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <Label htmlFor="template_footer">Pie de Página (Opcional)</Label>
                    <span className={`text-[10px] ${newTemplateFooter.length > (effectiveEngine === 'unofficial' ? 120 : 60) ? 'text-red-500 font-bold' : 'text-slate-400'}`}>
                      {newTemplateFooter.length}/{effectiveEngine === 'unofficial' ? 120 : 60}
                    </span>
                  </div>
                  <Input 
                    id="template_footer" 
                    placeholder="Ej. Condominio Terrazas del Mar" 
                    value={newTemplateFooter}
                    maxLength={effectiveEngine === 'unofficial' ? 120 : 60}
                    onChange={(e) => setNewTemplateFooter(e.target.value)}
                  />
                  <p className="text-[11px] text-slate-500">Texto pequeño gris en la parte inferior de la burbuja.</p>
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={handleCloseModal} disabled={isCreating}>
                  Cancelar
                </Button>
                <Button 
                  className="bg-emerald-600 hover:bg-emerald-700 text-white" 
                  disabled={isCreating || !newTemplateName || !newTemplateBody || (effectiveEngine === 'meta' && (/^\s*\{\{/.test(newTemplateBody) || /\}\}\s*$/.test(newTemplateBody)))}
                  onClick={handleSubmit}
                >
                  {isCreating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                  {isCreating ? 'Guardando...' : effectiveEngine === 'unofficial' ? 'Guardar Plantilla local' : 'Solicitar Aprobación'}
                </Button>
              </DialogFooter>
            </DialogContent>
          );
        })()}
      </Dialog>

      {/* Modal Ver Plantilla */}
      <Dialog open={selectedTemplate !== null} onOpenChange={(open) => !open && setSelectedTemplate(null)}>
        <DialogContent className="sm:max-w-2xl">
          {selectedTemplate && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center justify-between pr-6 text-xl">
                  <span className="truncate pr-4">{selectedTemplate.name}</span>
                </DialogTitle>
                <DialogDescription>
                  Vista previa del contenido de la plantilla sincronizada con Meta.
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-5 py-3">
                <div className="flex flex-wrap gap-3 text-sm">
                  {selectedTemplate.isLocal ? (
                    <div className="flex items-center gap-1.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 px-3 py-1.5 rounded-lg font-bold text-xs uppercase tracking-wide">
                      Plantilla local
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-lg font-medium text-slate-700 dark:text-slate-200">
                        <span className="text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wide">Idioma:</span>
                        {translateLanguage(selectedTemplate.language)}
                      </div>
                      <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-lg font-medium text-slate-700 dark:text-slate-200">
                        <span className="text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wide">Categoría:</span>
                        {translateCategory(selectedTemplate.category)}
                      </div>
                      <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold tracking-wide
                          ${selectedTemplate.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 
                            selectedTemplate.status === 'REJECTED' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' : 
                            'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'}`}
                      >
                        <span className="opacity-80 text-xs uppercase tracking-wide">Estado:</span>
                        {translateStatus(selectedTemplate.status)}
                      </div>
                    </>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label className="text-slate-500 text-xs">Cuerpo del Mensaje</Label>
                  <div className="bg-emerald-50/50 dark:bg-emerald-950/20 p-4 rounded-xl text-sm text-slate-700 dark:text-slate-200 min-h-[100px] border border-emerald-100 dark:border-emerald-900/30 whitespace-pre-wrap leading-relaxed">
                    {selectedTemplate.components.find(c => c.type === 'HEADER') && (
                      <div className="font-bold mb-3 pb-3 border-b border-emerald-900/10 dark:border-emerald-100/10">
                        {selectedTemplate.components.find(c => c.type === 'HEADER')?.text}
                      </div>
                    )}
                    {selectedTemplate.components.find(c => c.type === 'BODY')?.text || <span className="italic text-slate-400">Sin cuerpo de texto</span>}
                    {selectedTemplate.components.find(c => c.type === 'FOOTER') && (
                      <div className="text-xs text-slate-500 mt-3 pt-3 border-t border-emerald-900/10 dark:border-emerald-100/10">
                        {selectedTemplate.components.find(c => c.type === 'FOOTER')?.text}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <DialogFooter>
                {!selectedTemplate.isLocal && (
                  <Button variant="secondary" onClick={handleCloneTemplate} className="w-full sm:w-auto bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-900/20 dark:text-blue-400 dark:hover:bg-blue-900/40 border-none">
                    Clonar para Dispositivo Vinculado
                  </Button>
                )}
                <Button variant="outline" onClick={() => setSelectedTemplate(null)} className="w-full sm:w-auto">
                  Cerrar
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
