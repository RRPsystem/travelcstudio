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
        $this->supabase_url = get_option('tcc_supabase_url', 'https://huaaogdxxdcakxryecnw.supabase.co');
        $this->supabase_key = get_option('tcc_supabase_key', '');
        $this->brand_id = get_option('tcc_brand_id', '');
        
        add_action('admin_menu', array($this, 'add_admin_menu'));
        add_action('admin_init', array($this, 'register_settings'));
        
        // Shortcodes
        add_shortcode('travelc_news', array($this, 'news_shortcode'));
        add_shortcode('travelc_news_single', array($this, 'news_single_shortcode'));
        add_shortcode('travelc_destination', array($this, 'destination_shortcode'));
        add_shortcode('travelc_destinations_menu', array($this, 'destinations_menu_shortcode'));
        
        // REST API endpoints
        add_action('rest_api_init', array($this, 'register_rest_routes'));
        
        // Enqueue styles
        add_action('wp_enqueue_scripts', array($this, 'enqueue_styles'));
    }
    
    /**
     * Admin Menu
     */
    public function add_admin_menu() {
        add_options_page(
            'TravelC Content',
            'TravelC Content',
            'manage_options',
            'travelc-content',
            array($this, 'settings_page')
        );
    }
    
    /**
     * Register Settings
     */
    public function register_settings() {
        register_setting('tcc_settings', 'tcc_supabase_url');
        register_setting('tcc_settings', 'tcc_supabase_key');
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
                        <th scope="row">Supabase URL</th>
                        <td>
                            <input type="url" name="tcc_supabase_url" 
                                   value="<?php echo esc_attr(get_option('tcc_supabase_url', 'https://huaaogdxxdcakxryecnw.supabase.co')); ?>" 
                                   class="regular-text" />
                            <p class="description">De URL van je Supabase project</p>
                        </td>
                    </tr>
                    <tr>
                        <th scope="row">Supabase Anon Key</th>
                        <td>
                            <input type="password" name="tcc_supabase_key" 
                                   value="<?php echo esc_attr(get_option('tcc_supabase_key')); ?>" 
                                   class="regular-text" />
                            <p class="description">De anon/public key van je Supabase project</p>
                        </td>
                    </tr>
                    <tr>
                        <th scope="row">Brand ID</th>
                        <td>
                            <input type="text" name="tcc_brand_id" 
                                   value="<?php echo esc_attr(get_option('tcc_brand_id')); ?>" 
                                   class="regular-text" 
                                   placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" />
                            <p class="description">De UUID van deze brand in TravelCStudio</p>
                        </td>
                    </tr>
                </table>
                
                <?php submit_button('Instellingen Opslaan'); ?>
            </form>
            
            <hr>
            
            <h2>Beschikbare Shortcodes</h2>
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
                        <td>Toont bestemmingspagina</td>
                        <td>slug (verplicht)</td>
                    </tr>
                    <tr>
                        <td><code>[travelc_destinations_menu]</code></td>
                        <td>Toont mega menu met alle bestemmingen</td>
                        <td>group_by="continent"</td>
                    </tr>
                </tbody>
            </table>
            
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
}

// Initialize plugin
TravelC_Content::get_instance();
