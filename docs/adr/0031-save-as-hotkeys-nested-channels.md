---
status: proposed
date: 2026-11-20
decision-makers: owner
consulted: admin pass, developer pass
informed: —
---

# ADR-0031: Save as, changeable shortcuts, channels inside channels; app icon; portable folder; a calmer bar

## Context

Before merging 1.0 the owner asked for five things (session 20):

> "create a hotkeys list (changeable), and if no hotkey for bringing back the bar add one. Saving an image should
> not remove it from the channel, should still stay in the slide. Some channels not loaded (Translucent
> electronics). When saving, should save to folder on local (user choose EI save as) and state which folder saved
> to, with pop up an x in right side to remove."

What we found:
- **Save "removed" the image.** Saving marks the slide as saved, which rebuilt the slide list and reshuffled it.
  The image on screen changed; nothing was deleted.
- **The bar key.** H toggled the hidden-controls setting only. Compact windows and the mini player hide the bar
  until a tap, so H couldn't bring it back there.
- **"Translucent electronics" stayed empty.** One public read of the channel showed that all 8 of its items are
  channels, not images. LeMuse syncs a channel's own blocks and, by ADR-0004, never follows nested channels by
  itself.
- **Save went to a fixed folder** (`LeMuse/views/<topic>/`) with a short toast.

## Decision

1. **Stable slide order** (`app/src/order.ts`). The shuffle is drawn once per view, page or shuffle switch. Saving,
   marking or a failed image changes the slides but not the set, so the order and the image on screen stay put.
   Removing an image (hide) keeps everyone else's place.
2. **Changeable shortcuts** (`app/src/keys.ts`):
   - One list of actions with default keys drives the key handler, the ? sheet and the editor, so they can't
     drift.
   - The ? sheet *is* the editor: Change, then press a key; None unbinds; Reset all. Taking a key that's in use
     frees it from the other action, and the sheet says so.
   - Bindable: one visible character, Space, arrows, Home/End/Page keys, Insert/Delete and F1–F11. Esc, Tab, Enter,
     F5 and F12 can't be bound. Esc stays fixed (close, end session, leave fullscreen).
   - Saved bindings are untrusted (`ui.json`): `sanitizeKeys` keeps known actions and allowed keys, without
     clashes.
   - "Single-key shortcuts" off (WCAG 2.1.4) still silences all single-character keys.
   - New action **Save the original** (Q).
3. **The bar key works everywhere.** The bar action (H) toggles the hidden-controls setting on large windows, the
   tap-to-open bar in compact windows, and the mini player's bar.
4. **Channels inside a channel.**
   - The preview's single contents read now also returns the channels on that page (same parser as related
     channels). No extra request.
   - Find channels → Preview lists them with Preview and Add, plus "Add all, each as its own topic". The user
     chooses each one, so ADR-0004 holds: no automatic following, no crawling.
   - An empty topic says its channel may hold only channels and points to Find channels.
5. **Save as.**
   - Save (button, menu or Q) opens the **native Windows Save dialog**. It starts in the last folder used, or in
     the library's Saved folder the first time, with the image's title as the name.
   - The original is stored as before (content-addressed store plus the Saved view), so Saved and "already
     saved" keep working. It is then **copied** to the chosen file: written to a `.part` file and renamed. A copy,
     not a hard link, because the folder may be on another drive.
   - If the real image type differs from the typed extension, the extension is corrected.
   - Cancel saves nothing.
   - A note stays on screen, "Saved to <folder>", with an × on the right to dismiss it. It never auto-dismisses.
6. **Dialog plugin, Rust side only.**
   - `tauri-plugin-dialog` =2.8.4 (2026-10-28, 23 days old) is registered so Rust can call
     `app.dialog().file().blocking_save_file()`.
   - **No `dialog:` permission is added to the capabilities**, so the page can't open dialogs or choose paths. The
     save command takes no path from the page, only the block id and the view.
   - The page may suggest the starting folder (its last save). Rust uses it only if it is an existing absolute
     folder, and the user still chooses.
   - It pulls in `rfd` 0.17.2 (2026-01-12, MIT) and `tauri-plugin-fs` 2.7.1 (2026-10-14, Apache-2.0 OR MIT); both are older than 14 days.
     `tauri-plugin-fs` is a library dependency of the dialog crate and is not registered as a plugin, so its
     commands don't exist at runtime.

7. **App icon (owner's design).** The owner drew a magnifying glass at 256 px, on white. Scaled up it blurs,
   and at 16–32 px its thin black lines blur into the ring.
   - Redrawn as vectors: `app/app-icon.svg` (full detail) and `app/app-icon-small.svg` (bolder lines, one grip).
   - `npm run icons` (`scripts/icons.mjs`) makes every file in `app/src-tauri/icons/` from them with the Tauri
     CLI. `icon.ico` takes its 16, 24 and 32 px frames from the small drawing and its 48, 64 and 256 px frames
     from the full one, all as PNG frames like the CLI's own.
   - No new tool: it uses only the Tauri CLI already installed. The old `app/app-icon.png` is removed.
8. **Portable folder (owner: "a folder I can move to my Apps folder, and a shortcut on the Desktop").**
   - `npm run portable` (`scripts/portable.mjs`) builds the release app without an installer
     (`tauri build --no-bundle`).
   - It writes `app/dist-portable/LeMuse/` with:
     - `LeMuse.exe`;
     - `THIRD-PARTY-NOTICES.txt`, next to the exe, where Settings → About finds it;
     - `Add shortcuts.cmd` and `Remove shortcuts.cmd`;
     - a short README.
   - `Add shortcuts.cmd` makes `LeMuse.lnk` on the Desktop and in the Start menu, which is what puts LeMuse in
     Windows' All apps list. The shortcuts point to the exe wherever the folder now is. The folder reaches
     PowerShell through an environment variable, never spliced into the command.
   - Data stays outside the folder (the library folder and `%APPDATA%`), so moving or replacing the folder
     keeps it.
   - The output is git-ignored and in `FORBIDDEN_FILES`. It holds an `.exe` and third-party emails.

9. **A calmer bar, and nothing hidden or covered (owner: "the bar up arrow covers grid", "as the window is made
   smaller the source information disappears", "art parts together").**
   - **Practice ◐** replaces the session, grid and study-aid buttons: one menu with Timed session and Grid view
     at the top, the study aids below. While a session runs, the ⏱ "End the session" button swaps into the bar.
   - **⋯ (More for this image)** opens the right-click menu above the bar, replacing the Copy link and Related
     channels buttons. That menu gained Related Are.na channels.
   - The bar goes from 17 buttons to 13. Keys N, W, L, R and right-click still work.
   - **Grid view:**
     - With the bar hidden, the ⌃ arrow gets its own strip under the grid instead of covering the last
       thumbnails and the scrollbar.
     - In compact windows, the tap-for-bar layer is left out over the grid, so a tap picks the thumbnail.
   - **Attribution always visible (ADR-0004):**
     - The compact credit puts the source in its own part, and only the creator shortens with "…".
     - That credit was also wider than a 400 px window (`box-sizing`).
     - The Minimal layout keeps its byline.
   - **New checks:** no control may be covered at five points; the source must be visible and unclipped; the ⌃
     arrow must not overlap the grid; and a 1040 px size, just above the compact cutoff.

## Options considered

- **Keep the fixed folder, add "Show in Explorer".** Rejected: the owner asked to choose the folder.
- **A folder picker in Settings.** Rejected: the owner asked for "Save as", per image.
- **Our own Win32 `IFileSaveDialog` through the `windows` crate.** Rejected: more unsafe code to review than an
  official, pinned plugin.
- **Expose `dialog:allow-save` to the page.** Rejected: least privilege (ADR-0011). The page never needs a path.
- **Follow nested channels automatically on refresh.** Rejected: ADR-0004 (only user-listed channels; no
  crawling).
- **An overflow menu that fills as the window narrows.** Rejected: buttons that move depending on the window
  size are hard to find again; fixed groups are predictable.
- **Upscale the 256 px PNG for the icon.** Rejected: it blurs at large sizes and smears at 16 px; vectors give
  sharp edges at every size.
- **The app makes its own shortcuts (a Settings button).** Rejected for now: a script beside the exe works
  before the app has ever run and needs no app code that writes outside the library. The installer
  (NSIS/MSI) still makes its own shortcuts.

## Consequences

- A save now writes two files: the library's original and the user's copy. The library copy is what keeps Saved,
  "saved" marks and offline viewing working. A saved image's bytes still come only from Save (ADR-0009).
- The note shows a local folder path. It is on screen only: never logged, never in previews or the repo.
- The ? sheet and the editor can't disagree. A new action is one line in `keys.ts` plus one `case` in App.tsx.
