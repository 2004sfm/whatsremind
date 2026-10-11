import { Card, CardContent } from "./ui/card";
import { AlertCircle, CheckCircle2, Cloud, Smartphone } from "lucide-react";
import type { TemplateItem } from "../lib/types";
import { translateCategory, translateLanguage, translateStatus, getComponentText } from "../lib/template-utils";

interface TemplateCardProps {
  template: TemplateItem;
  onClick: () => void;
}

const STATUS_TONES: Record<string, string> = {
  APPROVED: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  REJECTED: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  DEFAULT: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
};

export function TemplateCard({ template, onClick }: TemplateCardProps) {
  const isApproved = template.status === "APPROVED";
  const isRejected = template.status === "REJECTED";

  return (
    <Card
      className="border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md hover:border-emerald-500/30 transition-color cursor-pointer bg-white dark:bg-slate-900 h-full flex flex-col"
      onClick={onClick}
    >
      <CardContent className="p-5 flex flex-col h-full">
        <div className="flex justify-between items-start mb-3">
          <h3
            className="font-semibold text-slate-900 dark:text-white truncate pr-3 flex items-center gap-2"
            title={template.name}
          >
            {template.isLocal ? (
              <Smartphone className="w-4 h-4 text-blue-500 shrink-0" />
            ) : (
              <Cloud className="w-4 h-4 text-emerald-500 shrink-0" />
            )}
            <span className="truncate">{template.name}</span>
          </h3>

          <TemplateStatusBadge template={template} isApproved={isApproved} isRejected={isRejected} />
        </div>

        <div className="mb-4 mt-1">
          <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
            {getComponentText(template, "BODY") || (
              <span className="italic opacity-70">Sin contenido</span>
            )}
          </p>
        </div>

        <div className="mt-auto">
          <div className="flex items-center justify-between text-xs text-slate-500 border-t border-slate-100 dark:border-slate-800/60 pt-3">
            <span className="bg-slate-100 dark:bg-slate-800/80 px-2.5 py-1 rounded-md font-medium">
              Idioma: {translateLanguage(template.language || "es")}
            </span>
            <span className="text-slate-400">
              Categoría: {template.isLocal ? "Personalizada" : translateCategory(template.category)}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function TemplateStatusBadge({
  template,
  isApproved,
  isRejected,
}: {
  template: TemplateItem;
  isApproved: boolean;
  isRejected: boolean;
}) {
  if (template.isLocal) {
    return (
      <div className="text-[10px] uppercase font-bold tracking-wider px-2 py-1 rounded-full shrink-0 flex items-center gap-1 bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
        Local
      </div>
    );
  }

  const tone = isApproved ? STATUS_TONES.APPROVED : isRejected ? STATUS_TONES.REJECTED : STATUS_TONES.DEFAULT;

  return (
    <div
      className={`text-[10px] uppercase font-bold tracking-wider px-2 py-1 rounded-full shrink-0 flex items-center gap-1 ${tone}`}
    >
      {isApproved && <CheckCircle2 className="w-3 h-3" />}
      {isRejected && <AlertCircle className="w-3 h-3" />}
      {translateStatus(template.status)}
    </div>
  );
}
