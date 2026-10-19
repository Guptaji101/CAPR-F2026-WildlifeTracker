# WildTrack — Wildlife Sighting Mapping and Species Distribution Tracker

**Live website:** https://wildtrack-lq88.onrender.com
*(free server: if nobody has visited for a while, the first page can take up to a minute to load)*

**Course:** Capstone Project (CAPR-F2026) · **Group:** Group 3 · **Theme:** Fauna (Biosphere – Animals)

## Members
| Name | Student ID | Role |
|------|-----------|------|
| Gupta Aman Kumar | 2530001 | Project Manager / Frontend |
| Singh Shubham Kumar | 2530028 | Backend Developer |
| Paudel Amrit | 2530048 | Full-stack Developer / QA |

## About
WildTrack is a map-based website that shows which animals have really been recorded near a
place in South Korea. It uses open biodiversity data from GBIF and is made for non-specialists:
students, hikers, eco-clubs and anyone curious about the wildlife around them. No account is needed.

## Features
**Map page**
- Search a place in South Korea (with suggestions while typing), pick a Quick Location
  (Busan, Seoul, Jeju Island, Seoraksan, …) or use **Locate Me** (a blue dot shows where you are).
- See the animals recorded within 5–100 km as color-coded pins and in a table with photos.
- Filter by animal group (mammals, birds, reptiles, amphibians, fish, invertebrates), date and
  number of records, then press **Search sightings**.
- **Find an Animal:** type a name ("water deer", "magpie", "Pica pica") with suggestions while
  typing, and see only that animal's sightings.
- Species Profile with photo, taxonomy and a link to the original GBIF record.

**Animal Encyclopedia**
- The best-known animals of 12 groups in South Korea (5 vertebrate, 7 invertebrate groups),
  with photo, short Wikipedia description, conservation status (IUCN) and classification.
- **Search all animals** at the top, and a search inside every group ("Search insects…").
- Links between the Encyclopedia and the map in both directions.

Works on phones, tablets and desktops, and with the keyboard and screen readers.

## Tech Stack
- **Frontend:** HTML, CSS, JavaScript, Leaflet.js
- **Backend:** PHP 8 with small JSON endpoints in `public/api/`
- **Database:** MySQL, only as an optional cache of species details (the site also runs
  without it); a small file cache keeps recent answers from the data services
- **Hosting:** Docker on Render (free plan); locally XAMPP

## Data Sources and Credits
- Animal records, species and record counts: [GBIF.org](https://www.gbif.org)
- Species descriptions and photos: Wikipedia (CC BY-SA), Wikimedia Commons; names: Wikidata
- Place search: OpenStreetMap Nominatim and Photon (komoot)
- Maps: © OpenStreetMap contributors, Esri
- Sighting photos: mostly iNaturalist observers, via GBIF

## Run it on your computer
1. Install [XAMPP](https://www.apachefriends.org) and start **Apache** (MySQL is optional).
2. Put this folder in `C:\xampp\htdocs\` (for example with GitHub Desktop → Clone).
3. Copy `config/config.example.php` to `config/config.php` (it holds your local settings and is
   never uploaded to GitHub).
4. Optional: create the species cache with `sql/schema.sql` in phpMyAdmin.
5. Open http://localhost/CAPR-F2026-WildlifeTracker/public/

## Project Structure
```
public/            the website (Map page index.php, Encyclopedia encyclopedia.php)
  api/             JSON endpoints: places, sightings, species, animal names, encyclopedia
  js/, css/        page logic and styles
  data/            list of the 2000 most-recorded animals in South Korea (for suggestions)
includes/          shared PHP: GBIF client, Wikipedia client, cache, settings, database
config/            config.example.php (copy to config.php)
sql/schema.sql     the optional species cache table
tools/             build-animal-list.php (makes public/data/korea-animals.json)
Dockerfile         how the online server is built (Render)
.github/workflows/ keep-awake job that keeps the free server from sleeping
```

## Changes
Every change, with dates and reasons, is listed in [CHANGELOG.md](CHANGELOG.md).

## AI Assistance
Following the course syllabus, parts of this project were developed with help from an AI
assistant (Claude by Anthropic, used through Claude Code): code suggestions, debugging, testing
and document drafts. The team reviewed, tested and committed every change and can explain it.
Commits made with AI help normally end with a `Co-Authored-By: Claude …` line; GitHub Desktop
removed that line from the commits of 14 and 19 October 2026 (`998e5a0`, `db13cdd`, `3868d17`,
`82550ac`, `6bc17f4`, `7471580`, `5ac7db1`, `2ac3388`), which were also made with AI help.
