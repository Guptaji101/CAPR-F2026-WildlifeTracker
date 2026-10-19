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
Every change is in the [commit history](https://github.com/Guptaji101/CAPR-F2026-WildlifeTracker/commits/main), with a short explanation in each commit message.

## AI Assistance

This project was developed with help from an AI assistant (Claude by Anthropic, used through Claude Code) for code suggestions, debugging and testing. The team reviewed, tested and committed every change, and can explain how each part works.
