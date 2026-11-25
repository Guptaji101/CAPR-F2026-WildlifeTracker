<?php
/**
 * korean-places.php — the main places of South Korea by their Korean name (부산, 경주, 지리산).
 *
 * 25 Nov 2026: Nominatim and Photon often find a small place with the same Korean name ("부산" found
 * a hill in South Chungcheong, "지리산" an island near Tongyeong). So about 210 cities, counties, districts,
 * provinces, national parks and islands are looked up in public/data/korean-place-names.json first. Their
 * coordinates come from korea-places.json (the built-in place list).
 *
 *   korean_place('부산'), korean_place('부산광역시'), korean_place('지리산 국립공원')  ->  the place
 *   anything else  ->  null (the search services are asked as before)
 */
function korean_place(string $q): ?array
{
    if (!preg_match('/^[가-힣\s]+$/u', $q)) return null;   // only Korean letters
    $list = json_decode(@file_get_contents(__DIR__ . '/../public/data/korean-place-names.json') ?: '[]', true) ?: [];
    $name = preg_replace('/\s+/u', '', $q);
    // As typed, else without the ending: 부산시, 부산광역시, 양평군, 해운대구, 제주특별자치도, 지리산국립공원
    $short = preg_replace('/(특별자치시|특별자치도|특별시|광역시|국립공원|시|군|구|도)$/u', '', $name);
    return $list[$name] ?? $list[$short] ?? null;
}
