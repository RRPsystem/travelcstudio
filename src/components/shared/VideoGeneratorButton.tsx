import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import {
  generateVideoDeeplink,
  VIDEO_JWT_SCOPES,
  type VideoDeeplinkMode,
  type VideoDeeplinkOptions
} from '@/lib/videoDeeplinkHelper';
import { Clapperboard, Loader2 } from 'lucide-react';

interface VideoGeneratorButtonProps {
  brandId: string;
  mode?: VideoDeeplinkMode;
  options?: VideoDeeplinkOptions;
  userRole?: 'brand' | 'agent';
  className?: string;
  children?: React.ReactNode;
}

/**
 * Button component om video generator te openen
 *
 * @example
 * // Voor brand - nieuwe video
 * <VideoGeneratorButton brandId={brandId} mode="new" />
 *
 * @example
 * // Voor brand - bestaande video bewerken
 * <VideoGeneratorButton
 *   brandId={brandId}
 *   mode="edit"
 *   options={{ videoSlug: 'my-video' }}
 * />
 *
 * @example
 * // Voor agent - video voor trip
 * <VideoGeneratorButton
 *   brandId={brandId}
 *   mode="trip"
 *   userRole="agent"
 *   options={{ agentId, tripId }}
 * />
 */
export const VideoGeneratorButton = ({
  brandId,
  mode = 'new',
  options = {},
  userRole = 'brand',
  className = '',
  children
}: VideoGeneratorButtonProps) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const openVideoGenerator = async () => {
    setLoading(true);
    setError(null);

    try {
      // Get current session
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Niet ingelogd');
      }

      // Generate JWT token with appropriate scopes
      const scopes = VIDEO_JWT_SCOPES[userRole];
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-builder-jwt`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            brand_id: brandId,
            scopes
          })
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Kon token niet genereren');
      }

      const { token } = await response.json();

      // Generate deeplink
      const deeplink = generateVideoDeeplink(mode, brandId, token, options);

      // Open in new tab
      window.open(deeplink, '_blank');
    } catch (err) {
      console.error('Failed to open video generator:', err);
      setError(err instanceof Error ? err.message : 'Kon video generator niet openen');
    } finally {
      setLoading(false);
    }
  };

  const buttonText = mode === 'new'
    ? 'Nieuwe Video Maken'
    : mode === 'edit'
    ? 'Video Bewerken'
    : 'Video voor Trip Maken';

  return (
    <div>
      <button
        onClick={openVideoGenerator}
        disabled={loading}
        className={`inline-flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${className}`}
      >
        {loading ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : (
          <Clapperboard className="w-5 h-5" />
        )}
        {children || buttonText}
      </button>

      {error && (
        <p className="mt-2 text-sm text-red-600">{error}</p>
      )}
    </div>
  );
};
