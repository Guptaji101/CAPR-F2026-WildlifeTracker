CREATE DATABASE IF NOT EXISTS wildlife_tracker
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE wildlife_tracker;

-- Species details from the GBIF Species API (plus a short Wikipedia summary), saved the first
-- time a species is viewed so species.php can answer later requests without calling GBIF
-- or Wikipedia again (System Design, Section 4).
-- saved_locations and search_history were dropped: they need user accounts or have no use case.
CREATE TABLE IF NOT EXISTS species_cache (
    species_key     INT UNSIGNED PRIMARY KEY,   -- GBIF species key
    scientific_name VARCHAR(200) NULL,
    vernacular_name VARCHAR(200) NULL,          -- English common name
    taxon_rank      VARCHAR(20)  NULL,
    kingdom         VARCHAR(100) NULL,
    phylum          VARCHAR(100) NULL,
    class_name      VARCHAR(100) NULL,          -- "class" is a reserved word in PHP
    order_name      VARCHAR(100) NULL,          -- "order" is a reserved word in SQL
    family          VARCHAR(100) NULL,
    genus           VARCHAR(100) NULL,
    species         VARCHAR(200) NULL,
    image_url       VARCHAR(500) NULL,          -- Wikipedia thumbnail, else a GBIF photo
    summary         TEXT         NULL,          -- first paragraph of the Wikipedia article
    wiki_url        VARCHAR(300) NULL,
    cached_at       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;
