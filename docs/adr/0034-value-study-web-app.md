---
status: proposed
date: 2026-11-23
decision-makers: owner
consulted: research (reports/LeMuse web app sources and features.md), admin pass
informed: —
---

# ADR-0034: A value-study web app, stage 1 (plan only)

## Context

The owner (2026-11-23): "web app presence (a friend is interested in hosting) → will plan a simple greyscale /
inverter drawing helper web app; think that will be more accomplished / better at sellability." Earlier ADRs
planned "LeMuse Web" as the desktop app in a browser (ADR-0016, ADR-0020); Q18, Q21 and Q23 are open.

Research ([report](../../reports/LeMuse%20web%20app%20sources%20and%20features.md),
[notes](../../research_notes/LeMuse%20web%20app%20sources%20and%20features/)):
- greyscale, invert and notan are free and private on many sites (ArtistTools.org has 70 free tools); people pay
  on phones for camera value apps (Value Study 4.8★ from 3.4K ratings; about $7–$18 once or $2–$15 a year);
- what no web rival does: **one numeric value scale (CIELAB L\*) with steady readings**, and **a photo of your
  painting compared with the reference on the same value bands**, mismatches outlined;
- a web app avoids the unsigned-installer problems (SmartScreen, Smart App Control), runs on the phone at the
  easel, and uses only the user's own images, so no Are.na or museum terms apply (it can read pixels freely,
  which LeMuse can't on CORS-less CDNs);
- expected money is a tip jar, not a business (1–3% of users paying about $8 is an estimate);
- Lemon Squeezy takes no new sign-ups and closes on 31 March 2027; GitHub Pages bans running a business and
  can't set headers; Vercel Hobby is non-commercial only.

## Decision

Plan a separate **static, no-upload web app** ("LeMuse Values" as a working name), built only after 1.1 merges
and the owner answers Q21, Q30 and Q31. Stage 1:

| Item | Decision |
|---|---|
| Purpose | Check values in your own photo, and compare your painting with your reference on one numeric scale. No AI, no ads, no upload |
| In | Open by picker, drop or paste; L\*-based greyscale; invert; 2–9 value bands with a threshold slider and an Otsu "auto" notan; darks/lights isolation (as in LeMuse); tap-for-L\* averaged over a small area (0–100 and a 1–10 step); side-by-side compare of reference and painting on shared bands, 2+ step mismatches outlined; thirds / 4 × 4 / diagonal grid; mirror; download the result; works offline after the first visit (PWA) |
| Out (stage 2+) | Live camera view and live compare with white-point calibration; colour temperature; museum references; app-store wrapper; accounts; sync |
| Stack | npm workspace in this repo: `packages/value-core` (pure TypeScript, unit-tested image maths) and `web/` (Vite + React on the same pinned versions as `app/`); Canvas 2D in a Web Worker; long edge scaled to ≤ 4096 px; no WebGPU, no wasm, no runtime CDN scripts |
| Saving | A download link everywhere (the save dialog on Chromium as an extra); re-encoding drops EXIF and GPS, said in the UI |
| Hosting | Cloudflare static assets on **the owner's** account, deployed by GitHub Actions (SHA-pinned, a token scoped to the one project, in Actions secrets); a preview per PR |
| Domain | A subdomain of the friend's domain by CNAME (a separate origin from the friend's site), with a short written agreement; the `*.workers.dev` URL as the fallback |
| Headers | `default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self' blob: data:; media-src 'self' blob:; worker-src 'self' blob:; connect-src 'self'; manifest-src 'self'; font-src 'self'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'`; `Permissions-Policy: camera=(self), microphone=(), geolocation=(), payment=()`; `Referrer-Policy: no-referrer`; nosniff; COOP and CORP `same-origin`. `_headers` becomes a guardrail file with a CI test that fails if `connect-src 'self'` loosens or a script host appears |
| Privacy | No analytics script; settings in `localStorage` only; a one-page notice (the owner as controller, the host as processor) |
| Money | Free with an off-site support link (GitHub Sponsors); no checkout or licence check in the app |
| Licence | MIT, like LeMuse (recommended; Q30) |

Acceptance (to become tests): (1) a 12 MP phone JPEG shows greyscale and the network log shows nothing beyond the
app's own files; (2) reference and painting in 5-value compare share band edges and a band-2 vs band-4 area is
outlined; (3) tapping a flat grey patch reads L\* within ±1; (4) offline after a first visit, it opens and works;
(5) a downloaded result has no GPS EXIF; (6) CI fails if `_headers` loses `connect-src 'self'` or gains a script
host.

## Options considered

### A. A separate value-study web app (chosen)

**Pros:** sells without anyone's permission; reaches phones; numeric values are possible (own pixels); reuses
LeMuse's security process. **Cons:** a crowded free niche; revenue small; a second product to maintain.

### B. LeMuse Web (the desktop app in a browser, ADR-0020)

**Pros:** one product. **Cons:** streams Are.na and museum content (Q23 first); can't read pixels (no CORS), so no
numbers; nothing to charge for without charging around other people's content.

### C. Paid features in the desktop app

**Cons:** unsigned installers lose most buyers at SmartScreen and Smart App Control; Windows only; same content
question as B.

## Trade-off analysis

The pixel line marks the product line: LeMuse streams other people's images and never reads their pixels; the web
app works only on the user's own pixels, which makes it numeric, makes the compare possible and makes it the one
thing the owner can sell without asking anyone. Revisit if stage 1 draws no audience in three months, or if a
camera compare (stage 2) proves popular enough for a pay-what-you-want unlock (Polar or Paddle, 5% + 50¢).

## Consequences

- Easier: a public, low-friction face for LeMuse; shared `value-core` maths can later give the desktop app real
  numbers on files the user owns (local folders, "compare with my drawing").
- Harder: hosting and a domain relationship to look after; a privacy notice; if money is ever taken, an imprint in
  some countries and a merchant of record.
- Q18 is answered by research: GitHub Pages is not suitable for a business. Q23 is not needed for this app.

## Action items

1. [ ] Owner: Q21 (host on the friend's domain), Q30 (name, licence), Q31 (how to take support)
2. [ ] Owner: approve the six acceptance examples
3. [ ] W1 PR 1: `packages/value-core` with tests (L\*, bands, Otsu, compare)
4. [ ] W1 PR 2: `web/` stage 1, `_headers` + CI test, Cloudflare deploy with previews, privacy notice, support link
5. [ ] Measure canvas limits on a current iPhone; HEIC handling in Safari's picker

## Review log

| Stage | Date | Reviewer | Outcome | Notes / finding IDs |
|---|---|---|---|---|
| Proposal | 2026-11-23 | Claude | drafted (plan only, nothing built) | |
| Admin pass | 2026-11-23 | Claude (architect role) | see review 0026 | A-… |
| Owner gate | | Owner | pending | Q21, Q30, Q31 |
