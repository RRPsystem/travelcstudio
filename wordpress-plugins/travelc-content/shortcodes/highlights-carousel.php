<?php
if (!defined('ABSPATH')) exit;

/**
 * Highlights Carousel Shortcode
 * Usage: [travelc_highlights_carousel slug="griekenland" color="#f5a623" columns="4" height="280"]
 * 
 * Parameters:
 * - slug: destination slug (required)
 * - color: accent color for icon and hover overlay (default: #f5a623)
 * - columns: number of columns visible at once (default: 4)
 * - height: image height in pixels (default: 280)
 * - show_icon: show star icon (default: true)
 * - skew: enable diagonal/skewed corners (default: true)
 * - arrows: show navigation arrows (default: true)
 */
function tcc_highlights_carousel_shortcode($atts) {
    $atts = shortcode_atts(array(
        'slug' => '',
        'color' => '#f5a623',
        'columns' => 4,
        'height' => 280,
        'show_icon' => 'false',
        'skew' => 'true',
        'arrows' => 'true',
        'icon' => 'star',
    ), $atts);
    
    // Get destination data
    $destination = tcc_get_destination_data($atts['slug']);
    
    if (!$destination || empty($destination['highlights'])) {
        return '<p>Geen hoogtepunten gevonden.</p>';
    }
    
    $highlights = $destination['highlights'];
    $color = esc_attr($atts['color']);
    $columns = intval($atts['columns']);
    $height = intval($atts['height']);
    $show_icon = $atts['show_icon'] === 'true';
    $skew = $atts['skew'] === 'true';
    $arrows = $atts['arrows'] === 'true';
    $unique_id = 'tcc-highlights-' . uniqid();
    $total_items = count($highlights);
    
    ob_start();
    ?>
    <style>
        #<?php echo $unique_id; ?>-wrapper {
            position: relative;
            padding: 0 50px;
        }
        #<?php echo $unique_id; ?> {
            display: flex;
            gap: 25px;
            overflow: hidden;
            padding: 10px 0;
            scroll-behavior: smooth;
        }
        #<?php echo $unique_id; ?> .tcc-highlight-card {
            flex: 0 0 calc(<?php echo 100 / $columns; ?>% - <?php echo 25 * ($columns - 1) / $columns; ?>px);
            min-width: 250px;
            position: relative;
            border-radius: <?php echo $skew ? '20px' : '12px'; ?>;
            overflow: hidden;
            background: #fff;
            box-shadow: 0 4px 20px rgba(0,0,0,0.08);
            transition: transform 0.3s ease, box-shadow 0.3s ease;
        }
        #<?php echo $unique_id; ?> .tcc-highlight-card:hover {
            transform: translateY(-8px);
            box-shadow: 0 12px 35px rgba(0,0,0,0.15);
        }
        #<?php echo $unique_id; ?> .tcc-highlight-image {
            position: relative;
            height: <?php echo $height; ?>px;
            overflow: hidden;
            <?php if ($skew): ?>
            clip-path: polygon(0 0, 100% 0, 100% 85%, 0 100%);
            <?php endif; ?>
        }
        #<?php echo $unique_id; ?> .tcc-highlight-image img {
            width: 100%;
            height: 100%;
            object-fit: cover;
            transition: transform 0.4s ease;
        }
        #<?php echo $unique_id; ?> .tcc-highlight-card:hover .tcc-highlight-image img {
            transform: scale(1.08);
        }
        /* Hover overlay with color */
        #<?php echo $unique_id; ?> .tcc-highlight-image::after {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: linear-gradient(135deg, <?php echo $color; ?>40, <?php echo $color; ?>20);
            opacity: 0;
            transition: opacity 0.3s ease;
            pointer-events: none;
        }
        #<?php echo $unique_id; ?> .tcc-highlight-card:hover .tcc-highlight-image::after {
            opacity: 1;
        }
        <?php if ($show_icon): ?>
        #<?php echo $unique_id; ?> .tcc-highlight-icon {
            position: absolute;
            bottom: <?php echo $skew ? '0' : '-25px'; ?>;
            left: 50%;
            transform: translateX(-50%) <?php echo $skew ? 'translateY(50%)' : ''; ?>;
            width: 55px;
            height: 55px;
            background: <?php echo $color; ?>;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 4px 15px rgba(0,0,0,0.25);
            z-index: 2;
            transition: transform 0.3s ease, box-shadow 0.3s ease;
        }
        #<?php echo $unique_id; ?> .tcc-highlight-card:hover .tcc-highlight-icon {
            transform: translateX(-50%) <?php echo $skew ? 'translateY(50%)' : ''; ?> scale(1.1);
            box-shadow: 0 6px 20px rgba(0,0,0,0.3);
        }
        #<?php echo $unique_id; ?> .tcc-highlight-icon svg {
            width: 26px;
            height: 26px;
            fill: #fff;
        }
        <?php endif; ?>
        #<?php echo $unique_id; ?> .tcc-highlight-content {
            padding: 25px 20px 25px;
            text-align: center;
            <?php if ($skew): ?>
            margin-top: -20px;
            <?php endif; ?>
        }
        #<?php echo $unique_id; ?> .tcc-highlight-title {
            font-size: 18px;
            font-weight: 700;
            margin: 0 0 12px;
            color: #333;
        }
        #<?php echo $unique_id; ?> .tcc-highlight-description {
            font-size: 14px;
            color: #666;
            line-height: 1.7;
            margin: 0;
        }
        /* Navigation arrows */
        #<?php echo $unique_id; ?>-wrapper .tcc-nav-arrow {
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
        #<?php echo $unique_id; ?>-wrapper .tcc-nav-arrow:hover {
            background: <?php echo $color; ?>;
            transform: translateY(-50%) scale(1.1);
            box-shadow: 0 6px 20px rgba(0,0,0,0.3);
        }
        #<?php echo $unique_id; ?>-wrapper .tcc-nav-arrow:disabled {
            opacity: 0.4;
            cursor: not-allowed;
            transform: translateY(-50%);
        }
        #<?php echo $unique_id; ?>-wrapper .tcc-nav-arrow svg {
            width: 20px;
            height: 20px;
            fill: #fff;
        }
        #<?php echo $unique_id; ?>-wrapper .tcc-nav-prev {
            left: 0;
        }
        #<?php echo $unique_id; ?>-wrapper .tcc-nav-next {
            right: 0;
        }
        @media (max-width: 1024px) {
            #<?php echo $unique_id; ?> .tcc-highlight-card {
                flex: 0 0 calc(50% - 12.5px);
            }
            #<?php echo $unique_id; ?>-wrapper {
                padding: 0 40px;
            }
        }
        @media (max-width: 600px) {
            #<?php echo $unique_id; ?> .tcc-highlight-card {
                flex: 0 0 100%;
            }
            #<?php echo $unique_id; ?> .tcc-highlight-image {
                height: 220px;
            }
            #<?php echo $unique_id; ?>-wrapper {
                padding: 0 35px;
            }
            #<?php echo $unique_id; ?>-wrapper .tcc-nav-arrow {
                width: 35px;
                height: 35px;
            }
        }
    </style>
    
    <div id="<?php echo $unique_id; ?>-wrapper" class="tcc-highlights-wrapper">
        <?php if ($arrows && $total_items > $columns): ?>
        <button class="tcc-nav-arrow tcc-nav-prev" onclick="tccSlide('<?php echo $unique_id; ?>', -1)" aria-label="Vorige">
            <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/>
            </svg>
        </button>
        <?php endif; ?>
        
        <div id="<?php echo $unique_id; ?>" class="tcc-highlights-carousel">
            <?php foreach ($highlights as $highlight): ?>
                <div class="tcc-highlight-card">
                    <div class="tcc-highlight-image">
                        <?php if (!empty($highlight['image'])): ?>
                            <img src="<?php echo esc_url($highlight['image']); ?>" alt="<?php echo esc_attr($highlight['title']); ?>" loading="lazy">
                        <?php else: ?>
                            <div style="background: linear-gradient(135deg, <?php echo $color; ?>, #333); height: 100%;"></div>
                        <?php endif; ?>
                        
                        <?php if ($show_icon): ?>
                        <div class="tcc-highlight-icon">
                            <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                            </svg>
                        </div>
                        <?php endif; ?>
                    </div>
                    <div class="tcc-highlight-content">
                        <h3 class="tcc-highlight-title"><?php echo esc_html($highlight['title']); ?></h3>
                        <p class="tcc-highlight-description"><?php echo esc_html($highlight['description']); ?></p>
                    </div>
                </div>
            <?php endforeach; ?>
        </div>
        
        <?php if ($arrows && $total_items > $columns): ?>
        <button class="tcc-nav-arrow tcc-nav-next" onclick="tccSlide('<?php echo $unique_id; ?>', 1)" aria-label="Volgende">
            <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path d="M8.59 16.59L10 18l6-6-6-6-1.41 1.41L13.17 12z"/>
            </svg>
        </button>
        <?php endif; ?>
    </div>
    
    <script>
    function tccSlide(id, direction) {
        const carousel = document.getElementById(id);
        const card = carousel.querySelector('.tcc-highlight-card');
        if (!card) return;
        const cardWidth = card.offsetWidth + 25; // card width + gap
        carousel.scrollBy({ left: direction * cardWidth, behavior: 'smooth' });
    }
    </script>
    <?php
    return ob_get_clean();
}
add_shortcode('travelc_highlights_carousel', 'tcc_highlights_carousel_shortcode');
