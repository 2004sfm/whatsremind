import * as XLSX from "xlsx";
import { parsePhoneNumberFromString, type CountryCode } from "libphonenumber-js";

export interface ColumnMapping {
  phone: number;
  phone2?: number;
  name: number;
  code: number;
  debt: number;
}

export interface ExcelPreview {
  headers: string[];
  rows: string[][];
  total_rows: number;
  sheets: string[];
  current_sheet: string;
}

export function normalizePhone(raw: string, defaultCountry: string = "VE"): { phone: string; isValid: boolean } {
  let cleaned = raw.replace(/\s+/g, "").replace(/-/g, "");
  if (!cleaned) return { phone: "", isValid: false };

  // Venezuela / International preprocessing: if 11+ digits and does not start with 0 or +, add +
  if (!cleaned.startsWith("+") && cleaned.length >= 11 && !cleaned.startsWith("0")) {
    cleaned = `+${cleaned}`;
  }

  const parsed = parsePhoneNumberFromString(cleaned, defaultCountry.toUpperCase() as CountryCode);
  if (parsed && parsed.isValid()) {
    return { phone: parsed.format("E.164"), isValid: true };
  }

  return { phone: cleaned, isValid: false };
}

export function findHeaderRowIndex(rows: (string | number | boolean | null | undefined)[][]): number {
  let bestIndex = 0;
  let maxScore = -1;

  const keywords = [
    ["apto", "apartamento", "casa", "villa", "codigo", "unidad", "inmueble"],
    ["nombre", "propietario", "inquilino", "cliente", "titular", "nombres"],
    ["telefono", "celular", "whatsapp", "contacto", "tlf", "numero"],
    ["deuda", "saldo", "monto", "pagar", "total"],
  ];

  const scanLimit = Math.min(rows.length, 20);

  for (let i = 0; i < scanLimit; i++) {
    const row = rows[i] || [];
    let keywordScore = 0;
    const familiesFound = new Array(keywords.length).fill(false);
    let nonEmptyCount = 0;

    for (const cell of row) {
      if (cell !== null && cell !== undefined && String(cell).trim() !== "") {
        nonEmptyCount++;
        const sLower = String(cell).trim().toLowerCase();
        for (let fIdx = 0; fIdx < keywords.length; fIdx++) {
          if (!familiesFound[fIdx] && keywords[fIdx].some((k) => sLower.includes(k))) {
            familiesFound[fIdx] = true;
            keywordScore++;
          }
        }
      }
    }

    const finalScore = keywordScore * 100 + nonEmptyCount;
    if (finalScore > maxScore) {
      maxScore = finalScore;
      bestIndex = i;
    }
  }

  return bestIndex;
}

export function previewExcelBuffer(buffer: Buffer, selectedSheet?: string): ExcelPreview {
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const sheetNames = workbook.SheetNames;
  if (!sheetNames || sheetNames.length === 0) {
    throw new Error("No se encontraron hojas en el archivo Excel");
  }

  const targetSheetName = selectedSheet && sheetNames.includes(selectedSheet)
    ? selectedSheet
    : sheetNames[0];

  const worksheet = workbook.Sheets[targetSheetName];
  const rawRows: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: "" });

  const headerIdx = findHeaderRowIndex(rawRows);
  const rawHeaderRow = rawRows[headerIdx] || [];

  const seenHeaders = new Set<string>();
  const headers = rawHeaderRow.map((cell: any, idx: number) => {
    const val = String(cell).trim();
    const base = val || `Columna ${idx + 1}`;
    let name = base;
    let count = 1;
    while (seenHeaders.has(name)) {
      count++;
      name = `${base} (${count})`;
    }
    seenHeaders.add(name);
    return name;
  });

  const dataRows = rawRows.slice(headerIdx + 1);
  const previewRows = dataRows.slice(0, 10).map((row) => row.map((c) => String(c ?? "").trim()));

  return {
    headers,
    rows: previewRows,
    total_rows: dataRows.length,
    sheets: sheetNames,
    current_sheet: targetSheetName,
  };
}

export function extractAllSheetsRows(buffer: Buffer): Array<{ sheetName: string; rows: Array<{ rowNum: number; data: string[] }> }> {
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const result: Array<{ sheetName: string; rows: Array<{ rowNum: number; data: string[] }> }> = [];

  for (const sheetName of workbook.SheetNames) {
    const worksheet = workbook.Sheets[sheetName];
    const rawRows: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: "" });
    const headerIdx = findHeaderRowIndex(rawRows);
    const dataRows = rawRows.slice(headerIdx + 1);

    const rows = dataRows.map((row, idx) => ({
      rowNum: headerIdx + 2 + idx,
      data: row.map((cell) => String(cell ?? "").trim()),
    }));

    result.push({ sheetName, rows });
  }

  return result;
}
