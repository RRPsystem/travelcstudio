<?php
if (!defined('ABSPATH')) exit;

/**
 * Gallery Shortcode
 * Usage: [travelc_gallery slug="peru" mode="carousel" columns="4" height="250" radius="20" gap="15"]
 * 
 * Parameters:
 * - slug: destination slug (required)
 * - mode: display mode - "carousel" (auto-rotate, 1 row) or "grid" (default: grid)
 * - columns: number of columns/visible items (default: 4)
 * - height: image height in pixels (default: 250)
 * - radius: border radius in pixels (default: 20)
 * - gap: gap between images in pixels (default: 15)
 * - max: maximum number of images to show (default: 8 for grid, all for carousel)
 * - speed: auto-rotate speed in ms for carousel (default: 4000)
 * - color: accent color for navigation arrows (default: #f5a623)
 */
function tcc_gallery_shortcode($atts) {
    $atts = shortcode_atts(array(
        'slug' => '',
        'mode' => 'grid',
        'columns' => 4,
        'height' => 250,
        'radius' => 20,
        'gap' => 15,
        'max' => 0,
        'speed' => 4000,
        'color' => '#f5a623',
    ), $atts);
    
    // Get destination data
    $destination = tcc_get_destination_data($atts['slug']);
    
    if (!$destination) {
        return '<p>Bestemming niet gevonden.</p>';
    }
    
    // Get featured image to exclude from gallery (avoid duplicates)
    $featured_image = !empty($destination['featured_image']) ? $destination['featured_image'] : '';
    
    // Collect all images from various sources (excluding featured image)
    $images = [];
    
    // Images array (main gallery field - "Foto Galerij" in TravelCStudio)
    if (!empty($destination['images'])) {
        $gallery_images = $destination['images'];
        if (is_string($gallery_images)) {
            $gallery_images = json_decode($gallery_images, true) ?: [];
        }
        if (is_array($gallery_images)) {
            foreach ($gallery_images as $img) {
                if (is_string($img) && !empty($img)) {
                    $images[] = $img;
                } elseif (is_array($img) && !empty($img['url'])) {
                    $images[] = $img['url'];
                }
            }
        }
    }
    
    // Photos array (legacy/alternative field)
    if (!empty($destination['photos'])) {
        $photos = $destination['photos'];
        if (is_string($photos)) {
            $photos = json_decode($photos, true) ?: [];
        }
        if (is_array($photos)) {
            foreach ($photos as $photo) {
                if (is_string($photo) && !empty($photo)) {
                    $images[] = $photo;
                } elseif (is_array($photo) && !empty($photo['url'])) {
                    $images[] = $photo['url'];
                }
            }
        }
    }
    
    // Gallery field (alternative name)
    if (!empty($destination['gallery'])) {
        $gallery = $destination['gallery'];
        if (is_string($gallery)) {
            $gallery = json_decode($gallery, true) ?: [];
        }
        if (is_array($gallery)) {
            foreach ($gallery as $photo) {
                if (is_string($photo) && !empty($photo)) {
                    $images[] = $photo;
                } elseif (is_array($photo) && !empty($photo['url'])) {
                    $images[] = $photo['url'];
                }
            }
        }
    }
    
    // Highlight images
    if (!empty($destination['highlights'])) {
        $highlights = $destination['highlights'];
        if (is_string($highlights)) {
            $highlights = json_decode($highlights, true) ?: [];
        }
        if (is_array($highlights)) {
            foreach ($highlights as $highlight) {
                if (!empty($highlight['image'])) {
                    $images[] = $highlight['image'];
                }
            }
        }
    }
    
    // City images
    if (!empty($destination['cities'])) {
        $cities = $destination['cities'];
        if (is_string($cities)) {
            $cities = json_decode($cities, true) ?: [];
        }
        if (is_array($cities)) {
            foreach ($cities as $city) {
                if (!empty($city['image'])) {
                    $images[] = $city['image'];
                }
            }
        }
    }
    
    // Region images
    if (!empty($destination['regions'])) {
        $regions = $destination['regions'];
        if (is_string($regions)) {
            $regions = json_decode($regions, true) ?: [];
        }
        if (is_array($regions)) {
            foreach ($regions as $region) {
                if (!empty($region['image'])) {
                    $images[] = $region['image'];
                }
            }
        }
    }
    
    // Remove duplicates and featured image
    $images = array_unique($images);
    if (!empty($featured_image)) {
        $images = array_filter($images, function($img) use ($featured_image) {
            return $img !== $featured_image;
        });
        $images = array_values($images); // Re-index
    }
    
    // Set default max based on mode
    $mode = $atts['mode'];
    $max = intval($atts['max']);
    if ($max === 0) {
        $max = ($mode === 'grid') ? 8 : 0; // 8 for grid, unlimited for carousel
    }
    
    // Limit if max is set
    if ($max > 0) {
        $images = array_slice($images, 0, $max);
    }
    
    if (empty($images)) {
        return '<p>Geen afbeeldingen gevonden.</p>';
    }
    
    $columns = intval($atts['columns']);
    $height = intval($atts['height']);
    $radius = intval($atts['radius']);
    $gap = intval($atts['gap']);
    $speed = intval($atts['speed']);
    $color = esc_attr($atts['color']);
    $unique_id = 'tcc-gallery-' . uniqid();
    $is_carousel = ($mode === 'carousel');
    
    ob_start();
    
    if ($is_carousel):
    // CAROUSEL MODE
    ?>
    <style>
        #<?php echo $unique_id; ?>-wrapper {
            position: relative;
            padding: 0 50px;
        }
        #<?php echo $unique_id; ?> {
            display: flex;
            gap: <?php echo $gap; ?>px;
            overflow: hidden;
            scroll-behavior: smooth;
        }
        #<?php echo $unique_id; ?> .tcc-gallery-item {
            flex: 0 0 calc(<?php echo 100 / $columns; ?>% - <?php echo $gap * ($columns - 1) / $columns; ?>px);
            min-width: 200px;
            height: <?php echo $height; ?>px;
            border-radius: <?php echo $radius; ?>px;
            overflow: hidden;
            cursor: pointer;
            position: relative;
        }
        #<?php echo $unique_id; ?> .tcc-gallery-item img {
            width: 100%;
            height: 100%;
            object-fit: cover;
            transition: transform 0.4s ease;
        }
        #<?php echo $unique_id; ?> .tcc-gallery-item:hover img {
            transform: scale(1.08);
        }
        /* Navigation arrows */
        #<?php echo $unique_id; ?>-wrapper .tcc-gallery-nav {
            position: absolute;
            top: 50%;
            transform: translateY(-50%);
            width: 45px;
            height: 45px;
            background: <?php echo $color; ?>;
            border: none;
            border-radius: 50%;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 4px 15px rgba(0,0,0,0.2);
            transition: all 0.3s ease;
            z-index: 10;
        }
        #<?php echo $unique_id; ?>-wrapper .tcc-gallery-nav:hover {
            transform: translateY(-50%) scale(1.1);
            box-shadow: 0 6px 20px rgba(0,0,0,0.3);
        }
        #<?php echo $unique_id; ?>-wrapper .tcc-gallery-nav svg {
            width: 20px;
            height: 20px;
            fill: #fff;
        }
        #<?php echo $unique_id; ?>-wrapper .tcc-gallery-prev { left: 0; }
        #<?php echo $unique_id; ?>-wrapper .tcc-gallery-next { right: 0; }
        /* Lightbox */
        #<?php echo $unique_id; ?>-lightbox {
            display: none;
            position: fixed;
            top: 0; left: 0; right: 0; bottom: 0;
            background: rgba(0,0,0,0.9);
            z-index: 99999;
            align-items: center;
            justify-content: center;
        }
        #<?php echo $unique_id; ?>-lightbox.active { display: flex; }
        #<?php echo $unique_id; ?>-lightbox img {
            max-width: 90%;
            max-height: 90vh;
            border-radius: <?php echo $radius; ?>px;
        }
        #<?php echo $unique_id; ?>-lightbox .tcc-lightbox-close {
            position: absolute;
            top: 20px; right: 30px;
            font-size: 40px;
            color: #fff;
            cursor: pointer;
        }
        #<?php echo $unique_id; ?>-lightbox .tcc-lightbox-nav {
            position: absolute;
            top: 50%;
            transform: translateY(-50%);
            width: 50px; height: 50px;
            background: rgba(255,255,255,0.2);
            border: none;
            border-radius: 50%;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        #<?php echo $unique_id; ?>-lightbox .tcc-lightbox-nav:hover { background: rgba(255,255,255,0.4); }
        #<?php echo $unique_id; ?>-lightbox .tcc-lightbox-nav svg { width: 24px; height: 24px; fill: #fff; }
        #<?php echo $unique_id; ?>-lightbox .tcc-lightbox-prev { left: 20px; }
        #<?php echo $unique_id; ?>-lightbox .tcc-lightbox-next { right: 20px; }
        @media (max-width: 768px) {
            #<?php echo $unique_id; ?> .tcc-gallery-item {
                flex: 0 0 calc(50% - <?php echo $gap / 2; ?>px);
            }
            #<?php echo $unique_id; ?>-wrapper { padding: 0 40px; }
        }
        @media (max-width: 480px) {
            #<?php echo $unique_id; ?> .tcc-gallery-item {
                flex: 0 0 100%;
                height: 200px;
            }
        }
    </style>
    
    <div id="<?php echo $unique_id; ?>-wrapper" class="tcc-gallery-wrapper">
        <button class="tcc-gallery-nav tcc-gallery-prev" onclick="tccGallerySlide('<?php echo $unique_id; ?>', -1)" aria-label="Vorige">
            <svg viewBox="0 0 24 24"><path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/></svg>
        </button>
        
        <div id="<?php echo $unique_id; ?>" class="tcc-gallery tcc-gallery-carousel">
            <?php foreach ($images as $index => $image): ?>
                <div class="tcc-gallery-item" onclick="tccOpenLightbox('<?php echo $unique_id; ?>', <?php echo $index; ?>)">
                    <img src="<?php echo esc_url($image); ?>" alt="Foto <?php echo $index + 1; ?>" loading="lazy">
                </div>
            <?php endforeach; ?>
        </div>
        
        <button class="tcc-gallery-nav tcc-gallery-next" onclick="tccGallerySlide('<?php echo $unique_id; ?>', 1)" aria-label="Volgende">
            <svg viewBox="0 0 24 24"><path d="M8.59 16.59L10 18l6-6-6-6-1.41 1.41L13.17 12z"/></svg>
        </button>
    </div>
    
    <!-- Lightbox -->
    <div id="<?php echo $unique_id; ?>-lightbox" class="tcc-lightbox" onclick="tccCloseLightbox('<?php echo $unique_id; ?>')">
        <span class="tcc-lightbox-close">&times;</span>
        <button class="tcc-lightbox-nav tcc-lightbox-prev" onclick="event.stopPropagation(); tccLightboxNav('<?php echo $unique_id; ?>', -1)">
            <svg viewBox="0 0 24 24"><path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/></svg>
        </button>
        <img src="" alt="Lightbox">
        <button class="tcc-lightbox-nav tcc-lightbox-next" onclick="event.stopPropagation(); tccLightboxNav('<?php echo $unique_id; ?>', 1)">
            <svg viewBox="0 0 24 24"><path d="M8.59 16.59L10 18l6-6-6-6-1.41 1.41L13.17 12z"/></svg>
        </button>
    </div>
    
    <script>
    (function() {
        window.tccGalleryImages = window.tccGalleryImages || {};
        window.tccGalleryImages['<?php echo $unique_id; ?>'] = <?php echo json_encode(array_values($images)); ?>;
        window.tccGalleryIndex = window.tccGalleryIndex || {};
        window.tccGalleryIndex['<?php echo $unique_id; ?>'] = 0;
        
        // Auto-rotate carousel
        var carousel = document.getElementById('<?php echo $unique_id; ?>');
        var autoSlide = setInterval(function() {
            tccGallerySlide('<?php echo $unique_id; ?>', 1);
        }, <?php echo $speed; ?>);
        
        // Pause on hover
        carousel.addEventListener('mouseenter', function() { clearInterval(autoSlide); });
        carousel.addEventListener('mouseleave', function() {
            autoSlide = setInterval(function() {
                tccGallerySlide('<?php echo $unique_id; ?>', 1);
            }, <?php echo $speed; ?>);
        });
    })();
    
    function tccGallerySlide(id, direction) {
        var carousel = document.getElementById(id);
        var item = carousel.querySelector('.tcc-gallery-item');
        if (!item) return;
        var itemWidth = item.offsetWidth + <?php echo $gap; ?>;
        carousel.scrollBy({ left: direction * itemWidth, behavior: 'smooth' });
        
        // Loop: if at end, scroll to start
        setTimeout(function() {
            if (direction > 0 && carousel.scrollLeft >= carousel.scrollWidth - carousel.clientWidth - 10) {
                carousel.scrollTo({ left: 0, behavior: 'smooth' });
            } else if (direction < 0 && carousel.scrollLeft <= 10) {
                carousel.scrollTo({ left: carousel.scrollWidth, behavior: 'smooth' });
            }
        }, 400);
    }
    </script>
    <?php
    else:
    // GRID MODE
    ?>
    <style>
        #<?php echo $unique_id; ?> {
            display: grid;
            grid-template-columns: repeat(<?php echo $columns; ?>, 1fr);
            gap: <?php echo $gap; ?>px;
            width: 100%;
        }
        #<?php echo $unique_id; ?> .tcc-gallery-item {
            position: relative;
            height: <?php echo $height; ?>px;
            border-radius: <?php echo $radius; ?>px;
            overflow: hidden;
            cursor: pointer;
        }
        #<?php echo $unique_id; ?> .tcc-gallery-item img {
            width: 100%;
            height: 100%;
            object-fit: cover;
            transition: transform 0.4s ease;
        }
        #<?php echo $unique_id; ?> .tcc-gallery-item:hover img {
            transform: scale(1.08);
        }
        /* Lightbox */
        #<?php echo $unique_id; ?>-lightbox {
            display: none;
            position: fixed;
            top: 0; left: 0; right: 0; bottom: 0;
            background: rgba(0,0,0,0.9);
            z-index: 99999;
            align-items: center;
            justify-content: center;
        }
        #<?php echo $unique_id; ?>-lightbox.active { display: flex; }
        #<?php echo $unique_id; ?>-lightbox img {
            max-width: 90%;
            max-height: 90vh;
            border-radius: <?php echo $radius; ?>px;
        }
        #<?php echo $unique_id; ?>-lightbox .tcc-lightbox-close {
            position: absolute;
            top: 20px; right: 30px;
            font-size: 40px;
            color: #fff;
            cursor: pointer;
        }
        #<?php echo $unique_id; ?>-lightbox .tcc-lightbox-nav {
            position: absolute;
            top: 50%;
            transform: translateY(-50%);
            width: 50px; height: 50px;
            background: rgba(255,255,255,0.2);
            border: none;
            border-radius: 50%;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        #<?php echo $unique_id; ?>-lightbox .tcc-lightbox-nav:hover { background: rgba(255,255,255,0.4); }
        #<?php echo $unique_id; ?>-lightbox .tcc-lightbox-nav svg { width: 24px; height: 24px; fill: #fff; }
        #<?php echo $unique_id; ?>-lightbox .tcc-lightbox-prev { left: 20px; }
        #<?php echo $unique_id; ?>-lightbox .tcc-lightbox-next { right: 20px; }
        @media (max-width: 1024px) {
            #<?php echo $unique_id; ?> { grid-template-columns: repeat(2, 1fr); }
        }
        @media (max-width: 600px) {
            #<?php echo $unique_id; ?> { grid-template-columns: 1fr; }
            #<?php echo $unique_id; ?> .tcc-gallery-item { height: 200px; }
        }
    </style>
    
    <div id="<?php echo $unique_id; ?>" class="tcc-gallery tcc-gallery-grid">
        <?php foreach ($images as $index => $image): ?>
            <div class="tcc-gallery-item" onclick="tccOpenLightbox('<?php echo $unique_id; ?>', <?php echo $index; ?>)">
                <img src="<?php echo esc_url($image); ?>" alt="Foto <?php echo $index + 1; ?>" loading="lazy">
            </div>
        <?php endforeach; ?>
    </div>
    
    <!-- Lightbox -->
    <div id="<?php echo $unique_id; ?>-lightbox" class="tcc-lightbox" onclick="tccCloseLightbox('<?php echo $unique_id; ?>')">
        <span class="tcc-lightbox-close">&times;</span>
        <button class="tcc-lightbox-nav tcc-lightbox-prev" onclick="event.stopPropagation(); tccLightboxNav('<?php echo $unique_id; ?>', -1)">
            <svg viewBox="0 0 24 24"><path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/></svg>
        </button>
        <img src="" alt="Lightbox">
        <button class="tcc-lightbox-nav tcc-lightbox-next" onclick="event.stopPropagation(); tccLightboxNav('<?php echo $unique_id; ?>', 1)">
            <svg viewBox="0 0 24 24"><path d="M8.59 16.59L10 18l6-6-6-6-1.41 1.41L13.17 12z"/></svg>
        </button>
    </div>
    
    <script>
    (function() {
        window.tccGalleryImages = window.tccGalleryImages || {};
        window.tccGalleryImages['<?php echo $unique_id; ?>'] = <?php echo json_encode(array_values($images)); ?>;
        window.tccGalleryIndex = window.tccGalleryIndex || {};
        window.tccGalleryIndex['<?php echo $unique_id; ?>'] = 0;
    })();
    </script>
    <?php
    endif;
    ?>
    
    <script>
    function tccOpenLightbox(id, index) {
        var lightbox = document.getElementById(id + '-lightbox');
        var images = window.tccGalleryImages[id];
        window.tccGalleryIndex[id] = index;
        lightbox.querySelector('img').src = images[index];
        lightbox.classList.add('active');
        document.body.style.overflow = 'hidden';
    }
    
    function tccCloseLightbox(id) {
        var lightbox = document.getElementById(id + '-lightbox');
        lightbox.classList.remove('active');
        document.body.style.overflow = '';
    }
    
    function tccLightboxNav(id, direction) {
        var images = window.tccGalleryImages[id];
        var index = window.tccGalleryIndex[id] + direction;
        if (index < 0) index = images.length - 1;
        if (index >= images.length) index = 0;
        window.tccGalleryIndex[id] = index;
        var lightbox = document.getElementById(id + '-lightbox');
        lightbox.querySelector('img').src = images[index];
    }
    
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            document.querySelectorAll('.tcc-lightbox.active').forEach(function(lb) {
                lb.classList.remove('active');
            });
            document.body.style.overflow = '';
        }
    });
    </script>
    <?php
    return ob_get_clean();
}
add_shortcode('travelc_gallery', 'tcc_gallery_shortcode');
