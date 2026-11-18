---
status: accepted          # amended by ADR-0007 (stream-first)
date: 2026-11-16
decision-makers: owner
consulted: admin pass, developer pass
informed: —
---

# ADR-0005: Gather in the background on launch; optional tray mode and Task Scheduler CLI

## Context

The owner wants the app to "auto-gather, maybe on launch". Gathering can take minutes on a first sync of a big
channel. The UI must never wait for it, and two gather runs must never collide.

## Decision

1. **On launch (default on):** the window opens immediately from the local catalog. A gather pass then starts on
   a background thread (`Trigger::Launch`) and streams progress events to the UI.
2. **Optional, off by default:**
   - **Tray mode:** the Tauri autostart plugin writes the per-user `Run` key with `--minimized`, and the app
     keeps gathering every `sync.interval_minutes`.
   - **Scheduled mode:** a Windows Task Scheduler entry runs `lemuse sync --trigger schedule` while the app is closed.
3. **Mutual exclusion:** `.sync.lock` in the library root (`SyncLock`, stale after 6 h). A Tauri single-instance
   plugin is added in M1.
4. **Not a Windows Service:** a service runs under a different account and can't read the user's Credential
   Manager tokens.

## Options considered

| Option | Verdict |
|---|---|
| Background thread on launch | **Chosen** (default) |
| Block the UI until the sync finishes | Rejected: a bad first impression and fragile offline |
| Tray app with interval | Chosen as an opt-in |
| Task Scheduler + CLI | Chosen as an opt-in. Reuses the same core |
| Windows Service | Rejected: wrong account, needs admin to install |

## Consequences

- Easier: one code path (`SyncEngine::run`) for every trigger. Works offline (it just reports errors).
- Harder: progress and error reporting must work both in the UI (events) and the CLI (stdout plus `sync_runs` table).
- Revisit when: the owner wants syncing across multiple machines.

## Action items

1. [x] `Trigger` enum, `SyncLock`, CLI `sync --trigger schedule` (stub), `on_launch` and `interval_minutes` config.
2. [ ] M1: launch thread + progress events; "Gather now" button.
3. [ ] M4: tray + autostart plugin; `lemuse schedule install|remove` (wraps `schtasks`).

## Review log

| Stage | Date | Reviewer | Outcome | Notes / finding IDs |
|---|---|---|---|---|
| Proposal | 2026-11-16 | Claude | drafted | |
| Admin pass | 2026-11-16 | Claude (architect role) | approved | |
| Developer pass | 2026-11-16 | Claude (developer role) | approved | |
| Owner gate | | Owner | pending | |
