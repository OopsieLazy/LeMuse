# feat: pages, categories and Find channels (#9)

**Branch:** `feat/0009-pages-categories-discover` → `main` · **Stacked on:** #8 · **Merge:** squash
([0009-pages-categories-discover.merge.txt](0009-pages-categories-discover.merge.txt))

## What

- **Pages:** a view with more than 500 images gets a page menu in the control bar (1–500, 501–1,000, …).
  The caption shows the total.
- **Categories:** LeMuse sorts every image into categories itself, because Are.na has no tags or genres, only a
  block type. There are about 70 categories in 5 groups: kind, material, medium & method, object, and style &
  era. The filter button (or C) opens a genre-style selector: select a chip once to show only those images,
  twice to hide them. Each chip shows its count. The caption lists the current image's categories.
- **Find channels** (magnifier in the rail, or D):
  - pick from about 1,100 search words in 10 lists, or type your own, and open Are.na's search in the browser;
  - paste a channel link to **preview** its first 24 images, then add it to a topic;
  - **Related channels** (button or R) lists the public channels the current Are.na image is also in, each with
    a Preview button.
- CLI: `lemuse preview-channel <link>` and `lemuse related <block-id>`.
- Links open only on Are.na and the museum sites (was: any https site).

## Why

The owner's session-7 request: page through large views; a categorizer like a genre selector; find, demo and add
Are.na channels without leaving the app, with a long list of search words. Q16 answered: no copying to Are.na
for now.

## How

- **Core:**
  - `categories` module with the vocabulary `assets/categories.toml` (word and phrase matching, plurals);
  - derived `block_categories` table (migration 0005), rebuilt after every refresh and when the vocabulary
    changes;
  - `Catalog::slides_in`, `count_in` and `category_counts`, taking a `Scope` and a `CategoryFilter` (bound
    parameters, ids checked);
  - `arena::preview_channel` (2 reads) and `arena::related_channels` (1 read);
  - Cleveland stores `technique`.
- **App:** commands `slide_count`, `category_counts`, `vocabulary`, `preview_channel`, `related_channels`.
  UI-started Are.na reads share one spacing (≤ 24/min), are refused during refreshes, and back off on a 429.
  The opener scope is narrowed to 5 hosts. There is no new plugin and no new CSP host.
- **UI:**
  - `SlideshowView`: page menu, filter menu and caption tags;
  - new `DiscoverPanel` dialog;
  - 9 new snapshot states.
- **Why not in-app search:** Are.na's search API is Premium-only (Q10), and scraping its site is against its terms.
  See ADR-0015.

## Checklist

- [x] Secret scan clean (branch, uncommitted, untracked)
- [x] 79 tests (13 new) · fmt · clippy `-D warnings` (core, CLI, app) · typecheck
- [x] W3C: 41 files, 0 errors · layout: 39 states × 5 sizes = 195 renders passed
- [x] No new dependency · no new plugin or CSP host · opener scope narrowed
- [x] ADR-0004: Are.na reads only on a click; refreshes still cover only added channels
- [x] Admin and developer passes: [review 0009](../reviews/0009-pages-categories-discover.md)
- [x] Design artifact republished (same link) · test installer rebuilt · app launched for owner review
- [ ] Owner: try Find channels → Related channels on a few images, and the category filter

## Risk and rollback

- Risk: low. Migration 0005 adds a derived table and two indexes, and older builds ignore them. Discovery reads
  are user-started and rate-spaced.
- Rollback: revert the squash commit.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
