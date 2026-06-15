use serde::{Deserialize, Serialize};
use chrono::{DateTime, Utc};
use tauri::State;
use rusqlite::OptionalExtension;

use crate::state::AppState;
use crate::error::AppError;

const EXPIRATION_DATE: &str = "2026-07-15T00:00:00Z";

#[derive(Serialize)]
pub struct LicenseStatus {
    pub is_valid: bool,
    pub reason: Option<String>,
}

#[derive(Deserialize)]
struct WorldTimeResponse {
    datetime: String,
}

#[tauri::command]
pub async fn check_license_status(state: State<'_, AppState>) -> Result<LicenseStatus, AppError> {
    // 1. Try to get current time from internet
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(3))
        .build()
        .unwrap_or_else(|_| reqwest::Client::new());

    let internet_time_res = client.get("http://worldtimeapi.org/api/timezone/Etc/UTC").send().await;
    
    let mut current_time: DateTime<Utc> = Utc::now();

    if let Ok(res) = internet_time_res {
        if let Ok(json) = res.json::<WorldTimeResponse>().await {
            if let Ok(dt) = json.datetime.parse::<DateTime<Utc>>() {
                current_time = dt;
            }
        }
    }

    // 2. Parse expiration date
    let exp_date = EXPIRATION_DATE.parse::<DateTime<Utc>>().unwrap();

    // 3. Check expiration
    if current_time > exp_date {
        return Ok(LicenseStatus {
            is_valid: false,
            reason: Some("EXPIRED".into()),
        });
    }

    // 4. Check anti-time-travel
    let conn = state.db.lock().unwrap();
    let last_run_str: Option<String> = conn.query_row(
        "SELECT last_run_time FROM license_state WHERE id = 1",
        [],
        |row| row.get(0)
    ).optional().unwrap_or(None);

    if let Some(last_run) = last_run_str {
        if let Ok(last_run_dt) = last_run.parse::<DateTime<Utc>>() {
            if current_time < last_run_dt {
                // Time travel detected!
                return Ok(LicenseStatus {
                    is_valid: false,
                    reason: Some("SYSTEM_CLOCK_ALTERED".into()),
                });
            }
        }
    }

    // 5. Update last_run_time
    conn.execute(
        "INSERT OR REPLACE INTO license_state (id, last_run_time) VALUES (1, ?1)",
        [current_time.to_rfc3339()],
    )?;

    Ok(LicenseStatus {
        is_valid: true,
        reason: None,
    })
}
