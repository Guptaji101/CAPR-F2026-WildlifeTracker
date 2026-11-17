<?php
/**
 * encyclopedia.php — data for the Animal Encyclopedia page. Nothing is stored: GBIF is the
 * database. The cards themselves (names, photo, summary, taxonomy) come from species.php.
 *
 *   ?action=top&taxa=212[,…][&country=KR]   most-recorded species in a group (24 at most)
 *   ?action=facts&speciesKey=2481197         IUCN Red List status (conservation status)
 *   ?action=extras&speciesKey=2440931        a sound of the animal and its sightings per month in
 *                                            South Korea, for the animal window (17 Nov)
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

if ($action === 'extras') {
    $speciesKey = (int)($_GET['speciesKey'] ?? 0);
    if (!$speciesKey) fail(400, 'speciesKey is required');

    // Both change slowly: an answer from the last 7 days is answered from the cache
    $cacheKey = "extras2:$speciesKey";   // extras2: a small sound file first (17 Nov)
    if (!($extras = cache_get($cacheKey, 7 * 86400))) {
        // The 3 questions to GBIF go out at the same time (17 Nov; one after another took ~4 s)
        $sound = fn($where) => GBIF . '/occurrence/search?' . http_build_query(
            ['taxonKey' => $speciesKey, 'mediaType' => 'Sound', 'limit' => 10] + $where);
        [$data, $soundKR, $soundAll] = gbif_get_many([
            // "When to see it": sightings per month in South Korea (GBIF counts them, no records sent)
            GBIF . '/occurrence/search?' . http_build_query(
                ['taxonKey' => $speciesKey, 'country' => 'KR', 'facet' => 'month', 'facetLimit' => 12, 'limit' => 0]),
            $sound(['country' => 'KR']),
            $sound([]),
        ]);
        $months = array_fill(0, 12, 0);
        foreach ($data['facets'][0]['counts'] ?? [] as $c) {
            $m = (int)$c['name'];
            if ($m >= 1 && $m <= 12) $months[$m - 1] = $c['count'];
        }

        // "Listen": a recording of the animal from GBIF (mostly iNaturalist and xeno-canto),
        // recorded in South Korea if there is one, else anywhere. Only formats browsers can play.
        // A small file first (17 Nov): WAV recordings are often 5–20 MB and took long to start,
        // MP3/M4A/OGG are about ten times smaller. Korea still comes first: a WAV from Korea
        // beats an MP3 from elsewhere only when no small file from Korea exists.
        $sound = null;
        $bestRank = 99;
        foreach ([[$soundKR, true], [$soundAll, false]] as $i => [$found, $korea]) {
            foreach ($found['results'] ?? [] as $r) {
                foreach ($r['media'] ?? [] as $m) {
                    $url = $m['identifier'] ?? '';
                    if (($m['type'] ?? '') !== 'Sound' || !str_starts_with($url, 'http')) continue;
                    $format = $m['format'] ?? 'audio/mpeg';
                    if (!preg_match('~audio/(mpeg|mp3|mp4|x-m4a|wav|x-wav|vnd\.wave|ogg)~', $format)) continue;
                    $small = !preg_match('~wav|wave~', $format) && !preg_match('~\.wav(\?|$)~i', $url);
                    $rank = $i * 2 + ($small ? 0 : 1);   // Korea small, Korea WAV, other small, other WAV
                    if ($rank >= $bestRank) continue;
                    $bestRank = $rank;
                    $sound = [
                        'url'     => $url,
                        'credit'  => $m['rightsHolder'] ?? $m['creator'] ?? $r['recordedBy'] ?? '',
                        'license' => short_license($m['license'] ?? null),
                        'record'  => $r['key'],
                        'korea'   => $korea,
                    ];
                }
            }
            if ($bestRank === 0) break;
        }

        $extras = ['months' => $months, 'sound' => $sound];
        if ($data) cache_put($cacheKey, $extras);   // GBIF unreachable: ask again next time
    }
    echo json_encode($extras);
    exit;
}

fail(400, 'action must be "top", "facts" or "extras"');
