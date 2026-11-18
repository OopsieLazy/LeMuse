# Security

## Reporting

Report vulnerabilities privately to the repository owner (GitHub private vulnerability reporting, once the repo
is on GitHub). Please don't open public issues for security problems.

## Design commitments

- **Tokens:** Are.na and other API tokens are stored only in Windows Credential Manager (M1). They're never
  written to `servensurf.toml`, logs, the catalog or the repo.
- **Least privilege:** the Tauri window gets `core:default` capabilities only. Plugins are added explicitly and
  reviewed in the admin pass.
- **Untrusted input:** all remote JSON, file names and titles are treated as untrusted. Names are sanitized
  before touching the file system (`store::views`). Extensions are allow-listed (`store::blobs`). FTS queries are
  escaped (`store::catalog::fts_query`).
- **Local scope:** no localhost server. The asset protocol is scoped to the library folder.
