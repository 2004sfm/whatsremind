import { useState, useEffect } from "react";
import { ipc } from "../lib/ipc";
import type { TemplateItem } from "../lib/types";
import { formatError, parseMetaError } from "../lib/utils";

export interface TemplatesState {
  templates: TemplateItem[];
  selectedTemplate: string;
  setSelectedTemplate: (name: string) => void;
  isLoading: boolean;
  apiError: string | null;
  engine: string;
}

/**
 * Loads the templates available for the active WhatsApp engine when the
 * consumer becomes visible, and resets the selection when it closes.
 */
export function useTemplates(isOpen: boolean): TemplatesState {
  const [templates, setTemplates] = useState<TemplateItem[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [engine, setEngine] = useState("meta");

  useEffect(() => {
    if (!isOpen) {
      setSelectedTemplate("");
      setTemplates([]);
      setApiError(null);
      return;
    }

    let cancelled = false;
    setIsLoading(true);
    setApiError(null);

    ipc
      .getEngine()
      .then((currentEngine) => {
        if (cancelled) return;
        setEngine(currentEngine);

        const fetch = currentEngine === "unofficial" ? ipc.getLocalTemplates : ipc.getMetaTemplates;
        const onError = currentEngine === "unofficial" ? formatError : (e: unknown) => parseMetaError(formatError(e));

        return fetch()
          .then((data) => {
            if (cancelled) return;
            const available = currentEngine === "meta" ? data.filter((t) => t.status === "APPROVED") : data;
            setTemplates(available);
            if (available.length > 0) {
              setSelectedTemplate(available[0].name);
            }
          })
          .catch((err) => {
            if (!cancelled) setApiError(onError(err));
          });
      })
      .catch((err) => {
        if (!cancelled) setApiError(formatError(err));
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isOpen]);

  return { templates, selectedTemplate, setSelectedTemplate, isLoading, apiError, engine };
}
