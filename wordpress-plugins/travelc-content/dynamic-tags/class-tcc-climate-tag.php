<?php
if (!defined('ABSPATH')) exit;

class TCC_Climate_Tag extends \Elementor\Core\DynamicTags\Tag {
    
    public function get_name() {
        return 'tcc-climate';
    }
    
    public function get_title() {
        return 'TravelC Klimaat';
    }
    
    public function get_group() {
        return 'travelc';
    }
    
    public function get_categories() {
        return [\Elementor\Modules\DynamicTags\Module::TEXT_CATEGORY];
    }
    
    protected function register_controls() {
        $this->add_control(
            'slug',
            [
                'label' => 'Bestemming Slug',
                'type' => \Elementor\Controls_Manager::TEXT,
                'placeholder' => 'Leeg = automatisch detecteren',
            ]
        );
    }
    
    public function render() {
        $slug = $this->get_settings('slug');
        $destination = tcc_get_destination_data($slug);
        
        if ($destination && isset($destination['climate'])) {
            echo wp_kses_post($destination['climate']);
        }
    }
}
