<?php
/**
 * TravelC News Title Dynamic Tag
 */

if (!defined('ABSPATH')) {
    exit;
}

class TCC_News_Title_Tag extends \Elementor\Core\DynamicTags\Tag {

    public function get_name() {
        return 'tcc-news-title';
    }

    public function get_title() {
        return 'TravelC Nieuws Titel';
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
        
        echo esc_html($news['title'] ?? '');
    }
}
