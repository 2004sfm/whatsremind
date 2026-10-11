import { db, schema } from "../db";
import { eq } from "drizzle-orm";
import type { EngineId, MessagingProvider } from "../providers/types";

export interface BulkSendJobLog {
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

interface TargetClient {
  id: number;
  name: string;
  code: string;
  phoneNumber: string;
  debt: number;
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

export function startBulkSendJob({
  clients,
  templateName,
  language,
  engine,
  provider,
}: {
  clients: TargetClient[];
  templateName: string;
  language: string;
  engine: EngineId;
  provider: MessagingProvider;
}): BulkSendJobState {
  const jobId = `job_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  const jobState: BulkSendJobState = {
    id: jobId,
    engine,
    status: "running",
    total: clients.length,
    sent: 0,
    failed: 0,
    logs: [],
    startedAt: new Date().toISOString(),
    cancelRequested: false,
  };

  activeJob = jobState;

  // Run in background without awaiting
  (async () => {
    try {
      for (let i = 0; i < clients.length; i++) {
        if (jobState.cancelRequested) {
          jobState.status = "cancelled";
          break;
        }

        const client = clients[i];
        if (!client) continue;

        jobState.currentPhone = client.phoneNumber;
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
        let logItem: BulkSendJobLog;

        if (sendResult.success) {
          jobState.sent++;
          logItem = {
            clientId: client.id,
            clientName: client.name,
            phone: client.phoneNumber,
            status: "sent",
          };

          await db.insert(schema.messageLogs).values({
            clientId: client.id,
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
            .where(eq(schema.clients.id, client.id));
        } else {
          jobState.failed++;
          logItem = {
            clientId: client.id,
            clientName: client.name,
            phone: client.phoneNumber,
            status: "failed",
            error: sendResult.errorDetail,
          };

          await db.insert(schema.messageLogs).values({
            clientId: client.id,
            engine,
            status: "failed",
            httpStatus: sendResult.httpStatus,
            errorDetail: sendResult.errorDetail,
            templateUsed: templateName,
            sentAt: nowIso,
          });
        }

        jobState.latestLog = logItem;
        jobState.logs.push(logItem);

        // Apply delay between messages if not the last item
        if (i < clients.length - 1 && !jobState.cancelRequested) {
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
    } catch {
      jobState.status = "failed";
    } finally {
      jobState.finishedAt = new Date().toISOString();
    }
  })();

  return jobState;
}
