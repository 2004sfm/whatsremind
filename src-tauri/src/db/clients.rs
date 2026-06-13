use crate::error::AppError;
use crate::models::{Client, ClientFilter, PaginatedClients};
use rusqlite::{params, Connection, OptionalExtension};

pub fn upsert_client(
    conn: &Connection,
    phone_number: &str,
    name: &str,
    code: &str,
    sheet_name: &str,
    debt: f64,
    is_sendable: bool,
    excel_row: Option<u32>,
) -> Result<bool, AppError> {
    let exists: bool = conn
        .query_row(
            "SELECT 1 FROM clients WHERE code = ?1 AND sheet_name = ?2",
            params![code, sheet_name],
            |_| Ok(true),
        )
        .optional()
        .map_err(|e| AppError::Db(e.to_string()))?
        .unwrap_or(false);

    conn.execute(
        "INSERT INTO clients (phone_number, name, code, sheet_name, debt, is_sendable, excel_row, is_active)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, 1)
         ON CONFLICT(code, sheet_name) DO UPDATE SET
            name = excluded.name,
            phone_number = excluded.phone_number,
            debt = excluded.debt,
            is_sendable = excluded.is_sendable,
            excel_row = excluded.excel_row,
            is_active = 1",
        params![phone_number, name, code, sheet_name, debt, is_sendable, excel_row],
    )
    .map_err(|e| AppError::Db(e.to_string()))?;

    Ok(!exists) // true if created, false if updated
}

pub fn get_clients(
    conn: &Connection,
    filter: &ClientFilter,
) -> Result<PaginatedClients, AppError> {
    let mut query = "SELECT id, phone_number, name, code, sheet_name, debt, last_sent, is_sendable, is_active, excel_row 
                     FROM clients WHERE is_active = 1".to_string();
    
    let mut params_vec: Vec<rusqlite::types::Value> = Vec::new();
    let mut param_index = 1;

    if let Some(status) = &filter.status {
        let s = status.to_lowercase();
        if s == "paid" {
            query.push_str(" AND debt = 0");
        } else if s == "pending" {
            query.push_str(" AND debt > 0 AND is_sendable = 1");
        } else if s == "invalid" {
            // Inválidos: Personas con deuda pero con teléfono malo/vacío, o simplemente sin teléfono
            query.push_str(" AND ((is_sendable = 0 AND debt > 0) OR phone_number = '' OR phone_number IS NULL)");
        } else if s == "noname" {
            // Sin nombre
            query.push_str(" AND (name = '' OR name IS NULL)");
        }
    }

    if filter.exclude_recent_24h.unwrap_or(false) {
        query.push_str(" AND (last_sent IS NULL OR last_sent <= datetime('now', '-24 hours'))");
    }

    if let Some(sheet) = &filter.sheet_name {
        query.push_str(&format!(" AND sheet_name = ?{}", param_index));
        params_vec.push(rusqlite::types::Value::Text(sheet.to_string()));
        param_index += 1;
    }

    if let Some(search) = &filter.search {
        if !search.trim().is_empty() {
            query.push_str(&format!(" AND (name LIKE ?{} OR code LIKE ?{} OR phone_number LIKE ?{})", 
                param_index, param_index, param_index));
            let like_str = format!("%{}%", search);
            params_vec.push(rusqlite::types::Value::Text(like_str));
            param_index += 1;
        }
    }
    
    let count_query = query.replace("SELECT id, phone_number, name, code, sheet_name, debt, last_sent, is_sendable, is_active, excel_row", "SELECT COUNT(*)");
    let total: u32 = conn.query_row(&count_query, rusqlite::params_from_iter(params_vec.iter()), |row| row.get(0))
        .map_err(|e| AppError::Db(e.to_string()))?;

    query.push_str(&format!(" ORDER BY id DESC LIMIT ?{} OFFSET ?{}", param_index, param_index + 1));
    params_vec.push(rusqlite::types::Value::Integer(filter.limit as i64));
    params_vec.push(rusqlite::types::Value::Integer(filter.offset as i64));

    let mut stmt = conn.prepare(&query).map_err(|e| AppError::Db(e.to_string()))?;
    let client_iter = stmt.query_map(rusqlite::params_from_iter(params_vec.iter()), |row| {
        let debt: f64 = row.get(5)?;
        let name: String = row.get(2)?;
        let status = if name.trim().is_empty() {
            "NoName".to_string()
        } else if !row.get::<_, bool>(7)? && debt > 0.0 {
            "Invalid".to_string()
        } else if debt == 0.0 {
            "Paid".to_string()
        } else {
            "Pending".to_string()
        };
        
        Ok(Client {
            id: row.get(0)?,
            phone_number: row.get(1)?,
            name,
            code: row.get(3)?,
            sheet_name: row.get(4)?,
            debt,
            last_sent: row.get(6)?,
            is_sendable: row.get(7)?,
            is_active: row.get(8)?,
            excel_row: row.get(9)?,
            status,
        })
    }).map_err(|e| AppError::Db(e.to_string()))?;

    let mut clients = Vec::new();
    for client in client_iter {
        clients.push(client.map_err(|e| AppError::Db(e.to_string()))?);
    }

    Ok(PaginatedClients {
        data: clients,
        total,
    })
}

pub fn get_available_sheets(conn: &Connection) -> Result<Vec<String>, AppError> {
    let mut stmt = conn.prepare("SELECT DISTINCT sheet_name FROM clients WHERE is_active = 1 ORDER BY id ASC")
        .map_err(|e| AppError::Db(e.to_string()))?;
    
    let sheets_iter = stmt.query_map([], |row| row.get(0))
        .map_err(|e| AppError::Db(e.to_string()))?;
        
    let mut sheets = Vec::new();
    for sheet in sheets_iter {
        sheets.push(sheet.map_err(|e| AppError::Db(e.to_string()))?);
    }
    
    Ok(sheets)
}

#[cfg(test)]
mod tests {
    use super::*;
    use rusqlite::Connection;

    fn setup_db() -> Connection {
        let conn = Connection::open_in_memory().unwrap();
        conn.execute(
            "CREATE TABLE clients (
                id INTEGER PRIMARY KEY,
                phone_number TEXT NOT NULL,
                name TEXT NOT NULL,
                code TEXT UNIQUE NOT NULL,
                debt REAL NOT NULL,
                last_sent DATETIME,
                is_sendable BOOLEAN NOT NULL DEFAULT 1,
                is_active BOOLEAN NOT NULL DEFAULT 1,
                excel_row INTEGER
            )",
            [],
        )
        .unwrap();
        conn
    }

    #[test]
    fn test_upsert_creates_new_record() {
        let conn = setup_db();
        let created = upsert_client(&conn, "+584248195886", "Juan Perez", "1A", 100.0, true, Some(2)).unwrap();
        assert!(created);

        let clients = get_clients(&conn, &ClientFilter { status: None, search: None, limit: 10, offset: 0 }).unwrap();
        assert_eq!(clients.total, 1);
        assert_eq!(clients.data[0].phone_number, "+584248195886");
        assert_eq!(clients.data[0].debt, 100.0);
    }

    #[test]
    fn test_upsert_updates_existing_record() {
        let conn = setup_db();
        upsert_client(&conn, "+584248195886", "Juan Perez", "1A", 100.0, true, Some(2)).unwrap();
        
        let created = upsert_client(&conn, "+584248195886", "Juan Modified", "1A", 0.0, true, Some(2)).unwrap();
        assert!(!created);

        let clients = get_clients(&conn, &ClientFilter { status: None, search: None, limit: 10, offset: 0 }).unwrap();
        assert_eq!(clients.total, 1);
        assert_eq!(clients.data[0].name, "Juan Modified");
        assert_eq!(clients.data[0].debt, 0.0);
        assert_eq!(clients.data[0].status, "Paid");
    }

    #[test]
    fn test_malformed_phone_unsendable() {
        let conn = setup_db();
        let created = upsert_client(&conn, "malformed", "Ana Gomez", "2B", 50.0, false, None).unwrap();
        assert!(created);

        let clients = get_clients(&conn, &ClientFilter { status: None, search: None, limit: 10, offset: 0 }).unwrap();
        assert_eq!(clients.total, 1);
        assert_eq!(clients.data[0].phone_number, "malformed");
        assert!(!clients.data[0].is_sendable);
    }
}


#[cfg(test)]
mod additional_tests {
    use super::*;
    use rusqlite::Connection;

    fn setup_db() -> Connection {
        let conn = Connection::open_in_memory().unwrap();
        conn.execute(
            "CREATE TABLE clients (
                id INTEGER PRIMARY KEY,
                phone_number TEXT NOT NULL,
                name TEXT NOT NULL,
                code TEXT UNIQUE NOT NULL,
                debt REAL NOT NULL,
                last_sent DATETIME,
                is_sendable BOOLEAN NOT NULL DEFAULT 1,
                is_active BOOLEAN NOT NULL DEFAULT 1,
                excel_row INTEGER
            )",
            [],
        )
        .unwrap();
        conn
    }

    #[test]
    fn test_upsert_idempotency_all_fields() {
        let conn = setup_db();
        // Insert first time
        upsert_client(&conn, "+584121234567", "InitialName", "1A", 150.0, true, Some(3)).unwrap();
        
        // Insert second time with DIFFERENT phone but SAME code
        let created = upsert_client(&conn, "+584121234568", "UpdatedName", "1A", 0.0, false, Some(3)).unwrap();
        
        assert!(!created); // Should be false because it updated

        let clients = get_clients(&conn, &ClientFilter { status: None, search: None, limit: 10, offset: 0 }).unwrap();
        
        // Verify no duplicates
        assert_eq!(clients.total, 1);
        assert_eq!(clients.data.len(), 1);
        
        // Verify all fields updated to latest values
        let client = &clients.data[0];
        assert_eq!(client.phone_number, "+584121234568");
        assert_eq!(client.name, "UpdatedName");
        assert_eq!(client.code, "1A");
        assert_eq!(client.debt, 0.0);
        assert_eq!(client.is_sendable, false);
    }
}
