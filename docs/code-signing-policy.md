# Code signing policy

> **Draft for the SignPath Foundation application (owner Q24).** It isn't in effect until SignPath Foundation
> approves LeMuse and the first signed release ships. Then this page is linked from the README and the
> download page, as their terms require.

Free code signing provided by [SignPath.io](https://about.signpath.io), certificate by
[SignPath Foundation](https://signpath.org).

## What gets signed

Only the Windows installers (`LeMuse_<version>_x64-setup.exe`, `LeMuse_<version>_x64_en-US.msi`) and the
programs inside them, built from this repository's source by the GitHub Actions `release` workflow
([docs/release.md](release.md)). Nothing built on a personal computer is signed.

## Team and roles

LeMuse has one maintainer, who holds all three roles. This is said plainly: there is no separate reviewer.

- **Author:** may change the source code (GitHub account with multi-factor authentication).
- **Reviewer:** reviews every pull request from anyone else before it's merged. `main` is protected: changes
  reach it only through pull requests.
- **Approver:** approves each signing request in SignPath, for releases built by the workflow from a version tag.

Committers and reviewers: [the maintainer](https://github.com/OopsieLazy). Approvers: the same.

## Privacy

This program will not transfer any information to other networked systems unless specifically requested by the
user or the person installing or operating it. What LeMuse contacts, and when, is listed in
[docs/privacy.md](privacy.md): the image sources you choose, and an update check against GitHub that you can turn
off.
