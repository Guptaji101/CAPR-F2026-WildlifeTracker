<?php
/**
 * animal.php — turns an animal name typed by the user ("tiger", "Eurasian magpie" or
 * "Pica pica") into a GBIF species key, so the Map page can show only that animal.
 *
 * Three steps, stopping at the first that works:
 *   1. GBIF species/match: exact for scientific names ("Pica pica").
 *   2. Wikipedia -> Wikidata: everyday English names ("tiger" -> Tiger -> GBIF 5219416).
 *   3. GBIF common-name search: a short "Did you mean …?" list, animals recorded most in
 *      South Korea first.
 *
 * Answers {"found": {key, name, scientificName}}, or {"suggestions": [...]}, or 404 {"error"}.
 */
header('Content-Type: application/json; charset=utf-8');

require_once __DIR__ . '/../../includes/gbif.php';
require_once __DIR__ . '/../../includes/wikipedia.php';

const GBIF_API = 'https://api.gbif.org/v1';
const BACKBONE = 'd7dddbf4-2cf0-4f39-9b2a-bb099caae36c';   // GBIF's main species list

$q = trim($_GET['q'] ?? '');
if ($q === '' || mb_strlen($q) > 80) {
    http_response_code(400);
    echo json_encode(['error' => 'Type an animal name (for example tiger or Pica pica)']);
    exit;
}

// Species record from GBIF if it is an animal species (or below, e.g. a subspecies); else null
function animal_species(int $key): ?array {
    $sp = gbif_get(GBIF_API . "/species/$key");
    if (!$sp || ($sp['kingdom'] ?? '') !== 'Animalia' || empty($sp['speciesKey'])) return null;
    return $sp;
}

function send_found(int $key, string $name, ?string $scientificName): void {
    echo json_encode(['found' => ['key' => $key, 'name' => $name, 'scientificName' => $scientificName]]);
    exit;
}

// --- 1. Scientific name -------------------------------------------------------
$match = gbif_get(GBIF_API . '/species/match?' . http_build_query(['name' => $q, 'kingdom' => 'Animalia']));
// "HIGHERRANK" means GBIF only recognised a group (e.g. "Animalia"), not the species itself
if ($match && in_array($match['matchType'] ?? '', ['EXACT', 'FUZZY'])
        && ($match['confidence'] ?? 0) >= 90 && !empty($match['speciesKey'])) {
    // A subspecies ("Panthera tigris altaica") or an old synonym is widened to its species
    send_found((int)$match['speciesKey'], $match['species'], $match['species']);
}

// --- 2. English name through Wikipedia and Wikidata ----------------------------
$wiki = wiki_gbif_key($q);
if ($wiki && ($sp = animal_species($wiki['key']))) {
    send_found((int)$sp['speciesKey'], $wiki['title'], $sp['species'] ?? null);
}

// --- 3. "Did you mean …?" from GBIF's common names ------------------------------
// GBIF lists "magpie" moths and fish before the Eurasian magpie, so 50 candidates are fetched
// and the ones recorded in South Korea are shown first.
$search = gbif_get(GBIF_API . '/species/search?' . http_build_query([
    'q' => $q, 'qField' => 'VERNACULAR', 'datasetKey' => BACKBONE, 'rank' => 'SPECIES',
    'highertaxonKey' => 1, 'status' => 'ACCEPTED', 'limit' => 50,
]));
$candidates = [];
foreach ($search['results'] ?? [] as $r) {
    $english = array_values(array_filter($r['vernacularNames'] ?? [], fn($v) => ($v['language'] ?? '') === 'eng'));
    $candidates[$r['key']] = [
        'key'            => $r['key'],
        'name'           => $english[0]['vernacularName'] ?? $r['canonicalName'],
        'scientificName' => $r['canonicalName'] ?? null,
        'koreaRecords'   => 0,
    ];
}

if ($candidates) {
    // One request counts the South Korean records of all candidates (GBIF "facet" on speciesKey)
    $query = http_build_query(['country' => 'KR', 'limit' => 0, 'facet' => 'speciesKey', 'facetLimit' => 50]);
    foreach (array_keys($candidates) as $key) $query .= '&taxonKey=' . (int)$key;
    $counts = gbif_get(GBIF_API . '/occurrence/search?' . $query);
    foreach ($counts['facets'][0]['counts'] ?? [] as $c) {
        if (isset($candidates[$c['name']])) $candidates[$c['name']]['koreaRecords'] = $c['count'];
    }
    // Animals recorded in South Korea first, then GBIF's own order
    $candidates = array_values($candidates);
    usort($candidates, fn($a, $b) => $b['koreaRecords'] <=> $a['koreaRecords']);
    echo json_encode(['suggestions' => array_slice($candidates, 0, 5)]);
    exit;
}

http_response_code(404);
echo json_encode(['error' => "No animal called \"$q\" was found. Check the spelling or try the scientific name."]);
