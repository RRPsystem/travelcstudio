export function formatTripDataForPrompt(trip: any): string {
  let formatted = `REIS: ${trip.name}\n\n`;

  if (trip.metadata?.itinerary) {
    formatted += "REISSCHEMA:\n";
    trip.metadata.itinerary.forEach((day: any) => {
      formatted += `\nDag ${day.day} - ${day.location}\n`;
      if (day.hotel?.name) {
        formatted += `  Hotel: ${day.hotel.name}\n`;
      }
      if (day.activities?.length) {
        formatted += `  Activiteiten: ${day.activities.join(', ')}\n`;
      }
    });
  }

  if (trip.custom_context) {
    formatted += `\n\nEXTRA CONTEXT:\n${trip.custom_context}`;
  }

  return formatted;
}