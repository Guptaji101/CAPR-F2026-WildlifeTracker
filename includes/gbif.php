<?php
/**
 * gbif.php — GBIF API wrapper with retry + fallback
 */

require_once __DIR__ . '/config.php';

function gbif_config(): array
{
    return app_config()['gbif'];
}

// --- Ray-finned fish -------------------------------------------------------------
// GBIF no longer links most ray-finned fish (carp, loach, snakehead, medaka, …) to their class
// Actinopterygii (key 204): their records have phylum Chordata, an order, but no class. So a
// filter on key 204 missed almost every fish, and the app showed these fish as invertebrates.
// These are the 46 fish orders that GBIF leaves without a class (found 19 Oct 2026 from GBIF's
// own data: chordate orders with records and no class; the sea-squirt relatives Copelata are
// left out because they are not fish).
const FISH_ORDER_KEYS = [
    587, 549, 590, 1153, 538, 588, 1313, 495, 708, 772, 1103, 537, 499, 1068, 547, 548, 1067, 550,
    773, 496, 1306, 497, 498, 1162, 1305, 1308, 774, 1106, 1167, 888, 1163, 1165, 1069, 1307, 1310,
    890, 1104, 889, 494, 1166, 1164, 1312, 1311, 589, 1107, 1105,
];
const FISH_CLASS_KEY = 204;   // Actinopterygii, the Fish key used by the Map page and the Encyclopedia

// When the Fish key is requested, also request the fish orders, so no fish is missed
function gbif_expand_taxa(array $taxonKeys): array {
    return in_array(FISH_CLASS_KEY, $taxonKeys) ? array_values(array_unique([...$taxonKeys, ...FISH_ORDER_KEYS])) : $taxonKeys;
}

// The class of a GBIF record or species; "Actinopterygii" for the fish that GBIF gives no class
function gbif_class(array $r): ?string {
    if (!empty($r['class'])) return $r['class'];
    return in_array((int)($r['orderKey'] ?? 0), FISH_ORDER_KEYS) ? 'Actinopterygii' : null;
}

function gbif_search_nearby(
    float $lat, float $lng, float $radiusKm = 10,
    array $taxonKeys = [], ?string $fromDate = null,
    ?string $toDate = null, int $limit = 50
): array {
    $cfg = gbif_config();

    $safeRadius = min($radiusKm, 100); // GBIF geoDistance accepts up to 100km cleanly

    $params = [
    'geoDistance'   => $lat . ',' . $lng . ',' . $safeRadius . 'km',
    'hasCoordinate' => 'true',
    'kingdomKey'    => 1,
    'limit'         => min($limit, 300),
];
    // "*" leaves the start of the range open, so a To date on its own still applies
    if ($fromDate || $toDate) $params['eventDate'] = ($fromDate ?: '*') . ',' . ($toDate ?: date('Y-m-d'));

    $query = http_build_query($params);
    // GBIF ORs repeated taxonKey parameters, so several animal groups can be requested at once
    foreach (gbif_expand_taxa($taxonKeys) as $key) $query .= '&taxonKey=' . (int)$key;

    $url = $cfg['base_url'] . '/occurrence/search?' . $query;

    // Try up to 3 times with backoff, at most 40 seconds in total. GBIF does not compress its
    // answers (150 records ≈ 1 MB), so on a slow connection a good answer can take 10–20 seconds
    // to arrive: an attempt is therefore only stopped if GBIF cannot be reached within 10 seconds
    // or the data stops flowing (under 2 KB/s for 8 seconds), never while it is still arriving.
    // (A fixed 15-second cut-off threw away slow but working answers and showed sample data.)
    $lastError = null;
    $deadline = microtime(true) + 40;
    for ($attempt = 1; $attempt <= 3; $attempt++) {
        $left = (int)floor($deadline - microtime(true));
        if ($left < 3) break;   // not enough time left for a useful attempt: show the sample data
        $ch = curl_init($url);
        curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER   => true,
    CURLOPT_CONNECTTIMEOUT   => min(10, $left),
    CURLOPT_LOW_SPEED_LIMIT  => 2048,   // bytes per second…
    CURLOPT_LOW_SPEED_TIME   => 8,      // …for 8 seconds = stalled
    CURLOPT_TIMEOUT          => $left,
    CURLOPT_ENCODING       => '',
    CURLOPT_USERAGENT      => 'CAPR-F2026-WildlifeTracker/1.0 (student project)',
    CURLOPT_HTTPHEADER     => ['Accept: application/json'],
]);
        $raw  = curl_exec($ch);
        $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $err  = curl_error($ch);
        curl_close($ch);

        // Success
        if ($raw !== false && $code === 200) {
            $json = json_decode($raw, true);
            if ($json) return $json;
            $lastError = 'Invalid JSON';
        } elseif ($code >= 400 && $code < 500 && $code !== 429) {
            // GBIF is reachable but rejected the request (e.g. a bad date range):
            // retrying won't help, and showing sample data would hide the real problem
            return ['error' => "GBIF rejected the request (HTTP $code)"];
        } else {
            $lastError = $err ?: "HTTP $code";
        }

        // Wait before retrying (1s, 2s, 3s)
        if ($attempt < 3) sleep($attempt);
    }

    // All retries failed — return sample fallback
    return [
        'error'     => $lastError,
        'fallback'  => true,
        'results'   => gbif_sample_fallback($lat, $lng),
        'count'     => 5,
    ];
}

/**
 * Sample fallback data used when GBIF is unavailable.
 * Ensures the app NEVER shows a broken demo.
 */
function gbif_sample_fallback(float $lat, float $lng): array
{
    // Real GBIF records from around Busan (sampled earlier)
    return [
        [
            'key' => 1, 'speciesKey' => 8381387,
            'scientificName' => 'Reishia bronni (Dunker, 1860)',
            'vernacularName' => null,
            'class' => 'Gastropoda',
            'decimalLatitude' => $lat + 0.02,
            'decimalLongitude' => $lng + 0.02,
            'eventDate' => '2012-07-27',
            'country' => 'Korea, Republic of',
            'locality' => 'Saha-gu',
        ],
        [
            'key' => 2, 'speciesKey' => 2481197,
            'scientificName' => 'Larus crassirostris',
            'vernacularName' => 'Black-tailed Gull',
            'class' => 'Aves',
            'decimalLatitude' => $lat - 0.03,
            'decimalLongitude' => $lng + 0.01,
            'eventDate' => '2020-05-14',
            'country' => 'Korea, Republic of',
            'locality' => 'Busan',
        ],
        [
            'key' => 3, 'speciesKey' => 5231198,
            'scientificName' => 'Passer montanus',
            'vernacularName' => 'Eurasian Tree Sparrow',
            'class' => 'Aves',
            'decimalLatitude' => $lat + 0.01,
            'decimalLongitude' => $lng - 0.02,
            'eventDate' => '2019-08-02',
            'country' => 'Korea, Republic of',
            'locality' => 'Busanjin-gu',
        ],
        [
            'key' => 4, 'speciesKey' => 2437761,
            'scientificName' => 'Apodemus agrarius',
            'vernacularName' => 'Striped Field Mouse',
            'class' => 'Mammalia',
            'decimalLatitude' => $lat - 0.01,
            'decimalLongitude' => $lng - 0.01,
            'eventDate' => '2018-10-11',
            'country' => 'Korea, Republic of',
            'locality' => 'Busan',
        ],
        [
            'key' => 5, 'speciesKey' => 2440954,
            'scientificName' => 'Cervus nippon',
            'vernacularName' => 'Sika Deer',
            'class' => 'Mammalia',
            'decimalLatitude' => $lat + 0.04,
            'decimalLongitude' => $lng + 0.03,
            'eventDate' => '2017-04-08',
            'country' => 'Korea, Republic of',
            'locality' => 'Gyeongsangnam-do',
        ],
    ];
}

/**
 * Simple GET request to GBIF (one attempt). Returns the decoded JSON, or null on any error.
 * Used by species.php and encyclopedia.php.
 */
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
