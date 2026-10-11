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
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { PlusCircle, Loader2, QrCode } from "lucide-react";
import { ipc } from "../lib/ipc";
import { UnofficialQrModal } from "./UnofficialQrModal";

interface AddChannelModalProps {
  isOpen: boolean;
  engine: string;
  onClose: () => void;
  onSuccess?: () => void;
}

export function AddChannelModal({
  isOpen,
  engine,
  onClose,
  onSuccess,
}: AddChannelModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      {isOpen && (
        <AddChannelContent
          engine={engine}
          onClose={onClose}
          onSuccess={onSuccess}
        />
      )}
    </Dialog>
  );
}

interface AddChannelContentProps {
  engine: string;
  onClose: () => void;
  onSuccess?: () => void;
}

function AddChannelContent({
  engine,
  onClose,
  onSuccess,
}: AddChannelContentProps) {
  const [metaPhoneId, setMetaPhoneId] = useState("");
  const [metaToken, setMetaToken] = useState("");
  const [metaPhone, setMetaPhone] = useState("");
  const [metaDisplayName, setMetaDisplayName] = useState("");

  const [ycloudApiKey, setYcloudApiKey] = useState("");
  const [ycloudPhone, setYcloudPhone] = useState("");
  const [ycloudDisplayName, setYcloudDisplayName] = useState("");

  const [unofficialPhone, setUnofficialPhone] = useState("");
  const [unofficialDisplayName, setUnofficialDisplayName] = useState("");
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (engine === "meta") {
        if (!metaPhone.trim()) throw new Error("El número de teléfono es obligatorio.");
        if (!metaPhoneId.trim()) throw new Error("El Identificador de teléfono (Phone ID) es obligatorio.");
        if (!metaToken.trim()) throw new Error("El Token de acceso es obligatorio.");

        await ipc.createChannel({
          engine: "meta",
          phoneNumber: metaPhone.trim(),
          displayName: metaDisplayName.trim() || undefined,
          credentials: { phoneId: metaPhoneId.trim(), token: metaToken.trim() },
          status: "connected",
        });
      } else if (engine === "ycloud") {
        if (!ycloudPhone.trim()) throw new Error("El número de teléfono emisor es obligatorio.");
        if (!ycloudApiKey.trim()) throw new Error("La Clave de API (API Key) es obligatoria.");

        await ipc.createChannel({
          engine: "ycloud",
          phoneNumber: ycloudPhone.trim(),
          displayName: ycloudDisplayName.trim() || undefined,
          credentials: { apiKey: ycloudApiKey.trim(), phoneNumber: ycloudPhone.trim() },
          status: "connected",
        });
      } else if (engine === "unofficial") {
        if (!unofficialPhone.trim()) throw new Error("El número de teléfono es obligatorio.");

        await ipc.createChannel({
          engine: "unofficial",
          phoneNumber: unofficialPhone.trim(),
          displayName: unofficialDisplayName.trim() || undefined,
          credentials: { mode: "direct" },
          status: "connected",
        });
      }

      if (onSuccess) onSuccess();
      onClose();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Error al registrar el número.";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const getEngineTitle = () => {
    if (engine === "meta") return "Meta Cloud API";
    if (engine === "ycloud") return "YCloud API";
    return "WhatsApp no oficial";
  };

  return (
    <>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PlusCircle className="h-5 w-5 text-emerald-600" />
            Agregar nuevo número
          </DialogTitle>
          <DialogDescription>
            Registra un número de WhatsApp adicional para {getEngineTitle()}.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-400">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          {engine === "meta" && (
            <MetaFields
              phone={metaPhone}
              onPhoneChange={setMetaPhone}
              displayName={metaDisplayName}
              onDisplayNameChange={setMetaDisplayName}
              phoneId={metaPhoneId}
              onPhoneIdChange={setMetaPhoneId}
              token={metaToken}
              onTokenChange={setMetaToken}
            />
          )}

          {engine === "ycloud" && (
            <YCloudFields
              phone={ycloudPhone}
              onPhoneChange={setYcloudPhone}
              displayName={ycloudDisplayName}
              onDisplayNameChange={setYcloudDisplayName}
              apiKey={ycloudApiKey}
              onApiKeyChange={setYcloudApiKey}
            />
          )}

          {engine === "unofficial" && (
            <UnofficialFields
              phone={unofficialPhone}
              onPhoneChange={setUnofficialPhone}
              displayName={unofficialDisplayName}
              onDisplayNameChange={setUnofficialDisplayName}
              onOpenQr={() => setIsQrModalOpen(true)}
            />
          )}

          <DialogFooter className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              className="w-full sm:w-auto"
              onClick={onClose}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="default"
              className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white"
              disabled={loading}
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Registrar número
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>

      <UnofficialQrModal
        isOpen={isQrModalOpen}
        onClose={() => setIsQrModalOpen(false)}
        onSuccess={() => {
          setIsQrModalOpen(false);
          if (onSuccess) onSuccess();
          onClose();
        }}
      />
    </>
  );
}

function MetaFields({
  phone,
  onPhoneChange,
  displayName,
  onDisplayNameChange,
  phoneId,
  onPhoneIdChange,
  token,
  onTokenChange,
}: {
  phone: string;
  onPhoneChange: (v: string) => void;
  displayName: string;
  onDisplayNameChange: (v: string) => void;
  phoneId: string;
  onPhoneIdChange: (v: string) => void;
  token: string;
  onTokenChange: (v: string) => void;
}) {
  return (
    <>
      <div className="space-y-1.5">
        <Label htmlFor="meta-phone">Número de teléfono</Label>
        <Input
          id="meta-phone"
          placeholder="+54 9 11 1234-5678"
          value={phone}
          onChange={(e) => onPhoneChange(e.target.value)}
        />
        <p className="text-[11px] text-muted-foreground">
          Número asignado en Meta WhatsApp Business.
        </p>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="meta-display-name">Nombre para mostrar (Opcional)</Label>
        <Input
          id="meta-display-name"
          placeholder="Ej. Cobranzas, Sucursal Norte"
          value={displayName}
          onChange={(e) => onDisplayNameChange(e.target.value)}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="meta-phone-id">Identificador de teléfono (Phone ID)</Label>
        <Input
          id="meta-phone-id"
          placeholder="Ej. 10459382910294"
          value={phoneId}
          onChange={(e) => onPhoneIdChange(e.target.value)}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="meta-token">Token de acceso permanente</Label>
        <Input
          id="meta-token"
          type="password"
          placeholder="EAAB..."
          value={token}
          onChange={(e) => onTokenChange(e.target.value)}
        />
      </div>
    </>
  );
}

function YCloudFields({
  phone,
  onPhoneChange,
  displayName,
  onDisplayNameChange,
  apiKey,
  onApiKeyChange,
}: {
  phone: string;
  onPhoneChange: (v: string) => void;
  displayName: string;
  onDisplayNameChange: (v: string) => void;
  apiKey: string;
  onApiKeyChange: (v: string) => void;
}) {
  return (
    <>
      <div className="space-y-1.5">
        <Label htmlFor="ycloud-phone">Número de teléfono emisor</Label>
        <Input
          id="ycloud-phone"
          placeholder="+54 9 11 1234-5678"
          value={phone}
          onChange={(e) => onPhoneChange(e.target.value)}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="ycloud-display-name">Nombre para mostrar (Opcional)</Label>
        <Input
          id="ycloud-display-name"
          placeholder="Ej. Soporte, Ventas"
          value={displayName}
          onChange={(e) => onDisplayNameChange(e.target.value)}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="ycloud-api-key">Clave de API (API Key)</Label>
        <Input
          id="ycloud-api-key"
          type="password"
          placeholder="yc_key_..."
          value={apiKey}
          onChange={(e) => onApiKeyChange(e.target.value)}
        />
      </div>
    </>
  );
}

function UnofficialFields({
  phone,
  onPhoneChange,
  displayName,
  onDisplayNameChange,
  onOpenQr,
}: {
  phone: string;
  onPhoneChange: (v: string) => void;
  displayName: string;
  onDisplayNameChange: (v: string) => void;
  onOpenQr: () => void;
}) {
  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-300">
        <p className="font-semibold text-slate-900 dark:text-white mb-1">
          Vinculación directa de dispositivo
        </p>
        <p>
          Puedes vincular tu dispositivo escaneando el código QR oficial de WhatsApp o ingresar los
          datos del número para registrarlo.
        </p>
      </div>

      <Button
        type="button"
        variant="outline"
        className="w-full flex items-center justify-center gap-2"
        onClick={onOpenQr}
      >
        <QrCode className="h-4 w-4 text-emerald-600" />
        Abrir código QR de vinculación
      </Button>

      <div className="space-y-1.5 pt-2">
        <Label htmlFor="unofficial-phone">Número de teléfono</Label>
        <Input
          id="unofficial-phone"
          placeholder="+54 9 11 1234-5678"
          value={phone}
          onChange={(e) => onPhoneChange(e.target.value)}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="unofficial-display-name">Nombre para mostrar (Opcional)</Label>
        <Input
          id="unofficial-display-name"
          placeholder="Ej. Dispositivo principal"
          value={displayName}
          onChange={(e) => onDisplayNameChange(e.target.value)}
        />
      </div>
    </div>
  );
}
