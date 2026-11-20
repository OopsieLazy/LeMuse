---
status: proposed
date: 2026-11-19
decision-makers: owner
consulted: admin pass, developer pass
informed: —
---

# ADR-0027: Content safety (a nudity sensor) and the practice log

## Context

The owner answered two questions:
- **Q27 "yes, needs a nudity sensor":** hide nudity by default.
- **Q28 "yes":** keep a practice history.

Museum collections and figure-drawing channels include classical and life-drawing nudes. The art review warned
against streak mechanics; a forgiving log is what research supports.

## Decision

**1. The nudity sensor reads text, not pixels (for now).**
- A `content` group in the category vocabulary: `nudity` matches titles, descriptions, museum object types and
  channel names ("nude", "naked", "life drawing", "odalisque", "bather", "figure study", "boudoir", …).
- Ambiguous words are left out: "nu" ("nu metal"), "Venus" (the planet).
- **Checked on the owner's real library** (15,602 images). The first list flagged 32. Two terms over-reached:
  "sensual" (13 design objects with "sensual curves") and "pinup" (PIN-UP, a design magazine). With both
  removed it flags 18: titled nudes, figure studies, lingerie and a Bathsheba.
- It runs with the existing category rebuild, so every refresh and every vocabulary change re-sorts.

**Why not an image model now:**
- **Size:** a usable NSFW classifier is 10–90 MB, and ONNX Runtime adds about 10 MB. The installer budget is
  10 MiB.
- **Pixels:** it would need image bytes. Script can't read cross-origin pixels, and the core would have to
  download every image, which breaks the stream-first rule (ADR-0007).
- **Accuracy:** small models mislabel art (nudes vs portraits, sculpture).

Text catches what museums and curators label. The rest is covered by the user's own marks. An image model stays
an option (PLAN), only if it can run in-process without storing images.

**2. The user's marks.**
- Right-click → **Hide this image** or **Mark as nudity**. They're stored in `block_flags` (local state; a refresh
  never touches it).
- They're fed into `block_categories` when it's rebuilt, so the normal category filter does the hiding.
- Removing a nudity mark re-sorts, so only what the sensor itself found stays.

**3. Defaults everywhere.**
- `CategoryFilter::with_content_defaults` (Rust) and `withContentDefaults` (UI) always exclude `hidden`, and
  exclude `nudity` unless it's shown.
- A filter that names either category itself is respected.
- **The app:** hidden by default. Settings → Content has "Show images that may contain nudity" (off), the counts,
  **Show hidden images again** and **Forget my nudity marks**.
- **The dashboard** (`lemuse serve`, often on a wall or a stream): hidden unless `nudity=show`.
- **Sheets:** hidden unless `--show-nudity`.
- `lemuse slides` stays a raw catalog listing.

**4. The practice log.** Each timed session that drew something is kept in `practice_sessions` and
`practice_drawn` (local state, migration 0008).
- **Kept:** when it started, how long, how many drawings and skips, the plan and the source name.
- **Bounds:** 5,000 sessions, 500 drawings each, sane values only.
- **Shown in the session planner:** "This week: 14 drawings · 9 min · 2 sessions" and eight weekly bars (oldest
  first; an empty week is a short bar).
- **No streaks** are computed or stored, and there are no notifications.
- It can be hidden (planner or Settings) and cleared (Settings → Practice).

**5. Accessibility (WCAG 2.1.4).** Single-key shortcuts can be turned off (Settings → Practice). Arrows, Space and
Esc always work.

## Consequences

- **Schema 8** (`0008_flags_practice.sql`): both tables are local state.
- **Tests:**
  - sensor hits and misses ("Venus over the hills" stays);
  - marks survive rebuilds;
  - clearing works;
  - bad marks and missing images are refused;
  - the log keeps only sessions with drawings, newest first, and refuses nonsense;
  - local week bucketing (UI).
- **Privacy:** the log never leaves the PC and isn't in exports. A future `lemuse backup` may include it (opt-in).
- **Deferred:** an optional local image model; a per-topic content switch; a "hide this channel" action.
