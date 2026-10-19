<?php
/**
 * build-animal-list.php — makes public/data/korea-animals.json, the list behind the
 * "Find an Animal" suggestions on the Map page.
 *
 * Run it from the project folder once in a while (for example before a release):
 *     /c/xampp/php/php.exe tools/build-animal-list.php
 *
 * 1. Asks GBIF for the 2000 animal species with the most records in South Korea (one "facet"
 *    request that counts records per species instead of returning them).
 * 2. Asks GBIF for the names and class of each species, 25 at a time in parallel.
 * 3. Saves a small JSON file. The browser loads it once and filters it while the user types,
 *    so suggestions appear instantly without asking the server.
 */
const GBIF = 'https://api.gbif.org/v1';
const COUNT = 2000;
const OUT = __DIR__ . '/../public/data/korea-animals.json';

// GET several URLs at the same time; returns the decoded JSON for each (null on error)
function get_many(array $urls): array {
    $mh = curl_multi_init();
    $handles = [];
    foreach ($urls as $i => $url) {
        $ch = curl_init($url);
        curl_setopt_array($ch, [CURLOPT_RETURNTRANSFER => true, CURLOPT_TIMEOUT => 30, CURLOPT_ENCODING => '',
            CURLOPT_USERAGENT => 'CAPR-F2026-WildlifeTracker/1.0 (student project)']);
        curl_multi_add_handle($mh, $ch);
        $handles[$i] = $ch;
    }
    do { curl_multi_exec($mh, $running); curl_multi_select($mh); } while ($running > 0);
    $out = [];
    foreach ($handles as $i => $ch) {
        $ok = curl_getinfo($ch, CURLINFO_HTTP_CODE) === 200;
        $out[$i] = $ok ? json_decode(curl_multi_getcontent($ch), true) : null;
        curl_multi_remove_handle($mh, $ch);
    }
    curl_multi_close($mh);
    return $out;
}

// 1. Most-recorded animal species in South Korea
$top = get_many([GBIF . '/occurrence/search?' . http_build_query([
    'country' => 'KR', 'kingdomKey' => 1, 'limit' => 0, 'facet' => 'speciesKey', 'facetLimit' => COUNT,
])])[0];
$counts = $top['facets'][0]['counts'] ?? [];
if (!$counts) exit("Could not get the species list from GBIF.\n");
echo count($counts), " species\n";

// 2. Names and class of each species
$animals = [];
foreach (array_chunk($counts, 25) as $n => $chunk) {
    $details = get_many(array_map(fn($c) => GBIF . '/species/' . $c['name'], $chunk));
    foreach ($chunk as $i => $c) {
        $sp = $details[$i];
        if (!$sp || empty($sp['species'])) continue;
        // GBIF sometimes gives several names in one ("Pacific oyster, Japanese oyster, …"):
        // keep the first, starting with a capital letter ("wild boar" -> "Wild boar")
        $name = trim(explode(',', $sp['vernacularName'] ?? '')[0]);
        $animals[] = [
            'k' => (int)$c['name'],                      // GBIF species key
            'n' => $name !== '' ? ucfirst($name) : null, // English name (missing for many insects)
            's' => $sp['species'],                       // scientific name
            'c' => $sp['class'] ?? $sp['phylum'] ?? '',  // class (or phylum), for the group icon
            'r' => $c['count'],                          // records in South Korea
        ];
    }
    echo '.', ($n + 1) % 20 ? '' : " " . count($animals) . "\n";
}

// 3. Save (most records first, as GBIF returned them)
if (!is_dir(dirname(OUT))) mkdir(dirname(OUT), 0777, true);
file_put_contents(OUT, json_encode($animals, JSON_UNESCAPED_UNICODE));
printf("\nSaved %d animals (%d with an English name) to %s (%d KB)\n",
    count($animals), count(array_filter($animals, fn($a) => $a['n'])), realpath(OUT), filesize(OUT) / 1024);
