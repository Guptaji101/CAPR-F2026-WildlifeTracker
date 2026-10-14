<?php
/**
 * geocode.php — turns a place name (e.g. "Ulsan") into coordinates
 * using OpenStreetMap's free Nominatim service.
 */
header('Content-Type: application/json; charset=utf-8');

$q = isset($_GET['q']) ? trim($_GET['q']) : '';
if ($q === '') {
    http_response_code(400);
    echo json_encode(['error' => 'Missing search query']);
    exit;
}

$url = 'https://nominatim.openstreetmap.org/search?' . http_build_query([
    'q'      => $q,
    'format' => 'json',
    'limit'  => 1,
]);

$ch = curl_init($url);
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_TIMEOUT        => 15,
    CURLOPT_ENCODING       => '',
    CURLOPT_USERAGENT      => 'CAPR-F2026-WildlifeTracker/1.0 (student capstone project)',
]);
$raw  = curl_exec($ch);
$code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

if ($raw === false || $code !== 200) {
    http_response_code(502);
    echo json_encode(['error' => 'Could not reach location search service']);
    exit;
}

$data = json_decode($raw, true);
if (empty($data)) {
    http_response_code(404);
    echo json_encode(['error' => 'Location not found — try a different spelling']);
    exit;
}

echo json_encode([
    'lat'         => floatval($data[0]['lat']),
    'lng'         => floatval($data[0]['lon']),
    'displayName' => $data[0]['display_name'],
]);
?>
