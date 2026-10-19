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
require_once __DIR__ . '/../../includes/cache.php';

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
    // repeated taxonKey = OR; for Fish the fish orders are added (see FISH_ORDER_KEYS in gbif.php)
    foreach (gbif_expand_taxa($taxa) as $key) $query .= '&taxonKey=' . $key;

    // The ranking of a group changes slowly: a list from the last day is answered from the cache
    $cacheKey = 'top:' . $query;
    if (!($list = cache_get($cacheKey, 86400))) {
        $data = gbif_get(GBIF . '/occurrence/search?' . $query);
        if (!$data) fail(502, 'Could not reach GBIF');
        $list = [
            'total'   => $data['count'] ?? 0,   // all records of the group (in the country, if given)
            'species' => array_map(fn($c) => ['speciesKey' => (int)$c['name'], 'records' => $c['count']],
                                   $data['facets'][0]['counts'] ?? []),
        ];
        cache_put($cacheKey, $list);
    }
    echo json_encode($list);
    exit;
}

if ($action === 'facts') {
    $speciesKey = (int)($_GET['speciesKey'] ?? 0);
    if (!$speciesKey) fail(400, 'speciesKey is required');

    // Missing status (not assessed, or GBIF unreachable) is returned as null, not an error.
    // A status found in the last 7 days is answered from the cache.
    $cacheKey = "facts:$speciesKey";
    if (!($facts = cache_get($cacheKey, 7 * 86400))) {
        $iucn = gbif_get(GBIF . "/species/{$speciesKey}/iucnRedListCategory");
        $facts = ['iucn' => $iucn ? ['code' => $iucn['code'] ?? null, 'category' => $iucn['category'] ?? null] : null];
        if ($iucn) cache_put($cacheKey, $facts);
    }
    echo json_encode($facts);
    exit;
}

fail(400, 'action must be "top" or "facts"');
