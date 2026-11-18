# Enterprise-Grade Software Engineering Process Standards for a Small Project with an AI Coding Agent (Claude Code) and Staged Human-in-the-Loop Review

Scope note: research done 2026-11-16. Sources fetched this session are primary docs (conventionalcommits.org, keepachangelog.com, adr.github.io/madr, Nygard's original ADR post, nvie.com, trunkbaseddevelopment.com, GitHub Docs, Google eng-practices, release-please README, code.claude.com docs, agents.md). Some widely-known conventions (SemVer details, commitlint/lefthook config, Contributor Covenant, choosealicense, .editorconfig, GitHub Actions Windows runner specifics, `git fetch --prune`) were NOT fetched this session because of the tool-call budget. Where they appear, they are in **Inferences** labeled "(unverified this session)" or listed under **Gaps**. Templates in Inferences are my synthesis of the cited standards, meant to be copied.

---

## 1. Branching model (GitHub Flow vs trunk-based vs Git Flow) and branch naming

### Takeaway
For a solo-plus-AI desktop app, use GitHub Flow, which is in practice "scaled trunk-based development": a protected `main`, short-lived topic branches, PRs, squash-merge, and tags for releases. Git Flow's own author now says it fits only when you must support several released versions at once. A desktop app that ships one current version doesn't need `develop`/`release/*` branches. Add a short-lived `release/x.y` or `hotfix/` branch only if you ever have to patch an older shipped version.

### Cited Findings
- GitHub Flow has six steps: create branch, make changes, open PR, address review comments, merge, delete branch. "By creating a branch, you create a space to work without affecting the default branch." — [GitHub Docs: GitHub flow](https://docs.github.com/en/get-started/using-github/github-flow)
- GitHub Flow says to keep each commit to one complete change so it's easy to revert, to push often, to use draft PRs for early feedback, and to "Make a separate branch for each set of unrelated changes." Its branch-name examples are short and descriptive: `increase-test-timeout`, `add-code-of-conduct`. After merging, deleting the branch "marks the work as finished and prevents accidental reuse", and deleted branches can be restored. — [GitHub Docs: GitHub flow](https://docs.github.com/en/get-started/using-github/github-flow)
- Trunk-based development (TBD) means developers "collaborate on code in a single branch called 'trunk'" and avoid other long-lived development branches. Since 2020 the Git community has called trunk `main`. — [trunkbaseddevelopment.com](https://trunkbaseddevelopment.com/)
- In scaled TBD, short-lived feature branches are used for code review and build checks but not for creating or publishing artifacts. Each branch should be short-lived and come from a single developer workstation (solo, pair, or mob). The site gives no exact lifetime, but the "core requirement of Continuous Integration" is that "all team members commit to trunk at least once every 24 hours." — [trunkbaseddevelopment.com](https://trunkbaseddevelopment.com/)
- TBD release branches are optional. They are cut from trunk just in time, hardened, and deleted after release. The alternative is to release from trunk and "fix forward". The site also recommends feature flags and branch by abstraction for larger changes. — [trunkbaseddevelopment.com](https://trunkbaseddevelopment.com/)
- Git Flow has these branches: `master` (each commit is a production release), `develop` (holds the next release), feature branches (merged into develop), release branches (merged into master and develop), and hotfix branches (cut from master, merged into master and develop). — [nvie.com: A successful Git branching model](https://nvie.com/posts/a-successful-git-branching-model/)
- The author's March 2020 "Note of reflection" says: "If your team is doing continuous delivery of software, I would suggest to adopt a much simpler workflow … instead of trying to shoehorn git-flow into your team." And: "If, however, you are building software that is explicitly versioned, or if you need to support multiple versions of your software in the wild, then git-flow may still be as good of a fit." — [nvie.com](https://nvie.com/posts/a-successful-git-branching-model/)
- Opinions differ. The Git Flow author argues it still suits "explicitly versioned" software, and a desktop app is explicitly versioned. TBD advocates call Gitflow "very different" and prefer one trunk. — [nvie.com](https://nvie.com/posts/a-successful-git-branching-model/); [trunkbaseddevelopment.com](https://trunkbaseddevelopment.com/)

### Inferences
- Recommendation: GitHub Flow (TBD with short-lived PR branches) plus SemVer tags on `main`. Create `release/1.4.x` only when you must patch an older shipped version while `main` moves on. That keeps the Git Flow benefit the nvie note describes ("multiple versions in the wild") without carrying `develop` all the time.
- Branch naming. This convention is common in industry. I found no single authoritative spec for it; it mirrors the Conventional Commits types:
  ```
  <type>/<ticket-id>-<short-kebab-description>
  feat/ARN-42-reference-gatherer-cache
  fix/ARN-57-crlf-in-export
  chore/bump-electron-33
  docs/adr-0003-storage-engine
  refactor/ARN-61-split-scraper-module
  ci/add-windows-matrix
  release/1.4.x        # only when maintaining an old line
  hotfix/1.4.3-crash-on-start
  ```
  Rules: lowercase kebab-case, one branch per unrelated change (GitHub Flow), aim to merge within 1–2 days (TBD spirit), delete after merge.
- For the AI agent: Claude Code should never commit to `main`. It works on a branch it creates, named by the rule above, ideally in a git worktree per task. Enforce this in branch protection (section 3), not only in CLAUDE.md (see section 5).

### Gaps
- trunkbaseddevelopment.com gives no numeric maximum branch lifetime. "1–2 days" is common folklore, not a quote.
- I fetched no source that standardizes `feat/`-style branch prefixes. The Conventional Branch proposal (conventional-branch.github.io) exists, but I did not verify it this session.

---

## 2. Conventional Commits 1.0, commit tooling, SemVer and release automation

### Takeaway
Adopt Conventional Commits 1.0.0 (`type(scope)!: description` plus body and git-trailer-style footers). Lint it with commitlint, enforced through a git hook and CI. Let release-please turn `feat`/`fix`/`!` into SemVer bumps, `CHANGELOG.md` entries, tags and GitHub Releases through a release PR the human owner merges. That release PR fits a human-approval gate well.

### Cited Findings
- Structure — [Conventional Commits 1.0.0](https://www.conventionalcommits.org/en/v1.0.0/):
  ```
  <type>[optional scope]: <description>

  [optional body]

  [optional footer(s)]
  ```
- "Commits MUST be prefixed with a type, which consists of a noun, `feat`, `fix`, etc." The type is followed by an optional scope, an optional `!`, and a required colon and space. "The type `feat` MUST be used when a commit adds a new feature … The type `fix` MUST be used when a commit represents a bug fix." "A scope MUST consist of a noun describing a section of the codebase surrounded by parenthesis." — [conventionalcommits.org](https://www.conventionalcommits.org/en/v1.0.0/)
- The body starts one blank line after the description. Footers come one blank line after the body. Each footer is a token, then `: ` or ` #`, then a value, "similar to git trailer format". Tokens use `-` instead of spaces (e.g. `Acked-by`). `BREAKING-CHANGE` means the same as `BREAKING CHANGE`. — [conventionalcommits.org](https://www.conventionalcommits.org/en/v1.0.0/)
- Breaking changes: "MUST be indicated in the type/scope prefix of a commit, or as an entry in the footer." The footer form is uppercase `BREAKING CHANGE: <description>`. The prefix form is `!` immediately before the `:`. "A BREAKING CHANGE can be part of commits of any type." Only `BREAKING CHANGE` is case-sensitive. — [conventionalcommits.org](https://www.conventionalcommits.org/en/v1.0.0/)
- Other types: the spec cites `@commitlint/config-conventional` (Angular convention), which recommends `build`, `chore`, `ci`, `docs`, `style`, `refactor`, `perf`, `test`. The FAQ recommends `revert` with a footer that references the reverted SHAs. Types other than feat/fix have no SemVer effect unless they're breaking. — [conventionalcommits.org](https://www.conventionalcommits.org/en/v1.0.0/)
- SemVer mapping: `fix` → PATCH, `feat` → MINOR, any `BREAKING CHANGE` → MAJOR. — [conventionalcommits.org](https://www.conventionalcommits.org/en/v1.0.0/)
- Co-author trailer format: `Co-authored-by: name <name@example.com>`, one line per co-author, after a blank line following the message. For the commit to count as a contribution, the email must be tied to the co-author's GitHub account, or their GitHub `no-reply` address if they keep their email private. — [GitHub Docs: Creating a commit with multiple authors](https://docs.github.com/en/pull-requests/committing-changes-to-your-project/creating-and-editing-commits/creating-a-commit-with-multiple-authors)
- release-please "automates CHANGELOG generation, the creation of GitHub releases, and version bumps". It doesn't publish to package registries. It keeps a release PR up to date as work merges, and you release by merging that PR. On merge it updates CHANGELOG.md and the manifests, tags, and creates a GitHub Release. Labels: `autorelease: pending` / `autorelease: tagged`. — [googleapis/release-please](https://github.com/googleapis/release-please)
- release-please releasable units are commits prefixed `feat`, `fix`, or `deps`. `chore`/`build` don't trigger a release. `Release-As: x.y.z` in a commit body forces a version, e.g. `git commit --allow-empty -m "chore: release 2.0.0" -m "Release-As: 2.0.0"`. Release types include `node` (package.json), `python`, `rust`, `simple` (version.txt), and more. It runs as the `googleapis/release-please-action` GitHub Action. — [googleapis/release-please](https://github.com/googleapis/release-please)
- release-please: "We **highly** recommend that you use squash-merges when merging pull requests." `BEGIN_COMMIT_OVERRIDE` "will not work with plain merges." — [googleapis/release-please](https://github.com/googleapis/release-please)
- Comparison, from secondary and aggregator sources, so directional only: semantic-release releases automatically on merge, with no human gate by default. release-please and Changesets both open a bot release PR that a human reviews. Changesets has contributors write release intent in markdown files and is aimed mainly at JS monorepos. — [Tenki blog](https://www.tenki.cloud/blog/release-automation-github-actions); [pkgpulse guide 2026](https://www.pkgpulse.com/guides/changesets-vs-semantic-release-vs-release-it-guide-for-npm-publishing-2026); [toolradar](https://toolradar.com/compare/changesets-vs-semantic-release)
- Claude Code's own best-practices page uses a Changesets release skill as its example (`pnpm changeset version` and commit), with `disable-model-invocation: true` so only the human can start a release. — [Claude Code best practices](https://code.claude.com/docs/en/best-practices)

### Inferences
- Recommended stack for a solo-plus-AI desktop app: **Conventional Commits + commitlint (`@commitlint/config-conventional`) + lefthook or husky `commit-msg` hook + a commitlint CI job on the PR title + release-please**. release-please's release PR becomes the final human gate, because the owner merges it to ship. Pick semantic-release only if you want no human gate, which conflicts with the stated approval loop. Pick Changesets for a JS monorepo with many packages.
- Squash-merge makes the **PR title** the commit that lands on `main`. So lint the PR title (e.g. the `amannn/action-semantic-pull-request` action, unverified this session) as well as, or instead of, individual commits.
- Hook tooling (unverified this session): husky is Node-only and the most common in JS repos. lefthook is a single Go binary that works for any language and is fast on Windows. pre-commit (Python) is the polyglot option. Commitizen (`cz`) gives an interactive prompt, which matters less when an AI writes the commits.
- Commit template for the agent:
  ```
  feat(gatherer): add on-disk cache for reference fetches

  Cache responses keyed by URL+etag under %APPDATA%/arena/cache to avoid
  re-fetching during a session. Eviction is LRU at 500 MB.

  Refs: ARN-42
  Reviewed-by: architect-role
  Co-Authored-By: Claude <noreply@anthropic.com>
  ```
  Breaking: `feat(api)!: rename Source.url to Source.href` plus the footer `BREAKING CHANGE: Source.url removed; use Source.href.`
- AI attribution: the `Co-Authored-By:` trailer is a git trailer and also a valid Conventional Commits footer, since its token uses `-` and its separator is `: `. Claude Code's harness can be configured to add it, as this environment's own instructions do. Note that `Reviewed-by:` with a non-email value is my convention and not a git standard.
- SemVer for a desktop app (semver.org, unverified this session): use `0.y.z` until the first stable public release, then `1.0.0`. MAJOR covers breaking changes to the user's data format, settings and file compatibility, not only API changes.

### Gaps
- I didn't fetch semver.org, commitlint, husky, lefthook or commitizen docs. Config snippets for them are not verified here.
- I did not verify the current major version of `googleapis/release-please-action` (v4 was current in my training data).
- A search result headline mentioned a "changesets v3 release" (InfoQ, 2026-09). I didn't verify it.

---

## 3. Pull request standards, merge strategy, branch protection/rulesets, CODEOWNERS, post-merge cleanup

### Takeaway
Use a `.github/pull_request_template.md` with a summary, linked issue, type-of-change checkboxes, a testing checklist, screenshots, and a risk/rollback section. Keep PRs to about 100 changed lines where you can. Squash-merge only, with the PR title as a Conventional Commit. Protect `main` with a ruleset: require a PR, required status checks, linear history, no force pushes, no deletions. A solo owner has a problem here. GitHub's approval rules assume a reviewer who didn't write the change, so the AI should push from a separate identity (a bot account or GitHub App) so that the human can be the required approver.

### Cited Findings
- PR template locations: `pull_request_template.md` in the repo root, `docs/pull_request_template.md`, or `.github/pull_request_template.md`. For several templates, use a `PULL_REQUEST_TEMPLATE/` subdirectory and pick one with the `?template=` URL query parameter. — [GitHub Docs: Creating a PR template](https://docs.github.com/en/communities/using-templates-to-encourage-useful-issues-and-pull-requests/creating-a-pull-request-template-for-your-repository)
- PR size: "the right size for a CL is one self-contained change"; "100 lines is usually a reasonable size for a CL, and 1000 lines is usually too large"; "A 200-line change in one file might be okay, but spread across 50 files it would usually be too large"; "When in doubt, write CLs that are smaller than you think you need to write." — [Google eng-practices: Small CLs](https://google.github.io/eng-practices/review/developer/small-cls.html)
- "It's usually best to do refactorings in a separate CL from feature changes or bug fixes." "A CL that adds or changes logic should be accompanied by new or updated tests for the new behavior." — [Google eng-practices: Small CLs](https://google.github.io/eng-practices/review/developer/small-cls.html)
- Merge methods. A merge commit (the default, `--no-ff`) brings all branch commits in. Squash makes one commit, which is cleaner, but "You lose information about when specific changes were originally made and who authored the squashed commits". Rebase adds each commit with new SHAs, and "GitHub doesn't have access to the committer's private signing keys, so it can't sign the commit." Squash and rebase both give linear history. Enabling only one method enforces it. — [GitHub Docs: About merge methods](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/configuring-pull-request-merges/about-merge-methods-on-github)
- Ruleset rules: restrict deletions (on by default), require linear history, require a PR before merging, required approving reviews, dismiss stale approvals on new pushes, require code-owner review, "require an approval from someone other than the last person to push", require conversation resolution, required status checks (strict or loose), block force pushes (on by default), require signed commits, allowed merge methods, required reviewers by team for file patterns, and (public preview) "Additional approval for unattributed Copilot PRs". Bypass can be granted to roles, teams, or GitHub Apps. — [GitHub Docs: Available rules for rulesets](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/available-rules-for-rulesets)
- CODEOWNERS goes in `.github/`, the root, or `docs/`, and the first one found wins. "the last matching pattern takes the most precedence." Owners must have write permission. With "Require review from Code Owners" on, "an approval from *any* of the owners is sufficient." Example: `* @global-owner1`, `*.js @js-owner`, `/docs/ @doctocat`. — [GitHub Docs: About code owners](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-code-owners)
- GitHub Flow step 6 is to delete the branch after merge. Deleted branches can be restored. — [GitHub Docs: GitHub flow](https://docs.github.com/en/get-started/using-github/github-flow)

### Inferences
- **Copyable `.github/pull_request_template.md`** (synthesized from the sources above plus the staged review loop):
  ```markdown
  ## Summary
  <!-- What and why, 1–3 sentences. PR title must be a Conventional Commit: type(scope): description -->

  Closes #<issue>  <!-- or Refs: ARN-123 -->
  Decision record: docs/adr/NNNN-...md (if architectural)

  ## Type of change
  - [ ] feat – new feature (minor)
  - [ ] fix – bug fix (patch)
  - [ ] BREAKING CHANGE (major) – describe migration below
  - [ ] refactor / perf / test / docs / build / ci / chore

  ## How was this tested?
  - [ ] Unit tests added/updated
  - [ ] `npm run lint && npm test && npm run build` pass locally
  - [ ] Manually verified on Windows 10/11 (steps: …)
  - [ ] Screenshots / recording for UI changes (below)

  ## Risk & rollback
  - Risk level: low / medium / high — why:
  - Rollback: revert this squash commit (`git revert <sha>`); data migration? Y/N
  - Feature flag: name / none

  ## Review gates
  - [ ] Stage 1 – Architect review (design, ADR consistency, boundaries)
  - [ ] Stage 2 – Developer review (correctness, tests, readability)
  - [ ] Stage 3 – Owner approval
  - [ ] CHANGELOG/Unreleased handled (or release-please will generate)

  ## Screenshots
  ```
- **Merge policy:** allow squash-merge only, and set the default squash message to the PR title plus description. Reasons: release-please strongly recommends squash, and linear history becomes possible. The trade-off GitHub documents is losing per-commit authorship and timing. Losing individual Co-authored-by lines is my concern from experience (unverified): GitHub generally keeps co-author trailers in the squash body when the default message includes commit details, so check the squash message before merging.
- **Ruleset for `main` (solo plus AI):** require a PR, required status checks (`lint`, `test`, `build (windows-latest)`, `commitlint`) in strict mode, require linear history, block force pushes, restrict deletions, require conversation resolution, squash as the only allowed method. Approvals: if the agent pushes as the owner's own account, set required approvals to 0, because GitHub won't let a PR author approve their own PR (well-known, but not re-verified this session). The owner's "approval" then means the act of merging. Better: have the agent push through a separate bot account or GitHub App. Then set required approvals to 1, "require approval of most recent push" on, and the owner in CODEOWNERS (`* @owner`), so approval is a real, enforced gate.
- **Post-merge cleanup** (standard git; command semantics are well known but no source was fetched this session):
  ```bash
  git switch main
  git pull --ff-only
  git branch -d feat/ARN-42-cache          # -D if squash-merged (git can't see it as merged)
  git push origin --delete feat/ARN-42-cache   # unless the repo auto-deletes head branches
  git fetch --prune                         # drop stale remote-tracking refs
  git config --global fetch.prune true      # make pruning the default
  # list local branches whose upstream is gone:
  git branch -vv | grep ': gone]'
  ```
  Note: after a **squash** merge, `git branch -d` refuses because the branch's commits aren't ancestors of `main`. Use `-D` once the PR is confirmed merged. Turn on the repo setting "Automatically delete head branches" so the remote side is handled for you.

### Gaps
- I didn't fetch the GitHub docs pages on squash commit message defaults, the auto-delete head branches setting, or the rule that authors can't approve their own PRs. These are stated from prior knowledge.
- I found no authoritative public PR-template standard. The template above is a synthesis.
- The merge queue isn't covered on the rulesets page I fetched. It probably isn't needed at solo scale.

---

## 4. Architecture Decision Records (ADR): Nygard, MADR, storage, numbering, status

### Takeaway
Keep ADRs in the repo, in `docs/adr/` or MADR's default `docs/decisions/`. Name them `NNNN-kebab-title.md`, numbered sequentially and never reused. Status moves proposed → accepted (or rejected) → deprecated / superseded by ADR-NNNN. Don't rewrite accepted ADRs; supersede them. MADR 4.0's metadata fields (`decision-makers`, `consulted`, `informed`) map directly onto the architect, developer and owner gates.

### Cited Findings
- Nygard (2011) sections are Title, Context, Decision, Status and Consequences. Title: "short noun phrases". Context: "the forces at play, including technological, political, social, and project local", written value-neutral. Decision: "our response to these forces", in active voice, "We will …". Consequences: "the resulting context, after applying the decision", including negative ones. — [Nygard, Documenting Architecture Decisions](https://www.cognitect.com/blog/2011/11/15/documenting-architecture-decisions)
- Nygard: "ADRs will be numbered sequentially and monotonically. Numbers will not be reused." "We will keep ADRs in the project repository under doc/arch/adr-NNN.md". "The whole document should be one or two pages long." "If a decision is reversed, we will keep the old one around, but mark it as superseded." Statuses: proposed, accepted, deprecated, superseded. — [Nygard](https://www.cognitect.com/blog/2011/11/15/documenting-architecture-decisions)
- MADR 4.0.0 (released 2024-09-17) sections: title, Context and Problem Statement, Decision Drivers (optional), Considered Options, Decision Outcome, then Consequences and Confirmation (both optional), Pros and Cons of the Options (optional), More Information (optional). — [MADR](https://adr.github.io/madr/)
- MADR optional YAML front matter: `status`, `date`, `decision-makers`, `consulted`, `informed`. Status placeholder: "{proposed | rejected | accepted | deprecated | … | superseded by ADR-0123". File name `NNNN-title-with-dashes.md`, stored in `docs/decisions`. — [MADR](https://adr.github.io/madr/)

### Inferences
- **Copyable ADR template** (MADR 4 with Nygard's brevity), at `docs/adr/0000-template.md`:
  ```markdown
  ---
  status: proposed        # proposed | accepted | rejected | deprecated | superseded by ADR-NNNN
  date: 2026-11-16
  decision-makers: owner
  consulted: architect-role (Claude), developer-role (Claude)
  informed: —
  ---
  # NNNN. Use SQLite for the reference cache

  ## Context and Problem Statement
  <forces, constraints, 2–5 sentences, value-neutral>

  ## Decision Drivers
  - …

  ## Considered Options
  1. SQLite  2. JSON files  3. LevelDB

  ## Decision Outcome
  Chosen option: "SQLite", because …
  We will …

  ### Consequences
  - Good: …
  - Bad: …

  ### Confirmation
  <how compliance is checked: test, lint rule, review checklist item>

  ## Pros and Cons of the Options
  ### SQLite — Good: … / Bad: …

  ## Review Log
  - 2026-11-16 Architect review: approved with changes (…)
  - 2026-11-16 Developer review: approved (…)
  - 2026-11-17 Owner: accepted
  ```
  The "Review Log" section is my addition, to record the staged gates. MADR's "More Information" section can hold it instead if you want to stay strictly on-template.
- Lifecycle in the staged loop: the agent drafts the ADR as `proposed` in a `docs/`-type PR. The architect-role review edits it, the developer-role review checks that it can be implemented, and the owner's merge flips it to `accepted`. When a later ADR reverses it, edit only the old ADR's `status:` line to `superseded by ADR-00NN`.
- Keep an index, `docs/adr/README.md`, listing number, title and status. The agent updates it in the same PR.
- Directory: `docs/adr/` is the more common name in the joelparkerhenderson ADR collection and the adr-tools ecosystem (unverified this session). MADR defaults to `docs/decisions/`. Either works. Pick one and record that choice as ADR-0001 ("Record architecture decisions"), which adr-tools traditionally creates as the first ADR (unverified this session).

### Gaps
- I didn't fetch github.com/joelparkerhenderson/architecture-decision-record or adr-tools this session, so their template variants (Tyree/Akerman, Y-statements) aren't cited here.

---

## 5. Multi-stage / role-based review gates and AI-agent instruction files (CLAUDE.md, AGENTS.md, Copilot)

### Takeaway
Claude Code's docs separate non-deterministic guidance (CLAUDE.md, skills: "Claude is allowed to decide a guideline doesn't apply") from deterministic enforcement (hooks, permission deny rules, managed settings, CI, branch protection). Put the staged review process in CLAUDE.md or a skill. Enforce the gates that must never be skipped (no push to main, tests must pass, the owner merges) with hooks, deny rules and GitHub rulesets. Run the architect and developer reviews as fresh, read-only subagents, because a reviewer that "hasn't seen your reasoning" is the part that adds value. Keep CLAUDE.md under 200 lines. If other agents need it too, have CLAUDE.md import an AGENTS.md.

### Cited Findings
- Two kinds of instruction. "Non-deterministic: you write the instruction, and Claude (the model) reads it. This can be your prompt, `CLAUDE.md`, or a skill… there's no *guarantee* that it'll follow your instructions." "Deterministic: you configure the instruction, and Claude Code (the harness) *has* to execute this. This can be a hook, a deny rule, or a managed setting." — [Claude Code best practices](https://code.claude.com/docs/en/best-practices)
- "If something has to happen every time, make it a hook, a deny rule, or a managed setting. `CLAUDE.md` is for guidelines, and Claude is allowed to decide a guideline doesn't apply." "If you keep adding emphasis to a `CLAUDE.md` line and Claude still misses it, that's a sign the line belongs in a hook." — [Claude Code best practices](https://code.claude.com/docs/en/best-practices)
- Emphasis: "Add IMPORTANT or ALL CAPS" is listed as outdated advice. "Current ones follow a plainly worded line, and piling on emphasis mostly makes Claude over-apply the rule." Also outdated: "Describe your architecture and file layout in CLAUDE.md — Claude reads the repo itself." — [Claude Code best practices](https://code.claude.com/docs/en/best-practices)
- What belongs in CLAUDE.md: the exact test, typecheck and lint commands (and how to run a single test); places where the code is misleading; "Decisions that aren't in the repo: which error helper the team settled on, how deploys work, what needs a migration review"; "Anything you've had to correct twice already." Example layout: `# Commands`, `# Conventions`, `# Gotchas`. — [Claude Code best practices](https://code.claude.com/docs/en/best-practices)
- Size: "target under 200 lines per CLAUDE.md file. Longer files consume more context and reduce adherence." Imports "don't reduce its context cost". Group content under markdown headers and bullets. Contradictory instructions mean "Claude may pick one arbitrarily". `/doctor prompt-audit` finds outdated or conflicting lines. — [Claude Code memory docs](https://code.claude.com/docs/en/memory)
- Locations and load order: managed policy (Windows `C:\Program Files\ClaudeCode\CLAUDE.md`), then user `~/.claude/CLAUDE.md`, then project `./CLAUDE.md` or `./.claude/CLAUDE.md`, then `./CLAUDE.local.md` (personal; add it to .gitignore). Files are concatenated, not overridden. Subdirectory CLAUDE.md files load on demand when Claude touches files there. — [Claude Code memory docs](https://code.claude.com/docs/en/memory)
- `@path/to/file` imports: relative to the importing file, recursive "with a maximum depth of four hops". Paths with spaces need backslash-escaping. Backticked `` `@README` `` isn't imported. — [Claude Code memory docs](https://code.claude.com/docs/en/memory)
- `.claude/rules/*.md` holds topic rule files. Rules with `paths:` YAML frontmatter load only when Claude works on matching files. Skills (`.claude/skills/<name>/SKILL.md`) load only when relevant, so they're "lighter on context than CLAUDE.md" for procedures. — [Claude Code memory docs](https://code.claude.com/docs/en/memory); [best practices](https://code.claude.com/docs/en/best-practices)
- AGENTS.md interop: Claude Code reads `AGENTS.md` when there is no CLAUDE.md. If both exist, it reads only CLAUDE.md, unless CLAUDE.md imports `@AGENTS.md`. Direct reading needs v2.1.277 or later. In some sessions it can't read AGENTS.md, so "import it from a CLAUDE.md". — [Claude Code memory docs](https://code.claude.com/docs/en/memory)
- AGENTS.md is "a README for agents", "now stewarded by the Agentic AI Foundation under the Linux Foundation". It's supported by Codex, Jules, Cursor, Gemini CLI, Copilot coding agent, Windsurf, Devin, Zed, and others. Suggested sections: project overview, build and test commands, code style, testing instructions, security considerations, commit/PR guidelines. The nearest file in the tree takes precedence, and explicit user prompts override it. — [agents.md](https://agents.md/)
- GitHub Copilot: repository-wide `.github/copilot-instructions.md`, plus path-specific `.github/instructions/NAME.instructions.md` with `applyTo:` glob frontmatter. Copilot also reads `AGENTS.md` (nearest wins), or a single root `CLAUDE.md`/`GEMINI.md`. Its guidance: "no longer than 2 pages" and "not task specific". Copilot code review reads instructions from the PR's head branch. — [GitHub Docs: Copilot repository instructions](https://docs.github.com/en/copilot/how-tos/configure-custom-instructions/add-repository-instructions)
- Independent review: "`/code-review` reviews the diff in a fresh subagent that never saw your conversation. It isn't swayed by the reasoning that produced the code." "A fresh reviewer does help, because it hasn't seen your reasoning." — [Claude Code best practices](https://code.claude.com/docs/en/best-practices)
- Read-only reviewer subagent: in `.claude/agents/reviewer.md`, give it `tools: Read, Grep, Glob` so "it's a reviewer that can't edit anything, and that limit is enforced by Claude Code." Review prompts should say "skip style", because "A reviewer that's asked to find problems will always find *something*. If you fix every finding, you end up with extra abstraction layers and tests for cases that can't happen." — [Claude Code best practices](https://code.claude.com/docs/en/best-practices)
- Enforcement examples. A `Stop` hook (`"command": "pnpm tsc --noEmit 1>&2 || exit 2"`) blocks Claude from ending its turn until the check passes, up to 8 consecutive blocks by default. `PreToolUse` hooks with exit code 2 block edits, e.g. to `migrations/`. For real enforcement use `command` or `http` hooks (not `prompt`/`agent` hooks) with `onFailure: "block"`. Release-type skills use `disable-model-invocation: true` so only the human can start them. — [Claude Code best practices](https://code.claude.com/docs/en/best-practices)
- Saying "don't push until I've reviewed" in conversation is treated by auto mode as a block signal, but "the sentence can get lost when the conversation compacts, so anything that matters belongs in a deny rule." Keep the enforced set small: "If you ever find yourself at forty of them, most are probably preferences." Committed `.claude/settings.json` applies to everyone in the repo. — [Claude Code best practices](https://code.claude.com/docs/en/best-practices)
- Managed CLAUDE.md is for "Behavioral instructions" and code style. Technical blocking belongs in managed settings `permissions.deny`. — [Claude Code memory docs](https://code.claude.com/docs/en/memory)
- GitHub rulesets have a public-preview rule, "Additional approval for unattributed Copilot PRs", which requires one more approval than configured. This shows GitHub treating AI-authored PRs as needing an extra human gate. — [GitHub Docs: rulesets](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/available-rules-for-rulesets)

### Inferences
- **Mapping the requested staged loop to RACI and mechanisms:**

  | Stage | Role | RACI | Mechanism | Enforced by |
  |---|---|---|---|---|
  | 0 Propose | Claude (implementer) | R | Plan or ADR draft (`status: proposed`) in a branch or draft PR | CLAUDE.md guidance |
  | 1 Architect review | `architect` subagent (read-only tools) | C | Checks design vs ADRs, boundaries, dependencies; writes findings to the PR/ADR "Review Log" | `.claude/agents/architect.md` with `tools: Read, Grep, Glob` |
  | 2 Developer review | `developer-reviewer` subagent (read-only) or `/code-review` | C | Correctness, tests, edge cases; "skip style" | Subagent definition; CI must be green |
  | 3 Owner approval | Human owner | A | Approves and merges the PR; merges the release-please PR to ship | GitHub ruleset (required PR, checks, CODEOWNERS approval if bot identity) |
  | Informed | Future readers | I | CHANGELOG, ADR index, devlog | release-please, PR checklist |

  Both AI review stages must run in fresh contexts. The Claude docs say this independence is where review value comes from. The gates that must not be skipped are enforced outside the model: no direct pushes to `main` (ruleset, plus a Claude `permissions.deny` on `Bash(git push origin main*)` and `Bash(git push --force*)`), CI green (required status checks plus a Stop hook), owner merge (CODEOWNERS approval when the agent uses a bot identity).
- **Suggested CLAUDE.md skeleton** (under 200 lines; procedures go in skills/rules):
  ```markdown
  # Commands
  - Install: npm ci
  - Lint: npm run lint   | Test: npm test   | One test: npx vitest run path/to/file.test.ts
  - Build (Windows): npm run build

  # Workflow (staged review — summary; details in .claude/skills/change-process/SKILL.md)
  - Never commit to main. Branch: <type>/<ticket>-<kebab-desc> (feat|fix|chore|docs|refactor|test|ci|perf).
  - Architectural or dependency decisions: draft docs/adr/NNNN-*.md (status: proposed) before code.
  - Before opening a PR: run the `architect` subagent, then the `developer-reviewer` subagent; record outcomes in the PR "Review gates" section.
  - Present the PR to the owner; do not merge. Owner merges.
  - Commits/PR titles: Conventional Commits 1.0 (type(scope): description; `!` or BREAKING CHANGE footer for breaking).
  - Keep PRs ~≤ 300 changed lines; split refactors from features.
  - Do not hand-edit CHANGELOG.md released sections; release-please owns them.

  # Conventions
  - <decisions not visible in code>

  # Gotchas
  - Windows: files are LF in repo (.gitattributes); don't introduce CRLF.

  @AGENTS.md   # if shared with other agents
  ```
  This follows the Anthropic guidance: commands first, decisions not in the code, plain wording with no ALL-CAPS, and long procedures moved into skills.
- **Settings to commit** (`.claude/settings.json`): deny rules for pushing to main, force-pushing, `gh pr merge`, and reading `.env`; a Stop hook running `npm run lint && npm test`; and a `/release` skill with `disable-model-invocation: true`.
- Publicly documented "architect review → code review → security review" RACI processes inside companies are mostly internal. What I found are the generic building blocks: code-owner review, team-scoped required reviewers for file patterns, and last-push approval in GitHub rulesets.

### Gaps
- I found no published industry standard for a "two AI-role reviews, then human" gate. The table above is a synthesis.
- I didn't fetch the Claude Code hooks reference or the permissions reference to check the exact deny-rule syntax for `Bash(git push ...)` patterns. Check it against https://code.claude.com/docs/en/permissions before use.
- I didn't fetch Google's "What to look for in a code review" or "The Standard of Code Review" pages, which would ground the developer-review checklist.

---

## 6. Progress tracking: CHANGELOG (Keep a Changelog) and devlog

### Takeaway
Use Keep a Changelog 1.1.0 (Unreleased at top; Added/Changed/Deprecated/Removed/Fixed/Security; ISO dates; compare links). Either let release-please generate it from Conventional Commits, or curate the Unreleased section in each PR. Don't do both by hand. Keep a separate, append-only devlog for process history (decisions, review outcomes, session notes) that doesn't belong in a user-facing changelog.

### Cited Findings
- Principles: "Changelogs are *for humans*, not machines". There's an entry for every version, changes are grouped by type, versions and sections can be linked, newest version first, each version has a release date, and the changelog states whether the project follows SemVer. — [Keep a Changelog 1.1.0](https://keepachangelog.com/en/1.1.0/)
- Types: Added, Changed, Deprecated, Removed, Fixed, Security. "Keep an `Unreleased` section at the top to track upcoming changes." Dates are ISO 8601 (`2017-07-17`). Reference links at the bottom: `[unreleased]` compares the latest tag to `HEAD`, `[X.Y.Z]` compares the previous tag to the new one. — [Keep a Changelog](https://keepachangelog.com/en/1.1.0/)
- Bad practices: dumping commit logs ("noisy, with merge commits, unclear titles"), ignoring deprecations, ambiguous dates, and inconsistent updates. — [Keep a Changelog](https://keepachangelog.com/en/1.1.0/)
- release-please updates CHANGELOG.md automatically when the release PR merges. — [release-please](https://github.com/googleapis/release-please)

### Inferences
- Tension: Keep a Changelog warns against commit-log dumps, while release-please builds the changelog from commits. Squash-merge with well-written PR titles, plus `BEGIN_COMMIT_OVERRIDE` for edits, makes release-please output close to a curated changelog. Its section headings ("Features", "Bug Fixes") differ from KaC's ("Added", "Fixed"). They can be remapped through release-please `changelog-sections` config (unverified this session).
- Template (if curated by hand):
  ```markdown
  # Changelog
  All notable changes to this project will be documented in this file.
  The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
  and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

  ## [Unreleased]
  ### Added
  - Reference cache (#42)

  ## [0.2.0] - 2026-11-10
  ### Fixed
  - CRLF corruption in exported files (#57)

  [unreleased]: https://github.com/OWNER/REPO/compare/v0.2.0...HEAD
  [0.2.0]: https://github.com/OWNER/REPO/compare/v0.1.0...v0.2.0
  ```
- Devlog convention (no formal standard found): `docs/devlog/YYYY-MM-DD.md` or a single `docs/PROGRESS.md`, newest first. Each entry covers goal, what changed (PR links), decisions (ADR links), review-gate outcomes, open questions and next steps. The agent appends an entry at the end of each work session. This also gives Claude cross-session memory the repo can't otherwise provide, which fits the "tell Claude what it can't see" guidance in the [Claude Code best practices](https://code.claude.com/docs/en/best-practices).

### Gaps
- I found no authoritative standard for devlogs or progress logs. The convention above is a synthesis.

---

## 7. Repo hygiene files (README, CONTRIBUTING, SECURITY, CODE_OF_CONDUCT, LICENSE, .editorconfig, .gitattributes, issue forms)

### Takeaway
The standard set is README.md, CONTRIBUTING.md (which carries the branching/commit/PR/review rules), SECURITY.md, CODE_OF_CONDUCT.md (Contributor Covenant), LICENSE, `.editorconfig`, `.gitattributes`, `.github/ISSUE_TEMPLATE/*.yml` issue forms, `.github/pull_request_template.md`, `.github/CODEOWNERS`, and `docs/adr/`. On Windows, `.gitattributes` matters most, because it fixes line endings in the repo no matter what each machine's git config says.

### Cited Findings
- GitHub's line-ending guidance: on Windows, `git config --global core.autocrlf true`. Example `.gitattributes`: `* text=auto`, `*.sln text eol=crlf`, `*.png binary`, `*.jpg binary`. After adding it, run `git add --renormalize .`, but only after committing any outstanding changes. — [GitHub Docs: Configuring Git to handle line endings](https://docs.github.com/en/get-started/git-basics/configuring-git-to-handle-line-endings)
- Issue forms are YAML in `/.github/ISSUE_TEMPLATE`. "All issue form configuration files must begin with `name`, `description`, and `body` key-value pairs." `title` and `labels` are optional. Body element types include `markdown`, `textarea`, `dropdown` and `checkboxes`, each with `validations: required`. — [GitHub Docs: Syntax for issue forms](https://docs.github.com/en/communities/using-templates-to-encourage-useful-issues-and-pull-requests/syntax-for-issue-forms)
- CODEOWNERS locations: `.github/`, root, `docs/`. — [GitHub Docs](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-code-owners)

### Inferences
- **`.gitattributes` for a Windows desktop app.** This builds on GitHub's example. Forcing LF for text is my recommendation (unverified this session) so the repo stays LF while Windows editors and linters behave predictably:
  ```gitattributes
  * text=auto eol=lf
  *.{cmd,bat,ps1} text eol=crlf
  *.sln text eol=crlf
  *.{png,jpg,jpeg,gif,ico,icns,webp} binary
  *.{exe,dll,msi,zip,7z,woff,woff2,ttf} binary
  ```
  Pair it with `.editorconfig` (`root = true`, `[*] end_of_line = lf`, `charset = utf-8`, `insert_final_newline = true`, `indent_style = space`). EditorConfig keys are from my knowledge, not fetched. `.ps1` and `.bat` files need CRLF to run reliably on Windows. Whether PowerShell itself requires CRLF is debated, and I didn't verify it.
- **Minimal bug-report issue form** (`.github/ISSUE_TEMPLATE/bug_report.yml`), based on the GitHub syntax page:
  ```yaml
  name: Bug report
  description: Something isn't working
  title: "[Bug]: "
  labels: ["bug", "triage"]
  body:
    - type: textarea
      id: what-happened
      attributes: { label: What happened? Steps to reproduce }
      validations: { required: true }
    - type: input
      id: version
      attributes: { label: App version (Help > About) }
      validations: { required: true }
    - type: dropdown
      id: os
      attributes:
        label: OS
        options: ["Windows 11", "Windows 10", "macOS", "Linux"]
      validations: { required: true }
    - type: textarea
      id: logs
      attributes: { label: Logs, render: shell }
  ```
  Add `feature_request.yml` and `config.yml` (`blank_issues_enabled: false`; the config key is from my knowledge, not verified this session).
- SECURITY.md should give a private reporting channel (GitHub private vulnerability reporting or an email address), the supported versions table, and the expected response time. CODE_OF_CONDUCT usually adopts Contributor Covenant 2.1. LICENSE: MIT or Apache-2.0 for permissive (Apache-2.0 adds a patent grant), GPL-3.0 for copyleft, or "All rights reserved"/proprietary if the code is closed. All of this is from general knowledge; I didn't fetch choosealicense.com or the Contributor Covenant this session.

### Gaps
- I didn't fetch editorconfig.org, choosealicense.com, contributor-covenant.org, or GitHub's SECURITY.md and community-profile docs this session.

---

## 8. GitHub Actions CI baseline (lint, test, build on PR; Windows runners)

### Takeaway
A single `ci.yml` triggered on `pull_request` and on `push` to `main`, running lint → test → build on `windows-latest`, plus a PR-title Conventional Commit check. Make those jobs required status checks in the `main` ruleset, and add release-please as a separate workflow on `push` to `main`. The job names must match the names set as required checks.

### Cited Findings
- Rulesets support "Required status checks" ("all required CI tests are passing") in strict or loose mode. — [GitHub Docs: rulesets](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/available-rules-for-rulesets)
- release-please is easiest to run as a GitHub Action (`googleapis/release-please-action`). — [release-please](https://github.com/googleapis/release-please)
- A Stop hook or CI is the deterministic "done" check. Claude Code's guidance lists "Tests, typecheck, a Stop hook, CI" as the enforced form of "When it's done". — [Claude Code best practices](https://code.claude.com/docs/en/best-practices)

### Inferences
- **Baseline workflow** (action versions are from my knowledge; pin them to the latest major or a SHA before use; unverified this session):
  ```yaml
  # .github/workflows/ci.yml
  name: CI
  on:
    pull_request:
    push:
      branches: [main]
  permissions:
    contents: read
  concurrency:
    group: ci-${{ github.ref }}
    cancel-in-progress: true
  jobs:
    pr-title:
      if: github.event_name == 'pull_request'
      runs-on: ubuntu-latest
      permissions: { pull-requests: read }
      steps:
        - uses: amannn/action-semantic-pull-request@v5
          env: { GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }} }
    build:
      strategy:
        matrix:
          os: [windows-latest]        # add ubuntu-latest for fast lint if desired
      runs-on: ${{ matrix.os }}
      steps:
        - uses: actions/checkout@v4
        - uses: actions/setup-node@v4
          with: { node-version: 22, cache: npm }
        - run: npm ci
        - run: npm run lint
        - run: npm test
        - run: npm run build
        - uses: actions/upload-artifact@v4
          with: { name: app-${{ matrix.os }}, path: dist/ }
  ```
  ```yaml
  # .github/workflows/release-please.yml
  on: { push: { branches: [main] } }
  permissions: { contents: write, pull-requests: write }
  jobs:
    release-please:
      runs-on: ubuntu-latest
      steps:
        - uses: googleapis/release-please-action@v4
          with: { release-type: node }   # or simple / python / rust
  ```
- Windows runner points (general knowledge, unverified this session): the default shell on Windows runners is `pwsh`, so set `defaults: run: shell: bash` if scripts assume POSIX. Windows minutes cost about 2× Linux minutes on private repos. Watch for path-length limits (`git config core.longpaths true`) and CRLF checkout, which `.gitattributes` fixes. Windows jobs are slower, so run quick lint jobs on Ubuntu and keep Windows for test and build. Code-signing secrets belong only in release workflows, never in `pull_request` runs from forks.
- Optional additions for an "enterprise" feel: Dependabot or Renovate, CodeQL (`github/codeql-action`), `actions/dependency-review-action` on PRs, and OpenSSF Scorecard. None of these were verified this session.

### Gaps
- I didn't fetch current GitHub-hosted runner docs (windows-2025 image status, pricing multipliers) or the actions' current major versions. Check them before copying the YAML.
- I didn't fetch the `amannn/action-semantic-pull-request` README.
