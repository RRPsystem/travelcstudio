<?php if (!defined('ABSPATH')) exit; ?>

<div class="travelc-reizen travelc-layout-<?php echo esc_attr($layout); ?>" style="--travelc-columns: <?php echo esc_attr($columns); ?>">
    <?php foreach ($result['travels'] as $travel): 
        $detail_url = add_query_arg('reis', $travel['slug'], get_permalink());
        $image = !empty($travel['first_image']) ? $travel['first_image'] : '';
        $price = !empty($travel['display_price']) ? $travel['display_price'] : $travel['price_per_person'];
        $title = !empty($travel['display_title']) ? $travel['display_title'] : $travel['title'];
        $nights = $travel['number_of_nights'] ?? 0;
        $days = $travel['number_of_days'] ?? 0;
        $countries = $travel['country_list'] ?? [];
        $dest_count = $travel['destination_count'] ?? 0;
    ?>
    <a href="<?php echo esc_url($detail_url); ?>" class="travelc-card">
        <?php if ($image): ?>
        <div class="travelc-card__image">
            <img src="<?php echo esc_url($image); ?>" alt="<?php echo esc_attr($title); ?>" loading="lazy" />
            <?php if ($travel['is_featured']): ?>
                <span class="travelc-card__badge">Aanbevolen</span>
            <?php endif; ?>
        </div>
        <?php endif; ?>

        <div class="travelc-card__content">
            <h3 class="travelc-card__title"><?php echo esc_html($title); ?></h3>

            <div class="travelc-card__meta">
                <?php if ($nights > 0): ?>
                    <span class="travelc-card__meta-item">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                        <?php echo esc_html($nights); ?> nachten
                    </span>
                <?php endif; ?>
                <?php if ($dest_count > 0): ?>
                    <span class="travelc-card__meta-item">
                        <?php echo esc_html($dest_count); ?> bestemmingen
                    </span>
                <?php endif; ?>
            </div>

            <?php if (!empty($countries)): ?>
                <div class="travelc-card__countries">
                    <?php echo esc_html(implode(' · ', array_slice($countries, 0, 3))); ?>
                </div>
            <?php endif; ?>

            <?php if (!empty($travel['intro_text'])): ?>
                <p class="travelc-card__excerpt"><?php echo esc_html(wp_trim_words(strip_tags($travel['intro_text']), 20)); ?></p>
            <?php endif; ?>

            <div class="travelc-card__footer">
                <?php if ($price > 0 && ($travel['show_prices'] ?? true)): ?>
                    <div class="travelc-card__price">
                        <span class="travelc-card__price-label">Vanaf</span>
                        <span class="travelc-card__price-amount">&euro; <?php echo number_format($price, 0, ',', '.'); ?></span>
                        <span class="travelc-card__price-pp">p.p.</span>
                    </div>
                <?php endif; ?>
                <span class="travelc-card__cta">Bekijk reis &rarr;</span>
            </div>
        </div>
    </a>
    <?php endforeach; ?>
</div>
