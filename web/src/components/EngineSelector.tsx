import { Button } from "./ui/button";
import { AlertCircle } from "lucide-react";

export type Engine = "meta" | "ycloud" | "evolution";

interface EngineSelectorProps {
  engine: string;
  onChange: (engine: string) => void;
}

const ENGINES: { id: Engine; label: string; activeClass: string }[] = [
  { id: "meta", label: "Meta Cloud API", activeClass: "bg-emerald-600 hover:bg-emerald-700" },
  { id: "ycloud", label: "YCloud API", activeClass: "bg-emerald-600 hover:bg-emerald-700" },
  {
    id: "evolution",
    label: "Evolution API (En desarrollo)",
    activeClass: "bg-amber-600 hover:bg-amber-700",
  },
];

export function EngineSelector({ engine, onChange }: EngineSelectorProps) {
  const handleClick = (id: Engine) => {
    if (id === "evolution") {
      alert("⚠️ Evolution API se encuentra actualmente en desarrollo.");
    }
    onChange(id);
  };

  return (
    <>
      <div className="flex flex-wrap gap-3">
        {ENGINES.map((item) => (
          <Button
            key={item.id}
            variant={engine === item.id ? "default" : "outline"}
            className={engine === item.id ? item.activeClass : ""}
            onClick={() => handleClick(item.id)}
          >
            {item.label}
          </Button>
        ))}
      </div>

      {engine === "evolution" && (
        <div className="p-5 border border-amber-200 dark:border-amber-800 rounded-lg bg-amber-50/50 dark:bg-amber-900/20 space-y-3 mt-4">
          <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 font-semibold text-base">
            <AlertCircle className="w-5 h-5 shrink-0" />
            Evolution API - En desarrollo
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            Esta integración no oficial reemplazará la antigua sidecar de Baileys. Al enviar mensajes
            con esta opción seleccionada, el sistema mostrará un aviso de advertencia.
          </p>
        </div>
      )}
    </>
  );
}
