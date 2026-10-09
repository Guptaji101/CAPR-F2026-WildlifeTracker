<?php
// partials/header.php - the top bar shared by every page, plus the About dialog.
// Set $page = 'map' or 'encyclopedia' before including it, to highlight the current page.
$page = $page ?? 'map';
?>
    <!-- Top bar: stays at the top of the window while the page scrolls (position: sticky) -->
    <header class="topbar">
        <a class="brand" href="index.php" title="WildTrack map">
            <i class="fa-solid fa-paw brand-icon"></i>
            <span class="brand-name">WildTrack</span>
        </a>
        <span class="brand-divider"></span>
        <span class="brand-subtitle">Wildlife Sighting Mapping and Species Distribution Tracker</span>

        <nav class="top-nav">
            <a href="index.php" class="<?= $page === 'map' ? 'active' : '' ?>"><i class="fa-regular fa-map"></i> Map</a>
            <a href="encyclopedia.php" class="<?= $page === 'encyclopedia' ? 'active' : '' ?>"><i class="fa-solid fa-book-open"></i> Encyclopedia</a>
            <button type="button" onclick="document.getElementById('about-dialog').showModal()"><i class="fa-solid fa-circle-info"></i> About</button>
        </nav>
    </header>

    <!-- About dialog -->
    <dialog id="about-dialog">
        <h2>About WildTrack</h2>
        <p>WildTrack shows real animal sightings recorded near any place, using open data from the
           Global Biodiversity Information Facility (GBIF). The Encyclopedia describes the most
           recorded animals in each group, with summaries from Wikipedia. No account is needed.</p>
        <p class="about-small">CAPR-F2026 Capstone &bull; Group 3: Gupta Aman Kumar, Singh Shubham Kumar, Paudel Amrit.<br>
           Occurrence data: GBIF.org &bull; Summaries: Wikipedia (CC BY-SA) &bull; Maps: &copy; OpenStreetMap contributors, Esri.</p>
        <form method="dialog"><button class="btn-primary">Close</button></form>
    </dialog>
