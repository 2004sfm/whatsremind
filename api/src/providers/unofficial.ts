import type {
  EngineId,
  MessagingProvider,
  OutboundMessage,
  ProviderCapabilities,
  ProviderStatus,
  SendResult,
  UnofficialCredentials,
} from "./types";
import { ensureGowaStarted, gowaConfig } from "../supervisor/gowa";
import { renderTemplateToText } from "../lib/render-template";

interface GowaSendResponse {
  code?: string;
  message?: string;
  results?: {
    message_id?: string;
  };
}

interface GowaStatusResponse {
  code?: string;
  message?: string;
  results?: {
    device_id?: string;
    state?: string;
  };
}

export class UnofficialAdapter implements MessagingProvider {
  readonly id: EngineId = "unofficial";
  readonly capabilities: ProviderCapabilities = {
    templates: false,
    numberCheck: true,
    session: true,
  };

  private deviceId: string;
  private baseUrl: string;
  private authHeader: string;

  constructor(credentials: UnofficialCredentials) {
    this.deviceId = credentials.deviceId || credentials.instance || credentials.apiKey || "default";
    this.baseUrl = credentials.url || gowaConfig.baseUrl;
    this.authHeader = `Basic ${Buffer.from(gowaConfig.auth).toString("base64")}`;
  }

  async send(message: OutboundMessage): Promise<SendResult> {
    const isStarted = await ensureGowaStarted();
    if (!isStarted) {
      return {
        success: false,
        httpStatus: 503,
        errorDetail: "El servicio no oficial de WhatsApp no está disponible o no se pudo iniciar.",
      };
    }

    let textToSend = message.text || "";
    if (!textToSend && message.template) {
      textToSend = await renderTemplateToText(
        message.template.name,
        message.template.parameters || []
      );
    }

    if (!textToSend) {
      return {
        success: false,
        httpStatus: 400,
        errorDetail: "El mensaje no tiene contenido de texto para enviar.",
      };
    }

    // GOWA expects clean phone without '+'
    const cleanPhone = message.phone.replace("+", "").trim();
    const url = `${this.baseUrl}/send/message`;

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: this.authHeader,
          "X-Device-Id": this.deviceId,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          phone: cleanPhone,
          message: textToSend,
        }),
      });

      const data = (await response.json()) as GowaSendResponse;

      if (!response.ok || data.code !== "SUCCESS") {
        return {
          success: false,
          httpStatus: response.status,
          errorDetail: data.message || `Error al enviar mensaje por WhatsApp no oficial (${response.status})`,
        };
      }

      return {
        success: true,
        messageId: data.results?.message_id,
        httpStatus: response.status,
      };
    } catch (error: unknown) {
      const messageDetail = error instanceof Error ? error.message : "Error de red al conectar con GOWA";
      return {
        success: false,
        httpStatus: 500,
        errorDetail: messageDetail,
      };
    }
  }

  async getStatus(): Promise<ProviderStatus> {
    const isStarted = await ensureGowaStarted();
    if (!isStarted) {
      return {
        ready: false,
        details: "Servicio local GOWA no iniciado.",
      };
    }

    const url = `${this.baseUrl}/app/status?device_id=${encodeURIComponent(this.deviceId)}`;

    try {
      const response = await fetch(url, {
        headers: {
          Authorization: this.authHeader,
        },
        signal: AbortSignal.timeout(2000),
      });

      if (!response.ok) {
        return {
          ready: false,
          details: `Error al consultar estado (${response.status})`,
        };
      }

      const data = (await response.json()) as GowaStatusResponse;
      const isConnected = data.results?.state === "connected" || data.code === "SUCCESS";

      return {
        ready: isConnected,
        details: data.results?.state || data.message || "Desconectado",
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "No responde";
      return {
        ready: false,
        details: message,
      };
    }
  }
}
