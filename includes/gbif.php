<?php
/**
 * gbif.php — GBIF API wrapper with retry + fallback
 */

function gbif_config(): array
{
    $config = require __DIR__ . '/../config/config.php';
    return $config['gbif'];
}

function gbif_search_nearby(
    float $lat, float $lng, float $radiusKm = 10,
    ?string $taxonKey = null, ?string $fromDate = null,
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
    if ($taxonKey) $params['taxonKey'] = $taxonKey;
    if ($fromDate) $params['eventDate'] = $fromDate . ',' . ($toDate ?: date('Y-m-d'));

    $url = $cfg['base_url'] . '/occurrence/search?' . http_build_query($params);

    // Try up to 3 times with backoff
    $lastError = null;
    for ($attempt = 1; $attempt <= 3; $attempt++) {
        $ch = curl_init($url);
        curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_TIMEOUT        => $cfg['timeout'],
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
            'key' => 2, 'speciesKey' => 2435099,
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
            'key' => 3, 'speciesKey' => 2436435,
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
            'key' => 4, 'speciesKey' => 5219243,
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
            'key' => 5, 'speciesKey' => 2440946,
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