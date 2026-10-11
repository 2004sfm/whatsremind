import { Smartphone, QrCode, Phone, CheckCircle2, Loader2, Plus, KeyRound } from "lucide-react";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { useChannels } from "../hooks/useChannels";
import { formatPhoneValue } from "../lib/utils";

interface ActiveEngineCardContentProps {
  engine: string;
  onOpenAddModal: () => void;
  onOpenQrModal: () => void;
  onOpenNumbersModal: () => void;
}

export function ActiveEngineCardContent({
  engine,
  onOpenAddModal,
  onOpenQrModal,
  onOpenNumbersModal,
}: ActiveEngineCardContentProps) {
  const { channels, activeChannel, loading } = useChannels(engine);

  if (loading && channels.length === 0) {
    return (
      <div className="flex items-center justify-center py-8 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin mr-2" />
        <span className="text-sm">Cargando líneas registradas...</span>
      </div>
    );
  }

  const isConnected = Boolean(activeChannel && activeChannel.status === "connected");

  const getEngineMeta = () => {
    if (engine === "meta") {
      return {
        emptyTitle: "Sin línea de Meta Cloud API vinculada",
        emptyDesc:
          "Registra tus credenciales de Meta for Developers (Token, Phone ID y WABA ID) para enviar recordatorios corporativos.",
        addLabel: "Agregar credenciales de Meta",
        addAnotherLabel: "Agregar otra línea",
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
        addAnotherLabel: "Agregar otro número",
        defaultName: "Línea de YCloud",
        emptyIcon: KeyRound,
      };
    }
    return {
      emptyTitle: "Sin dispositivo vinculado en GOWA",
      emptyDesc:
        "Conexión local multi-dispositivo con GOWA. Conecta tu cuenta escaneando el código QR o con tu código de emparejamiento.",
      addLabel: "Vincular WhatsApp con QR / Código",
      addAnotherLabel: "Vincular otro dispositivo",
      defaultName: "Línea activa de GOWA",
      emptyIcon: QrCode,
    };
  };

  const meta = getEngineMeta();
  const EmptyIcon = meta.emptyIcon;

  return (
    <div className="space-y-4 pt-2">
      {isConnected && activeChannel ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-5 dark:border-emerald-900/60 dark:bg-emerald-950/20">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-sm">
                {engine === "unofficial" ? (
                  <QrCode className="h-6 w-6" />
                ) : (
                  <Smartphone className="h-6 w-6" />
                )}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h4 className="font-semibold text-slate-900 dark:text-slate-100 text-base">
                    {formatPhoneValue(activeChannel.phoneNumber)}
                  </h4>
                  <Badge
                    variant="outline"
                    className="border-emerald-300 bg-emerald-100 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300"
                  >
                    <CheckCircle2 className="mr-1 h-3 w-3" />
                    Conectado
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {activeChannel.displayName || meta.defaultName}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {engine === "unofficial" ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={onOpenQrModal}
                  className="text-xs"
                >
                  <QrCode className="mr-1.5 h-3.5 w-3.5 text-emerald-600" />
                  {meta.addAnotherLabel}
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={onOpenAddModal}
                  className="text-xs"
                >
                  <Plus className="mr-1.5 h-3.5 w-3.5 text-emerald-600" />
                  {meta.addAnotherLabel}
                </Button>
              )}

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onOpenNumbersModal}
                className="text-xs"
              >
                <Phone className="mr-1.5 h-3.5 w-3.5 text-slate-600 dark:text-slate-400" />
                Administrar números ({channels.length})
              </Button>
            </div>
          </div>
        </div>
      ) : (
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
          <div className="flex flex-wrap items-center justify-center gap-3">
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

            {channels.length > 0 && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onOpenNumbersModal}
                className="text-xs"
              >
                <Phone className="mr-1.5 h-3.5 w-3.5" />
                Ver números registrados ({channels.length})
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
