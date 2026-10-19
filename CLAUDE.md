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
- **Commits:** the user makes every commit and push personally. Never run `git commit` or
  `git push`; instead list the changed files and suggest a commit message. A message for work
  made with AI help ends with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- **Documents are submitted and frozen (since 19 Oct).** Do NOT edit or rebuild the Requirements
  Analysis or System Design, and don't overwrite their files in `Downloads`. Instead, record every
  change in **`CHANGELOG.md`** (repo root): what changed, which files, and under "For the final
  submission" what the documents will need (FR/UC/figure). All documents are merged into one for
  the final submission (Nov 26); only then are `docs/build` and the documents updated.
- **Change log:** every change to the app gets a dated entry in `CHANGELOG.md`, so the user can
  track all changes in one place.
- **Requirements document (for the final merge only):** edit `docs/build/build.js` (text) and
  `docs/build/diagrams.js` (figures), never the generated Word file. Rebuild steps are in
  `docs/build/README.md`. Check that the file isn't open in Word first.
- **No revision history** in any document or PDF (removed 10 Oct at the user's request; don't add it back).
- **Fish stays** as an animal group (decided 10 Oct). Ask before adding accounts or another database.
- **Secrets:** `config/config.php` is git-ignored; never commit it.
- **Browser caching:** CSS/JS links are versioned by file time in `public/index.php` and `public/encyclopedia.php`;
  keep that.

## Key files
- `public/index.php`: Map page (home). `public/js/app.js`: its logic. `public/css/style.css`: shared styles.
- `public/encyclopedia.php` + `js/encyclopedia.js` + `css/encyclopedia.css`: Animal Encyclopedia.
- `public/partials/header.php`: top bar shared by both pages (Map | Encyclopedia | About).
- `public/api/geocode.php`, `sightings.php`, `species.php`, `encyclopedia.php`, `animal.php`,
  `places.php` (place suggestions via Photon): JSON endpoints.
- `includes/gbif.php`: GBIF client (retry ×3, sample-data fallback for NFR-04, `gbif_get()`).
- `includes/wikipedia.php`: species summary from Wikipedia (cached in `species_cache`).
- `includes/cache.php`: file cache (`cache_get`/`cache_put`) used by every endpoint that calls GBIF,
  Nominatim or Wikipedia. Keep caching when adding endpoints.
- `public/data/korea-animals.json` (made by `tools/build-animal-list.php`): animal suggestions.
- Async UI code ignores late answers (`state.searchId`/`placeId`/`animalId` in app.js,
  `requested`/`state.openedKey` in encyclopedia.js); keep that pattern for new requests.
- `includes/config.php`: `app_config()` reads `config/config.php`, or on the server (Render)
  `config.example.php` + `DB_*` environment variables. `Dockerfile`: how Render runs the site.

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
Update **NOTES.md** (what was done, decisions, to-dos) and **CHANGELOG.md** (every change, plus the
"For the final submission" table), and remind the user to commit and push them,
so the next session starts from the latest state.
