<?php
// public/index.php - Wildlife Sighting Mapping & Species Distribution Tracker
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>WildTrack &mdash; Wildlife Sighting Mapping & Species Distribution Tracker</title>
    
    <!-- Modern Google Fonts -->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@500;600;700;800&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
    
    <!-- FontAwesome 6 Free Icons -->
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css" integrity="sha512-DTOQO9RWCH3ppGqcWaEA1BIZOC6xxalwEsw9c2QQeAIftl+Vegovlnee1c9QX4TctnWMn13TZye+giMm8e2LwA==" crossorigin="anonymous" referrerpolicy="no-referrer" />
    
    <!-- Leaflet 1.9.4 CSS -->
    <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=" crossorigin="" />
    
    <!-- Custom Modern Stylesheet -->
    <link rel="stylesheet" href="css/style.css">
</head>
<body>

    <!-- ====================================================================
         App Top Header & Brand Bar
         ==================================================================== -->
    <header class="app-header">
        <div class="header-inner">
            <div class="brand-section">
                <div class="brand-icon-wrapper" title="WildTrack Fauna Biosphere">
                    <i class="fa-solid fa-paw"></i>
                </div>
                <div>
                    <h1 class="brand-title">
                        WildTrack
                        <span class="brand-badge">Fauna Tracker</span>
                    </h1>
                    <div class="brand-subtitle">
                        <span>CAPR-F2026 Capstone &bull; Group 3</span>
                        <span class="dot-separator">&bull;</span>
                        <span>Global Biodiversity Explorer (GBIF)</span>
                    </div>
                </div>
            </div>

            <div class="header-actions">
                <div class="status-pill" title="Connected to GBIF Biodiversity Network">
                    <div class="pulse-dot" id="live-indicator"></div>
                    <span>GBIF API Connected</span>
                </div>
                <button class="btn-locate" onclick="useCurrentLocation()" title="Detect fauna near your current location">
                    <i class="fa-solid fa-location-crosshairs"></i>
                    <span>Locate Me</span>
                </button>
            </div>
        </div>
    </header>

    <!-- ====================================================================
         Quick Location Presets Bar
         ==================================================================== -->
    <div class="presets-bar">
        <div class="presets-label">
            <i class="fa-solid fa-compass"></i> Presets:
        </div>
        <div class="presets-list">
            <button class="preset-chip active" onclick="quickSelect('Busan', this)">🇰🇷 Busan</button>
            <button class="preset-chip" onclick="quickSelect('Seoul', this)">🇰🇷 Seoul</button>
            <button class="preset-chip" onclick="quickSelect('Jeju', this)">🏝️ Jeju Island</button>
            <button class="preset-chip" onclick="quickSelect('Ulsan', this)">🌊 Ulsan</button>
            <button class="preset-chip" onclick="quickSelect('Hallasan', this)">⛰️ Hallasan Nat'l Park</button>
            <button class="preset-chip" onclick="quickSelect('Tokyo', this)">🇯🇵 Tokyo</button>
            <button class="preset-chip" onclick="quickSelect('Vancouver', this)">🌲 Vancouver</button>
        </div>
    </div>

    <!-- ====================================================================
         Live Statistics Strip (KPI Metrics)
         ==================================================================== -->
    <section class="stats-strip">
        <div class="stats-grid">
            <div class="stat-item">
                <div class="stat-icon"><i class="fa-solid fa-map-pin"></i></div>
                <div class="stat-meta">
                    <span class="stat-value" id="stat-location">Busan</span>
                    <span class="stat-label">Active Region</span>
                </div>
            </div>

            <div class="stat-item">
                <div class="stat-icon"><i class="fa-solid fa-circle-dot"></i></div>
                <div class="stat-meta">
                    <span class="stat-value" id="stat-radius">10 km</span>
                    <span class="stat-label">Search Radius</span>
                </div>
            </div>

            <div class="stat-item">
                <div class="stat-icon"><i class="fa-solid fa-binoculars"></i></div>
                <div class="stat-meta">
                    <span class="stat-value" id="stat-sightings">0</span>
                    <span class="stat-label">Sightings In Radius</span>
                </div>
            </div>

            <div class="stat-item">
                <div class="stat-icon"><i class="fa-solid fa-dna"></i></div>
                <div class="stat-meta">
                    <span class="stat-value" id="stat-diversity">0 species</span>
                    <span class="stat-label">Species Richness</span>
                </div>
            </div>

            <div class="stat-item">
                <div class="stat-icon"><i class="fa-solid fa-chart-pie"></i></div>
                <div class="stat-meta">
                    <span class="stat-value" id="stat-dominant">&mdash;</span>
                    <span class="stat-label">Dominant Taxon</span>
                </div>
            </div>
        </div>

        <div class="status-feed-text" id="status-feed">
            <i class="fa-solid fa-spinner fa-spin"></i> Initializing wildlife map...
        </div>
    </section>

    <!-- ====================================================================
         Main Dashboard Container (Left Sidebar + Center Map Stage)
         ==================================================================== -->
    <main class="app-container">
        
        <!-- Left Sidebar: Search Filters & Sighting Feed -->
        <aside class="sidebar-panel">
            
            <!-- Filters Card -->
            <div class="card">
                <div class="filter-card-header">
                    <h2 class="card-title">
                        <i class="fa-solid fa-sliders text-emerald"></i>
                        Distribution Filters
                    </h2>
                    <p class="card-desc">Target specific animal classes, radiuses, or time windows.</p>
                </div>

                <div class="filter-card-body">
                    <!-- Search Input -->
                    <div class="search-group">
                        <i class="fa-solid fa-magnifying-glass search-icon"></i>
                        <input type="text" id="location-input" class="search-input" placeholder="Search city or location (e.g., Busan)..." value="Busan">
                        <button id="search-btn" class="search-btn" onclick="handleSearch()" title="Search location">
                            <i class="fa-solid fa-arrow-right"></i>
                        </button>
                    </div>

                    <!-- Taxon Group Selector -->
                    <div>
                        <span class="filter-label">Fauna Category</span>
                        <div class="taxon-grid">
                            <button class="taxon-btn active" data-taxon="">
                                <span class="icon">🐾</span>
                                <span class="name">All Animals</span>
                            </button>
                            <button class="taxon-btn" data-taxon="212">
                                <span class="icon">🦅</span>
                                <span class="name">Birds</span>
                            </button>
                            <button class="taxon-btn" data-taxon="359">
                                <span class="icon">🐺</span>
                                <span class="name">Mammals</span>
                            </button>
                            <button class="taxon-btn" data-taxon="216">
                                <span class="icon">🦋</span>
                                <span class="name">Insects</span>
                            </button>
                            <button class="taxon-btn" data-taxon="131">
                                <span class="icon">🐸</span>
                                <span class="name">Amphibians</span>
                            </button>
                            <button class="taxon-btn" data-taxon="358">
                                <span class="icon">🦎</span>
                                <span class="name">Reptiles</span>
                            </button>
                            <button class="taxon-btn" data-taxon="204">
                                <span class="icon">🐟</span>
                                <span class="name">Fishes</span>
                            </button>
                            <button class="taxon-btn" data-taxon="52">
                                <span class="icon">🐚</span>
                                <span class="name">Molluscs</span>
                            </button>
                            <button class="taxon-btn" data-taxon="other">
                                <span class="icon">🐾</span>
                                <span class="name">Other Fauna</span>
                            </button>
                        </div>
                    </div>

                    <!-- Radius & Records Limit -->
                    <div class="controls-row">
                        <div class="control-field">
                            <label for="radius-select" class="filter-label">Search Radius</label>
                            <select id="radius-select" class="custom-select">
                                <option value="5">5 km range</option>
                                <option value="10" selected>10 km range</option>
                                <option value="25">25 km range</option>
                                <option value="50">50 km range</option>
                                <option value="100">100 km range</option>
                            </select>
                        </div>

                        <div class="control-field">
                            <label for="limit-select" class="filter-label">Max Records</label>
                            <select id="limit-select" class="custom-select">
                                <option value="30">30 records</option>
                                <option value="75" selected>75 records</option>
                                <option value="150">150 records</option>
                                <option value="300">300 records</option>
                            </select>
                        </div>
                    </div>

                    <!-- Date Range Accordion (Advanced) -->
                    <button type="button" class="filter-accordion-toggle" id="toggle-date-filter">
                        <i class="fa-solid fa-calendar-days"></i> Filter by Observation Date
                    </button>
                    <div class="filter-date-inputs" id="date-filter-box">
                        <div class="date-field">
                            <label for="date-from" class="filter-label">From Date</label>
                            <input type="date" id="date-from">
                        </div>
                        <div class="date-field">
                            <label for="date-to" class="filter-label">To Date</label>
                            <input type="date" id="date-to">
                        </div>
                    </div>

                    <button class="filter-action-btn" onclick="handleSearch()">
                        <i class="fa-solid fa-satellite-dish"></i> Query Sightings
                    </button>
                </div>
            </div>

            <!-- Sightings Feed & Analytics Card -->
            <div class="card feed-card">
                <div class="feed-tabs">
                    <button class="feed-tab active" id="tab-feed">
                        <i class="fa-solid fa-list-ul"></i> Sightings (<span id="feed-count-badge">0</span>)
                    </button>
                    <button class="feed-tab" id="tab-analytics">
                        <i class="fa-solid fa-chart-simple"></i> Class Diversity
                    </button>
                </div>

                <!-- Sighting Cards List -->
                <div class="feed-content" id="feed-list">
                    <!-- Populated via app.js -->
                </div>

                <!-- Taxon Diversity Analytics Panel -->
                <div class="analytics-panel" id="analytics-content">
                    <!-- Populated via app.js -->
                </div>
            </div>

        </aside>

        <!-- Center Stage: Map Area & Floating Overlays -->
        <section class="map-stage">
            <div class="map-wrapper">
                <div id="map"></div>

                <!-- Quick Map Overlay Actions (Recenter, Toggle Circle) -->
                <div class="map-action-bar">
                    <button class="map-action-btn" onclick="recenterMap()" title="Recenter on current query point">
                        <i class="fa-solid fa-crosshairs"></i>
                    </button>
                    <button class="map-action-btn" onclick="toggleRadius()" title="Toggle radius perimeter circle">
                        <i class="fa-regular fa-circle-dot"></i>
                    </button>
                </div>

                <!-- Floating Interactive Legend -->
                <div class="map-legend-overlay">
                    <span class="legend-title">Taxa:</span>
                    <div class="legend-chip"><span class="legend-dot" style="background:var(--taxon-aves);"></span> Birds</div>
                    <div class="legend-chip"><span class="legend-dot" style="background:var(--taxon-mammalia);"></span> Mammals</div>
                    <div class="legend-chip"><span class="legend-dot" style="background:var(--taxon-insecta);"></span> Insects</div>
                    <div class="legend-chip"><span class="legend-dot" style="background:var(--taxon-amphibia);"></span> Amphibians</div>
                    <div class="legend-chip"><span class="legend-dot" style="background:var(--taxon-reptilia);"></span> Reptiles</div>
                    <div class="legend-chip"><span class="legend-dot" style="background:#06b6d4;"></span> Fishes</div>
                    <div class="legend-chip"><span class="legend-dot" style="background:#14b8a6;"></span> Molluscs</div>
                    <div class="legend-chip"><span class="legend-dot" style="background:var(--taxon-other);"></span> Other</div>
                </div>

                <!-- Map Loading Spinner Overlay -->
                <div class="map-loading-overlay" id="map-loader">
                    <div class="spinner"></div>
                    <span class="loader-text">Loading GBIF data...</span>
                </div>

                <!-- Slide-over / Floating Species Detail Inspector -->
                <div class="species-drawer" id="species-drawer">
                    <div class="drawer-header">
                        <div>
                            <span class="brand-badge" style="margin-bottom: 0.35rem; display: inline-block;">Observation Inspector</span>
                            <h3 class="card-title" style="margin: 0;">Species Profile</h3>
                        </div>
                        <button class="drawer-close" onclick="closeSpeciesDrawer()" title="Close details">
                            <i class="fa-solid fa-xmark"></i>
                        </button>
                    </div>

                    <div class="drawer-scroll-body">
                        <!-- Species Photo Media -->
                        <div class="species-hero-photo-wrapper">
                            <img src="" alt="Species photo" id="drawer-species-photo" class="species-hero-photo">
                            <div class="photo-fallback" id="drawer-photo-fallback">
                                <span class="photo-fallback-icon">🐾</span>
                                <span class="fallback-text">Searching media archive...</span>
                            </div>
                        </div>

                        <!-- Species Identity -->
                        <div class="species-title-group">
                            <h4 class="species-common-title" id="drawer-common-name">Common Name</h4>
                            <p class="species-scientific-title" id="drawer-scientific-name">Scientific Name</p>
                        </div>

                        <!-- Taxonomic Hierarchy Breadcrumbs -->
                        <div>
                            <span class="filter-label">Taxonomic Hierarchy</span>
                            <div class="taxonomy-chain" id="drawer-taxonomy">
                                <!-- Populated dynamically -->
                            </div>
                        </div>

                        <!-- Observation Record Metadata -->
                        <div>
                            <span class="filter-label">Occurrence Details</span>
                            <div class="observation-meta-card">
                                <div class="meta-row">
                                    <span class="meta-label"><i class="fa-regular fa-calendar"></i> Observed Date</span>
                                    <span class="meta-val" id="meta-date">&mdash;</span>
                                </div>
                                <div class="meta-row">
                                    <span class="meta-label"><i class="fa-solid fa-location-dot"></i> Locality</span>
                                    <span class="meta-val" id="meta-locality">&mdash;</span>
                                </div>
                                <div class="meta-row">
                                    <span class="meta-label"><i class="fa-solid fa-compass"></i> Coordinates</span>
                                    <span class="meta-val" id="meta-coords" style="font-family: var(--font-mono); font-size: 0.74rem;">&mdash;</span>
                                </div>
                                <div class="meta-row">
                                    <span class="meta-label"><i class="fa-solid fa-hashtag"></i> Record Key</span>
                                    <span class="meta-val" id="meta-id" style="font-family: var(--font-mono); font-size: 0.74rem;">&mdash;</span>
                                </div>
                            </div>
                        </div>

                        <!-- External Links & Actions -->
                        <div class="drawer-actions">
                            <button class="btn-locate" onclick="copyCoordinates()" style="background: var(--slate-100); color: var(--slate-800); border-color: var(--slate-300); justify-content: center;">
                                <i class="fa-regular fa-copy"></i> Copy Coordinates
                            </button>
                            <a href="#" id="drawer-gbif-btn" target="_blank" rel="noopener noreferrer" class="btn-gbif">
                                <span>Explore on GBIF Network</span>
                                <i class="fa-solid fa-arrow-up-right-from-square"></i>
                            </a>
                        </div>
                    </div>
                </div>

            </div>
        </section>

    </main>

    <!-- Toast Notification Container -->
    <div class="toast-container" id="toast-container"></div>

    <!-- ====================================================================
         App Footer & Capstone Credits
         ==================================================================== -->
    <footer class="app-footer">
        <div class="footer-inner">
            <div>
                <strong>Wildlife Sighting Mapping &amp; Species Distribution Tracker</strong> &mdash; Capstone Project CAPR-F2026
            </div>
            <div class="footer-team">
                <span>Group 3:</span>
                <span>Gupta Aman Kumar (PM/Frontend)</span>
                <span>&bull;</span>
                <span>Singh Shubham Kumar (Backend)</span>
                <span>&bull;</span>
                <span>Paudel Amrit (Full-stack/QA)</span>
            </div>
        </div>
    </footer>

    <!-- Leaflet JS -->
    <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js" integrity="sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=" crossorigin=""></script>
    <!-- Custom Application Logic -->
    <script src="js/app.js"></script>

</body>
</html>