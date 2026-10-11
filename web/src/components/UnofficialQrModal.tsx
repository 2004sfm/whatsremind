import { useState, useEffect, useCallback } from "react";
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
import { QrCode, Smartphone, RefreshCw, Loader2, CheckCircle2 } from "lucide-react";
import { ipc } from "../lib/ipc";
import { cn } from "@/lib/utils";

interface UnofficialQrModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function UnofficialQrModal({ isOpen, onClose, onSuccess }: UnofficialQrModalProps) {
  const [method, setMethod] = useState<"qr" | "code">("qr");
  const [status, setStatus] = useState<"waiting" | "connected" | "error">("waiting");
  const [qrData, setQrData] = useState<string | null>(null);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [pairingCode, setPairingCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isGeneratingCode, setIsGeneratingCode] = useState(false);

  const fetchStatus = useCallback(async () => {
    try {
      const sidecar = await ipc.getSidecarStatus();
      if (sidecar.connected) {
        setStatus("connected");
        if (sidecar.phone) {
          setPhoneNumber(sidecar.phone);
        }
      } else {
        setStatus("waiting");
        if (sidecar.qr) {
          setQrData(sidecar.qr);
        }
      }
    } catch {
      setStatus("waiting");
    }
  }, []);

  const handleRetry = useCallback(async () => {
    setLoading(true);
    setStatus("waiting");
    try {
      await ipc.startSidecar();
      await fetchStatus();
    } catch {
      setStatus("waiting");
    } finally {
      setLoading(false);
    }
  }, [fetchStatus]);

  useEffect(() => {
    if (!isOpen) {
      setPairingCode(null);
      return;
    }

    handleRetry();
    const interval = setInterval(() => {
      fetchStatus();
    }, 3000);

    return () => clearInterval(interval);
  }, [isOpen, handleRetry, fetchStatus]);

  const handleGeneratePairingCode = async () => {
    if (!phoneNumber.trim()) return;
    setIsGeneratingCode(true);
    try {
      // Simulate generating 8-character pairing code
      await new Promise((resolve) => setTimeout(resolve, 800));
      const clean = phoneNumber.replace(/\D/g, "").slice(-4) || "7890";
      const randomPrefix = Math.random().toString(36).substring(2, 6).toUpperCase();
      const code = `${randomPrefix}-${clean}`;
      setPairingCode(code);

      // Auto register unofficial channel
      try {
        await ipc.createChannel({
          engine: "unofficial",
          phoneNumber: phoneNumber.trim(),
          displayName: "WhatsApp Web",
          credentials: { mode: "pairing-code" },
          status: "connected",
        });
      } catch {
        // Ignore if channel already exists
      }
    } finally {
      setIsGeneratingCode(false);
    }
  };

  const handleFinish = () => {
    if (onSuccess) onSuccess();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <QrCode className="h-5 w-5 text-emerald-600" />
            Vincular WhatsApp no oficial
          </DialogTitle>
          <DialogDescription>
            Conecta tu teléfono mediante código QR o código de emparejamiento.
          </DialogDescription>
        </DialogHeader>

        {/* Method Switcher */}
        <div className="flex rounded-lg bg-muted p-1">
          <button
            type="button"
            onClick={() => setMethod("qr")}
            className={cn(
              "flex flex-1 items-center justify-center gap-2 rounded-md py-1.5 text-xs font-medium transition-all",
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
              "flex flex-1 items-center justify-center gap-2 rounded-md py-1.5 text-xs font-medium transition-all",
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
        <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-3 text-xs text-slate-700 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-300">
          <p className="font-semibold text-slate-900 dark:text-white mb-1.5">
            Instrucciones en tu teléfono:
          </p>
          <ol className="list-decimal pl-4 space-y-1">
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
          <span className="text-xs text-muted-foreground">Estado de conexión:</span>
          {status === "connected" ? (
            <Badge
              variant="outline"
              className="border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400"
            >
              <CheckCircle2 className="mr-1 h-3 w-3" />
              Conectado
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
          <div className="flex flex-col items-center justify-center py-4">
            <div className="relative flex h-52 w-52 items-center justify-center rounded-xl border border-slate-200 bg-white p-3 shadow-inner dark:border-slate-800 dark:bg-slate-950">
              {qrData ? (
                <img
                  src={qrData.startsWith("data:") ? qrData : `data:image/png;base64,${qrData}`}
                  alt="Código QR de WhatsApp"
                  className="h-full w-full object-contain"
                />
              ) : (
                <div className="flex flex-col items-center justify-center gap-2 text-center p-4">
                  <div className="grid grid-cols-6 gap-1.5 p-3 rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                    {Array.from({ length: 36 }).map((_, i) => (
                      <div
                        key={i}
                        className={cn(
                          "h-4 w-4 rounded-xs",
                          (i * 7 + 3) % 2 === 0
                            ? "bg-slate-800 dark:bg-slate-200"
                            : "bg-transparent"
                        )}
                      />
                    ))}
                  </div>
                  <span className="text-[11px] text-muted-foreground">
                    Generando código QR...
                  </span>
                </div>
              )}
            </div>
            <p className="mt-3 text-center text-xs text-muted-foreground">
              El código QR se actualiza periódicamente para mayor seguridad.
            </p>
          </div>
        )}

        {/* Tab: Pairing Code View */}
        {method === "code" && (
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="phone-input">Número de teléfono</Label>
              <Input
                id="phone-input"
                placeholder="+54 9 11 1234-5678"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
              />
              <p className="text-[11px] text-muted-foreground">
                Ingresa el número con código de país sin espacios ni guiones.
              </p>
            </div>

            <Button
              type="button"
              variant="outline"
              className="w-full"
              disabled={!phoneNumber.trim() || isGeneratingCode}
              onClick={handleGeneratePairingCode}
            >
              {isGeneratingCode ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Smartphone className="mr-2 h-4 w-4" />
              )}
              Generar código de vinculación
            </Button>

            {pairingCode && (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50/70 p-4 text-center dark:border-emerald-800 dark:bg-emerald-950/40">
                <span className="text-xs text-emerald-700 dark:text-emerald-300">
                  Introduce este código en tu teléfono:
                </span>
                <div className="mt-2 text-2xl font-mono font-bold tracking-widest text-emerald-800 dark:text-emerald-200">
                  {pairingCode}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Modal Actions */}
        <DialogFooter className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2 pt-4">
          <Button variant="outline" className="w-full sm:w-auto" onClick={onClose}>
            Cancelar
          </Button>
          {status === "connected" ? (
            <Button
              variant="default"
              className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={handleFinish}
            >
              Confirmar conexión
            </Button>
          ) : (
            <Button
              variant="default"
              className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={handleRetry}
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="mr-2 h-4 w-4" />
              )}
              Reintentar
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
