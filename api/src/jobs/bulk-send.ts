import { db, schema } from "../db";
import { eq } from "drizzle-orm";
import type { EngineId, MessagingProvider } from "../providers/types";

export interface BulkSendJobLog {
  id?: string;
  clientId: number;
  clientName: string;
  phone: string;
  status: "sent" | "failed";
  error?: string;
}

export interface BulkSendJobState {
  id: string;
  engine: EngineId;
  status: "running" | "completed" | "cancelled" | "failed";
  total: number;
  sent: number;
  failed: number;
  currentPhone?: string;
  latestLog?: BulkSendJobLog;
  logs: BulkSendJobLog[];
  startedAt: string;
  finishedAt?: string;
  cancelRequested: boolean;
}

export interface TargetClient {
  id: number;
  name: string;
  code: string;
  phoneNumber: string;
  phoneNumber2?: string;
  debt: number;
}

interface SendTask {
  client: TargetClient;
  phone: string;
}

let activeJob: BulkSendJobState | null = null;

function getRandomDelay(engine: EngineId): number {
  if (engine === "unofficial") {
    // 20 to 45 seconds delay for unofficial to avoid WhatsApp ban
    return Math.floor(Math.random() * (45000 - 20000 + 1)) + 20000;
  }
  // 100ms for official providers (Meta / YCloud)
  return 100;
}

async function sleepWithCancellation(ms: number, shouldCancel: () => boolean): Promise<boolean> {
  const step = 500;
  let elapsed = 0;
  while (elapsed < ms) {
    if (shouldCancel()) return false;
    const waitTime = Math.min(step, ms - elapsed);
    await new Promise((resolve) => setTimeout(resolve, waitTime));
    elapsed += waitTime;
  }
  return true;
}

export function getActiveJob(): BulkSendJobState | null {
  return activeJob;
}

export function cancelActiveJob(jobId?: string): boolean {
  if (!activeJob) return false;
  if (jobId && activeJob.id !== jobId) return false;
  activeJob.cancelRequested = true;
  return true;
}

export function buildTemplateParameters(client: TargetClient, count?: number): string[] {
  const debtFormatted = `$${client.debt.toFixed(2)}`;

  if (count === 1) {
    return [debtFormatted];
  }
  if (count === 2) {
    return [client.name || client.code, debtFormatted];
  }
  if (count === 3) {
    return [client.code, debtFormatted, client.name];
  }
  if (count === 4) {
    const today = new Intl.DateTimeFormat("es-ES", { day: "numeric", month: "long" }).format(new Date());
    return [client.name, client.code, debtFormatted, today];
  }

  return [client.code, debtFormatted, client.name];
}

export function startBulkSendJob({
  clients,
  templateName,
  language,
  engine,
  provider,
  variablesCount,
}: {
  clients: TargetClient[];
  templateName: string;
  language: string;
  engine: EngineId;
  provider: MessagingProvider;
  variablesCount?: number;
}): BulkSendJobState {
  const jobId = `job_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  // Expand clients into individual delivery tasks (supporting primary + secondary phone numbers)
  const tasks: SendTask[] = [];
  for (const client of clients) {
    const p1 = (client.phoneNumber || "").trim();
    const p2 = (client.phoneNumber2 || "").trim();
    const clean1 = p1.replace(/\D/g, "");
    const clean2 = p2.replace(/\D/g, "");

    if (p1) {
      tasks.push({ client, phone: p1 });
    }
    // Only dispatch to secondary phone if it exists and clean digits differ from primary phone
    if (p2 && (!clean1 || clean2 !== clean1)) {
      tasks.push({ client, phone: p2 });
    }
  }

  const jobState: BulkSendJobState = {
    id: jobId,
    engine,
    status: tasks.length === 0 ? "completed" : "running",
    total: tasks.length,
    sent: 0,
    failed: 0,
    logs: [],
    startedAt: new Date().toISOString(),
    finishedAt: tasks.length === 0 ? new Date().toISOString() : undefined,
    cancelRequested: false,
  };

  activeJob = jobState;

  if (tasks.length === 0) {
    return jobState;
  }

  // Run in background without awaiting
  (async () => {
    try {
      for (let i = 0; i < tasks.length; i++) {
        if (jobState.cancelRequested) {
          jobState.status = "cancelled";
          break;
        }

        const task = tasks[i];
        if (!task) continue;

        jobState.currentPhone = task.phone;
        const parameters = buildTemplateParameters(task.client, variablesCount);

        const sendResult = await provider.send({
          phone: task.phone,
          template: {
            name: templateName,
            language,
            parameters,
          },
        });

        const nowIso = new Date().toISOString();
        const logId = `${jobId}_${i}_${task.phone}`;
        let logItem: BulkSendJobLog;

        try {
          if (sendResult.success) {
            jobState.sent++;
            logItem = {
              id: logId,
              clientId: task.client.id,
              clientName: task.client.name,
              phone: task.phone,
              status: "sent",
            };

            await db.insert(schema.messageLogs).values({
              clientId: task.client.id,
              waMessageId: sendResult.messageId,
              engine,
              status: "sent",
              httpStatus: sendResult.httpStatus,
              templateUsed: templateName,
              sentAt: nowIso,
            });

            await db
              .update(schema.clients)
              .set({ lastSent: nowIso })
              .where(eq(schema.clients.id, task.client.id));
          } else {
            jobState.failed++;
            logItem = {
              id: logId,
              clientId: task.client.id,
              clientName: task.client.name,
              phone: task.phone,
              status: "failed",
              error: sendResult.errorDetail,
            };

            await db.insert(schema.messageLogs).values({
              clientId: task.client.id,
              engine,
              status: "failed",
              httpStatus: sendResult.httpStatus,
              errorDetail: sendResult.errorDetail,
              templateUsed: templateName,
              sentAt: nowIso,
            });
          }
        } catch (dbErr: unknown) {
          // If DB insert fails (e.g. foreign key constraint or DB locked), keep memory logs intact
          console.warn("[BULK_SEND_DB_WARN] Could not persist message log to DB:", dbErr);
          if (!logItem!) {
            logItem = {
              id: logId,
              clientId: task.client.id,
              clientName: task.client.name,
              phone: task.phone,
              status: sendResult.success ? "sent" : "failed",
              error: sendResult.errorDetail,
            };
            if (sendResult.success) jobState.sent++;
            else jobState.failed++;
          }
        }

        jobState.latestLog = logItem;
        jobState.logs.push(logItem);

        // Apply delay between messages if not the last item
        if (i < tasks.length - 1 && !jobState.cancelRequested) {
          const delay = getRandomDelay(engine);
          const continued = await sleepWithCancellation(delay, () => jobState.cancelRequested);
          if (!continued) {
            jobState.status = "cancelled";
            break;
          }
        }
      }

      if (jobState.status === "running") {
        jobState.status = "completed";
      }
    } catch (err: unknown) {
      console.error("[BULK_SEND_ERROR]", err);
      jobState.status = "failed";
    } finally {
      jobState.finishedAt = new Date().toISOString();
    }
  })();

  return jobState;
}
