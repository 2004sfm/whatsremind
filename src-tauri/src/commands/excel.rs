use crate::db::clients::upsert_client;
use crate::error::AppError;
use crate::models::{ColumnMapping, ExcelPreview, ImportStats, RowError};
use crate::services::excel::{extract_all_sheets_rows, normalize_phone, preview_excel_file};
use crate::state::AppState;


#[tauri::command]
pub async fn preview_excel(file_path: String, sheet: Option<String>) -> Result<ExcelPreview, AppError> {
    preview_excel_file(&file_path, sheet)
}

#[tauri::command]
pub async fn import_excel(
    _app_handle: tauri::AppHandle,
    state: tauri::State<'_, AppState>,
    file_path: String,
    _sheet: Option<String>,
    mapping: ColumnMapping,
    overwrite_all: bool,
) -> Result<ImportStats, AppError> {
    let sheets_data = extract_all_sheets_rows(&file_path)?;
    
    let mut stats = ImportStats {
        total_rows: 0,
        created: 0,
        updated: 0,
        deactivated: 0,
        skipped: 0,
        errors: Vec::new(),
    };

    let mut conn = state.db.lock().map_err(|e| AppError::Db(e.to_string()))?;
    let tx = conn.transaction().map_err(|e| AppError::Db(e.to_string()))?;

    tx.execute("CREATE TEMP TABLE current_import (code TEXT, sheet_name TEXT, UNIQUE(code, sheet_name))", [])
      .map_err(|e| AppError::Db(e.to_string()))?;

    for (sheet_name, rows) in sheets_data {
        stats.total_rows += rows.len();

        for (row_num, row) in rows {

        let get_col = |idx: usize| -> Option<&String> { row.get(idx) };

        let is_useless_row = {
            let p = get_col(mapping.phone).map(|v| v.trim()).unwrap_or("");
            let n = get_col(mapping.name).map(|v| v.trim()).unwrap_or("");
            let c = get_col(mapping.code).map(|v| v.trim()).unwrap_or("");
            let d = get_col(mapping.debt).map(|v| v.trim()).unwrap_or("");
            
            let filled_count = (!p.is_empty() as u8) + (!n.is_empty() as u8) + (!c.is_empty() as u8) + (!d.is_empty() as u8);
            filled_count <= 1
        };

        if is_useless_row {
            stats.skipped += 1;
            continue;
        }

        let phone_raw = match get_col(mapping.phone) {
            Some(v) if !v.trim().is_empty() => v.trim(),
            _ => {
                stats.errors.push(RowError {
                    row: row_num,
                    reason: format!("[Hoja: {}] Aviso: Teléfono vacío. Se guardó pero no se podrán enviar mensajes.", sheet_name),
                });
                ""
            }
        };

        let name = match get_col(mapping.name) {
            Some(v) if !v.trim().is_empty() => v.trim(),
            _ => {
                stats.errors.push(RowError {
                    row: row_num,
                    reason: format!("[Hoja: {}] Aviso: Nombre vacío. Se asume 'Sin nombre'.", sheet_name),
                });
                "Sin nombre"
            }
        };

        let code = match get_col(mapping.code) {
            Some(v) if !v.trim().is_empty() => v.trim(),
            _ => {
                stats.skipped += 1;
                stats.errors.push(RowError {
                    row: row_num,
                    reason: format!("[Hoja: {}] Error: El código de apartamento es obligatorio. Fila ignorada.", sheet_name),
                });
                continue;
            }
        };

        let debt_str = match get_col(mapping.debt) {
            Some(v) if !v.trim().is_empty() => v.trim(),
            _ => "0",
        };

        let balance = match debt_str.parse::<f64>() {
            Ok(b) => b,
            Err(_) => {
                stats.errors.push(RowError {
                    row: row_num,
                    reason: format!("[Hoja: {}] Aviso: Deuda con letras o formato inválido ('{}'). Se asumió 0.00.", sheet_name, debt_str),
                });
                0.0
            }
        };

            let (normalized_phone, is_sendable) = normalize_phone(phone_raw);

            tx.execute("INSERT OR IGNORE INTO current_import (code, sheet_name) VALUES (?, ?)", rusqlite::params![code, sheet_name])
              .map_err(|e| AppError::Db(e.to_string()))?;

            match upsert_client(
                &tx,
                &normalized_phone,
                name,
                code,
                &sheet_name,
                balance,
                is_sendable,
                Some(row_num as u32),
            ) {
                Ok(created) => {
                    if created {
                        stats.created += 1;
                    } else {
                        stats.updated += 1;
                    }
                }
                Err(e) => {
                    stats.skipped += 1;
                    stats.errors.push(RowError {
                        row: row_num,
                        reason: format!("DB Error en {}: {:?}", sheet_name, e),
                    });
                }
            }
        }
    }

    let deactivated = if overwrite_all {
        tx.execute(
            "UPDATE clients SET is_active = 0 WHERE (code, sheet_name) NOT IN (SELECT code, sheet_name FROM current_import) AND is_active = 1", 
            []
        ).map_err(|e| AppError::Db(e.to_string()))?
    } else {
        tx.execute(
            "UPDATE clients SET is_active = 0 WHERE (code, sheet_name) NOT IN (SELECT code, sheet_name FROM current_import) AND sheet_name IN (SELECT DISTINCT sheet_name FROM current_import) AND is_active = 1", 
            []
        ).map_err(|e| AppError::Db(e.to_string()))?
    };
    
    stats.deactivated = deactivated;

    tx.execute("DROP TABLE current_import", []).map_err(|e| AppError::Db(e.to_string()))?;

    tx.commit().map_err(|e| AppError::Db(e.to_string()))?;

    Ok(stats)
}
