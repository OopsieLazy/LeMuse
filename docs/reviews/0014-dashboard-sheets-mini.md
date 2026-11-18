# Review 0014: Dashboard, reference sheets, mini player v2, whole channel now

- **Branch:** `feat/0014-dashboard-sheets-mini` (stacked on #13) · **ADRs:** 0019 (built in part), 0020 and 0021
  (plans and sheets)
- **Passes:** Claude ran both passes on 2026-11-18. The commit hook's admin agent reviews each commit too.

## Admin / architect pass

| ID | Severity | Finding | Resolution |
|---|---|---|---|
| A-69 | high | A new listening socket (`lemuse serve`) | Loopback by default. A 256-bit token is needed for every `/api/*` call, compared in constant time. `Host` is checked on loopback (DNS rebinding). GET and HEAD only, read-only handlers, and static files from an in-memory allow-list, so no traversal. Strict CSP and `nosniff`; connection cap 32; read timeout 5 s. Errors never include paths. Proven live: no token → 401, foreign Host → 421, `/../` → 404, POST → 405 |
| A-70 | med | `--lan` serves plain HTTP on the network | Opt-in only. It prints a warning that the token travels unencrypted, and the docs say trusted Wi-Fi only and never forward the port (ADR-0020) |
| A-71 | low | New direct dependency `getrandom` 0.2.17 | Already in `Cargo.lock` via rustls/ring, so no new code is downloaded and the release is far past the 14-day cooldown. `cargo audit`: 0 vulnerabilities (6 known warnings via Tauri, unchanged) |
| A-72 | low | The dashboard page may be framed (no `X-Frame-Options`) | Needed for OBS and Home Assistant iframes. The page is read-only, so clickjacking gains nothing |
| A-73 | low | The token is printed and sits in the URL fragment | The fragment is never sent in requests and the server logs nothing; the token is in an `Authorization` header to the same origin only. It's random per run unless the user sets `LEMUSE_SERVE_TOKEN` |
| A-74 | med | The sheet turns remote text into HTML | Every string is escaped (`& < > " '`, control characters dropped); only https links without credentials; a CSP meta tag allows images from the source hosts only; no scripts. Tested (`sheet_escapes_remote_text_and_keeps_https_only`); a real sheet passes the W3C checker |
| A-75 | info | A sheet opened in the user's own browser caches its images there | Outside LeMuse's InPrivate WebView; LeMuse itself writes no image bytes. Documented in ADR-0021 |
| A-76 | info | `sync --full` and 10,000-item adds read much more | User-started, still throttled at 80% of the tier with `Retry-After`; user-chosen channels only (ADR-0017) |
| A-77 | info | The hosted web app, mailer and pin automation are plans | Owner questions Q21 (host on the friend's domain), Q22 (mail account), Q23 (talk to Are.na before public or paid) |

## Developer pass

| ID | Severity | Finding | Resolution |
|---|---|---|---|
| D-77 | low | At phone width the narrow-window layout rules overrode mini mode, so the ☰ menu ran off the bottom (layout test) | **Fixed:** the docked narrow rules exclude `data-mini` |
| D-78 | low | The dashboard page loads the newest 300 images per topic, so its All view is smaller than the app's | Register: page through `/api/v1/slides` in the page |
| D-79 | info | One thread per connection with a 5 s timeout: slow clients hold a slot | Capped at 32; local use. Fine |
| D-80 | info | The app doesn't start the dashboard yet, and the token isn't kept between runs | Register: Settings switch; token in Credential Manager with the v0.8 token work. `LEMUSE_SERVE_TOKEN` gives a stable one now |
| D-81 | low | The mini window drags only from the bottom bar now (a tap on the image toggles the bar) | Documented in the PR; a drag on the image would swallow the tap |
| D-82 | info | Dashboard data refreshes by polling `/api/v1/status` every 5 minutes | Simple; live events later |

- [x] 94 tests (9 new):
  - serve: parsing (methods, oversize, duplicate Host, bad bytes), tokens, auth and Host, static allow-list,
    input checks on `/slides`, a real socket round trip;
  - sheets: escaping, https only, stable picks, calendar.
- [x] Live run on a copy of the owner's library: API answers (8,108 images, 250 for `topic:Wood objects` +
  `wood`), the page renders the live topics in headless Edge (images off, throwaway profile), and a 24-image
  sheet is valid HTML and the same for the same day.
- [x] W3C 47 files, 0 errors · layout 45 states × 5 sizes = 225 renders passed · clippy `-D warnings`, fmt.
