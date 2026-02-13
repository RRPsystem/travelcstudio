import { useState, useEffect } from 'react';
import { MapPin, ChevronDown, ArrowLeft, Phone, ExternalLink } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { OfferteDestination, OfferteItem } from '../../types/offerte';
import { RouteMap } from '../shared/RouteMap';
import { DayByDaySection } from '../TravelDocs/DayByDaySection';
import { ChatEmbed } from '../TravelBro/ChatEmbed';

function isYouTubeUrl(url: string): boolean {
  return /youtube\.com|youtu\.be/i.test(url);
}

function getYouTubeEmbedUrl(url: string): string | null {
  const match = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  return match ? `https://www.youtube.com/embed/${match[1]}?autoplay=1&mute=1&loop=1&playlist=${match[1]}&controls=0&showinfo=0` : null;
}

interface RoadbookPreviewProps {
  roadbookId: string;
}

export function RoadbookPreview({ roadbookId }: RoadbookPreviewProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<any>(null);
  const [brand, setBrand] = useState<any>(null);
  const [mapOpen, setMapOpen] = useState(false);
  const [heroSlideIndex, setHeroSlideIndex] = useState(0);
  const [lightboxImages, setLightboxImages] = useState<string[]>([]);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  useEffect(() => {
    loadRoadbook();
  }, [roadbookId]);

  const loadRoadbook = async () => {
    if (!supabase) { setError('Configuratiefout'); setLoading(false); return; }
    try {
      const { data: rb, error: rbErr } = await supabase
        .from('travel_roadbooks')
        .select('*')
        .eq('id', roadbookId)
        .single();
      if (rbErr) throw rbErr;
      if (!rb) throw new Error('Roadbook niet gevonden');
      setData(rb);

      if (rb.brand_id) {
        const [brandResult, waResult] = await Promise.all([
          supabase.from('brands').select('name, logo_url, primary_color').eq('id', rb.brand_id).maybeSingle(),
          supabase.from('api_settings').select('twilio_whatsapp_number')
            .or(`brand_id.eq.${rb.brand_id},provider.eq.system`)
            .order('brand_id', { ascending: false }).limit(1).maybeSingle(),
        ]);
        setBrand({
          ...brandResult.data,
          whatsapp_number: waResult.data?.twilio_whatsapp_number,
        });
      }
    } catch (err: any) {
      console.error('Error loading roadbook:', err);
      setError(err.message || 'Laden mislukt');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Roadbook niet gevonden</h1>
          <p className="text-gray-500">{error}</p>
        </div>
      </div>
    );
  }

  const heroImages: string[] = data.hero_images?.length ? data.hero_images : data.hero_image_url ? [data.hero_image_url] : [];
  const heroVideo: string = data.hero_video_url || '';
  const destinations: OfferteDestination[] = data.destinations || [];
  const items: OfferteItem[] = data.items || [];
  const brandColor = brand?.primary_color || '#2e7d32';
  const title = data.title || '';
  const subtitle = data.subtitle || '';
  const introText = data.intro_text || '';
  const departureDate = data.departure_date || '';
  const travelbroShareToken = data.travelbro_share_token || '';
  const whatsappNumber = brand?.whatsapp_number || null;
  const heroImageUrl = heroImages[heroSlideIndex] || heroImages[0] || '';

  return (
    <div className="min-h-screen bg-gray-50">
      {/* HERO SECTION */}
      <div className="relative w-full" style={{ minHeight: '70vh' }}>
        {heroVideo && isYouTubeUrl(heroVideo) ? (
          <iframe
            src={getYouTubeEmbedUrl(heroVideo) || heroVideo}
            className="absolute inset-0 w-full h-full"
            style={{ border: 'none', pointerEvents: 'none', transform: 'scale(1.2)' }}
            allow="autoplay; encrypted-media"
            allowFullScreen
          />
        ) : heroVideo ? (
          <video src={heroVideo} autoPlay muted loop playsInline className="absolute inset-0 w-full h-full object-cover" />
        ) : heroImageUrl ? (
          <>
            {heroImages.map((img, i) => (
              <img key={img} src={img} alt="" className="absolute inset-0 w-full h-full object-cover transition-opacity duration-700" style={{ opacity: i === heroSlideIndex ? 1 : 0 }} />
            ))}
            {heroImages.length > 1 && (
              <>
                <button onClick={() => setHeroSlideIndex((heroSlideIndex - 1 + heroImages.length) % heroImages.length)} className="absolute left-4 top-1/2 -translate-y-1/2 z-20 w-10 h-10 bg-black/30 hover:bg-black/50 backdrop-blur-sm text-white rounded-full flex items-center justify-center transition-colors">
                  <ArrowLeft size={18} />
                </button>
                <button onClick={() => setHeroSlideIndex((heroSlideIndex + 1) % heroImages.length)} className="absolute right-4 top-1/2 -translate-y-1/2 z-20 w-10 h-10 bg-black/30 hover:bg-black/50 backdrop-blur-sm text-white rounded-full flex items-center justify-center transition-colors">
                  <ArrowLeft size={18} className="rotate-180" />
                </button>
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5">
                  {heroImages.map((_, i) => (
                    <button key={i} onClick={() => setHeroSlideIndex(i)} className={`w-2 h-2 rounded-full transition-all ${i === heroSlideIndex ? 'bg-white w-4' : 'bg-white/40 hover:bg-white/60'}`} />
                  ))}
                </div>
              </>
            )}
          </>
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-slate-800 via-slate-700 to-slate-900" />
        )}

        <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/50 to-transparent" />

        <div className="relative z-10 flex h-full" style={{ minHeight: '70vh' }}>
          <div className="w-2/3 p-8 md:p-12 flex flex-col justify-end">
            {subtitle && (
              <p className="text-sm font-medium text-orange-400 mb-3 tracking-wider uppercase">{subtitle}</p>
            )}
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-4 leading-tight">{title}</h1>
            {introText && (
              <p className="text-base text-white/80 leading-relaxed max-w-2xl">{introText}</p>
            )}
          </div>

          {/* Countdown */}
          {departureDate && (
            <div className="w-1/3 p-8 flex items-end justify-end">
              <CountdownCard targetDate={departureDate} />
            </div>
          )}
        </div>
      </div>

      {/* ROUTE MAP */}
      {destinations.length > 0 && (
        <div className="relative">
          <button
            onClick={() => setMapOpen(!mapOpen)}
            className="w-full flex items-center justify-center gap-2 py-3 bg-gray-900/80 backdrop-blur-sm text-white hover:bg-gray-900/90 transition-all text-sm font-medium"
          >
            <MapPin size={16} />
            Open de routekaart
            <ChevronDown size={16} className={`transition-transform duration-300 ${mapOpen ? 'rotate-180' : ''}`} />
          </button>
          <div className="overflow-hidden transition-all duration-500 ease-in-out" style={{ maxHeight: mapOpen ? '500px' : '0px' }}>
            {mapOpen && (
              <RouteMap
                destinations={destinations.map(d => ({ name: d.name, country: d.country, lat: d.lat, lng: d.lng, image: d.images?.[0], description: d.description }))}
                height="400px"
                borderRadius="0"
                showStats={false}
              />
            )}
          </div>
        </div>
      )}

      {/* DAY BY DAY SECTION */}
      {destinations.length > 0 && destinations.some(d => d.description || (d.images && d.images.length > 0)) && (
        <DayByDaySection
          destinations={destinations}
          items={items}
          brandColor={brandColor}
          carImageUrl="/auto.png"
        />
      )}

      {/* TRAVELBRO SECTION */}
      {travelbroShareToken && (
        <div className="max-w-5xl mx-auto px-6 py-10">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Jouw Persoonlijke Reisassistent</h2>
            <p className="text-sm text-gray-500">Stel vragen, krijg tips en plan je reis met TravelBro AI</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {/* WhatsApp Card */}
            {whatsappNumber && (
              <div className="bg-white rounded-2xl shadow-xl p-8 text-center border border-gray-100">
                <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-5">
                  <Phone size={32} className="text-white" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Chat via WhatsApp</h3>
                <p className="text-sm text-gray-600 mb-5">Scan de QR code of klik op de knop om TravelBro te openen in WhatsApp</p>
                {(() => {
                  const waLink = `https://wa.me/${whatsappNumber.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(`Hoi! Ik heb een vraag over mijn reis: ${title || 'mijn reis'}`)}`;
                  return (
                    <>
                      <div className="bg-gray-50 rounded-xl p-4 mb-5 inline-block">
                        <img src={`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(waLink)}`} alt="WhatsApp QR" className="w-48 h-48 mx-auto" />
                      </div>
                      <a href={waLink} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center space-x-2 w-full bg-green-500 hover:bg-green-600 text-white font-semibold py-4 px-6 rounded-xl transition-colors mb-3">
                        <Phone size={20} />
                        <span>Open in WhatsApp</span>
                        <ExternalLink size={16} />
                      </a>
                      <p className="text-sm text-gray-500">WhatsApp nummer: {whatsappNumber}</p>
                    </>
                  );
                })()}
              </div>
            )}

            {/* Chat Embed */}
            <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden" style={{ height: whatsappNumber ? 'auto' : '500px', minHeight: '400px' }}>
              <ChatEmbed shareToken={travelbroShareToken} />
            </div>
          </div>
        </div>
      )}

      {/* BRAND FOOTER BAR */}
      <div className="w-full py-10" style={{ backgroundColor: brandColor }}>
        <div className="flex items-center justify-center">
          {brand?.logo_url ? (
            <img src={brand.logo_url} alt="Brand logo" className="h-12 max-w-[200px] object-contain brightness-0 invert" />
          ) : (
            <div className="text-white/80 text-sm font-medium tracking-wide">
              {brand?.name || 'Powered by your travel agent'}
            </div>
          )}
        </div>
      </div>

      {/* Lightbox */}
      {lightboxImages.length > 0 && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center" onClick={() => setLightboxImages([])}>
          <img src={lightboxImages[lightboxIndex]} alt="" className="max-w-[90vw] max-h-[90vh] object-contain rounded-lg" onClick={(e) => e.stopPropagation()} />
        </div>
      )}
    </div>
  );
}

function CountdownCard({ targetDate }: { targetDate: string }) {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    const calc = () => {
      const diff = new Date(targetDate).getTime() - Date.now();
      if (diff <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0 };
      return {
        days: Math.floor(diff / 86400000),
        hours: Math.floor((diff % 86400000) / 3600000),
        minutes: Math.floor((diff % 3600000) / 60000),
        seconds: Math.floor((diff % 60000) / 1000),
      };
    };
    setTimeLeft(calc());
    const timer = setInterval(() => setTimeLeft(calc()), 1000);
    return () => clearInterval(timer);
  }, [targetDate]);

  return (
    <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/10 text-center">
      <p className="text-white/60 text-sm mb-3">Vertrek over</p>
      <div className="flex gap-3">
        {[
          { val: timeLeft.days, label: 'dagen' },
          { val: timeLeft.hours, label: 'uur' },
          { val: timeLeft.minutes, label: 'min' },
          { val: timeLeft.seconds, label: 'sec' },
        ].map((item) => (
          <div key={item.label} className="bg-white/10 rounded-xl px-3 py-2 min-w-[50px]">
            <div className="text-2xl font-bold text-white">{item.val}</div>
            <div className="text-[10px] text-white/50">{item.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
