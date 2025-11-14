#!/bin/bash

echo "🚀 Deploying fixed Edge Functions with query token support..."

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ Error: Supabase CLI not found. Please install it first."
    echo "Run: npm install -g supabase"
    exit 1
fi

# Deploy pages-api
echo ""
echo "📦 Deploying pages-api..."
cd supabase/functions/pages-api
supabase functions deploy pages-api --no-verify-jwt
if [ $? -eq 0 ]; then
    echo "✅ pages-api deployed successfully"
else
    echo "⚠️  pages-api deployment failed (may need manual review)"
fi
cd ../../..

# Deploy layouts-api
echo ""
echo "📦 Deploying layouts-api..."
cd supabase/functions/layouts-api
supabase functions deploy layouts-api --no-verify-jwt
if [ $? -eq 0 ]; then
    echo "✅ layouts-api deployed successfully"
else
    echo "⚠️  layouts-api deployment failed (may need manual review)"
fi
cd ../../..

# Deploy menus-api
echo ""
echo "📦 Deploying menus-api..."
cd supabase/functions/menus-api
supabase functions deploy menus-api --no-verify-jwt
if [ $? -eq 0 ]; then
    echo "✅ menus-api deployed successfully"
else
    echo "⚠️  menus-api deployment failed (may need manual review)"
fi
cd ../../..

echo ""
echo "🎉 Deployment complete!"
echo ""
echo "Next steps:"
echo "1. Test the Builder by creating/editing a template"
echo "2. Check Supabase Edge Function logs for any errors"
echo "3. Verify JWT token is being accepted from query parameters"
