import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "./ui/dialog";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Phone, Plus, Trash2, Check, Loader2, Smartphone, QrCode } from "lucide-react";
import { useChannels } from "../hooks/useChannels";
import { AddChannelModal } from "./AddChannelModal";
import { UnofficialQrModal } from "./UnofficialQrModal";
import { GowaWarningModal } from "./GowaWarningModal";
import { ConfirmModal } from "./ConfirmModal";
import { formatPhoneValue, cn } from "../lib/utils";
import type { Channel } from "../lib/types";

interface NumbersManagerModalProps {
  isOpen: boolean;
  engine: string;
  onClose: () => void;
}

export function NumbersManagerModal({
  isOpen,
  engine,
  onClose,
}: NumbersManagerModalProps) {
  const { channels, loading, activate, remove, refresh } = useChannels(engine);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isGowaWarningOpen, setIsGowaWarningOpen] = useState(false);
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [channelToDelete, setChannelToDelete] = useState<Channel | null>(null);
  const [activatingId, setActivatingId] = useState<number | null>(null);

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

  const getEngineTitle = () => {
    if (engine === "meta") return "Meta Cloud API";
    if (engine === "ycloud") return "YCloud API";
    return "GOWA (WhatsApp Web)";
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <div className="flex items-center justify-between pr-6">
              <DialogTitle className="flex items-center gap-2">
                <Phone className="h-5 w-5 text-emerald-600" />
                Administrar números — {getEngineTitle()}
              </DialogTitle>
            </div>
            <DialogDescription>
              Selecciona el número que utilizará WhatsRemind para enviar mensajes.
            </DialogDescription>
          </DialogHeader>

          <div className="flex justify-end pt-1">
            <Button
              size="sm"
              variant="outline"
              className="border-emerald-600/30 text-emerald-700 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-950/30"
              onClick={() => {
                if (engine === "unofficial") {
                  setIsGowaWarningOpen(true);
                } else {
                  setIsAddModalOpen(true);
                }
              }}
            >
              {engine === "unofficial" ? (
                <>
                  <QrCode className="mr-1.5 h-4 w-4" />
                  Vincular número
                </>
              ) : (
                <>
                  <Plus className="mr-1.5 h-4 w-4" />
                  Agregar número
                </>
              )}
            </Button>
          </div>

          {/* List of Numbers */}
          <div className="max-h-72 overflow-y-auto space-y-2 py-2 pr-1">
            {loading && channels.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                <Loader2 className="h-6 w-6 animate-spin mb-2" />
                <span className="text-sm">Cargando números...</span>
              </div>
            ) : channels.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground border border-dashed rounded-lg border-slate-200 dark:border-slate-800 p-4">
                <Smartphone className="h-8 w-8 text-slate-400 mb-2" />
                <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  No hay números registrados para este motor
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Haz clic en &quot;Agregar número&quot; para registrar tu primera línea.
                </p>
              </div>
            ) : (
              channels.map((channel) => {
                const isActive = channel.isActive === 1;
                const isActivating = activatingId === channel.id;

                return (
                  <div
                    key={channel.id}
                    className={cn(
                      "flex items-center justify-between p-3 rounded-lg border transition-all",
                      isActive
                        ? "border-emerald-500/50 bg-emerald-50/40 dark:border-emerald-500/30 dark:bg-emerald-950/20"
                        : "border-slate-200 bg-white hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900/60"
                    )}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={cn(
                          "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
                          isActive
                            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400"
                            : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
                        )}
                      >
                        <Phone className="h-4 w-4" />
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm text-slate-900 dark:text-slate-100 truncate">
                            {formatPhoneValue(channel.phoneNumber)}
                          </span>
                          {isActive && (
                            <Badge
                              variant="outline"
                              className="border-emerald-300 bg-emerald-100/70 text-emerald-800 text-[10px] px-1.5 py-0 dark:border-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-300"
                            >
                              Activo
                            </Badge>
                          )}
                        </div>
                        {channel.displayName && (
                          <p className="text-xs text-muted-foreground truncate">
                            {channel.displayName}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0 ml-3">
                      {isActive ? (
                        <div className="flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400 px-2 py-1">
                          <Check className="h-4 w-4" />
                          <span>En uso</span>
                        </div>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={isActivating}
                          onClick={() => handleActivate(channel.id)}
                          className="h-8 text-xs"
                        >
                          {isActivating ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                          ) : null}
                          Activar
                        </Button>
                      )}

                      {!isActive && (
                        <Button
                          size="icon"
                          variant="ghost"
                          aria-label="Eliminar número"
                          onClick={() => setChannelToDelete(channel)}
                          className="h-8 w-8 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <DialogFooter className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              className="w-full sm:w-auto"
              onClick={onClose}
            >
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AddChannelModal
        isOpen={isAddModalOpen}
        engine={engine}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={() => {
          setIsAddModalOpen(false);
          refresh();
        }}
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
        onSuccess={() => {
          setIsQrModalOpen(false);
          refresh();
        }}
      />

      <ConfirmModal
        isOpen={Boolean(channelToDelete)}
        title="Eliminar número"
        description={
          channelToDelete ? (
            <>
              ¿Estás seguro de que deseas eliminar el número{" "}
              <strong>{formatPhoneValue(channelToDelete.phoneNumber)}</strong>? Esta acción no se
              puede deshacer.
            </>
          ) : (
            ""
          )
        }
        confirmLabel="Eliminar número"
        destructive
        onConfirm={handleConfirmDelete}
        onCancel={() => setChannelToDelete(null)}
      />
    </>
  );
}
