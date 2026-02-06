<?php if (!defined('ABSPATH')) exit;

$title = $travel['title'] ?? '';
$description = $travel['description'] ?? '';
$intro = $travel['intro_text'] ?? '';
$nights = $travel['number_of_nights'] ?? 0;
$days = $travel['number_of_days'] ?? 0;
$price = $travel['price_per_person'] ?? 0;
$price_desc = $travel['price_description'] ?? '';
$hero_image = $travel['hero_image'] ?? '';
$images = $travel['images'] ?? [];
$destinations = $travel['destinations'] ?? [];
$hotels = $travel['hotels'] ?? [];
$itinerary = $travel['itinerary'] ?? [];
$included = $travel['included'] ?? [];
$excluded = $travel['excluded'] ?? [];
$highlights = $travel['highlights'] ?? [];
$countries = $travel['countries'] ?? [];
$flights = $travel['flights'] ?? [];
$car_rentals = $travel['car_rentals'] ?? [];
$cruises = $travel['cruises'] ?? [];
$transfers = $travel['transfers'] ?? [];
$activities = $travel['activities'] ?? [];
$excursions = $travel['excursions'] ?? [];

// Build destinations JSON for map
$map_destinations = [];
foreach ($destinations as $dest) {
    $lat = $dest['geolocation']['latitude'] ?? 0;
    $lng = $dest['geolocation']['longitude'] ?? 0;
    if ($lat != 0 && $lng != 0) {
        $map_destinations[] = [
            'name' => $dest['name'] ?? '',
            'lat' => floatval($lat),
            'lng' => floatval($lng),
            'image' => $dest['images'][0] ?? $dest['imageUrls'][0] ?? '',
            'description' => wp_trim_words(strip_tags($dest['description'] ?? ''), 20),
            'nights' => $dest['nights'] ?? 0,
        ];
    }
}
?>

<article class="travelc-detail">

    <!-- Hero -->
    <?php if ($hero_image): ?>
    <div class="travelc-detail__hero">
        <img src="<?php echo esc_url($hero_image); ?>" alt="<?php echo esc_attr($title); ?>" />
        <div class="travelc-detail__hero-overlay">
            <h1 class="travelc-detail__title"><?php echo esc_html($title); ?></h1>
            <div class="travelc-detail__hero-meta">
                <?php if ($nights > 0): ?>
                    <span><?php echo esc_html($days); ?> dagen / <?php echo esc_html($nights); ?> nachten</span>
                <?php endif; ?>
                <?php if (!empty($countries)): ?>
                    <span><?php echo esc_html(implode(', ', $countries)); ?></span>
                <?php endif; ?>
                <?php if ($price > 0): ?>
                    <span class="travelc-detail__hero-price">Vanaf &euro; <?php echo number_format($price, 0, ',', '.'); ?> p.p.</span>
                <?php endif; ?>
            </div>
        </div>
    </div>
    <?php else: ?>
    <h1 class="travelc-detail__title travelc-detail__title--no-hero"><?php echo esc_html($title); ?></h1>
    <?php endif; ?>

    <!-- Intro -->
    <?php if ($intro): ?>
    <div class="travelc-detail__intro">
        <p><?php echo wp_kses_post($intro); ?></p>
    </div>
    <?php endif; ?>

    <!-- Highlights -->
    <?php if (!empty($highlights)): ?>
    <div class="travelc-detail__section">
        <h2>Hoogtepunten</h2>
        <ul class="travelc-detail__highlights">
            <?php foreach ($highlights as $hl): ?>
                <li><?php echo esc_html(is_array($hl) ? ($hl['text'] ?? $hl['title'] ?? '') : $hl); ?></li>
            <?php endforeach; ?>
        </ul>
    </div>
    <?php endif; ?>

    <!-- Route Map -->
    <?php if (count($map_destinations) >= 2): ?>
    <div class="travelc-detail__section">
        <h2>Routekaart</h2>
        <script>var travelcMapDestinations = <?php echo json_encode($map_destinations); ?>;</script>
        <div id="travelc-routemap" class="travelc-detail__map"></div>
    </div>
    <?php endif; ?>

    <!-- Description -->
    <?php if ($description): ?>
    <div class="travelc-detail__section">
        <h2>Beschrijving</h2>
        <div class="travelc-detail__description"><?php echo wp_kses_post($description); ?></div>
    </div>
    <?php endif; ?>

    <!-- Destinations -->
    <?php if (!empty($destinations)): ?>
    <div class="travelc-detail__section">
        <h2>Bestemmingen</h2>
        <div class="travelc-detail__destinations">
            <?php foreach ($destinations as $idx => $dest): ?>
            <div class="travelc-dest">
                <?php 
                    $dest_img = $dest['images'][0] ?? $dest['imageUrls'][0] ?? '';
                    if ($dest_img): 
                ?>
                <div class="travelc-dest__image">
                    <img src="<?php echo esc_url($dest_img); ?>" alt="<?php echo esc_attr($dest['name'] ?? ''); ?>" loading="lazy" />
                    <span class="travelc-dest__number"><?php echo $idx + 1; ?></span>
                </div>
                <?php endif; ?>
                <div class="travelc-dest__info">
                    <h3><?php echo esc_html($dest['name'] ?? ''); ?></h3>
                    <?php if (!empty($dest['country'])): ?>
                        <span class="travelc-dest__country"><?php echo esc_html($dest['country']); ?></span>
                    <?php endif; ?>
                    <?php if (!empty($dest['nights'])): ?>
                        <span class="travelc-dest__nights"><?php echo esc_html($dest['nights']); ?> nachten</span>
                    <?php endif; ?>
                    <?php if (!empty($dest['description'])): ?>
                        <p><?php echo wp_kses_post(wp_trim_words(strip_tags($dest['description']), 40)); ?></p>
                    <?php endif; ?>
                </div>
            </div>
            <?php endforeach; ?>
        </div>
    </div>
    <?php endif; ?>

    <!-- Hotels -->
    <?php if (!empty($hotels)): ?>
    <div class="travelc-detail__section">
        <h2>Hotels</h2>
        <div class="travelc-detail__hotels">
            <?php foreach ($hotels as $hotel): ?>
            <div class="travelc-hotel">
                <?php 
                    $hotel_img = $hotel['imageUrl'] ?? $hotel['image'] ?? '';
                    if ($hotel_img): 
                ?>
                <div class="travelc-hotel__image">
                    <img src="<?php echo esc_url($hotel_img); ?>" alt="<?php echo esc_attr($hotel['name'] ?? ''); ?>" loading="lazy" />
                </div>
                <?php endif; ?>
                <div class="travelc-hotel__info">
                    <h3><?php echo esc_html($hotel['name'] ?? ''); ?></h3>
                    <?php if (!empty($hotel['stars'])): ?>
                        <span class="travelc-hotel__stars"><?php echo str_repeat('★', intval($hotel['stars'])); ?></span>
                    <?php endif; ?>
                    <?php if (!empty($hotel['location'])): ?>
                        <span class="travelc-hotel__location"><?php echo esc_html($hotel['location']); ?></span>
                    <?php endif; ?>
                </div>
            </div>
            <?php endforeach; ?>
        </div>
    </div>
    <?php endif; ?>

    <!-- Itinerary -->
    <?php if (!empty($itinerary)): ?>
    <div class="travelc-detail__section">
        <h2>Reisprogramma</h2>
        <div class="travelc-detail__itinerary">
            <?php foreach ($itinerary as $day): ?>
            <div class="travelc-day">
                <div class="travelc-day__marker">
                    <span class="travelc-day__number">Dag <?php echo esc_html($day['day'] ?? $day['dayNumber'] ?? ''); ?></span>
                </div>
                <div class="travelc-day__content">
                    <h3><?php echo esc_html($day['title'] ?? $day['name'] ?? ''); ?></h3>
                    <?php if (!empty($day['description'])): ?>
                        <p><?php echo wp_kses_post($day['description']); ?></p>
                    <?php endif; ?>
                </div>
            </div>
            <?php endforeach; ?>
        </div>
    </div>
    <?php endif; ?>

    <!-- Flights -->
    <?php if (!empty($flights)): ?>
    <div class="travelc-detail__section">
        <h2>Vluchten</h2>
        <div class="travelc-detail__flights">
            <?php foreach ($flights as $flight): ?>
            <div class="travelc-flight">
                <span class="travelc-flight__icon">✈️</span>
                <div class="travelc-flight__info">
                    <strong><?php echo esc_html(($flight['departureAirport'] ?? '') . ' → ' . ($flight['arrivalAirport'] ?? '')); ?></strong>
                    <?php if (!empty($flight['departureDate'])): ?>
                        <span><?php echo esc_html($flight['departureDate']); ?></span>
                    <?php endif; ?>
                    <?php if (!empty($flight['airline'])): ?>
                        <span><?php echo esc_html($flight['airline']); ?></span>
                    <?php endif; ?>
                </div>
            </div>
            <?php endforeach; ?>
        </div>
    </div>
    <?php endif; ?>

    <!-- Cruises -->
    <?php if (!empty($cruises)): ?>
    <div class="travelc-detail__section">
        <h2>Cruise</h2>
        <div class="travelc-detail__cruises">
            <?php foreach ($cruises as $cruise): ?>
            <div class="travelc-cruise">
                <span class="travelc-cruise__icon">🚢</span>
                <div class="travelc-cruise__info">
                    <strong><?php echo esc_html($cruise['cruiseLine'] ?? ''); ?> - <?php echo esc_html($cruise['selectedCategory'] ?? ''); ?></strong>
                    <?php if (!empty($cruise['nights'])): ?>
                        <span><?php echo esc_html($cruise['nights']); ?> nachten</span>
                    <?php endif; ?>
                    <?php if (!empty($cruise['departure'])): ?>
                        <span>Vertrek: <?php echo esc_html($cruise['departure']); ?></span>
                    <?php endif; ?>
                </div>
            </div>
            <?php endforeach; ?>
        </div>
    </div>
    <?php endif; ?>

    <!-- Car Rentals -->
    <?php if (!empty($car_rentals)): ?>
    <div class="travelc-detail__section">
        <h2>Huurauto</h2>
        <div class="travelc-detail__cars">
            <?php foreach ($car_rentals as $car): ?>
            <div class="travelc-car">
                <?php if (!empty($car['imageUrl'])): ?>
                    <img src="<?php echo esc_url($car['imageUrl']); ?>" alt="<?php echo esc_attr($car['product'] ?? ''); ?>" class="travelc-car__image" />
                <?php endif; ?>
                <div class="travelc-car__info">
                    <strong><?php echo esc_html($car['product'] ?? ''); ?></strong>
                    <?php if (!empty($car['pickupLocation'])): ?>
                        <span>Ophalen: <?php echo esc_html($car['pickupLocation']); ?> (<?php echo esc_html($car['pickupDate'] ?? ''); ?>)</span>
                    <?php endif; ?>
                    <?php if (!empty($car['dropoffLocation'])): ?>
                        <span>Inleveren: <?php echo esc_html($car['dropoffLocation']); ?> (<?php echo esc_html($car['dropoffDate'] ?? ''); ?>)</span>
                    <?php endif; ?>
                    <?php if (!empty($car['transmissionType'])): ?>
                        <span><?php echo esc_html($car['transmissionType']); ?></span>
                    <?php endif; ?>
                </div>
            </div>
            <?php endforeach; ?>
        </div>
    </div>
    <?php endif; ?>

    <!-- Included / Excluded -->
    <?php if (!empty($included) || !empty($excluded)): ?>
    <div class="travelc-detail__section">
        <h2>Inclusief / Exclusief</h2>
        <div class="travelc-detail__inclexcl">
            <?php if (!empty($included)): ?>
            <div class="travelc-incl">
                <h3>✅ Inclusief</h3>
                <ul>
                    <?php foreach ($included as $item): ?>
                        <li><?php echo esc_html(is_array($item) ? ($item['text'] ?? $item['description'] ?? '') : $item); ?></li>
                    <?php endforeach; ?>
                </ul>
            </div>
            <?php endif; ?>
            <?php if (!empty($excluded)): ?>
            <div class="travelc-excl">
                <h3>❌ Exclusief</h3>
                <ul>
                    <?php foreach ($excluded as $item): ?>
                        <li><?php echo esc_html(is_array($item) ? ($item['text'] ?? $item['description'] ?? '') : $item); ?></li>
                    <?php endforeach; ?>
                </ul>
            </div>
            <?php endif; ?>
        </div>
    </div>
    <?php endif; ?>

    <!-- Price -->
    <?php if ($price > 0): ?>
    <div class="travelc-detail__section travelc-detail__price-section">
        <div class="travelc-detail__price-box">
            <span class="travelc-detail__price-label">Prijs vanaf</span>
            <span class="travelc-detail__price-amount">&euro; <?php echo number_format($price, 0, ',', '.'); ?></span>
            <span class="travelc-detail__price-pp">per persoon</span>
            <?php if ($price_desc): ?>
                <span class="travelc-detail__price-desc"><?php echo esc_html($price_desc); ?></span>
            <?php endif; ?>
        </div>
    </div>
    <?php endif; ?>

    <!-- Image Gallery -->
    <?php if (count($images) > 1): ?>
    <div class="travelc-detail__section">
        <h2>Foto's</h2>
        <div class="travelc-detail__gallery">
            <?php foreach (array_slice($images, 0, 12) as $img): ?>
                <div class="travelc-gallery__item">
                    <img src="<?php echo esc_url($img); ?>" alt="<?php echo esc_attr($title); ?>" loading="lazy" />
                </div>
            <?php endforeach; ?>
        </div>
    </div>
    <?php endif; ?>

</article>
