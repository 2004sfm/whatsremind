use crate::error::AppError;
use crate::models::{HistoryFilter, MessageLog, PaginatedLogs};
use crate::state::AppState;
use rusqlite::Connection;
use tauri::State;

pub fn get_send_history_impl(
    db: &Connection,
    filter: &HistoryFilter,
) -> Result<PaginatedLogs, AppError> {
    let mut query = String::from(
        "SELECT l.id, l.client_id, l.wa_message_id, l.status, l.http_status, l.error_detail, l.template_used, l.sent_at, \
         c.name, c.phone_number, c.code \
         FROM message_logs l \
         LEFT JOIN clients c ON l.client_id = c.id \
         WHERE 1=1"
    );
    let mut count_query = String::from("SELECT COUNT(*) FROM message_logs l WHERE 1=1");

    let mut params: Vec<Box<dyn rusqlite::ToSql>> = Vec::new();

    if let Some(ref status) = filter.status {
        query.push_str(&format!(" AND l.status = ?{}", params.len() + 1));
        count_query.push_str(&format!(" AND l.status = ?{}", params.len() + 1));
        params.push(Box::new(status.clone()));
    }

    if let Some(client_id) = filter.client_id {
        query.push_str(&format!(" AND l.client_id = ?{}", params.len() + 1));
        count_query.push_str(&format!(" AND l.client_id = ?{}", params.len() + 1));
        params.push(Box::new(client_id));
    }

    if let Some(ref date_from) = filter.date_from {
        query.push_str(&format!(" AND date(l.sent_at) >= ?{}", params.len() + 1));
        count_query.push_str(&format!(" AND date(l.sent_at) >= ?{}", params.len() + 1));
        params.push(Box::new(date_from.clone()));
    }

    if let Some(ref date_to) = filter.date_to {
        query.push_str(&format!(" AND date(l.sent_at) <= ?{}", params.len() + 1));
        count_query.push_str(&format!(" AND date(l.sent_at) <= ?{}", params.len() + 1));
        params.push(Box::new(date_to.clone()));
    }

    if let Some(ref search) = filter.search {
        let pattern = format!("%{}%", search);
        query.push_str(&format!(" AND (c.name LIKE ?{} OR c.phone_number LIKE ?{} OR c.code LIKE ?{})", params.len() + 1, params.len() + 2, params.len() + 3));
        count_query.push_str(&format!(" AND (c.name LIKE ?{} OR c.phone_number LIKE ?{} OR c.code LIKE ?{})", params.len() + 1, params.len() + 2, params.len() + 3));
        params.push(Box::new(pattern.clone()));
        params.push(Box::new(pattern.clone()));
        params.push(Box::new(pattern));
    }

    // Convert Vec<Box<dyn ToSql>> to Vec<&dyn ToSql>
    let sql_params: Vec<&dyn rusqlite::ToSql> = params.iter().map(|p| &**p as _).collect();

    let total: u32 = db.query_row(&count_query, rusqlite::params_from_iter(&sql_params), |row| row.get(0))?;

    query.push_str(" ORDER BY l.sent_at DESC");
    
    // Add pagination
    query.push_str(&format!(" LIMIT ?{} OFFSET ?{}", params.len() + 1, params.len() + 2));
    let mut final_params = params;
    final_params.push(Box::new(filter.limit));
    final_params.push(Box::new(filter.offset));
    
    let final_sql_params: Vec<&dyn rusqlite::ToSql> = final_params.iter().map(|p| &**p as _).collect();

    let mut stmt = db.prepare(&query)?;
    let log_iter = stmt.query_map(rusqlite::params_from_iter(&final_sql_params), |row| {
        let client_name: Option<String> = row.get(8)?;

        Ok(MessageLog {
            id: row.get(0)?,
            client_id: row.get(1)?,
            wa_message_id: row.get(2)?,
            status: row.get(3)?,
            http_status: row.get(4)?,
            error_detail: row.get(5)?,
            template_used: row.get(6)?,
            sent_at: row.get(7)?,
            client_name,
            client_phone: row.get(9)?,
            client_code: row.get(10)?,
        })
    })?;

    let mut data = Vec::new();
    for log in log_iter {
        data.push(log?);
    }

    Ok(PaginatedLogs { data, total })
}

#[tauri::command]
pub fn get_send_history(
    state: State<'_, AppState>,
    filter: HistoryFilter,
) -> Result<PaginatedLogs, AppError> {
    let db = state.db.lock().map_err(|_| AppError::Db("Mutex poisoned".to_string()))?;
    get_send_history_impl(&db, &filter)
}

#[cfg(test)]
mod tests {
    use super::*;
    

    fn setup_db() -> Connection {
        let conn = Connection::open_in_memory().unwrap();
        let schema = include_str!("../db/schema.sql");
        conn.execute_batch(schema).unwrap();
        conn
    }

    #[test]
    fn test_get_send_history_filters() {
        let db = setup_db();
        
        // Insert client
        db.execute(
            "INSERT INTO clients (id, phone_number, name, code, debt, is_sendable)
             VALUES (1, '+584121234567', 'Test Client', '1A', 100.0, 1)",
            [],
        ).unwrap();

        // Insert message logs
        db.execute(
            "INSERT INTO message_logs (client_id, wa_message_id, status, http_status, template_used, sent_at)
             VALUES (1, 'wamid.1', 'sent', 200, 'test_template', '2023-01-01 10:00:00')",
            [],
        ).unwrap();
        
        db.execute(
            "INSERT INTO message_logs (client_id, wa_message_id, status, http_status, error_detail, template_used, sent_at)
             VALUES (1, 'wamid.2', 'failed', 500, 'Server error', 'test_template', '2023-01-02 10:00:00')",
            [],
        ).unwrap();

        // 1. Test date range
        let filter1 = HistoryFilter {
            date_from: Some("2023-01-02".to_string()),
            date_to: None,
            status: None,
            client_id: None,
            search: None,
            limit: 10,
            offset: 0,
        };
        let res1 = get_send_history_impl(&db, &filter1).unwrap();
        assert_eq!(res1.total, 1);
        assert_eq!(res1.data[0].status, "failed");

        // 2. Test status filter
        let filter2 = HistoryFilter {
            date_from: None,
            date_to: None,
            status: Some("sent".to_string()),
            client_id: None,
            search: None,
            limit: 10,
            offset: 0,
        };
        let res2 = get_send_history_impl(&db, &filter2).unwrap();
        assert_eq!(res2.total, 1);
        assert_eq!(res2.data[0].status, "sent");

        // 3. Test pagination
        let filter3 = HistoryFilter {
            date_from: None,
            date_to: None,
            status: None,
            client_id: None,
            search: None,
            limit: 1,
            offset: 1,
        };
        let res3 = get_send_history_impl(&db, &filter3).unwrap();
        assert_eq!(res3.total, 2); // Total matches regardless of limit
        assert_eq!(res3.data.len(), 1);
        assert_eq!(res3.data[0].status, "sent"); // DESC order, so offset 1 is the older one
    }
}
