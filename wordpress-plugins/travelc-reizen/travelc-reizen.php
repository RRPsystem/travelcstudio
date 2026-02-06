<?php
/**
 * Plugin Name: TravelC Reizen
 * Description: Toont reizen vanuit TravelCStudio op je WordPress website via shortcodes.
 * Version: 1.0.0
 * Author: RBS / TravelCStudio
 * Text Domain: travelc-reizen
 */

if (!defined('ABSPATH')) exit;

define('TRAVELC_REIZEN_VERSION', '1.0.0');
define('TRAVELC_REIZEN_PATH', plugin_dir_path(__FILE__));
define('TRAVELC_REIZEN_URL', plugin_dir_url(__FILE__));

// ============================================
// Admin Settings
// ============================================
add_action('admin_menu', function() {
    add_options_page(
        'TravelC Reizen',
        'TravelC Reizen',
        'manage_options',
        'travelc-reizen',
        'travelc_reizen_settings_page'
    );
});

add_action('admin_init', function() {
    register_setting('travelc_reizen', 'travelc_api_url');
    register_setting('travelc_reizen', 'travelc_brand_id');
    register_setting('travelc_reizen', 'travelc_mapbox_token');
});

function travelc_reizen_settings_page() {
    ?>
    <div class="wrap">
        <h1>TravelC Reizen Instellingen</h1>
        <form method="post" action="options.php">
            <?php settings_fields('travelc_reizen'); ?>
            <table class="form-table">
                <tr>
                    <th>API URL</th>
                    <td>
                        <input type="url" name="travelc_api_url" value="<?php echo esc_attr(get_option('travelc_api_url', 'https://huaaogdxxdcakxryecnw.supabase.co/functions/v1/travelc-api')); ?>" class="regular-text" />
                        <p class="description">Supabase Edge Function URL voor de TravelC API</p>
                    </td>
                </tr>
                <tr>
                    <th>Brand ID</th>
                    <td>
                        <input type="text" name="travelc_brand_id" value="<?php echo esc_attr(get_option('travelc_brand_id', '')); ?>" class="regular-text" />
                        <p class="description">Je brand UUID uit TravelCStudio</p>
                    </td>
                </tr>
                <tr>
                    <th>Mapbox Token (optioneel)</th>
                    <td>
                        <input type="text" name="travelc_mapbox_token" value="<?php echo esc_attr(get_option('travelc_mapbox_token', '')); ?>" class="regular-text" />
                        <p class="description">Voor Mapbox kaart tiles (laat leeg voor OpenStreetMap)</p>
                    </td>
                </tr>
            </table>
            <?php submit_button(); ?>
        </form>
    </div>
    <?php
}

// ============================================
// API Helper
// ============================================
function travelc_api_request($params = []) {
    $api_url = get_option('travelc_api_url', 'https://huaaogdxxdcakxryecnw.supabase.co/functions/v1/travelc-api');
    $brand_id = get_option('travelc_brand_id', '');

    if (empty($brand_id)) {
        return new WP_Error('no_brand', 'TravelC Brand ID is niet ingesteld.');
    }

    $params['brand_id'] = $brand_id;
    $url = add_query_arg($params, $api_url);

    // Cache for 5 minutes
    $cache_key = 'travelc_' . md5($url);
    $cached = get_transient($cache_key);
    if ($cached !== false) {
        return $cached;
    }

    $response = wp_remote_get($url, [
        'timeout' => 30,
        'headers' => ['Content-Type' => 'application/json'],
    ]);

    if (is_wp_error($response)) {
        return $response;
    }

    $body = json_decode(wp_remote_retrieve_body($response), true);

    if (!empty($body['success'])) {
        set_transient($cache_key, $body, 5 * MINUTE_IN_SECONDS);
    }

    return $body;
}

// ============================================
// Enqueue Assets
// ============================================
add_action('wp_enqueue_scripts', function() {
    // Only load when shortcode is used
    global $post;
    if (!is_a($post, 'WP_Post') || !has_shortcode($post->post_content, 'travelc_reizen') && !has_shortcode($post->post_content, 'travelc_reis')) {
        return;
    }

    // Leaflet CSS & JS
    wp_enqueue_style('leaflet', 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css', [], '1.9.4');
    wp_enqueue_script('leaflet', 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js', [], '1.9.4', true);

    // Plugin CSS & JS
    wp_enqueue_style('travelc-reizen', TRAVELC_REIZEN_URL . 'assets/css/travelc-reizen.css', [], TRAVELC_REIZEN_VERSION);
    wp_enqueue_script('travelc-reizen', TRAVELC_REIZEN_URL . 'assets/js/travelc-reizen.js', ['leaflet'], TRAVELC_REIZEN_VERSION, true);
});

// ============================================
// Shortcode: [travelc_reizen] - Reis overzicht
// ============================================
add_shortcode('travelc_reizen', function($atts) {
    $atts = shortcode_atts([
        'limit'    => 12,
        'category' => '',
        'continent'=> '',
        'featured' => 'false',
        'layout'   => 'grid', // grid, list
        'columns'  => 3,
    ], $atts);

    $params = [
        'action' => 'list',
        'limit'  => intval($atts['limit']),
    ];
    if (!empty($atts['category']))  $params['category']  = $atts['category'];
    if (!empty($atts['continent'])) $params['continent'] = $atts['continent'];
    if ($atts['featured'] === 'true') $params['featured'] = 'true';

    $result = travelc_api_request($params);

    if (is_wp_error($result)) {
        return '<p class="travelc-error">' . esc_html($result->get_error_message()) . '</p>';
    }

    if (empty($result['travels'])) {
        return '<p class="travelc-empty">Geen reizen gevonden.</p>';
    }

    $layout = $atts['layout'];
    $columns = intval($atts['columns']);

    ob_start();
    include TRAVELC_REIZEN_PATH . 'templates/travel-list.php';
    return ob_get_clean();
});

// ============================================
// Shortcode: [travelc_reis] - Enkele reis detail
// ============================================
add_shortcode('travelc_reis', function($atts) {
    $atts = shortcode_atts([
        'slug' => '',
    ], $atts);

    // Get slug from URL parameter if not set
    $slug = !empty($atts['slug']) ? $atts['slug'] : (isset($_GET['reis']) ? sanitize_text_field($_GET['reis']) : '');

    if (empty($slug)) {
        return '<p class="travelc-error">Geen reis geselecteerd.</p>';
    }

    $result = travelc_api_request([
        'action' => 'get',
        'slug'   => $slug,
    ]);

    if (is_wp_error($result)) {
        return '<p class="travelc-error">' . esc_html($result->get_error_message()) . '</p>';
    }

    if (empty($result['travel'])) {
        return '<p class="travelc-empty">Reis niet gevonden.</p>';
    }

    $travel = $result['travel'];

    ob_start();
    include TRAVELC_REIZEN_PATH . 'templates/travel-detail.php';
    return ob_get_clean();
});

// ============================================
// Rewrite rule for pretty URLs: /reizen/slug
// ============================================
add_action('init', function() {
    add_rewrite_rule(
        'reizen/([^/]+)/?$',
        'index.php?pagename=reizen&reis=$matches[1]',
        'top'
    );
});

add_filter('query_vars', function($vars) {
    $vars[] = 'reis';
    return $vars;
});
