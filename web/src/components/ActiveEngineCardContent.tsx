import { useState } from "react";
import {
  Smartphone,
  QrCode,
  Check,
  Loader2,
  Plus,
  Trash2,
  KeyRound,
} from "lucide-react";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { ConfirmModal } from "./ConfirmModal";
import { useChannels } from "../hooks/useChannels";
import { cn, formatPhoneValue } from "../lib/utils";
import type { Channel } from "../lib/types";

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
  const { channels, loading, activate, remove } = useChannels(engine);
  const [activatingId, setActivatingId] = useState<number | null>(null);
  const [channelToDelete, setChannelToDelete] = useState<Channel | null>(null);

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

  const getEngineMeta = () => {
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
  };

  const meta = getEngineMeta();
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
          {/* Header with section title and Add button */}
          <div className="flex items-center justify-between pb-1">
            <div>
              <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                Líneas registradas ({channels.length})
              </h4>
              <p className="text-xs text-muted-foreground">
                Selecciona la línea activa que enviará los mensajes en este motor.
              </p>
            </div>
            {engine === "unofficial" ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onOpenQrModal}
                className="text-xs font-medium"
              >
                <QrCode className="mr-1.5 h-3.5 w-3.5 text-emerald-600" />
                {meta.addInlineLabel}
              </Button>
            ) : (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onOpenAddModal}
                className="text-xs font-medium"
              >
                <Plus className="mr-1.5 h-3.5 w-3.5 text-emerald-600" />
                {meta.addInlineLabel}
              </Button>
            )}
          </div>

          {/* Inline Channels List */}
          <div className="space-y-2">
            {channels.map((channel) => {
              const isActive = channel.isActive === 1;
              const isActivating = activatingId === channel.id;

              return (
                <div
                  key={channel.id}
                  className={cn(
                    "flex items-center justify-between gap-3 p-3.5 rounded-xl border transition-all",
                    isActive
                      ? "border-emerald-300 bg-emerald-50/60 dark:border-emerald-800/80 dark:bg-emerald-950/25 shadow-xs"
                      : "border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/50 hover:border-slate-300 dark:hover:border-slate-700"
                  )}
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div
                      className={cn(
                        "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl shadow-xs",
                        isActive
                          ? "bg-emerald-600 text-white"
                          : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
                      )}
                    >
                      <Smartphone className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-900 dark:text-slate-100 text-sm tracking-wide">
                          {formatPhoneValue(channel.phoneNumber)}
                        </span>
                        {isActive && (
                          <Badge
                            variant="outline"
                            className="border-emerald-300 bg-emerald-100/80 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 text-[11px] px-2 py-0.5"
                          >
                            <Check className="mr-1 h-3 w-3" />
                            Activo
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground truncate mt-0.5">
                        {channel.displayName || meta.defaultName}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {!isActive && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={isActivating}
                        onClick={() => handleActivate(channel.id)}
                        className="text-xs h-8 px-2.5 text-slate-700 dark:text-slate-300 hover:text-emerald-700 hover:border-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
                      >
                        {isActivating && (
                          <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                        )}
                        Activar
                      </Button>
                    )}
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
                      onClick={() => setChannelToDelete(channel)}
                      aria-label={`Eliminar línea ${formatPhoneValue(channel.phoneNumber)}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

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
