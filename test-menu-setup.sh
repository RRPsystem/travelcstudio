#!/bin/bash

# Test script voor Menu Setup API
# Gebruik: ./test-menu-setup.sh <brand_id>

BRAND_ID="${1}"

if [ -z "$BRAND_ID" ]; then
  echo "❌ Error: brand_id is required"
  echo "Usage: ./test-menu-setup.sh <brand_id>"
  exit 1
fi

echo "🔧 Setting up menu for brand: $BRAND_ID"
echo ""

curl -X POST \
  https://huaaogdxxdcakxryecnw.supabase.co/functions/v1/setup-menu \
  -H "Content-Type: application/json" \
  -d "{\"brand_id\": \"$BRAND_ID\"}" \
  | jq '.'

echo ""
echo "✅ Done!"
