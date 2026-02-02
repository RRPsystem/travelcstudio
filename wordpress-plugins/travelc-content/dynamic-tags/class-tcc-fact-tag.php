<?php
if (!defined('ABSPATH')) exit;

class TCC_Fact_Tag extends \Elementor\Core\DynamicTags\Tag {
    
    public function get_name() {
        return 'tcc-fact';
    }
    
    public function get_title() {
        return 'TravelC Weetje';
    }
    
    public function get_group() {
        return 'travelc';
    }
    
    public function get_categories() {
        return [\Elementor\Modules\DynamicTags\Module::TEXT_CATEGORY];
    }
    
    protected function register_controls() {
        $this->add_control(
            'fact_number',
            [
                'label' => 'Weetje Nummer',
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
                'default' => 'value',
                'options' => [
                    'label' => 'Label',
                    'value' => 'Waarde/Tekst',
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
        $number = (int) $this->get_settings('fact_number');
        $field = $this->get_settings('field');
        
        $destination = tcc_get_destination_data($slug);
        
        if (!$destination || empty($destination['facts'])) {
            return;
        }
        
        $facts = $destination['facts'];
        $index = $number - 1;
        
        if (!isset($facts[$index])) {
            return;
        }
        
        $fact = $facts[$index];
        
        if ($field === 'label') {
            echo esc_html($fact['label'] ?? '');
        } else {
            echo esc_html($fact['value'] ?? '');
        }
    }
}
