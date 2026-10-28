# WildTrack — Test Plan and Test Cases

**Project:** WildTrack (CAPR-F2026, Group 3) · **Live site:** https://wildtrack-lq88.onrender.com
**Test lead:** Paudel Amrit (QA) · **Testers:** all three members
**Test period:** first run Week 10 (before the Working Prototype, Nov 3), full run Week 11,
results in the testing report (Week 12)

---

## 1. What is tested

| Area | Requirements | Test cases |
|---|---|---|
| Place search, Quick Locations, Locate Me, place suggestions | FR-01, FR-11 | TC-01 – TC-10 |
| Map, base maps, legend | FR-02, FR-08 | TC-11 – TC-14 |
| Sightings: pins, table, filters, Search button | FR-03 – FR-06 | TC-15 – TC-26 |
| Species Profile and GBIF link | FR-07, FR-09 | TC-27 – TC-31 |
| Messages and loading states | FR-10 | TC-32 – TC-36 |
| Find an Animal | FR-13 | TC-37 – TC-43 |
| Animal Encyclopedia and its searches | FR-12 | TC-44 – TC-55 |
| Non-functional requirements | NFR-01 – NFR-08 | TC-56 – TC-68 |
| Usability test with users | NFR-05 | Section 6 |

**Not tested:** the external services themselves (GBIF, Nominatim, Photon, Wikipedia), only how
WildTrack uses them and what it does when they fail.

## 2. Test environment

| Item | Details |
|---|---|
| Online | https://wildtrack-lq88.onrender.com (Render, free plan, no database) |
| Local | XAMPP (Apache + PHP 8, MySQL optional), http://localhost/CAPR-F2026-WildlifeTracker/public/ |
| Browsers | Chrome, Firefox, Edge (latest) on Windows; Chrome or Samsung Internet on an Android phone; Safari on an iPhone if a team member has one |
| Screen sizes | Desktop (1280 px or wider), tablet (about 800 px), phone (about 375 px) |

Write the **browser** in the Notes column when it is not Chrome on a desktop.

## 3. How to report a result

- **Pass:** the system does exactly what "Expected result" says.
- **Fail:** anything else. Open a GitHub Issue with the **Bug report** template
  (Issues → New issue → Bug report), write the test case ID in the title, for example
  "TC-21: radius circle does not change", and put the issue number in the Notes column.
- **Blocked:** the test could not be run (for example GBIF was down). Say why in Notes.
- Re-test a failed case after the fix and add a second line: "Re-test: Pass, date".

**Severity** in bug reports: *High* = a main task cannot be done (search, see sightings,
open a species) · *Medium* = it works but wrongly or confusingly · *Low* = cosmetic.

---

## 4. Functional test cases

Unless a step says otherwise, start on the Map page, with the default search (Busan, 10 km).

### 4.1 Place search (FR-01, FR-11)

| ID | Test | Steps | Expected result | Result | Tester | Date | Notes |
|---|---|---|---|---|---|---|---|
| TC-01 | Search a city | Type `Ulsan`, press Enter | Map moves to Ulsan; message "Found: Ulsan"; radius circle and pins for Ulsan | Pass | Paudel Amrit | 2026-10-27 | Chrome, localhost |
| TC-02 | Search button | Type `Gyeongju`, click the magnifier | Same as TC-01, for Gyeongju | Pass | Paudel Amrit | 2026-10-27 | Chrome, localhost |
| TC-03 | Empty search | Clear the box, press Enter | Message "Please enter a location or city name"; map unchanged | Pass | Paudel Amrit | 2026-10-27 | Chrome, localhost |
| TC-04 | Place outside Korea | Type `Vancouver`, press Enter | Message "Place not found in South Korea — try a different spelling"; map unchanged | Pass | Paudel Amrit | 2026-10-27 | Chrome, localhost |
| TC-05 | Place suggestions | Type `Jiri` slowly | Within about 2 s a list of places in Korea appears under the box (e.g. Jirisan National Park), each with an icon and its area; typed letters in bold | Pass | Paudel Amrit | 2026-10-27 | Chrome, localhost |
| TC-06 | Pick a place suggestion | Type `Seor`, choose "Seoraksan National Park" with ↓ and Enter | Map moves there; message "Found: Seoraksan National Park, …"; sightings load | Pass | Paudel Amrit | 2026-10-27 | Chrome, localhost |
| TC-07 | Close the suggestions | Type `Hall`, press Esc | The list closes; the typed text stays | Pass | Paudel Amrit | 2026-10-27 | Chrome, localhost |
| TC-08 | Quick Location | Click the chip **Jeju Island** | Chip is highlighted; map moves to Jeju; sightings load | Pass | Paudel Amrit | 2026-10-27 | Chrome, localhost |
| TC-09 | Locate Me (allowed) | Click **Locate Me**, allow location access | Box shows "Current Location (GPS)"; a blue dot marks your position; sightings around you load | Pass | Paudel Amrit | 2026-10-27 | Chrome, localhost |
| TC-10 | Locate Me (refused) | Click **Locate Me**, block location access | Message "Could not retrieve current location: …"; map unchanged | Pass | Paudel Amrit | 2026-10-27 | Chrome, localhost; location blocked in Site settings |

### 4.2 Map and legend (FR-02, FR-08)

| ID | Test | Steps | Expected result | Result | Tester | Date | Notes |
|---|---|---|---|---|---|---|---|
| TC-11 | Pan and zoom | Drag the map; use the mouse wheel and the + / − buttons | Map moves and zooms; pins and circle stay in the right places | Pass | Paudel Amrit | 2026-10-27 | Chrome, localhost |
| TC-12 | Base maps | Click **Satellite**, **Topographic**, then **Street** | The background changes each time; pins stay | Pass | Paudel Amrit | 2026-10-27 | Chrome, localhost |
| TC-13 | Recenter | Drag the map away, click the crosshair button | Map returns to the searched place | Pass | Paudel Amrit | 2026-10-27 | Chrome, localhost |
| TC-14 | Legend | Compare pin colors and icons with the Animal Groups legend | Every pin's color and icon matches a group in the legend | Pass | Paudel Amrit | 2026-10-27 | Chrome, localhost |

### 4.3 Sightings and filters (FR-03 – FR-06)

| ID | Test | Steps | Expected result | Result | Tester | Date | Notes |
|---|---|---|---|---|---|---|---|
| TC-15 | Default search | Open the Map page | Pins appear; table shows "Showing 1–10 of 75" (or fewer); first sighting shown in Species Profile | Pass | Paudel Amrit | 2026-10-27 | Chrome, localhost |
| TC-16 | Table paging | Click the › and ‹ arrows above the table | Next / previous 10 rows; counter updates | Pass | Paudel Amrit | 2026-10-27 | Chrome, localhost |
| TC-17 | Change radius | Click **25 km** | Circle and label change to 25 km at once; summary says "Changes not applied yet"; button turns amber "Apply filters & search"; **no** new search yet | Pass | Paudel Amrit | 2026-10-27 | Chrome, localhost |
| TC-18 | Apply filters | After TC-17, click **Apply filters & search** | Sightings within 25 km load; summary says "Showing … · 25 km …"; button back to "Search sightings" | Pass | Paudel Amrit | 2026-10-27 | Chrome, localhost |
| TC-19 | One group | Untick all groups except **Birds**, click the Search button | Only bird pins and rows | Pass | Paudel Amrit | 2026-10-27 | Chrome, localhost |
| TC-20 | Fish filter | Search Ulsan, tick only **Fish**, click the Search button | Fish appear (pins with the fish icon), not "No fauna records" | Pass | Paudel Amrit | 2026-10-27 | Chrome, localhost |
| TC-21 | No group | Untick all six groups, click the Search button | Message "Select at least one animal group"; map and table empty | Pass | Paudel Amrit | 2026-10-27 | Chrome, localhost |
| TC-22 | Date range | Set From = 2025-01-01, To = 2025-12-31, click the Search button | Every row's date is in 2025 | Pass | Paudel Amrit | 2026-10-27 | Chrome, localhost |
| TC-23 | Only a To date | Clear From, set To = 2020-12-31, search | All dates are on or before 2020-12-31 | Pass | Paudel Amrit | 2026-10-27 | Chrome, localhost |
| TC-24 | Wrong date order | From = 2025-06-01, To = 2025-01-01, search | Message 'The "From" date must be on or before the "To" date'; no search | Pass | Paudel Amrit | 2026-10-27 | Chrome, localhost |
| TC-25 | Max records | Filters → Max records = 150, search | Table shows "… of 150" (if the area has that many) | Pass | Paudel Amrit | 2026-10-27 | Chrome, localhost; Busan 25 km |
| TC-26 | Max records visible | Open **Filters** on a short window or a laptop screen; scroll the sidebar to the bottom | "Max records" is fully visible above the Search button (not covered) | Pass | Paudel Amrit | 2026-10-27 | Chrome, localhost; short window |

### 4.4 Species Profile (FR-07, FR-09)

| ID | Test | Steps | Expected result | Result | Tester | Date | Notes |
|---|---|---|---|---|---|---|---|
| TC-27 | Select a pin | Click any pin | Pin gets bigger; table row highlighted; Species Profile shows photo, group, names, taxonomy, date, locality, coordinates | Pass | Paudel Amrit | 2026-10-27 | Chrome, localhost |
| TC-28 | View button | Click **View** in a table row | Map zooms to that sighting; Species Profile shows it | Pass | Paudel Amrit | 2026-10-27 | Chrome, localhost |
| TC-29 | Fish group | Search Ulsan, select a fish (e.g. Chinese minnow) | Badge says **Fish** (not Invertebrates); Class "Actinopterygii" | Pass | Paudel Amrit | 2026-10-27 | Chrome, localhost; Ulsan, fish badge + Class Actinopterygii |
| TC-30 | GBIF link | Click **Explore on GBIF Network** | GBIF page of the species opens in a new tab; WildTrack stays open | Pass | Paudel Amrit | 2026-10-27 | Chrome, localhost |
| TC-31 | Close profile | Click X in the Species Profile (or press Esc) | Selection cleared; "Select a sighting…" shown | Pass | Paudel Amrit | 2026-10-27 | Chrome, localhost |

### 4.5 Messages and loading (FR-10)

| ID | Test | Steps | Expected result | Result | Tester | Date | Notes |
|---|---|---|---|---|---|---|---|
| TC-32 | Message position | Do TC-04 | The message appears at the **top center** under the header and stays about 5 seconds | Pass | Paudel Amrit | 2026-10-27 | Chrome, localhost; top center, about 5 s |
| TC-33 | No repeated messages | Click the Search button of TC-04 three times quickly | The same message is shown once, not three times | Pass | Paudel Amrit | 2026-10-27 | Chrome, localhost |
| TC-34 | Loading message | Search **100 km** with **Max records 300** | Spinner with "Querying GBIF biodiversity records…"; after 5 s "GBIF is slow right now — still loading…" if still loading | Pass | Paudel Amrit | 2026-10-27 | Chrome, localhost; Seoul 100 km / 300; "GBIF is slow" message shown |
| TC-35 | Quick changes | Click 100, 50, 25 and 5 km and the Search button quickly in a row | The final map shows the **last** choice (5 km); no mix of older results | Pass | Paudel Amrit | 2026-10-27 | Chrome, localhost |
| TC-36 | GBIF unreachable (local only) | In `config/config.php` set GBIF `base_url` to `https://example.invalid`, search, then undo the change | Sample data shown with "GBIF is unreachable — showing sample data (filters not applied)" | Pass | Paudel Amrit | 2026-10-27 | Chrome, localhost; base_url changed and restored |

### 4.6 Find an Animal (FR-13)

| ID | Test | Steps | Expected result | Result | Tester | Date | Notes |
|---|---|---|---|---|---|---|---|
| TC-37 | Suggestions | Type `mag` in Find an Animal | Up to 6 animals; Oriental Magpie and Eurasian Magpie near the top; letters in bold; records in Korea shown | Pass | Paudel Amrit | 2026-10-27 | Chrome, localhost |
| TC-38 | Pick a suggestion | Choose Oriental Magpie | Bar "Showing only Oriental Magpie"; only magpie pins | Pass | Paudel Amrit | 2026-10-27 | Chrome, localhost |
| TC-39 | Common name | Type `water deer`, press Enter | Only water deer sightings; bar "Showing only …" | Pass | Paudel Amrit | 2026-10-27 | Chrome, localhost |
| TC-40 | Scientific name | Type `Pica pica`, press Enter | Only that species is shown | Pass | Paudel Amrit | 2026-10-27 | Chrome, localhost |
| TC-41 | Not recorded nearby | Type `tiger`, press Enter | Message "No Tiger sightings within … km of …. Try a larger radius, or show all animals." | Pass | Paudel Amrit | 2026-10-27 | Chrome, localhost |
| TC-42 | Unknown name | Type `xyzzy`, press Enter | Message 'No animal called "xyzzy" was found. Check the spelling or try the scientific name.' | Pass | Paudel Amrit | 2026-10-27 | Chrome, localhost |
| TC-43 | Show all animals | After TC-38, click **Show all animals** | Bar disappears; all animals shown again | Pass | Paudel Amrit | 2026-10-27 | Chrome, localhost |

### 4.7 Animal Encyclopedia (FR-12)

| ID | Test | Steps | Expected result | Result | Tester | Date | Notes |
|---|---|---|---|---|---|---|---|
| TC-44 | Open page | Click **Encyclopedia** in the header | Mammals open; up to 24 cards fill with photo, name and summary | Pass | Paudel Amrit | 2026-10-27 | Chrome, localhost |
| TC-45 | Every group | Click each of the 12 groups in the tree | Each shows its introduction and cards (or "GBIF has no records of this group in South Korea yet.") | Pass | Paudel Amrit | 2026-10-27 | Chrome, localhost; all 12 groups |
| TC-46 | Fish list | Open **Fish** | Freshwater fish such as Zacco platypus or crucian carp are in the list | Pass | Paudel Amrit | 2026-10-27 | Chrome, localhost |
| TC-47 | Detail card | Click a card | Dialog with photo, description, IUCN status, records in South Korea, classification | Pass | Paudel Amrit | 2026-10-27 | Chrome, localhost |
| TC-48 | Close dialog | Close with X, Esc and a click outside | Dialog closes each time | Pass | Paudel Amrit | 2026-10-27 | Chrome, localhost; X, Esc and click outside |
| TC-49 | Wikipedia / GBIF links | In a dialog click **Read more on Wikipedia** and **Explore on GBIF** | Each opens in a new tab | Pass | Paudel Amrit | 2026-10-27 | Chrome, localhost |
| TC-50 | See on the map | In a dialog click **See … on the map** | Map page shows only that species around the last searched place | Pass | Paudel Amrit | 2026-10-27 | Chrome, localhost |
| TC-51 | Search all animals | Type `dragonf` in the top search, pick Butterfly Dragonfly | Page switches to **Insects** and opens its card | Pass | Paudel Amrit | 2026-10-27 | Chrome, localhost |
| TC-52 | Search all: other name | Type `tiger` in the top search, press Enter | The tiger card opens | Pass | Paudel Amrit | 2026-10-27 | Chrome, localhost |
| TC-53 | Search in a group | Open Insects, type `bee` in "Search insects…" | Only insects are suggested (e.g. Western honey bee) | Pass | Paudel Amrit | 2026-10-27 | Chrome, localhost |
| TC-54 | Wrong group | In Insects, type `magpie`, press Enter | Message that no insect has this name, pointing to the top search | Pass | Paudel Amrit | 2026-10-27 | Chrome, localhost |
| TC-55 | Map → Encyclopedia | On the Map, select a bird, click **Read about it in the Encyclopedia** | Encyclopedia opens Birds with that bird's card | Pass | Paudel Amrit | 2026-10-27 | Chrome, localhost |

---

## 5. Non-functional test cases

| ID | Requirement | Test | Expected result | Result | Tester | Date | Notes |
|---|---|---|---|---|---|---|---|
| TC-56 | NFR-01 Performance | On the live site (open it once first), time 5 searches (Busan, Seoul, Jeju, Ulsan, Seoraksan; 10 km, 75 records) with a stopwatch | Each loads within about 5 s; write the 5 times in Notes | Pass | Shubham | 2026-10-28 | Live site, first (uncached) search incl. place lookup: Busan 3.6 s, Seoul 3.8 s, Jeju Island 3.7 s, Ulsan 3.2 s, Seoraksan 3.7 s; 75 records each |
| TC-57 | NFR-01 Repeat | Repeat one search of TC-56 | Loads at once (from the cache) | Pass | Shubham | 2026-10-28 | All 5 searches repeated: 0.12–0.14 s each (Busan 0.13 s) |
| TC-58 | NFR-02 Chrome | Run TC-01, TC-18, TC-27, TC-37, TC-44, TC-51 in Chrome | All pass | Pass | Aman | 2026-10-27 | Chrome (Windows): TC-01, 18, 27, 37, 44, 51 pass |
| TC-59 | NFR-02 Firefox | The same six tests in Firefox | All pass | Pass | Aman | 2026-10-27 | Firefox (Windows), same six tests |
| TC-60 | NFR-02 Edge | The same six tests in Edge | All pass | Pass | Aman | 2026-10-27 | Edge (Windows): TC-01, 18, 27, 37, 44, 51 pass |
| TC-61 | NFR-03 Security | Open `…/config/config.php` and `…/includes/config.php` on the live site; search the GitHub repository for "password" | Not found / not shown (404); no password or key on GitHub | Pass | Aman | 2026-10-27 | …/config/config.php shows Not Found (404) |
| TC-62 | NFR-04 Retry | See TC-36 | Sample data shown, not an empty page | Pass | Shubham | 2026-10-28 | Local copy (PHP 8.3), GBIF base_url = https://example.invalid: sightings.php returned 5 sample records with "fallback": true after 3.9 s; config restored |
| TC-63 | NFR-05 No account | Use every feature without signing in | No login is ever asked for | Pass | Aman | 2026-10-27 | No sign-in asked anywhere (Map, Encyclopedia, all searches) |
| TC-64 | NFR-06 Phone | On a phone: search a place, open a pin, open the Encyclopedia, search an animal | Map first; "Search & filters" opens the settings; buttons easy to tap; nothing cut off | Pass | Aman | 2026-10-27 | Phone |
| TC-65 | NFR-06 Tablet | Same as TC-64 at about 800 px wide | Everything usable | Pass | Aman | 2026-10-27 | Narrow browser window |
| TC-66 | NFR-06 Keyboard | Use only Tab, Enter, arrow keys and Esc: search a place, pick a suggestion, open a card | Everything reachable; a green outline shows the focus | Pass (re-test) | Aman | 2026-10-27 | First run: Fail (Tab to a suggestion: no highlight, Enter did nothing), bug #13. Fixed in fb5f735; re-test: Pass |
| TC-67 | NFR-07 Free hosting | Check the Render dashboard plan | Free plan, $0 | | | | |
| TC-68 | NFR-08 Structure | Look at the folders (public/api, includes, config) | Configuration, data access, external APIs and pages are in separate files | | | | |

### 5.1 API endpoint checks (issue #3)

Each endpoint opened on the live site (https://wildtrack-lq88.onrender.com/api/…); the time is the response time measured in the browser.

| ID | Endpoint | Expected result | Result | Tester | Date | Notes |
|---|---|---|---|---|---|---|
| API-01 | `geocode.php?q=Ulsan` | lat, lng and displayName | Pass | Shubham | 2026-10-28 | 200; "Ulsan, South Korea", 35.539, 129.312; 0.7 s |
| API-02 | `geocode.php?q=Vancouver` | "not found in South Korea" error | Pass | Shubham | 2026-10-28 | 404; "Place not found in South Korea — try a different spelling"; 0.4 s |
| API-03 | `places.php?q=Jiri` | Up to 6 places in Korea | Pass | Shubham | 2026-10-28 | 200; 6 places, all in Korea (e.g. Jirisan National Park, Hamyang); 0.9 s |
| API-04 | `sightings.php?lat=35.1796&lng=129.0756&radius=10&limit=75` | 75 results | Pass | Shubham | 2026-10-28 | 200; count 75, no fallback |
| API-05 | `sightings.php?…&from=2025-06-01&to=2025-01-01` | Date-order error | Pass | Shubham | 2026-10-28 | 400; "The From date must be on or before the To date" |
| API-06 | `species.php?speciesKey=2440931` | Taxonomy and summary of the Chinese water deer | Pass | Shubham | 2026-10-28 | 200; Hydropotes inermis, Mammalia › Artiodactyla › Cervidae; summary, photo, Wikipedia and GBIF links; 2.5 s (first request) |
| API-07 | `animal.php?q=tiger` | Found, key 5219416 | Pass | Shubham | 2026-10-28 | 200; found: Tiger, Panthera tigris, key 5219416; 3.1 s (first request) |
| API-08 | `encyclopedia.php?action=top&taxa=359&country=KR` | A total and 24 species | Pass | Shubham | 2026-10-28 | 200; total 196,441 records, 24 species |
| API-09 | TC-61 re-check (security) | No config file or password exposed | Pass | Shubham | 2026-10-28 | config/config.php, includes/config.php, config/config.example.php and includes/gbif.php all 404 on the live site; repository search for "password": only the empty value in config.example.php and code that reads it |

---

## 6. Usability test (3–5 classmates)

**Goal:** check that people who have never used WildTrack can do the main tasks without help
(NFR-05). About 10 minutes per person. One team member observes and writes notes; do not help
unless the person is completely stuck (then note it).

**Tasks** (read them out one by one):
1. "Find which animals have been recorded near **Seoraksan**."
2. "Show only **birds** within **25 km** of that place."
3. "Find out what the **first animal in the list** is, and open its page on GBIF."
4. "Has a **water deer** been recorded near **Busan**?"
5. "In the Encyclopedia, find the **Chinese water deer** and say whether it is endangered."

| Participant | Task 1 | Task 2 | Task 3 | Task 4 | Task 5 | Comments |
|---|---|---|---|---|---|---|
| P1 | | | | | | |
| P2 | | | | | | |
| P3 | | | | | | |
| P4 | | | | | | |
| P5 | | | | | | |

Write for each task: **✓** done alone · **~** done with a hint · **✗** not done, plus the time in seconds.

**After the tasks**, ask (1 = strongly disagree, 5 = strongly agree):

| Question | P1 | P2 | P3 | P4 | P5 |
|---|---|---|---|---|---|
| The website was easy to use. | | | | | |
| I always knew what the website was doing (loading, results, errors). | | | | | |
| The search suggestions helped me. | | | | | |
| The results were fast enough. | | | | | |
| I would use WildTrack again. | | | | | |

And one open question: *"What would you change first?"*

---

## 7. Summary (fill in after the test run)

| | Number |
|---|---|
| Test cases run | |
| Passed | |
| Failed (bug issues opened) | |
| Blocked | |
| Bugs fixed and re-tested | |

These numbers, the usability results and the most important bugs go into the testing report
(Week 12).
