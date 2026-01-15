/**
 * TRAVELBRO SECURITY TEST
 *
 * Deze test probeert als ANONIEME gebruiker (niet ingelogd) data op te halen.
 * Als de beveiliging goed staat, moet dit FALEN.
 *
 * Gebruik: node test-travelbro-security.js
 */

import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missende environment variables!');
  process.exit(1);
}

// Maak een ANONIEME client (niet ingelogd)
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testSecurity() {
  console.log('🔍 TRAVELBRO SECURITY TEST');
  console.log('═══════════════════════════════════════\n');

  let allTestsPassed = true;

  // Test 1: Probeer travel_intakes te lezen
  console.log('Test 1: Probeer intake data te lezen (moet FALEN)');
  const { data: intakes, error: intakesError } = await supabase
    .from('travel_intakes')
    .select('*')
    .limit(1);

  if (intakesError || !intakes || intakes.length === 0) {
    console.log('✅ GOED: Geen toegang tot intake data');
    console.log(`   Error: ${intakesError?.message || 'Geen data teruggegeven'}\n`);
  } else {
    console.log('❌ GEVAARLIJK: Wel toegang tot intake data!');
    console.log(`   Aantal intakes zichtbaar: ${intakes.length}\n`);
    allTestsPassed = false;
  }

  // Test 2: Probeer conversations te lezen
  console.log('Test 2: Probeer conversaties te lezen (moet FALEN)');
  const { data: conversations, error: conversationsError } = await supabase
    .from('travel_conversations')
    .select('*')
    .limit(1);

  if (conversationsError || !conversations || conversations.length === 0) {
    console.log('✅ GOED: Geen toegang tot conversaties');
    console.log(`   Error: ${conversationsError?.message || 'Geen data teruggegeven'}\n`);
  } else {
    console.log('❌ GEVAARLIJK: Wel toegang tot conversaties!');
    console.log(`   Aantal conversaties zichtbaar: ${conversations.length}\n`);
    allTestsPassed = false;
  }

  // Test 3: Probeer trips te lezen
  console.log('Test 3: Probeer trip data te lezen (moet FALEN)');
  const { data: trips, error: tripsError } = await supabase
    .from('travel_trips')
    .select('*')
    .limit(1);

  if (tripsError || !trips || trips.length === 0) {
    console.log('✅ GOED: Geen toegang tot trip data');
    console.log(`   Error: ${tripsError?.message || 'Geen data teruggegeven'}\n`);
  } else {
    console.log('❌ GEVAARLIJK: Wel toegang tot trip data!');
    console.log(`   Aantal trips zichtbaar: ${trips.length}\n`);
    allTestsPassed = false;
  }

  // Test 4: Probeer WhatsApp sessions te lezen
  console.log('Test 4: Probeer WhatsApp sessies te lezen (moet FALEN)');
  const { data: sessions, error: sessionsError } = await supabase
    .from('travel_whatsapp_sessions')
    .select('*')
    .limit(1);

  if (sessionsError || !sessions || sessions.length === 0) {
    console.log('✅ GOED: Geen toegang tot WhatsApp sessies');
    console.log(`   Error: ${sessionsError?.message || 'Geen data teruggegeven'}\n`);
  } else {
    console.log('❌ GEVAARLIJK: Wel toegang tot WhatsApp sessies!');
    console.log(`   Aantal sessies zichtbaar: ${sessions.length}\n`);
    allTestsPassed = false;
  }

  // Eindresultaat
  console.log('═══════════════════════════════════════');
  if (allTestsPassed) {
    console.log('✅ ALLE TESTS GESLAAGD - Data is veilig!');
    console.log('   Anonieme gebruikers kunnen geen klantdata zien.');
  } else {
    console.log('❌ SECURITY WAARSCHUWING!');
    console.log('   Er is data toegankelijk voor niet-ingelogde gebruikers!');
    console.log('   Neem contact op met je developer.');
  }
  console.log('═══════════════════════════════════════\n');
}

testSecurity();
