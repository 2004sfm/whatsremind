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
} from "lucide-react";
import { format } from "date-fns";
import { cn, formatPhoneValue } from "../lib/utils";
import type { Channel } from "../lib/types";

interface ChannelDetailModalProps {
  channel: Channel | null;
  isOpen: boolean;
  onClose: () => void;
  onActivate: (id: number) => Promise<void>;
  onDelete: (channel: Channel) => void;
  isActivating?: boolean;
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
    return format(d, "dd/MM/yyyy HH:mm");
  } catch {
    return "No registrada";
  }
}

function maskSecret(val: unknown): string {
  if (typeof val !== "string" || !val.trim()) return "No configurado";
  if (val.length <= 6) return "••••••••";
  return `••••••••${val.slice(-4)}`;
}

export function ChannelDetailModal({
  channel,
  isOpen,
  onClose,
  onActivate,
  onDelete,
  isActivating = false,
}: ChannelDetailModalProps) {
  if (!channel) return null;

  const isActive = channel.isActive === 1;
  const creds = parseCredentials(channel.credentials);

  const getEngineDetails = () => {
    if (channel.engine === "meta") {
      return {
        name: "Meta Cloud API",
        badgeClass: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800",
        fields: [
          {
            label: "Identificador de teléfono (Phone ID)",
            value: typeof creds.phoneId === "string" ? creds.phoneId : "No disponible",
            icon: Hash,
          },
          {
            label: "Identificador WABA",
            value: typeof creds.wabaId === "string" && creds.wabaId.trim() ? creds.wabaId : "No especificado",
            icon: Layers,
          },
          {
            label: "Token de acceso permanente",
            value: maskSecret(creds.token),
            icon: KeyRound,
          },
        ],
      };
    }

    if (channel.engine === "ycloud") {
      return {
        name: "YCloud API",
        badgeClass: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800",
        fields: [
          {
            label: "Clave de API",
            value: maskSecret(creds.apiKey),
            icon: KeyRound,
          },
          {
            label: "Número emisor configurado",
            value: typeof creds.from === "string" ? formatPhoneValue(creds.from) : formatPhoneValue(channel.phoneNumber),
            icon: Smartphone,
          },
        ],
      };
    }

    return {
      name: "GOWA (WhatsApp Web)",
      badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800",
      fields: [
        {
          label: "Identificador de dispositivo",
          value: typeof creds.deviceId === "string" ? creds.deviceId : "Dispositivo local",
          icon: Hash,
        },
        {
          label: "Tipo de enlace",
          value: "Multi-dispositivo local (QR / Código)",
          icon: ShieldCheck,
        },
      ],
    };
  };

  const engineDetails = getEngineDetails();

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Smartphone className="h-5 w-5 text-emerald-600" />
            Detalles de la línea telefónica
          </DialogTitle>
          <DialogDescription>
            Información técnica y estado de configuración de este número emisor.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Header Card */}
          <div className="flex items-center justify-between p-4 rounded-xl border border-slate-200 bg-slate-50/70 dark:border-slate-800 dark:bg-slate-900/60">
            <div className="flex items-center gap-3.5 min-w-0">
              <div
                className={cn(
                  "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl shadow-xs",
                  isActive
                    ? "bg-emerald-600 text-white"
                    : "bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                )}
              >
                <Smartphone className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <h3 className="font-semibold text-slate-900 dark:text-slate-100 text-lg leading-tight tracking-wide">
                  {formatPhoneValue(channel.phoneNumber)}
                </h3>
                <p className="text-sm text-muted-foreground truncate mt-0.5">
                  {channel.displayName || "Sin etiqueta personalizada"}
                </p>
              </div>
            </div>

            <div className="flex flex-col items-end gap-1.5 shrink-0 ml-3">
              <Badge variant="outline" className={cn("font-medium", engineDetails.badgeClass)}>
                {engineDetails.name}
              </Badge>
              {isActive ? (
                <Badge
                  variant="outline"
                  className="border-emerald-300 bg-emerald-100/80 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300"
                >
                  <Check className="mr-1 h-3 w-3" />
                  Activo
                </Badge>
              ) : (
                <Badge
                  variant="outline"
                  className="border-slate-300 bg-slate-100 text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400"
                >
                  Secundaria
                </Badge>
              )}
            </div>
          </div>

          {/* Details list */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800/80 text-sm">
            <div className="flex items-center justify-between p-3">
              <span className="text-muted-foreground flex items-center gap-2">
                <Calendar className="h-4 w-4 text-slate-400" />
                Fecha de vinculación
              </span>
              <span className="font-medium text-slate-800 dark:text-slate-200">
                {formatCreatedAt(channel.createdAt)}
              </span>
            </div>

            <div className="flex items-center justify-between p-3">
              <span className="text-muted-foreground flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-slate-400" />
                Estado del canal
              </span>
              <span className="font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                Conectado
              </span>
            </div>

            {engineDetails.fields.map((field) => {
              const Icon = field.icon;
              return (
                <div key={field.label} className="flex items-center justify-between p-3 gap-3">
                  <span className="text-muted-foreground flex items-center gap-2 shrink-0">
                    <Icon className="h-4 w-4 text-slate-400" />
                    {field.label}
                  </span>
                  <span className="font-mono text-xs text-slate-800 dark:text-slate-200 truncate max-w-[220px]" title={field.value}>
                    {field.value}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        <DialogFooter className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
          <div>
            <Button
              type="button"
              variant="ghost"
              onClick={() => onDelete(channel)}
              className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30 w-full sm:w-auto"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Eliminar línea
            </Button>
          </div>

          <div className="flex flex-col-reverse sm:flex-row sm:items-center gap-2 w-full sm:w-auto sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="w-full sm:w-auto"
            >
              Cerrar
            </Button>

            {!isActive && (
              <Button
                type="button"
                variant="default"
                disabled={isActivating}
                onClick={() => onActivate(channel.id)}
                className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white font-medium shadow-sm"
              >
                {isActivating ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Check className="mr-2 h-4 w-4" />
                )}
                Establecer como activa
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
