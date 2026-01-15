const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY
);

async function convertTripToStructuredData(tripId) {
  const { data: trip, error } = await supabase
    .from('trips')
    .select('*')
    .eq('id', tripId)
    .single();

  if (error || !trip) {
    console.error('❌ Trip niet gevonden:', error);
    return;
  }

  console.log('🔍 Converting trip:', trip.title);
  console.log('\n📄 Custom context:\n', trip.custom_context?.substring(0, 500));

  const customContext = trip.custom_context || '';

  const routeMatch = customContext.match(/Reisroute:\s*\n([^\n]+)/);
  const dateMatch = customContext.match(/Reis begint op:\s*([^\n]+)/);

  if (!routeMatch || !dateMatch) {
    console.error('❌ Kan route of datum niet vinden in custom_context');
    return;
  }

  const startDateStr = dateMatch[1].trim();
  const startDate = new Date(startDateStr);

  const locations = routeMatch[1]
    .split('→')
    .map(s => s.trim())
    .filter(s => s.length > 0);

  console.log('\n📍 Gevonden locaties:', locations);
  console.log('📅 Start datum:', startDate.toISOString().split('T')[0]);

  const hotelMapping = {
    'Johannesburg': { name: 'City Lodge Johannesburg Airport', address: 'Barbara Road', amenities: ['restaurant', 'wifi', 'parking'] },
    'Tzaneen': { name: 'Tamboti Lodge Guest House', amenities: ['pool', 'wifi', 'breakfast'] },
    'Graskop': { name: 'Westlodge At Graskop', amenities: ['restaurant', 'wifi'] },
    'Piet Retief': { name: 'Dusk to Dawn Guesthouse', amenities: ['wifi', 'breakfast'] },
    'St. Lucia': { name: 'Ndiza Lodge & Cabanas', amenities: ['restaurant', 'bar', 'pool', 'wifi'], has_restaurant: true },
    'KwaZulu-Natal': { name: 'Rhino Ridge Safari Lodge', amenities: ['restaurant', 'bar', 'pool', 'safari'] },
    'Umhlanga': { name: 'Tesorino', amenities: ['beach', 'wifi'] },
    'Addo Elephant National Park': { name: 'Addo Dung Beetle Guest Farm', amenities: ['restaurant', 'pool'] },
    'Knysna': { name: 'Knysna Manor House', amenities: ['restaurant', 'wifi'] },
    'Swellendam': { name: 'Aan de Oever Guesthouse', amenities: ['wifi', 'breakfast'] },
    'Hermanus': { name: 'Whale Coast Ocean Villa', amenities: ['beach', 'wifi'] }
  };

  const activitiesMapping = {
    'Johannesburg': ['Aankomst en check-in', 'Rust uit na lange vlucht'],
    'Tzaneen': ['Tzaneen Dam bezoeken', 'Agatha Crocodile Ranch', 'Locale markten verkennen'],
    'Graskop': ['Blyde River Canyon', 'God\'s Window', 'Bourke\'s Luck Potholes'],
    'St. Lucia': ['iSimangaliso Wetland Park', 'Boottocht (hippos & krokodillen)', 'Stranden verkennen'],
    'KwaZulu-Natal': ['Game drives in Hluhluwe-iMfolozi', 'Wildlife spotten'],
    'Hermanus': ['Walvissen spotten (seizoen)', 'Cliff Path wandeling', 'Wijnproeverijen']
  };

  const daysPerLocation = {
    'Johannesburg': 1,
    'Tzaneen': 2,
    'Graskop': 2,
    'Piet Retief': 1,
    'St. Lucia': 2,
    'KwaZulu-Natal': 2,
    'Umhlanga': 2,
    'Addo Elephant National Park': 2,
    'Knysna': 3,
    'Swellendam': 2,
    'Hermanus': 2
  };

  const itinerary = [];
  let currentDay = 1;
  let currentDate = new Date(startDate);

  for (const location of locations) {
    const days = daysPerLocation[location] || 1;
    const hotel = hotelMapping[location] || { name: `Hotel in ${location}`, amenities: [] };
    const activities = activitiesMapping[location] || [`Verken ${location}`];

    for (let i = 0; i < days; i++) {
      itinerary.push({
        day: currentDay,
        date: currentDate.toISOString().split('T')[0],
        location: location,
        hotel: hotel,
        activities: activities,
        highlights: i === 0 ? [`Aankomst in ${location}`] : [`Dag ${i + 1} in ${location}`]
      });

      currentDay++;
      currentDate.setDate(currentDate.getDate() + 1);
    }
  }

  const endDate = new Date(currentDate);
  endDate.setDate(endDate.getDate() - 1);

  const structuredMetadata = {
    itinerary: itinerary,
    total_days: currentDay - 1,
    start_date: startDate.toISOString().split('T')[0],
    end_date: endDate.toISOString().split('T')[0],
    route: locations
  };

  console.log('\n✅ Gestructureerde metadata:\n', JSON.stringify(structuredMetadata, null, 2));

  const { error: updateError } = await supabase
    .from('trips')
    .update({ metadata: structuredMetadata })
    .eq('id', tripId);

  if (updateError) {
    console.error('❌ Fout bij updaten:', updateError);
  } else {
    console.log('\n✅ Trip metadata succesvol geüpdatet!');
    console.log('\n📊 Test queries:');
    console.log(`SELECT get_current_trip_day('${tripId}');`);
    console.log(`SELECT get_hotel_for_location('${tripId}', 'St. Lucia');`);
  }
}

const tripId = process.argv[2];
if (!tripId) {
  console.error('❌ Gebruik: node convert-trip-to-structured-data.cjs <trip-id>');
  process.exit(1);
}

convertTripToStructuredData(tripId).catch(console.error);
