<?php
/**
 * Plugin Name: TravelC Reizen
 * Description: Toont reizen vanuit TravelCStudio op je WordPress website via shortcodes.
 * Version: 1.1.0
 * Author: RBS / TravelCStudio
 * Text Domain: travelc-reizen
 */

if (!defined('ABSPATH')) exit;

define('TRAVELC_REIZEN_VERSION', '1.2.0');
define('TRAVELC_REIZEN_PATH', plugin_dir_path(__FILE__));
define('TRAVELC_REIZEN_URL', plugin_dir_url(__FILE__));

// ============================================
// Admin Menu (top-level)
// ============================================
add_action('admin_menu', function() {
    add_menu_page(
        'TravelC Reizen',
        'TravelC Reizen',
        'manage_options',
        'travelc-reizen',
        'travelc_reizen_overview_page',
        'dashicons-airplane',
        30
    );
    add_submenu_page(
        'travelc-reizen',
        'Overzicht',
        'Overzicht',
        'manage_options',
        'travelc-reizen',
        'travelc_reizen_overview_page'
    );
    add_submenu_page(
        'travelc-reizen',
        'Instellingen',
        'Instellingen',
        'manage_options',
        'travelc-reizen-settings',
        'travelc_reizen_settings_page'
    );
});

add_action('admin_init', function() {
    register_setting('travelc_reizen', 'travelc_api_url');
    register_setting('travelc_reizen', 'travelc_brand_id');
    register_setting('travelc_reizen', 'travelc_mapbox_token');
});

// Admin JS for copy-to-clipboard
add_action('admin_footer', function() {
    $screen = get_current_screen();
    if (!$screen || strpos($screen->id, 'travelc-reizen') === false) return;
    ?>
    <script>
    function travelcCopyShortcode(btn) {
        var code = btn.previousElementSibling.textContent;
        navigator.clipboard.writeText(code).then(function() {
            var orig = btn.textContent;
            btn.textContent = 'Gekopieerd!';
            btn.style.color = '#46b450';
            setTimeout(function() { btn.textContent = orig; btn.style.color = ''; }, 2000);
        });
    }
    </script>
    <?php
});

function travelc_reizen_overview_page() {
    $brand_id = get_option('travelc_brand_id', '');
    $configured = !empty($brand_id);
    ?>
    <div class="wrap">
        <h1 style="display:flex;align-items:center;gap:8px;">
            <span class="dashicons dashicons-airplane" style="font-size:28px;width:28px;height:28px;"></span>
            TravelC Reizen
        </h1>

        <?php if (!$configured): ?>
        <div class="notice notice-warning" style="margin:20px 0;">
            <p><strong>Let op:</strong> Stel eerst je Brand ID in bij <a href="<?php echo admin_url('admin.php?page=travelc-reizen-settings'); ?>">Instellingen</a> voordat de shortcodes werken.</p>
        </div>
        <?php else: ?>
        <div class="notice notice-success" style="margin:20px 0;">
            <p>Brand ID ingesteld: <code><?php echo esc_html($brand_id); ?></code></p>
        </div>
        <?php endif; ?>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-top:20px;">
            <!-- Reis Overzicht -->
            <div style="background:#fff;border:1px solid #ccd0d4;border-radius:8px;padding:24px;">
                <h2 style="margin-top:0;">Reis Overzicht (grid/lijst)</h2>
                <p>Toont een overzicht van alle reizen die voor jouw brand zijn geactiveerd.</p>
                <div style="background:#f0f0f1;border-radius:6px;padding:12px;margin:12px 0;display:flex;align-items:center;gap:8px;">
                    <code style="flex:1;font-size:14px;">[travelc_reizen]</code>
                    <button type="button" class="button button-small" onclick="travelcCopyShortcode(this)">Kopieer</button>
                </div>
                <h4 style="margin-bottom:8px;">Parameters:</h4>
                <table class="widefat striped" style="font-size:13px;">
                    <thead><tr><th>Parameter</th><th>Standaard</th><th>Beschrijving</th></tr></thead>
                    <tbody>
                        <tr><td><code>limit</code></td><td>12</td><td>Max aantal reizen</td></tr>
                        <tr><td><code>category</code></td><td>-</td><td>Filter op categorie slug</td></tr>
                        <tr><td><code>continent</code></td><td>-</td><td>Filter op continent</td></tr>
                        <tr><td><code>featured</code></td><td>false</td><td>Alleen uitgelichte reizen</td></tr>
                        <tr><td><code>layout</code></td><td>grid</td><td>grid of list</td></tr>
                        <tr><td><code>columns</code></td><td>3</td><td>Aantal kolommen (grid)</td></tr>
                    </tbody>
                </table>
                <h4 style="margin:16px 0 8px;">Voorbeelden:</h4>
                <div style="background:#f0f0f1;border-radius:6px;padding:12px;margin:6px 0;display:flex;align-items:center;gap:8px;">
                    <code style="flex:1;">[travelc_reizen limit="6" columns="2"]</code>
                    <button type="button" class="button button-small" onclick="travelcCopyShortcode(this)">Kopieer</button>
                </div>
                <div style="background:#f0f0f1;border-radius:6px;padding:12px;margin:6px 0;display:flex;align-items:center;gap:8px;">
                    <code style="flex:1;">[travelc_reizen featured="true" layout="list"]</code>
                    <button type="button" class="button button-small" onclick="travelcCopyShortcode(this)">Kopieer</button>
                </div>
            </div>

            <!-- Reis Detail -->
            <div style="background:#fff;border:1px solid #ccd0d4;border-radius:8px;padding:24px;">
                <h2 style="margin-top:0;">Reis Detail (enkele reis)</h2>
                <p>Toont de volledige detailpagina van een reis. Gebruik dit op een pagina met slug <code>/reizen</code>.</p>
                <div style="background:#f0f0f1;border-radius:6px;padding:12px;margin:12px 0;display:flex;align-items:center;gap:8px;">
                    <code style="flex:1;font-size:14px;">[travelc_reis]</code>
                    <button type="button" class="button button-small" onclick="travelcCopyShortcode(this)">Kopieer</button>
                </div>
                <h4 style="margin-bottom:8px;">Hoe werkt het:</h4>
                <ol style="font-size:13px;line-height:1.8;">
                    <li>Maak een WordPress pagina met slug <strong>reizen</strong></li>
                    <li>Plaats <code>[travelc_reis]</code> op die pagina</li>
                    <li>De reis wordt automatisch geladen via de URL: <code>/reizen/reis-slug</code></li>
                    <li>Of via parameter: <code>?reis=reis-slug</code></li>
                </ol>
                <h4 style="margin:16px 0 8px;">Vaste reis tonen:</h4>
                <div style="background:#f0f0f1;border-radius:6px;padding:12px;margin:6px 0;display:flex;align-items:center;gap:8px;">
                    <code style="flex:1;">[travelc_reis slug="rondreis-thailand-14-dagen"]</code>
                    <button type="button" class="button button-small" onclick="travelcCopyShortcode(this)">Kopieer</button>
                </div>
            </div>
        </div>

        <!-- Quick Setup -->
        <div style="background:#fff;border:1px solid #ccd0d4;border-radius:8px;padding:24px;margin-top:20px;">
            <h2 style="margin-top:0;">Snelle Setup</h2>
            <ol style="font-size:14px;line-height:2;">
                <li>Ga naar <a href="<?php echo admin_url('admin.php?page=travelc-reizen-settings'); ?>">Instellingen</a> en vul je <strong>Brand ID</strong> in</li>
                <li>Maak een pagina <strong>"Reizen"</strong> aan met shortcode <code>[travelc_reizen]</code></li>
                <li>Maak een pagina <strong>"Reis Detail"</strong> aan (slug: <code>reizen</code>) met shortcode <code>[travelc_reis]</code></li>
                <li>Klaar! Reizen worden automatisch opgehaald uit TravelCStudio</li>
            </ol>
        </div>
    </div>
    <?php
}

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
// Brand Settings Helper (cached 1 hour)
// ============================================
function travelc_get_brand_settings() {
    $cache_key = 'travelc_brand_settings';
    $cached = get_transient($cache_key);
    if ($cached !== false) return $cached;

    $result = travelc_api_request(['action' => 'brand-settings']);
    if (!is_wp_error($result) && !empty($result['brand'])) {
        set_transient($cache_key, $result['brand'], HOUR_IN_SECONDS);
        return $result['brand'];
    }
    return ['primary_color' => '#2a9d8f', 'secondary_color' => '#d34e4a'];
}

// ============================================
// Enqueue Assets
// ============================================
add_action('wp_enqueue_scripts', function() {
    // Only load when shortcode is used
    global $post;
    if (!is_a($post, 'WP_Post') || (!has_shortcode($post->post_content, 'travelc_reizen') && !has_shortcode($post->post_content, 'travelc_reis'))) {
        return;
    }

    // Leaflet CSS & JS
    wp_enqueue_style('leaflet', 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css', [], '1.9.4');
    wp_enqueue_script('leaflet', 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js', [], '1.9.4', true);

    // Plugin CSS & JS
    wp_enqueue_style('travelc-reizen', TRAVELC_REIZEN_URL . 'assets/css/travelc-reizen.css', [], TRAVELC_REIZEN_VERSION);
    wp_enqueue_script('travelc-reizen', TRAVELC_REIZEN_URL . 'assets/js/travelc-reizen.js', ['leaflet'], TRAVELC_REIZEN_VERSION, true);

    // Inject brand colors as CSS variables
    $brand = travelc_get_brand_settings();
    $primary = esc_attr($brand['primary_color'] ?? '#2a9d8f');
    $secondary = esc_attr($brand['secondary_color'] ?? '#d34e4a');
    wp_add_inline_style('travelc-reizen', ":root { --travelc-primary: {$primary}; --travelc-primary-dark: {$primary}; --travelc-secondary: {$secondary}; }");
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

    // Get slug: 1) shortcode attr, 2) WP query var (rewrite), 3) $_GET, 4) URL path fallback
    $slug = !empty($atts['slug']) ? $atts['slug'] : '';
    if (empty($slug)) {
        $slug = get_query_var('reis', '');
    }
    if (empty($slug) && isset($_GET['reis'])) {
        $slug = sanitize_text_field($_GET['reis']);
    }
    // Fallback: extract slug from URL path (works in subdirectory installs)
    if (empty($slug)) {
        $path = trim(parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH), '/');
        if (preg_match('/reizen\/([^\/]+)\/?$/', $path, $m)) {
            $slug = sanitize_title($m[1]);
        }
    }

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
