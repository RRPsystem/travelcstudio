/**
 * External Builder - Video Storage Billing Endpoint Template
 *
 * Dit bestand laat zien hoe je het BOLT credit systeem integreert
 * voor video storage billing in je externe builder.
 *
 * Plaats dit bestand in: api/register-video-storage.js
 *
 * Environment variables nodig:
 * - SUPABASE_URL (je krijgt deze van BOLT team)
 */

export default async function handler(req, res) {
  // Only accept POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({
      error: 'Method not allowed',
      allowedMethods: ['POST']
    });
  }

  // Parse request body
  const {
    brandId,
    brand_id,
    videoUrl,
    video_url,
    videoTitle,
    fileSizeBytes,
    durationSeconds
  } = req.body;

  // Normalize parameters (support both naming conventions)
  const finalBrandId = brandId || brand_id;
  const finalVideoUrl = videoUrl || video_url;

  // Validate required parameters
  if (!finalBrandId) {
    return res.status(400).json({
      error: 'Missing required parameter: brandId or brand_id',
      success: false
    });
  }

  if (!finalVideoUrl) {
    return res.status(400).json({
      error: 'Missing required parameter: videoUrl or video_url',
      success: false
    });
  }

  // Get authentication token from headers
  // Support both Authorization header and X-API-Key
  const authToken = req.headers.authorization?.replace('Bearer ', '') ||
                   req.headers['x-api-key'];

  if (!authToken) {
    return res.status(401).json({
      error: 'Authentication required. Include Authorization header or X-API-Key.',
      success: false
    });
  }

  // Prepare BOLT credit system endpoint
  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;

  if (!supabaseUrl) {
    console.error('SUPABASE_URL not configured in environment variables');
    return res.status(500).json({
      error: 'Server configuration error',
      success: false
    });
  }

  const creditEndpoint = `${supabaseUrl}/functions/v1/deduct-credits`;

  try {
    // Build description with available info
    let description = `Video opgeslagen: ${finalVideoUrl}`;
    if (videoTitle) {
      description = `Video "${videoTitle}" opgeslagen`;
    }

    // Build metadata object
    const metadata = {
      videoUrl: finalVideoUrl,
      timestamp: new Date().toISOString()
    };

    if (videoTitle) metadata.videoTitle = videoTitle;
    if (fileSizeBytes) metadata.fileSizeBytes = fileSizeBytes;
    if (durationSeconds) metadata.durationSeconds = durationSeconds;

    // Call BOLT credit system
    console.log(`[Billing] Deducting credits for brand ${finalBrandId}`);

    const response = await fetch(creditEndpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        actionType: 'video_storage',
        description: description,
        metadata: metadata
      })
    });

    // Handle error responses
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));

      // Special handling for insufficient credits (402)
      if (response.status === 402) {
        console.warn(`[Billing] Insufficient credits for brand ${finalBrandId}`);
        return res.status(402).json({
          success: false,
          error: 'Insufficient credits',
          required: errorData.required || 100,
          available: errorData.available || 0,
          message: 'Onvoldoende credits om deze actie uit te voeren'
        });
      }

      // Other errors
      console.error(`[Billing] Credit deduction failed:`, errorData);
      return res.status(response.status).json({
        success: false,
        error: errorData.error || 'Failed to deduct credits',
        details: errorData.details
      });
    }

    // Success - parse result
    const result = await response.json();

    console.log(`[Billing] Credits deducted successfully:`, {
      brandId: finalBrandId,
      credits: result.transaction.credits_deducted,
      remaining: result.transaction.credits_remaining
    });

    // Return success response
    return res.status(200).json({
      success: true,
      message: 'Video storage billed successfully',
      costCredits: result.transaction.credits_deducted,
      costEuro: (result.transaction.credits_deducted / 100).toFixed(2),
      creditsRemaining: result.transaction.credits_remaining,
      videoUrl: finalVideoUrl,
      transactionId: result.transaction.id,
      timestamp: result.transaction.created_at
    });

  } catch (error) {
    // Network errors, timeouts, etc.
    console.error('[Billing] Exception during credit deduction:', error);

    return res.status(500).json({
      success: false,
      error: 'Internal server error during billing',
      message: error.message,
      hint: 'Check server logs for details'
    });
  }
}

/**
 * USAGE EXAMPLE (Frontend):
 *
 * async function saveToMyVideos(video) {
 *   try {
 *     // 1. Upload video first (your existing logic)
 *     const uploadResult = await uploadVideo(video);
 *
 *     if (!uploadResult.success) {
 *       showError('Video upload failed');
 *       return;
 *     }
 *
 *     // 2. Register storage and deduct credits
 *     const billingResponse = await fetch('/api/register-video-storage', {
 *       method: 'POST',
 *       headers: {
 *         'Content-Type': 'application/json',
 *         'Authorization': `Bearer ${getAuthToken()}`
 *       },
 *       body: JSON.stringify({
 *         brandId: getCurrentBrandId(),
 *         videoUrl: uploadResult.video.videoUrl,
 *         videoTitle: video.title,
 *         fileSizeBytes: video.size,
 *         durationSeconds: video.duration
 *       })
 *     });
 *
 *     const billingData = await billingResponse.json();
 *
 *     // 3. Handle billing result
 *     if (!billingData.success) {
 *       if (billingResponse.status === 402) {
 *         // Insufficient credits
 *         showWarning(
 *           `Video is opgeslagen, maar je hebt onvoldoende credits. ` +
 *           `Benodigd: ${billingData.required}, Beschikbaar: ${billingData.available}. ` +
 *           `Upgrade je account om door te gaan.`
 *         );
 *       } else {
 *         // Other error
 *         showWarning(
 *           `Video is opgeslagen, maar billing mislukt: ${billingData.error}`
 *         );
 *       }
 *       return;
 *     }
 *
 *     // 4. Success!
 *     showSuccess(
 *       `Video "${video.title}" opgeslagen! ` +
 *       `€${billingData.costEuro} (${billingData.costCredits} credits) afgeschreven. ` +
 *       `Resterende credits: ${billingData.creditsRemaining}`
 *     );
 *
 *   } catch (error) {
 *     console.error('Error saving video:', error);
 *     showError('Er is een fout opgetreden bij het opslaan van de video');
 *   }
 * }
 */

/**
 * TESTING:
 *
 * curl -X POST http://localhost:3000/api/register-video-storage \
 *   -H "Authorization: Bearer YOUR_JWT_TOKEN" \
 *   -H "Content-Type: application/json" \
 *   -d '{
 *     "brandId": "your-brand-uuid",
 *     "videoUrl": "https://example.com/videos/test.mp4",
 *     "videoTitle": "Test Video",
 *     "fileSizeBytes": 15728640,
 *     "durationSeconds": 120
 *   }'
 *
 * Expected success response:
 * {
 *   "success": true,
 *   "message": "Video storage billed successfully",
 *   "costCredits": 100,
 *   "costEuro": "1.00",
 *   "creditsRemaining": 4900,
 *   "videoUrl": "https://example.com/videos/test.mp4",
 *   "transactionId": "uuid-here",
 *   "timestamp": "2024-12-16T10:30:00Z"
 * }
 */
