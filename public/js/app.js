/**
 * Wildlife Sighting Mapping and Species Distribution Tracker
 * Dashboard logic: search, filters, map, sightings table and species profile
 * CAPR-F2026 Capstone Project
 */

// =============================================================================
// Application State & Configuration
// =============================================================================
const state = {
    currentLat: 35.1796,  // Default: Busan
    currentLng: 129.0756,
    currentLocationName: 'Busan, South Korea',
    radiusKm: 10,
    groups: new Set(),    // selected animal groups (filled from GROUPS below)
    limit: 75,
    fromDate: '',
    toDate: '',
    sightings: [],
    markers: [],
    page: 0,
    pageSize: 10,
    selected: null,       // index into state.sightings
    radiusCircle: null,
    radiusLabel: null,
    speciesCache: new Map(),
    searchId: 0,          // number of the newest sightings search (older answers are ignored)
    placeId: 0,           // the same for place searches
    animalId: 0,          // and for animal searches
};

// Animal groups: filter keys (GBIF taxon keys), map colour and icon.
// GBIF splits reptiles into Squamata, Testudines and Crocodylia, so all three are used.
const GROUPS = {
    mammals:       { label: 'Mammals',       color: '#f28c1b', bg: '#fdebd3', text: '#b45309', icon: 'fa-paw',  keys: [359] },
    birds:         { label: 'Birds',         color: '#1d7fe0', bg: '#dbeafe', text: '#1d4ed8', icon: 'fa-dove', keys: [212] },
    reptiles:      { label: 'Reptiles',      color: '#43a047', bg: '#dcfce7', text: '#15803d', icon: 'fa-dragon', keys: [11592253, 11418114, 11493978] },
    amphibians:    { label: 'Amphibians',    color: '#8b3fd9', bg: '#ede4fb', text: '#6d28d9', icon: 'fa-frog', keys: [131] },
    fish:          { label: 'Fish',          color: '#17a2c6', bg: '#d7f1f8', text: '#0e7490', icon: 'fa-fish', keys: [204, 121] },
    invertebrates: { label: 'Invertebrates', color: '#e03131', bg: '#fde2e2', text: '#b91c1c', icon: 'fa-bug', keys: [54, 52, 42, 43, 50] },
};
Object.keys(GROUPS).forEach(g => state.groups.add(g));

// The last search (place and radius) is remembered for this browser tab, so coming back to the
// Map page from the Encyclopedia or the header shows the same place instead of starting at Busan.
const SAVED_SEARCH = 'wildtrack.lastSearch';
function saveSearch() {
    try {
        sessionStorage.setItem(SAVED_SEARCH, JSON.stringify({
            lat: state.currentLat, lng: state.currentLng, name: state.currentLocationName,
            radiusKm: state.radiusKm, input: $('location-input').value,
        }));
    } catch { /* storage blocked (for example a private window): the page then starts at Busan */ }
}
const savedSearch = (() => {
    try { return JSON.parse(sessionStorage.getItem(SAVED_SEARCH)); } catch { return null; }
})();
if (savedSearch && Number.isFinite(savedSearch.lat) && Number.isFinite(savedSearch.lng)) {
    state.currentLat = savedSearch.lat;
    state.currentLng = savedSearch.lng;
    state.currentLocationName = savedSearch.name || '';
    state.radiusKm = savedSearch.radiusKm || 10;
}

// Optional filter on one species, from the Encyclopedia: index.php?species=2486736&name=Coal%20Tit
// (a GBIF species key is also a taxon key, so sightings.php can filter on it like on a group)
state.speciesFilter = null;
function showSpeciesFilter() {
    $('species-filter').hidden = !state.speciesFilter;
    if (state.speciesFilter) setText('species-filter-name', state.speciesFilter.name);
}
function clearSpeciesFilter() {
    state.speciesFilter = null;
    showSpeciesFilter();
    $('animal-input').value = '';
    history.replaceState(null, '', location.pathname);   // remove ?species=… from the address
}

const REPTILE_CLASSES = ['reptilia', 'squamata', 'testudines', 'crocodylia'];
const FISH_CLASSES = ['actinopterygii', 'elasmobranchii', 'chondrichthyes', 'sarcopterygii', 'holocephali', 'petromyzonti', 'myxini'];

// Which of the six groups a sighting belongs to, from its class (and phylum)
function groupOf(record) {
    const cls = (record.taxonGroup || '').toLowerCase();
    if (cls === 'aves') return 'birds';
    if (cls === 'mammalia') return 'mammals';
    if (REPTILE_CLASSES.includes(cls)) return 'reptiles';
    if (cls === 'amphibia') return 'amphibians';
    if (FISH_CLASSES.includes(cls)) return 'fish';
    return 'invertebrates';
}

// =============================================================================
// Map Setup
// =============================================================================
const baseLayers = {
    map: L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }),
    satellite: L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        maxNativeZoom: 18,
        maxZoom: 19,
        attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
    }),
    topo: L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}', {
        maxNativeZoom: 13,
        maxZoom: 19,
        attribution: 'Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ, TomTom, USGS, NPS, NRCAN, Ordnance Survey'
    }),
};
let activeLayer = baseLayers.map;

const map = L.map('map', {
    center: [state.currentLat, state.currentLng],
    zoom: 11,
    maxZoom: 19,
    zoomControl: false,
    layers: [activeLayer]
});
L.control.scale({ position: 'bottomright', imperial: false }).addTo(map);

// =============================================================================
// Utility Helpers
// =============================================================================
function $(id) { return document.getElementById(id); }

function setText(id, text) {
    const el = $(id);
    if (el) el.innerText = text;
}

function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function showToast(message, type = 'info') {
    const container = $('toast-container');
    if (!container) return;

    // The same message twice (for example two quick clicks) is shown once; at most 3 at a time
    if ([...container.children].some(t => t.dataset.message === message)) return;
    while (container.children.length >= 3) container.firstElementChild.remove();

    const toast = document.createElement('div');
    toast.className = `toast ${type === 'error' ? 'error' : ''}`;
    toast.dataset.message = message;
    toast.innerHTML = `
        <i class="fa-solid ${type === 'error' ? 'fa-circle-exclamation' : 'fa-circle-check'}"></i>
        <span>${escapeHtml(message)}</span>
    `;
    container.appendChild(toast);
    // Visible for 5 seconds at the top center, then fades out
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transition = 'opacity 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 5000);
}

async function safeJsonFetch(url) {
    const res = await fetch(url);
    const text = await res.text();
    let data;
    try {
        data = JSON.parse(text);
    } catch (e) {
        if (!res.ok) throw new Error(`HTTP ${res.status}: ${text.slice(0, 80)}`);
        throw e;
    }
    // Show the server's own message ("Place not found in South Korea …"), not the raw JSON
    if (!res.ok && data.error) throw new Error(data.error);
    return data;
}

let slowTimer = null;

function setLoading(isLoading, statusText = '') {
    const loader = $('map-loader');
    if (loader) {
        loader.classList.toggle('active', isLoading);
        if (statusText) loader.querySelector('.loader-text').innerText = statusText;
    }
    const locateBtn = $('locate-btn');
    if (locateBtn) locateBtn.disabled = isLoading;

    // GBIF sometimes needs 10 s or more; after 5 s, tell the user it is still working
    clearTimeout(slowTimer);
    if (isLoading && loader) {
        slowTimer = setTimeout(() => {
            loader.querySelector('.loader-text').innerText = 'GBIF is slow right now — still loading…';
        }, 5000);
    }
}

// Name to show for a sighting: the English name, else the species, else the genus + "sp."
// ("Hypoponera Santschi, 1938" is a genus with its author, so it becomes "Hypoponera sp.")
function plainName(r) {
    if (r.commonName) return r.commonName;
    if (r.species) return r.species;
    const genus = (r.scientificName || '').split(' ')[0];
    return genus ? `${genus} sp.` : 'Unknown animal';
}

// Encyclopedia group of a sighting. The Encyclopedia splits Invertebrates into smaller groups;
// null if the animal is in none of them (for example a centipede).
const ENCY_INVERTEBRATES = {
    insecta: 'insects', arachnida: 'arachnids', malacostraca: 'crustaceans', mollusca: 'molluscs',
    annelida: 'worms', cnidaria: 'cnidarians', echinodermata: 'echinoderms',
};
function encyclopediaGroup(r) {
    const group = groupOf(r);
    if (group !== 'invertebrates') return group;
    return ENCY_INVERTEBRATES[(r.taxonGroup || '').toLowerCase()] || ENCY_INVERTEBRATES[(r.phylum || '').toLowerCase()] || null;
}

// Phones: the sidebar is folded away behind the "Search & filters" button
const isPhoneLayout = () => window.matchMedia('(max-width: 820px)').matches;
function setFiltersOpen(open) {
    $('layout').classList.toggle('filters-open', open);
    $('filters-toggle').setAttribute('aria-expanded', open);
}
function updateFiltersSummary() {
    // The name the user typed or tapped ("Seoul"), not the geocoder's official name ("서울특별시")
    const typed = $('location-input').value.trim();
    const place = (typed || state.currentLocationName || '').split(',')[0].slice(0, 22);
    setText('filters-summary', `${place} · ${state.radiusKm} km`);
}

// iNaturalist photos come as "original" size; ask for a smaller version
function sizedImage(url, size) {
    if (!url) return null;
    return url.includes('inaturalist-open-data') ? url.replace(/\/original\./, `/${size}.`) : url;
}

function formatDate(eventDate) {
    return eventDate ? eventDate.split('T')[0] : 'N/A';
}

function formatCoords(record) {
    return record.lat && record.lng ? `${record.lat.toFixed(4)}, ${record.lng.toFixed(4)}` : 'N/A';
}

function groupIconHtml(groupKey, size = 18) {
    const g = GROUPS[groupKey];
    return `<span class="group-icon" style="background:${g.color};width:${size}px;height:${size}px"><i class="fa-solid ${g.icon}"></i></span>`;
}

// =============================================================================
// Search & Geolocation
// =============================================================================
async function handleSearch() {
    const input = $('location-input');
    const query = input ? input.value.trim() : '';
    if (!query) {
        showToast('Please enter a location or city name', 'error');
        return;
    }

    setLoading(true, `Geocoding location "${query}"...`);
    const placeId = ++state.placeId;   // a newer place search makes this one out of date

    try {
        const geo = await safeJsonFetch(`api/geocode.php?q=${encodeURIComponent(query)}`);
        if (placeId !== state.placeId) return;   // the user already searched another place
        if (geo.error) throw new Error(geo.error);

        state.currentLat = geo.lat;
        state.currentLng = geo.lng;
        state.currentLocationName = geo.displayName || query;

        map.flyTo([state.currentLat, state.currentLng], 12, { duration: 1.2 });
        updateRadiusCircle();
        // Say which place was found: inside Korea, "Tokyo" finds a shop called "Tokyo Milk Cheese Factory"
        showToast(`Found: ${state.currentLocationName.replace(/, South Korea$/, '')}`);
        if (isPhoneLayout()) setFiltersOpen(false);

        await loadSightings();
    } catch (err) {
        if (placeId !== state.placeId) return;
        console.error(err);
        showToast(`Search error: ${err.message}`, 'error');
        setLoading(false);
    }
}

function quickSelect(place, elem) {
    document.querySelectorAll('.chip[data-place]').forEach(btn => btn.classList.remove('active'));
    if (elem) elem.classList.add('active');

    const input = $('location-input');
    if (input) input.value = place;
    handleSearch();
}

function useCurrentLocation() {
    if (!navigator.geolocation) {
        showToast('Geolocation is not supported by your browser', 'error');
        return;
    }

    setLoading(true, 'Requesting your device GPS location...');
    navigator.geolocation.getCurrentPosition(
        async (position) => {
            state.currentLat = position.coords.latitude;
            state.currentLng = position.coords.longitude;
            state.currentLocationName = 'My Location';

            const input = $('location-input');
            if (input) input.value = 'Current Location (GPS)';
            document.querySelectorAll('.chip[data-place]').forEach(btn => btn.classList.remove('active'));

            map.flyTo([state.currentLat, state.currentLng], 13, { duration: 1.2 });
            updateRadiusCircle();
            showLiveLocation(position);
            followLiveLocation();
            showToast('GPS coordinates acquired! Fetching local fauna...');
            if (isPhoneLayout()) setFiltersOpen(false);

            await loadSightings();
        },
        (err) => {
            console.warn(err);
            setLoading(false);
            showToast('Could not retrieve current location: ' + err.message, 'error');
        },
        { timeout: 10000, enableHighAccuracy: true }
    );
}

// --- Live location ("You are here") -------------------------------------------------------
// After "Locate Me", a blue dot shows where the user is right now, with a light circle for the
// GPS accuracy. The browser reports every new position (watchPosition), so the dot moves with
// the user. Moving does not start a new search: the sightings stay around the place searched,
// and the user clicks "Locate Me" again to search around the new position.
const live = { dot: null, accuracy: null, watchId: null };

function showLiveLocation(position) {
    const { latitude, longitude, accuracy } = position.coords;
    const latLng = [latitude, longitude];
    const tip = `You are here (accurate to about ${Math.round(accuracy)} m)`;
    if (!live.dot) {
        live.accuracy = L.circle(latLng, { radius: accuracy, color: '#2563eb', weight: 1, fillColor: '#2563eb', fillOpacity: 0.12, interactive: false }).addTo(map);
        live.dot = L.marker(latLng, {
            icon: L.divIcon({ className: '', html: '<span class="live-dot"></span>', iconSize: [18, 18], iconAnchor: [9, 9] }),
            zIndexOffset: 1000,   // above the sighting pins
            keyboard: false,
        }).addTo(map).bindTooltip(tip, { direction: 'top', offset: [0, -10] });
    } else {
        live.dot.setLatLng(latLng).setTooltipContent(tip);
        live.accuracy.setLatLng(latLng).setRadius(accuracy);
    }
}

function followLiveLocation() {
    if (live.watchId !== null) return;   // already following
    live.watchId = navigator.geolocation.watchPosition(showLiveLocation,
        (err) => console.warn('Live location stopped:', err.message),
        { enableHighAccuracy: true, maximumAge: 5000 });
}

// =============================================================================
// Find an Animal: typed name -> GBIF species key (api/animal.php) -> species filter
// =============================================================================
async function findAnimal() {
    const query = $('animal-input').value.trim();
    hideSuggestions();
    if (!query) {
        showToast('Type an animal name, for example "water deer" or "Pica pica"', 'error');
        return;
    }

    // An exact name from the list of Korean animals needs no server request
    const known = (animalList || []).find(a => [a.n, a.s].some(n => n && n.toLowerCase() === query.toLowerCase()));
    if (known) return showAnimal(listAnimal(known));

    setLoading(true, `Looking up "${query}"...`);
    const animalId = ++state.animalId;   // a newer animal search makes this one out of date
    try {
        const data = await safeJsonFetch(`api/animal.php?q=${encodeURIComponent(query)}`);
        if (animalId !== state.animalId) return;   // the user already chose another animal
        if (data.found) {
            showAnimal(data.found);
        } else {
            // Several animals have this name: let the user pick one
            setLoading(false);
            showSuggestions(data.suggestions || []);
        }
    } catch (err) {
        if (animalId !== state.animalId) return;
        console.error(err);
        showToast(err.message, 'error');
        setLoading(false);
    }
}

// Filter the map on one species (the same filter the Encyclopedia's "See … on the map" uses)
function showAnimal(animal) {
    state.animalId++;   // an animal lookup still running is now out of date
    state.speciesFilter = { key: animal.key, name: animal.name };
    showSpeciesFilter();
    $('animal-input').value = animal.name;
    hideSuggestions();
    // The address keeps the filter, so reloading the page or sharing the link shows the same animal
    history.replaceState(null, '', `?species=${animal.key}&name=${encodeURIComponent(animal.name)}`);
    if (isPhoneLayout()) setFiltersOpen(false);
    loadSightings();
}

// "Did you mean…" list from the server, when a typed name fits several animals
function showSuggestions(list) {
    renderSuggestions('Did you mean…', list.map(a => ({
        key: a.key, name: a.name, sci: a.scientificName, records: a.koreaRecords,
    })));
}

// --- Suggestions while typing -------------------------------------------------------------
// data/korea-animals.json lists the 2000 animals with the most GBIF records in South Korea
// (made by tools/build-animal-list.php). It is loaded once, the first time the box is used,
// and searched in the browser, so suggestions appear instantly without asking the server.
let animalList = null;
let animalListLoading = null;
function loadAnimalList() {
    // One download, shared by every caller (also when the user types before it has arrived)
    animalListLoading ??= fetch('data/korea-animals.json')
        .then(res => res.json())
        .then(list => { animalList = list; })
        .catch(() => { animalList = []; });   // no list: the box still works with Enter
    return animalListLoading;
}
// An entry of the list in the shape showAnimal() expects
const listAnimal = a => ({ key: a.k, name: a.n || a.s });

// The 6 best-known animals (most records in South Korea; the list is already in that order)
// whose English or scientific name has a word starting with the typed text: "deer" finds
// "Chinese Water Deer", "mag" finds "Oriental Magpie", but "pica" does not find "apicalis".
function matchAnimals(text) {
    const q = text.trim().toLowerCase();
    if (q.length < 2 || !animalList) return [];
    const wordStart = new RegExp(`(^|[\\s\\-'/(])${q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`);
    return animalList
        .filter(a => [a.n, a.s].some(n => n && wordStart.test(n.toLowerCase())))
        .slice(0, 6)
        .map(a => ({ ...listAnimal(a), sci: a.n ? a.s : '', records: a.r, cls: a.c }));
}

// Typed text in bold inside a name, as in a search engine's suggestions
function boldMatch(name, text) {
    const i = name.toLowerCase().indexOf(text.trim().toLowerCase());
    if (i < 0 || !text.trim()) return escapeHtml(name);
    const end = i + text.trim().length;
    return `${escapeHtml(name.slice(0, i))}<b>${escapeHtml(name.slice(i, end))}</b>${escapeHtml(name.slice(end))}`;
}

// Draws a list of animals under the box. Every entry is a button: click (or arrow keys + Enter)
// to show that animal. Used both for suggestions while typing and for "Did you mean…".
function renderSuggestions(title, items, typed = '') {
    const box = $('animal-suggest');
    if (!items.length) return hideSuggestions();
    box.innerHTML = (title ? `<div class="suggest-title">${title}</div>` : '') + items.map((a, i) => {
        // Group icon from the class; some fish only have "Chordata" in GBIF, so they get a plain paw
        const icon = a.cls && a.cls !== 'Chordata' ? groupIconHtml(groupOf({ taxonGroup: a.cls }), 16) : '<i class="fa-solid fa-paw"></i>';
        const where = a.records ? `${a.records.toLocaleString()} records in Korea` : 'not recorded in Korea';
        return `<button type="button" role="option" id="suggest-${i}" data-key="${a.key}" data-name="${escapeHtml(a.name)}">
            ${icon}
            <span class="suggest-text">
                <span class="suggest-main">${boldMatch(a.name, typed)}</span>
                <span class="suggest-sub">${a.sci ? `<i>${boldMatch(a.sci, typed)}</i> · ` : ''}${where}</span>
            </span>
        </button>`;
    }).join('');
    box.hidden = false;
    $('animal-input').setAttribute('aria-expanded', 'true');
}

function hideSuggestions() {
    $('animal-suggest').hidden = true;
    $('animal-input').setAttribute('aria-expanded', 'false');
    $('animal-input').removeAttribute('aria-activedescendant');
}

// Arrow keys move through the suggestions, Enter picks the highlighted one (or searches the
// typed name), Esc closes the list
function onAnimalKey(e) {
    const options = [...$('animal-suggest').querySelectorAll('button')];
    const open = !$('animal-suggest').hidden && options.length;
    const current = options.findIndex(b => b.classList.contains('active'));
    if (open && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
        e.preventDefault();
        const next = (current + (e.key === 'ArrowDown' ? 1 : -1) + options.length) % options.length;
        options.forEach((b, i) => b.classList.toggle('active', i === next));
        $('animal-input').setAttribute('aria-activedescendant', options[next].id);
    } else if (e.key === 'Enter') {
        e.preventDefault();
        if (open && current >= 0) options[current].click();
        else findAnimal();
    } else if (e.key === 'Escape') {
        hideSuggestions();
    }
}

// =============================================================================
// Map Overlays: radius circle, label and base layers
// =============================================================================
function updateRadiusCircle() {
    if (state.radiusCircle) map.removeLayer(state.radiusCircle);
    if (state.radiusLabel) map.removeLayer(state.radiusLabel);

    state.radiusCircle = L.circle([state.currentLat, state.currentLng], {
        radius: state.radiusKm * 1000,
        color: '#1d6fd8',
        fillColor: '#1d6fd8',
        fillOpacity: 0.06,
        weight: 2.5,
    }).addTo(map);

    // Label sits on the top edge of the circle
    const labelLat = state.currentLat + state.radiusKm / 111.32;
    state.radiusLabel = L.marker([labelLat, state.currentLng], {
        icon: L.divIcon({ className: '', html: `<span class="radius-label">${state.radiusKm} km</span>`, iconSize: [0, 0] }),
        interactive: false,
    }).addTo(map);
}

function switchBaseLayer(name, button) {
    const layer = baseLayers[name];
    if (!layer || layer === activeLayer) return;
    map.removeLayer(activeLayer);
    layer.addTo(map);
    activeLayer = layer;
    document.querySelectorAll('.basemap-tabs button').forEach(b => b.classList.toggle('active', b === button));
}

function recenterMap() {
    map.flyTo([state.currentLat, state.currentLng], 12, { duration: 0.8 });
}

// =============================================================================
// Sightings: fetching and rendering
// =============================================================================
async function loadSightings() {
    if (state.currentLat === null || state.currentLng === null) return;

    if (state.fromDate && state.toDate && state.fromDate > state.toDate) {
        setLoading(false);
        showToast('The "From" date must be on or before the "To" date', 'error');
        return;
    }

    if (state.groups.size === 0) {
        setLoading(false);
        state.sightings = [];
        renderAll();
        showToast('Select at least one animal group', 'error');
        return;
    }

    updateFiltersSummary();
    saveSearch();
    let url = `api/sightings.php?lat=${state.currentLat}&lng=${state.currentLng}&radius=${state.radiusKm}&limit=${state.limit}`;
    // One species (from the Encyclopedia), or the ticked groups. With every group ticked no taxon
    // filter is sent, so all animals are returned.
    if (state.speciesFilter) {
        url += `&taxa=${state.speciesFilter.key}`;
    } else if (state.groups.size < Object.keys(GROUPS).length) {
        const keys = [...state.groups].flatMap(g => GROUPS[g].keys);
        url += `&taxa=${keys.join(',')}`;
    }
    if (state.fromDate) url += `&from=${encodeURIComponent(state.fromDate)}`;
    if (state.toDate)   url += `&to=${encodeURIComponent(state.toDate)}`;

    // Each search gets a number. If the user starts another search (another chip, radius or
    // group) before this one answers, this answer is ignored when it arrives, so an older
    // result can never replace a newer one on the map or in the table.
    const searchId = ++state.searchId;
    const cached = sightingsCache.get(url);
    if (!cached) setLoading(true, 'Querying GBIF biodiversity records...');

    try {
        // A search already made in this tab is shown at once from memory
        const data = cached || await safeJsonFetch(url);
        if (searchId !== state.searchId) return;   // a newer search has started
        if (!data.fallback) rememberSightings(url, data);
        state.sightings = (data.results || []).map(r => ({ ...r }));   // a fresh copy each time
        state.page = 0;
        const place = ($('location-input').value || state.currentLocationName || 'this place').split(',')[0];
        const noAnimal = `No ${state.speciesFilter?.name} sightings within ${state.radiusKm} km of ${place}. Try a larger radius, or show all animals.`;
        renderAll(state.speciesFilter ? noAnimal : undefined);
        // The table is below the map, so a filtered search with no results also shows a message on top
        if (state.speciesFilter && !state.sightings.length && !data.fallback) showToast(noAnimal, 'error');

        if (data.fallback) {
            // NFR-04: GBIF was unreachable, so the server sent its built-in sample records
            showToast('GBIF is unreachable — showing sample data (filters not applied)', 'error');
        }
        if (state.sightings.length) selectSighting(0, { fly: false });
    } catch (err) {
        if (searchId !== state.searchId) return;
        console.error(err);
        showToast(`Failed to load sightings: ${err.message}`, 'error');
        state.sightings = [];
        renderAll(`Could not load wildlife records. ${err.message}`);
    } finally {
        if (searchId === state.searchId) setLoading(false);
    }
}

// Searches made in this browser tab, by address (the newest 20), for instant repeats
const sightingsCache = new Map();
function rememberSightings(url, data) {
    sightingsCache.delete(url);
    sightingsCache.set(url, data);
    if (sightingsCache.size > 20) sightingsCache.delete(sightingsCache.keys().next().value);
}

function renderAll(emptyMessage) {
    state.selected = null;
    clearProfile();
    renderMarkers();
    renderTable(emptyMessage);
}

function renderMarkers() {
    state.markers.forEach(m => map.removeLayer(m));
    state.markers = [];

    state.sightings.forEach((r, index) => {
        if (!r.lat || !r.lng) { state.markers.push(null); return; }

        const g = GROUPS[groupOf(r)];
        const name = plainName(r);
        const marker = L.marker([r.lat, r.lng], {
            icon: L.divIcon({
                className: 'pin-wrap',
                html: `<div class="pin" style="background:${g.color}"><i class="fa-solid ${g.icon}"></i></div>`,
                iconSize: [30, 30],
                iconAnchor: [4, 30],
            })
        }).addTo(map);

        marker.bindTooltip(`<b>${escapeHtml(name)}</b><br><i>${escapeHtml(r.scientificName || '')}</i><br>${g.label} &bull; ${escapeHtml(formatDate(r.eventDate))}`,
            { className: 'pin-tip', direction: 'top', offset: [12, -28] });
        marker.on('click', () => selectSighting(index, { fly: false, reveal: true }));
        state.markers.push(marker);
    });
}

function renderTable(emptyMessage) {
    const body = $('sightings-body');
    const total = state.sightings.length;
    const start = state.page * state.pageSize;
    const end = Math.min(start + state.pageSize, total);

    setText('page-info', total ? `Showing ${start + 1}–${end} of ${total}` : 'Showing 0 of 0');
    $('page-prev').disabled = state.page === 0;
    $('page-next').disabled = end >= total;

    if (!total) {
        body.innerHTML = `<tr class="table-empty"><td colspan="8"><i class="fa-solid fa-paw"></i>
            ${escapeHtml(emptyMessage || 'No fauna records found. Try increasing the radius or searching a different area.')}</td></tr>`;
        return;
    }

    body.innerHTML = state.sightings.slice(start, end).map((r, i) => {
        const index = start + i;
        const groupKey = groupOf(r);
        const g = GROUPS[groupKey];
        const thumb = sizedImage(r.image, 'square');
        const photo = thumb
            ? `<img class="thumb" src="${escapeHtml(thumb)}" alt="${escapeHtml(plainName(r))}" loading="lazy" onerror="this.outerHTML='${escapeHtml(thumbFallback(groupKey))}'">`
            : thumbFallback(groupKey);
        return `
            <tr data-index="${index}" class="${index === state.selected ? 'selected' : ''}">
                <td>${index + 1}</td>
                <td>${photo}</td>
                <td><div class="sp-name">${escapeHtml(plainName(r))}</div>
                    <div class="sp-sci">${escapeHtml(r.species || r.scientificName || '')}</div></td>
                <td><span class="group-badge" style="background:${g.bg};color:${g.text}">${g.label}</span></td>
                <td>${escapeHtml(formatDate(r.eventDate))}</td>
                <td class="loc-cell">${r.locality
                    ? `<span title="${escapeHtml([r.locality, r.country].filter(Boolean).join(', '))}">${escapeHtml(r.locality)}</span>`
                    // No place name recorded: show the country in grey so it isn't mistaken for an exact place
                    : `<span class="loc-none" title="No exact place name was recorded">${escapeHtml(r.country || 'Not specified')}</span>`}</td>
                <td>${escapeHtml(formatCoords(r))}</td>
                <td><button class="btn-view" data-index="${index}">View</button></td>
            </tr>`;
    }).join('');

    fillCommonNames(start, end);
}

// GBIF occurrence records rarely carry an English name, so look them up
// (once per species) for the rows on screen and patch the table in place
function fillCommonNames(start, end) {
    state.sightings.slice(start, end).forEach(async (r, i) => {
        if (r.commonName || !r.speciesKey || r.nameChecked) return;
        r.nameChecked = true;
        const data = await getSpecies(r.speciesKey);
        if (!data || !data.vernacularName) return;
        r.commonName = data.vernacularName;
        // A new search may have replaced the table while this name was loading: then this row
        // now shows another animal and must not get this name
        if (state.sightings[start + i] !== r) return;
        const cell = document.querySelector(`#sightings-body tr[data-index="${start + i}"] .sp-name`);
        if (cell) cell.innerText = r.commonName;
    });
}

async function getSpecies(speciesKey) {
    if (!state.speciesCache.has(speciesKey)) {
        // Cache the promise so parallel callers share one request
        state.speciesCache.set(speciesKey, safeJsonFetch(`api/species.php?speciesKey=${speciesKey}`).catch(() => null));
    }
    return state.speciesCache.get(speciesKey);
}

function thumbFallback(groupKey) {
    const g = GROUPS[groupKey];
    return `<div class="thumb thumb-fallback" style="background:${g.color}"><i class="fa-solid ${g.icon}"></i></div>`;
}

function changePage(delta) {
    const maxPage = Math.max(0, Math.ceil(state.sightings.length / state.pageSize) - 1);
    state.page = Math.min(maxPage, Math.max(0, state.page + delta));
    renderTable();
}

// =============================================================================
// Species Profile
// =============================================================================
function selectSighting(index, { fly = true, reveal = false } = {}) {
    const record = state.sightings[index];
    if (!record) return;

    // Highlight the pin
    if (state.selected !== null && state.markers[state.selected]) {
        state.markers[state.selected].getElement()?.querySelector('.pin')?.classList.remove('selected');
    }
    state.selected = index;
    const marker = state.markers[index];
    if (marker) {
        marker.getElement()?.querySelector('.pin')?.classList.add('selected');
        if (fly) {
            map.flyTo([record.lat, record.lng], 14, { duration: 0.8 });
            marker.openTooltip();
        }
    }

    // Show the row, switching table page if needed
    const page = Math.floor(index / state.pageSize);
    if (page !== state.page) state.page = page;
    renderTable();

    showProfile(record);

    // Below 1200 px the Species Profile is under the table: scroll to it after a click
    if (reveal && window.matchMedia('(max-width: 1200px)').matches) {
        $('profile').scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

function clearProfile() {
    $('profile-empty').hidden = false;
    $('profile-body').hidden = true;
}

async function showProfile(record) {
    const groupKey = groupOf(record);
    const g = GROUPS[groupKey];

    $('profile-empty').hidden = true;
    $('profile-body').hidden = false;

    const badge = $('profile-badge');
    badge.style.background = g.color;
    badge.innerHTML = `<i class="fa-solid ${g.icon}"></i> ${g.label}`;

    setText('profile-name', plainName(record));

    // Link to this species' entry in the Encyclopedia (only for animals identified to species level)
    const encyGroup = encyclopediaGroup(record);
    const encyLink = $('profile-ency');
    encyLink.hidden = !(record.speciesKey && encyGroup);
    if (!encyLink.hidden) encyLink.href = `encyclopedia.php#${encyGroup}/${record.speciesKey}`;
    setText('profile-sci', record.scientificName || 'Unclassified');
    setText('meta-date', formatDate(record.eventDate));
    setText('meta-locality', [record.locality, record.country].filter(Boolean).join(', ') || 'Not specified');
    setText('meta-coords', formatCoords(record));

    renderTaxonomy({ kingdom: 'Animalia', class: record.taxonGroup });
    setPhoto(sizedImage(record.image, 'medium'), 'Searching GBIF media archive...');

    const gbifBtn = $('profile-gbif');
    gbifBtn.href = record.key ? `https://www.gbif.org/occurrence/${record.key}` : 'https://www.gbif.org';

    if (!record.speciesKey) {
        if (!record.image) setPhoto(null, 'No media attached to this occurrence.');
        return;
    }

    const speciesData = await getSpecies(record.speciesKey);
    if (!speciesData) {
        if (state.sightings[state.selected] !== record) return;
        if (!record.image) setPhoto(null, 'Taxonomy details unavailable');
        gbifBtn.href = `https://www.gbif.org/species/${record.speciesKey}`;
        return;
    }

    // The user may have selected another sighting while this request was running
    if (state.sightings[state.selected] !== record) return;

    if (speciesData.vernacularName) setText('profile-name', speciesData.vernacularName);
    if (speciesData.scientificName) setText('profile-sci', speciesData.scientificName);
    renderTaxonomy(speciesData);
    if (!record.image) setPhoto(speciesData.imageUrl, 'No image provided by GBIF');
    gbifBtn.href = speciesData.gbifUrl || `https://www.gbif.org/species/${record.speciesKey}`;
}

function renderTaxonomy(t) {
    // "Alcedo atthis" is shown as "A. atthis", as in field guides
    let species = t.species || '';
    const parts = species.split(' ');
    if (parts.length >= 2) species = `${parts[0][0]}. ${parts.slice(1).join(' ')}`;

    const rows = [
        ['Kingdom', t.kingdom], ['Phylum', t.phylum], ['Class', t.class], ['Order', t.order],
        ['Family', t.family], ['Genus', t.genus, true], ['Species', species, true],
    ];
    $('profile-taxonomy').innerHTML = rows.map(([label, value, italic]) =>
        `<dt>${label}</dt><dd class="${italic && value ? 'italic' : ''}">${escapeHtml(value || '—')}</dd>`).join('');
}

function setPhoto(url, fallbackText) {
    const img = $('profile-img');
    const fallback = $('photo-fallback');
    setText('photo-text', fallbackText);
    if (!url) {
        img.style.display = 'none';
        fallback.style.display = 'flex';
        return;
    }
    img.style.display = 'none';
    fallback.style.display = 'flex';
    img.onload = () => { img.style.display = 'block'; fallback.style.display = 'none'; };
    img.onerror = () => { setText('photo-text', 'Image preview not available'); };
    img.src = url;
}

// =============================================================================
// Sidebar: groups, legend, navigation
// =============================================================================
function buildGroupControls() {
    $('group-list').innerHTML = Object.entries(GROUPS).map(([key, g]) => `
        <label class="group-option">
            <input type="checkbox" value="${key}" checked>
            ${groupIconHtml(key)} ${g.label}
        </label>`).join('');

    $('legend-list').innerHTML = Object.entries(GROUPS).map(([key, g]) =>
        `<div class="legend-item">${groupIconHtml(key, 16)} ${g.label}</div>`).join('');
}


// =============================================================================
// Event Listeners & Initializer
// =============================================================================
document.addEventListener('DOMContentLoaded', () => {
    // Show the remembered search in the sidebar (search box, Quick Location and radius chips)
    if (savedSearch) {
        $('location-input').value = savedSearch.input || '';
        document.querySelectorAll('.chip[data-place]').forEach(c => c.classList.toggle('active', c.dataset.place === savedSearch.input));
        document.querySelectorAll('.chip[data-radius]').forEach(c => c.classList.toggle('active', Number(c.dataset.radius) === state.radiusKm));
    }
    const params = new URLSearchParams(location.search);
    if (Number(params.get('species')) > 0) {
        state.speciesFilter = { key: Number(params.get('species')), name: params.get('name') || 'this species' };
        $('animal-input').value = params.get('name') || '';
    }
    showSpeciesFilter();
    $('species-filter-clear').addEventListener('click', () => { clearSpeciesFilter(); loadSightings(); });

    buildGroupControls();

    $('location-input').addEventListener('keydown', (e) => {
        if (e.key === 'Enter') handleSearch();
    });
    $('search-btn').addEventListener('click', handleSearch);
    // Find an Animal: suggestions while typing, arrow keys, Enter, Esc
    $('animal-input').addEventListener('focus', loadAnimalList);
    $('animal-input').addEventListener('input', async (e) => {
        await loadAnimalList();   // instant after the first time
        const typed = e.target.value;
        if (typed !== $('animal-input').value) return;   // the user has typed more meanwhile
        renderSuggestions('', matchAnimals(typed), typed);
    });
    $('animal-input').addEventListener('keydown', onAnimalKey);
    $('animal-input').addEventListener('blur', () => setTimeout(hideSuggestions, 150));   // lets a click on a suggestion finish first
    $('animal-btn').addEventListener('click', findAnimal);
    $('animal-suggest').addEventListener('mousedown', (e) => e.preventDefault());   // keep the focus in the box
    $('animal-suggest').addEventListener('click', (e) => {
        const btn = e.target.closest('button');
        if (btn) showAnimal({ key: Number(btn.dataset.key), name: btn.dataset.name });
    });
    $('filters-toggle').addEventListener('click', () => setFiltersOpen(!$('layout').classList.contains('filters-open')));
    $('locate-btn').addEventListener('click', useCurrentLocation);

    document.querySelectorAll('.chip[data-place]').forEach(chip =>
        chip.addEventListener('click', () => quickSelect(chip.dataset.place, chip)));

    document.querySelectorAll('.chip[data-radius]').forEach(chip => chip.addEventListener('click', () => {
        document.querySelectorAll('.chip[data-radius]').forEach(c => c.classList.toggle('active', c === chip));
        state.radiusKm = parseFloat(chip.dataset.radius) || 10;
        updateRadiusCircle();
        loadSightings();
    }));

    $('group-list').addEventListener('change', (e) => {
        if (state.speciesFilter) clearSpeciesFilter();
        if (e.target.checked) state.groups.add(e.target.value);
        else state.groups.delete(e.target.value);
        loadSightings();
    });

    $('date-from').addEventListener('change', (e) => { state.fromDate = e.target.value; loadSightings(); });
    $('date-to').addEventListener('change', (e) => { state.toDate = e.target.value; loadSightings(); });

    $('limit-select').addEventListener('change', (e) => {
        state.limit = parseInt(e.target.value) || 75;
        loadSightings();
    });

    document.querySelectorAll('.basemap-tabs button').forEach(btn =>
        btn.addEventListener('click', () => switchBaseLayer(btn.dataset.layer, btn)));
    $('zoom-in').addEventListener('click', () => map.zoomIn());
    $('zoom-out').addEventListener('click', () => map.zoomOut());
    $('recenter').addEventListener('click', recenterMap);

    $('page-prev').addEventListener('click', () => changePage(-1));
    $('page-next').addEventListener('click', () => changePage(1));
    $('sightings-body').addEventListener('click', (e) => {
        const btn = e.target.closest('.btn-view');
        if (btn) selectSighting(parseInt(btn.dataset.index), { reveal: true });
    });

    $('profile-close').addEventListener('click', () => {
        if (state.selected !== null && state.markers[state.selected]) {
            state.markers[state.selected].getElement()?.querySelector('.pin')?.classList.remove('selected');
        }
        state.selected = null;
        clearProfile();
        renderTable();
    });


    window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') $('profile-close').click();
    });

    // Auto-load the default location (Busan)
    updateRadiusCircle();
    loadSightings();
});
