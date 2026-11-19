//! The Are.na personal access token, kept in **Windows Credential Manager**
//! (ADR-0004, ADR-0023). Never in `lemuse.toml`, the catalog, logs, the
//! clipboard or the repo.
//!
//! - One generic credential, target [`ARENA_TARGET`], stored for this PC only
//!   (`CRED_PERSIST_LOCAL_MACHINE`: it doesn't roam with a domain profile).
//! - Its user name holds the Are.na account slug, so Settings can say whose
//!   token it is without a network call. The slug is not secret.
//! - The token is read only to build the HTTP client, which sends it to
//!   `https://api.are.na` and nowhere else (`connectors::http::is_arena_api`).
//! - Errors never include the token.

use serde::Serialize;

use crate::{Error, Result};

/// The Credential Manager entry (Control Panel → Credential Manager →
/// Windows Credentials → Generic Credentials).
pub const ARENA_TARGET: &str = "LeMuse/api.are.na";

/// Shortest and longest token we accept. Are.na doesn't publish a format;
/// anything shorter than this is a paste mistake, and Credential Manager
/// holds at most 2,560 bytes.
pub const MIN_TOKEN_LEN: usize = 16;
pub const MAX_TOKEN_LEN: usize = 512;

/// What Settings and `lemuse arena-token status` may show. Never the token.
#[derive(Debug, Clone, Default, PartialEq, Eq, Serialize)]
pub struct TokenStatus {
    /// A token is saved on this PC.
    pub saved: bool,
    /// The Are.na account it belongs to, as checked when it was saved.
    pub account: Option<String>,
}

/// A pasted token, cleaned: surrounding whitespace and an optional
/// `Bearer ` prefix removed. Refuses anything that isn't one run of
/// printable ASCII, so a token can't smuggle a header line or a newline.
pub fn clean_token(raw: &str) -> Result<String> {
    let t = raw.trim();
    let t = t
        .strip_prefix("Bearer ")
        .or_else(|| t.strip_prefix("bearer "))
        .unwrap_or(t)
        .trim();
    let refuse = |why: &str| {
        Err(Error::Token(format!(
            "That doesn't look like an Are.na token: {why}."
        )))
    };
    if t.is_empty() {
        return refuse("it's empty");
    }
    if t.len() < MIN_TOKEN_LEN {
        return refuse("it's too short");
    }
    if t.len() > MAX_TOKEN_LEN {
        return refuse("it's too long");
    }
    if !t.bytes().all(|b| b.is_ascii_graphic()) {
        return refuse("it has spaces or unusual characters");
    }
    Ok(t.to_string())
}

/// The saved token, if any.
pub fn arena_token() -> Result<Option<String>> {
    match os::read(ARENA_TARGET).map_err(vault_error)? {
        None => Ok(None),
        Some((_, blob)) => match String::from_utf8(blob) {
            Ok(t) if clean_token(&t).is_ok() => Ok(Some(t)),
            _ => Err(Error::Token(
                "The saved Are.na token can't be read. Remove it in Settings and paste it again."
                    .into(),
            )),
        },
    }
}

/// Whether a token is saved, and for which account. Doesn't touch the network.
pub fn arena_status() -> Result<TokenStatus> {
    Ok(match os::read(ARENA_TARGET).map_err(vault_error)? {
        None => TokenStatus::default(),
        Some((account, _)) => TokenStatus {
            saved: true,
            account: Some(account).filter(|a| !a.is_empty()),
        },
    })
}

/// Save `token` (already checked with Are.na) for `account`, replacing any
/// earlier one.
pub fn set_arena_token(token: &str, account: &str) -> Result<()> {
    let token = clean_token(token)?;
    let account: String = account
        .chars()
        .filter(|c| !c.is_control())
        .take(100)
        .collect();
    os::write(ARENA_TARGET, &account, token.as_bytes()).map_err(vault_error)
}

/// Remove the saved token. `false` if there was none.
pub fn clear_arena_token() -> Result<bool> {
    os::delete(ARENA_TARGET).map_err(vault_error)
}

fn vault_error(e: std::io::Error) -> Error {
    Error::Token(format!("Windows Credential Manager: {e}."))
}

/// Read one line from the terminal without echoing it (Windows console), so
/// a pasted token doesn't stay on screen. Piped input is read as is.
pub fn read_secret_line() -> std::io::Result<String> {
    let _echo = os::EchoOff::new();
    let mut line = String::new();
    std::io::stdin().read_line(&mut line)?;
    Ok(line)
}

#[cfg(windows)]
mod os {
    use std::io;
    use std::ptr::null_mut;

    use windows_sys::Win32::Foundation::{
        GetLastError, ERROR_NOT_FOUND, HANDLE, INVALID_HANDLE_VALUE,
    };
    use windows_sys::Win32::Security::Credentials::{
        CredDeleteW, CredFree, CredReadW, CredWriteW, CREDENTIALW, CRED_PERSIST_LOCAL_MACHINE,
        CRED_TYPE_GENERIC,
    };
    use windows_sys::Win32::System::Console::{
        GetConsoleMode, GetStdHandle, SetConsoleMode, CONSOLE_MODE, ENABLE_ECHO_INPUT,
        STD_INPUT_HANDLE,
    };

    const COMMENT: &str =
        "LeMuse: your Are.na personal access token (read only). Remove it in LeMuse Settings.";

    fn wide(s: &str) -> Vec<u16> {
        s.encode_utf16().chain(Some(0)).collect()
    }

    /// A NUL-terminated wide string from Windows, capped so a bad pointer
    /// can't run away.
    ///
    /// # Safety
    /// `p` is null or points to a NUL-terminated UTF-16 string.
    unsafe fn from_wide(p: *const u16) -> String {
        if p.is_null() {
            return String::new();
        }
        let mut n = 0;
        while n < 1024 && *p.add(n) != 0 {
            n += 1;
        }
        String::from_utf16_lossy(std::slice::from_raw_parts(p, n))
    }

    pub fn write(target: &str, user: &str, secret: &[u8]) -> io::Result<()> {
        let mut target = wide(target);
        let mut user = wide(user);
        let mut comment = wide(COMMENT);
        let mut blob = secret.to_vec();
        let cred = CREDENTIALW {
            Type: CRED_TYPE_GENERIC,
            TargetName: target.as_mut_ptr(),
            Comment: comment.as_mut_ptr(),
            CredentialBlobSize: blob.len() as u32,
            CredentialBlob: blob.as_mut_ptr(),
            Persist: CRED_PERSIST_LOCAL_MACHINE,
            UserName: user.as_mut_ptr(),
            ..Default::default()
        };
        // SAFETY: every pointer in `cred` points into a live local buffer.
        let ok = unsafe { CredWriteW(&cred, 0) };
        let err = io::Error::last_os_error();
        blob.fill(0);
        if ok == 0 {
            Err(err)
        } else {
            Ok(())
        }
    }

    pub fn read(target: &str) -> io::Result<Option<(String, Vec<u8>)>> {
        let target = wide(target);
        let mut p: *mut CREDENTIALW = null_mut();
        // SAFETY: `target` is NUL-terminated; `p` receives a buffer we free below.
        let ok = unsafe { CredReadW(target.as_ptr(), CRED_TYPE_GENERIC, 0, &mut p) };
        if ok == 0 {
            // SAFETY: plain FFI call.
            let code = unsafe { GetLastError() };
            if code == ERROR_NOT_FOUND {
                return Ok(None);
            }
            return Err(io::Error::from_raw_os_error(code as i32));
        }
        // SAFETY: CredReadW succeeded, so `p` is a valid CREDENTIALW until CredFree.
        let out = unsafe {
            let c = &*p;
            let blob = if c.CredentialBlob.is_null() || c.CredentialBlobSize == 0 {
                Vec::new()
            } else {
                std::slice::from_raw_parts(c.CredentialBlob, c.CredentialBlobSize as usize).to_vec()
            };
            (from_wide(c.UserName), blob)
        };
        // SAFETY: `p` came from CredReadW and is freed once.
        unsafe { CredFree(p as *const core::ffi::c_void) };
        Ok(Some(out))
    }

    pub fn delete(target: &str) -> io::Result<bool> {
        let target = wide(target);
        // SAFETY: `target` is NUL-terminated.
        let ok = unsafe { CredDeleteW(target.as_ptr(), CRED_TYPE_GENERIC, 0) };
        if ok != 0 {
            return Ok(true);
        }
        // SAFETY: plain FFI call.
        let code = unsafe { GetLastError() };
        if code == ERROR_NOT_FOUND {
            Ok(false)
        } else {
            Err(io::Error::from_raw_os_error(code as i32))
        }
    }

    /// Turns console echo off while alive; restores the old mode on drop.
    /// Does nothing when input isn't a console (a pipe).
    pub struct EchoOff(Option<(HANDLE, CONSOLE_MODE)>);

    impl EchoOff {
        pub fn new() -> Self {
            // SAFETY: plain FFI calls on the process's own stdin handle.
            unsafe {
                let h = GetStdHandle(STD_INPUT_HANDLE);
                let mut mode: CONSOLE_MODE = 0;
                if h.is_null() || h == INVALID_HANDLE_VALUE || GetConsoleMode(h, &mut mode) == 0 {
                    return Self(None);
                }
                if SetConsoleMode(h, mode & !ENABLE_ECHO_INPUT) == 0 {
                    return Self(None);
                }
                Self(Some((h, mode)))
            }
        }
    }

    impl Drop for EchoOff {
        fn drop(&mut self) {
            if let Some((h, mode)) = self.0 {
                // SAFETY: restores the mode read in `new` on the same handle.
                unsafe { SetConsoleMode(h, mode) };
            }
        }
    }
}

/// Other systems: LeMuse is a Windows app (ADR-0001); there is no vault, so
/// nothing is saved and everything runs as a guest.
#[cfg(not(windows))]
mod os {
    use std::io;

    pub fn write(_: &str, _: &str, _: &[u8]) -> io::Result<()> {
        Err(io::Error::new(
            io::ErrorKind::Unsupported,
            "saving the Are.na token needs Windows Credential Manager",
        ))
    }
    pub fn read(_: &str) -> io::Result<Option<(String, Vec<u8>)>> {
        Ok(None)
    }
    pub fn delete(_: &str) -> io::Result<bool> {
        Ok(false)
    }
    pub struct EchoOff;
    impl EchoOff {
        pub fn new() -> Self {
            Self
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn tokens_are_cleaned_and_checked() {
        let t = "abcdefghijklmnopqrstuvwxyz0123456789_-";
        assert_eq!(clean_token(&format!("  {t}\r\n")).unwrap(), t);
        assert_eq!(clean_token(&format!("Bearer {t}")).unwrap(), t);
        for bad in [
            "",
            "   ",
            "short",
            "has a space in the middle of it",
            "line\nbreak-0123456789abcdef",
            "tab\t0123456789abcdefghij",
            "ünïcödé-0123456789abcdef",
        ] {
            assert!(clean_token(bad).is_err(), "{bad:?}");
        }
        assert!(clean_token(&"a".repeat(MAX_TOKEN_LEN + 1)).is_err());
        // The message never repeats what was pasted.
        let e = clean_token("secret with spaces 0123456789")
            .unwrap_err()
            .to_string();
        assert!(!e.contains("secret"), "{e}");
    }

    /// Writes, reads and deletes a throwaway entry in the real Credential
    /// Manager. Ignored by default so `cargo test` never touches the vault;
    /// run with `cargo test -p lemuse-core credentials -- --ignored`.
    #[cfg(windows)]
    #[test]
    #[ignore]
    fn credential_manager_round_trip() {
        let mut r = [0u8; 8];
        getrandom::getrandom(&mut r).unwrap();
        let target = format!("LeMuse/test/{}", hex::encode(r));
        assert_eq!(os::read(&target).unwrap(), None);
        os::write(&target, "someone", b"test-value-not-a-token").unwrap();
        assert_eq!(
            os::read(&target).unwrap(),
            Some(("someone".to_string(), b"test-value-not-a-token".to_vec()))
        );
        os::write(&target, "other", b"second-value").unwrap();
        assert_eq!(os::read(&target).unwrap().unwrap().0, "other");
        assert!(os::delete(&target).unwrap());
        assert!(!os::delete(&target).unwrap());
        assert_eq!(os::read(&target).unwrap(), None);
    }
}
