use rusqlite::Connection;
use std::path::PathBuf;
use std::sync::Mutex;
use tokio::sync::watch;

/// Shared application state managed by Tauri.
///
/// - `db`: mutex-guarded SQLite connection (one writer at a time).
/// - `cancel_tx`: watch channel sender; set to `true` to signal cancellation
///   of a running bulk-send campaign.
/// - `app_data_dir`: resolved OS-specific data directory for the app.
pub struct AppState {
    pub db: Mutex<Connection>,
    pub cancel_tx: watch::Sender<bool>,
    pub app_data_dir: PathBuf,
}
