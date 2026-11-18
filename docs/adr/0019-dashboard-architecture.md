---
status: proposed
date: 2026-11-18
decision-makers: owner
consulted: admin pass
informed: —
---

# ADR-0019: Dashboard architecture (`lemuse serve`)

## Context

The owner wants LeMuse on "different monitors or dashboards" and in pipelines (ADR-0016). The mini player covers
a second monitor on the same PC. Dashboards are other programs that show a web page or poll a URL:
- OBS browser sources;
- Home Assistant iframe cards;
- Grafana text panels;
- a wall screen, or a phone on the same Wi-Fi;
- Stream Deck plugins and scripts.

## Decision (plan; built in v0.11)

**One small read-only server inside the core**, started by `lemuse serve` (or a Settings switch in the app),
sharing the catalog with everything else.

```text
 Dashboard (OBS, Home Assistant, browser, script)
        │  HTTP GET, token in header or URL fragment
        ▼
 lemuse serve ── 127.0.0.1:47555 (default; LAN only by opt-in)
   ├─ GET /                      → the dashboard page (the same React SlideshowView, built as its own bundle)
   ├─ GET /api/v1/status          → {"lemuse":1, …} same envelope as the CLI --json
   ├─ GET /api/v1/topics          → topics with counts
   ├─ GET /api/v1/slides?source=all|topic:<name>|playlist:<id>&filter=…&page=N
   ├─ GET /api/v1/now?source=…    → the current slide for "now showing" widgets
   └─ GET /api/v1/events          → Server-Sent Events: refresh finished, new images
        │
        ▼
 lemuse-core: Catalog (read-only connection), categories, config
```

- **Read-only.** No endpoint changes anything: no add, delete or refresh. A refresh stays in the app, the CLI or
  the schedule. This keeps the attack surface to "someone can see your reference list".
- **Local by default.** Binds `127.0.0.1`. LAN access (wall screen, phone) is an explicit opt-in that prints the
  address and token. It's never `0.0.0.0` silently.
- **Token.** A random 128-bit token is created on first run and stored in Credential Manager. It's required on
  every request: an `Authorization: Bearer` header, or `#token=` in the URL fragment for the page, which never
  reaches server logs.
- **Browser hardening:**
  - strict CSP on the page, with the same image hosts as the app;
  - no CORS (same-origin only);
  - `Host` header checked against the bound address, against DNS rebinding;
  - responses are JSON or the static bundle only.
- **Images still stream** from the source CDNs. The server never proxies or caches image bytes (ADR-0009).
- **Same JSON shapes as the CLI** (`docs/automation.md`), so scripts move between `lemuse … --json` and HTTP
  without changes.
- **Implementation:** a small, maintained HTTP crate, chosen in that PR under the 14-day cooldown and the audit
  gate (e.g. `tiny_http`, synchronous and small). It runs on its own thread in the app or as the `serve` process.
- **Webhooks (outbound):** a separate option. After a refresh, POST a small JSON summary to URLs the user lists:
  Discord, Slack, Home Assistant. HTTPS only, the summary only, never tokens.

## Options considered

| Option | Verdict |
|---|---|
| **Local read-only server + page (chosen)** | Works with every dashboard that can show a URL; small surface |
| Static HTML export on a schedule | Simple, but no live updates and stale files; kept as a GitHub Action idea for public walls |
| Write endpoints (remote control) | Rejected for now: turns a viewer into something an attacker on the LAN could drive |
| Cloud relay | Rejected: sends the owner's data off the machine; costs money |

## Security review items for the build PR

- token storage and comparison (constant time);
- Host and Origin checks; bind address;
- rate limit per client;
- a fuzz test of the query parsing;
- no path traversal: only the built bundle is served, by an exact path list.
