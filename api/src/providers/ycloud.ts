import type {
  EngineId,
  MessagingProvider,
  OutboundMessage,
  ProviderCapabilities,
  ProviderStatus,
  SendResult,
  YCloudCredentials,
} from "./types";

interface YCloudTemplateComponent {
  type: "body";
  parameters: Array<{ type: "text"; text: string }>;
}

interface YCloudRequestBody {
  from: string;
  to: string;
  type: "template" | "text";
  template?: {
    name: string;
    language: { code: string };
    components?: YCloudTemplateComponent[];
  };
  text?: {
    body: string;
  };
}

interface YCloudApiResponse {
  id?: string;
  whatsappMessageId?: string;
  message?: string;
  error?: {
    message?: string;
  };
}

export class YCloudAdapter implements MessagingProvider {
  readonly id: EngineId = "ycloud";
  readonly capabilities: ProviderCapabilities = {
    templates: true,
    numberCheck: false,
    session: false,
  };

  private credentials: YCloudCredentials;

  constructor(credentials: YCloudCredentials) {
    this.credentials = credentials;
  }

  async send(message: OutboundMessage): Promise<SendResult> {
    const { apiKey, from } = this.credentials;
    if (!apiKey || !from) {
      return {
        success: false,
        httpStatus: 400,
        errorDetail: "Faltan credenciales de YCloud API (API Key o Teléfono emisor) en Configuración.",
      };
    }

    const url = "https://api.ycloud.com/v2/whatsapp/messages";
    const formattedTo = message.phone.startsWith("+") ? message.phone : `+${message.phone}`;
    const formattedFrom = from.startsWith("+") ? from : `+${from}`;

    const body: YCloudRequestBody = {
      from: formattedFrom,
      to: formattedTo,
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
          "X-API-Key": apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      const data = (await response.json()) as YCloudApiResponse;
      if (!response.ok) {
        return {
          success: false,
          httpStatus: response.status,
          errorDetail: data.message || data.error?.message || `HTTP ${response.status}: Error al enviar en YCloud`,
        };
      }

      return {
        success: true,
        messageId: data.id || data.whatsappMessageId,
        httpStatus: response.status,
      };
    } catch (error: unknown) {
      const messageDetail = error instanceof Error ? error.message : "Error de red al conectar con YCloud API";
      return {
        success: false,
        httpStatus: 500,
        errorDetail: messageDetail,
      };
    }
  }

  async getStatus(): Promise<ProviderStatus> {
    const ready = Boolean(this.credentials?.apiKey && this.credentials?.from);
    return {
      ready,
      details: ready ? "YCloud provider ready" : "Faltan credenciales de YCloud API (API Key o Teléfono emisor) en Configuración.",
    };
  }
}
