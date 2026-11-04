<?php
/**
 * animal.php — turns an animal name typed by the user ("tiger", "Eurasian magpie" or
 * "Pica pica") into a GBIF species key, so the Map page can show only that animal. A word for
 * a whole kind of animal ("deer", "snakes", "frog") gives all of them (usability test, 31 Oct).
 *
 * Four steps, stopping at the first that works:
 *   0. Everyday words for a kind that GBIF has no single group for ("snake", "toad"; GROUP_WORDS).
 *   1. GBIF species/match: exact for scientific names ("Pica pica", also groups like "Cervidae").
 *   2. Wikipedia -> Wikidata: everyday English names ("tiger" -> Tiger -> GBIF 5219416;
 *      "deer" -> Deer -> the deer family).
 *   3. GBIF common-name search: all animals of that name recorded in South Korea ("magpie").
 *
 * Answers {"found": {key, keys, name, scientificName, group, cls, path}}, or 404 {"error"}. keys = the GBIF taxon keys to show on the map (one for a species), group = true
 * for a whole kind, cls = its class ("Mammalia") and path = [phylum, class, order] keys, which
 * tell the pages which animal group to tick or open.
 */
header('Content-Type: application/json; charset=utf-8');

require_once __DIR__ . '/../../includes/gbif.php';
require_once __DIR__ . '/../../includes/wikipedia.php';
require_once __DIR__ . '/../../includes/cache.php';

const GBIF_API = 'https://api.gbif.org/v1';
const BACKBONE = 'd7dddbf4-2cf0-4f39-9b2a-bb099caae36c';   // GBIF's main species list

$q = trim($_GET['q'] ?? '');
if ($q === '' || mb_strlen($q) > 80) {
    http_response_code(400);
    echo json_encode(['error' => 'Type an animal name (for example tiger or Pica pica)']);
    exit;
}

// A name looked up in the last 7 days is answered from the cache (no GBIF or Wikipedia request)
// ("animal5:" since 4 Nov, so answers saved with the old "Did you mean" lists are not reused)
$cacheKey = 'animal5:' . mb_strtolower($q);
if ($cached = cache_get($cacheKey, 7 * 86400)) {
    echo json_encode($cached);
    exit;
}
// Send an answer and keep it for the next user who types the same name
function send(array $answer): void {
    global $cacheKey;
    cache_put($cacheKey, $answer);
    echo json_encode($answer);
    exit;
}

// Species record from GBIF if it is an animal species (or below, e.g. a subspecies); else null
function animal_species(int $key): ?array {
    $sp = gbif_get(GBIF_API . "/species/$key");
    if (!$sp || ($sp['kingdom'] ?? '') !== 'Animalia' || empty($sp['speciesKey'])) return null;
    return $sp;
}

// Sends the animal (a species, or a whole kind when there are several keys or $group is true),
// with the class and [phylum, class, order] of its first key so the pages know its animal group
function send_found(array $keys, string $name, ?string $scientificName, bool $group = false): void {
    $sp = gbif_get(GBIF_API . "/species/{$keys[0]}") ?: [];
    send(['found' => [
        'key' => $keys[0], 'keys' => $keys, 'name' => $name, 'scientificName' => $scientificName,
        'group' => $group || count($keys) > 1,
        'cls' => gbif_class($sp) ?? $sp['phylum'] ?? $sp['canonicalName'] ?? null,   // a phylum itself ("Annelida") has neither
        'path' => array_values(array_filter([$sp['phylumKey'] ?? null, $sp['classKey'] ?? null, $sp['orderKey'] ?? null])),
    ]]);
}

// GBIF records of a taxon in South Korea (0 for an old key that GBIF no longer files records under)
function korea_records(int $key): int {
    $data = gbif_get(GBIF_API . '/occurrence/search?' . http_build_query(['country' => 'KR', 'taxonKey' => $key, 'limit' => 0]));
    return (int)($data['count'] ?? 0);
}

// Ranks between "animal group" and "species" that are searched as a whole kind of animal
const KIND_RANKS = ['CLASS', 'ORDER', 'FAMILY', 'GENUS'];

// --- 0. Everyday words for a kind of animal --------------------------------------
// Wikipedia links these words to no GBIF group (GBIF has no "snake" group: snakes are families
// of the order Squamata, together with lizards), so the families recorded in South Korea are
// listed here: [name shown, GBIF taxon keys]. Main groups ("reptiles", "birds") are handled
// by the pages themselves, which tick that group.
const GROUP_WORDS = [
    'snake'     => ['Snakes', [6172, 5024, 9455]],                    // Colubridae, Viperidae, Elapidae
    'lizard'    => ['Lizards', [5201, 9115, 5666]],                   // Lacertidae, Scincidae, Gekkonidae
    'turtle'    => ['Turtles', [11418114]],                           // Testudines
    'tortoise'  => ['Turtles', [11418114]],
    'toad'      => ['Toads', [6727, 3077]],                           // Bufonidae, Bombinatoridae
    'whale'     => ['Whales and dolphins', [733]],                    // Cetacea
    'dolphin'   => ['Whales and dolphins', [733]],
    'butterfly' => ['Butterflies', [9417, 5481, 7017, 5473, 6953]],   // the five butterfly families
    'dragonfly' => ['Dragonflies and damselflies', [789]],            // Odonata
    'crab'      => ['Crabs and shrimps', [637]],                      // Decapoda (also lobsters, crayfish)
    'shrimp'    => ['Crabs and shrimps', [637]],
    'prawn'     => ['Crabs and shrimps', [637]],
    'snail'     => ['Snails and slugs', [225]],                       // Gastropoda
    'slug'      => ['Snails and slugs', [225]],
    'jellyfish' => ['Jellyfish', [352]],                              // Scyphozoa
    'coral'     => ['Corals and sea anemones', [206]],                // Anthozoa
    'worm'      => ['Segmented worms', [42]],                         // Annelida (earthworms, lugworms)
];
// "Snakes" -> snake, "butterflies" -> butterfly. A start of 3+ letters also counts, so a child
// typing "sna" gets the snakes: when several words start so, the first listed wins (snake, not snail).
function group_word(string $q): ?string {
    $w = mb_strtolower($q);
    foreach ([$w, preg_replace('/ies$/', 'y', $w), preg_replace('/s$/', '', $w), preg_replace('/es$/', '', $w)] as $form) {
        if (isset(GROUP_WORDS[$form])) return $form;
    }
    if (mb_strlen($w) < 3) return null;
    foreach (array_keys(GROUP_WORDS) as $word) {
        if (str_starts_with($word, $w)) return $word;
    }
    return null;
}
if ($word = group_word($q)) {
    [$name, $keys] = GROUP_WORDS[$word];
    send_found($keys, $name, null, true);
}

// --- 1. Scientific name -------------------------------------------------------
$match = gbif_get(GBIF_API . '/species/match?' . http_build_query(['name' => $q, 'kingdom' => 'Animalia']));
// "HIGHERRANK" means GBIF only recognised a group (e.g. "Animalia"), not the species itself
if ($match && in_array($match['matchType'] ?? '', ['EXACT', 'FUZZY'])
        && ($match['confidence'] ?? 0) >= 90 && !empty($match['speciesKey'])) {
    // A subspecies ("Panthera tigris altaica") or an old synonym is widened to its species
    send_found([(int)$match['speciesKey']], $match['species'], $match['species']);
}
// A whole kind by its scientific name ("Cervidae", "Anura"): only an exact match
if ($match && ($match['matchType'] ?? '') === 'EXACT' && in_array($match['rank'] ?? '', KIND_RANKS)
        && korea_records((int)$match['usageKey']) > 0) {
    send_found([(int)$match['usageKey']], $match['canonicalName'], $match['canonicalName'], true);
}

// --- 2. English name through Wikipedia and Wikidata ----------------------------
$wiki = wiki_gbif_key($q);
if ($wiki && ($sp = animal_species($wiki['key']))) {
    send_found([(int)$sp['speciesKey']], $wiki['title'], $sp['species'] ?? null);
}
// A page about a kind of animal ("Deer" -> the deer family Cervidae, "Frog" -> the order Anura)
if ($wiki && ($sp = gbif_get(GBIF_API . "/species/{$wiki['key']}"))
        && ($sp['kingdom'] ?? '') === 'Animalia' && in_array($sp['rank'] ?? '', KIND_RANKS)) {
    // Wikidata sometimes stores an old GBIF key with no records ("Turtle" -> 793); the current
    // key of the same name is then used instead
    $current = gbif_get(GBIF_API . '/species/match?' . http_build_query(['name' => $sp['canonicalName'] ?? '', 'kingdom' => 'Animalia']));
    $keys = array_unique(array_filter([
        ($current['matchType'] ?? '') === 'EXACT' ? (int)$current['usageKey'] : null, (int)$wiki['key'],
    ]));
    foreach ($keys as $key) {
        if (korea_records($key) > 0) send_found([$key], $wiki['title'], $sp['canonicalName'] ?? null, true);
    }
}

// --- 3. All animals of that name, from GBIF's common names ---------------------
// GBIF lists "magpie" moths and fish before the Eurasian magpie, so 50 candidates are fetched
// and only the ones recorded in South Korea are kept. The user sees them all at once, without
// a list to pick from (usability test: a list after Enter confused users).
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
        'class'          => $r['class'] ?? null,
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
    // Only animals recorded in South Korea, most records first: foreign animals ("Iguana Tick"
    // for "reptiles") confused users in the usability test (31 Oct)
    $candidates = array_values(array_filter($candidates, fn($c) => $c['koreaRecords'] > 0));
    usort($candidates, fn($a, $b) => $b['koreaRecords'] <=> $a['koreaRecords']);
    // Only the class of the best-known one: "eagle" gives the birds, not also the eagle ray
    $candidates = array_values(array_filter($candidates, fn($c) => $c['class'] === ($candidates[0]['class'] ?? null)));
    if (count($candidates) === 1) send_found([(int)$candidates[0]['key']], $candidates[0]['name'], $candidates[0]['scientificName']);
    if ($candidates) send_found(array_map(fn($c) => (int)$c['key'], $candidates), mb_convert_case($q, MB_CASE_TITLE), null, true);
}

http_response_code(404);
echo json_encode(['error' => "No animal called \"$q\" was found. Check the spelling or try the scientific name."]);
