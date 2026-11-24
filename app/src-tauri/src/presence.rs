//! LeMuse on the desktop (owner, session 22; ADR-0033): a tray icon, opt-in
//! start with Windows, and opt-in "keep running in the tray when closed".
//!
//! Everything here runs in Rust; the page gets no tray or autostart
//! permission. The page asks through three commands (`presence_status`,
//! `set_autostart`, `set_close_to_tray`) and hears tray clicks as
//! `tray://action` events it already may listen to (`core:default`).
//!
//! Start with Windows writes one per-user value, never the machine-wide key:
//! `HKCU\Software\Microsoft\Windows\CurrentVersion\Run\LeMuse` =
//! `"<this LeMuse.exe>" --tray` (quoted, so folders with spaces work). If the
//! user turned it off in Task Manager (`StartupApproved\Run`, first byte odd),
//! it counts as off. A portable folder that moved is followed at launch: a
//! value pointing at an exe that no longer exists is re-pointed here.

use std::sync::atomic::{AtomicBool, Ordering};

use serde::Serialize;
use tauri::menu::{Menu, MenuItem, PredefinedMenuItem};
use tauri::tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent};
use tauri::{AppHandle, Emitter, Manager, Runtime};

/// Launched by the Run entry: start hidden in the tray.
pub const TRAY_ARG: &str = "--tray";
/// The Run value's name.
#[cfg_attr(not(windows), allow(dead_code))]
const VALUE: &str = "LeMuse";

/// Whether closing the window hides it to the tray (`ui.json` `closeToTray`).
#[derive(Default)]
pub struct CloseToTray(pub AtomicBool);

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PresenceStatus {
    /// Start with Windows is available (Windows only).
    pub available: bool,
    /// LeMuse starts with Windows (our Run value points here and isn't disabled).
    pub autostart: bool,
    /// The Run value points at another copy of LeMuse (an installed and a portable one).
    pub other_copy: bool,
    pub close_to_tray: bool,
}

/// Actions the tray menu sends to the page.
#[derive(Clone, Copy, Serialize)]
#[serde(rename_all = "camelCase")]
pub enum TrayAction {
    Next,
    PlayPause,
    Mini,
}

pub fn started_from_tray() -> bool {
    std::env::args().skip(1).any(|a| a == TRAY_ARG)
}

pub fn show_main<R: Runtime>(app: &AppHandle<R>) {
    if let Some(w) = app.get_webview_window("main") {
        let _ = w.unminimize();
        let _ = w.show();
        let _ = w.set_focus();
    }
}

fn toggle_main<R: Runtime>(app: &AppHandle<R>) {
    if let Some(w) = app.get_webview_window("main") {
        if w.is_visible().unwrap_or(false) && !w.is_minimized().unwrap_or(false) {
            let _ = w.hide();
        } else {
            show_main(app);
        }
    }
}

/// The tray icon and its menu. A left click shows or hides LeMuse; the menu
/// has show, next, play or pause, the mini player, refresh and quit.
pub fn build_tray<R: Runtime>(
    app: &AppHandle<R>,
    on_refresh: fn(&AppHandle<R>),
) -> tauri::Result<()> {
    let show = MenuItem::with_id(app, "show", "Show LeMuse", true, None::<&str>)?;
    let next = MenuItem::with_id(app, "next", "Next image", true, None::<&str>)?;
    let play = MenuItem::with_id(app, "play", "Play or pause", true, None::<&str>)?;
    let mini = MenuItem::with_id(app, "mini", "Mini player", true, None::<&str>)?;
    let refresh = MenuItem::with_id(app, "refresh", "Refresh now", true, None::<&str>)?;
    let quit = MenuItem::with_id(app, "quit", "Quit LeMuse", true, None::<&str>)?;
    let sep1 = PredefinedMenuItem::separator(app)?;
    let sep2 = PredefinedMenuItem::separator(app)?;
    let menu = Menu::with_items(
        app,
        &[&show, &sep1, &next, &play, &mini, &refresh, &sep2, &quit],
    )?;
    let mut tray = TrayIconBuilder::with_id("main")
        .tooltip("LeMuse")
        .menu(&menu)
        .show_menu_on_left_click(false)
        .on_menu_event(move |app, event| match event.id.as_ref() {
            "show" => show_main(app),
            "next" => send(app, TrayAction::Next),
            "play" => send(app, TrayAction::PlayPause),
            "mini" => {
                show_main(app);
                send(app, TrayAction::Mini);
            }
            "refresh" => on_refresh(app),
            "quit" => app.exit(0),
            _ => {}
        })
        .on_tray_icon_event(|tray, event| {
            if let TrayIconEvent::Click {
                button: MouseButton::Left,
                button_state: MouseButtonState::Up,
                ..
            } = event
            {
                toggle_main(tray.app_handle());
            }
        });
    if let Some(icon) = app.default_window_icon() {
        tray = tray.icon(icon.clone());
    }
    tray.build(app)?;
    Ok(())
}

fn send<R: Runtime>(app: &AppHandle<R>, action: TrayAction) {
    let _ = app.emit("tray://action", action);
}

pub fn close_to_tray<R: Runtime>(app: &AppHandle<R>) -> bool {
    app.try_state::<CloseToTray>()
        .is_some_and(|s| s.0.load(Ordering::SeqCst))
}

/// The saved `closeToTray` choice (opaque `ui.json`; anything but `true` is off).
pub fn saved_close_to_tray(settings: &serde_json::Value) -> bool {
    settings.get("closeToTray").and_then(|v| v.as_bool()) == Some(true)
}

/// The Run value for this exe: `"C:\…\LeMuse.exe" --tray`.
pub fn run_command(exe: &std::path::Path) -> String {
    format!("\"{}\" {TRAY_ARG}", exe.display())
}

/// The exe a Run value starts: the quoted part, or up to the first space.
pub fn exe_of(command: &str) -> Option<&str> {
    let c = command.trim();
    if let Some(rest) = c.strip_prefix('"') {
        rest.split('"').next().filter(|s| !s.is_empty())
    } else {
        c.split_whitespace().next()
    }
}

/// Task Manager's "Disabled" mark: StartupApproved data whose first byte is odd.
pub fn approved_disabled(data: &[u8]) -> bool {
    data.first().is_some_and(|b| b & 1 == 1)
}

fn same_path(a: &str, b: &std::path::Path) -> bool {
    // Windows paths are case-insensitive.
    a.eq_ignore_ascii_case(&b.display().to_string())
}

#[cfg(windows)]
mod reg {
    use winreg::enums::{HKEY_CURRENT_USER, KEY_READ, KEY_SET_VALUE};
    use winreg::RegKey;

    const RUN: &str = r"Software\Microsoft\Windows\CurrentVersion\Run";
    const APPROVED: &str =
        r"Software\Microsoft\Windows\CurrentVersion\Explorer\StartupApproved\Run";

    pub fn get(name: &str) -> Option<String> {
        RegKey::predef(HKEY_CURRENT_USER)
            .open_subkey_with_flags(RUN, KEY_READ)
            .ok()?
            .get_value::<String, _>(name)
            .ok()
    }

    pub fn set(name: &str, command: &str) -> std::io::Result<()> {
        let (key, _) = RegKey::predef(HKEY_CURRENT_USER).create_subkey(RUN)?;
        key.set_value(name, &command)?;
        // Turning it on here undoes a "Disabled" from Task Manager.
        if let Ok(approved) =
            RegKey::predef(HKEY_CURRENT_USER).open_subkey_with_flags(APPROVED, KEY_SET_VALUE)
        {
            let _ = approved.delete_value(name);
        }
        Ok(())
    }

    pub fn remove(name: &str) -> std::io::Result<()> {
        match RegKey::predef(HKEY_CURRENT_USER).open_subkey_with_flags(RUN, KEY_SET_VALUE) {
            Ok(key) => match key.delete_value(name) {
                Err(e) if e.kind() != std::io::ErrorKind::NotFound => Err(e),
                _ => Ok(()),
            },
            Err(e) if e.kind() == std::io::ErrorKind::NotFound => Ok(()),
            Err(e) => Err(e),
        }
    }

    pub fn approved(name: &str) -> Option<Vec<u8>> {
        RegKey::predef(HKEY_CURRENT_USER)
            .open_subkey_with_flags(APPROVED, KEY_READ)
            .ok()?
            .get_raw_value(name)
            .ok()
            .map(|v| v.bytes.into_owned())
    }
}

/// Start with Windows, as it stands now.
pub fn status(close: bool) -> PresenceStatus {
    #[cfg(windows)]
    {
        let exe = std::env::current_exe().ok();
        let value = reg::get(VALUE);
        let ours = match (&value, &exe) {
            (Some(v), Some(e)) => exe_of(v).is_some_and(|x| same_path(x, e)),
            _ => false,
        };
        let disabled = reg::approved(VALUE).is_some_and(|d| approved_disabled(&d));
        PresenceStatus {
            available: exe.is_some(),
            autostart: ours && !disabled,
            other_copy: value.is_some() && !ours,
            close_to_tray: close,
        }
    }
    #[cfg(not(windows))]
    PresenceStatus {
        available: false,
        autostart: false,
        other_copy: false,
        close_to_tray: close,
    }
}

/// Turn start with Windows on (for this exe) or off.
pub fn set_autostart(on: bool) -> std::io::Result<()> {
    #[cfg(windows)]
    {
        if on {
            let exe = std::env::current_exe()?;
            reg::set(VALUE, &run_command(&exe))
        } else {
            reg::remove(VALUE)
        }
    }
    #[cfg(not(windows))]
    {
        let _ = on;
        Err(std::io::Error::new(
            std::io::ErrorKind::Unsupported,
            "Windows only",
        ))
    }
}

/// At launch: a Run value whose exe is gone (a moved portable folder) is
/// pointed at this exe. A value for another copy that still exists is left
/// alone: that copy is the one the user chose.
pub fn heal_autostart() {
    #[cfg(windows)]
    {
        let (Some(value), Ok(exe)) = (reg::get(VALUE), std::env::current_exe()) else {
            return;
        };
        let Some(target) = exe_of(&value) else { return };
        if same_path(target, &exe) || std::path::Path::new(target).exists() {
            return;
        }
        let _ = reg::set(VALUE, &run_command(&exe));
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn run_command_is_quoted_with_the_tray_flag() {
        let c = run_command(std::path::Path::new(r"C:\Apps - ME!\LeMuse\LeMuse.exe"));
        assert_eq!(c, r#""C:\Apps - ME!\LeMuse\LeMuse.exe" --tray"#);
        assert_eq!(exe_of(&c), Some(r"C:\Apps - ME!\LeMuse\LeMuse.exe"));
    }

    #[test]
    fn exe_of_reads_unquoted_and_empty_values() {
        assert_eq!(
            exe_of(r"C:\LeMuse\LeMuse.exe --tray"),
            Some(r"C:\LeMuse\LeMuse.exe")
        );
        assert_eq!(exe_of(""), None);
        assert_eq!(exe_of(r#""""#), None);
    }

    #[test]
    fn task_manager_disabled_is_an_odd_first_byte() {
        assert!(approved_disabled(&[3, 0, 0]));
        assert!(!approved_disabled(&[2, 0, 0]));
        assert!(!approved_disabled(&[]));
    }

    #[test]
    fn close_to_tray_is_on_only_when_saved_true() {
        assert!(saved_close_to_tray(
            &serde_json::json!({ "closeToTray": true })
        ));
        assert!(!saved_close_to_tray(
            &serde_json::json!({ "closeToTray": "yes" })
        ));
        assert!(!saved_close_to_tray(&serde_json::json!({})));
    }
}
