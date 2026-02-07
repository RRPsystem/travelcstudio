<?php if (!defined('ABSPATH')) exit;

$travels = $result['travels'] ?? [];
$total = count($travels);

// Collect unique destinations for filter dropdown
$all_destinations = [];
foreach ($travels as $t) {
    foreach (($t['country_list'] ?? []) as $c) {
        $all_destinations[$c] = true;
    }
}
ksort($all_destinations);
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
    ?>
    <div class="travelc-tcard" 
         data-title="<?php echo esc_attr(strtolower($title)); ?>"
         data-countries="<?php echo esc_attr(strtolower(implode(',', $countries))); ?>"
         data-destinations="<?php echo esc_attr(strtolower(implode(',', $dest_names))); ?>"
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
            <?php if ($travel['is_featured'] ?? false): ?>
                <span class="travelc-tcard__badge">Aanbevolen</span>
            <?php endif; ?>
        </a>

        <!-- Info -->
        <div class="travelc-tcard__info">
            <a href="<?php echo esc_url($detail_url); ?>" class="travelc-tcard__title-link">
                <h3 class="travelc-tcard__title"><?php echo esc_html($title); ?></h3>
            </a>
            <?php if (!empty($dest_names)): ?>
                <div class="travelc-tcard__destinations">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                    <?php echo esc_html(implode(' · ', array_slice($dest_names, 0, 6))); ?>
                    <?php if (!empty($travel['route_map_url'])): ?>
                        <a href="<?php echo esc_url($detail_url); ?>" class="travelc-tcard__routelink">Routekaart</a>
                    <?php endif; ?>
                </div>
            <?php endif; ?>

            <?php if (!empty($travel['intro_text'])): ?>
                <p class="travelc-tcard__excerpt"><?php echo esc_html(wp_trim_words(strip_tags($travel['intro_text']), 25)); ?></p>
            <?php endif; ?>

            <div class="travelc-tcard__meta">
                <?php if ($nights > 0): ?>
                    <span class="travelc-tcard__meta-item" title="Nachten">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                        <?php echo esc_html($nights); ?> nachten
                    </span>
                <?php endif; ?>
                <?php if ($dest_count > 0): ?>
                    <span class="travelc-tcard__meta-item" title="Bestemmingen">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                        <?php echo esc_html($dest_count); ?>
                    </span>
                <?php endif; ?>
                <?php if ($hotel_count > 0): ?>
                    <span class="travelc-tcard__meta-item" title="Hotels">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 21h18M3 7v1a3 3 0 0 0 6 0V7m0 1a3 3 0 0 0 6 0V7m0 1a3 3 0 0 0 6 0V7H3l2-4h14l2 4"/></svg>
                        <?php echo esc_html($hotel_count); ?>
                    </span>
                <?php endif; ?>
            </div>

            <?php if (!empty($countries)): ?>
                <div class="travelc-tcard__countries"><?php echo esc_html(implode(', ', $countries)); ?></div>
            <?php endif; ?>
        </div>

        <!-- Price Block -->
        <div class="travelc-tcard__price-block">
            <?php if ($price > 0 && ($travel['show_prices'] ?? true)): ?>
                <span class="travelc-tcard__price-type">Autorondreis</span>
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

<script>
(function() {
    var searchInput = document.getElementById('travelc-search');
    var destFilter = document.getElementById('travelc-dest-filter');
    var sortSelect = document.getElementById('travelc-sort');
    var searchBtn = document.getElementById('travelc-search-btn');
    var countEl = document.getElementById('travelc-count');
    var list = document.getElementById('travelc-list');
    if (!list) return;

    function filterAndSort() {
        var query = (searchInput ? searchInput.value : '').toLowerCase();
        var dest = destFilter ? destFilter.value : '';
        var sort = sortSelect ? sortSelect.value : 'newest';
        var cards = Array.prototype.slice.call(list.querySelectorAll('.travelc-tcard'));
        var visible = 0;

        cards.forEach(function(card) {
            var title = card.getAttribute('data-title') || '';
            var countries = card.getAttribute('data-countries') || '';
            var destinations = card.getAttribute('data-destinations') || '';
            var matchSearch = !query || title.indexOf(query) !== -1 || countries.indexOf(query) !== -1 || destinations.indexOf(query) !== -1;
            var matchDest = !dest || countries.indexOf(dest) !== -1;
            if (matchSearch && matchDest) {
                card.style.display = '';
                visible++;
            } else {
                card.style.display = 'none';
            }
        });

        // Sort visible cards
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
    if (sortSelect) sortSelect.addEventListener('change', filterAndSort);
})();
</script>
