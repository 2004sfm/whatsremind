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

#[tauri::command]
pub async fn delete_sheet(
    state: tauri::State<'_, AppState>,
    sheet_name: String,
) -> Result<(), AppError> {
    let conn = state.db.lock().map_err(|e| AppError::Db(e.to_string()))?;
    
    // Eliminar historial asociado a la hoja para no violar constraints
    conn.execute(
        "DELETE FROM message_logs WHERE client_id IN (SELECT id FROM clients WHERE sheet_name = ?1)", 
        rusqlite::params![sheet_name]
    ).map_err(|e| AppError::Db(e.to_string()))?;
    
    // Eliminar clientes de la hoja
    conn.execute(
        "DELETE FROM clients WHERE sheet_name = ?1", 
        rusqlite::params![sheet_name]
    ).map_err(|e| AppError::Db(e.to_string()))?;
    
    Ok(())
}
