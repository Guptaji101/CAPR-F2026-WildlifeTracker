# WildTrack — Change Log

Every change to the website and the documents, newest first, so the team can see what changed,
when, and why. Add a new entry for every change (Claude does this in every session).

- **Live site:** https://wildtrack-lq88.onrender.com · **Code:** https://github.com/Guptaji101/CAPR-F2026-WildlifeTracker
- The exact code of each change is in the Git history (GitHub → Commits); this file explains it in plain words.

---

## For the final submission (merged document, due Nov 26)

The Requirements Analysis and the System Design are **submitted and frozen** (System Design
submitted 12 Oct; the submitted copy is `Downloads\System_Design_v1.1_submitted.docx`). They are
not changed any more. For the final submission all documents are merged into one, and that
document must describe the website as it is then. This list says what it must include.

"In draft" = already written in `docs/build` (the document sources) on that date. The working copies
`… (final version).docx` in Downloads show this text; they are **not** the submitted files.

| Changed on | What the final document needs | Where | Status |
|---|---|---|---|
| 14 Oct | UX review fixes: phone layout ("Search & filters", "Animal group"), messages, accessibility, NFR-06 | RA: NFR-06, UC-01 A5, UC-07 A6–A7, UC-10 A4, UC-12 A7–A9 · SD: 6.5, 6.6, 6.7, Figures 6–8 | In draft |
| 14 Oct | Map ↔ Encyclopedia links, remembered search, "Showing only …" species filter | RA: UC-03 A6, UC-12 A8 · SD: 6.1, 6.2, 6.4 #13, Figure 7 | In draft |
| 14 Oct | Place search limited to South Korea; Korean Quick Locations (Seoraksan, Suncheon Bay); "Found: …" message | RA: FR-01, UC-01, UC-10, UC-11 · SD: 3.3, 6.2 #2–3, 6.6 | In draft |
| 14 Oct | New feature **FR-13 / UC-13 Animal Name Search** (animal.php) | RA: FR-13, UC-13, Figure 1, Figure 2, traceability · SD: components, Figures 1, 4, 5 (process 6.0), 6.2 #15 | In draft |
| 14 Oct | Online on Render (Dockerfile, settings without config.php) | RA: scope 5.3, dependencies · SD: 3.1 | In draft |
| 19 Oct | Messages at the top center for 5 s | RA: UC-10 · SD: 6.6, 6.7 | In draft |
| 19 Oct | Animal suggestions while typing (korea-animals.json) | RA: FR-13, UC-13 step 2, A7 · SD: components, 6.2 #15, 6.7 | In draft |
| 19 Oct | File cache, time limit for GBIF, keep-awake job | RA: NFR-01, UC-10 A4 · SD: 4.7 rule 6, new 4.8, D3, 6.6 | In draft — **but the draft says "25 seconds"; correct it to: at most 40 s in total, an attempt is only stopped when GBIF can't be reached in 10 s or the data stalls** |
| 19 Oct | Sidebar: settings scroll above a fixed Search footer (no overlap) | SD: 6.2 (sidebar layout), Figure 6 | **To do** |
| 19 Oct | **Encyclopedia search:** "Search all animals" at the top + "Search mammals…" in every group, with suggestions | RA: FR-12 (search), UC-12 new alternative flows (search all / search in group) · SD: Figure 7 wireframe (two search boxes), 6.4 new elements, 6.7 (keyboard), components (korea-animals.json now also used by the Encyclopedia) | **To do** |
| 19 Oct | **Place suggestions while typing** (Photon, new `api/places.php`) | RA: FR-01 (suggestions), UC-01 new step + alternative flow (pick a suggestion), Photon as new external system / secondary actor (actors, Figure 1, dependencies) · SD: components, architecture Figure 1, DFD Figures 4–5 (Photon), 5.6, 4.8 (places cached 30 d), 6.2 #2 | **To do** |
| 19 Oct | Late answers ignored (no mixed-up results) | RA: UC-10 A5 · SD: 6.6 | In draft |
| 19 Oct | **Live location dot after "Locate Me"** | RA: UC-01 A4 (a blue dot shows the user's position and moves with them) · SD: 6.2 #2, Figure 6 (dot on the map), 6.7 (reduced motion) | **To do** |
| 19 Oct | **Fish fix:** bony fish without a class in GBIF are found by their order and shown as Fish | RA: FR-04 (Fish = Actinopterygii, Elasmobranchii and 46 fish orders), decisions · SD: ANIMAL_GROUP entity (4.4), data dictionary note, 5.6 GBIF entity | **To do** |
| 19 Oct | **"Search sightings" button:** filter changes wait for the button; summary of the search above it | RA: UC-04, UC-05, UC-06 main flows (User changes filters → clicks "Search sightings" → UC-03), UC-03 trigger, FR-04–FR-06 wording · SD: 6.2 new element #16 (button + summary), Figure 6 (button at the bottom of the sidebar), Figure 8 (phone), 6.6 ("Changes not applied yet") | **To do** |

Also for the final document: the professor's comments on the submitted versions, the testing
results (Week 11–12), a user guide (Week 13), and the individual contributions.

---

## 19 Oct 2026

### Encyclopedia search (user suggestion)
- **"Search all animals of South Korea"** at the top of the Encyclopedia: suggestions while
  typing (up to 8) from the 2000 animals recorded most in South Korea, each with its group icon,
  scientific name, group and number of records. Picking one opens its group (for example Insects)
  and its detail card. Enter on a name that is not in the list ("tiger") looks it up like the
  Map page does (scientific name, Wikipedia, "Did you mean…").
- **"Search mammals…", "Search insects…" … inside every group** (all 5 vertebrate and 7
  invertebrate groups): suggestions only from that group — more than the 24 cards shown. Enter
  opens the exact or first match; if none, it says so and points to the search at the top.
- Keyboard: arrow keys, Enter, Esc, like the Map page's suggestions.
- To know each animal's group, `korea-animals.json` now also stores its phylum, class and order
  keys (`t`), and fish without a class get "Actinopterygii" and key 204 (rebuilt with
  `tools/build-animal-list.php`). The Map page's suggestions now also show fish with the fish icon.
- Also fixed: since the Map's sidebar change, the Encyclopedia's group tree could not scroll
  (it shares the sidebar style); it now has its own scrolling part too.
- Files: `public/encyclopedia.php`, `public/js/encyclopedia.js`, `public/css/encyclopedia.css`,
  `tools/build-animal-list.php`, `public/data/korea-animals.json`.

### Place suggestions while typing (user suggestion)
- The **Search Location** box now suggests places while the user types, like the animal box:
  from the second letter and after a short pause (250 ms), up to 6 places in South Korea —
  cities, districts, towns, villages, national parks, mountains, wetlands, beaches — with an icon
  for the kind and the area ("Jirisan National Park — Hamyang, South Gyeongsang"). Click or arrow
  keys + Enter goes straight there (the suggestion already has coordinates); Enter without
  picking still searches the typed name as before (Nominatim).
- Source: **Photon** (photon.komoot.io), a free geocoder on OpenStreetMap data made for
  search-as-you-type (Nominatim's usage policy does not allow it). Answers are cached for 30 days,
  so a beginning typed before is answered at once (≈0.02 s instead of ≈1.2 s). Photon is now
  credited in the About window.
- Late lists are ignored, and Enter or a pick cancels a list still on its way.
- Files: `public/api/places.php` (new), `public/js/app.js` (`goToPlace()`, `onPlaceInput()`,
  `loadPlaceSuggestions()`, `pickPlace()`, shared `onSuggestKey()`/`hideList()`),
  `public/index.php`, `public/partials/header.php`, `includes/cache.php` (version 3).

### Search button covered the "Max records" filter (user's video "function button overlap")
- The Search bar floated over the bottom of the scrolling sidebar, so on some screens the opened
  **Filters → Max records** box stayed hidden under it and could not be scrolled into view.
- Fix: the sidebar now has two parts: the settings scroll in their own box (`.sidebar-scroll`),
  and the Search bar is a footer **below** that box, so it can never cover a setting. On phones the
  whole page scrolls, so there the bar stays at the bottom of the screen and scrolling further
  always shows what is above it. Tested at window heights 640, 520 and 420 px and on a phone.
- Files: `public/index.php`, `public/css/style.css`.

### Big searches showed sample data on slow connections
- While testing the fix above, a search for 150 records showed the 5 sample records. GBIF does not
  compress its answers (150 records ≈ 1 MB, 300 ≈ 2 MB); on this connection they arrive at
  100–140 KB/s, and this morning's fixed 15-second cut-off per attempt (25 s in total) threw
  away answers that were still arriving.
- Fix: an attempt is only stopped when GBIF can't be reached within 10 s or the data stalls
  (under 2 KB/s for 8 s); a steadily arriving answer may take up to 40 s in total. Tested:
  150 records in 8.8 s and 300 in 24.7 s locally, real data both times (Render is much faster).
- Files: `includes/gbif.php`, `config/config.example.php` (comment: `timeout` no longer used here).

### Fish were shown as invertebrates (found in the user's video)
- In the video, "Chinese minnow" had a red **Invertebrates** badge and pin. Cause: GBIF no longer
  links most ray-finned fish (carp, loach, snakehead, medaka, seahorse …) to their class
  Actinopterygii; their records have phylum Chordata and an order, but no class. The app took the
  group from the class, so these fish fell into Invertebrates, and the **Fish filter found almost
  no fish** (near Ulsan: 1 instead of 300).
- Fix: a list of the 46 fish orders that GBIF leaves without a class (found from GBIF's own data)
  in `includes/gbif.php`. The Fish filter and the Encyclopedia's Fish list also search these
  orders, and such fish are named "Actinopterygii" (ray-finned fish), so badge, pin, color and
  the profile's Class are right. The file cache got a version number (`CACHE_VERSION = 2`) so old
  answers with the wrong group are no longer used.
- Files: `includes/gbif.php` (`FISH_ORDER_KEYS`, `gbif_expand_taxa()`, `gbif_class()`),
  `public/api/sightings.php`, `public/api/encyclopedia.php`, `public/api/species.php`,
  `includes/cache.php`, `public/js/app.js` (profile class for species saved earlier).

### "Search sightings" button (user suggestion)
- Changing the radius, animal groups, dates or max records **no longer searches at once**. A
  **Search sightings** button at the bottom of the sidebar (always visible while scrolling)
  starts the search. Above it a summary shows what will be searched, for example
  "Busan · 25 km · Birds, Mammals · max 75". After a change it says **"Changes not applied yet"**
  and the button turns amber ("Apply filters & search"); after the search it says "Showing …".
  The radius circle still changes at once so the user sees the area. Place searches, Quick
  Locations, Locate Me and Find an Animal still search at once (they are search actions).
  On phones the settings fold away after the search.
- Files: `public/index.php`, `public/js/app.js` (`markFiltersChanged()`, `updateSearchSummary()`),
  `public/css/style.css` (`.search-action`).
- This replaces the earlier decision "filters apply as soon as they change; no Query button".

### Live location after "Locate Me" (user suggestion)
- After **Locate Me**, a **blue dot** shows where the user is right now, with a light circle for
  the GPS accuracy and the tooltip "You are here (accurate to about 20 m)". The dot moves with
  the user (the browser reports each new position). Moving does not start a new search; clicking
  Locate Me again searches around the new position. The pulse stops for users who turn off
  animations (reduced motion).
- Files: `public/js/app.js` (`showLiveLocation()`, `followLiveLocation()`), `public/css/style.css` (`.live-dot`).

### Feedback from users: messages, suggestions, speed, wrong results
- **Messages** appear at the **top center** under the header for **5 seconds** (before: bottom
  right, 4 s), at most 3, no repeats, read aloud by screen readers.
  Files: `public/css/style.css`, `public/index.php`, `public/js/app.js` (`showToast()`).
- **Suggestions while typing** in Find an Animal, like a search engine: up to 6 animals from
  a list of the 2000 most-recorded animals in South Korea, best-known first, typed letters in
  bold; click or arrow keys + Enter, Esc closes. Place names get no suggestions (Nominatim's
  usage policy forbids autocomplete).
  Files: `public/data/korea-animals.json` (new), `tools/build-animal-list.php` (new, makes the
  list), `public/js/app.js`, `public/css/style.css`, `public/index.php`.
- **Faster:** server file cache for searches, places, animals, species and Encyclopedia lists
  (repeats in ~0.005 s instead of 1–6 s); the browser remembers the last 20 searches; GBIF
  retries stop after 25 s in total (before: up to 48 s); a GitHub Actions job opens the
  Render site every 10 minutes so it does not fall asleep (first visit was ~50 s).
  Files: `includes/cache.php` (new), `includes/gbif.php`, `public/api/*.php`,
  `.github/workflows/keep-awake.yml` (new), `.dockerignore`.
- **No more wrong or mixed-up results:** an older search that answers late is ignored; English
  names no longer appear in rows of a newer search (bug); in the Encyclopedia, a group you left no
  longer shows its error or keeps loading, and the dialog always shows the last card opened.
  Files: `public/js/app.js`, `public/js/encyclopedia.js`.
- Documents (draft for the final submission only): see the table above.

### Rules agreed
- The submitted documents are frozen; changes are collected here for the final merged document.

## 14 Oct 2026

- **Online:** WildTrack runs on Render (free) at https://wildtrack-lq88.onrender.com and updates
  after every push. `Dockerfile`, `.dockerignore`, `includes/config.php` (settings work without
  `config/config.php`; no database online). Commit `db13cdd`.
- **Course schedule, late policy and rubric** added to `NOTES.md`. Commit `998e5a0`.
- **Find an Animal** (FR-13 / UC-13): type "tiger", "water deer" or "Pica pica"; the map shows
  only that species. Name lookup: GBIF species match → Wikipedia + Wikidata → "Did you mean…" list.
  Message when the animal has no sightings near the place. New `public/api/animal.php`. Commit `34e5284`.
- **South Korea focus:** place search only finds places in South Korea, in English; Quick
  Locations Seoraksan and Suncheon Bay replace Tokyo and Vancouver; "Found: …" message.
- Bug fixed: error messages showed raw JSON ("HTTP 404: {…}").
- Documents updated for FR-13 (`84dddeb`). An earlier all-in-one commit (`04dc54e`) was reverted (`745beb6`).
- **Map ↔ Encyclopedia:** the Map remembers the last search; "See … on the map" shows one
  species with a "Showing only …" bar (`b0a7226`).
- **UX review fixes:** phone layout, "GBIF is slow" message after 5 s, search button, labels,
  keyboard focus, alt text, bigger chips, compact legend, "Genus sp." names (`b73acfc`, docs `c18960e`).

## 12 Oct 2026
- System Design submitted. Professor approved the Encyclopedia. Requirements Analysis v1.3 with
  FR-12 / UC-12 (`6d4eecc`).

## 10 Oct 2026
- Encyclopedia limited to South Korea (`2865331`). Requirements Analysis v1.2, revision history
  removed from both documents (`c45be6c`).

## 9 Oct 2026
- **Animal Encyclopedia** page (`a4bee97`); shared header Map | Encyclopedia | About, unused
  buttons removed (`48856f2`); System Design expanded (`8e5dceb`).

## 7 Oct 2026
- Species details cached in MySQL `species_cache` (`2176d9d`); System Design build with ERD, DFDs,
  wireframes (`50c91c3`); Google Drive PDF link fix (`989740f`).

## 5 Oct 2026
- Document build scripts `docs/build` (`d80b702`), `NOTES.md` and `CLAUDE.md` (`5114af7`, `d6af064`).

## 29 Sep 2026
- **Dashboard redesign** to match the team's mockup: sidebar filters, sightings table, species
  profile (`d934b02`).

## 24 Sep 2026
- Fixes: sample-data fallback, date filter, Locate Me, legend (`962ec58`); "Other fauna" filter (`7252ac7`).

## 16 Sep 2026
- Location search (Nominatim, `e7c4abb`), species details endpoint (`be8e827`), filters and species
  panel (`1ec27fd`), GBIF distance fix and animals only (`47f0dc7`).

## 10 Sep 2026
- First version: project structure, GBIF connection, database schema, map prototype (`429e87d`).
