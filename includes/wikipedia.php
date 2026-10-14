<?php
/**
 * wikipedia.php — short English summary of a species from Wikipedia.
 * Used by species.php for the Encyclopedia cards; the result is cached in species_cache.
 */

/**
 * Looks up the Wikipedia page for a scientific name (for example "Larus crassirostris";
 * Wikipedia redirects it to "Black-tailed gull"). Returns title, summary, page URL and
 * thumbnail; null if there is no suitable page; false if Wikipedia couldn't be reached
 * (then the caller should not cache the "no summary" result).
 */
function wiki_summary(?string $scientificName): array|null|false {
    if (!$scientificName) return null;
    $title = rawurlencode(str_replace(' ', '_', $scientificName));
    $ch = curl_init("https://en.wikipedia.org/api/rest_v1/page/summary/{$title}?redirect=true");
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_FOLLOWLOCATION => true,
        CURLOPT_TIMEOUT        => 10,
        CURLOPT_ENCODING       => '',
        // Wikipedia's API policy asks for a name and a contact link; without one, requests
        // are rate-limited much sooner (HTTP 429)
        CURLOPT_USERAGENT      => 'WildTrack/1.0 (https://github.com/Guptaji101/CAPR-F2026-WildlifeTracker; student project)',
    ]);
    $raw  = curl_exec($ch);
    $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    if ($code === 404) return null;                     // no article with this name
    if ($raw === false || $code !== 200) return false;  // network error, rate limit, …

    $page = json_decode($raw, true);
    // Skip disambiguation pages ("may refer to …"): they don't describe one animal
    if (!$page || ($page['type'] ?? '') !== 'standard' || empty($page['extract'])) return null;

    return [
        'title'   => $page['title'] ?? null,
        'summary' => $page['extract'],
        'url'     => $page['content_urls']['desktop']['page'] ?? null,
        'image'   => $page['thumbnail']['source'] ?? null,
    ];
}
