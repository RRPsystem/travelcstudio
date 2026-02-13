import { useState, useEffect } from 'react';
import {
  MapPin, Plane, Car, Building2, Compass, CarFront, Ship, Train, Shield, StickyNote,
  ChevronDown, Star, Calendar, Clock, ArrowLeft, ArrowRight, X,
  CheckCircle, XCircle, MessageSquare, Phone, Mail, Globe, Send
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Offerte, OfferteItem, OfferteDestination, ExtraCost, OFFERTE_ITEM_TYPES } from '../../types/offerte';
import { RouteMap } from '../shared/RouteMap';
import { DayByDaySection } from '../TravelDocs/DayByDaySection';
import { ChatEmbed } from '../TravelBro/ChatEmbed';

function getYouTubeEmbedUrl(url: string): string | null {
  if (!url) return null;
  if (url.includes('youtube.com/embed/')) return url;
  const watchMatch = url.match(/(?:youtube\.com\/watch\?v=)([a-zA-Z0-9_-]+)/);
  if (watchMatch) return `https://www.youtube.com/embed/${watchMatch[1]}?autoplay=1&mute=1&loop=1&playlist=${watchMatch[1]}&controls=0&showinfo=0`;
  const shortMatch = url.match(/(?:youtu\.be\/)([a-zA-Z0-9_-]+)/);
  if (shortMatch) return `https://www.youtube.com/embed/${shortMatch[1]}?autoplay=1&mute=1&loop=1&playlist=${shortMatch[1]}&controls=0&showinfo=0`;
  return null;
}

function isYouTubeUrl(url: string): boolean {
  return !!url && (url.includes('youtube.com') || url.includes('youtu.be'));
}

const iconMap: Record<string, React.ComponentType<any>> = {
  Plane, Car, Building2, Compass, CarFront, Ship, Train, Shield, StickyNote,
};

function getItemConfig(type: string) {
  return OFFERTE_ITEM_TYPES.find(t => t.type === type) || OFFERTE_ITEM_TYPES[0];
}

function getItemIcon(type: string) {
  const config = getItemConfig(type);
  const Icon = iconMap[config.icon];
  return Icon ? <Icon size={16} style={{ color: config.color }} /> : null;
}

function formatItemSubtitle(item: OfferteItem): string {
  const parts: string[] = [];
  if (item.hotel_name && item.hotel_name !== item.title) parts.push(item.hotel_name);
  if (item.nights) parts.push(`${item.nights} nachten`);
  if (item.board_type) parts.push(item.board_type.toUpperCase());
  if (item.room_type) parts.push(item.room_type);
  if (item.departure_airport && item.arrival_airport) parts.push(`${item.departure_airport} → ${item.arrival_airport}`);
  if (item.airline) parts.push(item.airline);
  if (item.flight_number) parts.push(item.flight_number);
  if (item.pickup_location && item.dropoff_location) parts.push(`${item.pickup_location} → ${item.dropoff_location}`);
  if (item.supplier) parts.push(item.supplier);
  if (item.location) parts.push(item.location);
  return parts.join(' · ');
}

interface Props {
  offerteId: string;
}

export function OfferteViewer({ offerteId }: Props) {
  const [offerte, setOfferte] = useState<Offerte | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mapOpen, setMapOpen] = useState(false);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [lightboxImages, setLightboxImages] = useState<string[]>([]);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [brand, setBrand] = useState<any>(null);
  const [responseMode, setResponseMode] = useState<'none' | 'accept' | 'reject'>('none');
  const [responseNote, setResponseNote] = useState('');
  const [submittingResponse, setSubmittingResponse] = useState(false);
  const [responseSubmitted, setResponseSubmitted] = useState(false);

  // Enable scrolling for this public page
  useEffect(() => {
    const htmlEl = document.documentElement;
    const bodyEl = document.body;
    const rootEl = document.getElementById('root');
    
    // Store original styles
    const originalStyles = {
      html: htmlEl.style.overflow,
      body: bodyEl.style.overflow,
      root: rootEl?.style.overflow
    };
    
    // Enable scrolling
    htmlEl.style.overflow = 'auto';
    bodyEl.style.overflow = 'auto';
    if (rootEl) rootEl.style.overflow = 'auto';
    
    return () => {
      // Restore original styles
      htmlEl.style.overflow = originalStyles.html;
      bodyEl.style.overflow = originalStyles.body;
      if (rootEl) rootEl.style.overflow = originalStyles.root || '';
    };
  }, []);

  useEffect(() => {
    let mounted = true;
    
    async function loadOfferte() {
      if (!supabase) {
        if (mounted) {
          setError('Configuratiefout');
          setLoading(false);
        }
        return;
      }
      try {
        // Try travel_offertes first, then fallback to travel_roadbooks
        let data: any = null;
        const { data: offerteData, error: offerteErr } = await supabase
          .from('travel_offertes')
          .select('*')
          .eq('id', offerteId)
          .single();

        if (offerteData && !offerteErr) {
          data = offerteData;
        } else {
          // Fallback: try travel_roadbooks table
          const { data: roadbookData, error: roadbookErr } = await supabase
            .from('travel_roadbooks')
            .select('*')
            .eq('id', offerteId)
            .single();
          if (roadbookErr) throw roadbookErr;
          data = roadbookData;
        }

        if (!data) throw new Error('Offerte niet gevonden');

        if (!mounted) return;

        // Convert DB row to Offerte
        const o: Offerte = {
          id: data.id,
          brand_id: data.brand_id,
          agent_id: data.agent_id,
          travel_compositor_id: data.travel_compositor_id,
          client_name: data.client_name || '',
          client_email: data.client_email,
          client_phone: data.client_phone,
          title: data.title || '',
          subtitle: data.subtitle,
          intro_text: data.intro_text,
          hero_image_url: data.hero_image_url,
          hero_images: data.hero_images || [],
          hero_video_url: data.hero_video_url,
          destinations: data.destinations || [],
          items: data.items || [],
          extra_costs: data.extra_costs || [],
          total_price: parseFloat(data.total_price) || 0,
          price_per_person: parseFloat(data.price_per_person) || 0,
          number_of_travelers: data.number_of_travelers || 2,
          currency: data.currency || 'EUR',
          price_display: data.price_display || 'both',
          status: data.status || 'draft',
          sent_at: data.sent_at,
          viewed_at: data.viewed_at,
          accepted_at: data.accepted_at,
          rejected_at: data.rejected_at,
          valid_until: data.valid_until,
          client_response: data.client_response,
          client_response_note: data.client_response_note,
          internal_notes: data.internal_notes,
          terms_conditions: data.terms_conditions,
          template_type: data.template_type,
          departure_date: data.departure_date,
          travelbro_trip_id: data.travelbro_trip_id,
          travelbro_share_token: data.travelbro_share_token,
          created_at: data.created_at,
          updated_at: data.updated_at,
        };

        setOfferte(o);

        // Track if already responded
        if (data.client_response) {
          setResponseSubmitted(true);
        }

        // Load brand info
        if (data.brand_id) {
          const { data: brandData } = await supabase
            .from('brands')
            .select('name, logo_url, contact_email, contact_phone, website_url, street_address, city, postal_code, country, primary_color, secondary_color')
            .eq('id', data.brand_id)
            .single();
          if (mounted && brandData) setBrand(brandData);
        }

        // Track view - try both tables
        if (!data.viewed_at) {
          const viewUpdate = { viewed_at: new Date().toISOString(), status: 'viewed' };
          await supabase.from('travel_offertes').update(viewUpdate).eq('id', offerteId);
          await supabase.from('travel_roadbooks').update(viewUpdate).eq('id', offerteId);
        }
      } catch (err: any) {
        console.error('Error loading offerte:', err);
        if (mounted) setError(err.message || 'Kon offerte niet laden');
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadOfferte();
    
    return () => {
      mounted = false;
    };
  }, [offerteId]);

  const toggleExpand = (id: string) => {
    setExpandedItems(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const submitResponse = async (response: 'accepted' | 'rejected') => {
    if (!supabase || !offerte) return;
    setSubmittingResponse(true);
    try {
      const now = new Date().toISOString();
      const update: any = {
        client_response: response,
        client_response_note: responseNote || null,
        status: response === 'accepted' ? 'accepted' : 'rejected',
      };
      if (response === 'accepted') update.accepted_at = now;
      if (response === 'rejected') update.rejected_at = now;

      // Try both tables
      await supabase.from('travel_offertes').update(update).eq('id', offerte.id);
      await supabase.from('travel_roadbooks').update(update).eq('id', offerte.id);

      // Don't update offerte state to prevent re-renders - just update response flags
      setResponseSubmitted(true);
      setResponseMode('none');
    } catch (err) {
      console.error('Error submitting response:', err);
    } finally {
      setSubmittingResponse(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-500">Offerte laden...</p>
        </div>
      </div>
    );
  }

  if (error || !offerte) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <X size={32} className="text-red-500" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Offerte niet gevonden</h1>
          <p className="text-gray-500">{error || 'Deze offerte bestaat niet of is niet meer beschikbaar.'}</p>
        </div>
      </div>
    );
  }

  // Get hero images - just use first image to avoid infinite loop with slideshow
  const heroImageUrl = offerte.hero_images?.[0] || offerte.hero_image_url || null;

  const items = (offerte.items || []).sort((a, b) => a.sort_order - b.sort_order);
  const destinations: OfferteDestination[] = offerte.destinations || [];
  const extraCosts: ExtraCost[] = offerte.extra_costs || [];
  const priceDisplay = offerte.price_display || 'both';
  const numberOfTravelers = offerte.number_of_travelers || 2;
  const extraCostsTotal = extraCosts.reduce((sum, ec) => sum + (ec.per_person ? ec.amount * numberOfTravelers : ec.amount), 0);
  const totalPrice = offerte.total_price || (items.reduce((sum, item) => sum + (item.price || 0), 0) + extraCostsTotal);
  const pricePerPerson = offerte.price_per_person || (numberOfTravelers ? Math.round(totalPrice / numberOfTravelers) : totalPrice);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* HERO */}
      <div className="relative w-full" style={{ minHeight: '70vh' }}>
        {/* Background media with slideshow */}
        {offerte.hero_video_url && isYouTubeUrl(offerte.hero_video_url) ? (
          <iframe
            src={getYouTubeEmbedUrl(offerte.hero_video_url) || offerte.hero_video_url}
            className="absolute inset-0 w-full h-full"
            style={{ border: 'none', pointerEvents: 'none', transform: 'scale(1.2)' }}
            allow="autoplay; encrypted-media"
            allowFullScreen
          />
        ) : offerte.hero_video_url ? (
          <video src={offerte.hero_video_url} autoPlay muted loop playsInline className="absolute inset-0 w-full h-full object-cover" />
        ) : heroImageUrl ? (
          <img
            src={heroImageUrl}
            alt={offerte.title}
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-slate-800 via-slate-700 to-slate-900" />
        )}

        {/* Left-to-right overlay (matches editor) */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/50 to-transparent" />

        {/* Content: left text + right price card */}
        <div className="relative z-10 flex h-full" style={{ minHeight: '70vh' }}>
          {/* Left side - text content */}
          <div className="w-1/2 p-8 md:p-10 flex flex-col justify-center">
            {offerte.subtitle && (
              <p className="text-sm font-medium text-orange-400 mb-3 tracking-wider uppercase">{offerte.subtitle}</p>
            )}
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-4 leading-tight">{offerte.title}</h1>
            {offerte.intro_text && (
              <p className="text-base text-white/80 leading-relaxed mb-6 max-w-lg">{offerte.intro_text}</p>
            )}
            {destinations.length > 0 && (
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/10 inline-block">
                <div className="flex flex-wrap gap-2">
                  {destinations.map((dest, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-orange-500 text-white text-xs flex items-center justify-center font-bold">{i + 1}</span>
                      <span className="text-sm text-white/80">{dest.name}</span>
                      {i < destinations.length - 1 && <span className="text-white/30">→</span>}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right side - price card */}
          <div className="w-1/2 p-8 md:p-10 flex items-end justify-end">
            {priceDisplay !== 'hidden' && (
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/10 min-w-[240px] hidden md:block">
                {(priceDisplay === 'per_person' || priceDisplay === 'both') && (
                  <>
                    <div className="text-sm text-white/60 mb-1">Vanaf</div>
                    <div className="text-3xl font-bold text-white mb-1">
                      € {pricePerPerson.toLocaleString('nl-NL', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                    </div>
                    <div className="text-sm text-white/60 mb-4">per persoon</div>
                  </>
                )}
                {priceDisplay === 'total' && (
                  <>
                    <div className="text-sm text-white/60 mb-1">Totaalprijs</div>
                    <div className="text-3xl font-bold text-white mb-1">
                      € {totalPrice.toLocaleString('nl-NL', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                    </div>
                    <div className="text-sm text-white/60 mb-4">{numberOfTravelers} reizigers</div>
                  </>
                )}
                <div className="border-t border-white/10 pt-2 space-y-1">
                  {priceDisplay === 'both' && (
                    <div className="flex justify-between text-sm">
                      <span className="text-white/60">Totaal</span>
                      <span className="text-white font-medium">€ {totalPrice.toLocaleString('nl-NL', { minimumFractionDigits: 0 })}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm">
                    <span className="text-white/60">Reizigers</span>
                    <span className="text-white/80">{numberOfTravelers}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ROUTE MAP - collapsible under hero */}
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
          <div
            className="overflow-hidden transition-all duration-500 ease-in-out"
            style={{ maxHeight: mapOpen ? '500px' : '0px' }}
          >
            {mapOpen && (
              <RouteMap
                destinations={destinations.map(d => ({
                  name: d.name,
                  country: d.country,
                  lat: d.lat,
                  lng: d.lng,
                  image: d.images?.[0],
                  description: d.description,
                }))}
                height="400px"
                borderRadius="0"
                showStats={false}
              />
            )}
          </div>
        </div>
      )}

      {/* DAG VOOR DAG — auto-rondreis layout */}
      {offerte.template_type === 'auto-rondreis' && destinations.length > 0 && destinations.some(d => d.description || (d.images && d.images.length > 0)) && (
        <DayByDaySection
          destinations={destinations}
          items={items}
          brandColor={brand?.primary_color || '#2e7d32'}
          carImageUrl="/auto.png"
        />
      )}

      {/* DESTINATIONS — standard layout */}
      {offerte.template_type !== 'auto-rondreis' && destinations.length > 0 && destinations.some(d => d.description || (d.images && d.images.length > 0)) && (
        <div className="max-w-4xl mx-auto px-6 pt-10 pb-4">
          <h2 className="text-2xl font-bold text-gray-900 mb-1">Bestemmingen</h2>
          <p className="text-sm text-gray-500 mb-6">{destinations.length} bestemmingen op deze reis</p>

          <div className="space-y-4">
            {destinations.map((dest, idx) => (
              <div key={idx} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="flex">
                  {dest.images && dest.images.length > 0 ? (
                    <div
                      className="w-48 shrink-0 cursor-pointer"
                      onClick={() => { setLightboxImages(dest.images!); setLightboxIndex(0); }}
                    >
                      <img src={dest.images[0]} alt={dest.name} className="w-full h-full object-cover hover:brightness-90 transition-all" />
                    </div>
                  ) : (
                    <div className="w-48 shrink-0 bg-gray-100 flex items-center justify-center">
                      <MapPin size={24} className="text-gray-300" />
                    </div>
                  )}
                  <div className="flex-1 p-4 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="w-6 h-6 rounded-full bg-blue-500 text-white text-xs font-bold flex items-center justify-center shrink-0">{idx + 1}</span>
                      <h3 className="font-semibold text-gray-900">{dest.name}</h3>
                      {dest.country && <span className="text-xs text-gray-400">{dest.country}</span>}
                    </div>
                    {dest.description && (
                      <div className="mt-1">
                        <p className={`text-sm text-gray-500 ${expandedItems.has(`dest-${idx}`) ? '' : 'line-clamp-3'}`}>{dest.description}</p>
                        {dest.description.length > 180 && (
                          <button onClick={() => toggleExpand(`dest-${idx}`)} className="text-xs text-blue-500 hover:text-blue-700 mt-0.5 font-medium">
                            {expandedItems.has(`dest-${idx}`) ? 'Minder tonen' : 'Lees verder...'}
                          </button>
                        )}
                      </div>
                    )}
                    {dest.highlights && dest.highlights.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {dest.highlights.map((h, i) => (
                          <span key={i} className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-blue-50 text-blue-600">{h}</span>
                        ))}
                      </div>
                    )}
                    {dest.images && dest.images.length > 1 && (
                      <div className="flex gap-1.5 mt-2">
                        {dest.images.slice(1, 5).map((img, i) => (
                          <div key={i} className="w-12 h-12 rounded-lg overflow-hidden cursor-pointer relative" onClick={() => { setLightboxImages(dest.images!); setLightboxIndex(i + 1); }}>
                            <img src={img} alt="" className="w-full h-full object-cover hover:brightness-90 transition-all" />
                            {i === 3 && dest.images!.length > 5 && (
                              <div className="absolute inset-0 bg-black/40 flex items-center justify-center rounded-lg">
                                <span className="text-white font-semibold text-[10px]">+{dest.images!.length - 5}</span>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ITINERARY */}
      <div className="max-w-4xl mx-auto px-6 py-10">
        <h2 className="text-2xl font-bold text-gray-900 mb-1">Reisopbouw</h2>
        <p className="text-sm text-gray-500 mb-8">{items.length} onderdelen</p>

        <div className="space-y-3">
          {items.map((item) => {
            const config = getItemConfig(item.type);
            return (
              <div key={item.id} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="flex items-stretch">
                  <div className="w-1.5 shrink-0" style={{ backgroundColor: config.color }} />
                  <div className="flex items-center pr-3 py-4 pl-4">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: config.bgColor }}>
                      {getItemIcon(item.type)}
                    </div>
                  </div>
                  <div className="flex-1 py-4 pr-4 min-w-0">
                    <div className="flex items-start justify-between">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium uppercase tracking-wider" style={{ color: config.color }}>{config.label}</span>
                          {item.date_start && (
                            <span className="text-xs text-gray-400 flex items-center gap-1">
                              <Calendar size={10} />
                              {new Date(item.date_start).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' })}
                              {item.date_end && item.date_end !== item.date_start && (
                                <> - {new Date(item.date_end).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' })}</>
                              )}
                            </span>
                          )}
                        </div>
                        <h4 className="font-semibold text-gray-900 mt-0.5">{item.title}</h4>
                        <p className="text-sm text-gray-500">{formatItemSubtitle(item)}</p>
                        {item.description && (
                          <div className="mt-1">
                            <p className={`text-xs text-gray-400 ${expandedItems.has(item.id) ? '' : 'line-clamp-2'}`}>{item.description}</p>
                            {item.description.length > 120 && (
                              <button onClick={() => toggleExpand(item.id)} className="text-xs text-blue-500 hover:text-blue-700 mt-0.5 font-medium">
                                {expandedItems.has(item.id) ? 'Minder tonen' : 'Lees verder...'}
                              </button>
                            )}
                          </div>
                        )}
                        {item.facilities && item.facilities.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1.5">
                            {item.facilities.slice(0, expandedItems.has(item.id) ? undefined : 6).map((f, i) => (
                              <span key={i} className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-gray-100 text-gray-600">{f}</span>
                            ))}
                            {!expandedItems.has(item.id) && item.facilities.length > 6 && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-gray-100 text-gray-500">+{item.facilities.length - 6}</span>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0 ml-4">
                        {item.star_rating && (
                          <div className="flex items-center gap-0.5">
                            {Array.from({ length: item.star_rating }).map((_, i) => (
                              <Star key={i} size={10} className="text-yellow-400 fill-yellow-400" />
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Photo grid */}
                {item.images && item.images.length > 1 ? (
                  <div className="px-3 pb-3">
                    <div className="flex gap-1.5 cursor-pointer" style={{ height: '160px' }} onClick={() => { setLightboxImages(item.images!); setLightboxIndex(0); }}>
                      <div className="flex-1 min-w-0 overflow-hidden rounded-lg">
                        <img src={item.images[0]} alt="" className="w-full h-full object-cover hover:brightness-90 transition-all" />
                      </div>
                      <div className="grid grid-cols-2 gap-1.5" style={{ width: '40%' }}>
                        {item.images.slice(1, 5).map((img, i) => (
                          <div key={i} className="overflow-hidden rounded-lg relative" onClick={(e) => { e.stopPropagation(); setLightboxImages(item.images!); setLightboxIndex(i + 1); }}>
                            <img src={img} alt="" className="w-full h-full object-cover hover:brightness-90 transition-all" />
                            {i === 3 && item.images!.length > 5 && (
                              <div className="absolute inset-0 bg-black/40 flex items-center justify-center rounded-lg">
                                <span className="text-white font-semibold text-sm">+{item.images!.length - 5}</span>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : item.image_url ? (
                  <div className="px-3 pb-3">
                    <img src={item.image_url} alt="" className="w-full h-32 object-cover rounded-lg cursor-pointer hover:brightness-90 transition-all" onClick={() => { setLightboxImages([item.image_url!]); setLightboxIndex(0); }} />
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>

      {/* PRICE BREAKDOWN */}
      {priceDisplay !== 'hidden' && items.some(i => !i.price_hidden && i.price && i.price > 0) && (
        <div className="max-w-4xl mx-auto px-6 pb-10">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Prijsoverzicht</h3>
            <div className="space-y-2">
              {items.filter(i => !i.price_hidden && i.price && i.price > 0).map(item => {
                const config = getItemConfig(item.type);
                return (
                  <div key={item.id} className="flex items-center justify-between py-2">
                    <div className="flex items-center gap-3">
                      <div className="w-6 h-6 rounded-md flex items-center justify-center" style={{ backgroundColor: config.bgColor }}>
                        {getItemIcon(item.type)}
                      </div>
                      <span className="text-sm text-gray-700">{item.title}</span>
                    </div>
                    <div className="text-right">
                      {(priceDisplay === 'total' || priceDisplay === 'both') && (
                        <span className="text-sm font-medium text-gray-900">€ {item.price!.toLocaleString('nl-NL', { minimumFractionDigits: 2 })}</span>
                      )}
                      {(priceDisplay === 'per_person' || priceDisplay === 'both') && numberOfTravelers > 0 && (
                        <div className="text-xs text-gray-500">€ {(item.price! / numberOfTravelers).toLocaleString('nl-NL', { minimumFractionDigits: 2 })} p.p.</div>
                      )}
                    </div>
                  </div>
                );
              })}
              {extraCosts.length > 0 && (
                <div className="border-t border-gray-100 pt-2 mt-2">
                  {extraCosts.map(ec => {
                    const ecTotal = ec.per_person ? ec.amount * numberOfTravelers : ec.amount;
                    return (
                      <div key={ec.id} className="flex items-center justify-between py-1.5">
                        <span className="text-sm text-gray-600">{ec.label}</span>
                        <div className="text-right">
                          {(priceDisplay === 'total' || priceDisplay === 'both') && (
                            <span className="text-sm font-medium text-gray-900">€ {ecTotal.toLocaleString('nl-NL', { minimumFractionDigits: 2 })}</span>
                          )}
                          {(priceDisplay === 'per_person' || priceDisplay === 'both') && (
                            <div className="text-xs text-gray-500">€ {ec.amount.toLocaleString('nl-NL', { minimumFractionDigits: 2 })} p.p.</div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              <div className="border-t border-gray-200 pt-3 mt-3">
                {(priceDisplay === 'total' || priceDisplay === 'both') && (
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-gray-900">Totaal</span>
                    <span className="text-xl font-bold text-gray-900">€ {totalPrice.toLocaleString('nl-NL', { minimumFractionDigits: 2 })}</span>
                  </div>
                )}
                {(priceDisplay === 'per_person' || priceDisplay === 'both') && (
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-sm text-gray-500">Per persoon ({numberOfTravelers} reizigers)</span>
                    <span className="text-sm font-medium text-orange-600">€ {pricePerPerson.toLocaleString('nl-NL', { minimumFractionDigits: 2 })}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TERMS */}
      {offerte.terms_conditions && (
        <div className="max-w-4xl mx-auto px-6 pb-10">
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="font-semibold text-gray-900 mb-2">Voorwaarden</h3>
            <p className="text-sm text-gray-500 whitespace-pre-wrap">{offerte.terms_conditions}</p>
          </div>
        </div>
      )}

      {/* VALID UNTIL */}
      {offerte.valid_until && (
        <div className="max-w-4xl mx-auto px-6 pb-10">
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <Clock size={14} />
            Offerte geldig tot {new Date(offerte.valid_until).toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' })}
          </div>
        </div>
      )}

      {/* TRAVELBRO — feature overview + embedded chat for traveler */}
      {offerte.travelbro_share_token && (
        <div className="max-w-5xl mx-auto px-6 pb-10">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-amber-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
              <Compass size={32} className="text-white" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">TravelBro — Jouw Reisassistent</h2>
            <p className="text-gray-500 max-w-lg mx-auto">Stel vragen, ontdek nieuwe plekken en maak het meeste van je reis met je persoonlijke AI reisassistent.</p>
          </div>

          {/* Feature cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
            <div className="bg-white rounded-xl border border-gray-200 p-4 text-center hover:shadow-md transition-shadow">
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center mx-auto mb-2">
                <MapPin size={20} className="text-blue-600" />
              </div>
              <p className="text-xs font-semibold text-gray-800">Wandelroutes</p>
              <p className="text-[10px] text-gray-400 mt-0.5">In de buurt ontdekken</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-4 text-center hover:shadow-md transition-shadow">
              <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-2">
                <Car size={20} className="text-green-600" />
              </div>
              <p className="text-xs font-semibold text-gray-800">Fietsverhuur</p>
              <p className="text-[10px] text-gray-400 mt-0.5">Verhuurpunten zoeken</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-4 text-center hover:shadow-md transition-shadow">
              <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center mx-auto mb-2">
                <Building2 size={20} className="text-purple-600" />
              </div>
              <p className="text-xs font-semibold text-gray-800">Foto herkenning</p>
              <p className="text-[10px] text-gray-400 mt-0.5">Stuur een foto, wij vertellen wat het is</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-4 text-center hover:shadow-md transition-shadow">
              <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-2">
                <Star size={20} className="text-amber-600" />
              </div>
              <p className="text-xs font-semibold text-gray-800">Restaurants</p>
              <p className="text-[10px] text-gray-400 mt-0.5">Tips en reserveringen</p>
            </div>
          </div>

          {/* Embedded Chat */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-lg overflow-hidden" style={{ height: '500px' }}>
            <ChatEmbed shareToken={offerte.travelbro_share_token} />
          </div>

          {/* QR Code + WhatsApp fallback */}
          <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-6 bg-gray-50 rounded-xl p-5 border border-gray-200">
            <img
              src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(`${window.location.origin}/travelbro/${offerte.travelbro_share_token}`)}`}
              alt="TravelBro QR"
              className="w-24 h-24 rounded-lg shadow bg-white p-1.5"
            />
            <div className="text-center sm:text-left">
              <p className="text-sm font-semibold text-gray-800">Liever op je telefoon?</p>
              <p className="text-xs text-gray-500 mb-2">Scan de QR code om TravelBro op je mobiel te openen</p>
              <a
                href={`${window.location.origin}/travelbro/${offerte.travelbro_share_token}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-4 py-2 text-white text-xs font-medium rounded-lg transition-colors hover:opacity-90"
                style={{ backgroundColor: brand?.primary_color || '#f97316' }}
              >
                <Globe size={14} /> Open in nieuw venster
              </a>
            </div>
          </div>
        </div>
      )}

      {/* APPROVE / REJECT */}
      <div className="max-w-4xl mx-auto px-6 pb-10">
        {responseSubmitted || offerte.client_response ? (
          <div className={`rounded-2xl border p-8 text-center ${
            (offerte.client_response || responseMode) === 'accepted'
              ? 'bg-green-50 border-green-200'
              : 'bg-red-50 border-red-200'
          }`}>
            {offerte.client_response === 'accepted' ? (
              <>
                <CheckCircle size={48} className="text-green-500 mx-auto mb-3" />
                <h3 className="text-xl font-bold text-green-800 mb-1">Offerte goedgekeurd</h3>
                <p className="text-sm text-green-600">Bedankt! Uw reisadviseur neemt zo snel mogelijk contact met u op.</p>
              </>
            ) : (
              <>
                <XCircle size={48} className="text-red-500 mx-auto mb-3" />
                <h3 className="text-xl font-bold text-red-800 mb-1">Offerte afgekeurd</h3>
                <p className="text-sm text-red-600">Uw reisadviseur ontvangt uw feedback en neemt contact met u op.</p>
              </>
            )}
            {offerte.client_response_note && (
              <div className="mt-4 bg-white/60 rounded-lg p-3 text-sm text-gray-600 max-w-md mx-auto">
                <span className="font-medium">Uw opmerking:</span> {offerte.client_response_note}
              </div>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8">
            <h3 className="text-lg font-bold text-gray-900 mb-2 text-center">Wat vindt u van deze offerte?</h3>
            <p className="text-sm text-gray-500 text-center mb-6">Laat uw reisadviseur weten of u akkoord gaat met dit reisvoorstel.</p>

            {responseMode === 'none' ? (
              <div className="flex items-center justify-center gap-4">
                <button
                  onClick={() => setResponseMode('accept')}
                  className="flex items-center gap-2 px-8 py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-medium transition-colors"
                >
                  <CheckCircle size={20} />
                  Goedkeuren
                </button>
                <button
                  onClick={() => setResponseMode('reject')}
                  className="flex items-center gap-2 px-8 py-3 bg-white hover:bg-red-50 text-red-600 border-2 border-red-200 hover:border-red-300 rounded-xl font-medium transition-colors"
                >
                  <XCircle size={20} />
                  Afkeuren
                </button>
              </div>
            ) : (
              <div className="max-w-md mx-auto space-y-4">
                <div className={`flex items-center gap-2 text-sm font-medium px-3 py-2 rounded-lg ${
                  responseMode === 'accept' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                }`}>
                  {responseMode === 'accept' ? <CheckCircle size={16} /> : <XCircle size={16} />}
                  {responseMode === 'accept' ? 'U keurt deze offerte goed' : 'U keurt deze offerte af'}
                </div>
                {responseMode === 'reject' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      <MessageSquare size={14} className="inline mr-1" />
                      Opmerking (optioneel)
                    </label>
                    <textarea
                      value={responseNote}
                      onChange={(e) => setResponseNote(e.target.value)}
                      placeholder="Laat weten waarom u afkeurt of wat u anders wilt..."
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-none"
                    />
                  </div>
                )}
                {responseMode === 'accept' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      <MessageSquare size={14} className="inline mr-1" />
                      Opmerking (optioneel)
                    </label>
                    <textarea
                      value={responseNote}
                      onChange={(e) => setResponseNote(e.target.value)}
                      placeholder="Eventuele opmerkingen of wensen..."
                      rows={2}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-none"
                    />
                  </div>
                )}
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => submitResponse(responseMode === 'accept' ? 'accepted' : 'rejected')}
                    disabled={submittingResponse}
                    className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-medium transition-colors disabled:opacity-50 ${
                      responseMode === 'accept'
                        ? 'bg-green-600 hover:bg-green-700 text-white'
                        : 'bg-red-600 hover:bg-red-700 text-white'
                    }`}
                  >
                    <Send size={16} />
                    {submittingResponse ? 'Verzenden...' : 'Bevestigen'}
                  </button>
                  <button
                    onClick={() => { setResponseMode('none'); setResponseNote(''); }}
                    className="px-4 py-3 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-colors"
                  >
                    Annuleren
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* BRAND FOOTER */}
      {brand && (
        <div className="bg-white border-t border-gray-200 py-10">
          <div className="max-w-4xl mx-auto px-6">
            <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
              {brand.logo_url && (
                <img src={brand.logo_url} alt={brand.name} className="h-16 w-auto object-contain" />
              )}
              <div className="flex-1 text-center md:text-left">
                <h4 className="text-lg font-semibold text-gray-900 mb-1">{brand.name}</h4>
                <div className="flex flex-wrap items-center justify-center md:justify-start gap-x-5 gap-y-1 text-sm text-gray-500">
                  {brand.contact_email && (
                    <a href={`mailto:${brand.contact_email}`} className="flex items-center gap-1.5 hover:text-orange-600 transition-colors">
                      <Mail size={14} />
                      {brand.contact_email}
                    </a>
                  )}
                  {brand.contact_phone && (
                    <a href={`tel:${brand.contact_phone}`} className="flex items-center gap-1.5 hover:text-orange-600 transition-colors">
                      <Phone size={14} />
                      {brand.contact_phone}
                    </a>
                  )}
                  {brand.website_url && (
                    <a href={brand.website_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 hover:text-orange-600 transition-colors">
                      <Globe size={14} />
                      {brand.website_url.replace(/^https?:\/\//, '').replace(/\/$/, '')}
                    </a>
                  )}
                </div>
                {(brand.street_address || brand.city) && (
                  <p className="text-xs text-gray-400 mt-2">
                    {[brand.street_address, [brand.postal_code, brand.city].filter(Boolean).join(' ')].filter(Boolean).join(', ')}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* POWERED BY */}
      <div className="bg-gray-50 border-t border-gray-100 py-4">
        <div className="max-w-4xl mx-auto px-6 text-center text-xs text-gray-300">
          Aangeboden via TravelC Studio
        </div>
      </div>

      {/* LIGHTBOX */}
      {lightboxImages.length > 0 && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center" onClick={() => setLightboxImages([])}>
          <button onClick={() => setLightboxImages([])} className="absolute top-4 right-4 text-white/70 hover:text-white z-10">
            <X size={28} />
          </button>
          {lightboxImages.length > 1 && (
            <>
              <button
                onClick={(e) => { e.stopPropagation(); setLightboxIndex((lightboxIndex - 1 + lightboxImages.length) % lightboxImages.length); }}
                className="absolute left-4 text-white/70 hover:text-white z-10"
              >
                <ArrowLeft size={28} />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); setLightboxIndex((lightboxIndex + 1) % lightboxImages.length); }}
                className="absolute right-4 text-white/70 hover:text-white z-10"
              >
                <ArrowRight size={28} />
              </button>
            </>
          )}
          <img
            src={lightboxImages[lightboxIndex]}
            alt=""
            className="max-w-[90vw] max-h-[85vh] object-contain rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />
          {lightboxImages.length > 1 && (
            <div className="absolute bottom-4 text-white/60 text-sm">
              {lightboxIndex + 1} / {lightboxImages.length}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
