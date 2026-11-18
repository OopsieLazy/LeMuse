# Contributing

This project runs a staged review loop. Agent and human contributors follow the same rules. The full version
is in [CLAUDE.md](CLAUDE.md) and [ADR-0006](docs/adr/0006-engineering-process.md).

1. **Branch** from `main`: `type/NNNN-short-slug` (`feat/`, `fix/`, `docs/`, `chore/`, `refactor/`, `test/`, `ci/`).
2. **Spec and decide:** copy [docs/templates/feature-spec.md](docs/templates/feature-spec.md). Write an ADR for
   anything architectural.
3. **Commit** with [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/), e.g.
   `feat(arena): stream downloads to temp files`.
4. **Review loop:** fill [docs/templates/review-loop.md](docs/templates/review-loop.md) (admin pass, then
   developer pass), then fix or defer every finding.
5. **PR:** fill the template. CI must be green (fmt, clippy, tests, typecheck). PR title = Conventional Commit.
6. **Owner gate:** the owner approves and squash-merges. Then delete the branch (`git branch -D`, after a squash).
7. **Log:** append to [docs/PROGRESS.md](docs/PROGRESS.md) and update `CHANGELOG.md` under `Unreleased`.

Never commit tokens, `.env` files, or a real library (`library/`, `*.db` are gitignored).
