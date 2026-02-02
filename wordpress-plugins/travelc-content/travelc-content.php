<?php
/**
 * Plugin Name: TravelC Content
 * Plugin URI: https://travelcstudio.com
 * Description: Synchroniseert nieuws en bestemmingen van TravelCStudio naar WordPress. Content wordt beheerd in TravelCStudio en automatisch getoond op WordPress sites van brands die de content hebben geactiveerd.
 * Version: 1.0.0
 * Author: RRP System
 * Author URI: https://rrpsystem.com
 * License: GPL v2 or later
 * Text Domain: travelc-content
 * Domain Path: /languages
 * Requires at least: 5.8
 * Requires PHP: 7.4
 */

if (!defined('ABSPATH')) exit;

define('TCC_VERSION', '1.0.0');
define('TCC_PLUGIN_DIR', plugin_dir_path(__FILE__));
define('TCC_PLUGIN_URL', plugin_dir_url(__FILE__));

// TravelCStudio Network Settings (same for all brands)
define('TCC_SUPABASE_URL', 'https://huaaogdxxdcakxryecnw.supabase.co');
define('TCC_SUPABASE_KEY', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh1YWFvZ2R4eGRjYWt4cnllY253Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mjk2MjA2NDAsImV4cCI6MjA0NTE5NjY0MH0.r064T3EXYfXFjOqxbLuPPWbMDBqXx6SHBYrnmhWjlPI');

// Load Elementor Dynamic Tags if Elementor is active
add_action('elementor/init', function() {
    require_once TCC_PLUGIN_DIR . 'elementor-dynamic-tags.php';
});

// Load Shortcodes
require_once TCC_PLUGIN_DIR . 'shortcodes/highlights-carousel.php';
require_once TCC_PLUGIN_DIR . 'shortcodes/cities-carousel.php';

class TravelC_Content {
    
    private static $instance = null;
    private $supabase_url;
    private $supabase_key;
    private $brand_id;
    
    public static function get_instance() {
        if (null === self::$instance) {
            self::$instance = new self();
        }
        return self::$instance;
    }
    
    private function __construct() {
        $this->supabase_url = TCC_SUPABASE_URL;
        $this->supabase_key = TCC_SUPABASE_KEY;
        $this->brand_id = get_option('tcc_brand_id', '');
        
        add_action('admin_menu', array($this, 'add_admin_menu'));
        add_action('admin_init', array($this, 'register_settings'));
        
        // Shortcodes
        add_shortcode('travelc_news', array($this, 'news_shortcode'));
        add_shortcode('travelc_news_single', array($this, 'news_single_shortcode'));
        add_shortcode('travelc_destination', array($this, 'destination_shortcode'));
        add_shortcode('travelc_destinations_menu', array($this, 'destinations_menu_shortcode'));
        
        // Individual field shortcodes for custom layouts
        add_shortcode('travelc_field', array($this, 'field_shortcode'));
        add_shortcode('travelc_destination_title', array($this, 'destination_title_shortcode'));
        add_shortcode('travelc_destination_intro', array($this, 'destination_intro_shortcode'));
        add_shortcode('travelc_destination_description', array($this, 'destination_description_shortcode'));
        add_shortcode('travelc_destination_transportation', array($this, 'destination_transportation_shortcode'));
        add_shortcode('travelc_destination_image', array($this, 'destination_image_shortcode'));
        add_shortcode('travelc_destination_climate', array($this, 'destination_climate_shortcode'));
        add_shortcode('travelc_destination_highlights', array($this, 'destination_highlights_shortcode'));
        add_shortcode('travelc_destination_regions', array($this, 'destination_regions_shortcode'));
        add_shortcode('travelc_destination_facts', array($this, 'destination_facts_shortcode'));
        add_shortcode('travelc_destination_info', array($this, 'destination_info_shortcode'));
        
        // REST API endpoints
        add_action('rest_api_init', array($this, 'register_rest_routes'));
        
        // Enqueue styles
        add_action('wp_enqueue_scripts', array($this, 'enqueue_styles'));
        
        // Rewrite rules for destination and news pages
        add_action('init', array($this, 'add_rewrite_rules'));
        add_filter('query_vars', array($this, 'add_query_vars'));
        add_action('template_redirect', array($this, 'handle_virtual_pages'));
        
        // Flush rewrite rules on activation
        register_activation_hook(__FILE__, array($this, 'activate'));
    }
    
    /**
     * Plugin activation - flush rewrite rules
     */
    public function activate() {
        $this->add_rewrite_rules();
        flush_rewrite_rules();
    }
    
    /**
     * Add rewrite rules for virtual pages
     */
    public function add_rewrite_rules() {
        add_rewrite_rule(
            '^land/([^/]+)/?$',
            'index.php?tcc_destination=$matches[1]',
            'top'
        );
        add_rewrite_rule(
            '^nieuws/([^/]+)/?$',
            'index.php?tcc_news=$matches[1]',
            'top'
        );
    }
    
    /**
     * Add custom query vars
     */
    public function add_query_vars($vars) {
        $vars[] = 'tcc_destination';
        $vars[] = 'tcc_news';
        return $vars;
    }
    
    /**
     * Handle virtual pages for destinations and news
     */
    public function handle_virtual_pages() {
        $destination_slug = get_query_var('tcc_destination');
        $news_slug = get_query_var('tcc_news');
        
        if ($destination_slug) {
            $this->render_destination_page($destination_slug);
            exit;
        }
        
        if ($news_slug) {
            $this->render_news_page($news_slug);
            exit;
        }
    }
    
    /**
     * Render destination page
     */
    private function render_destination_page($slug) {
        $destination = $this->get_destination_by_slug($slug);
        
        if (!$destination) {
            global $wp_query;
            $wp_query->set_404();
            status_header(404);
            get_template_part(404);
            return;
        }
        
        // Get theme header
        get_header();
        
        echo '<div class="tcc-destination-page">';
        echo do_shortcode('[travelc_destination slug="' . esc_attr($slug) . '"]');
        echo '</div>';
        
        // Get theme footer
        get_footer();
    }
    
    /**
     * Render news page
     */
    private function render_news_page($slug) {
        $news = $this->get_news_by_slug($slug);
        
        if (!$news) {
            global $wp_query;
            $wp_query->set_404();
            status_header(404);
            get_template_part(404);
            return;
        }
        
        // Get theme header
        get_header();
        
        echo '<div class="tcc-news-page">';
        echo do_shortcode('[travelc_news_single slug="' . esc_attr($slug) . '"]');
        echo '</div>';
        
        // Get theme footer
        get_footer();
    }
    
    /**
     * Admin Menu
     */
    public function add_admin_menu() {
        add_menu_page(
            'TravelC Content',
            'TravelC Content',
            'manage_options',
            'travelc-content',
            array($this, 'settings_page'),
            'dashicons-airplane',
            30
        );
    }
    
    /**
     * Register Settings
     */
    public function register_settings() {
        register_setting('tcc_settings', 'tcc_brand_id');
    }
    
    /**
     * Settings Page
     */
    public function settings_page() {
        ?>
        <div class="wrap">
            <h1>TravelC Content Instellingen</h1>
            
            <form method="post" action="options.php">
                <?php settings_fields('tcc_settings'); ?>
                
                <table class="form-table">
                    <tr>
                        <th scope="row">Brand ID</th>
                        <td>
                            <input type="text" name="tcc_brand_id" 
                                   value="<?php echo esc_attr(get_option('tcc_brand_id')); ?>" 
                                   class="regular-text" 
                                   placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" />
                            <p class="description">De UUID van deze brand in TravelCStudio (te vinden in je dashboard)</p>
                        </td>
                    </tr>
                </table>
                
                <?php submit_button('Instellingen Opslaan'); ?>
            </form>
            
            <div style="background: #f0f0f1; padding: 15px; border-radius: 5px; margin-top: 20px;">
                <h3 style="margin-top: 0;">🔗 TravelCStudio Netwerk</h3>
                <p>Deze plugin is automatisch verbonden met het TravelCStudio netwerk. Je hoeft alleen je Brand ID in te vullen.</p>
                <code style="display: block; padding: 10px; background: #fff; margin-top: 10px;">
                    Server: <?php echo esc_html(TCC_SUPABASE_URL); ?>
                </code>
            </div>
            
            <hr>
            
            <h2>Beschikbare Shortcodes</h2>
            
            <h3>📦 Complete weergaves</h3>
            <table class="widefat">
                <thead>
                    <tr>
                        <th>Shortcode</th>
                        <th>Beschrijving</th>
                        <th>Parameters</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td><code>[travelc_news]</code></td>
                        <td>Toont nieuwsoverzicht</td>
                        <td>limit="10", columns="3", show_image="yes"</td>
                    </tr>
                    <tr>
                        <td><code>[travelc_news_single slug="artikel-slug"]</code></td>
                        <td>Toont één nieuwsartikel</td>
                        <td>slug (verplicht)</td>
                    </tr>
                    <tr>
                        <td><code>[travelc_destination slug="peru"]</code></td>
                        <td>Toont complete bestemmingspagina</td>
                        <td>slug (verplicht)</td>
                    </tr>
                    <tr>
                        <td><code>[travelc_destinations_menu]</code></td>
                        <td>Toont mega menu met alle bestemmingen</td>
                        <td>group_by="continent"</td>
                    </tr>
                </tbody>
            </table>
            
            <h3 style="margin-top: 20px;">🎨 Individuele velden (voor eigen layouts in Elementor)</h3>
            <p><em>Gebruik deze shortcodes om zelf je pagina-layout te bepalen. Plaats ze waar je wilt in Elementor!</em></p>
            <table class="widefat">
                <thead>
                    <tr>
                        <th>Shortcode</th>
                        <th>Beschrijving</th>
                        <th>Parameters</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td><code>[travelc_destination_title slug="italie"]</code></td>
                        <td>Alleen de titel</td>
                        <td>slug (verplicht)</td>
                    </tr>
                    <tr>
                        <td><code>[travelc_destination_intro slug="italie"]</code></td>
                        <td>Korte introductietekst</td>
                        <td>slug (verplicht)</td>
                    </tr>
                    <tr>
                        <td><code>[travelc_destination_description slug="italie"]</code></td>
                        <td>Uitgebreide beschrijving over het land</td>
                        <td>slug (verplicht)</td>
                    </tr>
                    <tr>
                        <td><code>[travelc_destination_transportation slug="italie"]</code></td>
                        <td>Vervoer & rondreizen (trein, huurauto, etc.)</td>
                        <td>slug (verplicht)</td>
                    </tr>
                    <tr>
                        <td><code>[travelc_destination_image slug="italie"]</code></td>
                        <td>Featured afbeelding</td>
                        <td>slug, class="mijn-class", alt="alt tekst"</td>
                    </tr>
                    <tr>
                        <td><code>[travelc_destination_climate slug="italie"]</code></td>
                        <td>Klimaat + beste reistijd</td>
                        <td>slug (verplicht)</td>
                    </tr>
                    <tr>
                        <td><code>[travelc_destination_highlights slug="italie"]</code></td>
                        <td>Hoogtepunten</td>
                        <td>slug, columns="3", style="cards|list"</td>
                    </tr>
                    <tr>
                        <td><code>[travelc_destination_regions slug="italie"]</code></td>
                        <td>Regio's</td>
                        <td>slug, columns="3"</td>
                    </tr>
                    <tr>
                        <td><code>[travelc_destination_facts slug="italie"]</code></td>
                        <td>Weetjes/feiten</td>
                        <td>slug, style="list|table"</td>
                    </tr>
                    <tr>
                        <td><code>[travelc_destination_info slug="italie"]</code></td>
                        <td>Praktische info (valuta, taal, etc.)</td>
                        <td>slug, fields="currency,language,timezone,visa_info", style="list|icons"</td>
                    </tr>
                    <tr>
                        <td><code>[travelc_field slug="italie" field="climate"]</code></td>
                        <td>Elk willekeurig veld ophalen</td>
                        <td>slug, field (title, country, continent, intro_text, climate, currency, language, timezone, visa_info, best_time_to_visit)</td>
                    </tr>
                </tbody>
            </table>
            
            <h3 style="margin-top: 20px;">🎯 Elementor Dynamic Tags</h3>
            <p><em>Als Elementor actief is, kun je deze Dynamic Tags gebruiken in je widgets:</em></p>
            <table class="widefat">
                <thead>
                    <tr>
                        <th>Dynamic Tag</th>
                        <th>Beschrijving</th>
                        <th>Gebruik in</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td><strong>TravelC Titel</strong></td>
                        <td>Bestemmingsnaam</td>
                        <td>Heading, Text Editor</td>
                    </tr>
                    <tr>
                        <td><strong>TravelC Introductie</strong></td>
                        <td>Korte introductietekst</td>
                        <td>Text Editor</td>
                    </tr>
                    <tr>
                        <td><strong>TravelC Beschrijving</strong></td>
                        <td>Uitgebreide beschrijving</td>
                        <td>Text Editor</td>
                    </tr>
                    <tr>
                        <td><strong>TravelC Vervoer</strong></td>
                        <td>Vervoer & rondreizen tips</td>
                        <td>Text Editor</td>
                    </tr>
                    <tr>
                        <td><strong>TravelC Klimaat</strong></td>
                        <td>Klimaatinformatie</td>
                        <td>Text Editor</td>
                    </tr>
                    <tr>
                        <td><strong>TravelC Veld</strong></td>
                        <td>Elk veld (dropdown keuze)</td>
                        <td>Text Editor</td>
                    </tr>
                    <tr>
                        <td><strong>TravelC Afbeelding</strong></td>
                        <td>Featured of galerij afbeelding</td>
                        <td>Image widget</td>
                    </tr>
                    <tr>
                        <td><strong>TravelC Galerij</strong></td>
                        <td>Alle afbeeldingen als galerij</td>
                        <td>Image Carousel, Gallery</td>
                    </tr>
                </tbody>
            </table>
            <p class="description" style="margin-top: 10px;">
                💡 <strong>Tip:</strong> Koppel je bestaande Elementor pagina's aan TravelCStudio via de "TravelCStudio Koppeling" meta box in de sidebar. 
                Vul daar de bestemming slug in (bijv. "italie") en de Dynamic Tags halen automatisch de juiste content op.
            </p>
            
            <hr>
            
            <h2>Connectie Test</h2>
            <?php $this->test_connection(); ?>
        </div>
        <?php
    }
    
    /**
     * Test Supabase Connection
     */
    private function test_connection() {
        if (empty($this->supabase_key) || empty($this->brand_id)) {
            echo '<p style="color: orange;">⚠️ Configureer eerst de Supabase key en Brand ID</p>';
            return;
        }
        
        $result = $this->fetch_from_supabase('news_brand_assignments', array(
            'brand_id' => 'eq.' . $this->brand_id,
            'status' => 'in.(accepted,mandatory)',
            'select' => 'id',
            'limit' => 1
        ));
        
        if (is_wp_error($result)) {
            echo '<p style="color: red;">❌ Connectie mislukt: ' . esc_html($result->get_error_message()) . '</p>';
        } else {
            echo '<p style="color: green;">✅ Connectie succesvol!</p>';
            
            // Count activated content
            $news_count = $this->count_activated_news();
            $dest_count = $this->count_activated_destinations();
            
            echo '<p>📰 Geactiveerde nieuwsartikelen: <strong>' . intval($news_count) . '</strong></p>';
            echo '<p>🌍 Geactiveerde bestemmingen: <strong>' . intval($dest_count) . '</strong></p>';
        }
    }
    
    /**
     * Fetch data from Supabase
     */
    private function fetch_from_supabase($table, $params = array()) {
        if (empty($this->supabase_url) || empty($this->supabase_key)) {
            return new WP_Error('config_error', 'Supabase niet geconfigureerd');
        }
        
        $url = trailingslashit($this->supabase_url) . 'rest/v1/' . $table;
        
        if (!empty($params)) {
            $url .= '?' . http_build_query($params);
        }
        
        $response = wp_remote_get($url, array(
            'headers' => array(
                'apikey' => $this->supabase_key,
                'Authorization' => 'Bearer ' . $this->supabase_key,
                'Content-Type' => 'application/json',
                'Prefer' => 'return=representation'
            ),
            'timeout' => 15
        ));
        
        if (is_wp_error($response)) {
            return $response;
        }
        
        $body = wp_remote_retrieve_body($response);
        $data = json_decode($body, true);
        
        if (json_last_error() !== JSON_ERROR_NONE) {
            return new WP_Error('json_error', 'Ongeldige JSON response');
        }
        
        return $data;
    }
    
    /**
     * Count activated news for this brand
     */
    private function count_activated_news() {
        $result = $this->fetch_from_supabase('news_brand_assignments', array(
            'brand_id' => 'eq.' . $this->brand_id,
            'status' => 'in.(accepted,mandatory)',
            'select' => 'id'
        ));
        
        return is_array($result) ? count($result) : 0;
    }
    
    /**
     * Count activated destinations for this brand
     */
    private function count_activated_destinations() {
        $result = $this->fetch_from_supabase('destination_brand_assignments', array(
            'brand_id' => 'eq.' . $this->brand_id,
            'status' => 'in.(accepted,mandatory)',
            'is_published' => 'eq.true',
            'select' => 'id'
        ));
        
        return is_array($result) ? count($result) : 0;
    }
    
    /**
     * Get activated news items for this brand
     */
    public function get_news_items($limit = 10) {
        if (empty($this->brand_id)) {
            return array();
        }
        
        // First get the news IDs that are activated for this brand
        $assignments = $this->fetch_from_supabase('news_brand_assignments', array(
            'brand_id' => 'eq.' . $this->brand_id,
            'status' => 'in.(accepted,mandatory)',
            'select' => 'news_id'
        ));
        
        if (is_wp_error($assignments) || empty($assignments)) {
            return array();
        }
        
        $news_ids = array_column($assignments, 'news_id');
        
        if (empty($news_ids)) {
            return array();
        }
        
        // Now fetch the actual news items
        $news = $this->fetch_from_supabase('news_items', array(
            'id' => 'in.(' . implode(',', $news_ids) . ')',
            'status' => 'eq.published',
            'select' => 'id,title,slug,excerpt,content,featured_image,tags,created_at,published_at',
            'order' => 'published_at.desc,created_at.desc',
            'limit' => $limit
        ));
        
        return is_array($news) ? $news : array();
    }
    
    /**
     * Get single news item by slug
     */
    public function get_news_by_slug($slug) {
        if (empty($this->brand_id) || empty($slug)) {
            return null;
        }
        
        // First check if this news is activated for this brand
        $news = $this->fetch_from_supabase('news_items', array(
            'slug' => 'eq.' . $slug,
            'status' => 'eq.published',
            'select' => 'id,title,slug,excerpt,content,closing_text,featured_image,tags,created_at,published_at',
            'limit' => 1
        ));
        
        if (is_wp_error($news) || empty($news)) {
            return null;
        }
        
        $news_item = $news[0];
        
        // Verify this brand has access
        $assignment = $this->fetch_from_supabase('news_brand_assignments', array(
            'brand_id' => 'eq.' . $this->brand_id,
            'news_id' => 'eq.' . $news_item['id'],
            'status' => 'in.(accepted,mandatory)',
            'select' => 'id',
            'limit' => 1
        ));
        
        if (is_wp_error($assignment) || empty($assignment)) {
            return null;
        }
        
        return $news_item;
    }
    
    /**
     * Get activated destinations for this brand
     */
    public function get_destinations($group_by = null) {
        if (empty($this->brand_id)) {
            return array();
        }
        
        // First get the destination IDs that are activated for this brand
        $assignments = $this->fetch_from_supabase('destination_brand_assignments', array(
            'brand_id' => 'eq.' . $this->brand_id,
            'status' => 'in.(accepted,mandatory)',
            'select' => 'destination_id'
        ));
        
        if (is_wp_error($assignments) || empty($assignments)) {
            return array();
        }
        
        $dest_ids = array_column($assignments, 'destination_id');
        
        if (empty($dest_ids)) {
            return array();
        }
        
        // Now fetch the actual destinations
        $destinations = $this->fetch_from_supabase('destinations', array(
            'id' => 'in.(' . implode(',', $dest_ids) . ')',
            'select' => 'id,title,slug,country,continent,intro_text,featured_image,facts,climate,regions,highlights',
            'order' => 'continent.asc,country.asc,title.asc'
        ));
        
        if (!is_array($destinations)) {
            return array();
        }
        
        // Group by continent if requested
        if ($group_by === 'continent') {
            $grouped = array();
            foreach ($destinations as $dest) {
                $continent = $dest['continent'] ?? 'Overig';
                if (!isset($grouped[$continent])) {
                    $grouped[$continent] = array();
                }
                $grouped[$continent][] = $dest;
            }
            return $grouped;
        }
        
        return $destinations;
    }
    
    /**
     * Get single destination by slug
     */
    public function get_destination_by_slug($slug) {
        if (empty($this->brand_id) || empty($slug)) {
            return null;
        }
        
        // Fetch destination
        $destinations = $this->fetch_from_supabase('destinations', array(
            'slug' => 'eq.' . $slug,
            'select' => '*',
            'limit' => 1
        ));
        
        if (is_wp_error($destinations) || empty($destinations)) {
            return null;
        }
        
        $destination = $destinations[0];
        
        // Verify this brand has access
        $assignment = $this->fetch_from_supabase('destination_brand_assignments', array(
            'brand_id' => 'eq.' . $this->brand_id,
            'destination_id' => 'eq.' . $destination['id'],
            'status' => 'in.(accepted,mandatory)',
            'select' => 'id',
            'limit' => 1
        ));
        
        if (is_wp_error($assignment) || empty($assignment)) {
            return null;
        }
        
        return $destination;
    }
    
    /**
     * News Overview Shortcode
     */
    public function news_shortcode($atts) {
        $atts = shortcode_atts(array(
            'limit' => 10,
            'columns' => 3,
            'show_image' => 'yes',
            'show_excerpt' => 'yes',
            'show_date' => 'yes',
            'show_tags' => 'yes'
        ), $atts);
        
        $news_items = $this->get_news_items(intval($atts['limit']));
        
        if (empty($news_items)) {
            return '<p class="tcc-no-content">Geen nieuwsartikelen beschikbaar.</p>';
        }
        
        ob_start();
        ?>
        <div class="tcc-news-grid tcc-columns-<?php echo intval($atts['columns']); ?>">
            <?php foreach ($news_items as $item): ?>
                <article class="tcc-news-card">
                    <?php if ($atts['show_image'] === 'yes' && !empty($item['featured_image'])): ?>
                        <div class="tcc-news-image">
                            <a href="<?php echo esc_url($this->get_news_url($item['slug'])); ?>">
                                <img src="<?php echo esc_url($item['featured_image']); ?>" 
                                     alt="<?php echo esc_attr($item['title']); ?>" />
                            </a>
                        </div>
                    <?php endif; ?>
                    
                    <div class="tcc-news-content">
                        <h3 class="tcc-news-title">
                            <a href="<?php echo esc_url($this->get_news_url($item['slug'])); ?>">
                                <?php echo esc_html($item['title']); ?>
                            </a>
                        </h3>
                        
                        <?php if ($atts['show_date'] === 'yes'): ?>
                            <time class="tcc-news-date">
                                <?php echo date_i18n(get_option('date_format'), strtotime($item['published_at'] ?? $item['created_at'])); ?>
                            </time>
                        <?php endif; ?>
                        
                        <?php if ($atts['show_excerpt'] === 'yes' && !empty($item['excerpt'])): ?>
                            <p class="tcc-news-excerpt"><?php echo esc_html($item['excerpt']); ?></p>
                        <?php endif; ?>
                        
                        <?php if ($atts['show_tags'] === 'yes' && !empty($item['tags'])): ?>
                            <div class="tcc-news-tags">
                                <?php foreach ($item['tags'] as $tag): ?>
                                    <span class="tcc-tag"><?php echo esc_html($tag); ?></span>
                                <?php endforeach; ?>
                            </div>
                        <?php endif; ?>
                        
                        <a href="<?php echo esc_url($this->get_news_url($item['slug'])); ?>" class="tcc-read-more">
                            Lees meer →
                        </a>
                    </div>
                </article>
            <?php endforeach; ?>
        </div>
        <?php
        return ob_get_clean();
    }
    
    /**
     * Single News Shortcode
     */
    public function news_single_shortcode($atts) {
        $atts = shortcode_atts(array(
            'slug' => ''
        ), $atts);
        
        if (empty($atts['slug'])) {
            // Try to get slug from URL
            $atts['slug'] = get_query_var('tcc_news_slug', '');
        }
        
        if (empty($atts['slug'])) {
            return '<p class="tcc-error">Geen artikel slug opgegeven.</p>';
        }
        
        $news = $this->get_news_by_slug($atts['slug']);
        
        if (!$news) {
            return '<p class="tcc-error">Artikel niet gevonden of niet beschikbaar.</p>';
        }
        
        ob_start();
        ?>
        <article class="tcc-news-single">
            <?php if (!empty($news['featured_image'])): ?>
                <div class="tcc-news-featured-image">
                    <img src="<?php echo esc_url($news['featured_image']); ?>" 
                         alt="<?php echo esc_attr($news['title']); ?>" />
                </div>
            <?php endif; ?>
            
            <header class="tcc-news-header">
                <h1 class="tcc-news-title"><?php echo esc_html($news['title']); ?></h1>
                
                <div class="tcc-news-meta">
                    <time class="tcc-news-date">
                        <?php echo date_i18n(get_option('date_format'), strtotime($news['published_at'] ?? $news['created_at'])); ?>
                    </time>
                    
                    <?php if (!empty($news['tags'])): ?>
                        <div class="tcc-news-tags">
                            <?php foreach ($news['tags'] as $tag): ?>
                                <span class="tcc-tag"><?php echo esc_html($tag); ?></span>
                            <?php endforeach; ?>
                        </div>
                    <?php endif; ?>
                </div>
            </header>
            
            <div class="tcc-news-body">
                <?php 
                $content = $news['content'];
                if (is_array($content) && isset($content['html'])) {
                    echo wp_kses_post($content['html']);
                } else {
                    echo wp_kses_post($content);
                }
                ?>
            </div>
            
            <?php if (!empty($news['closing_text'])): ?>
                <div class="tcc-news-closing">
                    <?php echo wp_kses_post($news['closing_text']); ?>
                </div>
            <?php endif; ?>
        </article>
        <?php
        return ob_get_clean();
    }
    
    /**
     * Destination Shortcode
     */
    public function destination_shortcode($atts) {
        $atts = shortcode_atts(array(
            'slug' => ''
        ), $atts);
        
        if (empty($atts['slug'])) {
            $atts['slug'] = get_query_var('tcc_destination_slug', '');
        }
        
        if (empty($atts['slug'])) {
            return '<p class="tcc-error">Geen bestemming slug opgegeven.</p>';
        }
        
        $destination = $this->get_destination_by_slug($atts['slug']);
        
        if (!$destination) {
            return '<p class="tcc-error">Bestemming niet gevonden of niet beschikbaar.</p>';
        }
        
        ob_start();
        ?>
        <article class="tcc-destination">
            <?php if (!empty($destination['featured_image'])): ?>
                <div class="tcc-destination-hero">
                    <img src="<?php echo esc_url($destination['featured_image']); ?>" 
                         alt="<?php echo esc_attr($destination['title']); ?>" />
                    <h1 class="tcc-destination-title"><?php echo esc_html($destination['title']); ?></h1>
                </div>
            <?php else: ?>
                <h1 class="tcc-destination-title"><?php echo esc_html($destination['title']); ?></h1>
            <?php endif; ?>
            
            <?php if (!empty($destination['intro_text'])): ?>
                <div class="tcc-destination-intro">
                    <?php echo wp_kses_post($destination['intro_text']); ?>
                </div>
            <?php endif; ?>
            
            <div class="tcc-destination-content">
                <?php if (!empty($destination['facts'])): ?>
                    <section class="tcc-destination-section tcc-facts">
                        <h2>Weetjes</h2>
                        <ul>
                            <?php 
                            $facts = is_array($destination['facts']) ? $destination['facts'] : json_decode($destination['facts'], true);
                            if ($facts):
                                foreach ($facts as $fact): ?>
                                    <li><?php echo esc_html($fact); ?></li>
                                <?php endforeach;
                            endif; ?>
                        </ul>
                    </section>
                <?php endif; ?>
                
                <?php if (!empty($destination['climate'])): ?>
                    <section class="tcc-destination-section tcc-climate">
                        <h2>Klimaat & Beste Reistijd</h2>
                        <?php echo wp_kses_post($destination['climate']); ?>
                    </section>
                <?php endif; ?>
                
                <?php if (!empty($destination['regions'])): ?>
                    <section class="tcc-destination-section tcc-regions">
                        <h2>Regio's om te ontdekken</h2>
                        <div class="tcc-regions-grid">
                            <?php 
                            $regions = is_array($destination['regions']) ? $destination['regions'] : json_decode($destination['regions'], true);
                            if ($regions):
                                foreach ($regions as $region): ?>
                                    <div class="tcc-region-card">
                                        <h3><?php echo esc_html($region['name'] ?? $region['title'] ?? ''); ?></h3>
                                        <p><?php echo esc_html($region['description'] ?? ''); ?></p>
                                    </div>
                                <?php endforeach;
                            endif; ?>
                        </div>
                    </section>
                <?php endif; ?>
                
                <?php if (!empty($destination['highlights'])): ?>
                    <section class="tcc-destination-section tcc-highlights">
                        <h2>Hoogtepunten</h2>
                        <div class="tcc-highlights-grid">
                            <?php 
                            $highlights = is_array($destination['highlights']) ? $destination['highlights'] : json_decode($destination['highlights'], true);
                            if ($highlights):
                                foreach ($highlights as $highlight): ?>
                                    <div class="tcc-highlight-card">
                                        <?php if (!empty($highlight['image'])): ?>
                                            <img src="<?php echo esc_url($highlight['image']); ?>" alt="" />
                                        <?php endif; ?>
                                        <h3><?php echo esc_html($highlight['name'] ?? $highlight['title'] ?? ''); ?></h3>
                                        <p><?php echo esc_html($highlight['description'] ?? ''); ?></p>
                                    </div>
                                <?php endforeach;
                            endif; ?>
                        </div>
                    </section>
                <?php endif; ?>
            </div>
        </article>
        <?php
        return ob_get_clean();
    }
    
    /**
     * Destinations Menu Shortcode (for mega menu)
     */
    public function destinations_menu_shortcode($atts) {
        $atts = shortcode_atts(array(
            'group_by' => 'continent',
            'layout' => 'mega'
        ), $atts);
        
        $destinations = $this->get_destinations($atts['group_by']);
        
        if (empty($destinations)) {
            return '<p class="tcc-no-content">Geen bestemmingen beschikbaar.</p>';
        }
        
        ob_start();
        ?>
        <div class="tcc-destinations-menu tcc-layout-<?php echo esc_attr($atts['layout']); ?>">
            <?php if ($atts['group_by'] === 'continent'): ?>
                <?php foreach ($destinations as $continent => $items): ?>
                    <div class="tcc-continent-group">
                        <h3 class="tcc-continent-title"><?php echo esc_html($continent); ?></h3>
                        <ul class="tcc-destination-list">
                            <?php foreach ($items as $dest): ?>
                                <li>
                                    <a href="<?php echo esc_url($this->get_destination_url($dest['slug'])); ?>">
                                        <?php echo esc_html($dest['title']); ?>
                                        <?php if (!empty($dest['country']) && $dest['country'] !== $dest['title']): ?>
                                            <span class="tcc-country">(<?php echo esc_html($dest['country']); ?>)</span>
                                        <?php endif; ?>
                                    </a>
                                </li>
                            <?php endforeach; ?>
                        </ul>
                    </div>
                <?php endforeach; ?>
            <?php else: ?>
                <ul class="tcc-destination-list">
                    <?php foreach ($destinations as $dest): ?>
                        <li>
                            <a href="<?php echo esc_url($this->get_destination_url($dest['slug'])); ?>">
                                <?php echo esc_html($dest['title']); ?>
                            </a>
                        </li>
                    <?php endforeach; ?>
                </ul>
            <?php endif; ?>
        </div>
        <?php
        return ob_get_clean();
    }
    
    /**
     * Get news URL
     */
    private function get_news_url($slug) {
        $news_page = get_option('tcc_news_page_id');
        if ($news_page) {
            return add_query_arg('artikel', $slug, get_permalink($news_page));
        }
        return home_url('/nieuws/' . $slug . '/');
    }
    
    /**
     * Get destination URL
     */
    private function get_destination_url($slug) {
        $dest_page = get_option('tcc_destination_page_id');
        if ($dest_page) {
            return add_query_arg('bestemming', $slug, get_permalink($dest_page));
        }
        return home_url('/bestemming/' . $slug . '/');
    }
    
    /**
     * Register REST API routes
     */
    public function register_rest_routes() {
        register_rest_route('travelc/v1', '/news', array(
            'methods' => 'GET',
            'callback' => array($this, 'api_get_news'),
            'permission_callback' => '__return_true'
        ));
        
        register_rest_route('travelc/v1', '/destinations', array(
            'methods' => 'GET',
            'callback' => array($this, 'api_get_destinations'),
            'permission_callback' => '__return_true'
        ));
        
        register_rest_route('travelc/v1', '/sync', array(
            'methods' => 'POST',
            'callback' => array($this, 'api_sync_content'),
            'permission_callback' => array($this, 'check_sync_permission')
        ));
    }
    
    /**
     * API: Get news
     */
    public function api_get_news($request) {
        $limit = $request->get_param('limit') ?: 10;
        $news = $this->get_news_items($limit);
        return rest_ensure_response($news);
    }
    
    /**
     * API: Get destinations
     */
    public function api_get_destinations($request) {
        $group_by = $request->get_param('group_by');
        $destinations = $this->get_destinations($group_by);
        return rest_ensure_response($destinations);
    }
    
    /**
     * API: Sync content (webhook from TravelCStudio)
     */
    public function api_sync_content($request) {
        // Clear any caches
        delete_transient('tcc_news_cache');
        delete_transient('tcc_destinations_cache');
        
        return rest_ensure_response(array(
            'success' => true,
            'message' => 'Cache cleared, content will be refreshed'
        ));
    }
    
    /**
     * Check sync permission
     */
    public function check_sync_permission($request) {
        $api_key = $request->get_header('X-TravelC-Key');
        $stored_key = get_option('tcc_sync_key');
        
        if (empty($stored_key)) {
            return true; // Allow if no key is set
        }
        
        return $api_key === $stored_key;
    }
    
    /**
     * Enqueue frontend styles
     */
    public function enqueue_styles() {
        wp_enqueue_style(
            'travelc-content',
            TCC_PLUGIN_URL . 'assets/css/travelc-content.css',
            array(),
            TCC_VERSION
        );
    }
    
    // ========================================
    // INDIVIDUAL FIELD SHORTCODES
    // For custom layouts in Elementor/WP
    // ========================================
    
    /**
     * Generic field shortcode - get any field from a destination
     * Usage: [travelc_field slug="italie" field="title"]
     * Available fields: title, country, continent, intro_text, featured_image, climate, 
     *                   best_time_to_visit, currency, language, timezone, visa_info
     */
    public function field_shortcode($atts) {
        $atts = shortcode_atts(array(
            'slug' => '',
            'field' => 'title',
            'type' => 'destination' // or 'news'
        ), $atts);
        
        if (empty($atts['slug'])) {
            return '';
        }
        
        if ($atts['type'] === 'news') {
            $item = $this->get_news_by_slug($atts['slug']);
        } else {
            $item = $this->get_destination_by_slug($atts['slug']);
        }
        
        if (!$item || !isset($item[$atts['field']])) {
            return '';
        }
        
        $value = $item[$atts['field']];
        
        // Handle arrays (like highlights, regions, facts)
        if (is_array($value)) {
            return wp_json_encode($value);
        }
        
        return esc_html($value);
    }
    
    /**
     * Destination title shortcode
     * Usage: [travelc_destination_title slug="italie"]
     */
    public function destination_title_shortcode($atts) {
        $atts = shortcode_atts(array('slug' => ''), $atts);
        if (empty($atts['slug'])) return '';
        
        $dest = $this->get_destination_by_slug($atts['slug']);
        return $dest ? esc_html($dest['title']) : '';
    }
    
    /**
     * Destination intro text shortcode
     * Usage: [travelc_destination_intro slug="italie"]
     */
    public function destination_intro_shortcode($atts) {
        $atts = shortcode_atts(array('slug' => ''), $atts);
        if (empty($atts['slug'])) return '';
        
        $dest = $this->get_destination_by_slug($atts['slug']);
        return $dest ? wp_kses_post($dest['intro_text'] ?? '') : '';
    }
    
    /**
     * Destination description shortcode (uitgebreide tekst)
     * Usage: [travelc_destination_description slug="italie"]
     */
    public function destination_description_shortcode($atts) {
        $atts = shortcode_atts(array('slug' => ''), $atts);
        if (empty($atts['slug'])) return '';
        
        $dest = $this->get_destination_by_slug($atts['slug']);
        return $dest ? wp_kses_post($dest['description'] ?? '') : '';
    }
    
    /**
     * Destination transportation shortcode (vervoer tips)
     * Usage: [travelc_destination_transportation slug="italie"]
     */
    public function destination_transportation_shortcode($atts) {
        $atts = shortcode_atts(array('slug' => ''), $atts);
        if (empty($atts['slug'])) return '';
        
        $dest = $this->get_destination_by_slug($atts['slug']);
        if (!$dest || empty($dest['transportation'])) return '';
        
        return '<div class="tcc-transportation">' . wp_kses_post($dest['transportation']) . '</div>';
    }
    
    /**
     * Destination featured image shortcode
     * Usage: [travelc_destination_image slug="italie" size="full" class="my-class"]
     */
    public function destination_image_shortcode($atts) {
        $atts = shortcode_atts(array(
            'slug' => '',
            'size' => 'full',
            'class' => 'tcc-destination-image',
            'alt' => ''
        ), $atts);
        
        if (empty($atts['slug'])) return '';
        
        $dest = $this->get_destination_by_slug($atts['slug']);
        if (!$dest || empty($dest['featured_image'])) return '';
        
        $alt = $atts['alt'] ?: ($dest['title'] ?? 'Destination');
        return '<img src="' . esc_url($dest['featured_image']) . '" alt="' . esc_attr($alt) . '" class="' . esc_attr($atts['class']) . '">';
    }
    
    /**
     * Destination climate shortcode
     * Usage: [travelc_destination_climate slug="italie"]
     */
    public function destination_climate_shortcode($atts) {
        $atts = shortcode_atts(array('slug' => ''), $atts);
        if (empty($atts['slug'])) return '';
        
        $dest = $this->get_destination_by_slug($atts['slug']);
        if (!$dest) return '';
        
        $climate = $dest['climate'] ?? '';
        $best_time = $dest['best_time_to_visit'] ?? '';
        
        $output = '';
        if ($climate) {
            $output .= '<div class="tcc-climate">' . wp_kses_post($climate) . '</div>';
        }
        if ($best_time) {
            $output .= '<div class="tcc-best-time"><strong>Beste reistijd:</strong> ' . esc_html($best_time) . '</div>';
        }
        
        return $output;
    }
    
    /**
     * Destination highlights shortcode
     * Usage: [travelc_destination_highlights slug="italie" columns="3"]
     */
    public function destination_highlights_shortcode($atts) {
        $atts = shortcode_atts(array(
            'slug' => '',
            'columns' => '3',
            'style' => 'cards' // cards, list, simple
        ), $atts);
        
        if (empty($atts['slug'])) return '';
        
        $dest = $this->get_destination_by_slug($atts['slug']);
        if (!$dest || empty($dest['highlights'])) return '';
        
        $highlights = $dest['highlights'];
        if (is_string($highlights)) {
            $highlights = json_decode($highlights, true);
        }
        if (!is_array($highlights) || empty($highlights)) return '';
        
        ob_start();
        ?>
        <div class="tcc-highlights tcc-columns-<?php echo esc_attr($atts['columns']); ?> tcc-style-<?php echo esc_attr($atts['style']); ?>">
            <?php foreach ($highlights as $highlight): ?>
                <div class="tcc-highlight-item">
                    <?php if (!empty($highlight['title'])): ?>
                        <h4 class="tcc-highlight-title"><?php echo esc_html($highlight['title']); ?></h4>
                    <?php endif; ?>
                    <?php if (!empty($highlight['description'])): ?>
                        <p class="tcc-highlight-desc"><?php echo wp_kses_post($highlight['description']); ?></p>
                    <?php endif; ?>
                </div>
            <?php endforeach; ?>
        </div>
        <?php
        return ob_get_clean();
    }
    
    /**
     * Destination regions shortcode
     * Usage: [travelc_destination_regions slug="italie" columns="3"]
     */
    public function destination_regions_shortcode($atts) {
        $atts = shortcode_atts(array(
            'slug' => '',
            'columns' => '3'
        ), $atts);
        
        if (empty($atts['slug'])) return '';
        
        $dest = $this->get_destination_by_slug($atts['slug']);
        if (!$dest || empty($dest['regions'])) return '';
        
        $regions = $dest['regions'];
        if (is_string($regions)) {
            $regions = json_decode($regions, true);
        }
        if (!is_array($regions) || empty($regions)) return '';
        
        ob_start();
        ?>
        <div class="tcc-regions tcc-columns-<?php echo esc_attr($atts['columns']); ?>">
            <?php foreach ($regions as $region): ?>
                <div class="tcc-region-item">
                    <?php if (!empty($region['name'])): ?>
                        <h4 class="tcc-region-name"><?php echo esc_html($region['name']); ?></h4>
                    <?php endif; ?>
                    <?php if (!empty($region['description'])): ?>
                        <p class="tcc-region-desc"><?php echo wp_kses_post($region['description']); ?></p>
                    <?php endif; ?>
                </div>
            <?php endforeach; ?>
        </div>
        <?php
        return ob_get_clean();
    }
    
    /**
     * Destination facts shortcode
     * Usage: [travelc_destination_facts slug="italie" style="list"]
     */
    public function destination_facts_shortcode($atts) {
        $atts = shortcode_atts(array(
            'slug' => '',
            'style' => 'list' // list, table, cards
        ), $atts);
        
        if (empty($atts['slug'])) return '';
        
        $dest = $this->get_destination_by_slug($atts['slug']);
        if (!$dest || empty($dest['facts'])) return '';
        
        $facts = $dest['facts'];
        if (is_string($facts)) {
            $facts = json_decode($facts, true);
        }
        if (!is_array($facts) || empty($facts)) return '';
        
        ob_start();
        ?>
        <div class="tcc-facts tcc-style-<?php echo esc_attr($atts['style']); ?>">
            <?php if ($atts['style'] === 'table'): ?>
                <table class="tcc-facts-table">
                    <?php foreach ($facts as $fact): ?>
                        <tr>
                            <th><?php echo esc_html($fact['label'] ?? ''); ?></th>
                            <td><?php echo esc_html($fact['value'] ?? ''); ?></td>
                        </tr>
                    <?php endforeach; ?>
                </table>
            <?php else: ?>
                <ul class="tcc-facts-list">
                    <?php foreach ($facts as $fact): ?>
                        <li>
                            <strong><?php echo esc_html($fact['label'] ?? ''); ?>:</strong>
                            <?php echo esc_html($fact['value'] ?? ''); ?>
                        </li>
                    <?php endforeach; ?>
                </ul>
            <?php endif; ?>
        </div>
        <?php
        return ob_get_clean();
    }
    
    /**
     * Destination practical info shortcode (currency, language, timezone, visa)
     * Usage: [travelc_destination_info slug="italie" fields="currency,language,timezone,visa_info"]
     */
    public function destination_info_shortcode($atts) {
        $atts = shortcode_atts(array(
            'slug' => '',
            'fields' => 'currency,language,timezone,visa_info',
            'style' => 'list' // list, icons, cards
        ), $atts);
        
        if (empty($atts['slug'])) return '';
        
        $dest = $this->get_destination_by_slug($atts['slug']);
        if (!$dest) return '';
        
        $fields = array_map('trim', explode(',', $atts['fields']));
        
        $labels = array(
            'currency' => 'Valuta',
            'language' => 'Taal',
            'timezone' => 'Tijdzone',
            'visa_info' => 'Visum',
            'best_time_to_visit' => 'Beste reistijd',
            'country' => 'Land',
            'continent' => 'Continent'
        );
        
        $icons = array(
            'currency' => '💰',
            'language' => '🗣️',
            'timezone' => '🕐',
            'visa_info' => '📋',
            'best_time_to_visit' => '📅',
            'country' => '🌍',
            'continent' => '🗺️'
        );
        
        ob_start();
        ?>
        <div class="tcc-info tcc-style-<?php echo esc_attr($atts['style']); ?>">
            <?php foreach ($fields as $field): ?>
                <?php if (!empty($dest[$field])): ?>
                    <div class="tcc-info-item tcc-info-<?php echo esc_attr($field); ?>">
                        <?php if ($atts['style'] === 'icons'): ?>
                            <span class="tcc-info-icon"><?php echo $icons[$field] ?? '📌'; ?></span>
                        <?php endif; ?>
                        <span class="tcc-info-label"><?php echo esc_html($labels[$field] ?? ucfirst($field)); ?>:</span>
                        <span class="tcc-info-value"><?php echo esc_html($dest[$field]); ?></span>
                    </div>
                <?php endif; ?>
            <?php endforeach; ?>
        </div>
        <?php
        return ob_get_clean();
    }
}

// Initialize plugin
TravelC_Content::get_instance();
