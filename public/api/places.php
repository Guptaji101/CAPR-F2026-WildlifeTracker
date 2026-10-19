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
 */
header('Content-Type: application/json; charset=utf-8');
require_once __DIR__ . '/../../includes/cache.php';

$q = trim($_GET['q'] ?? '');
if (mb_strlen($q) < 2 || mb_strlen($q) > 60) {
    echo json_encode(['places' => []]);
    exit;
}

$cacheKey = 'places:' . mb_strtolower($q);
if ($cached = cache_get($cacheKey, 30 * 86400)) {
    echo json_encode($cached);
    exit;
}

// bbox = South Korea (west, south, east, north); each osm_tag adds a kind of place (OR)
$url = 'https://photon.komoot.io/api/?' . http_build_query([
    'q' => $q, 'limit' => 15, 'lang' => 'en', 'bbox' => '124.5,33.0,131.0,38.7',
]) . '&osm_tag=place&osm_tag=natural&osm_tag=boundary:national_park'
   . '&osm_tag=leisure:nature_reserve&osm_tag=leisure:park';

$ch = curl_init($url);
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_TIMEOUT        => 6,   // suggestions are only useful if they come quickly
    CURLOPT_ENCODING       => '',
    CURLOPT_USERAGENT      => 'CAPR-F2026-WildlifeTracker/1.0 (student project; https://github.com/Guptaji101/CAPR-F2026-WildlifeTracker)',
]);
$raw  = curl_exec($ch);
$code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

// No suggestions is not an error: the user can still type the name and press Enter
$data = ($raw !== false && $code === 200) ? json_decode($raw, true) : null;
if (!$data) {
    echo json_encode(['places' => []]);
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

$answer = ['places' => $places];
cache_put($cacheKey, $answer);
echo json_encode($answer);
