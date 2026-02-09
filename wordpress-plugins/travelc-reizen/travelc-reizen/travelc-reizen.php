<?php
/**
 * Plugin Name: TravelC Reizen
 * Description: Toont reizen vanuit TravelCStudio op je WordPress website via shortcodes.
 * Version: 3.7.0
 * Author: RBS / TravelCStudio
 * Text Domain: travelc-reizen
 */

if (!defined('ABSPATH')) exit;

define('TRAVELC_REIZEN_VERSION', '3.7.0');
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
    if (!is_a($post, 'WP_Post') || (!has_shortcode($post->post_content, 'travelc_reizen') && !has_shortcode($post->post_content, 'travelc_reis') && !has_shortcode($post->post_content, 'travelc_zoek_widget') && !has_shortcode($post->post_content, 'travelc_featured_reizen'))) {
        return;
    }

    // Leaflet CSS & JS
    wp_enqueue_style('leaflet', 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css', [], '1.9.4');
    wp_enqueue_script('leaflet', 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js', [], '1.9.4', true);

    // Plugin CSS & JS
    wp_enqueue_style('travelc-reizen', TRAVELC_REIZEN_URL . 'assets/css/travelc-reizen.css', [], TRAVELC_REIZEN_VERSION);
    wp_enqueue_script('travelc-reizen', TRAVELC_REIZEN_URL . 'assets/js/travelc-reizen.js', ['leaflet'], TRAVELC_REIZEN_VERSION, true);

    // Pass config to JS for quote form
    wp_localize_script('travelc-reizen', 'travelcConfig', [
        'brandId' => get_option('travelc_brand_id', ''),
        'quoteEndpoint' => 'https://huaaogdxxdcakxryecnw.supabase.co/functions/v1/travel-quote-request',
    ]);

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
        'country'  => '',
        'duration' => '',
        'featured' => 'false',
        'layout'   => 'grid', // grid, list
        'columns'  => 3,
    ], $atts);

    // URL query params override shortcode attributes (for search widget)
    if (isset($_GET['land']) && !empty($_GET['land']))      $atts['country']   = sanitize_text_field($_GET['land']);
    if (isset($_GET['type']) && !empty($_GET['type']))      $atts['category']  = sanitize_text_field($_GET['type']);
    if (isset($_GET['dagen']) && !empty($_GET['dagen']))    $atts['duration']  = sanitize_text_field($_GET['dagen']);
    if (isset($_GET['continent']) && !empty($_GET['continent'])) $atts['continent'] = sanitize_text_field($_GET['continent']);

    $params = [
        'action' => 'list',
        'limit'  => intval($atts['limit']),
    ];
    if (!empty($atts['category']))  $params['category']  = $atts['category'];
    if (!empty($atts['continent'])) $params['continent'] = $atts['continent'];
    if (!empty($atts['country']))   $params['country']   = $atts['country'];
    if (!empty($atts['duration']))  $params['duration']  = $atts['duration'];
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
// Shortcode: [travelc_featured_reizen] - Featured travels in card style
// Usage: [travelc_featured_reizen limit="3" columns="3" country="Thailand" category="Rondreis"]
// ============================================
add_shortcode('travelc_featured_reizen', function($atts) {
    $atts = shortcode_atts([
        'limit'    => 3,
        'columns'  => 3,
        'country'  => '',
        'category' => '',
        'continent'=> '',
        'featured' => 'true',
        'title'    => '',
        'detail_base' => '/reizen/',
    ], $atts);

    $params = [
        'action'   => 'list',
        'limit'    => intval($atts['limit']),
        'featured' => $atts['featured'],
    ];
    if (!empty($atts['country']))   $params['country']   = $atts['country'];
    if (!empty($atts['category']))  $params['category']  = $atts['category'];
    if (!empty($atts['continent'])) $params['continent'] = $atts['continent'];

    $result = travelc_api_request($params);

    if (is_wp_error($result) || empty($result['travels'])) {
        return '';
    }

    $travels = array_slice($result['travels'], 0, intval($atts['limit']));
    $columns = intval($atts['columns']);

    // Get brand colors
    $brand = travelc_get_brand_settings();
    $primary = esc_attr($brand['primary_color'] ?? '#2a9d8f');
    $secondary = esc_attr($brand['secondary_color'] ?? '#d34e4a');

    ob_start();
    ?>

    <?php if (!empty($atts['title'])): ?>
    <h2 class="tcf-section-title"><?php echo esc_html($atts['title']); ?></h2>
    <?php endif; ?>

    <div class="tcf-grid tcf-cols-<?php echo $columns; ?>">
        <?php foreach ($travels as $travel):
            $detail_url = home_url(rtrim($atts['detail_base'], '/') . '/' . $travel['slug'] . '/');
            $image = !empty($travel['first_image']) ? $travel['first_image'] : ($travel['hero_image'] ?? '');
            $price = !empty($travel['display_price']) ? $travel['display_price'] : ($travel['price_per_person'] ?? 0);
            $title = !empty($travel['display_title']) ? $travel['display_title'] : $travel['title'];
            $nights = $travel['number_of_nights'] ?? 0;
            $days = $travel['number_of_days'] ?? 0;
            $countries = $travel['country_list'] ?? [];
            $intro = $travel['intro_text'] ?? '';
            if (strlen($intro) > 120) $intro = mb_substr($intro, 0, 117) . '...';

            // Get category
            $categories = $travel['categories'] ?? [];
            $travel_type = '';
            if (!empty($categories)) {
                $first_cat = $categories[0];
                $travel_type = is_array($first_cat) ? ($first_cat['name'] ?? '') : $first_cat;
            }
        ?>
        <a href="<?php echo esc_url($detail_url); ?>" class="tcf-card">
            <div class="tcf-card-image">
                <?php if (!empty($image)): ?>
                    <img src="<?php echo esc_url($image); ?>" alt="<?php echo esc_attr($title); ?>" loading="lazy" />
                <?php else: ?>
                    <div class="tcf-no-image">✈</div>
                <?php endif; ?>

                <?php if ($days > 0): ?>
                <div class="tcf-days-badge">
                    <span class="tcf-days-num"><?php echo $days; ?></span>
                    <span class="tcf-days-label">dagen</span>
                </div>
                <?php endif; ?>

                <?php if (!empty($travel_type)): ?>
                <div class="tcf-type-badge"><?php echo esc_html($travel_type); ?></div>
                <?php endif; ?>
            </div>

            <div class="tcf-card-content">
                <?php if (!empty($countries)): ?>
                <div class="tcf-countries">
                    <span class="tcf-countries-icon">📍</span>
                    <span><?php echo esc_html(implode(', ', $countries)); ?></span>
                </div>
                <?php endif; ?>

                <h3 class="tcf-card-title"><?php echo esc_html($title); ?></h3>

                <?php if (!empty($intro)): ?>
                <p class="tcf-card-excerpt"><?php echo esc_html($intro); ?></p>
                <?php endif; ?>

                <div class="tcf-card-footer">
                    <?php if ($price > 0): ?>
                    <span class="tcf-price">Vanaf €<?php echo number_format($price, 0, ',', '.'); ?> p.p.</span>
                    <?php endif; ?>
                    <span class="tcf-read-more">Bekijk reis →</span>
                </div>
            </div>
        </a>
        <?php endforeach; ?>
    </div>

    <style>
    .tcf-section-title {
        font-size: 1.75rem;
        font-weight: 700;
        color: #1a1a2e;
        margin-bottom: 24px;
        text-align: center;
    }

    .tcf-grid {
        display: grid;
        gap: 24px;
        margin: 0 auto;
        max-width: 1200px;
    }
    .tcf-cols-2 { grid-template-columns: repeat(2, 1fr); }
    .tcf-cols-3 { grid-template-columns: repeat(3, 1fr); }
    .tcf-cols-4 { grid-template-columns: repeat(4, 1fr); }

    .tcf-card {
        background: #fff;
        border-radius: 16px;
        overflow: visible;
        box-shadow: 0 4px 15px rgba(0, 0, 0, 0.06);
        transition: transform 0.3s ease, box-shadow 0.3s ease;
        position: relative;
        text-decoration: none;
        color: inherit;
        display: flex;
        flex-direction: column;
    }

    .tcf-card:hover {
        transform: translateY(-6px);
        box-shadow: 0 12px 30px rgba(0, 0, 0, 0.12);
    }

    .tcf-card-image {
        position: relative;
        aspect-ratio: 16 / 10;
        overflow: hidden;
        margin: 12px 12px 0 12px;
        border-radius: 12px;
    }

    .tcf-card-image img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        transition: transform 0.4s ease;
    }

    .tcf-card:hover .tcf-card-image img {
        transform: scale(1.05);
    }

    .tcf-no-image {
        width: 100%;
        height: 100%;
        background: #f0f0f0;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 3rem;
    }

    /* Days Badge - Circle top-right, same style as news date badge */
    .tcf-days-badge {
        position: absolute;
        top: 12px;
        right: 12px;
        width: 54px;
        height: 54px;
        background: <?php echo $primary; ?>;
        border-radius: 50%;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        color: #fff;
        z-index: 2;
        box-shadow: 0 2px 10px rgba(0, 0, 0, 0.25);
    }

    .tcf-days-num {
        font-size: 1.125rem;
        font-weight: 700;
        line-height: 1;
    }

    .tcf-days-label {
        font-size: 0.6rem;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        line-height: 1;
        margin-top: 1px;
    }

    /* Type Badge - Overlapping bottom-left, same style as news category badge */
    .tcf-type-badge {
        position: absolute;
        bottom: -14px;
        left: 16px;
        background: <?php echo $secondary; ?>;
        color: #fff;
        padding: 7px 20px;
        border-radius: 5px;
        font-size: 0.875rem;
        font-weight: 700;
        letter-spacing: 0.3px;
        z-index: 2;
        box-shadow: 0 3px 10px rgba(0, 0, 0, 0.2);
        text-transform: capitalize;
    }

    .tcf-card-content {
        padding: 24px 20px 20px;
        flex: 1;
        display: flex;
        flex-direction: column;
    }

    .tcf-countries {
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: 0.8125rem;
        color: #6c757d;
        margin-bottom: 8px;
    }

    .tcf-countries-icon {
        font-size: 0.875rem;
    }

    .tcf-card-title {
        font-size: 1.1875rem;
        font-weight: 700;
        margin: 0 0 10px 0;
        line-height: 1.35;
        color: #1a1a2e;
    }

    .tcf-card:hover .tcf-card-title {
        color: <?php echo $primary; ?>;
    }

    .tcf-card-excerpt {
        font-size: 0.9375rem;
        color: #6c757d;
        line-height: 1.6;
        margin-bottom: 14px;
        flex: 1;
    }

    .tcf-card-footer {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding-top: 14px;
        border-top: 1px solid #f0f0f0;
    }

    .tcf-price {
        font-size: 1rem;
        font-weight: 700;
        color: <?php echo $primary; ?>;
    }

    .tcf-read-more {
        font-size: 0.875rem;
        font-weight: 600;
        color: <?php echo $secondary; ?>;
        transition: transform 0.2s ease;
        display: inline-block;
    }

    .tcf-card:hover .tcf-read-more {
        transform: translateX(4px);
    }

    @media (max-width: 900px) {
        .tcf-cols-3, .tcf-cols-4 { grid-template-columns: repeat(2, 1fr); }
    }

    @media (max-width: 600px) {
        .tcf-cols-2, .tcf-cols-3, .tcf-cols-4 { grid-template-columns: 1fr; }
        .tcf-section-title { font-size: 1.375rem; }
    }
    </style>
    <?php
    return ob_get_clean();
});

// ============================================
// Shortcode: [travelc_zoek_widget] - Hero search widget
// Usage: [travelc_zoek_widget action_url="/inspiratiereis/" show_duration="yes" show_category="yes" show_country="yes"]
// ============================================
add_shortcode('travelc_zoek_widget', function($atts) {
    $atts = shortcode_atts([
        'action_url'    => '/inspiratiereis/',
        'show_country'  => 'yes',
        'show_category' => 'yes',
        'show_duration' => 'yes',
        'theme_text'    => 'Of zoek op een thema reis!',
        'show_theme_link' => 'no',
    ], $atts);

    // Fetch available search options from API
    $options = travelc_api_request(['action' => 'search-options']);
    $countries = [];
    $categories = [];
    $has_durations = false;

    if (!is_wp_error($options) && !empty($options['success'])) {
        $countries = $options['countries'] ?? [];
        $categories = $options['categories'] ?? [];
        $has_durations = !empty($options['durations']);
    }

    // Get brand colors
    $brand = travelc_get_brand_settings();
    $primary = esc_attr($brand['primary_color'] ?? '#2a9d8f');
    $secondary = esc_attr($brand['secondary_color'] ?? '#d34e4a');

    // Pre-select from URL params
    $sel_land = isset($_GET['land']) ? sanitize_text_field($_GET['land']) : '';
    $sel_type = isset($_GET['type']) ? sanitize_text_field($_GET['type']) : '';
    $sel_dagen = isset($_GET['dagen']) ? sanitize_text_field($_GET['dagen']) : '';

    ob_start();
    ?>
    <div class="tc-hero-search">
        <div class="tc-hero-widget">
            <form class="tc-hero-form" action="<?php echo esc_url($atts['action_url']); ?>" method="get">

                <?php if ($atts['show_country'] === 'yes' && !empty($countries)): ?>
                <div class="tc-hero-field">
                    <label class="tc-hero-label">Bestemming</label>
                    <select name="land" class="tc-hero-select">
                        <option value="">Alle bestemmingen</option>
                        <?php foreach ($countries as $c): ?>
                            <option value="<?php echo esc_attr($c); ?>" <?php selected($sel_land, $c); ?>><?php echo esc_html($c); ?></option>
                        <?php endforeach; ?>
                    </select>
                </div>
                <?php endif; ?>

                <?php if ($atts['show_category'] === 'yes' && !empty($categories)): ?>
                <div class="tc-hero-field">
                    <label class="tc-hero-label">Reistype</label>
                    <select name="type" class="tc-hero-select">
                        <option value="">Alle reistypes</option>
                        <?php foreach ($categories as $cat): ?>
                            <option value="<?php echo esc_attr($cat); ?>" <?php selected($sel_type, $cat); ?>><?php echo esc_html($cat); ?></option>
                        <?php endforeach; ?>
                    </select>
                </div>
                <?php endif; ?>

                <?php if ($atts['show_duration'] === 'yes' && $has_durations): ?>
                <div class="tc-hero-field">
                    <label class="tc-hero-label">Reisduur</label>
                    <select name="dagen" class="tc-hero-select">
                        <option value="">Alle reisduren</option>
                        <option value="1-7" <?php selected($sel_dagen, '1-7'); ?>>1-7 dagen</option>
                        <option value="8-14" <?php selected($sel_dagen, '8-14'); ?>>8-14 dagen</option>
                        <option value="15-21" <?php selected($sel_dagen, '15-21'); ?>>15-21 dagen</option>
                        <option value="22+" <?php selected($sel_dagen, '22+'); ?>>22+ dagen</option>
                    </select>
                </div>
                <?php endif; ?>

                <button type="submit" class="tc-hero-button">
                    <span>Zoek Reizen</span>
                </button>
            </form>
        </div>

        <?php if ($atts['show_theme_link'] === 'yes' && !empty($atts['theme_text'])): ?>
        <div class="tc-theme-link">
            <span class="tc-theme-text"><?php echo esc_html($atts['theme_text']); ?></span>
        </div>
        <?php endif; ?>
    </div>

    <style>
    .tc-hero-search {
        width: 100%;
        max-width: 920px;
        margin: 0 auto;
        padding: 0 20px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        box-sizing: border-box;
    }
    .tc-hero-search *, .tc-hero-search *::before, .tc-hero-search *::after { box-sizing: border-box; }

    .tc-hero-widget {
        background: rgba(255, 255, 255, 0.98);
        border-radius: 16px;
        padding: 24px;
        box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
    }

    .tc-hero-form {
        display: flex;
        align-items: flex-end;
        gap: 16px;
    }

    .tc-hero-field {
        flex: 1;
        min-width: 0;
    }

    .tc-hero-label {
        display: block;
        font-size: 12px;
        font-weight: 600;
        color: #64748b;
        margin-bottom: 8px;
        text-transform: uppercase;
        letter-spacing: 0.5px;
    }

    .tc-hero-select {
        width: 100%;
        height: 50px;
        padding: 0 40px 0 16px;
        border: 2px solid #e2e8f0;
        border-radius: 10px;
        font-size: 15px;
        font-weight: 500;
        color: #1e293b;
        background-color: #fff;
        cursor: pointer;
        appearance: none;
        -webkit-appearance: none;
        -moz-appearance: none;
        background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%2364748b' d='M6 8L1 3h10z'/%3E%3C/svg%3E");
        background-repeat: no-repeat;
        background-position: right 16px center;
        transition: all 0.2s ease;
    }

    .tc-hero-select:hover { border-color: #cbd5e1; }
    .tc-hero-select:focus {
        outline: none;
        border-color: <?php echo $primary; ?>;
        box-shadow: 0 0 0 4px <?php echo $primary; ?>22;
    }

    .tc-hero-button {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 10px;
        height: 50px;
        padding: 0 32px;
        background: <?php echo $secondary; ?>;
        color: #fff;
        border: none;
        border-radius: 10px;
        font-size: 16px;
        font-weight: 700;
        cursor: pointer;
        transition: all 0.2s ease;
        white-space: nowrap;
        flex-shrink: 0;
    }

    .tc-hero-button:hover {
        transform: translateY(-2px);
        box-shadow: 0 6px 20px <?php echo $secondary; ?>66;
        filter: brightness(1.1);
    }

    .tc-hero-button:active { transform: translateY(0); }

    .tc-theme-link {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 12px;
        margin-top: 24px;
        padding: 16px;
    }

    .tc-theme-text {
        font-family: 'Caveat', 'Segoe Script', cursive;
        font-size: 26px;
        color: #fff;
        text-shadow: 0 2px 8px rgba(0, 0, 0, 0.4);
        font-style: italic;
    }

    .tc-theme-link::before {
        content: '↙';
        font-size: 28px;
        color: #fff;
        text-shadow: 0 2px 8px rgba(0, 0, 0, 0.4);
        animation: tc-arrow-bounce 1.5s ease-in-out infinite;
    }

    @keyframes tc-arrow-bounce {
        0%, 100% { transform: translate(0, 0); }
        50% { transform: translate(-5px, 5px); }
    }

    @media (max-width: 768px) {
        .tc-hero-form { flex-wrap: wrap; }
        .tc-hero-field { flex: 1 1 calc(50% - 8px); min-width: calc(50% - 8px); }
        .tc-hero-button { flex: 1 1 100%; margin-top: 8px; }
    }

    @media (max-width: 480px) {
        .tc-hero-search { padding: 0 12px; }
        .tc-hero-widget { padding: 16px; border-radius: 12px; }
        .tc-hero-form { flex-direction: column; gap: 12px; }
        .tc-hero-field { flex: 1 1 100%; min-width: 100%; }
        .tc-hero-button { width: 100%; height: 54px; font-size: 17px; }
        .tc-theme-text { font-size: 22px; }
    }
    </style>
    <?php
    return ob_get_clean();
});

// ============================================
// WPForms → TravelC Studio integration
// Automatically sends WPForms submissions to Supabase Edge Function
// ============================================
add_action('wpforms_process_complete', function($fields, $entry, $form_data, $entry_id) {
    $brand_id = get_option('travelc_brand_id', '');
    if (empty($brand_id)) return;

    // Check if this form has TravelC forwarding enabled (via form tag or always-on setting)
    $forward_all = get_option('travelc_forward_wpforms', '1');
    $form_tags = strtolower($form_data['settings']['form_title'] ?? '');
    
    // Skip if forwarding is disabled and form doesn't contain relevant keywords
    if ($forward_all !== '1') {
        $keywords = ['offerte', 'contact', 'aanvraag', 'quote', 'info', 'reizen', 'reis'];
        $found = false;
        foreach ($keywords as $kw) {
            if (strpos($form_tags, $kw) !== false) { $found = true; break; }
        }
        if (!$found) return;
    }

    // Map WPForms fields to our format using partial label matching
    $mapped = [
        'customer_name' => '',
        'customer_email' => '',
        'customer_phone' => '',
        'message' => '',
        'departure_date' => '',
        'number_of_persons' => '',
    ];

    $name_keywords = ['naam', 'name', 'voornaam', 'achternaam'];
    $email_keywords = ['mail', 'email', 'e-mail'];
    $phone_keywords = ['telefoon', 'phone', 'tel', 'mobiel', 'gsm'];
    $date_keywords = ['vertrek', 'datum', 'departure', 'date', 'reisdatum'];
    $persons_keywords = ['personen', 'aantal volwassenen', 'persons', 'reizigers'];

    // Helper: check if label contains any keyword
    $label_contains = function($label, $keywords) {
        foreach ($keywords as $kw) {
            if (strpos($label, $kw) !== false) return true;
        }
        return false;
    };

    // Collect all fields as structured summary
    $all_fields_summary = [];

    foreach ($fields as $field) {
        $label = strtolower(trim($field['name'] ?? ''));
        $value = trim($field['value'] ?? '');
        if (empty($value)) continue;

        // Collect everything for the message summary
        $all_fields_summary[] = ($field['name'] ?? 'Veld') . ': ' . $value;

        // Name: match by type or keyword in label
        if ($field['type'] === 'name' || (!$mapped['customer_name'] && $label_contains($label, $name_keywords))) {
            $mapped['customer_name'] = $value;
        } elseif ($field['type'] === 'email' || (!$mapped['customer_email'] && $label_contains($label, $email_keywords))) {
            $mapped['customer_email'] = $value;
        } elseif ($field['type'] === 'phone' || (!$mapped['customer_phone'] && $label_contains($label, $phone_keywords))) {
            $mapped['customer_phone'] = $value;
        } elseif ($field['type'] === 'date-time' && !$mapped['departure_date'] && $label_contains($label, $date_keywords)) {
            $mapped['departure_date'] = $value;
        } elseif (!$mapped['number_of_persons'] && $label_contains($label, $persons_keywords)) {
            $mapped['number_of_persons'] = $value;
        }
    }

    // Use full form summary as message so no data is lost
    $mapped['message'] = implode("\n", $all_fields_summary);

    // Determine request type from form title
    $request_type = 'contact';
    if (strpos($form_tags, 'offerte') !== false || strpos($form_tags, 'quote') !== false) {
        $request_type = 'quote';
    } elseif (strpos($form_tags, 'info') !== false) {
        $request_type = 'info';
    }

    // Build payload
    $payload = [
        'brand_id' => $brand_id,
        'customer_name' => $mapped['customer_name'],
        'customer_email' => $mapped['customer_email'],
        'customer_phone' => $mapped['customer_phone'] ?: null,
        'message' => $mapped['message'] ?: null,
        'departure_date' => $mapped['departure_date'] ?: null,
        'number_of_persons' => $mapped['number_of_persons'] ?: null,
        'request_type' => $request_type,
        'source_url' => wp_get_referer() ?: ($_SERVER['HTTP_REFERER'] ?? ''),
        'travel_title' => $form_data['settings']['form_title'] ?? '',
    ];

    // Debug: log raw fields from WPForms
    error_log('[TravelC] WPForms fields dump: ' . print_r($fields, true));
    error_log('[TravelC] Mapped payload: ' . json_encode($payload, JSON_PRETTY_PRINT));

    // Skip if no name or email found
    if (empty($payload['customer_name']) || empty($payload['customer_email'])) {
        error_log('[TravelC] WPForms forward skipped: missing name or email. Form: ' . ($form_data['settings']['form_title'] ?? 'unknown'));
        return;
    }

    // Send to Edge Function
    $endpoint = 'https://huaaogdxxdcakxryecnw.supabase.co/functions/v1/travel-quote-request';
    $json_body = json_encode($payload);
    error_log('[TravelC] Sending to endpoint: ' . $endpoint);
    error_log('[TravelC] JSON body: ' . $json_body);

    $response = wp_remote_post($endpoint, [
        'timeout' => 15,
        'headers' => [
            'Content-Type' => 'application/json',
            'Accept' => 'application/json',
        ],
        'body' => $json_body,
        'blocking' => true,
        'sslverify' => true,
    ]);

    if (is_wp_error($response)) {
        error_log('[TravelC] WPForms forward error: ' . $response->get_error_message());
    } else {
        $resp_code = wp_remote_retrieve_response_code($response);
        $resp_body = wp_remote_retrieve_body($response);
        error_log('[TravelC] Response code: ' . $resp_code . ' body: ' . $resp_body);
    }
}, 10, 4);

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
