use std::path::PathBuf;

/// Crate-wide error type. Front-ends map these to user-facing messages.
#[derive(Debug, thiserror::Error)]
pub enum Error {
    #[error("I/O error at {path}: {source}")]
    Io {
        path: PathBuf,
        #[source]
        source: std::io::Error,
    },

    #[error("catalog error: {0}")]
    Catalog(#[from] rusqlite::Error),

    #[error("invalid config: {0}")]
    Config(String),

    #[error("another sync is already running (lock held at {0})")]
    SyncLocked(PathBuf),

    #[error("{connector}: rate limited, retry after {retry_after_secs}s")]
    RateLimited {
        connector: String,
        retry_after_secs: u64,
    },

    #[error("{connector}: {message}")]
    Connector { connector: String, message: String },

    /// A network failure or a 5xx answer: worth retrying (review 0001 D-2).
    #[error("temporary problem reaching {connector}: {message}")]
    Transient { connector: String, message: String },

    /// The Are.na token: a bad paste, a refusal, or Credential Manager
    /// trouble (ADR-0023). Never contains the token.
    #[error("{0}")]
    Token(String),

    #[error("not implemented yet: {0}")]
    NotImplemented(&'static str),
}

impl Error {
    pub fn io(path: impl Into<PathBuf>, source: std::io::Error) -> Self {
        Error::Io {
            path: path.into(),
            source,
        }
    }
}

pub type Result<T> = std::result::Result<T, Error>;
