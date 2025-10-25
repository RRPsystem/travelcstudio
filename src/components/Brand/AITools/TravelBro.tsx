import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { supabase } from '../../../lib/supabase';
import { Plus, Upload, Link as LinkIcon, Eye, Trash2, Copy, Check, FileText, Users, MessageSquare, Phone, Send } from 'lucide-react';

interface Trip {
  id: string;
  name: string;
  pdf_url: string | null;
  parsed_data: any;
  source_urls: string[];
  share_token: string;
  is_active: boolean;
  intake_template: any;
  whatsapp_number: string | null;
  whatsapp_enabled: boolean;
  whatsapp_welcome_message: string | null;
  created_at: string;
}

export function TravelBro() {
  const { user } = useAuth();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewTrip, setShowNewTrip] = useState(false);
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  useEffect(() => {
    loadTrips();
  }, []);

  const loadTrips = async () => {
    try {
      const { data, error } = await supabase
        .from('travel_trips')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTrips(data || []);
    } catch (error) {
      console.error('Error loading trips:', error);
    } finally {
      setLoading(false);
    }
  };

  const copyShareLink = (token: string) => {
    const baseUrl = import.meta.env.VITE_APP_URL || window.location.origin;
    const link = `${baseUrl}/travel/${token}`;
    navigator.clipboard.writeText(link);
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(null), 2000);
  };

  const toggleTripStatus = async (trip: Trip) => {
    try {
      const { error } = await supabase
        .from('travel_trips')
        .update({ is_active: !trip.is_active })
        .eq('id', trip.id);

      if (error) throw error;
      loadTrips();
    } catch (error) {
      console.error('Error updating trip:', error);
    }
  };

  const deleteTrip = async (tripId: string) => {
    if (!confirm('Weet je zeker dat je deze reis wilt verwijderen?')) return;

    try {
      const { error } = await supabase
        .from('travel_trips')
        .delete()
        .eq('id', tripId);

      if (error) throw error;
      loadTrips();
    } catch (error) {
      console.error('Error deleting trip:', error);
    }
  };

  if (showNewTrip) {
    return <NewTripForm onBack={() => { setShowNewTrip(false); loadTrips(); }} />;
  }

  if (selectedTrip) {
    return <TripDetails trip={selectedTrip} onBack={() => { setSelectedTrip(null); loadTrips(); }} />;
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">TravelBRO Trips</h2>
          <p className="text-gray-600 mt-1">Maak en beheer AI-gestuurde reis assistenten</p>
        </div>
        <button
          onClick={() => setShowNewTrip(true)}
          className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
          style={{ backgroundColor: '#ff7700' }}
        >
          <Plus size={20} />
          <span>Nieuwe Trip</span>
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto"></div>
        </div>
      ) : trips.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm border p-12 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #ff7700, #ffaa44)' }}>
            <FileText className="w-8 h-8 text-white" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Nog geen trips</h3>
          <p className="text-gray-600 mb-6">Maak je eerste TravelBRO trip aan</p>
          <button
            onClick={() => setShowNewTrip(true)}
            className="bg-orange-600 hover:bg-orange-700 text-white px-6 py-3 rounded-lg inline-flex items-center space-x-2 transition-colors"
            style={{ backgroundColor: '#ff7700' }}
          >
            <Plus size={20} />
            <span>Nieuwe Trip</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {trips.map((trip) => (
            <div key={trip.id} className="bg-white rounded-lg shadow-sm border overflow-hidden hover:shadow-md transition-shadow">
              <div className="h-32" style={{ background: 'linear-gradient(135deg, #ff7700, #ffaa44)' }}>
                <div className="p-4 flex justify-between items-start">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${trip.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                    {trip.is_active ? 'Actief' : 'Inactief'}
                  </span>
                </div>
              </div>
              <div className="p-4">
                <h3 className="font-semibold text-gray-900 mb-2 truncate">{trip.name}</h3>
                <div className="space-y-2 mb-4">
                  <div className="flex items-center text-sm text-gray-600">
                    <FileText size={14} className="mr-2" />
                    <span>{trip.pdf_url ? 'PDF uploaded' : 'Geen PDF'}</span>
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
                    <LinkIcon size={14} className="mr-2" />
                    <span>{trip.source_urls.length} URLs</span>
                  </div>
                </div>

                <div className="flex items-center space-x-2 mb-3">
                  <button
                    onClick={() => copyShareLink(trip.share_token)}
                    className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-2 rounded text-sm flex items-center justify-center space-x-1 transition-colors"
                  >
                    {copiedToken === trip.share_token ? (
                      <>
                        <Check size={14} />
                        <span>Gekopieerd!</span>
                      </>
                    ) : (
                      <>
                        <Copy size={14} />
                        <span>Kopieer link</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="flex space-x-2">
                  <button
                    onClick={() => setSelectedTrip(trip)}
                    className="flex-1 text-white py-2 px-3 rounded text-sm hover:bg-orange-700 transition-colors"
                    style={{ backgroundColor: '#ff7700' }}
                  >
                    Beheer
                  </button>
                  <button
                    onClick={() => toggleTripStatus(trip)}
                    className="p-2 text-gray-600 hover:text-gray-900 border border-gray-300 rounded"
                    title={trip.is_active ? 'Deactiveren' : 'Activeren'}
                  >
                    <Eye size={16} />
                  </button>
                  <button
                    onClick={() => deleteTrip(trip.id)}
                    className="p-2 text-red-600 hover:text-red-900 border border-gray-300 rounded"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function NewTripForm({ onBack }: { onBack: () => void }) {
  const { user } = useAuth();
  const [name, setName] = useState('');
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [sourceUrls, setSourceUrls] = useState<string[]>(['']);
  const [uploading, setUploading] = useState(false);
  const [parsedData, setParsedData] = useState<any>(null);

  const handlePdfUpload = async (file: File) => {
    setPdfFile(file);
    setUploading(true);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `trips/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('travel-documents')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('travel-documents')
        .getPublicUrl(filePath);

      await parsePdfWithOpenAI(publicUrl);
    } catch (error) {
      console.error('Error uploading PDF:', error);
      alert('Fout bij uploaden van PDF');
    } finally {
      setUploading(false);
    }
  };

  const parsePdfWithOpenAI = async (pdfUrl: string) => {
    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/parse-trip-pdf`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ pdfUrl }),
      });

      const data = await response.json();
      setParsedData(data);
    } catch (error) {
      console.error('Error parsing PDF:', error);
    }
  };

  const addUrlField = () => {
    setSourceUrls([...sourceUrls, '']);
  };

  const updateUrl = (index: number, value: string) => {
    const updated = [...sourceUrls];
    updated[index] = value;
    setSourceUrls(updated);
  };

  const removeUrl = (index: number) => {
    setSourceUrls(sourceUrls.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      const validUrls = sourceUrls.filter(url => url.trim() !== '');

      const { error } = await supabase
        .from('travel_trips')
        .insert({
          brand_id: user?.brand_id,
          name: name.trim(),
          pdf_url: pdfFile ? `trips/${pdfFile.name}` : null,
          parsed_data: parsedData || {},
          source_urls: validUrls,
          created_by: user?.id,
        });

      if (error) throw error;
      onBack();
    } catch (error) {
      console.error('Error creating trip:', error);
      alert('Fout bij aanmaken van trip');
    }
  };

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <button
        onClick={onBack}
        className="mb-4 text-gray-600 hover:text-gray-900 flex items-center space-x-2"
      >
        <span>← Terug</span>
      </button>

      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Nieuwe TravelBRO Trip</h2>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Trip Naam *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              placeholder="Bijv: Rondreis Thailand 2025"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Reis PDF Upload
            </label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-orange-500 transition-colors">
              {uploading ? (
                <div className="py-4">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600 mx-auto"></div>
                  <p className="text-sm text-gray-600 mt-2">PDF wordt verwerkt...</p>
                </div>
              ) : pdfFile ? (
                <div className="py-4">
                  <FileText className="w-8 h-8 text-green-600 mx-auto mb-2" />
                  <p className="text-sm font-medium text-gray-900">{pdfFile.name}</p>
                  <button
                    type="button"
                    onClick={() => setPdfFile(null)}
                    className="text-sm text-red-600 hover:text-red-700 mt-2"
                  >
                    Verwijder
                  </button>
                </div>
              ) : (
                <div className="py-4">
                  <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-600 mb-2">Sleep PDF hier of klik om te uploaden</p>
                  <input
                    type="file"
                    accept=".pdf"
                    onChange={(e) => e.target.files?.[0] && handlePdfUpload(e.target.files[0])}
                    className="hidden"
                    id="pdf-upload"
                  />
                  <label
                    htmlFor="pdf-upload"
                    className="inline-block bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg cursor-pointer transition-colors"
                    style={{ backgroundColor: '#ff7700' }}
                  >
                    Selecteer PDF
                  </label>
                </div>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Extra Bron URL's
            </label>
            <div className="space-y-2">
              {sourceUrls.map((url, index) => (
                <div key={index} className="flex space-x-2">
                  <input
                    type="url"
                    value={url}
                    onChange={(e) => updateUrl(index, e.target.value)}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    placeholder="https://example.com/reisinfo"
                  />
                  {sourceUrls.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeUrl(index)}
                      className="p-2 text-red-600 hover:text-red-700 border border-gray-300 rounded-lg"
                    >
                      <Trash2 size={20} />
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={addUrlField}
                className="text-orange-600 hover:text-orange-700 text-sm flex items-center space-x-1"
              >
                <Plus size={16} />
                <span>Voeg URL toe</span>
              </button>
            </div>
          </div>

          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={onBack}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Annuleer
            </button>
            <button
              type="submit"
              className="flex-1 bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg transition-colors"
              style={{ backgroundColor: '#ff7700' }}
              disabled={!name.trim()}
            >
              Maak Trip Aan
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function TripDetails({ trip, onBack }: { trip: Trip; onBack: () => void }) {
  const [activeTab, setActiveTab] = useState<'settings' | 'invite' | 'conversations'>('settings');
  const [intakes, setIntakes] = useState<any[]>([]);
  const [conversations, setConversations] = useState<any[]>([]);
  const [whatsappSessions, setWhatsappSessions] = useState<any[]>([]);
  const [newUrls, setNewUrls] = useState<string[]>(['']);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    loadIntakes();
    loadConversations();
    loadWhatsAppSessions();
  }, []);

  const loadIntakes = async () => {
    const { data } = await supabase
      .from('travel_intakes')
      .select('*')
      .eq('trip_id', trip.id)
      .order('created_at', { ascending: false });

    setIntakes(data || []);
  };

  const loadConversations = async () => {
    const { data } = await supabase
      .from('travel_conversations')
      .select('*')
      .eq('trip_id', trip.id)
      .order('created_at', { ascending: false });

    setConversations(data || []);
  };

  const loadWhatsAppSessions = async () => {
    const { data } = await supabase
      .from('travel_whatsapp_sessions')
      .select('*')
      .eq('trip_id', trip.id)
      .order('created_at', { ascending: false });

    setWhatsappSessions(data || []);
  };

  const handleAddUrls = async () => {
    const validUrls = newUrls.filter(url => url.trim() !== '');
    if (validUrls.length === 0) return;

    try {
      const updatedUrls = [...trip.source_urls, ...validUrls];
      const { error } = await supabase
        .from('travel_trips')
        .update({ source_urls: updatedUrls })
        .eq('id', trip.id);

      if (error) throw error;
      alert('URLs toegevoegd!');
      onBack();
    } catch (error) {
      console.error('Error adding URLs:', error);
      alert('Fout bij toevoegen van URLs');
    }
  };

  const handlePdfUpload = async (file: File) => {
    setUploading(true);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `trips/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('travel-documents')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { error } = await supabase
        .from('travel_trips')
        .update({ pdf_url: filePath })
        .eq('id', trip.id);

      if (error) throw error;
      alert('PDF geüpload!');
      onBack();
    } catch (error) {
      console.error('Error uploading PDF:', error);
      alert('Fout bij uploaden van PDF');
    } finally {
      setUploading(false);
    }
  };

  const baseUrl = import.meta.env.VITE_APP_URL || window.location.origin;
  const shareLink = `${baseUrl}/travel/${trip.share_token}`;

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <button
        onClick={onBack}
        className="mb-4 text-gray-600 hover:text-gray-900 flex items-center space-x-2"
      >
        <span>← Terug</span>
      </button>

      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        <div className="h-32" style={{ background: 'linear-gradient(135deg, #ff7700, #ffaa44)' }}>
          <div className="p-6">
            <h2 className="text-2xl font-bold text-white">{trip.name}</h2>
          </div>
        </div>

        <div className="p-6">
          <div className="mb-6 bg-gray-50 p-4 rounded-lg">
            <p className="text-sm text-gray-600 mb-2">Klant Link:</p>
            <div className="flex space-x-2">
              <input
                type="text"
                value={shareLink}
                readOnly
                className="flex-1 px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm"
              />
              <button
                onClick={() => {
                  navigator.clipboard.writeText(shareLink);
                  alert('Link gekopieerd!');
                }}
                className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2"
                style={{ backgroundColor: '#ff7700' }}
              >
                <Copy size={16} />
                <span>Kopieer</span>
              </button>
            </div>
          </div>

          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-6">
            <h3 className="font-semibold text-orange-900 mb-2">Hoe werkt TravelBRO?</h3>
            <ol className="text-sm text-orange-800 space-y-1 list-decimal list-inside">
              <li><strong>Stap 1:</strong> Upload reis-PDF en voeg extra informatie toe (Instellingen)</li>
              <li><strong>Stap 2:</strong> Stuur WhatsApp uitnodiging naar je klant (Klant Uitnodigen)</li>
              <li><strong>Stap 3:</strong> Klant vult intake in en kan direct chatten (Gesprekken)</li>
            </ol>
          </div>

          <div className="border-b border-gray-200 mb-6">
            <nav className="flex space-x-8">
              <button
                onClick={() => setActiveTab('settings')}
                className={`pb-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                  activeTab === 'settings'
                    ? 'border-orange-600 text-orange-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <span className="bg-orange-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs mr-1">1</span>
                <span>Instellingen</span>
              </button>
              <button
                onClick={() => setActiveTab('invite')}
                className={`pb-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                  activeTab === 'invite'
                    ? 'border-orange-600 text-orange-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <span className="bg-orange-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs mr-1">2</span>
                <Send size={16} />
                <span>Klant Uitnodigen</span>
              </button>
              <button
                onClick={() => setActiveTab('conversations')}
                className={`pb-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                  activeTab === 'conversations'
                    ? 'border-orange-600 text-orange-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <span className="bg-orange-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs mr-1">3</span>
                <MessageSquare size={16} />
                <span>Gesprekken ({whatsappSessions.length})</span>
              </button>
            </nav>
          </div>

          {activeTab === 'settings' && (
            <div className="space-y-6">
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-semibold text-gray-900">Reis Informatie</h3>
                  <label className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg text-sm cursor-pointer transition-colors">
                    Upload PDF
                    <input
                      type="file"
                      accept=".pdf"
                      className="hidden"
                      onChange={(e) => e.target.files?.[0] && handlePdfUpload(e.target.files[0])}
                      disabled={uploading}
                    />
                  </label>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm font-medium text-gray-700 mb-1">PDF Status:</p>
                  <p className="text-sm text-gray-600">
                    {trip.pdf_url ? '✓ PDF geüpload' : 'Geen PDF geüpload'}
                  </p>
                  {uploading && <p className="text-sm text-orange-600 mt-2">Uploaden en verwerken...</p>}
                </div>
              </div>

              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h3 className="font-semibold text-gray-900 mb-4">Extra Bron URL's</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Voeg websites toe met informatie over de bestemming (hotel sites, activiteiten, restaurants, etc.)
                </p>
                {trip.source_urls.length > 0 && (
                  <div className="mb-4">
                    <p className="text-xs font-medium text-gray-700 mb-2">Huidige URLs:</p>
                    <ul className="space-y-1">
                      {trip.source_urls.map((url, index) => (
                        <li key={index} className="text-sm text-blue-600 hover:underline">
                          <a href={url} target="_blank" rel="noopener noreferrer">{url}</a>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                <div className="space-y-2">
                  <p className="text-sm font-medium text-gray-700">Nieuwe URL toevoegen:</p>
                  {newUrls.map((url, index) => (
                    <div key={index} className="flex space-x-2">
                      <input
                        type="url"
                        value={url}
                        onChange={(e) => {
                          const updated = [...newUrls];
                          updated[index] = e.target.value;
                          setNewUrls(updated);
                        }}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                        placeholder="https://example.com"
                      />
                      {index === newUrls.length - 1 && (
                        <button
                          onClick={() => setNewUrls([...newUrls, ''])}
                          className="px-3 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50"
                        >
                          +
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    onClick={handleAddUrls}
                    className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg text-sm"
                    style={{ backgroundColor: '#ff7700' }}
                  >
                    URLs Opslaan
                  </button>
                </div>
              </div>

              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h3 className="font-semibold text-gray-900 mb-4">Reizigers Voorinvullen (optioneel)</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Vul alvast de namen en leeftijden in van de reizigers. Je klanten hoeven dan alleen nog hun voorkeuren aan te vullen.
                </p>
                <IntakeTemplateEditor trip={trip} onSave={() => loadTrip()} />
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-semibold text-blue-900 mb-2">WhatsApp Setup (éénmalig)</h3>
                <p className="text-sm text-blue-800 mb-3">
                  Vraag de Operator om Twilio WhatsApp credentials in te stellen in API Settings.
                  Dit hoeft maar 1x voor het hele systeem.
                </p>
                <p className="text-xs text-blue-700">
                  💡 Na setup kun je direct klanten uitnodigen via de "Klant Uitnodigen" tab.
                </p>
              </div>
            </div>
          )}

          {activeTab === 'conversations' && (
            <WhatsAppConversationsView sessions={whatsappSessions} />
          )}

          {activeTab === 'invite' && (
            <InviteClient trip={trip} />
          )}
        </div>
      </div>
    </div>
  );
}

function IntakeTemplateEditor({ trip, onSave }: { trip: Trip; onSave: () => void }) {
  const [travelers, setTravelers] = useState<any[]>(
    trip.intake_template?.travelers || [{ name: '', age: '' }]
  );
  const [saving, setSaving] = useState(false);

  const addTraveler = () => {
    setTravelers([...travelers, { name: '', age: '' }]);
  };

  const updateTraveler = (index: number, field: string, value: any) => {
    const updated = [...travelers];
    updated[index][field] = value;
    setTravelers(updated);
  };

  const removeTraveler = (index: number) => {
    if (travelers.length > 1) {
      setTravelers(travelers.filter((_, i) => i !== index));
    }
  };

  const handleSave = async () => {
    setSaving(true);

    try {
      const { error } = await supabase
        .from('travel_trips')
        .update({
          intake_template: { travelers },
        })
        .eq('id', trip.id);

      if (error) throw error;
      alert('Reizigers opgeslagen! Je klanten zullen deze info al vooringevuld zien.');
      onSave();
    } catch (error) {
      console.error('Error saving template:', error);
      alert('Fout bij opslaan');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-900 mb-2">
          <strong>Voorinvullen basisgegevens (optioneel)</strong>
        </p>
        <p className="text-sm text-blue-800">
          Vul hier de namen en leeftijden in van de reizigers. Je klanten hoeven dan alleen nog hun voorkeuren aan te vullen.
          Laat leeg als je wilt dat klanten alles zelf invullen.
        </p>
      </div>

      {travelers.map((traveler, index) => (
        <div key={index} className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              Reiziger {index + 1}
            </h3>
            {travelers.length > 1 && (
              <button
                type="button"
                onClick={() => removeTraveler(index)}
                className="text-red-600 hover:text-red-700 text-sm"
              >
                Verwijder
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Naam
              </label>
              <input
                type="text"
                value={traveler.name || ''}
                onChange={(e) => updateTraveler(index, 'name', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                placeholder="Bijv: Jan Jansen"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Leeftijd
              </label>
              <input
                type="number"
                value={traveler.age || ''}
                onChange={(e) => updateTraveler(index, 'age', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                placeholder="Bijv: 35"
              />
            </div>
          </div>
        </div>
      ))}

      <button
        type="button"
        onClick={addTraveler}
        className="w-full py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-orange-500 hover:text-orange-600 transition-colors"
      >
        + Voeg reiziger toe
      </button>

      <div className="flex space-x-3 pt-4">
        <button
          type="button"
          onClick={() => onSave()}
          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
        >
          Annuleer
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="flex-1 bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
          style={{ backgroundColor: '#ff7700' }}
        >
          {saving ? 'Opslaan...' : 'Reizigers Opslaan'}
        </button>
      </div>
    </div>
  );
}

function WhatsAppSettings({ trip, onSave }: { trip: Trip; onSave: () => void }) {
  const [whatsappEnabled, setWhatsappEnabled] = useState(trip.whatsapp_enabled || false);
  const [whatsappNumber, setWhatsappNumber] = useState(trip.whatsapp_number || '');
  const [welcomeMessage, setWelcomeMessage] = useState(
    trip.whatsapp_welcome_message || 'Hoi! Ik ben je TravelBRO assistent. Stel me gerust je vragen over de reis!'
  );
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);

    try {
      const { error } = await supabase
        .from('travel_trips')
        .update({
          whatsapp_enabled: whatsappEnabled,
          whatsapp_number: whatsappNumber || null,
          whatsapp_welcome_message: welcomeMessage,
        })
        .eq('id', trip.id);

      if (error) throw error;
      alert('WhatsApp instellingen opgeslagen!');
      onSave();
    } catch (error) {
      console.error('Error saving WhatsApp settings:', error);
      alert('Fout bij opslaan');
    } finally {
      setSaving(false);
    }
  };

  const webhookUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/whatsapp-webhook`;

  return (
    <div className="space-y-6">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-semibold text-blue-900 mb-2">WhatsApp Integratie via Twilio</h3>
        <p className="text-sm text-blue-800 mb-3">
          Klanten kunnen via WhatsApp met TravelBRO communiceren. Features:
        </p>
        <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside mb-3">
          <li>💬 <strong>Tekst berichten</strong> - Natuurlijke conversaties met AI</li>
          <li>🎤 <strong>Spraakberichten</strong> - Automatisch getranscribeerd</li>
          <li>📍 <strong>Locaties delen</strong> - Google Maps links naar hotels/restaurants</li>
          <li>🖼️ <strong>Foto's versturen</strong> - AI stuurt relevante afbeeldingen</li>
        </ul>
        <div className="bg-white border border-blue-300 rounded p-3 mb-3">
          <p className="text-xs font-semibold text-blue-900 mb-2">🚀 Snelle Setup (5 minuten):</p>
          <ol className="text-xs text-blue-800 space-y-1 list-decimal list-inside">
            <li>Maak gratis Twilio account: <a href="https://www.twilio.com/try-twilio" target="_blank" rel="noopener" className="underline font-medium hover:text-blue-900">twilio.com/try-twilio</a></li>
            <li>Activeer WhatsApp Sandbox (Console → Messaging → Send WhatsApp)</li>
            <li>Vraag Operator om Twilio credentials in te vullen (API Settings)</li>
            <li>Kopieer webhook URL hieronder en plak in Twilio Sandbox Settings</li>
            <li>Schakel WhatsApp in en test met je telefoon!</li>
          </ol>
        </div>
        <div className="text-xs text-blue-700">
          <strong>💡 Tip:</strong> Voor testen is Twilio Sandbox GRATIS. Voor productie heb je WhatsApp Business nodig (~€15/maand).
          Zie TWILIO_WHATSAPP_SETUP.md voor complete uitleg.
        </div>
      </div>

      <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
        <h4 className="font-medium text-gray-900 mb-2">Twilio Webhook URL</h4>
        <p className="text-xs text-gray-600 mb-2">
          Kopieer deze URL en voeg toe bij: Twilio Console → WhatsApp Sandbox Settings → When a message comes in
        </p>
        <div className="flex space-x-2">
          <input
            type="text"
            value={webhookUrl}
            readOnly
            className="flex-1 px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm font-mono"
          />
          <button
            onClick={() => {
              navigator.clipboard.writeText(webhookUrl);
              alert('Webhook URL gekopieerd!');
            }}
            className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2"
            style={{ backgroundColor: '#ff7700' }}
          >
            <Copy size={16} />
            <span>Kopieer</span>
          </button>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center space-x-3">
          <input
            type="checkbox"
            id="whatsapp-enabled"
            checked={whatsappEnabled}
            onChange={(e) => setWhatsappEnabled(e.target.checked)}
            className="w-4 h-4 text-orange-600 border-gray-300 rounded focus:ring-orange-500"
          />
          <label htmlFor="whatsapp-enabled" className="text-sm font-medium text-gray-900">
            WhatsApp integratie inschakelen
          </label>
        </div>

        {whatsappEnabled && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                WhatsApp Nummer
              </label>
              <input
                type="tel"
                value={whatsappNumber}
                onChange={(e) => setWhatsappNumber(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                placeholder="+31612345678"
              />
              <p className="text-xs text-gray-500 mt-1">
                Het Twilio WhatsApp nummer (inclusief landcode, bijv. +14155238886 voor sandbox)
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Welkomstbericht
              </label>
              <textarea
                value={welcomeMessage}
                onChange={(e) => setWelcomeMessage(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                rows={3}
                placeholder="Hoi! Ik ben je TravelBRO assistent..."
              />
              <p className="text-xs text-gray-500 mt-1">
                Dit bericht wordt verstuurd wanneer een klant voor het eerst een bericht stuurt
              </p>
            </div>
          </>
        )}
      </div>

      <div className="flex space-x-3 pt-4">
        <button
          type="button"
          onClick={() => onSave()}
          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
        >
          Annuleer
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="flex-1 bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
          style={{ backgroundColor: '#ff7700' }}
        >
          {saving ? 'Opslaan...' : 'Instellingen Opslaan'}
        </button>
      </div>
    </div>
  );
}

function WhatsAppConversationsView({ sessions }: { sessions: any[] }) {
  const [selectedSession, setSelectedSession] = useState<any | null>(null);

  if (sessions.length === 0) {
    return (
      <div className="text-center py-12">
        <MessageSquare className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Nog geen WhatsApp gesprekken</h3>
        <p className="text-gray-600">
          Zodra klanten via WhatsApp beginnen te chatten, verschijnen hun gesprekken hier.
        </p>
      </div>
    );
  }

  if (selectedSession) {
    return (
      <div>
        <button
          onClick={() => setSelectedSession(null)}
          className="mb-4 text-gray-600 hover:text-gray-900 flex items-center space-x-2"
        >
          <span>← Terug naar overzicht</span>
        </button>

        <div className="bg-gray-50 rounded-lg p-4 mb-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-900">
                Telefoonnummer: {selectedSession.phone_number}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Laatste activiteit: {new Date(selectedSession.updated_at).toLocaleString('nl-NL')}
              </p>
            </div>
            <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
              {selectedSession.message_count || 0} berichten
            </span>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-4 max-h-[600px] overflow-y-auto">
          <h4 className="font-semibold text-gray-900 mb-4">Gespreksgeschiedenis</h4>
          {selectedSession.conversation_history && selectedSession.conversation_history.length > 0 ? (
            <div className="space-y-3">
              {selectedSession.conversation_history.map((msg: any, idx: number) => (
                <div
                  key={idx}
                  className={`p-3 rounded-lg ${
                    msg.role === 'user'
                      ? 'bg-gray-100 ml-8'
                      : 'bg-orange-50 mr-8'
                  }`}
                >
                  <p className="text-xs font-medium text-gray-500 mb-1">
                    {msg.role === 'user' ? '👤 Klant' : '🤖 TravelBRO'}
                  </p>
                  <p className="text-sm text-gray-900 whitespace-pre-wrap">{msg.content}</p>
                  {msg.timestamp && (
                    <p className="text-xs text-gray-400 mt-1">
                      {new Date(msg.timestamp).toLocaleString('nl-NL')}
                    </p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-600 text-center py-8">Geen berichten beschikbaar</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <h3 className="font-semibold text-blue-900 mb-2">📱 WhatsApp Gesprekken Overzicht</h3>
        <p className="text-sm text-blue-800">
          Hier zie je alle WhatsApp gesprekken die klanten hebben gevoerd met TravelBRO voor deze trip.
          Elk telefoonnummer heeft zijn eigen gespreksgeschiedenis die automatisch wordt opgeslagen.
        </p>
      </div>

      <div className="space-y-3">
        {sessions.map((session) => (
          <div
            key={session.id}
            className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
            onClick={() => setSelectedSession(session)}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                  <Phone className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">{session.phone_number}</p>
                  <p className="text-xs text-gray-500">
                    Laatste bericht: {new Date(session.updated_at).toLocaleString('nl-NL')}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  {session.message_count || 0} berichten
                </span>
                <p className="text-xs text-gray-500 mt-1">
                  Gestart: {new Date(session.created_at).toLocaleDateString('nl-NL')}
                </p>
              </div>
            </div>

            {session.conversation_history && session.conversation_history.length > 0 && (
              <div className="mt-3 pt-3 border-t border-gray-100">
                <p className="text-sm text-gray-600 truncate">
                  <span className="font-medium">Laatste bericht:</span> {
                    session.conversation_history[session.conversation_history.length - 1]?.content?.substring(0, 100) || 'Geen preview beschikbaar'
                  }...
                </p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function InviteClient({ trip }: { trip: Trip }) {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [clientName, setClientName] = useState('');
  const [sending, setSending] = useState(false);
  const [sentInvites, setSentInvites] = useState<any[]>([]);

  useEffect(() => {
    loadSentInvites();
  }, []);

  const loadSentInvites = async () => {
    const { data } = await supabase
      .from('travel_whatsapp_sessions')
      .select('*')
      .eq('trip_id', trip.id)
      .order('created_at', { ascending: false });

    setSentInvites(data || []);
  };

  const sendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phoneNumber.trim()) {
      alert('Voer een telefoonnummer in');
      return;
    }

    setSending(true);

    try {
      const baseUrl = import.meta.env.VITE_APP_URL || window.location.origin;
      const intakeLink = `${baseUrl}/travel/${trip.share_token}`;

      const message = `Hoi${clientName ? ' ' + clientName : ''}! 👋\n\nJe reisagent heeft een persoonlijke TravelBRO assistent voor je klaargezet voor: *${trip.name}*\n\n🎯 Vul eerst even je reisgegevens in via deze link:\n${intakeLink}\n\nDaarna kun je direct hier in WhatsApp al je vragen stellen over de reis! ✈️\n\nIk ben 24/7 beschikbaar om je te helpen. Tot zo! 🌴`;

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/whatsapp-webhook`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'send',
          to: phoneNumber,
          message: message,
          tripId: trip.id,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Fout bij versturen');
      }

      alert('Uitnodiging verstuurd! 🎉');
      setPhoneNumber('');
      setClientName('');
      loadSentInvites();
    } catch (error) {
      console.error('Error sending invite:', error);
      alert('Fout bij versturen: ' + (error instanceof Error ? error.message : 'Onbekende fout'));
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200 rounded-lg p-6">
        <h3 className="font-semibold text-orange-900 mb-2 flex items-center space-x-2">
          <Send size={20} />
          <span>Klant Uitnodigen via WhatsApp</span>
        </h3>
        <p className="text-sm text-orange-800 mb-4">
          Stuur een WhatsApp bericht naar je klant met een persoonlijke uitnodiging om TravelBRO te gebruiken.
          Ze ontvangen een link naar het intake formulier en kunnen daarna direct met TravelBRO chatten.
        </p>

        <form onSubmit={sendInvite} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Naam Klant (optioneel)
            </label>
            <input
              type="text"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              placeholder="Bijv: Jan de Vries"
            />
            <p className="text-xs text-gray-500 mt-1">
              Voor een persoonlijke aanspreekvorm in het bericht
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              WhatsApp Telefoonnummer *
            </label>
            <input
              type="tel"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              placeholder="+31612345678"
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              Inclusief landcode (bijv. +31 voor Nederland)
            </p>
          </div>

          <button
            type="submit"
            disabled={sending}
            className="w-full bg-orange-600 hover:bg-orange-700 text-white px-6 py-3 rounded-lg font-medium flex items-center justify-center space-x-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ backgroundColor: sending ? '#999' : '#ff7700' }}
          >
            {sending ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                <span>Versturen...</span>
              </>
            ) : (
              <>
                <Send size={18} />
                <span>Stuur Uitnodiging</span>
              </>
            )}
          </button>
        </form>
      </div>

      <div>
        <h3 className="font-semibold text-gray-900 mb-4">Verstuurde Uitnodigingen</h3>

        {sentInvites.length === 0 ? (
          <div className="text-center py-8 bg-gray-50 rounded-lg">
            <p className="text-gray-600">Nog geen uitnodigingen verstuurd</p>
          </div>
        ) : (
          <div className="space-y-3">
            {sentInvites.map((invite) => (
              <div key={invite.id} className="bg-white border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">
                      {invite.phone_number}
                    </p>
                    <p className="text-sm text-gray-600 mt-1">
                      Verstuurd op: {new Date(invite.created_at).toLocaleString('nl-NL')}
                    </p>
                    {invite.message_count > 0 && (
                      <p className="text-xs text-green-600 mt-1">
                        ✓ {invite.message_count} berichten uitgewisseld
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      invite.message_count > 0
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {invite.message_count > 0 ? 'Actief' : 'Uitgenodigd'}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-xs text-blue-800">
          <strong>💡 Tip:</strong> Klanten moeten eerst de Twilio Sandbox activeren door{' '}
          <code className="bg-blue-100 px-1 py-0.5 rounded">join &lt;code&gt;</code> te sturen naar het Twilio nummer.
          Dit hoeft maar 1x per klant. Zie TWILIO_WHATSAPP_SETUP.md voor meer info.
        </p>
      </div>
    </div>
  );
}
