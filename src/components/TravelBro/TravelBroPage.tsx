import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { ClientInterface } from './ClientInterface';
import { 
  Map, MessageCircle, Smartphone, Loader, Car, Hotel, Calendar, 
  MapPin, ChevronRight, ExternalLink
} from 'lucide-react';

interface TravelBroPageProps {
  shareToken: string;
}

interface TripData {
  id: string;
  name: string;
  parsed_data: any;
  brand_id: string;
  share_token: string;
}

type TabType = 'roadbook' | 'chat' | 'whatsapp';

export function TravelBroPage({ shareToken }: TravelBroPageProps) {
  const [trip, setTrip] = useState<TripData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('roadbook');
  const [whatsappNumber, setWhatsappNumber] = useState<string | null>(null);

  useEffect(() => {
    loadTrip();
  }, [shareToken]);

  const loadTrip = async () => {
    try {
      const { data, error } = await supabase
        .from('travel_trips')
        .select('*')
        .eq('share_token', shareToken)
        .maybeSingle();

      if (error) throw error;
      if (data) {
        setTrip(data);
        // Load WhatsApp number for QR code
        loadWhatsAppNumber(data.brand_id);
      }
    } catch (err) {
      console.error('Error loading trip:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadWhatsAppNumber = async (brandId: string) => {
    try {
      const { data } = await supabase
        .from('api_settings')
        .select('twilio_whatsapp_number')
        .or(`brand_id.eq.${brandId},provider.eq.system`)
        .order('brand_id', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (data?.twilio_whatsapp_number) {
        setWhatsappNumber(data.twilio_whatsapp_number);
      }
    } catch (err) {
      console.error('Error loading WhatsApp number:', err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900 flex items-center justify-center">
        <div className="text-center text-white">
          <Loader className="w-12 h-12 animate-spin mx-auto mb-4" />
          <p>Je reis wordt geladen...</p>
        </div>
      </div>
    );
  }

  if (!trip) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900 flex items-center justify-center">
        <div className="text-center text-white">
          <h1 className="text-2xl font-bold mb-2">Reis niet gevonden</h1>
          <p className="text-gray-300">Deze reis is niet beschikbaar</p>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'roadbook' as TabType, label: 'Roadbook', icon: Map },
    { id: 'chat' as TabType, label: 'TravelBro', icon: MessageCircle },
    { id: 'whatsapp' as TabType, label: 'WhatsApp', icon: Smartphone },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900">
      {/* Header */}
      <header className="bg-white/10 backdrop-blur-md border-b border-white/20">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center">
                <Car className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">{trip.name}</h1>
                <p className="text-sm text-white/70">Jouw persoonlijke reisassistent</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Tab Navigation */}
      <nav className="bg-white/5 backdrop-blur-sm border-b border-white/10">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex space-x-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 px-6 py-4 font-medium transition-all ${
                  activeTab === tab.id
                    ? 'text-white border-b-2 border-orange-500 bg-white/10'
                    : 'text-white/60 hover:text-white hover:bg-white/5'
                }`}
              >
                <tab.icon className="w-5 h-5" />
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* Tab Content */}
      <main className="max-w-6xl mx-auto">
        {activeTab === 'roadbook' && <RoadbookTab trip={trip} />}
        {activeTab === 'chat' && (
          <div className="bg-white min-h-[calc(100vh-140px)]">
            <ClientInterface shareToken={shareToken} />
          </div>
        )}
        {activeTab === 'whatsapp' && <WhatsAppTab trip={trip} whatsappNumber={whatsappNumber} />}
      </main>
    </div>
  );
}

function RoadbookTab({ trip }: { trip: TripData }) {
  const parsedData = trip.parsed_data || {};
  const itinerary = parsedData.itinerary || [];
  const hotels = parsedData.hotels || [];
  const destinations = parsedData.destinations || [];

  // Animation state for the car
  const [currentDay, setCurrentDay] = useState(0);

  useEffect(() => {
    if (itinerary.length > 1) {
      const interval = setInterval(() => {
        setCurrentDay((prev) => (prev + 1) % itinerary.length);
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [itinerary.length]);

  return (
    <div className="p-6">
      {/* Route Overview with Car Animation */}
      <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
          <Map className="w-6 h-6 mr-2 text-blue-600" />
          Jouw Route
        </h2>
        
        {/* Animated Route Line */}
        <div className="relative py-8">
          <div className="absolute top-1/2 left-0 right-0 h-2 bg-gray-200 rounded-full transform -translate-y-1/2">
            <div 
              className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full transition-all duration-1000"
              style={{ width: `${((currentDay + 1) / Math.max(itinerary.length, 1)) * 100}%` }}
            />
          </div>
          
          {/* Route Points */}
          <div className="relative flex justify-between">
            {itinerary.length > 0 ? itinerary.map((day: any, index: number) => (
              <div key={index} className="flex flex-col items-center">
                <div 
                  className={`w-12 h-12 rounded-full flex items-center justify-center z-10 transition-all duration-300 ${
                    index <= currentDay 
                      ? 'bg-gradient-to-br from-blue-500 to-purple-500 text-white scale-110' 
                      : 'bg-white border-2 border-gray-300 text-gray-500'
                  }`}
                >
                  {index === currentDay ? (
                    <Car className="w-6 h-6 animate-bounce" />
                  ) : (
                    <span className="font-bold">{index + 1}</span>
                  )}
                </div>
                <span className={`mt-2 text-sm font-medium ${index <= currentDay ? 'text-gray-900' : 'text-gray-500'}`}>
                  {day.location || day.city || `Dag ${index + 1}`}
                </span>
              </div>
            )) : (
              <div className="text-center w-full text-gray-500">
                <p>Geen route informatie beschikbaar</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Day by Day Itinerary */}
      <div className="space-y-4">
        {itinerary.length > 0 ? itinerary.map((day: any, index: number) => (
          <div 
            key={index}
            className={`bg-white rounded-xl shadow-lg overflow-hidden transition-all duration-300 ${
              index === currentDay ? 'ring-2 ring-orange-500 scale-[1.02]' : ''
            }`}
          >
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                    <Calendar className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">Dag {index + 1}</h3>
                    <p className="text-white/80 text-sm">{day.date || ''}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2 text-white">
                  <MapPin className="w-5 h-5" />
                  <span className="font-medium">{day.location || day.city || 'Onderweg'}</span>
                </div>
              </div>
            </div>
            
            <div className="p-6">
              {/* Hotel Info */}
              {day.hotel && (
                <div className="flex items-start space-x-3 mb-4 p-4 bg-blue-50 rounded-lg">
                  <Hotel className="w-6 h-6 text-blue-600 flex-shrink-0 mt-1" />
                  <div>
                    <h4 className="font-semibold text-gray-900">{day.hotel.name || day.hotel}</h4>
                    {day.hotel.address && <p className="text-sm text-gray-600">{day.hotel.address}</p>}
                    {day.hotel.nights && <p className="text-sm text-blue-600">{day.hotel.nights} nacht(en)</p>}
                  </div>
                </div>
              )}
              
              {/* Activities */}
              {day.activities && day.activities.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-semibold text-gray-900 mb-2">Activiteiten</h4>
                  {day.activities.map((activity: string, actIndex: number) => (
                    <div key={actIndex} className="flex items-center space-x-2 text-gray-700">
                      <ChevronRight className="w-4 h-4 text-orange-500" />
                      <span>{activity}</span>
                    </div>
                  ))}
                </div>
              )}
              
              {/* Description */}
              {day.description && (
                <p className="text-gray-600 mt-4">{day.description}</p>
              )}
            </div>
          </div>
        )) : (
          /* Fallback: Show hotels if no itinerary */
          hotels.length > 0 ? hotels.map((hotel: any, index: number) => (
            <div key={index} className="bg-white rounded-xl shadow-lg p-6">
              <div className="flex items-start space-x-3">
                <Hotel className="w-6 h-6 text-blue-600 flex-shrink-0" />
                <div>
                  <h3 className="font-bold text-gray-900">{hotel.name}</h3>
                  {hotel.city && <p className="text-gray-600">{hotel.city}</p>}
                  {hotel.nights && <p className="text-sm text-blue-600">{hotel.nights} nacht(en)</p>}
                  {hotel.meal_plan && <p className="text-sm text-green-600">{hotel.meal_plan}</p>}
                </div>
              </div>
            </div>
          )) : (
            <div className="bg-white rounded-xl shadow-lg p-8 text-center">
              <Map className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Roadbook wordt voorbereid</h3>
              <p className="text-gray-600">De reisdetails worden binnenkort toegevoegd.</p>
              <p className="text-sm text-gray-500 mt-2">Gebruik de TravelBro chat om vragen te stellen!</p>
            </div>
          )
        )}
      </div>

      {/* Destinations */}
      {destinations.length > 0 && (
        <div className="mt-6 bg-white rounded-2xl shadow-xl p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Bestemmingen</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {destinations.map((dest: any, index: number) => (
              <div key={index} className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg p-4 text-center">
                <MapPin className="w-6 h-6 text-blue-600 mx-auto mb-2" />
                <span className="font-medium text-gray-900">{typeof dest === 'string' ? dest : dest.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function WhatsAppTab({ trip, whatsappNumber }: { trip: TripData; whatsappNumber: string | null }) {
  const whatsappLink = whatsappNumber 
    ? `https://wa.me/${whatsappNumber.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(`Hoi! Ik heb een vraag over mijn reis: ${trip.name}`)}`
    : null;

  const qrCodeUrl = whatsappLink 
    ? `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(whatsappLink)}`
    : null;

  return (
    <div className="p-6">
      <div className="max-w-md mx-auto">
        <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
          <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-6">
            <Smartphone className="w-8 h-8 text-white" />
          </div>
          
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Chat via WhatsApp</h2>
          <p className="text-gray-600 mb-6">
            Scan de QR code of klik op de knop om TravelBro te openen in WhatsApp
          </p>

          {qrCodeUrl ? (
            <>
              <div className="bg-gray-50 rounded-xl p-4 mb-6 inline-block">
                <img 
                  src={qrCodeUrl} 
                  alt="WhatsApp QR Code" 
                  className="w-48 h-48 mx-auto"
                />
              </div>

              <a
                href={whatsappLink || '#'}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center space-x-2 w-full bg-green-500 hover:bg-green-600 text-white font-semibold py-4 px-6 rounded-xl transition-colors"
              >
                <Smartphone className="w-5 h-5" />
                <span>Open in WhatsApp</span>
                <ExternalLink className="w-4 h-4" />
              </a>

              <p className="text-sm text-gray-500 mt-4">
                WhatsApp nummer: {whatsappNumber}
              </p>
            </>
          ) : (
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
              <p className="text-yellow-800">
                WhatsApp is nog niet geconfigureerd voor deze reis.
              </p>
            </div>
          )}
        </div>

        <div className="mt-6 bg-white/10 backdrop-blur-sm rounded-xl p-4 text-white/80 text-sm">
          <h3 className="font-semibold text-white mb-2">💡 Tip</h3>
          <p>
            Via WhatsApp kun je ook spraakberichten en foto's sturen naar TravelBro!
          </p>
        </div>
      </div>
    </div>
  );
}

export default TravelBroPage;
