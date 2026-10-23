import { useState, useId, useMemo, memo } from "react";
import { MessageSquare } from "lucide-react";
import { Switch } from "./ui/switch";
import { Label } from "./ui/label";
import { cn } from "../lib/utils";
import {
  type ClientVariableField,
  resolveSampleValue,
} from "../lib/template-utils";

export interface TemplatePreviewProps {
  header?: string;
  body: string;
  footer?: string;
  /** Optional custom mapping for {{1}}, {{2}}, {{3}} */
  variableMap?: Record<number, ClientVariableField>;
  /** Initial state to preview sample values instead of raw {{n}} tokens */
  defaultShowSample?: boolean;
  className?: string;
}

export const TemplatePreview = memo(function TemplatePreview({
  header,
  body,
  footer,
  variableMap,
  defaultShowSample = false,
  className,
}: TemplatePreviewProps) {
  const [showSample, setShowSample] = useState(defaultShowSample);
  const switchId = useId();

  // Parse body into structured tokens with unique stable keys
  const tokenList = useMemo(() => {
    if (!body) return [];
    return body.split(/(\{\{\d+\}\})/g).map((segment, idx) => ({
      key: `tok_${idx}_${segment.slice(0, 8)}`,
      text: segment,
      isVariable: /^\{\{\d+\}\}$/.test(segment),
    }));
  }, [body]);

  return (
    <div
      className={cn(
        "rounded-xl border border-slate-200 bg-slate-50/70 p-3 sm:p-4 text-slate-700 dark:border-slate-800 dark:bg-slate-950/60 dark:text-slate-200",
        className
      )}
    >
      {/* Header bar with title and sample data toggle */}
      <div className="flex items-center justify-between pb-2.5 mb-3 border-b border-slate-200/70 dark:border-slate-800/70">
        <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          <MessageSquare className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
          <span>Vista previa</span>
        </div>

        <div className="flex items-center gap-2">
          <Label
            htmlFor={switchId}
            className="text-xs text-muted-foreground cursor-pointer select-none font-normal"
          >
            Ver datos de ejemplo
          </Label>
          <Switch
            id={switchId}
            checked={showSample}
            onCheckedChange={setShowSample}
            aria-label="Ver datos de ejemplo"
          />
        </div>
      </div>

      {/* Realistic chat bubble container */}
      <div className="rounded-xl border border-slate-200/60 bg-slate-100/60 dark:border-slate-800/50 dark:bg-slate-950/40 p-3 sm:p-4">
        <div className="mx-auto max-w-sm sm:max-w-md rounded-2xl border border-slate-200/90 bg-white p-3.5 shadow-xs text-slate-800 dark:border-slate-800/90 dark:bg-slate-900/90 dark:text-slate-100">
          {/* Message Header */}
          {header && header.trim() && (
            <div className="font-semibold text-sm text-slate-900 dark:text-white pb-2 mb-2 border-b border-slate-100 dark:border-slate-800/80">
              {header.trim()}
            </div>
          )}

          {/* Message Body with inline badges */}
          <div className="text-sm leading-relaxed text-slate-700 dark:text-slate-200 whitespace-pre-wrap break-words">
            {tokenList.length > 0 ? (
              tokenList.map((token) => {
                if (token.isVariable) {
                  return (
                    <span
                      key={token.key}
                      className="inline-flex items-center px-1.5 py-0.5 mx-0.5 rounded text-xs font-mono font-medium bg-emerald-500/10 text-emerald-700 border border-emerald-500/25 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/30 align-baseline transition-colors"
                    >
                      {showSample ? resolveSampleValue(token.text, variableMap) : token.text}
                    </span>
                  );
                }
                return <span key={token.key}>{token.text}</span>;
              })
            ) : (
              <span className="italic text-slate-400 dark:text-slate-500">
                Sin cuerpo de texto
              </span>
            )}
          </div>

          {/* Message Footer */}
          {footer && footer.trim() && (
            <div className="text-xs text-slate-400 dark:text-slate-500 pt-2 mt-2 border-t border-slate-100 dark:border-slate-800/80">
              {footer.trim()}
            </div>
          )}
        </div>
      </div>
    </div>
  );
});
