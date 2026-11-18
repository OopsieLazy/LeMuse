---
status: proposed
date: 2026-11-18
decision-makers: owner
consulted: admin pass, developer pass
informed: —
---

# ADR-0017: Whole channels, auto refresh, and JSON for automation

## Context

The owner (session 10):

- "When importing from a channel it maxes out at 200, even if the channel is 1.2k. Want channel inputs to use the
  entire folder if possible; I know they are large."
- "The app should auto refresh."
- "Make the JSON outputs for automation."

**Cause of the 200 cap.** `lemuse init` wrote `sync.pages_per_refresh = 2` (2 × 100 items). When a pass stopped
on that budget, nothing remembered where it stopped. The watermark only moves after a *complete* pass, so every
refresh read pages 1–2 again (A-7 in the register). A big channel was stuck at its newest 200 items for good.

`sync.interval_minutes` existed in the config but nothing ran it.

## Decision

1. **Resume big channels across refreshes.** When the page budget ends a pass early, the catalog stores the next
   page's cursor and the newest `updated_at` the pass saw (migration 0006). The next refresh then:
   1. walks the **head** from page 1 down to that newest item, which catches anything added since;
   2. **resumes** at the saved cursor and continues down to the old watermark or the last page, always reading
      at least one page so every refresh makes progress;
   3. when it reaches the end with no errors, sets the watermark and clears the cursor.

   New items at the top only push older ones down, so the resumed walk at worst re-reads a few (unchanged items,
   cheap). An item moved to the top from above the cursor can shift one item past the boundary. That rare skip is
   picked up by the full reconcile (A-6, M3).
2. **Budgets:**
   - default `pages_per_refresh` 2 → **5** (500 items per channel per refresh), with a maximum of 100;
   - a **just-added channel** may read up to **50 pages** (5,000 items) at once, so a 1,200-item channel appears
     in full within about 30 seconds at the guest rate;
   - every request still goes through the throttle at 80% of the tier (24/min as guest, 96/min with a token).
3. **One-time upgrade of existing configs.** If `lemuse.toml` has exactly `pages_per_refresh = 2` (what `init`
   wrote), it becomes 5, using `config_edit` (lock, full validation, atomic write, comments kept). A comment is
   left beside the line; it also stops the upgrade from running again if the user sets 2 on purpose.
4. **Auto refresh while the app runs:** `sync.interval_minutes`, default **60**; `0` turns it off, otherwise
   15–1440. A timer in the app checks once a minute, so a changed value applies without a restart, and it skips
   a tick while a refresh is running. It uses the same `refresh_library` path as every other trigger
   (`schedule`). Refreshing while the app is **closed** is the Task Scheduler entry from ADR-0005
   (`lemuse sync --trigger schedule`), documented in [docs/automation.md](../automation.md).
5. **JSON for automation.** A global `--json` flag makes every CLI command print exactly one document:
   `{"lemuse":1,"command":"…","ok":true,"data":…}`, or `"ok":false` with `"error"` and exit code 1. The `lemuse`
   field versions the envelope (bumped only for breaking changes). `status` also lists channels still loading in
   full. Shapes and recipes are in [docs/automation.md](../automation.md).

**Terms of use (ADR-0004).** Reading a channel the user chose in full, as metadata, is what any Are.na client
does when you scroll a channel. Still:
- images aren't downloaded, only displayed;
- every read is throttled to 80% of the limit and honours `Retry-After`;
- only channels the user added are read; there's no discovery crawl.

"Paginate, don't enumerate" now means bounded pages per refresh plus resuming, rather than never reading past
page 2.

## Options considered

| Option | Pros | Cons |
|---|---|---|
| **A. Resume cursor + larger budgets (chosen)** | Big channels complete; refreshes stay bounded; new items still come first | A little more sync state |
| B. Raise the cap to e.g. 100 pages, no resume | Simplest | A 10k channel would never finish in one bounded run; long first refreshes block Add channel |
| C. Lazy "load more" only while viewing | Fewest reads | The owner wants the whole channel in the catalog (categories, All, export) |

## Consequences

- The first refresh after this change reads more: at most 5 pages per channel, about 14 minutes worst case for
  65 channels at the guest rate; typical channels finish in 1–2 pages. An Are.na token (v0.8) makes it 4× faster.
- While a long refresh runs, Add channel and Find channels wait (they share the read budget). Queueing them is
  in the register (D-74).
- A shorter `pages_per_refresh` is still valid; it just takes more refreshes.
