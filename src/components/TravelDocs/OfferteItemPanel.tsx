import { useState } from 'react';
import { X, Star, Upload, Search } from 'lucide-react';
import { OfferteItem, OfferteItemType, OFFERTE_ITEM_TYPES } from '../../types/offerte';

interface Props {
  item: OfferteItem | null;
  itemType: OfferteItemType;
  onSave: (item: OfferteItem) => void;
  onClose: () => void;
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
    // Flight
    departure_airport: item?.departure_airport || '',
    arrival_airport: item?.arrival_airport || '',
    departure_time: item?.departure_time || '',
    arrival_time: item?.arrival_time || '',
    airline: item?.airline || '',
    flight_number: item?.flight_number || '',
    // Hotel
    hotel_name: item?.hotel_name || '',
    room_type: item?.room_type || '',
    board_type: item?.board_type || '',
    star_rating: item?.star_rating || undefined,
    // Transfer
    transfer_type: item?.transfer_type || '',
    pickup_location: item?.pickup_location || '',
    dropoff_location: item?.dropoff_location || '',
    // Activity
    activity_duration: item?.activity_duration || '',
    included_items: item?.included_items || [],
  });

  const [searchQuery, setSearchQuery] = useState('');

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

        {/* Search bar for hotels/activities */}
        {(itemType === 'hotel' || itemType === 'activity') && (
          <div className="px-6 py-3 border-b border-gray-100 bg-gray-50">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder={itemType === 'hotel' ? 'Zoek hotels op naam of locatie...' : 'Zoek activiteiten...'}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-orange-200 focus:border-orange-400 outline-none bg-white"
              />
            </div>
            {searchQuery && (
              <div className="mt-2 bg-white rounded-xl border border-gray-200 max-h-48 overflow-y-auto">
                <div className="p-4 text-center text-sm text-gray-500">
                  <p>Zoekresultaten komen hier</p>
                  <p className="text-xs text-gray-400 mt-1">API integratie volgt</p>
                </div>
              </div>
            )}
          </div>
        )}

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
