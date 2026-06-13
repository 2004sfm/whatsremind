pub mod commands;
pub mod db;
pub mod error;
pub mod models;
pub mod services;
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

                app.manage(AppState {
                    db: Mutex::new(conn),
                    cancel_tx,
                    app_data_dir,
                });

                Ok(())
            })
            .invoke_handler(tauri::generate_handler![
                crate::commands::excel::preview_excel,
                crate::commands::excel::import_excel,
                crate::commands::clients::get_clients,
                crate::commands::clients::get_available_sheets,
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
                crate::commands::config::verify_meta_token
            ])
            .run(tauri::generate_context!())
            .expect("error while running tauri application");
    }
}

#[cfg(not(test))]
pub use tauri_entry::run;
