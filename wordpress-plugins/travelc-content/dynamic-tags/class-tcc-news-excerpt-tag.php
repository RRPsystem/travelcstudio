<?php
/**
 * TravelC News Excerpt Dynamic Tag
 */

if (!defined('ABSPATH')) {
    exit;
}

class TCC_News_Excerpt_Tag extends \Elementor\Core\DynamicTags\Tag {

    public function get_name() {
        return 'tcc-news-excerpt';
    }

    public function get_title() {
        return 'TravelC Nieuws Samenvatting';
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
        
        echo wp_kses_post($news['excerpt'] ?? '');
    }
}
