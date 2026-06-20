use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct ColumnMapping {
    pub phone: usize,
    pub phone2: Option<usize>,
    pub name: usize,
    pub code: usize,
    pub debt: usize,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct RowError {
    pub row: usize,
    pub reason: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ImportStats {
    pub total_rows: usize,
    pub created: usize,
    pub updated: usize,
    pub deactivated: usize,
    pub skipped: usize,
    pub errors: Vec<RowError>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ClientFilter {
    pub status: Option<String>, // "Paid", "Pending", or None for All
    pub search: Option<String>,
    pub sheet_name: Option<String>,
    pub exclude_recent_24h: Option<bool>,
    pub limit: u32,
    pub offset: u32,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Client {
    pub id: i64,
    pub phone_number: String,
    pub phone_number_2: Option<String>,
    pub name: String,
    pub code: String,
    pub sheet_name: String,
    pub debt: f64,
    pub last_sent: Option<String>,
    pub is_sendable: bool,
    pub is_active: bool,
    pub status: String,
    pub excel_row: Option<u32>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct PaginatedClients {
    pub data: Vec<Client>,
    pub total: u32,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ExcelPreview {
    pub headers: Vec<String>,
    pub rows: Vec<Vec<String>>,
    pub total_rows: usize,
    pub sheets: Vec<String>,
    pub current_sheet: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct HistoryFilter {
    pub date_from: Option<String>,
    pub date_to: Option<String>,
    pub status: Option<String>,
    pub client_id: Option<i64>,
    pub search: Option<String>,
    pub limit: u32,
    pub offset: u32,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct MessageLog {
    pub id: i64,
    pub client_id: Option<i64>,
    pub client_name: Option<String>,
    pub client_phone: Option<String>,
    pub client_code: Option<String>,
    pub wa_message_id: Option<String>,
    pub status: String,
    pub http_status: Option<i64>,
    pub error_detail: Option<String>,
    pub template_used: String,
    pub sent_at: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct PaginatedLogs {
    pub data: Vec<MessageLog>,
    pub total: u32,
}
