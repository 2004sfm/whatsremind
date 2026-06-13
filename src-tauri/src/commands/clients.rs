use crate::db::clients::{get_clients as db_get_clients, get_available_sheets as db_get_sheets};
use crate::error::AppError;
use crate::models::{ClientFilter, PaginatedClients};
use crate::state::AppState;

#[tauri::command]
pub async fn get_clients(
    state: tauri::State<'_, AppState>,
    filter: ClientFilter,
) -> Result<PaginatedClients, AppError> {
    let conn = state.db.lock().map_err(|e| AppError::Db(e.to_string()))?;
    db_get_clients(&conn, &filter)
}

#[tauri::command]
pub async fn get_available_sheets(state: tauri::State<'_, AppState>) -> Result<Vec<String>, AppError> {
    let conn = state.db.lock().map_err(|e| AppError::Db(e.to_string()))?;
    db_get_sheets(&conn)
}
