# Review 0013: Whole channels, auto refresh, JSON; plans for sources and dashboards

- **Branch:** `feat/0013-full-channels-refresh-json` (stacked on #12) · **ADRs:** 0017 (built), 0018 and 0019
  (plans)
- **Passes:** Claude ran both passes on 2026-11-18. The commit hook's admin agent reviews each commit too.

## Admin / architect pass

| ID | Severity | Finding | Resolution |
|---|---|---|---|
| A-63 | med | Reading whole channels refines ADR-0004's "paginate, don't enumerate" | **Decided (ADR-0017):** user-chosen channels only, metadata only, bounded pages per refresh plus resume, throttle at 80% of the tier, `Retry-After` honoured. The same as scrolling a channel in any Are.na client |
| A-64 | med | The app edits the user's `lemuse.toml` on its own (2 → 5) | Only the exact value `init` used to write, via `config_edit` (lock, validation, atomic, comments kept). A comment marks it so it never repeats; release note in CHANGELOG |
| A-65 | low | Auto refresh load | Default every 60 min (15 min minimum). An unchanged channel costs 1 read, so about 65 reads per refresh for the owner's library, within the budget |
| A-66 | low | `status --json` and `init --json` print the library path, which contains the Windows user name | Local stdout only; docs/automation.md says not to paste it publicly. No network change |
| A-67 | info | ADR-0018 (sources, Pinterest) and ADR-0019 (dashboard) are plans only | Their security items are listed in the ADRs: token, bind address, Host check, no write endpoints, CSP per host, no workarounds. Reviewed again when built |
| A-68 | info | Dependencies | None added |

## Developer pass

| ID | Severity | Finding | Resolution |
|---|---|---|---|
| D-70 | low | Resume boundary: an item moved from above the cursor to the top can shift one item past it | Rare; picked up by the full reconcile (A-6, M3). New items only cause harmless re-reads. Test `new_items_during_a_backfill_are_caught_by_the_head` |
| D-71 | low | Many new items can use the whole budget in the head walk | The backfill still reads at least one page; when the head runs out, the cursor moves to the head's, so nothing is lost |
| D-72 | info | The first refresh after this change reads more | At most 5 pages per channel (about 14 min worst case as guest); a token makes it 4× faster |
| D-73 | info | The timer counts from app start, not from the last manual refresh | Simple and predictable; a tick is skipped while a refresh runs |
| D-74 | low | Add channel and Find channels are refused during a long refresh | Register: queue them instead |
| D-75 | low | The installer doesn't include `lemuse.exe`, so Task Scheduler needs a build | Register: bundle the CLI as a sidecar |
| D-76 | info | JSON object keys come out sorted | Harmless; consumers read by key |

- [x] 85 core tests (3 new): channels completing over refreshes with the request count checked, new items during
  a backfill, the one-time config upgrade (comments kept, never repeats, other values untouched).
- [x] CLI `--json` checked for success and failure (exit 1, `"ok": false`).
- [ ] Real refresh on a copy of the owner's library: see the PR description for the numbers.
