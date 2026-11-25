<?php
/**
 * places.php — place suggestions while the user types in the Search Location box,
 * for example "Seor" → Seoraksan National Park, Seorak-dong, Seorak Beach.
 *
 * Uses Photon (photon.komoot.io), a free geocoder built on OpenStreetMap data that is made for
 * search-as-you-type. (Nominatim, used by geocode.php, does not allow this in its usage policy.)
 * Only places in South Korea are returned, and only kinds that make sense for finding wildlife:
 * cities, districts, towns and villages, islands, national parks, nature reserves, parks and
 * natural features (mountains, wetlands, beaches, bays). Answers are kept for 30 days in the file
 * cache, so a beginning that someone typed before is answered at once and Photon is asked less.
 *
 *   ?q=Seor  →  {"places": [{"name", "area", "kind", "lat", "lng"}, …]}   (at most 6)
 *
 * When Photon cannot be reached (16 Nov 2026: it refuses connections from the shared Render
 * servers), the answer comes from public/data/korea-places.json, a list of about 300 places made
 * with tools/build-place-list.php, in the same shape. Photon is then not asked again for 10 minutes.
 */
header('Content-Type: application/json; charset=utf-8');
require_once __DIR__ . '/../../includes/cache.php';
require_once __DIR__ . '/../../includes/korean-places.php';

$q = trim($_GET['q'] ?? '');
if (mb_strlen($q) < 2 || mb_strlen($q) > 60) {
    echo json_encode(['places' => []]);
    exit;
}

// A main place by its Korean name (부산, 지리산) comes first, then what the service finds (#29, 25 Nov)
$known = korean_place($q);
function with_known(?array $known, array $places): array
{
    if (!$known) return $places;
    $others = array_filter($places, fn($p) => hypot($p['lat'] - $known['lat'], $p['lng'] - $known['lng']) > 0.05);
    return array_slice([$known, ...$others], 0, 6);
}

// Places near the map's centre come first (16 Nov): the page sends it as lat/lng. Rounded to about
// 10 km, so nearby searches share the cache; without them Photon ranks by importance only.
$lat = isset($_GET['lat']) && is_numeric($_GET['lat']) ? round(max(33.0, min(38.7, (float)$_GET['lat'])), 1) : null;
$lng = isset($_GET['lng']) && is_numeric($_GET['lng']) ? round(max(124.5, min(131.0, (float)$_GET['lng'])), 1) : null;
$near = ($lat !== null && $lng !== null) ? ['lat' => $lat, 'lon' => $lng, 'location_bias_scale' => 0.3] : [];

$cacheKey = 'places2:' . mb_strtolower($q) . ($near ? ":$lat,$lng" : '');
if ($cached = cache_get($cacheKey, 30 * 86400)) {
    echo json_encode($cached);
    exit;
}

// Photon failed less than 10 minutes ago: answer from the built-in list at once (no 6 s wait)
if (cache_get('places:photon-down', 600)) {
    echo json_encode(['places' => with_known($known, built_in_places($q, $lat, $lng)), 'source' => 'list']);
    exit;
}

// bbox = South Korea (west, south, east, north); each osm_tag adds a kind of place (OR)
$url = 'https://photon.komoot.io/api/?' . http_build_query([
    'q' => $q, 'limit' => 15, 'lang' => 'en', 'bbox' => '124.5,33.0,131.0,38.7', ...$near,
]) . '&osm_tag=place&osm_tag=natural&osm_tag=boundary:national_park'
   . '&osm_tag=leisure:nature_reserve&osm_tag=leisure:park';

$ch = curl_init($url);
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_TIMEOUT        => 6,   // suggestions are only useful if they come quickly
    CURLOPT_CONNECTTIMEOUT => 3,   // no connection in 3 s: answer from the built-in list instead
    CURLOPT_ENCODING       => '',
    CURLOPT_USERAGENT      => 'CAPR-F2026-WildlifeTracker/1.0 (student project; https://github.com/Guptaji101/CAPR-F2026-WildlifeTracker)',
]);
$raw  = curl_exec($ch);
$code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$error = curl_error($ch);
curl_close($ch);

// No suggestions is not an error: the user can still type the name and press Enter
$data = ($raw !== false && $code === 200) ? json_decode($raw, true) : null;
if (!$data) {
    // Goes to the server log (Render: Logs tab), so the reason for a failure can be seen.
    // Only the reason is written, not what the visitor typed.
    error_log("places.php: Photon failed, HTTP $code" . ($error ? ", $error" : '') . ' (answered from the built-in list)');
    cache_put('places:photon-down', ['at' => time()]);
    echo json_encode(['places' => with_known($known, built_in_places($q, $lat, $lng)), 'source' => 'list']);   // not cached: Photon is tried again later
    exit;
}

// Kinds of "place" that are not areas (a single building plot, a house, a named spot)
const SKIP = ['plot', 'house', 'locality', 'farm', 'isolated_dwelling', 'allotments'];

$places = [];
$seen = [];
foreach ($data['features'] ?? [] as $f) {
    $p = $f['properties'] ?? [];
    $value = $p['osm_value'] ?? '';
    if (($p['countrycode'] ?? '') !== 'KR' || empty($p['name']) || in_array($value, SKIP)) continue;

    // Where it is, for example "Inje, Gangwon State"
    $area = implode(', ', array_unique(array_filter([$p['city'] ?? $p['county'] ?? null, $p['state'] ?? null])));

    // Kind decides the icon: park, mountain, water, island or town
    $key = $p['osm_key'] ?? '';
    $kind = match (true) {
        $key === 'boundary' || $key === 'leisure'                    => 'park',
        in_array($value, ['peak', 'volcano', 'ridge', 'hill', 'valley']) => 'mountain',
        in_array($value, ['wetland', 'beach', 'bay', 'water', 'spring', 'coastline', 'strait']) => 'water',
        in_array($value, ['island', 'islet'])                        => 'island',
        $key === 'natural'                                           => 'nature',
        default                                                      => 'town',
    };

    // The same place often comes twice (a park and its boundary, or a big park in two areas):
    // keep the first. Towns with the same name in different areas are different places.
    $id = mb_strtolower($p['name'] . ($kind === 'park' ? '' : '|' . $area));
    if (isset($seen[$id])) continue;
    $seen[$id] = true;

    [$lng, $lat] = $f['geometry']['coordinates'];
    $places[] = ['name' => $p['name'], 'area' => $area, 'kind' => $kind, 'lat' => $lat, 'lng' => $lng];
    if (count($places) === 6) break;
}

$answer = ['places' => with_known($known, $places)];
cache_put($cacheKey, $answer);
echo json_encode($answer);

// Places of the built-in list (public/data/korea-places.json) whose name, or a word of it, starts
// with the typed text ("jiri" -> Jirisan National Park); names that start with it first, then the
// nearest to the map's centre. At most 6, like Photon's answer.
function built_in_places(string $q, ?float $lat, ?float $lng): array
{
    $list = json_decode(@file_get_contents(__DIR__ . '/../data/korea-places.json') ?: '[]', true) ?: [];
    $q = mb_strtolower($q);
    $found = [];
    foreach ($list as $p) {
        $name = mb_strtolower($p['name']);
        $starts = str_starts_with($name, $q);
        if (!$starts && !preg_match('/[\s\-(]' . preg_quote($q, '/') . '/u', $name)) continue;
        $far = $lat !== null ? hypot($p['lat'] - $lat, $p['lng'] - $lng) : 0;
        $found[] = [$starts ? 0 : 1, $far, $p];
    }
    usort($found, fn($a, $b) => [$a[0], $a[1]] <=> [$b[0], $b[1]]);
    return array_map(fn($f) => $f[2], array_slice($found, 0, 6));
}
