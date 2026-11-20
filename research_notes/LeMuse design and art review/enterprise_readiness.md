# Enterprise readiness for an open-source Windows desktop app that displays third-party images (LeMuse)

Research date: 2026-11-19. Sources were fetched on that date unless marked. Older sources are tagged **[older: year]**.
This is research, not legal advice. Every claim has an inline source. Anything I couldn't source is in a Gaps section.

## 1. Distribution trust on Windows (code signing, SmartScreen, winget/Store, Tauri updater)

### Takeaway
Since 2024, an EV certificate no longer skips SmartScreen. Any trusted signature (OV, EV, Azure Artifact Signing, SignPath) now builds reputation gradually, so the cheapest *consistent* signing identity is what matters. Azure Artifact Signing (about $9.99/month) is open to **individuals only in the USA and Canada**. Elsewhere, a solo developer's realistic options are an OV certificate ($150–300/yr, key on hardware/HSM), free SignPath Foundation signing (the Foundation is named as publisher and its conditions are strict), or Microsoft Store distribution.

### Cited Findings
- Microsoft's comparison (ms.date 2026-10-29, updated 2026-11-10):
  - Store MSIX: free; Microsoft re-signs it, so there are no SmartScreen warnings.
  - Store MSI/EXE: the publisher must sign with a cert that chains to a Trusted Root Program CA.
  - Azure Artifact Signing: about $9.99/month. Organizations in USA/Canada/EU/UK; **individuals USA and Canada only**. "Reputation builds over time; initial warnings expected."
  - OV: $150–300/yr, worldwide.
  - EV: $400+/yr. "Same as OV since 2024 — no longer instant bypass."
  - Self-signed or unsigned: blocked or strongly warned.
  — [Microsoft Learn: Code signing options](https://learn.microsoft.com/en-us/windows/apps/package-and-deploy/code-signing-options)
- EV "previously bypassed SmartScreen entirely… That behavior was removed in 2024." Paying the EV premium only to avoid SmartScreen is "no longer justified." — [Microsoft Learn](https://learn.microsoft.com/en-us/windows/apps/package-and-deploy/code-signing-options)
- Since June 2023 the CA/Browser Forum has required OV private keys to sit on an HSM or hardware token. Artifact Signing needs no hardware token and works with GitHub Actions. — [Microsoft Learn](https://learn.microsoft.com/en-us/windows/apps/package-and-deploy/code-signing-options)
- Signing consecutive releases with one consistent publisher identity lets reputation carry over to later releases. — [Microsoft Learn](https://learn.microsoft.com/en-us/windows/apps/package-and-deploy/code-signing-options)
- Microsoft's doc names SignPath Foundation as free OV-level signing for qualifying open-source projects. — [Microsoft Learn](https://learn.microsoft.com/en-us/windows/apps/package-and-deploy/code-signing-options)
- Microsoft also warns: "Don't let an AI agent create, export, or commit release certificates or signing credentials." — [Microsoft Learn](https://learn.microsoft.com/en-us/windows/apps/package-and-deploy/code-signing-options)
- A March 2026 Q&A thread says tenants in unsupported countries (e.g. France) can't submit individual identity validation for Artifact Signing. — [Microsoft Q&A](https://learn.microsoft.com/en-nz/answers/questions/5810735/cant-create-a-new-trusted-signing-individual-ident)
- Sources disagree on Artifact Signing's status: some say general availability, a March 2026 Q&A post says public preview. — [Microsoft Q&A](https://learn.microsoft.com/en-us/answers/questions/6020935/artifact-signing); [devclass, Jan 2026](https://www.devclass.com/security/2026/01/14/code-signing-windows-apps-may-be-easier-and-more-secure-with-new-azure-artifact-service/4079554)
- **SignPath Foundation conditions** (the terms page is marked "draft"):
  - all components under an OSI licence, no commercial dual licensing, no proprietary code ("System Libraries" are allowed);
  - actively maintained and *already released* in the form to be signed;
  - built automatically from the project's own source;
  - manual approval for each release;
  - defined Authors, Reviewers and Approvers roles, with MFA for everyone;
  - a "Code signing policy" page linked from the home and download pages, carrying the line "Free code signing provided by SignPath.io, certificate by SignPath Foundation";
  - privacy info. If nothing leaves the system, the policy can say the program doesn't transfer information to other networked systems unless the user asks it to;
  - the certificate is issued to **"SignPath Foundation"**, which becomes the publisher.
  — [signpath.org/terms](https://signpath.org/terms)
- SignPath also excludes white-hat security tools. Pandoc, Ink/Stitch and OpenRCT2 publish code signing policies under the programme. — [signpath.org](https://signpath.org/); [Pandoc policy](https://pandoc.org/code-signing-policy.html); [Ink/Stitch policy](https://inkstitch.org/code-signing-policy); [OpenRCT2 policy](https://openrct2.io/code-signing-policy)
- **winget:**
  - manifests submitted to microsoft/winget-pkgs are validated automatically and checked for safety, and may also be reviewed by hand;
  - the installer should come from the publisher's own site and support non-interactive install/uninstall;
  - the SHA256 in the manifest must match the installer (`winget hash`);
  - a SmartScreen validation error means the URL has a poor reputation;
  - false malware detections can be submitted to Microsoft Defender;
  - Microsoft may refuse any submission.
  — [Microsoft Learn: Submit to winget repository](https://learn.microsoft.com/windows/package-manager/package/repository)
- One third-party doc claims winget *requires* signed installers and that EV bypasses SmartScreen. Microsoft's own pages confirm neither, and the EV claim contradicts Microsoft's 2024 change. — [Brummer doc (third-party)](https://glama.ai/mcp/servers/@standardbeagle/brummer/blob/9f9c9338c0d83896db6f9a45e65430ec1a8b1167/docs/WINDOWS_SIGNING.md); contradicted by [Microsoft Learn](https://learn.microsoft.com/en-us/windows/apps/package-and-deploy/code-signing-options)
- **Tauri updater:**
  - updater signing "cannot be disabled";
  - keys come from `tauri signer generate`; the pubkey sits in `tauri.conf.json`; the private key comes from `TAURI_SIGNING_PRIVATE_KEY` (`.env` files don't work);
  - if you lose the private key, you can no longer ship updates to existing installs;
  - TLS is enforced in production;
  - Windows `installMode` can be `passive` (default), `basicUi` or `quiet` (quiet can't elevate).
  — [Tauri v2 updater plugin](https://v2.tauri.app/plugin/updater/)

### Inferences
- The Tauri updater signature (minisign-style) and Authenticode are separate layers. The updater key proves an update came from the project. Authenticode/SmartScreen governs the first install. LeMuse needs both if it ships auto-update.
- For a solo owner outside the US or Canada, the low-cost path is: (1) apply to SignPath Foundation, which needs a public release first, CI builds and MFA; or (2) buy an OV cert on a cloud HSM. Either way, keep **one** identity across releases so reputation accumulates.
- SignPath's "no proprietary code" rule could interact with Tauri's bundled WebView2 bootstrapper. It probably counts as a "System Library", but that should be confirmed with SignPath before applying.
- The project's existing CLAUDE.md rule that tokens and keys never go to agents matches Microsoft's guidance. The signing key belongs only in GitHub Actions secrets or an HSM.
- Store MSIX is the only free path with no SmartScreen warnings. Tauri's default installers are NSIS/MSI, so MSIX would be extra packaging work.

### Gaps
- I didn't fetch Microsoft's SmartScreen reputation page. There's no public figure for how many installs or days it takes to build reputation.
- I couldn't confirm whether Artifact Signing's individual regions will expand to the EU/UK.
- I didn't fetch Microsoft Store submission policies (e.g. 10.x content and IP policies) for an app that shows third-party images.

## 2. Auto-update security and release integrity (checksums, SBOM, SLSA, attestations, reproducible builds)

### Takeaway
Big-company practice is signed releases, published SHA256 checksums, an SBOM (CycloneDX or SPDX) and build provenance. For a GitHub-hosted project, `actions/attest` gives provenance and SBOM attestations for free, verifiable with `gh attestation verify`. OpenSSF Scorecard's "Signed-Releases" check scores 8/10 for signature files and 10/10 when SLSA provenance is attached.

### Cited Findings
- **GitHub artifact attestations:**
  - add `actions/attest@v4` after the build, with `subject-path`;
  - permissions needed: `id-token: write`, `contents: read`, `attestations: write`;
  - SBOM attestations take `sbom-path`, with SPDX or CycloneDX predicates;
  - verify with `gh attestation verify PATH -R ORG/REPO`.
  — [GitHub Docs: artifact attestations](https://docs.github.com/en/actions/security-for-github-actions/using-artifact-attestations/using-artifact-attestations-to-establish-provenance-for-builds)
- **Scorecard Signed-Releases:**
  - looks for .minisig/.asc/.sig/.sigstore assets (8/10 per signed release);
  - `.intoto.jsonl` SLSA provenance raises the score to 10/10;
  - it doesn't verify the signatures.
  — [OpenSSF Scorecard checks.md](https://github.com/ossf/scorecard/blob/main/docs/checks.md)
- Scorecard also has an "SBOM" check (Medium) for an SBOM in source or release artifacts. — [Scorecard checks.md](https://github.com/ossf/scorecard/blob/main/docs/checks.md)
- **cargo-cyclonedx** (OWASP/CycloneDX) emits one SBOM per binary target and can honour feature sets. **cargo-sbom** supports SPDX and CycloneDX. **cargo-auditable** embeds dependency info in the binary. — [cyclonedx-rust-cargo](https://github.com/CycloneDX/cyclonedx-rust-cargo); [cargo-sbom](https://docs.rs/crate/cargo-sbom/0.8.2/source/README.md); [Rust internals pre-RFC](https://internals.rust-lang.org/t/pre-rfc-cargo-sbom/19842)
- The Tauri updater requires a signature over each update artifact, so unsigned updates can't be delivered. — [Tauri updater](https://v2.tauri.app/plugin/updater/)
- winget manifests pin the installer SHA256, which gives integrity at install. — [Microsoft Learn: winget repository](https://learn.microsoft.com/windows/package-manager/package/repository)

### Inferences
- A proportionate solo setup:
  - a release workflow builds on GitHub Actions;
  - Authenticode signs (SignPath/OV);
  - the workflow uploads `SHA256SUMS`, runs `actions/attest` for provenance plus a CycloneDX SBOM (cargo-cyclonedx for Rust, CycloneDX npm for the UI);
  - Tauri signs the update JSON.
  
  This covers Scorecard's Signed-Releases and SBOM checks.
- Fully reproducible builds of Tauri/NSIS on Windows are hard, because toolchains and timestamps vary. Big companies treat them as an aspiration. For solo work, defer them with a PLAN entry.

### Gaps
- I didn't fetch the SLSA spec, so I can't confirm the SLSA build level GitHub attestations reach (commonly described as Build L2, or L3 with reusable workflows).
- I found no source on reproducibility for Tauri NSIS installers specifically.

## 3. Privacy and law (GDPR, UK GDPR, CCPA, privacy policy, crash reports, "Report a problem")

### Takeaway
A local app with no telemetry, where the developer receives no personal data, is unlikely to make the developer a GDPR controller. The CCPA almost certainly doesn't apply: it covers for-profit businesses above about $26.6M revenue, 100k California consumers, or 50% revenue from data sales. A short privacy statement is still best practice and is *required* by SignPath. The real risk is the "Report a problem" and "Copy details" flow putting personal data into public GitHub issues: Windows user names in paths, tokens, library contents.

### Cited Findings
- ICO guidance (summarised by Ashfords) suggests that if an app runs only on the user's device and doesn't collect, transfer or store personal data elsewhere, the developer is unlikely to be a controller. The summary was truncated in what I retrieved. — [Ashfords on ICO app guidance](https://www.ashfords.co.uk/insights/articles/information-commissioners-office-highlights-the-importance-of-privacy-in-the-design-and-development-of-mobile-applications) **[older]**
- The ICO's innovation advice recommends giving app users adequate privacy information, and its domestic-processing exemption protects individuals processing for personal or household purposes. — [ICO: previously asked questions](https://ico.org.uk/for-organisations/advice-and-services/innovation-advice/previously-asked-questions)
- Commentary says the ICO doesn't treat the domestic exemption as a blanket shield for connected products. — [Browne Jacobson, June 2026](https://www.brownejacobson.com/insights/retail-law-roundup-june-2026/retailers-ico-and-data-protection-compliance)
- CCPA covers for-profit entities doing business in California that meet any one of these: about $26,625,000 annual gross revenue, data on 100,000+ California consumers or households, or 50%+ of revenue from selling or sharing personal information. — [Clym applicability guide](https://www.clym.io/blog/ccpa-applicability-guide); [Feroot, Feb 2026](https://feroot.com/blog/ccpa-applicability-website-california-law/) (secondary; confirm with the CPPA)
- SignPath privacy condition: software that sends user data to systems the user didn't specify must say so in a privacy policy shown during install, with an opt-out. If nothing leaves the system, a statement saying so is enough. — [signpath.org/terms](https://signpath.org/terms)
- GitHub's new-issue URL accepts `title`, `body`, `labels`, `milestone`, `assignees`, `projects` and `template`. Issue-form text fields can be prefilled by query parameter. URLs that are too long return 414. — [GitHub Docs: creating an issue from a URL query](https://docs.github.com/en/issues/tracking-your-work-with-issues/using-issues/creating-an-issue#creating-an-issue-from-a-url-query)
- Are.na API tokens don't expire, so a leaked token stays valid until the user revokes it. — [Are.na developer docs](https://www.are.na/developers/all.md)

### Inferences
- **What goes in the privacy statement:**
  - LeMuse has no telemetry or analytics;
  - which hosts it contacts and why: the Cleveland API and CDN, the Are.na API and CDN, and the GitHub update endpoint if added. These get the user's IP and User-Agent as with any web request;
  - the Are.na token is stored in Windows Credential Manager and sent only to api.are.na;
  - saved images and the catalog stay local; the dashboard binds to localhost only;
  - reports are sent only when the user submits them to public GitHub, and the user sees them first;
  - a link to each source's own privacy policy.
- **"Report a problem" best practice** (inferred from the URL-prefill mechanics and token lifetime above):
  - (a) Prefill only app version, OS build, error code and the source/topic *type*. Never paths, the library location, channel slugs, tokens or full logs.
  - (b) Before showing "Copy details" or building the URL, run a redactor over the text: `C:\Users\<name>` → `%USERPROFILE%`, bearer tokens, anything after `Authorization:`, email addresses.
  - (c) Show the exact text before opening the browser, plus a warning that "This will be public".
  - (d) Use a GitHub issue form (`.github/ISSUE_TEMPLATE/*.yml`) with a required "I removed personal info" checkbox.
  - (e) Keep the prefilled body short to avoid 414 errors. Put long diagnostics in the clipboard instead.
  - (f) Send security reports to GitHub private vulnerability reporting (SECURITY.md), not public issues.
- If telemetry or crash upload is ever added, the developer becomes a controller under GDPR and UK GDPR. That would need a lawful basis, opt-in consent, a retention policy and SignPath's install-time disclosure.

### Gaps
- I didn't retrieve the GDPR Art. 2(2)(c) household-exemption text or Recital 18 (which says the regulation still applies to controllers or processors who *provide the means* for household processing). Verify on EUR-Lex. It matters if any server-side component is added.
- I didn't fetch the ICO's own full app-developer guidance, only secondary summaries.
- I found no published standard for redacting crash reports. VS Code's and Firefox's issue reporters could serve as models, but I didn't research them.

## 4. Trademark and naming (third-party names, "LeMuse" conflicts, logo originality)

### Takeaway
Calling sources by name ("images from the Cleveland Museum of Art", "works with Are.na") is classic nominative use. It's generally allowed when the name is needed, used no more than necessary, and doesn't suggest endorsement. So use plain-text names, no third-party logos, and an "unaffiliated" disclaimer. "LeMuse" needs a trademark search in software classes before 1.0.

### Cited Findings
- *New Kids on the Block v. News America Publishing*, 971 F.2d 302 (9th Cir. 1992), set the three-part nominative fair use test: (1) the product isn't readily identifiable without the mark; (2) only as much of the mark as is reasonably necessary is used; (3) nothing suggests sponsorship or endorsement. Other circuits apply it differently (the 5th and 2nd have their own approaches). — [Playboy v. Welles, 279 F.3d 796 (9th Cir. 2002)](https://law.justia.com/cases/federal/appellate-courts/F3/279/796/506072) **[older: 2002]**; [New Kids case brief](https://www.lexplug.com/casebrief/new_kids_on_the_block_v_news_america_publishing_inc__661d4515b1d161e609b56601); [Arnold & Porter on circuit split, 2016](https://www.arnoldporter.com/en/perspectives/publications/2016/11/2016_11_16_second_circuit_expands_split__13324) **[older: 2016]**
- Are.na's Terms have no dedicated trademark or branding clause. They do bar removing or obscuring proprietary notices. — [Are.na Terms (effective 2023-11-08)](https://are.na/terms) **[older: 2023]**
- Are.na's developer docs don't cover branding or attribution rules. — [Are.na developer docs](https://www.are.na/developers/all.md)

### Inferences
- In the README and About page, write "LeMuse is not affiliated with or endorsed by Are.na or the Cleveland Museum of Art." Use text names only, never their logos. Don't put "Are.na" in the product name, icon or store listing title.
- Name check: search USPTO, EUIPO/TMview and UKIPO for "LeMuse", "Le Muse" and "Muse" in Nice classes 9 (software) and 42 (SaaS). Also check winget-pkgs, the Microsoft Store, GitHub and app-name collisions. "Muse" is a crowded mark in software and devices, so expect hits. The question is likelihood of confusion within art and reference software.
- The logo and icon should be the project's own work, or come from a source whose licence permits it (e.g. CC0), with the source recorded in NOTICE. Never derive them from a museum artwork unless it's CC0 and noted.

### Gaps
- I didn't run any live trademark database search for "LeMuse", so conflicts are unknown. This needs a manual check by the owner, since it's the owner's call.
- I found no EU or UK case law source for nominative use; the EU equivalent is in Art. 14 EUTMR, which I didn't verify.

## 5. Copyright of displayed images (CC0 vs Are.na uploads, DMCA, saving copies, attribution, AI concerns)

### Takeaway
Cleveland's CC0 images are free to use. **But the Cleveland API also returns non-CC0 records whose images aren't open access**, so LeMuse should request and display only `cc0` records. Are.na uploads belong to whoever uploaded them, and their rights are unknown. LeMuse only hotlinks those from Are.na's CDN, which in the US Ninth Circuit generally isn't direct infringement (the "server test"). The EU's BestWater ruling says framing freely accessible works isn't by itself a new communication to the public. The Save feature makes a local copy of possibly copyrighted work, which is the riskier part. Treat it as personal reference use, attribute the creator, and route takedown requests to the source.

### Cited Findings
- **Cleveland Museum of Art open access:**
  - image downloads are available only for CC0 artworks; metadata is open for the whole collection;
  - CC0 works don't require attribution, though the museum asks for it ("supports efforts to release other datasets");
  - no API key is needed;
  - data is "as is", updated every January;
  - you may not sell content not identified as CC0 open access; other non-CC0 use needs written permission.
  — [CMA Open Access](https://clevelandart.org/open-access); [CMA Open Access API docs](https://openaccess-api.clevelandart.org); [CMA Terms and Conditions](https://clevelandart.org/terms-and-conditions); [CMA openaccess GitHub](https://github.com/ClevelandMuseumArt/openaccess)
- **Are.na Terms:**
  - users keep ownership of their submissions and grant Are.na a non-exclusive licence to run the service;
  - without written permission, users can't copy, modify or redistribute Application Content, and may view it only for personal, non-commercial use;
  - copyright complaints go to Are.na's designated DMCA agent (When It Changed Inc., registration DMCA-1029842).
  — [Are.na Terms](https://are.na/terms) **[older: effective 2023-11-08]**
- **US server test:** *Perfect 10 v. Amazon* (9th Cir. 2007) holds that displaying an image is direct infringement only if the defendant stores and serves the image from its own servers, so inline linking to full-size images isn't. The test is controlling in the 9th Circuit. Since *Goldman*, the Southern District of New York has been moving away from it. — [Perfect 10 v. Amazon brief](https://www.casebriefs.com/blog/law/intellectual-property-law/intellectual-property-keyed-to-merges/copyright-law/perfect-10-inc-v-amazon-com-inc/) **[older: 2007]**; [Studicata: inline linking & server test](https://www.studicata.com/categories/intellectual-property-media-and-technology/inline-linking-and-the-server-test); [vLex law-journal piece on server test vs detractors](https://law-journals-books.vlex.com/vid/the-nascent-showdown-between-935398047)
- **EU:** in *BestWater* (C-348/13, 2014), the CJEU held that framing a work freely accessible on another site isn't by itself a communication to the public. — [Wikipedia: copyright aspects of hyperlinking and framing](https://en.wikipedia.org/wiki/Copyright_aspects_of_hyperlinking_and_framing) **[older: 2014; secondary]**
- Are.na's terms let it restrict "automated data scraping or crawling" and "unauthorized, excessive, or abusive" API use. — [Are.na Terms](https://are.na/terms)

### Inferences
- **Proportionate controls:**
  - (a) Cleveland connector: filter to `cc0` and show "CC0 – Cleveland Museum of Art" plus a link.
  - (b) Are.na: always show the creator/uploader and the block link (already ADR policy), and label the image "rights belong to the creator; for personal reference".
  - (c) Save writes to a local folder alongside a sidecar holding the source URL, creator and licence, so provenance stays with the file.
  - (d) Put a "Takedown / rights" section in the README. LeMuse hosts nothing, so rights holders should contact the source (Are.na's DMCA agent, or the museum). The maintainer will add any reported URL or channel to a blocklist on request.
  - (e) No bulk "save all" and no export of images, which keeps the app aligned with Are.na's anti-scraping clause and with personal-use framing.
- **AI-training concerns:** artists worry that tools harvest images for models. LeMuse can state plainly that it doesn't train, upload or send images or metadata anywhere, and that saved files are for personal reference. Consider a README line asking users not to feed saved Are.na images into training datasets.
- Whether saving a copy for personal study is lawful depends on jurisdiction: US fair use, UK s.29 research and private study, EU national exceptions. That's the user's responsibility. The app should frame Save as personal reference and must not suggest the images are free to reuse, except CC0.

### Gaps
- I didn't retrieve primary texts for *Svensson* (C-466/12), *GS Media* (C-160/15, knowledge of infringement) or *Goldman v. Breitbart* (S.D.N.Y. 2018).
- I didn't verify the DMCA §512 safe harbours for a desktop app that hosts nothing. They mainly protect service providers who host or link, and a non-hosting app may not need them.
- I didn't verify the UK CDPA s.29 and s.28A or the US §107 rules for saving reference images.
- I found no Are.na policy on third-party apps letting users download originals. Worth asking Are.na, which is a contact with a third party and so the owner's call.

## 6. Third-party API terms (Are.na, Cleveland), rate limits, branding

### Takeaway
Are.na publishes integration guidelines, not a separate API agreement. Its rules: paginate lazily, don't scrape or bulk-download, back off on 429, send a UA with contact details, and stay within the tier limits (Free: 120 reads/min). Cleveland's API is keyless CC0 data with no stated rate limit in what I retrieved. Neither publishes branding rules.

### Cited Findings
- **Are.na guidelines:**
  - load incrementally; don't loop all pages at startup;
  - fetch summaries first;
  - back off on `429`; space sequential requests about 200–500 ms apart;
  - User-Agent `AppName/version (+contact)`;
  - "not scraping, bulk downloading, or structured data harvesting" (contact Are.na for bulk access);
  - authenticated responses are `private, no-cache` and need ETag revalidation; 304s count against the limit;
  - search requires Premium.
  — [Are.na developer docs](https://www.are.na/developers/all.md)
- Are.na rate limits (global per account or IP): Guest 30 reads/min; Free 120 reads, 30 writes/min, 300 writes/hr; Premium 300 reads; Supporter 600 reads. — [Are.na developer docs](https://www.are.na/developers/all.md)
- Are.na tokens: OAuth2 (PKCE) or personal access tokens; `read` scope by default; tokens don't expire. — [Are.na developer docs](https://www.are.na/developers/all.md)
- Are.na can restrict or deny access to users or third parties at its sole discretion and can change the terms at any time. — [Are.na Terms](https://are.na/terms) **[older: 2023]**
- Cleveland: CC0 data, keyless API, a contact address on its GitHub page, data "as is". — [CMA openaccess GitHub](https://github.com/ClevelandMuseumArt/openaccess); [CMA Open Access API](https://openaccess-api.clevelandart.org)

### Inferences
- LeMuse's ADR-0004 policy (80% budget, ≥500 ms gap, `retry_after`, only user-listed channels, no crawling) is stricter than Are.na's guidelines, which is good. Request only `read` scope and tell users to create a read-only personal token.
- Because Are.na tokens never expire, the UI should link to where users revoke them and should clear the token from Credential Manager on "Sign out".
- If ETag revalidation isn't used yet, it's an easy courtesy win, though 304s still count against the limit.

### Gaps
- I couldn't find an Are.na branding or attribution guideline, or a written policy on commercial versus non-commercial third-party apps.
- I didn't find a stated rate limit for the Cleveland Open Access API.

## 7. Open-source governance (LICENSE, NOTICE, SECURITY.md, CoC, CONTRIBUTING, DCO/CLA, Scorecard, signed commits)

### Takeaway
OpenSSF Scorecard is a good checklist that big companies actually use. For a solo maintainer the key items are: SECURITY.md with private reporting, least-privilege workflow tokens, pinned actions, branch protection, Dependabot or Renovate, SAST (CodeQL), signed releases plus provenance, an SBOM, and a third-party licence notice generated with cargo-about and a JS equivalent.

### Cited Findings
- **Scorecard checks and risk levels:**
  - Critical: Dangerous-Workflow, Webhooks;
  - High: Binary-Artifacts, Branch-Protection, Code-Review, Dependency-Update-Tool, Maintained, Signed-Releases, Token-Permissions, Vulnerabilities;
  - Medium: Fuzzing, Packaging, Pinned-Dependencies, SAST, SBOM, Security-Policy;
  - Low: CI-Tests, CII-Best-Practices, Contributors, License.
  — [Scorecard checks.md](https://github.com/ossf/scorecard/blob/main/docs/checks.md)
- **Scorecard Security-Policy:** SECURITY.md with contact links (6/10), free text (3/10) and disclosure timelines (1/10). — [Scorecard checks.md](https://github.com/ossf/scorecard/blob/main/docs/checks.md)
- **Scorecard Branch-Protection tiers:** block force-push and deletion (3); at least 1 reviewer (6); status checks (8); 2 reviewers plus code owners (9); dismiss stale approvals and include admins (10). — [Scorecard checks.md](https://github.com/ossf/scorecard/blob/main/docs/checks.md)
- **Scorecard Code-Review:** looks at about the last 30 commits for an approval, or a merger different from the committer. "Bot or AI reviews do not count." — [Scorecard checks.md](https://github.com/ossf/scorecard/blob/main/docs/checks.md)
- **Scorecard Dangerous-Workflow and Token-Permissions:**
  - flags `pull_request_target`/`workflow_run` checkouts of untrusted code, and untrusted context (e.g. issue titles) in inline scripts;
  - best score for read-only top-level permissions, with write permissions only at job level.
  — [Scorecard checks.md](https://github.com/ossf/scorecard/blob/main/docs/checks.md)
- cargo-about generates a licence listing for all of a crate's dependencies (`cargo about init`, then `cargo about generate about.hbs > license.html`). — [cargo-about](https://github.com/EmbarkStudios/cargo-about)
- SignPath requires all components to be OSI-licensed and defined Author, Reviewer and Approver roles with MFA. — [signpath.org/terms](https://signpath.org/terms)

### Inferences
- **Proportionate solo set:**
  - LICENSE (MIT, already there);
  - THIRD-PARTY-NOTICES generated at release time (cargo-about for Rust; e.g. `license-checker` or `generate-license-file` for npm) and bundled into the installer and About page;
  - SECURITY.md pointing to GitHub private vulnerability reporting;
  - a short CONTRIBUTING with the Conventional Commits and review rules;
  - CODE_OF_CONDUCT (Contributor Covenant);
  - issue forms for bugs and takedown/rights requests;
  - DCO sign-off rather than a CLA. A CLA is overhead for an MIT solo project;
  - signed commits (SSH signing) on `main` via the ruleset;
  - Scorecard Action in CI.
- A solo maintainer can't score well on Code-Review, since self-merges count as unreviewed and AI reviews don't count. Accept that and document it rather than gaming it.
- Under the Dangerous-Workflow check, any workflow that reads issue titles or bodies (e.g. triage bots) must not interpolate them into shell. This matters because prefilled issues contain user text.

### Gaps
- I didn't fetch GitHub's own docs on community health files, private vulnerability reporting or the DCO app.
- I didn't verify current versions or maintenance status of the npm licence tools against the project's 14-day cooldown.

## 8. Accessibility obligations (EAA, EN 301 549, ADA)

### Takeaway
The European Accessibility Act (in force for new products and services since 28 June 2025) lists specific product types (hardware, OSes, terminals, e-readers) and consumer services (e-commerce, banking, e-books and dedicated software, communications, AV media access, transport). A free, non-commercial standalone image viewer fits none of those categories, and "making available on the market" means supply "in the course of a commercial activity". So the EAA very likely doesn't apply. Accessibility is still worth doing as good practice, using WCAG 2.x / EN 301 549 as the yardstick.

### Cited Findings
- **EAA Art. 2(1) products:**
  - "consumer general purpose computer hardware systems and operating systems for those hardware systems";
  - payment terminals and self-service terminals;
  - consumer terminal equipment for communications and AV media;
  - e-readers.
  — [Directive (EU) 2019/882, EUR-Lex](https://eur-lex.europa.eu/eli/dir/2019/882/oj/eng)
- **EAA Art. 2(2) services:** electronic communications, AV media access, consumer banking, "e-books and dedicated software", e-commerce, and certain transport services, provided to consumers after 28 June 2025. — [EUR-Lex 2019/882](https://eur-lex.europa.eu/eli/dir/2019/882/oj/eng)
- **EAA Art. 3(15):** making available on the market means supply "in the course of a commercial activity, whether in return for payment or free of charge". — [EUR-Lex 2019/882](https://eur-lex.europa.eu/eli/dir/2019/882/oj/eng)
- **EAA Art. 4(5):** microenterprises (<10 staff and ≤ €2M turnover or balance sheet) *providing services* are exempt. Product microenterprises get lighter duties, not an exemption. — [EUR-Lex 2019/882](https://eur-lex.europa.eu/eli/dir/2019/882/oj/eng); [Taylor Wessing](https://www.taylorwessing.com/en/interface/2025/accessibility/key-eu-accessibility-act-exemptions-and-the-challenges-they-pose)
- Secondary sources disagree on how far the exemption reaches and warn that complaints can come from any EU user. — [buildmvpfast](https://www.buildmvpfast.com/blog/european-accessibility-act-saas-decision-tree-2026); [sota.io](https://sota.io/blog/european-accessibility-act-eaa-2026-saas-developer-guide-wcag-en-301-549)
- Ireland's CCPC publishes EAA guidance for microenterprises. — [CCPC](https://www.ccpc.ie/business/enforcement/accessibility/european-accessibility-act-guidelines-for-microenterprises/)

### Inferences
- LeMuse as free, MIT, non-commercial software with no sales or accounts is very likely out of EAA scope. That would change with paid tiers, in-app purchases or an e-commerce flow.
- The ADA (Title III, public accommodations) and Section 508 (US federal procurement) target businesses and federal buyers, not free hobby software. This is an inference; I didn't source it.
- Big-company practice anyway:
  - keyboard operation for play/pause/next/save;
  - visible focus;
  - screen-reader names, with the artwork title and creator as alt text, which the metadata already has;
  - honour `prefers-reduced-motion`, which matters for auto-advancing slideshows. WCAG 2.2.2 "Pause, Stop, Hide" covers auto-moving content;
  - contrast;
  - optionally an ACCESSIBILITY.md stating known gaps.

### Gaps
- I didn't read the rest of the directive (the later half of the EUR-Lex page went unread), so I haven't checked recitals on free or open-source software.
- I didn't fetch primary sources for the ADA, Section 508 or EN 301 549 clauses. The WCAG 2.2.2 citation comes from background knowledge and needs verifying.

## 9. Opening the app's own GitHub from inside the app (link hijack, prefilled issue data, opener scope)

### Takeaway
GitHub redirects renamed repos, but **the redirect breaks if anyone creates a new repo under the old name**. So shipped binaries with hard-coded links can be hijacked after a rename or deletion. Keep the owner and repo name stable, or route links through a domain the project controls. Scope Tauri's opener to the exact URLs, and never put personal data in prefilled issue URLs.

### Cited Findings
- **Renaming a GitHub repo:**
  - issues, stars and web traffic redirect, and git operations keep working;
  - "If you create a new repository with the old name, redirects… stop working";
  - GitHub warns "do not reuse the original name";
  - redirects don't apply to Actions in renamed repos;
  - Pages URLs aren't preserved, so use a custom domain for stability.
  — [GitHub Docs: renaming a repository](https://docs.github.com/en/repositories/creating-and-managing-repositories/renaming-a-repository)
- **Tauri opener:**
  - deny by default;
  - `opener:allow-open-url` takes an `allow` list of `url` glob patterns;
  - the *default* permission set includes `allow-open-url`, `allow-reveal-item-in-dir` and `allow-default-urls` (mailto:, tel:, http:, https:), which is broader than needed.
  — [Tauri v2 opener plugin](https://v2.tauri.app/plugin/opener/)
- GitHub issue URLs accept prefilled `title`, `body`, `labels` and `template` (and issue-form fields). An invalid or unpermitted parameter returns 404, and long URLs return 414. — [GitHub Docs: creating an issue from a URL query](https://docs.github.com/en/issues/tracking-your-work-with-issues/using-issues/creating-an-issue#creating-an-issue-from-a-url-query)

### Inferences
- **Hijack risk.** Old installed versions keep their hard-coded `github.com/<owner>/LeMuse` links forever. After a rename, someone who registers the old owner or repo name could serve a fake "download" page to "Report a problem" users. Mitigations:
  - never rename or delete the owner account or repo without leaving a placeholder repo at the old name;
  - or point in-app links at a project-controlled redirect (e.g. a GitHub Pages custom domain);
  - and make the updater endpoint a signed-JSON URL, since the Tauri signature protects against a hijacked host serving binaries.
- **Opener scope.** Replace `opener:default` with `opener:allow-open-url` scoped to these patterns:
  - `https://github.com/OopsieLazy/LeMuse*` and `https://github.com/OopsieLazy/LeMuse/issues/new*`;
  - `https://www.are.na/*` for attribution links;
  - `https://www.clevelandart.org/*`.

  Also drop `reveal-item-in-dir` unless "Show saved file" needs it, and if it does, scope it to the library path. Validate remote-supplied URLs (e.g. block source URLs from Are.na) with `https:` only before opening them, because Are.na content is untrusted.
- **Prefill.** Build the URL with `URLSearchParams`, never string splicing (consistent with ADR-0014). Use `template=bug_report.yml` and prefill only redacted version and error-code fields. Tell users the issue is public.
- **Localhost dashboard.** Bind to 127.0.0.1, not 0.0.0.0. Validate the Host header against DNS rebinding, keep it read-only with no CORS `*`, and never serve the token. This is standard enterprise practice, not sourced here.

### Gaps
- I didn't fetch GitHub's docs on what happens to links after a repository *transfer* (as opposed to a rename), or after an account rename (usernames can be re-registered).
- I didn't verify whether `opener:allow-open-url` without a scope permits any URL; the Tauri page is ambiguous.
- I didn't research DNS-rebinding guidance for localhost servers (e.g. OWASP).
