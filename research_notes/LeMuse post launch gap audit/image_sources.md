# Free / open-licence image sources for LeMuse (post-launch gap audit, Nov 2026)

Scope: candidate streaming image sources for LeMuse (one keyword search per topic keyword, one page, weekly; images
hotlinked from the source CDN inside WebView2 under a per-host CSP; Save writes the original). This file updates and
extends `research_notes/Arena reference gatherer architecture/alternative_sources.md` (Nov 2026). Facts already
cited there are referenced, not repeated. Documented behaviour only: no probing of hosts or bot protection was done.
"Not verified" means no primary source was retrieved in this session. Not legal advice.

## Q1. Ranked table: which source to build next

### Takeaway
Build next, in order: **SMK** (keyless, one call returns full records with IIIF images, PD-mark licence),
**The Met** (keyless CC0, but must use the new v1.1 search and costs N+1 calls), **Wikimedia Commons** (biggest gap
filler for designers and architects, per-file licences, strict 2026 thumbnail-size rules), **Smithsonian** (free key,
CC0, covers Cooper Hewitt design objects and NASM hardware), **Rijksmuseum** (keyless CC0, but no general keyword
parameter and N+1 resolution), then **Poly Haven** and **NASA**. Avoid or defer Harvard (non-commercial, 2-week
cache cap), Science Museum Group (NC-SA, IIIF harvesting blocked), V&A (terms unverified), and the aggregators
(Openverse, Europeana, Internet Archive), because their images come from many hosts and the CSP can't allow-list them.

### Cited Findings
Each cell is sourced in the per-source findings under Q2–Q4 below, or in the earlier note. "n/p" means not published
in the pages reviewed. "?" means not verified.

| Rank | Source | Licence (images) | Keyword search, 1 page | Key | Rate limit | Image sizes / IIIF | Bot/hotlink notes | Main audience |
|---|---|---|---|---|---|---|---|---|
| 1 | SMK (Denmark) | PD Mark for public-domain works; filter `public_domain` | Yes: `art/search?keys=` + `has_image`, `public_domain` filters, `rows`/`offset`; full records in one call | None reported (?) | n/p | IIIF (`image_thumbnail` via IIIF) | None documented | Artists: painting, drawings, master studies |
| 2 | The Met | CC0 (`isPublicDomain`) | Yes, **v1.1** `search?q=&hasImages=&offset=&limit=` (v1 retired 1 Oct 2026); returns IDs only, so N+1 object calls | None | 80 req/s | `primaryImage` (full JPEG), `primaryImageSmall`, `additionalImages`; not IIIF | None documented | Artists; designers (arms and armor, instruments, furniture) |
| 3 | Wikimedia Commons | Per file: PD/CC0/CC BY/BY-SA/GFDL | Yes, MediaWiki API (File namespace) | None; compliant UA | 200/min with a UA (2026 scheme) | Thumbs at **standard widths only** (…960, 1280, 1920, 3840); originals | Hotlinking "allowed, but problematic"; non-standard thumb widths throttled since early 2026 | Everyone; strongest for architecture, machines, tools, vehicles |
| 4 | Smithsonian Open Access | CC0 | Yes (`/search?q=`) | Free api.data.gov key | api.data.gov default 1,000/hr (Smithsonian-specific figure n/p) | ids.si.edu delivery (?) | None documented | Designers (Cooper Hewitt, NASM aircraft), 3D/CAD (CC0 3D) |
| 5 | Rijksmuseum (new 2025–26 data services) | CC0 | Partial: `search/collection` has `description`, `title`, `creator`, `type`, `material`, `technique`, `imageAvailable`; **no general keyword**; returns Linked Art IDs, so N+1 resolution | None | n/p | IIIF via Micrio (iiif.micr.io) | None documented | Artists; also ship models, furniture, silver (designers) |
| 6 | Poly Haven | CC0 | No documented keyword search (list `/assets`, filter locally) | None; unique UA required | n/p | Thumbs on `cdn.polyhaven.com` | Attribution is a condition of the live API | Game/3D artists (textures, HDRIs, models) |
| 7 | NASA Image and Video Library | Generally not copyrighted "unless otherwise noted" | Yes: `search?q=&media_type=image&page_size=` (default 100) | None | n/p | Asset manifests per `nasa_id` | None documented | Industrial/game designers (hardware, spacecraft) |
| 8 | Cooper Hewitt | "CC0 objects" (image rights ?) | Yes, GraphQL at api.cooperhewitt.org | Open; rate-limited by default, key on request | n/p | ? | None documented | Industrial/product/graphic design. Largely reachable via Smithsonian OA too (inference) |
| 9 | Wellcome Collection | Data by Wellcome CC0; image licences per work (?) | Yes, Catalogue API (images endpoint) | None | n/p | IIIF | None documented | Figure artists (anatomy), illustrators |
| 10 | ambientCG | CC0 (not verified this session) | Yes: `api/v2/full_json?queryString=&limit=&offset=&include=previewData` | None seen | n/p | Previews 64–2048 px PNG/WEBP/JPG on `acg-media.struffelproductions.com` | None documented | Game/3D artists (PBR textures) |
| 11 | National Gallery of Art (US) | CC0 data; image open-access flag (?) | **No search API**; daily CSV dump | None | n/a | IIIF (host not verified) | None documented | Artists (drawings, master studies) |
| 12 | Library of Congress | Per item; mixed | Yes, JSON API `fo=json` | None | **20 req/min** JSON (1-hour block); 150/min images | tile.loc.gov (?) | **CAPTCHA pages under heavy load, even below limits** | Architects (HABS/HAER drawings, not verified), historians |
| 13 | Paris Musées | CC0 for public-domain works | Yes (GraphQL) | **Account + token** | n/p | HD images | None documented | Artists, photography |
| 14 | Europeana | Per item; `reusability=open` filter | Yes: `wskey`, `rows` ≤ 100 | Free key | ~120 req/10 s (forum, unofficial) | Provider-hosted (many hosts) | Many origin hosts | Aggregator: everyone, Europe |
| 15 | Openverse | Per item, CC/PD | Yes; anonymous `page_size` 20, depth capped | Optional (higher limits with auth) | Tiered, numbers n/p | Images on source sites (many hosts) | Many origin hosts | Aggregator (Flickr CC etc.) |
| 16 | Harvard Art Museums | Rights-restricted images withheld; **API non-commercial only** | Yes, `/object` (size ≤ 100, `page`) | Key | **2,500 calls/day** | IIIF 2.1 | **No caching or storing over 2 weeks**; serve from API URL | Artists |
| 17 | Science Museum Group | **CC BY-NC-SA** images | JSON:API `/search/objects` (third-party spec) | ? | n/p | IIIF/Zoom | **"Must not harvest" IIIF/Zoom; access will be blocked** | CAD/industrial design (engines, mechanisms, tools) |
| 18 | V&A | Under V&A website T&Cs §9 (text not retrieved) | Yes (API v2) | ? | n/p | IIIF framemark: 768 or 2500 px long edge; thumbs ≤ 100 px | ? | Furniture, product, fashion design |
| 19 | Biodiversity Heritage Library | Per item rights label | Text/book search only (`PublicationSearch`), not image search | Key | n/p | Images live on Flickr | Flickr keys need Pro (earlier note) | Illustrators, creature design |
| 20 | Internet Archive | Mixed; `licenseurl` field | Yes (advancedsearch; 10,000 sorted cap; scrape cursor) | None | Unpublished "fair use" throttling | Per-item files | ? | Designers (trade catalogues), but licences messy |

### Inferences
- **Ranking logic:**
  - One keyword call should return image-bearing, open-licensed records (SMK, Smithsonian, NASA, ambientCG, Commons).
  - This beats ID-only search (Met, Rijksmuseum), which costs 1 + N requests per keyword. Capping N (e.g., the
    first 24 IDs) keeps the weekly budget small.
  - Single, fixed image hosts fit LeMuse's per-host CSP. Aggregators don't.
- **SMK ranks first** because it matches the existing Cleveland connector shape: one search per keyword, filters
  for `has_image` and `public_domain`, full records, and IIIF.
- **The Met ranks second** despite the N+1 cost. It is the largest CC0 set with keyless access. Any connector must
  target `/v1.1/search`, because v1 was retired on 1 Oct 2026.
- **Wikimedia Commons** fills the designer, CAD and architecture gap better than any museum. It needs per-file
  licence capture and attribution, a compliant UA, and standard thumbnail widths only.
- **Avoid list:**
  - Harvard's terms forbid storing content more than two weeks, which conflicts with Save.
  - Science Museum Group bans IIIF harvesting, and its licence is NC-SA.
  - V&A stays blocked until §9 of its T&Cs is read.
  - LoC can serve CAPTCHA pages. A connector must stop on any HTML or CAPTCHA response, never solve one.

### Gaps
- Not verified this session:
  - SMK's rate limits and whether a key is needed (a dev.to listing implies none)
  - Smithsonian's own rate limit
  - The image host names for Smithsonian, NASA, NGA and LoC
  - ambientCG's licence page
- Per-host image CDN facts weren't confirmed: CORS headers, Cloudflare or Akamai fronting, Referer checks.

## Q2. Current (2026) terms and technical facts per source

### Takeaway
Two 2026 changes matter most:
- **The Met** replaced its search endpoint (v1.1 with offset/limit, Sept 2026). v1 is retired 1 Oct 2026.
- **Wikimedia** now enforces User-Agent policy (late 2025) and throttles non-standard thumbnail sizes (early 2026).

Rijksmuseum's new keyless Linked-Art search is live, but it has no free-text keyword field.

### Cited Findings
**The Met**
- `GET /public/collection/v1/search` "is deprecated and will be retired on October 1, 2026". Its replacement,
  `/public/collection/v1.1/search`, takes the same filters, plus `offset` and `limit`:
  - `limit` defaults to 100, max 500.
  - "The sum of `offset` and `limit` may not exceed 10,000".
  - "Requests without `offset`/`limit` return the first page (the first 100 results)".
  - `q` is optional on v1.1.
  - Latest update: 4 Sept 2026.
  - [Met Collection API](https://metmuseum.github.io/)
- Filters: `isHighlight`, `title`, `tags`, `departmentId`, `isOnView`, `artistOrCulture`, `medium`, `hasImages`,
  `geoLocation`, `dateBegin`/`dateEnd`. Search returns `total` + `objectIDs` only. Records come from
  `/objects/[objectID]` — [Met Collection API](https://metmuseum.github.io/)
- No key; "limit request rate to 80 requests per second". Image fields: `primaryImage`, `primaryImageSmall`,
  `additionalImages`, `isPublicDomain`. CC0 — [Met Collection API](https://metmuseum.github.io/)

**Rijksmuseum**
- `GET https://data.rijksmuseum.nl/search/collection`. "No API key is needed".
  - Parameters: `aboutActor`, `creator`, `creationDate` (wildcards), `description`, `imageAvailable`, `material`,
    `memberOfSetId`, `objectNumber`, `pageToken`, `technique`, `title`, `type`.
  - Up to 100 per page; "There is no limit to how many pages can be requested".
  - The response is a Linked Art `OrderedCollectionPage` of identifiers, resolved via the PID resolver.
  - "Library and archive records are currently not available through this API".
  - [Rijksmuseum Search API](https://data.rijksmuseum.nl/docs/search)
- Images and data are released under CC0, and public-domain items are labelled — [Rijksmuseum data policy](https://www.rijksmuseum.nl/en/data/policy)
- IIIF Image API via Micrio, built by Q42 (iiif.micr.io) — [Rijksmuseum IIIF Image API](https://acc.data.rijksmuseum.nl/docs/iiif/image)
- The legacy key API is deprecated — [earlier note](../Arena%20reference%20gatherer%20architecture/alternative_sources.md)

**SMK (Statens Museum for Kunst)**
- `api.smk.dk/api/v1/art/search/` takes `keys`, filters such as `has_image` and `public_domain`, and `rows`
  (example: 30). Swagger at api.smk.dk/api/v1/docs — [SMK: What is an API?](https://smk.dk/en/article/smk-api)
- `public_domain: true` means the data, "including photos, can be used freely". Out-of-copyright works use the
  Public Domain Mark, and SMK asks for creator credit — [SMK API article](https://smk.dk/en/article/smk-api); [SMK Open](https://smk.dk/en/article/smk-open)
- About 39,000 public-domain artworks (2024 count) — [Commons:SMK](https://c.enwp.org/wiki/Commons:SMK_-_Statens_Museum_for_Kunst)

**National Gallery of Art (US)**
- About 130,000 artwork records as CSV, CC0, "updated frequently (usually once a day)". "Images and media files
  are not included". No search API is mentioned — [NGA opendata](https://github.com/NationalGalleryOfArt/opendata)

**Smithsonian Open Access**
- Free api.data.gov key; CC0 — [earlier note](../Arena%20reference%20gatherer%20architecture/alternative_sources.md)
- api.data.gov defaults: 1,000 requests/hour per key, shown in `X-RateLimit-*` headers. DEMO_KEY allows 30/hr and
  50/day — [api.data.gov developer manual](https://api.data.gov/docs/developer-manual)

**Cooper Hewitt**
- GraphQL endpoint `https://api.cooperhewitt.org/`. "Open access, you do not have to register… calls to the API will
  be rate limited by default". The older REST API is at api.collection.cooperhewitt.org/rest/ — [Cooper Hewitt API docs](https://apidocs.cooperhewitt.org/?p=31); [collection API](https://collection.cooperhewitt.org/api)
- "Use our collection of CC0 objects…" doesn't say whether CC0 covers images — [apidocs.cooperhewitt.org](https://apidocs.cooperhewitt.org/)

**Harvard Art Museums**
- Every request needs an `apikey`, with "2500 per day". `size` goes up to 100. IIIF 2.1. "URLs for images of objects
  that have rights restrictions are excluded"
  — [Harvard API docs](https://github.com/harvardartmuseums/api-docs)
- Terms:
  - "The API is for non-commercial use only".
  - "You will not cache or store any content… for more than two weeks".
  - Images must be served from the API URL.
  - Content must link back to the museum.
  - Applications must be described to the museum, with free access for it.
  - [Harvard API docs](https://github.com/harvardartmuseums/api-docs)

**V&A**
- "Our collections data and images are made available under the terms of use for the V&A website, in particular
  section 9.3" — [V&A API guide](https://developers.vam.ac.uk/guide/v2/welcome.html)
- IIIF base `https://framemark.vam.ac.uk/collections/[id]/`. Sizes go "upto two different sizes", 768 or 2500 px.
  Thumbnails are no larger than 100 px — [V&A images](https://developers.vam.ac.uk/guide/v2/images/introduction.html)

**Science Museum Group**
- Datasets are CC BY-NC-SA 4.0. The datasets page warns that images must not be harvested from the IIIF/Zoom
  endpoints, or access will be blocked — [SMG datasets](https://coimages.sciencemuseumgroup.org.uk/datasets/index.html)
- Commercial image use goes through the Science & Society Picture Library — [SMG about](https://collection.sciencemuseumgroup.org.uk/about)
- JSON:API `/search/objects` per a third-party spec, which lists the licence as OGL. That conflicts with the CC
  terms above — [apis.io SMG](https://apis.io/apis/science-museum-group/science-museum-group-objects-api/)

**Wellcome Collection**
- "There's no sign up or authentication required". Wellcome-created data is CC0, and licences on other data are
  "being made clear per work". The Catalogue API links to IIIF. A daily snapshot is recommended for harvesting
  — [Wellcome catalogue docs](https://developers.wellcomecollection.org/docs/catalogue)

**Library of Congress**
- No key. The JSON/YAML API allows 20 req/min, with a 1-hour block. Image Services allow 150/min, with a 1-hour block.
  - "Users may get 429 status codes or HTML CAPTCHA pages even below the listed rates" during heavy traffic.
  - Paging stops at 100,000; `c` ≤ 1000.
  - [LoC working within limits](https://www.loc.gov/apis/json-and-yaml/working-within-limits/)

**Paris Musées**
- Needs an account on the apicollections site to generate tokens. GraphQL. Public-domain works are CC0, with
  150,000+ works in HD — [Paris Musées API](https://apicollections.parismusees.paris.fr/en); [Paris Musées open content](https://parismusees.paris.fr/en/actualite/open-content-150000-works-from-the-museum-collections-of-the-city-of-paris-freely)

**Europeana**
- Search needs the `wskey`. `reusability` takes open, restricted or permission — [Europeana API docs](https://europeana.atlassian.net/wiki/spaces/EF/pages/2385739812)
- Max 100 rows — [europeanaR vignette](https://search.r-project.org/CRAN/packages/europeanaR/vignettes/introduction-to-europeana-services.html)
- A forum reply gives 120 requests per 10 s (unofficial) — [Europeana API group](https://groups.google.com/g/europeanaAPI/c/dnjJBzWaQQU)

**Openverse**
- In 2022, anonymous `page_size` was restricted to the default of 20, and depth was capped at 20 pages
  — [Make Openverse 2022](https://make.wordpress.org/openverse/2022/08/11/openverse-api-results-constrained-to-20-pages/)
- Authenticated users "may request larger individual pages", but the total depth stays the same. The tiers are
  standard (via auth) and enhanced (granted on request) — [Openverse auth docs](https://wordpress.github.io/openverse-api/reference/api/authentication_and_throttling.html)

**NASA Image and Video Library**
- `search` takes `media_type` (image, video, audio) and `page_size` (default 100) — [images.nasa.gov API docs](https://images.nasa.gov/docs/images.nasa.gov_api_docs.pdf)
- No key or official rate-limit figure was found. One third-party trace saw no limit at 10 req/s — [Firecrawl listing](https://www.firecrawl.dev/alexandria/agents/providers/images-nasa-gov)

**Poly Haven**
- Documented endpoints are `GET /assets` and `GET /files/{id}`. A unique User-Agent is required. Show users that
  assets came from Poly Haven ("Powered by Poly Haven"). "No premium tier, no revenue share"; sponsorship is
  optional. Thumbnails are on `cdn.polyhaven.com` and downloads on `dl.polyhaven.org`. Endpoints may change — [Poly Haven API](https://polyhaven.com/our-api)

**ambientCG**
- `api/v2/full_json` takes `queryString`, `sort`, `limit`, `offset`, `category`, `dataType` and `include`
  (`previewData` etc.). Previews come in 64–2048 px PNG/WEBP/JPG on `acg-media.struffelproductions.com`, and some
  viewers on `f003.backblazeb2.com` — [ambientCG API v2 response](https://ambientcg.com/api/v2/full_json)

**Biodiversity Heritage Library**
- API v3 at `/api3` needs an `apikey`. `PublicationSearch` replaced `BookSearch` and searches titles, items and
  parts — [BHL PublicationSearch](https://www.biodiversitylibrary.org/docs/api3/PublicationSearch.html); [BHL blog 2018](https://blog.biodiversitylibrary.org/2018/09/version-3-of-the-bhl-api-now-available)
- A third-party guide says Flickr images follow the item's rights. It credits "Image from the Biodiversity Heritage
  Library" and says v2 retires on 31 Dec 2026 (unconfirmed) — [CASRAI BHL guide](https://casrai.org/guides/biodiversity-heritage-library)

**Internet Archive**
- Scrape API with a cursor at `/services/search/v1/scrape`. advancedsearch paging is capped at 10,000. The
  `licenseurl` field can be filtered — [IA scrape gist](https://gist.github.com/jjjake/e929a84535a5fc433aec)
- The `ia` client supports `Retry-After`, but no published quota was found — [internetarchive updates](https://archive.org/developers/internetarchive/updates.html)

### Inferences
- **The Met:**
  - Per keyword: one v1.1 search with `hasImages=true` and `limit` set to about 24, then up to 24 object calls.
  - Keep only `isPublicDomain && primaryImage != ""`.
  - Display `primaryImageSmall`; Save `primaryImage`.
- **Rijksmuseum** keyword topics have to map to `description`, `type`, `material` or `technique`. Records need
  Linked Art parsing, which is heavier than any existing connector.
- **NGA** fits only as a locally indexed source: import the daily CSV metadata into the FTS5 catalog and stream
  IIIF images. That is "metadata bulk, images streamed", which the CC0 licence allows. It is a bigger design change
  (new ingestion path), so it isn't a next build.
- **Paris Musées** needs a token, which means a Credential Manager entry and a per-user account. That puts it
  behind keyless sources.

### Gaps
- V&A T&Cs §9 and §9.3 text wasn't retrieved, so its reuse and app terms are unknown.
- Cooper Hewitt image rights, the GraphQL rate limit, and whether Cooper Hewitt images appear in Smithsonian OA
  under CC0 weren't verified.
- Wellcome's image licence values (e.g., CC-BY, PDM) and pageSize limits weren't retrieved.
- The current Openverse anonymous numbers (2026) weren't retrieved. The live docs page rendered empty.
- Europeana's official rate limit and thumbnail service weren't confirmed.

## Q3. Bot challenges, hotlinking and CORS on image hosts

### Takeaway
- **Documented bot or anti-harvest behaviour:**
  - AIC (Cloudflare, held back already)
  - Science Museum Group (IIIF harvesting blocked)
  - LoC (CAPTCHA pages under load)
  - Wikimedia (UA enforcement; throttling of non-standard thumbnails)
- **CORS:** the IIIF Image API spec says servers *should* send CORS on image responses. IIIF hosts (Rijksmuseum
  Micrio, SMK, Wellcome, Harvard, V&A, NGA) are therefore the likeliest to allow canvas pixel reads. No
  per-host header facts were documented for any source.

### Cited Findings
- IIIF Image API 3.0 says:
  - "Servers should support CORS on image responses."
  - "Servers should support CORS on image information responses."
  - The `cors` feature means "The CORS HTTP headers are provided on all responses".
  - [IIIF Image API 3.0](https://iiif.io/api/image/3.0/)
- Wikimedia:
  - Hotlinking "is allowed, but it is problematic". It doesn't carry licence terms or credit, consumes bandwidth,
    and breaks when Wikimedia changes things.
  - Since late 2025, requests without a compliant UA may be classed as unidentified and throttled or blocked.
  - Since early 2026, "image servers favor predefined thumbnail widths, and requests for other sizes are
    rate-limited strictly".
  - [MediaWiki: InstantCommons](https://www.mediawiki.org/wiki/Instant_Commons)
- The standard widths are 20, 40, 60, 120, 250, 330, 500, 960, 1280, 1920 and 3840 px. Tool builders should "only
  request standard thumbnail sizes" or use the API — [MediaWiki: Common thumbnail sizes](https://www.mediawiki.org/wiki/Common_thumbnail_sizes)
- The non-standard-size throttle was toggled in Feb 2026, and operators hit it in April 2026 — [Phabricator T402792](https://phabricator.wikimedia.org/T402792); [OSM rails-dev Apr 2026](https://lists.openstreetmap.org/pipermail/rails-dev/2026-April/049560.html)
- MediaWiki API CORS works from any origin with `origin=*` (API only, not the file host) — [MediaWiki Manual:CORS](https://www.mediawiki.org/wiki/Manual:CORS)
- Science Museum Group: no harvesting from IIIF/Zoom, or access is blocked — [SMG datasets](https://coimages.sciencemuseumgroup.org.uk/datasets/index.html)
- LoC: "HTML CAPTCHA pages even below the listed rates" — [LoC limits](https://www.loc.gov/apis/json-and-yaml/working-within-limits/)
- Harvard: images must be served from the API URL; no local copy kept over 2 weeks — [Harvard API docs](https://github.com/harvardartmuseums/api-docs)
- From the earlier note: Thingiverse and ArtStation serve Cloudflare challenges to automated clients — [earlier note](../Arena%20reference%20gatherer%20architecture/alternative_sources.md)

### Inferences
- **Palette extraction:** rather than depending on each host's ACAO header (unknowable without probing), compute the
  palette in the Rust core from bytes fetched through `HttpClient` into memory, then discard them. This avoids
  canvas tainting entirely and keeps the ADR-0009 "no images in caches" rule, since nothing is written to disk.
  Using `crossorigin="anonymous"` on `<img>` would break display on any host that lacks CORS, so it shouldn't be
  the default.
- **Commons connector:**
  - Request 960 or 1280 px for display and 1920 or 3840 px only when needed. Save takes the original file URL.
  - The WebView's own browser UA is fine for hotlinked display.
  - The Rust API calls need the `LeMuse/<ver> (+contact)` UA.
- **Aggregators:** Openverse, Europeana and Internet Archive return images from arbitrary provider hosts, and
  LeMuse's CSP can't allow-list all of them. A proxy thumbnail service would mean trusting a single aggregator
  host, which needs its own ADR.
- **LoC connector:** must treat any `text/html` response to a JSON request as a hard stop for that run (a CAPTCHA
  is bot protection), which aligns with the "never work around bot protection" rule.

### Gaps
- No documented `Access-Control-Allow-Origin` behaviour was found for any of these hosts:
  - images.metmuseum.org
  - ids.si.edu
  - upload.wikimedia.org
  - iiif.micr.io
  - SMK IIIF
  - images-assets.nasa.gov
  - cdn.polyhaven.com
  - acg-media
- Whether any of the hosts below sit behind Cloudflare or Akamai challenges wasn't documented:
  - The Met
  - Smithsonian
  - Rijksmuseum (Micrio)
  - SMK
  - NASA
  - Poly Haven
  - ambientCG
- These need a single, browser-like manual check by the owner, not automated probing.

## Q4. Known problems with specific APIs

### Takeaway
- **The Met:** the main 2026 issue is the endpoint migration. Search returns IDs only, and the image fields are
  empty for non-open-access objects.
- **Wikimedia:** thumbnail-size throttling, and UA-correct clients still get rate-limited.
- **Europeana:** a `qf=REUSABILITY:open` facet bug was reported.
- **Openverse:** anonymous depth is limited.

### Cited Findings
- The Met:
  - v1 search returns the whole result set and is retired on 1 Oct 2026. v1.1 caps reachable results at 10,000.
  - Images are present only when "available under Open Access".
  - [Met Collection API](https://metmuseum.github.io/)
- Commons: a script with a correct UA was still rate-limited (March 2026) — [pandoc discussion #11550](https://github.com/jgm/pandoc/discussions/11550)
- Europeana: `qf=REUSABILITY:open` returned zero items. Use the `reusability=open` parameter instead (no resolution
  was seen) — [Europeana API group](https://groups.google.com/g/europeanaapi/c/IILELppD4nE)
- Openverse: results are constrained to 20 pages (2022) — [Make Openverse](https://make.wordpress.org/openverse/2022/08/11/openverse-api-results-constrained-to-20-pages/)
- Rijksmuseum: no library or archive records via search, and no free-text field — [Rijksmuseum Search API](https://data.rijksmuseum.nl/docs/search)

### Inferences
- The widely discussed "Met search returns objects without images" problem follows from the documented behaviour
  above. `hasImages` matches objects that have images on the website, but the API's `primaryImage` stays empty
  unless the object is Open Access. A connector must filter after the object fetch, and expect fewer results than
  IDs.

### Gaps
- No primary GitHub issue thread was retrieved on the Met's `hasImages` / empty-`primaryImage` mismatch, or on
  "empty search" results. The search didn't surface the metmuseum/openaccess issues.

## Q5. Best gap-fillers for designers and CAD users

### Takeaway
- **Smithsonian OA** (Cooper Hewitt design objects, Air and Space hardware, CC0 3D) and **Wikimedia Commons**
  (machines, tools, vehicles, architecture) are the best licence-safe fillers.
- **Science Museum Group** and **V&A** have the best mechanism and furniture content but restrictive or unverified
  terms.
- **Poly Haven** and **ambientCG** cover materials and textures.
- **NASA** covers hardware.
- **LoC** likely covers architecture drawings, but its rate limit and CAPTCHA behaviour make it a careful,
  low-volume connector.

### Cited Findings
- Smithsonian's 2020 release included 2,200+ CC0 3D models (glTF) — [earlier note](../Arena%20reference%20gatherer%20architecture/alternative_sources.md)
- Cooper Hewitt markets "CC0 objects" via its API — [apidocs.cooperhewitt.org](https://apidocs.cooperhewitt.org/)
- SMG has around 150,000 records with CC-licensed images, under NC-SA — [SMG datasets](https://coimages.sciencemuseumgroup.org.uk/datasets/index.html)
- V&A images come at 768 or 2500 px under its site T&Cs — [V&A images](https://developers.vam.ac.uk/guide/v2/images/introduction.html)
- ambientCG previews go up to 2048 px — [ambientCG API v2](https://ambientcg.com/api/v2/full_json)
- Poly Haven is CC0 with keyless access — [Poly Haven API](https://polyhaven.com/our-api)
- Rijksmuseum `type` and `material` filters (e.g., `type=painting`, `material=canvas`) allow object-type topics
  such as ship models or furniture — [Rijksmuseum Search API](https://data.rijksmuseum.nl/docs/search)
- The Met's `medium` and `departmentId` filters allow topics such as arms and armor or musical instruments — [Met Collection API](https://metmuseum.github.io/)

### Inferences
- **Product and industrial designers** (form, mechanisms): Smithsonian (Cooper Hewitt, NASM), then Commons, then
  NASA. SMG would be the best mechanisms source if NC-SA and its harvesting clause are acceptable for display-only
  streaming. That is an owner decision, so ask before building.
- **Architects and interior designers:** Commons (architecture, interiors), plus Rijksmuseum and Met decorative-arts
  departments. LoC architecture drawings fit later, behind its 20 req/min budget.
- **Game and 3D artists:** Poly Haven, then ambientCG (both CC0, single CDN host each).

### Gaps
- LoC's HABS/HAER rights and the image host (tile.loc.gov) weren't verified this session.
- Cooper Hewitt image licensing wasn't confirmed: Smithsonian OA's CC0 scope versus the GraphQL API.

## Q6. Local-folder sources: how others do watched folders, and Windows pitfalls

### Takeaway
- **Allusion** references watched folders in place.
- **Eagle** auto-imports from a monitored folder into its own library and supports only local paths, not NAS.
- **PureRef** has no documented watched-folder feature.
- The main Windows pitfall is OneDrive Files On-Demand. Reading a placeholder hydrates (downloads) it, so a folder
  scanner must check `FILE_ATTRIBUTE_RECALL_ON_DATA_ACCESS` before opening.
- **WebView2 formats:** HEIC is not supported in Edge. The AVIF and JPEG XL status needs checking against the
  current runtime.

### Cited Findings
- Allusion: "uses watched folders to access your library". It focuses on library management, while PureRef is
  "typically used on a per project basis" — [Allusion](https://allusion-app.github.io)
- Eagle Auto-Import monitors a folder and saves files into the Eagle library. It "currently supports only local
  paths, not network or NAS storage devices" — [Eagle Auto-Import](https://en.eagle.cool/support/article/the-auto-import); [Eagle docs](https://docs-en.eagle.cool/article/1287-the-auto-import)
- A common workflow is Eagle for the large library and PureRef per project — [Blender Artists](https://blenderartists.org/t/how-do-you-guys-manage-your-references/1555538.md)
- Placeholders carry `FILE_ATTRIBUTE_RECALL_ON_DATA_ACCESS`. Reads or writes on them cause hydration —
  [Microsoft: Handling placeholders](https://learn.microsoft.com/en-us/windows-hardware/drivers/ifs/placeholders_guidance)
- Files On-Demand states map to attributes, and `attrib +p` pins a file — [Microsoft: Files On-Demand on Windows](https://learn.microsoft.com/en-us/OneDrive/files-on-demand-windows)
- Blender's file dialog triggered OneDrive downloads just by browsing — [Blender T87621](https://developer.blender.org/T87621)
- A user report says `CreateFile`/`ReadFile` hydrate unless the file is opened with `FILE_FLAG_OPEN_NO_RECALL`
  (unofficial) — [GitHub issue](https://github.com/anthropics/claude-code/issues/62140)
- HEIC: unsupported in Edge across versions 12–155, because of licensing and complexity — [caniuse HEIC](https://caniuse.com/HEIC)
- AVIF: 2022 Microsoft answers say Edge didn't render it (dated) — [Microsoft Q&A 2022](https://learn.microsoft.com/en-us/answers/questions/809434/avif-format-not-supported-in-microsoft-edge)
- JPEG XL: partial or flag-gated in Chromium. Support is returning to Chromium code — [caniuse JXL](https://caniuse.com/jpeg-xl)

### Inferences
- **Allusion's model** (reference in place, no copy) fits LeMuse best. A local folder becomes a source whose
  `MediaRef` is a file path, served to the WebView through a scoped asset protocol. Files are never copied, which
  is consistent with "only Save writes image bytes".
  - This needs an ADR for the Tauri asset-protocol scope (a guardrail and capability change).
- **The scanner should:**
  - enumerate metadata only;
  - skip, or mark "cloud-only", any file with the recall or offline attributes, and never thumbnail it;
  - honour Eagle's lesson by refusing or warning on UNC/NAS paths.
- **HEIC files** need a fallback: show a "format not supported" card rather than a broken image. Decoding HEIC in
  Rust would add a patent-encumbered or heavy dependency, so defer it.

### Gaps
- None of the following was verified with a primary source this session:
  - Windows long-path behaviour (MAX_PATH 260 versus `LongPathsEnabled` plus a manifest `longPathAware` entry) for
    the Rust `std::fs` and WebView2 asset protocol.
  - Current WebView2 (2026) AVIF, WebP and JXL support. No Microsoft WebView2 doc on image formats was found.
  - Whether Eagle Auto-Import moves or copies originals. Its doc doesn't say.
  - PureRef's folder features.
