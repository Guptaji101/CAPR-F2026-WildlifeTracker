# Handoff Notes — WildTrack (CAPR-F2026, Group 3)

_Last updated: 5 Oct 2026_

## How to resume in a new Claude Code chat
1. Start Claude Code in this folder (`C:\xampp\htdocs\CAPR-F2026-WildlifeTracker`).
   `CLAUDE.md` is read automatically and points here.
2. Paste one clear starter prompt, for example:
   - `Read NOTES.md. Next task: System Design for Oct 17 — draft the ERD and data-flow diagram.`
   - `Read NOTES.md. Next task: build the landing page from the prototype.`
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
  (`docs/build/fix_links.py`). **Not yet confirmed in Drive.**

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
- Landing page **prototype** (HTML mock-up only, not built into the app).

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
- **AI use:** commits made with AI help carry a `Co-Authored-By` line, in line with the syllabus.

## File structure
```
CAPR-F2026-WildlifeTracker/
├── NOTES.md                  this file
├── CLAUDE.md                 standing instructions for Claude Code (read automatically)
├── README.md                 project summary and team
├── docs/build/               scripts that generate the requirements document + figures
│   ├── build.js              document text (requirements, use cases, tables)
│   ├── diagrams.js           figures (use case, architecture, flowcharts)
│   └── finalize.ps1          Word: update contents page, export PDF
├── config/
│   ├── config.example.php    template (copy to config.php)
│   └── config.php            local settings and credentials (git-ignored)
├── includes/
│   ├── gbif.php              GBIF client: query builder, retry ×3, sample-data fallback
│   └── db.php                PDO connection (not used yet)
├── public/                   web root
│   ├── index.php             dashboard page
│   ├── css/style.css         all styles
│   ├── js/app.js             app logic: search, filters, map, table, profile
│   └── api/
│       ├── geocode.php       place name → lat/lng (Nominatim)
│       ├── sightings.php     occurrences near a point (GBIF), with filters
│       └── species.php       taxonomy + photo for a speciesKey (GBIF)
└── sql/schema.sql            saved_locations, search_history, species_cache (designed, not connected)
```

## Remaining to-dos
**Deadlines (all 11:59 PM):** System Design Oct 17 · Working Prototype Nov 3 · Project
Finalization Nov 26 · Presentation Dec 2 (Group 3 is in Presentation 1).

- [ ] The latest v1.1 `.docx` is in Downloads. The `.pdf` there may be older if it was open in
      a viewer; rebuild with `docs/build` (see its README) and copy it over. Confirm the
      Requirement Specification submission and add a contribution row for the v1.1 revision.
- [ ] Upload `Week3_Requirements_Analysis_v1.1_drive.pdf` to Drive and test the contents links.
      If they work, add `fix_links.py` as a standard build step. If not, use the Drive bookmarks
      panel or open the .docx with Google Docs.
- [ ] Decide whether to keep **Fish** (remove the group in `app.js` `GROUPS` and the checkbox if not).
- [ ] Each member writes their **individual progress PDF** (tasks, timeline, tools).
- [ ] **System Design (Oct 17):** ERD, data flow, UI wireframes or mockups. Decide whether MySQL
      is used at all (for example, wire up `species_cache`) or drop it from the design.
- [ ] **Landing page:** review the prototype, agree changes, then build it in front of the map page.
- [ ] Choose **one specific end user and one community-impact feature** (the instructor's
      "think outside the box" note), and update the objectives, FRs and use cases to match.
- [ ] **Performance:** GBIF took about 15 s for Jeju in testing, against NFR-01's ~5 s target.
      The 30 s timeout in `config.php` means a hanging GBIF takes up to ~90 s before the
      fallback appears. Consider a shorter timeout.
- [ ] Teammates should commit from their **own GitHub accounts**; set up a GitHub Issues /
      Projects task board.
- [ ] Update `README.md` with the new dashboard and animal groups.
- [x] Document build scripts are now in `docs/build` (see its README to rebuild).
- [ ] Before deployment, check Esri tile terms and test on Chrome, Firefox and Edge (NFR-02)
      and at small screen widths (NFR-06).
- [ ] Minor: when GBIF gives no locality, the Location column shows the country.
