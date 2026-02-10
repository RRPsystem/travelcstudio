<?php
/**
 * Template: Travel Detail Page - RBS Design with TravelC API
 * Version: 2.2.0
 * 
 * API Structure:
 * - destinations: array with name, images, country, geolocation (NO day info)
 * - hotels: array with name, nights, images, facilities
 * - transports: array with day, segment info (flights)
 * - car_rentals: array with pickupDay, dropoffDay
 */

if (!defined('ABSPATH')) exit;

// Extract basic info
$title = $travel['title'] ?? '';
$description = $travel['description'] ?? '';
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
$primary_color = '#4a6cf7';

// Touroperator info
$source_microsite = $travel['source_microsite'] ?? '';
$touroperator = travelc_get_touroperator_info($source_microsite);

// Get main image
$main_image = '';
if (!empty($destinations[0]['images'][0])) {
    $main_image = $destinations[0]['images'][0];
}

// Collect all images for slideshow from destinations and hotels (cruises have no images)
$all_images = [];
foreach ($destinations as $dest) {
    $dest_imgs = $dest['images'] ?? [];
    foreach ($dest_imgs as $img) {
        $all_images[] = $img;
    }
}
foreach ($hotels as $hotel) {
    $hotel_imgs = $hotel['images'] ?? [];
    foreach ($hotel_imgs as $img) {
        $all_images[] = $img;
    }
}
$all_images = array_slice(array_unique(array_filter($all_images)), 0, 8);

// Get location
$location = '';
if (!empty($destinations)) {
    $dest_names = array_map(function($d) { return $d['name'] ?? ''; }, $destinations);
    $location = implode(', ', array_slice(array_filter($dest_names), 0, 3));
}

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

// Build itinerary timeline with day ranges for hotels
$timeline = [];
$hotel_ranges = []; // Track which days each hotel covers

// Add transports - distinguish between flights and transfers (DayTrip)
foreach ($transports as $transport) {
    $day = intval($transport['day'] ?? 0);
    if ($day > 0) {
        if (!isset($timeline[$day])) {
            $timeline[$day] = [];
        }
        
        $segment = $transport['segment'][0] ?? [];
        $from = $segment['departureAirportName'] ?? $transport['originCode'] ?? '';
        $to = $segment['arrivalAirportName'] ?? $transport['targetCode'] ?? '';
        $airline = $transport['company'] ?? '';
        $flight_num = $transport['transportNumber'] ?? '';
        $dep_time = substr($transport['departureTime'] ?? '', 0, 5);
        $arr_time = substr($transport['arrivalTime'] ?? '', 0, 5);
        
        // Check if this is a DayTrip transfer (company contains "DayTrip" or transportType is transfer)
        $is_transfer = (stripos($airline, 'daytrip') !== false) || 
                       (isset($transport['transportType']) && strtolower($transport['transportType']) === 'transfer');
        
        $timeline[$day][] = [
            'type' => $is_transfer ? 'transfer' : 'flight',
            'from' => $from,
            'to' => $to,
            'airline' => $airline,
            'flight_number' => $flight_num,
            'departure_time' => $dep_time,
            'arrival_time' => $arr_time,
            'sort_order' => 1 // Transports come first
        ];
    }
}

// Build combined accommodation timeline (cruises + hotels in order)
$current_day = 1;

// Add cruises first (they come before hotels in the itinerary)
foreach ($cruises as $cruise_index => $cruise) {
    $cruise_nights = intval($cruise['nights'] ?? 1);
    $start_day = $current_day;
    $end_day = $current_day + $cruise_nights - 1;
    
    if ($start_day <= $days) {
        if (!isset($timeline[$start_day])) {
            $timeline[$start_day] = [];
        }
        
        // Build cruise name from available data
        $cruise_line = $cruise['cruiseLine'] ?? '';
        $ship_id = $cruise['shipId'] ?? '';
        $cruise_name = $cruise_line . ' - ' . $ship_id;
        if (empty(trim($cruise_name, ' -'))) {
            $cruise_name = 'Cruise';
        }
        
        $timeline[$start_day][] = [
            'type' => 'cruise',
            'name' => $cruise_name,
            'nights' => $cruise_nights,
            'start_day' => $start_day,
            'end_day' => $end_day,
            'images' => [],
            'description' => '',
            'cabinType' => $cruise['selectedCategory'] ?? $cruise['group'] ?? '',
            'cabin' => $cruise['cabin'] ?? '',
            'stars' => $cruise['stars'] ?? '',
            'departure' => $cruise['departure'] ?? '',
            'arrival' => $cruise['arrival'] ?? '',
            'sort_order' => 3
        ];
    }
    
    $current_day += $cruise_nights;
}

// Then add hotels
foreach ($hotels as $hotel_index => $hotel) {
    $hotel_nights = intval($hotel['nights'] ?? 1);
    $start_day = $current_day;
    $end_day = $current_day + $hotel_nights - 1;
    
    if ($start_day <= $days) {
        if (!isset($timeline[$start_day])) {
            $timeline[$start_day] = [];
        }
        
        $hotel_ranges[$hotel_index] = ['start' => $start_day, 'end' => $end_day];
        
        $timeline[$start_day][] = [
            'type' => 'hotel',
            'name' => $hotel['name'] ?? '',
            'nights' => $hotel_nights,
            'start_day' => $start_day,
            'end_day' => $end_day,
            'images' => $hotel['images'] ?? [],
            'address' => $hotel['address'] ?? '',
            'category' => $hotel['category'] ?? '',
            'mealPlan' => $hotel['mealPlan'] ?? '',
            'description' => $hotel['description'] ?? '',
            'facilities' => $hotel['facilities'] ?? [],
            'geolocation' => $hotel['geolocation'] ?? null,
            'sort_order' => 3
        ];
    }
    
    $current_day += $hotel_nights;
}

// Add destinations to timeline - match by order to accommodations (cruises + hotels)
// Remove duplicate destinations first
$unique_destinations = [];
$seen_dest_names = [];
foreach ($destinations as $dest) {
    $dest_name = $dest['name'] ?? '';
    if ($dest_name && !in_array($dest_name, $seen_dest_names)) {
        $unique_destinations[] = $dest;
        $seen_dest_names[] = $dest_name;
    }
}

// Track accommodation days (cruises + hotels combined)
$accom_day_tracker = 1;
$accom_index = 0;

// Add destinations for cruises
foreach ($cruises as $cruise_index => $cruise) {
    $cruise_nights = intval($cruise['nights'] ?? 1);
    $cruise_start = $accom_day_tracker;
    
    if (isset($unique_destinations[$accom_index])) {
        $dest = $unique_destinations[$accom_index];
        
        if (!isset($timeline[$cruise_start])) {
            $timeline[$cruise_start] = [];
        }
        
        array_unshift($timeline[$cruise_start], [
            'type' => 'destination',
            'name' => $dest['name'] ?? '',
            'country' => $dest['country'] ?? '',
            'images' => $dest['images'] ?? [],
            'description' => $dest['description'] ?? '',
            'geolocation' => $dest['geolocation'] ?? null,
            'sort_order' => 2
        ]);
    }
    
    $accom_day_tracker += $cruise_nights;
    $accom_index++;
}

// Add destinations for hotels
foreach ($hotels as $hotel_index => $hotel) {
    $hotel_nights = intval($hotel['nights'] ?? 1);
    $hotel_start = $accom_day_tracker;
    
    if (isset($unique_destinations[$accom_index])) {
        $dest = $unique_destinations[$accom_index];
        
        if (!isset($timeline[$hotel_start])) {
            $timeline[$hotel_start] = [];
        }
        
        array_unshift($timeline[$hotel_start], [
            'type' => 'destination',
            'name' => $dest['name'] ?? '',
            'country' => $dest['country'] ?? '',
            'images' => $dest['images'] ?? [],
            'description' => $dest['description'] ?? '',
            'geolocation' => $dest['geolocation'] ?? null,
            'sort_order' => 2
        ]);
    }
    
    $accom_day_tracker += $hotel_nights;
    $accom_index++;
}

// Add car rental
if (!empty($car_rentals[0])) {
    $car = $car_rentals[0];
    $pickup_day = intval($car['pickupDay'] ?? 1);
    $dropoff_day = intval($car['dropoffDay'] ?? $days);
    
    if (!isset($timeline[$pickup_day])) {
        $timeline[$pickup_day] = [];
    }
    
    $timeline[$pickup_day][] = [
        'type' => 'car_rental',
        'product' => $car['product'] ?? 'Huurauto',
        'pickup_location' => $car['pickupLocation'] ?? '',
        'dropoff_location' => $car['dropoffLocation'] ?? '',
        'pickup_time' => substr($car['pickupTime'] ?? '', 0, 5),
        'dropoff_day' => $dropoff_day,
        'image' => $car['imageUrl'] ?? '',
        'sort_order' => 2.5 // Car rental between destination and hotel
    ];
}

// Sort timeline by day, then by sort_order within each day
ksort($timeline);
foreach ($timeline as $day => &$items) {
    usort($items, function($a, $b) {
        $order_a = $a['sort_order'] ?? 99;
        $order_b = $b['sort_order'] ?? 99;
        return $order_a <=> $order_b;
    });
}
unset($items);
?>

<style>
/* CSS VARIABLES */
:root {
    --tc-primary: <?php echo esc_attr($primary_color); ?>;
    --tc-text: #374151;
    --tc-text-light: #6b7280;
    --tc-bg: #f9fafb;
    --tc-white: #ffffff;
    --tc-border: #e5e7eb;
    --tc-radius: 12px;
}

/* Reset WordPress theme spacing to allow hero at top - EXACT RBS APPROACH */
body {
    margin: 0 !important;
    padding: 0 !important;
}

#content,
.site-content,
.content-area,
main,
article {
    margin-top: 0 !important;
    padding-top: 0 !important;
    max-width: none !important;
    width: 100% !important;
}

/* CONTAINER - Force full width */
.travelc-detail {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    width: 100vw !important;
    max-width: 100vw !important;
    margin-left: calc(-50vw + 50%) !important;
    margin-right: calc(-50vw + 50%) !important;
    position: relative;
    left: 0;
    right: 0;
}

/* HERO - EXACT RBS SLIDESHOW STYLE */
.tc-hero-slideshow {
    width: 100%;
    height: 500px;
    position: relative;
    overflow: hidden;
    background: #f0f0f0;
}

.tc-hero-slideshow .slide {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    opacity: 0;
    transition: opacity 1s ease-in-out;
    display: flex;
    align-items: center;
    justify-content: center;
}

.tc-hero-slideshow .slide.active {
    opacity: 1;
}

.tc-hero-slideshow .slide img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    object-position: center;
}

.tc-hero-slideshow .slide-nav {
    position: absolute;
    bottom: 25px;
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    gap: 10px;
    z-index: 10;
}

.tc-hero-slideshow .slide-dot {
    width: 12px;
    height: 12px;
    border-radius: 50%;
    background: rgba(255,255,255,0.5);
    cursor: pointer;
    border: none;
    transition: all 0.3s ease;
}

.tc-hero-slideshow .slide-dot.active {
    background: white;
    transform: scale(1.2);
}

@media (max-width: 768px) {
    .tc-hero, .tc-hero-slideshow { height: 300px; }
}

/* TITLE BAR */
.tc-title-bar {
    background: white;
    padding: 25px 0;
    border-bottom: 1px solid var(--tc-border);
    box-shadow: 0 2px 10px rgba(0,0,0,0.05);
}

.tc-title-container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 0 20px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: 20px;
}

.tc-title-left h1 {
    font-size: 28px;
    font-weight: 700;
    margin: 0 0 8px 0;
    color: var(--tc-text);
}

.tc-title-location {
    color: #999;
    font-size: 14px;
}

.tc-title-right {
    display: flex;
    gap: 30px;
    align-items: center;
}

.tc-stat {
    text-align: center;
}

.tc-stat-value {
    font-size: 28px;
    font-weight: 700;
    color: var(--tc-primary);
}

.tc-stat-label {
    font-size: 13px;
    color: var(--tc-text-light);
}

.tc-stat.days .tc-stat-value {
    color: var(--tc-text);
}

.tc-route-btn {
    width: 44px;
    height: 44px;
    border-radius: 999px;
    border: 1px solid var(--tc-primary);
    background: var(--tc-primary);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    padding: 0;
    transition: transform 0.15s ease;
}

.tc-route-btn:hover {
    transform: translateY(-2px);
}

.tc-route-btn svg {
    width: 22px;
    height: 22px;
    fill: none;
    stroke: #ffffff;
    stroke-width: 2;
    stroke-linecap: round;
    stroke-linejoin: round;
}

@media (max-width: 768px) {
    .tc-title-container { flex-direction: column; align-items: flex-start; }
    .tc-title-left h1 { font-size: 22px; }
}

/* MAIN LAYOUT */
.tc-container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 30px 20px;
    display: flex;
    gap: 30px;
    align-items: flex-start;
}

.tc-main {
    flex: 1;
    min-width: 0;
}

.tc-sidebar {
    width: 350px;
    flex-shrink: 0;
}

.tc-sidebar-inner {
    position: sticky;
    top: 20px;
}

@media (max-width: 900px) {
    .tc-container { flex-direction: column; }
    .tc-sidebar { width: 100%; order: -1; }
    .tc-sidebar-inner { position: relative; top: 0; }
}

/* INTRO */
.tc-intro {
    margin-bottom: 30px;
}

.tc-intro h2 {
    font-size: 28px;
    font-weight: 700;
    color: var(--tc-text);
    margin: 0 0 15px 0;
}

.tc-intro-text {
    color: var(--tc-text);
    line-height: 1.7;
}

/* BOOKING CARD */
.tc-booking-card {
    background: var(--tc-white);
    border: 1px solid var(--tc-border);
    border-radius: var(--tc-radius);
    padding: 25px;
    margin-bottom: 20px;
}

.tc-booking-card h3 {
    font-size: 20px;
    font-weight: 700;
    margin: 0 0 20px 0;
    color: var(--tc-text);
}

.tc-form-group {
    margin-bottom: 15px;
}

.tc-form-label {
    display: block;
    font-size: 14px;
    font-weight: 500;
    color: var(--tc-text);
    margin-bottom: 6px;
}

.tc-form-input {
    width: 100%;
    padding: 12px;
    border: 1px solid var(--tc-border);
    border-radius: 8px;
    font-size: 14px;
}

.tc-btn-primary {
    width: 100%;
    padding: 14px;
    background: var(--tc-primary);
    color: white;
    border: none;
    border-radius: 8px;
    font-size: 16px;
    font-weight: 600;
    cursor: pointer;
    margin-bottom: 10px;
    transition: opacity 0.2s;
}

.tc-btn-primary:hover {
    opacity: 0.9;
}

.tc-btn-secondary {
    width: 100%;
    padding: 12px;
    background: transparent;
    color: var(--tc-text);
    border: 1px solid var(--tc-border);
    border-radius: 8px;
    font-size: 14px;
    cursor: pointer;
    margin-bottom: 8px;
}

.tc-btn-secondary:hover {
    background: var(--tc-bg);
}

/* TOUR PLAN */
.tc-tour-plan h2 {
    font-size: 28px;
    font-weight: 700;
    color: var(--tc-text);
    margin: 0 0 20px 0;
}

.tc-day-card {
    background: #fff;
    border-radius: 16px;
    box-shadow: 0 10px 30px rgba(16,24,40,0.08);
    margin-bottom: 28px;
    overflow: hidden;
    border: 1px solid #eef2f7;
    border-top: 3px solid var(--tc-primary);
}

.tc-day-header {
    background: #ffffff;
    color: #111827;
    padding: 16px 20px;
    font-weight: 700;
    font-size: 15px;
    border-bottom: 1px solid #eef2f7;
}

.tc-day-content {
    padding: 16px;
}

.tc-day-item {
    background: #ffffff;
    border-radius: 14px;
    margin-bottom: 15px;
    overflow: hidden;
    border: 1px solid #eef2f7;
    transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.tc-day-item:last-child {
    margin-bottom: 0;
}

.tc-day-item:hover {
    transform: translateY(-2px);
    box-shadow: 0 12px 30px rgba(16,24,40,0.12);
}

.tc-day-item-image {
    width: 100%;
    height: 220px;
    object-fit: cover;
    object-position: center;
}

.tc-day-item-body {
    padding: 15px;
}

.tc-day-item-title {
    font-size: 16px;
    font-weight: 600;
    color: #1f2937;
    margin-bottom: 8px;
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 8px;
}

.tc-type-badge {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 5px 10px;
    border-radius: 6px;
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    background: #f3f4f6;
    color: #374151;
    border: 1px solid #e5e7eb;
}

.tc-day-item-desc {
    color: #6b7280;
    font-size: 14px;
    line-height: 1.5;
    margin-bottom: 12px;
}

.tc-day-item-meta {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-bottom: 12px;
}

.tc-meta-item {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    font-size: 12px;
    color: #6b7280;
    background: #f3f4f6;
    padding: 4px 10px;
    border-radius: 6px;
}

.tc-btn-details {
    display: inline-block;
    padding: 10px 20px;
    background: var(--tc-primary);
    color: white;
    border: none;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    transition: opacity 0.2s;
}

.tc-btn-details:hover {
    opacity: 0.9;
}

/* ROUTE MAP PANEL */
.tc-route-overlay {
    display: none;
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0,0,0,0.6);
    z-index: 99998;
    opacity: 0;
    transition: opacity 0.3s;
}

.tc-route-overlay.active {
    opacity: 1;
}

.tc-route-panel {
    position: fixed;
    top: 0;
    right: -100%;
    width: 80vw;
    max-width: 900px;
    height: 100vh;
    background: var(--tc-white);
    z-index: 99999;
    box-shadow: -10px 0 40px rgba(0,0,0,0.3);
    transition: right 0.4s ease;
    display: flex;
    flex-direction: column;
}

.tc-route-panel.active {
    right: 0;
}

.tc-route-panel-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 15px 20px;
    background: var(--tc-primary);
    color: white;
    flex-shrink: 0;
}

.tc-route-panel-header h3 {
    margin: 0;
    font-size: 20px;
    font-weight: 600;
}

.tc-route-panel-close {
    background: rgba(255,255,255,0.2);
    border: none;
    color: white;
    font-size: 24px;
    padding: 5px 12px;
    border-radius: 4px;
    cursor: pointer;
}

.tc-route-panel-body {
    flex: 1;
    position: relative;
    min-height: 0;
    overflow: hidden;
}

#tcRouteMap {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    width: 100% !important;
    height: 100% !important;
}

.tc-route-legend {
    position: absolute;
    bottom: 20px;
    left: 20px;
    background: white;
    padding: 12px 16px;
    border-radius: 8px;
    box-shadow: 0 2px 10px rgba(0,0,0,0.15);
    z-index: 1000;
    font-size: 13px;
}

.tc-legend-item {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 6px;
}

.tc-legend-item:last-child {
    margin-bottom: 0;
}

.tc-legend-dot {
    width: 12px;
    height: 12px;
    border-radius: 50%;
    background: var(--tc-primary);
    border: 2px solid white;
    box-shadow: 0 1px 3px rgba(0,0,0,0.3);
}

.tc-legend-line {
    width: 20px;
    height: 3px;
    background: var(--tc-primary);
    border-radius: 2px;
}

/* DETAIL PANEL */
.tc-detail-overlay {
    display: none;
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0,0,0,0.5);
    z-index: 99998;
    opacity: 0;
    transition: opacity 0.3s;
}

.tc-detail-overlay.active {
    opacity: 1;
}

.tc-detail-panel {
    position: fixed;
    top: 0;
    right: -100%;
    width: 500px;
    max-width: 90vw;
    height: 100vh;
    background: var(--tc-white);
    z-index: 99999;
    box-shadow: -5px 0 30px rgba(0,0,0,0.2);
    transition: right 0.3s ease;
    display: flex;
    flex-direction: column;
}

.tc-detail-panel.active {
    right: 0;
}

.tc-detail-panel-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 20px;
    border-bottom: 1px solid var(--tc-border);
    flex-shrink: 0;
}

.tc-detail-panel-title {
    font-size: 18px;
    font-weight: 700;
    color: var(--tc-text);
}

.tc-detail-panel-close {
    background: none;
    border: none;
    font-size: 28px;
    color: var(--tc-text-light);
    cursor: pointer;
    padding: 0 5px;
}

.tc-detail-panel-body {
    flex: 1;
    overflow-y: auto;
    padding: 20px;
}

.tc-detail-section {
    margin-bottom: 20px;
}

.tc-detail-section h3 {
    font-size: 16px;
    font-weight: 600;
    color: var(--tc-text);
    margin: 0 0 10px 0;
}

.tc-detail-gallery {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 8px;
    margin-bottom: 15px;
}

.tc-detail-gallery img {
    width: 100%;
    height: 80px;
    object-fit: cover;
    border-radius: 6px;
    cursor: pointer;
}

.tc-info-items {
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.tc-info-row {
    padding: 8px 0;
    border-bottom: 1px solid #eee;
}

.tc-info-label {
    font-weight: 600;
    color: var(--tc-text);
}
</style>

<!-- MAIN WRAPPER -->
<div class="travelc-detail">

<!-- HERO SECTION -->
<?php if (count($all_images) >= 2): ?>
    <div class="tc-hero tc-hero-slideshow" id="tcHeroSlideshow">
        <?php foreach (array_slice($all_images, 0, 5) as $index => $img): ?>
            <div class="slide <?php echo $index === 0 ? 'active' : ''; ?>">
                <img src="<?php echo esc_url($img); ?>" alt="<?php echo esc_attr($title); ?>">
            </div>
        <?php endforeach; ?>
        <div class="slide-nav">
            <?php foreach (array_slice($all_images, 0, 5) as $index => $img): ?>
                <button type="button" class="slide-dot <?php echo $index === 0 ? 'active' : ''; ?>" data-index="<?php echo $index; ?>"></button>
            <?php endforeach; ?>
        </div>
    </div>
<?php elseif (!empty($main_image)): ?>
    <div class="tc-hero">
        <img src="<?php echo esc_url($main_image); ?>" alt="<?php echo esc_attr($title); ?>">
    </div>
<?php endif; ?>

<!-- TITLE BAR -->
<div class="tc-title-bar">
    <div class="tc-title-container">
        <div class="tc-title-left">
            <h1><?php echo esc_html($title); ?></h1>
            <?php if ($location): ?>
                <div class="tc-title-location">📍 <?php echo esc_html($location); ?></div>
            <?php endif; ?>
        </div>
        <div class="tc-title-right">
            <?php if ($show_prices && $price > 0): ?>
            <div class="tc-stat">
                <div class="tc-stat-value">€<?php echo number_format($price, 0, ',', '.'); ?></div>
                <div class="tc-stat-label">per persoon</div>
            </div>
            <?php endif; ?>
            <div class="tc-stat days">
                <div class="tc-stat-value"><?php echo $days; ?></div>
                <div class="tc-stat-label">dagen</div>
            </div>
            <?php if (count($map_destinations) >= 2): ?>
                <button type="button" class="tc-route-btn" onclick="tcOpenRouteMap()" title="Bekijk de route">
                    <svg viewBox="0 0 24 24"><path d="M6 18l-2 2V4l2-2 6 2 6-2 2 2v16l-2 2-6-2-6 2Z"/><path d="M12 4v16"/><path d="M18 4v16"/></svg>
                </button>
            <?php endif; ?>
        </div>
    </div>
</div>

<!-- MAIN CONTENT -->
<div class="tc-container">
    <!-- LEFT: Main Content -->
    <div class="tc-main">
        <!-- Intro -->
        <section class="tc-intro">
            <h2>Ontdek deze Reis</h2>
            <div class="tc-intro-text">
                <?php if ($description): ?>
                    <?php echo wp_kses_post($description); ?>
                <?php endif; ?>
            </div>
        </section>
        
        <!-- Tour Plan / Reisschema -->
        <section class="tc-tour-plan">
            <h2>Reisschema</h2>
            
            <?php if (empty($timeline)): ?>
                <p style="color: #6b7280; font-style: italic;">Geen reisschema beschikbaar.</p>
            <?php else: ?>
                <?php foreach ($timeline as $day_num => $items): 
                    // Check if this day has a hotel with a range
                    $day_label = "Dag $day_num";
                    foreach ($items as $item) {
                        if ($item['type'] === 'hotel' && isset($item['start_day']) && isset($item['end_day'])) {
                            if ($item['start_day'] != $item['end_day']) {
                                $day_label = "Dag {$item['start_day']}-{$item['end_day']}";
                            }
                            break;
                        }
                    }
                ?>
                    <div class="tc-day-card">
                        <div class="tc-day-header"><?php echo $day_label; ?></div>
                        <div class="tc-day-content">
                            <?php foreach ($items as $item): 
                                $type = $item['type'];
                            ?>
                            
                            <?php if ($type === 'destination'): ?>
                                <div class="tc-day-item">
                                    <?php if (!empty($item['images'][0])): ?>
                                        <img src="<?php echo esc_url($item['images'][0]); ?>" 
                                             alt="<?php echo esc_attr($item['name']); ?>" 
                                             class="tc-day-item-image"
                                             onclick="tcOpenPhotoSlideshow(<?php echo esc_attr(json_encode($item['images'])); ?>, 0)"
                                             style="cursor: pointer;">
                                    <?php endif; ?>
                                    
                                    <div class="tc-day-item-body">
                                        <div class="tc-day-item-title">
                                            <span class="tc-type-badge">📍 BESTEMMING</span>
                                            <?php echo esc_html($item['name']); ?>
                                        </div>
                                        
                                        <?php 
                                        $desc = $item['description'] ?? '';
                                        if (strlen($desc) > 150) {
                                            $desc = substr($desc, 0, 150) . '...';
                                        }
                                        if ($desc): 
                                        ?>
                                            <div class="tc-day-item-desc"><?php echo wp_kses_post($desc); ?></div>
                                        <?php endif; ?>
                                        
                                        <div class="tc-day-item-meta">
                                            <?php if ($item['country']): ?>
                                                <span class="tc-meta-item">🌍 <?php echo esc_html($item['country']); ?></span>
                                            <?php endif; ?>
                                        </div>
                                        
                                        <?php if (!empty($item['images']) && count($item['images']) > 1): ?>
                                            <button type="button" class="tc-btn-details" 
                                                onclick="tcShowDetail(this)"
                                                data-type="destination"
                                                data-item='<?php echo esc_attr(json_encode($item)); ?>'>
                                                Meer Informatie
                                            </button>
                                        <?php endif; ?>
                                    </div>
                                </div>
                            
                            <?php elseif ($type === 'flight' || $type === 'transfer'): ?>
                                <div class="tc-day-item">
                                    <div class="tc-day-item-body">
                                        <div class="tc-day-item-title">
                                            <span class="tc-type-badge"><?php echo $type === 'transfer' ? '🚗 TRANSFER' : '✈️ VLUCHT'; ?></span>
                                            <?php echo esc_html($item['from']); ?> → <?php echo esc_html($item['to']); ?>
                                        </div>
                                        <div class="tc-day-item-meta">
                                            <?php if ($item['airline']): ?>
                                                <span class="tc-meta-item"><?php echo $type === 'transfer' ? '🚗' : '🛫'; ?> <?php echo esc_html($item['airline']); ?></span>
                                            <?php endif; ?>
                                            <?php if ($item['flight_number']): ?>
                                                <span class="tc-meta-item">✈️ <?php echo esc_html($item['flight_number']); ?></span>
                                            <?php endif; ?>
                                            <?php if ($item['departure_time'] && $item['arrival_time']): ?>
                                                <span class="tc-meta-item">🕐 <?php echo esc_html($item['departure_time']); ?> - <?php echo esc_html($item['arrival_time']); ?></span>
                                            <?php endif; ?>
                                        </div>
                                    </div>
                                </div>
                            
                            <?php elseif ($type === 'hotel'): ?>
                                <div class="tc-day-item">
                                    <?php if (!empty($item['images'][0])): ?>
                                        <img src="<?php echo esc_url($item['images'][0]); ?>" 
                                             alt="<?php echo esc_attr($item['name']); ?>" 
                                             class="tc-day-item-image"
                                             onclick="tcOpenPhotoSlideshow(<?php echo esc_attr(json_encode($item['images'])); ?>, 0)"
                                             style="cursor: pointer;">
                                    <?php endif; ?>
                                    
                                    <div class="tc-day-item-body">
                                        <div class="tc-day-item-title">
                                            <span class="tc-type-badge">🏨 HOTEL</span>
                                            <?php echo esc_html($item['name']); ?>
                                        </div>
                                        
                                        <?php 
                                        $desc = $item['description'] ?? '';
                                        if (strlen($desc) > 150) {
                                            $desc = substr($desc, 0, 150) . '...';
                                        }
                                        if ($desc): 
                                        ?>
                                            <div class="tc-day-item-desc"><?php echo wp_kses_post($desc); ?></div>
                                        <?php endif; ?>
                                        
                                        <div class="tc-day-item-meta">
                                            <?php if ($item['nights'] > 0): ?>
                                                <span class="tc-meta-item">🌙 <?php echo $item['nights']; ?> <?php echo $item['nights'] == 1 ? 'nacht' : 'nachten'; ?></span>
                                            <?php endif; ?>
                                            <?php if ($item['category']): ?>
                                                <span class="tc-meta-item">⭐ <?php echo esc_html($item['category']); ?></span>
                                            <?php endif; ?>
                                            <?php if ($item['mealPlan']): ?>
                                                <span class="tc-meta-item">🍽️ <?php echo esc_html($item['mealPlan']); ?></span>
                                            <?php endif; ?>
                                            <?php if ($item['address']): ?>
                                                <span class="tc-meta-item">📍 <?php echo esc_html($item['address']); ?></span>
                                            <?php endif; ?>
                                        </div>
                                        
                                        <button type="button" class="tc-btn-details" 
                                            onclick="tcShowDetail(this)"
                                            data-type="hotel"
                                            data-item='<?php echo esc_attr(json_encode($item)); ?>'>
                                            Meer Informatie
                                        </button>
                                    </div>
                                </div>
                            
                            <?php elseif ($type === 'cruise'): ?>
                                <div class="tc-day-item">
                                    <div class="tc-day-item-body">
                                        <div class="tc-day-item-title">
                                            <span class="tc-type-badge">🚢 CRUISE</span>
                                            <?php echo esc_html($item['name']); ?>
                                        </div>
                                        
                                        <div class="tc-day-item-meta">
                                            <?php if ($item['nights'] > 0): ?>
                                                <span class="tc-meta-item">🌙 <?php echo $item['nights']; ?> <?php echo $item['nights'] == 1 ? 'nacht' : 'nachten'; ?></span>
                                            <?php endif; ?>
                                            <?php if ($item['cabinType']): ?>
                                                <span class="tc-meta-item">🛏️ <?php echo esc_html($item['cabinType']); ?></span>
                                            <?php endif; ?>
                                            <?php if ($item['stars']): ?>
                                                <span class="tc-meta-item">⭐ <?php echo esc_html($item['stars']); ?> sterren</span>
                                            <?php endif; ?>
                                            <?php if ($item['departure']): ?>
                                                <span class="tc-meta-item">🛳️ Vertrek: <?php echo date('d-m-Y H:i', strtotime($item['departure'])); ?></span>
                                            <?php endif; ?>
                                            <?php if ($item['arrival']): ?>
                                                <span class="tc-meta-item">⚓ Aankomst: <?php echo date('d-m-Y H:i', strtotime($item['arrival'])); ?></span>
                                            <?php endif; ?>
                                        </div>
                                    </div>
                                </div>
                            
                            <?php elseif ($type === 'car_rental'): ?>
                                <div class="tc-day-item">
                                    <?php if (!empty($item['image'])): ?>
                                        <img src="<?php echo esc_url($item['image']); ?>" alt="<?php echo esc_attr($item['product']); ?>" class="tc-day-item-image">
                                    <?php endif; ?>
                                    
                                    <div class="tc-day-item-body">
                                        <div class="tc-day-item-title">
                                            <span class="tc-type-badge">🚗 HUURAUTO</span>
                                            <?php echo esc_html($item['product']); ?>
                                        </div>
                                        <div class="tc-day-item-meta">
                                            <?php if ($item['pickup_location']): ?>
                                                <span class="tc-meta-item">📍 Ophalen: <?php echo esc_html($item['pickup_location']); ?></span>
                                            <?php endif; ?>
                                            <?php if ($item['pickup_time']): ?>
                                                <span class="tc-meta-item">🕐 <?php echo esc_html($item['pickup_time']); ?></span>
                                            <?php endif; ?>
                                            <?php if ($item['dropoff_day']): ?>
                                                <span class="tc-meta-item">📅 Inleveren dag <?php echo $item['dropoff_day']; ?></span>
                                            <?php endif; ?>
                                        </div>
                                    </div>
                                </div>
                            
                            <?php endif; ?>
                            
                            <?php endforeach; ?>
                        </div>
                    </div>
                <?php endforeach; ?>
            <?php endif; ?>
        </section>
    </div>
    
    <!-- RIGHT: Sidebar -->
    <aside class="tc-sidebar">
        <div class="tc-sidebar-inner">
            <!-- Route Map Preview -->
            <?php if (count($map_destinations) >= 2): ?>
            <div class="tc-booking-card" onclick="tcOpenRouteMap()" style="cursor: pointer; padding: 0; overflow: hidden;">
                <div id="tcMiniMap" style="width: 100%; height: 180px;"></div>
                <div style="padding: 16px; text-align: center; background: var(--tc-primary); color: white; font-weight: 600;">
                    🗺️ Bekijk de Route
                </div>
            </div>
            <?php endif; ?>

            <?php if ($touroperator): ?>
            <!-- Touroperator Badge -->
            <div class="tc-booking-card" style="padding: 12px 16px; display: flex; align-items: center; gap: 16px;">
                <?php if (!empty($touroperator['logo'])): ?>
                    <img src="<?php echo esc_url($touroperator['logo']); ?>" alt="<?php echo esc_attr($touroperator['name']); ?>" style="height: 28px; width: auto; max-width: 100px; object-fit: contain;" />
                <?php endif; ?>
                <div>
                    <div style="font-size: 11px; color: var(--tc-text-light); line-height: 1;">Aangeboden door</div>
                    <div style="font-size: 14px; font-weight: 600; color: var(--tc-text); line-height: 1.3;"><?php echo esc_html($touroperator['name']); ?></div>
                </div>
            </div>
            <?php endif; ?>
            
            <!-- Booking Card -->
            <div class="tc-booking-card">
                <div style="display: flex; justify-content: space-between; margin-bottom: 20px; padding-bottom: 15px; border-bottom: 1px solid var(--tc-border);">
                    <?php if ($show_prices && $price > 0): ?>
                    <div style="text-align: center;">
                        <div style="font-size: 24px; font-weight: 700; color: var(--tc-primary);">€<?php echo number_format($price, 0, ',', '.'); ?></div>
                        <div style="font-size: 12px; color: var(--tc-text-light);">per persoon</div>
                    </div>
                    <?php endif; ?>
                    <div style="text-align: center;">
                        <div style="font-size: 24px; font-weight: 700; color: var(--tc-text);"><?php echo $days; ?></div>
                        <div style="font-size: 12px; color: var(--tc-text-light);">dagen</div>
                    </div>
                </div>
                
                <h3 style="margin-top: 0;">Boek deze Reis</h3>
                <form id="tcQuoteForm" onsubmit="return false;">
                    <div class="tc-form-group">
                        <label class="tc-form-label">Naam: *</label>
                        <input type="text" class="tc-form-input" id="tcQuoteName" required placeholder="Je volledige naam">
                    </div>
                    <div class="tc-form-group">
                        <label class="tc-form-label">E-mail: *</label>
                        <input type="email" class="tc-form-input" id="tcQuoteEmail" required placeholder="je@email.nl">
                    </div>
                    <div class="tc-form-group">
                        <label class="tc-form-label">Telefoon:</label>
                        <input type="tel" class="tc-form-input" id="tcQuotePhone" placeholder="06-12345678">
                    </div>
                    <div class="tc-form-group">
                        <label class="tc-form-label">Vertrekdatum:</label>
                        <input type="date" class="tc-form-input" id="tcQuoteDate">
                    </div>
                    <div class="tc-form-group">
                        <label class="tc-form-label">Aantal personen:</label>
                        <select class="tc-form-input" id="tcQuotePersons">
                            <option value="1">1 persoon</option>
                            <option value="2" selected>2 personen</option>
                            <option value="3">3 personen</option>
                            <option value="4">4 personen</option>
                            <option value="5">5 personen</option>
                            <option value="6">6+ personen</option>
                        </select>
                    </div>
                    <div class="tc-form-group">
                        <label class="tc-form-label">Bericht:</label>
                        <textarea class="tc-form-input" id="tcQuoteMessage" rows="3" placeholder="Heb je speciale wensen of vragen?" style="resize: vertical;"></textarea>
                    </div>
                    <div id="tcQuoteResult" style="display: none; margin-bottom: 12px; padding: 12px; border-radius: 8px; font-size: 14px;"></div>
                    <button type="button" class="tc-btn-primary" id="tcBtnQuote" onclick="tcSubmitQuote('quote')">Offerte Aanvragen</button>
                    <button type="button" class="tc-btn-secondary" id="tcBtnInfo" onclick="tcSubmitQuote('info')">Info Aanvragen</button>
                </form>
            </div>
        </div>
    </aside>
</div>

<!-- DETAIL PANEL -->
<div class="tc-detail-overlay" id="tcDetailOverlay" onclick="tcCloseDetail()"></div>
<div class="tc-detail-panel" id="tcDetailPanel">
    <div class="tc-detail-panel-header">
        <div class="tc-detail-panel-title" id="tcDetailTitle"></div>
        <button class="tc-detail-panel-close" onclick="tcCloseDetail()">×</button>
    </div>
    <div class="tc-detail-panel-body" id="tcDetailBody"></div>
</div>

<!-- PHOTO SLIDESHOW -->
<div id="tcPhotoSlideshow" style="display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.95); z-index: 10000; align-items: center; justify-content: center;">
    <button onclick="tcClosePhotoSlideshow()" style="position: absolute; top: 20px; right: 20px; background: rgba(255,255,255,0.2); border: none; color: white; font-size: 40px; width: 50px; height: 50px; border-radius: 50%; cursor: pointer; line-height: 1;">×</button>
    <button onclick="tcPrevSlide()" style="position: absolute; left: 20px; top: 50%; transform: translateY(-50%); background: rgba(255,255,255,0.2); border: none; color: white; font-size: 30px; width: 50px; height: 50px; border-radius: 50%; cursor: pointer;">‹</button>
    <button onclick="tcNextSlide()" style="position: absolute; right: 20px; top: 50%; transform: translateY(-50%); background: rgba(255,255,255,0.2); border: none; color: white; font-size: 30px; width: 50px; height: 50px; border-radius: 50%; cursor: pointer;">›</button>
    <img id="tcSlideshowImage" src="" style="max-width: 90%; max-height: 90%; object-fit: contain;">
    <div id="tcSlideshowCounter" style="position: absolute; bottom: 20px; left: 50%; transform: translateX(-50%); color: white; font-size: 16px; background: rgba(0,0,0,0.5); padding: 8px 16px; border-radius: 20px;"></div>
</div>

<!-- ROUTE MAP PANEL -->
<div class="tc-route-overlay" id="tcRouteOverlay" onclick="tcCloseRouteMap()"></div>
<div class="tc-route-panel" id="tcRoutePanel">
    <div class="tc-route-panel-header">
        <h3>🗺️ Route Overzicht</h3>
        <button class="tc-route-panel-close" onclick="tcCloseRouteMap()">×</button>
    </div>
    <div class="tc-route-panel-body">
        <div id="tcRouteMap"></div>
        <div class="tc-route-legend">
            <div class="tc-legend-item"><span class="tc-legend-dot"></span> Bestemming</div>
            <div class="tc-legend-item"><span class="tc-legend-line"></span> Route</div>
        </div>
    </div>
</div>

</div><!-- .travelc-detail -->

<script>
(function() {
    var mapDestinations = <?php echo json_encode($map_destinations); ?>;
    var primaryColor = '<?php echo esc_js($primary_color); ?>';
    var routeMapInstance = null;
    var miniMapInstance = null;
    
    // Slideshow
    var slideshow = document.getElementById('tcHeroSlideshow');
    if (slideshow) {
        var slides = slideshow.querySelectorAll('.slide');
        var dots = slideshow.querySelectorAll('.slide-dot');
        var current = 0;
        
        function showSlide(index) {
            slides.forEach(function(s, i) { s.classList.toggle('active', i === index); });
            dots.forEach(function(d, i) { d.classList.toggle('active', i === index); });
            current = index;
        }
        
        setInterval(function() { showSlide((current + 1) % slides.length); }, 4000);
        
        dots.forEach(function(dot) {
            dot.addEventListener('click', function() {
                showSlide(parseInt(this.dataset.index));
            });
        });
    }
    
    // Mini Map
    function initMiniMap() {
        var container = document.getElementById('tcMiniMap');
        if (!container || !mapDestinations || mapDestinations.length === 0) return;
        if (typeof L === 'undefined') return;
        
        var bounds = [];
        mapDestinations.forEach(function(dest) {
            if (dest.lat && dest.lng) bounds.push([dest.lat, dest.lng]);
        });
        if (bounds.length === 0) return;
        
        miniMapInstance = L.map('tcMiniMap', {
            zoomControl: false, dragging: false, scrollWheelZoom: false,
            doubleClickZoom: false, boxZoom: false, keyboard: false, tap: false, touchZoom: false
        });
        
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 18 }).addTo(miniMapInstance);
        miniMapInstance.fitBounds(bounds, { padding: [20, 20] });
        
        if (bounds.length > 1) {
            L.polyline(bounds, { color: primaryColor, weight: 3, opacity: 0.8 }).addTo(miniMapInstance);
        }
        
        mapDestinations.forEach(function(dest, index) {
            if (dest.lat && dest.lng) {
                var icon = L.divIcon({
                    className: 'tc-mini-marker',
                    html: '<div style="background:' + primaryColor + ';color:white;width:18px;height:18px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:bold;font-size:9px;border:2px solid white;box-shadow:0 1px 3px rgba(0,0,0,0.3);">' + (index + 1) + '</div>',
                    iconSize: [18, 18], iconAnchor: [9, 9]
                });
                L.marker([dest.lat, dest.lng], { icon: icon }).addTo(miniMapInstance);
            }
        });
    }
    
    // Route Map
    window.tcOpenRouteMap = function() {
        document.getElementById('tcRouteOverlay').style.display = 'block';
        setTimeout(function() {
            document.getElementById('tcRouteOverlay').classList.add('active');
            document.getElementById('tcRoutePanel').classList.add('active');
            setTimeout(initRouteMap, 150);
        }, 10);
        document.body.style.overflow = 'hidden';
    };
    
    window.tcCloseRouteMap = function() {
        document.getElementById('tcRouteOverlay').classList.remove('active');
        document.getElementById('tcRoutePanel').classList.remove('active');
        setTimeout(function() {
            document.getElementById('tcRouteOverlay').style.display = 'none';
        }, 300);
        document.body.style.overflow = '';
    };
    
    function initRouteMap() {
        var container = document.getElementById('tcRouteMap');
        if (!container || !mapDestinations || mapDestinations.length === 0) return;
        if (typeof L === 'undefined') return;
        
        if (routeMapInstance) { routeMapInstance.remove(); routeMapInstance = null; }
        
        var bounds = [];
        mapDestinations.forEach(function(dest) {
            if (dest.lat && dest.lng) bounds.push([dest.lat, dest.lng]);
        });
        if (bounds.length === 0) return;
        
        routeMapInstance = L.map('tcRouteMap');
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 18, attribution: '© OpenStreetMap' }).addTo(routeMapInstance);
        routeMapInstance.fitBounds(bounds, { padding: [50, 50] });
        
        if (bounds.length > 1) {
            L.polyline(bounds, { color: primaryColor, weight: 4, opacity: 0.8, dashArray: '10, 10' }).addTo(routeMapInstance);
        }
        
        mapDestinations.forEach(function(dest, index) {
            if (dest.lat && dest.lng) {
                var icon = L.divIcon({
                    className: 'tc-route-marker',
                    html: '<div style="background:' + primaryColor + ';color:white;width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:bold;font-size:12px;border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3);">' + (index + 1) + '</div>',
                    iconSize: [28, 28], iconAnchor: [14, 14]
                });
                var marker = L.marker([dest.lat, dest.lng], { icon: icon }).addTo(routeMapInstance);
                var popup = '<strong>' + (index + 1) + '. ' + (dest.name || 'Bestemming') + '</strong>';
                if (dest.image) {
                    popup += '<br><img src="' + dest.image + '" style="width:200px;height:120px;object-fit:cover;border-radius:6px;margin-top:10px;">';
                }
                marker.bindPopup(popup, { maxWidth: 250, minWidth: 200 });
            }
        });
        
        setTimeout(function() { routeMapInstance.invalidateSize(); }, 100);
    }
    
    // Photo Slideshow
    var slideshowImages = [];
    var currentSlideIndex = 0;
    
    window.tcOpenPhotoSlideshow = function(images, startIndex) {
        slideshowImages = images;
        currentSlideIndex = startIndex || 0;
        tcShowSlide(currentSlideIndex);
        document.getElementById('tcPhotoSlideshow').style.display = 'flex';
        document.body.style.overflow = 'hidden';
    };
    
    window.tcClosePhotoSlideshow = function() {
        document.getElementById('tcPhotoSlideshow').style.display = 'none';
        document.body.style.overflow = '';
    };
    
    window.tcNextSlide = function() {
        currentSlideIndex = (currentSlideIndex + 1) % slideshowImages.length;
        tcShowSlide(currentSlideIndex);
    };
    
    window.tcPrevSlide = function() {
        currentSlideIndex = (currentSlideIndex - 1 + slideshowImages.length) % slideshowImages.length;
        tcShowSlide(currentSlideIndex);
    };
    
    function tcShowSlide(index) {
        var img = document.getElementById('tcSlideshowImage');
        var counter = document.getElementById('tcSlideshowCounter');
        img.src = slideshowImages[index];
        counter.textContent = (index + 1) + ' / ' + slideshowImages.length;
    }
    
    // Detail Panel
    window.tcShowDetail = function(btn) {
        var type = btn.getAttribute('data-type');
        var data = JSON.parse(btn.getAttribute('data-item'));
        var title = data.name || 'Details';
        var html = '';
        
        // Images - clickable gallery
        var images = data.images || [];
        if (images.length > 0) {
            html += '<div class="tc-detail-section"><div class="tc-detail-gallery">';
            images.slice(0, 6).forEach(function(img, idx) {
                if (img) {
                    html += '<img src="' + img + '" alt="" onclick="tcOpenPhotoSlideshow(' + JSON.stringify(images) + ', ' + idx + ')" style="cursor: pointer;">';
                }
            });
            html += '</div></div>';
        }
        
        // Map if geolocation available
        if (data.geolocation && data.geolocation.latitude && data.geolocation.longitude) {
            html += '<div class="tc-detail-section"><div id="tcDetailMap" style="width: 100%; height: 250px; border-radius: 8px; overflow: hidden;"></div></div>';
        }
        
        // Description
        if (data.description) {
            html += '<div class="tc-detail-section"><p>' + data.description + '</p></div>';
        }
        
        // Info
        html += '<div class="tc-detail-section"><div class="tc-info-items">';
        if (data.address) html += '<div class="tc-info-row"><span class="tc-info-label">📍 Adres:</span> ' + data.address + '</div>';
        if (data.nights) html += '<div class="tc-info-row"><span class="tc-info-label">🌙 Nachten:</span> ' + data.nights + '</div>';
        if (data.category) html += '<div class="tc-info-row"><span class="tc-info-label">⭐ Categorie:</span> ' + data.category + '</div>';
        if (data.mealPlan) html += '<div class="tc-info-row"><span class="tc-info-label">🍽️ Maaltijden:</span> ' + data.mealPlan + '</div>';
        if (data.country) html += '<div class="tc-info-row"><span class="tc-info-label">🌍 Land:</span> ' + data.country + '</div>';
        html += '</div></div>';
        
        document.getElementById('tcDetailTitle').textContent = title;
        document.getElementById('tcDetailBody').innerHTML = html;
        document.getElementById('tcDetailOverlay').style.display = 'block';
        setTimeout(function() {
            document.getElementById('tcDetailOverlay').classList.add('active');
            document.getElementById('tcDetailPanel').classList.add('active');
            
            // Init map if geolocation available
            if (data.geolocation && data.geolocation.latitude && data.geolocation.longitude && typeof L !== 'undefined') {
                setTimeout(function() {
                    var lat = parseFloat(data.geolocation.latitude);
                    var lng = parseFloat(data.geolocation.longitude);
                    var detailMap = L.map('tcDetailMap').setView([lat, lng], 13);
                    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 18 }).addTo(detailMap);
                    L.marker([lat, lng]).addTo(detailMap).bindPopup(data.name || 'Locatie').openPopup();
                }, 100);
            }
        }, 10);
        document.body.style.overflow = 'hidden';
    };
    
    window.tcCloseDetail = function() {
        document.getElementById('tcDetailOverlay').classList.remove('active');
        document.getElementById('tcDetailPanel').classList.remove('active');
        setTimeout(function() {
            document.getElementById('tcDetailOverlay').style.display = 'none';
        }, 300);
        document.body.style.overflow = '';
    };
    
    // Init
    document.addEventListener('DOMContentLoaded', function() {
        setTimeout(initMiniMap, 100);
    });
    
    if (document.readyState === 'complete') {
        setTimeout(initMiniMap, 100);
    }
})();
</script>
