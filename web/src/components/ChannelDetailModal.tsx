import { useState, useMemo, useCallback, memo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "./ui/dialog";
import { Button } from "./ui/button";
import {
  Smartphone,
  Check,
  Loader2,
  Trash2,
  Calendar,
  Layers,
  KeyRound,
  ShieldCheck,
  Hash,
  Cpu,
  Activity,
  Eye,
  EyeOff,
  RefreshCw,
} from "lucide-react";
import { format } from "date-fns";
import { cn, formatPhoneValue } from "../lib/utils";
import type { Channel } from "../lib/types";

interface ChannelDetailModalProps {
  channel: Channel | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate?: (
    id: number,
    data: {
      displayName?: string | null;
      credentials?: Record<string, unknown> | string;
      phoneNumber?: string;
      status?: string;
    }
  ) => Promise<Channel>;
  onDelete: (channel: Channel) => void;
  onReconnect?: () => void;
}

function parseCredentials(raw: string): Record<string, unknown> {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed === "object" && parsed !== null) {
      return parsed as Record<string, unknown>;
    }
  } catch {
    // Return empty record if raw string is not valid JSON
  }
  return {};
}

function formatCreatedAt(dateValue?: string | number | null): string {
  if (!dateValue) return "No registrada";
  try {
    const d = new Date(dateValue);
    if (isNaN(d.getTime())) return "No registrada";
    return format(d, "dd/MM/yyyy");
  } catch {
    return "No registrada";
  }
}

function getEngineLabel(engine: string): string {
  if (engine === "meta") return "Meta Cloud API";
  if (engine === "ycloud") return "YCloud API";
  return "GOWA";
}

function buildUpdatedCredentials(
  engine: string,
  currentCreds: Record<string, unknown>,
  params: {
    phoneId: string;
    wabaId: string;
    token: string;
    apiKey: string;
    phoneNumber: string;
  }
): Record<string, unknown> {
  if (engine === "meta") {
    if (!params.phoneId.trim()) {
      throw new Error("El Phone ID es obligatorio");
    }
    return {
      ...currentCreds,
      phoneId: params.phoneId.trim(),
      wabaId: params.wabaId.trim() || undefined,
      token: params.token.trim() || currentCreds.token,
    };
  }

  if (engine === "ycloud") {
    return {
      ...currentCreds,
      apiKey: params.apiKey.trim() || currentCreds.apiKey,
      from: params.phoneNumber.trim(),
    };
  }

  return currentCreds;
}

interface ChannelHeaderCardProps {
  formattedPhone: string;
  displayName: string;
  isActive: boolean;
  onChangeDisplayName: (val: string) => void;
}

const ChannelHeaderCard = memo(function ChannelHeaderCard({
  formattedPhone,
  displayName,
  isActive,
  onChangeDisplayName,
}: ChannelHeaderCardProps) {
  return (
    <div className="flex items-center gap-3.5 p-4 rounded-xl border border-slate-200 bg-slate-50/70 dark:border-slate-800 dark:bg-slate-900/60">
      <div
        className={cn(
          "flex h-12 w-12 shrink-0 items-center justify-center rounded-xl shadow-xs",
          isActive
            ? "bg-emerald-600 text-white shadow-xs"
            : "bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
        )}
      >
        <Smartphone className="h-6 w-6" />
      </div>
      <div className="min-w-0 flex-1">
        <h3 className="font-semibold text-slate-900 dark:text-slate-100 text-lg leading-tight tracking-wide">
          {formattedPhone}
        </h3>
        <div className="mt-2 max-w-sm">
          <input
            type="text"
            aria-label="Etiqueta o nombre personalizado"
            value={displayName}
            onChange={(e) => onChangeDisplayName(e.target.value)}
            placeholder="Etiqueta personalizada (ej. Cobranzas Torre B)"
            className="h-8 w-full text-left text-sm font-medium text-slate-900 dark:text-slate-100 placeholder:text-muted-foreground bg-transparent border-b-2 border-emerald-500 focus:border-emerald-600 rounded-none pb-1 px-0 outline-none transition-colors"
          />
        </div>
      </div>
    </div>
  );
});

interface ChannelGeneralDetailsProps {
  engine: string;
  isActive: boolean;
  status: string;
  formattedCreatedAt: string;
}

const ChannelGeneralDetails = memo(function ChannelGeneralDetails({
  engine,
  isActive,
  status,
  formattedCreatedAt,
}: ChannelGeneralDetailsProps) {
  const isConnected = status === "connected";

  return (
    <>
      <div className="flex items-center justify-between p-3.5 gap-3">
        <span className="text-sm text-muted-foreground flex items-center gap-2 shrink-0">
          <Cpu className="h-4 w-4 text-slate-400" />
          Motor de envío
        </span>
        <span className="text-sm font-medium text-slate-900 dark:text-slate-100 text-right">
          {getEngineLabel(engine)}
        </span>
      </div>

      <div className="flex items-center justify-between p-3.5 gap-3">
        <span className="text-sm text-muted-foreground flex items-center gap-2 shrink-0">
          <Activity className="h-4 w-4 text-slate-400" />
          Condición
        </span>
        {isActive ? (
          <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 text-right">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            Activo
          </span>
        ) : (
          <span className="text-sm text-slate-500 dark:text-slate-400 text-right">
            Inactiva
          </span>
        )}
      </div>

      <div className="flex items-center justify-between p-3.5 gap-3">
        <span className="text-sm text-muted-foreground flex items-center gap-2 shrink-0">
          <ShieldCheck className="h-4 w-4 text-slate-400" />
          Estado de conexión
        </span>
        {isConnected ? (
          <span className="text-sm font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 text-right">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            Conectado
          </span>
        ) : (
          <span className="text-sm font-medium text-amber-600 dark:text-amber-400 flex items-center gap-1.5 text-right">
            <span className="h-2 w-2 rounded-full bg-amber-500" />
            Desconectado
          </span>
        )}
      </div>

      <div className="flex items-center justify-between p-3.5 gap-3">
        <span className="text-sm text-muted-foreground flex items-center gap-2 shrink-0">
          <Calendar className="h-4 w-4 text-slate-400" />
          Fecha de vinculación
        </span>
        <span className="text-sm font-medium text-slate-800 dark:text-slate-200 text-right">
          {formattedCreatedAt}
        </span>
      </div>
    </>
  );
});

interface MetaCredentialFieldsProps {
  phoneId: string;
  onChangePhoneId: (val: string) => void;
  wabaId: string;
  onChangeWabaId: (val: string) => void;
  token: string;
  onChangeToken: (val: string) => void;
}

const MetaCredentialFields = memo(function MetaCredentialFields({
  phoneId,
  onChangePhoneId,
  wabaId,
  onChangeWabaId,
  token,
  onChangeToken,
}: MetaCredentialFieldsProps) {
  const [showToken, setShowToken] = useState(false);

  return (
    <>
      <div className="flex items-center justify-between p-3.5 gap-4 min-w-0">
        <span className="text-sm text-muted-foreground flex items-center gap-2 shrink-0">
          <Hash className="h-4 w-4 text-slate-400" />
          Phone ID
        </span>
        <div className="flex justify-end shrink-0">
          <input
            type="text"
            aria-label="Phone ID"
            value={phoneId}
            onChange={(e) => onChangePhoneId(e.target.value)}
            placeholder="Phone ID"
            className="h-8 w-44 sm:w-52 text-right text-sm font-mono text-slate-900 dark:text-slate-100 placeholder:text-muted-foreground bg-transparent border-b-2 border-emerald-500 focus:border-emerald-600 rounded-none pb-1 px-0 outline-none transition-colors truncate"
          />
        </div>
      </div>

      <div className="flex items-center justify-between p-3.5 gap-4 min-w-0">
        <span className="text-sm text-muted-foreground flex items-center gap-2 shrink-0">
          <Layers className="h-4 w-4 text-slate-400" />
          WABA ID
        </span>
        <div className="flex justify-end shrink-0">
          <input
            type="text"
            aria-label="WABA ID"
            value={wabaId}
            onChange={(e) => onChangeWabaId(e.target.value)}
            placeholder="WABA ID (Opcional)"
            className="h-8 w-44 sm:w-52 text-right text-sm font-mono text-slate-900 dark:text-slate-100 placeholder:text-muted-foreground bg-transparent border-b-2 border-emerald-500 focus:border-emerald-600 rounded-none pb-1 px-0 outline-none transition-colors truncate"
          />
        </div>
      </div>

      <div className="flex items-center justify-between p-3.5 gap-4 min-w-0">
        <span className="text-sm text-muted-foreground flex items-center gap-2 shrink-0">
          <KeyRound className="h-4 w-4 text-slate-400" />
          Token de acceso
        </span>
        <div className="flex items-center justify-end w-44 sm:w-52 border-b-2 border-emerald-500 focus-within:border-emerald-600 transition-colors shrink-0">
          <input
            type={showToken ? "text" : "password"}
            aria-label="Token de acceso"
            value={token}
            onChange={(e) => onChangeToken(e.target.value)}
            placeholder="Token de acceso"
            className="h-8 flex-1 min-w-0 text-right text-sm font-mono text-slate-900 dark:text-slate-100 placeholder:text-muted-foreground bg-transparent rounded-none pb-1 pr-1.5 pl-0 outline-none transition-colors truncate"
          />
          <button
            type="button"
            aria-label={showToken ? "Ocultar token" : "Mostrar token"}
            onClick={() => setShowToken((prev) => !prev)}
            className="h-8 w-5 pb-1 flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer transition-colors shrink-0"
          >
            {showToken ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
          </button>
        </div>
      </div>
    </>
  );
});

interface YCloudCredentialFieldsProps {
  apiKey: string;
  onChangeApiKey: (val: string) => void;
  phoneNumber: string;
  onChangePhoneNumber: (val: string) => void;
}

const YCloudCredentialFields = memo(function YCloudCredentialFields({
  apiKey,
  onChangeApiKey,
  phoneNumber,
  onChangePhoneNumber,
}: YCloudCredentialFieldsProps) {
  const [showApiKey, setShowApiKey] = useState(false);

  return (
    <>
      <div className="flex items-center justify-between p-3.5 gap-4 min-w-0">
        <span className="text-sm text-muted-foreground flex items-center gap-2 shrink-0">
          <Smartphone className="h-4 w-4 text-slate-400" />
          Número emisor
        </span>
        <div className="flex justify-end shrink-0">
          <input
            type="text"
            aria-label="Número emisor de WhatsApp"
            value={phoneNumber}
            onChange={(e) => onChangePhoneNumber(e.target.value)}
            placeholder="+1234567890"
            className="h-8 w-44 sm:w-52 text-right text-sm font-mono text-slate-900 dark:text-slate-100 placeholder:text-muted-foreground bg-transparent border-b-2 border-emerald-500 focus:border-emerald-600 rounded-none pb-1 px-0 outline-none transition-colors truncate"
          />
        </div>
      </div>

      <div className="flex items-center justify-between p-3.5 gap-4 min-w-0">
        <span className="text-sm text-muted-foreground flex items-center gap-2 shrink-0">
          <KeyRound className="h-4 w-4 text-slate-400" />
          Clave de API
        </span>
        <div className="flex items-center justify-end w-44 sm:w-52 border-b-2 border-emerald-500 focus-within:border-emerald-600 transition-colors shrink-0">
          <input
            type={showApiKey ? "text" : "password"}
            aria-label="Clave de API"
            value={apiKey}
            onChange={(e) => onChangeApiKey(e.target.value)}
            placeholder="Clave de API"
            className="h-8 flex-1 min-w-0 text-right text-sm font-mono text-slate-900 dark:text-slate-100 placeholder:text-muted-foreground bg-transparent rounded-none pb-1 pr-1.5 pl-0 outline-none transition-colors truncate"
          />
          <button
            type="button"
            aria-label={showApiKey ? "Ocultar clave de API" : "Mostrar clave de API"}
            onClick={() => setShowApiKey((prev) => !prev)}
            className="h-8 w-5 pb-1 flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer transition-colors shrink-0"
          >
            {showApiKey ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
          </button>
        </div>
      </div>
    </>
  );
});

interface ChannelDisconnectedNoticeProps {
  engine: string;
  onReconnect?: () => void;
}

const ChannelDisconnectedNotice = memo(function ChannelDisconnectedNotice({
  engine,
  onReconnect,
}: ChannelDisconnectedNoticeProps) {
  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-3.5 text-xs text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-300 space-y-2.5">
      <div className="flex items-start gap-2.5">
        <Activity className="h-4 w-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
        <div>
          <p className="font-semibold text-sm text-amber-900 dark:text-amber-200">
            Sesión desconectada
          </p>
          <p className="mt-0.5 text-xs opacity-90 leading-relaxed">
            La sesión de WhatsApp en este dispositivo se cerró o se perdió la conexión.
          </p>
        </div>
      </div>
      {engine === "unofficial" && onReconnect && (
        <div className="pt-0.5 flex items-center justify-start">
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={onReconnect}
            className="h-8 gap-1.5 bg-white dark:bg-slate-900 border-amber-300 text-amber-900 hover:bg-amber-100 hover:text-amber-950 dark:border-amber-800 dark:text-amber-300 dark:hover:bg-amber-900/40 font-medium text-xs shadow-2xs"
          >
            <RefreshCw className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
            Reconectar
          </Button>
        </div>
      )}
    </div>
  );
});

interface ChannelDetailFooterProps {
  isSaving: boolean;
  canUpdate: boolean;
  onDelete: () => void;
  onSave: () => void;
}

const ChannelDetailFooter = memo(function ChannelDetailFooter({
  isSaving,
  canUpdate,
  onDelete,
  onSave,
}: ChannelDetailFooterProps) {
  return (
    <DialogFooter className="shrink-0 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
      <Button
        type="button"
        variant="outline"
        onClick={onDelete}
        className="h-9 px-3 w-full sm:w-auto text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200 dark:border-red-900/40 dark:hover:bg-red-950/30 font-medium"
      >
        <Trash2 className="mr-1.5 h-4 w-4" />
        Eliminar
      </Button>
      {canUpdate && (
        <Button
          type="button"
          disabled={isSaving}
          onClick={onSave}
          className="h-9 px-4 w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white font-medium shadow-xs"
        >
          {isSaving ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Check className="mr-2 h-4 w-4" />
          )}
          {isSaving ? "Verificando..." : "Guardar"}
        </Button>
      )}
    </DialogFooter>
  );
});

interface ChannelDetailContentProps {
  channel: Channel;
  onClose: () => void;
  onUpdate?: (
    id: number,
    data: {
      displayName?: string | null;
      credentials?: Record<string, unknown> | string;
      phoneNumber?: string;
      status?: string;
    }
  ) => Promise<Channel>;
  onDelete: (channel: Channel) => void;
  onReconnect?: () => void;
}

function ChannelDetailContent({
  channel,
  onClose,
  onUpdate,
  onDelete,
  onReconnect,
}: ChannelDetailContentProps) {
  const creds = useMemo(
    () => parseCredentials(channel.credentials),
    [channel.credentials]
  );
  const [displayName, setDisplayName] = useState(channel.displayName || "");
  const [phoneNumber, setPhoneNumber] = useState(channel.phoneNumber || "");
  const [phoneId, setPhoneId] = useState(
    typeof creds.phoneId === "string" ? creds.phoneId : ""
  );
  const [wabaId, setWabaId] = useState(
    typeof creds.wabaId === "string" ? creds.wabaId : ""
  );
  const [token, setToken] = useState(
    typeof creds.token === "string" ? creds.token : ""
  );
  const [apiKey, setApiKey] = useState(
    typeof creds.apiKey === "string" ? creds.apiKey : ""
  );
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const formattedCreatedAt = useMemo(
    () => formatCreatedAt(channel.createdAt),
    [channel.createdAt]
  );
  const formattedPhone = useMemo(
    () => formatPhoneValue(phoneNumber || channel.phoneNumber),
    [phoneNumber, channel.phoneNumber]
  );

  const isActive = channel.isActive === 1;
  const canUpdate = Boolean(onUpdate);

  const handleSave = async () => {
    if (!onUpdate) return;
    setError(null);
    setIsSaving(true);

    try {
      const newCreds = buildUpdatedCredentials(channel.engine, creds, {
        phoneId,
        wabaId,
        token,
        apiKey,
        phoneNumber,
      });

      await onUpdate(channel.id, {
        displayName: displayName.trim() || null,
        phoneNumber: phoneNumber.trim() || channel.phoneNumber,
        credentials: newCreds,
      });

      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error al actualizar la línea";
      setError(msg);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = useCallback(() => {
    onDelete(channel);
  }, [channel, onDelete]);

  return (
    <>
      {/* Quick Delete Button placed right next to dialog X close button */}
      <button
        type="button"
        onClick={handleDelete}
        aria-label="Eliminar"
        className="absolute right-10 top-4 rounded-sm text-slate-400 hover:text-red-600 transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 p-0.5 cursor-pointer"
      >
        <Trash2 className="h-4 w-4" />
      </button>

      <DialogHeader className="shrink-0">
        <DialogTitle className="flex items-center gap-2 text-lg font-semibold">
          <Smartphone className="h-5 w-5 text-emerald-600" />
          Detalles de la línea
        </DialogTitle>
        <DialogDescription className="text-sm text-muted-foreground truncate whitespace-nowrap">
          Configuración y estado de la línea.
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-4 py-1 overflow-y-auto pr-1 flex-1 min-h-0">
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-400">
            {error}
          </div>
        )}

        <ChannelHeaderCard
          formattedPhone={formattedPhone}
          displayName={displayName}
          isActive={isActive}
          onChangeDisplayName={setDisplayName}
        />

        {channel.status !== "connected" && (
          <ChannelDisconnectedNotice
            engine={channel.engine}
            onReconnect={onReconnect}
          />
        )}

        <div className="rounded-xl border border-slate-200 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800/80">
          <ChannelGeneralDetails
            engine={channel.engine}
            isActive={isActive}
            status={channel.status}
            formattedCreatedAt={formattedCreatedAt}
          />

          {channel.engine === "meta" && (
            <MetaCredentialFields
              phoneId={phoneId}
              onChangePhoneId={setPhoneId}
              wabaId={wabaId}
              onChangeWabaId={setWabaId}
              token={token}
              onChangeToken={setToken}
            />
          )}

          {channel.engine === "ycloud" && (
            <YCloudCredentialFields
              apiKey={apiKey}
              onChangeApiKey={setApiKey}
              phoneNumber={phoneNumber}
              onChangePhoneNumber={setPhoneNumber}
            />
          )}
        </div>
      </div>

      <ChannelDetailFooter
        isSaving={isSaving}
        canUpdate={canUpdate}
        onDelete={handleDelete}
        onSave={handleSave}
      />
    </>
  );
}

export function ChannelDetailModal({
  channel,
  isOpen,
  onClose,
  onUpdate,
  onDelete,
  onReconnect,
}: ChannelDetailModalProps) {
  if (!isOpen || !channel) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg w-[95vw] sm:w-full max-h-[85vh] flex flex-col p-4 sm:p-6 overflow-hidden">
        <ChannelDetailContent
          key={channel.id}
          channel={channel}
          onClose={onClose}
          onUpdate={onUpdate}
          onDelete={onDelete}
          onReconnect={onReconnect}
        />
      </DialogContent>
    </Dialog>
  );
}
