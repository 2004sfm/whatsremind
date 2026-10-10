import { sqlite } from "./index";

export function initializeDatabase() {
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS app_config (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      engine TEXT NOT NULL DEFAULT 'meta',
      meta_token TEXT,
      meta_phone_id TEXT,
      ycloud_api_key TEXT,
      ycloud_phone TEXT,
      evolution_url TEXT,
      evolution_api_key TEXT,
      evolution_instance TEXT,
      template_name TEXT NOT NULL DEFAULT '',
      default_country TEXT NOT NULL DEFAULT 'VE',
      updated_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS clients (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      phone_number TEXT NOT NULL,
      phone_number_2 TEXT,
      name TEXT NOT NULL,
      code TEXT NOT NULL,
      sheet_name TEXT NOT NULL,
      debt REAL NOT NULL DEFAULT 0,
      last_sent TEXT,
      is_sendable INTEGER NOT NULL DEFAULT 1,
      is_active INTEGER NOT NULL DEFAULT 1,
      excel_row INTEGER
    );

    CREATE UNIQUE INDEX IF NOT EXISTS unique_client_code_sheet ON clients (code, sheet_name);

    CREATE TABLE IF NOT EXISTS message_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      client_id INTEGER REFERENCES clients(id) ON DELETE SET NULL,
      wa_message_id TEXT,
      engine TEXT NOT NULL DEFAULT 'meta',
      status TEXT NOT NULL,
      http_status INTEGER,
      error_detail TEXT,
      template_used TEXT NOT NULL,
      sent_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS local_templates (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      language TEXT NOT NULL,
      status TEXT NOT NULL,
      category TEXT NOT NULL,
      components_json TEXT NOT NULL
    );

    INSERT OR IGNORE INTO app_config (id, engine, default_country) VALUES (1, 'meta', 'VE');
  `);
}
