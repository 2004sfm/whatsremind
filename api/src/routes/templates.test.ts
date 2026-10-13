import { describe, expect, it, mock, afterEach } from "bun:test";
import { app } from "../index";
import { db, schema } from "../db";
import { eq } from "drizzle-orm";

describe("Templates Routes Suite", () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("handles importing, fetching, and deleting local templates for unofficial engine", async () => {
    const templateData = {
      name: "test_imported_template",
      language: "es",
      category: "UTILITY",
      components: [
        { type: "BODY", text: "Hola {{1}}, su deuda es de {{2}}." },
      ],
    };

    // 1. Import template to local SQLite
    const importRes = await app.handle(
      new Request("http://localhost:3001/api/templates/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(templateData),
      })
    );
    expect(importRes.status).toBe(200);
    const importJson = (await importRes.json()) as { success: boolean; name: string };
    expect(importJson.success).toBe(true);
    expect(importJson.name).toBe("test_imported_template");

    // 2. Fetch templates for unofficial engine
    const getRes = await app.handle(
      new Request("http://localhost:3001/api/templates?engine=unofficial")
    );
    expect(getRes.status).toBe(200);
    const templates = (await getRes.json()) as Array<{
      name: string;
      isLocal: boolean;
      components: Array<{ type: string; text?: string }>;
    }>;

    const found = templates.find((t) => t.name === "test_imported_template");
    expect(found).toBeDefined();
    expect(found?.isLocal).toBe(true);
    expect(found?.components[0]?.text).toContain("Hola {{1}}");

    // 3. Delete the imported template
    const deleteRes = await app.handle(
      new Request("http://localhost:3001/api/templates/test_imported_template", {
        method: "DELETE",
      })
    );
    expect(deleteRes.status).toBe(200);

    // Verify deletion
    const checkDeleted = await db.query.localTemplates.findFirst({
      where: eq(schema.localTemplates.name, "test_imported_template"),
    });
    expect(checkDeleted).toBeUndefined();
  });

  it("fetches and normalizes YCloud templates using mock API response", async () => {
    globalThis.fetch = mock(async () => {
      return new Response(
        JSON.stringify({
          items: [
            {
              officialTemplateId: "987654321",
              name: "aviso_pago_ycloud",
              language: "es",
              category: "UTILITY",
              status: "APPROVED",
              components: [
                { type: "BODY", text: "Estimado cliente, recuerde su pago." },
              ],
            },
          ],
        }),
        { status: 200 }
      );
    }) as unknown as typeof fetch;

    const res = await app.handle(
      new Request("http://localhost:3001/api/templates?engine=ycloud")
    );
    expect(res.status).toBe(200);
    const data = (await res.json()) as Array<{
      id: string;
      name: string;
      status: string;
      isLocal: boolean;
      hasLocalCopy: boolean;
    }>;

    expect(data.length).toBeGreaterThan(0);
    const item = data.find((t) => t.name === "aviso_pago_ycloud");
    expect(item).toBeDefined();
    expect(item?.id).toBe("987654321");
    expect(item?.status).toBe("APPROVED");
    expect(item?.isLocal).toBe(false);
  });
});
