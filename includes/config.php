<?php
/**
 * config.php (includes) — reads the settings once for all PHP files.
 *
 * On a laptop (XAMPP) they come from config/config.php, which is git-ignored because it holds
 * the database password. On the hosting server (Render) that file does not exist, so the safe
 * defaults in config/config.example.php are used instead, and environment variables set in the
 * host's dashboard (DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD) replace the database
 * settings. Without a database the site still works; only the species cache is skipped.
 */
function app_config(): array {
    static $config = null;
    if ($config !== null) return $config;

    $dir = __DIR__ . '/../config';
    $local = file_exists("$dir/config.php");
    $config = require ($local ? "$dir/config.php" : "$dir/config.example.php");

    $env = ['host' => 'DB_HOST', 'port' => 'DB_PORT', 'name' => 'DB_NAME', 'user' => 'DB_USER', 'password' => 'DB_PASSWORD'];
    foreach ($env as $key => $name) {
        $value = getenv($name);
        if ($value !== false && $value !== '') $config['db'][$key] = $value;
    }
    // On a server with no config.php and no DB_HOST there is no database: db.php then skips it
    // at once instead of waiting for a connection that cannot work
    if (!$local && !getenv('DB_HOST')) $config['db'] = null;
    return $config;
}
