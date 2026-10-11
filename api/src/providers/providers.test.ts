import { describe, expect, it, mock, afterEach } from "bun:test";
import { MetaAdapter } from "./meta";
import { YCloudAdapter } from "./ycloud";
import { getProvider } from "./registry";

describe("MessagingProvider Suite", () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  describe("MetaAdapter", () => {
    it("reports not ready when credentials are missing", async () => {
      const adapter = new MetaAdapter({ token: "", phoneId: "" });
      const status = await adapter.getStatus();
      expect(status.ready).toBe(false);

      const result = await adapter.send({
        phone: "+5491112345678",
        text: "Hola",
      });
      expect(result.success).toBe(false);
      expect(result.httpStatus).toBe(400);
    });

    it("sends template message with normalized phone and correct payload", async () => {
      let interceptedUrl = "";
      let interceptedHeaders: Record<string, string> = {};
      let interceptedBody: Record<string, unknown> = {};

      globalThis.fetch = mock(async (url: string | URL | Request, init?: RequestInit) => {
        interceptedUrl = String(url);
        interceptedHeaders = (init?.headers ?? {}) as Record<string, string>;
        interceptedBody = JSON.parse(String(init?.body ?? "{}")) as Record<string, unknown>;

        return new Response(
          JSON.stringify({
            messages: [{ id: "wamid.test1234" }],
          }),
          { status: 200 }
        );
      }) as unknown as typeof fetch;

      const adapter = new MetaAdapter({ token: "test-token", phoneId: "123456789" });
      const status = await adapter.getStatus();
      expect(status.ready).toBe(true);

      const result = await adapter.send({
        phone: "+5491112345678",
        template: {
          name: "aviso_deuda",
          language: "es",
          parameters: ["Santiago", "CLI01", "$150.00"],
        },
      });

      expect(result.success).toBe(true);
      expect(result.messageId).toBe("wamid.test1234");
      expect(interceptedUrl).toBe("https://graph.facebook.com/v21.0/123456789/messages");
      expect(interceptedHeaders["Authorization"]).toBe("Bearer test-token");
      expect(interceptedBody["to"]).toBe("5491112345678"); // strips "+"
      expect(interceptedBody["type"]).toBe("template");

      const templateObj = interceptedBody["template"] as { name?: string; components?: Array<{ parameters?: unknown[] }> } | undefined;
      expect(templateObj?.name).toBe("aviso_deuda");
      expect(templateObj?.components?.[0]?.parameters?.length).toBe(3);
    });

    it("handles API error responses gracefully", async () => {
      globalThis.fetch = mock(async () => {
        return new Response(
          JSON.stringify({
            error: { message: "Invalid OAuth access token" },
          }),
          { status: 401 }
        );
      }) as unknown as typeof fetch;

      const adapter = new MetaAdapter({ token: "bad-token", phoneId: "123456789" });
      const result = await adapter.send({
        phone: "+5491112345678",
        text: "Test",
      });

      expect(result.success).toBe(false);
      expect(result.httpStatus).toBe(401);
      expect(result.errorDetail).toBe("Invalid OAuth access token");
    });
  });

  describe("YCloudAdapter", () => {
    it("reports not ready when credentials are missing", async () => {
      const adapter = new YCloudAdapter({ apiKey: "", from: "" });
      const status = await adapter.getStatus();
      expect(status.ready).toBe(false);
    });

    it("sends template message formatting phone with '+' prefix and X-API-Key", async () => {
      let interceptedUrl = "";
      let interceptedHeaders: Record<string, string> = {};
      let interceptedBody: Record<string, unknown> = {};

      globalThis.fetch = mock(async (url: string | URL | Request, init?: RequestInit) => {
        interceptedUrl = String(url);
        interceptedHeaders = (init?.headers ?? {}) as Record<string, string>;
        interceptedBody = JSON.parse(String(init?.body ?? "{}")) as Record<string, unknown>;

        return new Response(
          JSON.stringify({
            id: "ycloud_msg_9876",
          }),
          { status: 200 }
        );
      }) as unknown as typeof fetch;

      const adapter = new YCloudAdapter({ apiKey: "yc-key-xyz", from: "15551234567" });
      const status = await adapter.getStatus();
      expect(status.ready).toBe(true);

      const result = await adapter.send({
        phone: "5491112345678", // without "+"
        template: {
          name: "reminder_template",
          language: "es",
          parameters: ["Juan", "CLI02", "$50.00"],
        },
      });

      expect(result.success).toBe(true);
      expect(result.messageId).toBe("ycloud_msg_9876");
      expect(interceptedUrl).toBe("https://api.ycloud.com/v2/whatsapp/messages");
      expect(interceptedHeaders["X-API-Key"]).toBe("yc-key-xyz");
      expect(interceptedBody["from"]).toBe("+15551234567");
      expect(interceptedBody["to"]).toBe("+5491112345678");
    });
  });

  describe("Registry", () => {
    it("instantiates MetaAdapter with JSON credentials", () => {
      const provider = getProvider(
        "meta",
        JSON.stringify({ token: "tok1", phoneId: "pid1" })
      );
      expect(provider.id).toBe("meta");
      expect(provider.capabilities.templates).toBe(true);
    });

    it("instantiates YCloudAdapter with JSON credentials", () => {
      const provider = getProvider(
        "ycloud",
        JSON.stringify({ apiKey: "key1", from: "+12345" })
      );
      expect(provider.id).toBe("ycloud");
      expect(provider.capabilities.templates).toBe(true);
    });

    it("instantiates UnofficialAdapter for unofficial engine", () => {
      const provider = getProvider(
        "unofficial",
        JSON.stringify({ instance: "dev-1", url: "http://127.0.0.1:3002" })
      );
      expect(provider.id).toBe("unofficial");
      expect(provider.capabilities.templates).toBe(false);
      expect(provider.capabilities.session).toBe(true);
    });
  });
});
