const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
require('dotenv').config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY
);

/**
 * INTELLIGENT PDF PARSER
 *
 * Parseert professionele reis PDF's (zoals RRP) naar structured itinerary data
 *
 * VOORDELEN:
 * - Exacte datums per locatie
 * - Volledige hotel namen
 * - Meal plans (BB, FB, RO)
 * - Faciliteiten (restaurant, pool, etc)
 * - Aantal nachten
 */

function parseTripPDF(pdfText) {
  console.log('📄 Parsing trip PDF...');

  const itinerary = [];
  const lines = pdfText.split('\n');

  // Zoek start datum
  const dateMatch = pdfText.match(/(\d+)\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{4})/i);
  if (!dateMatch) {
    console.error('❌ Kan start datum niet vinden');
    return null;
  }

  const startDate = parseDate(dateMatch[0]);
  console.log('📅 Start datum:', startDate);

  // Parse elke destination
  const destinationPattern = /(\d+)\s*\n\s*([A-Z][a-z\s-]+)\n\s*South Africa\n\s*(\d+\s+\w+\s+\d{4})\s*→?\s*(\d+\s+\w+\s+\d{4})/g;

  let match;
  let currentDay = 1;
  let currentDate = new Date(startDate);

  // Parse destinations sequentieel
  const destinations = extractDestinations(pdfText);

  for (const dest of destinations) {
    const nights = calculateNights(dest.checkIn, dest.checkOut);

    // Extract hotel info
    const hotel = extractHotelInfo(pdfText, dest.name);

    // Voeg dagen toe aan itinerary
    for (let i = 0; i < nights; i++) {
      itinerary.push({
        day: currentDay,
        date: formatDate(currentDate),
        location: dest.name,
        hotel: hotel || { name: `Hotel in ${dest.name}`, amenities: [] },
        activities: extractActivities(pdfText, dest.name),
        highlights: i === 0 ? [`Aankomst in ${dest.name}`] : [`Dag ${i + 1} in ${dest.name}`]
      });

      currentDay++;
      currentDate.setDate(currentDate.getDate() + 1);
    }
  }

  console.log(`✅ Parsed ${itinerary.length} dagen`);
  return itinerary;
}

function extractDestinations(pdfText) {
  const destinations = [];

  // Pattern: nummer, locatie naam, datums
  const lines = pdfText.split('\n');
  let currentDest = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Check voor destination nummer
    if (/^\d+$/.test(line) && i + 1 < lines.length) {
      const name = lines[i + 1].trim();

      // Check voor "South Africa" op volgende lijn
      if (i + 2 < lines.length && lines[i + 2].includes('South Africa')) {
        // Zoek datums
        let dateIndex = i + 3;
        while (dateIndex < lines.length && dateIndex < i + 10) {
          const dateLine = lines[dateIndex];
          const dateMatch = dateLine.match(/(\d+\s+\w+\s+\d{4})\s*→?\s*(\d+\s+\w+\s+\d{4})/);

          if (dateMatch) {
            currentDest = {
              name: name,
              checkIn: dateMatch[1],
              checkOut: dateMatch[2]
            };
            destinations.push(currentDest);
            break;
          }
          dateIndex++;
        }
      }
    }

    // Extract accommodation als we een current dest hebben
    if (currentDest && line.startsWith('Accommodation:')) {
      const hotelName = line.replace('Accommodation:', '').trim().replace(/,$/, '');
      currentDest.accommodation = hotelName;
      currentDest = null; // Reset
    }
  }

  return destinations;
}

function extractHotelInfo(pdfText, locationName) {
  // Zoek hotel sectie voor deze locatie
  const locationIndex = pdfText.indexOf(locationName);
  if (locationIndex === -1) return null;

  // Zoek "Accommodation:" na deze locatie
  const accomIndex = pdfText.indexOf('Accommodation:', locationIndex);
  if (accomIndex === -1 || accomIndex > locationIndex + 2000) return null;

  // Extract hotel naam (tot komma of newline)
  const afterAccom = pdfText.substring(accomIndex + 14, accomIndex + 200);
  const hotelMatch = afterAccom.match(/([^\n,]+)/);
  if (!hotelMatch) return null;

  const hotelName = hotelMatch[1].trim();

  // Extract faciliteiten
  const amenities = [];
  const facilitySection = pdfText.substring(accomIndex, accomIndex + 1000);

  // Common facilities patterns
  const facilities = {
    'restaurant': ['Restaurant', 'restaurant'],
    'bar': ['Bar', 'bar'],
    'pool': ['pool', 'Pool', 'swimming'],
    'wifi': ['wifi', 'WiFi', 'Internet'],
    'parking': ['parking', 'Parking'],
    'breakfast': ['breakfast', 'Breakfast'],
    'spa': ['Spa', 'spa'],
    'gym': ['Fitness', 'gym', 'Gym']
  };

  for (const [key, patterns] of Object.entries(facilities)) {
    for (const pattern of patterns) {
      if (facilitySection.includes(pattern)) {
        amenities.push(key);
        break;
      }
    }
  }

  // Check for meal plans
  let hasRestaurant = amenities.includes('restaurant');
  if (facilitySection.includes('FULL BOARD') || facilitySection.includes('Full Board')) {
    hasRestaurant = true;
    amenities.push('full board');
  } else if (facilitySection.includes('BREAKFAST') || facilitySection.includes('Bed And Breakfast')) {
    amenities.push('breakfast included');
  }

  return {
    name: hotelName,
    amenities: [...new Set(amenities)], // Remove duplicates
    has_restaurant: hasRestaurant
  };
}

function extractActivities(pdfText, locationName) {
  // Zoek "Points of interest" sectie
  const poiIndex = pdfText.indexOf('Points of interest');
  if (poiIndex === -1) return [`Verken ${locationName}`];

  // Default activities per type locatie
  const activityMap = {
    'Johannesburg': ['Apartheid Museum', 'Soweto tour', 'City sightseeing'],
    'Welgevonden': ['Game drive', 'Safari', 'Wildlife spotting'],
    'Tzaneen': ['Tzaneen Dam', 'Agatha Crocodile Ranch', 'Local markets'],
    'Graskop': ['Blyde River Canyon', 'God\'s Window', 'Bourke\'s Luck Potholes'],
    'St. Lucia': ['iSimangaliso Wetland Park', 'Boat cruise', 'Beach activities'],
    'KwaZulu-Natal': ['Hluhluwe-iMfolozi game drives', 'Wildlife viewing'],
    'Knysna': ['Knysna Heads', 'Featherbed Nature Reserve', 'Beach activities'],
    'Hermanus': ['Whale watching (seasonal)', 'Cliff Path walk', 'Wine tasting'],
    'Cape Town': ['Table Mountain', 'V&A Waterfront', 'Cape Point']
  };

  // Vind beste match
  for (const [key, activities] of Object.entries(activityMap)) {
    if (locationName.includes(key)) {
      return activities;
    }
  }

  return [`Verken ${locationName}`];
}

function parseDate(dateStr) {
  // Parse "5 Jan 2026" format
  const months = {
    'Jan': 0, 'Feb': 1, 'Mar': 2, 'Apr': 3, 'May': 4, 'Jun': 5,
    'Jul': 6, 'Aug': 7, 'Sep': 8, 'Oct': 9, 'Nov': 10, 'Dec': 11
  };

  const parts = dateStr.match(/(\d+)\s+(\w+)\s+(\d{4})/);
  if (!parts) return null;

  const day = parseInt(parts[1]);
  const month = months[parts[2]];
  const year = parseInt(parts[3]);

  return new Date(year, month, day);
}

function calculateNights(checkInStr, checkOutStr) {
  const checkIn = parseDate(checkInStr);
  const checkOut = parseDate(checkOutStr);

  if (!checkIn || !checkOut) return 1;

  const diff = checkOut - checkIn;
  const nights = Math.ceil(diff / (1000 * 60 * 60 * 24));

  return nights > 0 ? nights : 1;
}

function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

async function updateTripWithParsedData(tripId, pdfPath) {
  console.log('📖 Reading PDF:', pdfPath);

  // In real implementation: use PDF parser library
  // For now: assume we have text extracted
  const pdfText = fs.readFileSync(pdfPath, 'utf8');

  const itinerary = parseTripPDF(pdfText);

  if (!itinerary || itinerary.length === 0) {
    console.error('❌ Kon geen itinerary data parsen');
    return;
  }

  // Calculate totals
  const startDate = itinerary[0].date;
  const endDate = itinerary[itinerary.length - 1].date;
  const totalDays = itinerary.length;

  // Get unique locations for route
  const route = [...new Set(itinerary.map(day => day.location))];

  const metadata = {
    itinerary: itinerary,
    total_days: totalDays,
    start_date: startDate,
    end_date: endDate,
    route: route,
    parsed_from_pdf: true,
    parsed_at: new Date().toISOString()
  };

  console.log('\n✅ Structured metadata:');
  console.log(JSON.stringify(metadata, null, 2));

  // Update trip
  const { error } = await supabase
    .from('trips')
    .update({ metadata })
    .eq('id', tripId);

  if (error) {
    console.error('❌ Fout bij updaten:', error);
  } else {
    console.log('\n✅ Trip metadata succesvol geüpdatet!');
    console.log(`\n📊 Samenvatting:`);
    console.log(`   - ${totalDays} dagen`);
    console.log(`   - ${route.length} bestemmingen`);
    console.log(`   - ${itinerary.filter(d => d.hotel.has_restaurant).length} hotels met restaurant`);
  }
}

// CLI usage
const tripId = process.argv[2];
const pdfPath = process.argv[3];

if (!tripId || !pdfPath) {
  console.error('❌ Gebruik: node parse-trip-pdf-to-structured-data.cjs <trip-id> <pdf-path>');
  console.error('   Voorbeeld: node parse-trip-pdf-to-structured-data.cjs abc123 ./rrp-9033.txt');
  process.exit(1);
}

updateTripWithParsedData(tripId, pdfPath).catch(console.error);
