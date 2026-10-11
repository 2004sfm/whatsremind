import { Button } from "./ui/button";
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
  );
}
