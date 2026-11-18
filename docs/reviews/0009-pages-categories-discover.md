# Review 0009: Pages, categories, Find channels

- **Branch:** `feat/0009-pages-categories-discover` (stacked on #8) · **ADR:** 0015
- **Passes:** Claude ran both passes on 2026-11-17. The commit hook's admin agent reviews each commit too.

## Admin / architect pass

| ID | Severity | Finding | Resolution |
|---|---|---|---|
| A-38 | med | "Related channels" and "Preview" read channels the user hasn't added, which touches the ADR-0004 / CLAUDE.md rule "no following links to discover channels" | **Decided (ADR-0015):** user-started reads only, one page per click (related: page ≤ 20), nothing followed further, stored or fetched in the background. Refreshes still cover only added channels. CLAUDE.md wording updated. Owner told at the gate; the change is cheap to reverse (remove two buttons) |
| A-39 | med | In-app search would need `/v3/search` (Premium, Q10 = no). Scraping Are.na's search page would break the API terms and the no-bot-workaround rule | **Decided:** the app opens Are.na's own search page in the browser; it never fetches it |
| A-40 | low | The opener permission allowed any https URL (ADR-0012), more than LeMuse needs | **Fixed:** scope narrowed to `www.are.na`, `are.na`, `clevelandart.org`, `www.clevelandart.org`, `www.artic.edu`; the UI mirrors it (`isOpenable`) |
| A-41 | low | UI-started reads could add up past the budget (a preview is 2 reads) | **Fixed:** shared spacing of 2.5 s per read (a preview reserves 5 s), so ≤ 24/min; refused during refreshes; 429 back-off. Same path as Add channel |
| A-42 | low | Filter ids from the WebView end up in SQL | Ids must be in the built-in vocabulary, at most 24 a side, and are bound parameters. Test `filters_are_checked_before_sql` |
| A-43 | info | Categories are derived from remote text | Stored as vocabulary ids only, rebuilt after refreshes; no remote text is stored or executed. Migration 0005 is additive and never touches local state |
| A-44 | info | Owner names of other Are.na users (public data) appear under Related channels | Shown only, never stored or logged; the fixture uses invented names |
| A-45 | info | Previews load up to 24 thumbnails at once (ADR-0007 caps *preloading* at 2) | A preview is shown on request, not preloaded; images stream into the InPrivate WebView from CSP-listed hosts. No change |
| A-46 | info | Supply chain | No new Rust or npm dependency; lockfiles unchanged |

## Developer pass

| ID | Severity | Finding | Resolution |
|---|---|---|---|
| D-47 | med | The category rebuild took ~1.3 s on 4,489 blocks: each block's channel names were looked up without an index | **Fixed:** index `collection_blocks(block_id)` in migration 0005 and a GROUP BY join; a rebuild now adds ~0.4 s, after a refresh, off the UI thread |
| D-48 | low | A launch refresh and the startup category check can write at the same time | **Fixed:** busy timeout made explicit (5 s) |
| D-49 | low | The category filter (taller than the playlist menu) left the window at 400×800 (layout test) | **Fixed:** on narrow windows it becomes a sheet along the bottom edge, with a Done button |
| D-50 | low | If a refresh or a filter shrinks the view below the current page, the page would be empty | **Fixed:** the app moves to the last page |
| D-51 | low | Related channels answering after the user moved to another image would show the wrong list | **Fixed:** a request token drops late answers |
| D-52 | low | Hiding the specs (Settings) would also hide a page menu placed there | **Fixed:** the page menu lives in the control bar |
| D-53 | info | Shuffle mixes the current page only; with shuffle on, All shows the newest 500 until you pick another page | Deferred (PLAN): shuffle across pages |
| D-54 | info | Word matching mislabels some images; untitled images rely on channel names | Deferred (PLAN): manual corrections; later maybe a local image model (ADR-0015 option B) |
| D-55 | info | Cleveland's `technique` is stored from the next museum refresh (weekly) | Expected; the object type already categorizes them |
| D-56 | info | Add after Preview uses the link that was previewed, even if the field was edited since | By design: you add what you saw |

- [x] 79 core tests (13 new): vocabulary parsing and matching, filters (include, exclude, pages, counts,
  playlists, refused ids), channel names as labels, related channels (one request, hostile slugs dropped, bad
  ids refused with no request), preview (two requests, https only).
- [x] Real CLI smoke test (`lemuse related`, `lemuse preview-channel`):
  - a real block listed its public channels;
  - a real channel previewed 24 images;
  - a block link and a look-alike host were refused with no request.
- [x] Categorizing a copy of the owner's library: 4,453 of 4,489 blocks get a category beyond their kind.
- [x] W3C 41 files, 0 errors · layout 39 states × 5 sizes = 195 renders passed.
