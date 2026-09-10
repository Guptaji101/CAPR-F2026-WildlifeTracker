CREATE DATABASE IF NOT EXISTS wildlife_tracker
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE wildlife_tracker;

CREATE TABLE IF NOT EXISTS saved_locations (
    id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    label       VARCHAR(120) NOT NULL,
    latitude    DECIMAL(9,6) NOT NULL,
    longitude   DECIMAL(9,6) NOT NULL,
    radius_km   DECIMAL(6,2) DEFAULT 10.00,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS search_history (
    id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    query       VARCHAR(160) NULL,
    latitude    DECIMAL(9,6) NULL,
    longitude   DECIMAL(9,6) NULL,
    radius_km   DECIMAL(6,2) NULL,
    taxon_key   VARCHAR(40)  NULL,
    searched_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_searched_at (searched_at)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS species_cache (
    species_key     INT UNSIGNED PRIMARY KEY,
    scientific_name VARCHAR(200) NULL,
    common_name     VARCHAR(200) NULL,
    taxon_group     VARCHAR(80)  NULL,
    image_url       VARCHAR(500) NULL,
    cached_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;