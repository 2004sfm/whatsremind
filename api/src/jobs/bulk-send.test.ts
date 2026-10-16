import { describe, expect, it, beforeAll, afterAll } from "bun:test";
import { startBulkSendJob, type TargetClient } from "./bulk-send";
import type { MessagingProvider, OutboundMessage, SendResult, ProviderStatus } from "../providers/types";
import { db, schema } from "../db";
import { inArray } from "drizzle-orm";

class MockProvider implements MessagingProvider {
  readonly id = "meta";
  readonly capabilities = { templates: true, numberCheck: false, session: false };
  public sentMessages: OutboundMessage[] = [];
  public failPhones: Set<string> = new Set();

  async send(message: OutboundMessage): Promise<SendResult> {
    this.sentMessages.push(message);
    if (this.failPhones.has(message.phone)) {
      return {
        success: false,
        httpStatus: 400,
        errorDetail: `Failed to send to ${message.phone}`,
      };
    }
    return {
      success: true,
      messageId: `msg_${Date.now()}_${Math.random()}`,
      httpStatus: 200,
    };
  }

  async getStatus(): Promise<ProviderStatus> {
    return { ready: true };
  }
}

describe("Bulk Send Suite (Dual-Phone Support)", () => {
  const testClientIds: number[] = [];

  beforeAll(async () => {
    // Insert clients into database to satisfy foreign key constraints
    const inserted = await db
      .insert(schema.clients)
      .values([
        {
          name: "Test Client 1",
          code: "TEST-01",
          sheetName: "TestSheet",
          phoneNumber: "+584141111111",
          debt: 50,
          isActive: true,
          isSendable: true,
        },
        {
          name: "Test Client 2",
          code: "TEST-02",
          sheetName: "TestSheet",
          phoneNumber: "+584141112222",
          phoneNumber2: "+584249998888",
          debt: 120,
          isActive: true,
          isSendable: true,
        },
        {
          name: "Test Client 3",
          code: "TEST-03",
          sheetName: "TestSheet",
          phoneNumber: "+584125556666",
          phoneNumber2: "+584125556666",
          debt: 75,
          isActive: true,
          isSendable: true,
        },
        {
          name: "Test Client 4",
          code: "TEST-04",
          sheetName: "TestSheet",
          phoneNumber: "+584141112222",
          phoneNumber2: "+584249998888",
          debt: 300,
          isActive: true,
          isSendable: true,
        },
      ])
      .returning({ id: schema.clients.id });

    testClientIds.push(...inserted.map((r) => r.id));
  });

  afterAll(async () => {
    if (testClientIds.length > 0) {
      await db.delete(schema.messageLogs).where(inArray(schema.messageLogs.clientId, testClientIds));
      await db.delete(schema.clients).where(inArray(schema.clients.id, testClientIds));
    }
  });

  it("dispatches single message when client has only one phone", async () => {
    const provider = new MockProvider();
    const clients: TargetClient[] = [
      {
        id: testClientIds[0] ?? 1,
        name: "Juan Solo",
        code: "TEST-01",
        phoneNumber: "+584141111111",
        debt: 50,
      },
    ];

    const job = startBulkSendJob({
      clients,
      templateName: "recordatorio",
      language: "es",
      engine: "meta",
      provider,
    });

    expect(job.total).toBe(1);

    let attempts = 0;
    while (job.status === "running" && attempts < 20) {
      await new Promise((r) => setTimeout(r, 50));
      attempts++;
    }

    expect(job.status).toBe("completed");
    expect(job.sent).toBe(1);
    expect(job.failed).toBe(0);
    expect(provider.sentMessages.length).toBe(1);
    expect(provider.sentMessages[0]?.phone).toBe("+584141111111");
    expect(job.logs.length).toBe(1);
    expect(job.logs[0]?.phone).toBe("+584141111111");
  });

  it("dispatches to both numbers when client has phoneNumber and phoneNumber2", async () => {
    const provider = new MockProvider();
    const clients: TargetClient[] = [
      {
        id: testClientIds[1] ?? 2,
        name: "Carlos Dual",
        code: "TEST-02",
        phoneNumber: "+584141112222",
        phoneNumber2: "+584249998888",
        debt: 120,
      },
    ];

    const job = startBulkSendJob({
      clients,
      templateName: "recordatorio",
      language: "es",
      engine: "meta",
      provider,
    });

    expect(job.total).toBe(2);

    let attempts = 0;
    while (job.status === "running" && attempts < 20) {
      await new Promise((r) => setTimeout(r, 50));
      attempts++;
    }

    expect(job.status).toBe("completed");
    expect(job.sent).toBe(2);
    expect(job.failed).toBe(0);
    expect(provider.sentMessages.length).toBe(2);
    expect(provider.sentMessages[0]?.phone).toBe("+584141112222");
    expect(provider.sentMessages[1]?.phone).toBe("+584249998888");
    expect(job.logs.length).toBe(2);
    expect(job.logs.map((l) => l.phone)).toEqual(["+584141112222", "+584249998888"]);
  });

  it("deduplicates when phoneNumber and phoneNumber2 are identical", async () => {
    const provider = new MockProvider();
    const clients: TargetClient[] = [
      {
        id: testClientIds[2] ?? 3,
        name: "Ana Mismodato",
        code: "TEST-03",
        phoneNumber: "+584125556666",
        phoneNumber2: "+584125556666",
        debt: 75,
      },
    ];

    const job = startBulkSendJob({
      clients,
      templateName: "recordatorio",
      language: "es",
      engine: "meta",
      provider,
    });

    expect(job.total).toBe(1);

    let attempts = 0;
    while (job.status === "running" && attempts < 20) {
      await new Promise((r) => setTimeout(r, 50));
      attempts++;
    }

    expect(job.status).toBe("completed");
    expect(job.sent).toBe(1);
    expect(provider.sentMessages.length).toBe(1);
  });

  it("handles partial failure when one phone fails and the other succeeds", async () => {
    const provider = new MockProvider();
    provider.failPhones.add("+584249998888");

    const clients: TargetClient[] = [
      {
        id: testClientIds[3] ?? 4,
        name: "Pedro Parcial",
        code: "TEST-04",
        phoneNumber: "+584141112222",
        phoneNumber2: "+584249998888",
        debt: 300,
      },
    ];

    const job = startBulkSendJob({
      clients,
      templateName: "recordatorio",
      language: "es",
      engine: "meta",
      provider,
    });

    expect(job.total).toBe(2);

    let attempts = 0;
    while (job.status === "running" && attempts < 20) {
      await new Promise((r) => setTimeout(r, 50));
      attempts++;
    }

    expect(job.status).toBe("completed");
    expect(job.sent).toBe(1);
    expect(job.failed).toBe(1);
    expect(job.logs.find((l) => l.phone === "+584141112222")?.status).toBe("sent");
    expect(job.logs.find((l) => l.phone === "+584249998888")?.status).toBe("failed");
  });
});
