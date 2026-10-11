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

    CREATE TABLE IF NOT EXISTS channels (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      engine TEXT NOT NULL,
      phone_number TEXT NOT NULL,
      display_name TEXT,
      credentials TEXT NOT NULL,
      is_active INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'connected',
      created_at INTEGER,
      updated_at INTEGER
    );

    CREATE INDEX IF NOT EXISTS idx_channels_engine_is_active ON channels (engine, is_active);

    INSERT OR IGNORE INTO app_config (id, engine, default_country) VALUES (1, 'meta', 'VE');
  `);

  const channelCountRow = sqlite.query("SELECT COUNT(*) as count FROM channels").get() as { count: number } | null;
  const channelCount = channelCountRow?.count ?? 0;

  if (channelCount === 0) {
    interface ConfigRow {
      meta_token?: string | null;
      meta_phone_id?: string | null;
      ycloud_api_key?: string | null;
      ycloud_phone?: string | null;
    }
    const config = sqlite.query("SELECT * FROM app_config WHERE id = 1").get() as ConfigRow | null;
    if (config) {
      const now = Math.floor(Date.now() / 1000);
      if (config.meta_token && config.meta_phone_id) {
        sqlite.run(
          `INSERT INTO channels (engine, phone_number, display_name, credentials, is_active, status, created_at, updated_at)
           VALUES (?, ?, ?, ?, 1, 'connected', ?, ?)`,
          [
            "meta",
            config.meta_phone_id,
            "Meta Principal",
            JSON.stringify({ token: config.meta_token, phoneId: config.meta_phone_id }),
            now,
            now,
          ]
        );
      }
      if (config.ycloud_api_key && config.ycloud_phone) {
        sqlite.run(
          `INSERT INTO channels (engine, phone_number, display_name, credentials, is_active, status, created_at, updated_at)
           VALUES (?, ?, ?, ?, 1, 'connected', ?, ?)`,
          [
            "ycloud",
            config.ycloud_phone,
            "YCloud Principal",
            JSON.stringify({ apiKey: config.ycloud_api_key, from: config.ycloud_phone }),
            now,
            now,
          ]
        );
      }
    }
  }
}
