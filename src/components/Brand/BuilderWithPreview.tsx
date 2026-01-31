import React, { useState, useEffect, useRef } from 'react';
import { X, RefreshCw, ExternalLink, Monitor, Smartphone } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface BuilderWithPreviewProps {
  builderUrl: string;
  brandId: string;
  onClose: () => void;
}

export function BuilderWithPreview({ builderUrl, brandId, onClose }: BuilderWithPreviewProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewMode, setPreviewMode] = useState<'desktop' | 'mobile'>('desktop');
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const previewRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const channel = supabase
      .channel('builder-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'pages',
          filter: `brand_id=eq.${brandId}`,
        },
        (payload) => {
          console.log('Page updated:', payload);

          if (payload.new && typeof payload.new === 'object' && 'id' in payload.new) {
            const pageId = payload.new.id;
            const newPreviewUrl = `${window.location.origin}/preview/${pageId}?t=${Date.now()}`;
            setPreviewUrl(newPreviewUrl);
            setLastUpdate(new Date());
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'trips',
          filter: `brand_id=eq.${brandId}`,
        },
        (payload) => {
          console.log('Trip updated:', payload);

          if (payload.new && typeof payload.new === 'object' && 'id' in payload.new) {
            const tripId = payload.new.id;
            const newPreviewUrl = `${window.location.origin}/trip/${tripId}?t=${Date.now()}`;
            setPreviewUrl(newPreviewUrl);
            setLastUpdate(new Date());
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [brandId]);

  const refreshPreview = () => {
    setIsRefreshing(true);
    if (previewUrl) {
      setPreviewUrl(`${previewUrl.split('?')[0]}?t=${Date.now()}`);
    }
    setTimeout(() => setIsRefreshing(false), 500);
  };

  const openInNewTab = () => {
    if (previewUrl) {
      window.open(previewUrl, '_blank');
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-900 z-50 flex flex-col">
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-semibold text-gray-900">Website Builder</h2>
          <div className="text-sm text-gray-500">
            {lastUpdate && `Laatste update: ${lastUpdate.toLocaleTimeString()}`}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setPreviewMode('desktop')}
              className={`px-3 py-1.5 rounded transition-colors ${
                previewMode === 'desktop'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Monitor className="w-4 h-4" />
            </button>
            <button
              onClick={() => setPreviewMode('mobile')}
              className={`px-3 py-1.5 rounded transition-colors ${
                previewMode === 'mobile'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Smartphone className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={refreshPreview}
            disabled={isRefreshing || !previewUrl}
            className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
            title="Preview verversen"
          >
            <RefreshCw className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={openInNewTab}
            disabled={!previewUrl}
            className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
            title="Openen in nieuw tabblad"
          >
            <ExternalLink className="w-5 h-5" />
          </button>

          <button
            onClick={onClose}
            className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            title="Sluiten"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 bg-gray-50 border-r border-gray-200">
          <iframe
            src={builderUrl}
            className="w-full h-full border-0"
            title="Website Builder"
            allow="clipboard-write"
          />
        </div>

        <div className="flex-1 bg-gray-100 flex items-center justify-center p-4">
          {previewUrl ? (
            <div
              className={`bg-white shadow-2xl transition-all duration-300 ${
                previewMode === 'mobile'
                  ? 'w-[375px] h-[812px] rounded-[3rem] border-[14px] border-gray-800'
                  : 'w-full h-full'
              }`}
            >
              <iframe
                ref={previewRef}
                src={previewUrl}
                className={`w-full h-full border-0 ${
                  previewMode === 'mobile' ? 'rounded-[2.5rem]' : ''
                }`}
                title="Live Preview"
              />
            </div>
          ) : (
            <div className="text-center">
              <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
                <Monitor className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Wachten op preview...
              </h3>
              <p className="text-sm text-gray-600">
                De preview verschijnt automatisch zodra je iets opslaat in de builder
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
