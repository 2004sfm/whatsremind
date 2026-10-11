import { Button } from "./ui/button";
import { AlertCircle } from "lucide-react";
import { cn } from "../lib/utils";

export type Engine = "meta" | "ycloud" | "unofficial";

interface EngineSelectorProps {
  engine: string;
  onChange: (engine: string) => void;
}

const ENGINES: { id: Engine; label: string; activeClass: string }[] = [
  { id: "meta", label: "Meta Cloud API", activeClass: "bg-emerald-600 hover:bg-emerald-700 text-white" },
  { id: "ycloud", label: "YCloud API", activeClass: "bg-emerald-600 hover:bg-emerald-700 text-white" },
  {
    id: "unofficial",
    label: "No oficial (Emergencia)",
    activeClass: "bg-amber-600 hover:bg-amber-700 text-white",
  },
];

export function EngineSelector({ engine, onChange }: EngineSelectorProps) {
  const handleClick = (id: Engine) => {
    onChange(id);
  };

  return (
    <>
      <div className="flex flex-wrap gap-3">
        {ENGINES.map((item) => (
          <Button
            key={item.id}
            variant={engine === item.id ? "default" : "outline"}
            className={cn(engine === item.id ? item.activeClass : "")}
            onClick={() => handleClick(item.id)}
          >
            {item.label}
          </Button>
        ))}
      </div>

      {engine === "unofficial" && (
        <div className="p-5 border border-amber-200 dark:border-amber-800 rounded-lg bg-amber-50/50 dark:bg-amber-900/20 space-y-3 mt-4">
          <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 font-semibold text-base">
            <AlertCircle className="w-5 h-5 shrink-0" />
            No oficial (Emergencia)
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            Esta integración permite enviar mensajes a través de una conexión directa vinculada por
            código QR. Se recomienda únicamente como alternativa de contingencia ante fallas en los
            servicios oficiales.
          </p>
        </div>
      )}
    </>
  );
}
