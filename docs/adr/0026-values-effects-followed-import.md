---
status: proposed
date: 2026-11-19
decision-makers: owner
consulted: admin pass, developer pass
informed: —
---

# ADR-0026: More values, drawing effects, and importing the channels you follow

## Context

The owner (session 17) asked for three things:
- **More values:** "more options, showing more dark areas and their light counterparts … more for absolute darks".
- **Drawing effects:** "in drawing it's good to draw the effect of something … the effect of grass over the grass of
  the picture. But that also seems to be large amounts of interpolation."
- **Followed channels:** "I followed more channels, see that they are properly imported."

Live check of followed channels (token, free tier):
- 27 channels are followed; 7 were in topics.
- A refresh of the channels already in topics worked (9 changed, 0 errors).
- The other 20 had no way in except one Preview + Add at a time.

## Decision

**1. Values: 2, 3, 4, 5, 7 or 9 tones, and isolation.**
- 9 is a Munsell-like full value scale.
- **Show which values (I):** all; **darks only** (the darkest band black, all else white: where the absolute
  darks are); **lights only** (the lightest band white on black); **darks + lights** (both extremes on a mid
  grey).
- With 9 tones, "darks only" is the darkest ninth.
- The balance slider still moves every threshold.
- A **value strip** on the image's badge shows the tones in use, dark to light.

**2. Drawing effects (E), on screen only.** The picture is redrawn as marks that follow its values, so an area
reads the way an artist would draw its effect:
- **Lines:** contours from an edge kernel over a light blur, with a cutoff so smooth gradients stay clean.
- **Strokes ↕:** vertical marks for grass, hair and rain. **Strokes ↔:** horizontal ones for water and wood grain.
- **Cross-hatch:** both together.
- They combine with Values (banded hatching) and Squint (marks over big masses).

**3. How the effects are made.** One SVG filter graph, built by a pure function (`practice.ts filterGraph`) and
drawn by the browser's compositor:
- luma in sRGB → balance gamma → discrete tones → marks.
- Marks are fractal noise stretched along one axis, contrast-stretched (2 − 3n) and compared with the value
  (`value + (1 − n) − 0.4`, kept ≥ 0 alpha), then a steep ramp.
- The filter region is the image box, so noise never paints outside it.
- **It's not heavy interpolation in our code:** the GPU runs a few filter primitives per frame, and no pixels are
  read by script.
- Verified visually on a synthetic test picture in headless Edge (scratch screenshots, deleted). Two bugs found
  and fixed: the arithmetic composite also summed alpha, so the page showed through; and noise spilled outside
  the image.

**4. Import the channels you follow.** The followed list (one read per page, on a click) is annotated against
`lemuse.toml`:
- which topics already have each channel;
- a **suggested topic**: the existing topic whose name and keywords share the most words with the channel's
  title and slug.
  - Prefixes count ("woodworking" → wood) and a short alias list ("electronics" → tech, "retro" → vintage).
  - Ties go to the topic whose own name is covered best ("Tech" beats "Vintage tech" for "tech stuff").
  - No match → a **Following** topic.

How it's offered:
- **Find channels → Channels you follow** shows "in Objects" or "new: would go to Tech", an **Add** per channel,
  and **Add all N** (to each suggested topic, one chosen topic, or Following).
- In the CLI: `lemuse import-following [--topic NAME] [--dry-run]`.

Adding needs **no further API reads**: the list already proved each channel exists and is visible to the
account. One refresh follows, and big channels keep loading across refreshes (ADR-0017).

## ToS and scope (ADR-0004)

- Only channels the user chose to follow, and only on an explicit click (or command).
- Following a channel on Are.na never adds it by itself, and LeMuse never crawls the follow graph.

## Addendum (owner, same day): each followed channel is its own topic

The owner: "Followed channels should be imported as their own channel, taking the name and adding it to the list;
one big Following folder defeats the purpose."

- **Default now:** **Add** and **Add all** make each channel **its own topic, named after the channel**.
  - The name is the channel title as one clean line of at most 60 characters (the slug if the title is empty).
  - If another topic already has that name, the channel's owner is added ("Objects · <owner>"), then a number.
  - A topic that already holds the channel keeps its name.
- **Grouping:** these topics carry `group = "Following on Are.na"` in `lemuse.toml`, and the topic list shows them
  under that heading after your own topics.
- **The best-match mode stays** as an option: "Each into the existing topic that fits it best" in the app,
  `--match` in the CLI. "All into <topic>" also stays.
- **New CLI commands:** `lemuse remove-channel <slug> --topic T`, and `lemuse remove-topic NAME` (empty topics
  only: a topic with channels or keywords is refused).
- **Live, on the owner's library:**
  1. The 20 channels imported earlier were taken back out of the topics they'd been put in; the 7 the owner had
     placed stayed.
  2. The empty Following topic was removed.
  3. All 20 were re-imported as their own topics.
  4. A refresh brought 545 more images, 0 errors.
  - Result: 36 topics, 20 under "Following on Are.na" with 7,484 images.
  - One channel ("My Translucent electronics") has items but no images, so its topic shows none.

## Consequences

- **Live (owner's library):** 20 channels added (10 to existing topics, 10 to Following), then one refresh brought
  3,968 images with 0 errors; 5 large channels continue loading on later refreshes.
- **Tests:**
  - Rust: suggestions, idempotent add, slug checks, a 100-channel cap.
  - UI: the filter graph's structure, the alpha invariant, focus tables, the value strip.
- **Deferred:**
  - diagonal strokes (noise can't rotate inside one filter);
  - a stroke-size slider;
  - exact L* / automatic thresholds (need pixels: CORS check first).
