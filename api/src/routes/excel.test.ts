import { describe, expect, it } from "bun:test";
import * as XLSX from "xlsx";
import { app } from "../index";

describe("Excel Routes Suite", () => {
  function createTestExcelFile(): File {
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([
      ["Apto", "Propietario", "Telefono", "Saldo"],
      ["101-A", "Carlos Perez", "+584121234567", "125.50"],
      ["102-B", "Maria Gomez", "04147654321", "80.00"],
    ]);
    XLSX.utils.book_append_sheet(wb, ws, "Torre_A");
    const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
    return new File([buffer], "test_condo.xlsx", {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
  }

  it("previews excel buffer correctly", async () => {
    const file = createTestExcelFile();
    const fd = new FormData();
    fd.append("file", file);

    const res = await app.handle(
      new Request("http://localhost:3001/api/excel/preview", {
        method: "POST",
        body: fd,
      })
    );

    expect(res.status).toBe(200);
    const json = (await res.json()) as {
      headers: string[];
      rows: string[][];
      sheets: string[];
      total_rows: number;
    };
    expect(json.sheets).toContain("Torre_A");
    expect(json.headers).toEqual(["Apto", "Propietario", "Telefono", "Saldo"]);
    expect(json.rows.length).toBe(2);
  });

  it("imports excel data with stringified mapping and boolean string overwrite_all", async () => {
    const file = createTestExcelFile();
    const fd = new FormData();
    fd.append("file", file);
    fd.append(
      "mapping",
      JSON.stringify({
        code: 0,
        name: 1,
        phone: 2,
        debt: 3,
      })
    );
    fd.append("overwrite_all", "false");

    const res = await app.handle(
      new Request("http://localhost:3001/api/excel/import", {
        method: "POST",
        body: fd,
      })
    );

    expect(res.status).toBe(200);
    const stats = (await res.json()) as {
      total_rows: number;
      updated: number;
      skipped: number;
      deactivated: number;
      errors: Array<{ row: number; reason: string }>;
    };
    expect(stats.total_rows).toBe(2);
    expect(stats.updated).toBeGreaterThanOrEqual(2);
  });
});
