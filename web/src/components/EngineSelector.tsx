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
    label: "GOWA",
    activeClass: "bg-emerald-600 hover:bg-emerald-700 text-white",
  },
];

export function EngineSelector({ engine, onChange }: EngineSelectorProps) {
  const handleClick = (id: Engine) => {
    onChange(id);
  };

  return (
    <div className="flex items-center gap-2.5 sm:gap-3 overflow-x-auto pb-1 scrollbar-none w-full">
      {ENGINES.map((item) => {
        const isSelected = engine === item.id;
        return (
          <Button
            key={item.id}
            type="button"
            variant={isSelected ? "default" : "outline"}
            className={cn(
              "shrink-0 whitespace-nowrap text-sm font-medium h-10 px-4",
              isSelected
                ? item.activeClass
                : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            )}
            onClick={() => handleClick(item.id)}
          >
            {item.label}
          </Button>
        );
      })}
    </div>
  );
}
