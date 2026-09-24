/**
 * Wildlife Sighting Mapping and Species Distribution Tracker
 * Modern Application Logic & Controller
 * CAPR-F2026 Capstone Project
 */

// =============================================================================
// Application State & Configuration
// =============================================================================
const state = {
    currentLat: 35.1796,  // Default: Busan
    currentLng: 129.0756,
    currentLocationName: 'Busan, South Korea',
    lastQuery: 'Busan',   // search-box text that produced the current coordinates
    radiusKm: 10,
    taxonKey: '',
    limit: 75,
    fromDate: '',
    toDate: '',
    sightings: [],
    markers: [],
    radiusCircle: null,
    activeMarker: null,
    speciesCache: new Map(),
    isLoading: false,
};

// Animal taxon metadata & colors
const TAXON_META = {
    '212':   { name: 'Birds', class: 'Aves', color: '#0284c7', icon: '🦅', badgeClass: 'badge-aves' },
    '359':   { name: 'Mammals', class: 'Mammalia', color: '#ea580c', icon: '🐺', badgeClass: 'badge-mammalia' },
    '216':   { name: 'Insects', class: 'Insecta', color: '#10b981', icon: '🦋', badgeClass: 'badge-insecta' },
    '131':   { name: 'Amphibians', class: 'Amphibia', color: '#8b5cf6', icon: '🐸', badgeClass: 'badge-amphibia' },
    '358':   { name: 'Reptiles', class: 'Reptilia', color: '#eab308', icon: '🦎', badgeClass: 'badge-reptilia' },
    '204':   { name: 'Fishes', class: 'Actinopterygii', color: '#06b6d4', icon: '🐟', badgeClass: 'badge-fish' },
    '52':    { name: 'Molluscs', class: 'Mollusca', color: '#14b8a6', icon: '🐚', badgeClass: 'badge-mollusc' },
    '367':   { name: 'Arachnids', class: 'Arachnida', color: '#db2777', icon: '🕷️', badgeClass: 'badge-arachnid' },
    'other': { name: 'Other Fauna', class: 'Other', color: '#64748b', icon: '🐾', badgeClass: 'badge-other' }
};

// =============================================================================
// Map Setup & Multi-layer Basemaps (Watermark-free, Full Zoom Coverage)
// =============================================================================
const openStreetMap = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
});

const satelliteMap = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
    maxNativeZoom: 18,
    maxZoom: 19,
    attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
});

const esriTopo = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}', {
    maxNativeZoom: 13,
    maxZoom: 19,
    attribution: 'Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ, TomTom, USGS, NPS, NRCAN, Ordnance Survey'
});

const map = L.map('map', {
    center: [state.currentLat, state.currentLng],
    zoom: 11,
    maxZoom: 19,
    zoomControl: false,
    layers: [openStreetMap] // OpenStreetMap has complete high-resolution data up to zoom 19 everywhere
});

// Position zoom controls at bottom-right for clean UI
L.control.zoom({ position: 'bottomright' }).addTo(map);

// Add modern base layer selector
const baseLayers = {
    "OpenStreetMap (Standard)": openStreetMap,
    "Satellite Imagery (Esri)": satelliteMap,
    "Topographic (Esri)": esriTopo
};
L.control.layers(baseLayers, null, { position: 'topright' }).addTo(map);

// =============================================================================
// Utility Helpers & Safe DOM Setters
// =============================================================================
function setText(id, text) {
    const el = document.getElementById(id);
    if (el) el.innerText = text;
}

function setHtml(id, html) {
    const el = document.getElementById(id);
    if (el) el.innerHTML = html;
}

function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type === 'error' ? 'error' : ''}`;
    toast.innerHTML = `
        <i class="fa-solid ${type === 'error' ? 'fa-circle-exclamation' : 'fa-circle-check'}"></i>
        <span>${escapeHtml(message)}</span>
    `;

    container.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(10px)';
        toast.style.transition = 'all 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

async function safeJsonFetch(url) {
    const res = await fetch(url);
    const text = await res.text();
    try {
        const data = JSON.parse(text);
        if (!res.ok && data.error) {
            throw new Error(data.error);
        }
        return data;
    } catch (e) {
        if (!res.ok) throw new Error(`HTTP ${res.status}: ${text.slice(0, 80)}`);
        throw e;
    }
}

function getTaxonMeta(taxonGroup) {
    if (!taxonGroup) return TAXON_META['other'];
    const lower = taxonGroup.toLowerCase();
    if (lower.includes('ave') || lower.includes('bird')) return TAXON_META['212'];
    if (lower.includes('mammal')) return TAXON_META['359'];
    if (lower.includes('insect') || lower.includes('hexapod')) return TAXON_META['216'];
    if (lower.includes('amphib')) return TAXON_META['131'];
    if (lower.includes('reptil') || lower.includes('squamata')) return TAXON_META['358'];
    if (lower.includes('actinopteryg') || lower.includes('pisces') || lower.includes('fish') || lower.includes('chondrichth')) return TAXON_META['204'];
    if (lower.includes('mollusc') || lower.includes('gastropod') || lower.includes('bivalv') || lower.includes('cephalopod') || lower.includes('polyplacophora')) return TAXON_META['52'];
    if (lower.includes('arachnid') || lower.includes('araneae')) return TAXON_META['367'];
    return TAXON_META['other'];
}

function setLoading(isLoading, statusText = '') {
    state.isLoading = isLoading;
    const loader = document.getElementById('map-loader');
    const feedStatus = document.getElementById('status-feed');
    const searchBtn = document.getElementById('search-btn');

    if (loader) {
        loader.classList.toggle('active', isLoading);
        if (statusText) {
            const loaderText = loader.querySelector('.loader-text');
            if (loaderText) loaderText.innerText = statusText;
        }
    }

    if (feedStatus && statusText) {
        feedStatus.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> ${escapeHtml(statusText)}`;
    }

    if (searchBtn) {
        searchBtn.disabled = isLoading;
        searchBtn.innerHTML = isLoading ? '<i class="fa-solid fa-spinner fa-spin"></i>' : '<i class="fa-solid fa-arrow-right"></i>';
    }
}

// =============================================================================
// Search & Geolocation Logic
// =============================================================================
async function handleSearch() {
    const input = document.getElementById('location-input');
    const query = input ? input.value.trim() : '';
    if (!query) {
        showToast('Please enter a location or city name', 'error');
        return;
    }

    setLoading(true, `Geocoding location "${query}"...`);

    try {
        const geo = await safeJsonFetch(`api/geocode.php?q=${encodeURIComponent(query)}`);
        if (geo.error) throw new Error(geo.error);

        state.currentLat = geo.lat;
        state.currentLng = geo.lng;
        state.currentLocationName = geo.displayName || query;
        state.lastQuery = query;

        // Animate map view smoothly to target location
        map.flyTo([state.currentLat, state.currentLng], 12, { duration: 1.2 });
        updateRadiusCircle();

        // Update active location badge in KPI stats
        setText('stat-location', query);
        showToast(`Located "${query}" successfully!`);

        await loadSightings();

    } catch (err) {
        console.error(err);
        showToast(`Search error: ${err.message}`, 'error');
        setLoading(false);
    }
}

function quickSelect(city, elem) {
    document.querySelectorAll('.preset-chip').forEach(btn => btn.classList.remove('active'));
    if (elem) elem.classList.add('active');

    const input = document.getElementById('location-input');
    if (input) input.value = city;
    handleSearch();
}

// "Query Sightings" button: reload with the current filters. Only geocode again when
// the user has typed a different place; otherwise keep the current coordinates
// (so a "Locate Me" GPS position is not replaced by a search for its label).
function querySightings() {
    const input = document.getElementById('location-input');
    const query = input ? input.value.trim() : '';
    if (query && query !== state.lastQuery) {
        handleSearch();
    } else {
        loadSightings();
    }
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

            const input = document.getElementById('location-input');
            state.lastQuery = 'Current Location (GPS)';
            if (input) input.value = state.lastQuery;
            setText('stat-location', 'Near Me');

            map.flyTo([state.currentLat, state.currentLng], 13, { duration: 1.2 });
            updateRadiusCircle();
            showToast('GPS coordinates acquired! Fetching local fauna...');

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

// =============================================================================
// Map Overlay & Circle Perimeter
// =============================================================================
function updateRadiusCircle() {
    if (state.radiusCircle) {
        map.removeLayer(state.radiusCircle);
        state.radiusCircle = null;
    }

    if (state.currentLat && state.currentLng) {
        state.radiusCircle = L.circle([state.currentLat, state.currentLng], {
            radius: state.radiusKm * 1000,
            color: '#059669',
            fillColor: '#10b981',
            fillOpacity: 0.08,
            weight: 2,
            dashArray: '5, 5'
        }).addTo(map);
    }
}

function recenterMap() {
    if (state.currentLat && state.currentLng) {
        map.flyTo([state.currentLat, state.currentLng], 12, { duration: 0.8 });
    }
}

function toggleRadius() {
    if (!state.radiusCircle) {
        updateRadiusCircle();
    } else {
        if (map.hasLayer(state.radiusCircle)) {
            map.removeLayer(state.radiusCircle);
        } else {
            state.radiusCircle.addTo(map);
        }
    }
}

// =============================================================================
// Sightings Fetching & Rendering
// =============================================================================
async function loadSightings() {
    if (state.currentLat === null || state.currentLng === null) return;

    if (state.fromDate && state.toDate && state.fromDate > state.toDate) {
        setLoading(false);
        showToast('The "From" date must be on or before the "To" date', 'error');
        return;
    }

    setLoading(true, 'Querying GBIF biodiversity records...');

    let url = `api/sightings.php?lat=${state.currentLat}&lng=${state.currentLng}&radius=${state.radiusKm}&limit=${state.limit}`;
    if (state.taxonKey) url += `&taxon=${encodeURIComponent(state.taxonKey)}`;
    if (state.fromDate) url += `&from=${encodeURIComponent(state.fromDate)}`;
    if (state.toDate)   url += `&to=${encodeURIComponent(state.toDate)}`;

    try {
        const data = await safeJsonFetch(url);
        state.sightings = data.results || [];

        renderMarkers(state.sightings);
        renderSightingsFeed(state.sightings);
        renderTaxonAnalytics(state.sightings);
        updateKpiStats(data.count || state.sightings.length, state.sightings);

        const statusEl = document.getElementById('status-feed');
        if (data.fallback) {
            // NFR-04: GBIF was unreachable, so the server sent its built-in sample records
            showToast('GBIF is unreachable — showing sample data (filters not applied)', 'error');
            if (statusEl) {
                statusEl.innerHTML = `<i class="fa-solid fa-triangle-exclamation"></i> GBIF unreachable — showing <b>${state.sightings.length}</b> sample records`;
            }
        } else if (statusEl) {
            statusEl.innerHTML = `<i class="fa-solid fa-check text-emerald"></i> Found <b>${state.sightings.length}</b> records within ${state.radiusKm}km`;
        }

    } catch (err) {
        console.error(err);
        showToast(`Failed to load sightings: ${err.message}`, 'error');
        const feedList = document.getElementById('feed-list');
        if (feedList) {
            feedList.innerHTML = `<div class="placeholder-text" style="padding: 2rem; text-align: center; color: #ef4444;">
                <i class="fa-solid fa-triangle-exclamation" style="font-size: 2rem; margin-bottom: 0.5rem; display: block;"></i>
                Could not load wildlife records.<br><small>${escapeHtml(err.message)}</small>
            </div>`;
        }
    } finally {
        setLoading(false);
    }
}

// Render Custom Map Pin Markers
function renderMarkers(records) {
    // Clear existing markers
    state.markers.forEach(m => map.removeLayer(m));
    state.markers = [];

    if (!records || records.length === 0) return;

    records.forEach((r, index) => {
        if (!r.lat || !r.lng) return;

        const meta = getTaxonMeta(r.taxonGroup);
        const name = r.commonName || r.scientificName || 'Unknown Animal';

        // Create sleek custom SVG circle pin
        const customIcon = L.divIcon({
            className: 'custom-pin-wrapper',
            html: `
                <div class="custom-pin" style="background-color: ${meta.color};" title="${escapeHtml(name)}">
                    <span style="font-size: 11px;">${meta.icon}</span>
                </div>
            `,
            iconSize: [26, 26],
            iconAnchor: [13, 13]
        });

        const marker = L.marker([r.lat, r.lng], { icon: customIcon }).addTo(map);

        // Tooltip
        marker.bindTooltip(`
            <div style="font-weight: 700; margin-bottom: 2px;">${escapeHtml(name)}</div>
            <div style="font-style: italic; font-size: 11px; opacity: 0.85;">${escapeHtml(r.scientificName || '')}</div>
            <div style="font-size: 10px; margin-top: 3px; color: ${meta.color}; font-weight: 600;">
                ● ${escapeHtml(meta.name)} &bull; ${escapeHtml(r.eventDate || 'Date N/A')}
            </div>
        `, {
            className: 'leaflet-tooltip-custom',
            direction: 'top',
            offset: [0, -10]
        });

        marker.on('click', () => {
            selectSighting(r, index, marker);
        });

        marker._recordIndex = index;
        state.markers.push(marker);
    });
}

// Render Left Panel Sighting Cards Feed
function renderSightingsFeed(records) {
    const feedList = document.getElementById('feed-list');
    const countBadge = document.getElementById('feed-count-badge');
    if (!feedList) return;

    if (countBadge) countBadge.innerText = records.length;

    if (records.length === 0) {
        feedList.innerHTML = `
            <div class="placeholder-text" style="padding: 2.5rem 1rem; text-align: center;">
                <div style="font-size: 2.5rem; margin-bottom: 0.5rem;">🐾</div>
                <div style="font-weight: 600; color: var(--slate-700);">No fauna records found</div>
                <div style="font-size: 0.8rem; color: var(--slate-400); margin-top: 0.25rem;">
                    Try increasing the radius or searching a different area.
                </div>
            </div>
        `;
        return;
    }

    let html = '';
    records.forEach((r, idx) => {
        const meta = getTaxonMeta(r.taxonGroup);
        const commonName = r.commonName || r.scientificName || 'Unknown Animal';
        const scientific = r.scientificName || 'Species unidentified';
        const dateStr = r.eventDate ? r.eventDate.split('T')[0] : 'Date N/A';
        const locationStr = r.locality || r.country || 'Region unspecified';

        html += `
            <div class="sighting-item" data-index="${idx}" onclick="handleSightingCardClick(${idx})">
                <div class="sighting-avatar" style="background-color: ${meta.color}15; color: ${meta.color};">
                    ${meta.icon}
                </div>
                <div class="sighting-body">
                    <div class="sighting-top">
                        <div class="sighting-common" title="${escapeHtml(commonName)}">${escapeHtml(commonName)}</div>
                        <span class="sighting-badge ${meta.badgeClass}">${escapeHtml(meta.name)}</span>
                    </div>
                    <div class="sighting-scientific">${escapeHtml(scientific)}</div>
                    <div class="sighting-meta">
                        <span><i class="fa-regular fa-calendar"></i> ${escapeHtml(dateStr)}</span>
                        <span><i class="fa-solid fa-location-dot"></i> ${escapeHtml(locationStr)}</span>
                    </div>
                </div>
            </div>
        `;
    });

    feedList.innerHTML = html;
}

// Compute & Render Taxon Diversity Analytics
function renderTaxonAnalytics(records) {
    const container = document.getElementById('analytics-content');
    if (!container) return;

    if (!records || records.length === 0) {
        container.innerHTML = `<div style="text-align:center; padding: 2rem; color: var(--slate-400);">No data to analyze.</div>`;
        return;
    }

    const counts = {};
    records.forEach(r => {
        const meta = getTaxonMeta(r.taxonGroup);
        counts[meta.name] = counts[meta.name] || { count: 0, color: meta.color, icon: meta.icon };
        counts[meta.name].count++;
    });

    const total = records.length;
    const sorted = Object.entries(counts).sort((a, b) => b[1].count - a[1].count);

    let html = '';
    sorted.forEach(([name, data]) => {
        const pct = Math.round((data.count / total) * 100);
        html += `
            <div class="analytics-row">
                <div class="analytics-header">
                    <span>${data.icon} ${escapeHtml(name)}</span>
                    <span><b>${data.count}</b> (${pct}%)</span>
                </div>
                <div class="analytics-bar-bg">
                    <div class="analytics-bar-fill" style="width: ${pct}%; background-color: ${data.color};"></div>
                </div>
            </div>
        `;
    });

    container.innerHTML = html;
}

// Update Top KPI Summary Strip
function updateKpiStats(totalCount, records) {
    setText('stat-sightings', totalCount);
    setText('stat-radius', `${state.radiusKm} km`);

    // Calculate unique species count
    const uniqueSpecies = new Set(records.map(r => r.speciesKey || r.scientificName).filter(Boolean));
    setText('stat-diversity', `${uniqueSpecies.size} species`);

    // Dominant group
    const groups = {};
    records.forEach(r => {
        const meta = getTaxonMeta(r.taxonGroup);
        groups[meta.name] = (groups[meta.name] || 0) + 1;
    });

    let dominantName = 'None';
    let max = 0;
    for (const [k, v] of Object.entries(groups)) {
        if (v > max) {
            max = v;
            dominantName = k;
        }
    }
    const dominantPct = records.length > 0 ? Math.round((max / records.length) * 100) : 0;
    setText('stat-dominant', records.length > 0 ? `${dominantName} (${dominantPct}%)` : '—');
}

// =============================================================================
// Sighting & Species Inspection (Right Drawer)
// =============================================================================
function handleSightingCardClick(index) {
    const record = state.sightings[index];
    const marker = state.markers[index];
    if (!record) return;

    if (marker) {
        map.flyTo([record.lat, record.lng], 14, { duration: 0.8 });
        marker.openTooltip();
    }

    selectSighting(record, index, marker);
}

async function selectSighting(record, index, marker) {
    // Highlight active card
    document.querySelectorAll('.sighting-item').forEach(el => el.classList.remove('active'));
    const activeCard = document.querySelector(`.sighting-item[data-index="${index}"]`);
    if (activeCard) {
        activeCard.classList.add('active');
        activeCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    openSpeciesDrawer(record);
}

async function openSpeciesDrawer(record) {
    const drawer = document.getElementById('species-drawer');
    const photoImg = document.getElementById('drawer-species-photo');
    const photoFallback = document.getElementById('drawer-photo-fallback');
    const gbifBtn = document.getElementById('drawer-gbif-btn');

    // Observation fields
    setText('meta-date', record.eventDate ? record.eventDate.split('T')[0] : 'N/A');
    setText('meta-locality', record.locality || record.country || 'Not specified');
    setText('meta-coords', record.lat && record.lng ? `${record.lat.toFixed(4)}, ${record.lng.toFixed(4)}` : 'N/A');
    setText('meta-id', record.key || record.speciesKey || 'N/A');

    const meta = getTaxonMeta(record.taxonGroup);
    setText('drawer-common-name', record.commonName || record.scientificName || 'Unknown Species');
    setText('drawer-scientific-name', record.scientificName || 'Unclassified');

    // Show fallback photo state while loading
    if (photoImg) photoImg.style.display = 'none';
    if (photoFallback) {
        photoFallback.style.display = 'flex';
        const iconEl = photoFallback.querySelector('.photo-fallback-icon');
        if (iconEl) iconEl.innerText = meta.icon;
        const textEl = photoFallback.querySelector('.fallback-text');
        if (textEl) textEl.innerText = 'Searching GBIF media archive...';
    }

    // Open the drawer smoothly
    if (drawer) drawer.classList.add('open');

    if (!record.speciesKey) {
        if (photoFallback) {
            const textEl = photoFallback.querySelector('.fallback-text');
            if (textEl) textEl.innerText = 'No media attached to this occurrence.';
        }
        setHtml('drawer-taxonomy', `<span class="tax-badge"><span class="rank">Group</span>${meta.name}</span>`);
        if (gbifBtn) gbifBtn.href = record.key ? `https://www.gbif.org/occurrence/${record.key}` : 'https://www.gbif.org';
        return;
    }

    // Check cache or fetch species info
    let speciesData;
    if (state.speciesCache.has(record.speciesKey)) {
        speciesData = state.speciesCache.get(record.speciesKey);
    } else {
        try {
            speciesData = await safeJsonFetch(`api/species.php?speciesKey=${record.speciesKey}`);
            state.speciesCache.set(record.speciesKey, speciesData);
        } catch (err) {
            console.warn('Could not fetch species taxonomy:', err);
            speciesData = null;
        }
    }

    if (speciesData) {
        if (speciesData.vernacularName) {
            setText('drawer-common-name', speciesData.vernacularName);
        }
        if (speciesData.scientificName) {
            setText('drawer-scientific-name', speciesData.scientificName);
        }

        // Render taxonomy breadcrumb chips
        const ranks = ['kingdom', 'phylum', 'class', 'order', 'family', 'genus'];
        let chipsHtml = '';
        ranks.forEach(rank => {
            if (speciesData[rank]) {
                chipsHtml += `<span class="tax-badge"><span class="rank">${rank}</span>${escapeHtml(speciesData[rank])}</span>`;
            }
        });
        setHtml('drawer-taxonomy', chipsHtml || `<span class="tax-badge">${meta.name}</span>`);

        // Image handling
        if (speciesData.imageUrl && photoImg && photoFallback) {
            photoImg.src = speciesData.imageUrl;
            photoImg.onload = () => {
                photoImg.style.display = 'block';
                photoFallback.style.display = 'none';
            };
            photoImg.onerror = () => {
                photoImg.style.display = 'none';
                photoFallback.style.display = 'flex';
                const textEl = photoFallback.querySelector('.fallback-text');
                if (textEl) textEl.innerText = 'Image preview not available';
            };
        } else if (photoFallback) {
            const textEl = photoFallback.querySelector('.fallback-text');
            if (textEl) textEl.innerText = 'No image provided by GBIF';
        }

        // GBIF External Link
        if (gbifBtn) gbifBtn.href = speciesData.gbifUrl || `https://www.gbif.org/species/${record.speciesKey}`;
    } else {
        if (photoFallback) {
            const textEl = photoFallback.querySelector('.fallback-text');
            if (textEl) textEl.innerText = 'Taxonomy details unavailable';
        }
        if (gbifBtn) gbifBtn.href = `https://www.gbif.org/species/${record.speciesKey}`;
    }
}

function closeSpeciesDrawer() {
    const drawer = document.getElementById('species-drawer');
    if (drawer) drawer.classList.remove('open');
    document.querySelectorAll('.sighting-item').forEach(el => el.classList.remove('active'));
}

// Copy coordinates to clipboard
function copyCoordinates() {
    const coordsEl = document.getElementById('meta-coords');
    const coords = coordsEl ? coordsEl.innerText : '';
    if (coords && coords !== 'N/A') {
        navigator.clipboard.writeText(coords).then(() => {
            showToast(`Copied ${coords} to clipboard!`);
        });
    }
}

// =============================================================================
// Event Listeners & Initializer
// =============================================================================
document.addEventListener('DOMContentLoaded', () => {
    // 1. Search Input Trigger on Enter
    const locationInput = document.getElementById('location-input');
    if (locationInput) {
        locationInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') handleSearch();
        });
    }

    // 2. Taxon Category Buttons
    document.querySelectorAll('.taxon-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.taxon-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            state.taxonKey = btn.getAttribute('data-taxon') || '';
            loadSightings();
        });
    });

    // 3. Radius & Limit Select Dropdowns
    const radiusSelect = document.getElementById('radius-select');
    if (radiusSelect) {
        radiusSelect.addEventListener('change', (e) => {
            state.radiusKm = parseFloat(e.target.value) || 10;
            updateRadiusCircle();
            loadSightings();
        });
    }

    const limitSelect = document.getElementById('limit-select');
    if (limitSelect) {
        limitSelect.addEventListener('change', (e) => {
            state.limit = parseInt(e.target.value) || 75;
            loadSightings();
        });
    }

    // 4. Date Range Filters
    const fromInput = document.getElementById('date-from');
    const toInput = document.getElementById('date-to');
    if (fromInput) fromInput.addEventListener('change', (e) => { state.fromDate = e.target.value; });
    if (toInput) toInput.addEventListener('change', (e) => { state.toDate = e.target.value; });

    // 5. Accordion Toggle for Date Filters
    const dateToggle = document.getElementById('toggle-date-filter');
    const dateBox = document.getElementById('date-filter-box');
    if (dateToggle && dateBox) {
        dateToggle.addEventListener('click', () => {
            const isOpen = dateBox.classList.toggle('open');
            dateToggle.innerHTML = isOpen
                ? '<i class="fa-solid fa-chevron-up"></i> Hide Date Filters'
                : '<i class="fa-solid fa-calendar-days"></i> Filter by Observation Date';
        });
    }

    // 6. Tabs Switcher (Sightings Feed vs Analytics)
    const tabFeed = document.getElementById('tab-feed');
    const tabAnalytics = document.getElementById('tab-analytics');
    const feedContent = document.getElementById('feed-list');
    const analyticsContent = document.getElementById('analytics-content');

    if (tabFeed && tabAnalytics) {
        tabFeed.addEventListener('click', () => {
            tabFeed.classList.add('active');
            tabAnalytics.classList.remove('active');
            if (feedContent) feedContent.style.display = 'flex';
            if (analyticsContent) analyticsContent.classList.remove('open');
        });

        tabAnalytics.addEventListener('click', () => {
            tabAnalytics.classList.add('active');
            tabFeed.classList.remove('active');
            if (feedContent) feedContent.style.display = 'none';
            if (analyticsContent) analyticsContent.classList.add('open');
        });
    }

    // 7. Keyboard Shortcuts (Escape to close drawer)
    window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeSpeciesDrawer();
    });

    // 8. Auto-load default location (Busan)
    updateRadiusCircle();
    loadSightings();
});
