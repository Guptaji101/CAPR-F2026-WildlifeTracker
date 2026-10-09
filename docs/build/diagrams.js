// Generates the four figures for the revised Week 3 document as SVG -> PNG (via headless Chrome).
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const OUT = path.join(__dirname, 'fig');
fs.mkdirSync(OUT, { recursive: true });
const FONT = 'Arial, Helvetica, sans-serif';

const C = {
  ink: '#1f2933', line: '#3b4450', green: '#2E6F40', greenFill: '#EAF3EA',
  decFill: '#FFF5DA', decStroke: '#B7791F', ioFill: '#E8F1FB', ioStroke: '#2B6CB0',
  errFill: '#FDECEC', errStroke: '#C0392B', grey: '#64748b', extFill: '#F1F5F9', extStroke: '#475569',
  amberFill: '#FFF8EC', amberStroke: '#B7791F', blueFill: '#EEF4FB', blueStroke: '#2B6CB0',
};

const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// Multi-line text block centred vertically on cy. Each line: string or {t, s, w, c, i}.
function lines(x, cy, specs, anchor = 'middle') {
  const L = specs.map(s => (typeof s === 'string' ? { t: s } : s))
    .map(s => ({ s: 16, w: 'normal', c: C.ink, i: false, ...s }));
  const hs = L.map(l => l.s * 1.28);
  let top = cy - hs.reduce((a, b) => a + b, 0) / 2;
  return L.map((l, k) => {
    const base = top + hs[k] / 2 + l.s * 0.36;
    top += hs[k];
    return `<text x="${x}" y="${base.toFixed(1)}" font-family="${FONT}" font-size="${l.s}" font-weight="${l.w}"` +
      `${l.i ? ' font-style="italic"' : ''} fill="${l.c}" text-anchor="${anchor}">${esc(l.t)}</text>`;
  }).join('');
}
const txt = (x, cy, str, o = {}) => lines(x, cy, str.split('\n').map(t => ({ t, ...o })));

const dashAttr = d => (d ? ` stroke-dasharray="${d}"` : '');
function rect(cx, cy, w, h, { fill = '#fff', stroke = C.line, sw = 1.6, rx = 6, dash } = {}) {
  return `<rect x="${cx - w / 2}" y="${cy - h / 2}" width="${w}" height="${h}" rx="${rx}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"${dashAttr(dash)}/>`;
}
function rectXY(x0, y0, x1, y1, o = {}) { return rect((x0 + x1) / 2, (y0 + y1) / 2, x1 - x0, y1 - y0, o); }
function diamond(cx, cy, w, h, { fill = C.decFill, stroke = C.decStroke, sw = 1.8 } = {}) {
  return `<polygon points="${cx},${cy - h / 2} ${cx + w / 2},${cy} ${cx},${cy + h / 2} ${cx - w / 2},${cy}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>`;
}
function para(cx, cy, w, h, { fill = C.ioFill, stroke = C.ioStroke, sw = 1.8, skew = 18 } = {}) {
  const x0 = cx - w / 2, x1 = cx + w / 2, y0 = cy - h / 2, y1 = cy + h / 2;
  return `<polygon points="${x0 + skew / 2},${y0} ${x1 + skew / 2},${y0} ${x1 - skew / 2},${y1} ${x0 - skew / 2},${y1}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>`;
}
function ellipse(cx, cy, rx, ry, { fill = C.greenFill, stroke = C.green, sw = 1.8 } = {}) {
  return `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>`;
}
function poly(pts, { marker = 'arrow', dash, stroke = C.line, sw = 1.7 } = {}) {
  const p = pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
  return `<polyline points="${p}" fill="none" stroke="${stroke}" stroke-width="${sw}" stroke-linejoin="round"${dashAttr(dash)}` +
    `${marker ? ` marker-end="url(#${marker})"` : ''}/>`;
}
// Small label with a white background, centred on (x, y).
function tag(x, y, t, { s = 13, w = 'bold', c = C.ink, bg = '#fff', anchor = 'middle', i = false } = {}) {
  const tw = t.length * s * 0.56 + 10;
  const bx = anchor === 'middle' ? x - tw / 2 : anchor === 'start' ? x - 4 : x - tw + 4;
  return `<rect x="${bx}" y="${y - s * 0.75}" width="${tw}" height="${s * 1.5}" fill="${bg}"/>` +
    `<text x="${x}" y="${y + s * 0.36}" font-family="${FONT}" font-size="${s}" font-weight="${w}"${i ? ' font-style="italic"' : ''} fill="${c}" text-anchor="${anchor}">${esc(t)}</text>`;
}
const DEFS = `<defs>
  <marker id="arrow" viewBox="0 0 10 10" refX="9.2" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="${C.line}"/></marker>
  <marker id="open" viewBox="0 0 12 12" refX="11" refY="6" markerWidth="9" markerHeight="9" orient="auto"><path d="M1,1 L11,6 L1,11" fill="none" stroke="${C.extStroke}" stroke-width="1.5"/></marker>
</defs>`;
const svg = (w, h, body) => `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${DEFS}<rect width="${w}" height="${h}" fill="#fff"/>${body}</svg>`;

// Point on an ellipse boundary in the direction of (tx, ty).
function onEllipse(e, tx, ty) {
  const dx = tx - e.cx, dy = ty - e.cy;
  const t = 1 / Math.sqrt((dx / e.rx) ** 2 + (dy / e.ry) ** 2);
  return [e.cx + dx * t, e.cy + dy * t];
}

/* ------------------------------------------------------------------ */
/* Figure 1 - Use case diagram                                         */
/* ------------------------------------------------------------------ */
function useCaseDiagram() {
  const W = 1190, H = 900;
  let b = '';
  // System boundary
  b += rectXY(150, 18, 975, 882, { fill: '#FBFDFB', stroke: C.green, sw: 2, rx: 10 });
  b += lines(562, 44, [{ t: 'WildTrack — Wildlife Sighting Mapping & Species Distribution Tracker', s: 17.5, w: 'bold', c: C.green }]);

  const A = 380, B = 790;
  const a = (cy, id, n) => ({ cx: A, cy, rx: 145, ry: 31, id, n });
  const c = (cy, id, n) => ({ cx: B, cy, rx: 140, ry: 31, id, n });
  const uc = {
    UC11: a(100, 'UC-11', 'Select Quick-Access Location'),
    UC01: a(195, 'UC-01', 'Search Location'),
    UC04: a(318, 'UC-04', 'Filter by Animal Group'),
    UC05: a(412, 'UC-05', 'Filter by Date Range'),
    UC06: a(506, 'UC-06', 'Adjust Search Radius'),
    UC07: a(630, 'UC-07', 'View Species Details'),
    UC08: a(735, 'UC-08', 'Read Map Legend'),
    UC02: a(830, 'UC-02', 'Explore Map'),
    UC03: c(360, 'UC-03', 'View Nearby Sightings'),
    UC10: c(470, 'UC-10', 'View Search Status'),
    UC09: c(735, 'UC-09', 'Verify Record on GBIF'),
  };

  // Primary actor: User (stick figure)
  const ax = 72, ay = 392;
  let actor = `<g stroke="${C.ink}" stroke-width="2.2" fill="none" stroke-linecap="round">` +
    `<circle cx="${ax}" cy="${ay + 15}" r="15" fill="#fff"/>` +
    `<line x1="${ax}" y1="${ay + 30}" x2="${ax}" y2="${ay + 82}"/>` +
    `<line x1="${ax - 28}" y1="${ay + 50}" x2="${ax + 28}" y2="${ay + 50}"/>` +
    `<line x1="${ax}" y1="${ay + 82}" x2="${ax - 24}" y2="${ay + 120}"/>` +
    `<line x1="${ax}" y1="${ay + 82}" x2="${ax + 24}" y2="${ay + 120}"/></g>`;
  actor += lines(ax, ay + 142, [{ t: 'User', s: 19, w: 'bold' }]);
  actor += lines(ax, ay + 162, [{ t: '(no login)', s: 13.5, c: C.grey }]);

  // Associations: User -> left tip of each directly initiated use case
  const origin = [ax + 30, ay + 52];
  let assoc = '';
  ['UC11', 'UC01', 'UC04', 'UC05', 'UC06', 'UC07', 'UC08', 'UC02'].forEach(k => {
    assoc += poly([origin, [uc[k].cx - uc[k].rx, uc[k].cy]], { marker: null, stroke: C.ink, sw: 1.5 });
  });

  // External (secondary) actors
  const EX = 1090;
  const ext = (cy, name) => rect(EX, cy, 160, 66, { fill: C.extFill, stroke: C.extStroke, rx: 4 }) +
    lines(EX, cy, [{ t: '«external system»', s: 13, i: true, c: C.grey }, ...name.split('\n').map(t => ({ t, s: 16.5, w: 'bold' }))]);
  let exts = ext(195, 'Nominatim\nGeocoding') + ext(525, 'GBIF API') + ext(830, 'Map Tile\nServices');
  const tipR = e => [e.cx + e.rx, e.cy];
  exts += poly([[1010, 195], tipR(uc.UC01)], { marker: null, stroke: C.ink, sw: 1.5 });
  exts += poly([[1012, 500], tipR(uc.UC03)], { marker: null, stroke: C.ink, sw: 1.5 });
  exts += poly([[1010, 540], onEllipse(uc.UC07, 1010, 540)], { marker: null, stroke: C.ink, sw: 1.5 });
  exts += poly([[1010, 830], tipR(uc.UC02)], { marker: null, stroke: C.ink, sw: 1.5 });

  // «include» / «extend» dependencies (dashed, open arrow to the target)
  let deps = '';
  const dep = (from, to, label, t = 0.5, dx = 0) => {
    const p1 = onEllipse(uc[from], uc[to].cx, uc[to].cy);
    const p2 = onEllipse(uc[to], uc[from].cx, uc[from].cy);
    deps += poly([p1, p2], { marker: 'open', dash: '7 5', stroke: C.extStroke, sw: 1.5 });
    const lx = p1[0] + (p2[0] - p1[0]) * t + dx, ly = p1[1] + (p2[1] - p1[1]) * t;
    deps += tag(lx, ly, label, { s: 13.5, w: 'normal', c: C.extStroke, anchor: dx ? 'start' : 'middle' });
  };
  dep('UC11', 'UC01', '«include»', 0.5, 12);
  dep('UC01', 'UC03', '«include»', 0.42);
  dep('UC04', 'UC03', '«include»', 0.42);
  dep('UC05', 'UC03', '«include»', 0.42);
  dep('UC06', 'UC03', '«include»', 0.42);
  dep('UC03', 'UC10', '«include»', 0.5, 12);
  dep('UC09', 'UC07', '«extend»', 0.5);

  let ovals = '';
  Object.values(uc).forEach(e => {
    ovals += ellipse(e.cx, e.cy, e.rx, e.ry);
    ovals += lines(e.cx, e.cy, [{ t: e.id, s: 13.5, w: 'bold', c: C.green }, { t: e.n, s: 17.5 }]);
  });

  return svg(W, H, b + assoc + exts + deps + ovals + actor);
}

/* ------------------------------------------------------------------ */
/* Figure 2 - System architecture                                      */
/* ------------------------------------------------------------------ */
function architecture() {
  const W = 1160, H = 790;
  let b = '';
  // Tier container with a coloured side band carrying a rotated label (keeps arrows clear of titles)
  const tier = (y0, y1, l1, l2, fill, stroke) => {
    b += rectXY(20, y0, 812, y1, { fill, stroke, sw: 1.8, rx: 10 });
    b += `<path d="M30,${y0} h28 v${y1 - y0} h-28 a10,10 0 0 1 -10,-10 v-${y1 - y0 - 20} a10,10 0 0 1 10,-10 z" fill="${stroke}"/>`;
    const cy = (y0 + y1) / 2;
    b += `<text transform="rotate(-90 44 ${cy})" x="44" y="${cy + 5}" font-family="${FONT}" font-size="15" font-weight="bold" fill="#fff" text-anchor="middle">${esc(l1)}${l2 ? ` · ${esc(l2)}` : ''}</text>`;
  };
  const cols = [[80, 306], [326, 552], [572, 796]];
  const mid = i => (cols[i][0] + cols[i][1]) / 2;
  const box = (x0, y0, x1, y1, title, sub, o = {}) => {
    b += rectXY(x0, y0, x1, y1, { fill: '#fff', stroke: o.stroke || C.line, sw: 1.5, rx: 6, dash: o.dash });
    b += lines((x0 + x1) / 2, (y0 + y1) / 2, [{ t: title, s: 16.5, w: 'bold' }, ...sub.map(t => ({ t, s: 14.5, c: '#374151' }))]);
  };

  // Tier 1: client (web browser)
  tier(20, 205, 'CLIENT', 'browser', C.blueFill, C.blueStroke);
  box(cols[0][0], 40, cols[0][1], 188, 'User Interface', ['index.php · style.css', 'sidebar search & filters,', 'Recent Sightings table,', 'Species Profile panel']);
  box(cols[1][0], 40, cols[1][1], 188, 'Client Logic', ['app.js', 'app state · fetch() calls', 'renders pins, table', 'and species profile']);
  box(cols[2][0], 40, cols[2][1], 188, 'Leaflet.js', ['interactive map', 'color-coded pins', 'base-map tabs · scale', 'radius circle + label']);
  // Map tiles: fetched directly by the browser
  b += rectXY(882, 60, 1140, 170, { fill: C.amberFill, stroke: C.amberStroke, sw: 1.6, rx: 6 });
  b += lines(1011, 115, [{ t: '«external»', s: 12, i: true, c: C.grey }, { t: 'Map Tile Services', s: 16.5, w: 'bold' }, { t: 'OpenStreetMap (standard)', s: 14.5, c: '#374151' }, { t: 'Esri (satellite, topographic)', s: 14.5, c: '#374151' }]);
  b += poly([[796, 115], [880, 115]]);
  b += tag(846, 134, 'map tiles', { s: 13, w: 'normal', bg: 'none' });

  // Tier 2: server
  tier(270, 560, 'SERVER', 'Apache + PHP', C.greenFill, C.green);
  box(cols[0][0], 298, cols[0][1], 392, 'geocode.php', ['Location API', 'place name → lat/lng']);
  box(cols[1][0], 298, cols[1][1], 392, 'sightings.php', ['Sightings API', 'filters · animal-group keys']);
  box(cols[2][0], 298, cols[2][1], 392, 'species.php', ['Species API', 'taxonomy + photo']);
  box(cols[1][0], 446, cols[1][1], 540, 'includes/gbif.php', ['GBIF client: query builder,', 'retry ×3, sample dataset']);

  // Database (designed, not yet connected)
  b += rectXY(882, 430, 1140, 560, { fill: '#fff', stroke: C.grey, sw: 1.6, rx: 6, dash: '7 5' });
  b += lines(1011, 495, [{ t: 'MySQL · wildlife_tracker', s: 16.5, w: 'bold' }, { t: 'saved_locations', s: 14.5, c: '#374151' }, { t: 'search_history · species_cache', s: 14.5, c: '#374151' }, { t: '(designed — not yet connected)', s: 13.5, i: true, c: C.grey }]);
  b += poly([[812, 495], [880, 495]], { dash: '6 5' });
  b += tag(846, 477, 'db.php', { s: 13, w: 'normal', bg: 'none' });

  // Tier 3: external data services
  tier(625, 770, 'EXTERNAL', '', C.amberFill, C.amberStroke);
  box(cols[0][0], 648, cols[0][1], 752, 'OpenStreetMap Nominatim', ['geocoding API']);
  box(cols[1][0], 648, cols[2][1], 752, 'GBIF API  (api.gbif.org/v1)', ['/occurrence/search · /species/{key} · /species/{key}/media']);

  // Browser -> PHP APIs (request bus)
  b += poly([[mid(1), 188], [mid(1), 238]], { marker: null });
  b += poly([[mid(0), 238], [mid(2), 238]], { marker: null });
  [0, 1, 2].forEach(i => { b += poly([[mid(i), 238], [mid(i), 296]]); });
  b += tag((mid(0) + mid(1)) / 2, 238, 'HTTP GET → JSON', { s: 13.5, w: 'bold' });
  // PHP -> external services
  b += poly([[mid(1), 392], [mid(1), 444]]);
  b += poly([[mid(0), 392], [mid(0), 646]]);
  b += poly([[mid(1), 540], [mid(1), 646]]);
  b += poly([[mid(2), 392], [mid(2), 646]]);
  b += tag(mid(0), 592, 'geocoding request', { s: 13.5, w: 'normal' });
  b += tag(mid(1), 592, 'occurrence search', { s: 13.5, w: 'normal' });
  b += tag(mid(2), 592, 'species + media', { s: 13.5, w: 'normal' });
  return svg(W, H, b);
}

/* ------------------------------------------------------------------ */
/* System Design - architecture (map page + encyclopedia, cache, Wikipedia) */
/* ------------------------------------------------------------------ */
function architectureDesign() {
  const W = 1180, H = 800;
  let b = '';
  const tier = (y0, y1, l1, l2, fill, stroke) => {
    b += rectXY(20, y0, 812, y1, { fill, stroke, sw: 1.8, rx: 10 });
    b += `<path d="M30,${y0} h28 v${y1 - y0} h-28 a10,10 0 0 1 -10,-10 v-${y1 - y0 - 20} a10,10 0 0 1 10,-10 z" fill="${stroke}"/>`;
    const cy = (y0 + y1) / 2;
    b += `<text transform="rotate(-90 44 ${cy})" x="44" y="${cy + 5}" font-family="${FONT}" font-size="15" font-weight="bold" fill="#fff" text-anchor="middle">${esc(l1)}${l2 ? ` · ${esc(l2)}` : ''}</text>`;
  };
  const box = (x0, y0, x1, y1, title, sub, o = {}) => {
    b += rectXY(x0, y0, x1, y1, { fill: o.fill || '#fff', stroke: o.stroke || C.line, sw: 1.5, rx: 6 });
    b += lines((x0 + x1) / 2, (y0 + y1) / 2, [{ t: title, s: o.ts || 15.5, w: 'bold' }, ...sub.map(t => ({ t, s: 13, c: '#374151' }))]);
  };
  const c3 = [[80, 306], [326, 552], [572, 796]];            // client tier: 3 columns
  const c4 = [[80, 245], [259, 424], [438, 617], [631, 796]];  // server tier: 4 endpoints
  const m3 = i => (c3[i][0] + c3[i][1]) / 2, m4 = i => (c4[i][0] + c4[i][1]) / 2;

  // Tier 1: browser
  tier(20, 205, 'CLIENT', 'browser', C.blueFill, C.blueStroke);
  box(c3[0][0], 40, c3[0][1], 188, 'User Interface', ['index.php: map dashboard', 'encyclopedia.php', 'partials/header.php:', 'shared top bar']);
  box(c3[1][0], 40, c3[1][1], 188, 'Client Logic', ['app.js: search, filters,', 'pins, table, profile', 'encyclopedia.js: tree,', 'cards, detail dialog']);
  box(c3[2][0], 40, c3[2][1], 188, 'Leaflet.js', ['interactive map', 'color-coded pins', 'base-map tabs · scale', 'radius circle + label']);
  b += rectXY(882, 40, 1160, 190, { fill: C.amberFill, stroke: C.amberStroke, sw: 1.6, rx: 6 });
  b += lines(1021, 115, [{ t: '«external»', s: 12, i: true, c: C.grey }, { t: 'Map tiles and photos', s: 15.5, w: 'bold' },
    { t: 'OpenStreetMap, Esri tiles', s: 13, c: '#374151' }, { t: 'iNaturalist, Wikimedia', s: 13, c: '#374151' }, { t: '(loaded by the browser)', s: 12.5, i: true, c: C.grey }]);
  b += poly([[796, 115], [880, 115]]);

  // Tier 2: server
  tier(270, 575, 'SERVER', 'Apache + PHP', C.greenFill, C.green);
  box(c4[0][0], 296, c4[0][1], 392, 'geocode.php', ['place name', '→ lat/lng'], { ts: 15 });
  box(c4[1][0], 296, c4[1][1], 392, 'sightings.php', ['sightings near', 'a point + filters'], { ts: 15 });
  box(c4[2][0], 296, c4[2][1], 392, 'encyclopedia.php', ['top species per', 'group · facts'], { ts: 15 });
  box(c4[3][0], 296, c4[3][1], 392, 'species.php', ['taxonomy, photo,', 'summary (cached)'], { ts: 15 });
  box(c4[1][0], 450, c4[2][1], 530, 'includes/gbif.php', ['GBIF client: retry ×3, sample dataset, gbif_get()'], { fill: '#fbfdfb' });
  box(c4[3][0] + 46, 450, c4[3][1], 530, 'wikipedia.php', ['article summary'], { fill: '#fbfdfb', ts: 14 });

  // Database: one cache table, read and written by species.php
  b += rectXY(882, 430, 1160, 575, { fill: C.greenFill, stroke: C.green, sw: 1.6, rx: 6 });
  b += lines(1021, 502, [{ t: 'MySQL · wildlife_tracker', s: 15.5, w: 'bold' }, { t: 'species_cache', s: 13.5, c: '#374151' },
    { t: 'taxonomy, photo, summary', s: 12.5, i: true, c: C.grey }, { t: 'kept for 30 days', s: 12.5, i: true, c: C.grey }]);
  b += poly([[796, 344], [846, 344], [846, 502], [880, 502]]);
  b += tag(846, 420, 'db.php', { s: 13, w: 'normal' });

  // Tier 3: external data services
  tier(640, 780, 'EXTERNAL', '', C.amberFill, C.amberStroke);
  box(c4[0][0], 662, c4[0][1], 758, 'Nominatim', ['OpenStreetMap', 'geocoding'], { ts: 15 });
  box(c4[1][0], 662, c4[2][1], 758, 'GBIF API  (api.gbif.org/v1)', ['/occurrence/search · /species/{key}', '/species/{key}/media · /iucnRedListCategory'], { ts: 15 });
  box(c4[3][0], 662, c4[3][1], 758, 'Wikipedia', ['REST API', 'page summary'], { ts: 15 });

  // Browser -> PHP endpoints
  b += poly([[m3(1), 188], [m3(1), 238]], { marker: null });
  b += poly([[m4(0), 238], [m4(3), 238]], { marker: null });
  [0, 1, 2, 3].forEach(i => { b += poly([[m4(i), 238], [m4(i), 294]]); });
  b += tag((m4(0) + m4(1)) / 2 + 10, 238, 'HTTP GET → JSON', { s: 13, w: 'bold' });
  // Endpoints -> helpers -> external services
  b += poly([[m4(1), 392], [m4(1), 448]]);
  b += poly([[m4(2), 392], [m4(2), 448]]);
  b += poly([[c4[3][0] + 20, 392], [c4[3][0] + 20, 490], [c4[2][1] + 2, 490]]);
  b += poly([[c4[3][1] - 60, 392], [c4[3][1] - 60, 448]]);
  b += poly([[m4(0), 392], [m4(0), 660]]);
  b += poly([[(c4[1][0] + c4[2][1]) / 2, 530], [(c4[1][0] + c4[2][1]) / 2, 660]]);
  b += poly([[(c4[3][0] + 46 + c4[3][1]) / 2, 530], [(c4[3][0] + 46 + c4[3][1]) / 2, 660]]);
  b += tag(m4(0), 600, 'geocoding', { s: 12.5, w: 'normal' });
  b += tag((c4[1][0] + c4[2][1]) / 2, 600, 'occurrences, species, IUCN status', { s: 12.5, w: 'normal' });
  b += tag((c4[3][0] + 46 + c4[3][1]) / 2, 600, 'summary', { s: 12.5, w: 'normal' });
  return svg(W, H, b);
}

/* ------------------------------------------------------------------ */
/* Flowchart helpers                                                   */
/* ------------------------------------------------------------------ */
function node(n) {
  const { type, cx, cy, w, h, t } = n;
  let s = '';
  if (type === 'term') s += rect(cx, cy, w, h, { fill: C.green, stroke: C.green, rx: h / 2 }) + txt(cx, cy, t, { s: 15.5, w: 'bold', c: '#fff' });
  if (type === 'proc') s += rect(cx, cy, w, h, { fill: C.greenFill, stroke: C.green, rx: 4, sw: 1.8 }) + txt(cx, cy, t, { s: 15 });
  if (type === 'dec') s += diamond(cx, cy, w, h) + txt(cx, cy, t, { s: 14.5, w: 'bold' });
  if (type === 'io') s += para(cx, cy, w, h) + txt(cx, cy, t, { s: 15 });
  if (type === 'err') s += para(cx, cy, w, h, { fill: C.errFill, stroke: C.errStroke }) + txt(cx, cy, t, { s: 14.5 });
  return s;
}
const top = n => n.cy - n.h / 2, bot = n => n.cy + n.h / 2, lft = n => n.cx - n.w / 2, rgt = n => n.cx + n.w / 2;
const yn = (x, y, t, anchor = 'middle') => tag(x, y, t, { s: 13.5, w: 'bold', c: t === 'Yes' ? C.green : C.errStroke, anchor });

function legend(x, y) {
  let s = '';
  const items = [['term', 'Start / End'], ['proc', 'Process'], ['dec', 'Decision'], ['io', 'Input / Output']];
  items.forEach(([k, label], i) => {
    const cx = x + 30, cy = y + i * 34;
    if (k === 'term') s += rect(cx, cy, 50, 22, { fill: C.green, stroke: C.green, rx: 11 });
    if (k === 'proc') s += rect(cx, cy, 50, 22, { fill: C.greenFill, stroke: C.green, rx: 3, sw: 1.5 });
    if (k === 'dec') s += diamond(cx, cy, 50, 26, { sw: 1.5 });
    if (k === 'io') s += para(cx, cy, 46, 22, { sw: 1.5, skew: 10 });
    s += `<text x="${x + 66}" y="${cy + 5}" font-family="${FONT}" font-size="13.5" fill="${C.ink}">${esc(label)}</text>`;
  });
  return rectXY(x - 12, y - 26, x + 178, y + 3 * 34 + 24, { fill: '#fff', stroke: '#cbd2d9', sw: 1, rx: 6 }) +
    `<text x="${x - 2}" y="${y - 32}" font-family="${FONT}" font-size="12.5" font-weight="bold" fill="${C.grey}"></text>` + s;
}

/* ------------------------------------------------------------------ */
/* Flowchart extras: use case tags and external service boxes         */
/* ------------------------------------------------------------------ */
// Small green pill naming the use case(s) a step belongs to, on the node's top-right corner
function ucTag(n) {
  if (!n.uc) return '';
  const w = n.uc.length * 7.4 + 14;
  // decisions: tag sits beside the right vertex; boxes: on the top-right corner
  const x1 = n.type === 'dec' ? rgt(n) + 8 + w : rgt(n) + 6, y = n.type === 'dec' ? n.cy - 22 : top(n) + 2;
  return `<rect x="${x1 - w}" y="${y - 10}" width="${w}" height="19" rx="9.5" fill="#fff" stroke="${C.green}" stroke-width="1.3"/>` +
    `<text x="${x1 - w / 2}" y="${y + 4}" font-family="${FONT}" font-size="11.5" font-weight="bold" fill="${C.green}" text-anchor="middle">${esc(n.uc)}</text>`;
}

// External API / service box
function service(cx, cy, name, sub, w = 230, h = 74) {
  return rect(cx, cy, w, h, { fill: C.amberFill, stroke: C.amberStroke, rx: 6, sw: 1.7 }) +
    lines(cx, cy, [{ t: '«external service»', s: 11.5, i: true, c: C.grey }, { t: name, s: 14.5, w: 'bold' }, { t: sub, s: 12, c: '#374151' }]);
}

// Dashed two-way connector between a step and a service; optional "hop" over a crossing line
function link(x1, y, x2, label, hopX) {
  const d = hopX
    ? `M${x1},${y} H${hopX - 11} A11,11 0 0 1 ${hopX + 11},${y} H${x2}`
    : `M${x1},${y} H${x2}`;
  return `<path d="${d}" fill="none" stroke="${C.amberStroke}" stroke-width="1.7" stroke-dasharray="6 4" marker-start="url(#svcArrow)" marker-end="url(#svcArrow)"/>` +
    tag(hopX ? (hopX + 11 + x2) / 2 : (x1 + x2) / 2, y - 12, label, { s: 11.5, w: 'normal', c: '#7c5a10' });
}

const SVC_DEFS = `<defs><marker id="svcArrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="${C.amberStroke}"/></marker></defs>`;

function swimTitle(x, y, t) {
  return `<text x="${x}" y="${y}" font-family="${FONT}" font-size="13" font-weight="bold" fill="${C.grey}" text-anchor="middle" letter-spacing="0.5">${esc(t)}</text>`;
}

/* ------------------------------------------------------------------ */
/* Figure 3 - Flowchart: search and display sightings                  */
/* ------------------------------------------------------------------ */
function flowSearch() {
  const W = 1300, X = 560, LX = 170, SX = 1175;
  const N = {
    s:     { type: 'term', cx: X, cy: 40, w: 150, h: 42, t: 'Start' },
    how:   { type: 'dec', cx: X, cy: 132, w: 270, h: 96, t: 'How does the user\nchoose a location?' },
    a:     { type: 'io', cx: 320, cy: 250, w: 240, h: 56, t: 'A · Type a place name\n(Enter or search icon)', uc: 'UC-01' },
    b:     { type: 'io', cx: 600, cy: 250, w: 250, h: 56, t: 'B · Click a Quick Location\n(Busan, Seoul, Jeju …)', uc: 'UC-11' },
    c:     { type: 'io', cx: 890, cy: 250, w: 210, h: 56, t: 'C · Click “Locate Me”', uc: 'UC-01 A4' },
    gps:   { type: 'proc', cx: 890, cy: 336, w: 200, h: 56, t: 'Ask the browser for\nthe device position' },
    geo:   { type: 'proc', cx: X, cy: 414, w: 340, h: 56, t: 'Geocode the place name\n(geocode.php)' },
    found: { type: 'dec', cx: X, cy: 514, w: 210, h: 86, t: 'Location\nfound?' },
    move:  { type: 'proc', cx: X, cy: 614, w: 380, h: 56, t: 'Move the map; draw the radius\ncircle and its label', uc: 'UC-01' },
    q:     { type: 'proc', cx: X, cy: 716, w: 400, h: 74, t: 'Query sightings (sightings.php → gbif.php)\ngroups · dates · radius · max records\nup to 3 attempts', uc: 'UC-03' },
    ok:    { type: 'dec', cx: X, cy: 826, w: 210, h: 86, t: 'GBIF\nresponded?' },
    any:   { type: 'dec', cx: X, cy: 930, w: 210, h: 86, t: 'Any\nsightings?' },
    show:  { type: 'io', cx: X, cy: 1030, w: 400, h: 60, t: 'Show pins and the Recent Sightings\ntable; select the first sighting', uc: 'UC-03 / UC-07' },
    chg:   { type: 'dec', cx: X, cy: 1150, w: 250, h: 92, t: 'Groups, dates or\nradius changed?', uc: 'UC-04/05/06' },
    again: { type: 'dec', cx: X, cy: 1256, w: 240, h: 88, t: 'Search another\nlocation?' },
    e:     { type: 'term', cx: X, cy: 1356, w: 150, h: 42, t: 'End' },
    nf:    { type: 'err', cx: LX, cy: 514, w: 230, h: 62, t: 'Show “Location not found”\nor “Could not retrieve\ncurrent location”' },
    fail:  { type: 'err', cx: LX, cy: 826, w: 230, h: 58, t: 'Show sample data and\nwarning (NFR-04)' },
    none:  { type: 'err', cx: LX, cy: 930, w: 220, h: 56, t: 'Show “No fauna\nrecords found”' },
  };
  let b = SVC_DEFS;
  b += swimTitle(LX, 22, 'MESSAGES') + swimTitle(SX, 22, 'EXTERNAL SERVICES');
  b += `<line x1="${SX - 130}" y1="34" x2="${SX - 130}" y2="1390" stroke="#e2e8f0" stroke-width="1.5" stroke-dasharray="4 6"/>`;

  // Note: the default search runs on page load
  b += rect(830, 40, 300, 50, { fill: '#f8fafc', stroke: '#94a3b8', rx: 6, sw: 1.2, dash: '5 4' });
  b += lines(830, 40, [{ t: 'On page load the default search (Busan ·', s: 12, c: '#475569' }, { t: '10 km · all groups) runs straight to “Query”', s: 12, c: '#475569' }]);
  b += poly([[rgt(N.s) + 2, 40], [680, 40]], { marker: null, dash: '4 4', stroke: '#94a3b8', sw: 1.2 });

  const down = (a, c) => { b += poly([[X, bot(N[a])], [X, top(N[c])]]); };
  down('s', 'how'); down('geo', 'found'); down('found', 'move'); down('move', 'q'); down('q', 'ok');
  down('ok', 'any'); down('any', 'show'); down('show', 'chg'); down('chg', 'again'); down('again', 'e');

  // Three ways to choose a location: bus from the decision to A, B, C
  const busY = 198;
  b += poly([[X, bot(N.how)], [X, busY]], { marker: null });
  b += poly([[N.a.cx, busY], [N.c.cx, busY]], { marker: null });
  ['a', 'b', 'c'].forEach(k => { b += poly([[N[k].cx, busY], [N[k].cx, top(N[k]) - 1]]); });

  // A and B both need geocoding: join them into one step
  const joinY = 346;
  b += poly([[N.a.cx, bot(N.a)], [N.a.cx, joinY], [X, joinY]], { marker: null });
  b += poly([[N.b.cx, bot(N.b)], [N.b.cx, joinY], [X, joinY]], { marker: null });
  b += poly([[X, joinY], [X, top(N.geo)]]);
  b += tag((N.a.cx + X) / 2 - 20, joinY - 11, 'A or B', { s: 11.5, w: 'bold', c: C.grey });

  // C goes to the browser, then into the right vertex of "Location found?"
  b += poly([[N.c.cx, bot(N.c)], [N.c.cx, top(N.gps)]]);
  b += poly([[N.gps.cx, bot(N.gps)], [N.gps.cx, N.found.cy], [rgt(N.found) + 2, N.found.cy]]);

  b += yn(X + 16, bot(N.found) + 13, 'Yes', 'start');
  b += yn(X + 16, bot(N.ok) + 13, 'Yes', 'start');
  b += yn(X + 16, bot(N.any) + 13, 'Yes', 'start');
  b += yn(X + 16, bot(N.chg) + 13, 'No', 'start');
  b += yn(X + 16, bot(N.again) + 13, 'No', 'start');

  // Location not found -> back to "How does the user choose a location?"
  b += poly([[lft(N.found), N.found.cy], [rgt(N.nf) + 2, N.found.cy]]);
  b += yn((lft(N.found) + rgt(N.nf)) / 2, N.found.cy - 13, 'No');
  b += poly([[LX, top(N.nf)], [LX, N.how.cy]], { marker: null });

  // GBIF failed / no sightings -> merge before "changed?"
  const mergeY = 1086;
  b += poly([[lft(N.ok), N.ok.cy], [rgt(N.fail) + 2, N.ok.cy]]);
  b += yn((lft(N.ok) + rgt(N.fail)) / 2, N.ok.cy - 13, 'No');
  b += poly([[lft(N.any), N.any.cy], [rgt(N.none) + 2, N.any.cy]]);
  b += yn((lft(N.any) + rgt(N.none)) / 2, N.any.cy - 13, 'No');
  b += poly([[lft(N.fail) - 4, N.fail.cy], [80, N.fail.cy], [80, mergeY]], { marker: null });
  b += poly([[LX, bot(N.none)], [LX, mergeY]], { marker: null });
  b += poly([[80, mergeY], [X - 2, mergeY]]);

  // Filters changed -> back to the query (same location, no new search)
  b += poly([[lft(N.chg), N.chg.cy], [45, N.chg.cy], [45, N.q.cy], [lft(N.q) - 2, N.q.cy]]);
  b += yn(lft(N.chg) - 34, N.chg.cy - 13, 'Yes');
  // Search another location -> back to the choice
  b += poly([[lft(N.again), N.again.cy], [20, N.again.cy], [20, N.how.cy], [lft(N.how) - 2, N.how.cy]]);
  b += yn(lft(N.again) - 34, N.again.cy - 13, 'Yes');

  // External services
  b += service(SX, N.gps.cy, 'Browser Geolocation', 'device GPS (with permission)');
  b += link(rgt(N.gps), N.gps.cy, SX - 115, 'lat/lng');
  b += service(SX, N.geo.cy, 'Nominatim (OpenStreetMap)', 'geocoding API');
  b += link(rgt(N.geo), N.geo.cy, SX - 115, 'place name → lat/lng', N.gps.cx);
  b += service(SX, N.q.cy, 'GBIF Occurrence API', '/occurrence/search');
  b += link(rgt(N.q), N.q.cy, SX - 115, 'records + photos');

  Object.values(N).forEach(n => { b += node(n) + ucTag(n); });
  b += legend(1080, 1190);
  return svg(W, 1395, b);
}

/* ------------------------------------------------------------------ */
/* Figure 4 - Flowchart: view species details                          */
/* ------------------------------------------------------------------ */
function flowSpecies() {
  const W = 1260, X = 560, LX = 200, SX = 1130;
  const N = {
    s:    { type: 'term', cx: X, cy: 40, w: 300, h: 42, t: 'Start: sightings are displayed' },
    pick: { type: 'io', cx: X, cy: 120, w: 400, h: 56, t: 'User clicks a map pin or “View”\nin the Recent Sightings table', uc: 'UC-07' },
    open: { type: 'proc', cx: X, cy: 214, w: 430, h: 62, t: 'Highlight the pin and row; fill the Species\nProfile: photo, date, locality, coordinates', uc: 'UC-07' },
    sp:   { type: 'dec', cx: X, cy: 322, w: 230, h: 90, t: 'Identified to\nspecies level?' },
    get:  { type: 'proc', cx: X, cy: 428, w: 430, h: 62, t: 'Get English name and taxonomy (species.php;\nreused if already viewed)', uc: 'UC-07' },
    rec:  { type: 'dec', cx: X, cy: 534, w: 210, h: 88, t: 'Details\nreceived?' },
    disp: { type: 'io', cx: X, cy: 636, w: 420, h: 60, t: 'Display name and taxonomy table\n(Kingdom → Species)', uc: 'UC-07' },
    gb:   { type: 'dec', cx: X, cy: 764, w: 220, h: 88, t: 'Open GBIF\nrecord?' },
    tab:  { type: 'proc', cx: X, cy: 870, w: 360, h: 58, t: 'Open the GBIF page\nin a new browser tab', uc: 'UC-09' },
    e:    { type: 'term', cx: X, cy: 960, w: 300, h: 42, t: 'End: user clears the selection' },
    grp:  { type: 'err', cx: LX, cy: 322, w: 250, h: 58, t: 'Show animal group only\n(link to GBIF occurrence)' },
    na:   { type: 'err', cx: LX, cy: 534, w: 250, h: 58, t: 'Keep sighting details;\nshow known ranks only' },
  };
  let b = SVC_DEFS;
  b += swimTitle(LX, 22, 'MESSAGES') + swimTitle(SX, 22, 'EXTERNAL SERVICES');
  b += `<line x1="${SX - 130}" y1="34" x2="${SX - 130}" y2="990" stroke="#e2e8f0" stroke-width="1.5" stroke-dasharray="4 6"/>`;

  const down = (a, c) => { b += poly([[X, bot(N[a])], [X, top(N[c])]]); };
  down('s', 'pick'); down('pick', 'open'); down('open', 'sp'); down('sp', 'get'); down('get', 'rec'); down('rec', 'disp');
  down('disp', 'gb'); down('gb', 'tab'); down('tab', 'e');
  b += yn(X + 16, bot(N.sp) + 13, 'Yes', 'start');
  b += yn(X + 16, bot(N.rec) + 13, 'Yes', 'start');
  b += yn(X + 16, bot(N.gb) + 13, 'Yes', 'start');

  const mergeY = 700;
  b += poly([[lft(N.sp), N.sp.cy], [rgt(N.grp) + 2, N.sp.cy]]);
  b += yn((lft(N.sp) + rgt(N.grp)) / 2, N.sp.cy - 13, 'No');
  b += poly([[lft(N.grp), N.grp.cy], [40, N.grp.cy], [40, mergeY], [X - 2, mergeY]]);
  b += poly([[lft(N.rec), N.rec.cy], [rgt(N.na) + 2, N.rec.cy]]);
  b += yn((lft(N.rec) + rgt(N.na)) / 2, N.rec.cy - 13, 'No');
  b += poly([[LX, bot(N.na)], [LX, mergeY]], { marker: null });
  // Not opening GBIF -> end
  b += poly([[lft(N.gb), N.gb.cy], [LX, N.gb.cy], [LX, N.e.cy], [lft(N.e) - 2, N.e.cy]]);
  b += yn((lft(N.gb) + LX) / 2, N.gb.cy - 13, 'No');

  b += service(SX, N.open.cy, 'Photo host', 'GBIF media link (mostly iNaturalist)');
  b += link(rgt(N.open), N.open.cy, SX - 115, 'photo URL → image');
  b += service(SX, N.get.cy, 'GBIF Species API', '/species/{key}');
  b += link(rgt(N.get), N.get.cy, SX - 115, 'speciesKey → taxonomy');
  b += service(SX, N.tab.cy, 'GBIF website', 'gbif.org species / occurrence');
  b += link(rgt(N.tab), N.tab.cy, SX - 115, 'opens page');

  Object.values(N).forEach(n => { b += node(n) + ucTag(n); });
  b += legend(1040, 560);
  return svg(W, 1000, b);
}

/* ------------------------------------------------------------------ */
/* System Design - Entity-relationship diagram (crow's foot)           */
/* ------------------------------------------------------------------ */
// Where each entity's data lives: colour of the header band
const KIND = {
  db:      { fill: C.greenFill, stroke: C.green, note: 'MySQL table · stored' },
  gbif:    { fill: C.amberFill, stroke: C.amberStroke, note: 'from GBIF API · not stored' },
  browser: { fill: C.blueFill, stroke: C.blueStroke, note: 'in the browser (app.js)' },
};
const ROW = 25, HEAD = 54;

// Entity box: header with name and storage note, then rows of [key, attribute, type]
function entity(x0, y0, w, name, kind, attrs, note) {
  const k = KIND[kind];
  const h = HEAD + attrs.length * ROW + 10;
  let s = rectXY(x0, y0, x0 + w, y0 + h, { fill: '#fff', stroke: k.stroke, sw: 1.8, rx: 6 });
  s += `<path d="M${x0 + 6},${y0} h${w - 12} a6,6 0 0 1 6,6 v${HEAD - 6} h-${w} v-${HEAD - 6} a6,6 0 0 1 6,-6 z" fill="${k.stroke}"/>`;
  s += lines(x0 + w / 2, y0 + HEAD / 2, [{ t: name, s: 17, w: 'bold', c: '#fff' }, { t: note || k.note, s: 12.5, i: true, c: '#fff' }]);
  attrs.forEach(([key, col, type], i) => {
    const cy = y0 + HEAD + 5 + ROW * i + ROW / 2;
    if (i % 2) s += `<rect x="${x0 + 1}" y="${cy - ROW / 2}" width="${w - 2}" height="${ROW}" fill="${k.fill}"/>`;
    if (key) s += lines(x0 + 22, cy, [{ t: key, s: 12, w: 'bold', c: k.stroke }]);
    s += lines(x0 + 44, cy, [{ t: col, s: 14, w: key === 'PK' ? 'bold' : 'normal' }], 'start');
    s += lines(x0 + w - 12, cy, [{ t: type, s: 12.5, c: C.grey }], 'end');
  });
  return s;
}

// Crow's-foot symbol at point p on an entity edge; d = unit direction pointing away from the entity
function crow(p, d, kind) {
  const [x, y] = p, [dx, dy] = d, nx = -dy, ny = dx;
  const at = t => [x + dx * t, y + dy * t];
  const ln = (a, b) => `<line x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}" stroke="${C.ink}" stroke-width="1.8"/>`;
  const bar = t => { const [cx, cy] = at(t); return ln([cx + nx * 9, cy + ny * 9], [cx - nx * 9, cy - ny * 9]); };
  const ring = t => { const [cx, cy] = at(t); return `<circle cx="${cx}" cy="${cy}" r="5.5" fill="#fff" stroke="${C.ink}" stroke-width="1.8"/>`; };
  const foot = () => [[x + nx * 10, y + ny * 10], [x, y], [x - nx * 10, y - ny * 10]].map(e => ln(at(16), e)).join('');
  if (kind === '1') return bar(10) + bar(17);        // exactly one
  if (kind === '0..1') return bar(10) + ring(25);    // zero or one
  if (kind === '1..*') return foot() + bar(23);      // one or more
  return foot() + ring(27);                          // zero or more
}

// Relationship line with crow's-foot ends, a verb label, and min..max text at each end
function relation(pts, kA, kB, label, lp, anchor = 'middle') {
  const unit = (a, b) => { const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy); return [dx / L, dy / L]; };
  const n = pts.length, dA = unit(pts[0], pts[1]), dB = unit(pts[n - 1], pts[n - 2]);
  let s = poly(pts, { marker: null, stroke: C.ink, sw: 1.8 });
  s += crow(pts[0], dA, kA) + crow(pts[n - 1], dB, kB);
  // always below a horizontal line, or right of a vertical one
  const card = (p, d, k) => lines(p[0] + d[0] * 42 + Math.abs(d[1]) * 18, p[1] + d[1] * 42 + Math.abs(d[0]) * 16, [{ t: k, s: 12.5, w: 'bold', c: C.grey }]);
  s += card(pts[0], dA, kA) + card(pts[n - 1], dB, kB);
  return s + tag(lp[0], lp[1], label, { s: 14, w: 'bold', i: true, anchor });
}

function erd() {
  const W = 1260, H = 720;
  let b = '';
  // Relationships first, so the entity boxes and symbols sit on top
  b += relation([[310, 150], [450, 150]], '1', '0..*', 'returns', [380, 122]);
  b += relation([[170, 299], [170, 420]], '0..*', '1..*', 'filters by', [156, 360], 'end');
  b += relation([[310, 515], [615, 515], [615, 424]], '1', '0..*', 'classifies', [470, 515]);
  b += relation([[780, 150], [920, 150]], '0..*', '0..1', 'is identified as', [850, 122]);

  b += entity(30, 60, 280, 'SEARCH', 'browser', [
    ['', 'place_name', 'text'], ['', 'latitude', 'decimal'], ['', 'longitude', 'decimal'], ['', 'radius_km', '5–100'],
    ['', 'from_date', 'date'], ['', 'to_date', 'date'], ['', 'max_records', '30–300'],
  ]);
  b += entity(30, 420, 280, 'ANIMAL_GROUP', 'browser', [
    ['PK', 'group_id', 'text'], ['', 'label', 'text'], ['', 'division', 'text'], ['', 'description', 'text'],
    ['', 'color', 'hex'], ['', 'icon', 'text'], ['', 'gbif_taxon_keys', 'int list'],
  ], 'fixed lists: app.js, encyclopedia.php');
  b += entity(450, 60, 330, 'OCCURRENCE', 'gbif', [
    ['PK', 'occurrence_key', 'bigint'], ['FK', 'species_key', 'int (optional)'], ['FK', 'group_id', 'from class'],
    ['', 'scientific_name', 'text'], ['', 'common_name', 'text'], ['', 'taxon_class', 'text'], ['', 'latitude', 'decimal'],
    ['', 'longitude', 'decimal'], ['', 'event_date', 'date'], ['', 'country', 'text'], ['', 'locality', 'text'], ['', 'image_url', 'url'],
  ]);
  b += entity(920, 60, 320, 'SPECIES  (species_cache)', 'db', [
    ['PK', 'species_key', 'INT UNSIGNED'], ['', 'scientific_name', 'VARCHAR(200)'], ['', 'vernacular_name', 'VARCHAR(200)'],
    ['', 'taxon_rank', 'VARCHAR(20)'], ['', 'kingdom', 'VARCHAR(100)'], ['', 'phylum', 'VARCHAR(100)'], ['', 'class_name', 'VARCHAR(100)'],
    ['', 'order_name', 'VARCHAR(100)'], ['', 'family', 'VARCHAR(100)'], ['', 'genus', 'VARCHAR(100)'], ['', 'species', 'VARCHAR(200)'],
    ['', 'image_url', 'VARCHAR(500)'], ['', 'summary', 'TEXT'], ['', 'wiki_url', 'VARCHAR(300)'], ['', 'cached_at', 'TIMESTAMP'],
  ]);

  // Legend: where the data lives, and how to read the line ends
  b += rectXY(680, 548, 1240, 695, { fill: '#fff', stroke: '#cbd2d9', sw: 1, rx: 6 });
  [['db', 'Stored in MySQL'], ['gbif', 'Fetched live from GBIF'], ['browser', 'Held in the browser']].forEach(([k, t], i) => {
    const y = 582 + i * 36;
    b += rect(712, y, 34, 20, { fill: KIND[k].stroke, stroke: KIND[k].stroke, rx: 3 });
    b += lines(740, y, [{ t, s: 13.5 }], 'start');
  });
  [['1', 'exactly one'], ['0..1', 'zero or one'], ['1..*', 'one or more'], ['0..*', 'zero or more']].forEach(([k, t], i) => {
    const y = 570 + i * 33, e = 1020;
    b += `<line x1="${e}" y1="${y - 12}" x2="${e}" y2="${y + 12}" stroke="${C.ink}" stroke-width="2.4"/>`;
    b += poly([[e, y], [e - 58, y]], { marker: null, stroke: C.ink, sw: 1.8 }) + crow([e, y], [-1, 0], k);
    b += lines(1034, y, [{ t: `${k}  ${t}`, s: 13.5 }], 'start');
  });
  return svg(W, H, b);
}

/* ------------------------------------------------------------------ */
/* System Design - Conceptual schema (Chen notation)                   */
/* ------------------------------------------------------------------ */
function conceptualSchema() {
  const W = 1300, H = 940;
  let lns = '', shapes = '';
  // Line between two shapes; total participation is drawn as a double line
  const link = ([x1, y1], [x2, y2], total = false) => {
    if (!total) { lns += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${C.ink}" stroke-width="1.6"/>`; return; }
    const L = Math.hypot(x2 - x1, y2 - y1), ox = -(y2 - y1) / L * 3, oy = (x2 - x1) / L * 3;
    [1, -1].forEach(k => { lns += `<line x1="${x1 + ox * k}" y1="${y1 + oy * k}" x2="${x2 + ox * k}" y2="${y2 + oy * k}" stroke="${C.ink}" stroke-width="1.5"/>`; });
  };
  const ent = ([x, y], name) => {
    shapes += rect(x, y, 190, 58, { fill: C.blueFill, stroke: C.blueStroke, sw: 2, rx: 2 }) + lines(x, y, [{ t: name, s: 17, w: 'bold' }]);
  };
  const rel = ([x, y], name) => {
    shapes += diamond(x, y, 170, 74, { fill: C.decFill, stroke: C.decStroke, sw: 2 }) + lines(x, y, [{ t: name, s: 13, w: 'bold' }]);
  };
  // Attribute oval: o.key underlines the name, o.multi draws a double oval, o.derived a dashed one
  const attr = ([x, y], name, o = {}) => {
    const rx = Math.max(52, name.length * 4.3 + 18), ry = 21;
    shapes += `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="#fff" stroke="${C.green}" stroke-width="1.6"${o.derived ? ' stroke-dasharray="5 4"' : ''}/>`;
    if (o.multi) shapes += `<ellipse cx="${x}" cy="${y}" rx="${rx - 5}" ry="${ry - 5}" fill="none" stroke="${C.green}" stroke-width="1.3"/>`;
    shapes += lines(x, y, [{ t: name, s: 13.5, w: o.key ? 'bold' : 'normal' }]);
    if (o.key) shapes += `<line x1="${x - name.length * 3.9}" y1="${y + 9}" x2="${x + name.length * 3.9}" y2="${y + 9}" stroke="${C.ink}" stroke-width="1.2"/>`;
  };
  const card = ([x, y], t) => { shapes += lines(x, y, [{ t, s: 15, w: 'bold', c: C.errStroke }]); };
  const has = (e, pts, specs) => pts.forEach((p, i) => { link(e, p); attr(p, ...specs[i]); });

  const S = [360, 230], G = [360, 640], O = [940, 230], P = [940, 640];
  const R1 = [650, 230], R2 = [360, 435], R3 = [650, 640], R4 = [940, 435], R5 = [760, 357];

  // Relationships with cardinality (red) and participation
  link(S, R1); link(R1, O);                 card([470, 214], '1'); card([830, 214], 'N');
  link(S, R2, true); link(R2, G);           card([376, 305], 'M'); card([376, 568], 'N');
  link(G, R3); link(R3, P, true);           card([470, 624], '1'); card([830, 624], 'N');
  link(O, R4); link(R4, P);                 card([956, 305], 'N'); card([956, 568], '1');
  link(G, R5); link(R5, O, true);           card([455, 548], '1'); card([888, 304], 'N');

  // Attributes
  has(S, [[205, 110], [360, 100], [520, 110]], [['place_name'], ['radius_km'], ['max_records']]);
  link(S, [175, 235]); attr([175, 235], 'location');
  has([175, 235], [[70, 175], [70, 300]], [['latitude'], ['longitude']]);
  link(S, [525, 335]); attr([525, 335], 'date_range');
  has([525, 335], [[455, 400], [605, 395]], [['from_date'], ['to_date']]);

  has(G, [[175, 645], [185, 555], [215, 765], [385, 800], [555, 765]],
    [['group_id', { key: true }], ['taxon_keys', { multi: true }], ['name'], ['division'], ['description']]);

  has(O, [[960, 95], [780, 110], [1110, 110], [1185, 185], [1190, 265], [1165, 340], [1060, 350]],
    [['occurrence_key', { key: true }], ['latitude'], ['longitude'], ['event_date'], ['locality'], ['country'], ['photo_url']]);

  has(P, [[1160, 590], [1180, 665], [1130, 745], [965, 790], [790, 760], [705, 705], [1150, 505]],
    [['species_key', { key: true }], ['scientific_name'], ['common_name'], ['taxonomy (kingdom … species)'], ['summary'], ['image_url'],
      ['record_count', { derived: true }]]);

  ent(S, 'SEARCH'); ent(G, 'ANIMAL_GROUP'); ent(O, 'OCCURRENCE'); ent(P, 'SPECIES');
  rel(R1, 'RETURNS'); rel(R2, 'FILTERS BY'); rel(R3, 'INCLUDES'); rel(R4, 'IDENTIFIED AS'); rel(R5, 'CLASSIFIES');

  // Legend
  let lg = rectXY(20, 868, 1280, 920, { fill: '#fff', stroke: '#cbd2d9', sw: 1, rx: 6 });
  lg += lines(650, 894, [{ t: 'Rectangle = entity  ·  diamond = relationship  ·  oval = attribute (underlined = key, double = multivalued, dashed = derived)  ·  double line = total participation  ·  1, N, M = cardinality', s: 13, c: C.grey }]);
  return svg(W, H, lns + shapes + lg);
}

/* ------------------------------------------------------------------ */
/* System Design - Data flow diagrams (Gane–Sarson notation)           */
/* ------------------------------------------------------------------ */
function dfdProc(cx, cy, w, h, id, name, impl) {
  let s = rect(cx, cy, w, h, { fill: C.greenFill, stroke: C.green, sw: 1.9, rx: 14 });
  s += `<line x1="${cx - w / 2}" y1="${cy - h / 2 + 30}" x2="${cx + w / 2}" y2="${cy - h / 2 + 30}" stroke="${C.green}" stroke-width="1.4"/>`;
  s += lines(cx, cy - h / 2 + 15, [{ t: id, s: 14, w: 'bold', c: C.green }]);
  s += lines(cx, cy + 15, [...name.split('\n').map(t => ({ t, s: 16.5, w: 'bold' })), { t: impl, s: 12.5, i: true, c: C.grey }]);
  return s;
}
// External entity: square box with a shadow
function dfdExt(x0, y0, x1, y1, name, sub) {
  const cy = (y0 + y1) / 2;
  return rectXY(x0 + 5, y0 + 5, x1 + 5, y1 + 5, { fill: '#cbd5e1', stroke: 'none', rx: 2 }) +
    rectXY(x0, y0, x1, y1, { fill: C.extFill, stroke: C.extStroke, sw: 1.8, rx: 2 }) +
    lines((x0 + x1) / 2, cy, [...name.split('\n').map(t => ({ t, s: 16, w: 'bold' })), ...(sub ? sub.split('\n').map(t => ({ t, s: 12, i: true, c: C.grey })) : [])]);
}
// Data store: open-ended box with an ID compartment
function dfdStore(x0, cy, w, id, name, sub) {
  const h = 56, y0 = cy - h / 2, y1 = cy + h / 2;
  return `<rect x="${x0}" y="${y0}" width="${w}" height="${h}" fill="${C.blueFill}"/>` +
    `<path d="M${x0 + w},${y0} H${x0} V${y1} H${x0 + w}" fill="none" stroke="${C.blueStroke}" stroke-width="1.8"/>` +
    `<line x1="${x0 + 46}" y1="${y0}" x2="${x0 + 46}" y2="${y1}" stroke="${C.blueStroke}" stroke-width="1.4"/>` +
    lines(x0 + 23, cy, [{ t: id, s: 14, w: 'bold', c: C.blueStroke }]) +
    lines(x0 + 46 + (w - 46) / 2, cy, [{ t: name, s: 15, w: 'bold' }, { t: sub, s: 12, i: true, c: C.grey }]);
}
// Data flow: arrow plus a label (may have several lines) on a white background
function flow(pts, label, [lx, ly]) {
  const L = label.split('\n'), s = 13;
  const tw = Math.max(...L.map(l => l.length)) * s * 0.55 + 10, th = L.length * s * 1.28 + 4;
  return poly(pts) + `<rect x="${lx - tw / 2}" y="${ly - th / 2}" width="${tw}" height="${th}" fill="#fff"/>` +
    lines(lx, ly, L.map(t => ({ t, s })));
}
function dfdLegend(x, y) {
  let s = rectXY(x, y, x + 470, y + 100, { fill: '#fff', stroke: '#cbd2d9', sw: 1, rx: 6 });
  s += rect(x + 40, y + 30, 46, 30, { fill: C.greenFill, stroke: C.green, sw: 1.5, rx: 8 }) + lines(x + 74, y + 30, [{ t: 'Process', s: 13.5 }], 'start');
  s += rect(x + 40, y + 72, 46, 30, { fill: C.extFill, stroke: C.extStroke, sw: 1.5, rx: 2 }) + lines(x + 74, y + 72, [{ t: 'External entity', s: 13.5 }], 'start');
  s += `<rect x="${x + 250}" y="${y + 16}" width="46" height="28" fill="${C.blueFill}"/><path d="M${x + 296},${y + 16} H${x + 250} V${y + 44} H${x + 296}" fill="none" stroke="${C.blueStroke}" stroke-width="1.5"/>`;
  s += lines(x + 306, y + 30, [{ t: 'Data store', s: 13.5 }], 'start');
  s += poly([[x + 250, y + 72], [x + 296, y + 72]]) + lines(x + 306, y + 72, [{ t: 'Data flow', s: 13.5 }], 'start');
  return s;
}

// Level 0: the whole system as one process, with every external entity
function dfdContext() {
  const W = 1300, H = 720;
  let b = '';
  b += flow([[250, 100], [600, 100], [600, 223]], 'GPS position (with permission)', [425, 86]);
  b += flow([[250, 290], [513, 290]], 'search, filters, group choice', [382, 276]);
  b += flow([[250, 330], [513, 330]], 'selected sighting or species', [382, 316]);
  b += flow([[515, 370], [252, 370]], 'map, sightings table, species\nprofile, encyclopedia cards', [382, 394]);
  b += flow([[700, 223], [700, 85], [1048, 85]], 'place name', [875, 71]);
  b += flow([[1050, 120], [740, 120], [740, 223]], 'coordinates (lat/lng)', [895, 106]);
  b += flow([[785, 295], [1048, 295]], 'occurrence query; species key', [917, 281]);
  b += flow([[1050, 365], [787, 365]], 'occurrence records, species lists;\ntaxonomy, photo links, IUCN status', [917, 389]);
  b += flow([[1050, 560], [740, 560], [740, 437]], 'map tiles', [895, 546]);
  b += flow([[250, 560], [560, 560], [560, 437]], 'sighting photos', [405, 546]);

  b += dfdProc(650, 330, 270, 210, '0', 'WildTrack\nSystem', 'browser + PHP server');
  b += dfdExt(40, 60, 250, 140, 'Device\nGeolocation');
  b += dfdExt(40, 270, 250, 390, 'User', '(no login)');
  b += dfdExt(40, 520, 250, 600, 'Photo Hosts', 'iNaturalist, Wikimedia, …');
  b += dfdExt(1050, 60, 1260, 140, 'Nominatim', 'OpenStreetMap geocoding');
  b += dfdExt(1050, 270, 1260, 390, 'GBIF API', 'occurrence + species');
  b += dfdExt(1050, 520, 1260, 600, 'Map Tile\nServices');
  // Wikipedia: species summaries for the Encyclopedia
  b += flow([[625, 437], [625, 618]], 'scientific\nname', [578, 596]);
  b += flow([[675, 620], [675, 439]], 'summary,\nphoto', [720, 596]);
  b += dfdExt(545, 620, 755, 700, 'Wikipedia', 'article summaries');
  return svg(W, H, b);
}

// Level 1: the four main processes and the two data stores
function dfdLevel1() {
  const W = 1300, H = 1480, X = 560, PW = 260;
  const L = X - PW / 2, R = X + PW / 2;
  let b = '';
  // Left: device and user
  b += flow([[220, 100], [L - 2, 100]], 'GPS position', [324, 86]);
  b += flow([[220, 180], [L - 2, 180]], 'place name or\nQuick Location', [324, 152]);
  b += flow([[220, 390], [L - 2, 390]], 'filter choices: groups,\ndates, radius, max records', [324, 362]);
  b += flow([[L, 610], [222, 610]], 'pins, table, legend,\nstatus messages', [324, 582]);
  b += flow([[220, 665], [L - 2, 665]], 'clicked pin or “View”', [324, 651]);
  b += flow([[L, 880], [222, 880]], 'species profile (map page)', [324, 866]);
  b += flow([[220, 1240], [L - 2, 1240]], 'group and region choice,\nclicked card', [324, 1212]);
  b += flow([[L, 1300], [222, 1300]], 'species cards and\ndetail dialog', [324, 1326]);
  // Down the middle
  b += flow([[X, 210], [X, 328]], 'coordinates +\nplace name', [480, 269]);
  b += flow([[X, 450], [X, 568]], 'sightings (JSON)', [480, 520]);
  b += flow([[X, 690], [X, 798]], 'selected sighting\n+ species key', [475, 744]);
  b += flow([[470, 1208], [470, 962]], 'species keys', [400, 1085]);
  b += flow([[540, 962], [540, 1208]], 'species\ndetails', [592, 1150]);
  // Right: external services
  b += flow([[R, 130], [1078, 130]], 'place name', [885, 116]);
  b += flow([[1080, 170], [R + 2, 170]], 'lat/lng', [885, 184]);
  b += flow([[R, 370], [1078, 370]], 'location, radius, taxon keys,\ndates, limit', [885, 344]);
  b += flow([[1080, 410], [R + 2, 410]], 'occurrence records', [885, 424]);
  b += flow([[1080, 590], [R + 2, 590]], 'map tiles', [885, 576]);
  b += flow([[1080, 675], [R + 2, 675]], 'photos', [885, 661]);
  b += flow([[R, 815], [1078, 815]], 'species key', [885, 801]);
  b += flow([[1080, 850], [R + 2, 850]], 'taxonomy, photo link', [885, 864]);
  b += flow([[R, 905], [1078, 905]], 'scientific name', [885, 891]);
  b += flow([[1080, 945], [R + 2, 945]], 'summary, photo', [885, 959]);
  b += flow([[R, 1240], [1078, 1240]], 'group taxon keys, country;\nspecies key (facts)', [885, 1212]);
  b += flow([[1080, 1300], [R + 2, 1300]], 'most-recorded species, counts,\nIUCN status, top countries', [885, 1326]);
  // Data stores
  b += flow([[760, 505], [640, 505], [640, 452]], 'sample records', [700, 491]);
  b += flow([[680, 962], [680, 1068], [798, 1068]], 'new species row', [740, 1054]);
  b += flow([[800, 1094], [640, 1094], [640, 962]], 'cached species', [740, 1110]);

  b += dfdProc(X, 150, PW, 120, '1.0', 'Resolve\nLocation', 'app.js · geocode.php');
  b += dfdProc(X, 390, PW, 120, '2.0', 'Retrieve\nSightings', 'sightings.php · gbif.php');
  b += dfdProc(X, 630, PW, 120, '3.0', 'Display Map\nand Sightings', 'app.js · Leaflet.js');
  b += dfdProc(X, 880, PW, 160, '4.0', 'Get Species\nDetails', 'species.php · wikipedia.php');
  b += dfdProc(X, 1270, PW, 120, '5.0', 'Browse\nEncyclopedia', 'encyclopedia.js · .php');
  b += dfdStore(760, 505, 260, 'D2', 'Sample Dataset', 'gbif.php · used if GBIF is down');
  b += dfdStore(800, 1081, 260, 'D1', 'Species Cache', 'MySQL · species_cache');
  b += dfdExt(40, 55, 220, 140, 'Device\nGeolocation');
  b += dfdExt(40, 165, 220, 1340, 'User', '(no login)');
  b += dfdExt(1080, 105, 1260, 195, 'Nominatim', 'geocoding API');
  b += dfdExt(1080, 345, 1260, 435, 'GBIF\nOccurrence API');
  b += dfdExt(1080, 558, 1260, 622, 'Map Tile Services');
  b += dfdExt(1080, 643, 1260, 707, 'Photo Hosts');
  b += dfdExt(1080, 790, 1260, 870, 'GBIF\nSpecies API');
  b += dfdExt(1080, 890, 1260, 970, 'Wikipedia', 'REST API');
  b += dfdExt(1080, 1215, 1260, 1325, 'GBIF API', 'occurrence facets,\nIUCN Red List');
  b += dfdLegend(790, 1365);
  return svg(W, H, b);
}

/* ------------------------------------------------------------------ */
/* System Design - UI wireframes (grey boxes, numbered callouts)        */
/* ------------------------------------------------------------------ */
const WF = { fill: '#F3F4F6', box: '#E5E7EB', line: '#9CA3AF', dark: '#6B7280', text: '#374151' };
const wbox = (x0, y0, x1, y1, o = {}) => rectXY(x0, y0, x1, y1, { fill: o.fill || '#fff', stroke: o.stroke || WF.line, sw: o.sw || 1.4, rx: o.rx ?? 4, dash: o.dash });
const wtxt = (x, y, t, o = {}) => lines(x, y, [{ t, s: o.s || 13, w: o.w || 'normal', c: o.c || WF.text, i: o.i }], o.a || 'start');
// Image placeholder: box with a cross
const wimg = (x0, y0, x1, y1) => wbox(x0, y0, x1, y1, { fill: WF.box }) +
  `<path d="M${x0},${y0} L${x1},${y1} M${x1},${y0} L${x0},${y1}" stroke="${WF.line}" stroke-width="1"/>`;
const wbtn = (x0, y0, x1, y1, t, dark) => wbox(x0, y0, x1, y1, { fill: dark ? WF.dark : '#fff', stroke: WF.dark, rx: 5 }) +
  wtxt((x0 + x1) / 2, (y0 + y1) / 2, t, { a: 'middle', s: 12.5, w: 'bold', c: dark ? '#fff' : WF.text });
const wbar = (x, y, w, h = 8) => `<rect x="${x}" y="${y - h / 2}" width="${w}" height="${h}" rx="${h / 2}" fill="${WF.box}"/>`;
// Numbered callout (matches the key table in the System Design document)
const callout = (x, y, n) => `<circle cx="${x}" cy="${y}" r="13" fill="${C.green}"/>` +
  lines(x, y, [{ t: String(n), s: 13.5, w: 'bold', c: '#fff' }]);

// Top bar of both pages: logo, subtitle, and the Map | Encyclopedia | About links
function wfTopbar(W, active) {
  let b = rectXY(0, 0, W, 54, { fill: '#fff', stroke: WF.line, sw: 1, rx: 0 });
  b += wimg(20, 15, 44, 39) + wtxt(54, 27, 'WildTrack', { s: 17, w: 'bold' });
  b += wtxt(160, 27, 'Wildlife Sighting Mapping and Species Distribution Tracker', { s: 12.5, c: WF.dark });
  [['Map', 1010, 1080], ['Encyclopedia', 1090, 1200], ['About', 1210, 1282]].forEach(([t, x0, x1]) => {
    if (t === active) b += rectXY(x0, 13, x1, 41, { fill: WF.box, stroke: 'none', rx: 5 });
    b += wtxt((x0 + x1) / 2, 27, t, { a: 'middle', s: 13, w: t === active ? 'bold' : 'normal' });
  });
  return b;
}

function wfDashboard() {
  const W = 1300, H = 870;
  let b = rectXY(0, 0, W, H, { fill: WF.fill, stroke: 'none', rx: 0 });
  b += wfTopbar(W, 'Map');

  // Sidebar: search settings only (drawn 120 px higher than the coordinates below)
  b += rectXY(0, 54, 280, H, { fill: '#fff', stroke: WF.line, sw: 1, rx: 0 });
  const title = (y, t) => wtxt(18, y, t, { s: 13.5, w: 'bold' });
  b += '<g transform="translate(0,-120)">';
  b += title(200, 'Search Location');
  b += wbox(18, 214, 262, 244) + wtxt(30, 229, 'Enter a place name…', { c: '#9ca3af', i: true });
  b += wbtn(18, 252, 262, 280, 'Locate Me', true);
  b += wtxt(18, 300, 'Quick Locations', { s: 12, c: WF.dark });
  [['Busan', 18, 74], ['Seoul', 80, 134], ['Jeju Island', 140, 216], ['Ulsan', 18, 70], ['Hallasan', 76, 144], ['Tokyo', 150, 204], ['…', 210, 240]]
    .forEach(([t, x0, x1], i) => { const y = i < 3 ? 314 : 344; b += wbox(x0, y, x1 - 4, y + 24, { rx: 12, fill: i ? '#fff' : WF.box }) + wtxt((x0 + x1 - 4) / 2, y + 12, t, { a: 'middle', s: 11.5 }); });
  b += title(396, 'Search Radius');
  ['5', '10', '25', '50', '100'].forEach((t, i) => { const x0 = 18 + i * 47; b += wbox(x0, 410, x0 + 42, 434, { rx: 12, fill: i === 1 ? WF.box : '#fff' }) + wtxt(x0 + 21, 422, `${t} km`, { a: 'middle', s: 11 }); });
  b += title(462, 'Animal Groups');
  ['Mammals', 'Birds', 'Reptiles', 'Amphibians', 'Fish', 'Invertebrates'].forEach((t, i) => {
    const y = 486 + i * 26;
    b += wbox(20, y - 7, 34, y + 7, { rx: 2, fill: WF.dark, stroke: WF.dark }) + `<circle cx="50" cy="${y}" r="6" fill="${WF.line}"/>` + wtxt(64, y, t, { s: 12.5 });
  });
  b += title(658, 'Observation Date');
  b += wbox(18, 672, 128, 700) + wtxt(28, 686, 'From', { c: '#9ca3af', s: 12 }) + wtxt(140, 686, '→', { a: 'middle' }) + wbox(152, 672, 262, 700) + wtxt(162, 686, 'To', { c: '#9ca3af', s: 12 });
  b += wbox(18, 718, 262, 746) + wtxt(30, 732, 'Filters  (Max records: 75)', { s: 12.5 }) + wtxt(250, 732, '▾', { a: 'end' });
  b += '</g>';

  // Map card
  b += wbox(300, 72, 940, 500, { fill: '#fff' });
  b += rectXY(301, 73, 939, 499, { fill: '#EEF0F2', stroke: 'none', rx: 3 });
  for (let k = 0; k < 6; k++) b += `<path d="M301,${120 + k * 70} C450,${90 + k * 70} 620,${160 + k * 70} 939,${110 + k * 70}" fill="none" stroke="#dfe3e7" stroke-width="1.5"/>`;
  b += `<circle cx="610" cy="300" r="140" fill="rgba(107,114,128,0.08)" stroke="${WF.dark}" stroke-width="1.6" stroke-dasharray="7 5"/>`;
  b += wbox(578, 150, 642, 172, { rx: 11 }) + wtxt(610, 161, '10 km', { a: 'middle', s: 11.5, w: 'bold' });
  [[560, 260], [650, 240], [600, 330], [680, 320], [530, 350], [640, 390], [700, 270], [575, 410]].forEach(([x, y]) => {
    b += `<path d="M${x},${y} c-9,-12 -9,-22 0,-22 c9,0 9,10 0,22z" fill="${WF.dark}"/>`;
  });
  b += wbox(316, 86, 520, 114, { rx: 5 }) + rectXY(318, 88, 382, 112, { fill: WF.box, stroke: 'none', rx: 4 });
  ['Street', 'Satellite', 'Topographic'].forEach((t, i) => { b += wtxt([350, 410, 478][i], 100, t, { a: 'middle', s: 12, w: i ? 'normal' : 'bold' }); });
  b += wbox(760, 86, 924, 260) + wtxt(774, 104, 'Animal Groups', { s: 12.5, w: 'bold' });
  ['Mammals', 'Birds', 'Reptiles', 'Amphibians', 'Fish', 'Invertebrates'].forEach((t, i) => { const y = 128 + i * 22; b += `<circle cx="782" cy="${y}" r="6" fill="${WF.line}"/>` + wtxt(796, y, t, { s: 12 }); });
  b += wbox(890, 400, 922, 432) + wtxt(906, 416, '+', { a: 'middle', s: 16, w: 'bold' }) + wbox(890, 432, 922, 464) + wtxt(906, 448, '−', { a: 'middle', s: 16, w: 'bold' });
  b += wbox(890, 468, 922, 492) + wtxt(906, 480, '⌖', { a: 'middle', s: 13 });
  b += wtxt(316, 486, '0 ─── 5 km', { s: 11, c: WF.dark });

  // Recent Sightings table
  b += wbox(300, 516, 940, 852, { fill: '#fff' });
  b += wtxt(318, 540, 'Recent Sightings', { s: 15, w: 'bold' });
  b += wtxt(840, 540, 'Showing 1–10 of 75', { a: 'end', s: 12, c: WF.dark }) + wbtn(850, 528, 878, 552, '‹') + wbtn(884, 528, 912, 552, '›');
  b += rectXY(310, 560, 930, 586, { fill: WF.box, stroke: 'none', rx: 3 });
  const cols = [[324, 'Photo'], [380, 'Species'], [530, 'Group'], [620, 'Date'], [700, 'Location'], [800, 'Coordinates']];
  cols.forEach(([x, t]) => { b += wtxt(x, 573, t, { s: 12, w: 'bold' }); });
  for (let r = 0; r < 6; r++) {
    const y = 610 + r * 40;
    if (r === 0) b += rectXY(310, y - 19, 930, y + 19, { fill: '#F9FAFB', stroke: 'none', rx: 0 });
    b += wimg(324, y - 14, 362, y + 14) + wbar(380, y - 6, 120) + wbar(380, y + 8, 80, 6);
    b += wbox(530, y - 10, 600, y + 10, { rx: 10, fill: WF.box }) + wbar(620, y, 60) + wbar(700, y, 80) + wbar(800, y, 70);
    b += wbtn(880, y - 12, 924, y + 12, 'View');
    b += `<line x1="310" y1="${y + 20}" x2="930" y2="${y + 20}" stroke="${WF.box}"/>`;
  }

  // Species Profile panel
  b += wbox(956, 72, 1288, 852, { fill: '#fff' });
  b += wtxt(974, 98, 'Species Profile', { s: 15, w: 'bold' }) + wtxt(1270, 98, '✕', { a: 'end', s: 14 });
  b += wimg(974, 118, 1270, 300);
  b += wbox(974, 316, 1046, 338, { rx: 11, fill: WF.box }) + wtxt(1010, 327, 'Birds', { a: 'middle', s: 11.5 });
  b += wtxt(974, 362, 'Black-tailed Gull', { s: 17, w: 'bold' }) + wtxt(974, 386, 'Larus crassirostris', { s: 13, i: true, c: WF.dark });
  ['Kingdom', 'Phylum', 'Class', 'Order', 'Family', 'Genus', 'Species'].forEach((t, i) => {
    const y = 420 + i * 30;
    b += `<line x1="974" y1="${y + 15}" x2="1270" y2="${y + 15}" stroke="${WF.box}"/>` + wtxt(974, y, t, { s: 12.5, c: WF.dark }) + wbar(1100, y, 120);
  });
  [['Date Observed', 650], ['Locality', 700], ['Coordinates', 750]].forEach(([t, y]) => {
    b += `<circle cx="986" cy="${y}" r="9" fill="${WF.box}"/>` + wtxt(1004, y - 9, t, { s: 11.5, c: WF.dark }) + wbar(1004, y + 9, 140);
  });
  b += wbtn(974, 790, 1270, 826, 'Explore on GBIF Network ↗', true);

  // Callouts (see key in the document)
  [[996, 27, 1], [268, 109, 2], [268, 209, 3], [268, 302, 4], [268, 350, 5], [268, 566, 6], [266, 612, 7],
    [532, 100, 8], [916, 172, 9], [612, 230, 10], [926, 540, 11], [1274, 300, 12], [1274, 808, 13]]
    .forEach(([x, y, n]) => { b += callout(x, y, n); });
  return svg(FW, H, b);
}

function wfEncyclopedia() {
  const W = 1300, H = 870, FW = 1820;   // W = the page; the detail dialog is drawn beside it
  let b = rectXY(0, 0, FW, H, { fill: '#fff', stroke: 'none', rx: 0 }) + rectXY(0, 0, W, H, { fill: WF.fill, stroke: WF.line, sw: 1, rx: 0 });
  b += wfTopbar(W, 'Encyclopedia');

  // Sidebar: region and classification tree
  b += rectXY(0, 54, 280, H, { fill: '#fff', stroke: WF.line, sw: 1, rx: 0 });
  const title = (y, t) => wtxt(18, y, t, { s: 13.5, w: 'bold' });
  b += title(84, 'Recorded in');
  b += wbox(18, 98, 120, 122, { rx: 12, fill: WF.dark, stroke: WF.dark }) + wtxt(69, 110, 'South Korea', { a: 'middle', s: 11.5, w: 'bold', c: '#fff' });
  b += wbox(128, 98, 216, 122, { rx: 12 }) + wtxt(172, 110, 'Worldwide', { a: 'middle', s: 11.5 });
  const tree = (y, head, note, items) => {
    b += title(y, head) + wtxt(18, y + 20, note, { s: 11.5, c: WF.dark });
    items.forEach((t, i) => {
      const cy = y + 46 + i * 28;
      if (t === 'Mammals') b += rectXY(12, cy - 13, 268, cy + 13, { fill: WF.box, stroke: 'none', rx: 5 });
      b += `<circle cx="34" cy="${cy}" r="10" fill="${WF.box}" stroke="${WF.line}"/>` + wtxt(54, cy, t, { s: 12.5, w: t === 'Mammals' ? 'bold' : 'normal' });
    });
  };
  tree(160, 'Vertebrates', 'Animals with a backbone.', ['Mammals', 'Birds', 'Reptiles', 'Amphibians', 'Fish']);
  tree(360, 'Invertebrates', 'Animals without a backbone.', ['Insects', 'Spiders & relatives', 'Crabs & shrimps', 'Snails & shellfish', 'Segmented worms', 'Jellyfish & corals', 'Starfish & urchins']);

  // Group introduction
  b += wbox(300, 72, 1282, 222, { fill: '#fff' });
  b += wtxt(318, 92, 'Animals › Vertebrates › Mammals', { s: 11.5, c: WF.dark });
  b += `<circle cx="345" cy="132" r="24" fill="${WF.box}" stroke="${WF.line}"/>` + wtxt(384, 124, 'Mammals', { s: 20, w: 'bold' }) + wtxt(384, 146, 'Mammalia', { s: 12, i: true, c: WF.dark });
  b += wbar(318, 178, 700) + wbar(318, 196, 520);
  b += wtxt(318, 212, '196,397 records in South Korea on GBIF. Below: the most-recorded species, most records first.', { s: 11.5, c: WF.dark });

  // Species cards (4 x 2)
  for (let r = 0; r < 2; r++) for (let c = 0; c < 4; c++) {
    const x0 = 300 + c * 249, y0 = 238 + r * 312;
    b += wbox(x0, y0, x0 + 233, y0 + 296, { fill: '#fff' });
    b += wimg(x0, y0, x0 + 233, y0 + 140);
    b += wbar(x0 + 14, y0 + 160, 130, 10) + wbar(x0 + 14, y0 + 180, 90, 7);
    b += wbar(x0 + 14, y0 + 208, 200, 6) + wbar(x0 + 14, y0 + 222, 200, 6) + wbar(x0 + 14, y0 + 236, 150, 6);
    b += wtxt(x0 + 14, y0 + 270, '● 49,657 records', { s: 11.5, w: 'bold', c: WF.dark });
  }

  // Detail dialog: opens over the page when a card is clicked (drawn beside it here)
  const dx0 = 1350, dy0 = 100, dx1 = 1790, dy1 = 730;
  b += wtxt((dx0 + dx1) / 2, 72, 'Species detail dialog (opens when a card is clicked)', { a: 'middle', s: 13, w: 'bold', c: WF.dark });
  b += `<path d="M1240,390 C1290,390 1300,390 ${dx0 - 4},390" fill="none" stroke="${WF.dark}" stroke-width="1.5" stroke-dasharray="6 4" marker-end="url(#arrow)"/>`;
  b += rectXY(dx0 + 6, dy0 + 6, dx1 + 6, dy1 + 6, { fill: 'rgba(0,0,0,0.12)', stroke: 'none', rx: 8 });
  b += wbox(dx0, dy0, dx1, dy1, { fill: '#fff', rx: 8 });
  b += wimg(dx0, dy0, dx1, dy0 + 220) + `<circle cx="${dx1 - 24}" cy="${dy0 + 24}" r="14" fill="#fff" stroke="${WF.line}"/>` + wtxt(dx1 - 24, dy0 + 24, '✕', { a: 'middle', s: 12 });
  b += wtxt(dx0 + 22, dy0 + 252, 'Chinese Water Deer', { s: 19, w: 'bold' }) + wtxt(dx0 + 22, dy0 + 276, 'Hydropotes inermis Swinhoe, 1870', { s: 12, i: true, c: WF.dark });
  b += wbox(dx0 + 22, dy0 + 292, dx0 + 112, dy0 + 314, { rx: 11, fill: WF.dark, stroke: WF.dark }) + wtxt(dx0 + 67, dy0 + 303, 'Vulnerable', { a: 'middle', s: 11, w: 'bold', c: '#fff' });
  b += wbox(dx0 + 120, dy0 + 292, dx0 + 290, dy0 + 314, { rx: 11, fill: WF.box }) + wtxt(dx0 + 205, dy0 + 303, '52,860 records worldwide', { a: 'middle', s: 11 });
  [338, 354, 370, 386].forEach((y, i) => { b += wbar(dx0 + 22, dy0 + y, i === 3 ? 260 : 396, 7); });
  b += wtxt(dx0 + 22, dy0 + 420, 'WHERE IT IS RECORDED MOST', { s: 11, w: 'bold', c: WF.dark });
  [['South Korea', 110], ['United Kingdom', 130], ['China', 70], ['Russia', 70]].forEach(([t, w], i, arr) => {
    const x = dx0 + 22 + arr.slice(0, i).reduce((a, [, ww]) => a + ww + 8, 0);
    b += wbox(x, dy0 + 434, x + w, dy0 + 456, { rx: 11 }) + wtxt(x + w / 2, dy0 + 445, t, { a: 'middle', s: 11 });
  });
  b += wtxt(dx0 + 22, dy0 + 490, 'CLASSIFICATION', { s: 11, w: 'bold', c: WF.dark });
  b += wtxt(dx0 + 22, dy0 + 512, 'Animalia › Chordata › Mammalia › Artiodactyla › Cervidae › …', { s: 12 });
  b += wbtn(dx0 + 22, dy0 + 548, dx0 + 232, dy0 + 584, 'Read more on Wikipedia', true) + wbtn(dx0 + 244, dy0 + 548, dx0 + 420, dy0 + 584, 'Explore on GBIF ↗');

  // Callouts (see key in the document)
  [[1088, 27, 1], [234, 110, 2], [268, 260, 3], [268, 500, 4], [1268, 92, 5], [944, 212, 6], [530, 238, 7],
    [dx0 - 14, dy0 + 260, 8], [dx0 + 306, dy0 + 303, 9], [dx0 - 14, dy0 + 445, 10], [dx0 - 14, dy0 + 512, 11],
    [dx0 + 210, dy0 + 600, 12], [dx0 + 432, dy0 + 566, 13]]
    .forEach(([x, y, n]) => { b += callout(x, y, n); });
  return svg(FW, H, b);
}

/* ------------------------------------------------------------------ */
// Set CHROME_PATH if Chrome is installed somewhere else
const CHROME = process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
function render(name, svgStr) {
  const [, w, h] = svgStr.match(/width="(\d+)" height="(\d+)"/);
  fs.writeFileSync(path.join(OUT, `${name}.svg`), svgStr);
  const html = path.join(OUT, `${name}.html`);
  fs.writeFileSync(html, `<!doctype html><html><head><meta charset="utf-8"><style>html,body{margin:0;padding:0;background:#fff;overflow:hidden}svg{display:block}</style></head><body>${svgStr}</body></html>`);
  const png = path.join(OUT, `${name}.png`);
  execFileSync(CHROME, ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--force-device-scale-factor=2',
    `--window-size=${w},${h}`, `--screenshot=${png}`, 'file:///' + html.replace(/\\/g, '/')], { stdio: 'pipe', timeout: 60000 });
  const buf = fs.readFileSync(png);
  console.log(name, 'svg', w, 'x', h, '-> png', buf.readUInt32BE(16), 'x', buf.readUInt32BE(20), Math.round(buf.length / 1024) + 'KB');
}

const only = process.argv[2];
const figs = {
  // Requirements Analysis v1.1
  usecase: useCaseDiagram, architecture: () => architecture(), flow_search: flowSearch, flow_species: flowSpecies,
  // System Design
  architecture_design: architectureDesign, conceptual: conceptualSchema, erd, dfd_context: dfdContext, dfd_level1: dfdLevel1,
  wf_dashboard: wfDashboard, wf_encyclopedia: wfEncyclopedia,
};
for (const [k, f] of Object.entries(figs)) if (!only || only === k) render(k, f());
