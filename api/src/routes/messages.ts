import { Elysia, t } from "elysia";
import { db, schema } from "../db";
import { eq, inArray, desc } from "drizzle-orm";
import { sendMetaTemplateMessage } from "../services/meta";
import { sendYCloudTemplateMessage } from "../services/ycloud";

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

      const activeEngine = config.engine || "meta";
      const templateName = template || config.templateName;

      // Evolution API placeholder / alert check
      if (activeEngine === "evolution") {
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
        let sendResult;

        // Dynamic parameters for the template: [name, code, debtFormatted, date]
        const debtFormatted = `$${client.debt.toFixed(2)}`;
        const parameters = [client.name, client.code, debtFormatted];

        if (activeEngine === "meta") {
          if (!config.metaToken || !config.metaPhoneId) {
            set.status = 400;
            return { success: false, error: "Faltan credenciales de Meta API en Configuración." };
          }

          sendResult = await sendMetaTemplateMessage({
            token: config.metaToken,
            phoneId: config.metaPhoneId,
            to: client.phoneNumber,
            templateName,
            language,
            parameters,
          });
        } else if (activeEngine === "ycloud") {
          if (!config.ycloudApiKey || !config.ycloudPhone) {
            set.status = 400;
            return { success: false, error: "Faltan credenciales de YCloud API (API Key o Teléfono emisor) en Configuración." };
          }

          sendResult = await sendYCloudTemplateMessage({
            apiKey: config.ycloudApiKey,
            from: config.ycloudPhone,
            to: client.phoneNumber,
            templateName,
            language,
            parameters,
          });
        } else {
          sendResult = {
            success: false,
            httpStatus: 400,
            errorDetail: `Motor '${activeEngine}' no soportado.`,
          };
        }

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
