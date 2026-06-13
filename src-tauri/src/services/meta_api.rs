use crate::error::AppError;
use governor::{Quota, RateLimiter};
use governor::state::{InMemoryState, NotKeyed};
use governor::clock::DefaultClock;
use reqwest::Client;
use serde::Deserialize;
use serde_json::json;
use std::sync::Arc;
use std::time::Duration;
use tokio::time::sleep;
use std::num::NonZeroU32;

#[derive(Debug, Deserialize, PartialEq)]
pub struct WaResponse {
    pub messaging_product: String,
    pub messages: Vec<WaMessageId>,
}

#[derive(Debug, Deserialize, PartialEq)]
pub struct WaMessageId {
    pub id: String,
}

#[async_trait::async_trait]
pub trait HttpSender: Send + Sync {
    async fn post_json(&self, url: &str, token: &str, body: &serde_json::Value) -> Result<HttpResponse, AppError>;
}

pub struct HttpResponse {
    pub status: u16,
    pub retry_after: Option<u64>,
    pub body_json: String,
}

#[derive(Clone)]
pub struct ReqwestSender {
    client: Client,
}

impl ReqwestSender {
    pub fn new() -> Self {
        Self {
            client: Client::builder()
                .timeout(Duration::from_secs(10))
                .build()
                .expect("Failed to build reqwest client"),
        }
    }
}

#[async_trait::async_trait]
impl HttpSender for ReqwestSender {
    async fn post_json(&self, url: &str, token: &str, body: &serde_json::Value) -> Result<HttpResponse, AppError> {
        let response = self.client.post(url)
            .bearer_auth(token)
            .json(body)
            .send()
            .await
            .map_err(|e| {
                if e.is_timeout() || e.is_connect() {
                    AppError::Io(e.to_string()) // Map to IO for retry logic
                } else {
                    AppError::Api(e.to_string())
                }
            })?;
        
        let status = response.status().as_u16();
        let retry_after = response.headers().get(reqwest::header::RETRY_AFTER)
            .and_then(|h| h.to_str().ok())
            .and_then(|s| s.parse::<u64>().ok());
            
        let body_json = response.text().await.unwrap_or_default();
        
        Ok(HttpResponse { status, retry_after, body_json })
    }
}

#[derive(Clone)]
pub struct MetaApiClient {
    sender: Arc<dyn HttpSender>,
    token: String,
    phone_number_id: String,
    template_name: String,
    language: String,
    rate_limiter: Arc<RateLimiter<NotKeyed, InMemoryState, DefaultClock>>,
}

impl MetaApiClient {
    pub fn new(token: String, phone_number_id: String, template_name: String, language: String) -> Self {
        let quota = Quota::per_second(NonZeroU32::new(80).unwrap());
        let rate_limiter = Arc::new(RateLimiter::direct(quota));

        Self {
            sender: Arc::new(ReqwestSender::new()),
            token,
            phone_number_id,
            template_name,
            language,
            rate_limiter,
        }
    }

    #[cfg(test)]
    pub fn with_sender(sender: Arc<dyn HttpSender>, token: String, phone_number_id: String, template_name: String, language: String) -> Self {
        let quota = Quota::per_second(NonZeroU32::new(80).unwrap());
        let rate_limiter = Arc::new(RateLimiter::direct(quota));

        Self {
            sender,
            token,
            phone_number_id,
            template_name,
            language,
            rate_limiter,
        }
    }

    pub async fn send_template_message(&self, phone: &str, params: Vec<String>) -> Result<WaResponse, AppError> {
        let url = format!(
            "https://graph.facebook.com/v19.0/{}/messages",
            self.phone_number_id
        );

        let parameters: Vec<_> = params
            .into_iter()
            .map(|text| {
                json!({
                    "type": "text",
                    "text": text
                })
            })
            .collect();

        let body = json!({
            "messaging_product": "whatsapp",
            "to": phone,
            "type": "template",
            "template": {
                "name": &self.template_name,
                "language": {
                    "code": &self.language
                },
                "components": [
                    {
                        "type": "body",
                        "parameters": parameters
                    }
                ]
            }
        });

        let mut retries = 0;
        let max_retries = 3;
        let mut backoff_sec = 1;

        loop {
            self.rate_limiter.until_ready().await;

            let response_result = self.sender.post_json(&url, &self.token, &body).await;

            match response_result {
                Ok(response) => {
                    let status = response.status;
                    if (200..300).contains(&status) {
                        let wa_resp: WaResponse = serde_json::from_str(&response.body_json)
                            .map_err(|e| AppError::Api(format!("Failed to parse response: {}", e)))?;
                        return Ok(wa_resp);
                    } else if status == 401 || status == 403 {
                        return Err(AppError::Api("TokenExpired".into()));
                    } else if status == 429 {
                        if retries >= max_retries {
                            return Err(AppError::Api(format!("Max retries reached after 429: {}", status)));
                        }
                        let wait_time = response.retry_after.unwrap_or(backoff_sec);
                        sleep(Duration::from_secs(wait_time)).await;
                        retries += 1;
                        backoff_sec *= 2;
                        continue;
                    } else if (500..600).contains(&status) {
                        if retries >= max_retries {
                            return Err(AppError::Api(format!("Max retries reached after server error: {}", status)));
                        }
                        sleep(Duration::from_secs(backoff_sec)).await;
                        retries += 1;
                        backoff_sec *= 2;
                        continue;
                    } else {
                        return Err(AppError::Api(format!("HTTP Error {}: {}", status, response.body_json)));
                    }
                }
                Err(err) => {
                    if let AppError::Io(_) = err {
                        if retries >= max_retries {
                            return Err(AppError::Api(format!("Max retries reached after network error: {}", err)));
                        }
                        sleep(Duration::from_secs(backoff_sec)).await;
                        retries += 1;
                        backoff_sec *= 2;
                        continue;
                    } else {
                        return Err(err);
                    }
                }
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::sync::Mutex;

    struct MockSender {
        responses: Mutex<Vec<Result<HttpResponse, AppError>>>,
    }

    impl MockSender {
        fn new(responses: Vec<Result<HttpResponse, AppError>>) -> Self {
            Self {
                responses: Mutex::new(responses),
            }
        }
    }

    #[async_trait::async_trait]
    impl HttpSender for MockSender {
        async fn post_json(&self, _url: &str, _token: &str, _body: &serde_json::Value) -> Result<HttpResponse, AppError> {
            let mut resps = self.responses.lock().unwrap();
            resps.remove(0)
        }
    }

    #[tokio::test]
    async fn test_rate_limiter_retry_429() {
        let responses = vec![
            Ok(HttpResponse {
                status: 429,
                retry_after: Some(1),
                body_json: "".to_string(),
            }),
            Ok(HttpResponse {
                status: 200,
                retry_after: None,
                body_json: r#"{"messaging_product":"whatsapp","messages":[{"id":"wamid.123"}]}"#.to_string(),
            }),
        ];
        
        let sender = Arc::new(MockSender::new(responses));
        let client = MetaApiClient::with_sender(sender, "token".into(), "phone".into(), "template".into(), "es".into());

        let result = client.send_template_message("123", vec![]).await.unwrap();
        assert_eq!(result.messages[0].id, "wamid.123");
    }

    #[tokio::test]
    async fn test_retry_503_then_success() {
        let responses = vec![
            Ok(HttpResponse {
                status: 503,
                retry_after: None,
                body_json: "".to_string(),
            }),
            Ok(HttpResponse {
                status: 200,
                retry_after: None,
                body_json: r#"{"messaging_product":"whatsapp","messages":[{"id":"wamid.456"}]}"#.to_string(),
            }),
        ];
        
        let sender = Arc::new(MockSender::new(responses));
        let client = MetaApiClient::with_sender(sender, "token".into(), "phone".into(), "template".into(), "es".into());

        let result = client.send_template_message("123", vec![]).await.unwrap();
        assert_eq!(result.messages[0].id, "wamid.456");
    }

    #[tokio::test]
    async fn test_max_retries_exhausted() {
        let responses = vec![
            Ok(HttpResponse { status: 500, retry_after: None, body_json: "".to_string() }),
            Ok(HttpResponse { status: 500, retry_after: None, body_json: "".to_string() }),
            Ok(HttpResponse { status: 500, retry_after: None, body_json: "".to_string() }),
            Ok(HttpResponse { status: 500, retry_after: None, body_json: "".to_string() }),
        ];
        
        let sender = Arc::new(MockSender::new(responses));
        let client = MetaApiClient::with_sender(sender, "token".into(), "phone".into(), "template".into(), "es".into());

        let result = client.send_template_message("123", vec![]).await;
        assert!(result.is_err());
        if let Err(AppError::Api(msg)) = result {
            assert!(msg.contains("Max retries"));
        } else {
            panic!("Expected AppError::Api");
        }
    }
}
impl Default for ReqwestSender {
    fn default() -> Self {
        Self::new()
    }
}
