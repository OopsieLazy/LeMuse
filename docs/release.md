# Releasing LeMuse

How a version goes from `main` to a download ([ADR-0028](adr/0028-updates-release-accessibility.md)). Only the
owner tags and publishes.

## Steps

1. **Merge** the PRs for the release on GitHub (Squash and merge). Each one bumps the version in `Cargo.toml`,
   `app/src-tauri/tauri.conf.json`, `app/package.json` and the lockfiles.
2. **Tag it.** The workflow checks that the tag matches the version:

   ```sh
   # Bring main up to date
   git switch main
   git pull
   # Tag the version from Cargo.toml (example: 0.10.0)
   git tag -a v0.10.0 -m "v0.10.0"
   git push origin v0.10.0
   ```

3. **Wait for the `release` workflow** (GitHub → Actions). It runs the tests, builds the installers, writes
   `SHA256SUMS` and the SBOM, attests where the files came from, and opens a **draft** release.
4. **Read the draft** (GitHub → Releases): the files, the notes, the CHANGELOG entry. Click **Publish release**.
   From then on the app's update check offers it.

## Checking a download

```sh
# Compare with the line for this file in SHA256SUMS
certutil -hashfile LeMuse_0.10.0_x64-setup.exe SHA256
# Or check GitHub's build attestation (needs the gh CLI)
gh attestation verify LeMuse_0.10.0_x64-setup.exe --repo OopsieLazy/LeMuse
```

## Signing (Q24, open)

The installers are unsigned, so Windows SmartScreen may warn until a signing identity exists. The workflow's
commented **Sign** step is where it goes. Pick one identity and keep it for every release (ADR-0028 §4).

## Automatic updates (later)

Turning on the Tauri updater needs a signing key pair, with the private key stored as a GitHub Actions secret.
**Losing that key strands every installed copy.** See ADR-0028 §2 before starting.

## What never goes in git

Installers, `SHA256SUMS`, SBOMs and the `release/` folder are build outputs (`.gitignore` and the secret
scanner refuse them).
