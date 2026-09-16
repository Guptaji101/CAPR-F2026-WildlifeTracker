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

// 1. Core taxonomy record
$species = gbif_get("https://api.gbif.org/v1/species/{$speciesKey}");
if (!$species) {
    http_response_code(502);
    echo json_encode(['error' => 'Could not load species details']);
    exit;
}

// 2. Representative photo (species page media — best-effort, may be empty)
$imageUrl = null;
$media = gbif_get("https://api.gbif.org/v1/species/{$speciesKey}/media?limit=1");
if ($media && !empty($media['results'][0]['identifier'])) {
    $imageUrl = $media['results'][0]['identifier'];
}

echo json_encode([
    'speciesKey'     => $speciesKey,
    'scientificName' => $species['scientificName'] ?? $species['canonicalName'] ?? null,
    'vernacularName' => $species['vernacularName'] ?? null,
    'rank'           => $species['rank'] ?? null,
    'kingdom'        => $species['kingdom'] ?? null,
    'phylum'         => $species['phylum'] ?? null,
    'class'          => $species['class'] ?? null,
    'order'          => $species['order'] ?? null,
    'family'         => $species['family'] ?? null,
    'genus'          => $species['genus'] ?? null,
    'imageUrl'       => $imageUrl,
    'gbifUrl'        => "https://www.gbif.org/species/{$speciesKey}",
]);
?>
