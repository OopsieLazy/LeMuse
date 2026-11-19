use std::path::PathBuf;

/// Messages that say something doesn't exist ("no topic named …", "… no
/// longer exists", "Are.na doesn't have …").
fn is_not_found(m: &str) -> bool {
    let m = m.to_ascii_lowercase();
    m.starts_with("no topic")
        || m.starts_with("no playlist")
        || m.contains("no longer exists")
        || m.contains("no longer has")
        || m.contains("doesn't have")
        || m.contains("not found")
}

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

    #[error("{0}")]
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

/// Stable, machine-readable error codes (ADR-0024). Front-ends map them to
/// HTTP statuses, process exit codes and UI wording; the message is for
/// people. Codes are only ever added, never renamed.
pub mod code {
    /// Bad input or a bad `lemuse.toml` (a person can fix it).
    pub const INVALID: &str = "invalid";
    /// Something asked for doesn't exist (topic, playlist, channel, image).
    pub const NOT_FOUND: &str = "not_found";
    /// Another refresh holds the library lock.
    pub const BUSY: &str = "busy";
    /// A source asked us to slow down (HTTP 429).
    pub const RATE_LIMITED: &str = "rate_limited";
    /// A network failure or a 5xx from a source; worth retrying.
    pub const NETWORK: &str = "network";
    /// A source answered, but with a problem (private, removed, odd data).
    pub const SOURCE: &str = "source";
    /// The Are.na token: refused, unreadable, or Credential Manager trouble.
    pub const TOKEN: &str = "token";
    /// Reading or writing files in the library.
    pub const IO: &str = "io";
    /// The catalog database.
    pub const CATALOG: &str = "catalog";
    /// Not built yet.
    pub const UNSUPPORTED: &str = "unsupported";
}

impl Error {
    /// The stable code for this error (see [`code`]).
    pub fn code(&self) -> &'static str {
        match self {
            Error::Io { .. } => code::IO,
            Error::Catalog(_) => code::CATALOG,
            Error::Config(m) if is_not_found(m) => code::NOT_FOUND,
            Error::Config(_) => code::INVALID,
            Error::SyncLocked(_) => code::BUSY,
            Error::RateLimited { .. } => code::RATE_LIMITED,
            Error::Transient { .. } => code::NETWORK,
            Error::Connector { message, .. } if is_not_found(message) => code::NOT_FOUND,
            Error::Connector { .. } => code::SOURCE,
            Error::Token(_) => code::TOKEN,
            Error::NotImplemented(_) => code::UNSUPPORTED,
        }
    }

    pub fn io(path: impl Into<PathBuf>, source: std::io::Error) -> Self {
        Error::Io {
            path: path.into(),
            source,
        }
    }
}

pub type Result<T> = std::result::Result<T, Error>;

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn every_error_has_a_stable_code() {
        let conn = |m: &str| Error::Connector {
            connector: "arena".into(),
            message: m.into(),
        };
        let cases = [
            (Error::Config("no topic named `x`".into()), code::NOT_FOUND),
            (
                Error::Config("lemuse.toml: duplicate topic name".into()),
                code::INVALID,
            ),
            (Error::SyncLocked(PathBuf::from("x")), code::BUSY),
            (
                Error::RateLimited {
                    connector: "arena".into(),
                    retry_after_secs: 3,
                },
                code::RATE_LIMITED,
            ),
            (
                Error::Transient {
                    connector: "http".into(),
                    message: "timed out".into(),
                },
                code::NETWORK,
            ),
            (conn("Are.na no longer has that image."), code::NOT_FOUND),
            (conn("That channel is private."), code::SOURCE),
            (Error::Token("refused".into()), code::TOKEN),
            (Error::NotImplemented("x"), code::UNSUPPORTED),
        ];
        for (e, want) in cases {
            assert_eq!(e.code(), want, "{e}");
        }
    }
}
