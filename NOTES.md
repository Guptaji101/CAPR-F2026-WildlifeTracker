# Handoff Notes — WildTrack (CAPR-F2026, Group 3)

_Last updated: 19 Oct 2026_

## How to resume in a new Claude Code chat
1. Start Claude Code in this folder (`C:\xampp\htdocs\CAPR-F2026-WildlifeTracker`).
   `CLAUDE.md` is read automatically and points here.
2. Paste one clear starter prompt, for example:
   - `Read NOTES.md. Next task: plan the usability test (docs/usability.md).`
   - `Read NOTES.md. Next task: deploy WildTrack (Render or Railway) so it opens on phones.`
   - `Read NOTES.md. Next task: help Paudel start the test plan (docs/testing.md).`
3. At the end of the session, ask: `Update NOTES.md with what we did.` Then commit and push it
   yourself (Claude never commits; it suggests the commit summary and description).

## Where things stand (14 Oct 2026)
- **Website:** Map page (`index.php`) + Animal Encyclopedia (`encyclopedia.php`, South Korea
  only), shared header, phone layout, UX review fixes, Map <-> Encyclopedia links with a
  remembered search and a species filter, Korea-only place search, Korean Quick Locations and
  the "Find an Animal" search. All committed and pushed.
- **Live website (Render, free):** **https://wildtrack-lq88.onrender.com** (lowercase L, not 1).
  Updates by itself after every push to `main`. Sleeps after ~15 min idle: open it a minute
  before a demo. Code: https://github.com/Guptaji101/CAPR-F2026-WildlifeTracker (public).
- **Documents (in `Downloads`):** `Week3_Requirements_Analysis_v1.3 (final version).docx`
  (27 pages) and `System_Design_v1.1 (final version).docx` (25 pages), plus `.pdf` and
  `_drive.pdf` (the one to upload to Google Drive). Both match the website as of 14 Oct
  (including FR-13 / UC-13 Animal Name Search).
- **Submitted:** Proposal, Requirements Specification, System Design (Oct 12). Professor approved
  the Encyclopedia.
- **Next deadlines:** Week 7 progress review (show the working app in class), Working Prototype
  **Nov 3** (Week 10), testing report (Week 12), final submission **Nov 26**, presentation
  **Dec 2** (Group 3, Presentation 1). Full schedule in "Course schedule" below.
- **Biggest gaps vs. the rubric:** Testing (20 pts, not started), team version control and task
  management (only one GitHub account commits; no issue board yet), deployment (site only runs
  on localhost, so phones and classmates can't open it yet).

## Course schedule (from the syllabus)
| Week | Phase | What is due / happens |
|---|---|---|
| 6 (deadline Oct 17) | UI/UX Design & Prototype | System Design submission. **Already submitted Oct 12**; nothing new due. |
| 7 | Development Phase I | First progress review: show the working app in class. |
| 8 | Development Phase II | API/database integration; progress demonstration. |
| 9 | Development Phase III | Frontend/backend integration; progress review. |
| 10 (deadline **Nov 3**) | Development Phase IV | **Working Prototype** milestone. |
| 11 | Testing & QA | Test plan, test cases, functional and usability testing, bug fixing. |
| 12 | System Improvement & Integration | Testing report. |
| 13 (deadline **Nov 26**) | Finalization | Documentation, user guide, presentation rehearsal; **final submission**. |
| 14 (**Dec 2**) | Presentation I | Group 3 presents: demo, Q&A, individual contribution evaluation. |

**Late policy:** −10% per day; after 5 days the score is 0. The final presentation and the final
submission **cannot be late**.

**Rubric (100):** Proposal 10 · Requirements & System Design 15 · Development & Progress 20
(includes version control, task management, regular demos) · Testing & Final Product 20 ·
Final Presentation 25 · Individual Participation 10.

## Working rules agreed with Claude
- **Commits:** the user commits and pushes; Claude only edits files and suggests a commit summary
  and description. AI-assisted work keeps the `Co-Authored-By: Claude …` line (course AI policy).
- **Documents are frozen (19 Oct):** the Requirements Analysis and System Design are submitted and
  must not be changed or rebuilt. Every change goes into **`CHANGELOG.md`** (repo root), whose
  "For the final submission" table lists what the merged final document (Nov 26) must include.
- **No revision history** in any document. **Fish stays.**
- For the final merge only: documents are generated from `docs/build` (`node build.js`,
  `node design.js`, then `finalize.ps1` and `fix_links.py`); never edit the Word files by hand.
  The "(final version)" files in Downloads are working drafts (last rebuilt 19 Oct), not the
  submitted copies.

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
- **10 Oct:** Encyclopedia now covers **South Korea only**: the Worldwide switch and the
  "Where it is recorded most" country list were removed; the dialog shows the species' records
  in South Korea. System Design text, Figure 5 (DFD) and Figure 7 (wireframe) updated.
  Professor consultation moved to next Wednesday; Requirements Analysis unchanged until then.
- **10 Oct (later):** Requirements Analysis **v1.2** (`Downloads\Week3_Requirements_Analysis_v1.2.*`):
  factual fixes only (one connected cache table in Sections 9, 11, 12 and Figure 2; caching
  removed from Section 13; "Street" base map in FR-02 / UC-02). Revision History removed from
  **both** PDFs. The Encyclopedia (FR-12 / UC-12) is still waiting for the professor.
- **12 Oct:** System Design submitted (team review and contribution check done).
  **Professor approved the Encyclopedia.** Requirements Analysis **v1.3** (24 pages): FR-12 Animal
  Encyclopedia, UC-12 Browse Animal Encyclopedia, Wikipedia as secondary actor and dependency,
  use case diagram (UC-12; GBIF drawn twice), Figure 2 = current architecture, scope and
  traceability. System Design now refers to v1.3 and no longer calls FR-12 "proposed".
  Compared the submitted files with the generated ones: no content edits found (only a stray
  "+" before section 8, removed). System Design renamed **v1.1** (`System_Design_v1.1.*`); the
  submitted file is kept as `Downloads\System_Design_v1.1_submitted.docx`.
- **14 Oct, UX review + fixes (Week 6 UI/UX):** phones open on the map ("Search & filters" and
  "Animal group" buttons fold the sidebars away); clicking a pin/View scrolls to the Species Profile
  below 1200 px; "GBIF is slow right now" after 5 s; GBIF timeout 30 s -> 15 s (config.php too);
  real search button + labels + visible keyboard focus; alt text; hidden h1; 40 px chips and a
  compact legend on phones; country shown grey when there is no place name; "Hypoponera sp."
  instead of author names; links Map <-> Encyclopedia (`encyclopedia.php#birds/<key>`,
  `index.php?group=birds`).
- **14 Oct (later):** Round trip Map -> Encyclopedia -> Map lost the searched place. Now the Map
  page remembers the last search for the browser tab (sessionStorage), and "See … on the map"
  filters on the **species** (`index.php?species=<key>&name=…`) with a "Showing only …" bar and
  a "Show all animals" button. The `?group=` link was removed. Docs updated (SD 6.1, 6.2, 6.4 #13,
  Figure 7; Requirements UC-03 A6, UC-12 A8).
- **14 Oct (Korea focus + animal search):**
  - Quick Locations: Tokyo and Vancouver replaced by **Seoraksan** and **Suncheon Bay**.
  - Place search limited to **South Korea** (`countrycodes=kr` in `geocode.php`, user's decision),
    English place names (`accept-language=en`), and the message "Found: <place>" so the user sees
    what was found (inside Korea "Tokyo" finds a shop). Not found: "Place not found in South Korea …".
  - **Find an Animal** box (FR-13 / UC-13): `api/animal.php` turns a name into a GBIF species key in
    3 steps: (1) GBIF `species/match` (scientific names), (2) Wikipedia → Wikidata P846 "GBIF ID"
    (English names; `wiki_gbif_key()` in `wikipedia.php`), (3) "Did you mean…" list: 50 GBIF
    common-name matches, sorted by records in South Korea (one facet request), top 5 shown.
    Then the existing species filter ("Showing only …") is used. No sightings near the place →
    message + table text ("No Tiger sightings within 10 km of Busan…").
  - Tested: tiger (found, 0 sightings → message), Eurasian magpie, Pica pica, water deer,
    mandarin duck, magpie (suggestions: Oriental/Black-billed/Azure-winged Magpie), nonsense
    name, empty box, Tokyo/Vancouver; desktop, 800 px and 375 px.
  - Bug fixed: `safeJsonFetch()` showed raw JSON ("HTTP 404: {…}") instead of the server's message.
  - Why not GBIF's own name search alone: "tiger" returns *Palliolum tigerinum* etc.; GBIF
    `species/match` only knows scientific names. Wikipedia lookups can hit rate limits (HTTP 429)
    if many are sent quickly; the contact User-Agent helps. A lookup takes ~1–10 s.
  - Docs: Requirements v1.3 (26 pages): FR-01, new FR-13, UC-01/03/10/11 edits, new UC-13, Figure 1
    (use case diagram), Figure 2 (architecture: 5 endpoints), scope, actors, traceability,
    dependencies (Wikidata). System Design v1.1 (25 pages): components, 3.3 example, Figure 1
    (architecture), Figure 4 (context DFD), Figure 5 (Level 1 DFD: new process 6.0 Find Animal),
    5.4–5.6, Figure 6 (wireframe #15 Find an Animal) and key, 6.5, 6.6 messages, 6.7, traceability.
    Both kept as v1.3 / v1.1 (no version bump); no revision history.
- **19 Oct (user feedback: messages, suggestions, speed, wrong/overlapping results):**
  - **Messages** (toasts) now at the **top center** under the header, 5 s, max 3, no duplicates,
    read by screen readers (`aria-live`). CSS `.toast-container`, `showToast()` in app.js.
  - **Animal suggestions while typing** (Google-like drop-down under Find an Animal):
    `public/data/korea-animals.json` = 2000 most-recorded animals in South Korea (key, English name,
    scientific name, class, records), made by `tools/build-animal-list.php` (run it again now and
    then). Loaded once on first focus, filtered in the browser (`matchAnimals()`: a word of the
    English/scientific name starts with the typed text, best-known first, 6 max). Arrow keys, Enter,
    Esc, click. Exact list names skip the server. Place-name suggestions were **not** added:
    Nominatim's usage policy forbids autocomplete.
  - **Speed:** measured first. Render: sightings ~2 s, species ~2 s, animal 2–4 s; locally GBIF
    downloads are slow (75 records = 560 KB from Denmark, 3–10 s; one test hit 3 timeouts = 48 s).
    Fixes: file cache `includes/cache.php` (sightings 1 h, places 30 d, animals 7 d, species 30 d
    when no MySQL, Encyclopedia list 1 d, IUCN 7 d) → repeats in ~0.005 s; browser keeps the last 20
    sightings searches; GBIF retries capped at 25 s total (was up to 48 s; **changed later the
    same day** to "stop only if stalled, max 40 s", see below);
    `.github/workflows/keep-awake.yml` opens the Render site + Busan search + Mammals list every
    10 min so it doesn't sleep (first visit was ~50 s).
  - **Wrong/overlapping results fixed:** searches, place and animal lookups have an id; late answers
    of older ones are ignored (`state.searchId`, `placeId`, `animalId`). `fillCommonNames()` wrote
    English names into rows of a *newer* search (the "wrong information" bug) → checks the row.
    Encyclopedia: errors of a left group no longer replace the new group, a left group stops
    loading cards, and the detail dialog ignores a card opened earlier (`state.openedKey`).
  - Tested (local, 1280 px + 375 px): suggestions (deer, mag, crane), arrow keys + Enter, 4 quick
    radius clicks → last one shown (all points ≤ 5 km), Vancouver message at top center, quick
    Encyclopedia group switches → only Fish cards, dialog race.
  - Docs: Requirements v1.3 (27 pages; Figure 1 a bit smaller): FR-13 (suggestions), NFR-01
    (cache, 25 s), UC-10 step 4 + A4/A5, UC-13 step 2 + A7, scope (Render online), architecture
    text, traceability, dependencies. System Design v1.1 (25 pages): components (file cache,
    animal list), new **4.8 File Cache**, rule 6 of 4.7, D3 File Cache (not drawn in Figure 5),
    6.2 #15, 6.6 (message position, new rows), 6.7, traceability.
  - **Later the same day:** user said the documents are submitted and frozen → no more document
    rebuilds; new `CHANGELOG.md` tracks every change (full history back to 10 Sep) and what the
    final merged document needs. **Live location after Locate Me:** blue pulsing "You are here"
    dot + accuracy circle, follows the user (`watchPosition`), does not re-search on movement
    (`showLiveLocation()`, `followLiveLocation()` in app.js, `.live-dot` in style.css). Tested with
    a simulated GPS (dot moved 300 m, search stayed). Not in the documents yet (CHANGELOG "To do").
  - **User video ("profile ms.mp4"):** Chinese minnow shown as Invertebrates → GBIF gives most
    bony fish no class; Fish filter found 1 fish near Ulsan instead of 300. Fixed with 46 fish
    orders (gbif.php), cache version 2. **Search sightings button** (user request): filters wait
    for the button; sticky summary + amber "Apply filters & search" when changes are pending.
    Tested: 3 filter changes → 0 requests, 1 click → 1 request; phone layout. See CHANGELOG.
  - **User video ("function button overlap.mp4"):** the floating Search bar covered Filters → Max
    records. Sidebar is now `.sidebar-scroll` (settings, scrolls) + `.search-action` footer below it
    (phones: sticky at the screen bottom, page scrolls). Also: GBIF sends ~1 MB per 150 records
    uncompressed; the 15 s/25 s cut-off showed sample data on slow connections → attempts now stop
    only if not connected in 10 s or stalled (<2 KB/s for 8 s), max 40 s total. 150 recs 8.8 s,
    300 recs 24.7 s locally.
  - **Place suggestions** (user request): `api/places.php` → Photon (photon.komoot.io; Nominatim
    forbids autocomplete), Korea bbox, only place/natural/national park/nature reserve/park kinds,
    max 6, duplicate parks merged, cached 30 d (cache version 3). Picking goes straight there
    (`goToPlace()`); Enter without picking = old Nominatim search. Tested: "Jiri" → Jirisan NP
    picked with arrows + Enter; Enter right away → Gyeongju, list stays closed; fast typing → only
    the last list; phone layout. Photon fair-use: keep the 250 ms pause and the cache.
  - **Encyclopedia search** (user request): "Search all animals of South Korea" at the top and
    "Search mammals…/insects…" inside every group (12 groups). Both use `korea-animals.json`,
    rebuilt with taxon keys `t` (phylum, class or 204 for fish, order) so each animal's group is
    known (1967 of 2000 map to a group; millipedes, barnacles… only in the top search). Picking
    switches group + opens the card (`openAnimal()`); top-search Enter on other names uses
    animal.php. Also fixed: Encyclopedia sidebar lost its scrolling after the Map sidebar change
    (now `.sidebar-scroll` too). Suggestions have spoken names (aria-label) on both pages.
    Tested: "dragonf" → Insects + Butterfly Dragonfly card; "bee" in Insects; "magpie" in Insects
    → message; "tiger" → card; phone layout; no console errors.

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
- **Dates start empty.** ~~Filters apply as soon as they change; no "Query Sightings" button.~~
  **Changed 19 Oct (user feedback):** filter changes wait for the **"Search sightings"** button at
  the bottom of the sidebar, with a summary of the search ("Changes not applied yet" when pending).
- **Fish (19 Oct):** GBIF gives most ray-finned fish no class; they are found and labelled by their
  order (46 fish orders, `FISH_ORDER_KEYS` in `includes/gbif.php`). Re-check if GBIF fixes this.
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
  both ways. ("Worldwide" was removed on 10 Oct.)
- **No revision history** in any PDF (10 Oct, user's decision).
- **Fish kept** as an animal group (10 Oct).
- **End user / community-impact feature:** dropped as not relevant now (10 Oct).
- **AI use:** commits made with AI help carry a `Co-Authored-By` line, in line with the syllabus.
- **South Korea focus (14 Oct):** the place search only finds places in South Korea; the Quick
  Locations are all Korean. "Locate Me" still works anywhere.
- **Animal name lookup (14 Oct):** 3-step chain (GBIF match → Wikipedia/Wikidata → "Did you
  mean…" list), chosen over a suggestion list alone, because GBIF's name search can't find "tiger".

## File structure
```
CAPR-F2026-WildlifeTracker/
├── NOTES.md                  this file
├── CLAUDE.md                 standing instructions for Claude Code (read automatically)
├── README.md                 project summary and team
├── docs/build/               scripts that generate the documents + figures
│   ├── common.js             shared helpers (text, tables, figures, page styles)
│   ├── build.js              Requirements Analysis v1.3 text
│   ├── design.js             System Design v1.1 text
│   ├── diagrams.js           all figures (use case, architecture, flowcharts, ERD, DFDs)
│   ├── finalize.ps1          Word: update contents page, export PDF
│   └── fix_links.py          Google Drive copy of a PDF (working contents links)
├── config/
│   ├── config.example.php    template (copy to config.php)
│   └── config.php            local settings and credentials (git-ignored)
├── includes/
│   ├── gbif.php              GBIF client: query builder, retry ×3 (25 s max), sample-data fallback
│   ├── cache.php             file cache for answers from GBIF, Nominatim, Wikipedia (temp folder)
│   ├── config.php            app_config(): settings from config.php or config.example.php + env
│   └── db.php                PDO connection (not used yet)
├── public/                   web root
│   ├── index.php             Map page (home)
│   ├── encyclopedia.php      Animal Encyclopedia page
│   ├── partials/header.php   shared top bar (Map | Encyclopedia | About) + About dialog
│   ├── css/style.css         all styles
│   ├── js/app.js             app logic: search, filters, map, table, profile, suggestions
│   ├── data/korea-animals.json  2000 Korean animals for the suggestions (made by tools/)
│   └── api/
│       ├── geocode.php       place name → lat/lng (Nominatim)
│       ├── sightings.php     occurrences near a point (GBIF), with filters
│       ├── animal.php        animal name → GBIF species key (match, Wikipedia/Wikidata, suggestions)
│       └── species.php       taxonomy + photo for a speciesKey (MySQL cache, else GBIF)
├── sql/schema.sql            species_cache only (used by species.php)
├── tools/build-animal-list.php  makes public/data/korea-animals.json (run by hand)
├── Dockerfile, .dockerignore  how Render builds the online site
└── .github/workflows/keep-awake.yml  opens the Render site every 10 min (no sleeping)
```

## Remaining to-dos
- [ ] After pushing the 19 Oct work: check GitHub → Actions → "Keep the website awake" runs
      (green ✓ every ~10 min) and that the live site shows the suggestions and top-center messages.
      Ask the users who gave feedback to try again (usability evidence for Week 11).
- [ ] Re-run `tools/build-animal-list.php` before the final submission so the suggestion list is fresh.
**Deadlines (all 11:59 PM; full schedule in "Course schedule"):** System Design Oct 17 (submitted
Oct 12) · Week 7 progress review (in class) · Working Prototype Nov 3 · Project
Finalization Nov 26 · Presentation Dec 2 (Group 3 is in Presentation 1).

- [ ] Add a contribution row for the v1.2/v1.3 revisions if the team wants one (who did what).
- [x] Drive contents links tested: the `_drive.pdf` works; `fix_links.py` is a standard step.
- [ ] Each member writes their **individual progress PDF** (tasks, timeline, tools).
- [x] System Design submitted; professor approved the Encyclopedia (12 Oct).
- [x] Requirements Analysis v1.3 includes the Encyclopedia (FR-12, UC-12). Ask the professor
      whether v1.3 should be submitted again or kept for the final submission (Nov 26).
- [x] Map <-> Encyclopedia links (14 Oct).
- [x] Docs updated for the 14 Oct UX fixes: System Design v1.1 (22 pages: Figure 6/7 new
      buttons, new 6.5 Phone Layout + Figure 8, 6.6 Messages, new 6.7 Accessibility, traceability);
      Requirements v1.3 (25 pages: NFR-06, UC-01 A5, UC-07 A6–A7, UC-10 A4, UC-12 A7–A9).
- [ ] **Usability test** (3–5 classmates, 4 tasks) -> `docs/usability.md`, for UI/UX and Week 11.
- [ ] **Testing (20 pts, not started):** Paudel writes `docs/testing.md` (plan + test cases);
      first test run Oct 26–31, full run Nov 16–22. Bugs as GitHub issues.
- [ ] Each teammate resets their DB again (schema has new `summary`, `wiki_url` columns).
- [x] `species_cache` wired into `species.php`. Each teammate resets their local DB:
      `DROP DATABASE wildlife_tracker`, then import `sql/schema.sql`. Still untested: the
      "GBIF down, serve old row" rule (needs GBIF to fail).
- [x] Landing page removed (professor feedback). Map page is the home page again (index.php).
- [x] **Performance:** timeout 30 s -> 15 s and a "GBIF is slow" message after 5 s (14 Oct).
      Teammates must change `timeout` to 15 in their own `config/config.php`.
- [x] **Deployment on Render (free)**, asked for by the professor (a link to view the site).
      **Live since 14 Oct: https://wildtrack-lq88.onrender.com** (service "Wildtrack", Singapore,
      auto-deploy on commit). Tested online: Map, Find an Animal (tiger, water deer, magpie),
      Korea-only search, Encyclopedia with photos, phone width; config/ and includes/ are not
      reachable from the web. Commits `db13cdd` and `998e5a0` (summary "commit") were made with
      AI help but have no Co-Authored-By line; recorded here.
      Prepared 14 Oct: `Dockerfile` (PHP 8.3 + Apache, web root `public/`, listens on `$PORT`),
      `.dockerignore`, and `includes/config.php` (`app_config()`): uses `config/config.php` if it
      exists, else `config.example.php`; env vars `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`,
      `DB_PASSWORD` set the database; with no config.php and no `DB_HOST` there is no database
      and the species cache is skipped (site works, Encyclopedia loads slower). Tested with
      PHP's built-in server and no config.php (all endpoints, Map, Encyclopedia); the Docker
      image itself was not built locally (Docker not installed), so the first Render build is
      its first real test (it passed). Set up: Render account with GitHub (access to this repo
      only), New → Web Service → Docker, Free, region Singapore. Free plan sleeps after ~15 min
      idle (first visit ~1 min). Render has no free MySQL (only Postgres), so no cache online.
- [ ] Teammates should commit from their **own GitHub accounts**; set up a GitHub Issues /
      Projects task board.
- [ ] Update `README.md` with the Map and Encyclopedia pages, the animal groups and the
      Find an Animal search (South Korea only).
- [x] 14 Oct Korea-focus + Find an Animal work committed and pushed (`34e5284` app, `84dddeb`
      docs; an earlier all-in-one commit `04dc54e` was reverted by `745beb6`). Both commits were
      made with AI help, but their `Co-Authored-By` line is missing; this is recorded in the
      commit that updates these notes.
- [ ] Optional: Requirements 7.1 table (objectives → FRs) has no row for FR-12 Encyclopedia
      (FR-13 was added); add one if the team wants it complete.
- [ ] Testing: add test cases for UC-13 (tiger, magpie list, scientific name, nonsense name).
- [x] Document build scripts are now in `docs/build` (see its README to rebuild).
- [ ] Before deployment, check Esri tile terms and test on Chrome, Firefox and Edge (NFR-02)
      and at small screen widths (NFR-06).
- [x] Location column: country now shown in grey when GBIF gives no locality (14 Oct).
