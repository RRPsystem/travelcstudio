"use strict";

/**
 * TravelC Reizen - Route Map (Leaflet/OpenStreetMap)
 * Renders a map with numbered markers and polyline route
 * Uses pre-geocoded coordinates from the API (no client-side geocoding needed)
 */

document.addEventListener('DOMContentLoaded', function() {
    if (typeof travelcMapDestinations === 'undefined' || !travelcMapDestinations || travelcMapDestinations.length < 2) {
        return;
    }

    var mapEl = document.getElementById('travelc-routemap');
    if (!mapEl) return;

    // Initialize map
    var firstDest = travelcMapDestinations[0];
    var map = L.map('travelc-routemap').setView([firstDest.lat, firstDest.lng], 6);

    // OpenStreetMap tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    // Add numbered markers
    var markerGroup = L.featureGroup();
    var latlngs = [];

    travelcMapDestinations.forEach(function(dest, idx) {
        var icon = L.divIcon({
            html: '<div class="travelc-numbered-marker">' + (idx + 1) + '</div>',
            className: '',
            iconSize: [30, 30],
            iconAnchor: [15, 15]
        });

        var marker = L.marker([dest.lat, dest.lng], { icon: icon });

        // Build popup
        var popup = '<div style="max-width:220px">';
        popup += '<h3 style="margin:0 0 4px;font-size:14px;font-weight:600">' + dest.name + '</h3>';
        if (dest.nights > 0) {
            popup += '<div style="font-size:12px;color:#666;margin-bottom:4px">' + dest.nights + ' nachten</div>';
        }
        if (dest.image) {
            popup += '<img src="' + dest.image + '" style="width:100%;max-height:100px;object-fit:cover;border-radius:6px;margin-bottom:4px" />';
        }
        if (dest.description) {
            popup += '<p style="font-size:12px;color:#555;margin:0">' + dest.description + '</p>';
        }
        popup += '</div>';

        marker.bindPopup(popup);
        marker.addTo(markerGroup);
        latlngs.push([dest.lat, dest.lng]);
    });

    markerGroup.addTo(map);

    // Add polyline route
    if (latlngs.length >= 2) {
        L.polyline(latlngs, { color: '#2A81CB', weight: 3, opacity: 0.7 }).addTo(map);
    }

    // Fit bounds to show all markers
    map.fitBounds(markerGroup.getBounds(), { padding: [30, 30] });
});
