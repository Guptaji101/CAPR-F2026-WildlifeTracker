<?php
/**
 * photos.php — more photos of one species for the photo viewer (Map page and Encyclopedia).
 * Added after the usability test (31 Oct): users wanted to see a photo large and browse others.
 *
 *   ?speciesKey=10704098   up to 12 photos from GBIF records, South Korea first
 *
 * Answers {"photos": [{url, credit, license, record}]}: url = the image, credit = the photographer,
 * license = a short name ("CC BY-NC"), record = the GBIF record the photo belongs to.
 */
header('Content-Type: application/json; charset=utf-8');
require_once __DIR__ . '/../../includes/gbif.php';
require_once __DIR__ . '/../../includes/cache.php';

const GBIF = 'https://api.gbif.org/v1';
const MAX_PHOTOS = 12;

$speciesKey = (int)($_GET['speciesKey'] ?? 0);
if (!$speciesKey) {
    http_response_code(400);
    echo json_encode(['error' => 'speciesKey is required']);
    exit;
}

// New photos reach GBIF slowly: a list from the last day is answered from the cache
$cacheKey = "photos:$speciesKey";
if ($cached = cache_get($cacheKey, 86400)) {
    echo json_encode($cached);
    exit;
}

// "http://creativecommons.org/licenses/by-nc/4.0/" -> "CC BY-NC"; public domain -> "CC0"
function short_license(?string $url): string {
    if (!$url) return '';
    if (preg_match('~/(publicdomain|zero)/~', $url)) return 'CC0';
    return preg_match('~/licenses/([a-z\-]+)/~', $url, $m) ? 'CC ' . strtoupper($m[1]) : '';
}

$photos = [];
// Photos taken in South Korea first; if there are too few, photos from anywhere
foreach ([['country' => 'KR'], []] as $where) {
    if (count($photos) >= MAX_PHOTOS) break;
    $data = gbif_get(GBIF . '/occurrence/search?' . http_build_query(
        ['taxonKey' => $speciesKey, 'mediaType' => 'StillImage', 'limit' => 40] + $where));
    foreach ($data['results'] ?? [] as $r) {
        $m = $r['media'][0] ?? [];
        $url = $m['identifier'] ?? '';
        if (!str_starts_with($url, 'http') || isset($photos[$url])) continue;
        $photos[$url] = [
            'url'     => $url,
            'credit'  => $m['rightsHolder'] ?? $m['creator'] ?? $r['recordedBy'] ?? '',
            'license' => short_license($m['license'] ?? null),
            'record'  => $r['key'],
        ];
        if (count($photos) >= MAX_PHOTOS) break;
    }
}

$answer = ['photos' => array_values($photos)];
if ($photos) cache_put($cacheKey, $answer);   // an empty list (e.g. GBIF unreachable) is asked again next time
echo json_encode($answer);
