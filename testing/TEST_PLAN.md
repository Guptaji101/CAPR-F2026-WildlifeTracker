# WildTrack — Test Plan and Test Cases

**Project:** WildTrack (CAPR-F2026, Group 3) · **Live site:** https://wildtrack-lq88.onrender.com
**Test lead:** Paudel Amrit (QA) · **Testers:** all three members
**Test period:** first run Week 10 (before the Working Prototype, Nov 3), full run Week 11,
results in the testing report (Week 12)

---

## 1. What is tested

| Area | Requirements | Test cases |
|---|---|---|
| Place search, Quick Locations, Locate Me, place suggestions | FR-01, FR-11 | TC-01 – TC-10, TC-93 – TC-95 |
| Map, base maps, legend | FR-02, FR-08 | TC-11 – TC-14, TC-88 |
| Sightings: pins, table, filters, Search button | FR-03 – FR-06 | TC-15 – TC-26, TC-78 – TC-79 |
| Species Profile and GBIF link | FR-07, FR-09 | TC-27 – TC-31, TC-75 – TC-76, TC-80, TC-89 – TC-90, TC-96, TC-100 |
| Messages and loading states | FR-10 | TC-32 – TC-36, TC-87 |
| Find an Animal | FR-13 | TC-37 – TC-43, TC-69 – TC-72, TC-77, TC-81 – TC-86 |
| Animal Encyclopedia and its searches | FR-12 | TC-44 – TC-55, TC-73 – TC-74, TC-91 – TC-92, TC-98 – TC-99 |
| Non-functional requirements | NFR-01 – NFR-08 | TC-56 – TC-68, TC-97 |
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

Unless a step says otherwise, start on the Map page, with the default search (Ulsan, 10 km; Busan before 16 Nov).

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
| TC-93 | Place suggestions without Photon | In Search Location type `jiri`, then `haeun`; pick one with ↓ and Enter | A list of places in Korea appears (Jirisan National Park; Haeundae, Busan), from the built-in list of 438 places when Photon cannot be reached; picking one moves the map and shows "Found: …" | Pass | Paudel Amrit | 2026-11-16 | Live site after 0a68be0/11331b2 (Ctrl+F5), Chrome; jiri and haeun both listed; picking a place moved the map. Added 16 Nov |
| TC-94 | Quick Location at once | Click **Seoul** under Quick Locations | Map flies to Seoul at once (no "Geocoding…" spinner); message "Found: Seoul"; sightings load | Pass | Paudel Amrit | 2026-11-17 | Live site after b1e9ab8 (Ctrl+F5), Chrome; "Found: Seoul" at once. Added 17 Nov |
| TC-95 | Place suggestions near the map | With the map at Ulsan type `jung` in Search Location; then click **Seoul**, clear the box and type `jung` again | At Ulsan: **Jung-gu (Ulsan)** first, other cities' Jung-gu below; at Seoul the order changes (places nearer Seoul first) | Pass | Paudel Amrit | 2026-11-17 | Live site after b1e9ab8 (Ctrl+F5), Chrome; Order changed after moving to Seoul. Added 17 Nov |
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
| TC-88 | Legend on/off | Click **Birds** in the Animal Groups legend on the map, then click it again | Birds turn grey and bird pins disappear; the second click brings them back | Pass | Paudel Amrit | 2026-11-16 | Live site after 0a68be0/11331b2 (Ctrl+F5), Chrome; Birds off and on. Added 16 Nov |

### 4.3 Sightings and filters (FR-03 – FR-06)

| ID | Test | Steps | Expected result | Result | Tester | Date | Notes |
|---|---|---|---|---|---|---|---|
| TC-15 | Default search | Open the Map page | Pins for **Ulsan**; table "Showing 1–10 of 75"; first sighting in the Species Profile | Pass | Paudel Amrit | 2026-11-17 | Re-test after the search update: Live site after b1e9ab8 (Ctrl+F5), Chrome; Ulsan 10 km. Expected result updated 17 Nov. Earlier: Pass (Paudel Amrit, 2026-10-27) |
| TC-16 | Table paging | Click the › and ‹ arrows above the table | Next / previous 10 rows; counter updates | Pass | Paudel Amrit | 2026-10-27 | Chrome, localhost |
| TC-17 | Change radius | Click **25 km** | Circle and label change to 25 km at once and the search runs by itself after a moment; summary "Ulsan · 25 km · …" | Pass | Paudel Amrit | 2026-11-17 | Re-test after the search update: Live site after b1e9ab8 (Ctrl+F5), Chrome; 25 km searched by itself. Expected result updated 17 Nov. Earlier: Pass (Paudel Amrit, 2026-10-27) |
| TC-18 | Apply filters | After TC-17, click **Search sightings** | The same 25 km search runs again; the button stays "Search sightings" | Pass | Paudel Amrit | 2026-11-17 | Re-test after the search update: Live site after b1e9ab8 (Ctrl+F5), Chrome. Expected result updated 17 Nov. Earlier: Pass (Paudel Amrit, 2026-10-27) |
| TC-19 | One group | Untick all groups except **Birds** (no button) | After about half a second only bird pins and rows | Pass | Paudel Amrit | 2026-11-17 | Re-test after the search update: Live site after b1e9ab8 (Ctrl+F5), Chrome; Searched by itself, birds only. Expected result updated 17 Nov. Earlier: Pass (Paudel Amrit, 2026-10-27) |
| TC-20 | Fish filter | Search Ulsan, tick only **Fish**, click the Search button | Fish appear (pins with the fish icon), not "No fauna records" | Pass | Paudel Amrit | 2026-10-27 | Chrome, localhost. Re-test 2026-11-16 (Paudel Amrit), Live site after 0a68be0/11331b2 (Ctrl+F5), Chrome: Pass |
| TC-21 | No group | Untick all six groups, click the Search button | Message "Select at least one animal group"; map and table empty | Pass | Paudel Amrit | 2026-10-27 | Chrome, localhost. Re-test 2026-11-16 (Paudel Amrit), Live site after 0a68be0/11331b2 (Ctrl+F5), Chrome: Pass |
| TC-22 | Date range | Set From = 2025-01-01, To = 2025-12-31, click the Search button | Every row's date is in 2025 | Pass | Paudel Amrit | 2026-10-27 | Chrome, localhost |
| TC-23 | Only a To date | Clear From, set To = 2020-12-31, search | All dates are on or before 2020-12-31 | Pass | Paudel Amrit | 2026-10-27 | Chrome, localhost |
| TC-24 | Wrong date order | From = 2025-06-01, To = 2025-01-01, search | Message 'The "From" date must be on or before the "To" date'; no search | Pass | Paudel Amrit | 2026-10-27 | Chrome, localhost |
| TC-25 | Number of records | Under **Number of Records** click **150** | The search runs at once; table "… of 150"; above it "Showing 150 of N records in this area" when the area has more | Pass | Paudel Amrit | 2026-11-17 | Re-test after the search update: Live site after b1e9ab8 (Ctrl+F5), Chrome. Expected result updated 17 Nov. Earlier: Pass (Paudel Amrit, 2026-11-04) |
| TC-26 | Number of records visible | On a short window or a laptop screen, look at the sidebar | Locate Me, Search Location, Search Radius, Quick Locations and Number of Records are at the top, none covered by the Search button | Pass | Paudel Amrit | 2026-11-04 | Re-test: Live site (wildtrack-lq88.onrender.com), Chrome; order correct; in a short window the sidebar scrolls and nothing is covered by the Search button. First run Pass on 2026-10-27 |
| TC-78 | Newest sightings first | Open the Map page (Ulsan, 10 km, all groups), look at the Date column; then set From = 2024-01-01, To = 2024-12-31 | First row recent, dates going down; "Showing 75 of N records" (N about 11,000). With the 2024 dates: all rows in 2024, newest first (December 2024 at the top) | Fail | Paudel Amrit | 2026-11-17 | Re-test after the search update: Live site after b1e9ab8 (Ctrl+F5), Chrome; Without dates: Pass. With the 2024 dates: "Showing 75 of 555", all rows January 2024 (2024-01-30 to 2024-01-03); with 300 records the first row is 2024-06-24, so July–December 2024 is never shown → bug #20 (Medium). Expected result updated 17 Nov. Earlier: Pass (Paudel Amrit, 2026-11-10) |
| TC-79 | Number of records slider | Under the record buttons move the slider to **450**, click **Apply filters & search**; then click **75**; then click **Busan** and **25 km**, move the slider to **1000** and search | Slider label and summary say 450; no button is highlighted; 450 records load (within 40 s). Clicking 75 moves the slider back to 75. At 1000: 1000 records load and the note says that 1000 is the most one search can show | Pass | Paudel Amrit | 2026-11-10 | Live site (wildtrack-lq88.onrender.com), Chrome; slider 450: 450 records in about 4 s, no button highlighted; clicking 75 moved the slider back to 75; Busan 25 km at 1000: "Showing 1000 of 96,847 records" with the 1000-limit note; Added 9 Nov |

### 4.4 Species Profile (FR-07, FR-09)

| ID | Test | Steps | Expected result | Result | Tester | Date | Notes |
|---|---|---|---|---|---|---|---|
| TC-27 | Select a pin | Click any pin | Pin gets bigger; table row highlighted; Species Profile shows photo, group, names, taxonomy, date, locality, coordinates | Pass | Paudel Amrit | 2026-10-27 | Chrome, localhost |
| TC-28 | View button | Click **View** in a table row; then click anywhere on another row | Both open the Species Profile and the map zooms to the sighting | Pass | Paudel Amrit | 2026-11-17 | Re-test after the search update: Live site after b1e9ab8 (Ctrl+F5), Chrome; Note (Low): when two sightings are at the same spot, another pin can cover the selected one. Expected result updated 17 Nov. Earlier: Pass (Paudel Amrit, 2026-10-27) |
| TC-29 | Fish group | Search Ulsan, select a fish (e.g. Chinese minnow) | Badge says **Fish** (not Invertebrates); Class "Actinopterygii" | Pass | Paudel Amrit | 2026-10-27 | Chrome, localhost; Ulsan, fish badge + Class Actinopterygii |
| TC-30 | GBIF link | Click **Explore on GBIF Network** | GBIF page of the species opens in a new tab; WildTrack stays open | Pass | Paudel Amrit | 2026-10-27 | Chrome, localhost |
| TC-31 | Close profile | Click X in the Species Profile (or press Esc) | Selection cleared; "Select a sighting…" shown | Pass | Paudel Amrit | 2026-10-27 | Chrome, localhost |
| TC-75 | Photo viewer | Select a sighting, click its photo (or **More photos**); use the arrows and the → key; press Esc | Photo opens large with up to 12 more photos below, each with photographer and licence; arrows change the photo; Esc closes only the viewer (profile stays); the profile also shows the IUCN status | Pass (re-test) | Shubham | 2026-11-10 | First run: Fail. Live site, Chrome (Windows): opens large with 13 photos; the arrow button and the → key change the photo; Esc closes only the viewer; the profile stays and shows "Least Concern" (Black-tailed Gull; no IUCN line for unassessed animals such as Asian Comma). Fail: photo 1 (the sighting's own photo) shows no photographer or licence, photos 2–13 do – bug #17. Fixed in 9c471a0; re-test: Pass, 2026-11-10 (Asian Comma: photo 1 shows "Photo 1 of 13 · Photo: Katia (CC BY-NC-ND) · GBIF record"). Added 31 Oct (usability test) |
| TC-76 | Photo viewer in the Encyclopedia | Open a card, click its photo | The viewer opens over the card with more photos; closing it leaves the card open | Pass | Shubham | 2026-11-10 | Live site, Chrome (Windows): Chinese Water Deer card, clicked its photo: the viewer opened over the card with 13 photos ("Photo: Wikimedia Commons"); Esc closed the viewer and the card stayed open. Added 31 Oct |
| TC-80 | Place and record date in the profile | Open the Map page, click **Busan**, select sightings in the first table rows | Location column and Species Profile show a place such as "Choryang-dong, Busan" where the record has one (only the country, in grey, where it has none); the profile shows **Record Last Updated** with a date | Pass | Paudel Amrit | 2026-11-10 | Live site (wildtrack-lq88.onrender.com), Chrome; Busan 10 km: places such as "Choryang-dong, Busan" and "Dong-gu, Busan"; row 1 shows only the country in grey; profile of row 3: "Choryang-dong, Busan, Korea, Republic of", Record Last Updated 2026-10-15. Note: some places are shown as recorded in GBIF, in Korean script ("대한민국 부산광역시 …") or unusual spelling ("GwanganHaebyeunr…"); Added 9 Nov |
| TC-89 | Copy coordinates | Select a sighting, click **Copy** next to the coordinates in the Species Profile, paste with Ctrl+V | The coordinates (e.g. "35.1851, 129.1752") are pasted | Pass | Paudel Amrit | 2026-11-16 | Live site after 0a68be0/11331b2 (Ctrl+F5), Chrome; Pasted in Notepad. Added 16 Nov |
| TC-90 | Click a table row | Click anywhere on a table row (not the View button) | The Species Profile opens for that sighting | Pass | Paudel Amrit | 2026-11-16 | Live site after 0a68be0/11331b2 (Ctrl+F5), Chrome; Tiger Keelback row opened its profile. Added 16 Nov |
| TC-96 | Stats pill | Search `wild boar` | The bar above the map shows `"wild boar": Wild Boar` and a pill like "8 sightings · 1 species" (numbers depend on the place) | Pass | Paudel Amrit | 2026-11-17 | Live site after b1e9ab8 (Ctrl+F5), Chrome; Bar and pill shown. Added 17 Nov |

### 4.5 Messages and loading (FR-10)

| ID | Test | Steps | Expected result | Result | Tester | Date | Notes |
|---|---|---|---|---|---|---|---|
| TC-32 | Message position | Do TC-04 | The message appears at the **top center** under the header and stays about 5 seconds | Pass | Paudel Amrit | 2026-10-27 | Chrome, localhost; top center, about 5 s |
| TC-33 | No repeated messages | Click the Search button of TC-04 three times quickly | The same message is shown once, not three times | Pass | Paudel Amrit | 2026-10-27 | Chrome, localhost |
| TC-34 | Loading message | Search **100 km** with **Max records 300** | Spinner with "Querying GBIF biodiversity records…"; after 5 s "GBIF is slow right now — still loading…" if still loading | Pass | Paudel Amrit | 2026-10-27 | Chrome, localhost; Seoul 100 km / 300; "GBIF is slow" message shown |
| TC-35 | Quick changes | Click 100, 50, 25 and 5 km and the Search button quickly in a row | The final map shows the **last** choice (5 km); no mix of older results | Pass | Paudel Amrit | 2026-10-27 | Chrome, localhost |
| TC-36 | GBIF unreachable (local only) | In `config/config.php` set GBIF `base_url` to `https://example.invalid`, search, then undo the change | Sample data shown with "GBIF is unreachable — showing sample data (filters not applied)" | Pass | Paudel Amrit | 2026-10-27 | Chrome, localhost; base_url changed and restored |
| TC-87 | Buttons when nothing is found | Haeundae, 5 km, all groups: type `bear`, press Enter; click **Search 10 km** | Message "No sightings of "bear" within 5 km of …"; buttons such as **Search 10 km** and **Show all animals** (and **Clear dates** when dates are set); the button widens the radius and searches again | Pass | Paudel Amrit | 2026-11-16 | Live site after 0a68be0/11331b2 (Ctrl+F5), Chrome; Buttons Search 10 km and Show all animals; Search 10 km changed the radius and searched again. Note: when Mammals was switched off by an earlier search, "bear" showed "Select at least one animal group" instead. Added 16 Nov |

### 4.6 Find an Animal (FR-13)

| ID | Test | Steps | Expected result | Result | Tester | Date | Notes |
|---|---|---|---|---|---|---|---|
| TC-37 | Suggestions | Type `mag` in Find an Animal | Up to 6 animals; Oriental Magpie and Eurasian Magpie near the top; letters in bold; records in Korea shown | Pass | Paudel Amrit | 2026-10-27 | Chrome, localhost. Re-test 2026-11-16 (Paudel Amrit), Live site after 0a68be0/11331b2 (Ctrl+F5), Chrome: Pass |
| TC-38 | Pick a suggestion | Choose Oriental Magpie | Bar "Showing only Oriental Magpie" plus a pill like "12 sightings · 1 species" | Pass | Paudel Amrit | 2026-11-17 | Re-test after the search update: Live site after b1e9ab8 (Ctrl+F5), Chrome. Expected result updated 17 Nov. Earlier: Pass (Paudel Amrit, 2026-10-27) |
| TC-39 | Common name | Type `water deer`, press Enter | Bar `"water deer": Chinese Water Deer`; only water deer pins; the group switches stay as they are (since search-fixes, b1e9ab8) | Pass | Paudel Amrit | 2026-11-17 | Re-test after the search update: Live site after b1e9ab8 (Ctrl+F5), Chrome. Expected result updated 17 Nov. Earlier: Pass (Paudel Amrit, 2026-10-27) |
| TC-40 | Scientific name | Type `Pica pica`, press Enter | Bar `"Pica pica": Eurasian Magpie`; only magpie pins | Pass | Paudel Amrit | 2026-11-17 | Re-test after the search update: Live site after b1e9ab8 (Ctrl+F5), Chrome. Expected result updated 17 Nov. Earlier: Pass (Paudel Amrit, 2026-10-27) |
| TC-41 | Not recorded nearby | Type `tiger`, press Enter | Bar `"tiger": Tiger Keelback, Tiger Shrike, Asian Tiger Mosquito`; the group switches stay as they are (since search-fixes, b1e9ab8) (if none were seen nearby: 'No sightings of "tiger" within … km of …' with buttons such as "Search 25 km") | Pass | Paudel Amrit | 2026-11-17 | Re-test after the search update: Live site after b1e9ab8 (Ctrl+F5), Chrome. Expected result updated 17 Nov. Earlier: Pass (Paudel Amrit, 2026-10-27) |
| TC-42 | Unknown name | Type `xyzzy`, press Enter | Map and table empty; message 'No animal called "xyzzy" was found. Check the spelling, or try the scientific name.' | Pass | Paudel Amrit | 2026-11-17 | Re-test after the search update: Live site after b1e9ab8 (Ctrl+F5), Chrome. Expected result updated 17 Nov. Earlier: Pass (Paudel Amrit, 2026-10-27) |
| TC-43 | Show all animals | After TC-38, click **Show all animals** | Bar disappears; all animals shown again | Pass | Paudel Amrit | 2026-10-27 | Chrome, localhost. Re-test 2026-11-16 (Paudel Amrit), Live site after 0a68be0/11331b2 (Ctrl+F5), Chrome: Pass |
| TC-69 | A kind of animal | Ulsan, 100 km: type `deer`, press Enter (no suggestion picked) | Bar `"deer": Deer (all kinds), Chinese Water Deer, Eastern Roe Deer`; the group switches stay as they are (since search-fixes, b1e9ab8) | Pass | Paudel Amrit | 2026-11-17 | Re-test after the search update: Live site after b1e9ab8 (Ctrl+F5), Chrome. Expected result updated 17 Nov. Earlier: Pass (Paudel Amrit, 2026-11-04) |
| TC-70 | Snakes, also half typed | Type `snake`, press Enter; then `sna`, press Enter | `snake`: bar starts with "Snakes (all kinds)". `sna`: snakes, snails and other animals whose name starts with "sna" (e.g. Northern Snakehead); the group switches stay as they are (since search-fixes, b1e9ab8) | Pass | Paudel Amrit | 2026-11-17 | Re-test after the search update: Live site after b1e9ab8 (Ctrl+F5), Chrome. Expected result updated 17 Nov. Earlier: Pass (Paudel Amrit, 2026-11-04) |
| TC-71 | A whole group | Type `reptiles`, press Enter | No bar; only **Reptiles** ticked; reptile pins of several species | Pass | Paudel Amrit | 2026-11-04 | Live site (wildtrack-lq88.onrender.com), Chrome; Added 31 Oct. Re-test 2026-11-16 (Paudel Amrit), Live site after 0a68be0/11331b2 (Ctrl+F5), Chrome: Pass |
| TC-72 | Failed search empties the map | After TC-69, type `xyzzy`, press Enter | Map and table empty; red message; all groups ticked; a "Did you mean…" list appears only when similar names exist (none for xyzzy) | Pass | Paudel Amrit | 2026-11-17 | Re-test after the search update: Live site after b1e9ab8 (Ctrl+F5), Chrome. Expected result updated 17 Nov. Earlier: Pass (Paudel Amrit, 2026-11-04) |
| TC-77 | A name of several animals | Type `magpie`, press Enter; then type `mag` | Bar `"magpie": Oriental Magpie, Eurasian Magpie, Azure-winged Magpie`; the group switches stay as they are (since search-fixes, b1e9ab8); while typing `mag` suggestions appear | Pass | Paudel Amrit | 2026-11-17 | Re-test after the search update: Live site after b1e9ab8 (Ctrl+F5), Chrome. Expected result updated 17 Nov. Earlier: Pass (Paudel Amrit, 2026-11-04) |
| TC-81 | Everyday words | Type `cat`, `pig`, `wild hen`, `bat`, `pige`, `tiger`, each + Enter | pig → Wild Boar; wild hen → Red Junglefowl; bat → Bat (all kinds) + Blue Bat Star; pige → pigeons (rock, hill, Japanese wood-pigeon), the word stays in the box; tiger → bar names Tiger Keelback, Tiger Shrike, Asian Tiger Mosquito | Pass | Paudel Amrit | 2026-11-16 | Live site after 0a68be0/11331b2 (Ctrl+F5), Chrome; All as expected; bat: 15 sightings, 5 species (Busan 10 km). Added 16 Nov |
| TC-82 | Korean names | Type `고라니`, press Enter | Water deer sightings | Pass | Paudel Amrit | 2026-11-16 | Live site after 0a68be0/11331b2 (Ctrl+F5), Chrome; Water deer shown. Added 16 Nov |
| TC-83 | Typos | Type `sparow`, press Enter | No auto-correct; a "Did you mean…" list with sparrows | Pass | Paudel Amrit | 2026-11-16 | Live site after 0a68be0/11331b2 (Ctrl+F5), Chrome; List shown. Found: `bata` (Swahili for duck) shows ducks as "Bata (all kinds)" instead of "Did you mean" (Map and Encyclopedia) → issue #18, open. Added 16 Nov Re-test 2026-11-17 (Paudel Amrit): #18 fixed in b1e9ab8: "bata" now says not found and offers "Did you mean: bat" (Map and Encyclopedia); Pass. |
| TC-84 | Not an animal | Type `치킨`, press Enter | Not found, with buttons such as **Show all animals** | Pass | Paudel Amrit | 2026-11-16 | Live site after 0a68be0/11331b2 (Ctrl+F5), Chrome; Not found shown. Added 16 Nov |
| TC-85 | A group word | Type `birds`, press Enter | The whole Birds group; no "Showing only" bar | Pass | Paudel Amrit | 2026-11-16 | Live site after 0a68be0/11331b2 (Ctrl+F5), Chrome; Birds group shown. Added 16 Nov |
| TC-86 | Recent searches | Clear the Find an Animal box and click into it | The recent searches appear; clicking one runs it again | Pass | Paudel Amrit | 2026-11-16 | Live site after 0a68be0/11331b2 (Ctrl+F5), Chrome; Recent searches listed. Added 16 Nov |

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
| TC-52 | Search all: other name | Type `tiger` in the top search, press Enter | Page title **Animals called "tiger"** with 3 cards (Tiger Keelback, Tiger Shrike, Asian Tiger Mosquito), each with its group badge (Reptiles, Birds, Insects); no group highlighted in the tree | Pass | Paudel Amrit | 2026-11-17 | Re-test after the search update: Live site after b1e9ab8 (Ctrl+F5), Chrome. Expected result updated 17 Nov. Earlier: Pass (Paudel Amrit, 2026-10-27) |
| TC-53 | Search in a group | Open Insects, type `bee` in "Search insects…" | Only insects are suggested (e.g. Western honey bee) | Pass | Paudel Amrit | 2026-10-27 | Chrome, localhost |
| TC-54 | Wrong group | In Insects, type `magpie`, press Enter | Message that no insect has this name, pointing to the top search | Pass | Paudel Amrit | 2026-10-27 | Chrome, localhost |
| TC-55 | Map → Encyclopedia | On the Map, select a bird, click **Read about it in the Encyclopedia** | Encyclopedia opens Birds with that bird's card | Pass | Paudel Amrit | 2026-10-27 | Chrome, localhost |
| TC-73 | Encyclopedia: a kind of animal | In **Search all animals** type `snakes`, press Enter | Reptiles group opens with the title "Snakes (all kinds)" and snake cards; clicking a group in the tree shows the whole group again | Pass | Shubham | 2026-11-10 | Live site, Chrome (Windows): "snakes" + Enter opened Reptiles with the title "Snakes (all kinds)" and 24 snake cards (Tiger Keelback, Ussuri Mamushi, …); clicking Reptiles in the tree showed the whole group again (lizards, skinks, turtles). Added 31 Oct (usability test) |
| TC-74 | Encyclopedia: a whole group | In **Search all animals** type `reptiles`, press Enter | The Reptiles group opens | Pass | Shubham | 2026-11-10 | Live site, Chrome (Windows): from Mammals, "reptiles" + Enter opened the Reptiles group (24 cards, Reptiles active in the tree). Added 31 Oct |
| TC-91 | Encyclopedia: "Animals called …" cards | In **Search all animals** type `cat`, press Enter; then type `leo` in the filter box | Title "Animals called "cat"" with the Cat and Leopard Cat cards, each with its group badge; no group highlighted in the tree; with `leo` only Leopard Cat stays | Pass | Paudel Amrit | 2026-11-16 | Live site after 0a68be0/11331b2 (Ctrl+F5), Chrome; Cat and Leopard Cat (Mammals); filter left only Leopard Cat. Added 16 Nov |
| TC-92 | Encyclopedia: a full name opens one card | Type `wild boar`, press Enter; then `고라니`, press Enter | Each opens one card directly: Wild Boar; Water Deer | Pass | Paudel Amrit | 2026-11-16 | Live site after 0a68be0/11331b2 (Ctrl+F5), Chrome; Wild Boar (17,279 records in South Korea) and Water Deer opened directly. Added 16 Nov |
| TC-98 | Encyclopedia: cards filter while typing | Open **Mammals**, type `squirrel` in "Search mammals…"; then `sqirrel`; then `zebra` | `squirrel` and `sqirrel`: 2 cards (Eurasian Red Squirrel, Siberian Flying Squirrel), note "2 of 24 cards fit…"; `zebra`: no cards, note "No card on this page fits "zebra"…" | Pass | Paudel Amrit | 2026-11-17 | Live site after b1e9ab8 (Ctrl+F5), Chrome; As expected. Added 17 Nov |
| TC-99 | Encyclopedia links | Open `https://wildtrack-lq88.onrender.com/encyclopedia.php?taxonKey=7705930`; then `…/encyclopedia.php?q=pige` | Wild Boar card opens in Mammals; then **Animals called "pige"** with Rock Pigeon, Hill Pigeon, Japanese Wood-Pigeon | Pass | Paudel Amrit | 2026-11-17 | Live site after b1e9ab8 (Ctrl+F5), Chrome; Both links work. Added 17 Nov |
| TC-100 | Names in Title Case, country name | Look at the table, Species Profile and Encyclopedia cards (e.g. Seoul, 150 records) | Common names in Title Case ("Wild Boar"); after a hyphen lower case stays ("Black-tailed Gull"); scientific names unchanged (*Sus scrofa*); Locality ends with "South Korea" | Fail | Paudel Amrit | 2026-11-17 | Live site after b1e9ab8 (Ctrl+F5), Chrome; Seoul, 150 records: a Latin name is title-cased, "Clogmia Albipunctata" (Latin line: Clogmia albipunctatus) → bug #19 (Low). Common names and "South Korea" correct. "Oriental Turtle-Dove" / "Japanese Wood-Pigeon" keep the capital after the hyphen as in the source lists (not counted). Added 17 Nov |

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
| TC-64 | NFR-06 Phone | On a phone: search a place, open a pin, open the Encyclopedia, search an animal | Map first; "Search & filters" opens the settings; buttons easy to tap; nothing cut off | Pass | Aman | 2026-10-27 | Phone. Re-test 2026-11-16 (Paudel Amrit) after the phone freeze fix (27d5238): Pass on an iPhone 11 Pro (Chrome); map first, Search & filters, place search, profile and Encyclopedia work, no freeze, nothing cut off |
| TC-65 | NFR-06 Tablet | Same as TC-64 at about 800 px wide | Everything usable | Pass | Aman | 2026-10-27 | Narrow browser window |
| TC-97 | NFR-06 Phone layout | Open the site on a phone (or a window about 390 px wide); open **Search & filters**; tap a table row | Page does not freeze; filters open; table shows Photo, Species, Date only (no sideways scrolling); tapping a row shows its Species Profile | Pass | Paudel Amrit | 2026-11-17 | Live site after b1e9ab8 (Ctrl+F5), Chrome and iPhone 11 Pro (Chrome). Added 17 Nov |
| TC-66 | NFR-06 Keyboard | Use only Tab, Enter, arrow keys and Esc: search a place, pick a suggestion, open a card | Everything reachable; a green outline shows the focus | Pass (re-test) | Aman | 2026-10-27 | First run: Fail (Tab to a suggestion: no highlight, Enter did nothing), bug #13. Fixed in fb5f735; re-test: Pass |
| TC-67 | NFR-07 Free hosting | Check the Render dashboard plan | Free plan, $0 | Pass | Aman | 2026-10-28 | Render: Hobby plan (free), no card on file; service on the Free instance type |
| TC-68 | NFR-08 Structure | Look at the folders (public/api, includes, config) | Configuration, data access, external APIs and pages are in separate files | Pass | Aman | 2026-10-28 | config/ and includes/config.php (settings), includes/db.php (database), includes/gbif.php + wikipedia.php + public/api/ (external APIs), public/*.php, js/, css/, partials/ (pages) |

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
| API-10 | `sightings.php?lat=35.5384&lng=129.3114&radius=500&limit=75` | Error 400 (radius too large) | Pass | Paudel Amrit | 2026-11-16 | Live site: 400 (Bad Request). Added 16 Nov |
| API-11 | `animal.php?q=qwxyz` | "Not found", status 200 | Pass | Paudel Amrit | 2026-11-16 | Live site: status 200; {"found":null,"error":"No animal called \"qwxyz\" was found. Check the spelling or try the scientific name."}. Added 16 Nov |
| API-12 | `animal.php?q=pige` | 200; found with `"byName":true` (the animals named by the word, not one kind) | Pass | Paudel Amrit | 2026-11-17 | Live site: 200, name "Pige", keys of 3 pigeons, "byName":true. Added 17 Nov |
| API-13 | `places.php?q=haeun` | 200; places Haeundae District and Haeundae Beach; `"source":"list"` when Photon cannot be reached | Pass | Paudel Amrit | 2026-11-17 | Live site: 200; Haeundae District, Haeundae Beach, Haeun-dong…; no "source" field, so Photon answered at the time of the test. Added 17 Nov |

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
| P1 | ✓ | ✓ | ✓ | ✓ | ✓ | More photos in the Species Profile |
| P2 | ✓ | ✓ | ✓ | ✓ | ✓ | Search an animal without picking a species from the suggestions |
| P3 | ✓ | ✓ | ✓ | ✓ | ✓ | No suggestions after Enter or after a failed search |
| P4 | ✓ | ✓ | ✓ | ✓ | ✓ | Move the Locate Me button |
| P5 | ✓ | ✓ | ✓ | ✓ | ✓ | No data on the map after a failed search |

Write for each task: **✓** done alone · **~** done with a hint · **✗** not done, plus the time in seconds.
The table above shows Round 1. In Round 2 all five again did every task alone (see 6.2). The time per
task was not measured in either round.

**After the tasks**, ask (1 = strongly disagree, 5 = strongly agree):

| Question | P1 | P2 | P3 | P4 | P5 |
|---|---|---|---|---|---|
| The website was easy to use. | 5 | 5 | 5 | 5 | 5 |
| I always knew what the website was doing (loading, results, errors). | 4.5 | 5 | 5 | 4 | 5 |
| The search suggestions helped me. | 5 | 5 | 5 | 5 | 5 |
| The results were fast enough. | 5 | 4.5 | 5 | 4.5 | 5 |
| I would use WildTrack again. | 5 | 5 | 5 | 5 | 5 |
| **Average of the five questions, Round 2** | **4.9** | **4.9** | **5.0** | **4.7** | **5.0** |
| **Overall score, Round 1** | **4.5** | **4** | **5** | **4** | **4.8** |

And one open question: *"What would you change first?"*

The five question rows are from **Round 2** (9 Nov), on the version with the Round 1 fixes. In
Round 1 each participant gave only one overall score (average 4.46 out of 5), not a score per question.

### 6.1 Round 1 results

**Who and how:** 5 classmates (P1–P5) from outside Group 3, organized by Gupta Aman Kumar, during a
class break. All five did the five tasks and also explored the website freely. Start times: P1 13:00,
P2 13:15, P3 13:30, P4 13:45, P5 13:57; the session ended at about 14:05.

**Results:**
- **Tasks:** all five participants completed all five tasks without problems. The time per task was
  not measured.
- **Ratings:** one overall score out of 5 per person: P1 4.5, P2 4, P3 5, P4 4, P5 4.8 (average
  4.46). The participants were satisfied, with suggestions for some areas.
- **Who suggested what:** P1: more photos in the Species Profile (report 1). P2: search an animal
  with one press, without picking a species from the suggestions (report 5). P3: no suggestions
  after Enter or after a failed search (report 2). P4: move the Locate Me
  button (report 4). P5: show no data on the map after a failed search (report 6). The radius
  suggestion was also about its position (report 8). The other reports came from the participants
  too, but were not noted per person.

| # | What the participants reported | Result |
|---|---|---|
| 1 | Click a photo to see it larger and explore more photos, on the Map and in the Encyclopedia | Fixed: photo viewer with more photos |
| 2 | Hide suggestions after Enter; a failed search should show only "not found" | Fixed: no list after Enter. A name that fits several animals shows them all ("magpie"); an unknown name shows only "not found" |
| 3 | Choose the number of records without opening a dropdown | Fixed: buttons 30 / 75 / 150 / 300 |
| 4 | Move Locate Me to the top, above the place search | Fixed |
| 5 | A child typing "snake" or "SNA" should see all snakes without picking a species, also in the Encyclopedia | Fixed: search by a kind of animal |
| 6 | After a failed search the map should show no data | Fixed |
| 7 | Make the notifications and their text bigger | Fixed |
| 8 | Order: place search, radius, Quick Locations, number of records | Fixed |
| 9 | Animal group ticks should follow the search ("frogs" → Amphibians) | Fixed |
| 10 | Frogs found with Find an Animal in Ulsan (10 km) disappeared with all groups selected | Not a bug: only the chosen number of records is loaded. Note added: "Showing 75 of N records in this area" |
| 11 | Species Profile should show whether a species may go extinct or is increasing | Partly fixed: IUCN Red List status added; population trend is not shown |
| 12 | Searching a group like reptiles shows only one animal | Fixed: "reptiles" offered one wrong suggestion; it now shows the whole group |


### 6.2 Round 2 results

**Who and how:** the same 5 classmates (P1–P5), on 9 Nov 2026 during a class break, on the version
with the Round 1 fixes. Gupta Aman Kumar opened the website and read out the tasks; no hints were given.

**Results:**
- **Tasks:** all five participants did all five tasks alone. The time per task was not measured.
- **Ratings:** each participant scored every question from 1 to 5 (table in section 6). Average per
  person: P1 4.9, P2 4.9, P3 5.0, P4 4.7, P5 5.0; average of all answers 4.9 out of 5
  (Round 1: 4.46).
- **Per question (average):** easy to use 5.0, knew what the website was doing 4.7, suggestions
  helped 5.0, fast enough 4.8, would use again 5.0. The lowest scores were for knowing what the
  website was doing and for speed.

---

## 7. Summary (status: 17 Nov 2026)

| | Number |
|---|---|
| Test cases in this plan | 113 (TC-01 to TC-100, plus API-01 to API-13) |
| Test cases run | 113 |
| Passed | 111 (TC-66 and TC-75 after their re-tests) |
| Failed (bug open) | 2 (TC-78 → bug #20, TC-100 → bug #19) |
| Blocked | 0 |
| Bug issues opened | 5 (#13, #17, #18, #19, #20) |
| Bugs fixed and re-tested | 3 (#13, #17, #18) |
| Open issues | 2 (#19 Low, #20 Medium) |
| Re-tested after the search update (16–17 Nov) | TC-15, TC-17 – TC-21, TC-25, TC-28, TC-37 – TC-43, TC-52, TC-64, TC-69 – TC-72, TC-77, TC-78, TC-83 |

These numbers, the usability results and the most important bugs go into the testing report
(Week 12).
