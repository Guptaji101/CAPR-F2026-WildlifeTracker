// Builds the System Design document (due 17 Oct 2026): architecture, ERD, data dictionary, DFDs.
const {
  GREY, TW,
  AlignmentType, P, H1, H2, bullet, steps, figure, table, spacer, titleBlock, writeDoc,
} = require('./common');

const body = [];
const add = (...xs) => xs.flat().forEach(x => body.push(x));

add(titleBlock('System Design Document', 'Wildlife Sighting Mapping and Species Distribution Tracker',
  'CAPR-F2026 | Group 3 | System Design | Document Version: v1.0'));

// 1. Project information
add(H1('1. Project Information'),
  table([2800, TW - 2800], ['Item', 'Detail'], [
    ['Course', 'Capstone Project (CAPR-F2026)'],
    ['Group', 'Group 3'],
    ['Theme', 'Fauna (Biosphere - Animals)'],
    ['Project Title', 'Wildlife Sighting Mapping and Species Distribution Tracker (WildTrack)'],
  ]),
  H2('Team Members'),
  table([3600, 2000, TW - 5600], ['Name', 'Student ID', 'Role'], [
    ['Gupta Aman Kumar', '2530001', 'Project Manager / Frontend'],
    ['Singh Shubham Kumar', '2530028', 'Backend Developer'],
    ['Paudel Amrit', '2530048', 'Full-stack Developer / QA'],
  ]),
  H2('Revision History'),
  table([1100, 1700, TW - 2800], ['Version', 'Date', 'Description'], [
    ['v1.0', '7 Oct 2026', 'First version: architecture, database decision, entity-relationship diagram, data dictionary and cache rules (species_cache connected in species.php), data flow diagrams (Level 0 and Level 1), UI wireframes, and traceability.'],
  ]),
);

// 2. Introduction
add(H1('2. Introduction'),
  H2('2.1 Purpose'),
  P('This document describes how WildTrack is built to meet the requirements in the Requirements Analysis Document (v1.1). It covers the system architecture, the data the system uses and where that data is kept (entity-relationship diagram and data dictionary), and how data moves between the user, the system, and the external services (data flow diagrams).'),
  H2('2.2 Scope'),
  bullet('**Architecture:** the three tiers and their components (Section 3).'),
  bullet('**Data design:** the decision on what is stored in MySQL, the entity-relationship diagram, and the data dictionary for the species_cache table (Section 4).'),
  bullet('**Data flow design:** a context diagram (Level 0) and a Level 1 data flow diagram with process and data store descriptions (Section 5).'),
  bullet('**User interface design:** wireframes of the landing page and the dashboard (Section 6).', { after: 120 }),
  H2('2.3 Related Documents'),
  table([4200, TW - 4200], ['Document', 'Used For'], [
    ['Requirements Analysis Document v1.1', 'Functional requirements (FR-01 to FR-11), non-functional requirements (NFR-01 to NFR-08), and use cases (UC-01 to UC-11) referenced throughout this document'],
    ['sql/schema.sql (GitHub repository)', 'The database schema described in Section 4.5'],
  ]),
);

// 3. Architecture
add(H1('3. System Architecture'),
  P('WildTrack keeps the three-tier architecture described in the Requirements Analysis (Figure 1). The browser shows the interface with Leaflet.js and calls three small PHP endpoints. Each endpoint forwards the request to an open-data service (Nominatim or GBIF) and returns simplified JSON. Map tiles and sighting photos are loaded by the browser directly from their hosts.', { keepNext: true }),
  P('The one change from v1.1 is the database. Instead of three planned tables that were not connected, the design uses a single table, species_cache, which species.php reads and writes through includes/db.php (Section 4.1). Database credentials stay in config/config.php, which is excluded from the GitHub repository (NFR-03).', { keepNext: true }),
  figure('architecture_design.png', 640, 'Figure 1 – System architecture'),
);

// 4. Data design
add(H1('4. Data Design'),
  H2('4.1 Database Decision'),
  P('WildTrack shows live data from GBIF, and it has no user accounts (NFR-05). Most of its data therefore does not need to be stored. The three tables in the earlier schema were reviewed against the requirements:', { keepNext: true }),
  table([2100, 1500, TW - 3600], ['Table', 'Decision', 'Reason'], [
    ['**species_cache**', 'Keep and connect', 'A species\' taxonomy and photo rarely change, but each Species Profile currently needs two GBIF calls. Storing the result lets species.php answer from MySQL for every later visitor, which speeds up the Species Profile (NFR-01). A stored row can also be shown if GBIF is down (NFR-04).'],
    ['saved_locations', 'Remove', 'Saved locations belong to a person, which needs accounts. Accounts are out of scope (Requirements Analysis, Section 5.2). The Quick Locations chips cover common places (FR-11).'],
    ['search_history', 'Remove', 'No requirement or use case reads it. Storing users\' searched places without a purpose would only add privacy risk.'],
  ]),
  spacer(60),
  P('Sighting (occurrence) records are not stored. They change daily on GBIF, a single search can return up to 300 of them, and FR-03 requires them to be retrieved live. If accounts are added later, saved_locations can be brought back with a user table.', { italics: true, color: GREY }),

  H2('4.2 Entity-Relationship Diagram'),
  P('Figure 2 shows the data the system works with, including data that is not stored in MySQL. The header color of each entity shows where its data lives: green is stored in MySQL, amber is fetched live from GBIF for each request, and blue is held in the browser while the page is open. Relationships use crow\'s-foot notation. Each line end shows the minimum and maximum number of entities on that side, also written as text (for example, 0..* means zero or more).', { keepNext: true }),
  figure('erd.png', 672, 'Figure 2 – Entity-relationship diagram'),
  H2('4.3 Entities'),
  table([2000, 2300, TW - 4300], ['Entity', 'Where It Lives', 'Description'], [
    ['**SEARCH**', 'Browser memory (state in app.js)', 'The current search: location, radius, date range, and maximum number of records. Only one search exists at a time, so it has no key. It is replaced when the user searches again and is lost when the page is closed.'],
    ['**ANIMAL_GROUP**', 'Fixed list in app.js (GROUPS)', 'The six animal groups (Mammals, Birds, Reptiles, Amphibians, Fish, Invertebrates). Each group has a color, an icon, and the GBIF taxon keys used to filter the search (for example, Reptiles uses Squamata, Testudines and Crocodylia).'],
    ['**OCCURRENCE**', 'GBIF Occurrence API (not stored)', 'One recorded sighting: what was seen, where, and when, with an optional photo. Returned by sightings.php and shown as a map pin and a table row.'],
    ['**SPECIES**', 'MySQL table species_cache', 'The taxonomy (Kingdom → Species), names, and a representative photo of one species, copied from the GBIF Species API the first time anyone views that species.'],
  ]),
  H2('4.4 Relationships'),
  table([2900, 1500, TW - 4400], ['Relationship', 'Cardinality', 'Meaning'], [
    ['SEARCH **returns** OCCURRENCE', '1 to 0..*', 'A search returns zero or more sightings (at most the chosen maximum, 30–300). Each sighting shown belongs to the current search.'],
    ['SEARCH **filters by** ANIMAL_GROUP', '0..* to 1..*', 'A search uses one to six groups (at least one must be ticked, UC-04 A2). A group can be used by any number of searches.'],
    ['ANIMAL_GROUP **classifies** OCCURRENCE', '1 to 0..*', 'Each sighting belongs to exactly one group, worked out from its taxonomic class (groupOf() in app.js). A group can have any number of sightings.'],
    ['OCCURRENCE **is identified as** SPECIES', '0..* to 0..1', 'A sighting identified to species level has one species_key. Some sightings are identified only to genus or family, so the link is optional (UC-07 A4). A species can appear in many sightings.'],
  ]),
  H2('4.5 Data Dictionary: species_cache'),
  P('The species_cache table is in the wildlife_tracker database (MySQL, InnoDB, utf8mb4). Each column is filled from the GBIF Species API response that species.php already uses.', { keepNext: true }),
  table([1750, 1600, 900, TW - 4250], ['Column', 'Type', 'Null', 'Description (GBIF source field)'], [
    ['**species_key**', 'INT UNSIGNED', 'No', 'Primary key. The GBIF species key (key), also used as speciesKey in occurrence records.'],
    ['scientific_name', 'VARCHAR(200)', 'Yes', 'Scientific name with author (scientificName), for example "Larus crassirostris Vieillot, 1818".'],
    ['vernacular_name', 'VARCHAR(200)', 'Yes', 'English common name (vernacularName), for example "Black-tailed Gull". Often missing for invertebrates.'],
    ['taxon_rank', 'VARCHAR(20)', 'Yes', 'Rank of the record (rank), normally SPECIES.'],
    ['kingdom', 'VARCHAR(100)', 'Yes', 'Kingdom (kingdom). Always Animalia, because searches are limited to animals.'],
    ['phylum', 'VARCHAR(100)', 'Yes', 'Phylum (phylum), for example Chordata.'],
    ['class_name', 'VARCHAR(100)', 'Yes', 'Class (class). Named class_name because CLASS is a word with special meaning in SQL and PHP.'],
    ['order_name', 'VARCHAR(100)', 'Yes', 'Order (order). Named order_name because ORDER is a reserved SQL word.'],
    ['family', 'VARCHAR(100)', 'Yes', 'Family (family).'],
    ['genus', 'VARCHAR(100)', 'Yes', 'Genus (genus).'],
    ['species', 'VARCHAR(200)', 'Yes', 'Species name without author (species).'],
    ['image_url', 'VARCHAR(500)', 'Yes', 'First photo from /species/{key}/media (results[0].identifier). Empty if GBIF has no photo.'],
    ['cached_at', 'TIMESTAMP', 'No', 'When the row was saved or last refreshed. Set by MySQL (DEFAULT CURRENT_TIMESTAMP, ON UPDATE CURRENT_TIMESTAMP).'],
  ]),
  H2('4.6 Cache Rules'),
  P('species.php uses the table as a read-through cache. The rules keep the Species Profile working even if MySQL is not available:', { keepNext: true }),
  ...steps([
    'Look up the row with the requested species_key.',
    'If a row exists and cached_at is less than **30 days** old, return it without calling GBIF.',
    'Otherwise, call the GBIF Species API (/species/{key} and /species/{key}/media) as species.php does today.',
    'If GBIF answers, save the result with INSERT … ON DUPLICATE KEY UPDATE (adding a new row or refreshing the old one) and return it.',
    'If GBIF does not answer but an older row exists, return the older row rather than an error (NFR-04).',
    'If the database cannot be reached, skip steps 1, 2, 4 and 5 and work as today, directly from GBIF.',
  ]),
  spacer(60),
  P('The browser keeps its own short-term copy as well: app.js stores every species it has fetched (state.speciesCache), so viewing the same species twice in one visit sends no request at all (UC-07 A2). The MySQL cache adds sharing between visitors and between visits.'),
);

// 5. Data flow design
add(H1('5. Data Flow Design', { newPage: true }),
  H2('5.1 Notation'),
  P('The data flow diagrams use Gane–Sarson notation. Rounded boxes are **processes**, numbered so that each Level 1 process can be broken down further later. Shaded square boxes are **external entities**: people or systems outside WildTrack that send or receive data. Open-ended boxes are **data stores**. Arrows are **data flows**, labelled with the data they carry. The diagrams show what data moves where, not the order in which things happen; the order is shown by the flowcharts in the Requirements Analysis (Figures 3 and 4).'),
  H2('5.2 Context Diagram (Level 0)'),
  P('Figure 3 shows the whole of WildTrack as a single process and every external entity it exchanges data with. The User is the only person. The other five entities are external services: the device\'s geolocation (for "Locate Me"), Nominatim, the GBIF API, the map tile services, and the photo hosts that GBIF media links point to.', { keepNext: true }),
  figure('dfd_context.png', 590,'Figure 3 – Context diagram (Level 0 DFD)'),
  H2('5.3 Level 1 Data Flow Diagram'),
  P('Figure 4 breaks the system into four processes and shows the two data stores. GBIF is drawn as two entities, the Occurrence API and the Species API, because different processes use them.', { keepNext: true }),
  figure('dfd_level1.png', 672, 'Figure 4 – Level 1 data flow diagram'),
  H2('5.4 Process Descriptions'),
  table([1500, 2500, 2500, TW - 6500], ['Process', 'Input', 'Output', 'Implemented In'], [
    ['**1.0** Resolve Location', 'Place name or Quick Location from the User; or GPS position from Device Geolocation', 'Coordinates and place name to 2.0. Place name to Nominatim', 'handleSearch(), quickSelect(), useCurrentLocation() in app.js; geocode.php'],
    ['**2.0** Retrieve Sightings', 'Coordinates from 1.0; filter choices from the User; occurrence records from GBIF; sample records from D2', 'Query to the GBIF Occurrence API; sightings (JSON) to 3.0', 'loadSightings() in app.js; sightings.php; gbif_search_nearby() in gbif.php'],
    ['**3.0** Display Map and Sightings', 'Sightings from 2.0; map tiles; photos; clicks from the User', 'Pins, table, legend and status messages to the User; the selected sighting to 4.0', 'renderMarkers(), renderTable(), setLoading() in app.js; Leaflet.js'],
    ['**4.0** Show Species Profile', 'Selected sighting and species key from 3.0; cached species from D1; taxonomy and photo link from GBIF', 'Species profile to the User; new species row to D1', 'showProfile(), getSpecies() in app.js; species.php'],
  ]),
  H2('5.5 Data Stores'),
  table([1900, 2400, TW - 4300], ['Data Store', 'Implemented As', 'Contents and Use'], [
    ['**D1** Species Cache', 'MySQL table species_cache (Section 4.5)', 'One row per species ever viewed. Read and written by process 4.0 under the cache rules in Section 4.6.'],
    ['**D2** Sample Dataset', 'Fixed list in gbif_sample_fallback() (gbif.php)', 'Five real GBIF records from around Busan. Read by process 2.0 only when GBIF cannot be reached after three attempts (NFR-04, UC-03 A3). Never written.'],
  ]),
);

// 6. UI design
const key = rows => table([700, 2900, TW - 5100, 1500], ['#', 'Element', 'Purpose', 'Requirement'],
  rows.map(([n, e, p, r]) => [{ t: `**${n}**`, align: AlignmentType.CENTER }, e, p, r]));
add(H1('6. User Interface Design', { newPage: true }),
  P('The wireframes below show the layout of the two pages, without colors or real content. Grey boxes with a cross are images, and grey bars stand for text that comes from GBIF. The green numbers match the keys under each figure. The dashboard wireframe follows the working prototype; the landing page is planned and follows the team\'s HTML prototype (docs/prototypes/landing.html).'),
  H2('6.1 Landing Page'),
  P('The landing page introduces WildTrack to first-time visitors and leads them to the map. It has no login (NFR-05) and works at small screen widths by stacking the sections (NFR-06).', { keepNext: true }),
  figure('wf_landing.png', 345, 'Figure 5 – Wireframe: landing page'),
  key([
    ['1', 'Navigation bar and "Open the map" button', 'Links to the page sections; the button opens the dashboard', 'FR-02'],
    ['2', 'Hero with "Explore the map"', 'States what WildTrack does in one line and opens the dashboard', 'Obj. 1'],
    ['3', 'Feature cards', 'Search, See, Filter, Learn, Verify: the five main things a user can do', 'FR-01, 03, 04, 07, 09'],
    ['4', 'Animal groups', 'The same six groups as the dashboard filter and legend', 'FR-04, FR-08'],
    ['5', 'How it works', 'Three steps: pick a place, see what lives there, tap to learn more', 'UC-01, 03, 07'],
    ['6', '"Start exploring" button', 'Second way into the dashboard at the end of the page', 'FR-02'],
  ]),
  H2('6.2 Dashboard', { newPage: true }),
  P('The dashboard is the main working page. The sidebar holds every search setting, the map and the Recent Sightings table share the center, and the Species Profile panel on the right shows the selected sighting.', { keepNext: true }),
  figure('wf_dashboard.png', 640, 'Figure 6 – Wireframe: dashboard'),
  key([
    ['1', 'Search box and "Locate Me"', 'Type a place name, or use the device position', 'FR-01 / UC-01'],
    ['2', 'Quick Locations chips', 'One-click search for common places', 'FR-11 / UC-11'],
    ['3', 'Search Radius chips', '5, 10, 25, 50 or 100 km', 'FR-06 / UC-06'],
    ['4', 'Animal Groups checkboxes', 'Show one or more of the six groups', 'FR-04 / UC-04'],
    ['5', 'Observation Date fields', 'From and To dates', 'FR-05 / UC-05'],
    ['6', 'Filters (Max records)', '30, 75, 150 or 300 records per search', 'FR-03 / UC-03'],
    ['7', 'Base-map tabs', 'Map, Satellite or Topographic', 'FR-02 / UC-02'],
    ['8', 'Map legend', 'Color and icon of each animal group', 'FR-08 / UC-08'],
    ['9', 'Map with pins and radius circle', 'Sightings inside the search radius; zoom and recenter buttons', 'FR-02, FR-03'],
    ['10', 'Recent Sightings table and counter', '10 sightings per page with "View" buttons; "Showing x–y of N"', 'FR-03, FR-10'],
    ['11', 'Species Profile panel', 'Photo, names, taxonomy, date, locality, coordinates', 'FR-07 / UC-07'],
    ['12', '"Explore on GBIF Network" button', 'Opens the source record on GBIF in a new tab', 'FR-09 / UC-09'],
  ]),
);

// 7. Traceability
add(H1('7. Design-to-Requirements Traceability'),
  P('Each design element below is linked to the requirements and use cases it supports.', { keepNext: true }),
  table([3300, 2500, TW - 5800], ['Design Element', 'Requirements', 'Use Cases'], [
    ['Process 1.0 Resolve Location', 'FR-01, FR-11', 'UC-01, UC-11'],
    ['Process 2.0 Retrieve Sightings', 'FR-03, FR-04, FR-05, FR-06, NFR-01, NFR-04', 'UC-03, UC-04, UC-05, UC-06'],
    ['Process 3.0 Display Map and Sightings', 'FR-02, FR-03, FR-08, FR-10', 'UC-02, UC-03, UC-08, UC-10'],
    ['Process 4.0 Show Species Profile', 'FR-07, FR-09', 'UC-07, UC-09'],
    ['D1 Species Cache (species_cache table)', 'FR-07, NFR-01, NFR-04', 'UC-07'],
    ['D2 Sample Dataset', 'NFR-04', 'UC-03 (A3)'],
    ['ANIMAL_GROUP entity (GROUPS in app.js)', 'FR-04, FR-08', 'UC-04, UC-08'],
    ['No accounts; no stored searches or locations', 'NFR-05', 'All'],
    ['Credentials in config/config.php; database access only in includes/db.php', 'NFR-03, NFR-08', '–'],
  ]),
);

// 8. Individual contribution
add(H1('8. Individual Contribution (System Design)'),
  table([2500, 2200, TW - 7000, 2300], ['Member', 'Role', 'Task', 'Evidence'], [
    ['Gupta Aman Kumar', 'Project Manager / Frontend', 'Coordinated the System Design and assembled the document; system architecture; UI wireframes of the landing page and dashboard', 'Sections 1–3, 6'],
    ['Singh Shubham Kumar', 'Backend Developer', 'Database decision, entity-relationship diagram and species_cache data dictionary; species_cache table (sql/schema.sql) and the cache in species.php', 'Section 4; sql/schema.sql, public/api/species.php'],
    ['Paudel Amrit', 'Full-stack Developer / QA', 'Data flow diagrams with process and data store descriptions; design-to-requirements traceability; testing of the species cache', 'Sections 5, 7'],
  ]),
);

writeDoc({
  file: 'System_Design_v1.0.docx',
  title: 'System Design Document - Wildlife Sighting Mapping and Species Distribution Tracker (v1.0)',
  description: 'System design: architecture, ERD, data dictionary, data flow diagrams',
  footer: 'CAPR-F2026 | Group 3 | System Design v1.0',
  body,
});
