<?php
if (!defined('ABSPATH')) exit;

class TCC_Field_Tag extends \Elementor\Core\DynamicTags\Tag {
    
    public function get_name() {
        return 'tcc-field';
    }
    
    public function get_title() {
        return 'TravelC Veld';
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
        
        $this->add_control(
            'field',
            [
                'label' => 'Veld',
                'type' => \Elementor\Controls_Manager::SELECT,
                'default' => 'title',
                'options' => [
                    'title' => 'Titel',
                    'country' => 'Land',
                    'continent' => 'Continent',
                    'intro_text' => 'Introductie',
                    'description' => 'Beschrijving',
                    'transportation' => 'Vervoer',
                    'climate' => 'Klimaat',
                    'best_time_to_visit' => 'Beste Reistijd',
                    'currency' => 'Valuta',
                    'language' => 'Taal',
                    'timezone' => 'Tijdzone',
                    'visa_info' => 'Visum Info',
                ],
            ]
        );
    }
    
    public function render() {
        $slug = $this->get_settings('slug');
        $field = $this->get_settings('field');
        $destination = tcc_get_destination_data($slug);
        
        if ($destination && isset($destination[$field])) {
            echo wp_kses_post($destination[$field]);
        }
    }
}
