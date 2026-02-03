<?php
if (!defined('ABSPATH')) exit;

class TCC_Facts_List_Tag extends \Elementor\Core\DynamicTags\Tag {
    
    public function get_name() {
        return 'tcc-facts-list';
    }
    
    public function get_title() {
        return 'TravelC Weetjes Lijst';
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
                'label' => 'Weergave',
                'type' => \Elementor\Controls_Manager::SELECT,
                'default' => 'list',
                'options' => [
                    'list' => 'Lijst met labels',
                    'table' => 'Tabel',
                    'icons' => 'Met iconen',
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
        $format = $this->get_settings('format');
        
        $destination = tcc_get_destination_data($slug);
        
        if (!$destination || empty($destination['facts'])) {
            return;
        }
        
        $facts = $destination['facts'];
        if (is_string($facts)) {
            $facts = json_decode($facts, true) ?: [];
        }
        
        if (empty($facts) || !is_array($facts)) {
            return;
        }
        
        // Icon mapping for common fact labels
        $icons = [
            'hoofdstad' => '🏛️',
            'capital' => '🏛️',
            'inwoners' => '👥',
            'population' => '👥',
            'bevolking' => '👥',
            'oppervlakte' => '📐',
            'area' => '📐',
            'valuta' => '💰',
            'currency' => '💰',
            'taal' => '🗣️',
            'language' => '🗣️',
            'tijdzone' => '🕐',
            'timezone' => '🕐',
            'religie' => '🙏',
            'religion' => '🙏',
            'klimaat' => '🌡️',
            'climate' => '🌡️',
        ];
        
        switch ($format) {
            case 'table':
                echo '<table class="tcc-facts-table" style="width:100%; border-collapse:collapse;">';
                foreach ($facts as $fact) {
                    $label = $fact['label'] ?? '';
                    $value = $fact['value'] ?? '';
                    if (empty($label) && empty($value)) continue;
                    echo '<tr>';
                    echo '<th style="text-align:left; padding:8px 12px; border-bottom:1px solid #eee; font-weight:600; color:#333;">' . esc_html($label) . '</th>';
                    echo '<td style="padding:8px 12px; border-bottom:1px solid #eee; color:#666;">' . esc_html($value) . '</td>';
                    echo '</tr>';
                }
                echo '</table>';
                break;
                
            case 'icons':
                echo '<ul class="tcc-facts-list" style="list-style:none; padding:0; margin:0;">';
                foreach ($facts as $fact) {
                    $label = $fact['label'] ?? '';
                    $value = $fact['value'] ?? '';
                    if (empty($label) && empty($value)) continue;
                    
                    // Find matching icon
                    $icon = '✓';
                    $labelLower = strtolower($label);
                    foreach ($icons as $key => $emoji) {
                        if (strpos($labelLower, $key) !== false) {
                            $icon = $emoji;
                            break;
                        }
                    }
                    
                    echo '<li style="padding:8px 0; border-bottom:1px solid #f0f0f0; display:flex; align-items:center; gap:10px;">';
                    echo '<span style="font-size:1.2em;">' . $icon . '</span>';
                    echo '<span><strong>' . esc_html($label) . ':</strong> ' . esc_html($value) . '</span>';
                    echo '</li>';
                }
                echo '</ul>';
                break;
                
            case 'list':
            default:
                echo '<ul class="tcc-facts-list" style="list-style:none; padding:0; margin:0;">';
                foreach ($facts as $fact) {
                    $label = $fact['label'] ?? '';
                    $value = $fact['value'] ?? '';
                    if (empty($label) && empty($value)) continue;
                    echo '<li style="padding:6px 0; border-bottom:1px solid #f0f0f0;">';
                    echo '<strong>' . esc_html($label) . ':</strong> ' . esc_html($value);
                    echo '</li>';
                }
                echo '</ul>';
                break;
        }
    }
}
