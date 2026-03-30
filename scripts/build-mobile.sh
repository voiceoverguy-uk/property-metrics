#!/bin/bash
set -e

echo "Building mobile web assets..."

# Create output directory
mkdir -p mobile/www

# Copy all public files
cp -r public/. mobile/www/

# Replace template variables in index.html with mobile-appropriate values
sed -i \
  -e 's|%%PAGE_TITLE%%|RentalMetrics – UK Buy-to-Let Calculator|g' \
  -e 's|%%META_DESC%%|Free UK buy-to-let deal calculator. Analyse rental yield, stamp duty, mortgage stress tests and more.|g' \
  -e 's|%%CANONICAL%%|https://rentalmetrics.co.uk/|g' \
  -e 's|%%OG_TITLE%%|RentalMetrics – UK Buy-to-Let Calculator|g' \
  -e 's|%%OG_DESC%%|Free UK buy-to-let deal calculator and modelling tool.|g' \
  -e 's|%%OG_URL%%|https://rentalmetrics.co.uk/|g' \
  -e 's|%%OG_IMAGE%%|https://rentalmetrics.co.uk/rental-metrics-logo-primary-1200x630-og.png|g' \
  mobile/www/index.html

echo "Mobile assets built in mobile/www/"
echo "Run 'npx cap sync' to sync to iOS and Android projects."
