<?php
// public/index.php - map dashboard (home page)
$page = 'map';
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>WildTrack &mdash; Wildlife Sighting Mapping & Species Distribution Tracker</title>

    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">

    <!-- FontAwesome 6 Free Icons -->
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css" integrity="sha512-DTOQO9RWCH3ppGqcWaEA1BIZOC6xxalwEsw9c2QQeAIftl+Vegovlnee1c9QX4TctnWMn13TZye+giMm8e2LwA==" crossorigin="anonymous" referrerpolicy="no-referrer" />

    <!-- Leaflet 1.9.4 CSS -->
    <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=" crossorigin="" />

    <!-- ?v=file time makes browsers fetch the new file after every change -->
    <link rel="stylesheet" href="css/style.css?v=<?= filemtime(__DIR__ . '/css/style.css') ?>">
</head>
<body>

<?php include __DIR__ . '/partials/header.php'; ?>

    <div class="layout">

        <!-- Left sidebar: search settings and filters -->
        <aside class="sidebar">

            <section class="side-section">
                <h3 class="side-title"><i class="fa-solid fa-location-dot"></i> Search Location</h3>
                <div class="search-box">
                    <i class="fa-solid fa-magnifying-glass" id="search-btn" title="Search"></i>
                    <input type="text" id="location-input" placeholder="Enter a place name (e.g. Busan, Seoul)">
                </div>
                <button class="btn-primary" id="locate-btn" type="button">
                    <i class="fa-solid fa-location-dot"></i> Locate Me
                </button>

                <h3 class="side-subtitle"><i class="fa-solid fa-location-dot"></i> Quick Locations</h3>
                <div class="chips">
                    <button class="chip active" data-place="Busan">Busan</button>
                    <button class="chip" data-place="Seoul">Seoul</button>
                    <button class="chip" data-place="Jeju">Jeju Island</button>
                    <button class="chip" data-place="Ulsan">Ulsan</button>
                    <button class="chip" data-place="Hallasan">Hallasan</button>
                    <button class="chip" data-place="Tokyo">Tokyo</button>
                    <button class="chip" data-place="Vancouver">Vancouver</button>
                </div>
            </section>

            <section class="side-section">
                <h3 class="side-title"><i class="fa-solid fa-crosshairs"></i> Search Radius</h3>
                <div class="chips radius-chips">
                    <button class="chip" data-radius="5">5 km</button>
                    <button class="chip active" data-radius="10">10 km</button>
                    <button class="chip" data-radius="25">25 km</button>
                    <button class="chip" data-radius="50">50 km</button>
                    <button class="chip" data-radius="100">100 km</button>
                </div>
            </section>

            <section class="side-section">
                <h3 class="side-title"><i class="fa-solid fa-paw"></i> Animal Groups</h3>
                <div class="group-list" id="group-list"><!-- built by app.js --></div>
            </section>

            <section class="side-section">
                <h3 class="side-title"><i class="fa-regular fa-calendar-days"></i> Observation Date</h3>
                <div class="date-range">
                    <input type="date" id="date-from" title="From date">
                    <i class="fa-solid fa-arrow-right"></i>
                    <input type="date" id="date-to" title="To date">
                </div>
            </section>

            <details class="side-section filters">
                <summary><span><i class="fa-solid fa-filter"></i> Filters</span><i class="fa-solid fa-chevron-down caret"></i></summary>
                <label for="limit-select" class="field-label">Max records</label>
                <select id="limit-select">
                    <option value="30">30 records</option>
                    <option value="75" selected>75 records</option>
                    <option value="150">150 records</option>
                    <option value="300">300 records</option>
                </select>
            </details>
        </aside>

        <!-- Centre: map and sightings table -->
        <main class="main">
            <section class="card map-card" id="map-section">
                <div id="map"></div>

                <div class="basemap-tabs">
                    <button class="active" data-layer="map" title="Street map (OpenStreetMap)">Street</button>
                    <button data-layer="satellite">Satellite</button>
                    <button data-layer="topo">Topographic</button>
                </div>

                <div class="map-legend">
                    <h4>Animal Groups</h4>
                    <div id="legend-list"><!-- built by app.js --></div>
                </div>

                <div class="map-controls">
                    <button id="zoom-in" title="Zoom in"><i class="fa-solid fa-plus"></i></button>
                    <button id="zoom-out" title="Zoom out"><i class="fa-solid fa-minus"></i></button>
                    <button id="recenter" class="solo" title="Recenter on search location"><i class="fa-solid fa-crosshairs"></i></button>
                </div>

                <div class="map-loading" id="map-loader">
                    <div class="spinner"></div>
                    <span class="loader-text">Loading GBIF data...</span>
                </div>
            </section>

            <section class="card table-card" id="sightings-section">
                <div class="table-head">
                    <h2><i class="fa-solid fa-binoculars"></i> Recent Sightings</h2>
                    <div class="pager">
                        <span id="page-info">Showing 0 of 0</span>
                        <button id="page-prev" title="Previous page"><i class="fa-solid fa-chevron-left"></i></button>
                        <button id="page-next" title="Next page"><i class="fa-solid fa-chevron-right"></i></button>
                    </div>
                </div>
                <div class="table-wrap">
                    <table class="sightings">
                        <thead>
                            <tr><th>#</th><th>Photo</th><th>Species</th><th>Group</th><th>Date</th><th>Location</th><th>Coordinates</th><th>Action</th></tr>
                        </thead>
                        <tbody id="sightings-body"></tbody>
                    </table>
                </div>
            </section>
        </main>

        <!-- Right: species profile -->
        <aside class="card profile" id="profile">
            <div class="profile-head">
                <h2>Species Profile</h2>
                <button id="profile-close" title="Clear selection"><i class="fa-solid fa-xmark"></i></button>
            </div>

            <div class="profile-empty" id="profile-empty">
                <i class="fa-solid fa-binoculars"></i>
                <p>Select a sighting on the map or in the table to see the species details.</p>
            </div>

            <div class="profile-body" id="profile-body" hidden>
                <div class="profile-photo">
                    <img id="profile-img" alt="Species photo">
                    <div class="photo-fallback" id="photo-fallback"><i class="fa-solid fa-image"></i><span id="photo-text">No photo available</span></div>
                </div>
                <span class="group-badge" id="profile-badge"></span>
                <h3 class="profile-name" id="profile-name"></h3>
                <p class="profile-sci" id="profile-sci"></p>

                <dl class="taxonomy" id="profile-taxonomy"></dl>

                <div class="profile-meta">
                    <div class="meta-row"><i class="fa-regular fa-calendar-days"></i><div><span>Date Observed</span><b id="meta-date"></b></div></div>
                    <div class="meta-row"><i class="fa-solid fa-location-dot"></i><div><span>Locality</span><b id="meta-locality"></b></div></div>
                    <div class="meta-row"><i class="fa-solid fa-crosshairs"></i><div><span>Coordinates</span><b id="meta-coords"></b></div></div>
                </div>

                <a href="#" id="profile-gbif" class="btn-primary gbif-btn" target="_blank" rel="noopener noreferrer">
                    <i class="fa-solid fa-arrow-up-right-from-square"></i> Explore on GBIF Network
                </a>
            </div>
        </aside>
    </div>


    <div class="toast-container" id="toast-container"></div>

    <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js" integrity="sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=" crossorigin=""></script>
    <script src="js/app.js?v=<?= filemtime(__DIR__ . '/js/app.js') ?>"></script>
</body>
</html>
