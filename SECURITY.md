# Security

## Reporting

Report vulnerabilities privately through GitHub's **private vulnerability reporting** on
<https://github.com/OopsieLazy/LeMuse/security> (Security → Report a vulnerability). Please don't open public issues
for security problems.

## Design commitments

- **Tokens:** Are.na and other API tokens are stored only in Windows Credential Manager (M1). They're never
  written to `lemuse.toml`, logs, the catalog or the repo.
- **Least privilege:** the Tauri window gets `core:default` capabilities only. Plugins are added explicitly and
  reviewed in the admin pass.
- **Untrusted input:** all remote JSON, file names and titles are treated as untrusted. Names are sanitized
  before touching the file system (`store::views`). Extensions are allow-listed (`store::blobs`). FTS queries are
  escaped (`store::catalog::fts_query`).
- **Local scope:** the asset protocol is scoped to the library folder. The optional dashboard (`lemuse serve`)
  listens on 127.0.0.1 only and needs its token (ADR-0019).
- **AI changes are gated (ADR-0030):** the coding agent can't push; a PR that changes a guardrail file (CI,
  hooks, scanner rules, ignore lists, permissions, CSP, CLAUDE.md) fails the `guardrails` check until the owner
  reads it and adds the `guardrails-reviewed` label.
- **Bug reports are public:** Copy details hides the Windows user name and token-shaped text, and the bug form
  asks reporters to check what they paste (ADR-0025).

## Gates (ADR-0011)

- Every commit: `scripts/scan-secrets.mjs --staged` (git pre-commit), which checks secrets and personal emails
  and never prints the value.
- Every commit by the coding agent: an admin-review agent hook on the staged diff.
- Before the agent finishes: the Stop gate (`scripts/hooks/stop-gate.mjs`).
- Every PR: gitleaks, `npm audit`, `cargo audit`, dependency review, and the 10 MiB installer budget.
- If a secret is ever committed, **rotate it first**, then remove it from history.
