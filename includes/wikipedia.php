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

/**
 * Finds the GBIF key of an animal from its everyday English name (for example "tiger").
 * Wikipedia redirects the name to the animal's page ("Tiger"), and Wikidata stores that page's
 * GBIF taxon ID (property P846). Returns ['key' => 5219416, 'title' => 'Tiger'], or null.
 * Used by animal.php, because GBIF's own name search doesn't find "tiger".
 */
function wiki_gbif_key(string $name): ?array {
    // 1. Wikipedia page for the name (following redirects) and its Wikidata item
    $page = wiki_get('https://en.wikipedia.org/w/api.php?' . http_build_query([
        'action' => 'query', 'format' => 'json', 'redirects' => 1,
        'prop' => 'pageprops', 'ppprop' => 'wikibase_item', 'titles' => $name,
    ]));
    $page = $page ? current($page['query']['pages'] ?? []) : null;
    $item = $page['pageprops']['wikibase_item'] ?? null;
    if (!$item) return null;

    // 2. The GBIF ID stored on that Wikidata item (missing for pages like "Magpie",
    //    which describe a group of birds rather than one species)
    $claims = wiki_get('https://www.wikidata.org/w/api.php?' . http_build_query([
        'action' => 'wbgetclaims', 'format' => 'json', 'entity' => $item, 'property' => 'P846',
    ]));
    $key = $claims['claims']['P846'][0]['mainsnak']['datavalue']['value'] ?? null;
    return $key ? ['key' => (int)$key, 'title' => $page['title']] : null;
}

// GET request to Wikipedia or Wikidata with the contact User-Agent; decoded JSON or null
function wiki_get(string $url): ?array {
    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT        => 10,
        CURLOPT_ENCODING       => '',
        CURLOPT_USERAGENT      => 'WildTrack/1.0 (https://github.com/Guptaji101/CAPR-F2026-WildlifeTracker; student project)',
    ]);
    $raw  = curl_exec($ch);
    $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    return ($raw !== false && $code === 200) ? json_decode($raw, true) : null;
}
