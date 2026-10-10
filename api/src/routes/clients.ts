import { Elysia, t } from "elysia";
import { db, schema } from "../db";
import { eq, and, like, or, sql, desc } from "drizzle-orm";

export const clientRoutes = new Elysia({ prefix: "/api/clients" })
  .get(
    "/",
    async ({ query }) => {
      const {
        search,
        sheet_name,
        status, // "Paid" | "Pending" | "All"
        exclude_recent_24h,
        limit = "50",
        offset = "0",
      } = query;

      const numLimit = Math.max(1, parseInt(limit, 10) || 50);
      const numOffset = Math.max(0, parseInt(offset, 10) || 0);

      const conditions = [];

      // Only active clients by default
      conditions.push(eq(schema.clients.isActive, true));

      if (sheet_name) {
        conditions.push(eq(schema.clients.sheetName, sheet_name));
      }

      if (search) {
        conditions.push(
          or(
            like(schema.clients.name, `%${search}%`),
            like(schema.clients.code, `%${search}%`),
            like(schema.clients.phoneNumber, `%${search}%`)
          )
        );
      }

      if (status === "Paid") {
        conditions.push(eq(schema.clients.debt, 0));
      } else if (status === "Pending") {
        conditions.push(sql`${schema.clients.debt} > 0`);
      }

      if (exclude_recent_24h === "true") {
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        conditions.push(
          or(
            sql`${schema.clients.lastSent} IS NULL`,
            sql`${schema.clients.lastSent} < ${oneDayAgo}`
          )
        );
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      const totalResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(schema.clients)
        .where(whereClause);

      const total = totalResult[0]?.count || 0;

      const data = await db.query.clients.findMany({
        where: whereClause,
        limit: numLimit,
        offset: numOffset,
        orderBy: [desc(schema.clients.id)],
      });

      return {
        data: data.map((c) => ({
          ...c,
          status: c.debt > 0 ? "Pending" : "Paid",
        })),
        total,
      };
    },
    {
      query: t.Object({
        search: t.Optional(t.String()),
        sheet_name: t.Optional(t.String()),
        status: t.Optional(t.String()),
        exclude_recent_24h: t.Optional(t.String()),
        limit: t.Optional(t.String()),
        offset: t.Optional(t.String()),
      }),
    }
  )
  .post(
    "/toggle-sendable",
    async ({ body }) => {
      const { id, is_sendable } = body;
      await db
        .update(schema.clients)
        .set({ isSendable: is_sendable })
        .where(eq(schema.clients.id, id));
      return { success: true };
    },
    {
      body: t.Object({
        id: t.Number(),
        is_sendable: t.Boolean(),
      }),
    }
  );
