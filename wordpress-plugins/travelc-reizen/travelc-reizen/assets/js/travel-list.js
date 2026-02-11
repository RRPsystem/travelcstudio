/**
 * TravelC Reizen - Travel List Page
 * Filter, sort, favorites, and routekaart panel logic.
 * v4.1.3
 */
(function() {
    var searchInput = document.getElementById('travelc-search');
    var destFilter = document.getElementById('travelc-dest-filter');
    var typeFilter = document.getElementById('travelc-type-filter');
    var sortSelect = document.getElementById('travelc-sort');
    var searchBtn = document.getElementById('travelc-search-btn');
    var favBtn = document.getElementById('travelc-fav-btn');
    var favCountEl = document.getElementById('travelc-fav-count');
    var countEl = document.getElementById('travelc-count');
    var list = document.getElementById('travelc-list');
    if (!list) return;

    var showFavOnly = false;
    var STORAGE_KEY = 'travelc_favorites';

    function getFavorites() {
        try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; }
        catch(e) { return []; }
    }
    function saveFavorites(favs) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(favs));
    }
    function updateFavCount() {
        var c = getFavorites().length;
        if (favCountEl) favCountEl.textContent = c > 0 ? c : '';
        if (favBtn) favBtn.classList.toggle('has-favs', c > 0);
    }

    // Active duration filter (set from hash param)
    var activeDagen = '';
    // Fallback: raw hash bestemming value (used when dropdown can't match)
    var hashBestemming = '';

    function matchDuration(nights, dagenRange) {
        if (!dagenRange) return true;
        var n = parseInt(nights) || 0;
        if (dagenRange === '1-7') return n >= 1 && n <= 7;
        if (dagenRange === '8-14') return n >= 8 && n <= 14;
        if (dagenRange === '15-21') return n >= 15 && n <= 21;
        if (dagenRange === '22+') return n >= 22;
        // Try custom range like "5-10"
        var parts = dagenRange.split('-');
        if (parts.length === 2) {
            var min = parseInt(parts[0]) || 0;
            var max = parseInt(parts[1]) || 999;
            return n >= min && n <= max;
        }
        return true;
    }

    // Normalize: strip diacritics for fuzzy matching
    function norm(s) { return s.normalize ? s.normalize('NFD').replace(/[\u0300-\u036f]/g, '') : s; }

    function filterAndSort() {
        var query = (searchInput ? searchInput.value : '').toLowerCase();
        var dest = destFilter ? destFilter.value.toLowerCase() : '';
        // Fallback: if dropdown is empty but we have a hash bestemming, use that
        if (!dest && hashBestemming) dest = hashBestemming;
        var type = typeFilter ? typeFilter.value.toLowerCase() : '';
        var sort = sortSelect ? sortSelect.value : 'newest';
        var favs = showFavOnly ? getFavorites() : [];
        var cards = Array.prototype.slice.call(list.querySelectorAll('.travelc-tcard'));
        var visible = 0;
        var normDest = norm(dest);
        var normType = norm(type);
        var normQuery = norm(query);

        cards.forEach(function(card) {
            var title = card.getAttribute('data-title') || '';
            var countries = card.getAttribute('data-countries') || '';
            var destinations = card.getAttribute('data-destinations') || '';
            var categories = card.getAttribute('data-categories') || '';
            var cardId = card.getAttribute('data-id') || '';
            var nights = card.getAttribute('data-nights') || '0';
            var normCountries = norm(countries);
            var normDestinations = norm(destinations);
            var normCategories = norm(categories);
            var normTitle = norm(title);
            var matchSearch = !query || normTitle.indexOf(normQuery) !== -1 || normCountries.indexOf(normQuery) !== -1 || normDestinations.indexOf(normQuery) !== -1;
            var matchDest = !dest || normCountries.indexOf(normDest) !== -1 || normDestinations.indexOf(normDest) !== -1;
            var matchType = !type || normCategories.indexOf(normType) !== -1;
            var matchFav = !showFavOnly || favs.indexOf(cardId) !== -1;
            var matchDagen = matchDuration(nights, activeDagen);
            if (matchSearch && matchDest && matchType && matchFav && matchDagen) {
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

    // Read hash params on page load (from search widget)
    function parseHash() {
        var hash = window.location.hash.replace('#', '');
        if (!hash) return {};
        var params = {};
        hash.split('&').forEach(function(part) {
            var kv = part.split('=');
            if (kv.length === 2) params[decodeURIComponent(kv[0])] = decodeURIComponent(kv[1]);
        });
        return params;
    }

    function updateHash() {
        var parts = [];
        if (destFilter && destFilter.value) parts.push('bestemming=' + encodeURIComponent(destFilter.value));
        if (typeFilter && typeFilter.value) parts.push('type=' + encodeURIComponent(typeFilter.value));
        if (searchInput && searchInput.value) parts.push('zoek=' + encodeURIComponent(searchInput.value));
        if (activeDagen) parts.push('dagen=' + encodeURIComponent(activeDagen));
        if (parts.length > 0) {
            history.replaceState(null, '', '#' + parts.join('&'));
        } else {
            history.replaceState(null, '', window.location.pathname);
        }
    }

    // Helper: set a <select> value, trying exact match first, then partial/contains match
    function setSelectValue(selectEl, val) {
        if (!selectEl || !val) return;
        var lowerVal = val.toLowerCase();
        // Try exact match first
        selectEl.value = lowerVal;
        if (selectEl.value === lowerVal) return;
        // Try finding option that contains the value or vice versa
        var options = selectEl.options;
        for (var i = 0; i < options.length; i++) {
            var optVal = options[i].value.toLowerCase();
            if (optVal && (optVal.indexOf(lowerVal) !== -1 || lowerVal.indexOf(optVal) !== -1)) {
                selectEl.value = options[i].value;
                return;
            }
        }
        // Try normalized comparison (strip diacritics)
        var normalize = function(s) { return s.normalize ? s.normalize('NFD').replace(/[\u0300-\u036f]/g, '') : s; };
        var normVal = normalize(lowerVal);
        for (var j = 0; j < options.length; j++) {
            var normOpt = normalize(options[j].value.toLowerCase());
            if (normOpt && (normOpt.indexOf(normVal) !== -1 || normVal.indexOf(normOpt) !== -1)) {
                selectEl.value = options[j].value;
                return;
            }
        }
        console.log('[TravelC] No matching option found for "' + val + '" in', selectEl.id);
    }

    // Apply hash params to filters on load
    var hashParams = parseHash();
    console.log('[TravelC v4.1.3] Hash params:', hashParams, 'hashBestemming var exists:', typeof hashBestemming);
    if (hashParams.bestemming && destFilter) {
        hashBestemming = hashParams.bestemming.toLowerCase();
        setSelectValue(destFilter, hashParams.bestemming);
        console.log('[TravelC] destFilter set to:', destFilter.value, '(hash:', hashBestemming, ')');
    }
    if (hashParams.type && typeFilter) {
        setSelectValue(typeFilter, hashParams.type);
        console.log('[TravelC] typeFilter set to:', typeFilter.value);
    }
    if (hashParams.zoek && searchInput) {
        searchInput.value = hashParams.zoek;
    }
    if (hashParams.dagen) {
        activeDagen = hashParams.dagen;
    }

    if (searchBtn) searchBtn.addEventListener('click', function() { filterAndSort(); updateHash(); });
    if (searchInput) searchInput.addEventListener('keyup', function(e) { if (e.key === 'Enter') { filterAndSort(); updateHash(); } });
    if (destFilter) destFilter.addEventListener('change', function() { hashBestemming = ''; filterAndSort(); updateHash(); });
    if (typeFilter) typeFilter.addEventListener('change', function() { filterAndSort(); updateHash(); });
    if (sortSelect) sortSelect.addEventListener('change', filterAndSort);

    // Auto-filter on load if hash params present
    if (Object.keys(hashParams).length > 0) {
        filterAndSort();
    }

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

        // Init or reset map — fills entire panel
        setTimeout(function() {
            var mapEl = document.getElementById('travelc-routepanel-map');
            if (panelMap) { panelMap.remove(); panelMap = null; }
            panelMap = L.map(mapEl, { zoomControl: true });
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '&copy; <a href="https://openstreetmap.org">OpenStreetMap</a>'
            }).addTo(panelMap);

            var primaryColor = getComputedStyle(document.documentElement).getPropertyValue('--travelc-primary').trim() || '#2a9d8f';
            var latlngs = [];
            destinations.forEach(function(d, i) {
                if (d.lat && d.lng) {
                    var ll = [d.lat, d.lng];
                    latlngs.push(ll);
                    var marker = L.marker(ll, {
                        icon: L.divIcon({
                            className: 'travelc-map-number',
                            html: '<span>' + (i + 1) + '</span>',
                            iconSize: [30, 30],
                            iconAnchor: [15, 15]
                        })
                    }).addTo(panelMap);
                    marker.bindPopup('<div style="text-align:center"><strong style="font-size:15px;">' + (i + 1) + '. ' + d.name + '</strong></div>');
                }
            });

            if (latlngs.length > 1) {
                L.polyline(latlngs, { color: primaryColor, weight: 3, opacity: 0.8, dashArray: '8 6' }).addTo(panelMap);
            }
            if (latlngs.length > 0) {
                panelMap.fitBounds(latlngs, { padding: [40, 40] });
            }
        }, 150);
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

    // ============================================
    // Favorites (heart) — toggle + filter
    // ============================================
    function toggleFavorite(id) {
        var favs = getFavorites();
        var idx = favs.indexOf(id);
        if (idx === -1) { favs.push(id); } else { favs.splice(idx, 1); }
        saveFavorites(favs);
        updateFavCount();
        return idx === -1;
    }

    // Init: mark saved favorites + update count
    function initFavorites() {
        var favs = getFavorites();
        var cards = list.querySelectorAll('.travelc-tcard');
        cards.forEach(function(card) {
            var id = card.getAttribute('data-id');
            var heart = card.querySelector('.travelc-tcard__heart');
            if (heart && id && favs.indexOf(id) !== -1) {
                heart.classList.add('is-liked');
            }
        });
        updateFavCount();
    }
    initFavorites();

    // Fav filter button toggle
    if (favBtn) {
        favBtn.addEventListener('click', function() {
            showFavOnly = !showFavOnly;
            favBtn.classList.toggle('is-active', showFavOnly);
            filterAndSort();
        });
    }

    // Heart click handler
    list.addEventListener('click', function(e) {
        var heart = e.target.closest('.travelc-tcard__heart');
        if (!heart) return;
        e.preventDefault();
        e.stopPropagation();
        var card = heart.closest('.travelc-tcard');
        if (!card) return;
        var id = card.getAttribute('data-id');
        if (!id) return;
        var isNowLiked = toggleFavorite(id);
        if (isNowLiked) {
            heart.classList.add('is-liked');
        } else {
            heart.classList.remove('is-liked');
        }
        // If showing favs only and we just un-liked, re-filter
        if (showFavOnly) filterAndSort();
    });
})();
