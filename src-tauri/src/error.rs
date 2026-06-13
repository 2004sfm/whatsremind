use std::fmt;

/// Application-level error type used across all modules.
#[derive(Debug)]
pub enum AppError {
    Db(String),
    Crypto(String),
    Api(String),
    Validation(String),
    Io(String),
}

impl fmt::Display for AppError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            AppError::Db(msg) => write!(f, "Database error: {}", msg),
            AppError::Crypto(msg) => write!(f, "Crypto error: {}", msg),
            AppError::Api(msg) => write!(f, "API error: {}", msg),
            AppError::Validation(msg) => write!(f, "Validation error: {}", msg),
            AppError::Io(msg) => write!(f, "IO error: {}", msg),
        }
    }
}

impl serde::Serialize for AppError {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        use serde::ser::SerializeStruct;
        let mut state = serializer.serialize_struct("AppError", 2)?;
        let (error_type, message) = match self {
            AppError::Db(msg) => ("Db", msg.as_str()),
            AppError::Crypto(msg) => ("Crypto", msg.as_str()),
            AppError::Api(msg) => ("Api", msg.as_str()),
            AppError::Validation(msg) => ("Validation", msg.as_str()),
            AppError::Io(msg) => ("Io", msg.as_str()),
        };
        state.serialize_field("type", error_type)?;
        state.serialize_field("message", message)?;
        state.end()
    }
}

impl From<rusqlite::Error> for AppError {
    fn from(e: rusqlite::Error) -> Self {
        AppError::Db(e.to_string())
    }
}

impl From<std::io::Error> for AppError {
    fn from(e: std::io::Error) -> Self {
        AppError::Io(e.to_string())
    }
}
