<?php
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');

require_once __DIR__ . '/../../includes/gbif.php';
require_once __DIR__ . '/../../includes/cache.php';

if (!isset($_GET['lat'], $_GET['lng'])) {
    http_response_code(400);
    echo json_encode(['error' => 'lat and lng are required']);
    exit;
}
// Text such as "abc" would become 0 with (float) and search the sea off Africa: refuse it
if (!is_numeric($_GET['lat']) || !is_numeric($_GET['lng'])
        || abs((float)$_GET['lat']) > 90 || abs((float)$_GET['lng']) > 180) {
    http_response_code(400);
    echo json_encode(['error' => 'lat and lng must be numbers (lat -90 to 90, lng -180 to 180)']);
    exit;
}
$lat = (float)$_GET['lat'];
$lng = (float)$_GET['lng'];

$radius = isset($_GET['radius']) ? (float)$_GET['radius'] : 10;
// The page offers 5 to 100 km; anything else is refused here (16 Nov: a negative radius gave a
// GBIF error, 99999 km a 40-second search)
if ($radius < 1 || $radius > 100) {
    http_response_code(400);
    echo json_encode(['error' => 'radius must be between 1 and 100 km']);
    exit;
}
// Comma-separated GBIF taxon keys for the selected animal groups; empty = all animals
$taxa   = array_values(array_filter(array_map('intval', explode(',', $_GET['taxa'] ?? ''))));
$from   = $_GET['from']  ?? null;
$to     = $_GET['to']    ?? null;
// At least 1 record (a negative limit made GBIF fall back to its default of 20), at most 1000
// (GBIF_MAX_RECORDS in gbif.php; more than 300 are fetched in pages)
$limit  = min(GBIF_MAX_RECORDS, max(1, isset($_GET['limit']) ? (int)$_GET['limit'] : 50));

// Dates must be real dates in YYYY-MM-DD and in order; GBIF rejects anything else
// (checkdate() also refuses dates that look right but don't exist, such as 2025-13-45)
foreach (['From' => $from, 'To' => $to] as $label => $date) {
    if ($date && (!preg_match('/^(\d{4})-(\d{2})-(\d{2})$/', $date, $m) || !checkdate((int)$m[2], (int)$m[3], (int)$m[1]))) {
        http_response_code(400);
        echo json_encode(['error' => "Invalid $label date (use YYYY-MM-DD)"]);
        exit;
    }
}
if ($from && $to && $from > $to) {
    http_response_code(400);
    echo json_encode(['error' => 'The From date must be on or before the To date']);
    exit;
}

// The same search in the last 6 hours (same place, radius, groups, dates and limit) is answered
// from the cache: GBIF needs 2–20 seconds, the cache a few milliseconds. New records reach GBIF
// slowly (days after the sighting), so a 6-hour-old answer is still up to date. (Was 1 hour
// until 16 Nov: most visitors then waited for GBIF, because the keep-awake job runs only every
// few hours.)
// ("sightings5": cleaner place names since 16 Nov; older cached answers are not reused)
$cacheKey = 'sightings5:' . json_encode([$lat, $lng, $radius, $taxa, $from, $to, $limit]);
if ($cached = cache_get($cacheKey, 6 * 3600)) {
    echo json_encode($cached);
    exit;
}

$data = gbif_search_nearby($lat, $lng, $radius, $taxa, $from, $to, $limit);

// NFR-04: when GBIF is unreachable, gbif.php returns sample data flagged as a
// fallback. Pass it on so the map isn't empty; report any other error as-is.
if (isset($data['error']) && empty($data['fallback'])) {
    http_response_code(502);
    echo json_encode(['error' => $data['error']]);
    exit;
}

$rawResults = $data['results'] ?? [];

// Where the animal was seen, as exactly as the record says. Most records have no "locality" but a
// "verbatimLocality" such as "Gwaebeop-dong, Busan, Busan, KR": keep its parts once each, without
// the country (shown separately), and add the province if it is not in it yet.
function place_name(array $r): ?string
{
    $text = $r['locality'] ?? $r['verbatimLocality'] ?? $r['municipality'] ?? '';
    $parts = [];
    $country = ['kr', 'korea', 'south korea', 'republic of korea', 'korea, republic of', '대한민국'];
    foreach (explode(',', $text) as $p) {
        // the country inside a part is left out too ("대한민국 부산광역시 해운대구", "… 부산광역시 대한민국")
        $p = trim(preg_replace('/^(대한민국|south korea|republic of korea)\s+|\s+(대한민국|south korea)$/iu', '', trim($p)));
        if ($p === '' || in_array(mb_strtolower($p), $country)) continue;
        // Codes are no place names for people (16 Nov): map codes ("427X+HJ", Google plus codes)
        // and region codes ("KR-PU")
        if (preg_match('/^[23456789CFGHJMPQRVWX]{4,8}\+[23456789CFGHJMPQRVWX]{0,3}$/i', $p)
            || preg_match('/^KR-[A-Z0-9]{1,3}$/i', $p)) continue;
        $parts[mb_strtolower($p)] ??= $p;
    }
    // GBIF's province is added only when the place does not name a city or province yet: GBIF
    // sometimes files a record under the wrong one ("Jung-gu, Busan" + Incheon; both cities have
    // a Jung-gu)
    $province = trim($r['stateProvince'] ?? '');
    if ($province !== '' && !in_array(mb_strtolower($province), $country) && !preg_match('/' . KOREA_PROVINCES . '/iu', implode(' ', $parts))) {
        $parts[mb_strtolower($province)] ??= $province;
    }
    return $parts ? implode(', ', $parts) : null;
}

// The cities and provinces of South Korea, in English and Korean (for place_name above)
const KOREA_PROVINCES = 'seoul|busan|daegu|incheon|gwangju|daejeon|ulsan|sejong|gyeonggi|gangwon|chungcheong|chungbuk|'
    . 'chungnam|jeolla|jeonbuk|jeonnam|gyeongsang|gyeongbuk|gyeongnam|jeju|'
    . '서울|부산|대구|인천|광주|대전|울산|세종|경기|강원|충청|충북|충남|전라|전북|전남|경상|경북|경남|제주';

$results = array_map(fn($r) => [
    'key'            => $r['key'] ?? null,
    'speciesKey'     => $r['speciesKey'] ?? null,
    'scientificName' => $r['scientificName'] ?? null,
    'commonName'     => $r['vernacularName'] ?? null,
    'species'        => $r['species'] ?? null,
    'taxonGroup'     => gbif_class($r) ?? $r['phylum'] ?? null,   // decides the group, color and icon
    'phylum'         => $r['phylum'] ?? null,
    'image'          => $r['media'][0]['identifier'] ?? null,
    // who took the photo and its licence, shown in the photo viewer (#17)
    'imageCredit'    => $r['media'][0]['rightsHolder'] ?? $r['media'][0]['creator'] ?? $r['recordedBy'] ?? null,
    'imageLicense'   => short_license($r['media'][0]['license'] ?? null),
    'lat'            => $r['decimalLatitude'] ?? null,
    'lng'            => $r['decimalLongitude'] ?? null,
    'eventDate'      => $r['eventDate'] ?? null,
    'country'        => $r['country'] ?? null,
    'locality'       => place_name($r),
    'updated'        => $r['modified'] ?? null,   // when the record was last changed at its source
], $rawResults);

// total = all matching records in GBIF, so the page can say "Showing 75 of 11,247"
$response = ['count' => count($results), 'total' => $data['count'] ?? count($results), 'results' => $results];
if (!empty($data['fallback'])) {
    $response['fallback'] = true;
    $response['reason']   = $data['error'];
} else {
    cache_put($cacheKey, $response);   // sample data is never cached: the next search tries GBIF again
}
echo json_encode($response);
