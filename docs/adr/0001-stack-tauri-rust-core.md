---
status: accepted          # owner approved Q1 on 2026-11-16
date: 2026-11-16
decision-makers: owner
consulted: admin pass, developer pass
informed: —
---

# ADR-0001: Build a Tauri 2 desktop app around a shared Rust core

## Context

The owner asked for "a web app or a standalone C++ app" that gathers references to local files and runs a
gather script on launch. It's single-user and local-first, the primary platform is Windows 10/11, and it has to
browse 10k+ images smoothly. It needs real file-system access (hardlinks, multi-GB libraries) and a headless
mode for scheduled gathering. This machine has Rust 1.96 (MSVC), Node 20, Visual Studio Build Tools and
WebView2. It has no Qt.

Research: `reports/Arena reference gatherer architecture.md` §Architecture.

## Decision

Tauri 2 shell (Rust backend + React/TypeScript UI in WebView2) over a **Rust core library** that also powers a
**CLI**. All logic (connectors, sync, storage) lives in the core.

## Options considered

### Option A: Tauri 2 + Rust core (chosen)

| Dimension | Assessment |
|---|---|
| Complexity | Med (two languages: Rust + TS) |
| Cost | Free (MIT/Apache) |
| Performance / size | ~8.6 MiB bundle vs ~244 MiB Electron (2025 benchmark); WebView2 ships with Windows |
| Ecosystem | Mature in 2026: autostart, tray, updater, single-instance plugins; asset protocol for local images |

**Pros:** small installer, native-speed core, one core for GUI + CLI, first-party autostart/tray plugins.
Least-privilege capability model.
**Cons:** Rust learning curve. WebView2 is Chromium, so the memory gap vs Electron is smaller on Windows than on
macOS. The asset protocol is slow on very large files, so pre-generated thumbnails are needed.

### Option B: Electron + TypeScript (+ better-sqlite3, sharp)

**Pros:** fastest to ship. The closest comparable apps (Allusion, Eagle) use it. sharp is the fastest thumbnailer.
**Cons:** ~244 MiB installer, higher memory. A Node core is harder to reuse as a small headless scheduled CLI.

### Option C: C++ with Qt 6 (QML)

**Pros:** truly native, excellent image handling, matches the owner's "C++" option.
**Cons:** Qt isn't installed here. LGPLv3 obligations (dynamic linking, relinkability, notices) or about
€1,090/yr for Small Business. Slowest UI iteration. A smaller pool of reusable web UI components (virtualized
grids, etc.).

### Option D: Local web app (FastAPI/Node on localhost + browser)

**Pros:** quickest prototype.
**Cons:** a localhost server is an attack surface. No real desktop integration (tray, autostart, file
associations). Awkward packaging. Fine as a prototype, poor as the product.

### Option E: Dear ImGui (C++)

**Cons:** immediate-mode UI is a poor fit for a document-style gallery with text, search and accessibility.
Rejected early.

## Trade-off analysis

The deciding factors were these:

- A small, native-feeling Windows install.
- One reusable core for the GUI and the scheduled CLI.
- Toolchains already on the machine.

Tauri gives a C++-class core (Rust) with web-speed UI iteration. That satisfies the intent behind "C++" (native
performance, no heavy runtime) without Qt's licensing and tooling cost.

We would change our minds if:

- **Electron:** the Rust learning curve blocks progress for more than one milestone.
- **Qt:** a native C++ UI becomes a goal in itself.

## Consequences

- Easier: headless gathering, small installer, sharing the core with future tools.
- Harder: contributors need both Rust and TypeScript. UI↔core calls cross an IPC boundary
  (`app/src/api.ts` ↔ `app/src-tauri/src/lib.rs`).
- Revisit when: M2 gallery performance is measured with 10k+ thumbnails on Windows.

## Action items

1. [x] Scaffold workspace: `lemuse-core`, `lemuse-cli`, `app/src-tauri`, `app/src`.
2. [ ] M2: virtualized grid + thumbnail pipeline; benchmark on Windows.

## Review log

| Stage | Date | Reviewer | Outcome | Notes / finding IDs |
|---|---|---|---|---|
| Proposal | 2026-11-16 | Claude | drafted | |
| Admin pass | 2026-11-16 | Claude (architect role) | approved with notes | A-1 (owner asked for C++: explicit rationale added) |
| Developer pass | 2026-11-16 | Claude (developer role) | approved | Toolchain verified: core, CLI and shell all compile |
| Owner gate | 2026-11-16 | Owner | **accepted** | Q1: "fine" |
