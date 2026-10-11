import { Smartphone, QrCode, Phone, CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { useChannels } from "../hooks/useChannels";
import { formatPhoneValue } from "../lib/utils";

interface GowaEngineConfigProps {
  onOpenQr: () => void;
  onOpenNumbers: () => void;
}

export function GowaEngineConfig({ onOpenQr, onOpenNumbers }: GowaEngineConfigProps) {
  const { channels, activeChannel, loading } = useChannels("unofficial");

  if (loading && channels.length === 0) {
    return (
      <div className="flex items-center justify-center py-8 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin mr-2" />
        <span className="text-sm">Cargando estado de GOWA...</span>
      </div>
    );
  }

  const isConnected = activeChannel && activeChannel.status === "connected";

  return (
    <div className="space-y-4 pt-2">
      {isConnected ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-5 dark:border-emerald-900/60 dark:bg-emerald-950/20">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-sm">
                <Smartphone className="h-6 w-6" />
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
                  {activeChannel.displayName || "Línea activa de GOWA"}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onOpenQr}
                className="text-xs"
              >
                <QrCode className="mr-1.5 h-3.5 w-3.5 text-emerald-600" />
                Vincular otro número
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onOpenNumbers}
                className="text-xs"
              >
                <Phone className="mr-1.5 h-3.5 w-3.5 text-slate-600 dark:text-slate-400" />
                Administrar números ({channels.length})
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 dark:border-slate-850 p-8 text-center bg-slate-50/50 dark:bg-slate-900/30">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 mb-3">
            <QrCode className="h-6 w-6" />
          </div>
          <h4 className="font-semibold text-slate-900 dark:text-slate-100 text-sm">
            Sin dispositivo vinculado en GOWA
          </h4>
          <p className="text-xs text-muted-foreground mt-1 max-w-sm mb-5">
            Conecta tu cuenta de WhatsApp escaneando el código QR en pantalla o generando un código
            de emparejamiento directo.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Button
              type="button"
              variant="default"
              size="sm"
              onClick={onOpenQr}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium shadow-sm"
            >
              <QrCode className="mr-1.5 h-4 w-4" />
              Vincular WhatsApp con QR / Código
            </Button>
            {channels.length > 0 && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onOpenNumbers}
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
