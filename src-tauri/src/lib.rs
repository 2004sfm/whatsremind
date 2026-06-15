/*
 * WhatsRemind - Desktop Notification Application
 * Copyright (c) 2026 famtiago. All rights reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

pub mod commands;
pub mod db;
pub mod error;
pub mod models;
pub mod services;
pub mod sidecar;
pub mod state;

// The Tauri runtime entry point is excluded from test builds to avoid
// pulling in webkit2gtk / javascriptcoregtk system libraries that are
// not available in CI/test environments.
#[cfg(not(test))]
mod tauri_entry {

    use crate::db::initialize_db;
    use crate::state::AppState;
    use std::sync::Mutex;
    use tauri::Manager;
    use tokio::sync::watch;

    #[cfg_attr(mobile, tauri::mobile_entry_point)]
    pub fn run() {
        tauri::Builder::default()
            .plugin(tauri_plugin_shell::init())
            .plugin(tauri_plugin_opener::init())
            .plugin(tauri_plugin_dialog::init())
            .plugin(tauri_plugin_fs::init())
            .setup(|app| {
                let app_data_dir = app
                    .path()
                    .app_data_dir()
                    .expect("failed to resolve app data directory");

                let conn = initialize_db(&app_data_dir)
                    .expect("failed to initialize database");

                let (cancel_tx, _cancel_rx) = watch::channel(false);

                // Auto-start sidecar if engine is unofficial
                let engine: String = conn
                    .query_row("SELECT engine FROM app_config WHERE id = 1", [], |row| row.get(0))
                    .unwrap_or_else(|_| "meta".to_string());
                
                let sidecar = crate::sidecar::SidecarManager::new();
                if engine == "unofficial" {
                    let _ = sidecar.start(app.handle());
                }

                app.manage(AppState {
                    db: Mutex::new(conn),
                    cancel_tx,
                    app_data_dir,
                    sidecar,
                });

                Ok(())
            })
            .invoke_handler(tauri::generate_handler![
                crate::commands::excel::preview_excel,
                crate::commands::excel::import_excel,
                crate::commands::clients::get_clients,
                crate::commands::clients::get_available_sheets,
                crate::commands::clients::delete_sheet,
                crate::commands::sending::start_bulk_send,
                crate::commands::sending::cancel_bulk_send,
                crate::commands::config::setup_wizard_validate_and_save,
                crate::commands::config::get_credentials,
                crate::commands::config::get_app_config,
                crate::commands::config::save_template_name,
                crate::commands::config::get_template_name,
                crate::commands::config::get_whatsapp_profile,
                crate::commands::history::get_send_history,
                crate::commands::templates::get_meta_templates,
                crate::commands::templates::create_meta_template,
                crate::commands::templates::get_local_templates,
                crate::commands::templates::create_local_template,
                crate::commands::config::verify_meta_token,
                crate::commands::config::get_engine,
                crate::commands::config::set_engine,
                crate::commands::config::start_sidecar,
                crate::commands::config::stop_sidecar,
                crate::commands::config::logout_sidecar,
                crate::commands::config::get_sidecar_status,
                crate::commands::license::check_license_status
            ])
            .run(tauri::generate_context!())
            .expect("error while running tauri application");
    }
}

#[cfg(not(test))]
pub use tauri_entry::run;
