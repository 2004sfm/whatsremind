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
    label: "GOWA (WhatsApp Web)",
    activeClass: "bg-emerald-600 hover:bg-emerald-700 text-white",
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
        <div className="p-4 border border-emerald-200 dark:border-emerald-800 rounded-lg bg-emerald-50/40 dark:bg-emerald-950/20 space-y-2 mt-4">
          <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 font-semibold text-sm">
            <AlertCircle className="w-4 h-4 shrink-0 text-emerald-600" />
            GOWA (WhatsApp Web local)
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
            Conexión directa multi-dispositivo administrada localmente mediante GOWA. Vincula tu
            línea escaneando un código QR o usando un código de emparejamiento.
          </p>
        </div>
      )}
    </>
  );
}
