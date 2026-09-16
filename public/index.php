<?php
// public/index.php
?>
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Wildlife Sighting Mapping and Species Distribution Tracker</title>
<meta name="viewport" content="width=device-width, initial-scale=1">
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css">
<style>
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background-color: #f5f7fa; }
    header { background: linear-gradient(135deg, #2b5876 0%, #4e4376 100%); color: white; padding: 20px 30px; }
    header h1 { margin: 0 0 10px 0; font-size: 1.8rem; }
    header p { margin: 0; font-size: 1rem; opacity: 0.9; }
    .panel { max-width: 1200px; margin: 20px auto; padding: 20px; background: white; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.05); }
    .controls { display: flex; gap: 15px; margin-bottom: 20px; flex-wrap: wrap; }
    .controls input, .controls select, .controls button { padding: 10px; border: 1px solid #ccc; border-radius: 5px; font-size: 14px; }
    .controls input { flex: 1; min-width: 200px; }
    .controls button { background-color: #2b5876; color: white; font-weight: bold; cursor: pointer; border: none; transition: background 0.2s; }
    .controls button:hover { background-color: #1a3649; }
    .quick-chips { display: flex; gap: 10px; margin-bottom: 15px; }
    .quick-chips button { padding: 6px 12px; background: #edf2f7; border: 1px solid #cbd5e0; border-radius: 20px; cursor: pointer; color: #2d3748; font-size: 13px; }
    .quick-chips button:hover { background: #e2e8f0; }
    .status-bar { margin-bottom: 15px; font-size: 14px; color: #4a5568; font-weight: 500; }
    #map { height: 480px; width: 100%; border-radius: 8px; margin-bottom: 20px; z-index: 1; border: 1px solid #e2e8f0; }
    .legend { display: flex; gap: 15px; flex-wrap: wrap; padding: 15px; background: #f8fafc; border-radius: 6px; margin-bottom: 20px; }
    .legend-item { display: flex; align-items: center; gap: 8px; font-size: 14px; color: #4a5568; }
    .color-dot { width: 14px; height: 14px; border-radius: 50%; display: inline-block; }
    .species-panel { min-height: 120px; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px; background: #fff; display: flex; gap: 20px; }
    .placeholder-text { color: #a0aec0; font-style: italic; margin: auto; }
    .species-info { flex: 1; }
    .species-info h3 { margin: 0 0 5px 0; color: #2d3748; }
    .species-info p { margin: 0 0 15px 0; color: #718096; }
    .taxonomy-chips { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 15px; }
    .tax-chip { background: #edf2f7; color: #4a5568; padding: 4px 10px; border-radius: 4px; font-size: 12px; font-weight: 500; }
    .species-photo { width: 200px; height: 200px; object-fit: cover; border-radius: 8px; border: 1px solid #e2e8f0; display: none; }
    a.gbif-link { display: inline-block; color: #3182ce; text-decoration: none; font-weight: 500; font-size: 14px; }
    a.gbif-link:hover { text-decoration: underline; }
</style>
</head>
<body>

<header>
    <h1>Wildlife Sighting Mapping and Species Distribution Tracker</h1>
    <p>Explore real wildlife sighting records from GBIF — search any location, filter by animal group and date, and click a marker for full species details.</p>
</header>

<div class="panel">
    <div class="controls">
        <input type="text" id="location-input" placeholder="Enter a city or location (e.g., Ulsan, Jeju)..." value="Ulsan">
        <select id="taxon-select">
            <option value="">All Animals</option>
            <option value="212">Birds (Aves)</option>
            <option value="359">Mammals (Mammalia)</option>
            <option value="216">Insects (Insecta)</option>
            <option value="131">Amphibians (Amphibia)</option>
            <option value="358">Reptiles (Reptilia)</option>
        </select>
        <select id="radius-select">
            <option value="5">5 km</option>
            <option value="10" selected>10 km</option>
            <option value="25">25 km</option>
            <option value="50">50 km</option>
            <option value="100">100 km</option>
        </select>
        <button onclick="doSearch()">Search</button>
    </div>

    <div class="quick-chips">
        <button onclick="quickLoad('Busan')">Busan</button>
        <button onclick="quickLoad('Seoul')">Seoul</button>
        <button onclick="quickLoad('Jeju')">Jeju</button>
        <button onclick="quickLoad('Ulsan')">Ulsan</button>
    </div>

    <div id="status" class="status-bar">Ready to search.</div>
    <div id="map"></div>

    <div class="legend">
        <div class="legend-item"><span class="color-dot" style="background:#3182ce;"></span> Birds</div>
        <div class="legend-item"><span class="color-dot" style="background:#e53e3e;"></span> Mammals</div>
        <div class="legend-item"><span class="color-dot" style="background:#38a169;"></span> Insects</div>
        <div class="legend-item"><span class="color-dot" style="background:#805ad5;"></span> Amphibians</div>
        <div class="legend-item"><span class="color-dot" style="background:#d69e2e;"></span> Reptiles</div>
        <div class="legend-item"><span class="color-dot" style="background:#718096;"></span> Other</div>
    </div>

    <div class="species-panel" id="species-panel">
        <p class="placeholder-text" id="panel-placeholder">Click a marker on the map to see full species details and a photo here.</p>
        <div class="species-info" id="species-info" style="display: none;">
            <h3 id="sp-common">Common Name</h3>
            <p id="sp-scientific">Scientific Name</p>
            <div class="taxonomy-chips" id="sp-taxonomy"></div>
            <a href="#" id="sp-link" class="gbif-link" target="_blank">View full record on GBIF &rarr;</a>
        </div>
        <img src="" alt="Species photo" class="species-photo" id="sp-photo">
    </div>
</div>

<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script>
    // 1. Dual-map setup (Korean and English)
    const koreanMap = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '© OpenStreetMap'
    });

   const englishMap = L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
});

    const map = L.map('map', {
        center: [35.1796, 129.0756], // Default startup coordinates (Busan)
        zoom: 10,
        layers: [englishMap] // Defaulting to English map per your request
    });

    const baseMaps = {
        "English": englishMap,
        "Korean (한국어)": koreanMap
    };
    L.control.layers(baseMaps).addTo(map);

    let currentMarkers = [];
    let currentLat = null;
    let currentLng = null;

    // Helper: Safely parse JSON to surface 404/PHP errors clearly[cite: 2]
    async function safeJson(res) {
        const text = await res.text();
        try {
            return JSON.parse(text);
        } catch (e) {
            throw new Error(`Server returned non-JSON (check PHP files). First 80 chars: ${text.slice(0, 80)}`);
        }
    }

    // Helper: Map taxon group to colors
    function getMarkerColor(taxonClass) {
        if (!taxonClass) return '#718096'; // Gray for other
        const t = taxonClass.toLowerCase();
        if (t === 'aves') return '#3182ce'; // Blue
        if (t === 'mammalia') return '#e53e3e'; // Red
        if (t === 'insecta') return '#38a169'; // Green
        if (t === 'amphibia') return '#805ad5'; // Purple
        if (t === 'reptilia') return '#d69e2e'; // Orange
        return '#718096';
    }

    // Quick location loader
    function quickLoad(place) {
        document.getElementById('location-input').value = place;
        doSearch();
    }

    // Main search function: geocodes then fetches sightings[cite: 2]
    async function doSearch() {
        const query = document.getElementById('location-input').value.trim();
        const statusEl = document.getElementById('status');
        if (!query) return;

        statusEl.innerText = `Searching for location: ${query}...`;

        try {
            // Geocode using api/geocode.php[cite: 2]
            const geoRes = await fetch(`api/geocode.php?q=${encodeURIComponent(query)}`);
            if (!geoRes.ok) throw new Error('Location search failed. Ensure geocode.php is working.');
            const geoData = await safeJson(geoRes);

            if (geoData.error) throw new Error(geoData.error);

            currentLat = geoData.lat;
            currentLng = geoData.lng;

            // Auto-center the map[cite: 2]
            map.setView([currentLat, currentLng], 11);
            statusEl.innerText = `Found ${geoData.displayName}. Fetching wildlife data...`;

            await fetchSightings();

        } catch (err) {
            statusEl.innerText = `Error: ${err.message}`;
        }
    }

    // Fetch and render sightings[cite: 2]
    async function fetchSightings() {
        if (currentLat === null || currentLng === null) return;
        
        const taxon = document.getElementById('taxon-select').value;
        const radius = document.getElementById('radius-select').value;
        const statusEl = document.getElementById('status');

        let url = `api/sightings.php?lat=${currentLat}&lng=${currentLng}&radius=${radius}&limit=75`;
        if (taxon) url += `&taxon=${taxon}`;

        try {
            const res = await fetch(url);
            if (!res.ok) throw new Error('Sightings fetch failed. Ensure sightings.php is restored.');
            const data = await safeJson(res);

            if (data.error) throw new Error(data.error);

            renderMarkers(data.results);
            statusEl.innerText = `Displaying ${data.count || data.results.length} sightings near this location.`;
            
        } catch (err) {
            statusEl.innerText = `Error fetching wildlife: ${err.message}`;
        }
    }

    // Render Leaflet markers[cite: 2]
    function renderMarkers(results) {
        // Clear old markers
        currentMarkers.forEach(m => map.removeLayer(m));
        currentMarkers = [];

        results.forEach(r => {
            if (!r.lat || !r.lng) return;

            const color = getMarkerColor(r.taxonGroup);
            
            const marker = L.circleMarker([r.lat, r.lng], {
                radius: 8,
                fillColor: color,
                color: '#fff',
                weight: 1,
                opacity: 1,
                fillOpacity: 0.8
            }).addTo(map);

            marker.on('click', () => {
                showSpeciesDetail(r.speciesKey, r);
            });

            marker.bindTooltip(`<b>${r.commonName || r.scientificName}</b><br>${r.eventDate || 'Unknown date'}`);
            currentMarkers.push(marker);
        });
    }

    // Fetch full species info and photo[cite: 2]
    async function showSpeciesDetail(speciesKey, basicRecord) {
        const placeholder = document.getElementById('panel-placeholder');
        const infoDiv = document.getElementById('species-info');
        const photoEl = document.getElementById('sp-photo');
        
        placeholder.style.display = 'none';
        infoDiv.style.display = 'block';
        photoEl.style.display = 'none'; // hide until loaded

        document.getElementById('sp-common').innerText = 'Loading...';
        document.getElementById('sp-scientific').innerText = '';
        document.getElementById('sp-taxonomy').innerHTML = '';
        document.getElementById('sp-link').style.display = 'none';

        if (!speciesKey) {
            document.getElementById('sp-common').innerText = basicRecord.scientificName || 'Unknown Species';
            document.getElementById('sp-scientific').innerText = 'No exact species key provided by GBIF for this record.';
            return;
        }

        try {
            const res = await fetch(`api/species.php?speciesKey=${speciesKey}`);
            const spData = await safeJson(res);

            if (spData.error) throw new Error(spData.error);

            document.getElementById('sp-common').innerText = spData.vernacularName || spData.scientificName;
            document.getElementById('sp-scientific').innerText = spData.scientificName;
            
            // Generate taxonomy chips[cite: 2]
            const ranks = ['kingdom', 'phylum', 'class', 'order', 'family', 'genus'];
            let chipsHtml = '';
            ranks.forEach(rank => {
                if (spData[rank]) chipsHtml += `<span class="tax-chip">${spData[rank]}</span>`;
            });
            document.getElementById('sp-taxonomy').innerHTML = chipsHtml;

            if (spData.gbifUrl) {
                const link = document.getElementById('sp-link');
                link.href = spData.gbifUrl;
                link.style.display = 'inline-block';
            }

            if (spData.imageUrl) {
                photoEl.src = spData.imageUrl;
                photoEl.style.display = 'block';
            }

        } catch (err) {
            document.getElementById('sp-common').innerText = 'Error loading details';
            document.getElementById('sp-scientific').innerText = err.message;
        }
    }

    // Event listeners to auto-update when filters change
    document.getElementById('taxon-select').addEventListener('change', fetchSightings);
    document.getElementById('radius-select').addEventListener('change', fetchSightings);

</script>
</body>
</html>