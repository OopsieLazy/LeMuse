# Review 0017: Save originals; retries on network and 5xx failures

- **Branch:** `feat/0017-save-originals` (stacked on #16) · **ADR:** 0022
- **Passes:** Claude ran both passes on 2026-11-18. The commit hook's admin agent reviews each commit too.

## Admin / architect pass

| ID | Severity | Finding | Resolution |
|---|---|---|---|
| A-86 | high | Save writes downloaded bytes to disk | Exact-host allow-list per connector, https only, no port or credentials; re-checked on the final URL after redirects; image type from magic bytes; 64 MB cap; content-addressed store; no execution. Tests cover foreign hosts (no request is made), redirects, non-images and look-alike hosts |
| A-87 | med | The folder name comes from the UI | The page sends a `SlideSource`; the core resolves it to a known topic or playlist name, which is sanitised as a Windows folder name. No path from the page is ever used |
| A-88 | low | A compromised page could save in a loop and fill the disk | Saves are spaced 500 ms apart (≤ 120 a minute); duplicates cost no space (content hash) |
| A-89 | info | A-37 (download mode accepted any https host) | **Fixed:** the same allow-list guards the engine's download mode |
| A-90 | info | ToS (ADR-0004) | Originals from `image.src` on the user's request only; the attribution stays in the catalog; files land in the user's own folder |
| A-91 | info | Public repo | Saves go to the library folder (git-ignored `/library/`, or `Pictures\LeMuse`), so nothing new is written into the repo |

## Developer pass

| ID | Severity | Finding | Resolution |
|---|---|---|---|
| D-90 | med | D-2: no retry on network or 5xx errors | **Fixed:** `Error::Transient` and a shared `retry()` (1, 2, 4 s; 429 still honours `Retry-After`). Tests: a channel lookup answering 503 then 200; a Save answering 503 then 200 |
| D-91 | low | Titles that are file names gave `IMG.jpg [7].jpg` | **Fixed:** the image extension is dropped from the stem; test |
| D-92 | low | Saving the same image into a second folder | Links the stored file without downloading; `already_stored` in the result |
| D-93 | info | D-1 (stream large downloads with hash-on-write) | Still open; bodies are buffered up to the 64 MB cap |
| D-94 | info | Attachments (STEP, DXF, PDF) aren't saved | Register: needs a file-type allow-list |

### Round 2 (owner, before merging): right-click, repeats

| ID | Severity | Finding | Resolution |
|---|---|---|---|
| D-95 | med | Right-click on the image opened the page's menu ("Save as" saved HTML); on compact windows the tap layer covered the image | **Fixed:** LeMuse's own menu (Save original, Copy link, Open source page; preview: Open full-size image), kept inside the window by CSS; layout test covers it at every size |
| D-96 | med | Owner saw repeats within 1–500 | Measured on a copy of the library: 500 of 500 distinct blocks, 0 shared files. The causes are Are.na re-saves and the slideshow looping at a page's end. **Fixed:** re-saves grouped (same source image address and pixel size; 79 groups, 107 folded in that copy), and the end of a page moves to the next page |
| A-92 | low | Grouping by title would hide different images (product shots, "Work" site screenshots) | The rule uses the source image address and size only; bare domains don't count; playlists are untouched. Test covers each case |
| A-93 | info | The context menu's "Open full-size image" in the browser | Preview and dashboard only, https only; the desktop app saves through Save instead (no opener scope change) |

- [x] 100 tests (6 new): the save tests, plus re-saves folded in topics but not in playlists.
- [x] W3C 53 files, 0 errors · layout 51 states × 6 sizes = 306 renders passed.
- [x] 99 tests (5 new): save once and link into two folders (a 503 then a 200), foreign host with no request,
  non-image refused with nothing stored, magic bytes, exact hosts; engine retry on 503; view names.
- [x] Real saves on a copy of the owner's library (outside the repo; deleted afterwards): one Are.na original
  and one Cleveland original; a second save of the same image linked it without downloading (2 files stored, 3
  links).
