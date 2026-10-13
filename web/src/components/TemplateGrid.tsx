import { useNavigate } from "react-router-dom";
import { Button } from "./ui/button";
import { Card, CardContent } from "./ui/card";
import { AlertCircle, ExternalLink, FileText, Loader2, Plus, RefreshCw, Settings } from "lucide-react";
import type { TemplateItem } from "../lib/types";
import { TemplateCard } from "./TemplateCard";

const META_MANAGER_URL = "https://business.facebook.com/latest/whatsapp_manager/message_templates/";

interface TemplateActionBarProps {
  engine: string;
  loading: boolean;
  apiError: string | null;
  hasOfficialChannels?: boolean;
  onRefresh: () => void;
  onCreate: () => void;
  onImport?: () => void;
}

export function TemplateActionBar({
  engine,
  loading,
  apiError,
  hasOfficialChannels,
  onRefresh,
  onCreate,
  onImport,
}: TemplateActionBarProps) {
  const isAuthError = apiError?.includes("expirado") || apiError?.includes("inválido");
  if (apiError && isAuthError) return null;

  return (
    <div className="grid grid-cols-1 sm:flex sm:flex-row sm:justify-end sm:items-center gap-3 w-full">
      {engine === "meta" && (
        <a href={META_MANAGER_URL} target="_blank" rel="noreferrer" className="block w-full sm:w-auto">
          <Button
            variant="outline"
            className="w-full bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-blue-600 dark:text-blue-400 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/30"
          >
            <ExternalLink className="w-4 h-4 mr-2" />
            Gestionar en Meta
          </Button>
        </a>
      )}

      {engine !== "unofficial" && (
        <Button
          variant="outline"
          onClick={onRefresh}
          disabled={loading}
          className="w-full sm:w-auto bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800"
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin text-emerald-500" : "text-slate-500"}`} />
          Sincronizar
        </Button>
      )}

      {engine === "unofficial" && hasOfficialChannels && onImport && (
        <Button
          variant="outline"
          onClick={onImport}
          className="w-full sm:w-auto bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800"
        >
          <Plus className="w-4 h-4 mr-2 text-emerald-600" />
          Importar plantilla
        </Button>
      )}

      <Button
        className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white"
        onClick={onCreate}
      >
        <Plus className="w-4 h-4 mr-2" />
        Nueva plantilla
      </Button>
    </div>
  );
}

interface TemplateGridProps {
  templates: TemplateItem[];
  engine: string;
  loading: boolean;
  apiError: string | null;
  hasOfficialChannels?: boolean;
  onSelect: (template: TemplateItem) => void;
  onRefresh: () => void;
  onCreate: () => void;
  onImport?: () => void;
}

export function TemplateGrid({
  templates,
  engine,
  loading,
  apiError,
  hasOfficialChannels,
  onSelect,
  onRefresh,
  onCreate,
  onImport,
}: TemplateGridProps) {
  const navigate = useNavigate();

  if (apiError) {
    return (
      <Card className="border-dashed border-2 border-red-200 dark:border-red-900/50 bg-transparent shadow-none">
        <CardContent className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-16 h-16 bg-red-50 dark:bg-red-500/10 rounded-full flex items-center justify-center mb-4">
            <AlertCircle className="w-8 h-8 text-red-500" />
          </div>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-1">
            Conexión Interrumpida
          </h3>
          <p className="text-sm text-slate-500 max-w-md mb-6 font-medium">{apiError}</p>
          <Button
            variant="outline"
            className="bg-white dark:bg-slate-900 border-red-200 text-red-600 hover:bg-red-50 dark:border-red-900/50 dark:text-red-400 dark:hover:bg-red-900/30 shadow-sm"
            onClick={() => navigate("/settings")}
          >
            <Settings className="w-4 h-4 mr-2" />
            Ir a Configuración
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (templates.length === 0) {
    return (
      <EmptyTemplates
        engine={engine}
        loading={loading}
        hasOfficialChannels={hasOfficialChannels}
        onRefresh={onRefresh}
        onCreate={onCreate}
        onImport={onImport}
      />
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {templates.map((tpl) => (
        <TemplateCard key={tpl.id} template={tpl} onClick={() => onSelect(tpl)} />
      ))}
    </div>
  );
}

function EmptyTemplates({
  engine,
  loading,
  hasOfficialChannels,
  onRefresh,
  onCreate,
  onImport,
}: {
  engine: string;
  loading: boolean;
  hasOfficialChannels?: boolean;
  onRefresh: () => void;
  onCreate: () => void;
  onImport?: () => void;
}) {
  const isLocal = engine === "unofficial";
  const isYCloud = engine === "ycloud";

  return (
    <Card className="border-dashed border-2 border-slate-200 dark:border-slate-800 bg-transparent shadow-none">
      <CardContent className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-16 h-16 bg-emerald-50 dark:bg-emerald-500/10 rounded-full flex items-center justify-center mb-4">
          <FileText className="w-8 h-8 text-emerald-500" />
        </div>
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-1">
          {isLocal ? "Sin plantillas locales" : "Sin plantillas sincronizadas"}
        </h3>
        <p className="text-sm text-slate-500 max-w-sm mb-6">
          {isLocal
            ? "Aún no has guardado plantillas locales. Crea una nueva o impórtala desde tus proveedores oficiales."
            : isYCloud
              ? "Aún no se han sincronizado plantillas desde tu cuenta de YCloud. Haz clic en Sincronizar para cargarlas."
              : "Aún no has sincronizado ninguna plantilla desde tu cuenta de Meta. Haz clic en Sincronizar para cargarlas."}
        </p>
        {isLocal ? (
          <div className="flex flex-col sm:flex-row gap-3">
            {hasOfficialChannels && onImport && (
              <Button variant="outline" onClick={onImport} className="bg-white dark:bg-slate-900">
                <Plus className="w-4 h-4 mr-2 text-emerald-600" />
                Importar plantilla
              </Button>
            )}
            <Button
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={onCreate}
            >
              <Plus className="w-4 h-4 mr-2" />
              Nueva plantilla
            </Button>
          </div>
        ) : (
          <Button variant="outline" onClick={onRefresh} disabled={loading} className="bg-white dark:bg-slate-900">
            {loading ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4 mr-2" />
            )}
            {loading
              ? isYCloud
                ? "Buscando en YCloud..."
                : "Buscando en Meta..."
              : "Sincronizar ahora"}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
