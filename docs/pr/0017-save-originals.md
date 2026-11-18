# feat: save originals into your LeMuse folder (work item 17)

**Branch:** `feat/0017-save-originals` → `main` · **Stacked on:** #16 (open it against
`feat/0016-compact-layout`; GitHub retargets it to `main` when #16 merges) · **Merge:** Squash and merge, after #16

**PR title:** `feat: save originals into your LeMuse folder`

## What

- **Save** (the button under the image, no longer greyed out) downloads the full-size original into
  `Pictures\LeMuse\views\<topic or playlist>\`, or `views\Saved\` from All.
  - The button lights up once an image is saved.
  - Saving again into another folder doesn't download it twice.
- **Safer downloads:** only from each source's own image server, checked again after redirects. Only real
  images are kept: the file's first bytes decide, not its name.
- **Retries:** short network hiccups and server errors (5xx) are retried, for refreshes and saves.
- **CLI:** `lemuse save <block-id> [--topic T | --playlist P]`.

## Why

Save was the last missing piece of M1 (the first slideshow milestone), and the next roadmap step (v0.8). It also
closes findings A-37 (download host allow-list) and D-2 (retries).

## How

- **Core:**
  - `save::save_original` and `save::image_ext`;
  - `connectors::download_allowed`;
  - `Catalog::save_target` and `add_block_file`;
  - `Error::Transient` and `sync::engine::retry`;
  - `HttpResponse.final_url`;
  - view names drop a file-name extension.
- **App:** a `save_image` command, spaced 500 ms apart, which resolves the folder from the source.
- **UI:** the Save button, its saved mark and a toast; a new snapshot state.
- ADR-0022 · [review 0017](../reviews/0017-save-originals.md).

## Checklist

- [x] Secret scan clean
- [x] 99 tests (5 new) · fmt · clippy `-D warnings` (core, CLI, app) · typecheck · W3C · layout test
- [x] No new dependency, capability or CSP host
- [x] Real saves from Are.na and Cleveland (on a copy of the library, then deleted)
- [ ] Owner: press Save on a few images, then open `Pictures\LeMuse\views\`

🤖 Generated with [Claude Code](https://claude.com/claude-code)
