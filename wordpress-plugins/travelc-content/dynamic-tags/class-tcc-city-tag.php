<?php
if (!defined('ABSPATH')) exit;

class TCC_City_Tag extends \Elementor\Core\DynamicTags\Tag {
    
    public function get_name() {
        return 'tcc-city';
    }
    
    public function get_title() {
        return 'TravelC Stad';
    }
    
    public function get_group() {
        return 'travelc';
    }
    
    public function get_categories() {
        return [\Elementor\Modules\DynamicTags\Module::TEXT_CATEGORY];
    }
    
    protected function register_controls() {
        $this->add_control(
            'city_number',
            [
                'label' => 'Stad Nummer',
                'type' => \Elementor\Controls_Manager::NUMBER,
                'default' => 1,
                'min' => 1,
                'max' => 10,
            ]
        );
        
        $this->add_control(
            'field',
            [
                'label' => 'Veld',
                'type' => \Elementor\Controls_Manager::SELECT,
                'default' => 'name',
                'options' => [
                    'name' => 'Naam',
                    'description' => 'Beschrijving',
                ],
            ]
        );
        
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
        $number = (int) $this->get_settings('city_number');
        $field = $this->get_settings('field');
        
        $destination = tcc_get_destination_data($slug);
        
        if (!$destination || empty($destination['cities'])) {
            return;
        }
        
        $cities = $destination['cities'];
        $index = $number - 1;
        
        if (!isset($cities[$index])) {
            return;
        }
        
        $city = $cities[$index];
        
        if ($field === 'name') {
            echo esc_html($city['name'] ?? '');
        } else {
            echo esc_html($city['description'] ?? '');
        }
    }
}
