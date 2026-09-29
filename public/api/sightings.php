<?php
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');

require_once __DIR__ . '/../../includes/gbif.php';

$lat = isset($_GET['lat']) ? (float)$_GET['lat'] : null;
$lng = isset($_GET['lng']) ? (float)$_GET['lng'] : null;

if ($lat === null || $lng === null) {
    http_response_code(400);
    echo json_encode(['error' => 'lat and lng are required']);
    exit;
}

$radius = isset($_GET['radius']) ? (float)$_GET['radius'] : 10;
// Comma-separated GBIF taxon keys for the selected animal groups; empty = all animals
$taxa   = array_values(array_filter(array_map('intval', explode(',', $_GET['taxa'] ?? ''))));
$from   = $_GET['from']  ?? null;
$to     = $_GET['to']    ?? null;
$limit  = isset($_GET['limit']) ? (int)$_GET['limit'] : 50;

// Dates must be YYYY-MM-DD and in order; GBIF rejects anything else
foreach (['From' => $from, 'To' => $to] as $label => $date) {
    if ($date && !preg_match('/^\d{4}-\d{2}-\d{2}$/', $date)) {
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

$data = gbif_search_nearby($lat, $lng, $radius, $taxa, $from, $to, $limit);

// NFR-04: when GBIF is unreachable, gbif.php returns sample data flagged as a
// fallback. Pass it on so the map isn't empty; report any other error as-is.
if (isset($data['error']) && empty($data['fallback'])) {
    http_response_code(502);
    echo json_encode(['error' => $data['error']]);
    exit;
}

$rawResults = $data['results'] ?? [];

$results = array_map(fn($r) => [
    'key'            => $r['key'] ?? null,
    'speciesKey'     => $r['speciesKey'] ?? null,
    'scientificName' => $r['scientificName'] ?? null,
    'commonName'     => $r['vernacularName'] ?? null,
    'species'        => $r['species'] ?? null,
    'taxonGroup'     => $r['class'] ?? $r['phylum'] ?? null,
    'phylum'         => $r['phylum'] ?? null,
    'image'          => $r['media'][0]['identifier'] ?? null,
    'lat'            => $r['decimalLatitude'] ?? null,
    'lng'            => $r['decimalLongitude'] ?? null,
    'eventDate'      => $r['eventDate'] ?? null,
    'country'        => $r['country'] ?? null,
    'locality'       => $r['locality'] ?? null,
], $rawResults);

$response = ['count' => count($results), 'results' => $results];
if (!empty($data['fallback'])) {
    $response['fallback'] = true;
    $response['reason']   = $data['error'];
}
echo json_encode($response);