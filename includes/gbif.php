<?php
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

    $params = [
        'decimalLatitude'    => $lat,
        'decimalLongitude'   => $lng,
        'radius'             => $radiusKm,
        'limit'              => min($limit, $cfg['limit']),
        'hasCoordinate'      => 'true',
        'hasGeospatialIssue' => 'false',
    ];
    if ($taxonKey) $params['taxonKey'] = $taxonKey;
    if ($fromDate) $params['eventDate'] = $fromDate . ',' . ($toDate ?: date('Y-m-d'));

    $url = $cfg['base_url'] . '/occurrence/search?' . http_build_query($params);

    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT        => $cfg['timeout'],
        CURLOPT_USERAGENT      => 'CAPR-F2026-WildlifeTracker/1.0',
    ]);
    $raw  = curl_exec($ch);
    $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $err  = curl_error($ch);
    curl_close($ch);

    if ($raw === false || $code !== 200) {
        return ['error' => $err ?: "HTTP $code", 'results' => []];
    }
    return json_decode($raw, true) ?: ['error' => 'Invalid JSON', 'results' => []];
}