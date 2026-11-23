# What makes a Windows desktop app feel finished and integrated (2026), and what each costs in Tauri 2, for LeMuse

Research date: 2026-11-21. Pages were fetched on that date unless marked. Older material is tagged **[older: year]**.
Scope: Windows 10 and 11, unpackaged NSIS + portable build, unsigned (SHA256SUMS + attestation), Tauri 2 + Rust core + React/WebView2.
I don't repeat signing, SBOM, updater-key custody or privacy findings from `research_notes/LeMuse design and art review/enterprise_readiness.md`. I only reference them where they change an integration decision.
"Effort" is my estimate for a solo maker who already knows the codebase. It is an inference, not a sourced figure.

## 1. Shell presence: tray, start with Windows, notifications, deep links, jump lists

### Takeaway
A tray icon and "Start with Windows" are cheap, mature and official in Tauri 2, and they fit an ambient app well. Toast notifications work only for the installed build: the portable build shows PowerShell's name and icon, and Windows has no action buttons. Deep links are official but add attack surface for little gain. Jump lists have no Tauri plugin, so they need custom COM code that depends on AppUserModelID wiring. Skip them.

### Cited Findings
**Tray (`tray-icon` Cargo feature, core API, not a plugin)**
- You enable it with `tauri = { features = ["tray-icon"] }` and create the icon with `TrayIconBuilder::new().build(app)` (Rust) or `TrayIcon.new()` (JS). It can reuse the app icon via `app.default_window_icon()`. — [Tauri v2: System Tray](https://v2.tauri.app/learn/system-tray/)
- "By default the menu is displayed on both left and right clicks". `show_menu_on_left_click(false)` or `menuOnLeftClick: false` turns that off. Tray events cover click, double-click, enter, move and leave. — [Tauri v2: System Tray](https://v2.tauri.app/learn/system-tray/)
- Windows support for `menuOnLeftClick` arrived in Tauri 2.2.0. Double-click tray events are documented as "Windows Only". Tauri 2.6.1 fixed a regression where the JS API could no longer set tray menus and icons. — [Tauri 2.2.0 release](https://v2.tauri.app/de/release/tauri/v2.2.0/); [tauri 2.4.0 tray source](https://docs.rs/crate/tauri/2.4.0/source/src/tray/mod.rs); [Tauri 2.6.1 release](https://v2.tauri.app/release/tauri/v2.6.1)
- An older Windows regression that left a stale tray icon after exit was fixed **[older: 2022]**. — [tauri commit](https://www.github.com/tauri-apps/tauri/commit/f756cd5e7ecc86f178f8d602eded1e1b6ecb51f3)

**Start with Windows (`tauri-plugin-autostart`, official)**
- The plugin is official, desktop-only and needs Rust 1.90 or newer. `init(MacosLauncher, Some(args))` takes optional launch arguments. JS gets `enable`, `disable` and `isEnabled`. Permissions are `autostart:allow-enable`, `allow-disable` and `allow-is-enabled`, all three in the default set. — [Tauri v2: Autostart](https://v2.tauri.app/plugin/autostart/)
- The current version is 2.5.1. It uses the `auto-launch` crate, which on Windows writes `HKCU\SOFTWARE\Microsoft\Windows\CurrentVersion\Run`. — [docs.rs tauri-plugin-autostart](https://docs.rs/crate/tauri-plugin-autostart/latest); [lib.rs auto-launch](https://www.lib.rs/crates/auto-launch)
- Known reports:
  - an issue (v1-era) where the HKCU Run value disappeared after `enable()`, with no fix shown — [plugins-workspace #771 mirror](https://github-users.yhajoa.workers.dev/tauri-apps/plugins-workspace/issues/771)
  - a LocalSend report where an autostart launch lost its registered argument — [localsend #1293](https://fr.github.com/localsend/localsend/issues/1293)
- When a user disables a startup app in Task Manager or Settings, Windows leaves the Run value in place and records the state under `...\Explorer\StartupApproved\Run` (forum-sourced; Microsoft doesn't document the format). So "Run value exists" and "will launch" can disagree. — [Microsoft Q&A](https://learn.microsoft.com/en-us/answers/a/4712947); [Microsoft Support: Configure startup apps](https://support.microsoft.com/topic/3d219555-bc76-449d-ab89-0d2dd6307164)

**Toast notifications (`tauri-plugin-notification`, official)**
- Windows: "Only works for installed apps. Shows powershell name & icon in development." — [Tauri v2: Notification](https://v2.tauri.app/plugin/notification/)
- "The Actions API is only available on mobile platforms", so toasts on Windows can't have buttons. The default permission set "allows all notification related features" (`notification:allow-notify`, `allow-show`, and others). — [Tauri v2: Notification](https://v2.tauri.app/plugin/notification/)
- Microsoft's rule: a desktop app "cannot raise a toast" without a valid Start-menu shortcut that carries its AppUserModelID, and the same AUMID must be used when creating the notifier. Microsoft recommends doing this in the installer. — [Microsoft Learn: Enable desktop toast with AppUserModelID](https://msdn.microsoft.com/en-US/library/hh802762) **[older]**
- The underlying crate (`tauri-winrt-notification`) notes that without an AUMID, toasts "report its origin as powershell". — [docs.rs tauri-winrt-notification](https://docs.rs/crate/tauri-winrt-notification/0.7.1/source/src/lib.rs)
- Microsoft's winapp CLI guide lists Notifications among APIs that need or benefit from package identity. — [Microsoft Learn: winapp CLI with Tauri](https://learn.microsoft.com/en-us/windows/apps/dev-tools/winapp-cli/guides/tauri) (ms.date 2026-10-07)

**Deep links (`tauri-plugin-deep-link`, official)**
- Schemes are declared in `tauri.conf.json > plugins > deep-link > desktop > schemes`. They are registered "only... when your app is installed", or at runtime with `register()` on Windows and Linux. — [Tauri v2: Deep linking](https://v2.tauri.app/plugin/deep-linking/)
- On Windows a deep link arrives "as a command line argument to a new app process". To route it to the running instance, enable the `deep-link` feature on `tauri-plugin-single-instance` and register that plugin first. — [Tauri v2: Deep linking](https://v2.tauri.app/plugin/deep-linking/)
- Security: "The user could trigger a fake deep link manually by including the URL as argument", so validate the URL. `deep-link:default` allows only `get_current`. — [Tauri v2: Deep linking](https://v2.tauri.app/plugin/deep-linking/)

**Jump lists (no Tauri plugin; Win32 COM `ICustomDestinationList`)**
- The build sequence is `SetAppID` (if the app has an explicit AUMID), `BeginList`, `AppendCategory`/`AddUserTasks`, then `CommitList`. The AppID must be set before `BeginList`. The API is "Windows 7 [desktop apps only] and later". — [Microsoft Learn: ICustomDestinationList](https://learn.microsoft.com/windows/win32/api/shobjidl_core/nn-shobjidl_core-icustomdestinationlist)
- An app with an explicit AUMID must apply the same ID to its windows and processes, shortcuts and file associations. `SetCurrentProcessExplicitAppUserModelID` must run "before the application presents any UI". — [Microsoft Learn: AppUserModelIDs](https://learn.microsoft.com/windows/win32/shell/appids)
- I found no Tauri plugin or guide for jump lists. — (search: [jump list query results](https://learn.microsoft.com/windows/win32/shell/appids))

### Inferences
- **Tray: high value, low effort (about 1 day).** An ambient app that keeps running in the mini player benefits from a tray menu: Show, Pause/Play, Next, Mini player, Refresh, Quit. Then closing the main window can mean "keep playing". The cost is one Cargo feature and a menu. Remote text such as a topic name may appear in tray item labels; tray labels are native menu text, not HTML, so there is no injection risk there.
- **Start with Windows: medium value, low effort (half a day).** Make it opt-in and off by default, with a settings toggle. Pass a flag such as `--minimized` so autostart launches open in the tray instead of stealing focus. Read the state from `isEnabled()` rather than caching it. The portable build should hide the toggle or warn: a Run value pointing into a folder the user may move or delete leaves a dead entry. Capability: only `autostart:allow-enable`, `allow-disable` and `allow-is-enabled`, all in the default set.
- **Scheduled refresh vs autostart:** with autostart plus a tray, LeMuse refreshes on launch every logon. That may cover most of the planned Task Scheduler work for less effort and fewer moving parts. I did not research Task Scheduler (see Gaps).
- **Toasts: low value for LeMuse.** The only plausible events are "Refresh finished" and "update available". Both fit better as in-app status. Toasts also fail in the portable build and can't have actions on Windows. Defer.
- **Deep links: low value, non-zero risk.** A `lemuse://` scheme could let the Are.na site or the dashboard open a channel in the app. But every deep link is untrusted argv. Combined with `add-channel` it becomes a way to make the app add a channel without a click. If it is ever built, it should only pre-fill a confirmation dialog and must pass `arena::is_valid_slug`. Defer.
- **Jump lists: low value, medium effort.** They need custom `windows`-crate COM code plus AUMID consistency between the NSIS shortcut and the process. Both the jump list and toasts depend on that same consistency. Skip; the tray menu covers the same "quick actions" need.

### Gaps
- I did not confirm the exact Tauri core permission identifier for tray from JS (likely `core:tray:default`). The System Tray page doesn't mention capabilities. Check `app/src-tauri/capabilities` against the Tauri permissions reference.
- I did not confirm whether Tauri's NSIS template sets `System.AppUserModel.ID` on the Start-menu shortcut. The docs' "only works for installed apps" implies the installer does something that makes toasts work, but I didn't verify what.
- Task Scheduler (`schtasks` vs the COM Task Scheduler API from Rust, run-when-logged-off rules, the Credential Manager context of a scheduled task) wasn't researched in this pass.
- There is a community `tauri-plugin-notifications` (Choochmeque) that may add Windows actions. I didn't verify its features. — [GitHub](https://github.com/Choochmeque/tauri-plugin-notifications)

## 2. Hand-off to art tools: drag an image out, "Open with" Krita/Photoshop/Blender, file associations

### Takeaway
Drag-out is the most "integrated-feeling" feature for an art-reference app: drag the current reference straight into a Krita canvas, PureRef or Blender. It is feasible with the community `tauri-plugin-drag` (CrabNebula; v2.1.1, May 2026, about 40k downloads a month). It needs a file on disk, so it fits LeMuse's "only Save writes bytes" rule only if a drag is treated as an explicit save. "Open in…" is easy with the official opener plugin, but capabilities must scope the paths tightly. File associations add little for LeMuse.

### Cited Findings
- `drag-rs` / `tauri-plugin-drag` "start a drag operation out of a window" on macOS, Windows and Linux (GTK). It was tested with Tauri v2. JS usage is `startDrag({ item: ['/path/to/file'], icon: '/path/to/icon' })` with the `drag:default` permission. — [crabnebula-dev/drag-rs](https://github.com/crabnebula-dev/drag-rs)
- Maturity: 121 stars, 19 open issues, 6 open PRs; dual Apache-2.0/MIT. The README's Rust example still calls the v1-style `app.get_window`. — [crabnebula-dev/drag-rs](https://github.com/crabnebula-dev/drag-rs)
- `tauri-plugin-drag` 2.1.1 was released 2026-05-01 and gets about 40,500 downloads a month. — [lib.rs tauri-plugin-drag](https://lib.rs/crates/tauri-plugin-drag)
- Windows drag-and-drop conflict: with `dragDropEnabled` (default true), Tauri installs a native OLE drop handler that "captures and consumes drag events before the WebView can see them". HTML5 drag-and-drop then breaks: `dragover` and `drop` never fire. "It's impossible to use both APIs simultaneously" on Windows. Tauri's docs: "Disabling it is required to use HTML5 drag and drop on the frontend on Windows." — [wyhinton, 2026-01-14](https://wyhinton.github.io/2026/01/14/Tauri-DragAndDrop-Issues); [tauri commit adding the option](https://www.github.com/tauri-apps/tauri/commit/2db901e744f51cd4296ddec4352d7a51c859b85b)
- Opener plugin (official): `openPath(path, with?)` opens a file in the default app or in a named one (example `openPath('C:/path/to/file', 'vlc')`). The plugin also supports revealing a file in Explorer. — [Tauri v2: Opener](https://v2.tauri.app/plugin/opener/)
- Opener permissions:
  - `opener:allow-open-path` is **not** in the default set and takes glob path scopes, such as `$APPDATA/file`;
  - the default set includes `allow-open-url`, `allow-reveal-item-in-dir` and `allow-default-urls`.
  — [Tauri v2: Opener](https://v2.tauri.app/plugin/opener/)
- File associations: Tauri v2 apps declare `fileAssociations` in `tauri.conf.json` (Stirling-PDF example). The OS starts a new process with the file path as an argument, which `tauri-plugin-single-instance` forwards as `argv` to the running instance. A changelog fix stopped arguments containing `|` from being split. — [Stirling-PDF commit](https://git.laurivan.com/Mirrors/Stirling-PDF/commits/commit/827283d30a89bfc6e2b4f8d0d04882b2bd13bf8c/frontend/src/desktop); [single-instance changelog](https://v2.tauri.app/release/single-instance/all-versions/)

### Inferences
- **Drag-out: high value, medium effort (2–4 days including tests).**
  - Flow: on `dragstart` from the slide, Rust saves the original into the existing blobs CAS, the same path as Save, then calls `startDrag` with the `views/` hardlink path and a small icon.
  - This stays within ADR rules, because image bytes reach disk only through a user gesture. Record it in the ADR as "drag = save".
  - Pitfall: drag can't start until the original has downloaded, which may be several MB. Pre-fetching the original to make the drag instant would break "no images in caches". So start the drag only once the file exists, and show "Preparing…" until then.
  - Pitfall: LeMuse must keep `dragDropEnabled` in whatever state its own UI needs. If any HTML5 drag-and-drop exists in the playlist UI, the native drag-out has to be started from Rust on `mousedown` + move threshold, not from HTML5 `dragstart`. Prototype this first.
  - Capability: `drag:default`. Review what paths the command accepts; it should only accept paths under the library `objects/`/`views/`, which a Rust-side wrapper can enforce.
- **"Open in Krita/Photoshop/Blender": medium value, low effort (1 day).** Use "Open saved file" (default app) plus "Show in folder". A per-user "Open with app…" picker could store an exe path in settings and call `open_path(path, Some(exe))` from Rust. Keep `opener:allow-open-path` out of the WebView capability and do it in a Rust command that only accepts block IDs and resolves paths itself. The Windows "Open with" dialog (`SHOpenWithDialog`) is an alternative not covered by any plugin (see Gaps).
- **File associations: low value.** LeMuse isn't an image viewer, and registering for .jpg/.png would compete with the user's real viewer. A custom extension (e.g. a `.lemuse` playlist or backup file) might justify one later. Every associated launch is untrusted argv.

### Gaps
- I couldn't confirm which Windows API drag-rs uses (presumably OLE `DoDragDrop` with `CF_HDROP`). I also couldn't confirm whether Krita, PureRef and Blender accept a `CF_HDROP` drop from it. That needs a manual test.
- I didn't read drag-rs's 19 open issues for Windows-specific bugs.
- No source covered calling `SHOpenWithDialog` from Tauri.

## 3. Ambient surfaces: wallpaper slideshow, lock screen, screensaver, Windows 11 Widgets

### Takeaway
For an unpackaged, unsigned app, only the **desktop wallpaper** is realistic: `IDesktopWallpaper` is a plain Win32 COM API (Windows 8+). It works per monitor and needs files on disk. A **screensaver** is technically just an `.scr` executable, but the `/p` preview mode needs native child-window work, so it's a medium-to-large side project. **Widgets** need a *packaged* Win32 app (MSIX) or a PWA, so they're out of reach without MSIX. **Lock screen** APIs are WinRT `UserProfile` APIs written for UWP. I found no confirmation that they work unpackaged, so treat them as unproven.

### Cited Findings
- `IDesktopWallpaper` provides `SetWallpaper(monitorID, path)`, `SetSlideshow(IShellItemArray)`, `SetSlideshowOptions` (shuffle, timing) and `Enable`. It is "desktop apps only", minimum client Windows 8. — [Microsoft Learn: IDesktopWallpaper](https://learn.microsoft.com/windows/win32/api/shobjidl_core/nn-shobjidl_core-idesktopwallpaper); [SetSlideshow](https://learn.microsoft.com/en-us/windows/desktop/api/shobjidl_core/nf-shobjidl_core-idesktopwallpaper-setslideshow)
- The `windows` crate exposes `IDesktopWallpaper` with `unsafe` methods. `SetSlideshow` needs an `IShellItemArray`, which is the main hurdle (C# example in Microsoft Q&A). The popular `wallpaper` crate uses the registry and `winapi`, not `IDesktopWallpaper`. — [windows-docs-rs IDesktopWallpaper](https://microsoft.github.io/windows-docs-rs/doc/windows/Win32/UI/Shell/struct.IDesktopWallpaper.html); [Microsoft Q&A](https://learn.microsoft.com/en-us/answers/a/1627500); [wallpaper crate source](https://docs.rs/crate/wallpaper/latest/source/src/windows.rs)
- Lock screen:
  - `LockScreen.SetImageFileAsync` sets the lock-screen image from a `StorageFile`; its device family is "Windows Desktop Extension SDK" (10.0.10240.0);
  - it is "not supported when called from x86 Console Apps on x64 machines";
  - `GetImageStream` requires the "Picture Library Access" manifest capability;
  - a March 2025 Microsoft Q&A *question* (not an answer) says the API "seems limited to the UWP runtime".
  — [Microsoft Learn: SetImageFileAsync](https://learn.microsoft.com/en-us/uwp/api/windows.system.userprofile.lockscreen.setimagefileasync?view=winrt-20348); [GetImageStream](https://learn.microsoft.com/en-us/uwp/api/windows.system.userprofile.lockscreen.getimagestream?view=winrt-20348); [Microsoft Q&A](https://learn.microsoft.com/en-us/answers/a/2014525)
- `UserProfilePersonalizationSettings.TrySetLockScreenImageAsync` / `TrySetWallpaperImageAsync` also exist. — [Microsoft Learn](https://learn.microsoft.com/zh-tw/uwp/api/windows.system.userprofile.userprofilepersonalizationsettings.trysetlockscreenimageasync?view=winrt-26100)
- Screensaver: an `.scr` "is nothing more than a standard Windows executable with the .scr extension". Windows passes `/s` (run), `/p <HWND>` (preview as a child of that window) and `/c` (settings), sometimes as `/p:1234`. — [Microsoft KB 182383](https://support.microsoft.com/kb/182383) **[older]**; [Microsoft Learn: Handling screen savers](https://msdn.microsoft.com/en-us/library/cc144066(v=vs.85).aspx) **[older]**
- Widgets: "Currently you can implement a widget provider using a packaged Win32 desktop app or a Progressive Web App (PWA)". Desktop providers implement `IWidgetProvider` (Windows App SDK 1.2+), and content is Adaptive Cards or a "web widget" URL (WinAppSDK 1.6.3+). "The only Widgets host is the Widgets Board built into Windows 11." — [Microsoft Learn: Widget providers](https://learn.microsoft.com/en-us/windows/apps/develop/widgets/widget-providers) (ms.date 2026-10-23); [Microsoft Learn: Widgets overview](https://learn.microsoft.com/windows/apps/design/widgets)
- Widget providers register through `uap3:AppExtension` in the package manifest. — [Microsoft Learn: Widget provider manifest](https://learn.microsoft.com/windows/apps/develop/widgets/widget-provider-manifest)
- Package identity for Tauri: Microsoft's winapp CLI (Windows 11 prerequisite) can debug a Tauri exe "with identity" via `winapp run`, which registers a loose-layout package. It can produce an MSIX via `winapp pack --cert`. "MSIX packages must be signed", but "The Microsoft Store will sign the MSIX for you." — [Microsoft Learn: winapp CLI with Tauri](https://learn.microsoft.com/en-us/windows/apps/dev-tools/winapp-cli/guides/tauri) (ms.date 2026-10-07)

### Inferences
- **Wallpaper: medium-to-high value, medium effort (3–5 days).** "Set as wallpaper" for the current image is the cheapest version, and the ambient-app fit is strong.
  - It needs the image on disk, so it must be a user action that saves (same rule as drag-out). An automatic "wallpaper follows the slideshow" mode would write a file every interval. That conflicts with ADR-0009/0007's "no images in caches" unless it reuses one overwritten file in the library and is documented as a deliberate, opt-in exception.
  - Using `SetSlideshow` over a folder of *saved* images (`views/<topic>/`) hands the rotation to Windows. LeMuse doesn't need to run, and it respects the existing rule.
  - Pitfall: Windows' slideshow and the "Personalize > Background" setting can be changed by users or Group Policy, and `IShellItemArray` construction is fiddly in Rust.
- **Screensaver: low-to-medium value, large effort.**
  - `/s` could simply launch LeMuse fullscreen, kiosk-style, with a tiny native `.scr` stub that launches the main exe.
  - `/p` (the small preview in Settings) needs drawing into a foreign HWND, which a WebView2 window doesn't do by default. A stub could draw a static logo there instead.
  - Install: `.scr` files go in System32 or are chosen via right-click > Install, and an NSIS step would need admin rights for System32. A screensaver streams remote images while the user is away, so network failures need a graceful offline fallback.
  - This is an "ambient" crowd-pleaser, but it's a side project. Defer.
- **Lock screen: not realistic now.** It's unproven outside UWP or packaged apps, it needs a local file, and it would need testing on both Windows 10 and 11. Revisit only if LeMuse gains MSIX identity.
- **Widgets: not realistic for the NSIS build.** They need MSIX package identity plus Windows App SDK COM-server code, they're Windows 11 only, and the content is limited to Adaptive Cards or a web widget. If a Store MSIX ever ships, a "today's reference" widget becomes possible, but it is still a multi-week project.

### Gaps
- I found no authoritative statement on whether `LockScreen.SetImageFileAsync` or `TrySetLockScreenImageAsync` succeed from an unpackaged Win32 process on Windows 10/11. A 30-minute test from the `windows` crate would settle it.
- I didn't check whether a "package with external location" (sparse package) gives identity to an NSIS-installed app. That route usually needs a signed sparse package, which an unsigned project can't produce.
- I found no Tauri- or WebView2-specific screensaver precedent.

## 4. Tauri auto-updater for an unsigned, open-source app (what's new beyond the earlier note)

### Takeaway
`tauri-plugin-updater` works with NSIS and MSI and a static `latest.json` on GitHub Releases. The minisign-style signature is mandatory, and losing the key strands every installed user (covered earlier). Updates of an *unsigned* app are still per-file-hash for SmartScreen. App-downloaded files may avoid Mark-of-the-Web, but that's unverified. The portable build can't use the updater.

### Cited Findings
- On Windows, the app "is automatically exited when the install step is executed", with an `on_before_exit` hook. `installMode` options:
  - `passive`: default and recommended;
  - `basicUi`: needs user interaction;
  - `quiet`: works only for per-user installs or elevated apps, "Generally not recommended".
  — [Tauri v2: Updater](https://v2.tauri.app/plugin/updater/)
- v2 updater artifacts reuse the normal `-setup.exe`/`.msi` with a `.sig` file next to each. `latest.json` needs `version` plus `platforms.<os-arch>.url` and `.signature`. Tauri "will validate the whole file before checking the version field". `createUpdaterArtifacts` "will be removed in v3". — [Tauri v2: Updater](https://v2.tauri.app/plugin/updater/)
- `TAURI_SIGNING_PRIVATE_KEY` and its password are read from the environment; "`.env` files do _not_ work!". — [Tauri v2: Updater](https://v2.tauri.app/plugin/updater/)
- SmartScreen: browsers and Explorer network-share copies apply Mark-of-the-Web, and SmartScreen is "invoked for any Internet-downloaded executable run from the Windows Shell". Unsigned files' reputation is per hash ("new files that are unsigned have no reputation by default"). Smart App Control "evaluates trust/signatures of all code". The article doesn't cover an app's own HTTP downloads. — [Eric Lawrence: Best Practices for SmartScreen AppRep, 2024-11-15](https://textslashplain.com/2024/11/15/best-practices-for-smartscreen-apprep/) **[older: 2024]**
- "Vulnerable stub installers and updaters have historically been a source of significant breaches." The article recommends HTTPS and package-signature validation. — [Eric Lawrence](https://textslashplain.com/2024/11/15/best-practices-for-smartscreen-apprep/)
- PowerToys v0.100.x added backing up configuration files before updates so settings can be restored if they are corrupted. — [PowerToys v0.99/0.100 release notes via newreleases.io](https://newreleases.io/project/github/microsoft/PowerToys/release/v0.99.0)

### Inferences
- **Value: medium. Effort: 2–3 days plus key custody.** LeMuse already checks GitHub Releases, and the updater turns "go download" into one click.
- **Unsigned interaction:** the updater downloads with its own HTTP client, so the installer probably runs without MOTW and therefore without a SmartScreen prompt. If true, the updater *reduces* SmartScreen friction for existing users, while the first install still warns. It is unverified, so test on a clean VM before claiming it. Smart App Control (Windows 11 clean installs) may still block unsigned binaries regardless of MOTW.
- **Portable build:** the updater runs the NSIS/MSI installer, so a portable folder would be "updated" into an installed copy. Disable the updater in the portable build and keep the "check only" path there.
- **Capabilities:** keep `updater:*` permissions off the WebView where possible. Do the check, download and install in a Rust command triggered by a confirm button, so a compromised renderer can't trigger installs.
- **Before an update:** copy `lemuse.toml` and run a SQLite `VACUUM INTO` snapshot, as PowerToys does with its config backup. A failed migration is then recoverable (see section 7).
- The endpoint is GitHub Releases' `latest.json`. Remember "validate whole file": a malformed platform entry breaks updates for everyone, so add a CI check that parses `latest.json` before publishing.

### Gaps
- I found no test or report confirming whether files downloaded by `tauri-plugin-updater` carry MOTW (Zone.Identifier). I also found nothing on how Smart App Control treats an unsigned Tauri NSIS update.

## 5. Distribution: winget and Microsoft Store for an unsigned NSIS/Tauri app (2026)

### Takeaway
**winget** doesn't require Authenticode by policy. It requires a direct HTTPS publisher URL (GitHub Releases is the norm), silent install and uninstall, and passing Defender, multi-antivirus and URL-reputation scans. An unsigned Tauri NSIS installer can pass if it isn't flagged. **Microsoft Store** registration is now free for individuals (Sept 2025) and companies (May 2026). But the EXE/MSI path requires a CA-trusted Authenticode signature plus the offline WebView2 installer. The **MSIX** path, which Microsoft re-signs for free, is the only Store route open to an unsigned project. Tauri doesn't produce MSIX natively; Microsoft's winapp CLI can.

### Cited Findings
**winget**
- Expectations (Learn page ms.date 2024-11-21, updated 2026-07-14):
  - all URLs lead to safe sites;
  - the installer and application are virus-free;
  - "installs and uninstalls correctly for both administrators and non-administrators";
  - "supports non-interactive modes";
  - "comes directly from the publisher's website".
  - Microsoft "reserves the right to refuse a submission for any reason".
  — [Microsoft Learn: Submit to winget repository](https://learn.microsoft.com/en-us/windows/package-manager/package/repository)
- Validation labels relevant to an unsigned app:
  - `Validation-Defender-Error`: Defender flagged it during dynamic testing;
  - `Binary-Validation-Error`: multiple antivirus engines flagged PUA;
  - `URL-Validation-Error`: includes "the URL reputation test failed";
  - `Validation-Indirect-URL`: redirectors not allowed;
  - `Validation-Unattended-Failed`: not silent;
  - `Validation-Uninstall-Error`: incomplete cleanup.
  - After automation, "your submission will be manually reviewed by a moderator". Author-feedback PRs close after 10 days.
  — [Microsoft Learn](https://learn.microsoft.com/en-us/windows/package-manager/package/repository)
- The page states no Authenticode requirement. A third-party claim that winget requires signing was already flagged as unsupported in the earlier research. — [Microsoft Learn](https://learn.microsoft.com/en-us/windows/package-manager/package/repository)
- A vim-installer issue reports SmartScreen blocking a winget-installed unsigned build; the cause is the reporter's hypothesis. — [vim-win32-installer #319](https://github.forks.workers.dev/vim/vim-win32-installer/issues/319) **[older: 2023]**
- False positives go to the WDSI file submission portal. A Microsoft Q&A answer says there is no "known list" programme developers can enrol in. — [Microsoft Learn](https://learn.microsoft.com/en-us/windows/package-manager/package/repository); [Microsoft Q&A](https://learn.microsoft.com/en-us/answers/questions/5857071/how-can-a-small-software-publisher-build-smartscre)

**Microsoft Store**
- Individual developer registration has been free since 2025 (Build 2025 announcement; in effect in 200+ markets by Sept 2025; no credit card). — [Windows Developer Blog, 2025-09-10](https://blogs.windows.com/windowsdeveloper/2025/09/10/free-developer-registration-for-individual-developers-on-microsoft-store/); [Microsoft Learn: What's new for individual developers](https://learn.microsoft.com/en-my/windows/apps/publish/whats-new-individual-developer)
- Company accounts became free on 2026-05-07, with Entra ID sign-up. Some Learn pages still quote $99 or $19, which conflicts with this; the blog is newer. — [Windows Developer Blog, 2026-05-07](https://blogs.windows.com/windowsdeveloper/2026/05/07/publish-to-microsoft-store-as-a-company-now-with-free-registration-and-faster-onboarding/); [Microsoft Learn: sign up](https://learn.microsoft.com/en-us/windows/apps/get-started/sign-up)
- Tauri's Store page:
  - "Currently Tauri only generates EXE and MSI installers";
  - the Store-linked installer must be code-signed, offline and handle its own updates;
  - use `bundle.windows.webviewInstallMode: offlineInstaller` in a separate `tauri.microsoftstore.conf.json`;
  - silent argument `/S` for NSIS;
  - "Your application publisher name cannot match the application product name".
  — [Tauri v2: Microsoft Store](https://v2.tauri.app/distribute/microsoft-store/)
- The Store doesn't re-sign MSI/EXE; they must chain to the Microsoft Trusted Root Program. Policy change history names 10.2.9 for "installer binary products (.msi or .exe) must be digitally signed". — [Microsoft Learn: Store policies change history](https://learn.microsoft.com/windows/apps/publish/store-policies-change-history); [Microsoft Learn: Code signing options](https://learn.microsoft.com/en-us/windows/apps/package-and-deploy/code-signing-options)
- For MSIX: "The Microsoft Store will sign the MSIX for you, no need to sign before submission". `winapp pack` builds the MSIX from the Tauri release exe. You need one MSIX per architecture. — [Microsoft Learn: winapp CLI with Tauri](https://learn.microsoft.com/en-us/windows/apps/dev-tools/winapp-cli/guides/tauri)
- Real-world Tauri-to-Store journeys report building "my own pipeline" for MSIX. Identity values (Name, Publisher, display name) must match Partner Center exactly, or the upload fails. — [dev.to: WSL UI Store journey](https://dev.to/octasoft-ltd/building-wsl-ui-the-microsoft-store-journey-2428); [gezihuzi blog](https://gezihuzi.github.io/2024/04/05/publish-tauri-app-to-ms-store.html) **[older: 2024]**

### Inferences
- **winget: high value, low effort (1 day, then about 15 minutes per release with `wingetcreate`/`komac` automation).**
  - The NSIS installer already supports `/S`, and GitHub Releases is a direct HTTPS publisher URL.
  - Check before submitting: per-user vs per-machine install scope, a clean uninstall (Validation-Uninstall-Error), and a local Defender full scan of the installed app.
  - A winget install doesn't save users from SmartScreen if the installer is downloaded to disk with MOTW; behaviour depends on the winget client.
  - The name check from the earlier note (winget-pkgs collisions on "LeMuse") still applies.
- **Store via MSIX:**
  - Pros: free, signed by Microsoft, no SmartScreen, and it unlocks package identity (toasts, widgets, maybe the lock screen).
  - Cons: a second packaging pipeline (winapp CLI on Windows 11 in CI); the in-app updater must be off in the Store build; the CLI path and InPrivate WebView2 behaviour under MSIX need testing; Store certification for an app that shows third-party images (policy 10.x / IP).
  - Effort: about 1–2 weeks the first time.
  - Owner decision: publishing to the Store is "publishing / owner's accounts" under CLAUDE.md, so it needs AskUserQuestion. Recommend winget first, Store MSIX later.
- **Store via EXE: not available** while LeMuse stays unsigned.

### Gaps
- I didn't fetch the current Windows Package Manager policies page to check for any unsigned-installer clause. The repository page and the earlier research show none.
- I found no 2026 data on how often unsigned Tauri NSIS installers trip Defender or the multi-AV scan in winget validation.
- I didn't verify whether MSIX-packaged Tauri apps keep working CLI entry points (`lemuse.exe` on PATH needs an `AppExecutionAlias`).

## 6. Provenance next to saved files: embedded XMP/IPTC vs a JSON sidecar

### Takeaway
Do both. Embed a small set of IPTC/XMP fields in saved **JPEGs**: Windows Explorer, Adobe tools, Capture One and ExifTool-based managers read them, and they travel with the file. Also write a sidecar (`.json`, or an `.xmp` sidecar) for every format: PNG support in Windows and Lightroom is weak, and a sidecar can hold LeMuse-specific fields (Are.na block URL, topic, retrieval date) losslessly. Never re-encode the image to embed metadata; insert the XMP packet into the existing JPEG segments.

### Cited Findings
- IPTC Photo Metadata Standard 2025.1 (rev 1, dated 2025-11-26; Core 1.5, Extension 1.9 per "About", a heading says 1.8) XMP ids:
  - Creator: `dc:creator` (Seq ProperName)
  - Credit Line: `photoshop:Credit`
  - Copyright Notice: `dc:rights` (Lang Alt)
  - Source: `photoshop:Source`
  - Rights Usage Terms: `xmpRights:UsageTerms`
  - Licensor: `plus:Licensor`
  - Digital Source Type: `Iptc4xmpExt:DigitalSourceType`
  - Artwork or Object in the Image: `Iptc4xmpExt:ArtworkOrObject`
  - Description: `dc:description`
  - Title: `dc:title`
  — [IPTC Photo Metadata Standard 2025.1](http://www.iptc.org/std/photometadata/specification/IPTC-PhotoMetadata-2025.1.html)
- IPTC guidance:
  - "The Credit Line shows how the image should be credited when published";
  - Web Statement of Rights is called "Copyright Info URL" in Adobe's File Info panel;
  - Creator, Copyright Notice and Credit Line are shown as "Image Credits" in Google image search;
  - the image-level Creator and Copyright describe the *photograph*, and the Artwork-or-Object fields describe the depicted work: "Do not confuse this field value with the Copyright Notice of the image showing this artwork".
  — [IPTC Photo Metadata User Guide](https://www.iptc.org/std/photometadata/documentation/userguide/)
- Windows Explorer (WIC photo metadata policy):
  - `System.Author` (Explorer's "Authors") reads and writes `/xmp/dc:creator` first, then tiff:artist, IPTC By-line and EXIF;
  - `System.Copyright` reads `dc:rights`, IPTC CopyrightNotice and EXIF Copyright;
  - the containers listed are JPEG and TIFF.
  — [Microsoft Learn: System.Author policy](https://learn.microsoft.com/el-gr/windows/win32/wic/-wic-photoprop-system-author); [System.Copyright policy](https://learn.microsoft.com/en-us/windows/win32/wic/-wic-photoprop-system-copyright)
- For PNG, an ExifTool forum table says Windows reads and writes only one tag and ignores the rest. A Microsoft blog lists `/[*]tEXt/Author` for PNG. — [ExifTool forum](https://exiftool.org/forum/index.php/topic,6591.msg32875.html); [Microsoft archive blog](https://learn.microsoft.com/en-us/archive/blogs/rwlodarc/background-on-metadata-query-language) **[older]**
- Lightroom Classic writes XMP into JPEG, TIFF, PSD and DNG ("for all other file formats"); PNG isn't listed. A community report says PNG keywords import poorly. — [Adobe: Lightroom Classic metadata basics](https://helpx.adobe.com/lightroom/help/metadata-basics-actions.html); [Adobe community thread](https://community.adobe.com/t5/lightroom-classic-discussions/importing-png-files-with-metadata-doesn-t-parse-keywords-correctly/m-p/14911533)
- Capture One reads embedded EXIF, IPTC-IIM, embedded XMP and `.xmp` sidecars, with a setting for which takes priority. — [Capture One support](https://support.captureone.com/hc/en-us/articles/360002544898)
- Immich reads `.xmp` sidecars during metadata extraction. — [Immich: XMP sidecars](https://docs.immich.app/features/xmp-sidecars)
- Rust crates:
  - `xmp_toolkit`: Adobe's binding to the C++ XMP Toolkit SDK; "embed and update XMP metadata in many file formats"; MSVC only on Windows; v1.8.0 exists;
  - `xmpkit`: pure Rust, documents JPEG and PNG read/write as "Fully supported"; young (0.1.x).
  — [docs.rs xmp_toolkit](https://docs.rs/crate/xmp_toolkit/1.8.0/source/README.md); [docs.rs xmpkit](https://docs.rs/crate/xmpkit/0.1.6/source/README.md)
- The Creative Commons wiki documents `xmpRights:WebStatement` / `cc:license` usage for embedding licences. — [CC wiki: XMP](https://wiki.creativecommons.org/wiki/XMP)

### Inferences
- **Value: high for this audience; effort: 2–4 days.** Artists keep references for years in Eagle, PureRef or folders, and attribution is a stated LeMuse principle (ADR-0004).
- Suggested mapping:
  - **Image-level:** `dc:creator` = the photographer or uploader where known, else the museum; `photoshop:Credit` = "Cleveland Museum of Art via LeMuse" or "<creator> via Are.na"; `dc:rights` = "Public Domain (CC0)" for CMA open access, or the stated rights; `xmpRights:WebStatement` = licence URL; `photoshop:Source` = source name.
  - **Depicted work:** `Iptc4xmpExt:ArtworkOrObject` = artist, title, date, source and the museum page URL (`AOSourceInvNo`/`AOSourceInvURL`).
  - **Description:** `dc:description` = title.
- **Pitfalls:**
  - Remote text goes into XML, so it must be escaped by the library, never spliced (same rule as TOML/SQL in CLAUDE.md).
  - Insertion must keep the original bytes intact. A changed hash breaks the CAS `objects/<sha256>` model unless the hash is taken *before* embedding or the embedded copy is kept only in `views/`. **Decision needed:** keep the CAS original byte-exact and embed only in exported or "Save as" copies, or define the CAS hash over the embedded file.
  - Don't write IPTC-IIM (legacy); XMP is enough for modern readers. Explorer also reads XMP dc:creator and dc:rights.
  - `xmp_toolkit` adds a C++ build (MSVC) and a bigger supply-chain surface. A minimal hand-rolled APP1 XMP-segment writer for JPEG, plus a PNG `iTXt` "XML:com.adobe.xmp" chunk, is small but must be fuzz-tested. `xmpkit` is too young to trust without review and the 14-day cooldown.
- **Sidecar:** write `<file>.json` (LeMuse's own provenance, including an `"schema": "lemuse-provenance/1"` field), and optionally `<file>.xmp` for Capture One, Immich and Bridge users. The sidecar must hold no personal data: no Windows paths, and no tokens in URLs.

### Gaps
- I couldn't confirm whether Eagle (the popular reference manager) reads embedded XMP or IPTC on import. No source mentioned it; a manual test is needed.
- I didn't confirm Bridge's or Photoshop's PNG XMP reading (likely yes via the XMP SDK, but not sourced).
- I didn't confirm whether Windows 11 Explorer shows XMP from PNG `iTXt`.

## 7. Release and support practices of "finished" open-source desktop apps: What's new, diagnostics export, backup/restore

### Takeaway
Mature apps share three habits:
- a **What's new** surface reachable from the app (PowerToys links its OOBE "What's New" page from Settings);
- a one-click **"copy system info / show log for bug reports"** (Krita, Obsidian);
- a **settings/config backup** around risky moments (PowerToys backs up config before updates).

For a local-first SQLite app, `VACUUM INTO` gives a consistent single-file snapshot cheaply.

### Cited Findings
- PowerToys:
  - v0.76.0 added "a direct link to the OOBE's 'What's New' page" from the main Settings window;
  - v0.93.0 reformatted the "What's New" release notes for readability;
  - v0.100.x "automatically backs up configuration files before updates so settings can be restored if corruption is detected" and relaunches with clearer success notifications.
  — [PowerToys releases](https://www.GitHub.com/microsoft/PowerToys/releases); [newreleases.io PowerToys v0.99.0](https://newreleases.io/project/github/microsoft/PowerToys/release/v0.99.0); [BetaNews on v0.93](https://betanews.com/2025/08/14/microsoft-releases-powertoys-v0-93-0-with-a-fresh-new-look/)
- Krita:
  - Help > "Show Krita Log for Bug Reports" (includes the backtrace for crashes);
  - Help > "Show system information for bug reports", with a copy-to-clipboard button added later;
  - the bug guide says "in all cases, attach the contents of the Help > Show system information for bug reports dialog".
  — [Krita docs: Help menu](https://docs.krita.org/Help_Menu); [Krita: Reporting bugs](https://docs.krita.org/it/untranslatable_pages/reporting_bugs.html); [Krita: Getting logs](https://docs.krita.org/en/reference_manual/sharing_krita_logs.html); [KDE commit](https://phabricator.kde.org/R37:ccb9ff13d2e0416229aeaee20cd9034831a46a48) **[older: 2017]**
- Krita 6 dropped the "Submit Bug Report" Help entry, and a user filed a bug about it. — [KDE bug 515803](https://bugs.kde.org/show_bug.cgi?id=515803)
- Obsidian has a "Show debug info" command (Command Palette, and Help on Mac) with a "Copy to clipboard" button, which support staff ask users to paste. — [Obsidian forum](https://forum.obsidian.md/t/properties-plugin-unable-to-type-accented-characters/64509/6)
- SQLite `VACUUM INTO`:
  - the output "is a consistent snapshot of the original database";
  - it is not a write operation on the source;
  - the target "must not previously exist, or else it must be an empty file";
  - "all deleted content is purged… leaving behind no forensic traces";
  - an interrupted run can leave a corrupt output, synced when `synchronous` is NORMAL or FULL;
  - the backup API "uses fewer CPU cycles" and can run incrementally.
  — [SQLite: VACUUM](https://www.sqlite.org/lang_vacuum.html)

### Inferences
- **"What's new": low effort (1 day), medium value.**
  - On first launch after a version change, show a dismissible panel with 3–5 lines bundled at build time. Remember the last-seen version in settings.
  - Add Help > What's new to reopen it, with a link to the GitHub release.
  - Bundled text, not fetched release notes: no network, and nothing remote rendered as HTML (CLAUDE.md "render as text").
- **Diagnostics export: low effort (1–2 days), high support value.** Help > "Copy diagnostic info" collects app version, Windows build, WebView2 version, library schema version, counts (topics, blocks, saves), last sync results per source and the last N log lines.
  - It must **redact**: Windows user paths (replace `C:\Users\<name>` with `%USERPROFILE%`), tokens (only "Are.na token: set/not set"), and channel slugs if the owner considers them personal.
  - It goes to the clipboard or a "Save as" file only, never auto-uploaded. This matches ADR-0011 and the earlier privacy note.
  - It pairs with the opener-based "Report a problem" link already researched.
- **Backup/restore: medium effort (2–4 days), high value for trust.**
  - `lemuse backup <file>` (CLI) and Settings > Back up: write a single `.zip` with a `VACUUM INTO` snapshot of the catalog, `lemuse.toml` and a `manifest.json` (version, schema, created_at).
  - Saved image files are excluded by default and optional to include.
  - Restore validates the manifest and schema version, refuses newer-schema backups, stops the sync engine (lock) and swaps atomically.
  - Also take an automatic snapshot before any migration or update (the PowerToys pattern), keeping the last 3.
  - The backup file holds the owner's library and topics. Add `*.lemuse-backup.zip` (or the chosen extension) to `.gitignore` **and** `FORBIDDEN_FILES` in the same change, per CLAUDE.md.
  - Local state (`block_files`, `playlists`) is the irreplaceable part. `block_media` can be rebuilt by a refresh.
- **Crash reporting:** opt-in-free local logs plus the diagnostic copy are enough. No telemetry service, per the earlier privacy note.

### Gaps
- I didn't confirm PowerToys' current trigger logic, i.e. whether "What's New" opens automatically after each update.
- I didn't research Flameshot's or ShareX's release practices (winget presence, changelog UX) specifically.
- I didn't check whether `VACUUM INTO` behaves differently in WAL mode; the SQLite page doesn't say.

## 8. Overall: which integrations make LeMuse feel "finished", in what order

### Takeaway
For an ambient art-reference app on an unpackaged, unsigned build, the integrations with the best value for the effort are:
1. tray + start-with-Windows (opt-in);
2. winget listing;
3. drag-out to art apps, plus "Open saved file / Show in folder";
4. embedded XMP for JPEG plus a provenance sidecar;
5. backup/restore + diagnostic copy + What's new;
6. "Set as wallpaper" for saved images.

Auto-update is worth doing after that, with the key-custody plan from the earlier note. Toasts, deep links, jump lists, file associations, the screensaver, the lock screen and widgets are low value or blocked by package identity, so defer them.

### Cited Findings
- Package identity (MSIX) is what gates Notifications-class APIs and widget providers. — [Microsoft Learn: winapp CLI with Tauri](https://learn.microsoft.com/en-us/windows/apps/dev-tools/winapp-cli/guides/tauri); [Microsoft Learn: Widget providers](https://learn.microsoft.com/en-us/windows/apps/develop/widgets/widget-providers)
- The official Tauri plugins used here (autostart, notification, deep-link, opener, updater) all block dangerous commands by default and need explicit capability entries. — [Tauri v2: Autostart](https://v2.tauri.app/plugin/autostart/); [Opener](https://v2.tauri.app/plugin/opener/); [Deep linking](https://v2.tauri.app/plugin/deep-linking/)
- Drag-out depends on a community plugin (CrabNebula, an official Tauri partner company) rather than plugins-workspace. — [crabnebula-dev/drag-rs](https://github.com/crabnebula-dev/drag-rs)

### Inferences

Rough estimates for a solo maker; capability cost = what must be added to `capabilities/*.json` or the CSP:

| # | Integration | Value (ambient art ref) | Effort | Tauri support | Capability / security cost | Realistic unpackaged+unsigned? |
|---|---|---|---|---|---|---|
| 1 | Tray menu | High | ~1 day | Core feature `tray-icon` | Tray permission; native labels | Yes |
| 2 | Start with Windows (opt-in, `--minimized`) | Medium | ~0.5 day | Official plugin 2.5.1 | 3 autostart perms; HKCU Run | Yes (hide in portable) |
| 3 | winget listing | High (discoverability, `winget upgrade`) | ~1 day + per release | n/a | none in app | Yes (Defender/AV scan risk) |
| 4 | Drag image out | High | 2–4 days | Community `tauri-plugin-drag` 2.1.1 | `drag:default`; Rust-side path allow-list; drag = save | Yes (test Krita/PureRef/Blender) |
| 5 | Open saved file / Show in folder / Open with app | Medium | ~1 day | Official opener | Keep `allow-open-path` out of the WebView; Rust command by block id | Yes |
| 6 | Embedded XMP (JPEG) + JSON/XMP sidecar | High | 2–4 days | Custom Rust | Escape remote text; CAS-hash decision | Yes |
| 7 | Backup/restore + pre-update snapshot | High (trust) | 2–4 days | Custom Rust (SQLite `VACUUM INTO`) | gitignore + FORBIDDEN_FILES for backup files | Yes |
| 8 | Diagnostic copy + What's new | Medium | 2 days | Custom | Redact paths and tokens; bundled text only | Yes |
| 9 | Set as wallpaper (saved images; Windows slideshow over `views/`) | Medium–High | 3–5 days | Custom `windows` crate COM | Writes files only via Save | Yes |
| 10 | Auto-updater | Medium | 2–3 days + key custody | Official plugin | Updater perms in Rust only; off in portable | Yes (first install still warns) |
| 11 | Toasts | Low | 1 day | Official, installed builds only, no actions | notification perms | Partly (not portable) |
| 12 | Deep links | Low | 1–2 days | Official | Untrusted argv; confirm-only | Yes, but adds risk |
| 13 | Screensaver (.scr) | Low–Medium | 1–2 weeks | None | Admin for System32 install | Technically |
| 14 | Jump lists | Low | 2–3 days | None (COM) | AUMID wiring | Technically |
| 15 | Lock screen | Low–Medium | Unknown | None (WinRT) | Needs file on disk | Unproven |
| 16 | Widgets | Medium (W11 only) | Weeks | None | MSIX + WinAppSDK | No (needs MSIX) |
| 17 | Store via MSIX | Medium | 1–2 weeks first time | winapp CLI, not Tauri bundler | Owner decision (publishing) | Yes via MSIX only |

- Several items write image bytes to disk: drag-out, wallpaper, "Open with" and embedded XMP. Write one ADR amendment to ADR-0009/0007 that defines "user-initiated export = save" and lists each gesture that counts. The "no images in caches" guarantee then stays auditable.
- Every new capability, plugin or Cargo feature is a guardrail-file change. The PR lists it for the owner's `guardrails-reviewed` label, per ADR-0030.

### Gaps
- No user research on which of these LeMuse's audience (docs/product/audiences.md) wants most. The value column is my inference from the app's ambient, art-reference purpose.
- The effort figures are estimates, not measured.
