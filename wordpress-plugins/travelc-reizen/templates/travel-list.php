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
        $detail_url = add_query_arg('reis', $travel['slug'], get_permalink());
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
        // Build destinations JSON for routekaart panel
        $dest_json = [];
        foreach ($destinations as $d) {
            if (!empty($d['name']) && (isset($d['latitude']) || isset($d['lat']))) {
                $dest_json[] = [
                    'name' => $d['name'],
                    'lat' => floatval($d['latitude'] ?? $d['lat'] ?? 0),
                    'lng' => floatval($d['longitude'] ?? $d['lng'] ?? $d['lon'] ?? 0),
                ];
            }
        }
    ?>
    <div class="travelc-tcard" 
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
            <span class="travelc-tcard__heart" title="Bewaren">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
            </span>
        </a>

        <!-- Info -->
        <div class="travelc-tcard__info">
            <a href="<?php echo esc_url($detail_url); ?>" class="travelc-tcard__title-link">
                <h3 class="travelc-tcard__title"><?php echo esc_html($title); ?></h3>
            </a>

            <?php if (!empty($dest_names)): ?>
                <div class="travelc-tcard__destinations">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                    <span><?php echo esc_html(implode(' · ', array_slice($dest_names, 0, 6))); ?></span>
                    <?php if (count($dest_names) >= 2 && !empty($dest_json)): ?>
                        <button type="button" class="travelc-tcard__routelink" data-destinations='<?php echo esc_attr(json_encode($dest_json)); ?>' data-title="<?php echo esc_attr($title); ?>">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/><line x1="8" y1="2" x2="8" y2="18"/><line x1="16" y1="6" x2="16" y2="22"/></svg>
                            Routekaart
                        </button>
                    <?php endif; ?>
                </div>
            <?php endif; ?>

            <?php if (!empty($travel['intro_text'])): ?>
                <p class="travelc-tcard__excerpt"><?php echo esc_html(wp_trim_words(strip_tags($travel['intro_text']), 30)); ?></p>
            <?php endif; ?>

            <?php if ($nights > 0): ?>
                <span class="travelc-tcard__nights-pill">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                    <?php echo esc_html($nights); ?> nachten
                </span>
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

<?php if (empty($travels)): ?>
    <p class="travelc-empty">Geen reizen gevonden.</p>
<?php endif; ?>

<!-- Routekaart Sliding Panel -->
<div class="travelc-routepanel" id="travelc-routepanel">
    <div class="travelc-routepanel__header">
        <h3 class="travelc-routepanel__title" id="travelc-routepanel-title">Routekaart</h3>
        <button type="button" class="travelc-routepanel__close" id="travelc-routepanel-close">&times;</button>
    </div>
    <div class="travelc-routepanel__map" id="travelc-routepanel-map"></div>
    <div class="travelc-routepanel__stops" id="travelc-routepanel-stops"></div>
</div>
<div class="travelc-routepanel__overlay" id="travelc-routepanel-overlay"></div>

<script>
(function() {
    var searchInput = document.getElementById('travelc-search');
    var destFilter = document.getElementById('travelc-dest-filter');
    var typeFilter = document.getElementById('travelc-type-filter');
    var sortSelect = document.getElementById('travelc-sort');
    var searchBtn = document.getElementById('travelc-search-btn');
    var countEl = document.getElementById('travelc-count');
    var list = document.getElementById('travelc-list');
    if (!list) return;

    function filterAndSort() {
        var query = (searchInput ? searchInput.value : '').toLowerCase();
        var dest = destFilter ? destFilter.value : '';
        var type = typeFilter ? typeFilter.value : '';
        var sort = sortSelect ? sortSelect.value : 'newest';
        var cards = Array.prototype.slice.call(list.querySelectorAll('.travelc-tcard'));
        var visible = 0;

        cards.forEach(function(card) {
            var title = card.getAttribute('data-title') || '';
            var countries = card.getAttribute('data-countries') || '';
            var destinations = card.getAttribute('data-destinations') || '';
            var categories = card.getAttribute('data-categories') || '';
            var matchSearch = !query || title.indexOf(query) !== -1 || countries.indexOf(query) !== -1 || destinations.indexOf(query) !== -1;
            var matchDest = !dest || countries.indexOf(dest) !== -1;
            var matchType = !type || categories.indexOf(type) !== -1;
            if (matchSearch && matchDest && matchType) {
                card.style.display = '';
                visible++;
            } else {
                card.style.display = 'none';
            }
        });

        var visibleCards = cards.filter(function(c) { return c.style.display !== 'none'; });
        visibleCards.sort(function(a, b) {
            if (sort === 'price-asc') return parseFloat(a.getAttribute('data-price') || 0) - parseFloat(b.getAttribute('data-price') || 0);
            if (sort === 'price-desc') return parseFloat(b.getAttribute('data-price') || 0) - parseFloat(a.getAttribute('data-price') || 0);
            if (sort === 'nights-asc') return parseInt(a.getAttribute('data-nights') || 0) - parseInt(b.getAttribute('data-nights') || 0);
            if (sort === 'nights-desc') return parseInt(b.getAttribute('data-nights') || 0) - parseInt(a.getAttribute('data-nights') || 0);
            return (b.getAttribute('data-date') || '').localeCompare(a.getAttribute('data-date') || '');
        });
        visibleCards.forEach(function(card) { list.appendChild(card); });

        if (countEl) countEl.textContent = visible;
    }

    if (searchBtn) searchBtn.addEventListener('click', filterAndSort);
    if (searchInput) searchInput.addEventListener('keyup', function(e) { if (e.key === 'Enter') filterAndSort(); });
    if (destFilter) destFilter.addEventListener('change', filterAndSort);
    if (typeFilter) typeFilter.addEventListener('change', filterAndSort);
    if (sortSelect) sortSelect.addEventListener('change', filterAndSort);

    // ============================================
    // Routekaart Sliding Panel
    // ============================================
    var panel = document.getElementById('travelc-routepanel');
    var overlay = document.getElementById('travelc-routepanel-overlay');
    var closeBtn = document.getElementById('travelc-routepanel-close');
    var panelMap = null;

    function openRoutePanel(destinations, title) {
        if (!panel || !window.L) return;
        panel.classList.add('is-open');
        overlay.classList.add('is-open');
        document.getElementById('travelc-routepanel-title').textContent = title || 'Routekaart';

        // Build stops list
        var stopsEl = document.getElementById('travelc-routepanel-stops');
        stopsEl.innerHTML = '';
        destinations.forEach(function(d, i) {
            var stop = document.createElement('div');
            stop.className = 'travelc-routepanel__stop';
            stop.innerHTML = '<span class="travelc-routepanel__stop-num">' + (i + 1) + '</span> ' + d.name;
            stopsEl.appendChild(stop);
        });

        // Init or reset map
        setTimeout(function() {
            var mapEl = document.getElementById('travelc-routepanel-map');
            if (panelMap) { panelMap.remove(); panelMap = null; }
            panelMap = L.map(mapEl);
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '&copy; OpenStreetMap'
            }).addTo(panelMap);

            var latlngs = [];
            destinations.forEach(function(d, i) {
                if (d.lat && d.lng) {
                    var ll = [d.lat, d.lng];
                    latlngs.push(ll);
                    var marker = L.marker(ll, {
                        icon: L.divIcon({
                            className: 'travelc-map-number',
                            html: '<span>' + (i + 1) + '</span>',
                            iconSize: [28, 28],
                            iconAnchor: [14, 14]
                        })
                    }).addTo(panelMap);
                    marker.bindPopup('<strong>' + d.name + '</strong>');
                }
            });

            if (latlngs.length > 1) {
                L.polyline(latlngs, { color: getComputedStyle(document.documentElement).getPropertyValue('--travelc-primary').trim() || '#2a9d8f', weight: 3, opacity: 0.7 }).addTo(panelMap);
            }
            if (latlngs.length > 0) {
                panelMap.fitBounds(latlngs, { padding: [30, 30] });
            }
        }, 100);
    }

    function closeRoutePanel() {
        if (panel) panel.classList.remove('is-open');
        if (overlay) overlay.classList.remove('is-open');
    }

    if (closeBtn) closeBtn.addEventListener('click', closeRoutePanel);
    if (overlay) overlay.addEventListener('click', closeRoutePanel);

    // Delegate click on routekaart buttons
    list.addEventListener('click', function(e) {
        var btn = e.target.closest('.travelc-tcard__routelink');
        if (!btn) return;
        e.preventDefault();
        try {
            var dests = JSON.parse(btn.getAttribute('data-destinations'));
            var title = btn.getAttribute('data-title') || 'Routekaart';
            openRoutePanel(dests, title);
        } catch(err) { console.error('Route parse error:', err); }
    });
})();
</script>
