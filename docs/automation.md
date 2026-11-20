# Automation with the `lemuse` CLI

Every command accepts `--json` and then prints exactly **one** JSON document on stdout (ADR-0017):

```json
{ "lemuse": 1, "command": "status", "ok": true, "data": { … } }
```

On failure, `ok` is `false`, `code` is a stable error code (ADR-0024), `error` holds the message for people,
and the exit code says the same as `code`:

```json
{ "lemuse": 1, "command": "slides", "ok": false, "code": "not_found", "error": "no topic named `Nope`" }
```

| `code` | Meaning | Exit code |
|---|---|---|
| `invalid` | Bad input or a bad `lemuse.toml` | 3 |
| `not_found` | No such topic, playlist, channel or image | 4 |
| `busy` | Another refresh holds the library (try again later) | 5 |
| `rate_limited` | A source asked LeMuse to slow down | 6 |
| `network` | Can't reach a source, or it answered 5xx (worth retrying) | 7 |
| `source` | A source answered with a problem (a private channel, odd data) | 8 |
| `token` | The Are.na token was refused or can't be read | 9 |
| `io`, `catalog` | Files or the database in the library | 10 |
| `unsupported` | Not built yet | 1 |

Exit code 2 means the command line itself was wrong (unknown command or flag). Codes are only ever added, never
renamed.

`lemuse` is the envelope version. It changes only for breaking changes; new fields may appear at any time. Use
`--library <folder>` or `LEMUSE_LIBRARY` to pick a library.

## Commands and their `data`

| Command | `data` |
|---|---|
| `status` | `{ root, schema, blocks, loading: [{ collection, images_so_far }] }`: `loading` lists channels still filling in |
| `topics` | `[{ name, images, slide_seconds, shuffle, keywords, sources: [{ source, key }] }]` |
| `slides "<topic>" [--limit N]` | `[Slide]`: `{ block_id, title, display_url, width, height, page_url, creator, attribution, saved, categories, connector, original_url, fallback_urls }` |
| `search "<words>"` | `{ query, block_ids }` |
| `sync [--trigger cli\|schedule]` | `{ targets_seen, targets_skipped, targets_recent, blocks_upserted, blocks_unchanged, files_stored, errors, notes? }`; `notes` appears when there is something to know, such as a refused Are.na token |
| `add-channel <link> --topic <name> [--new-topic]` | `{ added: { topic, channel: { slug, title, contents }, added }, refresh: <sync summary> \| null }` |
| `preview-channel <link>` | `{ channel: { slug, title, contents }, items: [{ title, image_url, kind }] }` |
| `related <block-id> [--page N]` | `{ channels: [{ slug, title, owner, contents }], total, next_page }` |
| `export-links [--topic T \| --playlist P]` | `[{ block_id, connector, title, creator, page_url, origin_url, images: [[role, url]] }]` |
| `init` | `{ root, config }` |
| `sheet [--topic T \| --playlist P] [--count N] [--seed S] [--show-nudity]` | `{ heading, seed, count, html }` (without `--json`: the HTML itself). Hidden images never appear; likely nudity only with `--show-nudity` (ADR-0027) |
| `sync --full` | Same as `sync`, reading every channel to its end |
| `save <block-id> [--topic T \| --playlist P]` | `{ block_id, view, bytes, already_stored }`; `view` is relative to the library |
| `arena-token status` | `{ saved, account }` (never the token) |
| `arena-token set` | `{ slug, name, tier }` once Are.na accepts it. Reads the token from the terminal (hidden) or a pipe, never an argument |
| `arena-token check` | `{ slug, name, tier }` when Are.na still accepts the saved token (one read); code `token` if not |
| `arena-token following [--page N]` | `{ channels: [{ slug, title, owner, contents }], total, next_page }`: channels your account follows (one read) |
| `arena-token clear` | `{ removed }` |
| `import-following [--topic T \| --match] [--dry-run]` | `{ followed, already, dry_run, planned: [{ slug, title, topic }], added: [{ slug, title, topic, added }] }`: adds the channels you follow that aren't in a topic yet, each as **its own topic** named after the channel, under "Following on Are.na" (or all into `--topic`, or each into its best-matching topic with `--match`). One read per page of the list, nothing else; run `sync` after (ADR-0026) |
| `remove-channel <slug> --topic T` | `{ removed }`: takes an Are.na channel out of a topic; its images stay in playlists |
| `remove-topic <name> [--with-channels]` | `{ removed }`: removes a topic; without `--with-channels` only one with no channels or keywords left |
| `rename-topic <from> <to>` | `{ renamed, name }`: renames a topic (the new name must be free) |
| `update-check` | `{ current, latest: { version, name, url, published_at, newer } \| null }`: one request to GitHub's Releases API, no token; nothing is downloaded (ADR-0028) |
| `preview-data` | Always JSON (for the UI preview), without the envelope |

Without `--json`, `export-links --format csv|json|txt` writes a CSV (escaped and guarded against formula
injection), JSON rows, or one image link per line.

## Recipes

### Refresh while the app is closed (Windows Task Scheduler)

The app already refreshes on launch and every 60 minutes while it runs (`sync.interval_minutes`, 0 = off). For
the hours it's closed:

```powershell
# Create a task that refreshes every 3 hours (runs as you, only when you're logged on)
schtasks /Create /SC HOURLY /MO 3 /TN "LeMuse refresh" /TR "\"C:\path\to\lemuse.exe\" sync --trigger schedule"
# Remove it again
schtasks /Delete /TN "LeMuse refresh" /F
```

The installer doesn't ship `lemuse.exe` yet (register D-75). Until it does, build it with
`cargo build --release -p lemuse-cli` and point `/TR` at `target\release\lemuse.exe`.

### PowerShell: new images since the last refresh

```powershell
# Refresh and read the summary
$r = lemuse sync --json | ConvertFrom-Json
# Stop if the refresh failed
if (-not $r.ok) { throw $r.error }
# How many images were new or changed
"$($r.data.blocks_upserted) new or changed images"
```

### Export a playlist's links to a spreadsheet

```powershell
# One row per image: title, creator, page and every image size
lemuse export-links --playlist "Chair studies" --format csv > chairs.csv
```

### n8n, Make, Zapier (local runner)

Use an "Execute command" step with `lemuse <command> --json`, then parse stdout as JSON. Branch on `ok`.

### Load a whole channel right now

```powershell
# Read every channel to its end in one run (still rate-limited; can take a while)
lemuse sync --full
```

### Daily reference sheet (print to PDF)

```powershell
# 24 images from a topic, the same pick all day; open it and print to PDF
lemuse sheet --topic "Wood objects" --count 24 > "$env:USERPROFILE\Desktop\sheet.html"
# Open it in your browser
start "$env:USERPROFILE\Desktop\sheet.html"
```

## Dashboard: `lemuse serve` (ADR-0019)

```powershell
# Build the page once (in app/)
npm run build:dashboard
# Start the read-only dashboard; it prints the address with its token
lemuse serve --ui app/dist-dashboard
```

- Open the printed `http://127.0.0.1:47555/#token=…` in a browser, an OBS **Browser source**, or a Home Assistant
  **Webpage card**. The token sits in the `#` part of the address, which is never sent to a server.
- For a stable address across restarts, set `LEMUSE_SERVE_TOKEN` to 32–128 letters, digits, `-` or `_`.
- `--lan` also listens on your network (wall screen, phone). Use trusted Wi-Fi only: plain HTTP sends the token
  unencrypted. Never forward the port to the internet (ADR-0020).

The same JSON as the CLI, over HTTP (`Authorization: Bearer <token>`):

| GET | `data` |
|---|---|
| `/api/v1/status` | `{ schema, blocks, loading }` (no file paths) |
| `/api/v1/topics` | `[{ name, images, slide_seconds, shuffle }]` |
| `/api/v1/playlists` | `[{ id, name, items }]` |
| `/api/v1/slides?source=all\|topic:<name>\|playlist:<id>&page=0&include=wood&exclude=painting[&nudity=show]` | `{ source, page, page_size, total, slides }`. Hidden images never; likely nudity only with `nudity=show` (ADR-0027) |
| `/api/v1/preview-data?per_topic=300` | The page's own data (no envelope) |

```powershell
# Example: how many images are in the catalog right now
$h = @{ Authorization = "Bearer $env:LEMUSE_SERVE_TOKEN" }
(Invoke-RestMethod http://127.0.0.1:47555/api/v1/status -Headers $h).data.blocks
```

Coming next: webhooks after each refresh, live events, and starting the dashboard from the app's Settings.
