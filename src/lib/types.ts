export interface Client {
  id: number;
  phone_number: string;
  name: string;
  code: string;
  debt: number;
  last_sent: string | null;
  is_sendable: boolean;
  is_active: boolean;
  sheet_name?: string;
  excel_row?: number;
}

export interface ClientFilter {
  status?: "pending" | "paid" | "all" | "invalid" | "noname";
  search?: string;
  page: number;
  page_size: number;
  sheet_name?: string;
  exclude_recent_24h?: boolean;
}

export interface PaginatedClients {
  data: Client[];
  total: number;
  page?: number;
  page_size?: number;
}

export interface ExcelPreview {
  headers: string[];
  rows: string[][];
  total_rows: number;
  sheets: string[];
  current_sheet: string;
}

export interface UIColumnMapping {
  phone_number: string;
  name: string;
  code: string;
  debt: string;
}

export interface ColumnMapping {
  phone: number;
  name: number;
  code: number;
  debt: number;
}

export interface RowError {
  row: number;
  reason: string;
}

export interface ImportStats {
  total_rows: number;
  created: number;
  updated: number;
  deactivated: number;
  skipped: number;
  errors: RowError[];
}

export interface HistoryFilter {
  date_from?: string;
  date_to?: string;
  status?: "sent" | "failed";
  search?: string;
  page: number;
  page_size: number;
}

export interface MessageLog {
  id: number;
  client_id: number;
  client_name: string;
  client_code: string | null;
  client_phone: string;
  wa_message_id?: string;
  status: "sent" | "failed";
  http_status?: number;
  error_detail?: string;
  template_used: string;
  sent_at: string;
}

export interface WhatsAppProfile {
  verified_name?: string;
  display_phone_number?: string;
}

export interface PaginatedLogs {
  data: MessageLog[];
  total: number;
  page?: number;
  page_size?: number;
}

export interface BulkSendProgressEvent {
  sent: number;
  failed: number;
  total: number;
  latest_log?: {
    phone_number: string;
    code?: string;
    status: "sent" | "failed";
    http_status?: number;
    error_detail?: string;
  };
}

export interface TemplateComponent {
  type: string;
  text?: string;
  format?: string;
}

export interface TemplateItem {
  id: string;
  name: string;
  language: string;
  status: string;
  category: string;
  components: TemplateComponent[];
}
