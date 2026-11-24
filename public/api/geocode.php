<?php
/**
 * geocode.php — turns a place name (e.g. "Ulsan") into coordinates
 * using OpenStreetMap's free Nominatim service.
 * Only places in South Korea are returned: WildTrack is about Korea's fauna, and it stops
 * names such as "Gwangju" or "Jung-gu" from landing in another country.
 *
 * When Nominatim cannot be reached (#28, 24 Nov 2026: it refused the shared Render servers, so
 * Enter in the place search showed "Could not reach location search service"), the place is
 * asked from Photon (the service of the place suggestions) and then looked up in the built-in
 * list public/data/korea-places.json. Nominatim is then not asked again for 10 minutes.
 */
header('Content-Type: application/json; charset=utf-8');
require_once __DIR__ . '/../../includes/cache.php';

const USER_AGENT = 'CAPR-F2026-WildlifeTracker/1.0 (student capstone project; https://github.com/Guptaji101/CAPR-F2026-WildlifeTracker)';

$q = isset($_GET['q']) ? trim($_GET['q']) : '';
if ($q === '') {
    http_response_code(400);
    echo json_encode(['error' => 'Missing search query']);
    exit;
}

// Places don't move: a place found in the last 30 days is answered from the cache.
// (Nominatim's usage policy also asks apps to cache results instead of asking again.)
$cacheKey = 'geo2:' . mb_strtolower($q);   // geo2: answers from Photon without roads (#28)
if ($cached = cache_get($cacheKey, 30 * 86400)) {
    echo json_encode($cached);
    exit;
}

// 1. Nominatim (skipped for 10 minutes after it failed)
$reached = false;   // did any service answer? (then "not found" is a real answer)
$place = null;
if (!cache_get('geo:nominatim-down', 600)) {
    [$data, $ok] = get_json('https://nominatim.openstreetmap.org/search?' . http_build_query([
        'q'      => $q,
        'format' => 'json',
        'limit'  => 1,
        'countrycodes' => 'kr',
        'accept-language' => 'en',   // "Seoraksan National Park, Inje-gun" instead of Korean script
    ]));
    if ($ok) {
        $reached = true;
        if (!empty($data[0])) {
            $place = ['lat' => (float)$data[0]['lat'], 'lng' => (float)$data[0]['lon'], 'displayName' => $data[0]['display_name']];
        }
    } else {
        error_log('geocode.php: Nominatim failed (asking Photon and the built-in list instead)');
        cache_put('geo:nominatim-down', ['at' => time()]);
    }
}

// 2. Photon, limited to South Korea (bbox = west, south, east, north)
if (!$place && !$reached) {
    // Only places and nature, the same kinds as the place suggestions (places.php), so
    // "Seoraksan" finds the national park and not the road "Seoraksan-ro"
    [$data, $ok] = get_json('https://photon.komoot.io/api/?' . http_build_query([
        'q' => $q, 'limit' => 5, 'lang' => 'en', 'bbox' => '124.5,33.0,131.0,38.7',
    ]) . '&osm_tag=place&osm_tag=natural&osm_tag=boundary:national_park'
       . '&osm_tag=leisure:nature_reserve&osm_tag=leisure:park');
    if ($ok) {
        $reached = true;
        foreach ($data['features'] ?? [] as $f) {
            $p = $f['properties'] ?? [];
            if (($p['countrycode'] ?? '') !== 'KR' || empty($p['name'])) continue;
            [$lng, $lat] = $f['geometry']['coordinates'];
            $parts = array_unique(array_filter([$p['name'], $p['city'] ?? $p['county'] ?? null, $p['state'] ?? null]));
            $place = ['lat' => (float)$lat, 'lng' => (float)$lng, 'displayName' => implode(', ', $parts) . ', South Korea'];
            break;
        }
    }
}

// 3. The built-in list of about 400 places (the same list the place suggestions use)
if (!$place) {
    $place = built_in_place($q);
}

if (!$place) {
    if ($reached) {
        http_response_code(404);
        echo json_encode(['error' => 'Place not found in South Korea — try a different spelling']);
    } else {
        http_response_code(502);
        echo json_encode(['error' => 'Could not reach location search service']);
    }
    exit;
}

cache_put($cacheKey, $place);
echo json_encode($place);

// One GET request: [decoded JSON, true] on HTTP 200, else [null, false]
function get_json(string $url): array
{
    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT        => 8,
        CURLOPT_CONNECTTIMEOUT => 3,
        CURLOPT_ENCODING       => '',
        CURLOPT_USERAGENT      => USER_AGENT,
    ]);
    $raw  = curl_exec($ch);
    $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    $data = ($raw !== false && $code === 200) ? json_decode($raw, true) : null;
    return [$data, is_array($data)];
}

// The place of the built-in list with exactly this name, else the first whose name starts with it
// ("ulsan" -> Ulsan, "jirisan" -> Jirisan National Park)
function built_in_place(string $q): ?array
{
    $list = json_decode(@file_get_contents(__DIR__ . '/../data/korea-places.json') ?: '[]', true) ?: [];
    $q = mb_strtolower($q);
    $best = null;
    foreach ($list as $p) {
        $name = mb_strtolower($p['name']);
        if ($name === $q) { $best = $p; break; }
        if (!$best && str_starts_with($name, $q)) $best = $p;
    }
    if (!$best) return null;
    $where = array_filter([$best['name'], $best['area'] ?? '']);
    return ['lat' => (float)$best['lat'], 'lng' => (float)$best['lng'], 'displayName' => implode(', ', $where) . ', South Korea'];
}
