# Dockerfile — how the hosting server (Render) builds and runs WildTrack.
# It gives the same setup as XAMPP on a laptop: PHP 8.3 with the Apache web server.
FROM php:8.3-apache

# MySQL driver for the optional species_cache table (curl, used for GBIF, is already built in)
RUN docker-php-ext-install pdo_mysql

# The website is the public/ folder; includes/ and config/ stay outside it, as on XAMPP
ENV APACHE_DOCUMENT_ROOT=/var/www/html/public
RUN sed -ri -e 's!/var/www/html!${APACHE_DOCUMENT_ROOT}!g' /etc/apache2/sites-available/*.conf \
 && sed -ri -e 's!/var/www/!${APACHE_DOCUMENT_ROOT}!g' /etc/apache2/apache2.conf /etc/apache2/conf-available/*.conf

# Render tells the server which port to listen on in $PORT; 80 is used everywhere else
ENV PORT=80
RUN sed -i 's/Listen 80/Listen ${PORT}/' /etc/apache2/ports.conf \
 && sed -i 's/<VirtualHost \*:80>/<VirtualHost *:${PORT}>/' /etc/apache2/sites-available/000-default.conf

# Copy the project (files listed in .dockerignore, such as config/config.php, are left out)
COPY . /var/www/html/
