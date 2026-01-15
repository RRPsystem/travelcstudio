-- Update travel_trips met structured data voor RRP-9033 trip
UPDATE travel_trips
SET metadata = jsonb_build_object(
  'itinerary', '[
    {"day":1,"date":"2026-01-05","location":"Johannesburg","hotel":{"name":"City Lodge Johannesburg Airport, Barbara Road","amenities":["airport shuttle","pool","wifi","restaurant","bar"],"has_restaurant":true},"activities":["Aankomst","Rust uit na lange vlucht","Apartheid Museum"],"highlights":["Aankomst in Zuid-Afrika"]},
    {"day":2,"date":"2026-01-06","location":"Welgevonden Game Reserve","hotel":{"name":"Welgevonden Game Reserve Lodge","amenities":["safari","game drives","restaurant","bar"],"has_restaurant":true},"activities":["Game drives","Big Five spotting","Bushveld safari"],"highlights":["Start van safari avontuur"]},
    {"day":3,"date":"2026-01-07","location":"Welgevonden Game Reserve","hotel":{"name":"Welgevonden Game Reserve Lodge","amenities":["safari","game drives","restaurant","bar"],"has_restaurant":true},"activities":["Morning game drive","Evening game drive"],"highlights":["Cheetah en brown hyena spotten"]},
    {"day":4,"date":"2026-01-08","location":"Tzaneen","hotel":{"name":"Tamboti Lodge Guest House","amenities":["pool","wifi","breakfast included"],"has_restaurant":false},"activities":["Tzaneen Dam","Agatha Crocodile Ranch","Locale markten"],"highlights":["Tropische tuin omgeving"]},
    {"day":5,"date":"2026-01-09","location":"Tzaneen","hotel":{"name":"Tamboti Lodge Guest House","amenities":["pool","wifi","breakfast included"],"has_restaurant":false},"activities":["Verken Tzaneen Dam","Zwemmen","Relaxen"],"highlights":["Dag 2 in Tzaneen"]},
    {"day":6,"date":"2026-01-10","location":"Graskop","hotel":{"name":"Westlodge At Graskop","amenities":["restaurant","wifi","breakfast included"],"has_restaurant":true},"activities":["Blyde River Canyon","Gods Window","Bourkes Luck Potholes"],"highlights":["Spectacular canyon views"]},
    {"day":7,"date":"2026-01-11","location":"Graskop","hotel":{"name":"Westlodge At Graskop","amenities":["restaurant","wifi","breakfast included"],"has_restaurant":true},"activities":["Panorama Route","Watervallen","Hiking"],"highlights":["Dag 2 Blyde River gebied"]},
    {"day":8,"date":"2026-01-12","location":"Piet Retief","hotel":{"name":"Dusk to Dawn Guesthouse","amenities":["wifi","breakfast included","pool","bbq"],"has_restaurant":false},"activities":["Tussenstop","Dutch Reformed Church bezoeken"],"highlights":["Rustdag onderweg"]},
    {"day":9,"date":"2026-01-13","location":"St. Lucia","hotel":{"name":"Ndiza Lodge & Cabanas","amenities":["restaurant","bar","pool","wifi"],"has_restaurant":true},"activities":["iSimangaliso Wetland Park","Boottocht","Hippos en krokodillen"],"highlights":["Aankomst in wetland paradise"]},
    {"day":10,"date":"2026-01-14","location":"St. Lucia","hotel":{"name":"Ndiza Lodge & Cabanas","amenities":["restaurant","bar","pool","wifi"],"has_restaurant":true},"activities":["Strand","Boat cruise","Wildlife viewing"],"highlights":["Dag 2 in St. Lucia"]},
    {"day":11,"date":"2026-01-15","location":"St. Lucia","hotel":{"name":"Ndiza Lodge & Cabanas","amenities":["restaurant","bar","pool","wifi"],"has_restaurant":true},"activities":["Beach day","Relaxen","Optional activities"],"highlights":["Laatste dag in St. Lucia"]},
    {"day":12,"date":"2026-01-16","location":"KwaZulu-Natal","hotel":{"name":"Rhino Ridge Safari Lodge","amenities":["restaurant","bar","spa","pool","safari","full board"],"has_restaurant":true},"activities":["Hluhluwe-iMfolozi game drives","Big Five","Safari"],"highlights":["Luxury safari lodge"]},
    {"day":13,"date":"2026-01-17","location":"KwaZulu-Natal","hotel":{"name":"Rhino Ridge Safari Lodge","amenities":["restaurant","bar","spa","pool","safari","full board"],"has_restaurant":true},"activities":["Morning game drive","Spa treatments","Evening drive"],"highlights":["Dag 2 safari experience"]},
    {"day":14,"date":"2026-01-18","location":"Umhlanga","hotel":{"name":"Tesorino","amenities":["pool","wifi","breakfast included","bar"],"has_restaurant":true},"activities":["Beach","Umhlanga Rocks","Shopping"],"highlights":["Coastal resort town"]},
    {"day":15,"date":"2026-01-19","location":"Durban","hotel":{"name":"Durban - vlucht naar Port Elizabeth","amenities":[],"has_restaurant":false},"activities":["Vlucht Durban naar Port Elizabeth"],"highlights":["Travel day"]},
    {"day":16,"date":"2026-01-19","location":"Addo Elephant National Park","hotel":{"name":"Addo Dung Beetle Guest Farm","amenities":["pool","wifi","safari","hiking"],"has_restaurant":false},"activities":["Addo Elephant National Park safari","Elephant spotting"],"highlights":["600+ olifanten!"]},
    {"day":17,"date":"2026-01-20","location":"Addo Elephant National Park","hotel":{"name":"Addo Dung Beetle Guest Farm","amenities":["pool","wifi","safari","hiking"],"has_restaurant":false},"activities":["Game drive","Elephant viewing"],"highlights":["Dag 2 Addo"]},
    {"day":18,"date":"2026-01-21","location":"Knysna","hotel":{"name":"Knysna Manor House","amenities":["wifi"],"has_restaurant":false},"activities":["Knysna Heads","Featherbed Nature Reserve","Lagoon"],"highlights":["Garden Route beginnen"]},
    {"day":19,"date":"2026-01-22","location":"Knysna","hotel":{"name":"Knysna Manor House","amenities":["wifi"],"has_restaurant":false},"activities":["Strand","Vissen","Whale watching"],"highlights":["Dag 2 Knysna"]},
    {"day":20,"date":"2026-01-23","location":"Knysna","hotel":{"name":"Knysna Manor House","amenities":["wifi"],"has_restaurant":false},"activities":["Mountain biking","Beaches","Relaxen"],"highlights":["Dag 3 Knysna"]},
    {"day":21,"date":"2026-01-24","location":"Swellendam","hotel":{"name":"Aan de Oever Guesthouse","amenities":["wifi","breakfast"],"has_restaurant":false},"activities":["Cape Dutch architectuur","Historic town"],"highlights":["3e oudste stad Zuid-Afrika"]},
    {"day":22,"date":"2026-01-25","location":"Hermanus","hotel":{"name":"Whale Coast Ocean Villa","amenities":["beach","wifi"],"has_restaurant":false},"activities":["Whale watching","Cliff Path","Wine tasting"],"highlights":["Beste whale watching ter wereld"]},
    {"day":23,"date":"2026-01-26","location":"Hermanus","hotel":{"name":"Whale Coast Ocean Villa","amenities":["beach","wifi"],"has_restaurant":false},"activities":["Beach","Walvissen spotten","Wijnproeverijen"],"highlights":["Dag 2 Hermanus"]},
    {"day":24,"date":"2026-01-27","location":"Cape Town","hotel":{"name":"Cape Town Hotel","amenities":[],"has_restaurant":false},"activities":["Table Mountain","V&A Waterfront","City tour"],"highlights":["Aankomst Mother City"]},
    {"day":25,"date":"2026-01-28","location":"Cape Town","hotel":{"name":"Cape Town Hotel","amenities":[],"has_restaurant":false},"activities":["Cape Point","Boulders Beach","Penguins"],"highlights":["Cape Peninsula tour"]},
    {"day":26,"date":"2026-01-29","location":"Cape Town","hotel":{"name":"Cape Town Hotel","amenities":[],"has_restaurant":false},"activities":["Winelands","Stellenbosch","Franschhoek"],"highlights":["Wine tasting day"]},
    {"day":27,"date":"2026-01-30","location":"Cape Town","hotel":{"name":"Cape Town Hotel","amenities":[],"has_restaurant":false},"activities":["Robben Island","City Bowl","Shopping"],"highlights":["Dag 4 Cape Town"]},
    {"day":28,"date":"2026-01-31","location":"Cape Town","hotel":{"name":"Cape Town Hotel","amenities":[],"has_restaurant":false},"activities":["Laatste dag","Souvenirs","Signal Hill sunset"],"highlights":["Afscheid van Zuid-Afrika"]}
  ]'::jsonb,
  'total_days', 28,
  'start_date', '2026-01-05',
  'end_date', '2026-02-01'
),
updated_at = NOW()
WHERE id = '76b4ec72-5553-425c-8274-eb8b85579461';

-- Verify update
SELECT
  id,
  name,
  metadata->'itinerary'->0 as first_day,
  metadata->'itinerary'->20 as swellendam_day,
  jsonb_array_length(metadata->'itinerary') as total_days
FROM travel_trips
WHERE id = '76b4ec72-5553-425c-8274-eb8b85579461';
