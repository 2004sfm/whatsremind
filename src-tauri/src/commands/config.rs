use crate::error::AppError;
use crate::services::crypto::{derive_machine_key, encrypt, decrypt};
use crate::state::AppState;
use rusqlite::{Connection, OptionalExtension};
use serde::{Deserialize, Serialize};
use tauri::AppHandle;

#[derive(Serialize, Deserialize)]
pub struct ConfigCredentials {
    pub token: String,
    pub phone_id: String,
    #[serde(default)]
    pub waba_id: String,
}

#[cfg(not(test))]
async fn check_meta_api(token: &str, phone_id: &str) -> Result<(), AppError> {
    let url = format!("https://graph.facebook.com/v19.0/{}", phone_id);
    let client = reqwest::Client::new();
    let res = client
        .get(&url)
        .bearer_auth(token)
        .send()
        .await
        .map_err(|e| AppError::Api(format!("Network error: {}", e)))?;

    if !res.status().is_success() {
        return Err(AppError::Api(format!(
            "Invalid credentials. Meta API returned: {}",
            res.status()
        )));
    }
    Ok(())
}

#[cfg(test)]
async fn check_meta_api(_token: &str, _phone_id: &str) -> Result<(), AppError> {
    // Skip in tests
    Ok(())
}

pub fn setup_wizard_save_impl(
    db: &Connection,
    app_data_dir: &std::path::Path,
    token: String,
    phone_id: String,
    waba_id: String,
) -> Result<(), AppError> {
    let key = derive_machine_key(app_data_dir);

    let creds = ConfigCredentials { token, phone_id: phone_id.clone(), waba_id };
    let creds_json = serde_json::to_string(&creds).map_err(|e| AppError::Validation(format!("Serialization failed: {}", e)))?;
    let (encrypted_data, nonce) = encrypt(&creds_json, &key)?;

    db.execute(
        "INSERT OR REPLACE INTO app_config (id, encrypted_token, encrypted_phone_id, nonce) 
         VALUES (1, ?1, ?2, ?3)",
        rusqlite::params![encrypted_data, vec![0u8; 0], nonce],
    ).map_err(|e| AppError::Db(e.to_string()))?;

    Ok(())
}

pub fn save_template_name_impl(db: &Connection, template_name: String) -> Result<(), AppError> {
    db.execute(
        "UPDATE app_config SET template_name = ?1 WHERE id = 1",
        rusqlite::params![template_name],
    ).map_err(|e| AppError::Db(e.to_string()))?;
    Ok(())
}

pub fn get_template_name_impl(db: &Connection) -> Result<Option<String>, AppError> {
    let mut stmt = db
        .prepare("SELECT template_name FROM app_config WHERE id = 1")
        .map_err(|e| AppError::Db(e.to_string()))?;
    let result = stmt
        .query_row([], |row| row.get(0))
        .optional()
        .map_err(|e| AppError::Db(e.to_string()))?;
    Ok(result.flatten())
}

pub fn get_app_config_impl(db: &Connection) -> Result<bool, AppError> {
    let mut stmt = db.prepare("SELECT COUNT(*) FROM app_config WHERE id = 1").map_err(|e| AppError::Db(e.to_string()))?;
    let count: i64 = stmt.query_row([], |row| row.get(0)).map_err(|e| AppError::Db(e.to_string()))?;
    Ok(count > 0)
}

pub fn get_credentials_impl(
    db: &Connection,
    app_data_dir: &std::path::Path,
) -> Result<Option<ConfigCredentials>, AppError> {
    let mut stmt = db.prepare("SELECT encrypted_token, nonce FROM app_config WHERE id = 1")
        .map_err(|e| AppError::Db(e.to_string()))?;
    
    let result = stmt.query_row([], |row| {
        let encrypted_token: Vec<u8> = row.get(0)?;
        let nonce: Vec<u8> = row.get(1)?;
        Ok((encrypted_token, nonce))
    }).optional().map_err(|e| AppError::Db(e.to_string()))?;

    if let Some((encrypted_token, nonce)) = result {
        if encrypted_token.is_empty() {
            return Ok(None);
        }
        let key = derive_machine_key(app_data_dir);
        let json_str = decrypt(&encrypted_token, &nonce, &key)?;
        let creds: ConfigCredentials = serde_json::from_str(&json_str)
            .map_err(|e| AppError::Validation(format!("Failed to parse credentials: {}", e)))?;
        Ok(Some(creds))
    } else {
        Ok(None)
    }
}

#[tauri::command]
pub async fn setup_wizard_validate_and_save(
    state: tauri::State<'_, AppState>,
    token: String,
    phone_id: String,
    waba_id: String,
) -> Result<(), AppError> {
    check_meta_api(&token, &phone_id).await?;

    let db = state.db.lock().map_err(|_| AppError::Db("Mutex poisoned".to_string()))?;
    setup_wizard_save_impl(&db, &state.app_data_dir, token, phone_id, waba_id)
}

#[tauri::command]
pub fn save_template_name(
    state: tauri::State<'_, AppState>,
    template_name: String,
) -> Result<(), AppError> {
    let db = state.db.lock().map_err(|_| AppError::Db("Mutex poisoned".to_string()))?;
    save_template_name_impl(&db, template_name)
}

#[tauri::command]
pub fn get_template_name(state: tauri::State<'_, AppState>) -> Result<Option<String>, AppError> {
    let db = state.db.lock().map_err(|_| AppError::Db("Mutex poisoned".to_string()))?;
    get_template_name_impl(&db)
}

#[tauri::command]
pub fn get_app_config(state: tauri::State<'_, AppState>) -> Result<bool, AppError> {
    let db = state.db.lock().map_err(|_| AppError::Db("Mutex poisoned".to_string()))?;
    get_app_config_impl(&db)
}

#[tauri::command]
pub fn get_credentials(state: tauri::State<'_, AppState>) -> Result<Option<ConfigCredentials>, AppError> {
    let db = state.db.lock().map_err(|_| AppError::Db("Mutex poisoned".to_string()))?;
    get_credentials_impl(&db, &state.app_data_dir)
}

#[derive(Serialize, Deserialize, Debug)]
pub struct WhatsAppProfile {
    pub verified_name: Option<String>,
    pub display_phone_number: Option<String>,
}

#[cfg(not(test))]
async fn fetch_whatsapp_profile(token: &str, phone_id: &str) -> Result<WhatsAppProfile, AppError> {
    let url = format!("https://graph.facebook.com/v19.0/{}?fields=verified_name,display_phone_number", phone_id);
    let client = reqwest::Client::new();
    let res = client
        .get(&url)
        .bearer_auth(token)
        .send()
        .await
        .map_err(|e| AppError::Api(format!("Network error: {}", e)))?;

    if !res.status().is_success() {
        let status = res.status();
        let body = res.text().await.unwrap_or_default();
        return Err(AppError::Api(format!(
            "Meta API Error ({}): {}",
            status, body
        )));
    }
    
    let profile = res.json::<WhatsAppProfile>().await
        .map_err(|e| AppError::Api(format!("Failed to parse profile: {}", e)))?;
        
    Ok(profile)
}

#[cfg(test)]
async fn fetch_whatsapp_profile(_token: &str, _phone_id: &str) -> Result<WhatsAppProfile, AppError> {
    Ok(WhatsAppProfile {
        verified_name: Some("Test Business".to_string()),
        display_phone_number: Some("+1 555-1234".to_string()),
    })
}

#[tauri::command]
pub async fn get_whatsapp_profile(state: tauri::State<'_, AppState>) -> Result<Option<WhatsAppProfile>, AppError> {
    let creds_opt = {
        let db = state.db.lock().map_err(|_| AppError::Db("Mutex poisoned".to_string()))?;
        get_credentials_impl(&db, &state.app_data_dir)?
    };

    if let Some(creds) = creds_opt {
        let profile = fetch_whatsapp_profile(&creds.token, &creds.phone_id).await?;
        Ok(Some(profile))
    } else {
        Ok(None)
    }
}

#[tauri::command]
pub async fn verify_meta_token(state: tauri::State<'_, AppState>) -> Result<bool, AppError> {
    let creds_opt = {
        let db = state.db.lock().map_err(|_| AppError::Db("Mutex poisoned".to_string()))?;
        get_credentials_impl(&db, &state.app_data_dir)?
    };

    if let Some(creds) = creds_opt {
        match check_meta_api(&creds.token, &creds.phone_id).await {
            Ok(_) => Ok(true),
            Err(_) => Ok(false),
        }
    } else {
        Ok(false)
    }
}

#[tauri::command]
pub fn get_engine(state: tauri::State<'_, AppState>) -> Result<String, AppError> {
    let db = state.db.lock().map_err(|_| AppError::Db("Mutex poisoned".to_string()))?;
    let mut stmt = db.prepare("SELECT engine FROM app_config WHERE id = 1").map_err(|e| AppError::Db(e.to_string()))?;
    let engine: String = stmt.query_row([], |row| row.get(0)).unwrap_or_else(|_| "meta".to_string());
    Ok(engine)
}

#[tauri::command]
pub fn set_engine(state: tauri::State<'_, AppState>, engine: String) -> Result<(), AppError> {
    let db = state.db.lock().map_err(|_| AppError::Db("Mutex poisoned".to_string()))?;
    db.execute(
        "INSERT INTO app_config (id, encrypted_token, encrypted_phone_id, nonce, engine) 
         VALUES (1, X'', X'', X'', ?1) 
         ON CONFLICT(id) DO UPDATE SET engine = excluded.engine", 
        rusqlite::params![engine]
    ).map_err(|e| AppError::Db(e.to_string()))?;
    Ok(())
}

#[tauri::command]
pub fn start_sidecar(app_handle: AppHandle, state: tauri::State<'_, AppState>) -> Result<u16, AppError> {
    state.sidecar.start(&app_handle).map_err(|e| AppError::Api(format!("Sidecar error: {}", e)))
}

#[tauri::command]
pub fn stop_sidecar(state: tauri::State<'_, AppState>) -> Result<(), AppError> {
    state.sidecar.stop();
    Ok(())
}

#[tauri::command]
pub async fn logout_sidecar(state: tauri::State<'_, AppState>) -> Result<(), AppError> {
    let port = {
        let p = state.sidecar.port.lock().unwrap();
        if let Some(port) = *p {
            port
        } else {
            return Err(AppError::Api("El motor no está encendido".into()));
        }
    };

    let client = reqwest::Client::new();
    let res = client.post(format!("http://127.0.0.1:{}/logout", port))
        .send()
        .await
        .map_err(|_| AppError::Api("No se pudo conectar al motor".into()))?;

    if !res.status().is_success() {
        return Err(AppError::Api("Fallo al desvincular el motor".into()));
    }
    Ok(())
}

#[derive(Serialize)]
pub struct SidecarStatus {
    is_running: bool,
    connected: bool,
    qr: Option<String>,
    phone: Option<String>,
}

#[tauri::command]
pub async fn get_sidecar_status(state: tauri::State<'_, AppState>) -> Result<SidecarStatus, AppError> {
    let port = {
        let p = state.sidecar.port.lock().unwrap();
        if let Some(port) = *p {
            port
        } else {
            return Ok(SidecarStatus { is_running: false, connected: false, qr: None, phone: None });
        }
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_millis(500))
        .build()
        .unwrap_or_else(|_| reqwest::Client::new());
    let res = match client.get(format!("http://127.0.0.1:{}/status", port)).send().await {
        Ok(res) => res,
        Err(_) => return Ok(SidecarStatus { is_running: true, connected: false, qr: None, phone: None }),
    };

    #[derive(Deserialize)]
    struct SidecarStatusRes {
        connected: bool,
        qr: Option<String>,
        phone: Option<String>,
    }

    let status_res = res.json::<SidecarStatusRes>().await.map_err(|_| AppError::Api("Failed to parse sidecar status".into()))?;
    Ok(SidecarStatus {
        is_running: true,
        connected: status_res.connected,
        qr: status_res.qr,
        phone: status_res.phone,
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::path::PathBuf;

    fn setup_db() -> Connection {
        let conn = Connection::open_in_memory().unwrap();
        let schema = include_str!("../db/schema.sql");
        conn.execute_batch(schema).unwrap();
        conn
    }

    #[test]
    fn test_full_credential_flow() {
        let db = setup_db();
        let app_data_dir = PathBuf::from("/tmp");

        // Start with no config
        assert_eq!(get_app_config_impl(&db).unwrap(), false);

        // Save credentials
        setup_wizard_save_impl(
            &db,
            &app_data_dir,
            "fake_token".to_string(),
            "fake_phone_id".to_string(),
            "fake_waba_id".to_string(),
        ).unwrap();

        // Save template separately
        save_template_name_impl(&db, "fake_template".to_string()).unwrap();

        // Check if config exists
        assert_eq!(get_app_config_impl(&db).unwrap(), true);

        // Verify it was encrypted properly
        let mut stmt = db.prepare("SELECT encrypted_token FROM app_config WHERE id = 1").unwrap();
        let encrypted_token: Vec<u8> = stmt.query_row([], |row| row.get(0)).unwrap();
        
        let creds_str = String::from_utf8(encrypted_token).unwrap_or_default();
        // The encrypted data should NOT contain the plaintext fake_token
        assert!(!creds_str.contains("fake_token"));
    }
}
