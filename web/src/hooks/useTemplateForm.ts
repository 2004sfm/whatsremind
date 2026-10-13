import { useState, useCallback } from "react";
import { ipc } from "../lib/ipc";
import { formatError } from "../lib/utils";

export interface TemplateFormValues {
  name: string;
  header: string;
  body: string;
  footer: string;
}

const EMPTY_FORM: TemplateFormValues = { name: "", header: "", body: "", footer: "" };

/** Limits per field, which differ between Meta and local (unofficial) engines. */
export const TEMPLATE_LIMITS = {
  name: 512,
  unofficial: { header: 120, body: 4096, footer: 120 },
  meta: { header: 60, body: 1024, footer: 60 },
} as const;

export type FieldLimits = { header: number; body: number; footer: number };

/** Returns the field limits that apply to the given engine. */
export function limitsFor(engine: string): FieldLimits {
  return engine === "unofficial" ? TEMPLATE_LIMITS.unofficial : TEMPLATE_LIMITS.meta;
}

export function isMetaBodyInvalid(body: string): boolean {
  return /^\s*\{\{/.test(body) || /\}\}\s*$/.test(body);
}

/** Sanitizes the name field according to the active engine rules. */
export function sanitizeName(engine: string, value: string): string {
  return engine === "unofficial"
    ? value
    : value.toLowerCase().replace(/[^a-z0-9_]/g, "");
}

export function sanitizeHeader(value: string): string {
  return value.replace(/\*/g, "");
}

export function isFormSubmittable(
  values: TemplateFormValues,
  engine: string,
  isSaving: boolean
): boolean {
  if (isSaving || !values.name || !values.body) return false;
  return !(engine === "meta" && isMetaBodyInvalid(values.body));
}

/**
 * Owns the create-template form state, validation and submission for both
 * Meta and local (unofficial) engines.
 *
 * @param initialValues pre-populates the form (used when cloning a template)
 */
export function useTemplateForm(onSaved: () => void, initialValues?: Partial<TemplateFormValues>) {
  const [values, setValues] = useState<TemplateFormValues>({ ...EMPTY_FORM, ...initialValues });
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const setField = useCallback((field: keyof TemplateFormValues, value: string) => {
    setValues((prev) => ({ ...prev, [field]: value }));
  }, []);

  const reset = useCallback(() => {
    setValues(EMPTY_FORM);
    setError(null);
  }, []);

  const submit = async (engine: string) => {
    setIsSaving(true);
    setError(null);
    try {
      const args = [
        values.name.trim(),
        values.header.trim() || null,
        values.body.trim(),
        values.footer.trim() || null,
        "UTILITY",
        "es",
      ] as const;

      if (engine === "unofficial") {
        await ipc.createLocalTemplate(...args);
      } else {
        await ipc.createMetaTemplate(...args);
      }

      reset();
      onSaved();
    } catch (err: unknown) {
      setError(formatError(err));
    } finally {
      setIsSaving(false);
    }
  };

  return { values, setField, isSaving, error, submit, reset };
}
