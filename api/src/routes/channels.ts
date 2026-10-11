import { Elysia, t } from "elysia";
import { db, schema } from "../db";
import { eq, desc } from "drizzle-orm";

export const channelsRoutes = new Elysia({ prefix: "/api/channels" })
  .get(
    "/",
    async ({ query }) => {
      const { engine } = query;
      const where = engine ? eq(schema.channels.engine, engine) : undefined;
      return await db.query.channels.findMany({
        where,
        orderBy: [desc(schema.channels.id)],
      });
    },
    {
      query: t.Object({
        engine: t.Optional(t.String()),
      }),
    }
  )
  .post(
    "/",
    async ({ body, set }) => {
      const { engine, phoneNumber, displayName, credentials, status } = body;
      const existing = await db.query.channels.findFirst({
        where: eq(schema.channels.engine, engine),
      });
      const isActive = existing ? 0 : 1;
      const credentialsStr =
        typeof credentials === "object" ? JSON.stringify(credentials) : String(credentials ?? "{}");

      const now = new Date();
      const [inserted] = await db
        .insert(schema.channels)
        .values({
          engine,
          phoneNumber,
          displayName: displayName || null,
          credentials: credentialsStr,
          isActive,
          status: status || "connected",
          createdAt: now,
          updatedAt: now,
        })
        .returning();

      set.status = 201;
      return { ...inserted, success: true, channel: inserted };
    },
    {
      body: t.Object({
        engine: t.String(),
        phoneNumber: t.String(),
        displayName: t.Optional(t.String()),
        credentials: t.Union([t.String(), t.Record(t.String(), t.Unknown())]),
        status: t.Optional(t.String()),
      }),
    }
  )
  .post(
    "/:id/activate",
    async ({ params, set }) => {
      const id = Number(params.id);
      const target = await db.query.channels.findFirst({
        where: eq(schema.channels.id, id),
      });
      if (!target) {
        set.status = 404;
        return { success: false, error: "Canal no encontrado" };
      }

      await db
        .update(schema.channels)
        .set({ isActive: 0, updatedAt: new Date() })
        .where(eq(schema.channels.engine, target.engine));

      const [activated] = await db
        .update(schema.channels)
        .set({ isActive: 1, updatedAt: new Date() })
        .where(eq(schema.channels.id, id))
        .returning();

      return { ...activated, success: true, channel: activated };
    },
    {
      params: t.Object({ id: t.Numeric() }),
    }
  )
  .delete(
    "/:id",
    async ({ params, set }) => {
      const id = Number(params.id);
      const target = await db.query.channels.findFirst({
        where: eq(schema.channels.id, id),
      });
      if (!target) {
        set.status = 404;
        return { success: false, error: "Canal no encontrado" };
      }

      await db.delete(schema.channels).where(eq(schema.channels.id, id));

      let newlyActivated = null;
      if (target.isActive === 1) {
        const remaining = await db.query.channels.findFirst({
          where: eq(schema.channels.engine, target.engine),
          orderBy: [desc(schema.channels.id)],
        });
        if (remaining) {
          const [act] = await db
            .update(schema.channels)
            .set({ isActive: 1, updatedAt: new Date() })
            .where(eq(schema.channels.id, remaining.id))
            .returning();
          newlyActivated = act;
        }
      }

      return { success: true, message: "Canal eliminado correctamente", activatedChannel: newlyActivated };
    },
    {
      params: t.Object({ id: t.Numeric() }),
    }
  )
  .put(
    "/:id",
    async ({ params, body, set }) => {
      const id = Number(params.id);
      const target = await db.query.channels.findFirst({
        where: eq(schema.channels.id, id),
      });
      if (!target) {
        set.status = 404;
        return { success: false, error: "Canal no encontrado" };
      }

      const updates: Partial<typeof schema.channels.$inferInsert> = { updatedAt: new Date() };
      if (body.displayName !== undefined) updates.displayName = body.displayName;
      if (body.credentials !== undefined) {
        updates.credentials =
          typeof body.credentials === "object" ? JSON.stringify(body.credentials) : String(body.credentials);
      }
      if (body.phoneNumber !== undefined) updates.phoneNumber = body.phoneNumber;
      if (body.status !== undefined) updates.status = body.status;

      const [updated] = await db
        .update(schema.channels)
        .set(updates)
        .where(eq(schema.channels.id, id))
        .returning();

      return { ...updated, success: true, channel: updated };
    },
    {
      params: t.Object({ id: t.Numeric() }),
      body: t.Object({
        displayName: t.Optional(t.String()),
        credentials: t.Optional(t.Union([t.String(), t.Record(t.String(), t.Unknown())])),
        phoneNumber: t.Optional(t.String()),
        status: t.Optional(t.String()),
      }),
    }
  );
