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

// The most records one sightings search may load. GBIF sends at most 300 per request, so above 300
// they come in pages (gbif_occurrence_records), fetched at the same time.
const GBIF_MAX_RECORDS = 1000;

// Up to $want records of one search (0 = only the count). GBIF sends at most 300 records per
// request, and each request arrives at only about 140 KB/s (300 records ≈ 2 MB ≈ 14 s, measured
// 9 Nov 2026). So a larger number is asked for in pages of 300 ("offset") all at the same time
// (curl_multi): 1000 records then take about as long as 300. Up to 300 records: one request with
// retries, as before. If the first page fails, it is tried again with retries; another page that
// fails is left out.
function gbif_occurrence_records(string $url, int $want, float $deadline): array
{
    if ($want <= 300) return gbif_occurrence_request($url . '&limit=' . $want . '&offset=0', $deadline);

    $mh = curl_multi_init();
    $handles = [];
    for ($offset = 0; $offset < $want; $offset += 300) {
        $ch = curl_init($url . '&limit=' . min(300, $want - $offset) . '&offset=' . $offset);
        curl_setopt_array($ch, gbif_curl_options(max(3, (int)floor($deadline - microtime(true)))));
        curl_multi_add_handle($mh, $ch);
        $handles[$offset] = $ch;
    }
    do {
        $status = curl_multi_exec($mh, $running);
        if ($running) curl_multi_select($mh);
    } while ($running && $status === CURLM_OK);
    $pages = [];
    foreach ($handles as $offset => $ch) {
        $page = json_decode((string)curl_multi_getcontent($ch), true);
        if (curl_getinfo($ch, CURLINFO_HTTP_CODE) === 200 && $page) $pages[$offset] = $page;
        curl_multi_remove_handle($mh, $ch);
        curl_close($ch);
    }
    curl_multi_close($mh);

    // The first page gives the total; without it, ask for it once more with retries
    $pages[0] ??= gbif_occurrence_request($url . '&limit=300&offset=0', $deadline);
    if (isset($pages[0]['error'])) return $pages[0];
    $records = [];
    foreach ($pages as $page) $records = array_merge($records, $page['results'] ?? []);
    return ['count' => $pages[0]['count'] ?? 0, 'results' => $records];
}

// cURL settings for a GBIF request with $left seconds to go. GBIF does not compress its answers
// (150 records ≈ 1 MB), so on a slow connection a good answer can take 10–20 seconds to arrive: a
// request is therefore only stopped if GBIF cannot be reached within 10 seconds or the data stops
// flowing (under 2 KB/s for 8 seconds), never while it is still arriving.
function gbif_curl_options(int $left): array
{
    return [
        CURLOPT_RETURNTRANSFER   => true,
        CURLOPT_CONNECTTIMEOUT   => min(10, $left),
        CURLOPT_LOW_SPEED_LIMIT  => 2048,   // bytes per second…
        CURLOPT_LOW_SPEED_TIME   => 8,      // …for 8 seconds = stalled
        CURLOPT_TIMEOUT          => $left,
        CURLOPT_ENCODING         => '',
        CURLOPT_USERAGENT        => 'CAPR-F2026-WildlifeTracker/1.0 (student project)',
        CURLOPT_HTTPHEADER       => ['Accept: application/json'],
    ];
}

function gbif_search_nearby(
    float $lat, float $lng, float $radiusKm = 10,
    array $taxonKeys = [], ?string $fromDate = null,
    ?string $toDate = null, int $limit = 50
): array {
    $cfg = gbif_config();
    $limit = min($limit, GBIF_MAX_RECORDS);
    $safeRadius = min($radiusKm, 100); // GBIF geoDistance accepts up to 100km cleanly

    $query = http_build_query([
        'geoDistance'   => $lat . ',' . $lng . ',' . $safeRadius . 'km',
        'hasCoordinate' => 'true',
        'kingdomKey'    => 1,
    ]);
    // GBIF ORs repeated taxonKey parameters, so several animal groups can be requested at once
    foreach (gbif_expand_taxa($taxonKeys) as $key) $query .= '&taxonKey=' . (int)$key;

    // Newest records first. GBIF cannot sort by date: it returns records in its own order (near
    // Busan on 9 Nov 2026 the first 300 were from January to May, though records up to November
    // existed). So ask for the last month first, then the rest of the last year, then older
    // records, each time only for as many records as are still missing (0 = just the count).
    // A From/To date chosen by the user limits the windows.
    $end = $toDate ?: date('Y-m-d');
    $windows = [];
    $upper = $end;
    foreach (['-1 month', '-1 year', null] as $back) {
        $lower = $back ? date('Y-m-d', strtotime($back, strtotime($end))) : null;
        $last = $lower === null || ($fromDate && $lower <= $fromDate);
        if ($fromDate && ($lower === null || $lower < $fromDate)) $lower = $fromDate;
        $windows[] = ($lower ?? '*') . ',' . $upper;   // "*" leaves the start open
        if ($last) break;
        $upper = date('Y-m-d', strtotime('-1 day', strtotime($lower)));
    }

    // One deadline for all requests together: at most 40 seconds, as before
    $deadline = microtime(true) + 40;
    $results = [];
    $total = 0;
    foreach ($windows as $i => $range) {
        // Without From/To dates the last request has no date filter, so records without a date
        // still count and can be shown (55 of 93 deer records near Ulsan have none). It also gives
        // the full total. It may repeat records of the earlier windows, so it asks for enough
        // extra records to cover those repeats; they are removed below.
        $open = !$fromDate && !$toDate && $i === count($windows) - 1;
        $missing = $limit - count($results);
        $url = $cfg['base_url'] . '/occurrence/search?' . $query . ($open ? '' : '&eventDate=' . urlencode($range));
        $want = $open ? ($missing > 0 ? $limit : 0) : $missing;
        $json = gbif_occurrence_records($url, $want, $deadline);
        if (isset($json['error'])) {
            if ($i > 0) break;   // the newer records arrived: show them rather than sample data
            if (!empty($json['rejected'])) return ['error' => $json['error']];
            // GBIF unreachable: return sample fallback (NFR-04)
            return [
                'error'     => $json['error'],
                'fallback'  => true,
                'results'   => gbif_sample_fallback($lat, $lng),
                'count'     => 5,
            ];
        }
        // The open request counts every record, the windows only their own part
        $total = $open ? ($json['count'] ?? 0) : $total + ($json['count'] ?? 0);
        foreach ($json['results'] ?? [] as $r) $results[$r['key'] ?? count($results)] ??= $r;   // no repeats
    }
    // Within a window GBIF's order is not by date either, so sort the whole list (records
    // without a date go last) and keep the number of records asked for
    $results = array_values($results);
    usort($results, fn($a, $b) => strcmp($b['eventDate'] ?? '', $a['eventDate'] ?? ''));
    return ['count' => $total, 'results' => array_slice($results, 0, $limit)];
}

// One GBIF occurrence search with retries. Returns GBIF's JSON, or ['error' => …] with
// 'rejected' => true when GBIF refused the request (retrying or sample data would not help).
function gbif_occurrence_request(string $url, float $deadline): array
{
    // Try up to 3 times with backoff, within the deadline (settings: gbif_curl_options).
    // (A fixed 15-second cut-off threw away slow but working answers and showed sample data.)
    $lastError = 'No time left for GBIF';
    for ($attempt = 1; $attempt <= 3; $attempt++) {
        $left = (int)floor($deadline - microtime(true));
        if ($left < 3) break;   // not enough time left for a useful attempt
        $ch = curl_init($url);
        curl_setopt_array($ch, gbif_curl_options($left));
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
            return ['error' => "GBIF rejected the request (HTTP $code)", 'rejected' => true];
        } else {
            $lastError = $err ?: "HTTP $code";
        }

        // Wait before retrying (1s, 2s, 3s)
        if ($attempt < 3) sleep($attempt);
    }
    return ['error' => $lastError];
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
 * Used by species.php and encyclopedia.php. The optional $status receives GBIF's HTTP status
 * (0 if GBIF could not be reached), so a caller can tell "not found" (404) from an outage.
 */
function gbif_get(string $url, ?int &$status = null): ?array {
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
    $status = $raw === false ? 0 : (int)$code;
    if ($raw === false || $code !== 200) return null;
    return json_decode($raw, true);
}
