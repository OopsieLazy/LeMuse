---
status: proposed
date: 2026-11-19
decision-makers: owner
consulted: admin pass, developer pass; research report (enterprise readiness)
informed: —
---

# ADR-0028: Update check, release pipeline, accessibility gates

## Context

The owner asked to "settle the fixes before 1.0": signing, release checksums, the trademark search, and basic
accessibility. On Q25: "how difficult are auto updates to implement? Or at least a version that detects new
files and updates."

What we found:
- **No GitHub Release is published yet:** the API answers 404 for LeMuse; v0.7.0 is only a tag.
- **No release pipeline exists:** installers are built by hand.

## Decision

**1. Update check now (Q25, the "detects new" version).**
- `lemuse_core::update::latest_release` makes one GET to
  `api.github.com/repos/OopsieLazy/LeMuse/releases/latest` through the shared `HttpClient`, with LeMuse's
  User-Agent and **no Are.na token** (that is only ever sent to api.are.na).
- **The answer is untrusted:** the tag must be `major.minor.patch[-pre]`, the link must start with this
  repository's `/releases/`, and drafts and pre-releases are ignored. A 404 means no release yet; 403 or 429 is
  GitHub's rate limit.
- **The app:**
  - checks at launch, at most once a day, while Settings → About → "Look for a newer LeMuse" is on (default on);
  - shows "LeMuse X is available" under the topic list and in About, with a link to the release page;
  - offers "Check for updates now".
- **The CLI:** `lemuse update-check`.
- **Nothing is downloaded.** The user installs the new version.
- **Privacy:** GitHub sees the request (an IP address and the User-Agent). It's said in About and the privacy
  statement, and can be switched off.

**2. Full automatic updates later, and what they take.** The Tauri updater plugin:
1. A **signing key pair** (`tauri signer generate`). The owner keeps the private key as a GitHub Actions secret.
   **Losing it strands every installed copy** (they can't verify updates any more).
2. `plugins.updater` in `tauri.conf.json`: the public key and an endpoint (`latest.json` on GitHub Releases).
3. The release workflow signs the bundles and uploads `latest.json`.
4. A capability for `updater:default`, and an "Install and restart" button.

Effort: one PR, about a day, after the first published release. It's separate from Authenticode signing (Q24) and
works without it. Recommendation: ship 1.0 with the update check. Turn on the updater once releases come from
the pipeline and the key is stored safely.

**3. The release pipeline (`.github/workflows/release.yml`).**
- **Trigger:** a pushed `v*.*.*` tag (or by hand).
- **Steps:**
  1. Check the tag matches the version.
  2. Run the tests, then build the NSIS and MSI installers on `windows-latest`.
  3. Write `SHA256SUMS` and a CycloneDX SBOM (`scripts/sbom.mjs`: 527 components from the two lockfiles, no new
     tool).
  4. Attest build provenance (`actions/attest-build-provenance` v4.2.2, pinned by SHA, released 2026-08-06).
  5. Open a **draft** release. The owner publishes it.
- **Least privilege:** contents/id-token/attestations write, in that job only.
- **Release outputs never reach git:** `/release/`, `*.cdx.json`, `SHA256SUMS` and installers are in
  `.gitignore` and `FORBIDDEN_FILES`.

**4. Signing (Q24): left to the owner, with a slot.** The workflow has a commented "Sign" step. Options from the
research:
- **SignPath Foundation:** free; SignPath is named as publisher. It needs a published release, CI builds and a
  code-signing policy page.
- **An OV certificate on a cloud HSM:** about $150–300 a year, your name as publisher.
- **Azure Artifact Signing:** open to individuals in the USA and Canada only.

EV no longer skips SmartScreen. Whichever is picked, keep one identity forever.

**5. Accessibility gates (layout test).**
- **WCAG 2.5.8:** every visible control is at least 24 × 24 px. Inline text buttons and the full-image tap areas
  are exempt.
- **WCAG 1.4.3:** text contrast, measured on the real blended background, at one desktop and one compact size
  across all states and themes.
- **What it found:** 84 failures. 23 px chips, an unstyled select, and two Millennium theme colours (4.14:1 and
  4.46:1). All fixed (`--target-min`, darker `--ok` and `--muted`).
- **Runner:** Edge's `--dump-dom` stopped returning output on this machine mid-session. The layout test now reads
  its report from the page through Edge's DevTools HTTP endpoint on 127.0.0.1 (a random port for that run only),
  and kills the whole Edge process tree afterwards.

**6. The name (Q26).** A desk search found no app, product or filing named "LeMuse". "Muse" alone is crowded in
software (Class 9/42: pending filings by Muse App Inc. and Logitech, Adobe's registered MUSE). Notes and the
proportionate path are in [docs/product/name-check.md](../product/name-check.md). It's not legal advice; a formal
search before paid distribution is the owner's call.

## Consequences

- A release is: tag → CI → draft → owner publishes. People can verify downloads (`SHA256SUMS`,
  `gh attestation verify`).
- Installers stay unsigned until Q24. The draft notes say how to get past SmartScreen and how to verify.
- **Deferred:**
  - the updater plugin (§2);
  - third-party notices in the installer (cargo-about);
  - the OpenSSF Scorecard action.
