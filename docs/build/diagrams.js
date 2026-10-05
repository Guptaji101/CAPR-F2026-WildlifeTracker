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
const figs = { usecase: useCaseDiagram, architecture, flow_search: flowSearch, flow_species: flowSpecies };
for (const [k, f] of Object.entries(figs)) if (!only || only === k) render(k, f());
