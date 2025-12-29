export function formatTripDataForAI(tripData: any, tripName: string): string {
  if (!tripData || tripData.error || tripData.note) {
    return `ℹ️ Beperkte reis informatie beschikbaar voor "${tripName}"`;
  }

  let formatted = `📋 COMPLETE REIS INFORMATIE VOOR: "${tripName}"\n\n`;

  if (tripData.accommodations && tripData.accommodations.length > 0) {
    formatted += `🏨 ACCOMMODATIES (${tripData.accommodations.length}):\n`;
    formatted += `BELANGRIJK: Dit zijn de EXACTE hotels waar de reizigers verblijven. Gebruik deze specifieke namen!\n\n`;

    tripData.accommodations.forEach((acc: any, index: number) => {
      formatted += `${index + 1}. **${acc.name || acc.hotel_name || acc.accommodation_name || 'Accommodatie naam onbekend'}**\n`;

      if (acc.location || acc.city || acc.address) {
        formatted += `   📍 Locatie: ${acc.location || acc.city || acc.address}\n`;
      }

      if (acc.check_in || acc.checkin || acc.arrival_date) {
        formatted += `   📅 Check-in: ${acc.check_in || acc.checkin || acc.arrival_date}\n`;
      }

      if (acc.check_out || acc.checkout || acc.departure_date) {
        formatted += `   📅 Check-out: ${acc.check_out || acc.checkout || acc.departure_date}\n`;
      }

      if (acc.nights || acc.duration) {
        formatted += `   🛏️ Aantal nachten: ${acc.nights || acc.duration}\n`;
      }

      if (acc.room_type || acc.accommodation_type) {
        formatted += `   🏠 Type: ${acc.room_type || acc.accommodation_type}\n`;
      }

      if (acc.amenities || acc.facilities) {
        const facilities = acc.amenities || acc.facilities;
        if (Array.isArray(facilities) && facilities.length > 0) {
          formatted += `   ✨ Faciliteiten: ${facilities.join(', ')}\n`;
        } else if (typeof facilities === 'string') {
          formatted += `   ✨ Faciliteiten: ${facilities}\n`;
        }
      }

      if (acc.description || acc.notes) {
        formatted += `   📝 ${acc.description || acc.notes}\n`;
      }

      if (acc.contact_phone || acc.phone) {
        formatted += `   ☎️ Telefoon: ${acc.contact_phone || acc.phone}\n`;
      }

      if (acc.website || acc.url) {
        formatted += `   🌐 Website: ${acc.website || acc.url}\n`;
      }

      formatted += `\n`;
    });
  }

  if (tripData.itinerary && Array.isArray(tripData.itinerary) && tripData.itinerary.length > 0) {
    formatted += `📅 DAGPROGRAMMA:\n`;
    formatted += `Let op: Dit is het exacte reisschema. Gebruik deze informatie voor specifieke vragen over "dag X" of "wanneer zijn we in Y".\n\n`;

    tripData.itinerary.forEach((day: any) => {
      formatted += `**Dag ${day.day || day.day_number}${day.date ? ` (${day.date})` : ''}**: ${day.title || day.description || 'Geen titel'}\n`;

      if (day.location || day.destination) {
        formatted += `📍 Locatie: ${day.location || day.destination}\n`;
      }

      if (day.activities && Array.isArray(day.activities)) {
        formatted += `Activiteiten:\n`;
        day.activities.forEach((act: any) => {
          formatted += `  • ${typeof act === 'string' ? act : act.name || act.description}\n`;
        });
      }

      if (day.meals || day.included_meals) {
        formatted += `🍽️ Maaltijden: ${day.meals || day.included_meals}\n`;
      }

      if (day.accommodation || day.hotel) {
        formatted += `🏨 Accommodatie: ${day.accommodation || day.hotel}\n`;
      }

      if (day.notes || day.description) {
        formatted += `ℹ️ ${day.notes || day.description}\n`;
      }

      formatted += `\n`;
    });
  }

  if (tripData.activities && Array.isArray(tripData.activities) && tripData.activities.length > 0) {
    formatted += `🎯 ACTIVITEITEN & EXCURSIES:\n\n`;

    tripData.activities.forEach((act: any, index: number) => {
      formatted += `${index + 1}. **${act.name || act.title || 'Activiteit'}**\n`;

      if (act.location || act.where) {
        formatted += `   📍 ${act.location || act.where}\n`;
      }

      if (act.date || act.day) {
        formatted += `   📅 ${act.date || `Dag ${act.day}`}\n`;
      }

      if (act.duration || act.time) {
        formatted += `   ⏱️ ${act.duration || act.time}\n`;
      }

      if (act.description || act.details) {
        formatted += `   ${act.description || act.details}\n`;
      }

      if (act.included !== undefined) {
        formatted += `   ${act.included ? '✅ Inbegrepen' : '❌ Niet inbegrepen'}\n`;
      }

      formatted += `\n`;
    });
  }

  if (tripData.included_services || tripData.included || tripData.inclusions) {
    const included = tripData.included_services || tripData.included || tripData.inclusions;
    formatted += `✅ INBEGREPEN:\n`;

    if (Array.isArray(included)) {
      included.forEach((item: any) => {
        formatted += `• ${typeof item === 'string' ? item : item.description || item.name || item}\n`;
      });
    } else if (typeof included === 'string') {
      formatted += included + '\n';
    }
    formatted += `\n`;
  }

  if (tripData.excluded_services || tripData.excluded || tripData.exclusions) {
    const excluded = tripData.excluded_services || tripData.excluded || tripData.exclusions;
    formatted += `❌ NIET INBEGREPEN:\n`;

    if (Array.isArray(excluded)) {
      excluded.forEach((item: any) => {
        formatted += `• ${typeof item === 'string' ? item : item.description || item.name || item}\n`;
      });
    } else if (typeof excluded === 'string') {
      formatted += excluded + '\n';
    }
    formatted += `\n`;
  }

  if (tripData.highlights || tripData.hoogtepunten) {
    const highlights = tripData.highlights || tripData.hoogtepunten;
    formatted += `⭐ HOOGTEPUNTEN:\n`;

    if (Array.isArray(highlights)) {
      highlights.forEach((item: any) => {
        formatted += `• ${typeof item === 'string' ? item : item.description || item.name || item}\n`;
      });
    } else if (typeof highlights === 'string') {
      formatted += highlights + '\n';
    }
    formatted += `\n`;
  }

  if (tripData.important_info || tripData.travel_info || tripData.praktische_informatie) {
    const info = tripData.important_info || tripData.travel_info || tripData.praktische_informatie;
    formatted += `ℹ️ BELANGRIJKE INFORMATIE:\n`;
    formatted += typeof info === 'string' ? info : JSON.stringify(info, null, 2);
    formatted += `\n\n`;
  }

  if (tripData.contact || tripData.emergency_contacts) {
    const contacts = tripData.contact || tripData.emergency_contacts;
    formatted += `📞 CONTACTGEGEVENS:\n`;

    if (Array.isArray(contacts)) {
      contacts.forEach((contact: any) => {
        formatted += `• ${contact.name || 'Contact'}: ${contact.phone || contact.number || ''}\n`;
        if (contact.email) formatted += `  Email: ${contact.email}\n`;
      });
    } else if (typeof contacts === 'object') {
      formatted += JSON.stringify(contacts, null, 2);
    }
    formatted += `\n`;
  }

  if (tripData.flight_info || tripData.flights || tripData.vluchtgegevens) {
    const flights = tripData.flight_info || tripData.flights || tripData.vluchtgegevens;
    formatted += `✈️ VLUCHTINFORMATIE:\n`;

    if (Array.isArray(flights)) {
      flights.forEach((flight: any) => {
        formatted += `• ${flight.from || 'Vertrek'} → ${flight.to || 'Aankomst'}\n`;
        if (flight.flight_number) formatted += `  Vluchtnummer: ${flight.flight_number}\n`;
        if (flight.departure_time) formatted += `  Vertrektijd: ${flight.departure_time}\n`;
        if (flight.arrival_time) formatted += `  Aankomsttijd: ${flight.arrival_time}\n`;
      });
    } else if (typeof flights === 'object') {
      formatted += JSON.stringify(flights, null, 2);
    }
    formatted += `\n`;
  }

  if (tripData.travel_documents || tripData.documenten) {
    const docs = tripData.travel_documents || tripData.documenten;
    formatted += `📄 BENODIGDE DOCUMENTEN:\n`;

    if (Array.isArray(docs)) {
      docs.forEach((doc: any) => {
        formatted += `• ${typeof doc === 'string' ? doc : doc.name || doc.type || doc}\n`;
      });
    } else if (typeof docs === 'string') {
      formatted += docs + '\n';
    }
    formatted += `\n`;
  }

  if (tripData.weather_info || tripData.klimaat) {
    const weather = tripData.weather_info || tripData.klimaat;
    formatted += `🌤️ KLIMAAT & WEER:\n${weather}\n\n`;
  }

  if (tripData.currency || tripData.valuta) {
    formatted += `💰 Valuta: ${tripData.currency || tripData.valuta}\n\n`;
  }

  if (tripData.language || tripData.taal) {
    formatted += `🗣️ Taal: ${tripData.language || tripData.taal}\n\n`;
  }

  formatted += `\n⚠️ INSTRUCTIE VOOR AI:\n`;
  formatted += `Gebruik ALTIJD de exacte namen van hotels, locaties en activiteiten zoals hierboven vermeld.\n`;
  formatted += `Als er gevraagd wordt naar "het hotel in Johannesburg" of "eerste hotel", verwijs dan naar de SPECIFIEKE NAAM uit de accommodatie lijst!\n`;
  formatted += `Zeg NOOIT "die informatie staat niet in de documenten" als de data hierboven wel staat.\n`;

  return formatted;
}
