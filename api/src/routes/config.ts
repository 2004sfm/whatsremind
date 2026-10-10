import { Elysia, t } from "elysia";
import { db, schema } from "../db";
import { eq } from "drizzle-orm";

export const configRoutes = new Elysia({ prefix: "/api/config" })
  .get("/", async () => {
    const config = await db.query.appConfig.findFirst({
      where: eq(schema.appConfig.id, 1),
    });
    return config || { id: 1, engine: "meta", defaultCountry: "VE", templateName: "" };
  })
  .post(
    "/",
    async ({ body }) => {
      const existing = await db.query.appConfig.findFirst({
        where: eq(schema.appConfig.id, 1),
      });

      const updateData = {
        ...body,
        updatedAt: new Date(),
      };

      if (existing) {
        await db
          .update(schema.appConfig)
          .set(updateData)
          .where(eq(schema.appConfig.id, 1));
      } else {
        await db.insert(schema.appConfig).values({
          id: 1,
          ...updateData,
        });
      }

      return { success: true, message: "Configuración guardada correctamente" };
    },
    {
      body: t.Object({
        engine: t.Optional(t.String()),
        metaToken: t.Optional(t.String()),
        metaPhoneId: t.Optional(t.String()),
        ycloudApiKey: t.Optional(t.String()),
        ycloudPhone: t.Optional(t.String()),
        evolutionUrl: t.Optional(t.String()),
        evolutionApiKey: t.Optional(t.String()),
        evolutionInstance: t.Optional(t.String()),
        templateName: t.Optional(t.String()),
        defaultCountry: t.Optional(t.String()),
      }),
    }
  );
