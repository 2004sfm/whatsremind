import { Elysia, t } from "elysia";
import { db, schema } from "../db";
import { eq } from "drizzle-orm";

export const templateRoutes = new Elysia({ prefix: "/api/templates" })
  .get("/", async () => {
    return await db.query.localTemplates.findMany();
  })
  .post(
    "/",
    async ({ body }) => {
      const { id, name, language, status, category, componentsJson } = body;

      const existing = await db.query.localTemplates.findFirst({
        where: eq(schema.localTemplates.id, id),
      });

      if (existing) {
        await db
          .update(schema.localTemplates)
          .set({ name, language, status, category, componentsJson })
          .where(eq(schema.localTemplates.id, id));
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
  );
