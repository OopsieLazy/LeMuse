## Summary

<!-- What does this PR do and why? 2–5 bullets. Title must be a Conventional Commit: type(scope): summary -->

-

Closes #

## Type of change

- [ ] feat: new capability
- [ ] fix: bug fix
- [ ] refactor / perf: no behaviour change
- [ ] docs / chore / ci / test
- [ ] ⚠️ Breaking change (`!` in title + `BREAKING CHANGE:` footer)

## Decisions and review loop

- ADRs: <!-- ADR-NNNN (new/updated) or "none" -->
- Review log: `docs/reviews/NNNN-<slug>.md`
- [ ] Admin / architect pass complete (findings fixed or deferred to PLAN)
- [ ] Developer pass complete (findings fixed or deferred to PLAN)

## Testing

- [ ] `cargo fmt --all -- --check`
- [ ] `cargo clippy --all-targets -- -D warnings`
- [ ] `cargo test`: <!-- N passed -->
- [ ] `cd app && npm run typecheck` (if UI touched)
- [ ] Manual check: <!-- what you ran and saw -->

## Risk and rollback

- Risk: <!-- low/med/high and why -->
- Data or schema impact: <!-- new migration? -->
- Rollback: revert the squash commit <!-- + any manual steps -->

## Compliance (ADR-0004)

- [ ] No new crawling or bulk download behaviour; gather-list only
- [ ] Attribution and licence stored for any new source
- [ ] No secrets in code, config or logs

## Owner gate

- [ ] Owner questions listed (or "none")
- [ ] `docs/PROGRESS.md` entry added
- [ ] `CHANGELOG.md` `Unreleased` updated
