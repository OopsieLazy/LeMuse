# Alternative Reference Sources (beyond Are.na): APIs, Auth, Limits, Licensing and Local-Caching Terms

Scope: a personal, local app that gathers drawing / illustration / industrial-design / CAD references and caches them as local files. Current as of Nov 2026. This summarizes published terms and is not legal advice. Where a claim could only be found in third-party sources, it is marked as such. Where a primary page could not be fetched (403 or JS-only), that is noted under Gaps.

## Q1. Image / art reference sources: is there an API, what auth, what limits, what licence, and can you cache locally?

### Takeaway
The safest, easiest image connectors are the museum open-access APIs (The Met, Cleveland, Art Institute of Chicago, Smithsonian, Rijksmuseum) plus Poly Haven and NASA. They need no key or a free key, and they mark each record as CC0 or public domain. Unsplash and Pexels have good APIs, but their terms are written for apps that display images. Unsplash in particular requires hotlinking, which conflicts with local caching. Pinterest, Behance and ArtStation are effectively unusable as read connectors. DeviantArt and Flickr are possible but have friction: DeviantArt's licence is restrictive, and Flickr API keys now need a Pro account.

### Cited Findings

**Unsplash**
- A key is required. Send `Authorization: Client-ID YOUR_ACCESS_KEY` or a `client_id` query parameter — [Unsplash API docs](https://unsplash.com/documentation)
- Rate limits: demo mode is "rate-limited to 50 requests per hour". Production, after approval, "is increased to 1000 requests per hour" — [Unsplash API docs](https://unsplash.com/documentation)
- "Image file requests (`images.unsplash.com`) do not count against your rate limit". Only `api.unsplash.com` JSON calls count — [Unsplash API docs](https://unsplash.com/documentation)
- Hotlinking is required: "All API uses must use the hotlinked image URLs returned by the API" (the `photo.urls` fields) — [Unsplash API Guidelines](https://help.unsplash.com/en/articles/2511245-unsplash-api-guidelines)
- Download tracking: when the app does something download-like, "you must send a request to the download endpoint" (`photo.links.download_location`) — [Unsplash API Guidelines](https://help.unsplash.com/en/articles/2511245-unsplash-api-guidelines)
- Attribution: the app "must attribute Unsplash, the Unsplash photographer, and contain a link back to their Unsplash profile", with UTM parameters on links — [Unsplash API Guidelines](https://help.unsplash.com/en/articles/2511245-unsplash-api-guidelines)
- Other usage rules — [Unsplash API Guidelines](https://help.unsplash.com/en/articles/2511245-unsplash-api-guidelines):
  - "You cannot replicate the core user experience of Unsplash" (e.g., unofficial clients, wallpaper apps).
  - "The API is to be used for non-automated, high-quality, and authentic experiences".
  - "Too many requests too quickly will get your access turned off".
  - Users must not be required to register their own developer account.
- The guidelines and docs pages don't explicitly cover local caching or storing of image files — [Unsplash API Guidelines](https://help.unsplash.com/en/articles/2511245-unsplash-api-guidelines); [Unsplash API docs](https://unsplash.com/documentation)

**Pexels**
- A key is required in the `Authorization` header. Any Pexels account holder gets one instantly — [Pexels API docs](https://www.pexels.com/api/documentation/)
- Default limit is "200 requests per hour and 20,000 requests per month". Responses carry `X-Ratelimit-*` headers, though 429 responses don't. Apps that meet the terms can ask for higher or unlimited limits for free. Trying to get around the limits "will lead to termination of your API access" — [Pexels API docs](https://www.pexels.com/api/documentation/)
- Attribution: show a "prominent link to Pexels" and "Always credit our photographers when possible" — [Pexels API docs](https://www.pexels.com/api/documentation/)
- "You may not copy or replicate core functionality of Pexels (including making Pexels content available as a wallpaper app)" — [Pexels API docs](https://www.pexels.com/api/documentation/)
- The API docs say nothing about caching or storing images, and there is no hotlinking requirement like Unsplash's — [Pexels API docs](https://www.pexels.com/api/documentation/)

**Wikimedia Commons (MediaWiki Action API)**
- No key is needed. A new 2026 rate-limit scheme is "subject to experimentation and change" — [MediaWiki: Wikimedia APIs/Rate limits](https://www.mediawiki.org/wiki/Wikimedia_APIs/Rate_limits)

  | Client type | Limit (requests per minute) |
  |---|---|
  | Unidentified (IP only) | 10 |
  | Unauthenticated bot with a compliant User-Agent | 200 |
  | Authenticated new user | 200 |
  | Established editor | 2,000 |
  | Bot-flagged accounts and Wikimedia Cloud Services | Exempt |

- A User-Agent with contact info (email or URL) is expected. Non-compliant agents get rate-limited and eventually blocked — [Wikitech-l: Enforcement of the User-Agent policy](https://lists.wikimedia.org/hyperkitty/list/wikitech-l@lists.wikimedia.org/thread/APW6FQBGIVLCEN7WZ65D4NVZ6XQIWGCW/); [Phabricator T400119](https://phabricator.wikimedia.org/T400119)
- Downloading media from upload.wikimedia.org: the robot policy says to keep "a total concurrency of at most 2" and limit "total download speed to 25 Mbps" — [Wikitech Robot policy](https://wikitech.wikimedia.org/wiki/Robot_policy)
- Licences are per file: "Each media file has its licensing specified on its file description page". Media are usually CC BY, CC BY-SA, GFDL or public domain. CC BY-SA requires attribution plus share-alike on modifications. The credit goes to the creator, not the uploader — [Commons: Reusing content outside Wikimedia](https://commons.wikimedia.org/wiki/Commons:Reusing_content_outside_Wikimedia)
- Structured data in the file namespace is CC0 — [Commons: Reusing content outside Wikimedia](https://commons.wikimedia.org/wiki/Commons:Reusing_content_outside_Wikimedia)
- A March 2026 user report: a script with a correctly labelled User-Agent was still rate-limited — [pandoc discussion #11550](https://github.com/jgm/pandoc/discussions/11550)

**Smithsonian Open Access**
- Needs a free api.data.gov key. Base URL is `https://api.si.edu/openaccess/api/v1.0/`. Data is refreshed weekly — [Smithsonian Open Access dev tools](https://www.si.edu/openaccess/devtools); base URL from a third-party client: [glama smithsonian-mcp](https://glama.ai/mcp/servers/@molanojustin/smithsonian-mcp/blob/55b13097934a5376027c31c8dba21f52acd3ca40/smithsonian_mcp/api_client.py)
- The Open Access release is CC0. The 2020 launch included more than 2,200 CC0 3D models from the Digitization Program Office, viewable in glTF — [Smithsonian "21st century diffusion"](https://www.si.edu/openaccess/updates/21st-century-diffusion); [Digital Production](https://digitalproduction.com/2020/03/04/open-access-mehr-als-2000-3d-modelle/)

**The Met Collection API**
- No key: "we do not require API users to register or obtain an API key" — [Met Collection API](https://metmuseum.github.io/)
- "Please limit request rate to 80 requests per second" — [Met Collection API](https://metmuseum.github.io/)
- Data is CC0 for "unrestricted commercial and noncommercial use" — [Met Collection API](https://metmuseum.github.io/)
- Each object has an `isPublicDomain` flag. Public-domain objects come with high-resolution JPEGs. Copyrighted works carry `rightsAndReproduction` — [Met Collection API](https://metmuseum.github.io/)
- Search paging is capped at offset+limit of 10,000. For bulk work, a full open-access CSV dataset is offered — [Met Collection API](https://metmuseum.github.io/)

**Art Institute of Chicago (AIC) API**
- No key is needed. Third-party sources say the official docs throttle anonymous users to 60 requests per minute per IP — [publicapi.dev](https://publicapi.dev/art-institute-of-chicago-api); [Jentic](https://jentic.com/apis/artic.edu/artic.md)
  - Jentic also says "no hard public rate limit", so the sources conflict.
- An `AIC-User-Agent` header with a project name and contact email is requested as a courtesy — [Jentic](https://jentic.com/apis/artic.edu/artic.md)
- Most data is CC0 1.0. Descriptions and places are CC BY 4.0 — [Jentic](https://jentic.com/apis/artic.edu/artic.md)

**Rijksmuseum**
- The legacy key-based APIs (key from a Rijksstudio account) are deprecated and mostly replaced by Linked Open Data APIs — [data.rijksmuseum.nl/docs/api](https://data.rijksmuseum.nl/docs/api)
- The current docs list OAI-PMH, a Search API, LDES and a persistent-identifier resolver for harvesting, plus IIIF. SRU is marked "(deprecated)". "The complete collection is also available for download" — [Rijksmuseum data docs](https://data.rijksmuseum.nl/docs/)
- A 2026 third-party guide says the new APIs need no key — [navigating.art, 2026](https://www.navigating.art/articles-from-navigatingart/open-access-2026)

**Cleveland Museum of Art Open Access API**
- Examples are called without a key. No rate limit is documented — [CMA Open Access API](https://openaccess-api.clevelandart.org/)
- Data is under a CC0 waiver. "Only artworks with the CC0 `share_license_status` will additionally provide access to CC0 images" (values: CC0, Copyrighted, Other) — [CMA Open Access API](https://openaccess-api.clevelandart.org/)
- Image sizes: `web` up to 900px, `print` up to 3400px, `full` as an uncompressed TIFF. Full JSON/CSV dumps are on GitHub — [CMA Open Access API](https://openaccess-api.clevelandart.org/)

**NASA Image and Video Library (images-api.nasa.gov)**
- Endpoints include `/search?q=` and `/asset/{nasa_id}`. A third-party directory says no auth is declared and no rate limits are defined in the spec — [Firecrawl Alexandria listing](https://www.firecrawl.dev/alexandria/images-nasa-gov); [images.nasa.gov API docs PDF](https://images.nasa.gov/docs/images.nasa.gov_api_docs.pdf)
- NASA material is generally not copyrighted "unless otherwise noted". Third-party copyrighted items are marked with the holder's name. The NASA insignia and logos are protected — [NASA Images and Media guidelines](https://www.nasa.gov/nasa-brand-center/images-and-media/)
  - These points were reported via search snippets and secondary sites. The guideline text itself was not fully retrieved.

**Flickr**
- "The ability to request API keys is available exclusively to Pro subscribers". You pick a non-commercial or commercial key — [Flickr Help: Flickr API](https://www.flickrhelp.com/hc/en-us/articles/4404070036884-Flickr-API) (via search snippet; the page returned 403 to direct fetch); [awplife 2026 guide](https://awplife.com/how-to-get-flickr-api-key/)
- Free accounts have also seen tighter limits and enforcement — [Flickr Help: Free account limits](https://www.flickrhelp.com/hc/en-us/articles/13690320471060-Free-account-limits-and-enforcement)

**Pinterest API v5**
- Approved apps start on Trial access. Both Trial and Standard can read boards and Pins — [Pinterest access tiers](https://developers.pinterest.com/docs/key-concepts/access-tiers/)
- Pins and boards created on Trial "are only visible to their creator as Sandbox entities". Trial is rate-limited per day per app — [Pinterest access tiers](https://developers.pinterest.com/docs/key-concepts/access-tiers/)
- Upgrading to Standard requires a recorded video of the app, including the OAuth flow, "even a sole user". Common denial reasons include no accessible privacy policy and no live Pinterest integration — [Pinterest access tiers](https://developers.pinterest.com/docs/key-concepts/access-tiers/)
- Third-party guides say the v5 API manages your own account (`boards:read`, `boards:read_secret`) and can't read arbitrary public boards. They cite about 1,000 requests per day on Trial — [upload-post Pinterest API guide 2026](https://www.upload-post.com/pinterest-api/); [Blotato](https://www.blotato.com/blog/pinterest-api-pricing)

**DeviantArt**
- The official API licence agreement sets rate limits that "may change... in its sole discretion, at any time". Going over them risks blocking or termination — [DeviantArt API License](https://www.deviantart.com/about/policy/api/)
- A May 2024 developer report saw 429 errors on a new app within two days — [gallery-dl issue #5558](https://www.github.com/mikf/gallery-dl/issues/5558)
- OAuth2, with client_credentials for public browsing, per a third-party archive — [archivarix](https://echo.archivarix.net/archive/deviantart)

**ArtStation**
- No public API was found. In 2025 ArtStation said it was working with Cloudflare to block AI crawlers "and automated scraping tools", and it updated its ToS to match — [80.lv](https://80.lv/articles/artstation-will-block-ai-crawlers-from-scraping-artists-work/)

**Behance**
- Adobe staff say the Behance API is unavailable "during a technical migration" with "no date to share" for a return on adobe.io — [Adobe Experience League forum](https://experienceleaguecommunities.adobe.com/t5/adobe-developer-questions/where-can-i-find-behance-api/m-p/408771)
- A WordPress plugin notes Behance "stopped support for generating the API key" — [WordPress plugin](https://wordpress.org/plugins/portfolio-manager-powered-by-behance/)
- CC Catalog tagged the Behance integration as discontinued — [cccatalog #163](https://github.com/creativecommons/cccatalog/issues/163)

### Inferences
- Unsplash's mandatory hotlinking, together with "non-automated" use and the download-tracking endpoint, means silently caching image files locally doesn't fit the terms as written.
  - A defensible pattern: store only metadata and the hotlink URL, fire `download_location` whenever the user explicitly saves an image, and keep attribution stored with the file.
  - Because the guidelines never explicitly cover local caching, this is ambiguous rather than clearly forbidden. Treat Unsplash as a v2, display-oriented connector, not a bulk-caching one.
- Pexels has no hotlinking clause and allows instant keys, so it's friendlier for saving individual images. Attribution metadata should still be kept.
- Pinterest can't do the job you'd most want, which is reading other people's public boards. Even reading your own boards needs app review, a privacy policy and, for Standard, a demo video. That's poor effort-to-value for a personal tool. Avoid it, or treat it as "import my own boards" at most.
- Behance: treat as discontinued. ArtStation: no API, active anti-scraping. Both are "avoid" for automated connectors. A manual "save this URL" bookmarklet is the most you should consider.
- Flickr is technically viable for CC-filtered search, but the Pro-only key requirement makes it a paid connector. It suits v2 or later.
- For the museums, filtering on the per-record flag (`isPublicDomain`, `share_license_status == CC0`, Smithsonian CC0 media) gives content that is safe to cache.

### Gaps
- Official AIC docs (api.artic.edu/docs) returned 403, so the 60 requests/minute figure and the licence split rest on third-party summaries.
- Smithsonian (edan.si.edu apidocs, JS-only) and api.data.gov rate-limit numbers weren't retrieved. The api.data.gov default is commonly 1,000 requests per hour, but that wasn't verified here.
- Neither Pexels' own content licence page nor Unsplash's licence page was fetched. Their exact clauses on offline storage or "compilation" weren't verified.
- The text of the DeviantArt API licence on caching and storing deviations wasn't retrieved. Content on DeviantArt is all-rights-reserved by default unless the artist chooses otherwise, but that isn't verified here.
- The exact current Pinterest Trial request quotas weren't found on an official page.
- Rijksmuseum rate limits and image licence weren't stated on the docs index page fetched. Historically the museum released public-domain images as CC0, but that wasn't verified here.

## Q2. CAD / 3D reference sources: APIs, auth, licences, ToS on downloads

### Takeaway
Poly Haven (CC0, keyless, bulk downloading explicitly allowed) and Smithsonian 3D (CC0) are the clear safe choices. The Sketchfab Download API is official, but it needs each end user to sign in with OAuth and the app must show each model's CC licence. Thingiverse has an official token API, but its future is uncertain after the February 2026 MyMiniFactory acquisition. Printables has only an undocumented GraphQL endpoint, and Prusa's general terms ban automated extraction. GrabCAD, McMaster-Carr, Onshape public documents and TraceParts either have no public API or explicitly forbid scraping and bulk collection.

### Cited Findings

**Poly Haven**
- "no login or API key required for the default endpoints". Free for "Personal, academic, or commercial" use. "All requests to the API require a unique User-Agent header" — [Poly Haven API](https://polyhaven.com/our-api)
- Assets "have always been CC0". Attribution ("make it clear to your users that the assets came from Poly Haven") is "a condition of using the live API service, not of the assets themselves" — [Poly Haven API](https://polyhaven.com/our-api)
- Explicitly supports "Bulk-downloading for academic research or training data for AI/ML pipelines" — [Poly Haven API](https://polyhaven.com/our-api)

**Sketchfab Download API**
- Downloads need an authenticated user: "the end user must be able to log in with their Sketchfab account inside your application" — [Sketchfab API Agreement](https://sketchfab.com/developers/terms)
- If you want downloads without end-user authentication, you must contact Sketchfab — [Download API guidelines](https://sketchfab.com/developers/download-api/guidelines)
- The app must "provide attribution to the original creator", "clearly mention that downloadable models are provided by Sketchfab", and "clearly display the Creative Commons license under which the downloadable models are distributed" — [Sketchfab API Agreement](https://sketchfab.com/developers/terms)
- Formats are glTF, GLB and USDZ, not original source formats such as FBX/OBJ. Models must be marked downloadable. API accounts are 18+ only — [Download API guidelines](https://sketchfab.com/developers/download-api/guidelines) (via search summary)
- The agreement doesn't address caching or rate limits. It bars any use "not expressly permitted" — [Sketchfab API Agreement](https://sketchfab.com/developers/terms)
- Downloadable models come under CC licences or the Sketchfab Standard licence. Some carry "NoAI" restrictions governed by the Sketchfab ToS — [Sketchfab: Restricting Generative AI Use](https://sketchfab.com/blogs/community/restricting-generative-ai-use-of-free-models); [Sketchfab license filters](https://sketchfab.com/blogs/community/refine-downloadable-model-searches-with-new-license-filters)

**Thingiverse**
- The official REST API uses Bearer tokens or OAuth2. You register an app for an App Token — [API Evangelist MakerBot profile](https://providers.apievangelist.com/providers/makerbot/)
- A developer reports that unauthenticated search returns a 403 Cloudflare challenge — [print-handy issue #462](https://github.com/catduckgnaf/print-handy/issues/462)
- MyMiniFactory acquired 100% of Thingiverse from UltiMaker, announced 12 Feb 2026. All3DP reported that nothing would change on the site "for now" — [3Dnatives](https://www.3dnatives.com/en/myminifactory-thingiverse-12022026/); [UltiMaker](https://ultimaker.com/learn/myminifactory-acquires-thingiverse/)
- A scraping blog claims about 300 requests per hour per token and says new developer apps aren't being approved. Both claims are unverified, and the post's advice to lift tokens from a browser session likely violates the ToS — [scraping blog](https://frog03-20494.wykr.es/blog/scrape-thingiverse-3d-models-2026)

**Printables (Prusa)**
- There's no documented public API. A GraphQL endpoint at api.printables.com is used informally. Search reportedly needs no auth, but CORS blocks it from web apps — [print-handy issue #462](https://github.com/catduckgnaf/print-handy/issues/462); [overtio/lines #179](https://github.com/overtio/lines/issues/179)
- Prusa's general website terms (Spanish version) forbid "extracción manual o automatizada de los contenidos... incluyendo el scraping" (manual or automated extraction of content, including scraping) — [Prusa general terms (ES)](https://prusa3d.com/es/pagina/terminos-generales-y-condiciones-de-uso-de-los-sitios-web-prusa_231226/)
- Downloaded models may be used "in accordance with... the selected Licence" chosen by each creator — [Printables ToS](https://www.prusa3d.com/page/printables-com-terms-of-service_231249/)

**GrabCAD**
- A third-party listing says there is no public developer API for library data. The separate GrabCAD Print API is for Stratasys printers — [apis.io GrabCAD](https://apis.io/providers/grabcad/)
- GrabCAD's 2016 terms update added language that "prohibits crawling, scraping or caching" using any "robot, spider or other automatic device" — [GrabCAD blog 2016](https://blog.grabcad.com/blog/2016/06/28/whats-up-with-the-new-terms/); current terms: [grabcad.com/terms](https://grabcad.com/terms)

**McMaster-Carr**
- The terms grant a "limited, nonexclusive, non-transferable and revocable license". Prohibited uses include copying, mirroring and archiving content, with CAD models governed by separate terms — [McMaster-Carr Terms](https://mcmaster.com/termsandconditions)
- The Product Information API is for approved customers only and uses a client certificate and password — [McMaster-Carr API](https://mcmaster.com/help/api)
- CAD models are free to download manually, and there is a SOLIDWORKS add-in — [McMaster CAD models](https://mcmaster.com/cad-models); [SOLIDWORKS add-in](https://mcmaster.com/solidworksaddin)

**Onshape (public documents)**
- Annual API call limits per user: Free and Standard 2,500, Professional 5,000, Enterprise 10,000 per full user. Per-endpoint 429 limits also apply — [Onshape API Limits](https://onshape-public.github.io/docs/auth/limits)
- "The API may not be used by any robot, spider, scraper or other automated means for data mining... data gathering or extraction method from the Onshape Public Documents" — [Onshape API Limits](https://onshape-public.github.io/docs/auth/limits)
- The policy was updated around 10 Oct 2025 — [Onshape forum](https://forum.onshape.com/discussion/comment/122121)

**TraceParts / 3D ContentCentral**
- TraceParts has a key-based API (e.g., CAD availability, DownloadCADPath). It is aimed at manufacturers and distributors syndicating content, under customer order-form terms — [TraceParts developers](https://developers.traceparts.com/docs/caddataavailability); [Content syndication](https://developers.traceparts.com/docs/syndicate-the-content)

### Inferences
- Poly Haven is the only CAD/3D source whose published terms positively endorse what this app does: keyless access, CC0 assets and explicit bulk downloading. It's the best v1 3D connector.
- Smithsonian 3D (CC0, glTF) fits the same Smithsonian connector built for images.
- Sketchfab is a strong v2 choice. Each user signs in with OAuth, filter to downloadable CC models, and store the licence and attribution next to each cached glTF/GLB. CC-BY-NC and NoAI flags should be kept as metadata.
- Thingiverse is viable only with an official token. Given the ownership change and reports that approvals have stalled, make it v2 or later, check developer registration first, and design it as a swappable connector.
- GrabCAD, McMaster-Carr, Onshape public documents and Printables (automated) should be avoided as automated connectors. For these, the app should support only manual import, where the user downloads in a browser and drops the file into the app or links the source URL.
- TraceParts and 3D ContentCentral are vendor/partner programs, not personal-dev APIs. Avoid.

### Gaps
- Official Thingiverse developer terms and rate limits couldn't be retrieved. Whether new app registration is open after the acquisition is unconfirmed.
- The English text of Prusa's scraping clause wasn't retrieved, only the Spanish version.
- The current GrabCAD ToS text wasn't fetched. The scraping/caching ban comes from the 2016 announcement.
- The CAD-model-specific terms at McMaster-Carr weren't retrieved.
- No terms or API were found for 3D ContentCentral.
- Sketchfab Download API rate limits aren't published in the pages reviewed.

## Q3. Keys/OAuth, published rate limits and attribution requirements (comparison table)

### Takeaway
Most open-culture sources need no key, or only a free key, and publish CC0 or public-domain flags. The commercial platforms need keys or OAuth, attach attribution and anti-replication rules, and in Unsplash's case require hotlinking plus download tracking.

### Cited Findings

Comparison table (each cell is sourced in Q1/Q2 above. "n/p" means not published in the pages reviewed).

| Source | API status (2026) | Auth | Published rate limit | Content licence | Local caching per terms | Suggested tier |
|---|---|---|---|---|---|---|
| The Met | Active | None | 80 requests/s | CC0 data; `isPublicDomain` images | Fine for PD/CC0 | **v1** |
| Art Institute of Chicago | Active | None (courtesy UA header) | ~60 requests/min per IP (3rd-party) | Mostly CC0; some CC BY | Fine for PD-flagged | **v1** |
| Cleveland Museum of Art | Active (+ GitHub dumps) | None | n/p | CC0 where `share_license_status=CC0` | Fine for CC0 | **v1** |
| Smithsonian Open Access (incl. 3D) | Active | Free api.data.gov key | n/p (official) | CC0 | Fine for CC0 | **v1** |
| Rijksmuseum | Legacy key API deprecated; new LOD/Search/IIIF | Reportedly none (new) | n/p | n/p here (historically CC0 PD) | Full download offered | **v1/v2** |
| Poly Haven | Active | None; unique UA required | n/p | CC0 | Bulk download explicitly allowed | **v1** |
| NASA Images | Active | None declared | n/p | Generally not copyrighted unless noted | Generally fine; check per item | **v1** |
| Wikimedia Commons | Active | None; compliant UA; OAuth optional | 200 requests/min (UA bot); 10 unidentified; media: 2 concurrent, 25 Mbps | Per-file: CC BY/BY-SA/GFDL/PD | Fine if licence kept with file | **v1** (store licence per file) |
| Pexels | Active | Free key | 200/hr, 20k/mo | Pexels licence (n/p here) | Not addressed; no hotlink rule | **v2** |
| Unsplash | Active | Key (Client-ID) | 50/hr demo; 1,000/hr prod | Unsplash licence | Hotlinking required; download endpoint | **v2, cautious** |
| Flickr | Active | Key, Pro accounts only | n/p | Per-photo (CC, PD, ARR) | Depends per photo | **v2/v3** (paid) |
| DeviantArt | Active | OAuth2 | Undisclosed, changeable | Mostly ARR (unverified) | Not verified | **Avoid / low** |
| Pinterest | Active (own account only) | OAuth + app review | Trial daily caps | Pinned content is third-party | Not suitable | **Avoid** |
| Behance | Unavailable / discontinued | n/a | n/a | n/a | n/a | **Avoid** |
| ArtStation | No public API; anti-scraping | n/a | n/a | n/a | Blocks scrapers | **Avoid** |
| Sketchfab | Active (Download API) | OAuth (end-user login) | n/p | CC variants / Standard; NoAI flags | Must display licence + attribution | **v2** |
| Thingiverse | Active but ownership changed Feb 2026 | App token / OAuth | n/p (3rd-party ~300/hr) | Per-thing CC | Per licence | **v2/v3** |
| Printables | No public API (undocumented GraphQL) | n/a | n/a | Per-model licence | Terms ban automated extraction | **Avoid (manual import)** |
| GrabCAD | No public library API | n/a | n/a | Per-model | Terms ban crawling/scraping/caching | **Avoid** |
| Onshape public docs | API exists | API keys / OAuth | 2,500 calls/yr (free) | Public docs | Scraping public docs prohibited | **Avoid** |
| McMaster-Carr | API for approved customers only | Client cert | n/a | Proprietary | Copying/archiving prohibited | **Avoid (manual)** |
| TraceParts / 3DContentCentral | Partner/vendor APIs | Key (partners) | n/a | Proprietary | Contractual | **Avoid** |

Attribution requirements:

| Source | What must be credited | Source |
|---|---|---|
| Unsplash | Unsplash, the photographer, and a link to the photographer's profile with UTM parameters, plus a call to the download endpoint | [Unsplash guidelines](https://help.unsplash.com/en/articles/2511245-unsplash-api-guidelines) |
| Pexels | A prominent Pexels link, and the photographer "when possible" | [Pexels docs](https://www.pexels.com/api/documentation/) |
| Sketchfab | The creator, the CC licence, and "provided by Sketchfab" | [Sketchfab API Agreement](https://sketchfab.com/developers/terms) |
| Poly Haven | Poly Haven, as an API-service condition only | [Poly Haven API](https://polyhaven.com/our-api) |
| Wikimedia Commons | The creator and licence for CC BY/BY-SA files | [Commons reuse](https://commons.wikimedia.org/wiki/Commons:Reusing_content_outside_Wikimedia) |

### Inferences
- The connector architecture should store, per cached file, a sidecar or DB row containing:
  - source
  - source URL
  - creator
  - licence (SPDX/CC id)
  - attribution string
  - fetch date
  - flags (PD/CC0, NC, ND, NoAI)
- This metadata covers every source's attribution rule, and it makes it possible to filter out anything that would be risky to share later.
- Built-in per-connector throttles are needed. Examples: Wikimedia at 2 concurrent downloads, AIC at 1 request/s, Unsplash under 50/hr in demo mode, Pexels under 200/hr. A descriptive User-Agent with contact info is needed for Wikimedia, Poly Haven and AIC.

### Gaps
- Several sources (Cleveland, NASA, Rijksmuseum, Smithsonian, Sketchfab) publish no numeric rate limits in the pages reviewed.

## Q4. Which ToS forbid scraping or bulk caching, and which content is CC0/public domain?

### Takeaway
Explicit bans on scraping or automated extraction appear in the terms for GrabCAD, Onshape public documents, Prusa/Printables, McMaster-Carr (copying/archiving) and ArtStation (crawler blocking). Unsplash forbids automated use and requires hotlinking. The CC0 / public-domain sources are the Met, Cleveland, AIC (mostly), Smithsonian, Poly Haven, NASA (generally) and Wikimedia's PD/CC0 subset. Rijksmuseum is likely also in this group but wasn't verified here.

### Cited Findings
- GrabCAD's terms prohibit "crawling, scraping or caching" by automated means — [GrabCAD blog 2016](https://blog.grabcad.com/blog/2016/06/28/whats-up-with-the-new-terms/)
- Onshape: no "robot, spider, scraper or other automated means for data mining... from the Onshape Public Documents" — [Onshape API Limits](https://onshape-public.github.io/docs/auth/limits)
- Prusa sites: no "extracción manual o automatizada... incluyendo el scraping" — [Prusa general terms (ES)](https://prusa3d.com/es/pagina/terminos-generales-y-condiciones-de-uso-de-los-sitios-web-prusa_231226/)
- McMaster-Carr prohibits copying, mirroring and archiving under a revocable licence — [McMaster-Carr Terms](https://mcmaster.com/termsandconditions)
- ArtStation blocks "automated scraping tools" via Cloudflare and updated its ToS — [80.lv](https://80.lv/articles/artstation-will-block-ai-crawlers-from-scraping-artists-work/)
- Unsplash: "non-automated" use and mandatory hotlinking — [Unsplash guidelines](https://help.unsplash.com/en/articles/2511245-unsplash-api-guidelines)
- Pexels and Unsplash both forbid replicating their core experience — [Pexels docs](https://www.pexels.com/api/documentation/); [Unsplash guidelines](https://help.unsplash.com/en/articles/2511245-unsplash-api-guidelines)
- Sketchfab: no use "not expressly permitted" — [Sketchfab API Agreement](https://sketchfab.com/developers/terms)
- DeviantArt can block access for exceeding its rate limits — [DeviantArt API License](https://www.deviantart.com/about/policy/api/)
- CC0 / public domain:
  - The Met — [Met API](https://metmuseum.github.io/)
  - Cleveland — [CMA API](https://openaccess-api.clevelandart.org/)
  - Smithsonian (including 3D) — [SI](https://www.si.edu/openaccess/updates/21st-century-diffusion)
  - Poly Haven — [Poly Haven](https://polyhaven.com/our-api)
  - AIC, mostly CC0 — [Jentic](https://jentic.com/apis/artic.edu/artic.md)
  - NASA, generally not copyrighted — [NASA](https://www.nasa.gov/nasa-brand-center/images-and-media/)

### Inferences
- Bulk-harvest-friendly sources offer dumps: the Met CSV, Cleveland GitHub dumps, the Rijksmuseum full download and Poly Haven's explicit bulk-download allowance. For these, a local mirror of a filtered subset is consistent with the published terms.
- On commercial photo platforms, cache per item on explicit user action ("save to my references") with attribution, not as background bulk harvesting.

### Gaps
- Full current ToS texts for ArtStation, DeviantArt (site ToS), Thingiverse and Behance weren't retrieved.

## Q5. General legal framing (personal caching vs redistribution; robots.txt and scraping risk) and connector recommendations

### Takeaway
Under the published terms, there's a clear line. Open-access and CC0 content can be cached and even redistributed freely. CC BY/BY-SA content can be cached and reused as long as attribution (and share-alike) is kept. Commercial-platform content can be used under each API's display rules, and redistribution is never covered. Scraping sites without APIs, or against "no automated extraction" clauses, is the main ToS risk. Personal reference use lowers practical exposure but doesn't override a contractual ban. This is not legal advice.

### Cited Findings
- Commons licences require crediting the creator and, for BY-SA, licensing modifications similarly. Public-domain files don't legally need attribution, but it is "recommended to give correct provenance" — [Commons reuse](https://commons.wikimedia.org/wiki/Commons:Reusing_content_outside_Wikimedia)
- The Met CC0 data is for "unrestricted commercial and noncommercial use", but copyrighted objects carry `rightsAndReproduction` — [Met API](https://metmuseum.github.io/)
- Unsplash prohibits selling unaltered photos, directly or indirectly — [Unsplash guidelines](https://help.unsplash.com/en/articles/2511245-unsplash-api-guidelines)
- A scraping vendor notes that legality depends on "the website's terms of service, the purpose of the scraping, and the jurisdiction". This is a vendor opinion — [Oxylabs](https://oxylabs.io/products/scraper-api/ecommerce/mcmaster-carr)
- Wikimedia enforces its User-Agent policy and blocks non-compliant agents, which shows that "polite bot" conventions are enforced technically — [Phabricator T400119](https://phabricator.wikimedia.org/T400119)

### Inferences
- **v1 connectors (keyless or free key, CC0/PD, terms endorse downloading):**
  - The Met
  - Art Institute of Chicago
  - Cleveland Museum of Art
  - Smithsonian Open Access (2D + 3D)
  - Poly Haven
  - NASA Images
  - Wikimedia Commons (with a per-file licence capture)
  - Rijksmuseum (new APIs; verify the key/licence details first)
- **v2 connectors (keys/OAuth, display-oriented terms, attribution obligations):**
  - Pexels
  - Sketchfab (user OAuth, CC filter)
  - Unsplash: user-initiated saves only, keep hotlink URL and attribution, trigger `download_location`
  - Flickr (needs Pro; CC filter)
  - Thingiverse (if token registration works after the acquisition)
- **Avoid as automated connectors:**
  - Pinterest (own-account sandbox, heavy review)
  - Behance (API unavailable)
  - ArtStation (no API, anti-scraping)
  - DeviantArt (restrictive, undisclosed limits; low value for CC content)
  - GrabCAD, Printables, Onshape public docs (explicit anti-scraping)
  - McMaster-Carr (copying/archiving prohibited; customer-only API)
  - TraceParts / 3D ContentCentral (partner programs)
- **For the avoid list:** support a manual "import file + source URL" path, a browser bookmarklet that records the URL, or user-downloaded files dropped into the app. This keeps the human in the loop and stays within normal personal browsing.
- **robots.txt:** it isn't a licence. It signals what crawlers are welcome to do. Honouring robots.txt and published rate limits reduces block risk but doesn't cure a ToS clause that prohibits automated extraction.

### Gaps
- No authoritative legal source (statute or case law) was reviewed on personal-use caching versus ToS breach. This section only summarizes published platform terms.
