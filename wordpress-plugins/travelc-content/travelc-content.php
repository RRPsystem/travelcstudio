<?php
/**
 * Plugin Name: TravelC Content
 * Plugin URI: https://travelcstudio.com
 * Description: Synchroniseert nieuws en bestemmingen van TravelCStudio naar WordPress. Content wordt beheerd in TravelCStudio en automatisch getoond op WordPress sites van brands die de content hebben geactiveerd.
 * Version: 1.0.71
 * Author: RRP System
 * Author URI: https://rrpsystem.com
 * License: GPL v2 or later
 * Text Domain: travelc-content
 * Domain Path: /languages
 * Requires at least: 5.8
 * Requires PHP: 7.4
 */

if (!defined('ABSPATH')) exit;

define('TCC_VERSION', '1.0.76');
define('TCC_PLUGIN_DIR', plugin_dir_path(__FILE__));
define('TCC_PLUGIN_URL', plugin_dir_url(__FILE__));

// TravelCStudio Network Settings
define('TCC_SUPABASE_URL', 'https://huaaogdxxdcakxryecnw.supabase.co');
// Default API key (may be outdated - user can override via settings)
define('TCC_SUPABASE_KEY_DEFAULT', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh1YWFvZ2R4eGRjYWt4cnllY253Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mjk2MjA2NDAsImV4cCI6MjA0NTE5NjY0MH0.r064T3EXYfXFjOqxbLuPPWbMDBqXx6SHBYrnmhWjlPI');

// Load Elementor Dynamic Tags if Elementor is active
add_action('elementor/init', function() {
    require_once TCC_PLUGIN_DIR . 'elementor-dynamic-tags.php';
});

// Load Shortcodes
require_once TCC_PLUGIN_DIR . 'shortcodes/highlights-carousel.php';
require_once TCC_PLUGIN_DIR . 'shortcodes/cities-carousel.php';
require_once TCC_PLUGIN_DIR . 'shortcodes/gallery.php';

class TravelC_Content {
    
    private static $instance = null;
    private $supabase_url;
    private $supabase_key;
    private $brand_id;
    private $brand_colors = null;
    private $current_destination = null;
    
    public static function get_instance() {
        if (null === self::$instance) {
            self::$instance = new self();
        }
        return self::$instance;
    }
    
    private function __construct() {
        $this->supabase_url = TCC_SUPABASE_URL;
        // Use custom key if set, otherwise use default
        $custom_key = get_option('tcc_supabase_key', '');
        $this->supabase_key = !empty($custom_key) ? $custom_key : TCC_SUPABASE_KEY_DEFAULT;
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
        
        // Auto-sync destinations from TravelCStudio
        add_action('init', array($this, 'register_land_post_type'));
        add_action('init', array($this, 'register_nieuws_post_type'));
        add_action('admin_init', array($this, 'sync_destinations'));
        add_action('admin_init', array($this, 'sync_news'));
        
        // Add sync button to admin
        add_action('admin_notices', array($this, 'show_sync_notice'));
        add_action('admin_post_tcc_sync_destinations', array($this, 'handle_manual_sync'));
        
        // Register REST API webhook endpoint for automatic sync from TravelCStudio
        add_action('rest_api_init', array($this, 'register_webhook_endpoint'));
        
        // Clear mega menu cache on version change
        if (get_option('tcc_version_check') !== TCC_VERSION) {
            delete_transient('tcc_mega_menu_' . $this->brand_id);
            update_option('tcc_version_check', TCC_VERSION);
        }
        
        // Mega Menu: auto-inject destinations dropdown into WordPress nav menus
        if (get_option('tcc_mega_menu_enabled', '1') === '1') {
            add_filter('wp_nav_menu_items', array($this, 'inject_mega_menu'), 99, 2);
            add_action('wp_footer', array($this, 'mega_menu_script'));
            add_action('wp_footer', array($this, 'mega_menu_debug'), 999);
        }
    }
    
    /**
     * Register webhook endpoint for automatic sync triggers from TravelCStudio
     */
    public function register_webhook_endpoint() {
        register_rest_route('travelc/v1', '/sync', array(
            'methods' => 'POST',
            'callback' => array($this, 'handle_webhook_sync'),
            'permission_callback' => array($this, 'verify_webhook_token'),
        ));
    }
    
    /**
     * Verify webhook token from TravelCStudio
     */
    public function verify_webhook_token($request) {
        $token = $request->get_header('X-TravelC-Token');
        $expected_token = get_option('tcc_webhook_token', '');
        
        // If no token is set, generate one and save it
        if (empty($expected_token)) {
            $expected_token = wp_generate_password(32, false);
            update_option('tcc_webhook_token', $expected_token);
        }
        
        // Also accept the brand_id as a simple verification
        $brand_id = $request->get_param('brand_id');
        if (!empty($brand_id) && $brand_id === $this->brand_id) {
            return true;
        }
        
        return $token === $expected_token;
    }
    
    /**
     * Handle webhook sync request from TravelCStudio
     */
    public function handle_webhook_sync($request) {
        $type = $request->get_param('type'); // 'destination', 'news', or 'all'
        $brand_id = $request->get_param('brand_id');
        
        // Log the webhook call
        error_log('[TCC Webhook] Received sync request: type=' . $type . ', brand_id=' . $brand_id);
        
        // Verify brand_id matches
        if (!empty($brand_id) && $brand_id !== $this->brand_id) {
            return new WP_REST_Response(array(
                'success' => false,
                'message' => 'Brand ID mismatch'
            ), 403);
        }
        
        $synced = array();
        
        if ($type === 'destination' || $type === 'all') {
            $this->sync_destinations(true);
            $synced[] = 'destinations';
        }
        
        if ($type === 'news' || $type === 'all') {
            $this->sync_news(true);
            $synced[] = 'news';
        }
        
        error_log('[TCC Webhook] Sync completed: ' . implode(', ', $synced));
        
        return new WP_REST_Response(array(
            'success' => true,
            'synced' => $synced,
            'timestamp' => current_time('mysql')
        ), 200);
    }
    
    /**
     * Plugin activation - flush rewrite rules
     */
    public function activate() {
        $this->register_land_post_type();
        $this->add_rewrite_rules();
        flush_rewrite_rules();
        update_option('tcc_flush_rewrite_rules', true);
        // Trigger initial sync
        $this->sync_destinations(true);
    }
    
    /**
     * Register 'land' custom post type
     */
    public function register_land_post_type() {
        // Always register, even if exists - to ensure correct settings
        register_post_type('land', array(
            'labels' => array(
                'name' => 'Landen',
                'singular_name' => 'Land',
                'add_new' => 'Nieuw land',
                'add_new_item' => 'Nieuw land toevoegen',
                'edit_item' => 'Land bewerken',
                'view_item' => 'Land bekijken',
                'all_items' => 'Alle landen',
                'search_items' => 'Landen zoeken',
                'not_found' => 'Geen landen gevonden',
            ),
            'public' => true,
            'publicly_queryable' => true,
            'show_ui' => true,
            'show_in_menu' => true,
            'query_var' => true,
            'has_archive' => true,
            'hierarchical' => false,
            'rewrite' => array('slug' => 'land', 'with_front' => false),
            'supports' => array('title', 'editor', 'thumbnail'),
            'show_in_rest' => true,
            'menu_icon' => 'dashicons-location-alt',
        ));
        
        // Auto-flush permalinks if needed
        if (get_option('tcc_flush_rewrite_rules', false)) {
            flush_rewrite_rules();
            delete_option('tcc_flush_rewrite_rules');
        }
    }
    
    /**
     * Register 'nieuws' custom post type
     */
    public function register_nieuws_post_type() {
        register_post_type('nieuws', array(
            'labels' => array(
                'name' => 'Nieuws',
                'singular_name' => 'Nieuwsbericht',
                'add_new' => 'Nieuw bericht',
                'add_new_item' => 'Nieuw nieuwsbericht toevoegen',
                'edit_item' => 'Nieuwsbericht bewerken',
                'view_item' => 'Nieuwsbericht bekijken',
                'all_items' => 'Alle nieuwsberichten',
                'search_items' => 'Nieuwsberichten zoeken',
                'not_found' => 'Geen nieuwsberichten gevonden',
            ),
            'public' => true,
            'publicly_queryable' => true,
            'show_ui' => true,
            'show_in_menu' => true,
            'query_var' => true,
            'has_archive' => true,
            'hierarchical' => false,
            'rewrite' => array('slug' => 'nieuws', 'with_front' => false),
            'supports' => array('title', 'editor', 'thumbnail', 'excerpt', 'custom-fields'),
            'show_in_rest' => true,
            'menu_icon' => 'dashicons-megaphone',
        ));
        
        // Add Elementor support for nieuws post type
        add_post_type_support('nieuws', 'elementor');
    }
    
    /**
     * Sync news from TravelCStudio to WordPress
     */
    public function sync_news($force = false) {
        error_log('[TCC] sync_news called. Brand ID: ' . $this->brand_id . ', Force: ' . ($force ? 'yes' : 'no'));
        
        if (empty($this->brand_id)) {
            error_log('[TCC] No brand_id set, skipping sync');
            return;
        }
        
        // Only sync once per 5 minutes unless forced
        $last_sync = get_option('tcc_last_news_sync', 0);
        if (!$force && (time() - $last_sync) < 300) {
            error_log('[TCC] Skipping sync - last sync was ' . (time() - $last_sync) . ' seconds ago');
            return;
        }
        
        // Get activated news for this brand
        $news_items = $this->get_news_items(100);
        
        error_log('[TCC] Found ' . (is_array($news_items) ? count($news_items) : 0) . ' news items to sync');
        
        if (empty($news_items) || !is_array($news_items)) {
            error_log('[TCC] No news items found, nothing to sync');
            return;
        }
        
        foreach ($news_items as $news) {
            error_log('[TCC] Syncing news: ' . $news['title'] . ' (slug: ' . $news['slug'] . ')');
            $this->create_or_update_nieuws_post($news);
        }
        
        // Remove posts for deactivated news
        $this->cleanup_deactivated_news($news_items);
        
        update_option('tcc_last_news_sync', time());
        error_log('[TCC] News sync completed');
    }
    
    /**
     * Create or update a nieuws post from TravelCStudio data
     */
    private function create_or_update_nieuws_post($news) {
        if (empty($news['slug'])) {
            return;
        }
        
        // Check if post already exists
        $existing = get_posts(array(
            'post_type' => 'nieuws',
            'name' => $news['slug'],
            'posts_per_page' => 1,
            'post_status' => 'any',
        ));
        
        $post_data = array(
            'post_type' => 'nieuws',
            'post_title' => $news['title'] ?? '',
            'post_name' => $news['slug'],
            'post_content' => $this->get_news_content($news),
            'post_excerpt' => $news['excerpt'] ?? '',
            'post_status' => 'publish',
        );
        
        if (!empty($existing)) {
            $post_data['ID'] = $existing[0]->ID;
            wp_update_post($post_data);
            $post_id = $existing[0]->ID;
        } else {
            $post_id = wp_insert_post($post_data);
        }
        
        if ($post_id && !is_wp_error($post_id)) {
            // Store TravelCStudio news ID and slug
            update_post_meta($post_id, '_tcc_news_id', $news['id'] ?? '');
            update_post_meta($post_id, '_tcc_news_slug', $news['slug']);
            update_post_meta($post_id, '_tcc_news_tags', $news['tags'] ?? array());
            update_post_meta($post_id, '_tcc_news_closing_text', $news['closing_text'] ?? '');
            update_post_meta($post_id, '_tcc_news_published_at', $news['published_at'] ?? '');
            
            // Set featured image if available
            if (!empty($news['featured_image'])) {
                update_post_meta($post_id, '_tcc_featured_image', $news['featured_image']);
            }
        }
    }
    
    /**
     * Get news content from TravelCStudio data
     * Returns clean article text without builder HTML/CSS
     */
    private function get_news_content($news) {
        $content = '';
        
        if (!empty($news['content'])) {
            if (is_array($news['content']) && isset($news['content']['html'])) {
                $content = $news['content']['html'];
            } elseif (is_string($news['content'])) {
                $content = $news['content'];
            }
        }
        
        // If content looks like builder output (contains style tags or builder classes), 
        // it's corrupted data - return empty and use excerpt instead
        if (preg_match('/<style|wb-block|\.sidebar|\.canvas-area|Reset & Base Styles/i', $content)) {
            // This is builder HTML, not article content - skip it
            return '';
        }
        
        // Basic HTML cleanup for normal content
        $content = wp_kses_post($content);
        
        return trim($content);
    }
    
    /**
     * Remove nieuws posts that are no longer activated
     */
    private function cleanup_deactivated_news($active_news) {
        $active_slugs = array_column($active_news, 'slug');
        
        $all_nieuws = get_posts(array(
            'post_type' => 'nieuws',
            'posts_per_page' => -1,
            'post_status' => 'any',
            'meta_key' => '_tcc_news_slug',
        ));
        
        foreach ($all_nieuws as $post) {
            $slug = get_post_meta($post->ID, '_tcc_news_slug', true);
            if ($slug && !in_array($slug, $active_slugs)) {
                wp_trash_post($post->ID);
            }
        }
    }
    
    /**
     * Sync destinations from TravelCStudio to WordPress
     */
    public function sync_destinations($force = false) {
        if (empty($this->brand_id)) {
            return;
        }
        
        // Only sync once per hour unless forced
        $last_sync = get_option('tcc_last_sync', 0);
        if (!$force && (time() - $last_sync) < 3600) {
            return;
        }
        
        // Get activated destinations for this brand
        $destinations = $this->get_destinations();
        
        if (empty($destinations) || !is_array($destinations)) {
            return;
        }
        
        foreach ($destinations as $destination) {
            $this->create_or_update_land_post($destination);
        }
        
        // Remove posts for deactivated destinations
        $this->cleanup_deactivated_destinations($destinations);
        
        update_option('tcc_last_sync', time());
    }
    
    /**
     * Direct sync with provided destinations array (used by manual sync)
     */
    public function sync_destinations_direct($destinations) {
        if (empty($destinations) || !is_array($destinations)) {
            return;
        }
        
        foreach ($destinations as $destination) {
            $this->create_or_update_land_post($destination);
        }
        
        // Remove posts for deactivated destinations
        $this->cleanup_deactivated_destinations($destinations);
        
        update_option('tcc_last_sync', time());
    }
    
    /**
     * Create or update a WordPress post for a destination
     */
    private function create_or_update_land_post($destination) {
        if (empty($destination['slug']) || empty($destination['title'])) {
            return;
        }
        
        // Check if post already exists
        $existing = get_posts(array(
            'post_type' => 'land',
            'name' => $destination['slug'],
            'posts_per_page' => 1,
            'post_status' => array('publish', 'draft', 'pending'),
        ));
        
        $post_data = array(
            'post_type' => 'land',
            'post_title' => $destination['title'],
            'post_name' => $destination['slug'],
            'post_status' => 'publish',
            'post_content' => '', // Content comes from Dynamic Tags
            'meta_input' => array(
                '_tcc_destination_id' => $destination['id'],
                '_tcc_destination_slug' => $destination['slug'],
                '_tcc_featured_travel_ids' => !empty($destination['featured_travel_ids']) ? implode(',', $destination['featured_travel_ids']) : '',
            ),
        );
        
        if (!empty($existing)) {
            $post_data['ID'] = $existing[0]->ID;
            wp_update_post($post_data);
        } else {
            wp_insert_post($post_data);
        }
    }
    
    /**
     * Remove posts for destinations that are no longer activated
     */
    private function cleanup_deactivated_destinations($active_destinations) {
        $active_slugs = array_column($active_destinations, 'slug');
        
        // Get ALL land posts (any status)
        $all_land_posts = get_posts(array(
            'post_type' => 'land',
            'posts_per_page' => -1,
            'post_status' => array('publish', 'draft', 'pending', 'private'),
        ));
        
        foreach ($all_land_posts as $post) {
            if (!in_array($post->post_name, $active_slugs)) {
                // Delete posts that are no longer active
                wp_delete_post($post->ID, true); // true = force delete (skip trash)
            }
        }
    }
    
    /**
     * Show sync notice in admin
     */
    public function show_sync_notice() {
        $screen = get_current_screen();
        if ($screen && $screen->id === 'toplevel_page_travelc-content') {
            $last_sync = get_option('tcc_last_sync', 0);
            $last_sync_text = $last_sync ? date('d-m-Y H:i', $last_sync) : 'Nog nooit';
            $sync_debug = get_option('tcc_sync_debug', array());
            ?>
            <div class="notice notice-info">
                <p>
                    <strong>TravelC Sync:</strong> Laatste sync: <?php echo esc_html($last_sync_text); ?>
                    <a href="<?php echo admin_url('admin-post.php?action=tcc_sync_destinations'); ?>" class="button button-secondary" style="margin-left: 10px;">
                        🔄 Nu synchroniseren
                    </a>
                </p>
                            </div>
            <?php
        }
    }
    
    /**
     * Handle manual sync request
     */
    public function handle_manual_sync() {
        if (!current_user_can('manage_options')) {
            wp_die('Geen toegang');
        }
        
        // Direct API test - get ALL destinations for this brand using assignments
        $assignments_raw = $this->fetch_from_supabase('destination_brand_assignments', array(
            'brand_id' => 'eq.' . $this->brand_id,
            'select' => 'destination_id,status',
        ));
        
        // Get destination IDs from assignments (accept all statuses except rejected)
        $dest_ids_from_assignments = array();
        if (is_array($assignments_raw)) {
            foreach ($assignments_raw as $a) {
                if (is_array($a) && isset($a['destination_id'])) {
                    // Include all except rejected
                    $status = $a['status'] ?? '';
                    if ($status !== 'rejected') {
                        $dest_ids_from_assignments[] = $a['destination_id'];
                    }
                }
            }
        }
        
        // Fetch those destinations with full data
        $fetched_destinations = array();
        if (!empty($dest_ids_from_assignments)) {
            $fetched_destinations = $this->fetch_from_supabase('destinations', array(
                'id' => 'in.(' . implode(',', $dest_ids_from_assignments) . ')',
                'select' => 'id,title,slug,country,continent,intro_text,featured_image,images,video_url,flag_image,map_image,facts,fun_facts,climate,regions,highlights,cities,description,transportation',
            ));
        }
        
        // Also get brand's own destinations
        $brand_dest_raw = $this->fetch_from_supabase('destinations', array(
            'brand_id' => 'eq.' . $this->brand_id,
            'select' => 'id,title,slug,country,continent,intro_text,featured_image,images,video_url,flag_image,map_image,facts,fun_facts,climate,regions,highlights,cities,description,transportation',
        ));
        
        // Note: Admin destinations are synced via assignments only
        // Brand must explicitly accept a destination to have it synced
        $admin_dest_raw = array(); // Placeholder for debug log
        
        // Combine all destinations
        $all_destinations = array();
        if (is_array($fetched_destinations)) {
            foreach ($fetched_destinations as $dest) {
                if (is_array($dest) && isset($dest['id'], $dest['slug'], $dest['title'])) {
                    $all_destinations[] = $dest;
                }
            }
        }
        if (is_array($brand_dest_raw)) {
            foreach ($brand_dest_raw as $dest) {
                if (is_array($dest) && isset($dest['id'], $dest['slug'], $dest['title'])) {
                    // Avoid duplicates
                    $exists = false;
                    foreach ($all_destinations as $existing) {
                        if ($existing['id'] === $dest['id']) {
                            $exists = true;
                            break;
                        }
                    }
                    if (!$exists) {
                        $all_destinations[] = $dest;
                    }
                }
            }
        }
        
        // Admin destinations are only synced if brand has accepted them via assignment
        // (already included in fetched_destinations from assignments query above)
        
        $sync_log = array(
            'brand_id' => $this->brand_id,
            'assignments_raw' => $assignments_raw,
            'dest_ids_from_assignments' => $dest_ids_from_assignments,
            'fetched_destinations' => $fetched_destinations,
            'brand_dest_raw' => $brand_dest_raw,
            'admin_dest_raw' => $admin_dest_raw,
            'all_destinations' => $all_destinations,
        );
        update_option('tcc_sync_debug', $sync_log);
        
        // Sync using the combined destinations directly
        $this->sync_destinations_direct($all_destinations);
        
        // Flush rewrite rules after sync
        flush_rewrite_rules();
        
        wp_redirect(admin_url('admin.php?page=travelc-content&synced=1'));
        exit;
    }
    
    /**
     * Add rewrite rules for virtual pages
     * Note: /land/ is handled by the 'land' custom post type, no rewrite needed
     */
    public function add_rewrite_rules() {
        // Only add rewrite for nieuws - land is handled by CPT
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
        // If we're on a 'land' post type, let WordPress/Elementor handle it normally
        if (is_singular('land')) {
            return;
        }
        
        $destination_slug = get_query_var('tcc_destination');
        $news_slug = get_query_var('tcc_news');
        
        // Only handle tcc_destination and tcc_news query vars (virtual pages)
        // Do NOT intercept /land/ URLs - those are real posts handled by WordPress
        
        if ($destination_slug) {
            // Check if a real 'land' post exists with this slug - if so, redirect to it
            $existing_post = get_page_by_path($destination_slug, OBJECT, 'land');
            if ($existing_post) {
                wp_redirect(get_permalink($existing_post->ID));
                exit;
            }
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
        
        // Store destination data for use in templates
        $this->current_destination = $destination;
        
        // Check if Elementor is active and has a template for this
        if (did_action('elementor/loaded')) {
            // Try to use Elementor's template system
            $template_id = $this->get_elementor_template_for_destination();
            if ($template_id) {
                get_header();
                echo \Elementor\Plugin::instance()->frontend->get_builder_content_for_display($template_id);
                get_footer();
                return;
            }
        }
        
        // Fallback: use shortcode
        get_header();
        
        echo '<div class="tcc-destination-page">';
        echo do_shortcode('[travelc_destination slug="' . esc_attr($slug) . '"]');
        echo '</div>';
        
        get_footer();
    }
    
    /**
     * Get Elementor template ID for destinations
     */
    private function get_elementor_template_for_destination() {
        // Look for a saved template with specific name or setting
        $template_id = get_option('tcc_elementor_destination_template', 0);
        if ($template_id) {
            return $template_id;
        }
        
        // Try to find a template by name
        $templates = get_posts(array(
            'post_type' => 'elementor_library',
            'posts_per_page' => 1,
            'meta_query' => array(
                array(
                    'key' => '_elementor_template_type',
                    'value' => 'single',
                )
            ),
            's' => 'destination'
        ));
        
        if (!empty($templates)) {
            return $templates[0]->ID;
        }
        
        return 0;
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
        register_setting('tcc_settings', 'tcc_supabase_key');
        register_setting('tcc_settings', 'tcc_mega_menu_enabled');
        register_setting('tcc_settings', 'tcc_mega_menu_location');
    }
    
    /**
     * Settings Page with Tabs
     */
    public function settings_page() {
        $current_tab = isset($_GET['tab']) ? sanitize_text_field($_GET['tab']) : 'instellingen';
        $tabs = array(
            'instellingen' => '⚙️ Instellingen',
            'landen' => '🌍 Landen',
            'nieuws' => '📰 Nieuws',
        );
        ?>
        <div class="wrap">
            <h1>TravelC Content</h1>
            
            <!-- Tab Navigation -->
            <nav class="nav-tab-wrapper" style="margin-bottom: 20px;">
                <?php foreach ($tabs as $tab_id => $tab_name): ?>
                    <a href="?page=travelc-content&tab=<?php echo esc_attr($tab_id); ?>" 
                       class="nav-tab <?php echo $current_tab === $tab_id ? 'nav-tab-active' : ''; ?>">
                        <?php echo esc_html($tab_name); ?>
                    </a>
                <?php endforeach; ?>
            </nav>
            
            <?php
            switch ($current_tab) {
                case 'landen':
                    $this->render_tab_landen();
                    break;
                case 'nieuws':
                    $this->render_tab_nieuws();
                    break;
                default:
                    $this->render_tab_instellingen();
                    break;
            }
            ?>
        </div>
        <?php
    }
    
    /**
     * Tab: Instellingen
     */
    private function render_tab_instellingen() {
        ?>
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
                <tr>
                    <th scope="row">Supabase API Key</th>
                    <td>
                        <input type="text" name="tcc_supabase_key" 
                               value="<?php echo esc_attr(get_option('tcc_supabase_key')); ?>" 
                               class="large-text" 
                               placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." />
                        <p class="description">De Supabase anon key. Laat leeg om de standaard key te gebruiken.</p>
                    </td>
                </tr>
            </table>
            
            <?php submit_button('Instellingen Opslaan'); ?>
        </form>
        
        <div style="background: #f0f0f1; padding: 15px; border-radius: 5px; margin-top: 20px;">
            <h3 style="margin-top: 0;">🔗 TravelCStudio Netwerk</h3>
            <p>Deze plugin is automatisch verbonden met het TravelCStudio netwerk.</p>
            <code style="display: block; padding: 10px; background: #fff; margin-top: 10px;">
                Server: <?php echo esc_html(TCC_SUPABASE_URL); ?>
            </code>
        </div>
        
        <hr>
        
        <h2>Connectie Test</h2>
        <?php $this->test_connection(); ?>
        <?php
    }
    
    /**
     * Tab: Landen (Bestemmingen)
     */
    private function render_tab_landen() {
        ?>
        <h2>🌍 Landen Shortcodes & Dynamic Tags</h2>
        <p style="font-size: 14px; color: #666;">Gebruik deze shortcodes in Elementor of de Text Editor. De slug wordt automatisch gedetecteerd op basis van de huidige pagina.</p>
        
        <!-- MEEST GEBRUIKTE -->
        <div style="background: #e7f3ff; border-left: 4px solid #0073aa; padding: 15px; margin: 20px 0; border-radius: 4px;">
            <h3 style="margin: 0 0 10px; color: #0073aa;">⭐ Meest Gebruikte Shortcodes</h3>
            <p style="margin: 0;">De slug wordt automatisch gedetecteerd. Je hoeft geen slug mee te geven!</p>
        </div>
        
        <table class="widefat" style="margin-bottom: 30px;">
            <thead style="background: #f8f9fa;">
                <tr>
                    <th style="width: 40%;">Kopieer deze code</th>
                    <th style="width: 30%;">Wat het toont</th>
                    <th style="width: 30%;">Voorbeeld</th>
                </tr>
            </thead>
            <tbody>
                <tr style="background: #fffbea;">
                    <td><code style="background: #fff; padding: 8px; display: block; cursor: pointer;" onclick="navigator.clipboard.writeText(this.innerText)">[travelc_highlights_carousel]</code></td>
                    <td><strong>🎠 Hoogtepunten Carousel</strong><br>Mooie kaarten met afbeeldingen</td>
                    <td>Colosseum, Eiffeltoren, etc.</td>
                </tr>
                <tr style="background: #fffbea;">
                    <td><code style="background: #fff; padding: 8px; display: block; cursor: pointer;" onclick="navigator.clipboard.writeText(this.innerText)">[travelc_cities_carousel]</code></td>
                    <td><strong>🏙️ Steden Carousel</strong><br>Steden met foto's</td>
                    <td>Athene, Thessaloniki, etc.</td>
                </tr>
                <tr style="background: #fffbea;">
                    <td><code style="background: #fff; padding: 8px; display: block; cursor: pointer;" onclick="navigator.clipboard.writeText(this.innerText)">[travelc_gallery mode="carousel"]</code></td>
                    <td><strong>📷 Foto Galerij (Carousel)</strong><br>Auto-rotate foto carousel</td>
                    <td>Alle foto's doorlopend</td>
                </tr>
                <tr>
                    <td><code style="background: #fff; padding: 8px; display: block; cursor: pointer;" onclick="navigator.clipboard.writeText(this.innerText)">[travelc_gallery mode="grid"]</code></td>
                    <td><strong>📷 Foto Galerij (Grid)</strong><br>Grid met max 8 foto's</td>
                    <td>Foto's in raster</td>
                </tr>
                <tr>
                    <td><code style="background: #fff; padding: 8px; display: block; cursor: pointer;" onclick="navigator.clipboard.writeText(this.innerText)">[travelc_destination_description]</code></td>
                    <td><strong>📝 Beschrijving</strong><br>Lange tekst over het land</td>
                    <td>Cultuur, geschiedenis...</td>
                </tr>
                <tr>
                    <td><code style="background: #fff; padding: 8px; display: block; cursor: pointer;" onclick="navigator.clipboard.writeText(this.innerText)">[travelc_destination_transportation]</code></td>
                    <td><strong>🚗 Vervoer</strong><br>Rondreizen tips</td>
                    <td>Huurauto, trein, ferry...</td>
                </tr>
                <tr>
                    <td><code style="background: #fff; padding: 8px; display: block; cursor: pointer;" onclick="navigator.clipboard.writeText(this.innerText)">[travelc_destination_climate]</code></td>
                    <td><strong>🌡️ Klimaat</strong><br>Weer en beste reistijd</td>
                    <td>Mediterraan, zomers warm...</td>
                </tr>
                <tr>
                    <td><code style="background: #fff; padding: 8px; display: block; cursor: pointer;" onclick="navigator.clipboard.writeText(this.innerText)">[travelc_destination_regions]</code></td>
                    <td><strong>🗺️ Regio's</strong><br>Gebieden binnen het land</td>
                    <td>Peloponnesos, Kreta...</td>
                </tr>
                <tr>
                    <td><code style="background: #fff; padding: 8px; display: block; cursor: pointer;" onclick="navigator.clipboard.writeText(this.innerText)">[travelc_destination_facts]</code></td>
                    <td><strong>📊 Feiten</strong><br>Praktische info</td>
                    <td>Hoofdstad, inwoners...</td>
                </tr>
            </tbody>
        </table>
        
        <!-- CAROUSEL OPTIES -->
        <div style="background: #f0f7f0; border-left: 4px solid #46b450; padding: 15px; margin: 20px 0; border-radius: 4px;">
            <h3 style="margin: 0 0 10px; color: #46b450;">🎨 Carousel Aanpassen</h3>
            <code style="background: #fff; padding: 10px; display: block; margin-bottom: 10px;">[travelc_highlights_carousel columns="4" color="#f5a623"]</code>
            <ul style="margin: 10px 0 0; padding-left: 20px;">
                <li><strong>columns="4"</strong> - Aantal kaarten naast elkaar</li>
                <li><strong>color="#f5a623"</strong> - Accent kleur</li>
                <li><strong>height="280"</strong> - Hoogte in pixels</li>
            </ul>
        </div>
        
        <!-- DYNAMIC TAGS -->
        <h3 style="margin-top: 30px;">🎯 Elementor Dynamic Tags</h3>
        <p><em>Gebruik deze in Elementor widgets (Heading, Text Editor, Image):</em></p>
        <table class="widefat">
            <thead>
                <tr>
                    <th>Dynamic Tag</th>
                    <th>Beschrijving</th>
                    <th>Gebruik in</th>
                </tr>
            </thead>
            <tbody>
                <tr><td><strong>TravelC Titel</strong></td><td>Bestemmingsnaam</td><td>Heading</td></tr>
                <tr><td><strong>TravelC Introductie</strong></td><td>Korte intro</td><td>Text Editor</td></tr>
                <tr><td><strong>TravelC Beschrijving</strong></td><td>Uitgebreide tekst</td><td>Text Editor</td></tr>
                <tr><td><strong>TravelC Vervoer</strong></td><td>Vervoer tips</td><td>Text Editor</td></tr>
                <tr><td><strong>TravelC Klimaat</strong></td><td>Klimaatinfo</td><td>Text Editor</td></tr>
                <tr><td><strong>TravelC Afbeelding</strong></td><td>Featured image</td><td>Image widget</td></tr>
                <tr><td><strong>TravelC Feiten</strong></td><td>Feiten met labels</td><td>Text Editor</td></tr>
            </tbody>
        </table>
        <?php
    }
    
    /**
     * Tab: Nieuws
     */
    private function render_tab_nieuws() {
        ?>
        <h2>📰 Nieuws Shortcodes & Dynamic Tags</h2>
        <p style="font-size: 14px; color: #666;">Gebruik deze shortcodes en Dynamic Tags voor nieuwsartikelen. De slug wordt automatisch gedetecteerd.</p>
        
        <div style="background: #e7f3ff; border-left: 4px solid #0073aa; padding: 15px; margin: 20px 0; border-radius: 4px;">
            <h3 style="margin: 0 0 10px; color: #0073aa;">✅ Nieuws Sync Actief</h3>
            <p style="margin: 0;">Nieuwsartikelen worden automatisch gesynchroniseerd vanuit TravelCStudio naar het <strong>Nieuws</strong> post type in WordPress.</p>
        </div>
        
        <h3>📋 Nieuws Overzicht Shortcodes</h3>
        <table class="widefat" style="margin-bottom: 30px;">
            <thead style="background: #f8f9fa;">
                <tr>
                    <th style="width: 40%;">Shortcode</th>
                    <th style="width: 60%;">Beschrijving</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td><code style="background: #fff; padding: 8px; display: block; cursor: pointer;" onclick="navigator.clipboard.writeText(this.innerText)">[travelc_news limit="6"]</code></td>
                    <td><strong>📰 Nieuws Grid</strong><br>Overzicht van nieuwsartikelen (standaard 6)</td>
                </tr>
                <tr>
                    <td><code style="background: #fff; padding: 8px; display: block; cursor: pointer;" onclick="navigator.clipboard.writeText(this.innerText)">[travelc_news limit="3" columns="3"]</code></td>
                    <td><strong>📰 Nieuws Grid (3 kolommen)</strong><br>Compacte weergave</td>
                </tr>
            </tbody>
        </table>
        
        <h3>🎯 Nieuws Dynamic Tags</h3>
        <p><em>Gebruik deze in Elementor widgets op je nieuws single template:</em></p>
        <table class="widefat">
            <thead>
                <tr>
                    <th>Dynamic Tag</th>
                    <th>Beschrijving</th>
                    <th>Gebruik in</th>
                </tr>
            </thead>
            <tbody>
                <tr><td><strong>TravelC Nieuws Titel</strong></td><td>Artikel titel</td><td>Heading</td></tr>
                <tr><td><strong>TravelC Nieuws Samenvatting</strong></td><td>Korte samenvatting</td><td>Text Editor</td></tr>
                <tr><td><strong>TravelC Nieuws Inhoud</strong></td><td>Volledige artikel</td><td>Text Editor</td></tr>
                <tr><td><strong>TravelC Nieuws Afbeelding</strong></td><td>Featured image</td><td>Image widget</td></tr>
                <tr><td><strong>TravelC Nieuws Datum</strong></td><td>Publicatiedatum</td><td>Text Editor</td></tr>
                <tr><td><strong>TravelC Nieuws Tags</strong></td><td>Artikel tags (badges of tekst)</td><td>Text Editor</td></tr>
            </tbody>
        </table>
        
        <div style="background: #f0f7f0; border-left: 4px solid #46b450; padding: 15px; margin: 20px 0; border-radius: 4px;">
            <h3 style="margin: 0 0 10px; color: #46b450;">💡 Hoe werkt het?</h3>
            <ol style="margin: 10px 0 0; padding-left: 20px;">
                <li>Maak een <strong>Single Post</strong> template in Elementor Theme Builder</li>
                <li>Kies <strong>Nieuws</strong> als post type</li>
                <li>Gebruik de Dynamic Tags hierboven om de content te tonen</li>
                <li>De slug wordt automatisch gedetecteerd per nieuwsartikel</li>
            </ol>
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
        
        $all_news = array();
        
        // 1. Get news created directly by this brand (brand's own news)
        $brand_news = $this->fetch_from_supabase('news_items', array(
            'brand_id' => 'eq.' . $this->brand_id,
            'select' => 'id,title,slug,excerpt,content,featured_image,tags,author,created_at,published_at,status',
            'order' => 'published_at.desc,created_at.desc',
            'limit' => $limit
        ));
        
        error_log('[TCC] Brand own news for ' . $this->brand_id . ': ' . (is_array($brand_news) ? count($brand_news) : 0) . ' items');
        
        if (is_array($brand_news) && !empty($brand_news)) {
            $all_news = array_merge($all_news, $brand_news);
        }
        
        // 2. Get news assigned to this brand via news_brand_assignments
        // Try without status filter first to debug
        $assignments = $this->fetch_from_supabase('news_brand_assignments', array(
            'brand_id' => 'eq.' . $this->brand_id,
            'select' => 'id,news_id,status,is_published'
        ));
        
        error_log('[TCC] News assignments raw response: ' . print_r($assignments, true));
        error_log('[TCC] News assignments for brand ' . $this->brand_id . ': ' . (is_array($assignments) ? count($assignments) : 0) . ' items');
        
        if (is_array($assignments) && !empty($assignments)) {
            $news_ids = array_column($assignments, 'news_id');
            
            if (!empty($news_ids)) {
                $assigned_news = $this->fetch_from_supabase('news_items', array(
                    'id' => 'in.(' . implode(',', $news_ids) . ')',
                    'select' => 'id,title,slug,excerpt,content,featured_image,tags,author,created_at,published_at,status',
                    'order' => 'published_at.desc,created_at.desc',
                    'limit' => $limit
                ));
                
                if (is_array($assigned_news) && !empty($assigned_news)) {
                    $all_news = array_merge($all_news, $assigned_news);
                }
            }
        }
        
        // Remove duplicates by id
        $unique_news = array();
        $seen_ids = array();
        foreach ($all_news as $news) {
            if (!in_array($news['id'], $seen_ids)) {
                $unique_news[] = $news;
                $seen_ids[] = $news['id'];
            }
        }
        
        error_log('[TCC] Total unique news items: ' . count($unique_news));
        
        return $unique_news;
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
            'select' => 'id,title,slug,excerpt,content,closing_text,featured_image,tags,author,created_at,published_at',
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
        
        $all_destinations = array();
        
        // 1. Get destinations assigned to this brand via destination_brand_assignments
        $assignments = $this->fetch_from_supabase('destination_brand_assignments', array(
            'brand_id' => 'eq.' . $this->brand_id,
            'status' => 'in.(accepted,mandatory,brand)',
            'select' => 'destination_id'
        ));
        
        $dest_ids = array();
        if (!is_wp_error($assignments) && is_array($assignments)) {
            foreach ($assignments as $assignment) {
                if (is_array($assignment) && isset($assignment['destination_id'])) {
                    $dest_ids[] = $assignment['destination_id'];
                }
            }
        }
        
        // Fetch assigned destinations
        if (!empty($dest_ids)) {
            $assigned_destinations = $this->fetch_from_supabase('destinations', array(
                'id' => 'in.(' . implode(',', $dest_ids) . ')',
                'select' => 'id,title,slug,country,continent,intro_text,featured_image,images,video_url,flag_image,map_image,facts,fun_facts,climate,regions,highlights,cities,description,transportation,featured_travel_ids',
            ));
            if (!is_wp_error($assigned_destinations) && is_array($assigned_destinations)) {
                foreach ($assigned_destinations as $dest) {
                    if (is_array($dest) && isset($dest['id'])) {
                        $all_destinations[] = $dest;
                    }
                }
            }
        }
        
        // 2. Get brand's own destinations (created by the brand, stored with brand_id)
        $brand_destinations = $this->fetch_from_supabase('destinations', array(
            'brand_id' => 'eq.' . $this->brand_id,
            'select' => 'id,title,slug,country,continent,intro_text,featured_image,images,video_url,flag_image,map_image,facts,fun_facts,climate,regions,highlights,cities,description,transportation,featured_travel_ids',
        ));
        
        if (!is_wp_error($brand_destinations) && is_array($brand_destinations)) {
            foreach ($brand_destinations as $dest) {
                if (!is_array($dest) || !isset($dest['id'])) {
                    continue;
                }
                // Check for duplicates
                $exists = false;
                foreach ($all_destinations as $existing) {
                    if (isset($existing['id']) && $existing['id'] === $dest['id']) {
                        $exists = true;
                        break;
                    }
                }
                if (!$exists) {
                    $all_destinations[] = $dest;
                }
            }
        }
        
        $destinations = $all_destinations;
        
        if (!is_array($destinations)) {
            return array();
        }
        
        // Group by continent if requested
        if ($group_by === 'continent') {
            $grouped = array();
            foreach ($destinations as $dest) {
                $continent = !empty($dest['continent']) ? $dest['continent'] : 'Overig';
                if (!isset($grouped[$continent])) {
                    $grouped[$continent] = array();
                }
                $grouped[$continent][] = $dest;
            }
            // Sort: named continents first (alphabetical), 'Overig' last
            uksort($grouped, function($a, $b) {
                if ($a === 'Overig') return 1;
                if ($b === 'Overig') return -1;
                return strcmp($a, $b);
            });
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
        
        if (is_wp_error($destinations) || empty($destinations) || !is_array($destinations)) {
            return null;
        }
        
        $destination = $destinations[0] ?? null;
        
        if (!$destination || !isset($destination['id'])) {
            return null;
        }
        
        // Verify this brand has access
        $assignment = $this->fetch_from_supabase('destination_brand_assignments', array(
            'brand_id' => 'eq.' . $this->brand_id,
            'destination_id' => 'eq.' . $destination['id'],
            'status' => 'in.(accepted,mandatory,brand)',
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
            'show_tags' => 'yes',
            'show_author' => 'yes',
            'style' => 'cards'
        ), $atts);
        
        $news_items = $this->get_news_items(intval($atts['limit']));
        
        if (empty($news_items)) {
            return '<p class="tcc-no-content">Geen nieuwsartikelen beschikbaar.</p>';
        }
        
        ob_start();
        ?>
        <div class="tcc-news-grid tcc-columns-<?php echo intval($atts['columns']); ?>">
            <?php foreach ($news_items as $item): 
                $date_ts = strtotime($item['published_at'] ?? $item['created_at'] ?? 'now');
                $day = date_i18n('d', $date_ts);
                $month = strtoupper(date_i18n('M', $date_ts));
                $first_tag = !empty($item['tags']) && is_array($item['tags']) ? $item['tags'][0] : '';
                $author = !empty($item['author']) ? $item['author'] : (!empty($item['brand_name']) ? $item['brand_name'] : '');
            ?>
                <article class="tcc-news-card">
                    <?php if ($atts['show_image'] === 'yes' && !empty($item['featured_image'])): ?>
                        <div class="tcc-news-image">
                            <a href="<?php echo esc_url($this->get_news_url($item['slug'])); ?>">
                                <img src="<?php echo esc_url($item['featured_image']); ?>" 
                                     alt="<?php echo esc_attr($item['title']); ?>" />
                            </a>
                            <?php if ($atts['show_date'] === 'yes'): ?>
                                <div class="tcc-date-badge">
                                    <span class="tcc-date-day"><?php echo esc_html($day); ?></span>
                                    <span class="tcc-date-month"><?php echo esc_html($month); ?></span>
                                </div>
                            <?php endif; ?>
                            <?php if (!empty($first_tag)): ?>
                                <div class="tcc-category-badge"><?php echo esc_html($first_tag); ?></div>
                            <?php endif; ?>
                        </div>
                    <?php endif; ?>
                    
                    <div class="tcc-news-content">
                        <?php if ($atts['show_author'] === 'yes' && !empty($author)): ?>
                            <div class="tcc-news-author-line">
                                <span class="tcc-author-icon">&#9998;</span>
                                <span class="tcc-author-name"><?php echo esc_html($author); ?></span>
                            </div>
                        <?php endif; ?>
                        
                        <h3 class="tcc-news-title">
                            <a href="<?php echo esc_url($this->get_news_url($item['slug'])); ?>">
                                <?php echo esc_html($item['title']); ?>
                            </a>
                        </h3>
                        
                        <?php if ($atts['show_excerpt'] === 'yes' && !empty($item['excerpt'])): ?>
                            <p class="tcc-news-excerpt"><?php echo esc_html(wp_trim_words($item['excerpt'], 20, '...')); ?></p>
                        <?php endif; ?>
                        
                        <?php if ($atts['show_tags'] === 'yes' && !empty($item['tags']) && is_array($item['tags'])): ?>
                            <div class="tcc-news-tags">
                                <?php foreach ($item['tags'] as $tag): ?>
                                    <span class="tcc-tag"><?php echo esc_html($tag); ?></span>
                                <?php endforeach; ?>
                            </div>
                        <?php endif; ?>
                        
                        <a href="<?php echo esc_url($this->get_news_url($item['slug'])); ?>" class="tcc-read-more">
                            Lees meer <span class="tcc-arrow">&rarr;</span>
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
     * Inject Mega Menu into WordPress nav menus
     * Looks for a menu item with CSS class 'tcc-mega-bestemmingen' or URL '#bestemmingen'
     * and replaces it with a mega dropdown containing all destinations grouped by continent
     */
    public function inject_mega_menu($items, $args) {
        // Only inject on frontend, not admin
        if (is_admin()) return $items;
        
        // Check if specific menu location is configured
        $target_location = get_option('tcc_mega_menu_location', '');
        if (!empty($target_location) && isset($args->theme_location) && $args->theme_location !== $target_location) {
            return $items;
        }
        
        // Check if there's a menu item with href '#bestemmingen' or '#landen'
        $trigger_found = false;
        $trigger_url = '';
        foreach (array('#bestemmingen', '#landen') as $url) {
            if (strpos($items, $url) !== false) {
                $trigger_found = true;
                $trigger_url = $url;
                break;
            }
        }
        // Also check for CSS class
        if (!$trigger_found && strpos($items, 'tcc-mega-bestemmingen') !== false) {
            $trigger_found = true;
        }
        
        if (!$trigger_found) {
            return $items;
        }
        
        // Get cached destinations grouped by continent
        $cache_key = 'tcc_mega_menu_' . $this->brand_id;
        $mega_html = get_transient($cache_key);
        
        if ($mega_html === false) {
            $destinations = $this->get_destinations('continent');
            
            if (empty($destinations) || !is_array($destinations)) {
                return $items;
            }
            
            // Build mega menu HTML
            $mega_html = '<div class="tcc-mega-dropdown">';
            $mega_html .= '<div class="tcc-mega-inner">';
            
            foreach ($destinations as $continent => $dest_items) {
                if (!is_array($dest_items) || empty($dest_items)) continue;
                
                $mega_html .= '<div class="tcc-mega-column">';
                $mega_html .= '<h4 class="tcc-mega-continent">' . esc_html($continent) . '</h4>';
                $mega_html .= '<ul class="tcc-mega-list">';
                
                foreach ($dest_items as $dest) {
                    $url = $this->get_destination_url($dest['slug']);
                    $title = esc_html($dest['title']);
                    $flag = '';
                    if (!empty($dest['flag_image'])) {
                        $flag = '<img src="' . esc_url($dest['flag_image']) . '" alt="" class="tcc-mega-flag" />';
                    }
                    $mega_html .= '<li><a href="' . esc_url($url) . '">' . $flag . '<span>' . $title . '</span></a></li>';
                }
                
                $mega_html .= '</ul>';
                $mega_html .= '</div>';
            }
            
            $mega_html .= '</div></div>';
            
            // Cache for 1 hour
            set_transient($cache_key, $mega_html, HOUR_IN_SECONDS);
        }
        
        // Strategy: use DOMDocument-like approach with simple string manipulation
        // Find the </a> tag that contains the trigger URL and inject the dropdown after it
        if (!empty($trigger_url)) {
            // Find the <a> tag with the trigger URL
            $search_pattern = '/(<a[^>]*href=["\']' . preg_quote($trigger_url, '/') . '["\'][^>]*>.*?<\/a>)/si';
            if (preg_match($search_pattern, $items)) {
                // Add tcc-mega-bestemmingen class to the parent <li>
                $li_pattern = '/(<li[^>]*class=["\'])([^"\']*["\'][^>]*>\s*<a[^>]*href=["\']' . preg_quote($trigger_url, '/') . '["\'])/si';
                if (preg_match($li_pattern, $items)) {
                    $items = preg_replace($li_pattern, '$1tcc-mega-bestemmingen $2', $items);
                } else {
                    // li without class attribute
                    $li_pattern2 = '/(<li)(\s[^>]*>\s*<a[^>]*href=["\']' . preg_quote($trigger_url, '/') . '["\'])/si';
                    $items = preg_replace($li_pattern2, '$1 class="tcc-mega-bestemmingen"$2', $items);
                }
                
                // Insert mega dropdown HTML right after the closing </a> tag
                $items = preg_replace($search_pattern, '$1' . $mega_html, $items);
            }
        } else {
            // CSS class based: find the li with tcc-mega-bestemmingen and inject after its <a>
            $pattern = '/(<li[^>]*class="[^"]*tcc-mega-bestemmingen[^"]*"[^>]*>\s*<a[^>]*>.*?<\/a>)/si';
            if (preg_match($pattern, $items)) {
                $items = preg_replace($pattern, '$1' . $mega_html, $items);
            }
        }
        
        return $items;
    }
    
    /**
     * Mega Menu JavaScript for hover/click behavior
     */
    public function mega_menu_script() {
        if (is_admin()) return;
        ?>
        <script>
        (function() {
            var megaItems = document.querySelectorAll('.tcc-mega-bestemmingen');
            megaItems.forEach(function(item) {
                var dropdown = item.querySelector('.tcc-mega-dropdown');
                if (!dropdown) return;
                
                // Prevent default click on trigger links
                var links = item.querySelectorAll('a[href*="#bestemmingen"], a[href*="#landen"]');
                links.forEach(function(link) {
                    link.addEventListener('click', function(e) { e.preventDefault(); });
                });
                
                // Desktop: hover
                var timeout;
                item.addEventListener('mouseenter', function() {
                    clearTimeout(timeout);
                    dropdown.classList.add('tcc-mega-open');
                });
                item.addEventListener('mouseleave', function() {
                    timeout = setTimeout(function() {
                        dropdown.classList.remove('tcc-mega-open');
                    }, 200);
                });
                
                // Mobile: click toggle
                item.addEventListener('click', function(e) {
                    if (window.innerWidth <= 768) {
                        if (e.target.closest('.tcc-mega-dropdown')) return;
                        e.preventDefault();
                        dropdown.classList.toggle('tcc-mega-open');
                    }
                });
            });
            
            // Close on click outside
            document.addEventListener('click', function(e) {
                if (!e.target.closest('.tcc-mega-bestemmingen')) {
                    document.querySelectorAll('.tcc-mega-dropdown.tcc-mega-open').forEach(function(d) {
                        d.classList.remove('tcc-mega-open');
                    });
                }
            });
        })();
        </script>
        <?php
    }
    
    /**
     * Debug output for mega menu (temporary)
     */
    public function mega_menu_debug() {
        if (is_admin()) return;
        $destinations = $this->get_destinations('continent');
        $count = 0;
        if (is_array($destinations)) {
            foreach ($destinations as $items) {
                if (is_array($items)) $count += count($items);
            }
        }
        ?>
        <script>
        console.log('[TCC Mega Menu Debug]', {
            brand_id: '<?php echo esc_js($this->brand_id); ?>',
            destinations_count: <?php echo $count; ?>,
            mega_elements: document.querySelectorAll('.tcc-mega-bestemmingen').length,
            mega_dropdowns: document.querySelectorAll('.tcc-mega-dropdown').length,
            menu_html_has_bestemmingen: document.querySelector('a[href*="#bestemmingen"]') !== null,
            menu_html_has_landen: document.querySelector('a[href*="#landen"]') !== null
        });
        </script>
        <?php
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
        // First check if a 'land' post exists with this slug (synced from TravelC Studio)
        $land_post = get_page_by_path($slug, OBJECT, 'land');
        if ($land_post) {
            return get_permalink($land_post);
        }
        
        // Fallback to /land/slug/ URL pattern (matches the 'land' CPT rewrite)
        return home_url('/land/' . $slug . '/');
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
     * Get brand colors from Supabase (cached)
     */
    private function get_brand_colors() {
        if ($this->brand_colors !== null) {
            return $this->brand_colors;
        }
        
        // Check transient cache first (cache for 1 hour)
        $cached = get_transient('tcc_brand_colors_' . $this->brand_id);
        if ($cached !== false) {
            $this->brand_colors = $cached;
            return $cached;
        }
        
        $colors = array('primary' => '#066168', 'secondary' => '#F7941D');
        
        if (!empty($this->brand_id)) {
            $brand_data = $this->fetch_from_supabase('brands', array(
                'id' => 'eq.' . $this->brand_id,
                'select' => 'primary_color,secondary_color',
                'limit' => 1
            ));
            
            if (is_array($brand_data) && !empty($brand_data)) {
                $brand = $brand_data[0];
                if (!empty($brand['primary_color'])) {
                    $colors['primary'] = $brand['primary_color'];
                }
                if (!empty($brand['secondary_color'])) {
                    $colors['secondary'] = $brand['secondary_color'];
                }
            }
        }
        
        $this->brand_colors = $colors;
        set_transient('tcc_brand_colors_' . $this->brand_id, $colors, HOUR_IN_SECONDS);
        return $colors;
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
        
        // Inject brand colors as CSS custom properties
        $colors = $this->get_brand_colors();
        $inline_css = sprintf(
            ':root { --tcc-primary: %s; --tcc-secondary: %s; }',
            esc_attr($colors['primary']),
            esc_attr($colors['secondary'])
        );
        wp_add_inline_style('travelc-content', $inline_css);
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
