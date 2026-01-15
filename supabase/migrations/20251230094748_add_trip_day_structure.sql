/*
  # Add gestructureerd dag-per-dag reis schema

  1. Nieuwe Structuur in metadata
    - `itinerary`: Array van dagen met volledige info
    - Elke dag bevat: dag_nr, datum, locatie, hotel, activiteiten, highlights
    - Dit maakt het makkelijk voor AI om direct te weten: "waar zijn ze dag 5?"

  2. Waarom?
    - Nu moet AI uit custom_context tekst parsen
    - Met deze structuur: direct access naar juiste dag/hotel/locatie
    - AI kan automatisch zeggen: "jullie hotel Ndiza Lodge heeft..."

  3. Voorbeeld metadata structure:
    {
      "itinerary": [
        {
          "day": 1,
          "date": "2025-01-15",
          "location": "Johannesburg",
          "hotel": {
            "name": "City Lodge Johannesburg Airport",
            "address": "Barbara Road",
            "amenities": ["restaurant", "pool", "wifi"]
          },
          "activities": ["Aankomst", "Check-in"],
          "highlights": ["Rust uit na lange vlucht"]
        }
      ],
      "total_days": 21,
      "start_date": "2025-01-15",
      "end_date": "2025-02-04"
    }
*/

-- Helper functie om huidige reis dag te bepalen
CREATE OR REPLACE FUNCTION get_current_trip_day(
  p_trip_id uuid,
  p_current_date date DEFAULT CURRENT_DATE
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_metadata jsonb;
  v_itinerary jsonb;
  v_start_date date;
  v_current_day integer;
  v_day_info jsonb;
BEGIN
  SELECT metadata INTO v_metadata
  FROM trips
  WHERE id = p_trip_id;

  IF v_metadata IS NULL OR v_metadata->'itinerary' IS NULL THEN
    RETURN NULL;
  END IF;

  v_itinerary := v_metadata->'itinerary';
  v_start_date := (v_metadata->>'start_date')::date;

  v_current_day := p_current_date - v_start_date + 1;

  SELECT value INTO v_day_info
  FROM jsonb_array_elements(v_itinerary)
  WHERE (value->>'day')::integer = v_current_day;

  RETURN v_day_info;
END;
$$;

-- Helper functie om hotel info te krijgen voor een locatie
CREATE OR REPLACE FUNCTION get_hotel_for_location(
  p_trip_id uuid,
  p_location text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_metadata jsonb;
  v_itinerary jsonb;
  v_hotel_info jsonb;
BEGIN
  SELECT metadata INTO v_metadata
  FROM trips
  WHERE id = p_trip_id;

  IF v_metadata IS NULL OR v_metadata->'itinerary' IS NULL THEN
    RETURN NULL;
  END IF;

  v_itinerary := v_metadata->'itinerary';

  SELECT value->'hotel' INTO v_hotel_info
  FROM jsonb_array_elements(v_itinerary)
  WHERE LOWER(value->>'location') = LOWER(p_location)
  LIMIT 1;

  RETURN v_hotel_info;
END;
$$;

-- Index voor snellere metadata queries
CREATE INDEX IF NOT EXISTS idx_trips_metadata_itinerary
ON trips USING gin ((metadata->'itinerary'));

COMMENT ON FUNCTION get_current_trip_day IS 'Bepaalt waar reizigers NU zijn op basis van datum';
COMMENT ON FUNCTION get_hotel_for_location IS 'Geeft hotel info voor een specifieke locatie';
