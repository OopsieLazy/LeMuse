# Are.na API (as of November 2026): technical brief for a local reference-gatherer client

Research date: 2026-11-16. Primary sources: the live v3 OpenAPI spec (`https://api.are.na/v3/openapi.json`, version 3.0.0), the full markdown reference (`https://www.are.na/developers/all.md`), live API probes run during research (unauthenticated, guest tier), the Are.na Terms, the help center (help.are.na, GitBook), and the GitHub API for repo metadata. "Observed" means I saw it in a live HTTP response on 2026-11-16. It is not a documented guarantee.

## 1. API versions, base URLs, current vs deprecated

### Takeaway
v3 (`https://api.are.na/v3/...`) is the current, documented API, launched in 2026 and announced 2026-05-29. v2 (`https://api.are.na/v2/...`) still answers requests but is officially deprecated, and no sunset date has been published. New clients should target v3.

### Cited Findings
- The v3 reference reads "Version: 3.0.0" and says "All API requests use `https://api.are.na` as the base URL." The OpenAPI `servers` entry is `https://api.are.na` ("Production API"). — [all.md](https://www.are.na/developers/all.md); [OpenAPI spec](https://api.are.na/v3/openapi.json)
- Developer resources: interactive docs at `https://www.are.na/developers/explore`, the OpenAPI spec at `https://api.are.na/v3/openapi.json` (YAML at `/v3/openapi`), a full markdown reference (`/developers/all.md`), a compact reference (`/developers/all-compact.md`), an LLM index (`https://www.are.na/llms.txt`), and a sitemap. — [all.md](https://www.are.na/developers/all.md)
- The editorial post "On Our API" (2026-05-29, Charles Broskoski) calls v3 "the first major update in over ten years." It says v1 lasted less than a year and the old API was labelled "v2" in its URL. Reasons given for replacing v2: it was often the slowest of Are.na's responses, it was only partly documented with inconsistent response structures, scrapers heavily abused the v2 search endpoints, and growing (including LLM-assisted) usage strained infrastructure. The post gives no v2 sunset date. — [On Our API](https://www.are.na/editorial/on-our-api)
- The old developer portal `dev.are.na/documentation` now 301-redirects to `https://www.are.na/developers`. A search-indexed snapshot of it reads: "This developer portal is deprecated. The V2 API documentation and OAuth application management have moved to the [new Are.na Developers site]." — [dev.are.na/documentation (search snippet)](https://dev.are.na/documentation); redirect observed live.
- v3 covers 53 endpoints, grouped as Authentication, Block, Channel, Comment, Connection, Feed, Group, Search, System, Upload, and User. — [all-compact.md](https://www.are.na/developers/all-compact.md)
- Observed: `GET https://api.are.na/v2/channels/arena-influences/contents` still returned 200 on 2026-11-16. Its block `class` values were `Channel`, `Image`, `Link`, `Media`, and `Text`, and its image keys were `thumb`, `display`, `large`, `square`, and `original`. v2 responses carried no `X-RateLimit-*` headers. — live probe of [api.are.na/v2](https://api.are.na/v2/channels/arena-influences/contents)

### Inferences
- Target v3 only. Treat v2 as legacy: still running for now, but deprecated, undocumented on the new site, and liable to be removed or throttled without notice.
- v2 and v3 field names differ. v2 uses `class`, `Media`, `thumb`/`display`/`original`, while v3 uses `type`, `Embed`, `small`/`medium`/`large`/`square`/`src`. Code and tutorials written before 2026 (most community libraries) describe v2 shapes.

### Gaps
- No official v2 end-of-life date was found.
- **Conflicting source:** one search-engine summary of the developers page said "the v3 API is under active development, breaking changes may occur. For production use, the stable v2 API is recommended." The live `/developers/explore` page, fetched 2026-11-16, says nothing about v3 being beta or v2 being recommended. This is probably a stale snapshot from the v3 preview period, but the third-party `ts-arena` README also says "Are.na marks v3 as work in progress" ([pkgstats ts-arena](https://www.pkgstats.com/pkg:ts-arena)). Expect some v3 schema churn.

## 2. Authentication

### Takeaway
Pass the token as `Authorization: Bearer <token>`. Personal access tokens (PATs) and OAuth2 (authorization code, authorization code with PKCE, and client credentials) are supported. There are two scopes, `read` (the default) and `write`, and tokens do not expire. Most read endpoints, including public channel contents, work without authentication at the 30-requests/min guest tier. Search needs both a token and a Premium plan.

### Cited Findings
- "Most endpoints work without authentication but provide additional access when authenticated. Use the standard `Authorization` header: `Authorization: Bearer YOUR_TOKEN`." — [all.md](https://www.are.na/developers/all.md)
- Supported token types are an OAuth2 access token ("supports PKCE") and a personal access token from `are.na/settings/personal-access-tokens`. The link text reads `are.na/settings/oauth`, which doesn't match the target, so the docs are slightly inconsistent here. — [all.md](https://www.are.na/developers/all.md); [developers/explore](https://www.are.na/developers/explore)
- OAuth endpoints are split across hosts: the authorization endpoint is `https://www.are.na/oauth/authorize` and the token endpoint is `https://api.are.na/v3/oauth/token`. Example: `https://www.are.na/oauth/authorize?client_id=…&redirect_uri=…&response_type=code&scope=read`. — [all.md](https://www.are.na/developers/all.md)
- Grant types at `POST /v3/oauth/token` are `authorization_code`, `authorization_code` with PKCE ("for public clients without a client secret"; `code_challenge_method=S256`, verifier 43–128 chars), and `client_credentials` (server-to-server). "Access tokens do not expire and can be used indefinitely." Apps are registered at `https://www.are.na/oauth/applications`. — [all.md](https://www.are.na/developers/all.md); [OpenAPI spec](https://api.are.na/v3/openapi.json)
- Scopes: `read` is "Read-only access (default) — write operations will return `403 Forbidden`", and `write` is "Full read and write access." "Read-only tokens can view all resources the user has access to." — [all.md](https://www.are.na/developers/all.md)
- Authentication levels are **Public** (e.g. `/v3/ping`), **Optional** ("works unauthenticated but respects permissions when authenticated"), and **Required** (returns 401, e.g. `/v3/me`). — [all.md](https://www.are.na/developers/all.md)
- Observed: unauthenticated `GET /v3/channels/arena-influences/contents?per=3` returned 200 with full block data and `x-ratelimit-tier: guest`. — live probe
- Search (`GET /v3/search`) is marked "⚠️ Premium Only". The 2026-05-29 post says v3 search requires authentication and is available only on premium tiers. — [all.md](https://www.are.na/developers/all.md); [On Our API](https://www.are.na/editorial/on-our-api)

### Inferences
- For a personal desktop app, a PAT with `read` scope is the simplest option. The user pastes it once and the app stores it in the OS keychain. If the app might be distributed to others, OAuth with PKCE (a public client, no secret) is the right flow. Because tokens never expire, there is no refresh logic, but the app must handle revocation (a 401).
- Private channels (the user's own, or ones they collaborate on) need a token. Public channels can be read anonymously, but at a quarter of the Free tier's rate limit.

### Gaps
- The docs don't say whether a PAT can be limited to specific channels, and they publish no token revocation endpoint.
- The docs don't say what redirect URI schemes (loopback or custom scheme) registered OAuth apps accept, which matters for a desktop PKCE flow.

## 3. Core endpoints and data model (v3)

### Takeaway
Content is blocks (Text, Image, Link, Attachment, Embed, plus a transient PendingBlock) and channels, linked by connections. Channel contents are page-paginated (`page`, `per` ≤ 100) and can be sorted by `updated_at`. Images come with an unsigned `src` original on CloudFront plus resized `small`/`medium`/`large`/`square` variants (each with `src_2x`) from an `images.are.na` resizer. Attachments expose `attachment.url`.

### Cited Findings: endpoints relevant to a read-only gatherer
- `GET /v3/channels/{id}` takes an id **or slug**. `GET /v3/channels/{id}/contents` returns blocks and channels, with params `page`, `per` (max 100), `sort` (`position_asc|position_desc|created_at_asc|created_at_desc|updated_at_asc|updated_at_desc`, default `position_desc`), and `user_id` (filter by who added the item). — [all.md](https://www.are.na/developers/all.md)
- `GET /v3/blocks/{id}`; `GET /v3/blocks/{id}/connections` (the channels a block appears in; `filter=ALL|OWN|EXCLUDE_OWN`); `GET /v3/blocks/{id}/comments`. — [all.md](https://www.are.na/developers/all.md)
- `GET /v3/users/{id}` (id or slug); `GET /v3/users/{id}/contents` (`type=Text|Image|Link|Attachment|Embed|Channel|Block`, sort by created/updated; "Uses the search API… limited to the first 10,000 results"); `/followers`; `/following` (`type=User|Channel|Group`); `/groups`; `GET /v3/me` (authentication required; includes `email`). — [all.md](https://www.are.na/developers/all.md)
- `GET /v3/groups/{id}`, plus `/contents` (same 10,000 cap), `/members`, and `/followers`. — [all.md](https://www.are.na/developers/all.md)
- `GET /v3/me/feed` and `/v3/me/notifications` use **cursor** pagination (`limit` ≤ 100, `next`/`prev` taken from `meta.next_cursor`/`meta.prev_cursor`; newest first). — [all.md](https://www.are.na/developers/all.md)
- `GET /v3/search` (Premium) searches blocks, channels, users, and groups. Params: `query` (`*` matches everything), `type` (`Text|Image|Link|Attachment|Embed|Channel|Block|User|Group|All`), `scope=all|my|following`, `user_id`, `group_id`, `channel_id`, `ext` (a long list that includes design formats such as `pdf, png, jpg, svg, psd, ai, eps, tif/tiff, heic, webp, ind/indd, key, pages`; **CAD formats such as DWG, DXF, and STEP are not in the list**), `metadata[key]=value`, `sort` (including `updated_at_desc` and `random` with `seed`), and `after` (ISO 8601, "Useful for incremental syncing"). Results are capped at the first 10,000; deeper pages return 400. — [all.md](https://www.are.na/developers/all.md)
- Write and upload endpoints exist (POST/PUT blocks, channels, connections; `POST /v3/uploads/presign`, which returns presigned S3 PUT URLs that "expire after 1 hour"; batch create, Supporter only, max 50 blocks and 20 channels). A read-only gatherer doesn't need them. — [all.md](https://www.are.na/developers/all.md)

### Cited Findings: response envelope and pagination
- List responses are shaped `{ "data": [...], "meta": { current_page, per_page, total_pages, total_count, next_page, prev_page, has_more_pages } }`, with default `per` of 24 and max 100. — [all.md](https://www.are.na/developers/all.md). Observed on a live channel: `per_page: 3, total_pages: 43, total_count: 128, has_more_pages: true`.
- Errors are shaped `{ "error": "Not Found", "code": 404, "details": { "message": … } }`. Codes are 400 (validation against the OpenAPI spec), 401, 403, 404, 408, 422, and 429. — [all.md](https://www.are.na/developers/all.md)
- Resources carry HATEOAS `_links` (for example `self`, `user`, `connections`, `comments`). — [OpenAPI spec](https://api.are.na/v3/openapi.json); observed live

### Cited Findings: block schema (from the OpenAPI components)
- **BaseBlockProperties** (all blocks): `id`, `base_type` ("Block"), `title`, `description` (a MarkdownContent object with `markdown`/`html`/`plain`), `state`, `visibility`, `comment_count`, `created_at`, `updated_at`, `user` (EmbeddedUser), `metadata` (custom key/value), `source` (`{url, title, provider{name,url}}` or null; "if block was created from a URL"), `_links`, and `connection` (present only inside channel contents). — [OpenAPI spec](https://api.are.na/v3/openapi.json)
- `type` is one of `Text`, `Image`, `Link`, `Attachment`, `Embed`, or `PendingBlock`. PendingBlock is described as "currently being processed. The final type… will be determined once processing completes." `BlockState` is `processing|available|failed`. `BlockVisibility` is `public|private|orphan`. — [OpenAPI spec](https://api.are.na/v3/openapi.json)
- **TextBlock** has `content` (MarkdownContent). **LinkBlock** has `image` (preview, nullable) and `content` (extracted text, nullable). **EmbedBlock** has `embed` {`url, type, title, author_name, author_url, source_url, width, height, html, thumbnail_url`} and `image` (thumbnail, nullable). **AttachmentBlock** has `attachment` {`filename, content_type, file_size, file_extension, updated_at, url` ("Attachment download URL", example `https://attachments.are.na/12345/document.pdf`)} and `image` ("Preview image (for PDFs and other previewable files)"). **ImageBlock** has a required `image`. — [OpenAPI spec](https://api.are.na/v3/openapi.json)
- **BlockImage** has `alt_text`, `blurhash`, `width`, `height` (original px), `src` ("URL to the original image", e.g. `https://d2w9rnfcy7mm78.cloudfront.net/12345/original_image.jpg`), `aspect_ratio`, `content_type`, `filename`, `file_size` (bytes), `updated_at`, and the required versions `small` ("thumb"), `medium` ("display"), `large`, and `square`. Each **ImageVersion** has `src`, `src_2x`, `width`, and `height`. — [OpenAPI spec](https://api.are.na/v3/openapi.json)
- Observed: a live Image block had `image.src = https://d2w9rnfcy7mm78.cloudfront.net/9613792/original_<hash>.jpg?1606117715` (2121×1268, 1,925,505 bytes). Its resized versions were `https://images.are.na/<base64 JSON>` URLs, where the base64 decodes to `{"bucket":"arena_images","key":"<id>/original_<hash>.jpg","edits":{"resize":{"width":400|1200|1800,…,"fit":"inside","withoutEnlargement":true},"webp":{"quality":75},"jpeg":{"quality":75}}}`. Small is 400px (2x 800), medium 1200 (2x 2400), large 1800 (2x 3600). — live probe; base64 decoded during research
- **EmbeddedConnection** (in channel contents) has `id`, `position` (1-indexed), `pinned`, `metadata`, `connected_at`, and `connected_by`. — [OpenAPI spec](https://api.are.na/v3/openapi.json)
- **Channel** has `id`, `type`, `slug`, `title`, `description`, `state` (`available|deleted`, soft delete), `visibility` (`public|private|closed`), `created_at`, `updated_at`, `metadata`, `owner`, `counts` {`blocks, channels, contents, collaborators`}, `collaborators` (full resource only), `_links`, `connection`, and `can`. — [OpenAPI spec](https://api.are.na/v3/openapi.json)
- **User** includes `tier` (`guest|free|premium|supporter`), `badge`, `counts`, and `bio`. — [OpenAPI spec](https://api.are.na/v3/openapi.json)

### Inferences
- **Incremental sync design:** call `GET /v3/channels/{id}/contents?sort=updated_at_desc&per=100` and stop paging once items have `updated_at` ≤ the last sync watermark. Use `channel.updated_at` and `counts.contents` as a cheap "has anything changed?" check, combined with ETag/`If-None-Match`. On Premium, `search?channel_id=…&after=<ISO>` is an alternative. Removals don't appear in an updated_at sort, so detecting a removed connection needs an occasional full reconcile of connection ids.
- Key each local file by block `id`. Use `image.updated_at` or `attachment.updated_at` to decide when to re-download. Skip `state != available` (PendingBlock and failed) and retry later.
- For CAD/drawing references: DWG, DXF, STEP, and similar files would arrive as Attachment blocks if Are.na accepts them, but `ext` search can't filter for them. Filter client-side on `attachment.file_extension` instead.

### Gaps
- There's no `updated_since` filter on channel contents, only sorting. Whether a block's `updated_at` changes when only its connection metadata or position changes isn't documented.
- The full field list for `ChannelOwner`, `Metadata` limits, and the `Comment` model weren't reviewed in depth.

## 4. Rate limits and recommended practices

### Takeaway
Numbers are published for v3. Guest: 30 reads/min (per IP). Free: 120 reads/min, 30 writes/min, 300 writes/hour. Premium: 300 / 60 / 1,500. Supporter: 600 / 120 / 3,000. The limit is global per account (not per endpoint). Every response carries `X-RateLimit-*` headers, and a 429 includes a `retry_after` value. Are.na also requires an identifying User-Agent.

### Cited Findings
- Rate-limit table: Guest (unauthenticated) 30 reads/min, no writes; Free 120 / 30 / 300; Premium 300 / 60 / 1,500; Supporter 600 / 120 / 3,000 (reads per minute, writes per minute, writes per hour). — [all.md](https://www.are.na/developers/all.md); identical `detailed_limits` in the RateLimitError schema of the [OpenAPI spec](https://api.are.na/v3/openapi.json)
- "**The limit is global across the entire API — it is not per-endpoint.** Authenticated requests are counted per account; unauthenticated requests are counted per IP." Reads and writes have separate budgets. — [all.md](https://www.are.na/developers/all.md)
- Headers: `X-RateLimit-Limit`, `-Remaining`, `-Tier`, `-Window`, `-Reset` (unix timestamp), `-Bucket` (`read-minute|write-minute|write-hour`), `-Cost`, and `-Policy`. — [all.md](https://www.are.na/developers/all.md). Observed: `x-ratelimit-limit: 30`, `x-ratelimit-policy: 30;w=60`, `x-ratelimit-cost: 1`, `x-ratelimit-tier: guest`.
- A 429 body includes `error.type: "rate_limit_exceeded"`, `tier`, `limit`, `limit_window`, `retry_after` (seconds), and `current_status.upgrade_path`. — [OpenAPI spec](https://api.are.na/v3/openapi.json)
- Best practices from the docs: "Paginate, Don't Enumerate". "Don't: Loop through all pages at startup… Set `per=100` and iterate until `has_more_pages` is `false`." Use HTTP caching: unauthenticated responses are `max-age=300, public`, authenticated ones are `private, no-cache`, `If-None-Match` returns 304, and "304 responses still count against your rate limit". On a 429, "wait until the reset window". Add "a short delay between sequential requests (e.g., 200–500ms)". "Build statically when possible". — [all.md](https://www.are.na/developers/all.md)
- **User-Agent requirement:** "Use the form `AppName/version (+contact)`", for example `MyChannelSync/1.2 (+https://example.com; you@example.com)`. Library defaults like `python-requests` and `curl` "are shared by thousands of scripts". — [all.md](https://www.are.na/developers/all.md)
- Observed: a request with a bare `Mozilla/5.0` UA got **HTTP 403 "Automated access blocked"** from Cloudflare: "This request matched a rule intended to prevent unidentified automated traffic… use a descriptive User-Agent that identifies your application and includes a contact URL or email address." The same request with a descriptive `AppName/version (+url)` UA returned 200. — live probe of api.are.na
- The 2026-05-29 post describes the tiers qualitatively. It calls Free generous enough for real projects and says most past projects fit within it. — [On Our API](https://www.are.na/editorial/on-our-api)

### Inferences
- A desktop app should send a fixed descriptive UA, read `X-RateLimit-Remaining`/`Reset` on every response, and throttle itself (for example, a token bucket at about 80% of the tier limit). On a 429 it should honour `retry_after`.
- Image/CDN downloads go to CloudFront/S3 or `images.are.na`, not `api.are.na`. They probably don't count against the API budget, though that isn't documented. See section 5.

### Gaps
- No rate limits are documented for the CDN or image-resizer hosts.
- No v2 rate limits are published, and v2 responses showed no rate-limit headers.

## 5. Download and export mechanics

### Takeaway
The original image URL (`image.src`) is a plain, unsigned CloudFront/S3 URL with a 1-year cache lifetime, and it downloaded directly with no auth in testing. Attachments expose `attachment.url`. Are.na's UI has a "Download channel" feature, but its format and plan requirements aren't documented.

### Cited Findings
- Observed: `HEAD https://d2w9rnfcy7mm78.cloudfront.net/9613792/original_<hash>.jpg?1606117715` returned 200, `Server: AmazonS3`, `Content-Type: image/jpeg`, `Content-Length: 1925505` (matching `image.file_size`), `ETag`, `Last-Modified`, `Cache-Control: max-age=31536000`, and no signature or expiry query parameters. The `?1606117715` suffix is a cache-busting timestamp. — live probe
- The schema documents `attachment.url` as "Attachment download URL" (example host `attachments.are.na`). — [OpenAPI spec](https://api.are.na/v3/openapi.json)
- The only "signed/expiring" URLs in the spec are the **upload** presign URLs ("expire after 1 hour"; `expires_in: 3600`). Nothing describes signed download URLs. — [OpenAPI spec](https://api.are.na/v3/openapi.json)
- Help center: "To download or export the contents of your channel, open the 'More...' dropdown and click 'Download channel'." — [Settings and export](https://help.are.na/docs/getting-started/channels/settings-and-export.md)
- When asked whether "Download channel" is free or Premium-only and what format it produces, the help center's own Q&A answered that the docs "don't specify". — [help.are.na Q&A](https://help.are.na/docs/getting-started/channels/settings-and-export.md)
- The Are.na roadmap page lists exporting channels "as PDF, ZIP, and HTML" as an item. As of the snippet it is a roadmap listing, not confirmation of a shipped format. — [are.na/roadmap (search snippet)](https://are.na/roadmap)
- The v3 batch-create endpoint is "Designed for import use cases such as migrating from other services or re-importing Are.na exports," which implies an official export artifact exists. — [all.md](https://www.are.na/developers/all.md)
- The Premium features page doesn't list export as a Premium feature. — [Premium features](https://help.are.na/docs/getting-started/premium-features.md)

### Inferences
- Download originals from `image.src`, not the `images.are.na` resized variants, which are re-encoded (webp/jpeg quality 75). Use `file_size`/ETag for integrity, and send the same descriptive UA.
- Images in private channels may be served from the same public CDN path, but that wasn't tested. Don't rely on CDN URLs as an access-control boundary.
- The official "Download channel" feature, though undocumented, is the ToS-safest way to bulk-archive a whole channel a user owns.

### Gaps
- The format of the "Download channel" export, which plans it applies to, and whether it works on channels the user doesn't own are all unverified. This needs a hands-on check in the web UI.
- Attachment URL behaviour (auth, redirects, expiry) was not live-tested.
- I found no published rate limit or acceptable-use statement specific to CDN downloads.

## 6. Terms of service and API acceptable use: caching, bulk download, copyright

### Takeaway
The API docs and Terms explicitly prohibit scraping, crawling, "systematic downloading of content," and "mass downloading… without prior authorization", and Are.na alone decides what counts as excessive. Users keep ownership of what they post. The Terms give other users no rights to reuse someone else's content beyond viewing. A personal app that downloads on demand, at a modest rate, for the user's own reference is the defensible pattern. Mirroring whole channels or users automatically is what the language targets, unless Are.na grants permission (help@are.na).

### Cited Findings
- API acceptable use: "This API is intended for building applications that integrate with Are.na, not for scraping or bulk data collection. Automated crawling, systematic downloading of content, or any form of structured data harvesting is prohibited. If you need bulk access to data for research or other purposes, please contact us (help@are.na)." — [all.md](https://www.are.na/developers/all.md)
- Terms (effective November 8th, 2023), "Data Collection and Access": Are.na may limit or deny access for "Unauthorized, excessive, or abusive use of Are.na's Application Programming Interface (API)", "Automated data scraping or crawling of content from the Service", and "Mass downloading or automated retrieval of content from any part of the Service without prior authorization". Are.na alone decides what is unauthorized, excessive, or abusive, and may grant special data-collection permissions case by case on request. — [Are.na Terms](https://www.are.na/terms)
- User content license: users grant Are.na a "worldwide, non-exclusive, royalty-free, fully paid, sublicenseable and transferable license" to reproduce, distribute, display, and perform submissions in connection with the Service. The grant "does not affect User's other ownership or license rights" (users keep ownership). — [Are.na Terms](https://www.are.na/terms)
- Are.na's own "Application Content" is licensed only for a "limited, revocable, non-sublicensable license to view such content" for personal purposes, and "Reproducing, copying or distributing any such content for any other purpose is strictly prohibited" without prior written permission. — [Are.na Terms](https://www.are.na/terms)
- The Terms grant users no explicit rights over other users' submissions. Users must hold rights to what they post. A DMCA process exists (designated agent: When It Changed Inc., Hudson, NY; DMCA-1029842). — [Are.na Terms](https://www.are.na/terms)
- Caching: the Terms have no caching clause. The API docs explicitly encourage HTTP caching and "cache responses server-side with a reasonable TTL", and say authenticated responses "may [be stored] but must revalidate before each reuse". — [Are.na Terms](https://www.are.na/terms); [all.md](https://www.are.na/developers/all.md)
- The 2026-05-29 post ties access decisions to "long-term sustainability" and Are.na's business model, and names scraper abuse of v2 search as a reason for v3. — [On Our API](https://www.are.na/editorial/on-our-api)

### Inferences
- Many blocks are images Are.na users saved from elsewhere, so copyright often belongs to neither Are.na nor the user who saved them. That is why `source.url` and `source.provider` matter. Store them in local metadata to preserve attribution, and treat local copies as private study references, not something to redistribute.
- The docs' "Paginate, don't enumerate" guidance is written for display apps. A sync-to-disk tool inherently enumerates, so it should be user-triggered, scoped to channels the user chooses (ideally their own or ones they follow), incremental, throttled, and properly identified. For anything bigger, email help@are.na for authorization. This is a judgment call on ambiguous language, not something Are.na has ruled on.

### Gaps
- No Are.na statement specifically addresses personal offline caching of image files or "backup your own channels" tools. Whether syncing one's own private channels counts as "mass downloading" is ambiguous.
- No separate "API Terms" document was found. The acceptable-use paragraph in the API docs plus the general Terms are the governing text.
- The community guidelines and the "Handling blocks with care" guide ([help.are.na](https://help.are.na/docs/guides/handling-blocks-with-care.md)) were not reviewed for attribution norms.

## 7. Existing open-source clients, SDKs, and download tools

### Takeaway
The official, actively maintained tooling (October 2026) is TypeScript-only: `@aredotna/sdk` (generated from the OpenAPI spec), `@aredotna/cli`, and `@aredotna/mcp` (hosted at mcp.are.na). Older community wrappers (arena-js, frnsys/arena for Python, arena-ts) and download scripts target v2 and are mostly stale. A desktop client in Python or Rust would need its own client, easily generated from `openapi.json`.

### Cited Findings (repo metadata from the GitHub API, 2026-11-16)
- `aredotna/sdk`: TypeScript, last push 2026-10-20, 12 stars. "Official TypeScript SDK for the Are.na API… generated from the Are.na OpenAPI specification with a small ergonomic facade for OAuth, pagination, uploads, and error handling." It also ships `@aredotna/react-query`, and the spec snapshot lives in `spec/openapi.json`. — [aredotna/sdk README](https://github.com/aredotna/sdk); [GitHub API](https://api.github.com/repos/aredotna/sdk). The npm listing shows v0.0.4, ESM-only, Node 20+ ([pkgstats](https://www.pkgstats.com/pkg:@aredotna/sdk)).
- `aredotna/cli`: TypeScript, last push 2026-10-22, 100 stars. `@aredotna/cli`, Node 20+. — [GitHub](https://github.com/aredotna/cli)
- `aredotna/mcp`: TypeScript, last push 2026-10-22, 23 stars. Provides "30+ auto-generated tools from the OpenAPI spec"; hosted endpoint `https://mcp.are.na/mcp`. — [GitHub](https://github.com/aredotna/mcp); [search summary](https://github.zuike.workers.dev/aredotna/mcp)
- The 2026-05-29 post lists a TypeScript SDK, example apps, an MCP server, and a CLI as v3 launch tooling. — [On Our API](https://www.are.na/editorial/on-our-api)
- Legacy official repos: `aredotna/arena-js` (JavaScript, last push 2022-08-24, v2-era); `aredotna/arena-rb` (Ruby, last push 2025-10-13). — [GitHub API](https://api.github.com/repos/aredotna/arena-js); [GitHub API](https://api.github.com/repos/aredotna/arena-rb)
- Community clients: `ts-arena` (npm; "V3-first TypeScript SDK… with explicit legacy V2 gap methods") — [pkgstats](https://www.pkgstats.com/pkg:ts-arena); `e-e-e/arena-ts` (TypeScript, last push 2024-02-14, 38 stars, v2-era) — [GitHub](https://github.com/e-e-e/arena-ts); `frnsys/arena` ("python interface to the are.na API", last push 2020-05-15, 39 stars, v2) — [GitHub](https://github.com/frnsys/arena); `fletchgraham/arena-py` (Python, 2019) — [GitHub](https://github.com/fletchgraham/arena-py).
- Download/export tools: `clovelt/arena-channel-downloader` ("Safely inspect and download PDFs, images, video, and attachments from Are.na channels", JavaScript, 2026-10-20) — [GitHub](https://github.com/clovelt/arena-channel-downloader); `yz3440/arena-exporter` ("Sync your Are.na channels and export blocks as CSV, JSON, or SQLite. Runs entirely in the browser", TypeScript, 2026-06-17) — [GitHub](https://github.com/yz3440/arena-exporter); `jpzk/arena2linkwarden` (export with date and file preservation, JavaScript, 2025-10-19) — [GitHub](https://github.com/jpzk/arena2linkwarden); `kegancochran/arena-imgdl-python` (Python, 2022) — [GitHub](https://github.com/kegancochran/arena-imgdl-python); `javierarce/arena-to-pdf` (Ruby, 2019) — [GitHub](https://github.com/javierarce/arena-to-pdf); `kodedninja/download-arena-channel` (JavaScript, 2020) — [GitHub](https://github.com/kodedninja/download-arena-channel).
- Adjacent native/local-first projects: `ce374/SuperComplex` (native Android Are.na client, Kotlin, 2026-11-16); `i-iii4/Mine` ("Local-first alternative to Are.na for visual bookmarking — macOS app, files on disk", TypeScript); `n3ographic/arena-wallpaper-mac` (Swift). — [GitHub search API](https://api.github.com/search/repositories?q=are.na+in:name,description&sort=updated)

### Inferences
- For a TypeScript/Electron/Tauri front end, `@aredotna/sdk` is the obvious base, though it's early-stage (0.0.x). For Python or Rust, generate a client from `https://api.are.na/v3/openapi.json` (for example with openapi-python-client or progenitor), or hand-write a thin client. The surface needed is small: channels, contents, blocks, me, following.
- Any community downloader last updated before May 2026 almost certainly uses v2 field names (`image.original.url`, `class`). Use them only as UX or reference material.

### Gaps
- The 2026 downloader repos (clovelt, yz3440) weren't inspected to confirm whether they use v2 or v3, or what licenses they carry.
- No maintained official Python SDK was found.

## 8. Premium vs free differences relevant to API use

### Takeaway
In the API, the plan determines rate limits (120 vs 300 vs 600 reads/min), whether search is available (Premium+), and batch create (Supporter). In the product, a free account is capped at 200 connections. Premium removes the cap and adds reader mode/full-text, table view, custom thumbnails, and pinning.

### Cited Findings
- Tiers are "Guest (free) – limited to 200 Connections", "Premium – unlimited connections, and additional Premium features like reader mode and table view", and "Supporter – … everything in the premium tier plus a free Are.na Annual, access to bi-annual investor reports and early access to new features." Downgrading to free means "You'll lose all access to features and the ability to add new blocks and connections." — [Billing and Subscriptions](https://help.are.na/docs/account/billing-and-subscriptions.md)
- Premium features: unlimited connections, reader mode, full-text search inside link content, table view, custom block thumbnails, and pinned blocks. — [Premium features](https://help.are.na/docs/getting-started/premium-features.md)
- API-gated features: `GET /v3/search` is Premium only; `POST /v3/blocks/batch` and `GET /v3/blocks/batch/{id}` are Supporter only; rate limits scale by tier (section 4). — [all.md](https://www.are.na/developers/all.md)
- Naming ambiguity: the help center calls the free plan "Guest (free)", but in the API `guest` means *unauthenticated* and `free` means a signed-in free account (`UserTier` enum `guest|free|premium|supporter`). — [Billing](https://help.are.na/docs/account/billing-and-subscriptions.md); [OpenAPI spec](https://api.are.na/v3/openapi.json)

### Inferences
- For a read-mostly local gatherer, Free (120 reads/min = 12,000 items/min at `per=100`, in theory) is enough for personal channels. Premium matters mainly if the app wants search-driven discovery (for example `type=Image`, `ext=pdf`, or `after=` incremental queries across channels).

### Gaps
- I couldn't confirm whether private channels are free or Premium-only in 2026. The help pages reviewed don't list private channels as a Premium feature, but I didn't find an explicit statement either way.
- Current Premium/Supporter prices weren't captured (see are.na/billing).
