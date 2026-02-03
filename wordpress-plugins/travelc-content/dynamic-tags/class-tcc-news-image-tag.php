<?php
/**
 * TravelC News Image Dynamic Tag
 */

if (!defined('ABSPATH')) {
    exit;
}

class TCC_News_Image_Tag extends \Elementor\Core\DynamicTags\Data_Tag {

    public function get_name() {
        return 'tcc-news-image';
    }

    public function get_title() {
        return 'TravelC Nieuws Afbeelding';
    }

    public function get_group() {
        return 'travelc';
    }

    public function get_categories() {
        return [\Elementor\Modules\DynamicTags\Module::IMAGE_CATEGORY];
    }

    public function get_value(array $options = []) {
        $news = tcc_get_news_data();
        
        if (!$news || empty($news['featured_image'])) {
            return [
                'url' => '',
                'id' => ''
            ];
        }
        
        return [
            'url' => $news['featured_image'],
            'id' => ''
        ];
    }
}
