<?php
/**
 * api-test.php — runs the API endpoint checks API-01 – API-14 of the test plan
 * (testing/TEST_PLAN.md, section 5.1) by itself and prints Pass or Fail for each.
 *
 *   php tools/api-test.php                      the live site
 *   php tools/api-test.php http://localhost/CAPR-F2026-WildlifeTracker/public
 *
 * Exit code 0 when every check passes, 1 when one fails (so GitHub Actions marks the run red).
 * Added 19 Nov by Paudel Amrit: the checks were opened by hand in the browser before.
 */

$base = rtrim($argv[1] ?? 'https://wildtrack-lq88.onrender.com', '/');
$live = !str_contains($base, 'localhost') && !str_contains($base, '127.0.0.1');

// One GET request: [status, decoded JSON or null, seconds]
function get(string $url): array {
    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT        => 60,   // the first request can wake the free Render server (up to ~50 s)
        CURLOPT_USERAGENT      => 'WildTrack-api-test',
    ]);
    $t = microtime(true);
    $body = curl_exec($ch);
    $status = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    return [$status, json_decode((string)$body, true), microtime(true) - $t];
}

$api = fn(string $path) => get("$base/api/$path");
$today = date('Y-m-d');

// [ID, what is checked, function returning true/false or a reason string]
$checks = [
    ['API-01', 'geocode.php?q=Ulsan: lat, lng and name', function () use ($api) {
        [$s, $j] = $api('geocode.php?q=Ulsan');
        return $s === 200 && isset($j['lat'], $j['lng']) && str_contains($j['displayName'] ?? '', 'Ulsan') ?: "status $s";
    }],
    ['API-02', 'geocode.php?q=Vancouver: not in South Korea', function () use ($api) {
        [$s, $j] = $api('geocode.php?q=Vancouver');
        return $s === 404 && str_contains($j['error'] ?? '', 'South Korea') ?: "status $s";
    }],
    ['API-03', 'places.php?q=Jiri: 1 to 6 places in Korea', function () use ($api) {
        [$s, $j] = $api('places.php?q=Jiri');
        $n = count($j['places'] ?? []);
        $inKorea = array_filter($j['places'] ?? [], fn($p) => $p['lat'] > 33 && $p['lat'] < 39 && $p['lng'] > 124 && $p['lng'] < 132);
        return $s === 200 && $n >= 1 && $n <= 6 && count($inKorea) === $n ?: "status $s, $n places";
    }],
    ['API-04', 'sightings.php (Busan, 10 km, 75): 75 results', function () use ($api) {
        [$s, $j] = $api('sightings.php?lat=35.1796&lng=129.0756&radius=10&limit=75');
        return $s === 200 && ($j['count'] ?? 0) === 75 && count($j['results'] ?? []) === 75 ?: "status $s, count " . ($j['count'] ?? '-');
    }],
    ['API-05', 'sightings.php with From after To: error 400', function () use ($api) {
        [$s, $j] = $api('sightings.php?lat=35.1796&lng=129.0756&radius=10&limit=75&from=2025-06-01&to=2025-01-01');
        return $s === 400 && isset($j['error']) ?: "status $s";
    }],
    ['API-06', 'species.php?speciesKey=2440931: Chinese water deer', function () use ($api) {
        [$s, $j] = $api('species.php?speciesKey=2440931');
        return $s === 200 && str_starts_with($j['scientificName'] ?? '', 'Hydropotes inermis') && ($j['family'] ?? '') === 'Cervidae' ?: "status $s";
    }],
    ['API-07', 'animal.php?q=tiger: found, key 5219416', function () use ($api) {
        [$s, $j] = $api('animal.php?q=tiger');
        return $s === 200 && ($j['found']['key'] ?? 0) === 5219416 ?: "status $s, key " . ($j['found']['key'] ?? '-');
    }],
    ['API-08', 'encyclopedia.php top mammals: a total and 24 species', function () use ($api) {
        [$s, $j] = $api('encyclopedia.php?action=top&taxa=359&country=KR');
        return $s === 200 && ($j['total'] ?? 0) > 0 && count($j['species'] ?? []) === 24 ?: "status $s, " . count($j['species'] ?? []) . ' species';
    }],
    ['API-09', 'config and include files are not reachable', function () use ($base, $live) {
        if (!$live) return 'skip';   // XAMPP serves the whole project folder; only the live site has public/ as its root
        foreach (['config/config.php', 'includes/config.php', 'config/config.example.php', 'includes/gbif.php'] as $f) {
            [$s] = get("$base/$f");
            if ($s !== 404) return "$f answered $s";
        }
        return true;
    }],
    ['API-10', 'sightings.php radius 500: error 400', function () use ($api) {
        [$s] = $api('sightings.php?lat=35.5384&lng=129.3114&radius=500&limit=75');
        return $s === 400 ?: "status $s";
    }],
    ['API-11', 'animal.php?q=qwxyz: not found, status 200', function () use ($api) {
        [$s, $j] = $api('animal.php?q=qwxyz');
        return $s === 200 && array_key_exists('found', $j ?? []) && $j['found'] === null && isset($j['error']) ?: "status $s";
    }],
    ['API-12', 'animal.php?q=pige: found by name', function () use ($api) {
        [$s, $j] = $api('animal.php?q=pige');
        return $s === 200 && ($j['found']['byName'] ?? false) === true ?: "status $s";
    }],
    ['API-13', 'places.php?q=haeun: Haeundae District and Beach', function () use ($api) {
        [$s, $j] = $api('places.php?q=haeun');
        $names = array_column($j['places'] ?? [], 'name');
        return $s === 200 && in_array('Haeundae District', $names) && in_array('Haeundae Beach', $names) ?: "status $s";
    }],
    ['API-14', 'sightings.php from 2010: total = GBIF count', function () use ($api, $today) {
        [$s, $j] = $api('sightings.php?lat=35.5391697&lng=129.3119136&radius=10&limit=75&from=2010-01-01');
        [, $g] = get('https://api.gbif.org/v1/occurrence/search?geoDistance=35.5391697,129.3119136,10km'
            . "&hasCoordinate=true&hasGeospatialIssue=false&kingdomKey=1&eventDate=2010-01-01,$today&limit=0");
        $ours = $j['total'] ?? null; $gbif = $g['count'] ?? null;
        return $s === 200 && $ours !== null && $ours === $gbif ?: "status $s, ours $ours, GBIF $gbif";
    }],
];

echo "WildTrack API checks on $base (" . date('Y-m-d H:i') . ")\n\n";
$failed = 0; $skipped = 0;
foreach ($checks as [$id, $what, $test]) {
    $t = microtime(true);
    $r = $test();
    $sec = number_format(microtime(true) - $t, 1);
    if ($r === true)       $mark = 'PASS';
    elseif ($r === 'skip') { $mark = 'SKIP'; $skipped++; }
    else                   { $mark = 'FAIL'; $failed++; }
    printf("%-6s  %-4s  %-52s %5s s%s\n", $id, $mark, $what, $sec, $mark === 'FAIL' ? "  ($r)" : '');
}
$passed = count($checks) - $failed - $skipped;
echo "\n$passed passed, $failed failed" . ($skipped ? ", $skipped skipped (live site only)" : '') . "\n";
exit($failed ? 1 : 0);
