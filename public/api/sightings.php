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
$taxon  = $_GET['taxon'] ?? null;
$from   = $_GET['from']  ?? null;
$to     = $_GET['to']    ?? null;
$limit  = isset($_GET['limit']) ? (int)$_GET['limit'] : 50;

$gbifTaxon = ($taxon === 'other' || empty($taxon)) ? null : $taxon;
$fetchLimit = ($taxon === 'other') ? max($limit * 2, 100) : $limit;
$data = gbif_search_nearby($lat, $lng, $radius, $gbifTaxon, $from, $to, $fetchLimit);

if (isset($data['error'])) {
    http_response_code(502);
    echo json_encode(['error' => $data['error']]);
    exit;
}

$rawResults = $data['results'] ?? [];

// If filtering for "other" fauna, exclude the five main classes
if ($taxon === 'other') {
    $mainClasses = ['aves', 'mammalia', 'insecta', 'amphibia', 'reptilia', 'actinopterygii', 'gastropoda', 'bivalvia', 'cephalopoda', 'polyplacophora'];
    $rawResults = array_values(array_filter($rawResults, function($r) use ($mainClasses) {
        $c = strtolower($r['class'] ?? '');
        return !in_array($c, $mainClasses);
    }));
    $rawResults = array_slice($rawResults, 0, $limit);
}

$results = array_map(fn($r) => [
    'key'            => $r['key'] ?? null,
    'speciesKey'     => $r['speciesKey'] ?? null,
    'scientificName' => $r['scientificName'] ?? null,
    'commonName'     => $r['vernacularName'] ?? null,
    'taxonGroup'     => $r['class'] ?? $r['phylum'] ?? null,
    'lat'            => $r['decimalLatitude'] ?? null,
    'lng'            => $r['decimalLongitude'] ?? null,
    'eventDate'      => $r['eventDate'] ?? null,
    'country'        => $r['country'] ?? null,
    'locality'       => $r['locality'] ?? null,
], $rawResults);

echo json_encode(['count' => count($results), 'results' => $results]);