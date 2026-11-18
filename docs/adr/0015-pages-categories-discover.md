---
status: accepted
date: 2026-11-17
decision-makers: owner
consulted: admin pass, developer pass
informed: —
---

# ADR-0015: Pages of 500, LeMuse's own categories, and finding channels without a search API

## Context

The owner asked for three things (session 7):

1. When a view has more than 500 images, show 1–500 and let them move on to 501–1,000 and so on, with a menu
   to jump between them.
2. "Does Are.na provide a genre or type for each image?" If not, a categorizer like a genre selector: wood, word
   documents, text, rubber and so on.
3. A way to find channels from inside the app. The owner's complaint is that on Are.na you have to go out of
   your way to find channels or build your own. They want to search by keyword, see a demo of a channel and add
   it on the fly, with a long list of ready-made search words in a dropdown.

They also answered Q16: copying playlists back to Are.na isn't needed for now.

These facts constrain the design (checked on 2026-11-17):

- **Are.na has no tags or genres.** A v3 block has a `type` (Image, Text, Link, Attachment, Embed), a title, a
  description, a source URL and, for attachments, a file extension and content type. Channels are Are.na's only
  way of grouping. The Cleveland Museum of Art adds `type` ("Furniture and woodwork") and `technique` ("Wood").
- **Are.na search is Premium-only.** `GET /v3/search` is marked "Premium only", and the owner chose not to pay
  for Premium (Q10). The API terms forbid "automated crawling … or any form of structured data harvesting"
  (research notes, `arena_api.md`). Scraping Are.na's search web page would break those terms and the
  no-bot-workaround rule.
- **Guest reads are still open.** `GET /v3/blocks/{id}/connections` lists the public channels a block is in. A
  live probe returned 107 channels for one of the owner's images. `GET /v3/channels/{slug}/contents?per=24`
  returns a channel's first items.
- The read budget is 24 a minute (80% of the guest limit), and Add channel already uses it (ADR-0014).

## Decision

1. **Pages.** Every view (All, a topic or a playlist) loads one page of at most 500 images; the core caps it.
   When a view has more than 500 images, a page menu (1–500, 501–1,000, …) appears in the control bar. A
   `slide_count` command gives the total. Shuffle mixes the images within the current page. If a refresh or a
   filter shrinks the view, the app moves to its last page.
2. **Categories LeMuse assigns itself.** A built-in vocabulary (`crates/lemuse-core/assets/categories.toml`)
   has 5 groups and about 70 categories:
   - **Kind**, from the Are.na block type: Image, Web page, Document / file, Video & embed, Text;
   - **Material**: wood, metal, glass, ceramic, stone, plastic, rubber, textile, paper and others;
   - **Medium & method**: drawing, print, casting & molds, joinery, CAD & 3D and others;
   - **Object**: furniture, lighting, electronics and others;
   - **Style & era**: Art Deco, Y2K, mid-century and others.

   Each category lists whole words and short phrases, with simple plurals understood. A block's categories come
   from its title, its description, the museum's type and technique, and the names of the channels or searches
   it came from. Channel names matter most: "Metal" or "Plywood Furniture Ideas" label every image in them.
   The results live in `block_categories` (migration 0005). This is **derived data**, like `thumbs/`: it is
   rebuilt after every refresh and whenever the vocabulary changes (fingerprinted by its SHA-256). It is never
   local state, and nothing in it is typed by the user.

   The filter works like a genre selector. Each chip cycles from off, to **include** (✓: show only these), to
   **exclude** (✕: hide these). Chips show counts within the current view and filter, and only chips with images
   (or already active) appear. Filters apply to All, topics and playlists alike. The caption shows the current
   image's categories.
3. **Finding channels uses only free, user-started reads.**
   - **Search words.** About 1,100 words in 10 lists: practice-oriented lists (drawing practice, design, CAD &
     making, objects & tech, architecture, mood) plus every category word. Pick one from the dropdowns or type
     your own (with type-ahead), then press **Search on Are.na**. Are.na's own search page opens in the
     system browser; LeMuse makes no request.
   - **Preview before adding.** Paste a channel link (or click Preview on a related channel). LeMuse makes 2
     reads, the channel lookup and the first page of 24 items, and shows the thumbnails. **Add channel** then
     uses the existing ADR-0014 path. Nothing is stored until Add.
   - **Related channels** for the current Are.na image (button or R). One read lists the public channels that
     image is also in, with owner and size; **Show more** reads the next page, up to page 20. This is how Are.na
     itself is meant to be explored: from a block to the channels it sits in.
   - Every read is spaced like Add channel: 2.5 s per read, so a preview reserves 5 s. That keeps the total at
     or under 24 a minute. Reads are refused while a refresh runs and back off on a 429. Nothing is fetched in
     the background, followed further, or stored.
4. **The opener permission is narrowed** from `https://*` to the sites LeMuse shows: `www.are.na`, `are.na`,
   `clevelandart.org`, `www.clevelandart.org` and `www.artic.edu`. The UI mirrors the list (`isOpenable`).

This refines a rule in ADR-0004 and CLAUDE.md, "no following links to discover channels". The app still never
discovers or follows channels by itself and still refreshes only the channels the user added. Discovery requests
happen only on a click, one page at a time, and only the user decides what to add.

## Options considered

### Discovery

| Option | Free plan | ToS | Effort | Verdict |
|---|---|---|---|---|
| A. Search link + preview + related channels | ✅ | ✅ user-started reads only | Low | **Chosen** |
| B. In-app search via `/v3/search` | ❌ Premium only (Q10) | ✅ | Low | Plug in later if the owner gets Premium |
| C. Scrape Are.na's search web page | ✅ | ❌ harvesting, bot protection | Medium | Rejected |
| D. Crawl outward from known channels (connections of connections) | ✅ | ❌ automated crawling | Medium | Rejected |

### Categories

| Option | Quality | Cost | Privacy | Verdict |
|---|---|---|---|---|
| A. Vocabulary over text and channel names (local) | Good where text exists; channel names cover most images | Tiny, no dependencies | Local | **Chosen** |
| B. Image recognition model (CLIP-style, local ONNX) | Better for untitled images | 150–350 MB model; image bytes in memory per image; new native dependency | Local | Later, if A isn't enough |
| C. Cloud vision API | Best | Paid; sends every image to a third party | Poor | Rejected |
| D. Manual tagging only | Exact | The user's time | Local | Partly covered by playlists; manual corrections deferred |

## Consequences

- Easier: browsing large views, narrowing to "metal + tools, not paintings", and finding new channels without
  leaving the app (search itself happens on Are.na's site).
- Harder: the vocabulary needs tuning. Ambiguous words were left out on purpose ("light", "screen", "card",
  "figure"), and some labels will still be wrong. The caption shows the categories so mistakes are visible.
- Many Are.na image titles are file names or hashes (roughly 800 of the owner's 2,000 Are.na images). Those
  images get categories only from their channel names. In the owner's library, 4,453 of 4,489 blocks get at
  least one category beyond their kind.
- Revisit:
  - in-app search if Premium is ever bought;
  - manual category corrections;
  - a local image model (option B);
  - shuffling across all pages, not just the current one.

## Security analysis

| Risk | Handling |
|---|---|
| SQL injection through filter ids | Ids must be in the built-in vocabulary (`categories::is_known`), at most 24 a side, and are bound parameters. Test: `filters_are_checked_before_sql` |
| Hostile text in titles or channel names | It is only matched against words, never executed or stored as categories. Display is React text |
| Pasted link for a preview | The same parser as Add channel (exact hosts, strict slug); the pasted URL is never fetched |
| Related channels: hostile slugs or titles in the answer | Slugs are re-validated (bad ones dropped), titles and owners are cut to plain text, block ids must be digits, page is 1–20. Tests cover each |
| Preview images | Only https URLs without credentials are passed on, and the CSP still limits hosts (no change). They stream into the InPrivate WebView; nothing is cached or stored |
| A compromised page spending the read budget | Shared spacing (≤ 24 reads/min), refused during refreshes, 429 back-off |
| A compromised page opening arbitrary sites | The opener scope is narrowed to 5 hosts (was any https) |
| Third-party personal data | Owner names of related channels are public Are.na data, shown but never stored or logged. The fixture uses invented names |
| Supply chain | No new dependency (Rust or npm) |
