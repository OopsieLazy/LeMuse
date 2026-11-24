# New free imagery inputs for LeMuse (beyond earlier research), Nov 2026

Scope: candidate image inputs that the two earlier notes don't already rank:
- `research_notes/LeMuse post launch gap audit/image_sources.md` (SMK, Met, Commons, Smithsonian, Rijksmuseum, Poly Haven,
  NASA, Cooper Hewitt, Wellcome, ambientCG, Harvard, SMG, V&A, LoC, NGA, Paris Musées, Europeana, Openverse, IA, BHL, AIC)
- `research_notes/Arena reference gatherer architecture/alternative_sources.md`, which also covers the Unsplash, Pexels, Flickr
  (Pro-only keys), Sketchfab Download API, Thingiverse, Printables, GrabCAD, Onshape, McMaster, Pinterest, Behance and
  ArtStation basics. Those facts are referenced here, not repeated.

What LeMuse needs: one keyword search per topic keyword, one page, weekly. Images are hotlinked from a CSP-allow-listed
host, and only an explicit Save writes a file. No bot-protection workarounds.

Method: documented behaviour only. No host was probed. "n/p" means not published in the pages reviewed. "Not verified"
means no primary source was retrieved this session. This is not legal advice.

## Q1. Ranked table of new candidate inputs

### Takeaway
No new source beats the earlier top picks (SMK, Met, Commons, Smithsonian). The best new additions are:
- **Pexels**: free instant key, no hotlink ban, strong for people, poses and interiors.
- **Unsplash**: hotlinking is *required*, which fits LeMuse's design, and images come from one host. The catch is key
  handling in an open-source app, plus the production-approval rules.
- **NYPL Digital Collections**: a `publicDomainOnly` filter, but a token by email.
- **iNaturalist**: keyless, per-photo CC licences, animals and plants.
- **GBIF's image cache**: one host, up to 1200 px.
- **Te Papa** and **Auckland Museum**: per-item licences.

Avoid as automated inputs, or defer:
- **Pixabay**: permanent hotlinking is forbidden, and URLs expire after 24 h.
- **Flickr**: Pro key needed, 30 photos per page.
- **Brooklyn**: key, 3,000/day, licence unclear.
- **David Rumsey**: NC-SA, no official API.
- **Mastodon and Bluesky**: consent and licensing.
- **Google Photos**: library reads removed in 2025.

### Cited Findings
Each row is sourced in Q2–Q6. "?" means not verified.

| Rank | Source | Licence (images) | Keyword search, 1 page | Key/account | Rate limit | Image sizes | Hotlinking policy | Attribution | CSP (image hosts) | Bot protection | Main audience |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | Pexels | Pexels licence (text n/p) | Yes (search) | Free instant key | 200/hr, 20k/mo | Several sizes (?) | No hotlink clause | Prominent Pexels link; credit photographer "when possible" | One host (images.pexels.com ?) | n/p | Figure/gesture, interiors, product photography |
| 2 | Unsplash | Unsplash licence | Yes (`/search/photos`) | Key (Client-ID); production needs approval | 50/hr demo, 1,000/hr prod; image requests don't count | `urls.*` sizes | **Hotlinking required** | Unsplash + photographer + profile link with UTM; call `download_location` on download | One host (images.unsplash.com) | n/p | Figure, architecture, interiors, product |
| 3 | NYPL Digital Collections | Public domain items: "do not need NYPL's permission" | Yes, v2 search with `publicDomainOnly=true` | Token by email sign-up | n/p | ? | n/p | n/p | ? | n/p | Architects (plans, views), illustrators, teachers |
| 4 | iNaturalist | Per photo (CC0/CC BY/CC BY-NC…, ARR) | Yes (observations API) | None | 100/min max, ask ≤ 60/min; ~10k/day | ? | n/p; open-data bucket throttles downloads | Per photo CC credit | ? (S3 / static hosts, not verified) | Undocumented throttling of media | Creature/animal studies (figure, game artists) |
| 5 | GBIF (occurrence + image cache) | Per image; "may be licensed under more restrictive terms" | Yes, occurrence search `media_type=StillImage` | None | "single HTTP connection" for scripted use | Cache ≤ 1200×1200, JPEG q85; resize prefix e.g. `200x` | Cache serves www.GBIF.org "and other uses" | Per publisher licence | **One host: api.gbif.org** | n/p | Natural forms, specimens (illustrators, game artists) |
| 6 | Te Papa (NZ) | Data CC BY 4.0; images per item (open, CC BY, **CC BY-NC-ND**) | Yes (Collections API) | Registered key (guest key 15 min) | 10 req/s per key | n/p | Show caption, link to item page | Required credit line | ? | n/p | Teachers, artists, natural history |
| 7 | Auckland Museum | CC BY or "No Known Copyright Restrictions" per record; some CC BY-NC | Yes, `/search/collectionsonline/_search?q=` | **None** (key removed) | n/p | `/id/media` | n/p | Per record | ? | n/p | Teachers, artists, natural history, design objects |
| 8 | Getty Museum | Open Content images CC0 (~88k, 2024), but "not all" | **No REST keyword search found**; Linked Art + SPARQL | None noted | n/p | IIIF on media.getty.edu | n/p | n/p | One host (media.getty.edu) | n/p | Drawings, master studies, photography |
| 9 | Finnish National Gallery | CC0 for ~12k PD images (dated) | API (Swagger) | Free key | n/p | ? | n/p | n/p | ? | n/p | Painting, drawing |
| 10 | Mia (Minneapolis) | PD works marked CC PDM; repo says images fall under Mia's image policy | **No search API documented**; GitHub JSON dump | None | n/p | 100 / 600 / 800 px via api.artsmia.org | n/p | Credit Mia | One host (api.artsmia.org) | n/p | Artists, decorative arts |
| 11 | Yale (LUX / YCBA) | YCBA: ~70k PD images, open access | LUX Linked Art API (search endpoint not verified) | None | n/p | IIIF | n/p | n/p | ? | n/p | Artists, architects (prints, drawings) |
| 12 | US patent drawings (USPTO) | Generally not under copyright; exceptions where a notice appears | Endpoint not researched | ? | ? | ? | ? | USPTO asks for acknowledgement | ? | ? | **Product/industrial/CAD designers** |
| 13 | Sketchfab (thumbnails, CC models) | Downloadable models are CC (cc0, cc-by…) | Yes: `/v3/models?downloadable&license=cc0` (keyless per unofficial mirror) | None for search (?); OAuth for download | n/p | Thumbnails (host ?) | n/p | Creator + licence + "provided by Sketchfab" | ? | n/p | Game/3D artists, product designers |
| 14 | Flickr (Commons / CC search) | Per photo; Commons = "no known copyright restrictions" | Yes | **Pro-only key** | n/p in ToS | n/p | Cache only "reasonable periods"; **≤ 30 photos per page** | "uses the Flickr API but is not endorsed" notice; honour owner licences | ? (static hosts) | n/p | Everyone (archives via Commons) |
| 15 | Pixabay | Pixabay licence | Yes, `q` ≤ 100 chars, `per_page` 3–200 | Key (login) | 100 per 60 s per key | 150 / 640 (180–960) / 1280; full HD and original only for approved accounts | **"permanent hotlinking … not allowed"**; webformat URL valid 24 h; cache results 24 h | Show where images come from | ? | n/p | Figure, objects, illustrations |
| 16 | DPLA | Per item (rightsstatements.org) | Yes | Free key (email) | n/p | Thumbnails | Thumbnails from contributors | Per item | **Many hosts** (aggregator) | n/p | Teachers, historians |
| 17 | Brooklyn Museum | Conflicting: CC BY vs older CC BY-NC | Yes | Personal key | **3,000 calls/day** | n/p | n/p | Required display fields + credit line | ? | n/p | Artists |
| 18 | Walters Art Museum | CC0 (with exceptions) | **API v1 closed 2023**; static CSVs | n/a | n/a | n/p | n/p | n/p | ? | n/p | Artists, manuscripts |
| 19 | DigitaltMuseum (Norway/Sweden) | Not found | Yes (Solr API) | Key (`demo` for testing) | n/p | n/p | n/p | n/p | ? | n/p | Design objects, photography |
| 20 | David Rumsey Map Collection | **CC BY-NC-SA 3.0** | No official API found | n/a | n/a | IIIF (unofficial) | n/p | Required credit line | ? | n/p | Teachers, illustrators (maps) |
| — | Mastodon hashtags / Bluesky feeds | Posters keep copyright (no open licence) | Mastodon `GET /api/v1/timelines/tag/:hashtag` | Instance-dependent | Instance-dependent | Instance media | n/p | n/p | **Many hosts** | n/p | Not recommended |
| — | Google Photos | User's own photos | **Library read scopes removed 31 Mar 2025**; Picker API only | OAuth | n/p | n/p | n/p | n/a | Google hosts | n/a | User-supplied (manual pick only) |
| — | Burst (Shopify), StockSnap | Burst: free commercial use, no attribution | **No API found** | n/a | n/a | n/a | n/a | n/a | n/a | n/a | Not usable as connectors |

### Inferences
- **Ranking logic** follows the earlier note: one keyword call returns open-licensed, image-bearing records from a single
  fixed host. Hotlinking-friendly terms rank higher, because LeMuse never caches.
- **Unsplash fits LeMuse's design better than any other commercial API.** It *requires* hotlinking, and LeMuse already
  streams from the CDN and saves only on request. The blockers are elsewhere:
  - **Key handling:** an MIT repo can't hide a shipped key.
  - **User keys aren't an option:** users must not be required to register their own developer account (earlier
    note).
  - **Production approval** is needed.
  - **Wording:** the "non-automated" clause may sit badly with a scheduled weekly refresh.
  - This is an owner decision before any build.
- **Pexels** has the cleanest terms for LeMuse: a free instant key and no hotlink clause. It has the same shipped-key
  problem. Neither Pexels nor Unsplash may be used to replicate their core experience or build a wallpaper app (earlier
  note). A topic slideshow is arguably different, but that's a judgement call.
- **Pixabay conflicts with LeMuse's no-cache model.** Its docs tell apps to download images to their own server rather than
  hotlink permanently, and its display URLs expire within 24 h. LeMuse would have to re-search every session and
  could only show "temporary display of search results". Avoid it.
- **Single-host candidates:** GBIF's image cache (api.gbif.org), Getty (media.getty.edu) and Mia (api.artsmia.org) each
  need one CSP entry. DPLA, Flickr CC search, Mastodon and RSS do not.

### Gaps
- Image CDN host names weren't verified this session for Pexels, iNaturalist, NYPL, Te Papa, Auckland, Sketchfab and
  Flickr. None of the hosts listed was checked for CORS, Cloudflare or Akamai fronting.
- Not researched at all, for time: Princeton University Art Museum, Philadelphia Museum of Art, Nationalmuseum Sweden,
  Statens museum (Norway).

## Q2. Photo APIs that permit or require hotlinking (Unsplash, Pexels, Pixabay, Flickr, Burst, StockSnap)

### Takeaway
- **Unsplash** requires hotlinking, and **Pexels** is silent on it. Both suit streaming.
- **Pixabay** explicitly forbids permanent hotlinking and wants server-side copies, the opposite of LeMuse's model.
- **Flickr** allows caching for "reasonable periods" but caps display at 30 photos per page, and its keys are Pro-only.
- **Burst** and **StockSnap** have no public API found.

### Cited Findings
**Unsplash** (core facts in [earlier note](../Arena%20reference%20gatherer%20architecture/alternative_sources.md))
- Hotlinking is required. A download endpoint must be called on download. Demo allows 50/hr, production 1,000/hr.
  Requests to `images.unsplash.com` don't count against the limit. Attribution goes to Unsplash and the photographer,
  with a profile link carrying UTM parameters — [Unsplash API Guidelines](https://help.unsplash.com/en/articles/2511245-unsplash-api-guidelines); [Unsplash docs](https://unsplash.com/documentation)
- The official `unsplash-js` wrapper says browser apps should proxy requests through their own server, which signs them
  with the Access Key, and set a proxy `baseUrl` instead of `accessKey` — [unsplash-js](https://github.com/unsplash/unsplash-js)
- Secrets scanners treat the Unsplash access key as a secret that shouldn't appear in client code or public repos.
  They recommend regenerating it if exposed — [SailPoint: Unsplash access key](https://documentation.sailpoint.com/entro/help/supported-secrets/specific-secrets/unsplash-access-key.html)
- A third-party integration guide uses a serverless function to hold the key, with CORS limited to the site's domain — [Webflow blog](https://webflow.com/blog/build-ecommerce-with-unsplash-webflow)

**Pexels** (from the [earlier note](../Arena%20reference%20gatherer%20architecture/alternative_sources.md))
- Free instant key. 200 req/hr, 20,000/month. Attribution: a prominent link to Pexels, and credit the photographer
  "when possible". No wallpaper or core-replication apps. No hotlinking or caching clause — [Pexels API docs](https://www.pexels.com/api/documentation/)

**Pixabay**
- Every request needs a `key`. The default limit is 100 requests per 60 s per key, shown in `X-RateLimit-*` headers.
  Going over returns 429 — [Pixabay API docs](https://pixabay.com/api/docs/)
- "Requests must be cached for 24 hours." Don't "send lots of automated queries" — [Pixabay API docs](https://pixabay.com/api/docs/)
- Search: `q` must not exceed 100 characters. `image_type` takes all, photo, illustration or vector. `per_page` runs
  3–200 (default 20). Other parameters include `safesearch`, `orientation`, `category`, `min_width`, `colors`, `order`,
  `page` and `callback` (JSONP) — [Pixabay API docs](https://pixabay.com/api/docs/)
- Sizes and URL lifetimes — [Pixabay API docs](https://pixabay.com/api/docs/):
  - `previewURL`: up to 150 px.
  - `webformatURL`: up to 640 px, "valid for 24 hours". Swap `_640` for `_180`, `_340` or `_960`.
  - `largeImageURL`: up to 1280 px.
  - `fullHDURL`, `imageURL` and `vectorURL`: only for accounts "approved for full API access".
- Hotlinking: "Returned image URLs may be used for temporarily displaying search results. However, permanent hotlinking
  of images (using Pixabay URLs in your app) is not allowed." Download images to your server first. Videos may be
  embedded — [Pixabay API docs](https://pixabay.com/api/docs/)
- Attribution: "show your users where the images and videos are from, whenever search results are displayed" — [Pixabay API docs](https://pixabay.com/api/docs/)

**Flickr**
- API ToS, last updated 9 May 2018 — [Flickr API ToS](https://www.flickr.com/services/api/tos/):
  - Don't "Cache or store any Flickr user photos other than for reasonable periods".
  - Don't "Display more than 30 Flickr user photos per page".
  - "Comply with any requirements or restrictions imposed on usage of the photos by their respective owners".
  - Show the notice "This product uses the Flickr API but is not endorsed or certified by SmugMug, Inc."
  - An app is commercial if its "primary purpose… is to derive revenue".
  - No numeric rate limit is given; avoid use that "adversely impacts the stability of Flickr.com servers".
- API keys are for Pro subscribers only. Commercial keys need prior permission. Developers are asked not to request a
  commercial key for free or non-commercial projects — [Flickr Help: Flickr API](https://www.flickrhelp.com/hc/en-us/articles/4404070036884-Flickr-API) (via search summary); [Flickr API keys page](https://www.flickr.com/services/api/misc.api_keys.html)
- The Commons label "no known copyright restrictions" carries no warranty. Institutions may not hold the rights, and users
  must "CONDUCT AN INDEPENDENT ANALYSIS OF APPLICABLE LAW" before reuse — [Flickr Commons usage](https://www.flickr.com/commons/usage/)

**Burst (Shopify) and StockSnap**
- Burst photos are described as free for commercial use with no attribution required. Burst is a Shopify Garage
  product. No API was found — [Burst about](https://burst.shopify.com/about-us); [Shopify Help: Burst](https://help.shopify.com/en/manual/online-store/images/burst)
- StockSnap: no API was found in search results.

### Inferences
- **Unsplash and Pexels in a desktop app:** the key would ship inside an open-source binary or repo, so it can't stay
  secret. The options are:
  - a per-user key in Credential Manager: works for Pexels, but Unsplash bars requiring users to register their own
    developer account;
  - a small owner-run proxy: costs money and adds infrastructure (owner decision);
  - leaving them out.
- **Flickr's caps clash with LeMuse.** The 30-photos-per-page cap and Pro-only key make it a paid, constrained input.
  Flickr Commons content is better reached via Commons-mirrored institutions or the institutions' own APIs.
- **Pixabay's 24-hour URL expiry** would break LeMuse's weekly refresh model. Stored `block_media` URLs would go stale
  within a day.

### Gaps
- Pexels image host, image sizes and CORS weren't re-verified. Pexels' licence page text wasn't fetched.
- Whether Unsplash allows a key embedded in an open-source desktop client wasn't found in primary text.
- Flickr's image static host names weren't verified. The current Help page returned 403 to direct fetch in the earlier
  session.
- Whether Unsplash's "non-automated" wording covers scheduled keyword refreshes is not addressed in the guidelines
  reviewed.

## Q3. Nature and objects: iNaturalist, GBIF

### Takeaway
- **iNaturalist** is keyless, with per-photo licences. Its documented ceiling is 100 req/min (prefer ≤ 60) and about
  10k/day. Media downloads from its open-data bucket throttle quickly.
- **GBIF** offers a single-host image cache (api.gbif.org, ≤ 1200 px) that suits LeMuse's CSP, but every image carries
  the publisher's own licence.

### Cited Findings
- iNaturalist's developer docs throttle to "a max of 100 requests per minute", and ask clients to "keep it to 60 requests
  per minute or lower". A forum post quotes the terms as about 10,000 requests per day. Blocks may come "without
  notification" — [iNaturalist forum: rate limit discrepancy](https://forum.inaturalist.org/t/discrepancy-between-documented-rate-limit-observed-rate-limit/8612); [iNaturalist developers page](https://chile.inaturalist.org/pages/developers)
- Developers report 429 errors at 60 calls per minute (on the histogram endpoint) — [iNaturalist forum 2025](https://forum.inaturalist.org/t/429-error-from-observations-histogram-api-when-calling-at-60-calls-minute/64709)
- On the inaturalist-open-data bucket, one image per second "almost instantly hit the rate-limit", and the limits are
  undocumented — [inaturalist-open-data issue #5](https://www.github.com/inaturalist/inaturalist-open-data/issues/5)
- Whether API throttling applies to image URLs was asked on the forum — [iNaturalist forum](https://forum.inaturalist.org/t/does-api-throttling-apply-to-get-endpoints-only-or-to-image-urls-as-well/43270)
  (answer not retrieved)
- GBIF image cache — [GBIF Occurrence image API](https://techdocs.gbif.org/en/openapi/images):
  - URL pattern: `https://api.gbif.org/v1/image/cache/occurrence/[gbifId]/media/[md5sum(identifier)]`, with a resize
    prefix such as `200x`.
  - Maximum 1200×1200 px; JPEG quality of larger images limited to 85.
  - "Please limit scripted usage of this API to a single HTTP connection."
  - Uncached images "may be slow to load or fail to load".
  - It exists "to support display of occurrence images on www.GBIF.org and other uses".
  - Images "may be licensed under more restrictive terms".
- GBIF occurrence search takes `media_type=StillImage`. The `media` array mixes audio and video, so filter on
  `"type": "StillImage"`. Offset paging is capped at 100k records — [GBIF Discourse](https://discourse.gbif.org/t/api-for-images-not-working-consistently/5918); [GBIF Discourse 2](https://discourse.gbif.org/t/accessing-api-images-without-downloads-in-occurrence-api/3849)
- In 2015, `mediaType` returned zero results after an index change, so parameter spelling matters — [GBIF api-users 2015](https://lists.gbif.org/pipermail/api-users/2015-July/000181.html)

### Inferences
- **iNaturalist** is the best new input for animal and creature studies (gesture artists, game and creature designers).
  - The connector should filter on the photo licence (CC0/CC BY only, if the owner wants no NC).
  - Keep to ≤ 1 request per second: one search per keyword, weekly, is far below the limits.
  - Hotlinked display must stay light, because media throttling is undocumented.
- **GBIF** gives one CSP host for many publishers' images, which is unusual and valuable.
  - Licences must be stored per image (GBIF media records carry a licence field; not verified this session).
  - Single-connection fetching matches LeMuse's preload ≤ 2, at the edge. Preload should be 1 for GBIF.

### Gaps
- The iNaturalist photo licence filter parameter (e.g. `photo_license`) and image host names weren't verified. The
  official docs page rendered empty, and the recommended-practices page returned 403.
- No documented GBIF licence filter for media on occurrence search was found. No GBIF numeric rate limit was found.

## Q4. More museums and archives with a usable search API

### Takeaway
- **Keyless with keyword search:** Auckland Museum only.
- **Free key, real search, but per-item licences** that include NC-ND: Te Papa, NYPL, Finnish National Gallery,
  Brooklyn, DPLA.
- **Strong CC0 images but no simple keyword search:** Getty, Yale and Mia offer Linked Art, SPARQL or dumps only. Walters
  closed its API in 2023.
- **Non-commercial:** David Rumsey (NC-SA).

### Cited Findings
**Te Papa**
- Guest keys last 15 minutes. Assigned keys are permanent and need name, organisation and email. 10 requests per second
  per key. Metadata is CC BY 4.0, with a set credit line — [Te Papa API terms (PDF)](https://www.tepapa.govt.nz/assets/76067/1693184837-collections_api_terms_of_use.pdf); [Te Papa key registration](https://data.tepapa.govt.nz/docs/register.html)
- Image licences vary per item: some have no restrictions, some are CC BY, and some are CC BY-NC-ND. Show the
  caption/captionFormatted fields and link back to the item page — [Te Papa API terms](https://tepapa.govt.nz/api-terms-of-use); [Te Papa licensing](https://tepapa.govt.nz/about/media-sales-and-licensing/license-images)

**Auckland Museum**
- The current API "removed the need for an API key". Search runs at `api.aucklandmuseum.com/search/collectionsonline/_search?q=`,
  and media at `/id/media` — [Auckland Museum API](https://api.aucklandmuseum.com/); [API basics wiki](https://github.com/AucklandMuseum/_API/wiki/(1)-API-Basics)
- Images are shared under CC BY or "No Known Copyright Restrictions", but some records are CC BY-NC — [Auckland Museum: our data](https://www-learn.aucklandmuseum.com/mi/discover/collections/our-data); [300,000 open images (2017)](https://www.aucklandmuseum.com/discover/stories/blog/2017/300,000-open-images-and-counting)
- A separate `collection-api.aucklandmuseum.com/api/v3/` base exists, and which one is current is unclear — [Auckland Museum GitHub](https://github.com/AucklandMuseum/API)

**NYPL Digital Collections**
- Token auth via the Authorization header, issued by email sign-up. v1 was removed permanently on 3 Jan 2023. Search
  takes `publicDomainOnly=true` — [NYPL API](https://api.repo.nypl.org); [example gist](https://gist.github.com/EdwinGuzman/5529637d59de2692a4022176f17bfe8a)
- 298,280 public-domain items; "you do not need NYPL's permission" (undated) — [NYPL Digital Collections about](https://digitalcollections.nypl.org/about)
- Bulk public-domain metadata is on GitHub — [NYPL-publicdomain](https://github.com/NYPL-publicdomain/data-and-utilities)

**Getty Museum**
- The API uses Linked Art, ActivityStreams, IIIF (media.getty.edu) and SPARQL. REST endpoints follow the form
  `data.getty.edu/museum/collection/<type>/<id>` — [Getty API docs](https://data.getty.edu/museum/collection/docs/)
- About 88,000 images are CC0 under Open Content (Mar 2024). Not all linked images are open, and rights are given per
  image — [Creative Commons 2024](https://creativecommons.org/2024/03/13/getty-museum-releases-88k-images-of-artworks-with-cc0/); [Getty Open Content](https://getty.edu/projects/open-content-program)

**Yale (LUX, YCBA)**
- LUX is built on Linked Art 1.0 and covers more than 17M objects (2025). A third-party OpenAPI says over 41M, so the
  counts conflict. Anyone may access it — [Yale News 2025](https://news.yale.edu/2025/02/24/breaking-digital-silos-share-cultural-heritage-collections); [Yale Daily News](https://yaledailynews.com/?p=183967)
- YCBA has about 70,000 public-domain images, IIIF-compliant and open access with no application or fee — [YCBA using images](https://britishart.yale.edu/collections/using-collections/using-images); [YCBA data sharing](https://britishart.yale.edu/collections-data-sharing)

**Minneapolis Institute of Art (Mia)**
- Thumbnails at `api.artsmia.org/images/$id/{small,medium,large}.jpg` (100, 600, 800 px). Metadata is CC0 on GitHub,
  updated daily. Images are "not … under the same license", and fall under Mia's Image Access & Use policy — [artsmia/collection README](https://raw.githubusercontent.com/artsmia/collection/main/readme.md)
- Public-domain works are marked CC PDM, and there are 50,000+ such works — [Mia open access](https://collections.artsmia.org/info/open-access); [Mia copyright](https://new.artsmia.org/copyright-and-image-access/)

**Finnish National Gallery**
- Metadata is CC0. About 12,000 public-domain images are CC0 (dated). A free API key is needed, with Swagger docs — [OpenGLAM 2013](https://openglam.org/2013/10/07/finnish-national-gallery-launches-open-api); [avoindata.fi](https://avoindata.fi/data/en/dataset/kansallisgallerian-kokoelma-aineistot)

**Walters Art Museum**
- "v1 of the Walters API closed in 2023". Static CSVs (art.csv, media.csv) are provided instead. CC0 applies, with
  exceptions for artists' copyright and loans — [Walters API GitHub](https://github.imc.re/WaltersArtMuseum/api-thewalters-org/blob/main/README.md); [Walters rights](https://www.thewalters.org/rights-reproductions.aspx)
  - The homepage still describes an API ([api.thewalters.org](https://api.thewalters.org/)), so the sources conflict.

**Brooklyn Museum**
- A personal API key is required; requests without one fail. The cap is 3,000 calls per day per key. There are
  required display fields — [Brooklyn API register](https://www.brooklynmuseum.org/opencollection/api/register); [Brooklyn API rights](https://brooklynmuseum.org/opencollection/api/docs/rights)
- The licence is conflicting: CC BY (copyright portal) versus CC BY-NC (2010 museum blog) — [gongu.copyright.or.kr](https://gongu.copyright.or.kr/gongu/main/contents.do?menuNo=200249); [Brooklyn tech blog](https://techblog.brooklynmuseum.org/index.html@p=396.html)
- The docs page returned 429 to this session's fetch.

**DPLA**
- An `api_key` is needed on every request; keys are free by email. It covers 50M+ items. A thumbnail URL points to the
  contributing institution — [DPLA API basics](https://pro.dp.la/developers/api-basics); [apis.io DPLA](https://apis.io/apis/dpla/dpla-items-api/)

**DigitaltMuseum**
- An API key is required, with `demo` for testing. It supports Solr search plus image-similarity search — [DigitaltMuseum API reference](https://store-search.dimu.org/docs)

**David Rumsey Map Collection**
- CC BY-NC-SA 3.0. "Commercial" is defined as selling reproductions. A credit line is required — [Stanford PURL](https://purl.stanford.edu/xh235dd9059); [davidrumsey.com about](https://davidrumsey.com/about)
- No official API was found. IIIF is claimed only by a third-party wrapper — [parse.bot listing](https://parse.bot/marketplace/dc58414e-60b4-402b-a53e-3654ade47aa4/davidrumsey-com-api)

### Inferences
- **Auckland Museum** is the closest match to the Cleveland connector shape: keyless, keyword search over HTTP. It still
  needs per-record licence filtering (drop NC if the owner wants).
- **Getty, Mia, Walters and Yale** fit the NGA-style "local metadata index, streamed images" path from the earlier note,
  rather than one-call keyword search. That is a bigger design change.
- **Te Papa and Brooklyn** need a per-user key or registration with personal details, which adds friction for users.
  Te Papa's NC-ND items must be filtered or labelled.
- **DPLA** is an aggregator, with thumbnails on contributor hosts, so it has the same CSP problem as Europeana.

### Gaps
- Not verified for Te Papa, NYPL, Auckland, Finnish National Gallery or DPLA: image host names, image sizes, CORS.
- No search was done for the Princeton, Philadelphia, Nationalmuseum Sweden or Statens museum (Norway) APIs.
- Whether Getty's SPARQL can serve keyword search cheaply wasn't checked. The Getty docs page didn't render for fetch.
- The DigitaltMuseum image licence and production key process weren't found.

## Q5. Design/CAD-specific inputs: patents, technical archives, 3D sites, pose sets

### Takeaway
- **US patent drawings** are the strongest new CAD and product input on licence grounds: generally not under copyright,
  except where an applicant's notice appears. The search API wasn't researched.
- **Sketchfab** search can filter downloadable CC0 models, and its thumbnails would serve as reference images. Download
  needs end-user OAuth (earlier note).
- **GrabCAD, Printables and Thingiverse** stay on the avoid or defer list (earlier note).
- No open pose dataset was researched.

### Cited Findings
- USPTO position: "Subject to limited exceptions reflected in 37 CFR 1.71(d) and (e) and 1.84(s), the text and drawings
  of a patent are typically not subject to copyright restrictions" — [Penn State LibAnswers](https://psu.libanswers.com/faq/325294); [Wikipedia: copyright on patent content](https://www.wikipedia.org/wiki/Copyright_on_the_content_of_patents_and_in_the_context_of_patent_prosecution)
- Where a copyright notice appears, facsimile reproduction is allowed and other rights are reserved. Without the notice,
  figures "are in the public domain" — [Penn State LibAnswers](https://psu.libanswers.com/faq/325294)
- Design patents can embed trademarks. The USPTO requests acknowledgement when its public-domain information is reused — [USPTO terms of use](https://uspto.gov/terms-use-uspto-websites); [Justia Q&A](https://answers.justia.com/question/2020/09/03/are-the-drawings-in-a-patent-also-public-793020)
  (secondary sources, partly archived)
- Sketchfab Data API v3 `/v3/models` takes a `downloadable` filter and `license` slugs (cc-by, cc-by-sa, cc0, st).
  Public search reportedly needs no auth. That is per an unofficial mirror; Sketchfab says "some endpoints are
  public" — [apis.io Sketchfab](https://apis.io/apis/sketchfab/sketchfab-data-api/); [Sketchfab Data API](https://sketchfab.com/developers/data-api); [Sketchfab license filters](https://sketchfab.com/blogs/community/refine-downloadable-model-searches-with-new-license-filters)
- Credit the creator for CC licences, except CC0 — [Sketchfab help](https://help.sketchfab.com/en/articles/16152031-api-overview)
- GrabCAD bans crawling, scraping and caching. Printables has no public API, and Prusa terms ban automated extraction.
  Thingiverse unauthenticated search returns a Cloudflare 403, and its ownership changed in Feb 2026 — [earlier note](../Arena%20reference%20gatherer%20architecture/alternative_sources.md)

### Inferences
- **Patent drawings** (especially US design patents: chairs, tools, consumer products) suit product, industrial and
  CAD designers, and need no licence negotiation. Show the patent number, and check the drawing for a copyright notice
  before Save.
- **Sketchfab thumbnails** could be a "3D model previews" topic source for game, 3D and product designers.
  - Filter `license=cc0`, store the creator, and link to the model page.
  - Don't download models. That needs OAuth plus Sketchfab's attribution display.
- **HABS/HAER** stays behind LoC's CAPTCHA and 20 req/min limits (earlier note). Not reassessed here.

### Gaps
- A USPTO or Google Patents image search endpoint wasn't researched: PatentsView, the USPTO Open Data Portal, Google
  Patents BigQuery, the image host, and whether figures are returned as images. This is the highest-value follow-up.
- The Sketchfab thumbnail host and search rate limits weren't verified.
- Open figure and pose datasets (CC0 pose photo sets, 3D pose apps' public sets) weren't searched. No findings.
- Furniture and industrial design archives beyond museums weren't searched.

## Q6. User-supplied feeds: RSS, Bluesky, Mastodon, Flickr albums, Google Photos, cloud folders

### Takeaway
- **Social sources** (Mastodon hashtags, Bluesky feeds) are technically reachable. But posts carry no open licence,
  and posters haven't consented to slideshow reuse. Images also come from many hosts. Not recommended as automated
  sources.
- **Google Photos** removed library-read scopes on 31 Mar 2025; only the user-driven Picker API remains.
- **RSS, Dropbox and OneDrive** weren't researched.

### Cited Findings
- Mastodon has `GET /api/v1/timelines/tag/:hashtag` for public statuses with a hashtag — [Mastodon timelines API](https://docs.joinmastodon.org/methods/timelines/)
- Mastodon "secure mode" can block unauthenticated public API access, so access is instance-dependent — [Mastodon 3.0 in depth](https://blog.joinmastodon.org/2019/10/mastodon-3.0-in-depth/)
- Bluesky's developer guidelines page now redirects to bsky.network, and its content didn't render for fetch. Bluesky
  documents labels as attached by AppViews for clients to hide or blur content — [Bluesky developer guidelines](https://docs.bsky.app/docs/support/developer-guidelines) (not retrieved)
- Google Photos — [Google Developers Blog](https://developers.googleblog.com/en/google-photos-picker-api-launch-and-library-api-updates/); [Google Photos updates](https://developers.google.com/photos/support/updates):
  - After 31 Mar 2025, the Library API "will only manage photos and videos created by your app".
  - The `photoslibrary.readonly`, `photoslibrary.sharing` and `photoslibrary` scopes were removed, and calls that rely
    on them return 403.
  - Shared-album calls return 403.
  - The Picker API is the replacement for selecting user photos.
- Flickr: personal albums need a Pro-only API key, and the 30-photos-per-page and "reasonable periods" rules apply — [Flickr API ToS](https://www.flickr.com/services/api/tos/)

### Inferences
- **Hashtag feeds:** a Mastodon or Bluesky input would stream other people's all-rights-reserved posts. It would need
  label and deletion handling, plus wildcard CSP hosts. It conflicts with LeMuse's attribution-first, licence-safe
  stance, so it would need an owner decision and an ADR. Recommendation: don't build.
- **Google Photos** can only work as a manual "pick photos" import (the Picker). It can't be a subscribed topic source.
- **User-supplied URLs** (RSS feeds, arbitrary folders) bring arbitrary hosts. That suggests the local-folder path from
  the earlier note, or a per-feed CSP entry added through `config_edit`, which is a guardrail change.

### Gaps
- No primary text was retrieved for: RSS/Atom image feed conventions, Dropbox shared-link API terms, OneDrive/Graph
  shared-folder terms, or Bluesky's binding guidelines.
- Picker API session limits weren't checked.

## Q7. Which inputs would work for a future static web app (CORS, unhideable keys)?

### Takeaway
A static web app can't hide keys, so any keyed source needs a proxy or a per-user key. Keyless sources are the natural
fit for a browser-only build: Auckland, iNaturalist, GBIF, Sketchfab search, and Mia/Getty images. Unsplash's own
library tells browser apps to use a server-side proxy. Pixabay's docs show browser calls (jQuery `getJSON`, plus JSONP
`callback`), but that exposes the key.

### Cited Findings
- `unsplash-js`: browser code should use a proxy `baseUrl` so the access key stays server-side — [unsplash-js](https://github.com/unsplash/unsplash-js)
- Pixabay shows a browser-side `$.getJSON` example and a JSONP `callback` parameter. CORS isn't mentioned. The key is
  tied to the per-key rate limit — [Pixabay API docs](https://pixabay.com/api/docs/)
- The MediaWiki API supports CORS from any origin with `origin=*` (earlier note) — [MediaWiki Manual:CORS](https://www.mediawiki.org/wiki/Manual:CORS)
- Keyless: Auckland Museum ([API](https://api.aucklandmuseum.com/)), GBIF ([image API](https://techdocs.gbif.org/en/openapi/images)),
  iNaturalist ([developers](https://chile.inaturalist.org/pages/developers)), Sketchfab public search (unofficial) ([apis.io](https://apis.io/apis/sketchfab/sketchfab-data-api/))
- Keyed (exposed in a static app): Te Papa (10 req/s per key), Brooklyn (3,000/day per key), NYPL (token), DPLA,
  Finnish National Gallery, Pexels, Unsplash, Pixabay, Flickr — Q2 and Q4 sources above

### Inferences
- **Per-key limits are shared.** A static app with one embedded key pools every visitor's traffic into that key's quota.
  Pixabay allows 100/min, Brooklyn 3,000/day and Pexels 200/hr, so a public web app would exhaust them quickly, and the
  key could be lifted. That argues for "bring your own key" (stored in the browser), or a tiny proxy, for keyed sources.
- **Hotlinked `<img>` display needs no CORS**; only API JSON calls do. CORS is therefore a question for the API hosts,
  not the image hosts, unless canvas pixel reads (palettes) are wanted.

### Gaps
- No documented `Access-Control-Allow-Origin` behaviour was found for the APIs of Pexels, Unsplash, iNaturalist, GBIF,
  Auckland, Te Papa, NYPL, DPLA or Sketchfab. A static-app spike would need one manual browser check per API.
