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
    require_once(__DIR__ . '/dynamic-tags/class-tcc-facts-list-tag.php');
    
    // Region Tags
    require_once(__DIR__ . '/dynamic-tags/class-tcc-region-tag.php');
    require_once(__DIR__ . '/dynamic-tags/class-tcc-regions-list-tag.php');
    
    // City Tags
    require_once(__DIR__ . '/dynamic-tags/class-tcc-city-tag.php');
    require_once(__DIR__ . '/dynamic-tags/class-tcc-city-image-tag.php');
    
    // Fun Facts Tag
    require_once(__DIR__ . '/dynamic-tags/class-tcc-fun-facts-tag.php');
    
    // News Tags
    require_once(__DIR__ . '/dynamic-tags/class-tcc-news-title-tag.php');
    require_once(__DIR__ . '/dynamic-tags/class-tcc-news-excerpt-tag.php');
    require_once(__DIR__ . '/dynamic-tags/class-tcc-news-content-tag.php');
    require_once(__DIR__ . '/dynamic-tags/class-tcc-news-image-tag.php');
    require_once(__DIR__ . '/dynamic-tags/class-tcc-news-date-tag.php');
    require_once(__DIR__ . '/dynamic-tags/class-tcc-news-tags-tag.php');
    
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
    $dynamic_tags_manager->register(new TCC_Facts_List_Tag());
    $dynamic_tags_manager->register(new TCC_Region_Tag());
    $dynamic_tags_manager->register(new TCC_Regions_List_Tag());
    $dynamic_tags_manager->register(new TCC_City_Tag());
    $dynamic_tags_manager->register(new TCC_City_Image_Tag());
    $dynamic_tags_manager->register(new TCC_Fun_Facts_Tag());
    
    // News Tags
    $dynamic_tags_manager->register(new TCC_News_Title_Tag());
    $dynamic_tags_manager->register(new TCC_News_Excerpt_Tag());
    $dynamic_tags_manager->register(new TCC_News_Content_Tag());
    $dynamic_tags_manager->register(new TCC_News_Image_Tag());
    $dynamic_tags_manager->register(new TCC_News_Date_Tag());
    $dynamic_tags_manager->register(new TCC_News_Tags_Tag());
}
add_action('elementor/dynamic_tags/register', 'tcc_register_dynamic_tags');

/**
 * Helper function to get current destination slug
 */
function tcc_get_current_destination_slug() {
    global $post;
    
    // PRIORITY 1: Use get_queried_object() for frontend - this is the most reliable
    if (function_exists('get_queried_object') && !is_admin()) {
        $queried = get_queried_object();
        if ($queried instanceof WP_Post) {
            // Check for linked slug in meta first
            $linked_slug = get_post_meta($queried->ID, '_tcc_destination_slug', true);
            if ($linked_slug) {
                return $linked_slug;
            }
            // Use post slug if it's a 'land' post type
            if ($queried->post_type === 'land' && !empty($queried->post_name)) {
                return $queried->post_name;
            }
        }
    }
    
    // PRIORITY 2: Try global $post
    $current_post = $post;
    if ($current_post && $current_post->ID) {
        // Check for linked slug in meta
        $linked_slug = get_post_meta($current_post->ID, '_tcc_destination_slug', true);
        if ($linked_slug) {
            return $linked_slug;
        }
        // Use post slug if it's a 'land' post type
        if ($current_post->post_type === 'land' && !empty($current_post->post_name)) {
            return $current_post->post_name;
        }
    }
    
    // PRIORITY 3: Check query var (legacy rewrite)
    $destination_slug = get_query_var('tcc_destination');
    if ($destination_slug) {
        return $destination_slug;
    }
    
    // PRIORITY 4: Elementor editor/preview mode
    $preview_id = null;
    if (isset($_GET['elementor-preview'])) {
        $preview_id = intval($_GET['elementor-preview']);
    } elseif (isset($_GET['preview_id'])) {
        $preview_id = intval($_GET['preview_id']);
    } elseif (isset($_GET['post'])) {
        $preview_id = intval($_GET['post']);
    } elseif (isset($_POST['editor_post_id'])) {
        $preview_id = intval($_POST['editor_post_id']);
    }
    
    if ($preview_id) {
        $preview_post = get_post($preview_id);
        if ($preview_post) {
            $linked_slug = get_post_meta($preview_post->ID, '_tcc_destination_slug', true);
            if ($linked_slug) {
                return $linked_slug;
            }
            if ($preview_post->post_type === 'land' && !empty($preview_post->post_name)) {
                return $preview_post->post_name;
            }
        }
    }
    
    // PRIORITY 5: Theme Builder template editing - get first 'land' post as sample (ONLY in editor)
    if (defined('ELEMENTOR_VERSION') && is_admin()) {
        $sample_post = get_posts(array(
            'post_type' => 'land',
            'posts_per_page' => 1,
            'post_status' => 'publish',
        ));
        if (!empty($sample_post)) {
            $linked_slug = get_post_meta($sample_post[0]->ID, '_tcc_destination_slug', true);
            if ($linked_slug) {
                return $linked_slug;
            }
            return $sample_post[0]->post_name;
        }
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
    // Use custom key if set, otherwise use default
    $custom_key = get_option('tcc_supabase_key', '');
    $api_key = !empty($custom_key) ? $custom_key : TCC_SUPABASE_KEY_DEFAULT;
    
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
    
    if (!empty($data) && is_array($data) && isset($data[0])) {
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
    $post_types = apply_filters('tcc_destination_post_types', array('post', 'page', 'bestemmingen', 'land'));
    
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

/**
 * Helper function to get current news slug
 */
function tcc_get_current_news_slug() {
    global $post;
    
    // PRIORITY 1: Use get_queried_object() for frontend
    if (function_exists('get_queried_object') && !is_admin()) {
        $queried = get_queried_object();
        if ($queried instanceof WP_Post) {
            // Check for linked slug in meta first
            $linked_slug = get_post_meta($queried->ID, '_tcc_news_slug', true);
            if ($linked_slug) {
                return $linked_slug;
            }
            // Use post slug if it's a 'nieuws' post type
            if ($queried->post_type === 'nieuws' && !empty($queried->post_name)) {
                return $queried->post_name;
            }
        }
    }
    
    // PRIORITY 2: Try global $post
    $current_post = $post;
    if ($current_post && $current_post->ID) {
        $linked_slug = get_post_meta($current_post->ID, '_tcc_news_slug', true);
        if ($linked_slug) {
            return $linked_slug;
        }
        if ($current_post->post_type === 'nieuws' && !empty($current_post->post_name)) {
            return $current_post->post_name;
        }
    }
    
    // PRIORITY 3: Elementor editor/preview mode
    $preview_id = null;
    if (isset($_GET['elementor-preview'])) {
        $preview_id = intval($_GET['elementor-preview']);
    } elseif (isset($_GET['preview_id'])) {
        $preview_id = intval($_GET['preview_id']);
    } elseif (isset($_GET['post'])) {
        $preview_id = intval($_GET['post']);
    }
    
    if ($preview_id) {
        $preview_post = get_post($preview_id);
        if ($preview_post) {
            $linked_slug = get_post_meta($preview_post->ID, '_tcc_news_slug', true);
            if ($linked_slug) {
                return $linked_slug;
            }
            if ($preview_post->post_type === 'nieuws' && !empty($preview_post->post_name)) {
                return $preview_post->post_name;
            }
        }
    }
    
    // PRIORITY 4: Theme Builder template editing - get first 'nieuws' post as sample
    if (defined('ELEMENTOR_VERSION') && is_admin()) {
        $sample_post = get_posts(array(
            'post_type' => 'nieuws',
            'posts_per_page' => 1,
            'post_status' => 'publish',
        ));
        if (!empty($sample_post)) {
            $linked_slug = get_post_meta($sample_post[0]->ID, '_tcc_news_slug', true);
            if ($linked_slug) {
                return $linked_slug;
            }
            return $sample_post[0]->post_name;
        }
    }
    
    return '';
}

/**
 * Helper function to get news data from post meta or API
 */
function tcc_get_news_data($slug = '') {
    if (empty($slug)) {
        $slug = tcc_get_current_news_slug();
    }
    
    if (empty($slug)) {
        return null;
    }
    
    // First try to get from WordPress post meta (synced data)
    $news_post = get_posts(array(
        'post_type' => 'nieuws',
        'name' => $slug,
        'posts_per_page' => 1,
        'post_status' => 'publish',
    ));
    
    if (!empty($news_post)) {
        $post = $news_post[0];
        return array(
            'id' => get_post_meta($post->ID, '_tcc_news_id', true),
            'title' => $post->post_title,
            'slug' => $post->post_name,
            'excerpt' => $post->post_excerpt,
            'content' => $post->post_content,
            'closing_text' => get_post_meta($post->ID, '_tcc_news_closing_text', true),
            'featured_image' => get_post_meta($post->ID, '_tcc_featured_image', true),
            'tags' => get_post_meta($post->ID, '_tcc_news_tags', true) ?: array(),
            'published_at' => get_post_meta($post->ID, '_tcc_news_published_at', true),
        );
    }
    
    // Fallback: fetch from API
    $cache_key = 'tcc_news_' . md5($slug);
    $cached = wp_cache_get($cache_key, 'travelc');
    if ($cached !== false) {
        return $cached;
    }
    
    $api_url = TCC_SUPABASE_URL;
    $custom_key = get_option('tcc_supabase_key', '');
    $api_key = !empty($custom_key) ? $custom_key : TCC_SUPABASE_KEY_DEFAULT;
    
    $url = trailingslashit($api_url) . 'rest/v1/news_items?slug=eq.' . urlencode($slug) . '&select=*';
    
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
    
    if (!empty($data) && is_array($data) && isset($data[0])) {
        $news = $data[0];
        wp_cache_set($cache_key, $news, 'travelc', 300);
        return $news;
    }
    
    return null;
}
