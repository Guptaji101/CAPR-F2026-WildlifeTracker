<?php
/**
 * encyclopedia.php — data for the Animal Encyclopedia page. Nothing is stored: GBIF is the
 * database. The cards themselves (names, photo, summary, taxonomy) come from species.php.
 *
 *   ?action=top&taxa=212[,…][&country=KR]   most-recorded species in a group (24 at most)
 *   ?action=facts&speciesKey=2481197         IUCN Red List status (conservation status)
 */
header('Content-Type: application/json; charset=utf-8');
require_once __DIR__ . '/../../includes/gbif.php';

const GBIF = 'https://api.gbif.org/v1';

function fail(int $code, string $message): void {
    http_response_code($code);
    echo json_encode(['error' => $message]);
    exit;
}

$action = $_GET['action'] ?? '';

if ($action === 'top') {
    // Same "taxa" parameter as sightings.php: comma-separated GBIF taxon keys of one group
    $taxa = array_values(array_filter(array_map('intval', explode(',', $_GET['taxa'] ?? ''))));
    if (!$taxa) fail(400, 'taxa is required');
    $country = strtoupper($_GET['country'] ?? '');
    if ($country !== '' && !preg_match('/^[A-Z]{2}$/', $country)) fail(400, 'country must be a 2-letter code');

    // limit=0 skips the records themselves; the speciesKey facet counts records per species,
    // so the first entries are the most-recorded (best-known) species of the group
    $query = http_build_query(['limit' => 0, 'facet' => 'speciesKey', 'facetLimit' => 24]
        + ($country ? ['country' => $country] : []));
    foreach ($taxa as $key) $query .= '&taxonKey=' . $key;   // repeated taxonKey = OR

    $data = gbif_get(GBIF . '/occurrence/search?' . $query);
    if (!$data) fail(502, 'Could not reach GBIF');

    echo json_encode([
        'total'   => $data['count'] ?? 0,   // all records of the group (in the country, if given)
        'species' => array_map(fn($c) => ['speciesKey' => (int)$c['name'], 'records' => $c['count']],
                               $data['facets'][0]['counts'] ?? []),
    ]);
    exit;
}

if ($action === 'facts') {
    $speciesKey = (int)($_GET['speciesKey'] ?? 0);
    if (!$speciesKey) fail(400, 'speciesKey is required');

    // Missing status (not assessed, or GBIF unreachable) is returned as null, not an error
    $iucn = gbif_get(GBIF . "/species/{$speciesKey}/iucnRedListCategory");
    echo json_encode([
        'iucn' => $iucn ? ['code' => $iucn['code'] ?? null, 'category' => $iucn['category'] ?? null] : null,
    ]);
    exit;
}

fail(400, 'action must be "top" or "facts"');
