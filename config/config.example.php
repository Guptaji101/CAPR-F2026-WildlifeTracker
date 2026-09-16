<?php
return [
    'db' => [
        'host'     => 'localhost',
        'port'     => 3306,
        'name'     => 'wildlife_tracker',
        'user'     => 'root',
        'password' => '',
        'charset'  => 'utf8mb4',
    ],
    'gbif' => [
        'base_url' => 'https://api.gbif.org/v1',
        'timeout'  => 30,
        'limit'    => 300,
    ],
    'app' => [
        'env'      => 'local',
        'debug'    => true,
        'base_url' => 'http://localhost/CAPR-F2026-WildlifeTracker/public',
    ],
];  