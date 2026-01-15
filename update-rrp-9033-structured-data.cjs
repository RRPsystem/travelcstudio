const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load .env manually
const envPath = path.join(__dirname, '.env');
const envFile = fs.readFileSync(envPath, 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
  const [key, ...valueParts] = line.split('=');
  if (key && valueParts.length > 0) {
    env[key.trim()] = valueParts.join('=').trim();
  }
});

const supabase = createClient(
  env.VITE_SUPABASE_URL,
  env.VITE_SUPABASE_SERVICE_ROLE_KEY
);

/**
 * Update RRP-9033 trip met structured data op basis van PDF
 */

const structuredData = {
  itinerary: [
    // Dag 1: Johannesburg (5-6 Jan)
    {
      day: 1,
      date: '2026-01-05',
      location: 'Johannesburg',
      hotel: {
        name: 'City Lodge Johannesburg Airport, Barbara Road',
        amenities: ['airport shuttle', 'pool', 'wifi', 'restaurant', 'bar'],
        has_restaurant: true
      },
      activities: ['Aankomst', 'Rust uit na lange vlucht', 'Apartheid Museum'],
      highlights: ['Aankomst in Zuid-Afrika']
    },

    // Dag 2-3: Welgevonden Game Reserve (6-8 Jan)
    {
      day: 2,
      date: '2026-01-06',
      location: 'Welgevonden Game Reserve',
      hotel: {
        name: 'Welgevonden Game Reserve Lodge',
        amenities: ['safari', 'game drives', 'restaurant', 'bar'],
        has_restaurant: true
      },
      activities: ['Game drives', 'Big Five spotting', 'Bushveld safari'],
      highlights: ['Start van safari avontuur']
    },
    {
      day: 3,
      date: '2026-01-07',
      location: 'Welgevonden Game Reserve',
      hotel: {
        name: 'Welgevonden Game Reserve Lodge',
        amenities: ['safari', 'game drives', 'restaurant', 'bar'],
        has_restaurant: true
      },
      activities: ['Morning game drive', 'Evening game drive'],
      highlights: ['Cheetah en brown hyena spotten']
    },

    // Dag 4-5: Tzaneen (8-10 Jan)
    {
      day: 4,
      date: '2026-01-08',
      location: 'Tzaneen',
      hotel: {
        name: 'Tamboti Lodge Guest House',
        amenities: ['pool', 'wifi', 'breakfast included'],
        has_restaurant: false
      },
      activities: ['Tzaneen Dam', 'Agatha Crocodile Ranch', 'Locale markten'],
      highlights: ['Tropische tuin omgeving']
    },
    {
      day: 5,
      date: '2026-01-09',
      location: 'Tzaneen',
      hotel: {
        name: 'Tamboti Lodge Guest House',
        amenities: ['pool', 'wifi', 'breakfast included'],
        has_restaurant: false
      },
      activities: ['Verken Tzaneen Dam', 'Zwemmen', 'Relaxen'],
      highlights: ['Dag 2 in Tzaneen']
    },

    // Dag 6-7: Graskop (10-12 Jan)
    {
      day: 6,
      date: '2026-01-10',
      location: 'Graskop',
      hotel: {
        name: 'Westlodge At Graskop',
        amenities: ['restaurant', 'wifi', 'breakfast included'],
        has_restaurant: true
      },
      activities: ['Blyde River Canyon', "God's Window", "Bourke's Luck Potholes"],
      highlights: ['Spectacular canyon views']
    },
    {
      day: 7,
      date: '2026-01-11',
      location: 'Graskop',
      hotel: {
        name: 'Westlodge At Graskop',
        amenities: ['restaurant', 'wifi', 'breakfast included'],
        has_restaurant: true
      },
      activities: ['Panorama Route', 'Watervallen', 'Hiking'],
      highlights: ['Dag 2 Blyde River gebied']
    },

    // Dag 8: Piet Retief (12-13 Jan)
    {
      day: 8,
      date: '2026-01-12',
      location: 'Piet Retief',
      hotel: {
        name: 'Dusk to Dawn Guesthouse',
        amenities: ['wifi', 'breakfast included', 'pool', 'bbq'],
        has_restaurant: false
      },
      activities: ['Tussenstop', 'Dutch Reformed Church bezoeken'],
      highlights: ['Rustdag onderweg']
    },

    // Dag 9-11: St. Lucia (13-16 Jan)
    {
      day: 9,
      date: '2026-01-13',
      location: 'St. Lucia',
      hotel: {
        name: 'Ndiza Lodge & Cabanas',
        amenities: ['restaurant', 'bar', 'pool', 'wifi'],
        has_restaurant: true
      },
      activities: ['iSimangaliso Wetland Park', 'Boottocht', 'Hippos en krokodillen'],
      highlights: ['Aankomst in wetland paradise']
    },
    {
      day: 10,
      date: '2026-01-14',
      location: 'St. Lucia',
      hotel: {
        name: 'Ndiza Lodge & Cabanas',
        amenities: ['restaurant', 'bar', 'pool', 'wifi'],
        has_restaurant: true
      },
      activities: ['Strand', 'Boat cruise', 'Wildlife viewing'],
      highlights: ['Dag 2 in St. Lucia']
    },
    {
      day: 11,
      date: '2026-01-15',
      location: 'St. Lucia',
      hotel: {
        name: 'Ndiza Lodge & Cabanas',
        amenities: ['restaurant', 'bar', 'pool', 'wifi'],
        has_restaurant: true
      },
      activities: ['Beach day', 'Relaxen', 'Optional activities'],
      highlights: ['Laatste dag in St. Lucia']
    },

    // Dag 12-13: KwaZulu-Natal (16-18 Jan)
    {
      day: 12,
      date: '2026-01-16',
      location: 'KwaZulu-Natal',
      hotel: {
        name: 'Rhino Ridge Safari Lodge',
        amenities: ['restaurant', 'bar', 'spa', 'pool', 'safari', 'full board'],
        has_restaurant: true
      },
      activities: ['Hluhluwe-iMfolozi game drives', 'Big Five', 'Safari'],
      highlights: ['Luxury safari lodge']
    },
    {
      day: 13,
      date: '2026-01-17',
      location: 'KwaZulu-Natal',
      hotel: {
        name: 'Rhino Ridge Safari Lodge',
        amenities: ['restaurant', 'bar', 'spa', 'pool', 'safari', 'full board'],
        has_restaurant: true
      },
      activities: ['Morning game drive', 'Spa treatments', 'Evening drive'],
      highlights: ['Dag 2 safari experience']
    },

    // Dag 14: Umhlanga (18-19 Jan)
    {
      day: 14,
      date: '2026-01-18',
      location: 'Umhlanga',
      hotel: {
        name: 'Tesorino',
        amenities: ['pool', 'wifi', 'breakfast included', 'bar'],
        has_restaurant: true
      },
      activities: ['Beach', 'Umhlanga Rocks', 'Shopping'],
      highlights: ['Coastal resort town']
    },

    // Dag 15: Durban (19 Jan - vlucht dag)
    {
      day: 15,
      date: '2026-01-19',
      location: 'Durban',
      hotel: {
        name: 'Durban - vlucht naar Port Elizabeth',
        amenities: [],
        has_restaurant: false
      },
      activities: ['Vlucht Durban → Port Elizabeth'],
      highlights: ['Travel day']
    },

    // Dag 16-17: Addo Elephant National Park (19-21 Jan)
    {
      day: 16,
      date: '2026-01-19',
      location: 'Addo Elephant National Park',
      hotel: {
        name: 'Addo Dung Beetle Guest Farm',
        amenities: ['pool', 'wifi', 'safari', 'hiking'],
        has_restaurant: false
      },
      activities: ['Addo Elephant National Park safari', 'Elephant spotting'],
      highlights: ['600+ olifanten!']
    },
    {
      day: 17,
      date: '2026-01-20',
      location: 'Addo Elephant National Park',
      hotel: {
        name: 'Addo Dung Beetle Guest Farm',
        amenities: ['pool', 'wifi', 'safari', 'hiking'],
        has_restaurant: false
      },
      activities: ['Game drive', 'Elephant viewing'],
      highlights: ['Dag 2 Addo']
    },

    // Dag 18-20: Knysna (21-24 Jan)
    {
      day: 18,
      date: '2026-01-21',
      location: 'Knysna',
      hotel: {
        name: 'Knysna Manor House',
        amenities: ['wifi'],
        has_restaurant: false
      },
      activities: ['Knysna Heads', 'Featherbed Nature Reserve', 'Lagoon'],
      highlights: ['Garden Route beginnen']
    },
    {
      day: 19,
      date: '2026-01-22',
      location: 'Knysna',
      hotel: {
        name: 'Knysna Manor House',
        amenities: ['wifi'],
        has_restaurant: false
      },
      activities: ['Strand', 'Vissen', 'Whale watching'],
      highlights: ['Dag 2 Knysna']
    },
    {
      day: 20,
      date: '2026-01-23',
      location: 'Knysna',
      hotel: {
        name: 'Knysna Manor House',
        amenities: ['wifi'],
        has_restaurant: false
      },
      activities: ['Mountain biking', 'Beaches', 'Relaxen'],
      highlights: ['Dag 3 Knysna']
    },

    // Dag 21: Swellendam (24-25 Jan)
    {
      day: 21,
      date: '2026-01-24',
      location: 'Swellendam',
      hotel: {
        name: 'Aan de Oever Guesthouse',
        amenities: ['wifi', 'breakfast'],
        has_restaurant: false
      },
      activities: ['Cape Dutch architectuur', 'Historic town'],
      highlights: ['3e oudste stad Zuid-Afrika']
    },

    // Dag 22-23: Hermanus (25-27 Jan)
    {
      day: 22,
      date: '2026-01-25',
      location: 'Hermanus',
      hotel: {
        name: 'Whale Coast Ocean Villa',
        amenities: ['beach', 'wifi'],
        has_restaurant: false
      },
      activities: ['Whale watching', 'Cliff Path', 'Wine tasting'],
      highlights: ['Beste whale watching ter wereld']
    },
    {
      day: 23,
      date: '2026-01-26',
      location: 'Hermanus',
      hotel: {
        name: 'Whale Coast Ocean Villa',
        amenities: ['beach', 'wifi'],
        has_restaurant: false
      },
      activities: ['Beach', 'Walvissen spotten', 'Wijnproeverijen'],
      highlights: ['Dag 2 Hermanus']
    },

    // Dag 24-28: Cape Town (27 Jan - 1 Feb)
    {
      day: 24,
      date: '2026-01-27',
      location: 'Cape Town',
      hotel: {
        name: 'Cape Town Hotel',
        amenities: [],
        has_restaurant: false
      },
      activities: ['Table Mountain', 'V&A Waterfront', 'City tour'],
      highlights: ['Aankomst Mother City']
    },
    {
      day: 25,
      date: '2026-01-28',
      location: 'Cape Town',
      hotel: {
        name: 'Cape Town Hotel',
        amenities: [],
        has_restaurant: false
      },
      activities: ['Cape Point', 'Boulders Beach', 'Penguins'],
      highlights: ['Cape Peninsula tour']
    },
    {
      day: 26,
      date: '2026-01-29',
      location: 'Cape Town',
      hotel: {
        name: 'Cape Town Hotel',
        amenities: [],
        has_restaurant: false
      },
      activities: ['Winelands', 'Stellenbosch', 'Franschhoek'],
      highlights: ['Wine tasting day']
    },
    {
      day: 27,
      date: '2026-01-30',
      location: 'Cape Town',
      hotel: {
        name: 'Cape Town Hotel',
        amenities: [],
        has_restaurant: false
      },
      activities: ['Robben Island', 'City Bowl', 'Shopping'],
      highlights: ['Dag 4 Cape Town']
    },
    {
      day: 28,
      date: '2026-01-31',
      location: 'Cape Town',
      hotel: {
        name: 'Cape Town Hotel',
        amenities: [],
        has_restaurant: false
      },
      activities: ['Laatste dag', 'Souvenirs', 'Signal Hill sunset'],
      highlights: ['Afscheid van Zuid-Afrika']
    }
  ],
  total_days: 28,
  start_date: '2026-01-05',
  end_date: '2026-02-01',
  route: [
    'Johannesburg',
    'Welgevonden Game Reserve',
    'Tzaneen',
    'Graskop',
    'Piet Retief',
    'St. Lucia',
    'KwaZulu-Natal',
    'Umhlanga',
    'Durban',
    'Port Elizabeth',
    'Addo Elephant National Park',
    'Knysna',
    'Swellendam',
    'Hermanus',
    'Cape Town'
  ],
  parsed_from_pdf: true,
  parsed_at: new Date().toISOString()
};

async function updateTrip() {
  console.log('🔄 Updating RRP-9033 with structured data...');

  // Zoek de trip
  const { data: trips, error: searchError } = await supabase
    .from('trips')
    .select('id, title')
    .ilike('title', '%RRP-9033%')
    .limit(5);

  if (searchError) {
    console.error('❌ Search error:', searchError);
    return;
  }

  if (!trips || trips.length === 0) {
    console.error('❌ Geen trip gevonden met "RRP-9033" in titel');
    console.log('💡 Zoek handmatig trip ID en run: node update-trip.cjs <trip-id>');
    return;
  }

  console.log(`\n📋 Gevonden trips:`);
  trips.forEach((t, i) => console.log(`  ${i + 1}. ${t.title} (${t.id})`));

  const tripId = trips[0].id;
  console.log(`\n✅ Updating trip: ${trips[0].title}`);

  // Update met structured data
  const { error: updateError } = await supabase
    .from('trips')
    .update({ metadata: structuredData })
    .eq('id', tripId);

  if (updateError) {
    console.error('❌ Update error:', updateError);
    return;
  }

  console.log('\n✅ Trip succesvol geüpdatet met structured data!');
  console.log(`\n📊 Samenvatting:`);
  console.log(`   - ${structuredData.total_days} dagen`);
  console.log(`   - ${structuredData.route.length} bestemmingen`);
  console.log(`   - ${structuredData.itinerary.filter(d => d.hotel.has_restaurant).length} hotels met restaurant`);
  console.log(`\n🎯 Nu kun je testen met TravelBro!`);
  console.log(`   Vraag: "Waar slapen we in St. Lucia?"`);
  console.log(`   Expected: "Jullie slapen in Ndiza Lodge & Cabanas!"`);
}

updateTrip().catch(console.error);
