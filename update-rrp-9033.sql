-- Update RRP-9033 trip met structured data
-- Run dit via Supabase SQL Editor

UPDATE trips
SET metadata = '{
  "itinerary": [
    {
      "day": 1,
      "date": "2026-01-05",
      "location": "Johannesburg",
      "hotel": {
        "name": "City Lodge Johannesburg Airport, Barbara Road",
        "amenities": ["airport shuttle", "pool", "wifi", "restaurant", "bar"],
        "has_restaurant": true
      },
      "activities": ["Aankomst", "Rust uit na lange vlucht", "Apartheid Museum"],
      "highlights": ["Aankomst in Zuid-Afrika"]
    },
    {
      "day": 9,
      "date": "2026-01-13",
      "location": "St. Lucia",
      "hotel": {
        "name": "Ndiza Lodge & Cabanas",
        "amenities": ["restaurant", "bar", "pool", "wifi"],
        "has_restaurant": true
      },
      "activities": ["iSimangaliso Wetland Park", "Boottocht", "Hippos en krokodillen"],
      "highlights": ["Aankomst in wetland paradise"]
    },
    {
      "day": 12,
      "date": "2026-01-16",
      "location": "KwaZulu-Natal",
      "hotel": {
        "name": "Rhino Ridge Safari Lodge",
        "amenities": ["restaurant", "bar", "spa", "pool", "safari", "full board"],
        "has_restaurant": true
      },
      "activities": ["Hluhluwe-iMfolozi game drives", "Big Five", "Safari"],
      "highlights": ["Luxury safari lodge"]
    }
  ],
  "total_days": 28,
  "start_date": "2026-01-05",
  "end_date": "2026-02-01",
  "route": [
    "Johannesburg",
    "Welgevonden Game Reserve",
    "Tzaneen",
    "Graskop",
    "Piet Retief",
    "St. Lucia",
    "KwaZulu-Natal",
    "Umhlanga",
    "Durban",
    "Port Elizabeth",
    "Addo Elephant National Park",
    "Knysna",
    "Swellendam",
    "Hermanus",
    "Cape Town"
  ],
  "parsed_from_pdf": true,
  "parsed_at": "'|| now() ||'"
}'::jsonb
WHERE title ILIKE '%RRP-9033%'
OR title ILIKE '%Zuid-Afrika%'
OR id = 'a5f77d3d-1a26-4cf0-9e9f-3b0d77a37a63';

-- Verify
SELECT
  id,
  title,
  metadata->'total_days' as days,
  jsonb_array_length(metadata->'itinerary') as itinerary_items,
  metadata->'route' as route
FROM trips
WHERE metadata IS NOT NULL
  AND metadata != '{}'::jsonb;
