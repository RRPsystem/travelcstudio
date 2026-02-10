<?php
/**
 * Template: Travel Detail Page v2 — Modern Redesign
 * Version: 3.0.0
 * 
 * Features:
 * - Immersive hero slideshow
 * - Sticky highlights strip with key facts
 * - Inline route map (Leaflet)
 * - Visual journey stops (destination + hotel combined)
 * - Sliding detail panels for destinations and hotels
 * - Professional Lucide SVG icons
 * - Respects brand show_hotels / show_prices settings
 */

if (!defined('ABSPATH')) exit;

// ============================================
// DATA EXTRACTION
// ============================================
$title = $travel['title'] ?? '';
$description = $travel['description'] ?? '';
$intro_text = $travel['intro_text'] ?? '';
$nights = intval($travel['number_of_nights'] ?? 0);
$days = intval($travel['number_of_days'] ?? ($nights + 1));
$price = floatval($travel['price_per_person'] ?? 0);

// Components
$destinations = $travel['destinations'] ?? [];
$hotels = $travel['hotels'] ?? [];
$transports = $travel['transports'] ?? [];
$car_rentals = $travel['car_rentals'] ?? [];
$cruises = $travel['cruises'] ?? [];

// Brand settings
$brand = $travel['brand_settings'] ?? [];
$show_hotels = $brand['show_hotels'] ?? true;
$show_prices = $brand['show_prices'] ?? true;
$primary_color = '#2a9d8f';

// Touroperator info
$source_microsite = $travel['source_microsite'] ?? '';
$touroperator = travelc_get_touroperator_info($source_microsite);

// Collect all images for hero slideshow
$all_images = [];
foreach ($destinations as $dest) {
    foreach (($dest['images'] ?? []) as $img) {
        $all_images[] = $img;
    }
}
foreach ($hotels as $hotel) {
    foreach (($hotel['images'] ?? []) as $img) {
        $all_images[] = $img;
    }
}
$all_images = array_slice(array_unique(array_filter($all_images)), 0, 6);

// Hero image fallback
$hero_image = $travel['hero_image'] ?? '';
if (empty($hero_image) && !empty($all_images[0])) {
    $hero_image = $all_images[0];
}

// Location string
$location = '';
if (!empty($destinations)) {
    $dest_names = array_map(function($d) { return $d['name'] ?? ''; }, $destinations);
    $location = implode(' · ', array_slice(array_filter($dest_names), 0, 6));
}

// Countries
$countries = $travel['countries'] ?? [];
$country_str = implode(', ', array_slice(array_filter($countries), 0, 3));

// Build map destinations
$map_destinations = [];
foreach ($destinations as $dest) {
    $lat = $dest['geolocation']['latitude'] ?? 0;
    $lng = $dest['geolocation']['longitude'] ?? 0;
    if ($lat != 0 && $lng != 0) {
        $map_destinations[] = [
            'name' => $dest['name'] ?? '',
            'lat' => floatval($lat),
            'lng' => floatval($lng),
            'image' => $dest['images'][0] ?? ''
        ];
    }
}

// ============================================
// BUILD STOPS (destination + hotel pairs)
// ============================================
$stops = [];
$unique_dest_names = [];
$unique_destinations = [];

// Deduplicate destinations
foreach ($destinations as $dest) {
    $name = $dest['name'] ?? '';
    if ($name && !in_array($name, $unique_dest_names)) {
        $unique_destinations[] = $dest;
        $unique_dest_names[] = $name;
    }
}

// Build combined accommodation list (cruises first, then hotels)
$accommodations = [];
foreach ($cruises as $cruise) {
    $accommodations[] = [
        'type' => 'cruise',
        'name' => ($cruise['cruiseLine'] ?? '') . ' - ' . ($cruise['shipId'] ?? ''),
        'nights' => intval($cruise['nights'] ?? 1),
        'images' => [],
        'description' => '',
        'category' => $cruise['stars'] ?? '',
        'mealPlan' => '',
        'address' => '',
        'facilities' => [],
        'geolocation' => null,
        'cabinType' => $cruise['selectedCategory'] ?? $cruise['group'] ?? '',
        'departure' => $cruise['departure'] ?? '',
        'arrival' => $cruise['arrival'] ?? '',
    ];
}
foreach ($hotels as $hotel) {
    $accommodations[] = [
        'type' => 'hotel',
        'name' => $hotel['name'] ?? '',
        'nights' => intval($hotel['nights'] ?? 1),
        'images' => $hotel['images'] ?? [],
        'description' => $hotel['description'] ?? '',
        'category' => $hotel['category'] ?? '',
        'mealPlan' => $hotel['mealPlan'] ?? '',
        'address' => $hotel['address'] ?? '',
        'facilities' => $hotel['facilities'] ?? [],
        'geolocation' => $hotel['geolocation'] ?? null,
    ];
}

// Pair destinations with accommodations
$stop_num = 0;
foreach ($accommodations as $i => $accom) {
    $dest = $unique_destinations[$i] ?? null;
    $stop_num++;
    $stops[] = [
        'number' => $stop_num,
        'destination' => $dest ? [
            'name' => $dest['name'] ?? '',
            'country' => $dest['country'] ?? '',
            'description' => $dest['description'] ?? '',
            'images' => $dest['images'] ?? [],
            'geolocation' => $dest['geolocation'] ?? null,
        ] : null,
        'accommodation' => $accom,
    ];
}

// If more destinations than accommodations, add remaining
for ($i = count($accommodations); $i < count($unique_destinations); $i++) {
    $dest = $unique_destinations[$i];
    $stop_num++;
    $stops[] = [
        'number' => $stop_num,
        'destination' => [
            'name' => $dest['name'] ?? '',
            'country' => $dest['country'] ?? '',
            'description' => $dest['description'] ?? '',
            'images' => $dest['images'] ?? [],
            'geolocation' => $dest['geolocation'] ?? null,
        ],
        'accommodation' => null,
    ];
}

// Panel data for JS (collected here, output safely in script block)
$panel_data = [];
foreach ($stops as $s) {
    $sn = $s['number'];
    if ($s['destination']) {
        $panel_data['tc2data_dest_' . $sn] = $s['destination'];
    }
    if ($s['accommodation']) {
        $panel_data['tc2data_hotel_' . $sn] = $s['accommodation'];
    }
}

// Build transport info
$outbound_flight = null;
$return_flight = null;
$other_flights = [];
$transfers = [];

foreach ($transports as $transport) {
    $segment = $transport['segment'][0] ?? [];
    $from = $segment['departureAirportName'] ?? $transport['originCode'] ?? '';
    $to = $segment['arrivalAirportName'] ?? $transport['targetCode'] ?? '';
    $from_code = $transport['originCode'] ?? strtoupper(substr($from, 0, 3));
    $to_code = $transport['targetCode'] ?? strtoupper(substr($to, 0, 3));
    $airline = $transport['company'] ?? '';
    $flight_num = $transport['transportNumber'] ?? '';
    $dep_time = substr($transport['departureTime'] ?? '', 0, 5);
    $arr_time = substr($transport['arrivalTime'] ?? '', 0, 5);
    $day = intval($transport['day'] ?? 0);
    
    $is_transfer = (stripos($airline, 'daytrip') !== false) || 
                   (isset($transport['transportType']) && strtolower($transport['transportType']) === 'transfer');
    
    if ($is_transfer) {
        $transfers[] = [
            'from' => $from, 'to' => $to, 'company' => $airline,
            'dep_time' => $dep_time, 'arr_time' => $arr_time, 'day' => $day,
        ];
    } else {
        $flight = [
            'from' => $from, 'to' => $to,
            'from_code' => $from_code, 'to_code' => $to_code,
            'airline' => $airline, 'flight_number' => $flight_num,
            'dep_time' => $dep_time, 'arr_time' => $arr_time, 'day' => $day,
        ];
        
        if ($day <= 1 && !$outbound_flight) {
            $outbound_flight = $flight;
        } elseif ($day >= $days - 1 && !$return_flight) {
            $return_flight = $flight;
        } else {
            $other_flights[] = $flight;
        }
    }
}

// Car rental info
$car_rental = !empty($car_rentals[0]) ? $car_rentals[0] : null;
$car_days = 0;
if ($car_rental) {
    $car_days = intval($car_rental['dropoffDay'] ?? $days) - intval($car_rental['pickupDay'] ?? 1) + 1;
}

// Count stats
$hotel_count = count($hotels);
$dest_count = count($unique_destinations);
$has_flights = $outbound_flight || $return_flight;
$has_car = !empty($car_rental);
$has_cruise = !empty($cruises);

// ============================================
// LUCIDE SVG ICONS (inline for zero dependencies)
// ============================================
$icons = [
    'calendar' => '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>',
    'plane' => '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z"/></svg>',
    'hotel' => '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2Z"/><path d="m9 16 .348-.24c1.465-1.013 3.84-1.013 5.304 0L15 16"/><path d="M8 7h.01"/><path d="M16 7h.01"/><path d="M12 7h.01"/><path d="M12 11h.01"/><path d="M16 11h.01"/><path d="M8 11h.01"/></svg>',
    'car' => '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><path d="M9 17h6"/><circle cx="17" cy="17" r="2"/></svg>',
    'map-pin' => '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>',
    'map' => '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"/><line x1="9" x2="9" y1="3" y2="18"/><line x1="15" x2="15" y1="6" y2="21"/></svg>',
    'moon' => '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>',
    'star' => '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="1"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>',
    'utensils' => '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/><path d="M7 2v20"/><path d="M21 15V2v0a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7"/></svg>',
    'globe' => '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/></svg>',
    'clock' => '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>',
    'phone' => '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>',
    'shield-check' => '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10"/><path d="m9 12 2 2 4-4"/></svg>',
    'message-circle' => '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 21 1.9-5.7a8.5 8.5 0 1 1 3.8 3.8z"/></svg>',
    'heart' => '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>',
    'chevron-right' => '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>',
    'x' => '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>',
    'chevron-left' => '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>',
    'ship' => '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 21c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1 .6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"/><path d="M19.38 20A11.6 11.6 0 0 0 21 14l-9-4-9 4c0 2.9.94 5.34 2.81 7.76"/><path d="M19 13V7a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v6"/><path d="M12 1v4"/></svg>',
    'bed' => '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 4v16"/><path d="M2 8h18a2 2 0 0 1 2 2v10"/><path d="M2 17h20"/><path d="M6 8v9"/></svg>',
    'info' => '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>',
    'compass' => '<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/></svg>',
];
?>

<style>
/* ============================================
   TRAVEL DETAIL v2 — CSS
   ============================================ */
:root {
    --tc2-primary: <?php echo esc_attr($primary_color); ?>;
    --tc2-primary-dark: #1f7a6f;
    --tc2-secondary: #d34e4a;
    --tc2-text: #1f2937;
    --tc2-text-light: #6b7280;
    --tc2-text-muted: #9ca3af;
    --tc2-bg: #f8fafc;
    --tc2-white: #ffffff;
    --tc2-border: #e5e7eb;
    --tc2-radius: 16px;
    --tc2-shadow: 0 4px 20px rgba(0,0,0,0.08);
    --tc2-shadow-lg: 0 12px 40px rgba(0,0,0,0.12);
}

/* Reset WP theme spacing */
body { margin: 0 !important; padding: 0 !important; }
#content, .site-content, .content-area, main, article {
    margin-top: 0 !important; padding-top: 0 !important;
    max-width: none !important; width: 100% !important;
}

.tc2-detail {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    width: 100vw !important; max-width: 100vw !important;
    margin-left: calc(-50vw + 50%) !important;
    position: relative; color: var(--tc2-text); background: var(--tc2-bg);
    -webkit-font-smoothing: antialiased;
}

/* HERO */
.tc2-hero { position: relative; width: 100%; height: 520px; overflow: hidden; background: #111; }
.tc2-hero-slide { position: absolute; inset: 0; opacity: 0; transition: opacity 1.2s ease; }
.tc2-hero-slide.active { opacity: 1; }
.tc2-hero-slide img { width: 100%; height: 100%; object-fit: cover; }
.tc2-hero-overlay { position: absolute; inset: 0; background: linear-gradient(to top, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.1) 50%, rgba(0,0,0,0.2) 100%); }
.tc2-hero-content { position: absolute; bottom: 0; left: 0; right: 0; padding: 40px; max-width: 1280px; margin: 0 auto; }
.tc2-hero-breadcrumb { font-size: 13px; color: rgba(255,255,255,0.7); margin-bottom: 12px; }
.tc2-hero-breadcrumb a { color: rgba(255,255,255,0.7); text-decoration: none; }
.tc2-hero-breadcrumb a:hover { color: white; }
.tc2-hero-title { font-size: 42px; font-weight: 800; color: white; line-height: 1.15; margin-bottom: 8px; text-shadow: 0 2px 8px rgba(0,0,0,0.3); }
.tc2-hero-subtitle { font-size: 18px; color: rgba(255,255,255,0.85); }
.tc2-hero-dots { position: absolute; bottom: 20px; right: 40px; display: flex; gap: 8px; }
.tc2-hero-dot { width: 10px; height: 10px; border-radius: 50%; background: rgba(255,255,255,0.4); border: none; cursor: pointer; transition: all 0.3s; }
.tc2-hero-dot.active { background: white; transform: scale(1.3); }

@media (max-width: 768px) {
    .tc2-hero { height: 360px; }
    .tc2-hero-title { font-size: 28px; }
    .tc2-hero-content { padding: 24px 20px; }
}

/* HIGHLIGHTS STRIP */
.tc2-highlights { background: white; border-bottom: 1px solid var(--tc2-border); position: sticky; top: 0; z-index: 9990; box-shadow: 0 2px 8px rgba(0,0,0,0.06); }
.tc2-highlights-inner { max-width: 1280px; margin: 0 auto; padding: 0 40px; display: flex; align-items: center; justify-content: space-between; height: 64px; }
.tc2-highlights-left { display: flex; gap: 28px; align-items: center; }
.tc2-hl-item { display: flex; align-items: center; gap: 8px; font-size: 14px; color: var(--tc2-text); font-weight: 500; }
.tc2-hl-icon { width: 36px; height: 36px; border-radius: 10px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; color: var(--tc2-primary); }
.tc2-hl-icon.flight { background: #eff6ff; color: #3b82f6; }
.tc2-hl-icon.hotel { background: #fef3c7; color: #d97706; }
.tc2-hl-icon.car { background: #fce7f3; color: #db2777; }
.tc2-hl-icon.days { background: #f0fdf4; color: var(--tc2-primary); }
.tc2-hl-icon.cruise { background: #e0f2fe; color: #0284c7; }
.tc2-hl-label { font-size: 12px; color: var(--tc2-text-light); }
.tc2-highlights-right { display: flex; align-items: center; gap: 16px; }
.tc2-price-tag { display: flex; flex-direction: column; align-items: center; text-align: center; }
.tc2-price-label { font-size: 10px; color: var(--tc2-text-muted); text-transform: uppercase; letter-spacing: 0.5px; line-height: 1; }
.tc2-price-amount { font-size: 26px; font-weight: 800; color: var(--tc2-primary); line-height: 1.1; }
.tc2-price-sub { font-size: 11px; color: var(--tc2-text-light); line-height: 1; }
.tc2-cta-btn { padding: 12px 28px; background: var(--tc2-primary); color: white; border: none; border-radius: 12px; font-size: 15px; font-weight: 600; cursor: pointer; transition: all 0.2s; white-space: nowrap; text-decoration: none; }
.tc2-cta-btn:hover { filter: brightness(0.9); transform: translateY(-1px); box-shadow: 0 4px 12px rgba(42,157,143,0.3); }

@media (max-width: 900px) {
    .tc2-highlights-inner { padding: 12px 16px; flex-wrap: wrap; height: auto; gap: 12px; }
    .tc2-highlights-left { gap: 12px; flex-wrap: wrap; }
    .tc2-hl-item { font-size: 13px; }
    .tc2-price-amount { font-size: 22px; }
}

/* LAYOUT */
.tc2-layout { max-width: 1280px; margin: 0 auto; padding: 40px; display: grid; grid-template-columns: 1fr 380px; gap: 40px; align-items: start; }
@media (max-width: 1024px) { .tc2-layout { grid-template-columns: 1fr; padding: 24px 16px; } }

/* SECTIONS */
.tc2-section { margin-bottom: 48px; }
.tc2-section-header { display: flex; align-items: center; gap: 12px; margin-bottom: 24px; }
.tc2-section-icon { width: 44px; height: 44px; border-radius: 12px; background: linear-gradient(135deg, var(--tc2-primary), var(--tc2-primary-dark)); display: flex; align-items: center; justify-content: center; color: white; flex-shrink: 0; }
.tc2-section-title { font-size: 24px; font-weight: 700; color: var(--tc2-text); }
.tc2-section-subtitle { font-size: 14px; color: var(--tc2-text-light); }
.tc2-intro-text { font-size: 16px; line-height: 1.8; color: var(--tc2-text); }
.tc2-intro-text p { margin-bottom: 16px; }

/* MAP */
.tc2-map-container { width: 100%; height: 360px; border-radius: var(--tc2-radius); overflow: hidden; box-shadow: var(--tc2-shadow); border: 1px solid var(--tc2-border); z-index: 1; position: relative; }
.tc2-map-container .leaflet-container { width: 100% !important; height: 100% !important; }
.tc2-map-container .leaflet-tile-pane img { max-width: none !important; }

/* STOPS */
.tc2-stops { position: relative; }
.tc2-stops::before { content: ''; position: absolute; left: 22px; top: 44px; bottom: 44px; width: 3px; background: linear-gradient(to bottom, var(--tc2-primary), var(--tc2-primary-dark)); border-radius: 2px; opacity: 0.2; }
.tc2-stop { display: flex; gap: 20px; margin-bottom: 24px; position: relative; }
.tc2-stop:last-child { margin-bottom: 0; }
.tc2-stop-marker { width: 44px; height: 44px; border-radius: 50%; background: white; border: 3px solid var(--tc2-primary); display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 16px; color: var(--tc2-primary); flex-shrink: 0; z-index: 1; box-shadow: 0 2px 8px rgba(42,157,143,0.15); }
.tc2-stop-card { flex: 1; background: white; border-radius: var(--tc2-radius); overflow: hidden; box-shadow: var(--tc2-shadow); border: 1px solid var(--tc2-border); transition: all 0.3s ease; }
.tc2-stop-card:hover { box-shadow: var(--tc2-shadow-lg); transform: translateY(-2px); }
.tc2-stop-card-top { display: grid; grid-template-columns: 220px 1fr; min-height: 180px; }
.tc2-stop-image { width: 100%; height: 100%; min-height: 180px; object-fit: cover; cursor: pointer; border-radius: 0; }
.tc2-stop-info { padding: 16px; display: flex; flex-direction: column; justify-content: center; }
.tc2-stop-location { font-size: 12px; color: var(--tc2-text-muted); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px; }
.tc2-stop-name { font-size: 18px; font-weight: 700; color: var(--tc2-text); margin-bottom: 6px; }
.tc2-stop-desc { font-size: 13px; color: var(--tc2-text-light); line-height: 1.6; margin-bottom: 10px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.tc2-stop-tags { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; }
.tc2-stop-tag { display: inline-flex; align-items: center; gap: 4px; padding: 4px 10px; background: var(--tc2-bg); border-radius: 8px; font-size: 12px; color: var(--tc2-text-light); font-weight: 500; }
.tc2-stop-tag svg { width: 14px; height: 14px; }
.tc2-btn-more { display: none; }
.tc2-btn-more svg { width: 12px; height: 12px; }
.tc2-stop-info .tc2-btn-more { display: inline-flex; align-items: center; gap: 3px; padding: 4px 10px; background: transparent; color: var(--tc2-primary); border: 1.5px solid var(--tc2-primary); border-radius: 6px; font-size: 11px; font-weight: 600; cursor: pointer; transition: all 0.2s; text-decoration: none; white-space: nowrap; margin-left: auto; }
.tc2-stop-info .tc2-btn-more:hover { background: var(--tc2-primary); color: white; }

/* Hotel sub-card */
.tc2-stop-hotel { border-top: 1px solid var(--tc2-border); padding: 12px 16px; display: flex; align-items: center; gap: 12px; background: #fafbfc; }
.tc2-stop-hotel-img { width: 72px; height: 72px; border-radius: 10px; object-fit: cover; flex-shrink: 0; cursor: pointer; }
.tc2-stop-hotel-info { flex: 1; min-width: 0; }
.tc2-stop-hotel-name { font-size: 14px; font-weight: 600; color: var(--tc2-text); margin-bottom: 2px; }
.tc2-stop-hotel-meta { font-size: 12px; color: var(--tc2-text-light); display: flex; flex-wrap: wrap; gap: 6px; align-items: center; }
.tc2-stop-hotel-meta svg { width: 14px; height: 14px; color: #eab308; }
.tc2-stop-hotel-stars { color: #eab308; letter-spacing: -1px; }
.tc2-stop-hotel-badge { padding: 4px 10px; background: #fef3c7; color: #92400e; border-radius: 6px; font-size: 11px; font-weight: 600; white-space: nowrap; }
.tc2-stop-hotel-btn { padding: 4px 10px; background: transparent; color: var(--tc2-primary); border: 1.5px solid var(--tc2-primary); border-radius: 6px; font-size: 11px; font-weight: 600; cursor: pointer; transition: all 0.2s; white-space: nowrap; }
.tc2-stop-hotel-btn:hover { background: var(--tc2-primary); color: white; }

@media (max-width: 768px) {
    .tc2-stop-card-top { grid-template-columns: 1fr; }
    .tc2-stop-image { height: 200px; min-height: auto; }
    .tc2-stops::before { left: 18px; }
    .tc2-stop-marker { width: 36px; height: 36px; font-size: 14px; }
    .tc2-stop { gap: 16px; }
    .tc2-stop-hotel { flex-wrap: wrap; }
}

/* TRANSPORT CARDS */
.tc2-transport { display: flex; gap: 24px; margin-bottom: 32px; position: relative; }
.tc2-transport-marker { width: 44px; height: 44px; border-radius: 50%; background: #eff6ff; border: 3px solid #3b82f6; display: flex; align-items: center; justify-content: center; color: #3b82f6; flex-shrink: 0; z-index: 1; }
.tc2-transport-card { flex: 1; background: white; border-radius: 14px; padding: 20px; box-shadow: var(--tc2-shadow); border: 1px solid var(--tc2-border); display: flex; align-items: center; gap: 20px; flex-wrap: wrap; }
.tc2-transport-route { display: flex; align-items: center; gap: 12px; flex: 1; min-width: 200px; }
.tc2-transport-city { text-align: center; }
.tc2-transport-code { font-size: 20px; font-weight: 700; color: var(--tc2-text); }
.tc2-transport-name { font-size: 12px; color: var(--tc2-text-light); max-width: 100px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.tc2-transport-arrow { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 4px; min-width: 60px; }
.tc2-transport-line { width: 100%; height: 2px; background: var(--tc2-border); position: relative; }
.tc2-transport-line .tc2-plane-icon { position: absolute; top: -9px; left: 50%; transform: translateX(-50%); color: #3b82f6; }
.tc2-transport-line .tc2-plane-icon svg { width: 18px; height: 18px; }
.tc2-transport-duration { font-size: 12px; color: var(--tc2-text-muted); }
.tc2-transport-details { text-align: right; }
.tc2-transport-airline { font-size: 13px; font-weight: 600; color: var(--tc2-text); }
.tc2-transport-time { font-size: 12px; color: var(--tc2-text-light); }

/* CAR RENTAL CARD */
.tc2-car-card { display: flex; gap: 24px; margin-bottom: 32px; position: relative; }
.tc2-car-marker { width: 44px; height: 44px; border-radius: 50%; background: #fce7f3; border: 3px solid #db2777; display: flex; align-items: center; justify-content: center; color: #db2777; flex-shrink: 0; z-index: 1; }
.tc2-car-inner { flex: 1; background: white; border-radius: 14px; padding: 20px; box-shadow: var(--tc2-shadow); border: 1px solid var(--tc2-border); display: flex; align-items: center; gap: 16px; flex-wrap: wrap; }
.tc2-car-info { flex: 1; }
.tc2-car-title { font-size: 16px; font-weight: 600; color: var(--tc2-text); margin-bottom: 4px; }
.tc2-car-meta { font-size: 13px; color: var(--tc2-text-light); display: flex; flex-wrap: wrap; gap: 12px; }
.tc2-car-meta span { display: inline-flex; align-items: center; gap: 4px; }
.tc2-car-meta svg { width: 14px; height: 14px; }

/* SIDEBAR */
.tc2-sidebar { position: sticky; top: 84px; }
@media (max-width: 1024px) { .tc2-sidebar { position: relative; top: 0; order: -1; } }

.tc2-booking { background: white; border-radius: var(--tc2-radius); box-shadow: var(--tc2-shadow-lg); border: 1px solid var(--tc2-border); overflow: hidden; margin-bottom: 24px; }
.tc2-booking-header { background: linear-gradient(135deg, var(--tc2-primary), var(--tc2-primary-dark)); padding: 24px; color: white; text-align: center; }
.tc2-booking-price { font-size: 36px; font-weight: 800; line-height: 1; }
.tc2-booking-price-sub { font-size: 14px; opacity: 0.8; margin-top: 4px; }
.tc2-booking-body { padding: 24px; }
.tc2-booking-features { list-style: none; margin: 0 0 20px 0; padding: 0; }
.tc2-booking-features li { display: flex; align-items: center; gap: 10px; padding: 10px 0; border-bottom: 1px solid #f3f4f6; font-size: 14px; color: var(--tc2-text); }
.tc2-booking-features li:last-child { border-bottom: none; }
.tc2-booking-features .feat-icon { width: 28px; height: 28px; border-radius: 8px; background: #f0fdf4; display: flex; align-items: center; justify-content: center; flex-shrink: 0; color: var(--tc2-primary); }
.tc2-booking-features .feat-icon svg { width: 16px; height: 16px; }

.tc2-booking-form { margin-top: 16px; }
.tc2-form-group { margin-bottom: 12px; }
.tc2-form-label { display: block; font-size: 13px; font-weight: 500; color: var(--tc2-text); margin-bottom: 4px; }
.tc2-form-input { width: 100%; padding: 10px 12px; border: 1px solid var(--tc2-border); border-radius: 8px; font-size: 14px; box-sizing: border-box; }
.tc2-form-input:focus { outline: none; border-color: var(--tc2-primary); box-shadow: 0 0 0 3px rgba(42,157,143,0.1); }

.tc2-btn-book { width: 100%; padding: 14px; background: var(--tc2-secondary); color: white; border: none; border-radius: 12px; font-size: 16px; font-weight: 700; cursor: pointer; transition: all 0.2s; margin-bottom: 10px; }
.tc2-btn-book:hover { opacity: 0.9; transform: translateY(-1px); }
.tc2-btn-call { width: 100%; padding: 12px; background: transparent; color: var(--tc2-text); border: 2px solid var(--tc2-border); border-radius: 12px; font-size: 14px; font-weight: 600; cursor: pointer; transition: all 0.2s; display: flex; align-items: center; justify-content: center; gap: 8px; }
.tc2-btn-call:hover { border-color: var(--tc2-primary); color: var(--tc2-primary); }
.tc2-btn-call svg { width: 16px; height: 16px; }

/* Touroperator */
.tc2-touroperator { background: white; border-radius: var(--tc2-radius); padding: 16px; box-shadow: var(--tc2-shadow); border: 1px solid var(--tc2-border); display: flex; align-items: center; gap: 12px; margin-bottom: 24px; }
.tc2-touroperator-logo { height: 28px !important; width: auto !important; max-width: 90px !important; object-fit: contain !important; }
.tc2-touroperator-name { font-size: 14px; font-weight: 600; color: var(--tc2-text); }
.tc2-touroperator-label { font-size: 12px; color: var(--tc2-text-muted); }

/* USP card */
.tc2-usp-card { background: white; border-radius: var(--tc2-radius); padding: 20px; box-shadow: var(--tc2-shadow); border: 1px solid var(--tc2-border); }
.tc2-usp-item { display: flex; align-items: flex-start; gap: 12px; padding: 12px 0; border-bottom: 1px solid #f3f4f6; }
.tc2-usp-item:last-child { border-bottom: none; }
.tc2-usp-icon { width: 32px; height: 32px; border-radius: 8px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.tc2-usp-icon svg { width: 18px; height: 18px; }
.tc2-usp-icon.usp-green { background: #f0fdf4; color: #16a34a; }
.tc2-usp-icon.usp-amber { background: #fef3c7; color: #d97706; }
.tc2-usp-icon.usp-purple { background: #f3e8ff; color: #9333ea; }
.tc2-usp-text { font-size: 13px; color: var(--tc2-text); line-height: 1.5; }
.tc2-usp-text strong { display: block; margin-bottom: 2px; font-size: 14px; }

/* DETAIL PANEL (sliding) */
.tc2-panel-overlay { display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 99998; opacity: 0; transition: opacity 0.3s; }
.tc2-panel-overlay.active { opacity: 1; }
.tc2-panel { position: fixed; top: 0; right: -100%; width: 520px; max-width: 92vw; height: 100vh; background: var(--tc2-white); z-index: 99999; box-shadow: -5px 0 30px rgba(0,0,0,0.2); transition: right 0.35s ease; display: flex; flex-direction: column; }
.tc2-panel.active { right: 0; }
.tc2-panel-header { display: flex; justify-content: space-between; align-items: center; padding: 20px 24px; border-bottom: 1px solid var(--tc2-border); flex-shrink: 0; background: white; }
.tc2-panel-title { font-size: 18px; font-weight: 700; color: var(--tc2-text); }
.tc2-panel-close { background: none; border: none; color: var(--tc2-text-light); cursor: pointer; padding: 4px; border-radius: 8px; display: flex; align-items: center; justify-content: center; }
.tc2-panel-close:hover { background: #f3f4f6; color: var(--tc2-text); }
.tc2-panel-body { flex: 1; overflow-y: auto; padding: 24px; }
.tc2-panel-gallery { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; margin-bottom: 20px; }
.tc2-panel-gallery img { width: 100%; height: 120px; object-fit: cover; border-radius: 10px; cursor: pointer; transition: transform 0.2s; }
.tc2-panel-gallery img:hover { transform: scale(1.02); }
.tc2-panel-gallery img:first-child { grid-column: 1 / -1; height: 220px; }
.tc2-panel-section { margin-bottom: 20px; }
.tc2-panel-section h3 { font-size: 15px; font-weight: 600; color: var(--tc2-text); margin: 0 0 8px 0; display: flex; align-items: center; gap: 8px; }
.tc2-panel-section h3 svg { width: 18px; height: 18px; color: var(--tc2-primary); }
.tc2-panel-section p { font-size: 14px; line-height: 1.7; color: var(--tc2-text); margin: 0; }
.tc2-panel-info { display: flex; flex-direction: column; gap: 8px; }
.tc2-panel-info-row { display: flex; align-items: center; gap: 10px; padding: 10px 14px; background: var(--tc2-bg); border-radius: 10px; font-size: 13px; }
.tc2-panel-info-row svg { width: 16px; height: 16px; color: var(--tc2-primary); flex-shrink: 0; }
.tc2-panel-info-label { font-weight: 600; color: var(--tc2-text); min-width: 80px; }
.tc2-panel-info-value { color: var(--tc2-text-light); }
.tc2-panel-map { width: 100%; height: 220px; border-radius: 12px; overflow: hidden; margin-bottom: 20px; }
.tc2-panel-facilities { display: flex; flex-wrap: wrap; gap: 6px; }
.tc2-panel-facility { padding: 4px 10px; background: #f0fdf4; color: var(--tc2-primary); border-radius: 6px; font-size: 12px; font-weight: 500; }

/* PHOTO LIGHTBOX */
.tc2-lightbox { display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.95); z-index: 100000; align-items: center; justify-content: center; }
.tc2-lightbox.active { display: flex; }
.tc2-lightbox img { max-width: 90vw; max-height: 85vh; object-fit: contain; border-radius: 8px; }
.tc2-lightbox-btn { position: absolute; background: rgba(255,255,255,0.15); border: none; color: white; width: 48px; height: 48px; border-radius: 50%; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: background 0.2s; }
.tc2-lightbox-btn:hover { background: rgba(255,255,255,0.3); }
.tc2-lightbox-close { top: 20px; right: 20px; }
.tc2-lightbox-prev { left: 20px; top: 50%; transform: translateY(-50%); }
.tc2-lightbox-next { right: 20px; top: 50%; transform: translateY(-50%); }
.tc2-lightbox-counter { position: absolute; bottom: 20px; left: 50%; transform: translateX(-50%); color: white; font-size: 14px; background: rgba(0,0,0,0.5); padding: 6px 16px; border-radius: 20px; }

/* Leaflet critical overrides (WP themes break these) */
.tc2-map-container img { max-width: none !important; max-height: none !important; }
.tc2-map-container .leaflet-pane { z-index: 1 !important; }
.tc2-map-container .leaflet-top, .tc2-map-container .leaflet-bottom { z-index: 2 !important; }
.tc2-map-container .leaflet-tile { width: 256px !important; height: 256px !important; }
.tc2-map-container .leaflet-container { font-family: inherit; }

/* Leaflet tooltip override */
.tc2-map-label { background: white !important; border: 1px solid #e5e7eb !important; border-radius: 6px !important; padding: 4px 8px !important; font-size: 12px !important; font-weight: 600 !important; color: #1f2937 !important; box-shadow: 0 2px 6px rgba(0,0,0,0.1) !important; }
.tc2-map-label::before { display: none !important; }

/* Example notice */
.tc2-example-notice { display: flex; align-items: center; gap: 12px; padding: 14px 16px; background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 10px; margin-bottom: 20px; }
.tc2-example-icon { flex-shrink: 0; color: #3b82f6; }
.tc2-example-icon svg { width: 20px; height: 20px; }
.tc2-example-notice strong { display: block; font-size: 14px; color: var(--tc2-text); }
.tc2-example-notice span { font-size: 12px; color: var(--tc2-text-light); }

/* Star options */
.tc2-star-options { display: flex; flex-direction: column; gap: 6px; }
.tc2-star-option { display: flex; align-items: center; gap: 8px; padding: 8px 12px; background: var(--tc2-bg); border: 1.5px solid var(--tc2-border); border-radius: 8px; cursor: pointer; transition: all 0.2s; }
.tc2-star-option:hover { border-color: var(--tc2-primary); }
.tc2-star-option input[type="checkbox"] { width: 16px; height: 16px; accent-color: var(--tc2-primary); cursor: pointer; }
.tc2-star-option input[type="checkbox"]:checked ~ .tc2-star-label { color: var(--tc2-text); font-weight: 600; }
.tc2-star-label { font-size: 13px; color: var(--tc2-text-light); display: flex; align-items: center; gap: 6px; }
.tc2-stars-yellow { color: #eab308; font-size: 15px; letter-spacing: -1px; }

/* Form result */
.tc2-form-result { display: none; margin-bottom: 12px; padding: 12px; border-radius: 8px; font-size: 14px; }
.tc2-form-result.success { display: block; background: #f0fdf4; color: #166534; border: 1px solid #bbf7d0; }
.tc2-form-result.error { display: block; background: #fef2f2; color: #991b1b; border: 1px solid #fecaca; }
</style>

<!-- ============================================
     MAIN WRAPPER
     ============================================ -->
<div class="tc2-detail">

<!-- HERO -->
<div class="tc2-hero">
    <div class="tc2-hero-slides">
        <?php if (!empty($all_images)): ?>
            <?php foreach (array_slice($all_images, 0, 5) as $idx => $img): ?>
                <div class="tc2-hero-slide <?php echo $idx === 0 ? 'active' : ''; ?>">
                    <img src="<?php echo esc_url($img); ?>" alt="<?php echo esc_attr($title); ?>">
                </div>
            <?php endforeach; ?>
        <?php elseif ($hero_image): ?>
            <div class="tc2-hero-slide active">
                <img src="<?php echo esc_url($hero_image); ?>" alt="<?php echo esc_attr($title); ?>">
            </div>
        <?php endif; ?>
    </div>
    <div class="tc2-hero-overlay"></div>
    <div class="tc2-hero-content">
        <div class="tc2-hero-breadcrumb">
            <a href="<?php echo home_url(); ?>">Home</a> / <a href="<?php echo home_url('/inspiratiereis/'); ?>">Reizen</a><?php if ($country_str): ?> / <?php echo esc_html($country_str); ?><?php endif; ?>
        </div>
        <h1 class="tc2-hero-title"><?php echo esc_html($title); ?></h1>
        <?php if ($location): ?>
            <div class="tc2-hero-subtitle"><?php echo esc_html($location); ?></div>
        <?php endif; ?>
    </div>
    <?php if (count($all_images) > 1): ?>
    <div class="tc2-hero-dots">
        <?php foreach (array_slice($all_images, 0, 5) as $idx => $img): ?>
            <button type="button" class="tc2-hero-dot <?php echo $idx === 0 ? 'active' : ''; ?>" data-index="<?php echo $idx; ?>"></button>
        <?php endforeach; ?>
    </div>
    <?php endif; ?>
</div>

<!-- STICKY HIGHLIGHTS -->
<div class="tc2-highlights">
    <div class="tc2-highlights-inner">
        <div class="tc2-highlights-left">
            <div class="tc2-hl-item">
                <div class="tc2-hl-icon days"><?php echo $icons['calendar']; ?></div>
                <div><strong><?php echo $days; ?> dagen</strong><br><span class="tc2-hl-label"><?php echo $nights; ?> nachten</span></div>
            </div>
            <?php if ($has_flights): ?>
            <div class="tc2-hl-item">
                <div class="tc2-hl-icon flight"><?php echo $icons['plane']; ?></div>
                <div><strong>Retourvlucht</strong><br><span class="tc2-hl-label">incl. transfers</span></div>
            </div>
            <?php endif; ?>
            <?php if ($show_hotels && $hotel_count > 0): ?>
            <div class="tc2-hl-item">
                <div class="tc2-hl-icon hotel"><?php echo $icons['hotel']; ?></div>
                <div><strong><?php echo $hotel_count; ?> hotel<?php echo $hotel_count > 1 ? 's' : ''; ?></strong><br><span class="tc2-hl-label"><?php echo $dest_count; ?> bestemmingen</span></div>
            </div>
            <?php elseif ($dest_count > 0): ?>
            <div class="tc2-hl-item">
                <div class="tc2-hl-icon hotel"><?php echo $icons['map-pin']; ?></div>
                <div><strong><?php echo $dest_count; ?> bestemmingen</strong></div>
            </div>
            <?php endif; ?>
            <?php if ($has_car): ?>
            <div class="tc2-hl-item">
                <div class="tc2-hl-icon car"><?php echo $icons['car']; ?></div>
                <div><strong>Huurauto</strong><br><span class="tc2-hl-label"><?php echo $car_days; ?> dagen</span></div>
            </div>
            <?php endif; ?>
            <?php if ($has_cruise): ?>
            <div class="tc2-hl-item">
                <div class="tc2-hl-icon cruise"><?php echo $icons['ship']; ?></div>
                <div><strong>Cruise</strong></div>
            </div>
            <?php endif; ?>
        </div>
        <div class="tc2-highlights-right">
            <?php if ($show_prices && $price > 0): ?>
            <div class="tc2-price-tag">
                <span class="tc2-price-label">Vanaf</span>
                <span class="tc2-price-amount">&euro;<?php echo number_format($price, 0, ',', '.'); ?></span>
                <span class="tc2-price-sub">p.p. indicatieprijs</span>
            </div>
            <?php endif; ?>
            <a href="#tc2-booking-section" class="tc2-cta-btn" onclick="document.getElementById('tc2-booking-section').scrollIntoView({behavior:'smooth'});return false;">Offerte aanvragen</a>
        </div>
    </div>
</div>

<!-- MAIN LAYOUT -->
<div class="tc2-layout">
    <!-- LEFT COLUMN -->
    <div class="tc2-main">

        <!-- INTRO -->
        <?php $intro = !empty($intro_text) ? $intro_text : $description; ?>
        <?php if ($intro): ?>
        <section class="tc2-section">
            <div class="tc2-section-header">
                <div class="tc2-section-icon"><?php echo $icons['compass']; ?></div>
                <div>
                    <div class="tc2-section-title">Over deze reis</div>
                    <?php if ($country_str): ?>
                        <div class="tc2-section-subtitle"><?php echo esc_html($country_str); ?></div>
                    <?php endif; ?>
                </div>
            </div>
            <div class="tc2-intro-text"><?php echo wp_kses_post($intro); ?></div>
        </section>
        <?php endif; ?>

        <!-- ROUTE MAP -->
        <?php if (count($map_destinations) >= 2): ?>
        <section class="tc2-section">
            <div class="tc2-section-header">
                <div class="tc2-section-icon"><?php echo $icons['map']; ?></div>
                <div>
                    <div class="tc2-section-title">Jouw route</div>
                    <div class="tc2-section-subtitle"><?php echo $dest_count; ?> bestemmingen in <?php echo $days; ?> dagen</div>
                </div>
            </div>
            <div class="tc2-map-container" id="tc2RouteMap"></div>
        </section>
        <?php endif; ?>

        <!-- JOURNEY STOPS -->
        <?php if (!empty($stops)): ?>
        <section class="tc2-section">
            <div class="tc2-section-header">
                <div class="tc2-section-icon"><?php echo $icons['map-pin']; ?></div>
                <div>
                    <div class="tc2-section-title">Jouw reisroute</div>
                    <div class="tc2-section-subtitle">Stop voor stop</div>
                </div>
            </div>

            <div class="tc2-stops">

                <!-- OUTBOUND FLIGHT -->
                <?php if ($outbound_flight): ?>
                <div class="tc2-transport">
                    <div class="tc2-transport-marker"><?php echo $icons['plane']; ?></div>
                    <div class="tc2-transport-card">
                        <div class="tc2-transport-route">
                            <div class="tc2-transport-city">
                                <div class="tc2-transport-code"><?php echo esc_html($outbound_flight['from_code']); ?></div>
                                <div class="tc2-transport-name"><?php echo esc_html($outbound_flight['from']); ?></div>
                            </div>
                            <div class="tc2-transport-arrow">
                                <div class="tc2-transport-line"><span class="tc2-plane-icon"><?php echo $icons['plane']; ?></span></div>
                            </div>
                            <div class="tc2-transport-city">
                                <div class="tc2-transport-code"><?php echo esc_html($outbound_flight['to_code']); ?></div>
                                <div class="tc2-transport-name"><?php echo esc_html($outbound_flight['to']); ?></div>
                            </div>
                        </div>
                        <div class="tc2-transport-details">
                            <?php if ($outbound_flight['airline']): ?>
                                <div class="tc2-transport-airline"><?php echo esc_html($outbound_flight['airline']); ?></div>
                            <?php endif; ?>
                            <?php if ($outbound_flight['dep_time'] && $outbound_flight['arr_time']): ?>
                                <div class="tc2-transport-time"><?php echo esc_html($outbound_flight['dep_time']); ?> → <?php echo esc_html($outbound_flight['arr_time']); ?></div>
                            <?php endif; ?>
                        </div>
                    </div>
                </div>
                <?php endif; ?>

                <!-- CAR RENTAL (if applicable) -->
                <?php if ($has_car): ?>
                <div class="tc2-car-card">
                    <div class="tc2-car-marker"><?php echo $icons['car']; ?></div>
                    <div class="tc2-car-inner">
                        <?php if (!empty($car_rental['imageUrl'])): ?>
                            <img src="<?php echo esc_url($car_rental['imageUrl']); ?>" alt="Huurauto" style="width:80px;height:60px;object-fit:contain;border-radius:8px;">
                        <?php endif; ?>
                        <div class="tc2-car-info">
                            <div class="tc2-car-title"><?php echo esc_html($car_rental['product'] ?? 'Huurauto'); ?></div>
                            <div class="tc2-car-meta">
                                <span><?php echo $icons['calendar']; ?> <?php echo $car_days; ?> dagen</span>
                                <?php if (!empty($car_rental['pickupLocation'])): ?>
                                    <span><?php echo $icons['map-pin']; ?> <?php echo esc_html($car_rental['pickupLocation']); ?></span>
                                <?php endif; ?>
                            </div>
                        </div>
                    </div>
                </div>
                <?php endif; ?>

                <!-- STOPS -->
                <?php foreach ($stops as $stop): 
                    $dest = $stop['destination'];
                    $accom = $stop['accommodation'];
                    $stop_num = $stop['number'];
                    
                    // Skip if no destination data
                    if (!$dest && !$accom) continue;
                    
                    $dest_name = $dest ? $dest['name'] : ($accom ? $accom['name'] : '');
                    $dest_country = $dest ? $dest['country'] : '';
                    $dest_desc = $dest ? $dest['description'] : '';
                    $dest_images = $dest ? ($dest['images'] ?? []) : [];
                    $dest_geo = $dest ? ($dest['geolocation'] ?? null) : null;
                    
                    $accom_name = $accom ? $accom['name'] : '';
                    $accom_nights = $accom ? $accom['nights'] : 0;
                    $accom_images = $accom ? ($accom['images'] ?? []) : [];
                    $accom_type = $accom ? $accom['type'] : '';
                ?>
                <div class="tc2-stop">
                    <div class="tc2-stop-marker"><?php echo $stop_num; ?></div>
                    <div class="tc2-stop-card">
                        <div class="tc2-stop-card-top">
                            <?php if (!empty($dest_images[0])): ?>
                                <img src="<?php echo esc_url($dest_images[0]); ?>" 
                                     alt="<?php echo esc_attr($dest_name); ?>" 
                                     class="tc2-stop-image"
                                     onclick="tc2OpenLightbox(<?php echo esc_attr(json_encode($dest_images)); ?>, 0)">
                            <?php elseif (!empty($accom_images[0])): ?>
                                <img src="<?php echo esc_url($accom_images[0]); ?>" 
                                     alt="<?php echo esc_attr($dest_name); ?>" 
                                     class="tc2-stop-image"
                                     onclick="tc2OpenLightbox(<?php echo esc_attr(json_encode($accom_images)); ?>, 0)">
                            <?php endif; ?>
                            <div class="tc2-stop-info">
                                <?php if ($dest_country): ?>
                                    <div class="tc2-stop-location"><?php echo esc_html($dest_country); ?></div>
                                <?php endif; ?>
                                <div class="tc2-stop-name"><?php echo esc_html($dest_name); ?></div>
                                <?php if ($dest_desc): ?>
                                    <div class="tc2-stop-desc"><?php echo wp_kses_post($dest_desc); ?></div>
                                <?php endif; ?>
                                <div class="tc2-stop-tags">
                                    <?php if ($accom_nights > 0): ?>
                                        <span class="tc2-stop-tag"><?php echo $icons['moon']; ?> <?php echo $accom_nights; ?> <?php echo $accom_nights == 1 ? 'nacht' : 'nachten'; ?></span>
                                    <?php endif; ?>
                                    <?php if ($dest_country): ?>
                                        <span class="tc2-stop-tag"><?php echo $icons['globe']; ?> <?php echo esc_html($dest_country); ?></span>
                                    <?php endif; ?>
                                    <?php if ($dest && (!empty($dest_desc) || count($dest_images) > 1)): 
                                        $panel_id = 'tc2data_dest_' . $stop_num;
                                    ?>
                                        <button type="button" class="tc2-btn-more" 
                                            onclick="tc2ShowPanel('<?php echo $panel_id; ?>')">
                                            Lees verder <?php echo $icons['chevron-right']; ?>
                                        </button>
                                    <?php endif; ?>
                                </div>
                            </div>
                        </div>

                        <!-- HOTEL (only if show_hotels is true) -->
                        <?php if ($show_hotels && $accom && $accom_type === 'hotel' && $accom_name): ?>
                        <div class="tc2-stop-hotel">
                            <?php if (!empty($accom_images[0])): ?>
                                <img src="<?php echo esc_url($accom_images[0]); ?>" 
                                     alt="<?php echo esc_attr($accom_name); ?>" 
                                     class="tc2-stop-hotel-img"
                                     onclick="tc2OpenLightbox(<?php echo esc_attr(json_encode($accom_images)); ?>, 0)">
                            <?php endif; ?>
                            <div class="tc2-stop-hotel-info">
                                <div class="tc2-stop-hotel-name"><?php echo esc_html($accom_name); ?></div>
                                <div class="tc2-stop-hotel-meta">
                                    <?php if ($accom['category']): ?>
                                        <span class="tc2-stop-hotel-stars"><?php 
                                            $cat = $accom['category'];
                                            $star_count = 0;
                                            if (preg_match('/\d/', $cat, $m)) $star_count = intval($m[0]);
                                            if ($star_count > 0) {
                                                echo str_repeat('&#9733;', $star_count);
                                            } else {
                                                echo esc_html($cat);
                                            }
                                        ?></span>
                                    <?php endif; ?>
                                    <?php if ($accom['mealPlan']): ?>
                                        <span><?php echo $icons['utensils']; ?> <?php echo esc_html($accom['mealPlan']); ?></span>
                                    <?php endif; ?>
                                </div>
                            </div>
                            <span class="tc2-stop-hotel-badge"><?php echo $accom_nights; ?> <?php echo $accom_nights == 1 ? 'nacht' : 'nachten'; ?></span>
                            <?php $hotel_panel_id = 'tc2data_hotel_' . $stop_num; ?>
                            <button type="button" class="tc2-stop-hotel-btn"
                                onclick="tc2ShowPanel('<?php echo $hotel_panel_id; ?>')">
                                Lees verder
                            </button>
                        </div>
                        <?php endif; ?>

                        <!-- CRUISE -->
                        <?php if ($accom && $accom_type === 'cruise'): ?>
                        <div class="tc2-stop-hotel">
                            <div class="tc2-stop-hotel-info">
                                <div class="tc2-stop-hotel-name"><?php echo $icons['ship']; ?> <?php echo esc_html($accom_name); ?></div>
                                <div class="tc2-stop-hotel-meta">
                                    <?php if (!empty($accom['cabinType'])): ?>
                                        <span><?php echo $icons['bed']; ?> <?php echo esc_html($accom['cabinType']); ?></span>
                                    <?php endif; ?>
                                </div>
                            </div>
                            <span class="tc2-stop-hotel-badge"><?php echo $accom_nights; ?> <?php echo $accom_nights == 1 ? 'nacht' : 'nachten'; ?></span>
                        </div>
                        <?php endif; ?>

                    </div>
                </div>
                <?php endforeach; ?>

                <!-- RETURN FLIGHT -->
                <?php if ($return_flight): ?>
                <div class="tc2-transport">
                    <div class="tc2-transport-marker"><?php echo $icons['plane']; ?></div>
                    <div class="tc2-transport-card">
                        <div class="tc2-transport-route">
                            <div class="tc2-transport-city">
                                <div class="tc2-transport-code"><?php echo esc_html($return_flight['from_code']); ?></div>
                                <div class="tc2-transport-name"><?php echo esc_html($return_flight['from']); ?></div>
                            </div>
                            <div class="tc2-transport-arrow">
                                <div class="tc2-transport-line"><span class="tc2-plane-icon"><?php echo $icons['plane']; ?></span></div>
                            </div>
                            <div class="tc2-transport-city">
                                <div class="tc2-transport-code"><?php echo esc_html($return_flight['to_code']); ?></div>
                                <div class="tc2-transport-name"><?php echo esc_html($return_flight['to']); ?></div>
                            </div>
                        </div>
                        <div class="tc2-transport-details">
                            <?php if ($return_flight['airline']): ?>
                                <div class="tc2-transport-airline"><?php echo esc_html($return_flight['airline']); ?></div>
                            <?php endif; ?>
                            <?php if ($return_flight['dep_time'] && $return_flight['arr_time']): ?>
                                <div class="tc2-transport-time"><?php echo esc_html($return_flight['dep_time']); ?> → <?php echo esc_html($return_flight['arr_time']); ?></div>
                            <?php endif; ?>
                        </div>
                    </div>
                </div>
                <?php endif; ?>

            </div>
        </section>
        <?php endif; ?>

    </div>

    <!-- RIGHT COLUMN — SIDEBAR -->
    <aside class="tc2-sidebar" id="tc2-booking-section">

        <!-- Booking Card -->
        <div class="tc2-booking">
            <?php if ($show_prices && $price > 0): ?>
            <div class="tc2-booking-header">
                <div class="tc2-booking-price">&euro;<?php echo number_format($price, 0, ',', '.'); ?></div>
                <div class="tc2-booking-price-sub">per persoon &middot; indicatieprijs</div>
            </div>
            <?php endif; ?>
            <div class="tc2-booking-body">
                <div class="tc2-example-notice">
                    <span class="tc2-example-icon"><?php echo $icons['info']; ?></span>
                    <div>
                        <strong>Dit is een voorbeeldreis</strong>
                        <span>Pas deze reis naar eigen wens aan</span>
                    </div>
                </div>

                <div class="tc2-booking-form">
                    <form id="tc2QuoteForm" onsubmit="return false;">
                        <div class="tc2-form-group">
                            <label class="tc2-form-label">Naam *</label>
                            <input type="text" class="tc2-form-input" id="tc2Name" required placeholder="Je volledige naam">
                        </div>
                        <div class="tc2-form-group">
                            <label class="tc2-form-label">E-mail *</label>
                            <input type="email" class="tc2-form-input" id="tc2Email" required placeholder="je@email.nl">
                        </div>
                        <div class="tc2-form-group">
                            <label class="tc2-form-label">Telefoon</label>
                            <input type="tel" class="tc2-form-input" id="tc2Phone" placeholder="06-12345678">
                        </div>
                        <div class="tc2-form-group">
                            <label class="tc2-form-label">Vertrekdatum</label>
                            <input type="date" class="tc2-form-input" id="tc2Date">
                        </div>
                        <div class="tc2-form-group">
                            <label class="tc2-form-label">Aantal personen</label>
                            <select class="tc2-form-input" id="tc2Persons">
                                <option value="1">1 persoon</option>
                                <option value="2" selected>2 personen</option>
                                <option value="3">3 personen</option>
                                <option value="4">4 personen</option>
                                <option value="5">5 personen</option>
                                <option value="6">6+ personen</option>
                            </select>
                        </div>
                        <div class="tc2-form-group">
                            <label class="tc2-form-label">Hotelvoorkeur</label>
                            <div class="tc2-star-options">
                                <label class="tc2-star-option">
                                    <input type="checkbox" name="tc2Stars" value="3" checked>
                                    <span class="tc2-star-label"><span class="tc2-stars-yellow">&#9733;&#9733;&#9733;</span> 3 sterren</span>
                                </label>
                                <label class="tc2-star-option">
                                    <input type="checkbox" name="tc2Stars" value="4" checked>
                                    <span class="tc2-star-label"><span class="tc2-stars-yellow">&#9733;&#9733;&#9733;&#9733;</span> 4 sterren</span>
                                </label>
                                <label class="tc2-star-option">
                                    <input type="checkbox" name="tc2Stars" value="5">
                                    <span class="tc2-star-label"><span class="tc2-stars-yellow">&#9733;&#9733;&#9733;&#9733;&#9733;</span> 5 sterren</span>
                                </label>
                            </div>
                        </div>
                        <div class="tc2-form-group">
                            <label class="tc2-form-label">Bericht</label>
                            <textarea class="tc2-form-input" id="tc2Message" rows="3" placeholder="Speciale wensen of vragen?" style="resize:vertical;"></textarea>
                        </div>
                        <div id="tc2FormResult" class="tc2-form-result"></div>
                        <button type="button" class="tc2-btn-book" onclick="tc2SubmitQuote('quote')">Offerte Aanvragen</button>
                        <button type="button" class="tc2-btn-call" onclick="tc2SubmitQuote('info')">
                            <?php echo $icons['phone']; ?> Meer informatie
                        </button>
                    </form>
                </div>
            </div>
        </div>

        <!-- Touroperator -->
        <?php if ($touroperator): ?>
        <div class="tc2-touroperator">
            <?php if (!empty($touroperator['logo'])): ?>
                <img src="<?php echo esc_url($touroperator['logo']); ?>" alt="<?php echo esc_attr($touroperator['name']); ?>" class="tc2-touroperator-logo">
            <?php endif; ?>
            <div>
                <div class="tc2-touroperator-label">Aangeboden door</div>
                <div class="tc2-touroperator-name"><?php echo esc_html($touroperator['name']); ?></div>
            </div>
        </div>
        <?php endif; ?>

        <!-- USPs -->
        <div class="tc2-usp-card">
            <div class="tc2-usp-item">
                <div class="tc2-usp-icon usp-green"><?php echo $icons['shield-check']; ?></div>
                <div class="tc2-usp-text"><strong>Reis op maat</strong>Elke reis wordt aangepast aan jouw wensen en budget</div>
            </div>
            <div class="tc2-usp-item">
                <div class="tc2-usp-icon usp-amber"><?php echo $icons['shield-check']; ?></div>
                <div class="tc2-usp-text"><strong>Veilig boeken</strong>ANVR &amp; SGR garantie voor zorgeloos reizen</div>
            </div>
            <div class="tc2-usp-item">
                <div class="tc2-usp-icon usp-purple"><?php echo $icons['message-circle']; ?></div>
                <div class="tc2-usp-text"><strong>Persoonlijk advies</strong>Onze reisspecialisten kennen de bestemming</div>
            </div>
        </div>
    </aside>
</div>

<!-- DETAIL PANEL (sliding) -->
<div class="tc2-panel-overlay" id="tc2PanelOverlay" onclick="tc2ClosePanel()"></div>
<div class="tc2-panel" id="tc2Panel">
    <div class="tc2-panel-header">
        <div class="tc2-panel-title" id="tc2PanelTitle"></div>
        <button type="button" class="tc2-panel-close" onclick="tc2ClosePanel()"><?php echo $icons['x']; ?></button>
    </div>
    <div class="tc2-panel-body" id="tc2PanelBody"></div>
</div>

<!-- PHOTO LIGHTBOX -->
<div class="tc2-lightbox" id="tc2Lightbox">
    <button type="button" class="tc2-lightbox-btn tc2-lightbox-close" onclick="tc2CloseLightbox()"><?php echo $icons['x']; ?></button>
    <button type="button" class="tc2-lightbox-btn tc2-lightbox-prev" onclick="tc2PrevPhoto()"><?php echo $icons['chevron-left']; ?></button>
    <button type="button" class="tc2-lightbox-btn tc2-lightbox-next" onclick="tc2NextPhoto()"><?php echo $icons['chevron-right']; ?></button>
    <img id="tc2LightboxImg" src="" alt="">
    <div class="tc2-lightbox-counter" id="tc2LightboxCounter"></div>
</div>

</div><!-- .tc2-detail -->

<!-- ============================================
     JAVASCRIPT
     ============================================ -->
<script>
(function() {
    var mapDests = <?php echo json_encode($map_destinations, JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT | JSON_UNESCAPED_SLASHES); ?>;
    var primaryColor = '<?php echo esc_js($primary_color); ?>';
    var panelData = <?php echo json_encode($panel_data, JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT | JSON_UNESCAPED_SLASHES); ?>;

    // ============================================
    // HERO SLIDESHOW
    // ============================================
    var heroSlides = document.querySelectorAll('.tc2-hero-slide');
    var heroDots = document.querySelectorAll('.tc2-hero-dot');
    var heroIdx = 0;

    function heroGo(n) {
        if (heroSlides.length <= 1) return;
        heroSlides[heroIdx] && heroSlides[heroIdx].classList.remove('active');
        heroDots[heroIdx] && heroDots[heroIdx].classList.remove('active');
        heroIdx = n % heroSlides.length;
        heroSlides[heroIdx] && heroSlides[heroIdx].classList.add('active');
        heroDots[heroIdx] && heroDots[heroIdx].classList.add('active');
    }

    if (heroSlides.length > 1) {
        setInterval(function() { heroGo(heroIdx + 1); }, 5000);
        heroDots.forEach(function(dot) {
            dot.addEventListener('click', function() { heroGo(parseInt(this.dataset.index)); });
        });
    }

    // ============================================
    // ROUTE MAP (Leaflet)
    // ============================================
    function initRouteMap() {
        var el = document.getElementById('tc2RouteMap');
        console.log('[TC2 Map] init', { el: !!el, dests: mapDests ? mapDests.length : 0, leaflet: typeof L });
        if (!el || !mapDests || mapDests.length < 2 || typeof L === 'undefined') {
            console.log('[TC2 Map] skipped — missing element, data, or Leaflet');
            return;
        }

        try {
            var map = L.map('tc2RouteMap', { scrollWheelZoom: false });
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                maxZoom: 18, attribution: '&copy; OpenStreetMap'
            }).addTo(map);

            var bounds = [];
            mapDests.forEach(function(d, i) {
                if (!d.lat || !d.lng) return;
                bounds.push([d.lat, d.lng]);

                var icon = L.divIcon({
                    className: 'tc2-route-marker',
                    html: '<div style="background:' + primaryColor + ';color:white;width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:bold;font-size:12px;border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3);">' + (i + 1) + '</div>',
                    iconSize: [28, 28], iconAnchor: [14, 14]
                });
                var marker = L.marker([d.lat, d.lng], { icon: icon }).addTo(map);
                marker.bindTooltip((i + 1) + '. ' + (d.name || ''), { permanent: true, direction: 'top', offset: [0, -12], className: 'tc2-map-label' });
            });

            if (bounds.length > 1) {
                L.polyline(bounds, { color: primaryColor, weight: 3, opacity: 0.6, dashArray: '8,8' }).addTo(map);
            }
            if (bounds.length > 0) {
                map.fitBounds(bounds, { padding: [40, 40] });
            }

            // Force re-render after layout settles (fixes grey tiles)
            setTimeout(function() { map.invalidateSize(); }, 300);
            setTimeout(function() { map.invalidateSize(); }, 1000);
            console.log('[TC2 Map] initialized with', bounds.length, 'markers');
        } catch(e) {
            console.error('[TC2 Map] Error:', e);
        }
    }

    // ============================================
    // DETAIL PANEL (sliding)
    // ============================================
    var panelMapInstance = null;

    window.tc2ShowPanel = function(dataId) {
        var data = panelData[dataId];
        if (!data) { console.error('[TC2 Panel] No data for:', dataId); return; }
        var title = data.name || 'Details';
        var html = '';

        // Gallery
        var images = data.images || [];
        if (images.length > 0) {
            html += '<div class="tc2-panel-gallery">';
            images.slice(0, 5).forEach(function(img, idx) {
                if (img) {
                    html += '<img src="' + img + '" alt="" onclick="tc2OpenLightbox(' + JSON.stringify(images).replace(/"/g, '&quot;') + ', ' + idx + ')">';
                }
            });
            html += '</div>';
        }

        // Description
        if (data.description) {
            html += '<div class="tc2-panel-section"><h3>' + panelIcon('info') + ' Beschrijving</h3><p>' + data.description + '</p></div>';
        }

        // Info rows
        html += '<div class="tc2-panel-section"><div class="tc2-panel-info">';
        if (data.country) html += infoRow('globe', 'Land', data.country);
        if (data.nights) html += infoRow('moon', 'Nachten', data.nights);
        if (data.category) html += infoRow('star', 'Categorie', data.category);
        if (data.mealPlan) html += infoRow('utensils', 'Maaltijden', data.mealPlan);
        if (data.address) html += infoRow('map-pin', 'Adres', data.address);
        html += '</div></div>';

        // Facilities
        if (data.facilities && data.facilities.length > 0) {
            html += '<div class="tc2-panel-section"><h3>' + panelIcon('shield-check') + ' Faciliteiten</h3><div class="tc2-panel-facilities">';
            data.facilities.forEach(function(f) {
                html += '<span class="tc2-panel-facility">' + f + '</span>';
            });
            html += '</div></div>';
        }

        // Map placeholder
        if (data.geolocation && data.geolocation.latitude && data.geolocation.longitude) {
            html += '<div class="tc2-panel-section"><h3>' + panelIcon('map-pin') + ' Locatie</h3><div class="tc2-panel-map" id="tc2PanelMap"></div></div>';
        }

        document.getElementById('tc2PanelTitle').textContent = title;
        document.getElementById('tc2PanelBody').innerHTML = html;
        document.getElementById('tc2PanelOverlay').style.display = 'block';
        setTimeout(function() {
            document.getElementById('tc2PanelOverlay').classList.add('active');
            document.getElementById('tc2Panel').classList.add('active');

            // Init map
            if (data.geolocation && data.geolocation.latitude && data.geolocation.longitude && typeof L !== 'undefined') {
                setTimeout(function() {
                    if (panelMapInstance) { panelMapInstance.remove(); panelMapInstance = null; }
                    var lat = parseFloat(data.geolocation.latitude);
                    var lng = parseFloat(data.geolocation.longitude);
                    panelMapInstance = L.map('tc2PanelMap').setView([lat, lng], 13);
                    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 18 }).addTo(panelMapInstance);
                    L.marker([lat, lng]).addTo(panelMapInstance).bindPopup(data.name || 'Locatie').openPopup();
                }, 150);
            }
        }, 10);
        document.body.style.overflow = 'hidden';
    };

    window.tc2ClosePanel = function() {
        document.getElementById('tc2PanelOverlay').classList.remove('active');
        document.getElementById('tc2Panel').classList.remove('active');
        setTimeout(function() {
            document.getElementById('tc2PanelOverlay').style.display = 'none';
            if (panelMapInstance) { panelMapInstance.remove(); panelMapInstance = null; }
        }, 350);
        document.body.style.overflow = '';
    };

    function panelIcon(name) {
        var iconMap = {
            'info': '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>',
            'globe': '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/></svg>',
            'moon': '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>',
            'star': '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="1"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>',
            'utensils': '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/><path d="M7 2v20"/><path d="M21 15V2v0a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7"/></svg>',
            'map-pin': '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>',
            'shield-check': '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10"/><path d="m9 12 2 2 4-4"/></svg>',
        };
        return iconMap[name] || '';
    }

    function infoRow(icon, label, value) {
        return '<div class="tc2-panel-info-row">' + panelIcon(icon) + '<span class="tc2-panel-info-label">' + label + '</span><span class="tc2-panel-info-value">' + value + '</span></div>';
    }

    // ============================================
    // PHOTO LIGHTBOX
    // ============================================
    var lbImages = [];
    var lbIdx = 0;

    window.tc2OpenLightbox = function(images, startIdx) {
        lbImages = images;
        lbIdx = startIdx || 0;
        showLbPhoto();
        document.getElementById('tc2Lightbox').classList.add('active');
        document.body.style.overflow = 'hidden';
    };

    window.tc2CloseLightbox = function() {
        document.getElementById('tc2Lightbox').classList.remove('active');
        document.body.style.overflow = '';
    };

    window.tc2NextPhoto = function() {
        lbIdx = (lbIdx + 1) % lbImages.length;
        showLbPhoto();
    };

    window.tc2PrevPhoto = function() {
        lbIdx = (lbIdx - 1 + lbImages.length) % lbImages.length;
        showLbPhoto();
    };

    function showLbPhoto() {
        document.getElementById('tc2LightboxImg').src = lbImages[lbIdx];
        document.getElementById('tc2LightboxCounter').textContent = (lbIdx + 1) + ' / ' + lbImages.length;
    }

    // Keyboard navigation
    document.addEventListener('keydown', function(e) {
        if (!document.getElementById('tc2Lightbox').classList.contains('active')) return;
        if (e.key === 'Escape') tc2CloseLightbox();
        if (e.key === 'ArrowRight') tc2NextPhoto();
        if (e.key === 'ArrowLeft') tc2PrevPhoto();
    });

    // Close panel on Escape
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && document.getElementById('tc2Panel').classList.contains('active')) {
            tc2ClosePanel();
        }
    });

    // ============================================
    // QUOTE FORM
    // ============================================
    window.tc2SubmitQuote = function(type) {
        var name = document.getElementById('tc2Name').value.trim();
        var email = document.getElementById('tc2Email').value.trim();
        var phone = document.getElementById('tc2Phone').value.trim();
        var date = document.getElementById('tc2Date').value;
        var persons = document.getElementById('tc2Persons').value;
        var message = document.getElementById('tc2Message').value.trim();
        var result = document.getElementById('tc2FormResult');

        // Collect star preferences
        var starBoxes = document.querySelectorAll('input[name="tc2Stars"]:checked');
        var stars = [];
        starBoxes.forEach(function(cb) { stars.push(cb.value); });

        if (!name || !email) {
            result.className = 'tc2-form-result error';
            result.textContent = 'Vul je naam en e-mailadres in.';
            return;
        }

        result.className = 'tc2-form-result success';
        result.textContent = type === 'quote' 
            ? 'Bedankt! Je offerte-aanvraag is verzonden. We nemen zo snel mogelijk contact op.'
            : 'Bedankt! Je informatie-aanvraag is verzonden.';

        // TODO: Send to backend via AJAX
        console.log('[TravelC Quote]', { type: type, name: name, email: email, phone: phone, date: date, persons: persons, stars: stars.join(','), message: message, travel: '<?php echo esc_js($title); ?>' });
    };

    // ============================================
    // INIT — wait for Leaflet to be available
    // ============================================
    function init() {
        initRouteMap();
    }

    function waitForLeaflet(callback, maxWait) {
        var waited = 0;
        var interval = setInterval(function() {
            waited += 100;
            if (typeof L !== 'undefined') {
                clearInterval(interval);
                callback();
            } else if (waited >= (maxWait || 5000)) {
                clearInterval(interval);
            }
        }, 100);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() {
            waitForLeaflet(init);
        });
    } else {
        waitForLeaflet(init);
    }
})();
</script>
