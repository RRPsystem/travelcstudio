#!/bin/bash

# Deploy the fixed Google API functions that now use database keys

echo "🚀 Deploying fixed Google API functions..."
echo ""

# Check if supabase CLI is available
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI not found!"
    echo ""
    echo "Please install it first:"
    echo "  npm install -g supabase"
    echo ""
    echo "Or deploy manually via Supabase Dashboard:"
    echo "  1. Go to https://supabase.com/dashboard"
    echo "  2. Select your project → Edge Functions"
    echo "  3. Update these functions with the code from:"
    echo "     - supabase/functions/google-routes/index.ts"
    echo "     - supabase/functions/travelbro-chat/index.ts"
    exit 1
fi

echo "✅ Supabase CLI found"
echo ""

# Deploy google-routes
echo "📦 Deploying google-routes..."
supabase functions deploy google-routes

if [ $? -eq 0 ]; then
    echo "✅ google-routes deployed successfully"
else
    echo "❌ Failed to deploy google-routes"
    exit 1
fi

echo ""

# Deploy travelbro-chat
echo "📦 Deploying travelbro-chat..."
supabase functions deploy travelbro-chat

if [ $? -eq 0 ]; then
    echo "✅ travelbro-chat deployed successfully"
else
    echo "❌ Failed to deploy travelbro-chat"
    exit 1
fi

echo ""
echo "🎉 All functions deployed successfully!"
echo ""
echo "These functions now securely fetch API keys from the database."
echo "You can now remove VITE_GOOGLE_SEARCH_API_KEY and VITE_GOOGLE_SEARCH_ENGINE_ID"
echo "from your Vercel environment variables."
