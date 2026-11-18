# Architecture and Technology Stack for a Local-First Reference Gatherer (Are.na and other sources), Windows First

Research date: 2026-11-16. I used about 17 search/fetch calls. Statements marked "Inference" or listed under Inferences are my reasoning or general knowledge, not something a source confirmed. Benchmark numbers in this space are mostly blog-grade and N=1, which is flagged where it applies.

## Q1. Stack options compared: Tauri 2, Electron, Qt 6, Dear ImGui, localhost web app, .NET

### Takeaway
For a single developer, Windows-first, building an image gallery that also needs a background sync engine, **Tauri 2 (Rust core with a Svelte/Solid/React UI)** offers the best balance. It has small installers (around 10 MB against around 200 MB), lower memory, a Rust core that a CLI can reuse, and official updater, autostart, tray and signing paths. Electron is the lower-risk choice for dev speed and ecosystem, and it is what the closest comparable apps (Allusion, and very likely Eagle) use. Qt 6 is the right choice only if a native C++ UI is a hard goal. Even then, LGPL obligations or a paid licence apply. Dear ImGui does not fit a polished gallery or tagging app. A localhost Python/Node web app is the fastest prototype but the weakest product.

### Cited Findings

**Tauri 2 vs Electron: size and memory (blog-grade data, treat as directional)**
- Hopp benchmark (July 2025, MacBook Pro, N=1, framework versions not stated): 6 windows open used about 172 MB (Tauri) vs about 409 MB (Electron). Bundle size was 8.6 MiB vs 244 MiB. The startup-time difference was negligible (<1.5 s). The initial Tauri build was much slower (1:20 vs 15.8 s) because of Rust compilation. The memory gap is attributed to Electron's Node main process and Chromium renderers. **Caveat: measured on macOS with WKWebView. On Windows, Tauri uses WebView2 (Chromium-based), so the per-renderer memory gap is likely smaller there.** — [Hopp / DEV](https://dev.to/gethopp/tauri-vs-electron-performance-bundle-size-and-the-real-trade-offs-1el4)
- Hopp also flags Tauri trade-offs: each OS has a different native WebView, so rendering quirks appear (WebView2 on Windows), and the Rust backend has a learning curve. — [Hopp / DEV](https://dev.to/gethopp/tauri-vs-electron-performance-bundle-size-and-the-real-trade-offs-1el4)
- A 2026 comparison of Tauri 2.x and Electron 34.x repeats the 8.6 MB vs 244 MB numbers and reports a hello-world of 3.2 MB vs 85 MB. Idle memory ranges are around 30–50 MB for Tauri vs 200–300 MB for Electron. These appear to reuse Hopp's data and have no independent methodology. — [tech-insider](https://tech-insider.org/tauri-vs-electron-2026/)
- Real Windows installers: Tabularis (Tauri) at 12 MB vs Beekeeper Studio (Electron) at 201 MB. Different apps, so this is only indicative. — summarized via search results from [tech-insider](https://tech-insider.org/tauri-vs-electron-desktop-app-framework-2026/)
- Several comparison posts are unreliable. One DEV table compares Tauri 2.0 with Electron 25, which is a mismatched pairing. Treat all "X% faster" claims without methodology as marketing. — [DEV retrospective](https://dev.to/johalputt/retrospective-6-months-of-using-tauri-20-for-desktop-apps-60-smaller-installers-20-more-13m4)

**Tauri: native file access and gallery rendering**
- Tauri's asset protocol (`convertFileSrc`) is the recommended way to show local files in the WebView. It streams bytes outside the IPC channel, which makes it much faster than reading binaries through the fs API or IPC. It must be scoped in `app.security.assetProtocol` in `tauri.conf.json` and requires absolute paths. — [Tauri asset protocol scope docs](https://v2.tauri.app/zh-cn/security/asset-protocol/); [Tauri discussion #7145](https://WWW.GITHUB.COM/tauri-apps/tauri/discussions/7145)
- A Tauri example app reported that a 10 MB image takes about 90 ms to load through the asset protocol. Many videos on one page cause stutter, and "a real gallery view would require smart un-loading of media". — [tauri-vue-video-explorer](https://www.github.com/juxbo/tauri-vue-video-explorer)
- Bug report: videos larger than about 3.5 GiB crashed the asset protocol when seeking. — [tauri-asset-bug](https://github.com/mauritzn/tauri-asset-bug)

**Comparable reference-manager apps**
- **Allusion** (free, open-source visual reference manager for artists, GPL-3.0) is TypeScript + Electron. Builds are published to GitHub Releases on tag, and it has auto-update. Electron v21.3.0 was listed for 1.0.0-rc.10. The last push in one index snapshot was April 2024, so the project may be dormant. — [ecosyste.ms Allusion](https://awesome.ecosyste.ms/projects/github.com%2Fallusion-app%2FAllusion); [Desktop Insights](https://desktopinsights.com/apps/allusion)
- **Eagle.cool**: the official plugin API "is based on Chromium 107 and Node 16" and lets plugins use Node.js native APIs. Several methods are documented as "similar to Electron API's app.getAppIcon" and similar. This strongly implies Eagle runs on Electron, but the docs do not name Electron explicitly. — [Eagle developer docs](https://developer.eagle.cool/plugin-api/api/app); [Eagle Plugin API llms.txt](https://developer.eagle.cool/plugin-api/llms.txt)
- **Hydrus Network** is a Python application (Python 3.10–3.13 supported from source). A third-party scanner lists Qt as its UI framework (PySide/PyQt). It stores imported files in a "quickly accessible but human-ugly" internal store under `db/client_files`, which must be treated as strictly read-only. — [Hydrus running from source](https://hydrusnetwork.github.io/hydrus/running_from_source.html); [Desktop Insights](https://desktopinsights.com/apps/hydrus-network); [Hydrus getting started: files](https://hydrusnetwork.github.io/hydrus/getting_started_files.html)
- Hydrus docs suggest keeping thumbnails on an SSD and media on a larger HDD, so the thumbnail and blob directories should be separately relocatable. — [Hydrus docs mirror](https://git.redxen.eu/RepoMirrors/hydrus/src/commit/4a7f62798cc73322307dc964e5f8eb364e6a9673/help/getting_started_more_files.html) (secondary mirror, formatting issues)
- Hydrus v345 moved from separate "master" and "resized" thumbnails to a single, smarter thumbnail. This is a lesson for keeping the thumbnail tiers simple. — [Hydrus v345 release notes](https://newreleases.io/project/github/hydrusnetwork/hydrus/release/v345)

**Qt 6 licensing (C++ option)**
- Under LGPLv3 a closed-source app is allowed "as long as all the requirements of LGPLv3 are met". Qt recommends dynamic linking. With static linking, "the application itself may no longer be" a separate "work that uses the library". You must provide the complete Qt source (or a written offer) "even if the library has not been modified", allow users to "change and re-link the library", provide installation information (no tivoization), ship the LGPL text and a prominent notice, and avoid GPL-only Qt modules. Qt says some distribution channels such as app stores may conflict with the LGPL. — [Qt: Obligations of the GPL and LGPL](https://www.qt.io/development/open-source-lgpl-obligations)
- Qt for Small Business requires combined revenue and funding of no more than €1M (or USD) and no more than 3 developer licences. The official page lists €1,090/year for the DCP-SB licence. The older $250K cap and $499/yr launch price are outdated. Third-party price quotes conflict ($618/yr on ITQlick; $4–6K per developer per year desktop on Vendr, unverified). — [Qt for Small Business](https://www.qt.io/pricing/qt-for-small-business); [Qt Small Business terms 2026-01](https://www.qt.io/terms-conditions/qt-dev-framework/exhibit-small-business-2026-01); [Vendr](https://www.vendr.com/marketplace/qt)
- Forum consensus (not legal advice): dynamic linking against Qt DLLs keeps app source closed. Static linking is contested and usually done under a commercial licence. — [Qt forum](https://forum.qt.io/topic/31147/lgpl-static-linking)
- If the app itself is open source (GPL-compatible), as Allusion is, the LGPL obligations are trivial. — inference based on [Qt obligations page](https://www.qt.io/development/open-source-lgpl-obligations)

### Inferences
- **Dev speed** (fastest to slowest for this app): localhost web app (Python FastAPI or Node) > Electron > Tauri 2 > Avalonia/WinUI (.NET) > Qt 6 QML > Qt Widgets > Dear ImGui. Dear ImGui is immediate-mode and suited to tools and debug UIs. A 10k-thumbnail masonry gallery with text input, drag-and-drop, IME and accessibility would mean reinventing a lot (texture streaming, layout, focus management). I found no source evaluating ImGui for image galleries.
- **10k+ thumbnails**: the bottleneck in any web-UI stack is DOM node count and image decoding, not the framework. You need a virtualized grid (only visible rows in the DOM, such as TanStack Virtual or a custom masonry layout), small pre-generated thumbnails (around 256–400 px WebP/JPEG), and `loading="lazy"` / `decoding="async"`. With that, Tauri (via the asset protocol) and Electron (via a custom `protocol.handle` scheme or `file://`) both perform well. Qt QML `GridView` with an async `QQuickImageProvider` also handles this well natively. Unverified by benchmark: I found no 2024–2026 10k-thumbnail benchmark comparing the frameworks.
- **On Windows, Tauri's memory advantage over Electron is smaller than the macOS numbers suggest**, because WebView2 is itself Chromium. The installer-size advantage stays large because Tauri does not bundle Chromium (WebView2 ships with Windows 10/11).
- **Ecosystem maturity in 2026**: Electron is the most mature (VS Code, Slack, Eagle, Allusion). Tauri 2 has been stable since late 2024, has an official plugin workspace (updater, autostart, tray, fs, sql, stronghold, deep-link, single-instance) and is mature enough for this scope. Qt 6 is very mature but has the licensing overhead. Avalonia 11 and WinUI 3 are viable. WinUI 3 is Windows-only. Avalonia is cross-platform with a good virtualizing ItemsRepeater, and C# is productive. .NET is a reasonable aside if the developer knows C#, but its image-gallery ecosystem is thinner than the web's.
- **Localhost web app (e) caveats**: there is no installer or tray story out of the box. Users must open a browser. Port conflicts, CSRF and DNS-rebinding risks mean you must bind 127.0.0.1 and use a token. File-drag-out to other apps (PureRef-style workflows) does not work from a browser tab, and packaging Python for Windows (PyInstaller) has AV false-positive problems (general knowledge, not sourced here). It is good for an MVP or a headless "server mode", but not as the final product.

### Gaps
- No credible 2025–2026 benchmark measuring Tauri vs Electron **on Windows/WebView2** specifically, nor any 10k-image gallery benchmark across frameworks.
- PureRef and Raindrop stacks were not verified (PureRef is widely believed to be C++/Qt; Raindrop's desktop app is believed to be Electron. Both are unconfirmed).
- Eagle's exact Electron version and its storage layout were not confirmed. Its library is commonly described as a folder of per-item subfolders with `metadata.json` (unverified here).
- I did not research Avalonia/WinUI benchmarks or Dear ImGui gallery examples.

## Q2. Hybrid options: Rust/C++ core library + web UI; reusable sync engine across CLI and GUI

### Takeaway
Structure the code as a Cargo workspace (or a CMake library, for C++): a `core` crate (DB, blob store, connectors, sync engine, thumbnailer) with no UI dependencies, a `cli` binary, and a `tauri-app` binary. Both binaries call the same `core::sync::run(config)` API. This is the strongest argument for Tauri over Electron: the "core" is real native code that can also run headless from Task Scheduler.

### Cited Findings
- Tauri's recommended pattern for local files is for a Rust command to validate or return a path, with the frontend then calling `convertFileSrc`. The Rust side owns file-system policy and the UI only renders. — [Tauri asset protocol skill/guide](https://stuffbucket.github.io/skills/catalog/tauri-security-asset-protocol/) (community guide)
- The Tauri autostart plugin accepts launch arguments (for example `--minimized`). PictoPy uses it to start minimized to the tray at boot and to hide the window on close. — [PictoPy PR #1301](https://github.gg22.workers.dev/AOSSIE-Org/PictoPy/pull/1301); [Tauri autostart docs](https://v2.tauri.app/plugin/autostart)

### Inferences
- **Recommended layout (Rust):** `crates/core` (rusqlite or sqlx, reqwest, tokio, `image`/`fast_image_resize` or libvips bindings, `keyring`), `crates/connectors/*` (are.na, others), `apps/cli` (clap: `gather --source arena --once`), and `apps/desktop` (Tauri; commands are thin wrappers; progress is reported through Tauri events). The DB schema and migrations live in `core`, so CLI and GUI can never drift.
- **Electron equivalent:** a pure TypeScript `core` package (better-sqlite3, undici, sharp) used by both the Electron main process (or a `utilityProcess`) and a Node CLI. This works, but the CLI requires Node on the machine or a second bundled runtime.
- **C++ equivalent:** a static `libgatherer` (libcurl, SQLite amalgamation, libvips) with a Qt UI and a separate console exe. This is the same idea with more build and dependency friction on Windows (vcpkg helps).
- **Concurrency between CLI and GUI:** if both can run at once, use SQLite WAL plus a lock file or named mutex (`Global\` is not needed; per-session is fine) so only one sync runs at a time. The GUI can watch the DB (or poll `sync_runs`) to refresh when the CLI finishes.

### Gaps
- I found no published case study of a Tauri app that shares a sync core with a standalone CLI. The pattern is standard Rust workspace practice but has no source here.

## Q3. Local storage: SQLite + FTS5, content-addressed blobs, sidecars, thumbnails, human-browsable layout

### Takeaway
Use SQLite (WAL) as the source of truth for metadata, tags, sources and sync state. Add FTS5 (unicode61 for words, plus an optional trigram table for substring search) for full-text search. Use a content-addressed blob store (`blobs/ab/cd/<sha256>.<ext>`) for dedup, a separate thumbnail cache directory, and optional per-item sidecar JSON written as an export or backup rather than as the source of truth. Make the human-browsable "per-channel folder" view a generated export using hardlinks, because symlinks on Windows need Developer Mode or admin.

### Cited Findings
- FTS5's trigram tokenizer "extends FTS5 to support substring matching in general". It is labelled experimental and is available from SQLite 3.34.0. — [SQLite FTS5 docs](https://sqlite.org/fts5.html); [StackOverflow via kiwix](https://kiwix.lema.org/stackoverflow.com_en_all_2023-11/a/69617851)
- With external-content FTS5 tables, the application or triggers must keep the index in sync. Run the `rebuild` command after bulk-loading the content table. — [SQLite forum](https://sqlite.org/forum/forumpost/948f1d4208?t=c); [xqlite FTS guide](https://xqlite.hexdocs.pm/full_text_search.html)
- A forum report described a trigram external-content FTS5 table returning no results on SQLite 3.34.1 while a normal table worked. The thread has no confirmed resolution, so test your SQLite version. — [SQLite forum](https://sqlite.org/forum/forumpost/948f1d4208cc5326?raw)
- Hydrus keeps imported files in a content-addressed internal store (`db/client_files/[hash].ext`) that the user must not edit. It notices edits "and assume[s] it was hard drive damage". — [Hydrus getting started: files](https://hydrusnetwork.github.io/hydrus/getting_started_files.html); [Hydrus docs mirror](https://git.redxen.eu/RepoMirrors/hydrus/src/commit/4a7f62798cc73322307dc964e5f8eb364e6a9673/help/getting_started_more_files.html)
- **Thumbnailing performance (official sharp/libvips benchmark, current: sharp 0.35.0 / libvips 8.18.2, Node 24, 4-vCPU EC2):** JPEG 2725×2225 → 720×588: sharp about 89.6 ops/s vs ImageMagick 16.2, gm 21.0, jimp 3.4 (AMD64). PNG: sharp 47.7 vs ImageMagick 10.4. That makes sharp about 4.5–26× faster than the alternatives, with libvips caching disabled. — [sharp performance](https://sharp.pixelplumbing.com/performance)
- libvips' `thumbnail` operation uses shrink-on-load (for example, JPEG DCT scaling), which is the main speed lever for thumbnails. — [libvips blog post](https://tonisagrista.com/blog/2023/libvips/) (secondary)
- No credible head-to-head of libvips vs Rust `image` / `fast_image_resize` was found. One blog's claim (sharp ~800 img/s vs Rust image ~600 img/s) has no methodology. — [pkgpulse](https://www.pkgpulse.com/guides/best-javascript-image-processing-2026)
- **Windows links:** since Windows 10 1703, symlinks can be created without admin only when Developer Mode is enabled and the caller passes `SYMBOLIC_LINK_FLAG_ALLOW_UNPRIVILEGED_CREATE`. Otherwise `SeCreateSymbolicLinkPrivilege` (admin) is required. Go, PowerShell and others have hit "A required privilege is not held by the client". — [Microsoft Windows blog](https://blogs.windows.com/buildingapps/2016/12/02/symlinks-windows-10/); [CPython commit](https://lab.nexedi.com/kirr/cpython/-/commit/0e10766574f4e287cd6b5e5860a1ca75488f4119); [Go issue 22874](https://golang.org/issue/22874)

### Inferences
- **Suggested schema:** `items(id, sha256, mime, bytes, width, height, title, description, created_at, imported_at)`, `sources(id, item_id, connector, remote_id, remote_url, source_url, remote_updated_at, etag, raw_json)`, `collections(id, connector, remote_id, title, slug)` (Are.na channels), `item_collections(item_id, collection_id, position)`, `tags(id, name)`, `item_tags`, `thumbnails(sha256, size, path)`, `sync_state(connector, scope, cursor, last_success_at)`, `jobs(...)`, `sync_runs(...)`. FTS5 table `items_fts(title, description, tags, source_text, content='items_view')` with triggers. Store the raw API JSON so you can re-derive fields later without re-fetching.
- **Content addressing:** hash while streaming the download to a temp file in the same volume, then do an atomic rename to `blobs/<h[0:2]>/<h[2:4]>/<sha256>.<ext>`. If the hash already exists, discard the temp file (dedup). Same-volume rename is atomic on NTFS (`MoveFileEx` with replace). Two-level fan-out keeps directories small (Git and Hydrus use similar ideas).
- **Sidecar JSON vs DB-only:** DB-only is simpler and faster. Sidecars (Eagle-style `metadata.json`) improve longevity and manual recovery, in line with the Ink & Switch "longevity / user ownership" ideals. A good compromise is DB as the source of truth plus an "Export library" or nightly "write sidecars" job, so there are never two writers.
- **Human-browsable view:** generate `Library/Channels/<channel-slug>/<position>-<title>.<ext>` as **NTFS hardlinks** to the blobs. Hardlinks need no admin rights but must be on the same volume, and an edit through one link mutates the canonical blob. You could also use plain copies or `.url` shortcuts. Symlinks need Developer Mode, so avoid them as a default. Hardlink behaviour is general knowledge, not verified by a source here.
- **Thumbnail choice by stack:** Electron → sharp (libvips, prebuilt Windows binaries). Tauri/Rust → `image` + `fast_image_resize` (pure Rust, easy to build on Windows) or `libvips` bindings (fastest, but DLL distribution needed). Qt → `QImageReader::setScaledSize` (uses JPEG scaled decode) or libvips. Generate 2 sizes at most (for example 256 and 1024 px) as WebP or JPEG, keyed by sha256, so duplicates share thumbnails. Use WIC on Windows for HEIC/RAW if needed.

### Gaps
- I did not verify Eagle's on-disk library format or Allusion's DB (Allusion is believed to use IndexedDB/Dexie in the renderer, unverified).
- No authoritative libvips vs fast_image_resize benchmark exists. The user should benchmark on their own images.

## Q4. Sync engine design: incremental sync, job queue, concurrency, retries, resumability, idempotency, connectors

### Takeaway
Build a durable, DB-backed job queue (`jobs` table) with two phases: **metadata sync** (paginate the remote API, upsert sources and items, enqueue downloads) and **asset fetch** (download, hash, thumbnail). Use per-connector rate limiters sized from the API's published limits, exponential backoff with jitter that honours `Retry-After` on 429/5xx, and idempotent upserts keyed on `(connector, remote_id)`. Are.na's v3 API publishes tiered rate limits and paginated, sortable endpoints, but it may not offer an `updated_since` filter on channel contents, so plan for "walk until unchanged" incremental logic.

### Cited Findings
- **Are.na v3 rate limits per minute:** Guest 30, Free 120, Premium 300, Supporter/Lifetime 600. Responses include limit and tier headers with a 60-second window. **304 responses still count against the limit.** The docs advise caching and avoiding eager fetching. — [Are.na llms-full.txt](https://are.na/llms-full.txt); [Are.na developers](https://www.are.na/developers/all.md)
- `GET /v3/channels/{id}/contents` is paginated with `page`/`per` (max 100). Sort is `position` (owner's manual order) or date, and the default is `position_desc`. The user contents endpoint can sort by created or updated time. The feed uses cursor pagination (`next_cursor`). — [Are.na channel contents](https://www.are.na/developers/explore/channel/contents); [Are.na user contents](https://www.are.na/developers/explore/user/contents); [Are.na feed](https://www.are.na/developers/explore/feed.md)
- A third-party directory still cites about 60 req/min for v2, which is likely outdated. — [Jentic](https://jentic.com/apis/are.na/are-na)

### Inferences
- **Incremental strategy for Are.na:** for each followed channel, store `channel.updated_at` and the item count. On sync, fetch the channel metadata first. If `updated_at` is unchanged, skip it. Otherwise page through contents sorted by date desc and stop when a whole page consists of blocks already seen with unchanged `updated_at`. Run a full reconcile occasionally (for example weekly) to detect removals and reorders. Send `If-None-Match`/`If-Modified-Since` where supported, but because 304s still cost quota, the main saving is bandwidth, not rate budget.
- **Job queue:** `jobs(id, kind, connector, payload_json, dedupe_key UNIQUE, state[queued|running|done|failed|dead], attempts, next_run_at, last_error, created_at, updated_at)`. Workers claim jobs with `UPDATE ... WHERE state='queued' AND next_run_at<=now ... RETURNING`. Use a `dedupe_key` such as `download:<connector>:<remote_id>:<url-hash>` for idempotency. On startup, reset `running` jobs to `queued` (crash recovery).
- **Concurrency:** use separate semaphores for API calls (for example 2–4, plus a token bucket at about 80% of the tier limit) and asset downloads (for example 4–8; assets usually come from a CDN or S3, not the rate-limited API). Thumbnailing runs on a CPU pool of `num_cpus - 1`.
- **Retries:** retry on 429, 500–504 and network errors with `delay = min(cap, base * 2^attempt) * random(0.5..1.0)`. Honour `Retry-After` and the rate-limit headers when present. Do not retry other 4xx errors (mark them as dead, surface them in the UI). Use a circuit breaker per connector after N consecutive failures.
- **Resumable downloads:** download to `tmp/<job-id>.part`, then send `Range: bytes=<size>-` with `If-Range: <etag>` on retry. If the server returns 200 instead of 206, restart. Verify Content-Length, hash, then do an atomic rename into the blob store. Commit the DB row only after the rename (write-ahead order: file first, then DB, so orphans can be garbage-collected by scanning blobs not referenced in the DB).
- **Connector interface (Rust trait sketch):** `fn id()`, `async fn list_scopes(&self, auth)` (channels, boards), `async fn sync_scope(&self, scope, cursor, sink: &mut dyn ItemSink) -> NewCursor`, `fn normalize(raw) -> RemoteItem {remote_id, kind(image|link|text|attachment|media), asset_urls, title, description, tags, source_url, remote_updated_at, raw}`, plus `rate_limit_policy()`. Keep connectors stateless: the engine owns persistence, retries and scheduling. Out-of-process plugins (WASM or subprocess JSON-RPC) are possible later, but compile-time connectors are simpler to start with.
- **Link blocks:** store the URL plus the provider's preview image (Are.na supplies images for link blocks). Optionally capture page HTML or screenshots later as a separate job kind.

### Gaps
- I could not confirm from the Are.na docs whether channel contents can be filtered by `updated_at` or whether ETags are issued. Another researcher covering the Are.na API should confirm.
- I found no specific source on Are.na asset CDN rate limits.

## Q5. Launch-time and scheduled gathering on Windows

### Takeaway
Default to an **in-process background worker started on app launch** (non-blocking: the UI opens immediately from the local DB while sync runs), optionally a **tray-resident mode with autostart** (HKCU Run key via the Tauri autostart plugin) for periodic syncs while the app is "closed", and offer **"schedule even when the app isn't running"** by registering a Windows Task Scheduler task that invokes the headless CLI. Do not build a Windows Service. Per-user tokens and a per-user library make a service the wrong fit.

### Cited Findings
- The Tauri 2 official autostart plugin supports Windows, macOS and Linux. On Windows it writes to `HKCU\Software\Microsoft\Windows\CurrentVersion\Run` and needs the `autostart:allow-enable/disable/is-enabled` capabilities. It accepts launch args such as `--minimized`. — [Tauri autostart plugin](https://v2.tauri.app/plugin/autostart); [Zap Studio docs](https://www.zapstudio.dev/docs/local-ts/autostart)
- Tauri 2 tray uses `TrayIconBuilder` with the `tray-icon` feature. PictoPy shows the pattern: start minimized at boot, hide on close, and a tray menu with Show and Quit (tested on Windows). — [PictoPy PR #1301](https://github.gg22.workers.dev/AOSSIE-Org/PictoPy/pull/1301)

### Inferences
- **Pros and cons:**
  - *On app start (worker thread or tokio task):* simplest. Sync only happens when the user uses the app. Fine for an MVP.
  - *Tray app with autostart plus an interval timer:* near-continuous gathering and visible status. Costs memory while resident (Tauri with the window hidden is light; Electron less so). Some users dislike tray clutter.
  - *Task Scheduler + CLI (`schtasks /Create /SC HOURLY /TR "gatherer.exe gather --quiet"` or the Task Scheduler COM API):* runs without the GUI, survives reboots, supports "run when on AC / network available / wake". Downsides: you need a way to register and unregister the task from the GUI, the console window flashes unless you build with the Windows GUI subsystem or launch via a no-window stub, and the GUI and CLI must coordinate via a mutex.
  - *Windows Service:* runs as a different account, can't easily reach the user's Credential Manager entries, and needs admin to install. Not recommended.
- Use a single-instance guard (Tauri `single-instance` plugin or a named mutex) so that "launch on start" plus "scheduled task" don't run two syncs at once.

### Gaps
- No source was gathered on Task Scheduler API usage from Rust or Node, or on the console-flash workaround. These are general-knowledge items.

## Q6. Secure storage of API tokens on Windows

### Takeaway
Store the Are.na token (and other source tokens) in **Windows Credential Manager** via the Rust `keyring` crate (Tauri), or use Electron's `safeStorage` (DPAPI-based). Both protect against other users on the machine, not against other processes running as the same user, which is acceptable for a personal API token. Tauri's Stronghold plugin is still officially listed but is overkill for one token.

### Cited Findings
- Electron `safeStorage`: "On Windows, encryption keys are protected via DPAPI". This protects content from other users on the same machine but not from other apps in the same userspace. The synchronous API is deprecated and slated for removal in Electron 46. Use the async `decryptStringAsync` and related calls. — [Electron safeStorage docs](https://electronjs.org/docs/latest/api/safe-storage)
- The Tauri Stronghold plugin (IOTA Stronghold engine) is still documented without a deprecation notice on the v2 docs page. Crate versions 2.2.x–2.3.x exist. — [Tauri Stronghold plugin](https://v2.tauri.app/plugin/stronghold/); [docs.rs tauri-plugin-stronghold](https://docs.rs/tauri-plugin-stronghold)
- Community alternatives: `tauri-plugin-keyring-store` (OS credential store backed, supports Windows Credential Manager, mirrors the Stronghold API) and `tauri-plugin-keyring` (simple get/set/deletePassword). One developer chose the `keyring` crate over Stronghold for API tokens and warns: "Pick a stable name and don't change it later" (the service/account name). — [docs.rs tauri-plugin-keyring-store](https://docs.rs/tauri-plugin-keyring-store); [tauri-plugin-keyring](https://github.com/HuakunShen/tauri-plugin-keyring); [DEV: Jira time tracker with Tauri](https://dev.to/jorrygo_dev/building-a-jira-time-tracker-with-tauri-how-i-stored-api-tokens-securely-46aj)
- Conflicting info: some community sources suggest Stronghold is being phased out, but **I found no official deprecation notice** as of this research. Treat the claim as unconfirmed. — [Tauri Stronghold plugin](https://v2.tauri.app/plugin/stronghold/)

### Inferences
- Python's `keyring` and Qt's `QtKeychain` (C++) both wrap Windows Credential Manager, and .NET can call DPAPI `ProtectedData` directly. Every stack has a mature option.
- Tokens must never go in SQLite in plaintext or in sidecar exports. The headless CLI run by Task Scheduler runs as the same user, so it can read the same Credential Manager entry. This is another reason to avoid a Windows Service.
- Prefer Are.na personal access tokens or OAuth with refresh, and store refresh tokens the same way.

### Gaps
- I did not verify Credential Manager blob size limits (believed to be about 2.5 KB per credential, which is fine for tokens) or Electron's async key-provider behaviour on Windows.

## Q7. Packaging, signing, auto-update, testing and CI on GitHub Actions (Windows)

### Takeaway
Tauri 2 ships NSIS/MSI installers, an official updater with mandatory signature verification (a separate key from Authenticode), and documented Windows signing (OV certificate, Azure Key Vault via relic, or a custom `signCommand` that the community uses with Azure Trusted Signing). For tests, use VCR-style cassettes (`rvcr` for reqwest; vcrpy for Python; Polly/nock for Node), plus a local mock server for retry and 429 scenarios, and run everything on `windows-latest` in GitHub Actions.

### Cited Findings
- Official Tauri Windows signing docs cover OV certificates and Azure Key Vault (via relic). Community guides wire **Azure Trusted Signing** through `bundle.windows.signCommand` with `trusted-signing-cli ... %1`. — [Tauri Windows Code Signing](https://v2.tauri.app/distribute/sign/windows/); [DEV: Ship your Tauri v2 app like a pro](https://dev.to/tomtomdu73/ship-your-tauri-v2-app-like-a-pro-code-signing-for-macos-and-windows-part-12-3o9n)
- Trusted Signing was reported at $9.99/month, with immediate eligibility limited to US/Canada organisations with 3+ years of history. This comes from a single secondary source and needs verification against Microsoft's current terms. — [moklabs research](https://moklabs-research.pages.dev/reports/technology/2026-03-19-tauri-2x-desktop-distribution)
- The Tauri updater requires its own signing key pair (`TAURI_SIGNING_PRIVATE_KEY` plus password in CI), separate from Authenticode. Verification is mandatory. — [moklabs research](https://moklabs-research.pages.dev/reports/technology/2026-03-19-tauri-2x-desktop-distribution)
- Allusion (Electron) publishes builds to GitHub Releases on tag and supports auto-update. This is the common electron-builder + electron-updater pattern. — [ecosyste.ms Allusion](https://awesome.ecosyste.ms/projects/github.com%2Fallusion-app%2FAllusion)
- Rust record/replay options: `rvcr` (reqwest-middleware, JSON cassettes, replays by default, optional bzip2), `reqwest-vcr`, `http-client-vcr` (Record/Replay/Once modes, YAML), and `httpmock` (record-and-playback into a mock server). — [rvcr](https://docs.rs/crate/rvcr/0.1.3/source/README.md); [reqwest-vcr](https://docs.rs/crate/reqwest-vcr/0.3.0/source/README.md); [http-client-vcr](https://docs.rs/crate/http-client-vcr/1.0.0); [httpmock playback](https://httpmock.rs/record-and-playback/playback/)
- The Ruby VCR design is the reference that these libraries (and Python's vcrpy) follow. — [vcr/vcr](https://github.com/vcr/vcr)
- Tauri's first build is much slower than Electron's because of Rust compilation (80 s vs 16 s in one test), which matters for CI time. Cache `~/.cargo` and `target`. — [Hopp / DEV](https://dev.to/gethopp/tauri-vs-electron-performance-bundle-size-and-the-real-trade-offs-1el4)

### Inferences
- **Test layers:**
  1. Pure unit tests for normalisation (raw Are.na JSON → `RemoteItem`) using saved fixtures.
  2. Cassette tests for connectors (record once with a real token, scrub `Authorization` headers, commit cassettes).
  3. Engine tests against a programmable mock server (wiremock-rs or httpmock) to inject 429 with `Retry-After`, 503 bursts, truncated bodies for resume tests, and duplicate items for idempotency tests.
  4. Storage tests on a temp dir (hash, dedup, crash in the middle of a rename).
  5. A thin UI E2E layer (Tauri supports WebDriver via `tauri-driver` on Windows; Electron uses Playwright).
  Run property tests for "sync twice = no changes".
- **GitHub Actions:** `runs-on: windows-latest`, use `tauri-apps/tauri-action` to build and upload release artefacts and the updater JSON (`latest.json`) to GitHub Releases. Store signing secrets in an environment with required reviewers. Run tests on `windows-latest` plus optionally `ubuntu-latest` for speed. Electron's equivalent is electron-builder with `--publish`.
- **SmartScreen:** unsigned or new-cert installers trigger SmartScreen warnings. OV certs no longer give instant reputation, while Trusted Signing or EV builds it faster (general knowledge, not verified here). For a personal app this is just a nuisance.

### Gaps
- I did not fetch the official `tauri-action` docs or the electron-builder/electron-updater docs. I did not verify current Azure Trusted Signing pricing or eligibility directly from Microsoft.
- I did not research Electron's 2026 release cadence or the latest version number.

---

### Summary recommendation for the report writer (synthesis of the above)
1. **Stack:** Tauri 2 + Svelte or Solid (or React if already known) + a Rust workspace core. The runner-up is Electron + TypeScript + better-sqlite3 + sharp, if the developer doesn't want to learn Rust: faster to ship and the same stack as Allusion and Eagle. Choose Qt 6 QML only if a C++/native UI is itself the goal, and then accept LGPL dynamic-linking obligations or €1,090+/yr. Avoid Dear ImGui for this product, and use the localhost web app only as a prototype.
2. **Storage:** SQLite WAL + FTS5 (+ trigram), content-addressed `blobs/ab/cd/sha256.ext`, a sha256-keyed thumbnail cache (2 sizes), and an optional hardlink-based "browsable export" and sidecar JSON export.
3. **Sync:** a DB-backed job queue, two phases (metadata → assets), per-connector token-bucket limits (Are.na: 120/min free tier), backoff with jitter that honours `Retry-After`, `.part` files + Range resume, `(connector, remote_id)` idempotent upserts, and a connector trait.
4. **Scheduling:** sync on launch in the background, an optional tray + autostart interval, and an optional Task Scheduler entry that calls the CLI. Use a named-mutex single-run guard.
5. **Secrets:** Windows Credential Manager via `keyring` (or Electron `safeStorage` async).
6. **Ship:** NSIS installer, Tauri updater on GitHub Releases, Azure Trusted Signing or OV cert, GitHub Actions on `windows-latest`, and rvcr cassettes + wiremock fault injection.
