import type { ColumnMapping, ExcelPreview, UIColumnMapping } from "./types";

export const NONE_VALUE = "__none__";

export const REQUIRED_FIELDS: { key: keyof UIColumnMapping; label: string; required: boolean }[] = [
  { key: "phone_number", label: "Teléfono", required: true },
  { key: "name", label: "Nombre", required: true },
  { key: "code", label: "Código", required: true },
  { key: "debt", label: "Deuda", required: true },
  { key: "phone_number_2", label: "Teléfono 2 (opcional)", required: false },
];

const KEYWORD_MAP: Record<keyof UIColumnMapping, string[]> = {
  phone_number: ["telefono", "teléfono", "celular", "phone"],
  phone_number_2: ["telefono2", "telefono 2", "tel2", "celular2", "phone2", "segundo tel"],
  name: ["nombre", "name", "grupo familiar"],
  code: ["apartamento", "apto", "apt", "unidad", "codigo", "código"],
  debt: ["saldo", "deuda", "balance", "monto"],
};

/** True when every mandatory field has a column assigned. */
export function isValidMapping(map: Partial<UIColumnMapping>): boolean {
  return !!(map.phone_number && map.name && map.code && map.debt);
}

/** Guesses the UI column mapping from the spreadsheet headers. */
export function autoMapHeaders(data: ExcelPreview): Partial<UIColumnMapping> {
  const newMap: Partial<UIColumnMapping> = {};
  const headersLower = data.headers.map((h) => h.toLowerCase().trim());

  (Object.keys(KEYWORD_MAP) as (keyof UIColumnMapping)[]).forEach((field) => {
    const idx = headersLower.findIndex((h) => KEYWORD_MAP[field].some((k) => h.includes(k)));
    if (idx !== -1) newMap[field] = data.headers[idx];
  });

  return newMap;
}

/** Translates the UI mapping into header indexes for the backend. */
export function buildBackendMapping(
  mapping: Partial<UIColumnMapping>,
  headers: string[]
): ColumnMapping {
  const getIndex = (val?: string) => headers.findIndex((h) => h === val);
  const secondPhone = mapping.phone_number_2;

  return {
    phone: getIndex(mapping.phone_number),
    phone2: secondPhone && secondPhone !== NONE_VALUE ? getIndex(secondPhone) : undefined,
    name: getIndex(mapping.name),
    code: getIndex(mapping.code),
    debt: getIndex(mapping.debt),
  };
}
