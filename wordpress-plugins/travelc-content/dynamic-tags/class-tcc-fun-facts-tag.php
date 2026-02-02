<?php
if (!defined('ABSPATH')) exit;

class TCC_Fun_Facts_Tag extends \Elementor\Core\DynamicTags\Tag {
    
    public function get_name() {
        return 'tcc-fun-facts';
    }
    
    public function get_title() {
        return 'TravelC Fun Facts';
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
                    'list' => 'Bullet lijst',
                    'numbered' => 'Genummerde lijst',
                    'plain' => 'Platte tekst (komma gescheiden)',
                ],
            ]
        );
        
        $this->add_control(
            'fact_number',
            [
                'label' => 'Specifiek feit (optioneel)',
                'type' => \Elementor\Controls_Manager::SELECT,
                'default' => 'all',
                'options' => [
                    'all' => 'Alle feiten',
                    '1' => 'Feit 1',
                    '2' => 'Feit 2',
                    '3' => 'Feit 3',
                ],
            ]
        );
    }
    
    public function render() {
        $format = $this->get_settings('format');
        $fact_number = $this->get_settings('fact_number');
        
        $destination = TravelC_Content::get_instance()->get_current_destination();
        
        if (!$destination || empty($destination['fun_facts'])) {
            return;
        }
        
        $fun_facts = $destination['fun_facts'];
        
        // If specific fact requested
        if ($fact_number !== 'all') {
            $index = intval($fact_number) - 1;
            if (isset($fun_facts[$index])) {
                echo esc_html($fun_facts[$index]);
            }
            return;
        }
        
        // All facts
        switch ($format) {
            case 'list':
                echo '<ul class="tcc-fun-facts-list">';
                foreach ($fun_facts as $fact) {
                    echo '<li>' . esc_html($fact) . '</li>';
                }
                echo '</ul>';
                break;
                
            case 'numbered':
                echo '<ol class="tcc-fun-facts-list">';
                foreach ($fun_facts as $fact) {
                    echo '<li>' . esc_html($fact) . '</li>';
                }
                echo '</ol>';
                break;
                
            case 'plain':
            default:
                echo esc_html(implode(', ', $fun_facts));
                break;
        }
    }
}
