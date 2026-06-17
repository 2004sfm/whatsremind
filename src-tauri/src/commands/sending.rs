use crate::error::AppError;
use crate::services::crypto::{derive_machine_key, decrypt};
use crate::services::meta_api::MetaApiClient;
use crate::services::spintax::parse_spintax;
use crate::state::AppState;
use crate::commands::config::ConfigCredentials;
use serde::Serialize;
use std::sync::Arc;
use tauri::{AppHandle, Emitter, Manager};
use tauri::async_runtime::spawn;
use chrono::{Local, Timelike};


#[derive(Clone, Serialize)]
pub struct LatestLog {
    pub phone_number: String,
    pub status: String,
    pub error_detail: Option<String>,
}

#[derive(Clone, Serialize)]
pub struct BulkSendProgressEvent {
    pub sent: u32,
    pub failed: u32,
    pub total: u32,
    pub latest_log: LatestLog,
}

struct ClientData {
    id: i64,
    phone_number: String,
    name: String,
    code: String,
    debt: f64,
}

#[tauri::command]
pub async fn start_bulk_send(
    app_handle: AppHandle,
    state: tauri::State<'_, AppState>,
    client_ids: Vec<i64>,
    template: String,
    language: String,
    variables_count: u32,
) -> Result<(), AppError> {
    // 1. Fetch credentials from DB
    let (encrypted_data, nonce, db_template, engine) = {
        let db = state.db.lock().map_err(|_| AppError::Db("Mutex poisoned".to_string()))?;
        let mut stmt = db.prepare("SELECT encrypted_token, nonce, template_name, engine FROM app_config WHERE id = 1")?;
        let mut rows = stmt.query([])?;
        
        if let Some(row) = rows.next()? {
            let encrypted_data: Vec<u8> = row.get(0)?;
            let nonce: Vec<u8> = row.get(1)?;
            let template_name: String = row.get(2)?;
            let engine: String = row.get(3)?;
            (encrypted_data, nonce, template_name, engine)
        } else {
            return Err(AppError::Validation("No credentials found. Please run setup.".into()));
        }
    };

    let template_name = if template.is_empty() { db_template } else { template };

    let key = derive_machine_key(&state.app_data_dir);
    let creds_json = decrypt(&encrypted_data, &nonce, &key)?;
    let creds: ConfigCredentials = serde_json::from_str(&creds_json)
        .map_err(|_| AppError::Crypto("Failed to parse decrypted credentials".into()))?;

    let meta_client = Arc::new(MetaApiClient::new(creds.token, creds.phone_id, template_name.clone(), language.clone()));
    let engine_clone = engine.clone();

    // Fetch local template body if unofficial
    let mut local_template_body = String::new();
    if engine == "unofficial" {
        let db = state.db.lock().map_err(|_| AppError::Db("Mutex poisoned".to_string()))?;
        let mut stmt = db.prepare("SELECT components_json FROM local_templates WHERE name = ?1")?;
        let mut rows = stmt.query([&template_name])?;
        if let Some(row) = rows.next()? {
            let json_str: String = row.get(0)?;
            let components: Vec<serde_json::Value> = serde_json::from_str(&json_str).unwrap_or_default();
            
            let mut header_str = String::new();
            let mut body_str = String::new();
            let mut footer_str = String::new();

            for c in components {
                if c["type"] == "HEADER" {
                    if let Some(text) = c["text"].as_str() {
                        header_str = format!("*{text}*\n\n");
                    }
                } else if c["type"] == "BODY" {
                    if let Some(text) = c["text"].as_str() {
                        body_str = text.to_string();
                    }
                } else if c["type"] == "FOOTER" {
                    if let Some(text) = c["text"].as_str() {
                        footer_str = format!("\n\n_{text}_");
                    }
                }
            }
            local_template_body = format!("{}{}{}", header_str, body_str, footer_str);
        }
    }
    
    let sidecar_port = if engine == "unofficial" {
        *state.sidecar.port.lock().unwrap()
    } else {
        None
    };

    // 2. Fetch clients
    let mut clients = Vec::new();
    {
        let db = state.db.lock().map_err(|_| AppError::Db("Mutex poisoned".to_string()))?;
        for chunk in client_ids.chunks(100) {
            let placeholders = chunk.iter().map(|_| "?").collect::<Vec<_>>().join(",");
            let sql = format!("SELECT id, phone_number, name, code, debt FROM clients WHERE id IN ({})", placeholders);
            let mut stmt = db.prepare(&sql)?;
            let params = rusqlite::params_from_iter(chunk.iter());
            let mut rows = stmt.query(params)?;
            while let Some(row) = rows.next()? {
                clients.push(ClientData {
                    id: row.get(0)?,
                    phone_number: row.get(1)?,
                    name: row.get(2)?,
                    code: row.get(3)?,
                    debt: row.get(4)?,
                });
            }
        }
    }

    let total = clients.len() as u32;
    if total == 0 {
        return Ok(());
    }

    // Reset cancel flag
    let _ = state.cancel_tx.send(false);
    let mut cancel_rx = state.cancel_tx.subscribe();

    spawn(async move {
        let mut sent = 0;
        let mut failed = 0;

        for client in clients {
            if *cancel_rx.borrow_and_update() {
                break;
            }

            // Prepare params (greeting, name, code, debt)
            let hour = Local::now().hour();
            let spintax_template = if (5..12).contains(&hour) {
                "{¡Buenos días!|¡Hola, muy buenos días!|¡Excelente día!}"
            } else if (12..19).contains(&hour) {
                "{¡Buenas tardes!|¡Hola, muy buenas tardes!|¡Excelente tarde!}"
            } else {
                "{¡Buenas noches!|¡Hola, muy buenas noches!|¡Saludos en esta noche!}"
            };
            let greeting = parse_spintax(spintax_template);
            let debt_str = format!("{:.2}", client.debt);
            let params = if template_name == "hello_world" || variables_count == 0 {
                vec![]
            } else {
                let mut all_params = vec![greeting, client.name.clone(), client.code.clone(), debt_str];
                all_params.truncate(variables_count as usize);
                all_params
            };

            let result = if engine_clone == "unofficial" {
                if let Some(port) = sidecar_port {
                    let mut text = local_template_body.clone();
                    for (i, p) in params.iter().enumerate() {
                        text = text.replace(&format!("{{{{{}}}}}", i + 1), p);
                    }
                    
                    let client_req = reqwest::Client::new();
                    let res = client_req.post(format!("http://127.0.0.1:{}/send", port))
                        .json(&serde_json::json!({
                            "phone": client.phone_number,
                            "text": text
                        }))
                        .send()
                        .await;
                        
                    match res {
                        Ok(r) if r.status().is_success() => Ok(crate::services::meta_api::WaResponse {
                            messaging_product: "whatsapp".to_string(),
                            messages: vec![crate::services::meta_api::WaMessageId { id: format!("sc-{}", uuid::Uuid::new_v4()) }],
                        }),
                        Ok(r) => Err(AppError::Api(format!("Sidecar error: {}", r.status()))),
                        Err(e) => Err(AppError::Api(format!("Sidecar req error: {}", e))),
                    }
                } else {
                    Err(AppError::Api("Sidecar port not found. Is sidecar running?".to_string()))
                }
            } else {
                meta_client.send_template_message(&client.phone_number, params).await
            };
            
            let mut wa_msg_id = None;
            let mut status_str = "failed";
            let mut http_status = None;
            let mut error_detail = None;
            let mut should_halt = false;

            match result {
                Ok(resp) => {
                    sent += 1;
                    status_str = "sent";
                    http_status = Some(200);
                    if let Some(msg) = resp.messages.first() {
                        wa_msg_id = Some(msg.id.clone());
                    }
                }
                Err(e) => {
                    failed += 1;
                    error_detail = Some(e.to_string());
                    // 401 halt
                    if let AppError::Api(ref msg) = e {
                        if msg == "TokenExpired" {
                            should_halt = true;
                        }
                    }
                }
            }

            // Insert log
            let app_state = app_handle.state::<AppState>();
            if let Ok(db) = app_state.db.lock() {
                let _ = db.execute(
                    "INSERT INTO message_logs (client_id, wa_message_id, status, http_status, error_detail, template_used, sent_at)
                     VALUES (?1, ?2, ?3, ?4, ?5, ?6, CURRENT_TIMESTAMP)",
                    rusqlite::params![
                        client.id,
                        wa_msg_id,
                        status_str,
                        http_status,
                        error_detail,
                        template_name,
                    ],
                );
                
                if status_str == "sent" {
                    let _ = db.execute(
                        "UPDATE clients SET last_sent = CURRENT_TIMESTAMP WHERE id = ?1",
                        rusqlite::params![client.id],
                    );
                }
            }

            let _ = app_handle.emit(
                "bulk-send-progress",
                BulkSendProgressEvent {
                    sent,
                    failed,
                    total,
                    latest_log: LatestLog {
                        phone_number: client.phone_number.clone(),
                        status: status_str.to_string(),
                        error_detail: error_detail.clone(),
                    },
                },
            );

            if should_halt {
                let _ = app_handle.emit("bulk-send-halted", "TokenExpired");
                let _ = app_state.cancel_tx.send(true);
                break;
            }

            // Human Behavior: Random delay between 3 and 8 seconds for unofficial engine
            if engine_clone == "unofficial" && (sent + failed) < total {
                use rand::Rng;
                let delay = rand::thread_rng().gen_range(3..=8);
                tokio::time::sleep(tokio::time::Duration::from_secs(delay)).await;
            }
        }
    });

    Ok(())
}

#[tauri::command]
pub fn cancel_bulk_send(state: tauri::State<'_, AppState>) -> Result<(), AppError> {
    let _ = state.cancel_tx.send(true);
    Ok(())
}
