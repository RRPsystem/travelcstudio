<?php
if (!defined('ABSPATH')) exit;

class TCC_Flag_Tag extends \Elementor\Core\DynamicTags\Data_Tag {
    
    public function get_name() {
        return 'tcc-flag';
    }
    
    public function get_title() {
        return 'TravelC Vlag';
    }
    
    public function get_group() {
        return 'travelc';
    }
    
    public function get_categories() {
        return [\Elementor\Modules\DynamicTags\Module::IMAGE_CATEGORY];
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
    
    public function get_value(array $options = []) {
        $slug = $this->get_settings('slug');
        $destination = tcc_get_destination_data($slug);
        
        if (!$destination || empty($destination['flag_image'])) {
            return [];
        }
        
        return [
            'url' => $destination['flag_image'],
            'id' => '',
        ];
    }
}
