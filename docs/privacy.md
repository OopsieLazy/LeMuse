# Privacy

LeMuse is a desktop app with **no accounts, no tracking and no telemetry**. Nothing about you is sent to the
LeMuse project. This page lists everything the app talks to and everything it keeps.

## What LeMuse contacts

| Who | When | What they see |
|---|---|---|
| **Are.na** (api.are.na, images.are.na and Are.na's image CDN) | Refreshes, previews, Find channels, Save | Your IP address and LeMuse's User-Agent. With a saved token, your Are.na account (the token goes only to api.are.na) |
| **Cleveland Museum of Art** (open-access API and image server) | Refreshes, the slideshow, Save | Your IP address and LeMuse's User-Agent |
| **GitHub** (api.github.com) | Update check: at launch, at most once a day, if switched on (Settings → About) | Your IP address and LeMuse's User-Agent. No account, no token |
| **Your browser** | When you open a source page, Are.na's search or the project's GitHub pages | Whatever the site normally sees |

Images are shown straight from their sources. The app's window runs InPrivate, so images aren't kept in a
browser cache.

## What stays on your PC

Everything below lives in your library folder (`%USERPROFILE%\Pictures\LeMuse`):
- topics (`lemuse.toml`);
- the catalog (links and details of images, playlists, Favourites, your hidden and nudity marks, the practice
  log);
- settings (`ui.json`);
- the originals you chose to Save.

The Are.na token is kept in Windows Credential Manager, never in a file. Delete the folder, and remove the
credential "LeMuse/api.are.na", to remove everything.

## Reporting a problem

Bug reports go to GitHub issues, which are **public**. LeMuse's Copy details hides your Windows user name and
anything that looks like a token, and Report a problem fills in only the version. Check what you paste.
Security problems: see [SECURITY.md](../SECURITY.md).

## Changes

Any change to what LeMuse contacts or keeps is listed in the [CHANGELOG](../CHANGELOG.md) and decided in an
[ADR](adr/).
