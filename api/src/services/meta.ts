export interface SendMetaMessageParams {
  token: string;
  phoneId: string;
  to: string;
  templateName: string;
  language?: string;
  parameters?: string[];
}

export interface SendMetaResponse {
  success: boolean;
  messageId?: string;
  httpStatus: number;
  errorDetail?: string;
}

export async function sendMetaTemplateMessage(params: SendMetaMessageParams): Promise<SendMetaResponse> {
  const { token, phoneId, to, templateName, language = "es", parameters = [] } = params;
  const url = `https://graph.facebook.com/v21.0/${phoneId}/messages`;

  const body: any = {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: to.replace("+", ""), // Meta expects recipient without + sign
    type: "template",
    template: {
      name: templateName,
      language: {
        code: language,
      },
    },
  };

  if (parameters.length > 0) {
    body.template.components = [
      {
        type: "body",
        parameters: parameters.map((val) => ({
          type: "text",
          text: val,
        })),
      },
    ];
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

    const data: any = await response.json();

    if (!response.ok) {
      const errorMsg = data?.error?.message || `HTTP ${response.status}: Error al enviar plantilla en Meta`;
      return {
        success: false,
        httpStatus: response.status,
        errorDetail: errorMsg,
      };
    }

    const messageId = data?.messages?.[0]?.id;
    return {
      success: true,
      messageId,
      httpStatus: response.status,
    };
  } catch (error: any) {
    return {
      success: false,
      httpStatus: 500,
      errorDetail: error?.message || "Error de red al conectar con Meta Graph API",
    };
  }
}
