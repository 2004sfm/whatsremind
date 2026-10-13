import { useState, useEffect, useCallback, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Badge } from "./ui/badge";
import { PhoneInput } from "./ui/phone-input";
import { QrCode, Smartphone, RefreshCw, Loader2, CheckCircle2 } from "lucide-react";
import { ipc } from "../lib/ipc";
import { cn } from "@/lib/utils";

interface UnofficialQrModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function UnofficialQrModal({ isOpen, onClose, onSuccess }: UnofficialQrModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      {isOpen && (
        <UnofficialQrContent
          onClose={onClose}
          onSuccess={onSuccess}
        />
      )}
    </Dialog>
  );
}

interface UnofficialQrContentProps {
  onClose: () => void;
  onSuccess?: () => void;
}

function UnofficialQrContent({ onClose, onSuccess }: UnofficialQrContentProps) {
  const [method, setMethod] = useState<"qr" | "code">("qr");
  const [status, setStatus] = useState<"waiting" | "connected" | "error">("waiting");
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [qrData, setQrData] = useState<string | null>(null);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [pairingCode, setPairingCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isGeneratingCode, setIsGeneratingCode] = useState(false);
  const hasSavedChannel = useRef(false);

  const initSession = useCallback(async () => {
    setLoading(true);
    setStatus("waiting");
    hasSavedChannel.current = false;
    try {
      const dev = await ipc.createUnofficialDevice("WhatsApp Web");
      let activeDevId = dev.deviceId;
      setDeviceId(activeDevId);

      const qrRes = await ipc.getUnofficialQr(activeDevId);
      if (qrRes.newDeviceId && qrRes.newDeviceId !== activeDevId) {
        activeDevId = qrRes.newDeviceId;
        setDeviceId(activeDevId);
      }
      if (qrRes.qr) {
        setQrData(qrRes.qr);
      }
    } catch {
      setStatus("error");
    } finally {
      setLoading(false);
    }
  }, []);

  const checkStatus = useCallback(async (devId: string) => {
    try {
      const res = await ipc.getUnofficialStatus(devId);
      if (res.connected) {
        setStatus("connected");
        if (!hasSavedChannel.current) {
          hasSavedChannel.current = true;
          const rawPhone = res.jid
            ? res.jid.split("@")[0].split(":")[0]
            : phoneNumber.trim();
          const cleanDigits = rawPhone.replace(/\D/g, "");
          const phoneFromJid = cleanDigits ? `+${cleanDigits}` : "WhatsApp Vinculado";
          const finalDisplayName = displayName.trim() || "GOWA Dispositivo";
          try {
            await ipc.createChannel({
              engine: "unofficial",
              phoneNumber: phoneFromJid,
              displayName: finalDisplayName,
              credentials: { deviceId: devId },
              status: "connected",
            });
          } catch {
            // Channel may already exist
          }
          if (onSuccess) onSuccess();
          setTimeout(() => {
            onClose();
          }, 1200);
        }
      }
    } catch {
      // ignore status polling error
    }
  }, [phoneNumber, displayName, onSuccess, onClose]);

  useEffect(() => {
    initSession();
  }, [initSession]);

  useEffect(() => {
    if (!deviceId || status === "connected") return;

    const interval = setInterval(() => {
      checkStatus(deviceId);
    }, 2500);

    return () => clearInterval(interval);
  }, [deviceId, status, checkStatus]);

  const handleGeneratePairingCode = async () => {
    if (!phoneNumber.trim() || !deviceId) return;
    setIsGeneratingCode(true);
    try {
      const res = await ipc.getUnofficialPairCode(deviceId, phoneNumber);
      setPairingCode(res.pairCode);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Error al generar código";
      alert(message);
    } finally {
      setIsGeneratingCode(false);
    }
  };

  const handleRefreshQr = async () => {
    if (!deviceId) {
      initSession();
      return;
    }
    setLoading(true);
    try {
      const qrRes = await ipc.getUnofficialQr(deviceId);
      if (qrRes.newDeviceId && qrRes.newDeviceId !== deviceId) {
        setDeviceId(qrRes.newDeviceId);
      }
      if (qrRes.qr) {
        setQrData(qrRes.qr);
      }
    } catch {
      setStatus("error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <DialogContent className="sm:max-w-lg w-[95vw] sm:w-full max-h-[85vh] flex flex-col p-4 sm:p-6 overflow-hidden">
      <DialogHeader className="shrink-0">
        <DialogTitle className="flex items-center gap-2">
          <QrCode className="h-5 w-5 text-emerald-600" />
          Vincular WhatsApp con GOWA
        </DialogTitle>
        <DialogDescription>
          Escanea el código QR o usa un código de emparejamiento.
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-4 py-2 overflow-y-auto pr-1 flex-1 min-h-0">
        {/* Device Name input */}
        <div className="space-y-1.5">
          <Label htmlFor="gowa-device-name">
            Nombre del dispositivo (Opcional)
          </Label>
          <Input
            id="gowa-device-name"
            placeholder="Ej. WhatsApp Principal, Soporte..."
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
          />
        </div>

        {/* Method Switcher */}
        <div className="flex rounded-lg bg-muted p-1">
          <button
            type="button"
            onClick={() => setMethod("qr")}
            className={cn(
              "flex flex-1 items-center justify-center gap-2 rounded-md py-2 text-sm font-medium transition-all",
              method === "qr"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <QrCode className="h-4 w-4" />
            Código QR
          </button>
          <button
            type="button"
            onClick={() => setMethod("code")}
            className={cn(
              "flex flex-1 items-center justify-center gap-2 rounded-md py-2 text-sm font-medium transition-all",
              method === "code"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Smartphone className="h-4 w-4" />
            Código de emparejamiento
          </button>
        </div>

        {/* Instructions */}
        <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-3.5 text-sm text-slate-700 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-300">
          <p className="font-semibold text-slate-900 dark:text-white mb-1.5">
            Instrucciones en tu teléfono:
          </p>
          <ol className="list-decimal pl-4 space-y-1 text-slate-600 dark:text-slate-400">
            <li>Abre WhatsApp en tu teléfono móvil.</li>
            <li>
              Toca <strong>Ajustes</strong> o <strong>Menú</strong> &gt;{" "}
              <strong>Dispositivos vinculados</strong>.
            </li>
            <li>
              Toca <strong>Vincular un dispositivo</strong>{" "}
              {method === "qr"
                ? "y apunta tu cámara a este código."
                : "o selecciona vincular con número de teléfono."}
            </li>
          </ol>
        </div>

        {/* Status indicator */}
        <div className="flex items-center justify-between px-1">
          <span className="text-sm text-muted-foreground">Estado de conexión:</span>
          {status === "connected" ? (
            <Badge
              variant="outline"
              className="border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400"
            >
              <CheckCircle2 className="mr-1 h-3 w-3" />
              Conectado exitosamente
            </Badge>
          ) : status === "error" ? (
            <Badge
              variant="outline"
              className="border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-400"
            >
              Error al conectar
            </Badge>
          ) : (
            <Badge
              variant="outline"
              className="border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-400"
            >
              <span className="mr-1.5 inline-block h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
              Esperando escaneo...
            </Badge>
          )}
        </div>

        {/* Tab: QR View */}
        {method === "qr" && (
          <QrTabContent
            loading={loading}
            qrData={qrData}
            onRefresh={handleRefreshQr}
          />
        )}

        {/* Tab: Pairing Code View */}
        {method === "code" && (
          <PairingCodeTabContent
            phoneNumber={phoneNumber}
            onPhoneNumberChange={setPhoneNumber}
            onGenerateCode={handleGeneratePairingCode}
            isGeneratingCode={isGeneratingCode}
            pairingCode={pairingCode}
          />
        )}
      </div>

      <DialogFooter className="shrink-0 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
        <Button type="button" variant="outline" onClick={onClose} className="w-full sm:w-auto">
          Cerrar
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}

interface QrTabContentProps {
  loading: boolean;
  qrData: string | null;
  onRefresh: () => void;
}

function QrTabContent({ loading, qrData, onRefresh }: QrTabContentProps) {
  return (
    <div className="flex flex-col items-center justify-center py-4">
      <div className="relative flex h-56 w-56 items-center justify-center rounded-xl border border-slate-200 bg-white p-3 shadow-inner dark:border-slate-800 dark:bg-slate-950">
        {loading ? (
          <div className="flex flex-col items-center justify-center gap-2 text-center text-muted-foreground">
            <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
            <span className="text-xs">Generando QR de WhatsApp...</span>
          </div>
        ) : qrData ? (
          <img
            src={qrData}
            alt="Código QR de WhatsApp"
            className="h-full w-full object-contain"
          />
        ) : (
          <div className="flex flex-col items-center justify-center gap-2 text-center text-muted-foreground">
            <RefreshCw className="h-8 w-8 text-slate-400" />
            <span className="text-xs">Presiona actualizar para obtener el QR</span>
          </div>
        )}
      </div>

      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={onRefresh}
        disabled={loading}
        className="mt-3 gap-1.5 text-sm text-muted-foreground"
      >
        <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
        Actualizar código QR
      </Button>
    </div>
  );
}

interface PairingCodeTabContentProps {
  phoneNumber: string;
  onPhoneNumberChange: (val: string) => void;
  onGenerateCode: () => void;
  isGeneratingCode: boolean;
  pairingCode: string | null;
}

function PairingCodeTabContent({
  phoneNumber,
  onPhoneNumberChange,
  onGenerateCode,
  isGeneratingCode,
  pairingCode,
}: PairingCodeTabContentProps) {
  return (
    <div className="space-y-4 py-3">
      <div className="space-y-2">
        <Label htmlFor="phone-pair">
          Tu número de teléfono con código de país
        </Label>
        <div className="flex flex-col sm:flex-row gap-2">
          <PhoneInput
            id="phone-pair"
            value={phoneNumber}
            onChange={onPhoneNumberChange}
            className="flex-1"
          />
          <Button
            type="button"
            onClick={onGenerateCode}
            disabled={isGeneratingCode || !phoneNumber.trim()}
            className="shrink-0 bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            {isGeneratingCode ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              "Generar código"
            )}
          </Button>
        </div>
      </div>

      {pairingCode && (
        <div className="flex flex-col items-center justify-center rounded-xl border border-emerald-200 bg-emerald-50/50 p-4 dark:border-emerald-800 dark:bg-emerald-950/20">
          <span className="text-sm text-muted-foreground mb-1">
            Introduce este código en WhatsApp:
          </span>
          <span className="font-mono text-2xl font-bold tracking-widest text-emerald-700 dark:text-emerald-400">
            {pairingCode}
          </span>
        </div>
      )}
    </div>
  );
}
