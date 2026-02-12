import { useState, useEffect } from 'react';
import { X, Plus, GripVertical, Trash2, MapPin, Hotel, Calendar, Save, Eye, ChevronDown, ChevronUp } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../lib/supabase';

interface RoadbookDay {
  day: number;
  date?: string;
  location: string;
  hotel?: {
    name: string;
    address?: string;
    nights?: number;
  };
  activities: string[];
  description?: string;
}

interface RoadbookEditorProps {
  roadbookId?: string;
  onClose: () => void;
  onSave: () => void;
}

export function RoadbookEditor({ roadbookId, onClose, onSave }: RoadbookEditorProps) {
  const { user } = useAuth();
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [clientName, setClientName] = useState('');
  const [days, setDays] = useState<RoadbookDay[]>([
    { day: 1, location: '', activities: [], description: '' }
  ]);
  const [destinations, setDestinations] = useState<string[]>([]);
  const [newDestination, setNewDestination] = useState('');
  const [saving, setSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [expandedDays, setExpandedDays] = useState<Set<number>>(new Set([0]));

  useEffect(() => {
    if (roadbookId) {
      loadRoadbook();
    }
  }, [roadbookId]);

  const loadRoadbook = async () => {
    if (!db.supabase || !roadbookId) return;
    try {
      const { data, error } = await db.supabase
        .from('travel_roadbooks')
        .select('*')
        .eq('id', roadbookId)
        .single();

      if (error) throw error;
      if (data) {
        setTitle(data.title);
        setSubtitle(data.subtitle || '');
        setClientName(data.client_name);
        setDays(data.days || []);
        setDestinations(data.destinations || []);
      }
    } catch (error) {
      console.error('Error loading roadbook:', error);
    }
  };

  const handleSave = async () => {
    if (!db.supabase || !user?.brand_id) return;
    if (!title.trim() || !clientName.trim()) {
      alert('Vul minimaal een titel en klantnaam in');
      return;
    }

    setSaving(true);
    try {
      const roadbookData = {
        brand_id: user.brand_id,
        title: title.trim(),
        subtitle: subtitle.trim() || null,
        client_name: clientName.trim(),
        days: days.filter(d => d.location.trim()),
        destinations: destinations.filter(d => d.trim()),
        updated_at: new Date().toISOString(),
      };

      if (roadbookId) {
        // Update existing
        const { error } = await db.supabase
          .from('travel_roadbooks')
          .update(roadbookData)
          .eq('id', roadbookId);
        if (error) throw error;
      } else {
        // Create new
        const { error } = await db.supabase
          .from('travel_roadbooks')
          .insert({ ...roadbookData, created_at: new Date().toISOString() });
        if (error) throw error;
      }

      onSave();
      onClose();
    } catch (error) {
      console.error('Error saving roadbook:', error);
      alert('Fout bij opslaan');
    } finally {
      setSaving(false);
    }
  };

  const addDay = () => {
    setDays([...days, { 
      day: days.length + 1, 
      location: '', 
      activities: [], 
      description: '' 
    }]);
    setExpandedDays(new Set([...expandedDays, days.length]));
  };

  const removeDay = (index: number) => {
    const newDays = days.filter((_, i) => i !== index);
    // Re-number days
    newDays.forEach((day, i) => { day.day = i + 1; });
    setDays(newDays);
  };

  const updateDay = (index: number, field: keyof RoadbookDay, value: any) => {
    const newDays = [...days];
    newDays[index] = { ...newDays[index], [field]: value };
    setDays(newDays);
  };

  const addActivity = (dayIndex: number) => {
    const newDays = [...days];
    newDays[dayIndex].activities.push('');
    setDays(newDays);
  };

  const updateActivity = (dayIndex: number, activityIndex: number, value: string) => {
    const newDays = [...days];
    newDays[dayIndex].activities[activityIndex] = value;
    setDays(newDays);
  };

  const removeActivity = (dayIndex: number, activityIndex: number) => {
    const newDays = [...days];
    newDays[dayIndex].activities.splice(activityIndex, 1);
    setDays(newDays);
  };

  const addDestination = () => {
    if (newDestination.trim()) {
      setDestinations([...destinations, newDestination.trim()]);
      setNewDestination('');
    }
  };

  const removeDestination = (index: number) => {
    setDestinations(destinations.filter((_, i) => i !== index));
  };

  const toggleDayExpanded = (index: number) => {
    const newExpanded = new Set(expandedDays);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedDays(newExpanded);
  };

  if (showPreview) {
    return (
      <RoadbookPreview
        title={title}
        subtitle={subtitle}
        clientName={clientName}
        days={days}
        destinations={destinations}
        onClose={() => setShowPreview(false)}
      />
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 overflow-y-auto">
      <div className="min-h-screen p-6">
        <div className="max-w-5xl mx-auto">
          <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-emerald-600 to-teal-600 px-8 py-6 text-white">
              <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold">
                  {roadbookId ? 'Roadbook Bewerken' : 'Nieuw Roadbook'}
                </h1>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setShowPreview(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
                  >
                    <Eye className="w-4 h-4" />
                    Preview
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex items-center gap-2 px-4 py-2 bg-white text-emerald-600 hover:bg-gray-100 rounded-lg transition-colors font-medium disabled:opacity-50"
                  >
                    <Save className="w-4 h-4" />
                    {saving ? 'Opslaan...' : 'Opslaan'}
                  </button>
                  <button
                    onClick={onClose}
                    className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>

            <div className="p-8">
              {/* Basic Info */}
              <div className="mb-8 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Titel *
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Bijvoorbeeld: Rondreis door Thailand"
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Ondertitel
                  </label>
                  <input
                    type="text"
                    value={subtitle}
                    onChange={(e) => setSubtitle(e.target.value)}
                    placeholder="Bijvoorbeeld: 14 dagen cultuur en natuur"
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Klantnaam *
                  </label>
                  <input
                    type="text"
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    placeholder="Voor wie is dit roadbook?"
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Destinations */}
              <div className="mb-8">
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Bestemmingen
                </label>
                <div className="flex gap-2 mb-3">
                  <input
                    type="text"
                    value={newDestination}
                    onChange={(e) => setNewDestination(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && addDestination()}
                    placeholder="Voeg bestemming toe..."
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  />
                  <button
                    onClick={addDestination}
                    className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
                  >
                    <Plus className="w-5 h-5" />
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {destinations.map((dest, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-lg"
                    >
                      <MapPin className="w-4 h-4" />
                      <span className="text-sm font-medium">{dest}</span>
                      <button
                        onClick={() => removeDestination(index)}
                        className="text-emerald-600 hover:text-emerald-800"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Days */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-4">
                  <label className="text-sm font-medium text-gray-700">
                    Dag-tot-dag Programma
                  </label>
                  <button
                    onClick={addDay}
                    className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors text-sm"
                  >
                    <Plus className="w-4 h-4" />
                    Dag Toevoegen
                  </button>
                </div>

                <div className="space-y-3">
                  {days.map((day, dayIndex) => (
                    <div
                      key={dayIndex}
                      className="bg-white border-2 border-gray-200 rounded-xl overflow-hidden"
                    >
                      {/* Day Header */}
                      <div
                        className="bg-gradient-to-r from-blue-50 to-purple-50 px-4 py-3 flex items-center justify-between cursor-pointer"
                        onClick={() => toggleDayExpanded(dayIndex)}
                      >
                        <div className="flex items-center gap-3">
                          <GripVertical className="w-5 h-5 text-gray-400" />
                          <Calendar className="w-5 h-5 text-blue-600" />
                          <span className="font-semibold text-gray-900">
                            Dag {day.day}
                          </span>
                          {day.location && (
                            <span className="text-sm text-gray-600">
                              - {day.location}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              removeDay(dayIndex);
                            }}
                            className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                          {expandedDays.has(dayIndex) ? (
                            <ChevronUp className="w-5 h-5 text-gray-400" />
                          ) : (
                            <ChevronDown className="w-5 h-5 text-gray-400" />
                          )}
                        </div>
                      </div>

                      {/* Day Content */}
                      {expandedDays.has(dayIndex) && (
                        <div className="p-4 space-y-4">
                          {/* Location */}
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">
                              Locatie *
                            </label>
                            <input
                              type="text"
                              value={day.location}
                              onChange={(e) => updateDay(dayIndex, 'location', e.target.value)}
                              placeholder="Bijvoorbeeld: Bangkok"
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm"
                            />
                          </div>

                          {/* Date */}
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">
                              Datum (optioneel)
                            </label>
                            <input
                              type="text"
                              value={day.date || ''}
                              onChange={(e) => updateDay(dayIndex, 'date', e.target.value)}
                              placeholder="Bijvoorbeeld: 15 maart 2026"
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm"
                            />
                          </div>

                          {/* Hotel */}
                          <div className="bg-blue-50 rounded-lg p-3">
                            <div className="flex items-center gap-2 mb-2">
                              <Hotel className="w-4 h-4 text-blue-600" />
                              <span className="text-xs font-medium text-gray-700">Hotel</span>
                            </div>
                            <div className="space-y-2">
                              <input
                                type="text"
                                value={day.hotel?.name || ''}
                                onChange={(e) => updateDay(dayIndex, 'hotel', { ...day.hotel, name: e.target.value })}
                                placeholder="Hotelnaam"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                              />
                              <input
                                type="text"
                                value={day.hotel?.address || ''}
                                onChange={(e) => updateDay(dayIndex, 'hotel', { ...day.hotel, address: e.target.value })}
                                placeholder="Adres"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                              />
                              <input
                                type="number"
                                value={day.hotel?.nights || ''}
                                onChange={(e) => updateDay(dayIndex, 'hotel', { ...day.hotel, nights: parseInt(e.target.value) || 0 })}
                                placeholder="Aantal nachten"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                              />
                            </div>
                          </div>

                          {/* Activities */}
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <label className="text-xs font-medium text-gray-600">
                                Activiteiten
                              </label>
                              <button
                                onClick={() => addActivity(dayIndex)}
                                className="text-xs text-emerald-600 hover:text-emerald-700 font-medium"
                              >
                                + Activiteit
                              </button>
                            </div>
                            <div className="space-y-2">
                              {day.activities.map((activity, actIndex) => (
                                <div key={actIndex} className="flex gap-2">
                                  <input
                                    type="text"
                                    value={activity}
                                    onChange={(e) => updateActivity(dayIndex, actIndex, e.target.value)}
                                    placeholder="Bijvoorbeeld: Bezoek aan Grand Palace"
                                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm"
                                  />
                                  <button
                                    onClick={() => removeActivity(dayIndex, actIndex)}
                                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                  >
                                    <X className="w-4 h-4" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Description */}
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">
                              Beschrijving
                            </label>
                            <textarea
                              value={day.description || ''}
                              onChange={(e) => updateDay(dayIndex, 'description', e.target.value)}
                              placeholder="Extra informatie over deze dag..."
                              rows={3}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Preview component (reuse from TravelDocsRoadbook.tsx but with props)
function RoadbookPreview({ title, subtitle, clientName, days, destinations, onClose }: any) {
  const [currentDay, setCurrentDay] = useState(0);

  useEffect(() => {
    if (days.length > 1) {
      const interval = setInterval(() => {
        setCurrentDay((prev) => (prev + 1) % days.length);
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [days.length]);

  return (
    <div className="fixed inset-0 bg-black/50 z-50 overflow-y-auto">
      <div className="min-h-screen p-6">
        <div className="max-w-5xl mx-auto">
          <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-emerald-600 to-teal-600 px-8 py-6 text-white">
              <div className="flex items-center justify-between mb-4">
                <h1 className="text-3xl font-bold">{title || 'Roadbook Preview'}</h1>
                <button
                  onClick={onClose}
                  className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
                >
                  Terug naar Editor
                </button>
              </div>
              {subtitle && <p className="text-emerald-100">{subtitle}</p>}
              {clientName && <p className="text-emerald-100 mt-2">Voor: {clientName}</p>}
            </div>

            <div className="p-8">
              {/* Route Overview with Car Animation */}
              {days.length > 0 && (
                <div className="bg-white rounded-2xl shadow-xl p-6 mb-6 border border-gray-200">
                  <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
                    <MapPin className="w-6 h-6 mr-2 text-blue-600" />
                    Jouw Route
                  </h2>
                  
                  {/* Animated Route Line */}
                  <div className="relative py-8">
                    <div className="absolute top-1/2 left-0 right-0 h-2 bg-gray-200 rounded-full transform -translate-y-1/2">
                      <div 
                        className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full transition-all duration-1000"
                        style={{ width: `${((currentDay + 1) / Math.max(days.length, 1)) * 100}%` }}
                      />
                    </div>
                    
                    {/* Route Points */}
                    <div className="relative flex justify-between">
                      {days.map((day: any, index: number) => (
                        <div key={index} className="flex flex-col items-center">
                          <div 
                            className={`w-12 h-12 rounded-full flex items-center justify-center z-10 transition-all duration-300 ${
                              index <= currentDay 
                                ? 'bg-gradient-to-br from-blue-500 to-purple-500 text-white scale-110' 
                                : 'bg-white border-2 border-gray-300 text-gray-500'
                            }`}
                          >
                            {index === currentDay ? (
                              <svg className="w-6 h-6 animate-bounce" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z"/>
                              </svg>
                            ) : (
                              <span className="font-bold">{index + 1}</span>
                            )}
                          </div>
                          <span className={`mt-2 text-sm font-medium ${index <= currentDay ? 'text-gray-900' : 'text-gray-500'}`}>
                            {day.location || `Dag ${index + 1}`}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Day by Day Itinerary */}
              <div className="space-y-4">
                {days.map((day: any, index: number) => (
                  <div 
                    key={index}
                    className={`bg-white rounded-xl shadow-lg overflow-hidden transition-all duration-300 border ${
                      index === currentDay ? 'ring-2 ring-orange-500 scale-[1.02] border-orange-200' : 'border-gray-200'
                    }`}
                  >
                    <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                            <Calendar className="w-5 h-5 text-white" />
                          </div>
                          <div>
                            <h3 className="text-lg font-bold text-white">Dag {day.day}</h3>
                            {day.date && <p className="text-white/80 text-sm">{day.date}</p>}
                          </div>
                        </div>
                        <div className="flex items-center space-x-2 text-white">
                          <MapPin className="w-5 h-5" />
                          <span className="font-medium">{day.location}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="p-6">
                      {/* Hotel Info */}
                      {day.hotel?.name && (
                        <div className="flex items-start space-x-3 mb-4 p-4 bg-blue-50 rounded-lg">
                          <Hotel className="w-6 h-6 text-blue-600 flex-shrink-0 mt-1" />
                          <div>
                            <h4 className="font-semibold text-gray-900">{day.hotel.name}</h4>
                            {day.hotel.address && <p className="text-sm text-gray-600">{day.hotel.address}</p>}
                            {day.hotel.nights && <p className="text-sm text-blue-600">{day.hotel.nights} nacht(en)</p>}
                          </div>
                        </div>
                      )}
                      
                      {/* Activities */}
                      {day.activities && day.activities.length > 0 && day.activities.some((a: string) => a.trim()) && (
                        <div className="space-y-2 mb-4">
                          <h4 className="font-semibold text-gray-900 mb-2">Activiteiten</h4>
                          {day.activities.filter((a: string) => a.trim()).map((activity: string, actIndex: number) => (
                            <div key={actIndex} className="flex items-center space-x-2 text-gray-700">
                              <svg className="w-4 h-4 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                              </svg>
                              <span>{activity}</span>
                            </div>
                          ))}
                        </div>
                      )}
                      
                      {/* Description */}
                      {day.description && (
                        <p className="text-gray-600">{day.description}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Destinations */}
              {destinations.length > 0 && (
                <div className="mt-6 bg-white rounded-2xl shadow-xl p-6 border border-gray-200">
                  <h2 className="text-xl font-bold text-gray-900 mb-4">Bestemmingen</h2>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {destinations.map((dest: string, index: number) => (
                      <div key={index} className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg p-4 text-center">
                        <MapPin className="w-6 h-6 text-blue-600 mx-auto mb-2" />
                        <span className="font-medium text-gray-900">{dest}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
