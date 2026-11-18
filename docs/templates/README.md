# Templates

Copy a template, then fill it in. Each one maps to a stage of the loop in [CLAUDE.md](../../CLAUDE.md).

| When | Template | Save filled copy to |
|---|---|---|
| Starting a feature or milestone | [feature-spec.md](feature-spec.md) | `docs/specs/NNNN-<slug>.md` |
| Making an architectural decision | [../adr/0000-template.md](../adr/0000-template.md) | `docs/adr/NNNN-<slug>.md` |
| Before any PR reaches the owner | [review-loop.md](review-loop.md) | `docs/reviews/NNNN-<slug>.md` |
| Opening a PR | [../../.github/pull_request_template.md](../../.github/pull_request_template.md) | PR body (+ `docs/pr/NNNN-<slug>.md` while there's no remote) |
| Ending every conversation | [session-handoff.md](session-handoff.md) | Append to `docs/PROGRESS.md` and paste the commands to the owner |

The loop, in one line: **Spec → ADR (if architectural) → build → review-loop (admin → developer) → PR → owner gate
→ merge → handoff.** If the owner sends work back, add a new round to the same review file. Don't start a new
file; the history of rounds is the point.

`NNNN` matches the PR or work-item number. Branches use the same number: `feat/0002-arena-http-client`.
