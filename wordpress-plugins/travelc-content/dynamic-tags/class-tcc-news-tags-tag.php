<?php
/**
 * TravelC News Tags Dynamic Tag
 */

if (!defined('ABSPATH')) {
    exit;
}

class TCC_News_Tags_Tag extends \Elementor\Core\DynamicTags\Tag {

    public function get_name() {
        return 'tcc-news-tags';
    }

    public function get_title() {
        return 'TravelC Nieuws Tags';
    }

    public function get_group() {
        return 'travelc';
    }

    public function get_categories() {
        return [\Elementor\Modules\DynamicTags\Module::TEXT_CATEGORY];
    }

    protected function register_controls() {
        $this->add_control(
            'style',
            [
                'label' => 'Weergave',
                'type' => \Elementor\Controls_Manager::SELECT,
                'default' => 'badges',
                'options' => [
                    'badges' => 'Badges',
                    'comma' => 'Komma gescheiden',
                ],
            ]
        );
    }

    public function render() {
        $news = tcc_get_news_data();
        
        if (!$news || empty($news['tags'])) {
            echo '';
            return;
        }
        
        $tags = $news['tags'];
        if (!is_array($tags)) {
            echo '';
            return;
        }
        
        $style = $this->get_settings('style') ?: 'badges';
        
        if ($style === 'comma') {
            echo esc_html(implode(', ', $tags));
        } else {
            $output = '<div class="tcc-news-tags">';
            foreach ($tags as $tag) {
                $output .= '<span class="tcc-news-tag" style="display: inline-block; background: #e7f3ff; color: #0073aa; padding: 4px 12px; border-radius: 20px; margin: 2px 4px 2px 0; font-size: 13px;">' . esc_html($tag) . '</span>';
            }
            $output .= '</div>';
            echo $output;
        }
    }
}
