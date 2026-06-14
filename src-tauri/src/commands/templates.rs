use crate::error::AppError;
use crate::state::AppState;
use crate::commands::config::get_credentials_impl;
use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct TemplateComponent {
    #[serde(rename = "type")]
    pub component_type: String,
    pub text: Option<String>,
    pub format: Option<String>,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct TemplateItem {
    pub id: String,
    pub name: String,
    pub language: String,
    pub status: String,
    pub category: String,
    pub components: Vec<TemplateComponent>,
}

#[derive(Serialize, Deserialize, Debug)]
struct MetaTemplatesResponse {
    data: Vec<TemplateItem>,
}

#[tauri::command]
pub async fn get_meta_templates(state: tauri::State<'_, AppState>) -> Result<Vec<TemplateItem>, AppError> {
    let creds_opt = {
        let db = state.db.lock().map_err(|_| AppError::Db("Mutex poisoned".to_string()))?;
        get_credentials_impl(&db, &state.app_data_dir)?
    };

    let creds = creds_opt.ok_or_else(|| AppError::Api("Credentials not configured".to_string()))?;
    
    if creds.waba_id.is_empty() {
        return Err(AppError::Api("WABA ID is not configured".to_string()));
    }

    let url = format!("https://graph.facebook.com/v20.0/{}/message_templates?fields=name,status,category,language,components&limit=100", creds.waba_id);
    let client = reqwest::Client::new();
    
    let res = client
        .get(&url)
        .bearer_auth(&creds.token)
        .send()
        .await
        .map_err(|e| AppError::Api(format!("Network error: {}", e)))?;

    if !res.status().is_success() {
        let status = res.status();
        let body = res.text().await.unwrap_or_default();
        return Err(AppError::Api(format!("Meta API Error ({}): {}", status, body)));
    }
    
    let response: MetaTemplatesResponse = res.json().await
        .map_err(|e| AppError::Api(format!("Failed to parse templates: {}", e)))?;
        
    Ok(response.data)
}

#[derive(Serialize, Deserialize)]
struct CreateTemplateExample {
    body_text: Vec<Vec<String>>,
}

#[derive(Serialize, Deserialize)]
struct CreateTemplateComponent {
    #[serde(rename = "type")]
    component_type: String,
    text: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    format: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    example: Option<CreateTemplateExample>,
}

#[derive(Serialize, Deserialize)]
struct CreateTemplateRequest {
    name: String,
    category: String,
    language: String,
    components: Vec<CreateTemplateComponent>,
}

#[tauri::command]
pub async fn create_meta_template(
    state: tauri::State<'_, AppState>,
    name: String,
    header: Option<String>,
    body: String,
    footer: Option<String>,
    category: String,
    language: String,
) -> Result<(), AppError> {
    let creds_opt = {
        let db = state.db.lock().map_err(|_| AppError::Db("Mutex poisoned".to_string()))?;
        get_credentials_impl(&db, &state.app_data_dir)?
    };
    let creds = creds_opt.ok_or_else(|| AppError::Api("Credentials not configured".to_string()))?;
    if creds.waba_id.is_empty() {
        return Err(AppError::Api("WABA ID is not configured".to_string()));
    }

    // Auto-detect variables {{1}}, {{2}} to construct Meta example requirement
    let mut max_var = 0;
    for i in 1..=10 {
        if body.contains(&format!("{{{{{}}}}}", i)) {
            max_var = i;
        }
    }

    let example = if max_var > 0 {
        let mut examples = Vec::new();
        for i in 1..=max_var {
            examples.push(format!("Ejemplo{}", i));
        }
        Some(CreateTemplateExample {
            body_text: vec![examples],
        })
    } else {
        None
    };

    let mut components = Vec::new();

    if let Some(h) = header {
        let h = h.trim();
        if !h.is_empty() {
            components.push(CreateTemplateComponent {
                component_type: "HEADER".to_string(),
                format: Some("TEXT".to_string()),
                text: h.to_string(),
                example: None,
            });
        }
    }

    components.push(CreateTemplateComponent {
        component_type: "BODY".to_string(),
        format: None,
        text: body.to_string(),
        example,
    });

    if let Some(f) = footer {
        let f = f.trim();
        if !f.is_empty() {
            components.push(CreateTemplateComponent {
                component_type: "FOOTER".to_string(),
                format: None,
                text: f.to_string(),
                example: None,
            });
        }
    }

    let req_body = CreateTemplateRequest {
        name: name.to_string(),
        category: category.to_uppercase(),
        language: language.to_string(),
        components,
    };

    let url = format!("https://graph.facebook.com/v20.0/{}/message_templates", creds.waba_id);
    let client = reqwest::Client::new();
    let res = client
        .post(&url)
        .bearer_auth(&creds.token)
        .json(&req_body)
        .send()
        .await
        .map_err(|e| AppError::Api(format!("Network error: {}", e)))?;

    if !res.status().is_success() {
        let status = res.status();
        let error_body = res.text().await.unwrap_or_default();
        return Err(AppError::Api(format!("Meta API Error ({}): {}", status, error_body)));
    }

    Ok(())
}

#[tauri::command]
pub fn get_local_templates(state: tauri::State<'_, AppState>) -> Result<Vec<TemplateItem>, AppError> {
    let db = state.db.lock().map_err(|_| AppError::Db("Mutex poisoned".to_string()))?;
    let mut stmt = db.prepare("SELECT id, name, language, status, category, components_json FROM local_templates")?;
    let mut rows = stmt.query([])?;
    let mut templates = Vec::new();

    while let Some(row) = rows.next()? {
        let id: String = row.get(0)?;
        let name: String = row.get(1)?;
        let language: String = row.get(2)?;
        let status: String = row.get(3)?;
        let category: String = row.get(4)?;
        let components_json: String = row.get(5)?;
        
        let components: Vec<TemplateComponent> = serde_json::from_str(&components_json).unwrap_or_default();
        
        templates.push(TemplateItem {
            id,
            name,
            language,
            status,
            category,
            components,
        });
    }
    
    Ok(templates)
}

#[tauri::command]
pub fn create_local_template(
    state: tauri::State<'_, AppState>,
    name: String,
    header: Option<String>,
    body: String,
    footer: Option<String>,
    category: String,
    language: String,
) -> Result<(), AppError> {
    let db = state.db.lock().map_err(|_| AppError::Db("Mutex poisoned".to_string()))?;
    
    let mut components = Vec::new();
    if let Some(h) = header {
        let h = h.trim();
        if !h.is_empty() {
            components.push(TemplateComponent {
                component_type: "HEADER".to_string(),
                format: Some("TEXT".to_string()),
                text: Some(h.to_string()),
            });
        }
    }
    components.push(TemplateComponent {
        component_type: "BODY".to_string(),
        format: None,
        text: Some(body),
    });
    if let Some(f) = footer {
        let f = f.trim();
        if !f.is_empty() {
            components.push(TemplateComponent {
                component_type: "FOOTER".to_string(),
                format: None,
                text: Some(f.to_string()),
            });
        }
    }
    
    let components_json = serde_json::to_string(&components).unwrap_or_default();
    let id = uuid::Uuid::new_v4().to_string();
    
    db.execute(
        "INSERT INTO local_templates (id, name, language, status, category, components_json)
         VALUES (?1, ?2, ?3, 'APPROVED', ?4, ?5)",
        rusqlite::params![id, name, language, category, components_json],
    ).map_err(|e| AppError::Db(e.to_string()))?;
    
    Ok(())
}
