import React, { useState, useEffect, useRef } from 'react';
import {
  ArrowLeft, Save, Send, MapPin, Plus, GripVertical, X,
  Plane, Car, Building2, Compass, CarFront, Ship, Train, Shield, StickyNote,
  ChevronDown, ChevronUp, Image, Video, FileDown, Star, Users, Calendar,
  Download, Loader2, AlertCircle, CheckCircle2, ExternalLink
} from 'lucide-react';
import { importTcTravel } from '../../lib/tcImportToOfferte';
import { Offerte, OfferteItem, OfferteItemType, OfferteDestination, ExtraCost, OFFERTE_ITEM_TYPES } from '../../types/offerte';
import { OfferteItemTypeSelector } from './OfferteItemTypeSelector';
import { OfferteItemPanel } from './OfferteItemPanel';
import { SlidingMediaSelector } from '../shared/SlidingMediaSelector';
import { RouteMap } from '../shared/RouteMap';
import { DayByDaySection } from './DayByDaySection';

// Countdown Timer Component for Roadbooks
function CountdownTimer({ targetDate }: { targetDate: string }) {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    if (!targetDate) return;

    const calculateTimeLeft = () => {
      const difference = new Date(targetDate).getTime() - new Date().getTime();
      
      if (difference > 0) {
        setTimeLeft({
          days: Math.floor(difference / (1000 * 60 * 60 * 24)),
          hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
          minutes: Math.floor((difference / 1000 / 60) % 60),
          seconds: Math.floor((difference / 1000) % 60)
        });
      }
    };

    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000);
    return () => clearInterval(timer);
  }, [targetDate]);

  if (!targetDate) return null;

  return (
    <div className="space-y-2">
      <div className="text-sm text-white/60">Vertrek over</div>
      <div className="grid grid-cols-4 gap-2">
        <div className="bg-white/10 rounded-lg p-2 text-center">
          <div className="text-2xl font-bold text-white">{timeLeft.days}</div>
          <div className="text-xs text-white/60">dagen</div>
        </div>
        <div className="bg-white/10 rounded-lg p-2 text-center">
          <div className="text-2xl font-bold text-white">{timeLeft.hours}</div>
          <div className="text-xs text-white/60">uur</div>
        </div>
        <div className="bg-white/10 rounded-lg p-2 text-center">
          <div className="text-2xl font-bold text-white">{timeLeft.minutes}</div>
          <div className="text-xs text-white/60">min</div>
        </div>
        <div className="bg-white/10 rounded-lg p-2 text-center">
          <div className="text-2xl font-bold text-white">{timeLeft.seconds}</div>
          <div className="text-xs text-white/60">sec</div>
        </div>
      </div>
    </div>
  );
}

// Convert YouTube URLs to embed format
function getYouTubeEmbedUrl(url: string): string | null {
  if (!url) return null;
  // Already an embed URL
  if (url.includes('youtube.com/embed/')) return url;
  // Standard watch URL: youtube.com/watch?v=ID
  const watchMatch = url.match(/(?:youtube\.com\/watch\?v=)([a-zA-Z0-9_-]+)/);
  if (watchMatch) return `https://www.youtube.com/embed/${watchMatch[1]}?autoplay=1&mute=1&loop=1&playlist=${watchMatch[1]}&controls=0&showinfo=0`;
  // Short URL: youtu.be/ID
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

// Inline form for adding/editing extra costs
function ExtraCostForm({ initial, onSave }: { initial: ExtraCost | null; onSave: (ec: ExtraCost) => void }) {
  const [label, setLabel] = useState(initial?.label || '');
  const [amount, setAmount] = useState(initial?.amount?.toString() || '');
  const [perPerson, setPerPerson] = useState(initial?.per_person || false);
  const [applyToAll, setApplyToAll] = useState(initial?.apply_to_all || false);

  const handleSubmit = () => {
    if (!label.trim() || !amount) return;
    onSave({
      id: initial?.id || crypto.randomUUID(),
      label: label.trim(),
      amount: parseFloat(amount) || 0,
      per_person: perPerson,
      apply_to_all: applyToAll,
    });
  };

  return (
    <div className="space-y-5">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Omschrijving *</label>
        <input
          type="text"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="bijv. Administratiekosten, SGR bijdrage..."
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Bedrag (€) *</label>
        <input
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="0.00"
          step="0.01"
          min="0"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm"
        />
      </div>
      <div className="flex items-center gap-3">
        <label className="relative inline-flex items-center cursor-pointer">
          <input type="checkbox" checked={perPerson} onChange={(e) => setPerPerson(e.target.checked)} className="sr-only peer" />
          <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-orange-500"></div>
        </label>
        <span className="text-sm text-gray-700">Per persoon</span>
      </div>
      <p className="text-xs text-gray-400 -mt-3 ml-12">Aan = bedrag wordt vermenigvuldigd met aantal reizigers</p>
      <div className="flex items-center gap-3 bg-orange-50 rounded-lg p-3 border border-orange-100">
        <input
          type="checkbox"
          checked={applyToAll}
          onChange={(e) => setApplyToAll(e.target.checked)}
          className="w-4 h-4 text-orange-500 border-gray-300 rounded focus:ring-orange-500"
        />
        <div>
          <span className="text-sm font-medium text-gray-700">Bij alle reizen toepassen</span>
          <p className="text-xs text-gray-500">Deze kosten worden automatisch toegevoegd aan nieuwe offertes</p>
        </div>
      </div>
      <button
        onClick={handleSubmit}
        disabled={!label.trim() || !amount}
        className="w-full py-2.5 bg-gray-900 text-white rounded-lg hover:bg-gray-800 disabled:bg-gray-300 disabled:cursor-not-allowed text-sm font-medium transition-colors"
      >
        {initial ? 'Opslaan' : 'Toevoegen'}
      </button>
    </div>
  );
}

interface Props {
  offerte?: Offerte;
  onBack: () => void;
  onSave?: (offerte: Offerte) => void;
}

export function TravelDocsRoadbook({ offerte, onBack, onSave }: Props) {
  const [title, setTitle] = useState(offerte?.title || '');
  const [subtitle, setSubtitle] = useState(offerte?.subtitle || '');
  const [introText, setIntroText] = useState(offerte?.intro_text || '');
  const [heroImages, setHeroImages] = useState<string[]>(
    offerte?.hero_images?.length ? offerte.hero_images : offerte?.hero_image_url ? [offerte.hero_image_url] : []
  );
  const [heroVideo, setHeroVideo] = useState(offerte?.hero_video_url || '');
  const [heroSlideIndex, setHeroSlideIndex] = useState(0);
  const [clientName, setClientName] = useState(offerte?.client_name || '');
  const [clientEmail, setClientEmail] = useState(offerte?.client_email || '');
  const [clientPhone, setClientPhone] = useState(offerte?.client_phone || '');
  const [travelCompositorId, setTravelCompositorId] = useState(offerte?.travel_compositor_id || '');
  const [numberOfTravelers, setNumberOfTravelers] = useState(offerte?.number_of_travelers || 2);
  const [currency] = useState(offerte?.currency || 'EUR');
  const [priceDisplay, setPriceDisplay] = useState<'total' | 'per_person' | 'both' | 'hidden'>(offerte?.price_display || 'both');
  const [validUntil, setValidUntil] = useState(offerte?.valid_until || '');
  const [internalNotes, setInternalNotes] = useState(offerte?.internal_notes || '');
  const [destinations, setDestinations] = useState<OfferteDestination[]>(offerte?.destinations || []);
  const [departureDate, setDepartureDate] = useState(offerte?.departure_date || '');
  const templateType = offerte?.template_type || 'auto-rondreis';

  const [items, setItems] = useState<OfferteItem[]>(offerte?.items || []);
  const [addMenuIndex, setAddMenuIndex] = useState<number | null>(null);
  const [editingItem, setEditingItem] = useState<{ item: OfferteItem | null; type: OfferteItemType; index: number } | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [showMediaSelector, setShowMediaSelector] = useState(false);
  const [mediaSelectorMode, setMediaSelectorMode] = useState<'photo' | 'video'>('photo');
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [mapOpen, setMapOpen] = useState(false);
  const [detailItem, setDetailItem] = useState<OfferteItem | null>(null);
  const carouselRef = useRef<HTMLDivElement>(null);
  const [cardPhotoIdx, setCardPhotoIdx] = useState<Record<string, number>>({});
  const [lightboxImages, setLightboxImages] = useState<string[]>([]);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [tcImporting, setTcImporting] = useState(false);
  const [tcImportError, setTcImportError] = useState<string | null>(null);
  const [tcImportSuccess, setTcImportSuccess] = useState<string | null>(null);
  const [sendSuccess, setSendSuccess] = useState(false);
  const [extraCosts, setExtraCosts] = useState<ExtraCost[]>(offerte?.extra_costs || []);
  const [showExtraCostPanel, setShowExtraCostPanel] = useState(false);
  const [editingExtraCost, setEditingExtraCost] = useState<ExtraCost | null>(null);

  const extraCostsTotal = extraCosts.reduce((sum, ec) => sum + (ec.per_person ? ec.amount * numberOfTravelers : ec.amount), 0);
  const totalPrice = items.reduce((sum, item) => sum + (item.price || 0), 0) + extraCostsTotal;

  const handleTcImport = async () => {
    if (!travelCompositorId.trim()) return;
    setTcImporting(true);
    setTcImportError(null);
    setTcImportSuccess(null);
    try {
      const result = await importTcTravel(travelCompositorId);
      // Fill offerte fields with imported data
      if (result.title) setTitle(result.title);
      if (result.subtitle) setSubtitle(result.subtitle);
      if (result.introText) setIntroText(result.introText);
      if (result.heroImage) setHeroImages([result.heroImage]);
      if (result.destinations.length > 0) setDestinations(result.destinations);
      if (result.numberOfTravelers) setNumberOfTravelers(result.numberOfTravelers);
      if (result.items.length > 0) {
        // Re-index sort_order
        result.items.forEach((item, idx) => { item.sort_order = idx; });
        setItems(result.items);
      }
      setTcImportSuccess(`${result.items.length} items ge\u00EFmporteerd (${result.destinations.length} bestemmingen)`);
    } catch (err: any) {
      console.error('TC Import error:', err);
      setTcImportError(err.message || 'Import mislukt');
    } finally {
      setTcImporting(false);
    }
  };
  const pricePerPerson = numberOfTravelers > 0 ? totalPrice / numberOfTravelers : 0;

  const handleAddItem = (type: OfferteItemType, insertIndex: number) => {
    setEditingItem({ item: null, type, index: insertIndex });
  };

  const handleSaveItem = (savedItem: OfferteItem) => {
    if (!editingItem) return;
    const newItems = [...items];
    const existingIndex = newItems.findIndex(i => i.id === savedItem.id);
    if (existingIndex >= 0) {
      newItems[existingIndex] = savedItem;
    } else {
      savedItem.sort_order = editingItem.index;
      newItems.splice(editingItem.index, 0, savedItem);
    }
    // Re-index sort_order
    newItems.forEach((item, idx) => { item.sort_order = idx; });
    setItems(newItems);
    setEditingItem(null);
  };

  const handleRemoveItem = (index: number) => {
    const newItems = items.filter((_, i) => i !== index);
    newItems.forEach((item, idx) => { item.sort_order = idx; });
    setItems(newItems);
  };

  const handleDragStart = (index: number) => {
    setDragIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (dragIndex === null || dragIndex === index) return;
    const newItems = [...items];
    const [dragged] = newItems.splice(dragIndex, 1);
    newItems.splice(index, 0, dragged);
    newItems.forEach((item, idx) => { item.sort_order = idx; });
    setItems(newItems);
    setDragIndex(index);
  };

  const handleDragEnd = () => {
    setDragIndex(null);
  };

  const handleSave = () => {
    const data: Offerte = {
      id: offerte?.id || crypto.randomUUID(),
      brand_id: offerte?.brand_id,
      agent_id: offerte?.agent_id,
      travel_compositor_id: travelCompositorId || undefined,
      client_name: clientName,
      client_email: clientEmail || undefined,
      client_phone: clientPhone || undefined,
      title,
      subtitle: subtitle || undefined,
      intro_text: introText || undefined,
      hero_image_url: heroImages[0] || undefined,
      hero_images: heroImages.length > 0 ? heroImages : undefined,
      hero_video_url: heroVideo || undefined,
      destinations,
      items,
      extra_costs: extraCosts.length > 0 ? extraCosts : undefined,
      total_price: totalPrice,
      price_per_person: pricePerPerson,
      number_of_travelers: numberOfTravelers,
      currency,
      price_display: priceDisplay,
      status: offerte?.status || 'draft',
      valid_until: validUntil || undefined,
      internal_notes: internalNotes || undefined,
      created_at: offerte?.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    onSave?.(data);
    return data;
  };

  const getOfferteUrl = () => {
    const id = offerte?.id || '';
    return `${window.location.origin}/offerte/${id}`;
  };

  const handlePreview = async () => {
    // Save first to ensure we have an ID and latest data
    const data = handleSave();
    if (!data || !data.id) {
      alert('Kon offerte niet opslaan voor preview.');
      return;
    }
    
    // Call onSave to persist to database if callback is provided
    // Pass stayInEditor=true to keep editor open after saving
    if (onSave) {
      try {
        await (onSave as any)(data, true); // true = stayInEditor
      } catch (err) {
        console.error('Error saving for preview:', err);
        alert('Fout bij opslaan voor preview');
        return;
      }
    }
    
    // Open preview in new tab
    const url = `${window.location.origin}/offerte/${data.id}`;
    window.open(url, '_blank');
  };

  const handleSend = async () => {
    // Save first
    const data = handleSave();
    if (!data) return;

    // Copy link to clipboard
    const url = getOfferteUrl();
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      // Fallback
      const input = document.createElement('input');
      input.value = url;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
    }

    setSendSuccess(true);
    setTimeout(() => setSendSuccess(false), 4000);
  };

  const getItemIcon = (type: OfferteItemType) => {
    const config = OFFERTE_ITEM_TYPES.find(t => t.type === type);
    if (!config) return null;
    const Icon = iconMap[config.icon];
    return Icon ? <Icon size={18} style={{ color: config.color }} /> : null;
  };

  const getItemConfig = (type: OfferteItemType) => {
    return OFFERTE_ITEM_TYPES.find(t => t.type === type)!;
  };

  const formatItemSubtitle = (item: OfferteItem): string => {
    switch (item.type) {
      case 'flight':
        return [item.airline, item.flight_number, item.departure_airport && item.arrival_airport ? `${item.departure_airport} → ${item.arrival_airport}` : ''].filter(Boolean).join(' · ');
      case 'hotel':
        return [item.hotel_name, item.room_type, item.nights ? `${item.nights} nachten` : '', item.board_type].filter(Boolean).join(' · ');
      case 'transfer':
        return [item.transfer_type, item.pickup_location && item.dropoff_location ? `${item.pickup_location} → ${item.dropoff_location}` : ''].filter(Boolean).join(' · ');
      case 'activity':
        return [item.location, item.activity_duration].filter(Boolean).join(' · ');
      default:
        return item.subtitle || item.location || '';
    }
  };

  const renderAddButton = (index: number) => (
    <div className="relative flex items-center justify-center py-1 group">
      {/* Connecting line */}
      <div className="absolute inset-x-8 top-1/2 h-px bg-gray-200 group-hover:bg-orange-200 transition-colors" />
      <button
        onClick={() => setAddMenuIndex(addMenuIndex === index ? null : index)}
        className="relative z-10 w-7 h-7 rounded-full bg-white border-2 border-gray-200 hover:border-orange-400 hover:bg-orange-50 flex items-center justify-center transition-all group-hover:scale-110 group-hover:border-orange-300"
      >
        <Plus size={14} className="text-gray-400 group-hover:text-orange-500 transition-colors" />
      </button>
      {addMenuIndex === index && (
        <OfferteItemTypeSelector
          onSelect={(type) => handleAddItem(type, index)}
          onClose={() => setAddMenuIndex(null)}
        />
      )}
    </div>
  );

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Top bar */}
      <div className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <ArrowLeft size={20} className="text-gray-600" />
          </button>
          <div>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Naam van het Roadbook..."
              className="text-lg font-bold text-gray-900 border-none outline-none bg-transparent placeholder:text-gray-300 w-80"
            />
            <div className="flex items-center gap-3 text-xs text-gray-500">
              <span className="flex items-center gap-1"><Users size={12} /> {clientName || 'Geen klant'}</span>
              <span>·</span>
              <span>{items.length} items</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowSettings(!showSettings)} className="px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors flex items-center gap-2">
            {showSettings ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            Instellingen
          </button>
          <button onClick={handlePreview} className="px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors flex items-center gap-2">
            <ExternalLink size={16} />
            Preview
          </button>
          <button onClick={handleSave} className="px-4 py-2 text-sm bg-gray-900 hover:bg-gray-800 text-white rounded-lg transition-colors flex items-center gap-2">
            <Save size={16} />
            Opslaan
          </button>
          <button onClick={handleSend} className="px-4 py-2 text-sm bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition-colors flex items-center gap-2">
            {sendSuccess ? <CheckCircle2 size={16} /> : <Send size={16} />}
            {sendSuccess ? 'Link gekopieerd!' : 'Versturen'}
          </button>
        </div>
      </div>

      {/* Settings panel (collapsible) */}
      {showSettings && (
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="grid grid-cols-4 gap-4 max-w-5xl">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Klantnaam *</label>
              <input type="text" value={clientName} onChange={e => setClientName(e.target.value)} placeholder="Jan de Vries" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-orange-200 focus:border-orange-400 outline-none" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">E-mail</label>
              <input type="email" value={clientEmail} onChange={e => setClientEmail(e.target.value)} placeholder="jan@email.nl" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-orange-200 focus:border-orange-400 outline-none" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Telefoon</label>
              <input type="tel" value={clientPhone} onChange={e => setClientPhone(e.target.value)} placeholder="+31 6 12345678" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-orange-200 focus:border-orange-400 outline-none" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Aantal reizigers</label>
              <input type="number" value={numberOfTravelers} onChange={e => setNumberOfTravelers(parseInt(e.target.value) || 1)} min={1} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-orange-200 focus:border-orange-400 outline-none" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Vertrekdatum</label>
              <input type="date" value={departureDate} onChange={e => setDepartureDate(e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-orange-200 focus:border-orange-400 outline-none" />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-500 mb-1">Importeer vanuit Travel Compositor</label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={travelCompositorId}
                  onChange={e => { setTravelCompositorId(e.target.value); setTcImportError(null); setTcImportSuccess(null); }}
                  placeholder="Reis ID (bijv. 45963771)"
                  className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-orange-200 focus:border-orange-400 outline-none"
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleTcImport(); } }}
                />
                <button
                  onClick={handleTcImport}
                  disabled={tcImporting || !travelCompositorId.trim()}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white rounded-lg text-sm font-medium transition-colors whitespace-nowrap"
                >
                  {tcImporting ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                  {tcImporting ? 'Ophalen...' : 'Importeer'}
                </button>
              </div>
              {tcImportError && (
                <div className="flex items-center gap-1.5 mt-1.5 text-xs text-red-600">
                  <AlertCircle size={12} />
                  {tcImportError}
                </div>
              )}
              {tcImportSuccess && (
                <div className="flex items-center gap-1.5 mt-1.5 text-xs text-green-600">
                  <CheckCircle2 size={12} />
                  {tcImportSuccess}
                </div>
              )}
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-500 mb-1">Interne notities</label>
              <input type="text" value={internalNotes} onChange={e => setInternalNotes(e.target.value)} placeholder="Alleen zichtbaar voor jou..." className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-orange-200 focus:border-orange-400 outline-none" />
            </div>
          </div>
        </div>
      )}

      {/* Main content - scrollable */}
      <div className="flex-1 overflow-y-auto">
        {/* HERO SECTION - Full width inspirational */}
        <div className="relative w-full" style={{ minHeight: '70vh' }}>
          {/* Background image/video with slideshow */}
          {heroVideo && isYouTubeUrl(heroVideo) ? (
            <iframe
              src={getYouTubeEmbedUrl(heroVideo) || heroVideo}
              className="absolute inset-0 w-full h-full"
              style={{ border: 'none', pointerEvents: 'none', transform: 'scale(1.2)' }}
              allow="autoplay; encrypted-media"
              allowFullScreen
            />
          ) : heroVideo ? (
            <video
              src={heroVideo}
              autoPlay
              muted
              loop
              playsInline
              className="absolute inset-0 w-full h-full object-cover"
            />
          ) : heroImages.length > 0 ? (
            <>
              {heroImages.map((img, i) => (
                <img
                  key={img}
                  src={img}
                  alt=""
                  className="absolute inset-0 w-full h-full object-cover transition-opacity duration-700"
                  style={{ opacity: i === heroSlideIndex ? 1 : 0 }}
                />
              ))}
              {heroImages.length > 1 && (
                <>
                  <button
                    onClick={() => setHeroSlideIndex((heroSlideIndex - 1 + heroImages.length) % heroImages.length)}
                    className="absolute left-4 top-1/2 -translate-y-1/2 z-20 w-10 h-10 bg-black/30 hover:bg-black/50 backdrop-blur-sm text-white rounded-full flex items-center justify-center transition-colors"
                  >
                    <ArrowLeft size={18} />
                  </button>
                  <button
                    onClick={() => setHeroSlideIndex((heroSlideIndex + 1) % heroImages.length)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 z-20 w-10 h-10 bg-black/30 hover:bg-black/50 backdrop-blur-sm text-white rounded-full flex items-center justify-center transition-colors"
                  >
                    <ArrowLeft size={18} className="rotate-180" />
                  </button>
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5">
                    {heroImages.map((_, i) => (
                      <button
                        key={i}
                        onClick={() => setHeroSlideIndex(i)}
                        className={`w-2 h-2 rounded-full transition-all ${i === heroSlideIndex ? 'bg-white w-4' : 'bg-white/40 hover:bg-white/60'}`}
                      />
                    ))}
                  </div>
                </>
              )}
            </>
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-slate-800 via-slate-700 to-slate-900" />
          )}

          {/* Dark overlay on left side */}
          <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/50 to-transparent pointer-events-none" />

          {/* Upload controls (top right) */}
          <div className="absolute top-4 right-4 z-20 flex items-center gap-2">
            <button onClick={() => { setMediaSelectorMode('photo'); setShowMediaSelector(true); }} className="px-3 py-2 bg-white/20 backdrop-blur-sm hover:bg-white/30 text-white rounded-lg text-xs font-medium transition-colors flex items-center gap-2">
              <Image size={14} />
              {heroImages.length > 0 ? 'Foto +' : 'Foto'}
            </button>
            <button onClick={() => { setMediaSelectorMode('video'); setShowMediaSelector(true); }} className="px-3 py-2 bg-white/20 backdrop-blur-sm hover:bg-white/30 text-white rounded-lg text-xs font-medium transition-colors flex items-center gap-2">
              <Video size={14} />
              Video
            </button>
            {heroImages.length > 0 && !heroVideo && (
              <button onClick={() => { setHeroImages(heroImages.filter((_, i) => i !== heroSlideIndex)); setHeroSlideIndex(0); }} className="px-3 py-2 bg-red-500/60 backdrop-blur-sm hover:bg-red-500/80 text-white rounded-lg text-xs font-medium transition-colors flex items-center gap-2">
                <X size={14} />
                {heroImages.length > 1 ? `Verwijder (${heroSlideIndex + 1}/${heroImages.length})` : 'Verwijder'}
              </button>
            )}
            {heroVideo && (
              <button onClick={() => setHeroVideo('')} className="px-3 py-2 bg-red-500/60 backdrop-blur-sm hover:bg-red-500/80 text-white rounded-lg text-xs font-medium transition-colors flex items-center gap-2">
                <X size={14} />
                Verwijder video
              </button>
            )}
          </div>

          {/* Left overlay content */}
          <div className="relative z-10 flex h-full" style={{ minHeight: '70vh' }}>
            <div className="w-1/2 p-10 flex flex-col justify-center">
              {/* Subtitle */}
              <input
                type="text"
                value={subtitle}
                onChange={e => setSubtitle(e.target.value)}
                placeholder="Subtitel bijv. '14 dagen door Zuidoost-Azië'"
                className="text-sm font-medium text-orange-400 bg-transparent border-none outline-none placeholder:text-white/30 mb-3 tracking-wider uppercase"
              />
              {/* Title */}
              <input
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="Reistitel..."
                className="text-4xl font-bold text-white bg-transparent border-none outline-none placeholder:text-white/20 mb-4 leading-tight"
              />
              {/* Intro text */}
              <textarea
                value={introText}
                onChange={e => setIntroText(e.target.value)}
                placeholder="Schrijf een inspirerende introductietekst voor je klant..."
                rows={4}
                className="text-base text-white/80 bg-transparent border-none outline-none placeholder:text-white/20 resize-none leading-relaxed mb-8"
              />

              {/* Mini route map placeholder */}
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/10">
                <div className="flex items-center gap-2 mb-3">
                  <MapPin size={16} className="text-orange-400" />
                  <span className="text-sm font-medium text-white/90">Routekaart</span>
                </div>
                {destinations.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {destinations.map((dest, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-orange-500 text-white text-xs flex items-center justify-center font-bold">{i + 1}</span>
                        <span className="text-sm text-white/80">{dest.name}</span>
                        {i < destinations.length - 1 && <span className="text-white/30">→</span>}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-sm text-white/40">
                    Bestemmingen worden automatisch toegevoegd op basis van je reisitems
                  </div>
                )}
                <button
                  onClick={() => {
                    const name = prompt('Bestemming naam:');
                    if (name) {
                      setDestinations([...destinations, { name, lat: 0, lng: 0, order: destinations.length }]);
                    }
                  }}
                  className="mt-3 text-xs text-orange-400 hover:text-orange-300 flex items-center gap-1 transition-colors"
                >
                  <Plus size={12} />
                  Bestemming toevoegen
                </button>
              </div>
            </div>

            {/* Right side - countdown timer for roadbooks */}
            <div className="w-1/2 p-10 flex items-end justify-end">
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/10 min-w-[280px]">
                {departureDate ? (
                  <CountdownTimer targetDate={departureDate} />
                ) : (
                  <div className="text-center py-4">
                    <Calendar className="w-8 h-8 text-white/40 mx-auto mb-2" />
                    <div className="text-sm text-white/60">Stel een vertrekdatum in</div>
                  </div>
                )}
                <div className="border-t border-white/10 pt-3 mt-4 space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-white/60">Items</span>
                    <span className="text-white/80">{items.length}</span>
                  </div>
                  {departureDate && (
                    <div className="flex justify-between text-sm">
                      <span className="text-white/60">Vertrek</span>
                      <span className="text-white/80">{new Date(departureDate).toLocaleDateString('nl-NL')}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ROUTE MAP - full width, collapsible, directly under hero */}
        {destinations.length > 0 && (
          <div className="relative">
            {/* Toggle button */}
            <button
              onClick={() => setMapOpen(!mapOpen)}
              className="w-full flex items-center justify-center gap-2 py-3 bg-gray-900/80 backdrop-blur-sm text-white hover:bg-gray-900/90 transition-all text-sm font-medium"
            >
              <MapPin size={16} />
              Bekijk route · {destinations.length} bestemmingen
              <ChevronDown size={16} className={`transition-transform duration-300 ${mapOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Collapsible map */}
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

        {/* REIS TIMELINE CAROUSEL - Only for auto-rondreis template */}
        {items.length > 0 && templateType === 'auto-rondreis' && (
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
                        
                        {/* === HEADER SECTION === */}
                        {isFlight ? (
                          /* FLIGHT CARD - compact with extra info */
                          <div className="p-3">
                            <div className="flex items-center gap-1.5 mb-1.5">
                              <div className="w-6 h-6 bg-green-500 rounded-md flex items-center justify-center flex-shrink-0">
                                <Plane size={12} className="text-white" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="text-[11px] font-medium text-blue-600 truncate">
                                  {item.airline || 'Airline'} {item.flight_number || ''}
                                  {item.details?.operatedBy ? <span className="text-gray-400 font-normal"> - Uitgevoerd door: {item.details.operatedBy}</span> : null}
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
                            {/* Extra flight info row */}
                            <div className="flex items-center justify-center gap-3 mt-1.5 text-[10px] text-gray-500">
                              {item.details?.duration && (
                                <span>⏱ {item.details.duration}</span>
                              )}
                              {item.details?.baggage && (
                                <span>🧳 {item.details.baggage}</span>
                              )}
                              <span>{item.details?.isDirect !== false ? '→ Rechtstreeks' : `↔ ${item.details?.stops || 1} overstap`}</span>
                            </div>
                          </div>
                        ) : (isTransfer && !item.image_url) ? (
                          /* TRANSFER CARD - compact like flight */
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
                            {item.distance && (
                              <div className="text-[10px] text-gray-400 mt-1 text-center">{item.distance}</div>
                            )}
                          </div>
                        ) : item.image_url ? (
                          /* HOTEL / ITEM WITH IMAGE + photo arrows */
                          <div className="relative h-48 bg-gray-100 group">
                            <img 
                              src={(item.images && item.images.length > 0) ? (item.images[cardPhotoIdx[item.id] || 0] || item.image_url) : item.image_url} 
                              alt={item.title} 
                              className="w-full h-full object-cover" 
                            />
                            <div className="absolute top-3 left-3 px-3 py-1.5 rounded-full text-xs font-semibold text-white" style={{ backgroundColor: config.color }}>
                              {config.label}
                            </div>
                            {/* Photo navigation arrows */}
                            {item.images && item.images.length > 1 && (
                              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-2">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setCardPhotoIdx(prev => {
                                      const cur = prev[item.id] || 0;
                                      return { ...prev, [item.id]: cur > 0 ? cur - 1 : item.images!.length - 1 };
                                    });
                                  }}
                                  className="w-8 h-8 rounded-full bg-white/90 shadow flex items-center justify-center hover:bg-white"
                                >
                                  <ArrowLeft size={14} className="text-gray-700" />
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setCardPhotoIdx(prev => {
                                      const cur = prev[item.id] || 0;
                                      return { ...prev, [item.id]: cur < item.images!.length - 1 ? cur + 1 : 0 };
                                    });
                                  }}
                                  className="w-8 h-8 rounded-full bg-white/90 shadow flex items-center justify-center hover:bg-white"
                                >
                                  <ArrowLeft size={14} className="text-gray-700 rotate-180" />
                                </button>
                              </div>
                            )}
                          </div>
                        ) : (
                          /* NO IMAGE - Compact colored header */
                          <div className="h-12 flex items-center justify-center gap-2 px-4" style={{ backgroundColor: config.bgColor || '#f3f4f6' }}>
                            <div className="w-7 h-7 rounded-full bg-white/80 flex items-center justify-center shadow-sm">
                              {getItemIcon(item.type)}
                            </div>
                            <span className="text-xs font-semibold" style={{ color: config.color }}>{config.label}</span>
                          </div>
                        )}

                        {/* === CONTENT SECTION === */}
                        {/* Compact cards: flights and transfers show everything in header */}
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
                          
                          {/* Subtitle - location for hotels, route for car rentals */}
                          {isHotel && item.location && (
                            <p className="text-sm text-gray-500 mb-2">📍 {typeof item.location === 'object' ? (item.location as any).name || JSON.stringify(item.location) : item.location}</p>
                          )}
                          {isCarRental && (item.pickup_location || item.dropoff_location) && (
                            <p className="text-sm text-gray-500 mb-2">{[item.pickup_location, item.dropoff_location].filter(Boolean).map(v => typeof v === 'object' ? (v as any).name || '' : v).join(' → ')}</p>
                          )}
                          {isCruise && item.subtitle && (
                            <p className="text-sm text-gray-500 mb-2">{String(item.subtitle)}</p>
                          )}
                          
                          {/* Detail rows with icons */}
                          <div className="space-y-1.5 text-xs text-gray-600 mb-3">
                            {/* Date */}
                            {!isFlight && !isTransfer && item.date_start && (
                              <div className="flex items-center gap-2">
                                <span>📅</span>
                                <span>{new Date(item.date_start).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short', year: 'numeric' })}{item.date_end ? ` - ${new Date(item.date_end).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' })}` : ''}</span>
                              </div>
                            )}
                            {/* Nights */}
                            {item.nights ? (
                              <div className="flex items-center gap-2">
                                <span>🌙</span>
                                <span>{item.nights} nachten</span>
                              </div>
                            ) : null}
                            {/* Room type */}
                            {item.room_type && (
                              <div className="flex items-center gap-2">
                                <span>🛏️</span>
                                <span>{typeof item.room_type === 'object' ? (item.room_type as any).name || '' : item.room_type}</span>
                              </div>
                            )}
                            {/* Board type */}
                            {item.board_type && (
                              <div className="flex items-center gap-2">
                                <span>🍽️</span>
                                <span>{typeof item.board_type === 'object' ? (item.board_type as any).name || '' : item.board_type}</span>
                              </div>
                            )}
                            {/* Car rental dates */}
                            {isCarRental && item.date_start && item.date_end && (
                              <div className="flex items-center gap-2">
                                <span>📅</span>
                                <span>{new Date(item.date_start).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' })} - {new Date(item.date_end).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' })}</span>
                              </div>
                            )}
                            {/* Cruise supplier */}
                            {isCruise && item.supplier && (
                              <div className="flex items-center gap-2">
                                <span>🚢</span>
                                <span>{typeof item.supplier === 'object' ? (item.supplier as any).name || '' : String(item.supplier)}</span>
                              </div>
                            )}
                            {/* Baggage for flights */}
                            {isFlight && (
                              <div className="flex items-center gap-2">
                                <span>🧳</span>
                                <span>Bagage: 1PC</span>
                              </div>
                            )}
                          </div>
                          
                          {/* Action button - only for hotels and cruises with extra content */}
                          {(isHotel || isCruise) && (item.description || (item.images && item.images.length > 1) || item.facilities) && (
                            <div className="mt-auto">
                              <button 
                                onClick={() => setDetailItem(item)}
                                className="w-full bg-green-600 hover:bg-green-700 text-white text-sm font-medium py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2"
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

              {/* Carousel navigation arrows */}
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

        {/* DAG VOOR DAG - Road layout with scrolling car (auto-rondreis only) */}
        {templateType === 'auto-rondreis' && destinations.length > 0 && destinations.some(d => d.description || (d.images && d.images.length > 0)) && (
          <DayByDaySection
            destinations={destinations}
            items={items}
            brandColor="#2e7d32"
          />
        )}

        {/* DESTINATION INFO CARDS - Fallback for standard template */}
        {templateType !== 'auto-rondreis' && destinations.length > 0 && destinations.some(d => d.description || (d.images && d.images.length > 0)) && (
          <div className="max-w-4xl mx-auto px-6 pt-10 pb-4">
            <h2 className="text-2xl font-bold text-gray-900 mb-1">Bestemmingen</h2>
            <p className="text-sm text-gray-500 mb-6">{destinations.length} bestemmingen op deze reis</p>
            <div className="space-y-4">
              {destinations.map((dest, idx) => (
                <div key={idx} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                  <div className="flex">
                    {dest.images && dest.images.length > 0 ? (
                      <div className="w-48 shrink-0 cursor-pointer" onClick={() => { setLightboxImages(dest.images!); setLightboxIndex(0); }}>
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
                        <p className="text-sm text-gray-500 mt-1 line-clamp-3">{dest.description}</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ITINERARY BUILDER */}
        <div className="max-w-4xl mx-auto px-6 py-10">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Reisopbouw</h2>
              <p className="text-sm text-gray-500 mt-1">Stel de reis samen met vluchten, hotels, transfers en activiteiten</p>
            </div>
            {travelCompositorId && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-xs font-medium">
                <FileDown size={14} />
                TC ID: {travelCompositorId}
              </div>
            )}
          </div>

          {/* Add button at top */}
          {renderAddButton(0)}

          {/* Items list - only show for standard roadbook, hide for auto-rondreis */}
          <div className={templateType === 'auto-rondreis' ? 'hidden' : ''}>
          {items.map((item, index) => {
            const config = getItemConfig(item.type);
            return (
              <div key={item.id}>
                {/* Item card */}
                <div
                  draggable
                  onDragStart={() => handleDragStart(index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDragEnd={handleDragEnd}
                  className={`bg-white rounded-xl border transition-all ${
                    dragIndex === index
                      ? 'border-orange-300 shadow-lg scale-[1.02]'
                      : 'border-gray-200 shadow-sm hover:shadow-md hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-stretch">
                    {/* Left color bar */}
                    <div className="w-1.5 rounded-l-xl shrink-0" style={{ backgroundColor: config.color }} />

                    {/* Drag handle */}
                    <div className="flex items-center px-2 cursor-grab active:cursor-grabbing">
                      <GripVertical size={16} className="text-gray-300" />
                    </div>

                    {/* Icon */}
                    <div className="flex items-center pr-3 py-4">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: config.bgColor }}>
                        {getItemIcon(item.type)}
                      </div>
                    </div>

                    {/* Content */}
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
                          <h4 className="font-semibold text-gray-900 mt-0.5 truncate">{item.title}</h4>
                          <p className="text-sm text-gray-500 truncate">{formatItemSubtitle(item)}</p>
                          {item.description && (
                            <div className="mt-1">
                              <p className={`text-xs text-gray-400 ${expandedItems.has(item.id) ? '' : 'line-clamp-2'}`}>{item.description}</p>
                              {item.description.length > 120 && (
                                <button
                                  onClick={(e) => { e.stopPropagation(); setExpandedItems(prev => { const next = new Set(prev); next.has(item.id) ? next.delete(item.id) : next.add(item.id); return next; }); }}
                                  className="text-xs text-blue-500 hover:text-blue-700 mt-0.5 font-medium"
                                >
                                  {expandedItems.has(item.id) ? 'Minder tonen' : 'Lees verder...'}
                                </button>
                              )}
                            </div>
                          )}
                          {item.facilities && item.facilities.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1.5">
                              {item.facilities.slice(0, expandedItems.has(item.id) ? undefined : 6).map((f, i) => (
                                <span key={i} className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-gray-100 text-gray-600">
                                  {f}
                                </span>
                              ))}
                              {!expandedItems.has(item.id) && item.facilities.length > 6 && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-gray-100 text-gray-500">
                                  +{item.facilities.length - 6}
                                </span>
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

                    {/* Actions */}
                    <div className="flex items-center gap-1 pr-3">
                      <button
                        onClick={() => setEditingItem({ item, type: item.type, index })}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-400 hover:text-gray-600"
                        title="Bewerken"
                      >
                        <ChevronDown size={16} />
                      </button>
                      <button
                        onClick={() => handleRemoveItem(index)}
                        className="p-2 hover:bg-red-50 rounded-lg transition-colors text-gray-400 hover:text-red-500"
                        title="Verwijderen"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  </div>

                  {/* Photo grid for hotels with multiple images */}
                  {item.images && item.images.length > 1 ? (
                    <div className="px-3 pb-3">
                      <div className="flex gap-1.5 cursor-pointer" style={{ height: '160px' }} onClick={() => { setLightboxImages(item.images!); setLightboxIndex(0); }}>
                        {/* Large image left */}
                        <div className="flex-1 min-w-0 overflow-hidden rounded-lg">
                          <img src={item.images[0]} alt="" className="w-full h-full object-cover hover:brightness-90 transition-all" />
                        </div>
                        {/* Small images right in 2x2 grid */}
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

                {/* Add button between items */}
                {renderAddButton(index + 1)}
              </div>
            );
          })}
          </div>

          {/* Empty state */}
          {items.length === 0 && (
            <div className="text-center py-16 bg-white rounded-2xl border-2 border-dashed border-gray-200 mt-4">
              <div className="w-16 h-16 bg-orange-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Plus size={24} className="text-orange-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Begin met je reisopbouw</h3>
              <p className="text-sm text-gray-500 max-w-md mx-auto mb-6">
                Klik op het + teken hierboven om je eerste reisonderdeel toe te voegen.
                Kies uit vluchten, hotels, transfers, activiteiten en meer.
              </p>
              <div className="flex items-center justify-center gap-3">
                {OFFERTE_ITEM_TYPES.slice(0, 4).map(type => {
                  const Icon = iconMap[type.icon];
                  return (
                    <button
                      key={type.type}
                      onClick={() => handleAddItem(type.type, 0)}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 hover:border-gray-300 hover:shadow-sm transition-all text-sm"
                    >
                      <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ backgroundColor: type.bgColor }}>
                        {Icon && <Icon size={14} style={{ color: type.color }} />}
                      </div>
                      {type.label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Price summary — hidden for auto-rondreis (reis is geboekt) */}
          {items.length > 0 && priceDisplay !== 'hidden' && templateType !== 'auto-rondreis' && (
            <div className="mt-8 bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
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

                {/* Extra costs */}
                {extraCosts.length > 0 && (
                  <div className="border-t border-gray-100 pt-2 mt-2">
                    {extraCosts.map(ec => {
                      const ecTotal = ec.per_person ? ec.amount * numberOfTravelers : ec.amount;
                      return (
                        <div key={ec.id} className="flex items-center justify-between py-1.5 group">
                          <div className="flex items-center gap-3">
                            <div className="w-6 h-6 rounded-md flex items-center justify-center bg-gray-100">
                              <Plus size={12} className="text-gray-400" />
                            </div>
                            <span className="text-sm text-gray-600">{ec.label}</span>
                            {ec.per_person && <span className="text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">p.p.</span>}
                            {ec.apply_to_all && <span className="text-[10px] text-orange-500 bg-orange-50 px-1.5 py-0.5 rounded">alle reizen</span>}
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="text-right">
                              {(priceDisplay === 'total' || priceDisplay === 'both') && (
                                <span className="text-sm font-medium text-gray-900">€ {ecTotal.toLocaleString('nl-NL', { minimumFractionDigits: 2 })}</span>
                              )}
                              {(priceDisplay === 'per_person' || priceDisplay === 'both') && (
                                <div className="text-xs text-gray-500">€ {ec.amount.toLocaleString('nl-NL', { minimumFractionDigits: 2 })} p.p.</div>
                              )}
                            </div>
                            <button
                              onClick={() => { setEditingExtraCost(ec); setShowExtraCostPanel(true); }}
                              className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-gray-600 p-1 transition-opacity"
                            >
                              <ChevronDown size={14} />
                            </button>
                            <button
                              onClick={() => setExtraCosts(extraCosts.filter(c => c.id !== ec.id))}
                              className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 p-1 transition-opacity"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Add extra cost button */}
                <button
                  onClick={() => { setEditingExtraCost(null); setShowExtraCostPanel(true); }}
                  className="flex items-center gap-2 text-sm text-gray-500 hover:text-orange-600 py-2 transition-colors"
                >
                  <Plus size={14} />
                  Extra kosten toevoegen
                </button>

                <div className="border-t border-gray-200 pt-3 mt-1">
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
          )}
        </div>
      </div>

      {/* Sliding panel for editing items */}
      {editingItem && (
        <OfferteItemPanel
          item={editingItem.item}
          itemType={editingItem.type}
          onSave={handleSaveItem}
          onClose={() => setEditingItem(null)}
        />
      )}

      {/* Lightbox slideshow */}
      {lightboxImages.length > 0 && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center" onClick={() => setLightboxImages([])}>
          <button onClick={() => setLightboxImages([])} className="absolute top-4 right-4 text-white/80 hover:text-white p-2 z-10">
            <X size={28} />
          </button>
          {lightboxImages.length > 1 && (
            <>
              <button
                onClick={(e) => { e.stopPropagation(); setLightboxIndex((lightboxIndex - 1 + lightboxImages.length) % lightboxImages.length); }}
                className="absolute left-4 text-white/80 hover:text-white p-3 bg-black/30 rounded-full z-10"
              >
                <ArrowLeft size={24} />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); setLightboxIndex((lightboxIndex + 1) % lightboxImages.length); }}
                className="absolute right-4 text-white/80 hover:text-white p-3 bg-black/30 rounded-full z-10"
                style={{ right: '1rem' }}
              >
                <ArrowLeft size={24} className="rotate-180" />
              </button>
            </>
          )}
          <div className="max-w-5xl max-h-[85vh] px-16" onClick={(e) => e.stopPropagation()}>
            <img src={lightboxImages[lightboxIndex]} alt="" className="max-w-full max-h-[85vh] object-contain rounded-lg" />
          </div>
          {lightboxImages.length > 1 && (
            <div className="absolute bottom-6 text-white/60 text-sm">
              {lightboxIndex + 1} / {lightboxImages.length}
            </div>
          )}
        </div>
      )}

      {/* Detail Panel - Sliding from right */}
      {detailItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-end">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setDetailItem(null)}
          />
          
          {/* Panel */}
          <div className="relative w-full max-w-2xl h-full bg-white shadow-2xl overflow-y-auto animate-slide-in-right">
            {/* Header */}
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
              <button
                onClick={() => setDetailItem(null)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X size={20} className="text-gray-500" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6">
              {/* Photo Gallery */}
              {detailItem.images && detailItem.images.length > 0 ? (
                <div>
                  <div className="relative rounded-xl overflow-hidden">
                    <img 
                      src={detailItem.images[cardPhotoIdx[`detail-${detailItem.id}`] || 0] || detailItem.image_url} 
                      alt={detailItem.title} 
                      className="w-full h-72 object-cover cursor-pointer"
                      onClick={() => { setLightboxImages(detailItem.images!); setLightboxIndex(cardPhotoIdx[`detail-${detailItem.id}`] || 0); }}
                    />
                    {detailItem.images.length > 1 && (
                      <>
                        <button
                          onClick={() => setCardPhotoIdx(prev => {
                            const cur = prev[`detail-${detailItem.id}`] || 0;
                            return { ...prev, [`detail-${detailItem.id}`]: cur > 0 ? cur - 1 : detailItem.images!.length - 1 };
                          })}
                          className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/90 shadow-lg flex items-center justify-center hover:bg-white"
                        >
                          <ArrowLeft size={16} className="text-gray-700" />
                        </button>
                        <button
                          onClick={() => setCardPhotoIdx(prev => {
                            const cur = prev[`detail-${detailItem.id}`] || 0;
                            return { ...prev, [`detail-${detailItem.id}`]: cur < detailItem.images!.length - 1 ? cur + 1 : 0 };
                          })}
                          className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/90 shadow-lg flex items-center justify-center hover:bg-white"
                        >
                          <ArrowLeft size={16} className="text-gray-700 rotate-180" />
                        </button>
                        <div className="absolute bottom-3 right-3 px-2 py-1 bg-black/60 text-white text-xs rounded-full">
                          {(cardPhotoIdx[`detail-${detailItem.id}`] || 0) + 1} / {detailItem.images.length}
                        </div>
                      </>
                    )}
                  </div>
                  {/* Thumbnail strip */}
                  {detailItem.images.length > 1 && (
                    <div className="flex gap-2 mt-3 overflow-x-auto pb-1">
                      {detailItem.images.map((img, idx) => (
                        <div
                          key={idx}
                          onClick={() => setCardPhotoIdx(prev => ({ ...prev, [`detail-${detailItem.id}`]: idx }))}
                          className={`w-16 h-12 rounded-lg overflow-hidden cursor-pointer flex-shrink-0 border-2 transition-all ${
                            (cardPhotoIdx[`detail-${detailItem.id}`] || 0) === idx ? 'border-orange-500 shadow-md' : 'border-transparent opacity-70 hover:opacity-100'
                          }`}
                        >
                          <img src={img} alt="" className="w-full h-full object-cover" />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : detailItem.image_url ? (
                <div className="rounded-xl overflow-hidden">
                  <img src={detailItem.image_url} alt={detailItem.title} className="w-full h-72 object-cover" />
                </div>
              ) : null}

              {/* Basic Info */}
              <div className="space-y-3">
                {(detailItem.location || detailItem.subtitle) && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-500 mb-1">Locatie</h4>
                    <p className="text-gray-900">{typeof (detailItem.location || detailItem.subtitle) === 'object' ? ((detailItem.location || detailItem.subtitle) as any).name || '' : (detailItem.location || detailItem.subtitle)}</p>
                  </div>
                )}
                
                {detailItem.description && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-500 mb-1">Beschrijving</h4>
                    <p className="text-gray-700 leading-relaxed">{detailItem.description}</p>
                  </div>
                )}
              </div>

              {/* Details Grid */}
              <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-xl">
                {detailItem.date_start && (
                  <div>
                    <div className="text-xs text-gray-500 mb-1">Check-in</div>
                    <div className="text-sm font-medium text-gray-900">
                      {new Date(detailItem.date_start).toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </div>
                  </div>
                )}
                {detailItem.date_end && (
                  <div>
                    <div className="text-xs text-gray-500 mb-1">Check-out</div>
                    <div className="text-sm font-medium text-gray-900">
                      {new Date(detailItem.date_end).toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </div>
                  </div>
                )}
                {detailItem.nights && (
                  <div>
                    <div className="text-xs text-gray-500 mb-1">Nachten</div>
                    <div className="text-sm font-medium text-gray-900">{detailItem.nights} nachten</div>
                  </div>
                )}
                {detailItem.board_type && (
                  <div>
                    <div className="text-xs text-gray-500 mb-1">Maaltijden</div>
                    <div className="text-sm font-medium text-gray-900">{detailItem.board_type}</div>
                  </div>
                )}
                {detailItem.distance && (
                  <div>
                    <div className="text-xs text-gray-500 mb-1">Afstand</div>
                    <div className="text-sm font-medium text-orange-600 flex items-center gap-1">
                      <Car size={14} />
                      {detailItem.distance}
                    </div>
                  </div>
                )}
                {detailItem.room_type && (
                  <div>
                    <div className="text-xs text-gray-500 mb-1">Kamertype</div>
                    <div className="text-sm font-medium text-gray-900">{detailItem.room_type}</div>
                  </div>
                )}
              </div>

              {/* Facilities */}
              {detailItem.facilities && detailItem.facilities.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-gray-900 mb-3">Faciliteiten</h4>
                  <div className="flex flex-wrap gap-2">
                    {detailItem.facilities.map((facility, idx) => (
                      <span key={idx} className="px-3 py-1.5 bg-blue-50 text-blue-700 text-xs font-medium rounded-full">
                        {facility}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Supplier Info */}
              {detailItem.supplier && (
                <div className="p-4 bg-gray-50 rounded-xl">
                  <h4 className="text-sm font-medium text-gray-500 mb-2">Aanbieder</h4>
                  <p className="text-gray-900 font-medium">{detailItem.supplier}</p>
                  {detailItem.booking_reference && (
                    <p className="text-xs text-gray-500 mt-1">Referentie: {detailItem.booking_reference}</p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Media Selector for hero image/video */}
      <SlidingMediaSelector
        isOpen={showMediaSelector}
        onClose={() => setShowMediaSelector(false)}
        onSelect={(url) => {
          if (mediaSelectorMode === 'video' || url.includes('youtube.com/embed')) {
            setHeroVideo(url);
            setHeroImages([]);
          } else {
            setHeroImages(prev => [...prev, url]);
            setHeroSlideIndex(heroImages.length);
            setHeroVideo('');
          }
          setShowMediaSelector(false);
        }}
        title={mediaSelectorMode === 'photo' ? 'Kies Hero Foto' : 'Kies Hero Video'}
      />

      {/* Extra Cost Sliding Panel */}
      {showExtraCostPanel && (
        <>
          <div className="fixed inset-0 bg-black/30 z-40" onClick={() => setShowExtraCostPanel(false)} />
          <div className="fixed top-0 right-0 h-full w-[400px] bg-white shadow-2xl z-50 flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">
                {editingExtraCost ? 'Extra kosten bewerken' : 'Extra kosten toevoegen'}
              </h2>
              <button onClick={() => setShowExtraCostPanel(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X size={20} />
              </button>
            </div>
            <div className="flex-1 p-6 overflow-y-auto">
              <ExtraCostForm
                initial={editingExtraCost}
                onSave={(ec) => {
                  if (editingExtraCost) {
                    setExtraCosts(extraCosts.map(c => c.id === ec.id ? ec : c));
                  } else {
                    setExtraCosts([...extraCosts, ec]);
                  }
                  setShowExtraCostPanel(false);
                  setEditingExtraCost(null);
                }}
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
