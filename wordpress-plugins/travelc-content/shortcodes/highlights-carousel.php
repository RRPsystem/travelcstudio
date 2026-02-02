<?php
if (!defined('ABSPATH')) exit;

/**
 * Highlights Carousel Shortcode
 * Usage: [travelc_highlights_carousel color="#f5a623" columns="4"]
 */
function tcc_highlights_carousel_shortcode($atts) {
    $atts = shortcode_atts(array(
        'slug' => '',
        'color' => '#f5a623',
        'columns' => 4,
        'show_icon' => 'true',
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
    $show_icon = $atts['show_icon'] === 'true';
    $unique_id = 'tcc-highlights-' . uniqid();
    
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
        #<?php echo $unique_id; ?> .tcc-highlight-card {
            flex: 0 0 calc(<?php echo 100 / $columns; ?>% - 15px);
            min-width: 250px;
            scroll-snap-align: start;
            border-radius: 12px;
            overflow: hidden;
            background: #fff;
            box-shadow: 0 4px 15px rgba(0,0,0,0.1);
            transition: transform 0.3s ease, box-shadow 0.3s ease;
        }
        #<?php echo $unique_id; ?> .tcc-highlight-card:hover {
            transform: translateY(-5px);
            box-shadow: 0 8px 25px rgba(0,0,0,0.15);
        }
        #<?php echo $unique_id; ?> .tcc-highlight-image {
            position: relative;
            height: 200px;
            overflow: hidden;
        }
        #<?php echo $unique_id; ?> .tcc-highlight-image img {
            width: 100%;
            height: 100%;
            object-fit: cover;
            transition: transform 0.3s ease;
        }
        #<?php echo $unique_id; ?> .tcc-highlight-card:hover .tcc-highlight-image img {
            transform: scale(1.05);
        }
        #<?php echo $unique_id; ?> .tcc-highlight-icon {
            position: absolute;
            bottom: -25px;
            left: 50%;
            transform: translateX(-50%);
            width: 50px;
            height: 50px;
            background: <?php echo $color; ?>;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 4px 10px rgba(0,0,0,0.2);
            z-index: 2;
        }
        #<?php echo $unique_id; ?> .tcc-highlight-icon svg {
            width: 24px;
            height: 24px;
            fill: #fff;
        }
        #<?php echo $unique_id; ?> .tcc-highlight-content {
            padding: <?php echo $show_icon ? '35px' : '20px'; ?> 20px 20px;
            text-align: center;
        }
        #<?php echo $unique_id; ?> .tcc-highlight-title {
            font-size: 18px;
            font-weight: 600;
            margin: 0 0 10px;
            color: #333;
        }
        #<?php echo $unique_id; ?> .tcc-highlight-description {
            font-size: 14px;
            color: #666;
            line-height: 1.6;
            margin: 0;
        }
        @media (max-width: 768px) {
            #<?php echo $unique_id; ?> .tcc-highlight-card {
                flex: 0 0 calc(50% - 10px);
                min-width: 200px;
            }
        }
        @media (max-width: 480px) {
            #<?php echo $unique_id; ?> .tcc-highlight-card {
                flex: 0 0 calc(100% - 10px);
            }
        }
    </style>
    
    <div id="<?php echo $unique_id; ?>" class="tcc-highlights-carousel">
        <?php foreach ($highlights as $highlight): ?>
            <div class="tcc-highlight-card">
                <div class="tcc-highlight-image">
                    <?php if (!empty($highlight['image'])): ?>
                        <img src="<?php echo esc_url($highlight['image']); ?>" alt="<?php echo esc_attr($highlight['title']); ?>">
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
    <?php
    return ob_get_clean();
}
add_shortcode('travelc_highlights_carousel', 'tcc_highlights_carousel_shortcode');
