# Handoff Notes — WildTrack (CAPR-F2026, Group 3)

_Last updated: 9 Oct 2026_

## How to resume in a new Claude Code chat
1. Start Claude Code in this folder (`C:\xampp\htdocs\CAPR-F2026-WildlifeTracker`).
   `CLAUDE.md` is read automatically and points here.
2. Paste one clear starter prompt, for example:
   - `Read NOTES.md. Next task: System Design for Oct 17 — draft the ERD and data-flow diagram.`
   - `Read NOTES.md. Decide with me whether to keep the Fish group, then update the app and the document.`
3. At the end of the session, ask: `Update NOTES.md with what we did and push it.`

(Earlier chats also stay in the app's sidebar and can be reopened.)

## Session log
- **24 Sep:** Requirements doc restructured to v1.1 (use cases, diagrams). Bug fixes (`962ec58`).
- **29 Sep:** Dashboard redesign (`d934b02`). v1.1 updated to match it.
- **5 Oct:** Figure 3 redrawn (A type / B Quick Location / C Locate Me, external services).
  Clickable PDF contents. NOTES.md, CLAUDE.md, and `docs/build` scripts added.
- **7 Oct:** Contents links didn't click in Google Drive's PDF preview. Made
  `Downloads\Week3_Requirements_Analysis_v1.1_drive.pdf` with "go to page" link actions
  (`docs/build/fix_links.py`). **Confirmed working in Drive**, so it is now a standard build step.
- **7 Oct (later):** System Design draft v1.0 (`docs/build/design.js`, 9 pages): architecture
  (updated figure), database decision, ERD, `species_cache` data dictionary + cache rules,
  context DFD + Level 1 DFD, traceability. Shared doc helpers moved to `docs/build/common.js`
  (v1.1 output unchanged). `sql/schema.sql` reduced to the one `species_cache` table.
  Outputs in `Downloads\System_Design_v1.0.docx` / `.pdf` / `_drive.pdf`.
- **7 Oct (evening):** System Design v1.0 completed (12 pages): UI wireframes of the landing
  page and dashboard (Section 6, numbered keys), contribution table by role (Section 8),
  removed the internal to-do section. `species_cache` connected in `species.php` (cache rules
  4.6, `X-Cache: HIT/MISS/STALE` header for testing); credited to Singh in the document.
  Local DB reset from `sql/schema.sql` (old tables were empty). Tested: second view of a
  species 1.5 s → 0.006 s; expired rows refresh; missing table falls back to GBIF.
- **7 Oct (night, earlier):** Landing page built (`public/index.php` + `css/landing.css`) from the
  prototype, with the app's six animal groups (same colors/icons as the pins), working links,
  and a responsive layout (tested at 1024 px and 375 px). Dashboard moved to `public/map.php`;
  its Home item and logo go back to the landing page. (Removed again later the same night.)
- **7 Oct (late night), after professor feedback:**
  - Landing page **removed** (too little information, not relevant); Map page is `index.php` again.
  - Removed the EN / Guest buttons and the left Home / Map / Species / About buttons (duplicates).
  - New shared header `partials/header.php`: Map | Encyclopedia | About, sticky while scrolling.
    The base-map tab "Map" was renamed "Street" so it isn't confused with the Map page link.
  - **Animal Encyclopedia** (`encyclopedia.php`): classification tree (5 vertebrate + 7
    invertebrate groups), South Korea / Worldwide, the 24 most-recorded species per group as
    cards (GBIF facets), detail dialog with IUCN status, top countries, taxonomy, Wikipedia and
    GBIF links. No database: GBIF is the source; `species.php` now adds a Wikipedia summary and
    photo (new `species_cache` columns `summary`, `wiki_url`; image prefers Wikipedia's).
  - Wikipedia rate-limits clients without a contact link (HTTP 429): `wikipedia.php` sends a
    User-Agent with the GitHub URL, and failed lookups are not cached.
  - System Design rewritten in more detail (20 pages): conceptual schema (Chen), updated ERD,
    DFDs (Wikipedia, process 5.0), wireframes of Map + Encyclopedia with "what it does" for every
    element, the GBIF button explained (6.3), messages table (6.5), FR-12 proposed.
  - Landing-page files were never committed (a temporary copy existed only in that session).
- **9 Oct:** Decisions discussed (see Decisions). All work from 7 Oct committed and pushed.

## What the project is

**WildTrack — Wildlife Sighting Mapping and Species Distribution Tracker.** A map-based web app
(theme: Fauna) that shows real animal sightings recorded near any place, using open data from
GBIF. Users search a place (or use "Locate Me"), see color-coded pins and a sightings table, filter
by animal group / date / radius, and open a species profile with photo and taxonomy. No login.

- **Team:** Gupta Aman Kumar (PM / Frontend), Singh Shubham Kumar (Backend), Paudel Amrit (Full-stack / QA)
- **Stack:** HTML/CSS/JS + Leaflet.js, PHP 8 (Apache via XAMPP), MySQL (schema only), GBIF and
  OpenStreetMap Nominatim APIs. Deployment planned on Render or Railway (free tier).
- **Run locally:** copy `config/config.example.php` to `config/config.php`, then open
  `http://localhost/CAPR-F2026-WildlifeTracker/public/`.

## What's done

### App (all committed and pushed)
- **Dashboard redesign** (`d934b02`), matching the team's mockup:
  - Sidebar: search, Locate Me, Quick Locations, radius chips (5–100 km), six animal-group
    checkboxes, date range, Filters (max records).
  - Map: Map / Satellite / Topographic tabs, legend, teardrop pins with icons, radius label,
    zoom / recenter, scale bar.
  - Recent Sightings table: photo, English name, group badge, paging, "View" buttons.
  - Species Profile panel: photo, taxonomy table (Kingdom → Species), date, locality,
    coordinates, "Explore on GBIF Network".
- **Bug fixes** (`962ec58`):
  - GBIF-outage sample data (NFR-04) now reaches the map, with a warning.
  - GBIF 4xx errors are no longer retried or shown as an outage.
  - A "To" date on its own works; reversed or invalid dates are rejected (frontend and backend).
  - "Locate Me" + re-query no longer re-geocodes "Current Location (GPS)".
  - 4 wrong species keys in the sample data fixed.
  - Duplicate root `css/` and `js/` folders removed.
- CSS/JS links carry `?v=<file time>` so browsers always load the latest files.

### Documents (output kept outside the repo; build scripts in `docs/build`)
- **Week 3 Requirements Analysis v1.1** (`Downloads\Week3_Requirements_Analysis_v1.1.docx` / `.pdf`, 22 pages):
  - Restructured to follow the professor's Week 4 study case: objectives → FR → NFR → actors →
    use cases → requirements-to-design traceability.
  - 11 detailed use case specifications, matching the redesigned dashboard.
  - Use case diagram, architecture diagram, and two flowcharts. Figure 3 shows the three ways
    to choose a location (A type / B Quick Location / C Locate Me) and the external services.
  - Clickable table of contents, plus PDF bookmarks.
- Landing page **prototype** (`docs/prototypes/landing.html`): built, then removed after the professor's
  feedback (too little information, not relevant). Kept in docs only as history.

## Decisions made
- **Animal groups:** Mammals, Birds, Reptiles, Amphibians, Fish, Invertebrates, as in the mockup.
  "Other Fauna" was replaced by Invertebrates, and several groups can be selected at once
  (`taxa` parameter).
- **Reptiles** use GBIF keys Squamata (11592253), Testudines (11418114) and Crocodylia (11493978),
  because the old Reptilia key (358) is a GBIF synonym and missed turtles and snakes.
- **Fish** use Actinopterygii (204) + Elasmobranchii (121). Invertebrates use the phyla Arthropoda,
  Mollusca, Annelida, Cnidaria and Echinodermata.
- **Fish is kept for now**, even though there were earlier requests to remove aquatic animals,
  because it is in the mockup. See the to-dos.
- **Dates start empty** and apply as soon as they change; there is no "Query Sightings" button.
- **No accounts:** "EN" and "Guest" in the top bar are display-only.
- **Task allocation, timeline and tools** go in the individual progress PDFs, not in v1.1.
- **Database (7 Oct):** MySQL is used only for `species_cache` (taxonomy + photo per species,
  refreshed after 30 days), read and written by `species.php`. `saved_locations` and
  `search_history` were dropped (need accounts / no use case). Occurrences are never stored.
- **Google Drive:** upload the `_drive.pdf` made by `fix_links.py`; its contents links work there.
- **No animal database (9 Oct):** GBIF and Wikipedia are the data sources; only the
  `species_cache` table is kept (speed, fewer API calls / Wikipedia rate limits, old copy if GBIF
  is down). The site still works without MySQL. Revisit only if free-tier hosting can't run MySQL.
- **Encyclopedia: ask the professor first (9 Oct).** Recommended direction if approved: make it
  a local "Field Guide" for the place searched on the map (same radius), link Map ↔ Encyclopedia
  both ways, and drop/hide "Worldwide" (obscure deep-sea species without descriptions).
- **AI use:** commits made with AI help carry a `Co-Authored-By` line, in line with the syllabus.

## File structure
```
CAPR-F2026-WildlifeTracker/
├── NOTES.md                  this file
├── CLAUDE.md                 standing instructions for Claude Code (read automatically)
├── README.md                 project summary and team
├── docs/build/               scripts that generate the documents + figures
│   ├── common.js             shared helpers (text, tables, figures, page styles)
│   ├── build.js              Requirements Analysis v1.1 text
│   ├── design.js             System Design v1.0 text
│   ├── diagrams.js           all figures (use case, architecture, flowcharts, ERD, DFDs)
│   ├── finalize.ps1          Word: update contents page, export PDF
│   └── fix_links.py          Google Drive copy of a PDF (working contents links)
├── config/
│   ├── config.example.php    template (copy to config.php)
│   └── config.php            local settings and credentials (git-ignored)
├── includes/
│   ├── gbif.php              GBIF client: query builder, retry ×3, sample-data fallback
│   └── db.php                PDO connection (not used yet)
├── public/                   web root
│   ├── index.php             Map page (home)
│   ├── encyclopedia.php      Animal Encyclopedia page
│   ├── partials/header.php   shared top bar (Map | Encyclopedia | About) + About dialog
│   ├── css/style.css         all styles
│   ├── js/app.js             app logic: search, filters, map, table, profile
│   └── api/
│       ├── geocode.php       place name → lat/lng (Nominatim)
│       ├── sightings.php     occurrences near a point (GBIF), with filters
│       └── species.php       taxonomy + photo for a speciesKey (MySQL cache, else GBIF)
└── sql/schema.sql            species_cache only (used by species.php)
```

## Remaining to-dos
**Deadlines (all 11:59 PM):** System Design Oct 17 · Working Prototype Nov 3 · Project
Finalization Nov 26 · Presentation Dec 2 (Group 3 is in Presentation 1).

- [ ] The latest v1.1 `.docx` is in Downloads. The `.pdf` there may be older if it was open in
      a viewer; rebuild with `docs/build` (see its README) and copy it over. Confirm the
      Requirement Specification submission and add a contribution row for the v1.1 revision.
- [x] Drive contents links tested: the `_drive.pdf` works; `fix_links.py` is a standard step.
- [ ] Decide whether to keep **Fish** (remove the group in `app.js` `GROUPS` and the checkbox if not).
- [ ] Each member writes their **individual progress PDF** (tasks, timeline, tools).
- [ ] **System Design (Oct 17):** v1.0 (20 pages) in Downloads. Team: review it together (every
      member must be able to explain the conceptual schema, ERD, DFDs and wireframes; Singh the
      cache code in `species.php` and `encyclopedia.php`), adjust the contribution table if
      needed, then upload `System_Design_v1.0_drive.pdf` and submit.
- [ ] **Ask the professor** whether the Encyclopedia (as a local Field Guide) is in scope.
- [ ] If yes: make it local to the map location + Map ↔ Encyclopedia links (see Decisions).
- [ ] **Requirements Analysis v1.2** (after the professor's answer): add FR-12 Animal Encyclopedia + a use case for it; update
      Figure 2 / Section 13 (one cache table), the header (no EN/Guest) and the removed buttons.
- [ ] Each teammate resets their DB again (schema has new `summary`, `wiki_url` columns).
- [x] `species_cache` wired into `species.php`. Each teammate resets their local DB:
      `DROP DATABASE wildlife_tracker`, then import `sql/schema.sql`. Still untested: the
      "GBIF down, serve old row" rule (needs GBIF to fail).
- [ ] If v1.1 is revised again: its Figure 2 and Section 13 still describe three planned tables.
- [x] Landing page removed (professor feedback). Map page is the home page again (index.php).
- [ ] Choose **one specific end user and one community-impact feature** (the instructor's
      "think outside the box" note), and update the objectives, FRs and use cases to match.
- [ ] **Performance:** GBIF took about 15 s for Jeju in testing, against NFR-01's ~5 s target.
      The 30 s timeout in `config.php` means a hanging GBIF takes up to ~90 s before the
      fallback appears. Consider a shorter timeout.
- [ ] Teammates should commit from their **own GitHub accounts**; set up a GitHub Issues /
      Projects task board.
- [ ] Update `README.md` with the Map and Encyclopedia pages and the animal groups.
- [x] Document build scripts are now in `docs/build` (see its README to rebuild).
- [ ] Before deployment, check Esri tile terms and test on Chrome, Firefox and Edge (NFR-02)
      and at small screen widths (NFR-06).
- [ ] Minor: when GBIF gives no locality, the Location column shows the country.
