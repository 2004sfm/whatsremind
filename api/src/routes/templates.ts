import { Elysia, t } from "elysia";
import { db, schema } from "../db";
import { eq, or, and } from "drizzle-orm";

export const templateRoutes = new Elysia({ prefix: "/api/templates" })
  .get(
    "/",
    async ({ query, set }) => {
      const config = await db.query.appConfig.findFirst({
        where: eq(schema.appConfig.id, 1),
      });

      const selectedEngine = (query.engine || config?.engine || "meta").toLowerCase();

      // Always load local template names to check for existing copies
      const allLocals = await db.query.localTemplates.findMany();
      const localNames = new Set(allLocals.map((t) => t.name));

      // 1. UNOFFICIAL (GOWA) -> Only local templates from SQLite
      if (selectedEngine === "unofficial") {
        return allLocals.map((t) => {
          let components = [];
          try {
            components = JSON.parse(t.componentsJson);
          } catch {
            components = [];
          }
          return {
            id: t.id,
            name: t.name,
            language: t.language,
            status: t.status,
            category: t.category,
            components: Array.isArray(components) ? components : [],
            isLocal: true,
            hasLocalCopy: true,
          };
        });
      }

      // 2. YCLOUD -> Fetch directly from YCloud v2 API
      if (selectedEngine === "ycloud") {
        const activeChannel = await db.query.channels.findFirst({
          where: and(
            eq(schema.channels.engine, "ycloud"),
            eq(schema.channels.isActive, 1)
          ),
        });

        let apiKey = "";
        let wabaId = "";

        if (activeChannel) {
          try {
            const creds = JSON.parse(activeChannel.credentials) as {
              apiKey?: string;
              wabaId?: string;
            };
            apiKey = creds.apiKey || "";
            wabaId = creds.wabaId || "";
          } catch {
            // malformed credentials
          }
        }

        if (!apiKey && config?.ycloudApiKey) {
          apiKey = config.ycloudApiKey;
        }

        if (!apiKey) {
          return [];
        }

        try {
          const url = wabaId
            ? `https://api.ycloud.com/v2/whatsapp/templates?wabaId=${encodeURIComponent(wabaId)}`
            : "https://api.ycloud.com/v2/whatsapp/templates";

          const res = await fetch(url, {
            headers: { "X-API-Key": apiKey },
          });

          if (!res.ok) {
            const errData = (await res.json().catch(() => null)) as { message?: string } | null;
            set.status = res.status;
            return { error: errData?.message || `Error de YCloud API: ${res.status}` };
          }

          const data = (await res.json()) as {
            items?: Array<{
              officialTemplateId?: string;
              id?: string;
              name: string;
              language: string;
              status?: string;
              category?: string;
              components?: Array<{ type: string; text?: string; format?: string }>;
            }>;
          };

          const items = Array.isArray(data.items) ? data.items : [];
          return items.map((item) => ({
            id: item.officialTemplateId || item.id || item.name,
            name: item.name,
            language: item.language,
            status: item.status || "APPROVED",
            category: item.category || "UTILITY",
            components: Array.isArray(item.components) ? item.components : [],
            isLocal: false,
            hasLocalCopy: localNames.has(item.name),
          }));
        } catch (err: unknown) {
          set.status = 502;
          return { error: err instanceof Error ? err.message : "Error de red al conectar con YCloud" };
        }
      }

      // 3. META -> Fetch from Meta Graph API
      if (selectedEngine === "meta") {
        const activeChannel = await db.query.channels.findFirst({
          where: and(
            eq(schema.channels.engine, "meta"),
            eq(schema.channels.isActive, 1)
          ),
        });

        let token = "";
        let phoneId = "";
        let wabaId = "";

        if (activeChannel) {
          try {
            const creds = JSON.parse(activeChannel.credentials) as {
              token?: string;
              phoneId?: string;
              wabaId?: string;
            };
            token = creds.token || "";
            phoneId = creds.phoneId || "";
            wabaId = creds.wabaId || "";
          } catch {
            // malformed credentials
          }
        }

        if (!token && config?.metaToken) {
          token = config.metaToken;
          phoneId = config.metaPhoneId || "";
        }

        if (!token) {
          return [];
        }

        try {
          // If wabaId was not explicitly saved, resolve it from phoneId
          if (!wabaId && phoneId) {
            const phoneRes = await fetch(
              `https://graph.facebook.com/v21.0/${phoneId}?fields=whatsapp_business_account`,
              { headers: { Authorization: `Bearer ${token}` } }
            );
            if (phoneRes.ok) {
              const phoneData = (await phoneRes.json()) as {
                whatsapp_business_account?: { id?: string };
              };
              if (phoneData.whatsapp_business_account?.id) {
                wabaId = phoneData.whatsapp_business_account.id;
              }
            }
          }

          if (!wabaId) {
            return [];
          }

          const res = await fetch(
            `https://graph.facebook.com/v21.0/${wabaId}/message_templates?limit=100`,
            { headers: { Authorization: `Bearer ${token}` } }
          );

          if (!res.ok) {
            const errData = (await res.json().catch(() => null)) as {
              error?: { message?: string };
            } | null;
            set.status = res.status;
            return { error: errData?.error?.message || `Error de Meta API: ${res.status}` };
          }

          const data = (await res.json()) as {
            data?: Array<{
              id: string;
              name: string;
              language: string;
              status: string;
              category: string;
              components?: Array<{ type: string; text?: string; format?: string }>;
            }>;
          };

          const items = Array.isArray(data.data) ? data.data : [];
          return items.map((item) => ({
            id: item.id,
            name: item.name,
            language: item.language,
            status: item.status,
            category: item.category,
            components: Array.isArray(item.components) ? item.components : [],
            isLocal: false,
            hasLocalCopy: localNames.has(item.name),
          }));
        } catch (err: unknown) {
          set.status = 502;
          return { error: err instanceof Error ? err.message : "Error de red al conectar con Meta" };
        }
      }

      return [];
    },
    {
      query: t.Object({
        engine: t.Optional(t.String()),
      }),
    }
  )
  .post(
    "/",
    async ({ body }) => {
      const { id, name, language, status, category, componentsJson } = body;

      const existing = await db.query.localTemplates.findFirst({
        where: or(
          eq(schema.localTemplates.id, id),
          eq(schema.localTemplates.name, name)
        ),
      });

      if (existing) {
        await db
          .update(schema.localTemplates)
          .set({ name, language, status, category, componentsJson })
          .where(eq(schema.localTemplates.id, existing.id));
      } else {
        await db.insert(schema.localTemplates).values({
          id,
          name,
          language,
          status,
          category,
          componentsJson,
        });
      }

      return { success: true };
    },
    {
      body: t.Object({
        id: t.String(),
        name: t.String(),
        language: t.String(),
        status: t.String(),
        category: t.String(),
        componentsJson: t.String(),
      }),
    }
  )
  .post(
    "/import",
    async ({ body }) => {
      const { name, language, category, components } = body;
      const id = name.toLowerCase().replace(/[^a-z0-9_]/g, "_");
      const componentsJson = JSON.stringify(components || []);

      const existing = await db.query.localTemplates.findFirst({
        where: or(
          eq(schema.localTemplates.id, id),
          eq(schema.localTemplates.name, name)
        ),
      });

      if (existing) {
        await db
          .update(schema.localTemplates)
          .set({
            name,
            language: language || "es",
            status: "LOCAL",
            category: category || "UTILITY",
            componentsJson,
          })
          .where(eq(schema.localTemplates.id, existing.id));
      } else {
        await db.insert(schema.localTemplates).values({
          id,
          name,
          language: language || "es",
          status: "LOCAL",
          category: category || "UTILITY",
          componentsJson,
        });
      }

      return { success: true, name };
    },
    {
      body: t.Object({
        name: t.String(),
        language: t.Optional(t.String()),
        category: t.Optional(t.String()),
        components: t.Array(
          t.Object(
            {
              type: t.String(),
              text: t.Optional(t.String()),
              format: t.Optional(t.String()),
            },
            { additionalProperties: true }
          )
        ),
      }),
    }
  )
  .put(
    "/:name",
    async ({ params, body, set }) => {
      const { components, category, language } = body;
      const existing = await db.query.localTemplates.findFirst({
        where: or(
          eq(schema.localTemplates.name, params.name),
          eq(schema.localTemplates.id, params.name)
        ),
      });

      if (!existing) {
        set.status = 404;
        return { success: false, error: "Plantilla no encontrada" };
      }

      const updates: Record<string, unknown> = {};
      if (components) {
        updates.componentsJson = JSON.stringify(components);
      }
      if (category) updates.category = category;
      if (language) updates.language = language;

      await db
        .update(schema.localTemplates)
        .set(updates)
        .where(eq(schema.localTemplates.id, existing.id));

      return { success: true };
    },
    {
      params: t.Object({
        name: t.String(),
      }),
      body: t.Object({
        components: t.Optional(
          t.Array(
            t.Object(
              {
                type: t.String(),
                text: t.Optional(t.String()),
                format: t.Optional(t.String()),
              },
              { additionalProperties: true }
            )
          )
        ),
        category: t.Optional(t.String()),
        language: t.Optional(t.String()),
      }),
    }
  )
  .delete(
    "/:name",
    async ({ params }) => {
      await db.delete(schema.localTemplates).where(
        or(
          eq(schema.localTemplates.name, params.name),
          eq(schema.localTemplates.id, params.name)
        )
      );
      return { success: true };
    },
    {
      params: t.Object({
        name: t.String(),
      }),
    }
  );
