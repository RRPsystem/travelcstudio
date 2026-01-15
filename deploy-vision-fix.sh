#!/bin/bash

# Script to deploy travelbro-chat function with vision fix

cd /tmp/cc-agent/57777034/project/supabase/functions/travelbro-chat

# Check if we have the Supabase CLI
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI not found"
    echo "Installing via npx..."

    # Deploy using npx
    npx supabase@latest functions deploy travelbro-chat --no-verify-jwt
else
    # Deploy using local CLI
    supabase functions deploy travelbro-chat --no-verify-jwt
fi

echo "✅ Deployment complete!"
