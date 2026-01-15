#!/bin/bash

# Test script to register AI Website Studio as an external builder

SUPABASE_URL="${VITE_SUPABASE_URL}"
SUPABASE_ANON_KEY="${VITE_SUPABASE_ANON_KEY}"

if [ -z "$SUPABASE_URL" ]; then
  echo "❌ Error: VITE_SUPABASE_URL not set"
  echo "Please set it in your .env file"
  exit 1
fi

if [ -z "$SUPABASE_ANON_KEY" ]; then
  echo "❌ Error: VITE_SUPABASE_ANON_KEY not set"
  echo "Please set it in your .env file"
  exit 1
fi

echo "🚀 Registering AI Website Studio..."
echo "Registration URL: https://www.ai-websitestudio.nl/api/templates/registration"
echo ""

RESPONSE=$(curl -s -X POST \
  "${SUPABASE_URL}/functions/v1/register-external-builder" \
  -H "Authorization: Bearer ${SUPABASE_ANON_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "registration_url": "https://www.ai-websitestudio.nl/api/templates/registration"
  }')

echo "Response:"
echo "$RESPONSE" | jq '.'

if echo "$RESPONSE" | jq -e '.success' > /dev/null 2>&1; then
  echo ""
  echo "✅ Builder registered successfully!"
  echo ""
  echo "Categories:"
  echo "$RESPONSE" | jq -r '.builder.builder_categories[] | "  - \(.display_name) (\(.total_pages) pages)"'
  echo ""
  echo "Next steps:"
  echo "1. Log in as operator"
  echo "2. Go to Dashboard > QuickStart Templates"
  echo "3. Create a QuickStart template using one of these categories"
else
  echo ""
  echo "❌ Registration failed"
  echo "Please check the error message above"
fi
