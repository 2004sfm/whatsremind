import type { TemplateItem } from "./types";

export type ClientVariableField = "code" | "debt" | "name" | "greeting";

export const DEFAULT_VARIABLE_MAPPING: Record<number, ClientVariableField> = {
  0: "greeting",
  1: "code",
  2: "debt",
  3: "name",
};

export const SAMPLE_VALUES: Record<ClientVariableField, string> = {
  greeting: "¡Buenos días!",
  code: "4.PH.D",
  debt: "$432.40",
  name: "Juan Pérez",
};

export const CLIENT_VARIABLE_LABELS: Record<ClientVariableField, string> = {
  code: "Código / Apartamento",
  debt: "Saldo pendiente",
  name: "Nombre del cliente",
  greeting: "Saludo dinámico",
};

/**
 * Resolves the preview sample value for a given token (e.g. "{{1}}").
 */
export function resolveSampleValue(
  token: string,
  variableMap?: Record<number, ClientVariableField>
): string {
  const match = token.match(/\d+/);
  if (!match) return token;

  const index = parseInt(match[0], 10);
  const mappedField = variableMap?.[index] ?? DEFAULT_VARIABLE_MAPPING[index];

  if (mappedField && SAMPLE_VALUES[mappedField]) {
    return SAMPLE_VALUES[mappedField];
  }

  return token;
}

/**
 * Extracts all unique positional variable numbers present in body text, e.g. [1, 2].
 */
export function extractTemplateVariableIndices(bodyText?: string): number[] {
  if (!bodyText) return [];
  const matches = bodyText.match(/\{\{(\d+)\}\}/g);
  if (!matches) return [];

  const indices = new Set<number>();
  for (const match of matches) {
    const num = parseInt(match.replace(/\D/g, ""), 10);
    if (!Number.isNaN(num)) {
      indices.add(num);
    }
  }

  return Array.from(indices).sort((a, b) => a - b);
}

/**
 * Counts the highest body variable index ({{1}} ... {{10}}) used in a template.
 * Returns 0 when the template has no body variables.
 */
export function countBodyVariables(template: TemplateItem | undefined): number {
  if (!template) return 0;

  const bodyComponent = template.components.find(
    (c) => c.type === "BODY" || (c as { component_type?: string }).component_type === "BODY"
  );

  if (!bodyComponent?.text) return 0;

  let variablesCount = 0;
  for (let i = 1; i <= 10; i++) {
    if (bodyComponent.text.includes(`{{${i}}}`)) {
      variablesCount = i;
    }
  }
  return variablesCount;
}

/**
 * Returns the localized error message for a template fetch failure.
 */
export function describeTemplateError(engine: string, error: string): string {
  if (engine === "meta" && (error.includes("expirado") || error.includes("inválido"))) {
    return "No se pueden enviar mensajes en este momento porque tu token de acceso a Meta ha expirado. Por favor, renuévalo en Configuración.";
  }
  return error;
}

/** Localizes a Meta template status. */
export function translateStatus(status: string): string {
  switch (status.toUpperCase()) {
    case "APPROVED":
      return "Aprobada";
    case "REJECTED":
      return "Rechazada";
    case "PENDING":
      return "Pendiente";
    case "PAUSED":
      return "Pausada";
    default:
      return status;
  }
}

/** Localizes a Meta template category. */
export function translateCategory(category: string): string {
  switch (category.toUpperCase()) {
    case "UTILITY":
      return "Utilidad";
    case "MARKETING":
      return "Marketing";
    case "AUTHENTICATION":
      return "Autenticación";
    default:
      return category;
  }
}

/** Localizes a template language code. */
export function translateLanguage(lang: string): string {
  const map: Record<string, string> = {
    es: "Español",
    es_AR: "Español (Argentina)",
    es_MX: "Español (México)",
    es_ES: "Español (España)",
    en: "Inglés",
    en_US: "Inglés (EEUU)",
  };
  return map[lang] || lang.toUpperCase();
}

/** Returns the text of a given template component, if present. */
export function getComponentText(template: TemplateItem, type: string): string | undefined {
  return template.components.find((c) => c.type === type)?.text;
}

/** True when the template defines a component of the given type. */
export function hasComponent(template: TemplateItem, type: string): boolean {
  return template.components.some((c) => c.type === type);
}
