/**
 * TravelC Reizen - Travel Detail Page v2
 * External JS file to avoid WordPress minifier issues with inline scripts.
 * Reads data from hidden DOM elements (#tc2DataPanel, #tc2DataMap, #tc2DataConfig).
 */
(function() {
    "use strict";

    // ============================================
    // DATA FROM DOM (parsed after DOM ready)
    // ============================================
    var panelData = {};
    var mapDests = [];
    var primaryColor = '#2a9d8f';
    var travelTitle = '';
    var dataParsed = false;

    function parseDataFromDOM() {
        if (dataParsed) return;
        dataParsed = true;
        try {
            var panelEl = document.getElementById('tc2DataPanel');
            if (panelEl) panelData = JSON.parse(panelEl.textContent);
        } catch(e) { console.error('[TC2] panelData parse error:', e); }

        try {
            var mapEl = document.getElementById('tc2DataMap');
            if (mapEl) mapDests = JSON.parse(mapEl.textContent);
        } catch(e) { console.error('[TC2] mapDests parse error:', e); }

        try {
            var cfgEl = document.getElementById('tc2DataConfig');
            if (cfgEl) {
                var cfg = JSON.parse(cfgEl.textContent);
                primaryColor = cfg.primaryColor || primaryColor;
                travelTitle = cfg.travelTitle || '';
            }
        } catch(e) {}
    }

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
        parseDataFromDOM();
        var el = document.getElementById('tc2RouteMap');
        if (!el || !mapDests || mapDests.length < 2 || typeof L === 'undefined') return;
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
            if (bounds.length > 1) L.polyline(bounds, { color: primaryColor, weight: 3, opacity: 0.6, dashArray: '8,8' }).addTo(map);
            if (bounds.length > 0) map.fitBounds(bounds, { padding: [40, 40] });
            setTimeout(function() { map.invalidateSize(); }, 300);
            setTimeout(function() { map.invalidateSize(); }, 1000);
        } catch(e) {
            console.error('[TC2 Map] Error:', e);
        }
    }

    // ============================================
    // DETAIL PANEL (sliding)
    // ============================================
    var panelMapInstance = null;

    function panelIcon(name) {
        var m = {
            'info': '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>',
            'globe': '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/></svg>',
            'moon': '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>',
            'star': '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="1"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>',
            'utensils': '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/><path d="M7 2v20"/><path d="M21 15V2v0a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7"/></svg>',
            'map-pin': '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>',
            'shield-check': '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10"/><path d="m9 12 2 2 4-4"/></svg>'
        };
        return m[name] || '';
    }

    function infoRow(icon, label, value) {
        return '<div class="tc2-panel-info-row">' + panelIcon(icon) + '<span class="tc2-panel-info-label">' + label + '</span><span class="tc2-panel-info-value">' + value + '</span></div>';
    }

    window.tc2ShowPanel = function(dataId) {
        parseDataFromDOM();
        var data = panelData[dataId];
        if (!data) { console.error('[TC2 Panel] No data for:', dataId, Object.keys(panelData)); return; }
        var title = data.name || 'Details';
        var html = '';
        var images = data.images || [];
        if (images.length > 0) {
            html += '<div class="tc2-panel-gallery">';
            images.slice(0, 5).forEach(function(img, idx) {
                if (img) html += '<img src="' + img + '" alt="" onclick="tc2OpenLightbox(' + JSON.stringify(images).replace(/"/g, '&quot;') + ', ' + idx + ')">';
            });
            html += '</div>';
        }
        if (data.description) {
            html += '<div class="tc2-panel-section"><h3>' + panelIcon('info') + ' Beschrijving</h3><p>' + data.description + '</p></div>';
        }
        html += '<div class="tc2-panel-section"><div class="tc2-panel-info">';
        if (data.country) html += infoRow('globe', 'Land', data.country);
        if (data.nights) html += infoRow('moon', 'Nachten', data.nights);
        if (data.category) html += infoRow('star', 'Categorie', data.category);
        if (data.mealPlan) html += infoRow('utensils', 'Maaltijden', data.mealPlan);
        if (data.address) html += infoRow('map-pin', 'Adres', data.address);
        html += '</div></div>';
        if (data.facilities && data.facilities.length > 0) {
            html += '<div class="tc2-panel-section"><h3>' + panelIcon('shield-check') + ' Faciliteiten</h3><div class="tc2-panel-facilities">';
            data.facilities.forEach(function(f) { html += '<span class="tc2-panel-facility">' + f + '</span>'; });
            html += '</div></div>';
        }
        if (data.geolocation && data.geolocation.latitude && data.geolocation.longitude) {
            html += '<div class="tc2-panel-section"><h3>' + panelIcon('map-pin') + ' Locatie</h3><div class="tc2-panel-map" id="tc2PanelMap"></div></div>';
        }
        document.getElementById('tc2PanelTitle').textContent = title;
        document.getElementById('tc2PanelBody').innerHTML = html;
        document.getElementById('tc2PanelOverlay').style.display = 'block';
        setTimeout(function() {
            document.getElementById('tc2PanelOverlay').classList.add('active');
            document.getElementById('tc2Panel').classList.add('active');
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

    // ============================================
    // PHOTO LIGHTBOX
    // ============================================
    var lbImages = [], lbIdx = 0;

    window.tc2OpenLightbox = function(images, startIdx) {
        lbImages = images; lbIdx = startIdx || 0; showLb();
        document.getElementById('tc2Lightbox').classList.add('active');
        document.body.style.overflow = 'hidden';
    };
    window.tc2CloseLightbox = function() {
        document.getElementById('tc2Lightbox').classList.remove('active');
        document.body.style.overflow = '';
    };
    window.tc2NextPhoto = function() { lbIdx = (lbIdx + 1) % lbImages.length; showLb(); };
    window.tc2PrevPhoto = function() { lbIdx = (lbIdx - 1 + lbImages.length) % lbImages.length; showLb(); };

    function showLb() {
        document.getElementById('tc2LightboxImg').src = lbImages[lbIdx];
        document.getElementById('tc2LightboxCounter').textContent = (lbIdx + 1) + ' / ' + lbImages.length;
    }

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
        var starBoxes = document.querySelectorAll('input[name="tc2Stars"]:checked');
        var stars = []; starBoxes.forEach(function(cb) { stars.push(cb.value); });
        if (!name || !email) {
            result.className = 'tc2-form-result error';
            result.textContent = 'Vul je naam en e-mailadres in.';
            return;
        }
        result.className = 'tc2-form-result success';
        result.textContent = type === 'quote'
            ? 'Bedankt! Je offerte-aanvraag is verzonden. We nemen zo snel mogelijk contact op.'
            : 'Bedankt! Je informatie-aanvraag is verzonden.';
        console.log('[TravelC Quote]', { type: type, name: name, email: email, phone: phone, date: date, persons: persons, stars: stars.join(','), message: message, travel: travelTitle });
    };

    // ============================================
    // KEYBOARD NAVIGATION
    // ============================================
    document.addEventListener('keydown', function(e) {
        var lb = document.getElementById('tc2Lightbox');
        if (lb && lb.classList.contains('active')) {
            if (e.key === 'Escape') window.tc2CloseLightbox();
            if (e.key === 'ArrowRight') window.tc2NextPhoto();
            if (e.key === 'ArrowLeft') window.tc2PrevPhoto();
        }
        var panel = document.getElementById('tc2Panel');
        if (panel && panel.classList.contains('active') && e.key === 'Escape') {
            window.tc2ClosePanel();
        }
    });

    // ============================================
    // INIT — wait for Leaflet
    // ============================================
    function waitForLeaflet(cb, max) {
        var w = 0;
        var iv = setInterval(function() {
            w += 100;
            if (typeof L !== 'undefined') { clearInterval(iv); cb(); }
            else if (w >= (max || 5000)) { clearInterval(iv); }
        }, 100);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() { parseDataFromDOM(); waitForLeaflet(initRouteMap); });
    } else {
        parseDataFromDOM();
        waitForLeaflet(initRouteMap);
    }
})();
