<?php
if (!defined('ABSPATH')) exit;

class TCC_Image_Tag extends \Elementor\Core\DynamicTags\Data_Tag {
    
    public function get_name() {
        return 'tcc-image';
    }
    
    public function get_title() {
        return 'TravelC Afbeelding';
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
        
        $this->add_control(
            'image_index',
            [
                'label' => 'Afbeelding Index',
                'type' => \Elementor\Controls_Manager::NUMBER,
                'default' => 0,
                'min' => 0,
                'description' => '0 = Featured image, 1+ = Galerij afbeeldingen',
            ]
        );
    }
    
    public function get_value(array $options = []) {
        $slug = $this->get_settings('slug');
        $index = (int) $this->get_settings('image_index');
        $destination = tcc_get_destination_data($slug);
        
        if (!$destination) {
            return [];
        }
        
        $image_url = '';
        
        if ($index === 0) {
            // Featured image
            $image_url = $destination['featured_image'] ?? '';
        } else {
            // Gallery image
            $images = $destination['images'] ?? [];
            if (isset($images[$index - 1])) {
                $image_url = $images[$index - 1];
            }
        }
        
        if (empty($image_url)) {
            return [];
        }
        
        return [
            'url' => $image_url,
            'id' => '',
        ];
    }
}
