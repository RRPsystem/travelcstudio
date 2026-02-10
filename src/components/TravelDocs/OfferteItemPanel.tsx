import { useState, useCallback } from 'react';
import { X, Star, Upload, Search, Loader2, MapPin, Building2 } from 'lucide-react';
import { OfferteItem, OfferteItemType, OFFERTE_ITEM_TYPES } from '../../types/offerte';
import { supabase } from '../../lib/supabase';

interface Props {
  item: OfferteItem | null;
  itemType: OfferteItemType;
  onSave: (item: OfferteItem) => void;
  onClose: () => void;
}

interface TcSearchResult {
  type: string;
  id: string;
  name: string;
  stars?: number;
  location?: string;
  country?: string;
  description?: string;
  images?: string[];
  price?: number;
  currency?: string;
  roomType?: string;
  mealPlan?: string;
  provider?: string;
  subtitle?: string;
  duration?: number;
  durationType?: string;
  image?: string;
}

export function OfferteItemPanel({ item, itemType, onSave, onClose }: Props) {
  const typeConfig = OFFERTE_ITEM_TYPES.find(t => t.type === itemType)!;
  
  const [formData, setFormData] = useState<Partial<OfferteItem>>({
    type: itemType,
    title: item?.title || '',
    subtitle: item?.subtitle || '',
    description: item?.description || '',
    image_url: item?.image_url || '',
    location: item?.location || '',
    date_start: item?.date_start || '',
    date_end: item?.date_end || '',
    nights: item?.nights || undefined,
    price: item?.price || undefined,
    price_per_person: item?.price_per_person || undefined,
    supplier: item?.supplier || '',
    booking_reference: item?.booking_reference || '',
    departure_airport: item?.departure_airport || '',
    arrival_airport: item?.arrival_airport || '',
    departure_time: item?.departure_time || '',
    arrival_time: item?.arrival_time || '',
    airline: item?.airline || '',
    flight_number: item?.flight_number || '',
    hotel_name: item?.hotel_name || '',
    room_type: item?.room_type || '',
    board_type: item?.board_type || '',
    star_rating: item?.star_rating || undefined,
    transfer_type: item?.transfer_type || '',
    pickup_location: item?.pickup_location || '',
    dropoff_location: item?.dropoff_location || '',
    activity_duration: item?.activity_duration || '',
    included_items: item?.included_items || [],
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<TcSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [searchTimer, setSearchTimer] = useState<ReturnType<typeof setTimeout> | null>(null);

  const searchTC = useCallback(async (query: string) => {
    if (!query || query.length < 2 || !supabase) return;

    // Use dates from form, fallback to 30 days from now
    const checkIn = formData.date_start || new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0];
    const checkOut = formData.date_end || new Date(new Date(checkIn).getTime() + 3 * 86400000).toISOString().split('T')[0];
    
    setSearching(true);
    setSearchError(null);

    try {
      let action = '';
      let body: any = { micrositeId: '' };

      if (itemType === 'hotel') {
        action = 'search-accommodations';
        body = { ...body, action, destination: query, checkIn, checkOut, adults: 2 };
      } else if (itemType === 'activity') {
        action = 'search-tickets';
        body = { ...body, action, destination: query, checkIn, checkOut, adults: 2 };
      } else if (itemType === 'transfer') {
        action = 'search-transfers';
        body = { ...body, action, pickupDateTime: `${checkIn}T10:00:00`, adults: 2 };
      } else if (itemType === 'flight') {
        action = 'search-transports';
        body = { ...body, action, departure: query.split('-')[0]?.trim(), arrival: query.split('-')[1]?.trim() || query, departureDate: checkIn, adults: 2 };
      }

      if (!action) return;

      const { data, error } = await supabase.functions.invoke('search-travel-compositor', { body });

      if (error) throw error;
      if (data?.results) {
        setSearchResults(data.results.slice(0, 15));
      } else if (data?.error) {
        setSearchError(data.error);
      }
    } catch (err: any) {
      console.error('[TC Search] Error:', err);
      setSearchError('Zoeken mislukt. Probeer het opnieuw.');
    } finally {
      setSearching(false);
    }
  }, [itemType, formData.date_start, formData.date_end]);

  const handleSearchInput = (value: string) => {
    setSearchQuery(value);
    if (searchTimer) clearTimeout(searchTimer);
    if (value.length >= 2) {
      const timer = setTimeout(() => searchTC(value), 600);
      setSearchTimer(timer);
    } else {
      setSearchResults([]);
    }
  };

  const selectSearchResult = (result: TcSearchResult) => {
    const updates: Partial<OfferteItem> = {
      title: result.name,
      description: result.description || '',
      image_url: result.images?.[0] || result.image || '',
      location: [result.location, result.country].filter(Boolean).join(', '),
      price: result.price || undefined,
      supplier: result.provider || '',
    };

    if (result.type === 'hotel') {
      updates.hotel_name = result.name;
      updates.star_rating = result.stars || undefined;
      updates.room_type = result.roomType || '';
      updates.board_type = result.mealPlan || '';
    } else if (result.type === 'flight') {
      updates.subtitle = result.subtitle || '';
    } else if (result.type === 'activity') {
      if (result.duration && result.durationType) {
        updates.activity_duration = `${result.duration} ${result.durationType.toLowerCase()}`;
      }
    }

    setFormData(prev => ({ ...prev, ...updates }));
    setSearchResults([]);
    setSearchQuery('');
  };

  const update = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    const saved: OfferteItem = {
      id: item?.id || crypto.randomUUID(),
      type: itemType,
      title: formData.title || typeConfig.label,
      subtitle: formData.subtitle,
      description: formData.description,
      image_url: formData.image_url,
      location: formData.location,
      date_start: formData.date_start,
      date_end: formData.date_end,
      nights: formData.nights,
      price: formData.price,
      price_per_person: formData.price_per_person,
      supplier: formData.supplier,
      booking_reference: formData.booking_reference,
      departure_airport: formData.departure_airport,
      arrival_airport: formData.arrival_airport,
      departure_time: formData.departure_time,
      arrival_time: formData.arrival_time,
      airline: formData.airline,
      flight_number: formData.flight_number,
      hotel_name: formData.hotel_name,
      room_type: formData.room_type,
      board_type: formData.board_type,
      star_rating: formData.star_rating,
      transfer_type: formData.transfer_type,
      pickup_location: formData.pickup_location,
      dropoff_location: formData.dropoff_location,
      activity_duration: formData.activity_duration,
      included_items: formData.included_items,
      sort_order: item?.sort_order ?? 0,
    };
    onSave(saved);
  };

  const renderFlightFields = () => (
    <>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Vertrek luchthaven</label>
          <input type="text" value={formData.departure_airport} onChange={e => update('departure_airport', e.target.value)} placeholder="AMS" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-200 focus:border-blue-400 outline-none" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Aankomst luchthaven</label>
          <input type="text" value={formData.arrival_airport} onChange={e => update('arrival_airport', e.target.value)} placeholder="JFK" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-200 focus:border-blue-400 outline-none" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Vertrektijd</label>
          <input type="time" value={formData.departure_time} onChange={e => update('departure_time', e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-200 focus:border-blue-400 outline-none" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Aankomsttijd</label>
          <input type="time" value={formData.arrival_time} onChange={e => update('arrival_time', e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-200 focus:border-blue-400 outline-none" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Luchtvaartmaatschappij</label>
          <input type="text" value={formData.airline} onChange={e => update('airline', e.target.value)} placeholder="KLM" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-200 focus:border-blue-400 outline-none" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Vluchtnummer</label>
          <input type="text" value={formData.flight_number} onChange={e => update('flight_number', e.target.value)} placeholder="KL644" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-200 focus:border-blue-400 outline-none" />
        </div>
      </div>
    </>
  );

  const renderHotelFields = () => (
    <>
      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1">Hotelnaam</label>
        <input type="text" value={formData.hotel_name} onChange={e => update('hotel_name', e.target.value)} placeholder="Hotel naam" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-200 focus:border-blue-400 outline-none" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Kamertype</label>
          <input type="text" value={formData.room_type} onChange={e => update('room_type', e.target.value)} placeholder="Deluxe Double" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-200 focus:border-blue-400 outline-none" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Aantal nachten</label>
          <input type="number" value={formData.nights || ''} onChange={e => update('nights', parseInt(e.target.value) || undefined)} placeholder="3" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-200 focus:border-blue-400 outline-none" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Arrangement</label>
          <select value={formData.board_type} onChange={e => update('board_type', e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-200 focus:border-blue-400 outline-none">
            <option value="">Selecteer...</option>
            <option value="RO">Room Only</option>
            <option value="BB">Bed & Breakfast</option>
            <option value="HB">Halfpension</option>
            <option value="FB">Volpension</option>
            <option value="AI">All Inclusive</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Sterren</label>
          <div className="flex items-center gap-1 mt-1">
            {[1, 2, 3, 4, 5].map(star => (
              <button key={star} onClick={() => update('star_rating', star)} className="focus:outline-none">
                <Star size={20} className={`transition-colors ${(formData.star_rating || 0) >= star ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`} />
              </button>
            ))}
          </div>
        </div>
      </div>
    </>
  );

  const renderTransferFields = () => (
    <>
      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1">Type transfer</label>
        <select value={formData.transfer_type} onChange={e => update('transfer_type', e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-200 focus:border-blue-400 outline-none">
          <option value="">Selecteer...</option>
          <option value="private">Privé transfer</option>
          <option value="shared">Gedeelde transfer</option>
          <option value="self-drive">Zelf rijden</option>
        </select>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Ophaallocatie</label>
          <input type="text" value={formData.pickup_location} onChange={e => update('pickup_location', e.target.value)} placeholder="Luchthaven" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-200 focus:border-blue-400 outline-none" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Afzetlocatie</label>
          <input type="text" value={formData.dropoff_location} onChange={e => update('dropoff_location', e.target.value)} placeholder="Hotel" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-200 focus:border-blue-400 outline-none" />
        </div>
      </div>
    </>
  );

  const renderActivityFields = () => (
    <>
      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1">Duur</label>
        <input type="text" value={formData.activity_duration} onChange={e => update('activity_duration', e.target.value)} placeholder="Halve dag, 3 uur, etc." className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-200 focus:border-blue-400 outline-none" />
      </div>
    </>
  );

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/30 z-40" onClick={onClose} />
      
      {/* Panel */}
      <div className="fixed right-0 top-0 h-full w-[480px] bg-white shadow-2xl z-50 flex flex-col animate-slide-in-right">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: typeConfig.bgColor }}>
              <span style={{ color: typeConfig.color }} className="text-sm font-bold">{typeConfig.label[0]}</span>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">{item ? 'Bewerk' : 'Voeg toe'}: {typeConfig.label}</h3>
              <p className="text-xs text-gray-500">Vul de details in of zoek</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        {/* Search bar - TC zoekmachine */}
        <div className="px-6 py-3 border-b border-gray-100 bg-gray-50">
          {/* Date inputs for search context */}
          <div className="flex items-center gap-2 mb-2">
            <div className="flex-1">
              <input
                type="date"
                value={formData.date_start || ''}
                onChange={e => update('date_start', e.target.value)}
                className="w-full px-2.5 py-1.5 border border-gray-200 rounded-lg text-xs focus:ring-2 focus:ring-orange-200 focus:border-orange-400 outline-none bg-white"
                placeholder="Check-in"
              />
            </div>
            <span className="text-xs text-gray-400">→</span>
            <div className="flex-1">
              <input
                type="date"
                value={formData.date_end || ''}
                onChange={e => update('date_end', e.target.value)}
                className="w-full px-2.5 py-1.5 border border-gray-200 rounded-lg text-xs focus:ring-2 focus:ring-orange-200 focus:border-orange-400 outline-none bg-white"
                placeholder="Check-out"
              />
            </div>
          </div>

          {/* Search input */}
          <div className="relative">
            {searching ? (
              <Loader2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-orange-500 animate-spin" />
            ) : (
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            )}
            <input
              type="text"
              value={searchQuery}
              onChange={e => handleSearchInput(e.target.value)}
              placeholder={
                itemType === 'hotel' ? 'Zoek hotels op bestemming (bv. "Barcelona")...' :
                itemType === 'activity' ? 'Zoek activiteiten op bestemming...' :
                itemType === 'flight' ? 'Zoek vluchten (bv. "AMS - BCN")...' :
                itemType === 'transfer' ? 'Zoek transfers...' :
                'Zoek in Travel Compositor...'
              }
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-orange-200 focus:border-orange-400 outline-none bg-white"
            />
          </div>

          {/* Hint when no dates */}
          {!formData.date_start && !searchQuery && (
            <p className="mt-1.5 text-[11px] text-gray-400">Vul eerst datums in voor prijzen, of zoek direct op bestemming</p>
          )}

          {/* Search error */}
          {searchError && (
            <p className="mt-2 text-xs text-red-500">{searchError}</p>
          )}

          {/* Search results */}
          {searchResults.length > 0 && (
            <div className="mt-2 bg-white rounded-xl border border-gray-200 max-h-64 overflow-y-auto divide-y divide-gray-100">
              {searchResults.map((result) => (
                <button
                  key={result.id}
                  onClick={() => selectSearchResult(result)}
                  className="w-full flex items-start gap-3 p-3 hover:bg-orange-50 transition-colors text-left"
                >
                  {/* Thumbnail */}
                  <div className="w-14 h-14 rounded-lg overflow-hidden bg-gray-100 shrink-0">
                    {(result.images?.[0] || result.image) ? (
                      <img src={result.images?.[0] || result.image} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Building2 size={16} className="text-gray-300" />
                      </div>
                    )}
                  </div>
                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1">
                      <span className="font-medium text-sm text-gray-900 truncate">{result.name}</span>
                      {result.stars && result.stars > 0 && (
                        <span className="flex items-center shrink-0">
                          {Array.from({ length: result.stars }).map((_, i) => (
                            <Star key={i} size={10} className="text-yellow-400 fill-yellow-400" />
                          ))}
                        </span>
                      )}
                    </div>
                    {(result.location || result.country) && (
                      <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                        <MapPin size={10} />
                        {[result.location, result.country].filter(Boolean).join(', ')}
                      </p>
                    )}
                    {result.description && (
                      <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{result.description}</p>
                    )}
                  </div>
                  {/* Price */}
                  {result.price !== undefined && result.price > 0 && (
                    <div className="shrink-0 text-right">
                      <span className="text-sm font-semibold text-orange-600">€ {result.price.toLocaleString('nl-NL')}</span>
                      {result.provider && <p className="text-[10px] text-gray-400">{result.provider}</p>}
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}

          {/* Searching indicator */}
          {searching && searchResults.length === 0 && (
            <div className="mt-2 bg-white rounded-xl border border-gray-200 p-4 text-center">
              <Loader2 className="w-5 h-5 text-orange-500 animate-spin mx-auto mb-1" />
              <p className="text-xs text-gray-500">Zoeken in Travel Compositor...</p>
            </div>
          )}
        </div>

        {/* Form */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {/* Common fields */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Titel</label>
            <input type="text" value={formData.title} onChange={e => update('title', e.target.value)} placeholder={typeConfig.label} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-200 focus:border-blue-400 outline-none" />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Subtitel</label>
            <input type="text" value={formData.subtitle} onChange={e => update('subtitle', e.target.value)} placeholder="Optionele subtitel" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-200 focus:border-blue-400 outline-none" />
          </div>

          {/* Type-specific fields */}
          {itemType === 'flight' && renderFlightFields()}
          {itemType === 'hotel' && renderHotelFields()}
          {itemType === 'transfer' && renderTransferFields()}
          {itemType === 'activity' && renderActivityFields()}

          {/* Common date fields */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Startdatum</label>
              <input type="date" value={formData.date_start} onChange={e => update('date_start', e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-200 focus:border-blue-400 outline-none" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Einddatum</label>
              <input type="date" value={formData.date_end} onChange={e => update('date_end', e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-200 focus:border-blue-400 outline-none" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Locatie</label>
            <input type="text" value={formData.location} onChange={e => update('location', e.target.value)} placeholder="Stad, land" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-200 focus:border-blue-400 outline-none" />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Beschrijving</label>
            <textarea value={formData.description} onChange={e => update('description', e.target.value)} rows={3} placeholder="Optionele beschrijving..." className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-200 focus:border-blue-400 outline-none resize-none" />
          </div>

          {/* Image */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Afbeelding</label>
            {formData.image_url ? (
              <div className="relative rounded-xl overflow-hidden">
                <img src={formData.image_url} alt="" className="w-full h-32 object-cover" />
                <button onClick={() => update('image_url', '')} className="absolute top-2 right-2 bg-black/50 text-white p-1 rounded-lg hover:bg-black/70">
                  <X size={14} />
                </button>
              </div>
            ) : (
              <div className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center hover:border-gray-300 transition-colors cursor-pointer">
                <Upload size={20} className="mx-auto text-gray-400 mb-2" />
                <p className="text-xs text-gray-500">Sleep een afbeelding of klik om te uploaden</p>
              </div>
            )}
            <input type="text" value={formData.image_url} onChange={e => update('image_url', e.target.value)} placeholder="Of plak een URL..." className="w-full mt-2 px-3 py-2 border border-gray-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-200 focus:border-blue-400 outline-none" />
          </div>

          {/* Pricing */}
          <div className="border-t border-gray-100 pt-4">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Prijs</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Totaalprijs</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">€</span>
                  <input type="number" value={formData.price || ''} onChange={e => update('price', parseFloat(e.target.value) || undefined)} placeholder="0.00" className="w-full pl-7 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-200 focus:border-blue-400 outline-none" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Per persoon</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">€</span>
                  <input type="number" value={formData.price_per_person || ''} onChange={e => update('price_per_person', parseFloat(e.target.value) || undefined)} placeholder="0.00" className="w-full pl-7 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-200 focus:border-blue-400 outline-none" />
                </div>
              </div>
            </div>
          </div>

          {/* Supplier / Booking ref */}
          <div className="border-t border-gray-100 pt-4">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Leverancier</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Leverancier</label>
                <input type="text" value={formData.supplier} onChange={e => update('supplier', e.target.value)} placeholder="Naam leverancier" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-200 focus:border-blue-400 outline-none" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Boekingsreferentie</label>
                <input type="text" value={formData.booking_reference} onChange={e => update('booking_reference', e.target.value)} placeholder="REF-123" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-200 focus:border-blue-400 outline-none" />
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors">
            Annuleren
          </button>
          <button onClick={handleSave} className="px-6 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-sm font-medium transition-colors shadow-sm">
            {item ? 'Opslaan' : 'Toevoegen'}
          </button>
        </div>
      </div>
    </>
  );
}
