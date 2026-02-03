<?php
/**
 * TravelC News Date Dynamic Tag
 */

if (!defined('ABSPATH')) {
    exit;
}

class TCC_News_Date_Tag extends \Elementor\Core\DynamicTags\Tag {

    public function get_name() {
        return 'tcc-news-date';
    }

    public function get_title() {
        return 'TravelC Nieuws Datum';
    }

    public function get_group() {
        return 'travelc';
    }

    public function get_categories() {
        return [\Elementor\Modules\DynamicTags\Module::TEXT_CATEGORY];
    }

    protected function register_controls() {
        $this->add_control(
            'format',
            [
                'label' => 'Datum Formaat',
                'type' => \Elementor\Controls_Manager::SELECT,
                'default' => 'j F Y',
                'options' => [
                    'j F Y' => '3 februari 2026',
                    'd-m-Y' => '03-02-2026',
                    'j M Y' => '3 feb 2026',
                    'F j, Y' => 'February 3, 2026',
                ],
            ]
        );
    }

    public function render() {
        $news = tcc_get_news_data();
        
        if (!$news) {
            echo '';
            return;
        }
        
        $date = $news['published_at'] ?? '';
        if (empty($date)) {
            echo '';
            return;
        }
        
        $format = $this->get_settings('format') ?: 'j F Y';
        $timestamp = strtotime($date);
        
        if ($timestamp) {
            // Set locale for Dutch month names
            setlocale(LC_TIME, 'nl_NL.UTF-8', 'nl_NL', 'Dutch');
            echo esc_html(date_i18n($format, $timestamp));
        }
    }
}
