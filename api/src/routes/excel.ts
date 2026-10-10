import { Elysia, t } from "elysia";
import { db, schema, sqlite } from "../db";
import {
  previewExcelBuffer,
  extractAllSheetsRows,
  normalizePhone,
  type ColumnMapping,
} from "../services/excel";
import { eq } from "drizzle-orm";

export const excelRoutes = new Elysia({ prefix: "/api/excel" })
  .post(
    "/preview",
    async ({ body }) => {
      const { file, sheet } = body;
      const buffer = Buffer.from(await file.arrayBuffer());
      return previewExcelBuffer(buffer, sheet);
    },
    {
      body: t.Object({
        file: t.File(),
        sheet: t.Optional(t.String()),
      }),
    }
  )
  .post(
    "/import",
    async ({ body }) => {
      const { file, mapping, overwrite_all = false } = body;
      const buffer = Buffer.from(await file.arrayBuffer());

      // Get configured default country
      const config = await db.query.appConfig.findFirst({
        where: eq(schema.appConfig.id, 1),
      });
      const defaultCountry = config?.defaultCountry || "VE";

      const sheetsData = extractAllSheetsRows(buffer);

      const stats = {
        total_rows: 0,
        created: 0,
        updated: 0,
        deactivated: 0,
        skipped: 0,
        errors: [] as Array<{ row: number; reason: string }>,
      };

      const parsedMapping: ColumnMapping = typeof mapping === "string" ? JSON.parse(mapping) : mapping;

      // Start transaction in SQLite
      const currentImportCodes: Array<{ code: string; sheetName: string }> = [];
      const clientsToUpsert: Array<{
        phoneNumber: string;
        phoneNumber2?: string;
        name: string;
        code: string;
        sheetName: string;
        debt: number;
        isSendable: boolean;
        isActive: boolean;
        excelRow: number;
      }> = [];

      for (const { sheetName, rows } of sheetsData) {
        stats.total_rows += rows.length;

        for (const { rowNum, data } of rows) {
          const getCol = (idx?: number) => (idx !== undefined && data[idx] ? data[idx].trim() : "");

          const p = getCol(parsedMapping.phone);
          const n = getCol(parsedMapping.name);
          const c = getCol(parsedMapping.code);
          const d = getCol(parsedMapping.debt);

          const filledCount = Number(!!p) + Number(!!n) + Number(!!c) + Number(!!d);
          if (filledCount <= 1) {
            stats.skipped++;
            continue;
          }

          if (!c) {
            stats.skipped++;
            stats.errors.push({
              row: rowNum,
              reason: `[Hoja: ${sheetName}] Error: El código de apartamento es obligatorio. Fila ignorada.`,
            });
            continue;
          }

          const clientName = n || "Sin nombre";
          if (!n) {
            stats.errors.push({
              row: rowNum,
              reason: `[Hoja: ${sheetName}] Aviso: Nombre vacío. Se asume 'Sin nombre'.`,
            });
          }

          const debtVal = parseFloat(d.replace(/,/g, "."));
          const balance = isNaN(debtVal) ? 0 : debtVal;
          if (d && isNaN(debtVal)) {
            stats.errors.push({
              row: rowNum,
              reason: `[Hoja: ${sheetName}] Aviso: Deuda inválida ('${d}'). Se asumió 0.00.`,
            });
          }

          const { phone: normalizedPhone, isValid } = normalizePhone(p, defaultCountry);
          const phone2Raw = parsedMapping.phone2 !== undefined ? getCol(parsedMapping.phone2) : "";
          const normalizedPhone2 = phone2Raw ? normalizePhone(phone2Raw, defaultCountry).phone : undefined;

          if (!normalizedPhone) {
            stats.errors.push({
              row: rowNum,
              reason: `[Hoja: ${sheetName}] Aviso: Teléfono vacío. Se guardó pero no se podrán enviar mensajes.`,
            });
          }

          currentImportCodes.push({ code: c, sheetName });

          clientsToUpsert.push({
            phoneNumber: normalizedPhone,
            phoneNumber2: normalizedPhone2,
            name: clientName,
            code: c,
            sheetName,
            debt: balance,
            isSendable: isValid,
            isActive: true,
            excelRow: rowNum,
          });
        }
      }

      // Execute atomic batch upsert inside transaction
      sqlite.transaction(() => {
        // 1. Create temporary table for imported keys
        sqlite.exec("CREATE TEMP TABLE IF NOT EXISTS current_import (code TEXT, sheet_name TEXT, UNIQUE(code, sheet_name));");
        sqlite.exec("DELETE FROM current_import;");

        const insertTempStmt = sqlite.prepare("INSERT OR IGNORE INTO current_import (code, sheet_name) VALUES (?, ?);");
        for (const item of currentImportCodes) {
          insertTempStmt.run(item.code, item.sheetName);
        }

        // 2. Upsert clients
        const upsertStmt = sqlite.prepare(`
          INSERT INTO clients (phone_number, phone_number_2, name, code, sheet_name, debt, is_sendable, is_active, excel_row)
          VALUES ($phoneNumber, $phoneNumber2, $name, $code, $sheetName, $debt, $isSendable, $isActive, $excelRow)
          ON CONFLICT(code, sheet_name) DO UPDATE SET
            phone_number = excluded.phone_number,
            phone_number_2 = excluded.phone_number_2,
            name = excluded.name,
            debt = excluded.debt,
            is_sendable = excluded.is_sendable,
            is_active = 1,
            excel_row = excluded.excel_row
        `);

        for (const c of clientsToUpsert) {
          upsertStmt.run({
            $phoneNumber: c.phoneNumber,
            $phoneNumber2: c.phoneNumber2 ?? null,
            $name: c.name,
            $code: c.code,
            $sheetName: c.sheetName,
            $debt: c.debt,
            $isSendable: c.isSendable ? 1 : 0,
            $isActive: 1,
            $excelRow: c.excelRow,
          });
          stats.updated++; // tracked as updated/upserted
        }

        // 3. Deactivate clients not present in the current import
        let deactivatedCount = 0;
        if (overwrite_all) {
          const res = sqlite.run(`
            UPDATE clients SET is_active = 0 
            WHERE (code, sheet_name) NOT IN (SELECT code, sheet_name FROM current_import) 
              AND is_active = 1
          `);
          deactivatedCount = res.changes;
        } else {
          const res = sqlite.run(`
            UPDATE clients SET is_active = 0 
            WHERE (code, sheet_name) NOT IN (SELECT code, sheet_name FROM current_import) 
              AND sheet_name IN (SELECT DISTINCT sheet_name FROM current_import)
              AND is_active = 1
          `);
          deactivatedCount = res.changes;
        }

        stats.deactivated = deactivatedCount;
        sqlite.exec("DROP TABLE IF EXISTS current_import;");
      })();

      return stats;
    },
    {
      body: t.Object({
        file: t.File(),
        mapping: t.Any(),
        overwrite_all: t.Optional(t.Boolean()),
      }),
    }
  );
