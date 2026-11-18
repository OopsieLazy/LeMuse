---
status: proposed
date: 2026-11-18
decision-makers: owner
consulted: admin pass
informed: —
---

# ADR-0021: Reference sheets, a daily mailer, and adding pins to channels

## Context

The owner (session 11): "Perhaps emailing a PDF of a bunch of pictures for a 'reference' sheet, like a daily
custom mailer. Is there an automation method for adding pins to channels?" Q20 is no, so there is no Pinterest
developer app.

## Decision

1. **Reference sheet (built, work item 14): `lemuse sheet`.**
   - It writes a printable HTML page: a 4-column A4 grid of images, each with title, creator and source link.
     The browser's Print → Save as PDF turns it into a PDF, so no PDF library is needed.
   - The pick is seeded by today's date (or `--seed`), so the same day gives the same sheet. `--topic`,
     `--playlist`, `--count` (1–200).
   - It's safe to open and share:
     - every remote string is HTML-escaped;
     - only https image and page links are kept;
     - a CSP meta tag allows images from the source hosts only, and the page has no scripts.
   - Images are hotlinked, so LeMuse writes no image bytes. The browser that opens the sheet caches them like
     any web page.
2. **Daily mailer (planned, v0.12; needs Q22).**
   - **Locally:** a Task Scheduler entry runs `lemuse mail --to me --topic … --count 24` each morning.
   - It sends the sheet as an **HTML email** through the owner's own mail provider (SMTP with an app password
     in Credential Manager).
   - Images are links, so email clients may hide them until "show images".
   - A **PDF attachment** is optional. It needs the image bytes, so it's an explicit, Save-like action, plus a
     PDF crate chosen under the cooldown and audit rules.
   - **Hosted:** stage 3 of ADR-0020.
   - **Rules:** sending to yourself is personal reference. Sending to other people redistributes other people's
     images, so attribution and links always stay, and museum CC0 sources are the safest mix.
3. **Adding pins to Are.na channels (no code needed now).**

   | Way | Needs | Notes |
   |---|---|---|
   | Are.na browser extension ("Add to Are.na") on a pin | Free | Manual, one click; best attribution |
   | **Zapier template: new Pinterest pin → Are.na link block** | A paid Zapier plan, your Pinterest and Are.na logins (Zapier uses its own approved Pinterest app, so Q20 isn't needed) | Fully automatic; polls Pinterest |
   | Pipedream workflow (Pinterest trigger → Are.na action) | Free tier available | Same idea, more technical |
   | LeMuse `add-block <url> --channel <slug>` via `POST /v3/blocks` | Your Are.na token with write access (v0.8 token work) and your OK, because it changes your account | Not built. Are.na warns that rapid writes can trigger abuse detection, so one block at a time, user-started |

   LeMuse then picks the new blocks up on its next refresh (every 60 minutes, ADR-0017).

## Consequences

- Sheets work today from the CLI. A Sheet button in the app and a `/sheet` page on the dashboard come next.
- The mailer waits for Q22; pins need nothing from LeMuse.
