import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Loader2, Eye, EyeOff, KeyRound, Phone, FileText } from "lucide-react";

export interface MetaCredentials {
  wabaId: string;
  phoneId: string;
  token: string;
}

interface MetaCredentialsFormProps {
  values: MetaCredentials;
  originals: MetaCredentials;
  showToken: boolean;
  loading: boolean;
  onChange: (field: keyof MetaCredentials, value: string) => void;
  onRevealToken: () => void;
  onValidate: () => void;
}

export function MetaCredentialsForm({
  values,
  originals,
  showToken,
  loading,
  onChange,
  onRevealToken,
  onValidate,
}: MetaCredentialsFormProps) {
  const isUnchanged =
    values.token === originals.token &&
    values.phoneId === originals.phoneId &&
    values.wabaId === originals.wabaId;

  return (
    <div className="mt-6 p-5 border border-slate-200 dark:border-slate-800 rounded-lg space-y-6">
      <div>
        <h3 className="text-lg font-medium flex items-center gap-2 mb-1">
          <KeyRound className="text-emerald-500" />
          Credenciales de API
        </h3>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Tus credenciales de Meta for Developers.
        </p>
      </div>

      <div className="space-y-4">
        <div className="space-y-3">
          <Label htmlFor="wabaId" className="text-slate-700 dark:text-slate-300">
            ID de cuenta WhatsApp Business (WABA ID)
          </Label>
          <div className="relative">
            <FileText className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
            <Input
              id="wabaId"
              className="pl-9 h-11 bg-slate-50 focus:bg-white dark:bg-slate-900"
              value={values.wabaId}
              onChange={(e) => onChange("wabaId", e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-3">
          <Label htmlFor="phoneId" className="text-slate-700 dark:text-slate-300">
            ID del Número de Teléfono
          </Label>
          <div className="relative">
            <Phone className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
            <Input
              id="phoneId"
              className="pl-9 h-11 bg-slate-50 focus:bg-white dark:bg-slate-900"
              value={values.phoneId}
              onChange={(e) => onChange("phoneId", e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-3">
          <Label htmlFor="token" className="text-slate-700 dark:text-slate-300">
            Token de acceso permanente
          </Label>
          <div className="relative">
            <KeyRound className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
            <Input
              id="token"
              type={showToken ? "text" : "password"}
              className="pl-9 pr-10 h-11 bg-slate-50 focus:bg-white dark:bg-slate-900"
              value={values.token}
              onChange={(e) => onChange("token", e.target.value)}
              readOnly={!showToken && values.token.length > 0}
            />
            {values.token.length > 0 && (
              <button
                type="button"
                className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 transition-colors"
                onClick={onRevealToken}
                aria-label={showToken ? "Ocultar token de Meta" : "Mostrar token de Meta"}
              >
                {showToken ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            )}
          </div>
        </div>

        <Button
          className="w-full h-11 bg-emerald-600 hover:bg-emerald-700 text-white shadow-md transition-color mt-2"
          onClick={onValidate}
          disabled={loading || isUnchanged}
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Validando...
            </>
          ) : (
            "Guardar"
          )}
        </Button>
      </div>
    </div>
  );
}
