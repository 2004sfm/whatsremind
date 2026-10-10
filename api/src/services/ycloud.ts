export interface SendYCloudTemplateParams {
  apiKey: string;
  from: string;
  to: string;
  templateName: string;
  language?: string;
  parameters?: string[];
}

export interface SendYCloudResponse {
  success: boolean;
  messageId?: string;
  httpStatus: number;
  errorDetail?: string;
}

export async function sendYCloudTemplateMessage(params: SendYCloudTemplateParams): Promise<SendYCloudResponse> {
  const { apiKey, from, to, templateName, language = "es", parameters = [] } = params;
  const url = "https://api.ycloud.com/v2/whatsapp/messages";

  // Enforce E.164 with + prefix
  const formattedTo = to.startsWith("+") ? to : `+${to}`;
  const formattedFrom = from.startsWith("+") ? from : `+${from}`;

  const body: any = {
    from: formattedFrom,
    to: formattedTo,
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
        "X-API-Key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const data: any = await response.json();

    if (!response.ok) {
      const errorMsg = data?.message || data?.error?.message || `HTTP ${response.status}: Error al enviar en YCloud`;
      return {
        success: false,
        httpStatus: response.status,
        errorDetail: errorMsg,
      };
    }

    const messageId = data?.id || data?.whatsappMessageId;
    return {
      success: true,
      messageId,
      httpStatus: response.status,
    };
  } catch (error: any) {
    return {
      success: false,
      httpStatus: 500,
      errorDetail: error?.message || "Error de red al conectar con YCloud API",
    };
  }
}
