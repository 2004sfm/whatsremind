import type {
  EngineId,
  MessagingProvider,
  MetaCredentials,
  OutboundMessage,
  ProviderCapabilities,
  ProviderStatus,
  SendResult,
} from "./types";

interface MetaTemplateComponent {
  type: "body";
  parameters: Array<{ type: "text"; text: string }>;
}

interface MetaRequestBody {
  messaging_product: "whatsapp";
  recipient_type: "individual";
  to: string;
  type: "template" | "text";
  template?: {
    name: string;
    language: { code: string };
    components?: MetaTemplateComponent[];
  };
  text?: {
    body: string;
  };
}

interface MetaApiResponse {
  messages?: Array<{ id: string }>;
  error?: {
    message?: string;
  };
}

export class MetaAdapter implements MessagingProvider {
  readonly id: EngineId = "meta";
  readonly capabilities: ProviderCapabilities = {
    templates: true,
    numberCheck: false,
    session: false,
  };

  private credentials: MetaCredentials;

  constructor(credentials: MetaCredentials) {
    this.credentials = credentials;
  }

  async send(message: OutboundMessage): Promise<SendResult> {
    const { token, phoneId } = this.credentials;
    if (!token || !phoneId) {
      return {
        success: false,
        httpStatus: 400,
        errorDetail: "Faltan credenciales de Meta API en Configuración.",
      };
    }

    const url = `https://graph.facebook.com/v21.0/${phoneId}/messages`;
    const cleanTo = message.phone.replace("+", "");

    const body: MetaRequestBody = {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: cleanTo,
      type: "text",
    };

    if (message.template) {
      body.type = "template";
      body.template = {
        name: message.template.name,
        language: { code: message.template.language || "es" },
      };
      if (message.template.parameters && message.template.parameters.length > 0) {
        body.template.components = [
          {
            type: "body",
            parameters: message.template.parameters.map((val) => ({
              type: "text",
              text: val,
            })),
          },
        ];
      }
    } else if (message.text) {
      body.type = "text";
      body.text = { body: message.text };
    } else {
      return {
        success: false,
        httpStatus: 400,
        errorDetail: "El mensaje debe contener una plantilla o texto.",
      };
    }

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      const data = (await response.json()) as MetaApiResponse;
      if (!response.ok) {
        return {
          success: false,
          httpStatus: response.status,
          errorDetail: data.error?.message || `HTTP ${response.status}: Error al enviar plantilla en Meta`,
        };
      }

      return {
        success: true,
        messageId: data.messages?.[0]?.id,
        httpStatus: response.status,
      };
    } catch (error: unknown) {
      const messageDetail = error instanceof Error ? error.message : "Error de red al conectar con Meta Graph API";
      return {
        success: false,
        httpStatus: 500,
        errorDetail: messageDetail,
      };
    }
  }

  async getStatus(): Promise<ProviderStatus> {
    const ready = Boolean(this.credentials?.token && this.credentials?.phoneId);
    return {
      ready,
      details: ready ? "Meta provider ready" : "Faltan credenciales de Meta API en Configuración.",
    };
  }
}
