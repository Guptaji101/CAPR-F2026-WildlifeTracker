// Builds the revised Week 3 Requirements Analysis document (v1.1).
const fs = require('fs');
const path = require('path');
const {
  Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, Table, TableRow, TableCell,
  WidthType, BorderStyle, ShadingType, ImageRun, Footer, PageNumber, TabStopType, TableOfContents,
  LevelFormat, VerticalAlign, TableLayoutType, Tab, PageBreak,
} = require('docx');

const FIG = path.join(__dirname, 'fig');
const OUT = path.join(__dirname, 'out');
fs.mkdirSync(OUT, { recursive: true });

const FONT = 'Arial';
const GREEN = '2E6F40', LIGHT = 'EAF3EA', GREY = '555555', BORDER = 'A6A6A6';
const TW = 10080; // text width: 7.0 in (US Letter, 0.75 in margins)

/* ---------------- text helpers ---------------- */
// "**bold**" markup -> runs
function runs(text, o = {}) {
  return String(text).split('**').map((t, i) => (t ? new TextRun({
    text: t, font: FONT, bold: i % 2 === 1 || o.bold, italics: o.italics, color: o.color, size: o.size,
  }) : null)).filter(Boolean);
}
function P(text, o = {}) {
  return new Paragraph({
    children: runs(text, o), alignment: o.align, keepNext: o.keepNext, keepLines: o.keepLines,
    spacing: { before: o.before ?? 0, after: o.after ?? 120, line: o.line ?? 276 },
  });
}
const H1 = t => new Paragraph({
  heading: HeadingLevel.HEADING_1, children: [new TextRun(t)],
  border: { bottom: { style: BorderStyle.SINGLE, size: 8, color: GREEN, space: 4 } },
});
const H2 = t => new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun(t)] });
const H3 = t => new Paragraph({ heading: HeadingLevel.HEADING_3, children: [new TextRun(t)] });
const bullet = (t, o = {}) => new Paragraph({
  numbering: { reference: 'bullets', level: 0 }, children: runs(t, o), keepNext: o.keepNext,
  spacing: { after: o.after ?? 60, line: o.line ?? 264 },
});
let listInstance = 0;
const steps = (items, o = {}) => {
  const inst = ++listInstance;
  return items.map(t => new Paragraph({
    numbering: { reference: 'steps', level: 0, instance: inst }, children: runs(t, o),
    spacing: { after: 30, line: 252 },
  }));
};
const caption = t => new Paragraph({ style: 'Caption', children: [new TextRun(t)] });

function figure(file, widthPx, title) {
  const buf = fs.readFileSync(path.join(FIG, file));
  const w = buf.readUInt32BE(16), h = buf.readUInt32BE(20);
  return [
    new Paragraph({
      alignment: AlignmentType.CENTER, keepNext: true, spacing: { before: 120, after: 40 },
      children: [new ImageRun({
        type: 'png', data: buf, transformation: { width: widthPx, height: Math.round(widthPx * h / w) },
        altText: { title, description: title, name: file },
      })],
    }),
    caption(title),
  ];
}

/* ---------------- table helpers ---------------- */
const line = { style: BorderStyle.SINGLE, size: 4, color: BORDER };
const BORDERS = { top: line, bottom: line, left: line, right: line, insideHorizontal: line, insideVertical: line };

function cell(content, width, o = {}) {
  const items = Array.isArray(content) ? content : [content];
  const children = items.map(c => (typeof c === 'string'
    ? P(c, { size: o.size ?? 18, bold: o.bold, color: o.color, after: 0, line: 252, align: o.align, keepNext: o.keepNext })
    : c));
  return new TableCell({
    width: { size: width, type: WidthType.DXA },
    shading: o.fill ? { fill: o.fill, type: ShadingType.CLEAR, color: 'auto' } : undefined,
    margins: { top: 70, bottom: 70, left: 110, right: 110 },
    verticalAlign: o.valign ?? VerticalAlign.TOP,
    rowSpan: o.rowSpan, columnSpan: o.colSpan,
    children,
  });
}

// rows: arrays of strings or {t, rowSpan, colSpan, fill, bold, align}; omit cells covered by a rowSpan above.
function table(widths, header, rows, o = {}) {
  const out = [];
  if (header) {
    out.push(new TableRow({
      tableHeader: true, cantSplit: true,
      children: header.map((h, i) => cell(h, widths[i], { fill: GREEN, color: 'FFFFFF', bold: true, valign: VerticalAlign.CENTER, keepNext: true })),
    }));
  }
  const occ = new Array(widths.length).fill(0);
  rows.forEach(r => {
    const busy = occ.map(v => v > 0);
    let col = 0;
    const cells = [];
    r.forEach(item => {
      while (col < widths.length && busy[col]) col++;
      const spec = (typeof item === 'string' || Array.isArray(item) || item instanceof Paragraph) ? { t: item } : item;
      const cs = spec.colSpan || 1;
      const w = widths.slice(col, col + cs).reduce((a, b) => a + b, 0);
      cells.push(cell(spec.t, w, { ...(o.cell || {}), ...spec }));
      if (spec.rowSpan > 1) for (let k = col; k < col + cs; k++) occ[k] = spec.rowSpan;
      col += cs;
    });
    for (let k = 0; k < occ.length; k++) if (occ[k] > 0) occ[k]--;
    out.push(new TableRow({ cantSplit: o.cantSplit ?? true, children: cells }));
  });
  return new Table({
    width: { size: TW, type: WidthType.DXA }, columnWidths: widths, layout: TableLayoutType.FIXED,
    borders: BORDERS, rows: out,
  });
}
const spacer = (after = 120) => new Paragraph({ spacing: { after, line: 240 }, children: [] });

/* ---------------- content ---------------- */
const OBJ = [
  'Make existing global biodiversity data locally relevant and easy to explore for non-technical users.',
  'Provide a simple, visual, map-based way to view real recorded wildlife sightings near a chosen location.',
  'Deliver species information (taxonomy, photo, and source record) through a single, accessible interface.',
];

const FR = [
  ['FR-01', 'Location Search', 'The system shall allow users to set the search location by entering a place name, which is resolved to coordinates through geocoding, or by using the device\'s current location.', 'Must'],
  ['FR-02', 'Interactive Map', 'The system shall display an interactive map that users can pan and zoom, with a choice of standard (Map), Satellite, or Topographic base map.', 'Must'],
  ['FR-03', 'Sightings Display', 'The system shall display the wildlife sightings recorded within the search radius of the selected location as map pins and in a paged sightings table, retrieved live from the GBIF Occurrence API.', 'Must'],
  ['FR-04', 'Animal Group Filter', 'The system shall allow users to filter sightings by one or more animal groups: Mammals, Birds, Reptiles, Amphibians, Fish, and Invertebrates.', 'Must'],
  ['FR-05', 'Date Range Filter', 'The system shall allow users to filter sightings by observation date using a From date and a To date.', 'Should'],
  ['FR-06', 'Search Radius', 'The system shall allow users to select a search radius of 5, 10, 25, 50, or 100 km (default 10 km).', 'Should'],
  ['FR-07', 'Species Details', 'The system shall display a species detail panel when a user selects a sighting on the map or in the table, showing the common name, scientific name, taxonomy, photo (where available), observation date, locality, and coordinates.', 'Must'],
  ['FR-08', 'Map Legend', 'The system shall display a legend explaining the pin color and icon used for each animal group.', 'Should'],
  ['FR-09', 'GBIF Source Link', 'The system shall provide a link from the species detail panel that opens the corresponding official GBIF page in a new browser tab.', 'Should'],
  ['FR-10', 'Search Status', 'The system shall display the search status and the result count, including clear messages when a location is not found, no sightings match the filters, or a data service is unavailable.', 'Must'],
  ['FR-11', 'Quick-Access Locations', 'The system shall provide quick-access chips for commonly checked locations (e.g. Busan, Seoul, Jeju Island).', 'Could'],
];

const NFR = [
  ['NFR-01', 'Performance', 'Search results should typically load within approximately 5 seconds under normal broadband conditions; result set size is capped server-side to avoid excessive load times.', 'Must'],
  ['NFR-02', 'Compatibility', 'The system shall function correctly on the latest versions of Chrome, Firefox, and Edge.', 'Must'],
  ['NFR-03', 'Security', 'No API keys, database credentials, or sensitive configuration shall be exposed in frontend code or the public GitHub repository.', 'Must'],
  ['NFR-04', 'Reliability', 'The system shall retry failed external API requests automatically (up to 3 attempts) and fall back to a minimal sample dataset only if the data source is completely unreachable.', 'Must'],
  ['NFR-05', 'Usability', 'The interface shall be usable by non-technical users without requiring an account, login, or prior domain knowledge.', 'Must'],
  ['NFR-06', 'Usability', 'The interface layout shall adapt to different screen sizes using flexible, wrapping layout containers.', 'Should'],
  ['NFR-07', 'Constraint', 'The system shall be deployable on free-tier hosting with zero ongoing cost.', 'Must'],
  ['NFR-08', 'Maintainability', 'The codebase shall be organized into clearly separated modules (configuration, database access, external API access, presentation) to support maintainability by multiple team members.', 'Should'],
];

const NOT_FOUND = 'A2';
const UC = [
  {
    id: 'UC-01', name: 'Search Location', secondary: 'Nominatim Geocoding Service', reqs: 'FR-01 (messages: FR-10)',
    rel: 'Includes UC-03 View Nearby Sightings. Included by UC-11 Select Quick-Access Location.',
    goal: 'Center the map on a place the user is interested in, so that wildlife recorded near that place can be shown.',
    pre: ['The application is open in a web browser.', 'The Search Location box is visible in the sidebar.'],
    trigger: 'The user submits a place name.',
    main: [
      'User types a place name (for example, "Ulsan") into the Search Location box.',
      'User presses Enter or clicks the search (magnifier) icon.',
      'System checks that the search box is not empty.',
      'System shows a loading message and sends the place name to the location service (geocode.php).',
      'System obtains the coordinates of the best match from the Nominatim Geocoding Service.',
      'System moves the map to the location and draws the search-radius circle with its distance label.',
      'System confirms "Located ... successfully!".',
      'System loads the sightings for the new location (UC-03).',
    ],
    alt: [
      ['A1 – If the search box is empty (step 3):', ['System displays "Please enter a location or city name".', 'User enters a place name; the flow resumes at step 2.']],
      ['A2 – If no matching place is found (step 5):', ['System displays "Location not found — try a different spelling".', 'The map and the previous results stay unchanged; the user may enter a different name (step 1).']],
      ['A3 – If the geocoding service cannot be reached (step 5):', ['System displays "Could not reach location search service".', 'The map and the previous results stay unchanged.']],
      ['A4 – If the user clicks "Locate Me" instead of typing (steps 1–5):', ['The browser asks the user for permission to share the device location.', 'User allows access and System obtains the GPS coordinates; the search box shows "Current Location (GPS)".', 'The flow continues at step 6. If permission is refused, System displays "Could not retrieve current location"; if the browser has no location support, it displays "Geolocation is not supported by your browser". In both cases the map stays unchanged.']],
    ],
    post: 'The map is centered on the chosen location and the sightings for that location are displayed.',
  },
  {
    id: 'UC-02', name: 'Explore Map', secondary: 'Map Tile Services', reqs: 'FR-02', rel: 'None.',
    goal: 'Look around the searched area in more detail.',
    pre: ['The map is displayed (the default location, Busan, loads when the application opens).'],
    trigger: 'The user drags, scrolls, or uses a map control.',
    main: [
      'User drags the map to pan to a nearby area.',
      'System loads the map tiles for the newly visible area from the Map Tile Services.',
      'User zooms in or out with the mouse wheel or the + / − buttons.',
      'System redraws the map, the sighting pins, and the radius circle at the new zoom level, and updates the scale bar.',
    ],
    alt: [
      ['A1 – If the user wants a different base map:', ['User clicks the "Satellite" or "Topographic" tab above the map.', 'System replaces the base map; the pins and the radius circle stay in place.']],
      ['A2 – If the user wants to return to the search location:', ['User clicks the Recenter button below the zoom buttons.', 'System moves the map back to the current search location.']],
    ],
    post: 'The map shows the area and base map chosen by the user. Panning and zooming do not change the search location or reload sightings; a new area is searched with UC-01.',
  },
  {
    id: 'UC-03', name: 'View Nearby Sightings', secondary: 'GBIF API', reqs: 'FR-03 (messages: FR-10)',
    rel: 'Includes UC-10 View Search Status. Included by UC-01, UC-04, UC-05 and UC-06.',
    goal: 'See which animals have been recorded within the search radius of the chosen location.',
    pre: ['A search location is set (Busan is set automatically when the application opens).'],
    trigger: 'The application opens, or UC-01, UC-04, UC-05, UC-06 or UC-11 requests new results.',
    main: [
      'System shows the loading overlay "Querying GBIF biodiversity records..." on the map.',
      'System sends the location, radius, selected animal groups, date range, and maximum number of records (default 75) to the sightings service (sightings.php).',
      'System requests matching occurrence records from the GBIF API, limited to animals (kingdom Animalia) that have coordinates inside the radius.',
      'GBIF API returns the matching records, including a photo link where one exists.',
      'System places a color-coded pin on the map for each record.',
      'System lists the records in the Recent Sightings table, 10 per page, with photo, species name, group, date, location, and coordinates.',
      'System shows "Showing 1–10 of N" above the table and selects the first sighting in the Species Profile panel (UC-07).',
    ],
    alt: [
      ['A1 – If no records match (step 4):', ['System clears the pins and shows "No fauna records found. Try increasing the radius or searching a different area." in the table.']],
      ['A2 – If GBIF cannot be reached (step 3):', ['System retries automatically, up to 3 attempts in total (NFR-04).', 'If an attempt succeeds, the flow continues at step 4.']],
      ['A3 – If GBIF is still unreachable after 3 attempts:', ['System shows the built-in sample dataset on the map and in the table, so the screen is not left empty (NFR-04).', 'System displays the warning "GBIF is unreachable — showing sample data (filters not applied)".']],
      ['A4 – If the user changes Max records under Filters (30, 75, 150 or 300):', ['System repeats the flow from step 1 with the new limit.']],
      ['A5 – If the user moves through the table:', ['User clicks the next or previous arrow.', 'System shows the next or previous 10 sightings and updates "Showing x–y of N".']],
    ],
    post: 'The pins, the Recent Sightings table, and the Species Profile show the records for the current location and filters.',
  },
  {
    id: 'UC-04', name: 'Filter by Animal Group', secondary: 'GBIF API', reqs: 'FR-04', rel: 'Includes UC-03 View Nearby Sightings.',
    goal: 'Show only the groups of animals the user is interested in (for example, only birds and mammals).',
    pre: ['A search location is set.', 'All six groups are ticked when the application opens.'],
    trigger: 'The user ticks or unticks an animal group.',
    main: [
      'User ticks or unticks a group under Animal Groups: Mammals, Birds, Reptiles, Amphibians, Fish, or Invertebrates.',
      'System reloads the sightings for the ticked groups only (UC-03).',
      'System shows only the sightings that belong to the ticked groups, in each group\'s color.',
    ],
    alt: [
      ['A1 – If all six groups are ticked:', ['System sends no group filter, so sightings of all animals are shown.']],
      ['A2 – If no group is ticked:', ['System displays "Select at least one animal group" and empties the map and the table.']],
      ['A3 – If the ticked groups have no records nearby:', ['System shows the "No fauna records found" message (UC-03, A1).']],
    ],
    post: 'Only sightings from the ticked groups are shown, and the selection stays in place for later searches until the user changes it.',
  },
  {
    id: 'UC-05', name: 'Filter by Date Range', secondary: 'GBIF API', reqs: 'FR-05', rel: 'Includes UC-03 View Nearby Sightings.',
    goal: 'See only sightings recorded in a chosen period (for example, this year or a past season).',
    pre: ['A search location is set.'],
    trigger: 'The user changes a date under Observation Date.',
    main: [
      'User picks a From date and a To date under Observation Date.',
      'System checks that the From date is not after the To date.',
      'System reloads the sightings for the current location with the date range applied (UC-03).',
      'System shows only the sightings observed within the selected dates.',
    ],
    alt: [
      ['A1 – If only a From date is selected (step 1):', ['System uses today\'s date as the end of the range.']],
      ['A2 – If only a To date is selected (step 1):', ['System leaves the start of the range open and shows the sightings observed up to the To date.']],
      ['A3 – If the From date is after the To date (step 2):', ['System displays the error: The "From" date must be on or before the "To" date.', 'No search is sent; the user corrects a date and the flow resumes at step 2.']],
      ['A4 – If no sightings fall within the range:', ['System shows the "No fauna records found" message (UC-03, A1).']],
      ['A5 – If the user wants to remove the date filter:', ['User clears both date fields.', 'System reloads the sightings without a date restriction.']],
    ],
    post: 'Only sightings within the selected dates are shown, and the date range stays applied to later searches until it is cleared.',
  },
  {
    id: 'UC-06', name: 'Adjust Search Radius', secondary: 'GBIF API', reqs: 'FR-06', rel: 'Includes UC-03 View Nearby Sightings.',
    goal: 'Widen or narrow the area searched around the current location.',
    pre: ['A search location is set.'],
    trigger: 'The user clicks a radius chip.',
    main: [
      'User clicks a chip under Search Radius: 5, 10, 25, 50, or 100 km.',
      'System highlights the selected chip.',
      'System redraws the radius circle and its distance label (for example, "25 km") on the map.',
      'System reloads the sightings with the new radius (UC-03).',
    ],
    alt: [
      ['A1 – If no sightings exist within the new radius:', ['System shows the "No fauna records found" message, which suggests increasing the radius (UC-03, A1).']],
    ],
    post: 'The radius circle, pins, and table all reflect the selected radius.',
  },
  {
    id: 'UC-07', name: 'View Species Details', secondary: 'GBIF API', reqs: 'FR-07',
    rel: 'Extended by UC-09 Verify Record on GBIF (extension point: step 7).',
    goal: 'Learn what the recorded animal is, and where and when it was seen.',
    pre: ['Sightings are displayed on the map and in the Recent Sightings table (UC-03).'],
    trigger: 'The user selects a sighting.',
    main: [
      'User clicks a pin on the map (hovering over it first shows the animal\'s name, group, and date).',
      'System enlarges the pin, highlights the matching table row, and fills the Species Profile panel.',
      'System shows the sighting photo, group badge, name, observed date, locality, and coordinates.',
      'System requests the species details from the species service (species.php).',
      'System retrieves the English name and taxonomy from the GBIF API.',
      'System displays the common and scientific name and the taxonomy table (Kingdom, Phylum, Class, Order, Family, Genus, Species).',
      'User reads the details. [Extension point: Verify Record on GBIF, UC-09]',
      'User clears the selection with the close button (X) or the Esc key.',
    ],
    alt: [
      ['A1 – If the user selects the sighting from the table (step 1):', ['User clicks "View" in the Recent Sightings table.', 'System zooms the map to that sighting and shows its tooltip; the flow continues at step 2.']],
      ['A2 – If the species was already viewed in this session (step 4):', ['System reuses the stored details instead of calling GBIF again; the flow continues at step 6.']],
      ['A3 – If the sighting has no photo (step 3):', ['System uses the species photo from GBIF instead, or shows "No image provided by GBIF" (or "Image preview not available" if the image cannot be loaded).']],
      ['A4 – If the sighting is not identified to species level (step 4):', ['System shows the animal group only and the message "No media attached to this occurrence".']],
      ['A5 – If the species service is unavailable (step 5):', ['System keeps the sighting details from step 3; the taxonomy table shows only the known ranks.']],
    ],
    post: 'The user has seen the identity, taxonomy, photo (if available), and observation details of the selected sighting.',
  },
  {
    id: 'UC-08', name: 'Read Map Legend', secondary: 'None', reqs: 'FR-08', rel: 'None.',
    goal: 'Understand what each pin color and icon means without opening every record.',
    pre: ['The map is displayed.'],
    trigger: 'The user wants to identify the animal groups shown on the map.',
    main: [
      'System displays the Animal Groups legend on the map, listing each group with its color and icon: Mammals, Birds, Reptiles, Amphibians, Fish, and Invertebrates.',
      'User compares the pin colors and icons on the map with the legend.',
      'User hovers over a pin.',
      'System shows a tooltip with the animal\'s name, scientific name, group, and observation date.',
    ],
    alt: [],
    post: 'The user can tell the animal group of any pin from its color and icon.',
  },
  {
    id: 'UC-09', name: 'Verify Record on GBIF', secondary: 'None (opens the public GBIF website)', reqs: 'FR-09',
    rel: 'Extends UC-07 View Species Details (at step 7).',
    goal: 'Check the original, authoritative source behind a sighting.',
    pre: ['The Species Profile panel shows a sighting (UC-07).'],
    trigger: 'The user clicks "Explore on GBIF Network".',
    main: [
      'User clicks "Explore on GBIF Network" in the Species Profile panel.',
      'System opens the GBIF species page for the selected animal in a new browser tab.',
      'User reviews the source information on the GBIF website.',
    ],
    alt: [
      ['A1 – If the sighting is not identified to species level (step 2):', ['System opens the GBIF occurrence record for that sighting instead.']],
    ],
    post: 'The GBIF page is open in a new tab, and WildTrack stays open in the original tab.',
  },
  {
    id: 'UC-10', name: 'View Search Status', secondary: 'None', reqs: 'FR-10', rel: 'Included by UC-03 View Nearby Sightings.',
    goal: 'Always know what the system is doing and what a search returned.',
    pre: ['A search or filter change has started (UC-01, UC-03 to UC-06, or UC-11).'],
    trigger: 'A request to the location or sightings service begins.',
    main: [
      'System shows a loading overlay on the map with a status message, for example "Querying GBIF biodiversity records...".',
      'System disables the Locate Me button until the request finishes.',
      'When the request completes, System shows the result count above the table, for example "Showing 1–10 of 75".',
    ],
    alt: [
      ['A1 – If the location is not found:', ['System displays "Location not found — try a different spelling" (UC-01, A2).']],
      ['A2 – If no sightings match:', ['System shows "No fauna records found" with a suggestion to widen the search (UC-03, A1).']],
      ['A3 – If a data service fails:', ['If GBIF cannot be reached, System shows the sample data with the warning "GBIF is unreachable — showing sample data (filters not applied)" (UC-03, A3); for any other error it displays "Failed to load sightings: ..." with the reason.']],
    ],
    post: 'The user sees either the result count or a clear explanation; the screen is never left blank without a message.',
  },
  {
    id: 'UC-11', name: 'Select Quick-Access Location', secondary: 'Nominatim Geocoding Service', reqs: 'FR-11',
    rel: 'Includes UC-01 Search Location.',
    goal: 'Check a commonly used location with one click, without typing.',
    pre: ['The application is open.'],
    trigger: 'The user clicks a Quick Locations chip.',
    main: [
      'User clicks a chip under Quick Locations: Busan, Seoul, Jeju Island, Ulsan, Hallasan, Tokyo, or Vancouver.',
      'System highlights the selected chip and enters its name in the search box.',
      'System runs UC-01 from step 3 (geocode the name, move the map, and load the sightings).',
    ],
    alt: [
      ['A1 – If the place cannot be located (step 3):', ['System displays the error message from UC-01 (A2 or A3); the map stays at the previous location.']],
    ],
    post: 'The map and the results show the selected location.',
  },
];

function useCaseTable(u) {
  const small = { size: 18 };
  const L = (t, k = true) => ({ t: `**${t}**`, fill: LIGHT, keepNext: k });
  const K = t => ({ t, keepNext: true });
  const altContent = u.alt.length
    ? u.alt.flatMap(([head, s], i) => [
      P(`**${head}**`, { size: 18, after: 20, before: i ? 80 : 0, line: 252, keepNext: true }),
      ...steps(s, small),
    ])
    : 'None.';
  const rows = [
    [L('Use Case ID'), K(`**${u.id}**`)],
    [L('Use Case Name'), K(u.name)],
    [L('Primary Actor'), K('User')],
    [L('Secondary Actor(s)'), K(u.secondary)],
    [L('Related Requirement(s)'), K(u.reqs)],
    [L('Relationships'), K(u.rel)],
    [L('Goal'), K(u.goal)],
    [L('Preconditions'), K(u.pre.map(t => bullet(t, { size: 18, after: 20, line: 252, keepNext: true })))],
    [L('Trigger'), K(u.trigger)],
    [L('Main Flow', false), steps(u.main, small)],
    [L('Alternative Flows', false), altContent],
    [L('Postcondition', false), u.post],
  ];
  return table([2100, TW - 2100], null, rows, { cantSplit: true });
}

/* ---------------- document body ---------------- */
const body = [];
const add = (...xs) => xs.flat().forEach(x => body.push(x));

// Title block
add(
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 240, after: 60 }, children: [new TextRun({ text: 'Requirements Analysis Document', bold: true, color: GREEN, size: 40, font: FONT })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 60 }, children: [new TextRun({ text: 'Wildlife Sighting Mapping and Species Distribution Tracker', color: GREY, size: 22, font: FONT })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 360 }, children: [new TextRun({ text: 'CAPR-F2026 | Group 3 | Week 3 Submission (Revised) | Document Version: v1.1', color: GREY, size: 19, font: FONT })] }),
  new Paragraph({ spacing: { after: 120 }, border: { bottom: { style: BorderStyle.SINGLE, size: 8, color: GREEN, space: 4 } }, children: [new TextRun({ text: 'Contents', bold: true, color: GREEN, size: 28, font: FONT })] }),
  new TableOfContents('Contents', { hyperlink: true, headingStyleRange: '1-2' }),
  new Paragraph({ children: [new PageBreak()] }),
);

// 1. Project Information
add(H1('1. Project Information'),
  table([2800, TW - 2800], ['Item', 'Detail'], [
    ['Course', 'Capstone Project (CAPR-F2026)'],
    ['Group', 'Group 3'],
    ['Theme', 'Fauna (Biosphere - Animals)'],
    ['Project Title', 'Wildlife Sighting Mapping and Species Distribution Tracker'],
    ['Consultation Slot', 'B (3:30PM)'],
  ]),
  H2('Team Members'),
  table([3600, 2000, TW - 5600], ['Name', 'Student ID', 'Role'], [
    ['Gupta Aman Kumar', '2530001', 'Project Manager / Frontend'],
    ['Singh Shubham Kumar', '2530028', 'Backend Developer'],
    ['Paudel Amrit', '2530048', 'Full-stack Developer / QA'],
  ]),
  H2('Revision History'),
  table([1100, 1700, TW - 2800], ['Version', 'Date', 'Description'], [
    ['v1.0', '16 Sep 2026', 'Initial requirements analysis (Week 3 submission).'],
    ['v1.1', '29 Sep 2026', 'Reorganized to follow the Week 4 study-case method (objectives → requirements → actors → use cases → design traceability); detailed use case specifications; flowchart-style diagrams replace the text diagrams; requirements and use cases updated for the redesigned dashboard (sidebar filters, Recent Sightings table, Species Profile panel).'],
  ]),
);

// 2. Introduction
add(H1('2. Introduction'),
  H2('2.1 Purpose'),
  P('This document defines the problem, stakeholders, scope, project objectives, functional requirements (FR), non-functional requirements (NFR), actors, and use cases for the Wildlife Sighting Mapping and Species Distribution Tracker — a map-based web application that makes global biodiversity data locally accessible to non-specialists. It also shows how the requirements connect to the system design through diagrams and a traceability table.'),
  H2('2.2 Scope of This Document'),
  P('This is the Requirements Analysis deliverable for Week 3, revised as version 1.1. It establishes what the system must do (functional requirements), how well it must perform (non-functional requirements), who interacts with it (actors), and how each interaction works (use cases). Every requirement below reflects the team\'s actual working prototype at the time of writing, rather than speculative or planned-only features; items not yet implemented are listed separately in Section 13 rather than presented as completed requirements.'),
  P('Version 1.1 follows the method introduced in the Week 4 study case: project objectives → functional requirements → actors → use cases → requirements-to-design traceability. Each use case now has preconditions, a main flow, alternative flows, and a postcondition, and the text-based diagrams have been replaced with a use case diagram, an architecture diagram, and two flowcharts. Requirement wording has been updated to match the prototype as of 29 September 2026.'),
  H2('2.3 Definitions'),
  table([2600, TW - 2600], ['Term', 'Definition'], [
    ['GBIF', 'Global Biodiversity Information Facility - an international open-data platform holding over 2 billion species occurrence records'],
    ['Occurrence / Sighting', 'A single recorded observation of a species at a specific location and time'],
    ['Taxon / Taxonomic Group', 'A classification group of organisms (e.g. Aves = birds, Mammalia = mammals)'],
    ['Marker', 'A visual point on the map representing one occurrence record'],
    ['Non-specialist', 'A user without formal biological or GIS training'],
    ['Geocoding', 'Converting a place name into latitude and longitude coordinates'],
    ['Actor', 'A role (a person or an external system) that interacts with the system. Actors are not database entities.'],
    ['Use Case', 'A description of how an actor uses the system to reach a goal, written as a main flow plus alternative flows'],
    ['«include» / «extend»', '«include»: behavior that always runs as part of another use case. «extend»: optional behavior that can be added to another use case.'],
  ]),
);

// 3. Background and problem
add(H1('3. Project Background and Problem Definition'),
  H2('3.1 Background'),
  P('Global biodiversity data already exists in massive volumes. GBIF alone holds over 2 billion species occurrence records, with nearly 500 million contributed through citizen science. This data is freely accessible via public APIs and is used extensively by researchers, conservation organizations, and government agencies.'),
  H2('3.2 The Problem'),
  P('Despite this abundance of open data, non-specialists have no simple, localized way to explore what wildlife exists near them. Existing biodiversity platforms are designed primarily for researchers and dedicated hobbyists, with interfaces that are data-heavy and require technical familiarity. Students, hikers, eco-clubs, and curious citizens are effectively locked out of a public dataset that was created for the public, when their actual question is simple: "What animals have been recorded near this place?"'),
  H2('3.3 Why This Matters'),
  bullet('Educational value: biology and environmental science students can study real species data from their own region.'),
  bullet('Community engagement: local eco-clubs can use real biodiversity records for awareness activities.'),
  bullet('Environmental awareness: making data locally relevant increases interest in conservation.', { after: 120 }),
);

// 4. Stakeholders
add(H1('4. Stakeholder Identification'),
  H2('4.1 Primary Users'),
  table([3600, TW - 3600], ['Stakeholder', 'Primary Need'], [
    ['Hikers and nature enthusiasts', 'Check wildlife activity near a trail or park before visiting'],
    ['Students', 'Use real, local species data as a study aid'],
    ['Eco-clubs and school groups', 'A shared reference for local biodiversity'],
    ['General curious public', 'A simple way to see what animals live nearby'],
  ]),
  H2('4.2 Secondary Stakeholders'),
  table([3600, TW - 3600], ['Stakeholder', 'Interest'], [
    ['Course instructor', 'Assessing the project against rubric criteria'],
    ['GBIF (data provider)', 'Reasonable API usage'],
    ['OpenStreetMap (tile provider)', 'Attribution and fair use of map tiles'],
  ]),
  spacer(60),
  P('Stakeholders have an interest in the system. The actors that interact with it directly are defined in Section 9.', { italics: true, color: GREY }),
);

// 5. Scope
add(H1('5. Project Scope'),
  H2('5.1 The System Will Focus On'),
  bullet('Location search by place name (geocoded via OpenStreetMap Nominatim), quick-access presets, and the device\'s current location.'),
  bullet('Viewing real, live GBIF animal occurrence records within a chosen radius of that location.'),
  bullet('An interactive map with color-coded sighting pins, a legend, and a choice of base maps.'),
  bullet('A Recent Sightings table with photo, species name, animal group, date, location, and coordinates.'),
  bullet('Filtering by one or more animal groups, observation date range, and search radius.'),
  bullet('A Species Profile panel with photo (where available), taxonomy, observation details, and a link to the GBIF source record.'),
  bullet('A responsive interface usable without login.', { after: 120 }),
  H2('5.2 The System Will Not Include'),
  bullet('Building a new data collection network or hardware/sensors.'),
  bullet('User-submitted sightings (citizen-reporting layer) - deferred as a possible future extension only.'),
  bullet('User accounts and authentication.'),
  bullet('Native mobile applications.'),
  bullet('Species population trend forecasting or predictive analytics.', { after: 120 }),
  H2('5.3 Constraints and Assumptions'),
  bullet('Constraint: the system must use only free, public APIs (GBIF, Nominatim) at zero ongoing cost.'),
  bullet('Constraint: deployment (planned for Week 13) will use free-tier hosting (Render or Railway).'),
  bullet('Assumption: the GBIF API remains publicly available without requiring authentication.'),
  bullet('Assumption: users have access to a modern web browser and an internet connection.'),
  bullet('Assumption: the project team has no budget for paid services.', { after: 120 }),
);

// 6. Objectives
add(H1('6. Project Objectives'),
  P('The objectives below are carried over from the Project Proposal (Week 2). As in the Week 4 study case, every functional requirement in Section 7 is derived from one of these objectives.'),
  ...OBJ.map((o, i) => bullet(`**Obj. ${i + 1}:** ${o}`, { after: i === OBJ.length - 1 ? 120 : 60 })),
);

// 7. Functional requirements
const objRow = (n, span, need, fr) => [{ t: `**${n}**`, rowSpan: span, align: AlignmentType.CENTER }, { t: OBJ[n - 1], rowSpan: span }, need, fr];
add(H1('7. Functional Requirements'),
  H2('7.1 From Objectives to Functional Requirements'),
  P('Each row answers the question "what must the system do?" for one project objective, and names the functional requirement that results.', { keepNext: true }),
  table([800, 3000, 3080, TW - 6880], ['Obj. #', 'Project Objective', 'What must the system do?', 'Functional Requirement'], [
    objRow(1, 5, 'Users need to choose the place they care about', '**FR-01** Location Search'),
    ['Users need one-click access to commonly checked places', '**FR-11** Quick-Access Locations'],
    ['Users need to focus on particular animal groups', '**FR-04** Animal Group Filter'],
    ['Users need to see only recent or historical records', '**FR-05** Date Range Filter'],
    ['Users always need to know what the system is doing', '**FR-10** Search Status'],
    objRow(2, 4, 'Users need a map they can move around and zoom', '**FR-02** Interactive Map'),
    ['Users need to see real sightings near the chosen place', '**FR-03** Sightings Display'],
    ['Users need to widen or narrow the area searched', '**FR-06** Search Radius'],
    ['Users need to understand what the marker colors mean', '**FR-08** Map Legend'],
    objRow(3, 2, 'Users need details about the animal behind a sighting', '**FR-07** Species Details'),
    ['Users need to check the original source of a record', '**FR-09** GBIF Source Link'],
  ]),
  H2('7.2 Functional Requirement List'),
  P('Priority follows the MoSCoW scale (Must, Should, Could).', { keepNext: true }),
  table([950, 1900, TW - 3950, 1100], ['ID', 'Name', 'Requirement', 'Priority'], FR.map(([id, n, t, p]) => [`**${id}**`, n, t, p])),
);

// 8. NFR
add(H1('8. Non-Functional Requirements'),
  P('A non-functional requirement describes how well the system should perform, or what qualities and constraints it must have.', { keepNext: true }),
  table([1050, 1650, TW - 3800, 1100], ['ID', 'Category', 'Requirement', 'Priority'], NFR.map(([id, c, t, p]) => [`**${id}**`, c, t, p])),
);

// 9. Actors
add(H1('9. Actors'),
  P('Actors are the roles that interact with WildTrack. As the Week 4 study case points out, actors are not necessarily database entities: the MySQL tables (saved_locations, search_history, species_cache) are internal data stores, not actors.', { keepNext: true }),
  table([2500, 2100, TW - 4600], ['Actor', 'Type', 'Description'], [
    ['**User**', 'Primary actor (person)', 'Any visitor who uses WildTrack in a web browser, without an account. Starts every use case.'],
    ['**Nominatim Geocoding Service**', 'Secondary actor (external system)', 'OpenStreetMap\'s geocoding API. Converts a place name into coordinates for UC-01 and UC-11.'],
    ['**GBIF API**', 'Secondary actor (external system)', 'Supplies occurrence (sighting) records, species taxonomy, and species photos for UC-03 (and the filters that reuse it) and UC-07.'],
    ['**Map Tile Services**', 'Secondary actor (external system)', 'OpenStreetMap and Esri tile servers. Supply the base map images for UC-02.'],
  ]),
  spacer(60),
  P('The stakeholder groups in Section 4.1 (hikers, students, eco-clubs, and the general public) all use the system through the single User role, because the system has no accounts or user roles at this stage. Organizations such as GBIF and OpenStreetMap remain stakeholders (Section 4.2); only their APIs act as secondary actors.'),
);

// 10. Use cases
const ucNames = UC.map(u => u.name);
add(H1('10. Use Cases'),
  H2('10.1 Actor–Use Case List'),
  P('What interactions does each actor have with the system?', { keepNext: true }),
  table([3000, 4580, TW - 7580], ['Actor', 'Use Case', 'UC #'], [
    [{ t: '**User**', rowSpan: 11 }, ucNames[0], 'UC-01'],
    ...UC.slice(1).map(u => [u.name, u.id]),
    ['Nominatim Geocoding Service (secondary)', 'Search Location', 'UC-01'],
    ['GBIF API (secondary)', 'View Nearby Sightings; View Species Details', 'UC-03, UC-07'],
    ['Map Tile Services (secondary)', 'Explore Map', 'UC-02'],
  ]),
  H2('10.2 Connecting Functional Requirements to Use Cases'),
  P('Each functional requirement is realized by exactly one use case, so every requirement can be traced to a user interaction.', { keepNext: true }),
  table([4000, 4080, TW - 8080], ['Functional Requirement', 'Related Use Case', 'UC #'],
    FR.map(([id, n], i) => [`${id} ${n}`, UC[i].name, UC[i].id])),
  H2('10.3 Use Case Diagram'),
  P('Figure 1 shows the User as the only primary actor, because the system has no login or user roles. The three external systems are secondary actors that support individual use cases. «include» marks behavior that always runs as part of another use case (for example, every search loads the nearby sightings); «extend» marks optional behavior (opening the GBIF record from the Species Profile panel).', { keepNext: true }),
  figure('usecase.png', 672, 'Figure 1 – Use case diagram'),
  H2('10.4 Use Case Specifications'),
  P('Each use case follows the template from the Week 4 study case (ID, name, primary actor, goal, preconditions, main flow, alternative flows, postcondition), with secondary actors, related requirements, relationships, and a trigger added for precision. In the flows, "User" is the primary actor and "System" is WildTrack (browser and PHP server together). Quoted text is the exact message shown by the prototype.'),
);
UC.forEach(u => add(H3(`${u.id} – ${u.name}`), useCaseTable(u)));

// 11. Architecture and process flow
add(H1('11. System Architecture and Process Flow'),
  H2('11.1 System Architecture'),
  P('WildTrack has three tiers (Figure 2). The browser tier renders the interface with Leaflet.js and calls three small PHP endpoints. The server tier (Apache + PHP; XAMPP for local development, with Render or Railway planned for deployment) forwards each request to an external open-data service and returns simplified JSON. Map tiles are loaded by the browser directly from the tile services. Settings and credentials are kept in config/config.php, which is excluded from the GitHub repository (NFR-03). The MySQL schema is designed but not yet connected (Section 13).', { keepNext: true }),
  figure('architecture.png', 672, 'Figure 2 – System architecture'),
  H2('11.2 Process Flow: Searching and Displaying Sightings'),
  P('Figure 3 shows the processing flow behind UC-01, UC-03 to UC-06, UC-10, and UC-11, including the three ways of choosing a location: (A) typing a place name or (B) clicking a Quick Location chip, both geocoded by Nominatim, or (C) clicking "Locate Me", which uses the browser Geolocation API. When the page first opens, the default search (Busan, 10 km, all groups) runs straight to the query step. Standard flowchart symbols are used: rounded boxes for start and end, rectangles for processes, diamonds for decisions, and parallelograms for input and output. Red shapes on the left are messages to the user. The amber boxes on the right are the external services each step calls, joined by dashed two-way arrows labelled with what is sent and returned. The green tag on a step names the use case it belongs to.', { keepNext: true }),
  figure('flow_search.png', 672, 'Figure 3 – Flowchart: searching and displaying sightings'),
  H2('11.3 Process Flow: Viewing Species Details'),
  P('Figure 4 shows the flow behind UC-07 and UC-09, including the cases where a sighting is not identified to species level or the species service is unavailable. As in Figure 3, the right-hand column shows the external services used: the photo host, the GBIF Species API, and the GBIF website.', { keepNext: true }),
  figure('flow_species.png', 672, 'Figure 4 – Flowchart: viewing species details'),
);

// 12. Traceability
add(H1('12. Requirements-to-Design Traceability'),
  P('The design comes from the requirements, and everything should connect. The table links each objective to its functional requirement, use case, and the design components that implement it.', { keepNext: true }),
  table([1250, 2050, 2150, TW - 5450], ['Objective', 'Requirement', 'Use Case', 'Design Component'], [
    ['Obj. 1', 'FR-01 Location Search', 'UC-01 Search Location', 'Search box and "Locate Me" button (index.php); handleSearch() and useCurrentLocation() in app.js; geocode.php → Nominatim'],
    ['Obj. 1', 'FR-11 Quick-Access Locations', 'UC-11 Select Quick-Access Location', 'Quick Locations chips (index.php); quickSelect() in app.js; reuses geocode.php'],
    ['Obj. 1', 'FR-04 Animal Group Filter', 'UC-04 Filter by Animal Group', 'Animal Groups checkboxes (GROUPS in app.js); taxa parameter in sightings.php (list of GBIF taxon keys)'],
    ['Obj. 1', 'FR-05 Date Range Filter', 'UC-05 Filter by Date Range', 'Observation Date fields; eventDate parameter in gbif.php'],
    ['Obj. 1', 'FR-10 Search Status', 'UC-10 View Search Status', 'Loading overlay, "Showing x–y of N" counter, and notifications (setLoading(), renderTable(), showToast() in app.js)'],
    ['Obj. 2', 'FR-02 Interactive Map', 'UC-02 Explore Map', 'Leaflet map, Map/Satellite/Topographic tabs, zoom and Recenter buttons (switchBaseLayer(), recenterMap()); OpenStreetMap and Esri tile services'],
    ['Obj. 2', 'FR-03 Sightings Display', 'UC-03 View Nearby Sightings', 'Map pins and Recent Sightings table (loadSightings(), renderMarkers(), renderTable()); sightings.php + gbif.php → GBIF Occurrence API'],
    ['Obj. 2', 'FR-06 Search Radius', 'UC-06 Adjust Search Radius', 'Search Radius chips, radius circle and label (updateRadiusCircle()); geoDistance parameter in gbif.php (capped at 100 km)'],
    ['Obj. 2', 'FR-08 Map Legend', 'UC-08 Read Map Legend', 'Animal Groups legend on the map (buildGroupControls() and GROUPS colors in app.js)'],
    ['Obj. 3', 'FR-07 Species Details', 'UC-07 View Species Details', 'Species Profile panel (showProfile(), renderTaxonomy() in app.js); species.php → GBIF Species API; occurrence photos; species_cache table (planned)'],
    ['Obj. 3', 'FR-09 GBIF Source Link', 'UC-09 Verify Record on GBIF', '"Explore on GBIF Network" button; gbifUrl returned by species.php'],
  ]),
);

// 13. Future enhancements
add(H1('13. Planned Future Enhancements (Not Yet Implemented)'),
  P('The following items are structurally prepared for (e.g. database tables already designed) but are not part of the current working system, and are explicitly not claimed as completed requirements at this stage:'),
  bullet('Species detail caching (a species_cache database table has been designed to reduce repeated API calls, but is not yet wired into the application logic).'),
  bullet('Optional citizen-reporting layer allowing users to submit their own sightings.'),
  bullet('Saved/favorite locations per user session.', { after: 120 }),
);

// 14. Dependencies
add(H1('14. Assumptions and Dependencies'),
  table([2900, 2500, TW - 5400], ['Item', 'Type', 'Description'], [
    ['GBIF API (Occurrence, Species, Media)', 'External dependency', 'Public, no key required'],
    ['Nominatim Geocoding API', 'External dependency', 'Free; requires a descriptive user-agent identifier'],
    ['Leaflet.js', 'Library dependency', 'Open-source mapping library (BSD-2-Clause license)'],
    ['OpenStreetMap tiles', 'Tile provider', 'Free; requires attribution'],
    ['Esri World Imagery / World Topographic tiles', 'Tile provider', 'Optional satellite and topographic base maps; attribution shown on the map'],
    ['Sighting photos (GBIF media links, mostly iNaturalist)', 'External content', 'Loaded directly from the source; shown in the table and Species Profile'],
    ['Browser Geolocation API', 'Browser feature', 'Used by "Locate Me"; requires the user\'s permission'],
    ['Font Awesome and Google Fonts', 'UI resources (CDN)', 'Icons and fonts loaded from public CDNs'],
    ['XAMPP', 'Local development environment', 'Apache + MySQL + PHP'],
    ['Render / Railway', 'Deployment (planned, Week 13+)', 'Free tier'],
  ]),
);

// 15. Individual contribution
add(H1('15. Individual Contribution (Week 3)'),
  table([2500, TW - 4900, 2400], ['Member', 'Task', 'Evidence'], [
    ['Gupta Aman Kumar', 'Problem definition, stakeholder identification, project scope, system architecture and flow diagrams', 'Sections 3-5, 11'],
    ['Singh Shubham Kumar', 'Functional requirements, verified against the working backend implementation', 'Section 7'],
    ['Paudel Amrit', 'Non-functional requirements and all 11 use cases', 'Sections 8, 10'],
    ['All members', 'Requirements review and consultation preparation', 'Team meeting notes'],
  ]),
);

/* ---------------- document ---------------- */
const doc = new Document({
  creator: 'CAPR-F2026 Group 3',
  title: 'Requirements Analysis Document - Wildlife Sighting Mapping and Species Distribution Tracker (v1.1)',
  description: 'Week 3 requirements analysis, revised',
  styles: {
    default: { document: { run: { font: FONT, size: 20, color: '1A1A1A' }, paragraph: { spacing: { after: 120, line: 276 } } } },
    paragraphStyles: [
      { id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { font: FONT, size: 28, bold: true, color: GREEN },
        paragraph: { spacing: { before: 360, after: 160 }, keepNext: true, keepLines: true, outlineLevel: 0 } },
      { id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { font: FONT, size: 22, bold: true, color: '000000' },
        paragraph: { spacing: { before: 240, after: 120 }, keepNext: true, keepLines: true, outlineLevel: 1 } },
      { id: 'Heading3', name: 'Heading 3', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { font: FONT, size: 21, bold: true, color: GREEN },
        paragraph: { spacing: { before: 300, after: 100 }, keepNext: true, keepLines: true, outlineLevel: 2 } },
      { id: 'Caption', name: 'Caption', basedOn: 'Normal', next: 'Normal',
        run: { font: FONT, size: 17, italics: true, color: GREY },
        paragraph: { alignment: AlignmentType.CENTER, spacing: { before: 40, after: 240 } } },
    ],
  },
  numbering: {
    config: [
      { reference: 'bullets', levels: [{ level: 0, format: LevelFormat.BULLET, text: '•', alignment: AlignmentType.LEFT,
        style: { paragraph: { indent: { left: 360, hanging: 240 } } } }] },
      { reference: 'steps', levels: [{ level: 0, format: LevelFormat.DECIMAL, text: '%1.', alignment: AlignmentType.LEFT,
        style: { paragraph: { indent: { left: 340, hanging: 300 } } } }] },
    ],
  },
  sections: [{
    properties: { page: { size: { width: 12240, height: 15840 }, margin: { top: 1080, bottom: 1080, left: 1080, right: 1080 } } },
    footers: {
      default: new Footer({
        children: [new Paragraph({
          tabStops: [{ type: TabStopType.RIGHT, position: TW }],
          border: { top: { style: BorderStyle.SINGLE, size: 4, color: 'BFBFBF', space: 4 } },
          children: [
            new TextRun({ text: 'CAPR-F2026 | Group 3 | Requirements Analysis v1.1', size: 16, color: '777777', font: FONT }),
            new TextRun({ children: [new Tab(), 'Page ', PageNumber.CURRENT, ' of ', PageNumber.TOTAL_PAGES], size: 16, color: '777777', font: FONT }),
          ],
        })],
      }),
    },
    children: body,
  }],
});

Packer.toBuffer(doc).then(buf => {
  const f = path.join(OUT, 'Week3_Requirements_Analysis_v1.1.docx');
  fs.writeFileSync(f, buf);
  console.log('wrote', f, Math.round(buf.length / 1024) + 'KB');
});
