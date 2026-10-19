<?php
/**
 * cache.php — a small file cache for answers from GBIF, Nominatim and Wikipedia.
 *
 * Asking GBIF again for the same search takes 2–5 seconds; reading the saved answer takes a few
 * milliseconds. Each answer is saved as one JSON file in the server's temporary folder, named
 * after a hash of the request. Files older than the given age are ignored and later replaced.
 * The folder is temporary on purpose: if it is emptied (for example when Render restarts the
 * server), the site simply asks GBIF again. Nothing personal is stored, only public data.
 */
// Raise this number when the saved answers change meaning (for example 2 = fish classified by
// their order; 3 = place suggestions without duplicate parks, 19 Oct): all older files are
// then ignored and replaced by fresh answers.
const CACHE_VERSION = 3;

function cache_file(string $key): string {
    $dir = sys_get_temp_dir() . '/wildtrack-cache';
    if (!is_dir($dir)) @mkdir($dir, 0777, true);
    return $dir . '/' . md5(CACHE_VERSION . ':' . $key) . '.json';
}

// The saved answer for $key if it is younger than $maxAgeSeconds, else null
function cache_get(string $key, int $maxAgeSeconds): ?array {
    $file = cache_file($key);
    if (!is_file($file) || filemtime($file) < time() - $maxAgeSeconds) return null;
    $data = json_decode((string)@file_get_contents($file), true);
    return is_array($data) ? $data : null;
}

// Save an answer; if the folder cannot be written, the site just works without the cache
function cache_put(string $key, array $value): void {
    @file_put_contents(cache_file($key), json_encode($value), LOCK_EX);
}
