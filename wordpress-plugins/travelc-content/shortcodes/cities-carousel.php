<?php
if (!defined('ABSPATH')) exit;

/**
 * Cities Carousel Shortcode
 * Usage: [travelc_cities_carousel color="#4CAF50" columns="3"]
 */
function tcc_cities_carousel_shortcode($atts) {
    $atts = shortcode_atts(array(
        'slug' => '',
        'color' => '#4CAF50',
        'columns' => 3,
        'show_icon' => 'true',
    ), $atts);
    
    // Get destination data
    $destination = tcc_get_destination_data($atts['slug']);
    
    if (!$destination || empty($destination['cities'])) {
        return '<p>Geen steden gevonden.</p>';
    }
    
    $cities = $destination['cities'];
    $color = esc_attr($atts['color']);
    $columns = intval($atts['columns']);
    $show_icon = $atts['show_icon'] === 'true';
    $unique_id = 'tcc-cities-' . uniqid();
    
    ob_start();
    ?>
    <style>
        #<?php echo $unique_id; ?> {
            display: flex;
            gap: 20px;
            overflow-x: auto;
            scroll-snap-type: x mandatory;
            -webkit-overflow-scrolling: touch;
            padding: 10px 0;
        }
        #<?php echo $unique_id; ?> .tcc-city-card {
            flex: 0 0 calc(<?php echo 100 / $columns; ?>% - 15px);
            min-width: 280px;
            scroll-snap-align: start;
            border-radius: 16px;
            overflow: hidden;
            position: relative;
            height: 400px;
            transition: transform 0.3s ease;
        }
        #<?php echo $unique_id; ?> .tcc-city-card:hover {
            transform: translateY(-5px);
        }
        #<?php echo $unique_id; ?> .tcc-city-image {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 55%;
            overflow: hidden;
        }
        #<?php echo $unique_id; ?> .tcc-city-image img {
            width: 100%;
            height: 100%;
            object-fit: cover;
            transition: transform 0.3s ease;
        }
        #<?php echo $unique_id; ?> .tcc-city-card:hover .tcc-city-image img {
            transform: scale(1.05);
        }
        #<?php echo $unique_id; ?> .tcc-city-content {
            position: absolute;
            bottom: 0;
            left: 0;
            right: 0;
            height: 50%;
            background: <?php echo $color; ?>;
            padding: 40px 20px 20px;
            text-align: center;
            display: flex;
            flex-direction: column;
            justify-content: center;
        }
        #<?php echo $unique_id; ?> .tcc-city-icon {
            position: absolute;
            top: -25px;
            left: 50%;
            transform: translateX(-50%);
            width: 50px;
            height: 50px;
            background: #fff;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 4px 10px rgba(0,0,0,0.2);
        }
        #<?php echo $unique_id; ?> .tcc-city-icon svg {
            width: 24px;
            height: 24px;
            fill: <?php echo $color; ?>;
        }
        #<?php echo $unique_id; ?> .tcc-city-title {
            font-size: 20px;
            font-weight: 600;
            margin: 0 0 12px;
            color: #fff;
        }
        #<?php echo $unique_id; ?> .tcc-city-description {
            font-size: 14px;
            color: rgba(255,255,255,0.9);
            line-height: 1.6;
            margin: 0;
        }
        @media (max-width: 768px) {
            #<?php echo $unique_id; ?> .tcc-city-card {
                flex: 0 0 calc(50% - 10px);
                min-width: 250px;
                height: 350px;
            }
        }
        @media (max-width: 480px) {
            #<?php echo $unique_id; ?> .tcc-city-card {
                flex: 0 0 calc(100% - 10px);
            }
        }
    </style>
    
    <div id="<?php echo $unique_id; ?>" class="tcc-cities-carousel">
        <?php foreach ($cities as $city): ?>
            <div class="tcc-city-card">
                <div class="tcc-city-image">
                    <?php if (!empty($city['image'])): ?>
                        <img src="<?php echo esc_url($city['image']); ?>" alt="<?php echo esc_attr($city['name']); ?>">
                    <?php else: ?>
                        <div style="background: linear-gradient(135deg, #333, #666); height: 100%;"></div>
                    <?php endif; ?>
                </div>
                <div class="tcc-city-content">
                    <?php if ($show_icon): ?>
                    <div class="tcc-city-icon">
                        <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                        </svg>
                    </div>
                    <?php endif; ?>
                    <h3 class="tcc-city-title"><?php echo esc_html($city['name']); ?></h3>
                    <p class="tcc-city-description"><?php echo esc_html($city['description']); ?></p>
                </div>
            </div>
        <?php endforeach; ?>
    </div>
    <?php
    return ob_get_clean();
}
add_shortcode('travelc_cities_carousel', 'tcc_cities_carousel_shortcode');
