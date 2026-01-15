const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const tripId = '36a6ba90-6cfd-4b24-8dce-55321ca70f70';

async function fixSwellendamMetadata() {
  console.log('🔍 Fetching trip data...');

  const { data: trip, error } = await supabase
    .from('travel_trips')
    .select('*')
    .eq('id', tripId)
    .single();

  if (error) {
    console.error('❌ Error:', error);
    return;
  }

  console.log('📋 Current metadata:', JSON.stringify(trip.metadata, null, 2));

  const hotelRegex = /([^\t]+)\s+\(ID:\s+MASTER-\d+\s+\).*?\t([^\t]+)\t([^\t]+)\t([^\t]+)\t([^\t]+).*?(\d{2}\/\d{2}\/\d{4})\s+(\d+)/gs;

  const hotels = [];
  let match;

  while ((match = hotelRegex.exec(trip.custom_context)) !== null) {
    const hotelName = match[2].trim();
    const city = match[4].trim();
    const destination = match[5].trim();
    const checkInDate = match[6];
    const nights = parseInt(match[7]);

    hotels.push({
      name: hotelName,
      city,
      destination,
      checkInDate,
      nights
    });
  }

  console.log('\n🏨 Found hotels:', hotels);

  const existingItinerary = trip.metadata?.itinerary || [];

  const newEntries = [
    {
      day: 9,
      date: '19 januari',
      location: 'Addo Elephant National Park',
      hotel: {
        name: 'Addo Dung Beetle Guest Farm',
        address: 'Addo Elephant National Park',
        city: 'Addo',
        country: 'South Africa',
        has_restaurant: null,
        amenities: ['parking']
      },
      activities: ['Safari', 'Olifanten spotten']
    },
    {
      day: 10,
      date: '21 januari',
      location: 'Knysna',
      hotel: {
        name: 'Knysna Manor House',
        address: 'Knysna',
        city: 'Knysna',
        country: 'South Africa',
        has_restaurant: null,
        amenities: ['wifi']
      },
      activities: ['Waterfront', 'Lagune wandeling', 'Oesters eten']
    },
    {
      day: 11,
      date: '24 januari',
      location: 'Swellendam',
      hotel: {
        name: 'Aan de Oever Guesthouse',
        address: 'Swellendam',
        city: 'Swellendam',
        country: 'South Africa',
        has_restaurant: true,
        amenities: ['wifi', 'parking', 'tuin']
      },
      activities: ['Historisch centrum', 'Drostdy Museum']
    },
    {
      day: 12,
      date: '25 januari',
      location: 'Hermanus',
      hotel: {
        name: 'Whale Coast Ocean Villa',
        address: 'Hermanus',
        city: 'Hermanus',
        country: 'South Africa',
        has_restaurant: null,
        amenities: ['wifi', 'parking', 'zeezicht']
      },
      activities: ['Walvissen spotten', 'Cliff Path wandeling']
    }
  ];

  const completeItinerary = [...existingItinerary, ...newEntries];

  console.log('\n✅ Complete itinerary:', JSON.stringify(completeItinerary, null, 2));

  const { error: updateError } = await supabase
    .from('travel_trips')
    .update({
      metadata: {
        ...trip.metadata,
        itinerary: completeItinerary
      }
    })
    .eq('id', tripId);

  if (updateError) {
    console.error('❌ Update error:', updateError);
    return;
  }

  console.log('\n🎉 Metadata updated successfully!');
  console.log('\n📍 Now testing with Swellendam:');
  console.log('Swellendam hotel:', completeItinerary.find(d => d.location === 'Swellendam')?.hotel.name);
}

fixSwellendamMetadata().catch(console.error);
