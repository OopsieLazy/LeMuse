# Building, hosting, protecting and (optionally) charging for a client-side artist web app (value-study helper), November 2026

Scope: a static, privacy-first web app (greyscale / invert / value-study / notan) that works only on the user's own image or camera in the browser and never uploads, possibly hosted on a friend's domain. Research date: 2026-11-23. **Not legal advice.** Where a source was not re-fetched in this session but is a stable standard reference (MDN, specs, statutes), it is marked "(reference, not re-fetched)".

Biggest news for the plan: **Lemon Squeezy is shutting down** (closed to new sellers 16 Nov 2026, stops 31 Mar 2027), so it is no longer an option (see Q5).

---

## Q1. Client-side image processing: APIs, formulas, iOS limits, camera, PWA, saving

### Takeaway
Canvas 2D + WebGL2 covers every target browser and is enough for greyscale/L*/posterize/Otsu/invert/levels; WebGPU now ships in all major browsers including Safari 26 on iOS (since Sept 2025) but had early iOS bugs, so treat it as an optional accelerator, not a requirement. The real risks are iOS canvas size/memory caps, Safari's inconsistent HEIC handling in file inputs, and saving files (File System Access API is Chromium-only, so download is the portable path).

### Cited Findings
**Graphics API support**
- WebGPU is supported in Safari 26 on macOS Tahoe 26, iOS 26, iPadOS 26 and visionOS 26; web.dev lists it as supported in all major browsers — [web.dev: WebGPU is now supported in major browsers](https://web.dev/blog/webgpu-supported-major-browsers)
- Safari 26.0 release notes are dated 15 Sept 2025 — [Apple Safari 26 release notes](https://developer.apple.com/documentation/safari-release-notes/safari-26-release-notes)
- A WebKit bug reported WebGPU canvas flicker on iOS 26.x (reproduced on 26.2), confirmed fixed in Safari 26.4 — [WebKit Bugzilla 301627](https://bugs.webkit.org/show_bug.cgi?id=301627)
- WebGL2 is broadly supported across current browsers including iOS Safari (since iOS 15) — [caniuse: WebGL 2.0](https://caniuse.com/webgl2) (reference, not re-fetched)

**Exact formulas** (reference, not re-fetched)
- sRGB to linear: c_lin = c/12.92 if c <= 0.04045, else ((c+0.055)/1.055)^2.4 (c in 0..1) — [Wikipedia: sRGB](https://en.wikipedia.org/wiki/SRGB)
- Relative luminance (D65, linear sRGB): Y = 0.2126 R + 0.7152 G + 0.0722 B — [Wikipedia: sRGB](https://en.wikipedia.org/wiki/SRGB)
- CIE L* = 116 f(Y/Yn) − 16 with Yn = 1, f(t) = t^(1/3) if t > (6/29)^3, else t/(3·(6/29)^2) + 4/29; L* ranges 0–100 — [Wikipedia: CIELAB color space](https://en.wikipedia.org/wiki/CIELAB_color_space)
- Otsu's method picks the threshold that maximises between-class variance of the grey-level histogram (equivalently minimises within-class variance); computable in one pass over a 256-bin histogram — [Wikipedia: Otsu's method](https://en.wikipedia.org/wiki/Otsu%27s_method)

**EXIF orientation and stripping**
- CSS `image-orientation: from-image` is the default, and browsers apply EXIF orientation when rendering/drawing images — [MDN: image-orientation](https://developer.mozilla.org/en-US/docs/Web/CSS/image-orientation) (reference, not re-fetched)
- `createImageBitmap(blob, { imageOrientation: 'from-image' })` and canvas `toBlob()` are the standard decode/re-encode APIs — [MDN: createImageBitmap](https://developer.mozilla.org/en-US/docs/Web/API/Window/createImageBitmap), [MDN: toBlob](https://developer.mozilla.org/en-US/docs/Web/API/HTMLCanvasElement/toBlob) (reference, not re-fetched)

**HEIC on iPhone**
- Since Safari 17, a file input with `accept="image/*,image/heic"` was reported to convert PNG/JPEG to HEIC before handing over the file; another report says Safari transcodes HEIC to the *first* type listed in `accept` (e.g. JPEG) — [WebKit Bugzilla 303803](https://bugs.webkit.org/show_bug.cgi?id=303803), [Apple Developer Forums 743049](https://developer.apple.com/forums/thread/743049), [Apple Developer Forums 743037](https://developer.apple.com/forums/thread/743037)
- WordPress core hit related Safari upload-format problems and worked around them by dropping `image/heic` from `accept` for Safari — [WordPress Trac #62447](https://core.trac.wordpress.org/ticket/62447)
- Firefox and Chrome only highlight HEIC files in the picker if `image/heic` is listed explicitly; Safari does so for `image/*` — [Mozilla Bugzilla 1866039](https://bugzilla.mozilla.org/show_bug.cgi?id=1866039)
- No official Apple documentation of the rules was found; behaviour changed across Safari versions — (search summary of the above sources)

**iOS memory limits** (older data, 2018–2024)
- Safari could not handle canvases above 16,777,216 pixels (4096×4096); total canvas memory limit 384 MB on iOS 15 (lower on earlier versions, likely device specific) — [PQINA: Canvas area exceeds the maximum limit (2022)](https://pqina.nl/blog/canvas-area-exceeds-the-maximum-limit/), [PQINA: Total canvas memory use exceeds the maximum limit](https://www.pqina.nl/blog/total-canvas-memory-use-exceeds-the-maximum-limit/)
- iOS 12-era reports cite 224–256 MB — [Apple Developer Forums 112218](https://developer.apple.com/forums/thread/112218)
- WebKit bug 271002 (March 2024) proposed raising the iOS canvas limit from 4096×4096 to 8192×8192; resolved, but release version not confirmed — [WebKit Bugzilla 271002](https://bugs.webkit.org/show_bug.cgi?id=271002)

**Camera, PWA, saving** (reference, not re-fetched)
- `getUserMedia()` is available only in secure contexts (HTTPS or localhost) and prompts the user for permission — [MDN: getUserMedia](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia)
- The `camera` Permissions-Policy directive controls whether the document (and iframes) may use the camera; default allowlist is `self` — [MDN: Permissions-Policy camera](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Permissions-Policy/camera)
- `showSaveFilePicker()` (File System Access API) is not Baseline (Chromium-only); `<a download>` with a Blob URL works everywhere — [MDN: showSaveFilePicker](https://developer.mozilla.org/en-US/docs/Web/API/Window/showSaveFilePicker)
- Service workers enable offline use and require HTTPS — [MDN: Service Worker API](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)

### Inferences
- Architecture: decode with `createImageBitmap` → downscale to a working size (e.g. long edge ≤ 4096 px, which keeps one RGBA buffer ≈ 64 MB) → process in a Web Worker on `OffscreenCanvas`/typed arrays (or a WebGL2 fragment shader for live camera) → display. Keep full-resolution export optional and tiled. This avoids the iOS caps.
- Compute L* via a 256-entry lookup table (8-bit sRGB → L*), since the transform is per-channel then a weighted sum; posterize/notan = quantise L* into N bands or threshold at Otsu/user value; invert = 255 − v (or 100 − L*); levels = black/white/gamma remap via LUT. All are cheap on CPU; WebGL2 is only needed for smooth 30–60 fps camera preview at high resolution.
- Re-encoding through canvas yields a new file without the original EXIF/GPS metadata, which is a privacy plus for anything the user saves; state this in the UI rather than promise "metadata stripped" for originals (we never touch them).
- HEIC: set `accept="image/*"` (plus `image/heic` only for non-Safari if desired) and rely on Safari's transcoding; detect decode failure and show "Save as JPEG in Photos and retry" rather than shipping a heavy HEIC wasm decoder. Test on real iOS 26 devices.
- Saving: use `<a download>` everywhere, with `showSaveFilePicker` as progressive enhancement on Chromium; on iOS, the Web Share API (`navigator.share` with files) is the usual "Save to Photos" route (not verified this session).
- WebGPU: not needed for this feature set; adding it doubles the code paths and test matrix. Defer.

### Gaps
- Current (iOS 26) canvas pixel and memory caps were not confirmed; only iOS 15-era numbers and a 2024 bug were found. Must be measured on devices.
- iOS 26 PWA changes (e.g. Add to Home Screen defaulting to web-app mode) were not verified in this session.
- No official Apple statement on HEIC → JPEG conversion rules for `<input type=file>`.

---

## Q2. Hosting a static site on a friend's domain

### Takeaway
Cloudflare (Workers static assets or Pages) is the best free fit: static asset requests are free and unlimited, custom headers via `_headers`, CNAME a subdomain from any DNS. Netlify's free tier is now credit-based (300 credits/month, hard limit) but allows commercial use; Vercel Hobby forbids commercial use; GitHub Pages forbids running an online business/SaaS and cannot set response headers. Use a **subdomain** (e.g. `muse.friend.example`) via CNAME, with the owner holding the hosting account and the friend holding only DNS.

### Cited Findings
- Cloudflare: requests to static assets are free and unlimited on Workers and Pages; only requests that invoke Worker code count against quotas — [Cloudflare Workers static assets: billing and limitations](https://developers.cloudflare.com/workers/static-assets/billing-and-limitations)
- Workers Free: 100,000 requests/day (resets midnight UTC); Pages Functions share that quota — [Cloudflare Workers limits](https://developers.cloudflare.com/workers/platform/limits), [Pages Functions pricing](https://developers.cloudflare.com/pages/functions/pricing)
- Free plan: 20,000 static asset files per Worker version, 25 MiB per file — [Cloudflare Workers limits](https://developers.cloudflare.com/workers/platform/limits)
- Pages Free: 500 builds/month, 20-minute build timeout; custom domains capped per project by plan — [Cloudflare Pages limits](https://developers.cloudflare.com/pages/platform/limits)
- With `run_worker_first`, requests over free limits get HTTP 429 instead of falling back to static assets — [Cloudflare static assets billing and limitations](https://developers.cloudflare.com/workers/static-assets/billing-and-limitations)
- Cloudflare says Workers now supports most Pages use cases with a broader feature set (new projects steered to Workers) — [Cloudflare Pages docs](https://developers.cloudflare.com/pages/)
- Pages custom domain: a subdomain can be pointed by CNAME from an external DNS provider; an apex domain requires the zone to be on Cloudflare — [Cloudflare Pages custom domains](https://developers.cloudflare.com/pages/configuration/custom-domains/) (reference, not re-fetched)
- Cloudflare Pages/Workers static assets support a `_headers` file for custom response headers — [Cloudflare Pages headers](https://developers.cloudflare.com/pages/configuration/headers/) (reference, not re-fetched)
- Vercel: "Hobby teams are restricted to non-commercial personal use only. All commercial usage of the platform requires either a Pro or Enterprise plan" — [Vercel Hobby plan docs](https://vercel.com/docs/plans/hobby), [Vercel Terms](https://vercel.com/terms)
- Netlify moved to credit-based billing in Sept 2025; the free plan is 300 credits/month with a hard limit (no overage); third-party sources say the free tier allows commercial use (Netlify's own terms not verified) — [DEV: Best Netlify alternatives for indie hackers in 2026](https://dev.to/devtoolpicks/best-netlify-alternatives-for-indie-hackers-in-2026-ceo), [cmaven: Netlify vs Vercel static hosting limits](https://cmaven.github.io/en/hosting/netlify-vercel-static-hosting-comparison/)
- GitHub Pages "is not intended for or allowed to be used as a free web-hosting service to run your online business, e-commerce site, or any other website that is primarily directed at either facilitating commercial transactions or providing commercial software as a service (SaaS)"; limits: 1 GB site, 100 GB/month soft bandwidth, 10-minute deploy timeout — [GitHub Pages limits](https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits)
- A CSP delivered by `<meta>` cannot use `frame-ancestors`, `report-uri` or `sandbox` — [MDN: CSP](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CSP) (reference, not re-fetched); GitHub Pages offers no custom response headers (well known; not re-verified)

### Inferences
- Recommended: Cloudflare Workers static assets (or Pages) on the **owner's** Cloudflare account, deployed by GitHub Actions with a scoped API token (stored as a GitHub Actions secret, never in the repo); per-PR preview deploys on `*.workers.dev`/`*.pages.dev` fit ADR-0009's "see it" rule. Cost: $0 at expected scale.
- Subdomain vs path: a **subdomain** (CNAME) is strongly preferred. A path (`friend.example/muse/`) would require the friend's server to proxy, share an origin (cookies, service-worker scope, storage and CSP collide with the friend's site) and give the friend's site full script access to ours. A subdomain is a separate origin.
- Account control risk: whoever controls DNS can repoint or take down the app, and can issue TLS certs for it. Mitigate with a short written agreement: subdomain dedicated to the app; owner controls hosting and content; friend changes the record only after notice; notice period (e.g. 60–90 days) and a redirect to the owner's own domain on exit; no analytics/ads injection; who is named in the privacy notice; liability. Also add a CAA record and keep a fallback `*.workers.dev`/`*.pages.dev` URL in the app's About page. Consider buying an owner-held domain later as the canonical name.
- If the app is ever paid, Vercel Hobby and GitHub Pages are out; Cloudflare free and Netlify free remain options (re-check terms).

### Gaps
- Exact Cloudflare free custom-domain count per project not confirmed (one table said 100, ambiguous).
- Netlify's own current terms on commercial use and the credit cost of bandwidth/requests were not fetched.

---

## Q3. Security headers and supply chain for a static app

### Takeaway
A static, no-backend app can run a very strict header set: `default-src 'none'` CSP with only `'self'` for scripts/styles/workers, `img-src 'self' blob: data:`, `media-src 'self' blob:` for the camera, `frame-ancestors 'none'`, `Permissions-Policy: camera=(self)` and everything else off. COOP/COEP are only needed for SharedArrayBuffer/wasm threads, which this feature set does not need.

### Cited Findings
- SharedArrayBuffer requires cross-origin isolation: `Cross-Origin-Opener-Policy: same-origin` and `Cross-Origin-Embedder-Policy: require-corp` (or `credentialless`) — [MDN: SharedArrayBuffer security requirements](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/SharedArrayBuffer#security_requirements), [web.dev: COOP and COEP](https://web.dev/articles/coop-coep) (reference, not re-fetched)
- Permissions-Policy `camera` directive; default allowlist `self` — [MDN](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Permissions-Policy/camera) (reference, not re-fetched)
- Subresource Integrity lets the browser verify fetched scripts/styles against a hash; relevant only for cross-origin resources — [MDN: Subresource Integrity](https://developer.mozilla.org/en-US/docs/Web/Security/Subresource_Integrity) (reference, not re-fetched)
- Custom headers on Cloudflare via `_headers` — [Cloudflare Pages headers](https://developers.cloudflare.com/pages/configuration/headers/) (reference, not re-fetched)

### Inferences
- Proposed header set (in `_headers`):
  - `Content-Security-Policy: default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self' blob: data:; media-src 'self' blob:; worker-src 'self' blob:; connect-src 'self'; manifest-src 'self'; font-src 'self'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'; upgrade-insecure-requests` (add `'wasm-unsafe-eval'` to `script-src` only if wasm is used; add the analytics beacon host to `script-src`/`connect-src` only if analytics is chosen).
  - `Permissions-Policy: camera=(self), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()` etc.
  - `Referrer-Policy: no-referrer`, `X-Content-Type-Options: nosniff`, `Cross-Origin-Opener-Policy: same-origin`, `Cross-Origin-Resource-Policy: same-origin`, HSTS (set on the zone only with the friend's agreement, as `includeSubDomains`/preload would affect the friend's domain).
- `connect-src 'self'` plus no third-party script is the technical proof of "never uploads"; publish the CSP in the privacy notice and add a CI test that the built HTML/`_headers` keep it.
- SRI is moot if everything is self-hosted (Vite bundles all JS); no CDN scripts.
- Supply chain: reuse LeMuse's existing controls (14-day dependency cooldown, `npm ci --ignore-scripts`, npm audit gate, gitleaks, dependency review); keep runtime deps to React + nothing else; pin GitHub Actions by SHA; deploy token scoped to the one Worker/Pages project.
- Skip COOP/COEP `require-corp` unless wasm threads are added; it can break the camera/blob flows only if cross-origin resources are embedded (none are).

### Gaps
- Did not verify Safari 26 support for `COEP: credentialless` (only relevant if threads are added).

---

## Q4. Privacy and legal position (not legal advice)

### Takeaway
If images never leave the device, there are no accounts, cookies or local storage of personal data, and no analytics, the app itself processes almost no personal data; the remaining personal data is the host's request logs (IP addresses), so a short privacy notice is still advisable, but no cookie banner is needed. Selling changes things: an EU-facing seller needs an imprint in Germany/Austria, and the EAA's accessibility rules for e-commerce apply unless the seller is a microenterprise (< 10 staff and ≤ €2 m turnover), which a solo seller is.

### Cited Findings
- IP addresses can be personal data (CJEU *Breyer*, C-582/14, 2016) — [CURIA C-582/14](https://curia.europa.eu/juris/liste.jsf?num=C-582/14) (reference, not re-fetched)
- EDPB Guidelines 2/2023 interpret ePrivacy Art. 5(3) broadly (covers pixels, URL/tracking techniques, not only cookies) — [EDPB Guidelines 2/2023](https://www.edpb.europa.eu/our-work-tools/documents/public-consultations/2023/guidelines-22023-technical-scope-art-53-eprivacy_en) (reference, not re-fetched)
- UK: the Data (Use and Access) Act 2025 adds PECR exemptions including for storage/access used solely for statistical purposes about how the service is used; the exemption does not cover third-party analytics providers that combine data with other data or use it for their own purposes — [CMS: UK data protection, what's changed](https://cms.law/en/gbr/legal-updates/uk-data-protection-what-s-changed-what-s-next), [GOV.UK DUAA PECR factsheet](https://www.gov.uk/government/publications/data-use-and-access-act-2025-factsheets/data-use-and-access-act-factsheet-pec-regulations)
- ICO says all DUAA data protection provisions are in force as of 19 June 2026; ICO has finalised its "storage and access technologies" guidance (formerly the cookies guidance) — [ICO: DUAA, what it means for organisations](https://ico.org.uk/about-the-ico/what-we-do/legislation-we-cover/data-use-and-access-act-2025/the-data-use-and-access-act-2025-what-does-it-mean-for-organisations), [Osborne Clarke on ICO final guidance](https://marketinglaw.osborneclarke.com/advertising-regulation/new-exceptions-explained-in-ico-final-guidance-on-storage-and-access-technologies-could-online-advertising-be-next/)
- EAA: requirements do not apply to microenterprises providing services (Art. 4(5)); microenterprise = fewer than 10 employees and annual turnover or balance sheet ≤ €2 m; the exemption does not cover products — [CCPC Ireland: EAA guidelines for microenterprises](https://www.ccpc.ie/business/enforcement/accessibility/european-accessibility-act-guidelines-for-microenterprises/), [Siteimprove EAA FAQ](https://www.siteimprove.com/blog/the-european-accessibility-act-faq)
- EAA "e-commerce services" = services provided at a distance via websites/apps at a consumer's request with a view to concluding a consumer contract; Taylor Wessing advises growing businesses not to rely heavily on the microenterprise exemption — [Taylor Wessing: key EAA exemptions](https://www.taylorwessing.com/en/interface/2025/accessibility/key-eu-accessibility-act-exemptions-and-the-challenges-they-pose), [dev.to/lawebe: EAA for online stores](https://dev.to/lawebe/the-european-accessibility-act-eaa-what-online-stores-must-do-1eh5)
- Germany: §5 Digitale-Dienste-Gesetz (DDG, replaced the TMG's §5 in May 2024) requires an imprint (name, address, contact) for business-like ("geschäftsmäßige") digital services — [DDG §5](https://www.gesetze-im-internet.de/ddg/__5.html) (reference, not re-fetched)
- California CCPA/CPRA applies only to for-profit businesses above a revenue threshold (USD 25 m, inflation-adjusted) or handling 100,000+ consumers' data or earning ≥ 50% of revenue from selling/sharing data — [California AG: CCPA](https://oag.ca.gov/privacy/ccpa) (reference, not re-fetched)
- Canada: PIPEDA applies to personal information collected in the course of commercial activity — [OPC: PIPEDA](https://www.priv.gc.ca/en/privacy-topics/privacy-laws-in-canada/the-personal-information-protection-and-electronic-documents-act-pipeda/) (reference, not re-fetched)

### Inferences
- Controller: the person who decides why/how logs and any analytics are processed is the controller. If the owner runs the hosting account, the owner is controller and Cloudflare/Netlify is processor (their DPA applies by ToS); the friend, who only provides a DNS record, is likely not a controller for the app. The written agreement should say so; if the friend's own CDN/proxy sits in front, they become involved. (Not legal advice.)
- Free, no-analytics stage 1: privacy notice (one short page: what happens to images = nothing leaves the device; the host's logs and retention; contact; rights), no cookie banner (no non-essential storage). Storing only UI preferences in `localStorage` is widely treated as strictly necessary/functional; keep it to settings, never images.
- Paid stage: an MoR (Q5) is the seller to the customer, which moves VAT, invoices, refunds and much consumer-law handling to them; the owner still needs terms of use for the app, an imprint if trading into Germany/Austria, and a privacy notice naming the MoR.
- Jurisdiction differences: EU (GDPR + ePrivacy Art 5(3), strict on any device access, EAA for consumer e-commerce, Impressum in DE/AT); UK (UK GDPR + PECR with DUAA statistics exemption, so first-party aggregate analytics can run without consent; EAA does not apply in UK); US (no federal law; CCPA thresholds will not be met by a solo seller; ADA web-accessibility risk exists but is not a statutory standard for private sites); Canada (PIPEDA applies to commercial activity, so a privacy notice and consent for any collection; Quebec Law 25 is stricter).
- Accessibility: build to WCAG 2.2 AA anyway (cheap for a small app, protects against the EAA if the business grows past microenterprise and helps the audiences doc).

### Gaps
- No authoritative source on whether hosting-provider request logs alone require a formal privacy notice (good practice says yes).
- Not confirmed whether a free app with a "support me" link counts as "geschäftsmäßig" under DDG §5 (German case law tends to say yes for anything not purely private).

---

## Q5. Payments for a solo seller

### Takeaway
Use a merchant of record (MoR) so VAT/sales tax is handled; Lemon Squeezy is closing (no new sellers since 16 Nov 2026), so the realistic choices are Paddle (5% + 50¢), Polar.sh (tiered from 5% + 50¢, Nov 2026), Stripe Managed Payments (Stripe fees + 3.5%, no licence keys or file delivery), or Gumroad (10% + 50¢ plus processing). For a client-side app, licence keys are crackable by design; accept that (honour system / pay-what-you-want) rather than adding a server.

### Cited Findings
- Lemon Squeezy "is no longer accepting new sign-ups and will shut down on March 31, 2027"; Stripe Managed Payments is the replacement, supporting merchants in 35+ countries — [Lemon Squeezy: 2026 update](https://www.lemonsqueezy.com/blog/2026-update)
- New sign-ups closed 16 Nov 2026; migration tooling opens 2 Dec 2026; migration can take up to 8 weeks — [Checkout Page: Lemon Squeezy shutting down](https://checkoutpage.com/blog/lemon-squeezy-shutting-down) (competitor blog), [Michael Tsai, 19 Nov 2026](https://mjtsai.com/blog/2026/11/19/lemon-squeezy-shutting-down/)
- Stripe Managed Payments does not currently include Lemon Squeezy's storefronts, digital file delivery, licence-key fulfilment or affiliates — [Checkout Page: migrating from Lemon Squeezy](https://checkoutpage.com/docs/articles/migrating-from-lemon-squeezy) (competitor source)
- Stripe Managed Payments adds 3.5% per successful transaction on top of standard Stripe processing, covering indirect tax, fraud and disputes; handles indirect tax in 80+ countries (seller remains responsible elsewhere) — [Stripe support: Managed Payments pricing](https://support.stripe.com/questions/managed-payments-pricing), [Stripe docs: how Managed Payments works](https://docs.stripe.com/payments/managed-payments/how-it-works)
- Polar.sh is an MoR that calculates, collects and remits taxes worldwide; it moved to tiered plans in 2026: Starter 5% + $0.50, Pro $20/mo 3.8% + $0.40, Growth $100/mo 3.6% + $0.35, Scale $400/mo 3.4% + $0.30 (figures from a third-party calculator checked 18 Nov 2026); cross-border fee 0.25% (EU) to 1% — [Polar pricing](https://polar.sh/resources/pricing), [Polar fees docs](https://polar.sh/docs/fees), [Checkout Page Polar fee calculator](https://checkoutpage.com/tools/polar-fee-calculator); older docs still say 4% + 40¢ — [Polar v1.0 blog](https://polar.sh/blog/polar-v1-0-lower-fees) (conflict; check live page)
- Paddle: 5% + 50¢, all-in including tax handling as MoR, no monthly fee on standard plan — [Checkout Page: Paddle pricing 2026](https://checkoutpage.com/blog/paddle-pricing), [Paddle vs Gumroad](https://paddle.com/compare/gumroad)
- Gumroad: 10% + 50¢ on direct sales (30% via Discover), plus card processing; calculates/remits sales tax, VAT, GST; one comparison puts Paddle at ~6.0% vs Gumroad ~14.5% effective on $10k/month — [Checkout Page: Gumroad fees 2026](https://checkoutpage.com/blog/gumroad-fees), [flaviocopes: $10k/month on each provider](https://flaviocopes.com/payment-provider-fees/)
- GitHub Sponsors charges no fees for sponsorships from personal accounts — [GitHub Docs: About GitHub Sponsors](https://docs.github.com/en/sponsors/getting-started-with-github-sponsors/about-github-sponsors) (reference, not re-fetched)
- Most fee comparison sources found are competitors (Dodo, Fungies, Checkout Page) with commercial interest — noted in search results above

### Inferences
- For a ~$5–15 one-off "supporter" unlock, the fixed 50¢ dominates: Paddle/Polar Starter ≈ 10% total on a $10 sale. Pay-what-you-want with a sensible default works on Gumroad and Polar.
- Licence keys in a static app can only be checked client-side (or by calling the MoR's licence API from the browser, which adds a third-party `connect-src` and a privacy disclosure). Anything client-side is crackable; for a small artist tool this is acceptable: treat payment as support/convenience (e.g. remove a "supporter" nudge, unlock presets), not DRM. Keep the core tools free.
- Simplest privacy-preserving model: free app + optional "support" link (GitHub Sponsors / Ko-fi / Polar) that opens off-site; no licence check in-app. This keeps CSP at `connect-src 'self'` and avoids EU distance-selling and EAA questions sitting on the app itself (they sit with the MoR's checkout).
- Do not pick Lemon Squeezy. Stripe Managed Payments lacks licence keys, so pair it with nothing (honour system) or choose Polar/Paddle/Gumroad if keys are wanted.

### Gaps
- Ko-fi's current (2026) platform fees not verified.
- Paddle's/Gumroad's own pricing pages not fetched; Polar's live tiers only via a third-party calculator.
- Paddle's acceptance of very small solo sellers (it has historically vetted applicants) not verified for 2026.
- Stripe Managed Payments eligible-country list for sellers (owner jurisdiction unknown) not retrieved.

---

## Q6. Analytics without tracking

### Takeaway
The cleanest option is none (or host request counts from the provider dashboard). If wanted, Cloudflare Web Analytics (free, cookieless) or self-hosted/first-party GoatCounter/Plausible; in the UK, DUAA's statistics exemption allows first-party aggregate analytics without consent, but in the EU the ePrivacy Art 5(3) reading is broad, so consent-free use rests on the tool not reading/storing anything on the device.

### Cited Findings
- Cloudflare Web Analytics is described as measuring traffic without cookies or PII and storing nothing on the device, so the ePrivacy cookie-consent requirement does not apply; GDPR still applies to any personal data (e.g. transient IPs) — [ConsentStack: Cloudflare Web Analytics](https://www.consentstack.io/vendors/cloudflare-web-analytics) (third-party vendor page)
- Cloudflare's own consent material concerns Zaraz, not Web Analytics — [Cloudflare blog: consent manager](https://blog.cloudflare.com/consent-manager/)
- UK DUAA statistics exemption (see Q4) — [CMS](https://cms.law/en/gbr/legal-updates/uk-data-protection-what-s-changed-what-s-next)

### Inferences
- Stage 1: no analytics script. Use the host's built-in aggregate request metrics (Cloudflare dashboard) which need no client code and no CSP change.
- If analytics are added: Cloudflare Web Analytics adds a third-party script host (`static.cloudflareinsights.com`) and beacon to CSP, which weakens the "no third-party scripts" story; a self-hosted GoatCounter or a first-party proxied counter keeps CSP `'self'`. Disclose in the privacy notice either way.

### Gaps
- GoatCounter's and Plausible's current GDPR/consent positions and 2026 prices were not fetched.
- Cloudflare's own privacy statement for Web Analytics not fetched.

---

## Q7. Reusing LeMuse code and licensing

### Takeaway
Only `app/src/api.ts` imports `@tauri-apps` in the LeMuse UI, so React components are already portable; a monorepo workspace package (shared UI/image-math) inside the existing public repo reuses the security tooling best. MIT lets the copyright holder license new code differently (even closed/paid), but MIT code already published stays MIT.

### Cited Findings
- LeMuse UI: `app/src/api.ts` is the only file in `app/src` importing `@tauri-apps`; the app uses React 18.3.1, Vite 6.4.5, TypeScript 5.6 — local repo check (`app/src`, `app/package.json`), 2026-11-23
- Existing related ADRs: `docs/adr/0016-beyond-the-desktop.md`, `docs/adr/0020-hosted-web-app.md` — local repo
- The MIT licence grants anyone rights to use, copy, modify, merge, publish, distribute, sublicense and/or sell copies, on condition the copyright and permission notice are included — [OSI: MIT License](https://opensource.org/license/mit) (reference, not re-fetched)

### Inferences
- Recommended: monorepo with npm workspaces: `packages/value-core` (pure TS image maths + tests, no DOM), `web/` (Vite static app), and the existing `app/`. One CI, one secret scanner, one cooldown policy; the web app gets its own `_headers`/CSP guardrail file added to `scripts/guardrail-check.mjs`.
- Alternatively a separate repo if the web app will be closed-source/paid; then copy only what's needed, keep the MIT notice on copied files.
- Licensing: as sole copyright holder the owner may license new web-app code under any licence (e.g. keep MIT, or source-available/proprietary). Code already released under MIT remains usable by others under MIT, so a paid app built from MIT code can be legally cloned; that is fine if payment is "support", not DRM. Third-party contributions (if any) need their own MIT terms respected. (Owner's choice; not legal advice.)

### Gaps
- Did not review ADR-0016/0020 text in detail; the report writer should reconcile with them.
