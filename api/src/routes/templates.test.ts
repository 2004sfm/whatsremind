import { describe, expect, it, mock, afterEach } from "bun:test";
import { app } from "../index";
import { db, schema } from "../db";
import { eq } from "drizzle-orm";
import { replaceParameters } from "../lib/render-template";

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

    // 2.5 Update the imported template
    const updateRes = await app.handle(
      new Request("http://localhost:3001/api/templates/test_imported_template", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          components: [
            { type: "BODY", text: "{{salute}} {{3}}, su apartamento {{1}} debe {{2}}." },
          ],
        }),
      })
    );
    expect(updateRes.status).toBe(200);

    const updatedTpl = await db.query.localTemplates.findFirst({
      where: eq(schema.localTemplates.name, "test_imported_template"),
    });
    expect(updatedTpl?.componentsJson).toContain("{{salute}}");

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
    // Ensure active channel exists for YCloud
    await db.insert(schema.channels).values({
      engine: "ycloud",
      phoneNumber: "+584141234567",
      credentials: JSON.stringify({ apiKey: "test_api_key", wabaId: "test_waba_id" }),
      isActive: 1,
    });

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

  it("replaces parameters {{1}}, {{2}}, {{3}} and dynamic greetings correctly without spintax mangling", () => {
    const text = "Estimado/a {{1}}, tiene saldo pendiente de {{2}} para el apto {{3}}. {Hola|Buen día}";
    const rendered = replaceParameters(text, ["Carlos Perez", "$125.50", "101-A"]);

    expect(rendered).toContain("Estimado/a Carlos Perez");
    expect(rendered).toContain("saldo pendiente de $125.50");
    expect(rendered).toContain("para el apto 101-A");
    expect(rendered.includes("{Hola") || rendered.includes("{Buen día")).toBe(false);
    expect(rendered.includes("Hola") || rendered.includes("Buen día")).toBe(true);
    expect(rendered.includes("{1}") || rendered.includes("{2}") || rendered.includes("{3}")).toBe(false);
  });

  it("supports single-brace variables {1}, {2} as fallback", () => {
    const text = "Aviso {1} con deuda {2}";
    const rendered = replaceParameters(text, ["101-A", "$50.00"]);
    expect(rendered).toBe("Aviso 101-A con deuda $50.00");
  });
});
