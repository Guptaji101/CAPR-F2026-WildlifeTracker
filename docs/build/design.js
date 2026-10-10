// Builds the System Design document (due 17 Oct 2026): architecture, conceptual schema, ERD,
// data dictionary, DFDs, UI wireframes with detailed element descriptions, traceability.
const {
  GREY, TW,
  AlignmentType, P, H1, H2, H3, bullet, steps, figure, table, spacer, titleBlock, writeDoc,
} = require('./common');

const body = [];
const add = (...xs) => xs.flat().forEach(x => body.push(x));

add(titleBlock('System Design Document', 'Wildlife Sighting Mapping and Species Distribution Tracker',
  'CAPR-F2026 | Group 3 | System Design | Document Version: v1.0'));

/* ------------------------------------------------------------------ */
/* 1. Project information                                              */
/* ------------------------------------------------------------------ */
add(H1('1. Project Information'),
  table([2800, TW - 2800], ['Item', 'Detail'], [
    ['Course', 'Capstone Project (CAPR-F2026)'],
    ['Group', 'Group 3'],
    ['Theme', 'Fauna (Biosphere - Animals)'],
    ['Project Title', 'Wildlife Sighting Mapping and Species Distribution Tracker (WildTrack)'],
    ['Pages of the website', 'Map (index.php): wildlife sightings near any place. Encyclopedia (encyclopedia.php): the best-known animals of each group.'],
  ]),
  H2('Team Members'),
  table([3600, 2000, TW - 5600], ['Name', 'Student ID', 'Role'], [
    ['Gupta Aman Kumar', '2530001', 'Project Manager / Frontend'],
    ['Singh Shubham Kumar', '2530028', 'Backend Developer'],
    ['Paudel Amrit', '2530048', 'Full-stack Developer / QA'],
  ]),
);

/* ------------------------------------------------------------------ */
/* 2. Introduction                                                     */
/* ------------------------------------------------------------------ */
add(H1('2. Introduction'),
  H2('2.1 Purpose'),
  P('The Requirements Analysis (v1.2) describes **what** WildTrack must do. This System Design describes **how** it does it: which parts the system is made of and what each part is responsible for, which data it uses and where that data is kept, how data moves between the user, the system and the external services, and what every screen element does. It is written so that a team member who did not build a part can still understand, test and explain it.'),
  H2('2.2 Scope'),
  bullet('**Architecture (Section 3):** the three tiers, every component and file, and what happens during one search.'),
  bullet('**Data design (Section 4):** what is stored and why, the conceptual schema, the entity-relationship diagram, the data dictionary of the species_cache table, and the cache rules.'),
  bullet('**Data flow design (Section 5):** the context diagram (Level 0), the Level 1 diagram, and descriptions of every process, data store and external entity.'),
  bullet('**User interface design (Section 6):** the shared header, wireframes of the Map and Encyclopedia pages, a detailed description of every button and feature, and the messages the user can see.'),
  bullet('**Traceability (Section 7):** how each design element connects to the requirements and use cases.', { after: 120 }),
  H2('2.3 Design Principles'),
  P('Four principles guided every decision in this document:', { keepNext: true }),
  bullet('**Live open data, no copy of it.** Sightings and species lists come straight from GBIF when the user asks for them, so they are always up to date. The API works as the database; WildTrack only keeps a small cache of species details.'),
  bullet('**No accounts.** Anyone can use every feature without signing up (NFR-05). This is why there is no user table, no login, and no language or "Guest" menu.'),
  bullet('**Every failure has a message.** If a service is slow or down, the user sees what happened and what to do next, never an empty screen (NFR-04, FR-10).'),
  bullet('**One job per part.** Each PHP endpoint answers one kind of question, and shared code (the GBIF client, the Wikipedia client, the database connection, the header) lives in one place (NFR-08).', { after: 120 }),
  H2('2.4 Definitions'),
  table([2600, TW - 2600], ['Term', 'Meaning in this document'], [
    ['Occurrence (sighting)', 'One record on GBIF saying that an animal was seen at a place and time.'],
    ['Species key', 'The number GBIF gives each species (for example 2481197 = Black-tailed Gull). It links sightings, species details and the GBIF website.'],
    ['Taxon key', 'The GBIF number of any group of living things (for example 212 = birds). WildTrack filters by taxon keys.'],
    ['Conceptual schema', 'A high-level picture of the data (entities, attributes, relationships) without any database detail, drawn in Chen notation.'],
    ['ERD', 'Entity-relationship diagram: the same data at the logical level, with keys, data types and where each entity is stored.'],
    ['DFD', 'Data flow diagram: shows which data moves between processes, data stores and external entities.'],
    ['Cache', 'A saved copy of data that is slow to fetch, used again until it is too old.'],
    ['Facet', 'A GBIF option that counts records per value (for example per species) instead of returning the records. Used to find the most-recorded species of a group.'],
    ['IUCN Red List status', 'The conservation status of a species (for example Least Concern, Vulnerable, Endangered), published by the IUCN and provided through GBIF.'],
  ]),
  H2('2.5 Related Documents'),
  table([4200, TW - 4200], ['Document', 'Used For'], [
    ['Requirements Analysis Document v1.2', 'Functional requirements (FR-01 to FR-11), non-functional requirements (NFR-01 to NFR-08), and use cases (UC-01 to UC-11) referenced throughout this document.'],
    ['sql/schema.sql (GitHub repository)', 'The database schema described in Section 4.6.'],
  ]),
  spacer(60),
  P('The Animal Encyclopedia was added after the Requirements Analysis v1.2 was written. In this document it is traced to a proposed requirement, **FR-12 Animal Encyclopedia**: "The system shall let users browse the most-recorded animals of each animal group in South Korea, with a photo, a short description, the conservation status and the classification of each species." FR-12 and its use case will be added in the next revision of the Requirements Analysis.', { italics: true, color: GREY }),
);

/* ------------------------------------------------------------------ */
/* 3. Architecture                                                     */
/* ------------------------------------------------------------------ */
add(H1('3. System Architecture'),
  H2('3.1 Overview'),
  P('WildTrack has three tiers (Figure 1). The **client** tier is the user\'s web browser: it shows the two pages and runs their JavaScript. The **server** tier is Apache with PHP (XAMPP for development, Render or Railway for deployment): four small PHP endpoints receive requests from the browser, ask an external service, and send back simplified JSON. The **external** tier is the open-data services that hold the actual data. Map tiles and photos are loaded by the browser directly from their hosts.', { keepNext: true }),
  figure('architecture_design.png', 640, 'Figure 1 – System architecture'),
  H2('3.2 Components'),
  table([2100, 2700, TW - 4800], ['Component', 'Files', 'Responsibility'], [
    ['Shared header', 'public/partials/header.php', 'The top bar on both pages: logo, subtitle, and the Map, Encyclopedia and About links. It stays at the top while the page scrolls. Also holds the About dialog.'],
    ['Map page', 'public/index.php, js/app.js, css/style.css', 'The home page. Search settings in the sidebar, the Leaflet map, the Recent Sightings table and the Species Profile panel. app.js keeps the current search in memory and calls the endpoints.'],
    ['Encyclopedia page', 'public/encyclopedia.php, js/encyclopedia.js, css/encyclopedia.css', 'The classification tree, the group introduction, the species cards and the detail dialog.'],
    ['Leaflet.js', 'loaded from unpkg.com', 'Draws the interactive map, the pins, the radius circle and the scale bar, and loads the map tiles.'],
    ['Location endpoint', 'public/api/geocode.php', 'Turns a place name into coordinates using Nominatim.'],
    ['Sightings endpoint', 'public/api/sightings.php', 'Checks the filters, asks GBIF for the sightings inside the radius, and returns them in a simple format.'],
    ['Species endpoint', 'public/api/species.php', 'Returns the names, taxonomy, photo and Wikipedia summary of one species. Answers from the species_cache table when it can.'],
    ['Encyclopedia endpoint', 'public/api/encyclopedia.php', 'Returns the most-recorded species of a group (action=top) and the facts shown in the detail dialog (action=facts).'],
    ['GBIF client', 'includes/gbif.php', 'Builds GBIF queries, retries a failed sighting search up to 3 times, and returns the sample dataset if GBIF stays unreachable.'],
    ['Wikipedia client', 'includes/wikipedia.php', 'Fetches the first paragraph and photo of a species\' Wikipedia article.'],
    ['Database access', 'includes/db.php, config/config.php', 'One shared MySQL connection. The credentials are in config.php, which is never uploaded to GitHub (NFR-03).'],
  ]),
  H2('3.3 One Search, Step by Step'),
  P('What happens when a user types "Ulsan" and presses Enter on the Map page:', { keepNext: true }),
  ...steps([
    'app.js reads the place name and sends it to geocode.php.',
    'geocode.php asks Nominatim for the coordinates of "Ulsan" and returns latitude, longitude and the full place name.',
    'app.js moves the map there and draws the radius circle, then sends the coordinates and the current filters (groups, dates, radius, maximum records) to sightings.php.',
    'sightings.php checks the dates, and gbif.php asks the GBIF Occurrence API for animal records with coordinates inside the radius. If GBIF fails, it tries again (up to 3 times), then falls back to the sample dataset.',
    'app.js draws a colored pin for every record, fills the Recent Sightings table, and selects the first sighting.',
    'For the selected sighting, app.js asks species.php for the species details. species.php answers from species_cache if it has a recent copy; otherwise it asks GBIF and Wikipedia, saves the answer, and returns it.',
  ]),
);

/* ------------------------------------------------------------------ */
/* 4. Data design                                                      */
/* ------------------------------------------------------------------ */
add(H1('4. Data Design', { newPage: true }),
  H2('4.1 Database Decision'),
  P('WildTrack shows live data from GBIF and has no user accounts (NFR-05), so most of its data does not need to be stored: the GBIF API acts as the database. Only one table is kept, as a cache. The three tables of the earlier schema were reviewed against the requirements:', { keepNext: true }),
  table([2100, 1500, TW - 3600], ['Table', 'Decision', 'Reason'], [
    ['**species_cache**', 'Keep and connect', 'A species\' names, taxonomy, photo and description rarely change, but collecting them needs two GBIF calls and one Wikipedia call. Saving the result lets species.php answer every later request from MySQL in milliseconds (NFR-01), and an old copy can still be shown if GBIF is down (NFR-04).'],
    ['saved_locations', 'Remove', 'Saved locations belong to a person, which needs accounts. Accounts are out of scope (Requirements Analysis, Section 5.2). The Quick Locations chips cover common places (FR-11).'],
    ['search_history', 'Remove', 'No requirement or use case reads it. Storing users\' searched places without a purpose would only add privacy risk.'],
  ]),
  spacer(60),
  P('Sighting records and encyclopedia lists are not stored. They change every day on GBIF, a single search can return up to 300 records, and FR-03 requires them to be retrieved live. If accounts are added later, saved_locations can be brought back together with a user table.', { italics: true, color: GREY }),

  H2('4.2 Conceptual Schema'),
  P('Figure 2 is the conceptual schema in Chen notation. It shows the four things WildTrack works with and how they are connected, without any detail about storage. Rectangles are **entities**, diamonds are **relationships**, and ovals are **attributes**. An underlined attribute is the key that identifies each entity; a double oval is multivalued (an animal group has several GBIF taxon keys); a dashed oval is derived (the record count is calculated by GBIF, not stored). location and date_range are composite attributes made of smaller attributes. 1, M and N give the cardinality, and a double line means total participation: every entity on that side must take part in the relationship.', { keepNext: true }),
  figure('conceptual.png', 640, 'Figure 2 – Conceptual schema (Chen notation)'),
  P('Reading the diagram:', { keepNext: true }),
  bullet('A **SEARCH** returns many **OCCURRENCES** (1:N) and filters by one or more **ANIMAL_GROUPS** (M:N). Every search must use at least one group (total participation).'),
  bullet('Every **OCCURRENCE** is classified into exactly one **ANIMAL_GROUP** (total participation). An occurrence identified to species level is linked to one **SPECIES**; one identified only to genus or family is not, so that participation is partial.'),
  bullet('An **ANIMAL_GROUP** includes many **SPECIES**, and every species belongs to a group (total participation). The groups are arranged in two divisions, Vertebrates and Invertebrates, which the Encyclopedia shows as a tree.', { after: 120 }),

  H2('4.3 Entity-Relationship Diagram'),
  P('Figure 3 turns the conceptual schema into a logical model with keys and data types, in crow\'s-foot notation. The header color of each entity shows where its data lives: green is stored in MySQL, amber is fetched live from GBIF for each request, and blue is held in the browser or in a fixed list in the code. Each line end shows the minimum and maximum number of entities on that side, also written as text (for example, 0..* means zero or more). The INCLUDES relationship of Figure 2 has no foreign key: GBIF works out which species belong to a group from their classification when the Encyclopedia sends the group\'s taxon keys.', { keepNext: true }),
  figure('erd.png', 672, 'Figure 3 – Entity-relationship diagram'),
  H2('4.4 Entities'),
  table([2000, 2300, TW - 4300], ['Entity', 'Where It Lives', 'Description'], [
    ['**SEARCH**', 'Browser memory (state in app.js)', 'The current search: location, radius, date range, and maximum number of records. Only one search exists at a time, so it has no key. It is replaced when the user searches again and is lost when the page is closed.'],
    ['**ANIMAL_GROUP**', 'Fixed lists in app.js (Map, 6 groups) and encyclopedia.php (12 groups)', 'A group of animals with its name, division (Vertebrates or Invertebrates), description, color, icon, and the GBIF taxon keys used to filter by it. The Map uses six groups; the Encyclopedia splits Invertebrates into seven smaller groups (insects, spiders, crabs, snails, worms, jellyfish, starfish).'],
    ['**OCCURRENCE**', 'GBIF Occurrence API (not stored)', 'One recorded sighting: what was seen, where, and when, with an optional photo. Returned by sightings.php and shown as a map pin and a table row.'],
    ['**SPECIES**', 'MySQL table species_cache', 'One species: names, taxonomy (Kingdom → Species), a photo and a short Wikipedia description. Copied from GBIF and Wikipedia the first time anyone views that species, then reused for 30 days.'],
  ]),
  H2('4.5 Relationships'),
  table([2900, 1500, TW - 4400], ['Relationship', 'Cardinality', 'Meaning'], [
    ['SEARCH **returns** OCCURRENCE', '1 to 0..*', 'A search returns zero or more sightings (at most the chosen maximum, 30–300). Each sighting shown belongs to the current search.'],
    ['SEARCH **filters by** ANIMAL_GROUP', '0..* to 1..*', 'A search uses one to six groups (at least one must be ticked, UC-04 A2). A group can be used by any number of searches.'],
    ['ANIMAL_GROUP **classifies** OCCURRENCE', '1 to 0..*', 'Each sighting belongs to exactly one group, worked out from its taxonomic class (groupOf() in app.js). A group can have any number of sightings.'],
    ['OCCURRENCE **is identified as** SPECIES', '0..* to 0..1', 'A sighting identified to species level has one species_key. Some sightings are identified only to genus or family, so the link is optional (UC-07 A4). A species can appear in many sightings.'],
    ['ANIMAL_GROUP **includes** SPECIES', '1 to 1..*', 'Every species belongs to one group; the Encyclopedia lists the 24 most-recorded species of each group. GBIF resolves this from the classification, so it is not a stored foreign key.'],
  ]),
  H2('4.6 Data Dictionary: species_cache'),
  P('The species_cache table is in the wildlife_tracker database (MySQL, InnoDB, utf8mb4). The columns are filled from the GBIF Species API and the Wikipedia page summary.', { keepNext: true }),
  table([1750, 1600, 900, TW - 4250], ['Column', 'Type', 'Null', 'Description (source)'], [
    ['**species_key**', 'INT UNSIGNED', 'No', 'Primary key. The GBIF species key (key), also used as speciesKey in occurrence records.'],
    ['scientific_name', 'VARCHAR(200)', 'Yes', 'Scientific name with author (GBIF scientificName), for example "Larus crassirostris Vieillot, 1818".'],
    ['vernacular_name', 'VARCHAR(200)', 'Yes', 'English common name (GBIF vernacularName), for example "Black-tailed Gull". If GBIF has none, the title of the Wikipedia article is used.'],
    ['taxon_rank', 'VARCHAR(20)', 'Yes', 'Rank of the record (GBIF rank), normally SPECIES.'],
    ['kingdom', 'VARCHAR(100)', 'Yes', 'Kingdom. Always Animalia, because WildTrack only shows animals.'],
    ['phylum', 'VARCHAR(100)', 'Yes', 'Phylum, for example Chordata.'],
    ['class_name', 'VARCHAR(100)', 'Yes', 'Class. Named class_name because "class" is a reserved word in PHP.'],
    ['order_name', 'VARCHAR(100)', 'Yes', 'Order. Named order_name because ORDER is a reserved SQL word.'],
    ['family', 'VARCHAR(100)', 'Yes', 'Family.'],
    ['genus', 'VARCHAR(100)', 'Yes', 'Genus.'],
    ['species', 'VARCHAR(200)', 'Yes', 'Species name without author, used to look up the Wikipedia article.'],
    ['image_url', 'VARCHAR(500)', 'Yes', 'Photo of the species: the Wikipedia article\'s lead photo (chosen by editors, small), or else the first GBIF species photo.'],
    ['summary', 'TEXT', 'Yes', 'First paragraph of the English Wikipedia article. Empty if there is no article.'],
    ['wiki_url', 'VARCHAR(300)', 'Yes', 'Link to the Wikipedia article, used by the "Read more on Wikipedia" button.'],
    ['cached_at', 'TIMESTAMP', 'No', 'When the row was saved or last refreshed. Set by MySQL (DEFAULT CURRENT_TIMESTAMP, ON UPDATE CURRENT_TIMESTAMP).'],
  ]),
  H2('4.7 Cache Rules'),
  P('species.php uses the table as a read-through cache. The rules keep the Species Profile and the Encyclopedia working even if MySQL or Wikipedia is not available:', { keepNext: true }),
  ...steps([
    'Look up the row with the requested species_key.',
    'If a row exists and cached_at is less than **30 days** old, return it without calling GBIF or Wikipedia.',
    'Otherwise, ask the GBIF Species API (/species/{key} and /species/{key}/media) and the Wikipedia page summary.',
    'If both answered, save the result with INSERT … ON DUPLICATE KEY UPDATE (adding a new row or refreshing the old one) and return it. If Wikipedia could not be reached, return the result but do not save it, so the next request tries again instead of keeping "no description" for 30 days.',
    'If GBIF does not answer but an older row exists, return the older row rather than an error (NFR-04).',
    'If the database cannot be reached, skip the cache and work directly from GBIF and Wikipedia.',
  ]),
  spacer(60),
  P('The response header X-Cache shows which rule was used (HIT, MISS or STALE), which makes the cache easy to test. In testing, a species took about 1.5–2 seconds the first time (MISS) and under 0.01 seconds afterwards (HIT). The browser also keeps its own copy for the open page (state.speciesCache in app.js), so viewing the same species twice sends no request at all (UC-07 A2).'),
);

/* ------------------------------------------------------------------ */
/* 5. Data flow design                                                 */
/* ------------------------------------------------------------------ */
add(H1('5. Data Flow Design', { newPage: true }),
  H2('5.1 Notation'),
  P('The data flow diagrams use Gane–Sarson notation. Rounded boxes are **processes**, numbered so that each Level 1 process can be broken down further later. Shaded square boxes are **external entities**: people or systems outside WildTrack that send or receive data. Open-ended boxes are **data stores**. Arrows are **data flows**, labelled with the data they carry. The diagrams show what data moves where, not the order in which things happen; the order is shown by the flowcharts in the Requirements Analysis (Figures 3 and 4).'),
  H2('5.2 Context Diagram (Level 0)'),
  P('Figure 4 shows the whole of WildTrack as a single process and every external entity it exchanges data with. The User is the only person. The other six entities are services: the device\'s geolocation (for "Locate Me"), Nominatim, the GBIF API, Wikipedia, the map tile services, and the photo hosts.', { keepNext: true }),
  figure('dfd_context.png', 600, 'Figure 4 – Context diagram (Level 0 DFD)'),
  H2('5.3 Level 1 Data Flow Diagram'),
  P('Figure 5 breaks the system into five processes and shows the two data stores. Processes 1.0 to 3.0 serve the Map page, process 5.0 serves the Encyclopedia, and process 4.0 serves both: it is the only process that gets species details, so both pages share the same cache. GBIF is drawn as three entities (Occurrence API, Species API, and the facets used by the Encyclopedia) to keep the arrows short; they are the same service.', { keepNext: true }),
  figure('dfd_level1.png', 560, 'Figure 5 – Level 1 data flow diagram'),
  H2('5.4 Process Descriptions'),
  table([1500, 2500, 2500, TW - 6500], ['Process', 'Input', 'Output', 'Implemented In'], [
    ['**1.0** Resolve Location', 'Place name or Quick Location from the User; or GPS position from Device Geolocation', 'Coordinates and place name to 2.0. Place name to Nominatim', 'handleSearch(), quickSelect(), useCurrentLocation() in app.js; geocode.php'],
    ['**2.0** Retrieve Sightings', 'Coordinates from 1.0; filter choices from the User; occurrence records from GBIF; sample records from D2', 'Query to the GBIF Occurrence API; sightings (JSON) to 3.0', 'loadSightings() in app.js; sightings.php; gbif_search_nearby() in gbif.php'],
    ['**3.0** Display Map and Sightings', 'Sightings from 2.0; map tiles; photos; clicks from the User', 'Pins, table, legend and status messages to the User; the selected sighting to 4.0', 'renderMarkers(), renderTable(), setLoading() in app.js; Leaflet.js'],
    ['**4.0** Get Species Details', 'Species key from 3.0 or 5.0; cached species from D1; taxonomy and photo from the GBIF Species API; summary and photo from Wikipedia', 'Species profile to the User (Map page); species details to 5.0; new species row to D1', 'showProfile(), getSpecies() in app.js; species.php; wikipedia.php'],
    ['**5.0** Browse Encyclopedia', 'Group and clicked card from the User; species lists, record counts and IUCN status from GBIF; species details from 4.0', 'Species cards and the detail dialog to the User; species keys to 4.0', 'loadGroup(), openSpecies() in encyclopedia.js; encyclopedia.php'],
  ]),
  H2('5.5 Data Stores'),
  table([1900, 2400, TW - 4300], ['Data Store', 'Implemented As', 'Contents and Use'], [
    ['**D1** Species Cache', 'MySQL table species_cache (Section 4.6)', 'One row per species ever viewed on either page. Read and written by process 4.0 under the cache rules in Section 4.7.'],
    ['**D2** Sample Dataset', 'Fixed list in gbif_sample_fallback() (gbif.php)', 'Five real GBIF records from around Busan. Read by process 2.0 only when GBIF cannot be reached after three attempts (NFR-04, UC-03 A3). Never written.'],
  ]),
  H2('5.6 External Entities'),
  table([2300, TW - 2300], ['External Entity', 'What WildTrack Sends and Receives'], [
    ['User', 'Sends searches, filter choices, clicks on pins, rows and cards. Receives the map, the sightings table, the Species Profile, the encyclopedia cards and all messages.'],
    ['Device Geolocation', 'The browser\'s location service. Sends the device position, only after the user allows it (UC-01 A4).'],
    ['Nominatim (OpenStreetMap)', 'Receives a place name, sends back its coordinates. Requires a descriptive User-Agent, which geocode.php sets.'],
    ['GBIF API', 'Receives occurrence searches, species keys and facet queries. Sends sightings, species taxonomy and photos, the most-recorded species of a group, record counts and IUCN Red List status.'],
    ['Wikipedia', 'Receives a scientific name, sends back the first paragraph and lead photo of the article. Its API policy asks for a contact link in the User-Agent, which wikipedia.php sets.'],
    ['Map Tile Services', 'OpenStreetMap (Street) and Esri (Satellite, Topographic). Send the map images for the visible area.'],
    ['Photo Hosts', 'iNaturalist, Wikimedia Commons and other sites that GBIF and Wikipedia photo links point to.'],
  ]),
);

/* ------------------------------------------------------------------ */
/* 6. User interface design                                            */
/* ------------------------------------------------------------------ */
const key = rows => table([600, 2300, TW - 4300, 1400], ['#', 'Element', 'What it does', 'Requirement'],
  rows.map(([n, e, p, r]) => [{ t: `**${n}**`, align: AlignmentType.CENTER }, e, p, r]), { cantSplit: true });

add(H1('6. User Interface Design', { newPage: true }),
  P('WildTrack has two pages, Map and Encyclopedia, which share the same header. The wireframes below show their layout without colors or real content: grey boxes with a cross are images, and grey bars stand for text that comes from GBIF or Wikipedia. The green numbers match the tables under each figure, which explain what every element does.'),
  H2('6.1 Shared Header'),
  P('The header is the same on both pages (partials/header.php). It stays fixed at the top of the window while the page scrolls, so the user can switch pages at any time.', { keepNext: true }),
  table([2300, TW - 2300], ['Element', 'What it does'], [
    ['WildTrack logo and subtitle', 'Shows the name of the website. Clicking the logo opens the Map page. On narrow screens the subtitle is hidden so the links stay on one line, and on phones the links show icons only.'],
    ['Map', 'Opens the Map page (index.php). Highlighted while the user is on it.'],
    ['Encyclopedia', 'Opens the Encyclopedia page (encyclopedia.php). Highlighted while the user is on it.'],
    ['About', 'Opens a small window explaining what WildTrack is, the team, and the data sources (GBIF, Wikipedia, OpenStreetMap, Esri). Closed with "Close" or the Esc key.'],
  ]),
  spacer(60),
  P('Removed after review: the "EN" language menu and the "Guest" account menu were removed because WildTrack has one language and no accounts, so they did nothing. The Home / Map / Species / About buttons on the left of the Map page were removed because they repeated the header links and the page sections.', { italics: true, color: GREY }),

  H2('6.2 Map Page', { newPage: true }),
  P('The Map page (index.php) is the home page. The sidebar on the left holds every search setting, the map and the Recent Sightings table share the center, and the Species Profile panel on the right shows the selected sighting. Any change in the sidebar runs the search again immediately; there is no separate "Search" button for the filters.', { keepNext: true }),
  figure('wf_dashboard.png', 640, 'Figure 6 – Wireframe: Map page'),
  key([
    ['1', 'Header links', 'Switch between the Map and Encyclopedia pages, or open About (Section 6.1).', 'FR-02'],
    ['2', 'Search Location box and "Locate Me"', 'The user types a place name and presses Enter or the magnifier icon; the map moves there and the sightings reload. "Locate Me" asks the browser for the device position instead (the user must allow it) and shows "Current Location (GPS)" in the box.', 'FR-01 / UC-01'],
    ['3', 'Quick Locations chips', 'One click searches a common place (Busan, Seoul, Jeju Island, Ulsan, Hallasan, Tokyo, Vancouver) without typing. The chosen chip is highlighted.', 'FR-11 / UC-11'],
    ['4', 'Search Radius chips', 'Set how far around the location to search: 5, 10, 25, 50 or 100 km (default 10). The circle on the map and its label change size, and the sightings reload.', 'FR-06 / UC-06'],
    ['5', 'Animal Groups checkboxes', 'Tick or untick Mammals, Birds, Reptiles, Amphibians, Fish and Invertebrates. Only sightings of the ticked groups are shown. With all six ticked, every animal is shown; with none, the message "Select at least one animal group" appears.', 'FR-04 / UC-04'],
    ['6', 'Observation Date fields', 'Show only sightings recorded between the From and To dates. Either date can be left empty. A From date after the To date is refused with a message, and no search is sent.', 'FR-05 / UC-05'],
    ['7', 'Filters (Max records)', 'Choose how many sightings one search returns: 30, 75 (default), 150 or 300. More records take longer to load.', 'FR-03 / UC-03'],
    ['8', 'Base-map tabs', 'Change the map background: Street (OpenStreetMap), Satellite or Topographic (Esri). Pins and the radius circle stay in place.', 'FR-02 / UC-02'],
    ['9', 'Map legend', 'Explains the color and icon of each animal group, so every pin can be identified without clicking it.', 'FR-08 / UC-08'],
    ['10', 'Map, pins and radius circle', 'Each pin is one sighting, colored by group. Hovering shows the name and date; clicking selects it in the Species Profile. The map can be dragged and zoomed; the + / − buttons zoom and the crosshair button returns to the search location.', 'FR-02, FR-03 / UC-02, UC-03'],
    ['11', 'Recent Sightings table', 'Lists the sightings 10 per page with photo, name, group, date, location and coordinates. The arrows change page, "Showing x–y of N" shows the count, and "View" zooms the map to that sighting and selects it.', 'FR-03, FR-10 / UC-03, UC-10'],
    ['12', 'Species Profile panel', 'Shows the selected sighting: photo, group, English and scientific name, the taxonomy table (Kingdom to Species), the date observed, the locality and the coordinates. The X button or the Esc key clears the selection.', 'FR-07 / UC-07'],
    ['13', '"Explore on GBIF Network" button', 'Opens the official GBIF page of the species in a new browser tab (Section 6.3).', 'FR-09 / UC-09'],
  ]),

  H2('6.3 The "Explore on GBIF Network" Button'),
  P('This button lets the user check the original source of what WildTrack shows, which builds trust in the data (FR-09, UC-09). When it is clicked:', { keepNext: true }),
  bullet('The GBIF species page (www.gbif.org/species/{species key}) opens **in a new browser tab**, so WildTrack stays open in the first tab with the same search and selection.'),
  bullet('That page is GBIF\'s own, official record of the species: the full classification, other names, a world map of all its records, the datasets and organizations that recorded it, and more photos.'),
  bullet('If the sighting is not identified to species level, the button opens the GBIF page of that single occurrence record instead (UC-09 A1).'),
  bullet('The Encyclopedia has the same button ("Explore on GBIF") in its detail dialog, next to "Read more on Wikipedia".', { after: 120 }),

  H2('6.4 Encyclopedia Page', { newPage: true }),
  P('The Encyclopedia (encyclopedia.php) describes the best-known animals of each group in short, simple entries, like a small encyclopedia. It has no database of its own: the list of animals comes live from GBIF, and each entry\'s description from Wikipedia. "Best-known" means the species with the most records on GBIF in South Korea.', { keepNext: true }),
  figure('wf_encyclopedia.png', 672, 'Figure 7 – Wireframe: Encyclopedia page'),
  key([
    ['1', 'Header links', 'Same as on the Map page; Encyclopedia is highlighted.', '–'],
    ['2', '"Animals of South Korea" note', 'Explains that every list shows the species with the most GBIF records in South Korea. The Encyclopedia covers South Korea only, where the team and its users are; a worldwide list would be filled with species from scientific deep-sea surveys that have no description.', 'FR-12'],
    ['3', 'Vertebrates tree', 'The five vertebrate groups (Mammals, Birds, Reptiles, Amphibians, Fish), each with its icon. Clicking one opens it. The note under the title explains the division ("Animals with a backbone").', 'FR-12'],
    ['4', 'Invertebrates tree', 'Seven invertebrate groups: Insects, Spiders & relatives, Crabs & shrimps, Snails & shellfish, Segmented worms, Jellyfish & corals, Starfish & urchins.', 'FR-12'],
    ['5', 'Group introduction', 'The path (Animals › Vertebrates › Mammals), the group name and scientific name, and a two-line description written for non-specialists.', 'FR-12'],
    ['6', 'Record count', 'How many GBIF records the group has in South Korea, and how the list below is ordered (most records first).', 'FR-12'],
    ['7', 'Species card', 'One of the 24 most-recorded species: photo, English name, scientific name, the first three lines of the Wikipedia description, and its number of records. Clicking the card (or pressing Enter on it) opens the detail dialog.', 'FR-12'],
    ['8', 'Detail dialog: photo and names', 'A larger photo, the English name, the scientific name with author, and the full Wikipedia description. If there is no English article, a short description built from the classification is shown instead. The X button, the Esc key or a click outside closes it.', 'FR-12'],
    ['9', 'Conservation status and records', 'The IUCN Red List status in a colored badge (for example green Least Concern, orange Vulnerable, red Endangered) and the number of GBIF records of the species in South Korea.', 'FR-12'],
    ['10', 'Classification', 'The full path from Kingdom to Species.', 'FR-07, FR-12'],
    ['11', '"Read more on Wikipedia" button', 'Opens the species\' Wikipedia article in a new tab.', 'FR-12'],
    ['12', '"Explore on GBIF" button', 'Opens the species\' GBIF page in a new tab, as described in Section 6.3.', 'FR-09'],
  ]),

  H2('6.5 Messages and Loading States'),
  P('The user always sees what the system is doing (FR-10). These are the messages shown by the two pages:', { keepNext: true }),
  table([2700, TW - 2700], ['Situation', 'What the user sees'], [
    ['A search is running', 'A spinner on the map with "Querying GBIF biodiversity records…"; the Locate Me button is disabled until it finishes.'],
    ['Empty search box', 'A message: "Please enter a location or city name".'],
    ['Place not found', '"Location not found — try a different spelling"; the map stays where it was.'],
    ['Location permission refused', '"Could not retrieve current location: …" with the browser\'s reason.'],
    ['No group ticked', '"Select at least one animal group"; the map and table are emptied.'],
    ['From date after To date', '"The "From" date must be on or before the "To" date"; no search is sent.'],
    ['No sightings found', 'In the table: "No fauna records found. Try increasing the radius or searching a different area."'],
    ['GBIF unreachable (Map)', 'The sample dataset is shown, with "GBIF is unreachable — showing sample data (filters not applied)".'],
    ['Encyclopedia list loading', 'Grey placeholder cards and "Asking GBIF for the most-recorded species…"; each card fills in as its details arrive.'],
    ['GBIF unreachable (Encyclopedia)', '"Could not load the list from GBIF" with a "Try again" button.'],
    ['Group with no records in South Korea', '"GBIF has no records of this group in South Korea yet."'],
  ]),
);

/* ------------------------------------------------------------------ */
/* 7. Traceability                                                     */
/* ------------------------------------------------------------------ */
add(H1('7. Design-to-Requirements Traceability', { newPage: true }),
  P('Each design element below is linked to the requirements and use cases it supports. FR-12 is the proposed Encyclopedia requirement (Section 2.5).', { keepNext: true }),
  table([3300, 2500, TW - 5800], ['Design Element', 'Requirements', 'Use Cases'], [
    ['Process 1.0 Resolve Location', 'FR-01, FR-11', 'UC-01, UC-11'],
    ['Process 2.0 Retrieve Sightings', 'FR-03, FR-04, FR-05, FR-06, NFR-01, NFR-04', 'UC-03, UC-04, UC-05, UC-06'],
    ['Process 3.0 Display Map and Sightings', 'FR-02, FR-03, FR-08, FR-10', 'UC-02, UC-03, UC-08, UC-10'],
    ['Process 4.0 Get Species Details', 'FR-07, FR-09, NFR-01', 'UC-07, UC-09'],
    ['Process 5.0 Browse Encyclopedia', 'FR-12 (proposed), FR-09', '(new use case, next revision)'],
    ['D1 Species Cache (species_cache table)', 'FR-07, FR-12, NFR-01, NFR-04', 'UC-07'],
    ['D2 Sample Dataset', 'NFR-04', 'UC-03 (A3)'],
    ['ANIMAL_GROUP entity (app.js, encyclopedia.php)', 'FR-04, FR-08, FR-12', 'UC-04, UC-08'],
    ['Shared header (Map, Encyclopedia, About)', 'FR-02, NFR-05, NFR-06', 'All'],
    ['Messages and loading states (Section 6.5)', 'FR-10, NFR-04', 'UC-10'],
    ['No accounts; no stored searches or locations', 'NFR-05', 'All'],
    ['Credentials in config/config.php; database access only in includes/db.php', 'NFR-03, NFR-08', '–'],
  ]),
);

/* ------------------------------------------------------------------ */
/* 8. Individual contribution                                          */
/* ------------------------------------------------------------------ */
add(H1('8. Individual Contribution (System Design)', { newPage: true }),
  table([2500, 2200, TW - 7000, 2300], ['Member', 'Role', 'Task', 'Evidence'], [
    ['Gupta Aman Kumar', 'Project Manager / Frontend', 'Coordinated the System Design and assembled the document; system architecture; shared header; UI wireframes of the Map and Encyclopedia pages and the description of every element; Encyclopedia page interface', 'Sections 1–3, 6; partials/header.php, encyclopedia.php'],
    ['Singh Shubham Kumar', 'Backend Developer', 'Database decision, conceptual schema, entity-relationship diagram and species_cache data dictionary; species_cache table and the cache in species.php; encyclopedia.php and wikipedia.php endpoints', 'Section 4; sql/schema.sql, api/species.php, api/encyclopedia.php'],
    ['Paudel Amrit', 'Full-stack Developer / QA', 'Data flow diagrams with process, data store and external entity descriptions; messages and loading states; design-to-requirements traceability; testing of the cache and the Encyclopedia', 'Sections 5, 6.5, 7'],
  ]),
);

writeDoc({
  file: 'System_Design_v1.0.docx',
  title: 'System Design Document - Wildlife Sighting Mapping and Species Distribution Tracker (v1.0)',
  description: 'System design: architecture, conceptual schema, ERD, data dictionary, data flow diagrams, UI design',
  footer: 'CAPR-F2026 | Group 3 | System Design v1.0',
  body,
});
