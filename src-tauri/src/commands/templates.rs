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
