import { Elysia, t } from "elysia";
import { db, schema } from "../db";
import { eq, inArray, desc, and } from "drizzle-orm";
import { getProvider } from "../providers/registry";
import type { EngineId } from "../providers/types";
import {
  startBulkSendJob,
  getActiveJob,
  cancelActiveJob,
} from "../jobs/bulk-send";

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

      const validClients = targetClients.filter(
        (c) => c.isSendable && ((c.phoneNumber && c.phoneNumber.trim()) || (c.phoneNumber2 && c.phoneNumber2.trim()))
      );

      if (validClients.length === 0) {
        return {
          success: true,
          total: 0,
          summary: { total: 0, sent: 0, failed: 0, logs: [] },
        };
      }

      // Start background job with throttle
      const job = startBulkSendJob({
        clients: validClients.map((c) => ({
          id: c.id,
          name: c.name,
          code: c.code,
          phoneNumber: c.phoneNumber,
          phoneNumber2: c.phoneNumber2 || undefined,
          debt: c.debt,
        })),
        templateName,
        language,
        engine: activeEngine,
        provider,
        variablesCount: body.variables_count,
      });

      return {
        success: true,
        jobId: job.id,
        total: job.total,
        status: job.status,
      };
    },
    {
      body: t.Object({
        client_ids: t.Array(t.Number()),
        template: t.Optional(t.String()),
        language: t.Optional(t.String()),
        variables_count: t.Optional(t.Number()),
      }),
    }
  )
  .get("/bulk-send/status", () => {
    const job = getActiveJob();
    return {
      success: true,
      job,
    };
  })
  .post("/bulk-send/cancel", () => {
    const cancelled = cancelActiveJob();
    return {
      success: true,
      cancelled,
    };
  })
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
