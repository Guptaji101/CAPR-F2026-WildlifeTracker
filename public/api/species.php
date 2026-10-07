<?php
/**
 * species.php — fetches full taxonomy details and a representative photo
 * for a species, given its GBIF speciesKey (returned in sightings.php results).
 */
header('Content-Type: application/json; charset=utf-8');

$speciesKey = isset($_GET['speciesKey']) ? (int)$_GET['speciesKey'] : null;
if (!$speciesKey) {
    http_response_code(400);
    echo json_encode(['error' => 'speciesKey is required']);
    exit;
}

function gbif_get(string $url): ?array {
    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT        => 15,
        CURLOPT_ENCODING       => '',
        CURLOPT_USERAGENT      => 'CAPR-F2026-WildlifeTracker/1.0 (student project)',
        CURLOPT_HTTPHEADER     => ['Accept: application/json'],
    ]);
    $raw  = curl_exec($ch);
    $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    if ($raw === false || $code !== 200) return null;
    return json_decode($raw, true);
}

// --- species_cache (System Design, Section 4.6) -------------------------------
// The cache is optional: if MySQL can't be reached, every function below fails
// quietly and the endpoint works straight from GBIF, as before.
require_once __DIR__ . '/../../includes/db.php';

const CACHE_DAYS = 30;

// The cached row, with "fresh" = 1 if it is younger than CACHE_DAYS; null if none or no database
function cache_read(int $key): ?array {
    try {
        $st = db()->prepare('SELECT *, cached_at > NOW() - INTERVAL ' . CACHE_DAYS . ' DAY AS fresh
                             FROM species_cache WHERE species_key = ?');
        $st->execute([$key]);
        return $st->fetch() ?: null;
    } catch (Throwable $e) {
        return null;
    }
}

// Add the row, or refresh it if the species is already cached
function cache_save(array $row): void {
    try {
        $cols = array_keys($row);
        $sql  = 'INSERT INTO species_cache (' . implode(', ', $cols) . ')
                 VALUES (' . implode(', ', array_fill(0, count($cols), '?')) . ')
                 ON DUPLICATE KEY UPDATE ' . implode(', ', array_map(fn($c) => "$c = VALUES($c)", $cols)) . ',
                 cached_at = CURRENT_TIMESTAMP';
        db()->prepare($sql)->execute(array_values($row));
    } catch (Throwable $e) {
        // Not saved; the next request simply asks GBIF again
    }
}

// Send a species_cache row to the browser in the same JSON shape as before
function send_species(array $row, string $cacheStatus): void {
    header("X-Cache: $cacheStatus"); // HIT, MISS or STALE, handy for testing
    echo json_encode([
        'speciesKey'     => (int)$row['species_key'],
        'scientificName' => $row['scientific_name'],
        'vernacularName' => $row['vernacular_name'],
        'rank'           => $row['taxon_rank'],
        'kingdom'        => $row['kingdom'],
        'phylum'         => $row['phylum'],
        'class'          => $row['class_name'],
        'order'          => $row['order_name'],
        'family'         => $row['family'],
        'genus'          => $row['genus'],
        'species'        => $row['species'],
        'imageUrl'       => $row['image_url'],
        'gbifUrl'        => "https://www.gbif.org/species/{$row['species_key']}",
    ]);
    exit;
}

// Rules 1-2: a fresh cached row is returned without calling GBIF
$cached = cache_read($speciesKey);
if ($cached && $cached['fresh']) {
    send_species($cached, 'HIT');
}

// Rule 3: otherwise ask GBIF for the taxonomy record...
$species = gbif_get("https://api.gbif.org/v1/species/{$speciesKey}");
if (!$species) {
    // Rule 5: GBIF failed, but an older copy is better than an error (NFR-04)
    if ($cached) send_species($cached, 'STALE');
    http_response_code(502);
    echo json_encode(['error' => 'Could not load species details']);
    exit;
}

// ...and a representative photo (best-effort, may be empty)
$imageUrl = null;
$media = gbif_get("https://api.gbif.org/v1/species/{$speciesKey}/media?limit=1");
if ($media && !empty($media['results'][0]['identifier'])) {
    $imageUrl = $media['results'][0]['identifier'];
}

$row = [
    'species_key'     => $speciesKey,
    'scientific_name' => $species['scientificName'] ?? $species['canonicalName'] ?? null,
    'vernacular_name' => $species['vernacularName'] ?? null,
    'taxon_rank'      => $species['rank'] ?? null,
    'kingdom'         => $species['kingdom'] ?? null,
    'phylum'          => $species['phylum'] ?? null,
    'class_name'      => $species['class'] ?? null,
    'order_name'      => $species['order'] ?? null,
    'family'          => $species['family'] ?? null,
    'genus'           => $species['genus'] ?? null,
    'species'         => $species['species'] ?? null,
    'image_url'       => $imageUrl,
];

// Rule 4: save it for the next visitor, then return it
cache_save($row);
send_species($row, 'MISS');
