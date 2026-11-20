<!-- Title = Conventional Commit: type(scope): summary. Keep each section short. -->

## What

<!-- What changes for the user or the codebase, in 1–3 bullets. -->

-

## Why

<!-- The problem or request behind it. Link the ADR / owner decision. -->

-

## How

<!-- The approach and anything a reviewer could trip over. -->

-

## Where to look

<!-- For the owner, so a review takes minutes, not hours (ADR-0030). The riskiest changes first; each with
     what breaks if it's wrong and the test or check that would catch it. -->

| Risk | Change (file:line) | If it's wrong | Caught by |
|---|---|---|---|
| | | | |

- Guardrail files touched (`node scripts/guardrail-check.mjs`): <!-- none, or the list; the owner reads them and
  adds the `guardrails-reviewed` label -->
- Acceptance examples this PR meets (agreed before building): <!-- link or list -->

## Checklist

**Security (first, always: ADR-0011)**

- [ ] `node scripts/scan-secrets.mjs --range main...HEAD`: clean (no secrets, keys or personal data)
- [ ] No new Tauri permissions, plugins or CSP hosts, or each one is justified in the ADR/review
- [ ] Network access only through `HttpClient`; only channels the user listed; no bot-protection workarounds
- [ ] Tokens only in Windows Credential Manager; nothing sensitive in logs

**Quality**

- [ ] `cargo fmt --all -- --check` · `cargo clippy --all-targets -- -D warnings` · `cargo test`: <!-- N passed -->
- [ ] UI touched: `cd app && npm run typecheck` and `npm run validate:w3c` (0 errors)
- [ ] Review loop done: admin pass (A-n) and developer pass (D-n) in `docs/reviews/NNNN-<slug>.md`; each finding
      fixed or deferred to PLAN

**See it (UI changes, ADR-0009)**

- [ ] Design artifact updated (same URL): <!-- link -->
- [ ] Test build: CI artifact `lemuse-test-build-<PR>`, or a local installer path

**Owner gate**

- [ ] Risk and rollback stated below · data/schema impact stated
- [ ] `docs/PROGRESS.md` entry · `CHANGELOG.md` `Unreleased`
- [ ] Owner questions listed (or "none")

## Risk and rollback

- Risk: <!-- low/med/high and why -->
- Rollback: revert the squash commit <!-- + any manual steps -->
