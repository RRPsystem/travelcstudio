<?php
if (!defined('ABSPATH')) exit;

class TCC_Gallery_Tag extends \Elementor\Core\DynamicTags\Data_Tag {
    
    public function get_name() {
        return 'tcc-gallery';
    }
    
    public function get_title() {
        return 'TravelC Galerij';
    }
    
    public function get_group() {
        return 'travelc';
    }
    
    public function get_categories() {
        return [\Elementor\Modules\DynamicTags\Module::GALLERY_CATEGORY];
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
            'include_featured',
            [
                'label' => 'Inclusief Featured Image',
                'type' => \Elementor\Controls_Manager::SWITCHER,
                'default' => 'yes',
            ]
        );
    }
    
    public function get_value(array $options = []) {
        $slug = $this->get_settings('slug');
        $include_featured = $this->get_settings('include_featured') === 'yes';
        $destination = tcc_get_destination_data($slug);
        
        if (!$destination) {
            return [];
        }
        
        $gallery = [];
        
        // Add featured image first if requested
        if ($include_featured && !empty($destination['featured_image'])) {
            $gallery[] = [
                'url' => $destination['featured_image'],
                'id' => '',
            ];
        }
        
        // Add gallery images
        $images = $destination['images'] ?? [];
        foreach ($images as $image_url) {
            if (!empty($image_url)) {
                $gallery[] = [
                    'url' => $image_url,
                    'id' => '',
                ];
            }
        }
        
        return $gallery;
    }
}
