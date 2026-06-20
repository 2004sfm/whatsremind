pub mod clients;

use rusqlite::Connection;
use std::path::Path;

use crate::error::AppError;

/// Current schema version. Bump this when the schema changes.
const SCHEMA_VERSION: u32 = 8;

/// Opens (or creates) the SQLite database at `app_data_dir/whatsremind.db`,
/// runs the schema migration once, and returns the connection.
pub fn initialize_db(app_data_dir: &Path) -> Result<Connection, AppError> {
    std::fs::create_dir_all(app_data_dir)?;
    let db_path = app_data_dir.join("whatsremind.db");
    let conn = Connection::open(&db_path)?;

    // WAL mode for better concurrency
    conn.execute_batch("PRAGMA journal_mode=WAL;")?;

    let current_version: u32 = conn
        .query_row("PRAGMA user_version;", [], |row| row.get(0))
        .unwrap_or(0);

    if current_version < 3 {
        // Drop tables to recreate them with the new UNIQUE constraint on `code` and `sheet_name`
        conn.execute_batch("DROP TABLE IF EXISTS message_logs;")?;
        conn.execute_batch("DROP TABLE IF EXISTS clients;")?;
    }

    if current_version < 4 {
        // Add excel_row column to existing clients table
        let _ = conn.execute_batch("ALTER TABLE clients ADD COLUMN excel_row INTEGER;");
    }

    if current_version < 5 {
        let _ = conn.execute_batch("ALTER TABLE app_config ADD COLUMN engine TEXT NOT NULL DEFAULT 'meta';");
    }

    if current_version < 7 {
        let _ = conn.execute_batch("ALTER TABLE clients ADD COLUMN phone_number_2 TEXT;");
    }

    // v8: safety net — adds phone_number_2 to DBs that skipped the v7 migration
    // due to the earlier buggy guard. ALTER TABLE is a no-op if the column already exists
    // (SQLite ignores the error when we use let _).
    if current_version < SCHEMA_VERSION {
        let _ = conn.execute_batch("ALTER TABLE clients ADD COLUMN phone_number_2 TEXT;");
        let schema = include_str!("schema.sql");
        conn.execute_batch(schema)?;
        conn.execute_batch(&format!("PRAGMA user_version = {};", SCHEMA_VERSION))?;
    }

    Ok(conn)
}

#[cfg(test)]
mod tests {
    use rusqlite::Connection;

    fn create_in_memory_db() -> Connection {
        let conn = Connection::open_in_memory().expect("failed to open in-memory db");
        let schema = include_str!("schema.sql");
        conn.execute_batch(schema).expect("failed to run schema");
        conn
    }

    #[test]
    fn test_all_three_tables_exist() {
        let conn = create_in_memory_db();

        let tables: Vec<String> = {
            let mut stmt = conn
                .prepare(
                    "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'",
                )
                .expect("failed to prepare");
            stmt.query_map([], |row| row.get(0))
                .expect("failed to query")
                .filter_map(|r| r.ok())
                .collect()
        };

        assert!(tables.contains(&"app_config".to_string()), "app_config table missing");
        assert!(tables.contains(&"clients".to_string()), "clients table missing");
        assert!(tables.contains(&"message_logs".to_string()), "message_logs table missing");
        assert!(tables.contains(&"local_templates".to_string()), "local_templates table missing");
    }

    #[test]
    fn test_app_config_check_constraint_enforces_id_1() {
        let conn = create_in_memory_db();

        // Should succeed with id=1
        let result = conn.execute(
            "INSERT INTO app_config (id, encrypted_token, encrypted_phone_id, nonce) VALUES (1, X'01', X'02', X'03')",
            [],
        );
        assert!(result.is_ok(), "insert with id=1 should succeed");

        // Should fail with id=2 due to CHECK constraint
        let result = conn.execute(
            "INSERT INTO app_config (id, encrypted_token, encrypted_phone_id, nonce) VALUES (2, X'01', X'02', X'03')",
            [],
        );
        assert!(result.is_err(), "insert with id=2 should violate CHECK(id=1)");
    }

    #[test]
    fn test_schema_is_idempotent() {
        let conn = Connection::open_in_memory().expect("failed to open in-memory db");
        let schema = include_str!("schema.sql");
        // Running schema twice should not error because of IF NOT EXISTS
        conn.execute_batch(schema).expect("first schema run failed");
        conn.execute_batch(schema).expect("second schema run failed (not idempotent)");
    }
}
