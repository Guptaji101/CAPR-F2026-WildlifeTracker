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

$data = gbif_search_nearby($lat, $lng, $radius, $taxon, $from, $to, $limit);

if (isset($data['error'])) {
    http_response_code(502);
    echo json_encode(['error' => $data['error']]);
    exit;
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
], $data['results'] ?? []);

echo json_encode(['count' => $data['count'] ?? count($results), 'results' => $results]);