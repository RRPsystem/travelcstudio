#!/bin/bash
set -e

echo "🚀 Deploying travelbro-chat with vision fix..."

# Go to project directory
cd /tmp/cc-agent/57777034/project

# Load environment variables
export $(cat .env | grep -v '^#' | grep -v '^$' | xargs)

# Deploy using npx supabase
echo "📦 Running deployment..."
npx --yes supabase@latest functions deploy travelbro-chat --no-verify-jwt --project-ref huaaogdxxdcakxryecnw

echo "✅ Deployment complete!"
echo ""
echo "🔍 Vision triggers now include:"
echo "  - waar is dit"
echo "  - kun je de foto herkennen"
echo "  - welke plek"
echo "  - waar ben ik"
