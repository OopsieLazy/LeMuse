---
status: proposed
date: 2026-11-20
decision-makers: owner
consulted: admin pass, developer pass
informed: —
---

# ADR-0031: Save as, changeable shortcuts, channels inside channels

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

## Options considered

- **Keep the fixed folder, add "Show in Explorer".** Rejected: the owner asked to choose the folder.
- **A folder picker in Settings.** Rejected: the owner asked for "Save as", per image.
- **Our own Win32 `IFileSaveDialog` through the `windows` crate.** Rejected: more unsafe code to review than an
  official, pinned plugin.
- **Expose `dialog:allow-save` to the page.** Rejected: least privilege (ADR-0011). The page never needs a path.
- **Follow nested channels automatically on refresh.** Rejected: ADR-0004 (only user-listed channels; no
  crawling).

## Consequences

- A save now writes two files: the library's original and the user's copy. The library copy is what keeps Saved,
  "saved" marks and offline viewing working. A saved image's bytes still come only from Save (ADR-0009).
- The note shows a local folder path. It is on screen only: never logged, never in previews or the repo.
- The ? sheet and the editor can't disagree. A new action is one line in `keys.ts` plus one `case` in App.tsx.
