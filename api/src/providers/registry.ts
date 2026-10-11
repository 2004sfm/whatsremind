import { MetaAdapter } from "./meta";
import { YCloudAdapter } from "./ycloud";
import type {
  EngineId,
  MessagingProvider,
  MetaCredentials,
  OutboundMessage,
  ProviderCapabilities,
  ProviderStatus,
  SendResult,
  UnofficialCredentials,
  YCloudCredentials,
} from "./types";
import { sqlite } from "../db";

interface RawAppConfigRow {
  meta_token?: string | null;
  meta_phone_id?: string | null;
  ycloud_api_key?: string | null;
  ycloud_phone?: string | null;
  evolution_url?: string | null;
  evolution_instance?: string | null;
}

class UnofficialPlaceholderAdapter implements MessagingProvider {
  readonly id: EngineId = "unofficial";
  readonly capabilities: ProviderCapabilities = {
    templates: false,
    numberCheck: true,
    session: true,
  };

  constructor(private creds: UnofficialCredentials = {}) {}

  async send(_: OutboundMessage): Promise<SendResult> {
    return {
      success: false,
      httpStatus: 501,
      errorDetail: "Unofficial provider no implementado aún.",
    };
  }

  async getStatus(): Promise<ProviderStatus> {
    return {
      ready: false,
      details: "Unofficial provider en desarrollo.",
    };
  }
}

function parseCredentials(
  credentialsInput?: string | Record<string, unknown> | null
): Record<string, string | undefined> {
  if (typeof credentialsInput === "string") {
    try {
      const parsed = JSON.parse(credentialsInput) as unknown;
      if (typeof parsed === "object" && parsed !== null) {
        const result: Record<string, string | undefined> = {};
        for (const [key, val] of Object.entries(parsed)) {
          if (typeof val === "string") {
            result[key] = val;
          }
        }
        return result;
      }
    } catch {
      return {};
    }
  }

  if (credentialsInput && typeof credentialsInput === "object") {
    const result: Record<string, string | undefined> = {};
    for (const [key, val] of Object.entries(credentialsInput)) {
      if (typeof val === "string") {
        result[key] = val;
      }
    }
    return result;
  }

  const row = sqlite
    .query("SELECT meta_token, meta_phone_id, ycloud_api_key, ycloud_phone, evolution_url, evolution_instance FROM app_config WHERE id = 1")
    .get() as RawAppConfigRow | null;

  if (!row) return {};

  return {
    token: row.meta_token || undefined,
    phoneId: row.meta_phone_id || undefined,
    apiKey: row.ycloud_api_key || undefined,
    from: row.ycloud_phone || undefined,
    url: row.evolution_url || undefined,
    instance: row.evolution_instance || undefined,
  };
}

export function getProvider(
  engine: EngineId,
  credentialsJson?: string | Record<string, unknown> | null
): MessagingProvider {
  const creds = parseCredentials(credentialsJson);

  switch (engine) {
    case "meta": {
      const metaCreds: MetaCredentials = {
        token: creds.token || creds.metaToken || creds.meta_token || "",
        phoneId: creds.phoneId || creds.metaPhoneId || creds.meta_phone_id || "",
      };
      return new MetaAdapter(metaCreds);
    }
    case "ycloud": {
      const ycloudCreds: YCloudCredentials = {
        apiKey: creds.apiKey || creds.ycloudApiKey || creds.ycloud_api_key || "",
        from: creds.from || creds.fromPhone || creds.ycloudPhone || creds.ycloud_phone || "",
      };
      return new YCloudAdapter(ycloudCreds);
    }
    case "unofficial":
    default: {
      return new UnofficialPlaceholderAdapter(creds);
    }
  }
}
