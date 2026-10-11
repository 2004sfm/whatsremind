import { useState } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "./ui/table";
import { Phone, Plus, Trash2, Loader2, Smartphone, Check } from "lucide-react";
import { useChannels } from "../hooks/useChannels";
import { AddChannelModal } from "./AddChannelModal";
import { ConfirmModal } from "./ConfirmModal";
import { formatPhoneValue, cn } from "../lib/utils";
import type { Channel } from "../lib/types";

interface ChannelsManagerCardProps {
  engine: string;
}

export function ChannelsManagerCard({ engine }: ChannelsManagerCardProps) {
  const { channels, loading, activate, remove, refresh } = useChannels(engine);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
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

  return (
    <>
      <Card className="border-slate-200 dark:border-slate-800 shadow-md">
        <CardHeader className="border-b border-slate-100 dark:border-slate-800/50 bg-slate-50/50 dark:bg-slate-900/50 pb-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <CardTitle className="text-xl flex items-center gap-2">
                <Phone className="h-5 w-5 text-emerald-600" />
                Números registrados
              </CardTitle>
              <CardDescription className="mt-1">
                Administra las líneas de WhatsApp disponibles para este motor de envío.
              </CardDescription>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="border-emerald-600/30 text-emerald-700 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-950/30 w-full sm:w-auto shrink-0"
              onClick={() => setIsAddModalOpen(true)}
            >
              <Plus className="mr-1.5 h-4 w-4" />
              Agregar número
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-6">
          {loading && channels.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin mb-2" />
              <span className="text-sm">Cargando números registrados...</span>
            </div>
          ) : channels.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center border border-dashed rounded-lg border-slate-200 dark:border-slate-800 p-6">
              <Smartphone className="h-10 w-10 text-slate-400 mb-3" />
              <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                No hay números registrados para este motor
              </h3>
              <p className="text-xs text-muted-foreground mt-1 max-w-sm mb-4">
                Agrega tu primera línea de WhatsApp para comenzar a enviar recordatorios con este
                motor.
              </p>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setIsAddModalOpen(true)}
                className="border-emerald-600/40 text-emerald-700 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-950/30"
              >
                <Plus className="mr-1.5 h-4 w-4" />
                Agregar número
              </Button>
            </div>
          ) : (
            <div className="rounded-lg border border-slate-200 dark:border-slate-800 overflow-hidden">
              <Table>
                <TableHeader className="bg-slate-50/75 dark:bg-slate-900/75">
                  <TableRow>
                    <TableHead className="font-semibold">Número</TableHead>
                    <TableHead className="font-semibold">Nombre para mostrar</TableHead>
                    <TableHead className="font-semibold">Estado</TableHead>
                    <TableHead className="font-semibold">Canal activo</TableHead>
                    <TableHead className="text-right font-semibold">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {channels.map((channel) => {
                    const isActive = channel.isActive === 1;
                    const isActivating = activatingId === channel.id;

                    return (
                      <TableRow
                        key={channel.id}
                        className={cn(
                          isActive && "bg-emerald-50/30 dark:bg-emerald-950/10"
                        )}
                      >
                        <TableCell className="font-medium text-slate-900 dark:text-slate-100">
                          {formatPhoneValue(channel.phoneNumber)}
                        </TableCell>
                        <TableCell className="text-slate-600 dark:text-slate-300">
                          {channel.displayName || "—"}
                        </TableCell>
                        <TableCell>
                          {channel.status === "connected" ? (
                            <Badge
                              variant="outline"
                              className="border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400"
                            >
                              Conectado
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="border-amber-200 text-amber-700 dark:text-amber-400">
                              {channel.status}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {isActive ? (
                            <Badge
                              variant="default"
                              className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium"
                            >
                              Activo
                            </Badge>
                          ) : (
                            <span className="text-xs text-muted-foreground">Inactivo</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
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
                                {isActivating && (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                                )}
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
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <AddChannelModal
        isOpen={isAddModalOpen}
        engine={engine}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={() => {
          setIsAddModalOpen(false);
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
