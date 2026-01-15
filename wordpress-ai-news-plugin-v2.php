<?php
/**
 * Plugin Name: AI News Integration
 * Plugin URI: https://yoursite.com
 * Description: Integreert AI-gegenereerde nieuwsberichten van Supabase in WordPress - Multisite Ready
 * Version: 2.0.0
 * Author: Your Name
 * Author URI: https://yoursite.com
 * License: GPL v2 or later
 * Text Domain: ai-news
 * Network: true
 */

if (!defined('ABSPATH')) {
    exit;
}

class AI_News_Plugin {
    private $api_url;
    private $brand_id;
    private $cache_duration = 300;

    public function __construct() {
        add_action('admin_menu', [$this, 'add_admin_menu']);
        add_action('admin_init', [$this, 'register_settings']);
        add_action('admin_init', [$this, 'handle_auto_detect']);

        $this->api_url = get_option('ai_news_api_url', '');
        $this->brand_id = get_option('ai_news_brand_id', '');

        $this->register_shortcodes();

        // Admin notices
        add_action('admin_notices', [$this, 'admin_notices']);
    }

    public function admin_notices() {
        // Only show on AI News settings page
        if (!isset($_GET['page']) || $_GET['page'] !== 'ai-news-settings') {
            return;
        }

        if (empty($this->api_url) || empty($this->brand_id)) {
            ?>
            <div class="notice notice-warning">
                <p><strong>AI News Integration:</strong> Plugin is nog niet geconfigureerd. Vul hieronder de instellingen in of gebruik de Auto-Detect functie.</p>
            </div>
            <?php
        }
    }

    public function handle_auto_detect() {
        if (!isset($_POST['ai_news_auto_detect']) || !check_admin_referer('ai_news_auto_detect', 'ai_news_nonce')) {
            return;
        }

        $api_base = get_option('ai_news_api_url', '');

        if (empty($api_base)) {
            add_settings_error(
                'ai_news_settings',
                'missing_api_url',
                'Vul eerst de Supabase API URL in voordat je Auto-Detect gebruikt.',
                'error'
            );
            return;
        }

        // Extract base URL from the API URL
        $base_url = preg_replace('/\/functions\/v1\/.*$/', '', $api_base);

        // Get current site domain
        $site_url = get_site_url();
        $domain = parse_url($site_url, PHP_URL_HOST);

        // Try to find brand by domain
        $detect_url = $base_url . '/functions/v1/get-brand-by-domain';
        $response = wp_remote_post($detect_url, [
            'timeout' => 15,
            'headers' => [
                'Content-Type' => 'application/json',
            ],
            'body' => json_encode([
                'domain' => $domain
            ])
        ]);

        if (is_wp_error($response)) {
            add_settings_error(
                'ai_news_settings',
                'auto_detect_error',
                'Fout bij auto-detectie: ' . $response->get_error_message(),
                'error'
            );
            return;
        }

        $body = wp_remote_retrieve_body($response);
        $data = json_decode($body, true);

        if (isset($data['brand_id'])) {
            update_option('ai_news_brand_id', $data['brand_id']);
            update_option('ai_news_brand_name', $data['brand_name'] ?? '');

            add_settings_error(
                'ai_news_settings',
                'auto_detect_success',
                'Brand ID succesvol gevonden! Brand: ' . ($data['brand_name'] ?? 'Onbekend'),
                'success'
            );
        } else {
            add_settings_error(
                'ai_news_settings',
                'auto_detect_not_found',
                'Geen brand gevonden voor domein: ' . $domain . '. Controleer of het domein is gekoppeld in het centrale systeem.',
                'error'
            );
        }
    }

    public function add_admin_menu() {
        add_options_page(
            'AI News Settings',
            'AI News',
            'manage_options',
            'ai-news-settings',
            [$this, 'settings_page']
        );
    }

    public function register_settings() {
        register_setting('ai_news_settings', 'ai_news_api_url');
        register_setting('ai_news_settings', 'ai_news_brand_id');
        register_setting('ai_news_settings', 'ai_news_brand_name');
        register_setting('ai_news_settings', 'ai_news_openai_api_key');
        register_setting('ai_news_settings', 'ai_news_cache_duration');
    }

    public function settings_page() {
        ?>
        <div class="wrap">
            <h1>🚀 AI News Integration Settings</h1>

            <?php settings_errors('ai_news_settings'); ?>

            <style>
                .ai-news-setup-box {
                    background: #f0f8ff;
                    border: 2px solid #2271b1;
                    border-radius: 8px;
                    padding: 20px;
                    margin: 20px 0;
                    max-width: 800px;
                }
                .ai-news-setup-box h2 {
                    margin-top: 0;
                    color: #2271b1;
                }
                .ai-news-code-field {
                    background: white;
                    border: 1px solid #ddd;
                    border-radius: 4px;
                    padding: 12px;
                    margin: 8px 0;
                    font-family: monospace;
                    font-size: 13px;
                }
                .ai-news-instruction {
                    background: #fff9e6;
                    border-left: 4px solid #f0b429;
                    padding: 12px;
                    margin: 15px 0;
                }
                .ai-news-success-box {
                    background: #e7f7e7;
                    border: 2px solid #4caf50;
                    border-radius: 8px;
                    padding: 15px;
                    margin: 15px 0;
                }
            </style>

            <div class="ai-news-setup-box">
                <h2>📋 Setup Instructies</h2>
                <p><strong>Stap 1:</strong> Ga naar je Bolt Brand Settings en klik op "Kopieer Setup Code"</p>
                <p><strong>Stap 2:</strong> Plak de gegevens hieronder in de velden</p>
                <p><strong>Stap 3:</strong> Klik op "Instellingen Opslaan"</p>
            </div>

            <div class="card" style="max-width: 800px; margin-top: 20px;">
                <h2>Automatische Configuratie (Aanbevolen)</h2>
                <p>Laat het systeem automatisch je Brand ID vinden op basis van je WordPress domein.</p>

                <form method="post" action="">
                    <?php wp_nonce_field('ai_news_auto_detect', 'ai_news_nonce'); ?>

                    <table class="form-table">
                        <tr>
                            <th scope="row">Huidig Domein</th>
                            <td>
                                <strong><?php echo esc_html(parse_url(get_site_url(), PHP_URL_HOST)); ?></strong>
                            </td>
                        </tr>
                        <tr>
                            <th scope="row">API Base URL</th>
                            <td>
                                <input type="text"
                                       name="ai_news_api_url"
                                       value="<?php echo esc_attr(get_option('ai_news_api_url')); ?>"
                                       class="regular-text"
                                       placeholder="https://your-project.supabase.co">
                                <p class="description">Alleen de basis URL (zonder /functions/v1/...)</p>
                            </td>
                        </tr>
                    </table>

                    <p>
                        <button type="submit" name="ai_news_auto_detect" value="1" class="button button-primary">
                            🔍 Auto-Detect Brand ID
                        </button>
                    </p>
                </form>
            </div>

            <hr style="margin: 40px 0;">

            <h2>⚙️ Handmatige Configuratie</h2>

            <?php if (!empty(get_option('ai_news_brand_id')) && !empty(get_option('ai_news_api_url'))): ?>
                <div class="ai-news-success-box">
                    <h3 style="margin-top: 0;">✅ Plugin is geconfigureerd!</h3>
                    <p><strong>Brand:</strong> <?php echo esc_html(get_option('ai_news_brand_name', 'Onbekend')); ?></p>
                    <p><strong>Brand ID:</strong> <code><?php echo esc_html(get_option('ai_news_brand_id')); ?></code></p>
                </div>
            <?php endif; ?>

            <form method="post" action="options.php">
                <?php
                settings_fields('ai_news_settings');
                do_settings_sections('ai_news_settings');
                ?>
                <table class="form-table">
                    <tr>
                        <th scope="row">
                            <label for="ai_news_api_url">Supabase Function URL *</label>
                        </th>
                        <td>
                            <input type="text"
                                   id="ai_news_api_url"
                                   name="ai_news_api_url"
                                   value="<?php echo esc_attr(get_option('ai_news_api_url')); ?>"
                                   class="regular-text"
                                   placeholder="https://your-project.supabase.co/functions/v1/wordpress-news"
                                   required>
                            <p class="description">📍 Plak hier de "Supabase Function URL" uit Bolt</p>
                        </td>
                    </tr>
                    <tr>
                        <th scope="row">
                            <label for="ai_news_brand_id">Brand ID *</label>
                        </th>
                        <td>
                            <input type="text"
                                   id="ai_news_brand_id"
                                   name="ai_news_brand_id"
                                   value="<?php echo esc_attr(get_option('ai_news_brand_id')); ?>"
                                   class="regular-text"
                                   placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                                   required>
                            <p class="description">🆔 Plak hier de "Brand ID" uit Bolt</p>
                            <?php if (get_option('ai_news_brand_name')): ?>
                                <p class="description" style="color: green; font-weight: bold;">
                                    ✓ Gekoppeld aan: <strong><?php echo esc_html(get_option('ai_news_brand_name')); ?></strong>
                                </p>
                            <?php endif; ?>
                        </td>
                    </tr>
                    <tr>
                        <th scope="row">
                            <label for="ai_news_openai_api_key">OpenAI API Key</label>
                        </th>
                        <td>
                            <input type="password"
                                   id="ai_news_openai_api_key"
                                   name="ai_news_openai_api_key"
                                   value="<?php echo esc_attr(get_option('ai_news_openai_api_key')); ?>"
                                   class="regular-text"
                                   placeholder="sk-...">
                            <p class="description">🔑 Optioneel: Gebruik je eigen OpenAI API key, of laat leeg om de centrale key te gebruiken</p>
                        </td>
                    </tr>
                    <tr>
                        <th scope="row">
                            <label for="ai_news_cache_duration">Cache Duration (seconden)</label>
                        </th>
                        <td>
                            <input type="number"
                                   id="ai_news_cache_duration"
                                   name="ai_news_cache_duration"
                                   value="<?php echo esc_attr(get_option('ai_news_cache_duration', 300)); ?>"
                                   class="small-text">
                            <p class="description">⏱️ Hoelang nieuws in cache blijft (standaard: 300 seconden / 5 minuten)</p>
                        </td>
                    </tr>
                </table>

                <div class="ai-news-instruction">
                    <p><strong>💡 Tip:</strong> Gebruik de "Kopieer Setup Code" knop in Bolt (Brand Settings > WordPress Integratie) om alle gegevens in één keer te kopiëren.</p>
                </div>

                <?php submit_button('💾 Instellingen Opslaan'); ?>
            </form>

            <hr>

            <h2>Cache Management</h2>
            <form method="post" action="">
                <input type="hidden" name="ai_news_clear_cache" value="1">
                <?php wp_nonce_field('ai_news_clear_cache', 'ai_news_nonce'); ?>
                <?php submit_button('Clear All News Cache', 'secondary', 'submit', false); ?>
            </form>

            <?php
            if (isset($_POST['ai_news_clear_cache']) && check_admin_referer('ai_news_clear_cache', 'ai_news_nonce')) {
                $this->clear_all_cache();
                echo '<div class="notice notice-success"><p>Cache successfully cleared!</p></div>';
            }
            ?>

            <hr>

            <h2>Available Shortcodes</h2>
            <div style="background: #f9f9f9; padding: 15px; border-left: 4px solid #2271b1;">
                <ul style="list-style: none; padding: 0;">
                    <li style="margin: 10px 0;"><code>[ai-news-list limit="10"]</code> - Toon lijst van nieuwsberichten</li>
                    <li style="margin: 10px 0;"><code>[ai-news-grid limit="6" columns="3"]</code> - Toon nieuws in grid layout</li>
                    <li style="margin: 10px 0;"><code>[ai-news id="xxx"]</code> - Toon specifiek nieuwsbericht (volledig)</li>
                    <li style="margin: 10px 0;"><code>[ai-news-title id="xxx"]</code> - Toon alleen titel</li>
                    <li style="margin: 10px 0;"><code>[ai-news-excerpt id="xxx"]</code> - Toon alleen excerpt</li>
                    <li style="margin: 10px 0;"><code>[ai-news-content id="xxx"]</code> - Toon alleen content</li>
                    <li style="margin: 10px 0;"><code>[ai-news-closing id="xxx"]</code> - Toon alleen closing text (slot)</li>
                    <li style="margin: 10px 0;"><code>[ai-news-image id="xxx"]</code> - Toon alleen featured image</li>
                    <li style="margin: 10px 0;"><code>[ai-news-date id="xxx"]</code> - Toon publicatiedatum</li>
                    <li style="margin: 10px 0;"><code>[ai-news-tags id="xxx"]</code> - Toon tags</li>
                </ul>
            </div>
        </div>
        <?php
    }

    private function register_shortcodes() {
        add_shortcode('ai-news-list', [$this, 'shortcode_news_list']);
        add_shortcode('ai-news-grid', [$this, 'shortcode_news_grid']);
        add_shortcode('ai-news', [$this, 'shortcode_single_news']);
        add_shortcode('ai-news-title', [$this, 'shortcode_news_title']);
        add_shortcode('ai-news-excerpt', [$this, 'shortcode_news_excerpt']);
        add_shortcode('ai-news-content', [$this, 'shortcode_news_content']);
        add_shortcode('ai-news-closing', [$this, 'shortcode_news_closing']);
        add_shortcode('ai-news-image', [$this, 'shortcode_news_image']);
        add_shortcode('ai-news-date', [$this, 'shortcode_news_date']);
        add_shortcode('ai-news-tags', [$this, 'shortcode_news_tags']);
    }

    private function fetch_news($params = []) {
        if (empty($this->api_url) || empty($this->brand_id)) {
            return ['error' => 'Plugin not configured. Please set API URL and Brand ID in settings.'];
        }

        $cache_key = 'ai_news_' . md5(serialize($params));
        $cached = get_transient($cache_key);

        if ($cached !== false) {
            return $cached;
        }

        $query_params = array_merge(['brand_id' => $this->brand_id], $params);
        $url = add_query_arg($query_params, $this->api_url);

        $response = wp_remote_get($url, [
            'timeout' => 15,
            'headers' => [
                'Content-Type' => 'application/json',
            ],
        ]);

        if (is_wp_error($response)) {
            return ['error' => $response->get_error_message()];
        }

        $body = wp_remote_retrieve_body($response);
        $data = json_decode($body, true);

        if (json_last_error() !== JSON_ERROR_NONE) {
            return ['error' => 'Invalid JSON response'];
        }

        $cache_duration = get_option('ai_news_cache_duration', $this->cache_duration);
        set_transient($cache_key, $data, $cache_duration);

        return $data;
    }

    private function clear_all_cache() {
        global $wpdb;
        $wpdb->query("DELETE FROM {$wpdb->options} WHERE option_name LIKE '_transient_ai_news_%'");
        $wpdb->query("DELETE FROM {$wpdb->options} WHERE option_name LIKE '_transient_timeout_ai_news_%'");
    }

    public function shortcode_news_list($atts) {
        $atts = shortcode_atts([
            'limit' => 10,
            'offset' => 0,
        ], $atts);

        $data = $this->fetch_news([
            'limit' => $atts['limit'],
            'offset' => $atts['offset'],
        ]);

        if (isset($data['error'])) {
            return '<p class="ai-news-error">Error: ' . esc_html($data['error']) . '</p>';
        }

        if (empty($data['news'])) {
            return '<p class="ai-news-empty">Geen nieuwsberichten gevonden.</p>';
        }

        ob_start();
        ?>
        <div class="ai-news-list">
            <?php foreach ($data['news'] as $news): ?>
                <article class="ai-news-item">
                    <?php if (!empty($news['featured_image'])): ?>
                        <div class="ai-news-image">
                            <img src="<?php echo esc_url($news['featured_image']); ?>"
                                 alt="<?php echo esc_attr($news['title']); ?>">
                        </div>
                    <?php endif; ?>

                    <div class="ai-news-content">
                        <h2 class="ai-news-title">
                            <?php echo esc_html($news['title']); ?>
                        </h2>

                        <div class="ai-news-meta">
                            <span class="ai-news-date">
                                <?php echo date('d-m-Y', strtotime($news['published_at'] ?? $news['created_at'])); ?>
                            </span>
                            <?php if (!empty($news['tags'])): ?>
                                <span class="ai-news-tags-inline">
                                    <?php echo esc_html(implode(', ', $news['tags'])); ?>
                                </span>
                            <?php endif; ?>
                        </div>

                        <?php if (!empty($news['excerpt'])): ?>
                            <div class="ai-news-excerpt">
                                <?php echo wp_kses_post($news['excerpt']); ?>
                            </div>
                        <?php endif; ?>
                    </div>
                </article>
            <?php endforeach; ?>
        </div>
        <?php
        return ob_get_clean();
    }

    public function shortcode_news_grid($atts) {
        $atts = shortcode_atts([
            'limit' => 6,
            'columns' => 3,
        ], $atts);

        $data = $this->fetch_news([
            'limit' => $atts['limit'],
        ]);

        if (isset($data['error'])) {
            return '<p class="ai-news-error">Error: ' . esc_html($data['error']) . '</p>';
        }

        if (empty($data['news'])) {
            return '<p class="ai-news-empty">Geen nieuwsberichten gevonden.</p>';
        }

        ob_start();
        ?>
        <div class="ai-news-grid ai-news-grid-<?php echo esc_attr($atts['columns']); ?>">
            <?php foreach ($data['news'] as $news): ?>
                <article class="ai-news-grid-item">
                    <?php if (!empty($news['featured_image'])): ?>
                        <div class="ai-news-image">
                            <img src="<?php echo esc_url($news['featured_image']); ?>"
                                 alt="<?php echo esc_attr($news['title']); ?>">
                        </div>
                    <?php endif; ?>

                    <div class="ai-news-content">
                        <h3 class="ai-news-title">
                            <?php echo esc_html($news['title']); ?>
                        </h3>

                        <?php if (!empty($news['excerpt'])): ?>
                            <div class="ai-news-excerpt">
                                <?php echo wp_kses_post($news['excerpt']); ?>
                            </div>
                        <?php endif; ?>

                        <div class="ai-news-meta">
                            <span class="ai-news-date">
                                <?php echo date('d-m-Y', strtotime($news['published_at'] ?? $news['created_at'])); ?>
                            </span>
                        </div>
                    </div>
                </article>
            <?php endforeach; ?>
        </div>
        <?php
        return ob_get_clean();
    }

    public function shortcode_single_news($atts) {
        $atts = shortcode_atts([
            'id' => '',
            'slug' => '',
        ], $atts);

        if (empty($atts['id']) && empty($atts['slug'])) {
            return '<p class="ai-news-error">Error: id or slug parameter required</p>';
        }

        $params = [];
        if (!empty($atts['id'])) {
            $params['id'] = $atts['id'];
        } elseif (!empty($atts['slug'])) {
            $params['slug'] = $atts['slug'];
        }

        $news = $this->fetch_news($params);

        if (isset($news['error'])) {
            return '<p class="ai-news-error">Error: ' . esc_html($news['error']) . '</p>';
        }

        ob_start();
        ?>
        <article class="ai-news-single">
            <?php if (!empty($news['featured_image'])): ?>
                <div class="ai-news-image">
                    <img src="<?php echo esc_url($news['featured_image']); ?>"
                         alt="<?php echo esc_attr($news['title']); ?>">
                </div>
            <?php endif; ?>

            <header class="ai-news-header">
                <h1 class="ai-news-title"><?php echo esc_html($news['title']); ?></h1>

                <div class="ai-news-meta">
                    <span class="ai-news-date">
                        <?php echo date('d-m-Y', strtotime($news['published_at'] ?? $news['created_at'])); ?>
                    </span>
                    <?php if (!empty($news['tags'])): ?>
                        <div class="ai-news-tags">
                            <?php foreach ($news['tags'] as $tag): ?>
                                <span class="ai-news-tag"><?php echo esc_html($tag); ?></span>
                            <?php endforeach; ?>
                        </div>
                    <?php endif; ?>
                </div>
            </header>

            <?php if (!empty($news['excerpt'])): ?>
                <div class="ai-news-excerpt">
                    <?php echo wp_kses_post($news['excerpt']); ?>
                </div>
            <?php endif; ?>

            <div class="ai-news-content">
                <?php
                if (!empty($news['content'])) {
                    if (is_string($news['content'])) {
                        echo wp_kses_post($news['content']);
                    } elseif (isset($news['content']['html'])) {
                        echo wp_kses_post($news['content']['html']);
                    }
                }
                ?>
            </div>

            <?php if (!empty($news['closing_text'])): ?>
                <div class="ai-news-closing">
                    <?php echo wp_kses_post($news['closing_text']); ?>
                </div>
            <?php endif; ?>
        </article>
        <?php
        return ob_get_clean();
    }

    public function shortcode_news_title($atts) {
        $news = $this->get_news_by_id_or_slug($atts);
        if (is_string($news)) return $news;
        return '<span class="ai-news-title">' . esc_html($news['title']) . '</span>';
    }

    public function shortcode_news_excerpt($atts) {
        $news = $this->get_news_by_id_or_slug($atts);
        if (is_string($news)) return $news;
        return '<div class="ai-news-excerpt">' . wp_kses_post($news['excerpt'] ?? '') . '</div>';
    }

    public function shortcode_news_content($atts) {
        $news = $this->get_news_by_id_or_slug($atts);
        if (is_string($news)) return $news;

        $content = '';
        if (!empty($news['content'])) {
            if (is_string($news['content'])) {
                $content = $news['content'];
            } elseif (isset($news['content']['html'])) {
                $content = $news['content']['html'];
            }
        }

        return '<div class="ai-news-content">' . wp_kses_post($content) . '</div>';
    }

    public function shortcode_news_closing($atts) {
        $news = $this->get_news_by_id_or_slug($atts);
        if (is_string($news)) return $news;
        return '<div class="ai-news-closing">' . wp_kses_post($news['closing_text'] ?? '') . '</div>';
    }

    public function shortcode_news_image($atts) {
        $news = $this->get_news_by_id_or_slug($atts);
        if (is_string($news)) return $news;

        if (empty($news['featured_image'])) {
            return '';
        }

        return '<img src="' . esc_url($news['featured_image']) . '" alt="' . esc_attr($news['title']) . '" class="ai-news-image">';
    }

    public function shortcode_news_date($atts) {
        $atts = shortcode_atts([
            'id' => '',
            'slug' => '',
            'format' => 'd-m-Y',
        ], $atts);

        $news = $this->get_news_by_id_or_slug($atts);
        if (is_string($news)) return $news;

        $date = $news['published_at'] ?? $news['created_at'];
        return '<span class="ai-news-date">' . date($atts['format'], strtotime($date)) . '</span>';
    }

    public function shortcode_news_tags($atts) {
        $news = $this->get_news_by_id_or_slug($atts);
        if (is_string($news)) return $news;

        if (empty($news['tags'])) {
            return '';
        }

        ob_start();
        ?>
        <div class="ai-news-tags">
            <?php foreach ($news['tags'] as $tag): ?>
                <span class="ai-news-tag"><?php echo esc_html($tag); ?></span>
            <?php endforeach; ?>
        </div>
        <?php
        return ob_get_clean();
    }

    private function get_news_by_id_or_slug($atts) {
        $atts = shortcode_atts([
            'id' => '',
            'slug' => '',
        ], $atts);

        if (empty($atts['id']) && empty($atts['slug'])) {
            return '<p class="ai-news-error">Error: id or slug parameter required</p>';
        }

        $params = [];
        if (!empty($atts['id'])) {
            $params['id'] = $atts['id'];
        } elseif (!empty($atts['slug'])) {
            $params['slug'] = $atts['slug'];
        }

        $news = $this->fetch_news($params);

        if (isset($news['error'])) {
            return '<p class="ai-news-error">Error: ' . esc_html($news['error']) . '</p>';
        }

        return $news;
    }
}

new AI_News_Plugin();

add_action('wp_enqueue_scripts', function() {
    wp_add_inline_style('wp-block-library', '
        .ai-news-list {
            display: flex;
            flex-direction: column;
            gap: 2rem;
        }

        .ai-news-item {
            display: flex;
            gap: 1.5rem;
            padding: 1.5rem;
            border: 1px solid #e5e7eb;
            border-radius: 8px;
        }

        .ai-news-item .ai-news-image {
            flex-shrink: 0;
            width: 200px;
        }

        .ai-news-item .ai-news-image img {
            width: 100%;
            height: 150px;
            object-fit: cover;
            border-radius: 4px;
        }

        .ai-news-grid {
            display: grid;
            gap: 1.5rem;
        }

        .ai-news-grid-2 { grid-template-columns: repeat(2, 1fr); }
        .ai-news-grid-3 { grid-template-columns: repeat(3, 1fr); }
        .ai-news-grid-4 { grid-template-columns: repeat(4, 1fr); }

        @media (max-width: 768px) {
            .ai-news-grid { grid-template-columns: 1fr !important; }
            .ai-news-item { flex-direction: column; }
            .ai-news-item .ai-news-image { width: 100%; }
        }

        .ai-news-grid-item {
            border: 1px solid #e5e7eb;
            border-radius: 8px;
            overflow: hidden;
        }

        .ai-news-grid-item .ai-news-image img {
            width: 100%;
            height: 200px;
            object-fit: cover;
        }

        .ai-news-grid-item .ai-news-content {
            padding: 1rem;
        }

        .ai-news-title {
            margin: 0 0 0.5rem;
            font-size: 1.25rem;
            font-weight: 600;
        }

        .ai-news-meta {
            display: flex;
            gap: 1rem;
            margin: 0.5rem 0;
            font-size: 0.875rem;
            color: #6b7280;
        }

        .ai-news-excerpt {
            margin: 0.5rem 0;
            line-height: 1.6;
        }

        .ai-news-tags {
            display: flex;
            flex-wrap: wrap;
            gap: 0.5rem;
            margin-top: 0.5rem;
        }

        .ai-news-tag {
            padding: 0.25rem 0.75rem;
            background: #f3f4f6;
            border-radius: 4px;
            font-size: 0.875rem;
        }

        .ai-news-single .ai-news-image {
            margin-bottom: 2rem;
        }

        .ai-news-single .ai-news-image img {
            width: 100%;
            max-height: 500px;
            object-fit: cover;
            border-radius: 8px;
        }

        .ai-news-error {
            padding: 1rem;
            background: #fee;
            border: 1px solid #fcc;
            border-radius: 4px;
            color: #c00;
        }

        .ai-news-empty {
            padding: 1rem;
            background: #f9fafb;
            border: 1px solid #e5e7eb;
            border-radius: 4px;
            color: #6b7280;
        }

        .ai-news-closing {
            margin-top: 2rem;
            padding-top: 1.5rem;
            border-top: 1px solid #e5e7eb;
            font-style: italic;
            color: #4b5563;
        }
    ');
});
