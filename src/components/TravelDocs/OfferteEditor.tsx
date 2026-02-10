import { useState, useRef } from 'react';
import {
  ArrowLeft, Save, Send, Eye, MapPin, Plus, GripVertical, X,
  Plane, Car, Building2, Compass, CarFront, Ship, Train, Shield, StickyNote,
  ChevronDown, ChevronUp, Image, Video, FileDown, Star, Users, Calendar, Euro
} from 'lucide-react';
import { Offerte, OfferteItem, OfferteItemType, OfferteDestination, OFFERTE_ITEM_TYPES } from '../../types/offerte';
import { OfferteItemTypeSelector } from './OfferteItemTypeSelector';
import { OfferteItemPanel } from './OfferteItemPanel';

const iconMap: Record<string, React.ComponentType<any>> = {
  Plane, Car, Building2, Compass, CarFront, Ship, Train, Shield, StickyNote,
};

interface Props {
  offerte?: Offerte;
  onBack: () => void;
  onSave?: (offerte: Offerte) => void;
}

export function OfferteEditor({ offerte, onBack, onSave }: Props) {
  const [title, setTitle] = useState(offerte?.title || '');
  const [subtitle, setSubtitle] = useState(offerte?.subtitle || '');
  const [introText, setIntroText] = useState(offerte?.intro_text || '');
  const [heroImage, setHeroImage] = useState(offerte?.hero_image_url || '');
  const [heroVideo, setHeroVideo] = useState(offerte?.hero_video_url || '');
  const [clientName, setClientName] = useState(offerte?.client_name || '');
  const [clientEmail, setClientEmail] = useState(offerte?.client_email || '');
  const [clientPhone, setClientPhone] = useState(offerte?.client_phone || '');
  const [travelCompositorId, setTravelCompositorId] = useState(offerte?.travel_compositor_id || '');
  const [numberOfTravelers, setNumberOfTravelers] = useState(offerte?.number_of_travelers || 2);
  const [currency] = useState(offerte?.currency || 'EUR');
  const [validUntil, setValidUntil] = useState(offerte?.valid_until || '');
  const [internalNotes, setInternalNotes] = useState(offerte?.internal_notes || '');
  const [destinations, setDestinations] = useState<OfferteDestination[]>(offerte?.destinations || []);

  const [items, setItems] = useState<OfferteItem[]>(offerte?.items || []);
  const [addMenuIndex, setAddMenuIndex] = useState<number | null>(null);
  const [editingItem, setEditingItem] = useState<{ item: OfferteItem | null; type: OfferteItemType; index: number } | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  const heroInputRef = useRef<HTMLInputElement>(null);

  const totalPrice = items.reduce((sum, item) => sum + (item.price || 0), 0);
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
      hero_image_url: heroImage || undefined,
      hero_video_url: heroVideo || undefined,
      destinations,
      items,
      total_price: totalPrice,
      price_per_person: pricePerPerson,
      number_of_travelers: numberOfTravelers,
      currency,
      status: offerte?.status || 'draft',
      valid_until: validUntil || undefined,
      internal_notes: internalNotes || undefined,
      created_at: offerte?.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    onSave?.(data);
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
              placeholder="Naam van de offerte..."
              className="text-lg font-bold text-gray-900 border-none outline-none bg-transparent placeholder:text-gray-300 w-80"
            />
            <div className="flex items-center gap-3 text-xs text-gray-500">
              <span className="flex items-center gap-1"><Users size={12} /> {clientName || 'Geen klant'}</span>
              <span>·</span>
              <span>{items.length} items</span>
              <span>·</span>
              <span className="font-medium text-orange-600">€ {totalPrice.toLocaleString('nl-NL', { minimumFractionDigits: 2 })}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowSettings(!showSettings)} className="px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors flex items-center gap-2">
            {showSettings ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            Instellingen
          </button>
          <button className="px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors flex items-center gap-2">
            <Eye size={16} />
            Preview
          </button>
          <button onClick={handleSave} className="px-4 py-2 text-sm bg-gray-900 hover:bg-gray-800 text-white rounded-lg transition-colors flex items-center gap-2">
            <Save size={16} />
            Opslaan
          </button>
          <button className="px-4 py-2 text-sm bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition-colors flex items-center gap-2">
            <Send size={16} />
            Versturen
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
              <label className="block text-xs font-medium text-gray-500 mb-1">Travel Compositor ID</label>
              <input type="text" value={travelCompositorId} onChange={e => setTravelCompositorId(e.target.value)} placeholder="TC-12345" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-orange-200 focus:border-orange-400 outline-none" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Geldig tot</label>
              <input type="date" value={validUntil} onChange={e => setValidUntil(e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-orange-200 focus:border-orange-400 outline-none" />
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
          {/* Background image/video */}
          {heroVideo ? (
            <video
              src={heroVideo}
              autoPlay
              muted
              loop
              playsInline
              className="absolute inset-0 w-full h-full object-cover"
            />
          ) : heroImage ? (
            <img
              src={heroImage}
              alt=""
              className="absolute inset-0 w-full h-full object-cover"
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-slate-800 via-slate-700 to-slate-900" />
          )}

          {/* Dark overlay on left side */}
          <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/50 to-transparent" />

          {/* Upload controls (top right) */}
          <div className="absolute top-4 right-4 z-10 flex items-center gap-2">
            <input ref={heroInputRef} type="file" accept="image/*" className="hidden" onChange={e => {
              const file = e.target.files?.[0];
              if (file) {
                const url = URL.createObjectURL(file);
                setHeroImage(url);
              }
            }} />
            <button onClick={() => heroInputRef.current?.click()} className="px-3 py-2 bg-white/20 backdrop-blur-sm hover:bg-white/30 text-white rounded-lg text-xs font-medium transition-colors flex items-center gap-2">
              <Image size={14} />
              Foto
            </button>
            <button onClick={() => {
              const url = prompt('Plak video URL (YouTube, Vimeo, of direct):');
              if (url) setHeroVideo(url);
            }} className="px-3 py-2 bg-white/20 backdrop-blur-sm hover:bg-white/30 text-white rounded-lg text-xs font-medium transition-colors flex items-center gap-2">
              <Video size={14} />
              Video
            </button>
            {heroImage && (
              <input
                type="text"
                value={heroImage}
                onChange={e => setHeroImage(e.target.value)}
                placeholder="Afbeelding URL..."
                className="px-3 py-2 bg-white/20 backdrop-blur-sm text-white placeholder:text-white/50 rounded-lg text-xs w-64 outline-none focus:bg-white/30"
              />
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

            {/* Right side - price summary card */}
            <div className="w-1/2 p-10 flex items-end justify-end">
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/10 min-w-[280px]">
                <div className="text-sm text-white/60 mb-1">Vanaf</div>
                <div className="text-3xl font-bold text-white mb-1">
                  € {pricePerPerson.toLocaleString('nl-NL', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                </div>
                <div className="text-sm text-white/60 mb-4">per persoon</div>
                <div className="border-t border-white/10 pt-3 space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-white/60">Totaal ({numberOfTravelers} pers.)</span>
                    <span className="text-white font-medium">€ {totalPrice.toLocaleString('nl-NL', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-white/60">Items</span>
                    <span className="text-white/80">{items.length}</span>
                  </div>
                  {validUntil && (
                    <div className="flex justify-between text-sm">
                      <span className="text-white/60">Geldig tot</span>
                      <span className="text-white/80">{new Date(validUntil).toLocaleDateString('nl-NL')}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

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

          {/* Items list */}
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
                            <p className="text-xs text-gray-400 mt-1 line-clamp-2">{item.description}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-2 shrink-0 ml-4">
                          {item.price !== undefined && item.price > 0 && (
                            <span className="text-sm font-semibold text-gray-900 flex items-center gap-0.5">
                              <Euro size={12} className="text-gray-400" />
                              {item.price.toLocaleString('nl-NL', { minimumFractionDigits: 2 })}
                            </span>
                          )}
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

                  {/* Image strip */}
                  {item.image_url && (
                    <div className="px-4 pb-3 ml-14">
                      <img src={item.image_url} alt="" className="w-full h-24 object-cover rounded-lg" />
                    </div>
                  )}
                </div>

                {/* Add button between items */}
                {renderAddButton(index + 1)}
              </div>
            );
          })}

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

          {/* Price summary */}
          {items.length > 0 && (
            <div className="mt-8 bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Prijsoverzicht</h3>
              <div className="space-y-2">
                {items.filter(i => i.price && i.price > 0).map(item => {
                  const config = getItemConfig(item.type);
                  return (
                    <div key={item.id} className="flex items-center justify-between py-2">
                      <div className="flex items-center gap-3">
                        <div className="w-6 h-6 rounded-md flex items-center justify-center" style={{ backgroundColor: config.bgColor }}>
                          {getItemIcon(item.type)}
                        </div>
                        <span className="text-sm text-gray-700">{item.title}</span>
                      </div>
                      <span className="text-sm font-medium text-gray-900">€ {item.price!.toLocaleString('nl-NL', { minimumFractionDigits: 2 })}</span>
                    </div>
                  );
                })}
                <div className="border-t border-gray-200 pt-3 mt-3">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-gray-900">Totaal</span>
                    <span className="text-xl font-bold text-gray-900">€ {totalPrice.toLocaleString('nl-NL', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-sm text-gray-500">Per persoon ({numberOfTravelers} reizigers)</span>
                    <span className="text-sm font-medium text-orange-600">€ {pricePerPerson.toLocaleString('nl-NL', { minimumFractionDigits: 2 })}</span>
                  </div>
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
    </div>
  );
}
