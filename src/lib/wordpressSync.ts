// WordPress Sync Utility
// Triggers automatic sync on WordPress sites when content is accepted/published

import { supabase } from './supabase';

interface SyncResult {
  success: boolean;
  synced?: string[];
  error?: string;
}

/**
 * Trigger WordPress sync for a specific brand
 * @param brandId - The brand ID to sync
 * @param type - Type of content to sync: 'destination', 'news', or 'all'
 */
export async function triggerWordPressSync(
  brandId: string,
  type: 'destination' | 'news' | 'all' = 'all'
): Promise<SyncResult> {
  try {
    // Get brand's WordPress URL
    const { data: brand, error: brandError } = await supabase
      .from('brands')
      .select('wordpress_url, website_url, name')
      .eq('id', brandId)
      .single();

    if (brandError || !brand) {
      console.log('[WP Sync] Brand not found:', brandId);
      return { success: false, error: 'Brand not found' };
    }

    const wpUrl = brand.wordpress_url || brand.website_url;
    if (!wpUrl) {
      console.log('[WP Sync] No WordPress URL configured for brand:', brand.name);
      return { success: false, error: 'No WordPress URL configured' };
    }

    // Build webhook URL
    const baseUrl = wpUrl.replace(/\/$/, '');
    const webhookUrl = `${baseUrl}/wp-json/travelc/v1/sync`;

    console.log(`[WP Sync] Triggering sync for ${brand.name}: ${type}`);
    console.log(`[WP Sync] Webhook URL: ${webhookUrl}`);

    // Call the webhook
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type,
        brand_id: brandId,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[WP Sync] Webhook failed:', response.status, errorText);
      return { success: false, error: `Webhook failed: ${response.status}` };
    }

    const result = await response.json();
    console.log('[WP Sync] Sync successful:', result);

    return {
      success: true,
      synced: result.synced || [type],
    };
  } catch (error) {
    console.error('[WP Sync] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Trigger WordPress sync for all brands that have a specific destination/news item
 * This is useful when admin content is updated
 */
export async function triggerSyncForAllBrandsWithContent(
  contentType: 'destination' | 'news',
  contentId: string
): Promise<void> {
  try {
    let brandIds: string[] = [];

    if (contentType === 'destination') {
      // Get all brands that have accepted this destination
      const { data: assignments } = await supabase
        .from('destination_brand_assignments')
        .select('brand_id')
        .eq('destination_id', contentId)
        .in('status', ['accepted', 'mandatory']);

      brandIds = (assignments || []).map(a => a.brand_id);
    } else if (contentType === 'news') {
      // Get all brands that have this news item activated
      const { data: activations } = await supabase
        .from('news_brand_activations')
        .select('brand_id')
        .eq('news_id', contentId)
        .eq('is_active', true);

      brandIds = (activations || []).map(a => a.brand_id);
    }

    // Trigger sync for each brand (in parallel, but with a small delay to avoid overwhelming)
    console.log(`[WP Sync] Triggering sync for ${brandIds.length} brands`);
    
    for (const brandId of brandIds) {
      // Don't await - fire and forget to avoid blocking the UI
      triggerWordPressSync(brandId, contentType).catch(err => {
        console.error(`[WP Sync] Failed for brand ${brandId}:`, err);
      });
    }
  } catch (error) {
    console.error('[WP Sync] Error triggering multi-brand sync:', error);
  }
}
