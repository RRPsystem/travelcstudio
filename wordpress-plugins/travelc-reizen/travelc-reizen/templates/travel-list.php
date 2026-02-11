<?php if (!defined('ABSPATH')) exit;

$travels = $result['travels'] ?? [];
$total = count($travels);

// Collect unique destinations and categories for filter dropdowns
$all_destinations = [];
$all_categories = [];
foreach ($travels as $t) {
    foreach (($t['country_list'] ?? []) as $c) {
        $all_destinations[$c] = true;
    }
    foreach (($t['categories'] ?? []) as $cat) {
        $cat_name = is_array($cat) ? ($cat['name'] ?? '') : $cat;
        if ($cat_name) $all_categories[$cat_name] = true;
    }
}
ksort($all_destinations);
ksort($all_categories);
?>

<div class="travelc-page-wrapper">
<!-- Search & Filter Bar -->
<div class="travelc-filter-bar" id="travelc-filters">
    <div class="travelc-filter-bar__inner">
        <div class="travelc-filter-group">
            <label class="travelc-filter-label">ZOEKEN</label>
            <input type="text" id="travelc-search" class="travelc-filter-input" placeholder="Bestemming, reistitel..." />
        </div>
        <div class="travelc-filter-group">
            <label class="travelc-filter-label">BESTEMMING</label>
            <select id="travelc-dest-filter" class="travelc-filter-select">
                <option value="">Alle</option>
                <?php foreach (array_keys($all_destinations) as $dest): ?>
                    <option value="<?php echo esc_attr(strtolower($dest)); ?>"><?php echo esc_html($dest); ?></option>
                <?php endforeach; ?>
            </select>
        </div>
        <div class="travelc-filter-group">
            <label class="travelc-filter-label">TYPE REIS</label>
            <select id="travelc-type-filter" class="travelc-filter-select">
                <option value="">Alle</option>
                <?php foreach (array_keys($all_categories) as $cat): ?>
                    <option value="<?php echo esc_attr(strtolower($cat)); ?>"><?php echo esc_html($cat); ?></option>
                <?php endforeach; ?>
            </select>
        </div>
        <button type="button" id="travelc-search-btn" class="travelc-filter-btn">Zoeken</button>
        <button type="button" id="travelc-fav-btn" class="travelc-fav-btn" title="Bewaarde reizen">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
            <span id="travelc-fav-count"></span>
        </button>
    </div>
</div>

<!-- Results header -->
<div class="travelc-results-header">
    <span class="travelc-results-count"><strong id="travelc-count"><?php echo $total; ?></strong> reizen gevonden</span>
    <select id="travelc-sort" class="travelc-sort-select">
        <option value="newest">Nieuwste</option>
        <option value="price-asc">Prijs laag-hoog</option>
        <option value="price-desc">Prijs hoog-laag</option>
        <option value="nights-asc">Kortste eerst</option>
        <option value="nights-desc">Langste eerst</option>
    </select>
</div>

<!-- Travel Cards (Traveler Style - horizontal) -->
<div class="travelc-reizen travelc-layout-traveler" id="travelc-list">
    <?php foreach ($travels as $travel): 
        $detail_url = home_url('/reizen/' . $travel['slug'] . '/');
        $image = !empty($travel['first_image']) ? $travel['first_image'] : ($travel['hero_image'] ?? '');
        $price = !empty($travel['display_price']) ? $travel['display_price'] : ($travel['price_per_person'] ?? 0);
        $title = !empty($travel['display_title']) ? $travel['display_title'] : $travel['title'];
        $nights = $travel['number_of_nights'] ?? 0;
        $days = $travel['number_of_days'] ?? 0;
        $countries = $travel['country_list'] ?? [];
        $dest_count = $travel['destination_count'] ?? 0;
        $hotel_count = $travel['hotel_count'] ?? 0;
        $destinations = $travel['destinations'] ?? [];
        $dest_names = [];
        foreach ($destinations as $d) {
            if (!empty($d['name'])) $dest_names[] = $d['name'];
        }
        // Get travel type from categories (first category name)
        $categories = $travel['categories'] ?? [];
        $travel_type = '';
        if (!empty($categories)) {
            $first_cat = $categories[0];
            $travel_type = is_array($first_cat) ? ($first_cat['name'] ?? '') : $first_cat;
        }
        // Auto-detect travel type from title if categories empty
        if (empty($travel_type)) {
            $title_lower = strtolower($title);
            if (strpos($title_lower, 'rondreis') !== false) $travel_type = 'Autorondreis';
            elseif (strpos($title_lower, 'fly & drive') !== false || strpos($title_lower, 'fly and drive') !== false) $travel_type = 'Fly & Drive';
            elseif (strpos($title_lower, 'cruise') !== false) $travel_type = 'Cruise';
            elseif (strpos($title_lower, 'strandvakantie') !== false || strpos($title_lower, 'beach') !== false) $travel_type = 'Strandvakantie';
            elseif (strpos($title_lower, 'stedentrip') !== false) $travel_type = 'Stedentrip';
            elseif (strpos($title_lower, 'safari') !== false) $travel_type = 'Safari';
            elseif (strpos($title_lower, 'treinreis') !== false) $travel_type = 'Treinreis';
        }
        // Touroperator info
        $source_microsite = $travel['source_microsite'] ?? '';
        $touroperator = travelc_get_touroperator_info($source_microsite);

        // Intro text: fallback to description if empty
        $intro = $travel['intro_text'] ?? '';
        if (empty($intro)) $intro = $travel['description'] ?? '';
        // Build destinations JSON for routekaart panel
        // Support multiple coordinate formats: lat/lng, latitude/longitude, geolocation.latitude/longitude
        $dest_json = [];
        foreach ($destinations as $d) {
            if (empty($d['name'])) continue;
            $lat = 0; $lng = 0;
            if (!empty($d['geolocation']['latitude'])) {
                $lat = floatval($d['geolocation']['latitude']);
                $lng = floatval($d['geolocation']['longitude'] ?? 0);
            } elseif (!empty($d['latitude'])) {
                $lat = floatval($d['latitude']);
                $lng = floatval($d['longitude'] ?? 0);
            } elseif (!empty($d['lat'])) {
                $lat = floatval($d['lat']);
                $lng = floatval($d['lng'] ?? $d['lon'] ?? 0);
            }
            if ($lat != 0 && $lng != 0) {
                $dest_json[] = ['name' => $d['name'], 'lat' => $lat, 'lng' => $lng];
            }
        }
    ?>
    <div class="travelc-tcard" 
         data-id="<?php echo esc_attr($travel['id'] ?? ''); ?>"
         data-title="<?php echo esc_attr(strtolower($title)); ?>"
         data-countries="<?php echo esc_attr(strtolower(implode(',', $countries))); ?>"
         data-destinations="<?php echo esc_attr(strtolower(implode(',', $dest_names))); ?>"
         data-categories="<?php echo esc_attr(strtolower(implode(',', array_map(function($c) { return is_array($c) ? ($c['name'] ?? '') : $c; }, $categories)))); ?>"
         data-price="<?php echo esc_attr($price); ?>"
         data-nights="<?php echo esc_attr($nights); ?>"
         data-date="<?php echo esc_attr($travel['created_at'] ?? ''); ?>">

        <!-- Image -->
        <a href="<?php echo esc_url($detail_url); ?>" class="travelc-tcard__image-link">
            <?php if ($image): ?>
                <img src="<?php echo esc_url($image); ?>" alt="<?php echo esc_attr($title); ?>" loading="lazy" />
            <?php else: ?>
                <div class="travelc-tcard__no-image">Geen afbeelding</div>
            <?php endif; ?>
        </a>

        <!-- Info -->
        <div class="travelc-tcard__info">
            <a href="<?php echo esc_url($detail_url); ?>" class="travelc-tcard__title-link">
                <h3 class="travelc-tcard__title"><?php echo esc_html($title); ?></h3>
            </a>

            <?php if (!empty($dest_names)): ?>
                <div class="travelc-tcard__dest-row">
                    <div class="travelc-tcard__destinations">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                        <span><?php echo esc_html(implode(' · ', array_slice($dest_names, 0, 6))); ?></span>
                    </div>
                    <?php if (count($dest_names) >= 2 && !empty($dest_json)): ?>
                        <button type="button" class="travelc-tcard__routelink" data-destinations='<?php echo esc_attr(json_encode($dest_json)); ?>' data-title="<?php echo esc_attr($title); ?>">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/><line x1="8" y1="2" x2="8" y2="18"/><line x1="16" y1="6" x2="16" y2="22"/></svg>
                            Routekaart
                        </button>
                    <?php endif; ?>
                </div>
            <?php endif; ?>

            <?php if (!empty($intro)): ?>
                <p class="travelc-tcard__excerpt"><?php echo esc_html(wp_trim_words(strip_tags($intro), 30)); ?></p>
            <?php endif; ?>

            <?php if ($nights > 0): ?>
                <div class="travelc-tcard__meta-bar">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                    <?php echo esc_html($nights); ?> nachten
                </div>
            <?php endif; ?>
        </div>

        <!-- Price Block -->
        <div class="travelc-tcard__price-block">
            <?php if ($price > 0 && ($travel['show_prices'] ?? true)): ?>
                <?php if ($travel_type): ?>
                    <span class="travelc-tcard__price-type"><?php echo esc_html($travel_type); ?></span>
                <?php endif; ?>
                <span class="travelc-tcard__price-amount">&euro;<?php echo number_format($price, 0, ',', '.'); ?></span>
                <span class="travelc-tcard__price-sub">/ totalprijs indicatieprijs</span>
            <?php endif; ?>
            <a href="<?php echo esc_url($detail_url); ?>" class="travelc-tcard__cta-btn">Informatie</a>
        </div>
    </div>
    <?php endforeach; ?>
</div>

</div><!-- /travelc-page-wrapper -->
<?php if (empty($travels)): ?>
    <p class="travelc-empty">Geen reizen gevonden.</p>
<?php endif; ?>

<!-- Routekaart Sliding Panel — full-height map -->
<div class="travelc-routepanel" id="travelc-routepanel">
    <button type="button" class="travelc-routepanel__close" id="travelc-routepanel-close">&times;</button>
    <div class="travelc-routepanel__map" id="travelc-routepanel-map"></div>
</div>
<div class="travelc-routepanel__overlay" id="travelc-routepanel-overlay"></div>

<!-- travel-list.js loaded externally via wp_enqueue_script -->
