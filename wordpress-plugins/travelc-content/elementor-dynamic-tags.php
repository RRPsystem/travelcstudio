<?php
/**
 * TravelCStudio Elementor Dynamic Tags
 * 
 * Provides dynamic tags for Elementor to pull content from TravelCStudio
 */

if (!defined('ABSPATH')) {
    exit;
}

/**
 * Register Dynamic Tag Group
 */
function tcc_register_dynamic_tag_group($dynamic_tags_manager) {
    $dynamic_tags_manager->register_group(
        'travelc',
        [
            'title' => 'TravelCStudio'
        ]
    );
}
add_action('elementor/dynamic_tags/register', 'tcc_register_dynamic_tag_group');

/**
 * Register Dynamic Tags
 */
function tcc_register_dynamic_tags($dynamic_tags_manager) {
    
    // Text Tags
    require_once(__DIR__ . '/dynamic-tags/class-tcc-title-tag.php');
    require_once(__DIR__ . '/dynamic-tags/class-tcc-intro-tag.php');
    require_once(__DIR__ . '/dynamic-tags/class-tcc-description-tag.php');
    require_once(__DIR__ . '/dynamic-tags/class-tcc-transportation-tag.php');
    require_once(__DIR__ . '/dynamic-tags/class-tcc-climate-tag.php');
    require_once(__DIR__ . '/dynamic-tags/class-tcc-field-tag.php');
    
    // URL Tags
    require_once(__DIR__ . '/dynamic-tags/class-tcc-video-tag.php');
    
    // Image Tags
    require_once(__DIR__ . '/dynamic-tags/class-tcc-image-tag.php');
    require_once(__DIR__ . '/dynamic-tags/class-tcc-gallery-tag.php');
    require_once(__DIR__ . '/dynamic-tags/class-tcc-map-tag.php');
    require_once(__DIR__ . '/dynamic-tags/class-tcc-flag-tag.php');
    require_once(__DIR__ . '/dynamic-tags/class-tcc-photo-tag.php');
    
    // Highlight Tags
    require_once(__DIR__ . '/dynamic-tags/class-tcc-highlight-tag.php');
    require_once(__DIR__ . '/dynamic-tags/class-tcc-highlight-image-tag.php');
    
    // Fact Tags
    require_once(__DIR__ . '/dynamic-tags/class-tcc-fact-tag.php');
    
    // Region Tags
    require_once(__DIR__ . '/dynamic-tags/class-tcc-region-tag.php');
    
    $dynamic_tags_manager->register(new TCC_Title_Tag());
    $dynamic_tags_manager->register(new TCC_Intro_Tag());
    $dynamic_tags_manager->register(new TCC_Description_Tag());
    $dynamic_tags_manager->register(new TCC_Transportation_Tag());
    $dynamic_tags_manager->register(new TCC_Climate_Tag());
    $dynamic_tags_manager->register(new TCC_Field_Tag());
    $dynamic_tags_manager->register(new TCC_Video_Tag());
    $dynamic_tags_manager->register(new TCC_Image_Tag());
    $dynamic_tags_manager->register(new TCC_Gallery_Tag());
    $dynamic_tags_manager->register(new TCC_Map_Tag());
    $dynamic_tags_manager->register(new TCC_Flag_Tag());
    $dynamic_tags_manager->register(new TCC_Photo_Tag());
    $dynamic_tags_manager->register(new TCC_Highlight_Tag());
    $dynamic_tags_manager->register(new TCC_Highlight_Image_Tag());
    $dynamic_tags_manager->register(new TCC_Fact_Tag());
    $dynamic_tags_manager->register(new TCC_Region_Tag());
}
add_action('elementor/dynamic_tags/register', 'tcc_register_dynamic_tags');

/**
 * Helper function to get current destination slug
 */
function tcc_get_current_destination_slug() {
    global $post;
    
    // Check if we're on a destination page via rewrite
    $destination_slug = get_query_var('tcc_destination');
    if ($destination_slug) {
        return $destination_slug;
    }
    
    // Check post meta for linked destination
    if ($post) {
        $linked_slug = get_post_meta($post->ID, '_tcc_destination_slug', true);
        if ($linked_slug) {
            return $linked_slug;
        }
        
        // Try to match post slug with destination
        return $post->post_name;
    }
    
    return '';
}

/**
 * Helper function to get destination data
 */
function tcc_get_destination_data($slug = '') {
    if (empty($slug)) {
        $slug = tcc_get_current_destination_slug();
    }
    
    if (empty($slug)) {
        return null;
    }
    
    // Cache key
    $cache_key = 'tcc_dest_' . md5($slug);
    $cached = wp_cache_get($cache_key, 'travelc');
    if ($cached !== false) {
        return $cached;
    }
    
    $api_url = TCC_SUPABASE_URL;
    $api_key = TCC_SUPABASE_KEY;
    
    $url = trailingslashit($api_url) . 'rest/v1/destinations?slug=eq.' . urlencode($slug) . '&select=*';
    
    $response = wp_remote_get($url, array(
        'headers' => array(
            'apikey' => $api_key,
            'Authorization' => 'Bearer ' . $api_key,
        ),
        'timeout' => 10,
    ));
    
    if (is_wp_error($response)) {
        return null;
    }
    
    $body = wp_remote_retrieve_body($response);
    $data = json_decode($body, true);
    
    if (!empty($data) && is_array($data)) {
        $destination = $data[0];
        wp_cache_set($cache_key, $destination, 'travelc', 300); // Cache for 5 minutes
        return $destination;
    }
    
    return null;
}

/**
 * Add meta box to link posts to TravelC destinations
 */
function tcc_add_destination_meta_box() {
    $post_types = apply_filters('tcc_destination_post_types', array('post', 'page', 'bestemmingen'));
    
    add_meta_box(
        'tcc_destination_link',
        'TravelCStudio Koppeling',
        'tcc_destination_meta_box_callback',
        $post_types,
        'side',
        'default'
    );
}
add_action('add_meta_boxes', 'tcc_add_destination_meta_box');

function tcc_destination_meta_box_callback($post) {
    wp_nonce_field('tcc_destination_link', 'tcc_destination_link_nonce');
    
    $current_slug = get_post_meta($post->ID, '_tcc_destination_slug', true);
    ?>
    <p>
        <label for="tcc_destination_slug">Bestemming Slug:</label>
        <input type="text" id="tcc_destination_slug" name="tcc_destination_slug" 
               value="<?php echo esc_attr($current_slug); ?>" 
               class="widefat" 
               placeholder="bijv. italie, japan, peru">
    </p>
    <p class="description">
        Vul de slug in van de TravelCStudio bestemming om deze pagina te koppelen.
        De Dynamic Tags zullen dan automatisch de juiste content ophalen.
    </p>
    <?php
}

function tcc_save_destination_meta_box($post_id) {
    if (!isset($_POST['tcc_destination_link_nonce'])) {
        return;
    }
    
    if (!wp_verify_nonce($_POST['tcc_destination_link_nonce'], 'tcc_destination_link')) {
        return;
    }
    
    if (defined('DOING_AUTOSAVE') && DOING_AUTOSAVE) {
        return;
    }
    
    if (!current_user_can('edit_post', $post_id)) {
        return;
    }
    
    if (isset($_POST['tcc_destination_slug'])) {
        $slug = sanitize_text_field($_POST['tcc_destination_slug']);
        update_post_meta($post_id, '_tcc_destination_slug', $slug);
    }
}
add_action('save_post', 'tcc_save_destination_meta_box');
