# Name check: "LeMuse" (owner Q26)

A desk search on 2026-11-19, as part of the road to 1.0 ([ADR-0028](../adr/0028-updates-release-accessibility.md)).
It's not legal advice and not a clearance search.

## What was searched

- The web, and app stores as listed by search engines: "LeMuse", "Le Muse" and "Muse" apps for art and
  software.
- Trademark registry listings for "MUSE" in Class 9 (downloadable software) and Class 42 (software services).

## What turned up

- **"LeMuse":** no app, product, company or trademark filing found.
- **"Muse" alone is crowded in software:**
  - MUSE. by Muse App Inc.: pending, classes 9, 38 and 42 (audio collaboration).
  - Logitech: a pending Class 9 filing (May 2025).
  - Adobe MUSE: registered in 2013 (the website builder Adobe discontinued).
  - Muse Software's MUSE LIVE.
  - Many "Muse" consumer apps: music games, MuseScore, journaling.
- No dispute involving a "Muse" art or drawing app was found.

## What that means for LeMuse

- **The risk is low** for a free, open-source app with a distinct compound name. It's higher for anything sold or
  registered.
- **Proportionate steps (no workaround needed, no conflict found):**
  - Always write it as one word, **LeMuse**, never "Muse" on its own (the icon, the window title, the README and
    winget all say LeMuse).
  - Keep a descriptor near the name where space allows: "LeMuse: reference and practice".
  - Use other marks only to say where images come from (Are.na, museum names), with the "not affiliated" line in
    About and the README (nominative use).
  - Keep the GitHub repository and account names stable (installed copies link to them, ADR-0024).
- **If a rights holder ever writes:** rename. The name appears in a handful of places (`tauri.conf.json`
  productName, the window title, the README, the installer), so renaming is cheap. ADR-0010 kept the ranked
  alternatives.
- **Before paying to distribute** (Microsoft Store, a paid tier) or registering the name, run a formal search:
  USPTO, EUIPO (TMview) and UKIPO, classes 9 and 42.

## Sources

- Registry listings found by search: [MUSE (Muse App Inc.)](https://uspto.report/TM/98704988),
  [Muse App Inc. portfolio](https://trademarkdir.com/owner/muse-app-inc),
  [MUSE 97801950](https://trademarks.justia.com/978/01/muse-97801950.html),
  [ADOBE MUSE](https://markinton.com/trademark/adobe-muse-85605748).
- Classes for apps: [Trademarky: class 9 or 42](https://trademarky.io/guides/trademark-for-an-app-or-software).
