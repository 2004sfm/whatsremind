import { useState } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Loader2, Eye, EyeOff, KeyRound, Phone } from "lucide-react";

export interface YCloudCredentials {
  apiKey: string;
  phone: string;
}

interface YCloudCredentialsFormProps {
  values: YCloudCredentials;
  loading: boolean;
  onChange: (field: keyof YCloudCredentials, value: string) => void;
  onSave: () => void;
}

export function YCloudCredentialsForm({
  values,
  loading,
  onChange,
  onSave,
}: YCloudCredentialsFormProps) {
  const [showKey, setShowKey] = useState(false);

  return (
    <div className="mt-6 p-5 border border-slate-200 dark:border-slate-800 rounded-lg space-y-6">
      <div>
        <h3 className="text-lg font-medium flex items-center gap-2 mb-1">
          <KeyRound className="text-emerald-500" />
          Credenciales de YCloud API
        </h3>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Configura tu API Key de YCloud y el número de WhatsApp registrado.
        </p>
      </div>

      <div className="space-y-4">
        <div className="space-y-3">
          <Label htmlFor="ycloudApiKey" className="text-slate-700 dark:text-slate-300">
            YCloud API Key
          </Label>
          <div className="relative">
            <KeyRound className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
            <Input
              id="ycloudApiKey"
              type={showKey ? "text" : "password"}
              className="pl-9 pr-10 h-11 bg-slate-50 focus:bg-white dark:bg-slate-900"
              placeholder="tu_api_key_de_ycloud"
              value={values.apiKey}
              onChange={(e) => onChange("apiKey", e.target.value)}
            />
            <button
              type="button"
              onClick={() => setShowKey(!showKey)}
              className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              aria-label={showKey ? "Ocultar clave de API de YCloud" : "Mostrar clave de API de YCloud"}
            >
              {showKey ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>

        <div className="space-y-3">
          <Label htmlFor="ycloudPhone" className="text-slate-700 dark:text-slate-300">
            Número de teléfono emisor (formato internacional E.164)
          </Label>
          <div className="relative">
            <Phone className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
            <Input
              id="ycloudPhone"
              placeholder="+584248167536"
              className="pl-9 h-11 bg-slate-50 focus:bg-white dark:bg-slate-900"
              value={values.phone}
              onChange={(e) => onChange("phone", e.target.value)}
            />
          </div>
          <p className="text-xs text-slate-400">
            Debe incluir el código de país y el prefijo + (ej. +584248167536).
          </p>
        </div>

        <div className="pt-2 flex justify-end">
          <Button
            onClick={onSave}
            disabled={loading}
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Guardar
          </Button>
        </div>
      </div>
    </div>
  );
}
