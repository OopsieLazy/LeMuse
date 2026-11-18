# feat: followed channels in topics; archive policy (#7)

**Branch:** `feat/0007-followed-channels-archive` → `main` · **Stacked on:** #6 · **Merge:** squash
([0007-followed-channels-archive.merge.txt](0007-followed-channels-archive.merge.txt))

## What

- **10 of your followed channels** were found by name and added. A new **Objects** topic holds objects '26, poetry
  in objects and *gesture incense. The others join Wood objects, Wrought iron, Tech, Product design and Vintage
  tech.
- **Archive policy:** posts (metadata and links) stay in the catalog forever, and a refresh never deletes them
  (new test). Image files are kept only when you Save.
- The plan for more free sources: The Met → Wikimedia Commons → Smithsonian → AIC.

## Why

Q11 (your channel list; "best guesses"), your caching question, and Q8 "A + C + other sources" (ADR-0013).

## How

- One public-API GET per name (the obvious slug), 2.5 s apart, as a guest. No search, no crawling.
- Not added:
  - private (need a token): Objects, style guides, busy, typography (retro);
  - not found by name: translucent electronics, chess as ___.

  The config marks where to paste their slugs.
- First refresh with them: 742 new posts, 0 errors, 0 files.

## Checklist

- [x] Secret scan clean · tests 48 (new: `items_removed_remotely_stay_in_the_catalog`) · fmt and clippy clean
- [x] ADR-0004: user-listed channels only; ADR-0013 written
- [x] Design artifact updated with 16 topics
- [ ] Owner: confirm the weaker matches (Resonance, Metal, sitting, Woodworking): Q14

## Risk and rollback

- Risk: low. Config and a test. The starter topics apply only to new libraries.
- Rollback: revert the squash commit.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
