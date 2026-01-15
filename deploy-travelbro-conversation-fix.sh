#!/bin/bash

# ============================================
# TravelBro Conversation Fix - Deployment
# ============================================

echo "🚀 Deploying TravelBro Conversation Fix..."
echo ""

# Deploy the edge function
echo "📦 Deploying travelbro-chat edge function..."
supabase functions deploy travelbro-chat

if [ $? -eq 0 ]; then
  echo ""
  echo "✅ Deployment successful!"
  echo ""
  echo "🎯 What's Fixed:"
  echo "  1. ✅ Conversation history is now SAVED to database"
  echo "  2. ✅ TravelBro remembers context (last 20 messages)"
  echo "  3. ✅ Recent context summary (last 3 messages highlighted)"
  echo "  4. ✅ Better conversation flow instructions"
  echo "  5. ✅ Optimized model (gpt-4o-mini) & temperature (0.8)"
  echo ""
  echo "🧪 How to Test:"
  echo "  1. Start a WhatsApp conversation with TravelBro"
  echo "  2. Ask about a location: 'Vertel over Swellendam'"
  echo "  3. Follow-up WITHOUT mentioning location: 'Is er een restaurant?'"
  echo "  4. TravelBro should know you mean Swellendam! ✅"
  echo ""
  echo "🔍 Debug Conversation History:"
  echo "  Run this query in Supabase:"
  echo ""
  echo "  SELECT role, LEFT(message, 50) as preview, created_at"
  echo "  FROM travel_conversations"
  echo "  WHERE session_token = 'YOUR_SESSION_TOKEN'"
  echo "  ORDER BY created_at DESC LIMIT 10;"
  echo ""
  echo "📖 Read TRAVELBRO_CONVERSATION_FIX.md for full details"
  echo ""
else
  echo ""
  echo "❌ Deployment failed!"
  echo "Check your Supabase CLI setup and project link"
  echo ""
  exit 1
fi
