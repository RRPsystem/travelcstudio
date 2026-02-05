<?php
/**
 * TravelC News Content Dynamic Tag
 */

if (!defined('ABSPATH')) {
    exit;
}

class TCC_News_Content_Tag extends \Elementor\Core\DynamicTags\Tag {

    public function get_name() {
        return 'tcc-news-content';
    }

    public function get_title() {
        return 'TravelC Nieuws Inhoud';
    }

    public function get_group() {
        return 'travelc';
    }

    public function get_categories() {
        return [\Elementor\Modules\DynamicTags\Module::TEXT_CATEGORY];
    }

    public function render() {
        $news = tcc_get_news_data();
        
        if (!$news) {
            echo '';
            return;
        }
        
        $content = $news['content'] ?? '';
        
        // Handle array content (from API)
        if (is_array($content) && isset($content['html'])) {
            $content = $content['html'];
        }
        
        // If content looks like builder output, it's corrupted - show nothing
        if (preg_match('/<style|wb-block|\.sidebar|\.canvas-area|Reset & Base Styles/i', $content)) {
            echo '';
            return;
        }
        
        echo wpautop(wp_kses_post(trim($content)));
    }
}
