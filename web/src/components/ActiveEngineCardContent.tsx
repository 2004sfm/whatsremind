import { useState, useMemo, useCallback, memo } from "react";
import {
  Smartphone,
  QrCode,
  Loader2,
  Plus,
  KeyRound,
} from "lucide-react";
import { Button } from "./ui/button";
import { Switch } from "./ui/switch";
import { ConfirmModal } from "./ConfirmModal";
import { ChannelDetailModal } from "./ChannelDetailModal";
import { useChannels } from "../hooks/useChannels";
import { cn, formatPhoneValue } from "../lib/utils";
import type { Channel } from "../lib/types";

interface ChannelCardItemProps {
  channel: Channel;
  defaultName: string;
  isActivating: boolean;
  onSelect: (channel: Channel) => void;
  onRequestActivate: (channel: Channel) => void;
}

const ChannelCardItem = memo(function ChannelCardItem({
  channel,
  defaultName,
  isActivating,
  onSelect,
  onRequestActivate,
}: ChannelCardItemProps) {
  const isActive = channel.isActive === 1;
  const formattedPhone = useMemo(
    () => formatPhoneValue(channel.phoneNumber),
    [channel.phoneNumber]
  );

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onSelect(channel)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect(channel);
        }
      }}
      className={cn(
        "group flex items-center justify-between gap-3 p-3.5 rounded-xl border transition-colors cursor-pointer text-left select-none",
        isActive
          ? "border-emerald-500 bg-emerald-50/70 dark:border-emerald-500/70 dark:bg-emerald-950/30 ring-1 ring-emerald-500/30 shadow-xs"
          : "border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/40 opacity-80 hover:opacity-100 hover:border-slate-300 dark:hover:border-slate-700"
      )}
    >
      <div className="flex items-center gap-3.5 min-w-0 flex-1">
        <div
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl shadow-xs transition-colors",
            isActive
              ? "bg-emerald-600 text-white shadow-xs"
              : "bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500 group-hover:bg-slate-200 dark:group-hover:bg-slate-700 group-hover:text-slate-700 dark:group-hover:text-slate-300"
          )}
        >
          <Smartphone className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span
              className={cn(
                "text-sm tracking-wide",
                isActive
                  ? "font-bold text-emerald-950 dark:text-emerald-100"
                  : "font-medium text-slate-800 dark:text-slate-200"
              )}
            >
              {formattedPhone}
            </span>
          </div>
          <p className="text-xs text-muted-foreground truncate mt-0.5">
            {channel.displayName || defaultName}
          </p>
        </div>
      </div>

      {/* Switch control placed on the right */}
      <div
        className="flex items-center shrink-0 pl-2"
        onClick={(e) => e.stopPropagation()}
      >
        <Switch
          checked={isActive}
          disabled={isActivating}
          onCheckedChange={(checked) => {
            if (checked && !isActive) {
              onRequestActivate(channel);
            }
          }}
          aria-label={`Activar línea ${formattedPhone}`}
        />
      </div>
    </div>
  );
});

interface ActiveEngineCardContentProps {
  engine: string;
  onOpenAddModal: () => void;
  onOpenQrModal: () => void;
}

export function ActiveEngineCardContent({
  engine,
  onOpenAddModal,
  onOpenQrModal,
}: ActiveEngineCardContentProps) {
  const { channels, loading, activate, remove, update } = useChannels(engine);
  const [activatingId, setActivatingId] = useState<number | null>(null);
  const [channelToDelete, setChannelToDelete] = useState<Channel | null>(null);
  const [channelToActivate, setChannelToActivate] = useState<Channel | null>(null);
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null);

  const handleActivate = async (id: number) => {
    setActivatingId(id);
    try {
      await activate(id);
    } finally {
      setActivatingId(null);
    }
  };

  const handleConfirmDelete = async () => {
    if (!channelToDelete) return;
    try {
      await remove(channelToDelete.id);
    } finally {
      setChannelToDelete(null);
    }
  };

  const handleSelectChannel = useCallback((channel: Channel) => {
    setSelectedChannel(channel);
  }, []);

  const handleRequestActivate = useCallback((channel: Channel) => {
    setChannelToActivate(channel);
  }, []);

  const meta = useMemo(() => {
    if (engine === "meta") {
      return {
        emptyTitle: "Sin línea de Meta Cloud API vinculada",
        emptyDesc:
          "Registra tus credenciales de Meta for Developers (Token, Phone ID y WABA ID) para enviar recordatorios corporativos.",
        addLabel: "Agregar credenciales de Meta",
        addInlineLabel: "Agregar línea",
        defaultName: "Línea corporativa de Meta",
        emptyIcon: KeyRound,
      };
    }
    if (engine === "ycloud") {
      return {
        emptyTitle: "Sin número emisor de YCloud vinculado",
        emptyDesc:
          "Registra tu Clave de API y el número de teléfono emisor configurado en tu consola de YCloud.",
        addLabel: "Agregar credenciales de YCloud",
        addInlineLabel: "Agregar número",
        defaultName: "Línea de YCloud",
        emptyIcon: KeyRound,
      };
    }
    return {
      emptyTitle: "Sin dispositivo vinculado en GOWA",
      emptyDesc:
        "Conexión local multi-dispositivo con GOWA. Conecta tu cuenta escaneando el código QR o con tu código de emparejamiento.",
      addLabel: "Vincular WhatsApp con QR / Código",
      addInlineLabel: "Vincular dispositivo",
      defaultName: "Línea activa de GOWA",
      emptyIcon: QrCode,
    };
  }, [engine]);

  const EmptyIcon = meta.emptyIcon;

  if (loading && channels.length === 0) {
    return (
      <div className="flex items-center justify-center py-8 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin mr-2" />
        <span className="text-sm">Cargando líneas registradas...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4 pt-2">
      {channels.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 dark:border-slate-800 p-8 text-center bg-slate-50/50 dark:bg-slate-900/30">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 mb-3">
            <EmptyIcon className="h-6 w-6" />
          </div>
          <h4 className="font-semibold text-slate-900 dark:text-slate-100 text-sm">
            {meta.emptyTitle}
          </h4>
          <p className="text-xs text-muted-foreground mt-1 max-w-md mb-5 leading-relaxed">
            {meta.emptyDesc}
          </p>
          <div>
            {engine === "unofficial" ? (
              <Button
                type="button"
                variant="default"
                size="sm"
                onClick={onOpenQrModal}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium shadow-sm"
              >
                <QrCode className="mr-1.5 h-4 w-4" />
                {meta.addLabel}
              </Button>
            ) : (
              <Button
                type="button"
                variant="default"
                size="sm"
                onClick={onOpenAddModal}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium shadow-sm"
              >
                <Plus className="mr-1.5 h-4 w-4" />
                {meta.addLabel}
              </Button>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Header */}
          <div className="pb-1">
            <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Líneas registradas ({channels.length})
            </h4>
            <p className="text-xs text-muted-foreground mt-0.5">
              Selecciona la línea activa que enviará los mensajes en este motor.
            </p>
          </div>

          {/* Inline Channels List */}
          <div className="space-y-2">
            {channels.map((channel) => (
              <ChannelCardItem
                key={channel.id}
                channel={channel}
                defaultName={meta.defaultName}
                isActivating={activatingId !== null}
                onSelect={handleSelectChannel}
                onRequestActivate={handleRequestActivate}
              />
            ))}
          </div>

          {/* Sticky action card matching phone item width */}
          <div className="sticky bottom-0 z-10 pt-2 pb-1 bg-gradient-to-t from-card via-card/95 to-transparent">
            <button
              type="button"
              onClick={engine === "unofficial" ? onOpenQrModal : onOpenAddModal}
              className="w-full flex items-center justify-center gap-2 p-3.5 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 bg-white/95 dark:bg-slate-900/95 hover:border-emerald-500 hover:bg-emerald-50/60 dark:hover:bg-emerald-950/30 text-slate-700 dark:text-slate-300 hover:text-emerald-700 dark:hover:text-emerald-400 font-medium text-sm transition-colors shadow-xs backdrop-blur-xs cursor-pointer"
            >
              {engine === "unofficial" ? (
                <QrCode className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              ) : (
                <Plus className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              )}
              <span>{meta.addInlineLabel}</span>
            </button>
          </div>
        </div>
      )}

      {/* Detail Modal for inspecting and managing channel */}
      <ChannelDetailModal
        isOpen={Boolean(selectedChannel)}
        channel={channels.find((c) => c.id === selectedChannel?.id) ?? selectedChannel}
        onClose={() => setSelectedChannel(null)}
        onUpdate={update}
        onDelete={(channel) => {
          setSelectedChannel(null);
          setChannelToDelete(channel);
        }}
      />

      {/* Confirmation Modal for activating channel */}
      <ConfirmModal
        isOpen={Boolean(channelToActivate)}
        title="Activar línea de envío"
        description={
          channelToActivate ? (
            <>
              ¿Deseas activar la línea{" "}
              <strong className="text-slate-900 dark:text-slate-100 font-semibold">
                {formatPhoneValue(channelToActivate.phoneNumber)}
              </strong>
              {channelToActivate.displayName ? ` (${channelToActivate.displayName})` : ""}?
              <br />
              Esta línea pasará a ser la emisora activa para todos los mensajes en este motor.
            </>
          ) : (
            ""
          )
        }
        confirmLabel="Activar línea"
        onCancel={() => setChannelToActivate(null)}
        onConfirm={async () => {
          if (!channelToActivate) return;
          const id = channelToActivate.id;
          setChannelToActivate(null);
          await handleActivate(id);
        }}
      />

      {/* Confirmation Modal for deleting channel */}
      <ConfirmModal
        isOpen={Boolean(channelToDelete)}
        title="Eliminar línea registrada"
        description={
          channelToDelete ? (
            <>
              ¿Estás seguro de que deseas eliminar la línea{" "}
              <strong>{formatPhoneValue(channelToDelete.phoneNumber)}</strong>?
              Esta acción desconectará este número del motor de envío.
            </>
          ) : (
            ""
          )
        }
        confirmLabel="Eliminar línea"
        destructive
        onConfirm={handleConfirmDelete}
        onCancel={() => setChannelToDelete(null)}
      />
    </div>
  );
}
