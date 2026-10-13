import { describe, expect, it, mock, afterEach } from "bun:test";
import { Elysia } from "elysia";
import { channelsRoutes } from "./channels";
import { db, schema } from "../db";
import { eq } from "drizzle-orm";

describe("Channels Routes Suite", () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("normalizes phone numbers and performs upsert on POST /api/channels", async () => {
    const app = new Elysia().use(channelsRoutes);

    // 1. Insert initial channel with spaced format
    const phoneWithSpaces = "+58 426 3862849";
    const res1 = await app.handle(
      new Request("http://localhost/api/channels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          engine: "unofficial",
          phoneNumber: phoneWithSpaces,
          displayName: "WhatsApp Original",
          credentials: { deviceId: "device-old-123" },
          status: "disconnected",
        }),
      })
    );

    expect(res1.status).toBe(201);
    const data1 = (await res1.json()) as { channel: { id: number; phoneNumber: string } };
    const originalId = data1.channel.id;

    // 2. Reconnect / Upsert with compact format (+584263862849)
    const phoneCompact = "+584263862849";
    const res2 = await app.handle(
      new Request("http://localhost/api/channels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          engine: "unofficial",
          phoneNumber: phoneCompact,
          displayName: "WhatsApp Reconnected",
          credentials: { deviceId: "device-new-456" },
          status: "connected",
        }),
      })
    );

    expect(res2.status).toBe(200);
    const data2 = (await res2.json()) as { channel: { id: number; status: string; displayName: string } };
    expect(data2.channel.id).toBe(originalId);
    expect(data2.channel.status).toBe("connected");

    // Clean up
    await db.delete(schema.channels).where(eq(schema.channels.id, originalId));
  });

  it("auto-imports active connected GOWA device in GET /api/channels when missing from DB", async () => {
    const app = new Elysia().use(channelsRoutes);

    const testJid = "589991234567@s.whatsapp.net";
    const testDeviceId = "gowa-active-uuid-999";

    globalThis.fetch = mock(async (url: string | URL | Request) => {
      const urlStr = String(url);
      if (urlStr.includes("/devices")) {
        return new Response(
          JSON.stringify({
            results: [
              {
                id: testDeviceId,
                state: "logged_in",
                jid: testJid,
              },
            ],
          }),
          { status: 200 }
        );
      }
      return new Response("{}", { status: 200 });
    }) as unknown as typeof fetch;

    const res = await app.handle(
      new Request("http://localhost/api/channels?engine=unofficial", {
        method: "GET",
      })
    );

    expect(res.status).toBe(200);
    const channels = (await res.json()) as Array<{
      id: number;
      phoneNumber: string;
      status: string;
      engine: string;
    }>;

    const autoImported = channels.find((c) => c.phoneNumber === "+589991234567");
    expect(autoImported).toBeDefined();
    expect(autoImported?.status).toBe("connected");
    expect(autoImported?.engine).toBe("unofficial");

    // Clean up
    if (autoImported) {
      await db.delete(schema.channels).where(eq(schema.channels.id, autoImported.id));
    }
  });
});
