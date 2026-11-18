---
status: proposed
date: 2026-11-18
decision-makers: owner
consulted: admin pass, developer pass
informed: —
---

# ADR-0022: Save originals into the library

## Context

Save has been on the roadmap since M1, and its button was shown disabled. It is the one place LeMuse writes
image bytes in stream mode (ADR-0007, ADR-0009). Two findings waited on it:
- A-37: downloads must come only from known image hosts;
- D-2: retry on network and 5xx failures.

## Decision

1. **What is saved:** the block's `original` media.
   - Are.na: the unresized `image.src`, never the q75 resized variants.
   - Cleveland: the print-size JPEG.
   - AIC: the full IIIF image.
2. **Where it goes:**
   - The file is stored once by content hash in `objects/ab/cd/<sha256>.<ext>`, and recorded in
     `files` / `block_files` (local state; a refresh never removes it).
   - It is hard-linked into `views/<folder>/<title> [<id>].<ext>`, falling back to a copy.
   - `<folder>` is the topic or playlist being played, or `Saved` from All. The core resolves it from the
     source; the page never sends a path. Names are sanitised for Windows.
   - A title that is a file name loses its extension (`IMG_2041 [7].jpg`, not `IMG_2041.jpg [7].jpg`).
3. **Safety checks:**
   - Only https from the connector's own CDN, checked before the request **and** on the final URL after
     redirects:
     - Are.na: `d2w9rnfcy7mm78.cloudfront.net`, `attachments.are.na`, `images.are.na`;
     - Cleveland: `openaccess-cdn.clevelandart.org`;
     - AIC: `www.artic.edu`.
   - The same allow-list now guards download mode in the engine (A-37).
   - The type comes from the file's first bytes, never the URL. Accepted: JPEG, PNG, GIF, WebP, TIFF, AVIF and
     BMP. Anything else (an HTML error page, an archive, an executable) is refused and nothing is stored.
   - The 64 MB body cap of the HTTP client still applies.
   - In the app, saves are spaced 500 ms apart (at most 120 a minute), so a compromised page can't fill the
     disk fast.
   - Saving again links the stored file into the new folder without downloading.
4. **Retries (D-2):** a new `Error::Transient` covers transport failures and 5xx answers. One `retry()` handles
   them (1 s, 2 s, 4 s) alongside 429 `Retry-After`, for refreshes and saves alike.
5. **Front-ends:**
   - the Save button under the image, which shows the accent colour once saved, plus a toast naming the folder;
   - `lemuse save <block-id> [--topic | --playlist]`;
   - the browser preview and dashboard explain that saving needs the desktop app.

## Addendum (2026-11-18): right-click, re-saves, page end

The owner asked for two changes before merging.

1. **Right-click on the image.** Right-clicking the image used to show the WebView's page menu ("Save as"
   saved the HTML page), and on compact windows the tap layer covered the image. Now it opens LeMuse's own
   menu:
   - **Save original** (desktop app): the full-size original, into the folder above;
   - **Copy link**;
   - **Open source page**.

   The browser preview and the dashboard show **Open full-size image** instead, so the browser can save it.
   The menu opens at the pointer, stays inside the window (CSS clamps), and closes on a click elsewhere,
   Escape, scroll or a new image. Right-clicks on the buttons keep the normal menu.
2. **Repeats in a page** have two causes; LeMuse doesn't load anything twice.
   1. **Re-saves on Are.na:** the same picture saved again as a new block.
      - Image blocks from the same **source image address** with the same **pixel size** form one group (a
        derived table, `block_dupes`, migration 0007, rebuilt after each refresh). Topics and All show one
        block per group.
      - Titles alone aren't used: the owner's library has different product shots and site screenshots
        sharing titles.
      - Are.na's file names are unique per upload, so they can't be used either.
      - Bare-domain sources such as `https://www.instagram.com/` don't count.
      - Playlists show exactly what you added.
   2. **The end of a page** looped back to its first image. The slideshow now moves on to the next page.

## Consequences

- Saved files live in the library folder, outside the repo (`/library/` and `Pictures\LeMuse`). Nothing new
  for `.gitignore`.
- Not yet:
  - streaming large downloads to disk while hashing (D-1; bodies are buffered up to 64 MB);
  - saving Are.na attachments (STEP, DXF, PDF), which needs its own type allow-list;
  - "Show in folder", which needs an opener permission (later, with a review).
