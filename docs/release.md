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

3. **Wait for the `release` workflow** (GitHub → Actions). It runs the tests, builds the installers (with the
   third-party notices inside), writes `SHA256SUMS`, the SBOM and `THIRD-PARTY-NOTICES.txt`, attests where the
   files came from, and opens a **draft** release.
4. **Read the draft** (GitHub → Releases): the files, the notes, the CHANGELOG entry. Click **Publish release**.
   From then on the app's update check offers it.

## Checking a download

```sh
# Compare with the line for this file in SHA256SUMS
certutil -hashfile LeMuse_0.10.0_x64-setup.exe SHA256
# Or check GitHub's build attestation (needs the gh CLI)
gh attestation verify LeMuse_0.10.0_x64-setup.exe --repo OopsieLazy/LeMuse
```

## Signing (Q24: unsigned)

LeMuse ships **unsigned** by the owner's decision, so Windows SmartScreen may say "Windows protected your PC"
(More info → Run anyway). Downloads can still be checked: `SHA256SUMS` and GitHub's build attestation (above).
If a certificate is ever bought, the workflow's commented **Sign** step is where it goes; keep one identity for
every release from then on (ADR-0028 §4).

## Automatic updates (later)

Turning on the Tauri updater needs a signing key pair, with the private key stored as a GitHub Actions secret.
**Losing that key strands every installed copy.** See ADR-0028 §2 before starting.

## A portable folder (no installer)

`cd app && npm run portable` builds `app/dist-portable/LeMuse/` (ADR-0031 §8). Move the folder anywhere, then
double-click `Add shortcuts.cmd` in it for Desktop and Start menu shortcuts. If LeMuse is running from
`target/release`, close it first or set `CARGO_TARGET_DIR` to another folder.

## App icon

The icon is drawn in `app/app-icon.svg` (and `app/app-icon-small.svg` for 16–32 px). After changing either, run
`cd app && npm run icons` and commit `app/src-tauri/icons/`.

## What never goes in git

Installers, the portable folder, `SHA256SUMS`, SBOMs and the `release/` folder are build outputs (`.gitignore` and the secret
scanner refuse them).
