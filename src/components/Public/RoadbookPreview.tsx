import { useState, useEffect, useRef } from 'react';
import { MapPin, ChevronDown, ArrowLeft, Phone, ExternalLink, Plane, Car, Building2, Compass, CarFront, Ship, Train, Shield, StickyNote, Star, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { OfferteDestination, OfferteItem, OfferteItemType, OFFERTE_ITEM_TYPES } from '../../types/offerte';
import React from 'react';
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

const iconMap: Record<string, React.ComponentType<any>> = {
  Plane, Car, Building2, Compass, CarFront, Ship, Train, Shield, StickyNote,
};

const getItemConfig = (type: OfferteItemType) => {
  return OFFERTE_ITEM_TYPES.find(t => t.type === type)!;
};

const getItemIcon = (type: OfferteItemType) => {
  const config = OFFERTE_ITEM_TYPES.find(t => t.type === type);
  if (!config) return null;
  const Icon = iconMap[config.icon];
  return Icon ? <Icon size={18} style={{ color: config.color }} /> : null;
};

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
  const [cardPhotoIdx, setCardPhotoIdx] = useState<Record<string, number>>({});
  const [detailItem, setDetailItem] = useState<OfferteItem | null>(null);
  const carouselRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    window.scrollTo(0, 0);
    loadRoadbook();
  }, [roadbookId]);

  const loadRoadbook = async () => {
    console.log('[RoadbookPreview] Loading roadbook:', roadbookId);
    if (!supabase) { setError('Configuratiefout'); setLoading(false); return; }
    try {
      const { data: rb, error: rbErr } = await supabase
        .from('travel_roadbooks')
        .select('*')
        .eq('id', roadbookId)
        .maybeSingle();
      console.log('[RoadbookPreview] Query result:', { rb: !!rb, rbErr });
      if (rbErr) throw rbErr;
      if (!rb) throw new Error('Roadbook niet gevonden');
      setData(rb);

      if (rb.brand_id) {
        try {
          const [brandResult, waResult] = await Promise.all([
            supabase.from('brands').select('name, logo_url, primary_color').eq('id', rb.brand_id).maybeSingle(),
            supabase.from('api_settings').select('twilio_whatsapp_number')
              .or(`brand_id.eq.${rb.brand_id},provider.eq.system`)
              .order('brand_id', { ascending: false }).limit(1).maybeSingle(),
          ]);
          setBrand({
            name: brandResult.data?.name || '',
            logo_url: brandResult.data?.logo_url || '',
            primary_color: brandResult.data?.primary_color || '#2e7d32',
            whatsapp_number: waResult.data?.twilio_whatsapp_number || null,
          });
        } catch (brandErr) {
          console.warn('[RoadbookPreview] Brand load failed:', brandErr);
        }
      }
    } catch (err: any) {
      console.error('[RoadbookPreview] Error:', err);
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
    <div className="min-h-screen bg-gray-50" style={{ overflowY: 'auto', height: '100vh' }}>
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

        <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/50 to-transparent pointer-events-none" />

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

      {/* REIS TIMELINE CAROUSEL */}
      {items.length > 0 && (
        <div className="bg-gray-50 py-8">
          <div className="max-w-7xl mx-auto px-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Jouw Reis Timeline</h2>
            <div className="relative">
              <div ref={carouselRef} className="flex gap-5 overflow-x-auto pb-4 mb-2 scroll-smooth snap-x snap-mandatory scrollbar-hide">
                {[...items].sort((a, b) => (a.sort_order ?? 999) - (b.sort_order ?? 999)).map((item) => {
                  const config = getItemConfig(item.type);
                  const isFlight = item.type === 'flight';
                  const isHotel = item.type === 'hotel';
                  const isCruise = item.type === 'cruise';
                  const isTransfer = item.type === 'transfer';
                  const isCarRental = item.type === 'car_rental';

                  return (
                    <div key={item.id} className="w-72 flex-shrink-0 snap-start">
                      <div className="bg-white rounded-xl border border-gray-200 shadow-md hover:shadow-xl transition-all overflow-hidden flex flex-col h-full">

                        {/* HEADER */}
                        {isFlight ? (
                          <div className="p-3">
                            <div className="flex items-center gap-1.5 mb-1.5">
                              <div className="w-6 h-6 bg-green-500 rounded-md flex items-center justify-center flex-shrink-0">
                                <Plane size={12} className="text-white" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="text-[11px] font-medium text-blue-600 truncate">
                                  {item.airline || 'Airline'} {item.flight_number || ''}
                                </div>
                                <div className="text-[10px] text-gray-400">{item.date_start ? new Date(item.date_start).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short', year: 'numeric' }) : ''}</div>
                              </div>
                            </div>
                            <div className="bg-gray-50 rounded-lg p-2">
                              <div className="flex items-center justify-between">
                                <div className="text-center">
                                  <div className="text-[10px] text-gray-500">{item.departure_airport || 'DEP'}</div>
                                  <div className="text-sm font-bold text-gray-900">{item.departure_time ? item.departure_time.substring(0, 5) : '--:--'}</div>
                                </div>
                                <div className="flex-1 flex items-center justify-center px-1">
                                  <div className="h-px bg-gray-300 flex-1"></div>
                                  <Plane size={10} className="mx-0.5 text-green-500" />
                                  <div className="h-px bg-gray-300 flex-1"></div>
                                </div>
                                <div className="text-center">
                                  <div className="text-[10px] text-gray-500">{item.arrival_airport || 'ARR'}</div>
                                  <div className="text-sm font-bold text-gray-900">{item.arrival_time ? item.arrival_time.substring(0, 5) : '--:--'}</div>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center justify-center gap-3 mt-1.5 text-[10px] text-gray-500">
                              {item.details?.duration && <span>⏱ {item.details.duration}</span>}
                              {item.details?.baggage && <span>🧳 {item.details.baggage}</span>}
                              <span>{item.details?.isDirect !== false ? '→ Rechtstreeks' : `↔ ${item.details?.stops || 1} overstap`}</span>
                            </div>
                          </div>
                        ) : (isTransfer && !item.image_url) ? (
                          <div className="p-4">
                            <div className="flex items-center gap-2 mb-2">
                              <div className="w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0" style={{ backgroundColor: config.color }}>
                                {(() => { const I = iconMap[config.icon]; return I ? <I size={14} className="text-white" /> : null; })()}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="text-xs font-medium" style={{ color: config.color }}>{item.transfer_type || 'Transfer'}</div>
                                <div className="text-[10px] text-gray-400">{item.date_start ? new Date(item.date_start).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short', year: 'numeric' }) : ''}</div>
                              </div>
                            </div>
                            {(item.pickup_location || item.dropoff_location) && (
                              <div className="bg-gray-50 rounded-lg p-3">
                                <div className="flex items-center justify-between">
                                  <div className="text-center flex-1">
                                    <div className="text-[10px] text-gray-500">Van</div>
                                    <div className="text-xs font-bold text-gray-900 truncate">{item.pickup_location || '—'}</div>
                                  </div>
                                  <div className="flex items-center justify-center px-2">
                                    <div className="h-px bg-gray-300 w-4"></div>
                                    <ArrowLeft size={10} className="mx-0.5 text-gray-400 rotate-180" />
                                    <div className="h-px bg-gray-300 w-4"></div>
                                  </div>
                                  <div className="text-center flex-1">
                                    <div className="text-[10px] text-gray-500">Naar</div>
                                    <div className="text-xs font-bold text-gray-900 truncate">{item.dropoff_location || '—'}</div>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        ) : item.image_url ? (
                          <div className="relative h-48 bg-gray-100 group">
                            <img
                              src={(item.images && item.images.length > 0) ? (item.images[cardPhotoIdx[item.id] || 0] || item.image_url) : item.image_url}
                              alt={item.title}
                              className="w-full h-full object-cover"
                            />
                            <div className="absolute top-3 left-3 px-3 py-1.5 rounded-full text-xs font-semibold text-white" style={{ backgroundColor: config.color }}>
                              {config.label}
                            </div>
                            {item.images && item.images.length > 1 && (
                              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-2">
                                <button
                                  onClick={(e) => { e.stopPropagation(); setCardPhotoIdx(prev => ({ ...prev, [item.id]: ((prev[item.id] || 0) > 0 ? (prev[item.id] || 0) - 1 : item.images!.length - 1) })); }}
                                  className="w-8 h-8 rounded-full bg-white/90 shadow flex items-center justify-center hover:bg-white"
                                >
                                  <ArrowLeft size={14} className="text-gray-700" />
                                </button>
                                <button
                                  onClick={(e) => { e.stopPropagation(); setCardPhotoIdx(prev => ({ ...prev, [item.id]: ((prev[item.id] || 0) < item.images!.length - 1 ? (prev[item.id] || 0) + 1 : 0) })); }}
                                  className="w-8 h-8 rounded-full bg-white/90 shadow flex items-center justify-center hover:bg-white"
                                >
                                  <ArrowLeft size={14} className="text-gray-700 rotate-180" />
                                </button>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="h-12 flex items-center justify-center gap-2 px-4" style={{ backgroundColor: config.bgColor || '#f3f4f6' }}>
                            <div className="w-7 h-7 rounded-full bg-white/80 flex items-center justify-center shadow-sm">
                              {getItemIcon(item.type)}
                            </div>
                            <span className="text-xs font-semibold" style={{ color: config.color }}>{config.label}</span>
                          </div>
                        )}

                        {/* CONTENT */}
                        {isFlight ? (
                          <div className="px-3 pb-2 pt-0.5">
                            <h4 className="font-semibold text-gray-900 text-xs">{String(item.title || '')}</h4>
                          </div>
                        ) : isTransfer && !item.image_url ? (
                          <div className="px-4 pb-3 pt-1">
                            <h4 className="font-semibold text-gray-900 text-sm">{String(item.title || '')}</h4>
                            {item.subtitle && item.subtitle !== item.transfer_type && (
                              <p className="text-[11px] text-gray-400">{item.subtitle}</p>
                            )}
                          </div>
                        ) : (
                          <div className="p-4 flex flex-col flex-1">
                            <h4 className="font-bold text-gray-900 text-base mb-0.5">{String(item.title || '')}</h4>
                            {isHotel && item.location && (
                              <p className="text-sm text-gray-500 mb-2">📍 {typeof item.location === 'object' ? (item.location as any).name || JSON.stringify(item.location) : item.location}</p>
                            )}
                            {isCarRental && (item.pickup_location || item.dropoff_location) && (
                              <p className="text-sm text-gray-500 mb-2">{[item.pickup_location, item.dropoff_location].filter(Boolean).map(v => typeof v === 'object' ? (v as any).name || '' : v).join(' → ')}</p>
                            )}
                            <div className="space-y-1.5 text-xs text-gray-600 mb-3">
                              {!isFlight && !isTransfer && item.date_start && (
                                <div className="flex items-center gap-2">
                                  <span>📅</span>
                                  <span>{new Date(item.date_start).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short', year: 'numeric' })}{item.date_end ? ` - ${new Date(item.date_end).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' })}` : ''}</span>
                                </div>
                              )}
                              {item.nights ? (
                                <div className="flex items-center gap-2"><span>🌙</span><span>{item.nights} nachten</span></div>
                              ) : null}
                              {item.room_type && (
                                <div className="flex items-center gap-2"><span>🛏️</span><span>{typeof item.room_type === 'object' ? (item.room_type as any).name || '' : item.room_type}</span></div>
                              )}
                              {item.board_type && (
                                <div className="flex items-center gap-2"><span>🍽️</span><span>{typeof item.board_type === 'object' ? (item.board_type as any).name || '' : item.board_type}</span></div>
                              )}
                              {isCarRental && item.date_start && item.date_end && (
                                <div className="flex items-center gap-2">
                                  <span>📅</span>
                                  <span>{new Date(item.date_start).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' })} - {new Date(item.date_end).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' })}</span>
                                </div>
                              )}
                            </div>
                            {(isHotel || isCruise) && (item.description || (item.images && item.images.length > 1)) && (
                              <div className="mt-auto">
                                <button
                                  onClick={() => setDetailItem(item)}
                                  className="w-full text-white text-sm font-medium py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2 hover:opacity-90"
                                  style={{ backgroundColor: brandColor }}
                                >
                                  <Star size={14} />
                                  Meer informatie
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Carousel navigation */}
              <div className="flex items-center justify-center gap-4 mt-2">
                <button
                  onClick={() => { if (carouselRef.current) carouselRef.current.scrollBy({ left: -320, behavior: 'smooth' }); }}
                  className="w-10 h-10 rounded-full bg-white border border-gray-300 shadow-sm flex items-center justify-center hover:bg-gray-50 transition-colors"
                >
                  <ArrowLeft size={18} className="text-gray-600" />
                </button>
                <span className="text-sm text-gray-400">{items.length} items</span>
                <button
                  onClick={() => { if (carouselRef.current) carouselRef.current.scrollBy({ left: 320, behavior: 'smooth' }); }}
                  className="w-10 h-10 rounded-full bg-white border border-gray-300 shadow-sm flex items-center justify-center hover:bg-gray-50 transition-colors"
                >
                  <ArrowLeft size={18} className="text-gray-600 rotate-180" />
                </button>
              </div>
            </div>
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

      {/* DETAIL MODAL */}
      {detailItem && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setDetailItem(null)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: getItemConfig(detailItem.type).bgColor }}>
                  {getItemIcon(detailItem.type)}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">{detailItem.title}</h3>
                  <p className="text-sm text-gray-500">{getItemConfig(detailItem.type).label}</p>
                </div>
              </div>
              <button onClick={() => setDetailItem(null)} className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center">
                <X size={16} />
              </button>
            </div>
            <div className="p-6">
              {detailItem.images && detailItem.images.length > 0 && (
                <div className="grid grid-cols-2 gap-2 mb-6">
                  {detailItem.images.map((img, i) => (
                    <img key={i} src={img} alt="" className="w-full h-40 object-cover rounded-lg cursor-pointer hover:brightness-90 transition-all" onClick={() => { setLightboxImages(detailItem.images!); setLightboxIndex(i); }} />
                  ))}
                </div>
              )}
              {detailItem.description && (
                <div className="prose prose-sm max-w-none text-gray-700 mb-4">
                  <p>{detailItem.description}</p>
                </div>
              )}
              {detailItem.facilities && (
                <div className="mt-4">
                  <h4 className="text-sm font-semibold text-gray-900 mb-2">Faciliteiten</h4>
                  <div className="flex flex-wrap gap-1.5">
                    {(Array.isArray(detailItem.facilities) ? detailItem.facilities : []).map((f: string, i: number) => (
                      <span key={i} className="px-2 py-1 bg-gray-100 rounded-full text-xs text-gray-600">{f}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

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
