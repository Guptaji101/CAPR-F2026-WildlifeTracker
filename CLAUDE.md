# CLAUDE.md — WildTrack (CAPR-F2026 Capstone, Group 3)

Read **NOTES.md** first. It has the project summary, decisions made, file structure, and the
current to-do list with deadlines.

## Project in one line
PHP + Leaflet web app that maps real animal sightings from GBIF near any place.
Run it at `http://localhost/CAPR-F2026-WildlifeTracker/public/` (XAMPP, Apache on).

## Working rules
- **This is a graded student project.** The syllabus allows AI help but students must be able to
  explain every change. Keep changes small, explain them in plain words, and don't rewrite large
  parts of the app unless asked.
- **Commits:** end every commit message made with AI help with
  `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Only commit or push when asked.
- **Keep code and documents in sync.** If app behavior changes, the requirements document (use
  cases, FRs, figures) may need updating too. Point this out.
- **Requirements document:** edit `docs/build/build.js` (text) and `docs/build/diagrams.js`
  (figures), never the generated Word file. Rebuild steps are in `docs/build/README.md`. The
  latest output is also copied to the user's `Downloads` folder. Check that the file isn't open
  in Word first.
- **Open decisions:** ask before removing the Fish animal group, or adding accounts or a database.
- **Secrets:** `config/config.php` is git-ignored; never commit it.
- **Browser caching:** CSS/JS links are versioned by file time in `public/index.php` and `public/encyclopedia.php`;
  keep that.

## Key files
- `public/index.php`: Map page (home). `public/js/app.js`: its logic. `public/css/style.css`: shared styles.
- `public/encyclopedia.php` + `js/encyclopedia.js` + `css/encyclopedia.css`: Animal Encyclopedia.
- `public/partials/header.php`: top bar shared by both pages (Map | Encyclopedia | About).
- `public/api/geocode.php`, `sightings.php`, `species.php`, `encyclopedia.php`: JSON endpoints.
- `includes/gbif.php`: GBIF client (retry ×3, sample-data fallback for NFR-04, `gbif_get()`).
- `includes/wikipedia.php`: species summary from Wikipedia (cached in `species_cache`).

## Quick checks after changes
```bash
/c/xampp/php/php.exe -l public/api/sightings.php
```
```bash
node --check public/js/app.js
```
Then open the app in the browser: on the Map page the pins, the table and the Species Profile load;
on the Encyclopedia page the cards fill with photos and summaries.

## End of every session
Update **NOTES.md** (what was done, decisions, to-dos), then commit and push it, so the next
session starts from the latest state.
