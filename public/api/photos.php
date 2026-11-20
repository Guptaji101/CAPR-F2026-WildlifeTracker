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
$cacheKey = "photos7:$speciesKey";   // photos2: animal photos first; photos3: no dead animals; photos4: smaller photos (17 Nov); photos5/6: no droppings or museum specimens, marked photos first (#25); photos7: museum photos when there is no other photo (20 Nov)
if ($cached = cache_get($cacheKey, 86400)) {
    echo json_encode($cached);
    exit;
}

$photos = [];
$museum = [];   // photos of museum specimens and samples: only used when there is no other photo
// Photos taken in South Korea first; if there are too few, photos from anywhere. Both lists are
// asked for at the same time (17 Nov), which is about twice as fast as one after the other.
$lists = gbif_get_many(array_map(fn($where) => GBIF . '/occurrence/search?' . http_build_query(
    ['taxonKey' => $speciesKey, 'mediaType' => 'StillImage', 'limit' => 40] + $where), [['country' => 'KR'], []]));
foreach ($lists as $data) {
    foreach ($data['results'] ?? [] as $r) {
        // No photos of dead animals (17 Nov): GBIF marks them "vitality: dead" (in Korea often
        // roadkill water deer), and the slideshow showed them by itself
        if (strtolower($r['vitality'] ?? '') === 'dead') continue;
        // Photos of sightings first (#25, 19 Nov): museum specimens (PRESERVED_SPECIMEN) are dead
        // animals, and some museums show a scan of their catalogue book as the photo. They are kept
        // apart and only used when an animal has no sighting photo at all (20 Nov): some small sea
        // animals (copepods, sea worms) are only photographed in collections.
        $sighting = in_array($r['basisOfRecord'] ?? '', ['HUMAN_OBSERVATION', 'MACHINE_OBSERVATION', 'OBSERVATION'], true);
        // No photos of droppings, hair or tracks either (#25, 19 Nov): iNaturalist marks them
        // "evidenceOfPresence" in dynamicProperties; only "organism" is the animal itself
        $evidence = strtolower(json_decode($r['dynamicProperties'] ?? '', true)['evidenceOfPresence'] ?? '');
        if ($evidence !== '' && $evidence !== 'organism') continue;
        $m = $r['media'][0] ?? [];
        $url = smaller_photo($m['identifier'] ?? '');
        if (!str_starts_with($url, 'http') || isset($photos[$url]) || isset($museum[$url])) continue;
        if ($sighting) $list = &$photos; else $list = &$museum;
        $list[$url] = [
            'url'     => $url,
            'credit'  => $m['rightsHolder'] ?? $m['creator'] ?? $r['recordedBy'] ?? '',
            'license' => short_license($m['license'] ?? null),
            'record'  => $r['key'],
            // the observer said the animal was alive, or what it shows (adult, female…): almost
            // always the living animal. Photos without such a mark can still show a dead animal
            // that nobody marked (#25), so they come last.
            'animal'  => strtolower($r['vitality'] ?? '') === 'alive' || $evidence === 'organism'
                         || !empty($r['lifeStage']) || !empty($r['sex']),
        ];
        unset($list);
    }
}
// No sighting photo at all: the museum photos instead (better than an empty slideshow)
if (!$photos) $photos = $museum;

// Marked photos of the living animal first, then the others, and at most 12 (#25: the 12 were
// taken before sorting, so unmarked photos, e.g. a dead deer, came into the slideshow). The order
// is otherwise kept (Korea first); usort keeps equal items in order (PHP 8).
$photos = array_values($photos);
usort($photos, fn($x, $y) => $y['animal'] <=> $x['animal']);
$photos = array_slice($photos, 0, MAX_PHOTOS);
foreach ($photos as &$p) unset($p['animal']);
unset($p);
$answer = ['photos' => $photos];
if ($photos) cache_put($cacheKey, $answer);   // an empty list (e.g. GBIF unreachable) is asked again next time
echo json_encode($answer);
