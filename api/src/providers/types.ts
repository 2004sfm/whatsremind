export type EngineId = "meta" | "ycloud" | "unofficial";

export interface ProviderCapabilities {
  templates: boolean;
  numberCheck: boolean;
  session: boolean;
}

export interface OutboundTemplate {
  name: string;
  language?: string;
  parameters?: string[];
}

export interface OutboundMessage {
  phone: string;
  template?: OutboundTemplate;
  text?: string;
}

export interface SendResult {
  success: boolean;
  messageId?: string;
  httpStatus: number;
  errorDetail?: string;
}

export interface MetaCredentials {
  token: string;
  phoneId: string;
}

export interface YCloudCredentials {
  apiKey: string;
  from: string;
}

export interface UnofficialCredentials {
  url?: string;
  apiKey?: string;
  instance?: string;
  deviceId?: string;
}

export type ProviderCredentials = MetaCredentials | YCloudCredentials | UnofficialCredentials;

export interface ProviderConfig {
  engine: EngineId;
  credentials?: ProviderCredentials;
  metaToken?: string | null;
  metaPhoneId?: string | null;
  ycloudApiKey?: string | null;
  ycloudPhone?: string | null;
  evolutionUrl?: string | null;
  evolutionApiKey?: string | null;
  evolutionInstance?: string | null;
}

export interface ProviderStatus {
  ready: boolean;
  details?: unknown;
}

export interface MessagingProvider {
  readonly id: EngineId;
  readonly capabilities: ProviderCapabilities;
  send(message: OutboundMessage): Promise<SendResult>;
  getStatus(): Promise<ProviderStatus>;
}
