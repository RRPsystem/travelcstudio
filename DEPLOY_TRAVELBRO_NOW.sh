#!/bin/bash
#
# TravelBro Vision Fix - Manual Deployment Script
#
# INSTRUCTIES:
# 1. Zorg dat je ingelogd bent bij Supabase: npx supabase login
# 2. Run dit script: ./DEPLOY_TRAVELBRO_NOW.sh
#

set -e

echo "🚀 Deploying TravelBro with Vision Fix..."
echo ""

# Check if logged in
if ! npx supabase projects list > /dev/null 2>&1; then
    echo "❌ Not logged in to Supabase!"
    echo "   Run: npx supabase login"
    exit 1
fi

echo "✅ Supabase login verified"
echo ""

# Go to project directory
cd "$(dirname "$0")"

# Deploy function
echo "📦 Deploying travelbro-chat function..."
npx supabase functions deploy travelbro-chat \
    --project-ref huaaogdxxdcakxryecnw \
    --no-verify-jwt

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ DEPLOYMENT SUCCESSFUL!"
    echo ""
    echo "🎯 Vision triggers now include:"
    echo "   - 'waar is dit'"
    echo "   - 'kun je zien waar'"
    echo "   - 'welke plek'"
    echo "   - 'herken je deze locatie'"
    echo ""
    echo "🧪 Test with WhatsApp:"
    echo "   Send foto + text: 'kun je zien waar dit is?'"
    echo ""
else
    echo ""
    echo "❌ DEPLOYMENT FAILED"
    echo "   Check error messages above"
    exit 1
fi
