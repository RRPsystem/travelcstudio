#!/bin/bash

# Deploy travelbro-chat with all dependencies
echo "🚀 Deploying travelbro-chat fix..."

# Check if we have Supabase access
if [ -z "$SUPABASE_ACCESS_TOKEN" ]; then
  echo "❌ SUPABASE_ACCESS_TOKEN not set"
  echo ""
  echo "📋 Manual deployment needed:"
  echo "1. Go to: https://supabase.com/dashboard/project/yypruyrcihpvqcaicaig/functions/travelbro-chat"
  echo "2. Copy ALL files from: supabase/functions/travelbro-chat/"
  echo "3. Make sure index.ts has these CRITICAL changes:"
  echo "   - Line 83: .from('travel_trips')  // NOT 'trips'"
  echo "   - Line 100: .from('travel_trips') // NOT 'trips'"
  echo ""
  echo "🔑 The KEY FIX is changing 'trips' to 'travel_trips' in two places"
  exit 1
fi

# Deploy function
echo "Deploying function..."
npx supabase functions deploy travelbro-chat

echo "✅ Deployment complete!"
