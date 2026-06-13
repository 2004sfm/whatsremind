-- Schema version: 1
-- This file is embedded at compile time via include_str! and run once via execute_batch.

CREATE TABLE IF NOT EXISTS app_config (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    encrypted_token BLOB NOT NULL,
    encrypted_phone_id BLOB NOT NULL,
    nonce BLOB NOT NULL,
    template_name TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS clients (
    id INTEGER PRIMARY KEY,
    phone_number TEXT NOT NULL,
    name TEXT NOT NULL,
    code TEXT NOT NULL,
    sheet_name TEXT NOT NULL,
    debt REAL NOT NULL,
    last_sent DATETIME,
    is_sendable BOOLEAN NOT NULL DEFAULT 1,
    is_active BOOLEAN NOT NULL DEFAULT 1,
    excel_row INTEGER,
    UNIQUE(code, sheet_name)
);

CREATE TABLE IF NOT EXISTS message_logs (
    id INTEGER PRIMARY KEY,
    client_id INTEGER REFERENCES clients(id),
    wa_message_id TEXT,
    status TEXT NOT NULL, -- 'sent', 'failed'
    http_status INTEGER,
    error_detail TEXT,
    template_used TEXT NOT NULL,
    sent_at DATETIME NOT NULL
);
