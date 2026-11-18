# Automation with the `lemuse` CLI

Every command accepts `--json` and then prints exactly **one** JSON document on stdout (ADR-0017):

```json
{ "lemuse": 1, "command": "status", "ok": true, "data": { … } }
```

On failure, `ok` is `false`, `error` holds the message, and the exit code is 1:

```json
{ "lemuse": 1, "command": "slides", "ok": false, "error": "invalid config: no topic named `Nope`" }
```

`lemuse` is the envelope version. It changes only for breaking changes; new fields may appear at any time. Use
`--library <folder>` or `LEMUSE_LIBRARY` to pick a library.

## Commands and their `data`

| Command | `data` |
|---|---|
| `status` | `{ root, schema, blocks, loading: [{ collection, images_so_far }] }`: `loading` lists channels still filling in |
| `topics` | `[{ name, images, slide_seconds, shuffle, keywords, sources: [{ source, key }] }]` |
| `slides "<topic>" [--limit N]` | `[Slide]`: `{ block_id, title, display_url, width, height, page_url, creator, attribution, saved, categories, connector, original_url, fallback_urls }` |
| `search "<words>"` | `{ query, block_ids }` |
| `sync [--trigger cli\|schedule]` | `{ targets_seen, targets_skipped, targets_recent, blocks_upserted, blocks_unchanged, files_stored, errors }` |
| `add-channel <link> --topic <name> [--new-topic]` | `{ added: { topic, channel: { slug, title, contents }, added }, refresh: <sync summary> \| null }` |
| `preview-channel <link>` | `{ channel: { slug, title, contents }, items: [{ title, image_url, kind }] }` |
| `related <block-id> [--page N]` | `{ channels: [{ slug, title, owner, contents }], total, next_page }` |
| `export-links [--topic T \| --playlist P]` | `[{ block_id, connector, title, creator, page_url, origin_url, images: [[role, url]] }]` |
| `init` | `{ root, config }` |
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

## Coming next (ADR-0019)

- `lemuse serve`: the same JSON over HTTP on `127.0.0.1` with a token, plus a dashboard page for OBS, Home
  Assistant and wall screens.
- Webhooks after each refresh.
