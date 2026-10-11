import { Elysia, t } from "elysia";
import { db, schema } from "../db";
import { eq, inArray, desc, and } from "drizzle-orm";
import { getProvider } from "../providers/registry";
import type { EngineId } from "../providers/types";

export const messageRoutes = new Elysia({ prefix: "/api/messages" })
  .post(
    "/bulk-send",
    async ({ body, set }) => {
      const { client_ids, template, language = "es" } = body;

      // 1. Fetch current config
      const config = await db.query.appConfig.findFirst({
        where: eq(schema.appConfig.id, 1),
      });

      if (!config) {
        set.status = 400;
        return { success: false, error: "No hay configuración activa. Completa los ajustes primero." };
      }

      const activeEngine = (config.engine || "meta") as EngineId;
      const templateName = template || config.templateName;

      // Evolution API placeholder / alert check
      if ((activeEngine as string) === "evolution") {
        return {
          success: false,
          inDevelopment: true,
          engine: "evolution",
          message: "Evolution API se encuentra actualmente en desarrollo.",
        };
      }

      if (!templateName) {
        set.status = 400;
        return { success: false, error: "Debes seleccionar o configurar una plantilla antes de enviar." };
      }

      // Check active channel or fallback to config
      const activeChannel = await db.query.channels.findFirst({
        where: and(
          eq(schema.channels.engine, activeEngine),
          eq(schema.channels.isActive, 1)
        ),
      });

      const provider = activeChannel
        ? getProvider(activeEngine, activeChannel.credentials)
        : getProvider(activeEngine, config);

      const providerStatus = await provider.getStatus();
      if (!providerStatus.ready) {
        set.status = 400;
        return {
          success: false,
          error:
            typeof providerStatus.details === "string"
              ? providerStatus.details
              : "Faltan credenciales del motor en Configuración.",
        };
      }

      // 2. Fetch clients to send to
      const targetClients = await db.query.clients.findMany({
        where: inArray(schema.clients.id, client_ids),
      });

      const validClients = targetClients.filter((c) => c.isSendable && c.phoneNumber);

      const results = {
        total: validClients.length,
        sent: 0,
        failed: 0,
        logs: [] as Array<{
          clientId: number;
          clientName: string;
          phone: string;
          status: string;
          error?: string;
        }>,
      };

      for (const client of validClients) {
        const debtFormatted = `$${client.debt.toFixed(2)}`;
        const parameters = [client.name, client.code, debtFormatted];

        const sendResult = await provider.send({
          phone: client.phoneNumber,
          template: {
            name: templateName,
            language,
            parameters,
          },
        });

        const nowIso = new Date().toISOString();

        if (sendResult.success) {
          results.sent++;
          await db.insert(schema.messageLogs).values({
            clientId: client.id,
            waMessageId: sendResult.messageId,
            engine: activeEngine,
            status: "sent",
            httpStatus: sendResult.httpStatus,
            templateUsed: templateName,
            sentAt: nowIso,
          });

          await db
            .update(schema.clients)
            .set({ lastSent: nowIso })
            .where(eq(schema.clients.id, client.id));

          results.logs.push({
            clientId: client.id,
            clientName: client.name,
            phone: client.phoneNumber,
            status: "sent",
          });
        } else {
          results.failed++;
          await db.insert(schema.messageLogs).values({
            clientId: client.id,
            engine: activeEngine,
            status: "failed",
            httpStatus: sendResult.httpStatus,
            errorDetail: sendResult.errorDetail,
            templateUsed: templateName,
            sentAt: nowIso,
          });

          results.logs.push({
            clientId: client.id,
            clientName: client.name,
            phone: client.phoneNumber,
            status: "failed",
            error: sendResult.errorDetail,
          });
        }
      }

      return {
        success: true,
        summary: results,
      };
    },
    {
      body: t.Object({
        client_ids: t.Array(t.Number()),
        template: t.Optional(t.String()),
        language: t.Optional(t.String()),
      }),
    }
  )
  .get("/history", async ({ query }) => {
    const { limit = "50", offset = "0" } = query;
    const numLimit = Math.max(1, parseInt(limit, 10) || 50);
    const numOffset = Math.max(0, parseInt(offset, 10) || 0);

    const logs = await db.query.messageLogs.findMany({
      limit: numLimit,
      offset: numOffset,
      orderBy: [desc(schema.messageLogs.id)],
    });

    return logs;
  });
