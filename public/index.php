<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Wildlife Sighting Tracker</title>
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css">
    <style>
        body { font-family: sans-serif; margin: 0; }
        header { background: #1b5e20; color: white; padding: 12px 20px; }
        #map { height: 70vh; width: 100%; }
        .controls { padding: 12px 20px; background: #f5f5f5; }
        button { padding: 6px 12px; }
    </style>
</head>
<body>
    <header>
        <h1>🦌 Wildlife Sighting Tracker</h1>
        <p>Explore real wildlife records near any location (data from GBIF)</p>
    </header>

    <div class="controls">
        <button onclick="loadBusan()">Load Busan</button>
        <button onclick="loadSeoul()">Load Seoul</button>
        <span id="status" style="margin-left: 10px; color: #555;"></span>
    </div>

    <div id="map"></div>

    <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
    <script>
        const map = L.map('map').setView([35.1796, 129.0756], 10);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; OpenStreetMap'
        }).addTo(map);

        let layer = L.layerGroup().addTo(map);

        async function load(lat, lng, label) {
            document.getElementById('status').textContent = 'Loading ' + label + '...';
            layer.clearLayers();
            try {
                const res = await fetch(`api/sightings.php?lat=${lat}&lng=${lng}&radius=15&limit=100`);
                const data = await res.json();
                if (data.error) throw new Error(data.error);
                data.results.forEach(r => {
                    if (r.lat && r.lng) {
                        L.circleMarker([r.lat, r.lng], {
                            radius: 5, color: '#2e7d32', fillOpacity: 0.7
                        }).bindPopup(`<b>${r.commonName || r.scientificName || 'Unknown'}</b><br>${r.taxonGroup || ''}`);
                    }
                });
                map.setView([lat, lng], 10);
                document.getElementById('status').textContent = `Found ${data.results.length} sightings near ${label}`;
            } catch (e) {
                document.getElementById('status').textContent = 'Error: ' + e.message;
            }
        }

        function loadBusan() { load(35.1796, 129.0756, 'Busan'); }
        function loadSeoul() { load(37.5665, 126.9780, 'Seoul'); }

        loadBusan();
    </script>
</body>
</html>