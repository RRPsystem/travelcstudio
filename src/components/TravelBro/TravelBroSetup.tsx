import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { db, supabase } from '../../lib/supabase';
import { Bot, Phone, MessageSquare, Users, Settings, CheckCircle, XCircle, ExternalLink, Copy, Send, Plus, FileText, Link as LinkIcon, Trash2, Eye, Share2, Upload, Loader, Edit } from 'lucide-react';

export function TravelBroSetup() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'new' | 'active' | 'sessions' | 'test'>('overview');
  const [apiSettings, setApiSettings] = useState<any>(null);
  const [whatsappSessions, setWhatsappSessions] = useState<any[]>([]);
  const [activeTravelBros, setActiveTravelBros] = useState<any[]>([]);
  const [testPhone, setTestPhone] = useState('');
  const [testMessage, setTestMessage] = useState('Hoi! Dit is een test bericht van TravelBRO.');
  const [sendingTest, setSendingTest] = useState(false);

  const [newTripName, setNewTripName] = useState('');
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [sourceUrls, setSourceUrls] = useState<string[]>(['']);
  const [travelers, setTravelers] = useState([{ name: '', age: '', relation: 'adult' }]);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const { data: settings } = await db.supabase
        .from('api_settings')
        .select('*')
        .eq('brand_id', user?.brand_id)
        .maybeSingle();

      setApiSettings(settings);

      const { data: sessions } = await db.supabase
        .from('travel_whatsapp_sessions')
        .select('*')
        .eq('brand_id', user?.brand_id)
        .order('created_at', { ascending: false });

      setWhatsappSessions(sessions || []);

      const { data: trips } = await db.supabase
        .from('travel_trips')
        .select('*')
        .eq('brand_id', user?.brand_id)
        .order('created_at', { ascending: false });

      setActiveTravelBros(trips || []);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTravelBro = async () => {
    if (!newTripName.trim() || (!pdfFile && sourceUrls.filter(u => u.trim()).length === 0)) {
      alert('Vul minimaal een naam en upload een PDF of voeg URLs toe');
      return;
    }

    setCreating(true);
    try {
      let pdfUrl = null;
      let parsedData = null;

      if (pdfFile) {
        const fileName = `${Date.now()}_${pdfFile.name}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('travel-documents')
          .upload(fileName, pdfFile);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('travel-documents')
          .getPublicUrl(fileName);

        pdfUrl = publicUrl;

        const parseResponse = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/parse-trip-pdf`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            },
            body: JSON.stringify({ pdfUrl }),
          }
        );

        if (parseResponse.ok) {
          parsedData = await parseResponse.json();
        }
      }

      const filteredUrls = sourceUrls.filter(u => u.trim());
      const intakeTemplate = travelers.some(t => t.name || t.age)
        ? { travelers }
        : null;

      const { data, error } = await db.supabase
        .from('travel_trips')
        .insert({
          brand_id: user?.brand_id,
          name: newTripName,
          pdf_url: pdfUrl,
          parsed_data: parsedData || {},
          source_urls: filteredUrls,
          intake_template: intakeTemplate,
          created_by: user?.id,
        })
        .select()
        .single();

      if (error) throw error;

      alert('✅ TravelBRO aangemaakt!');
      setNewTripName('');
      setPdfFile(null);
      setSourceUrls(['']);
      setTravelers([{ name: '', age: '', relation: 'adult' }]);
      setActiveTab('active');
      loadData();
    } catch (error) {
      console.error('Error creating TravelBRO:', error);
      alert('❌ Fout bij aanmaken: ' + (error instanceof Error ? error.message : 'Onbekende fout'));
    } finally {
      setCreating(false);
    }
  };

  const copyClientLink = (shareToken: string) => {
    const clientLink = `${window.location.origin}/travelbro/${shareToken}`;
    navigator.clipboard.writeText(clientLink);
    alert('✅ Client link gekopieerd! Deel deze met je klanten.');
  };

  const openClientPreview = (shareToken: string) => {
    window.open(`/travelbro/${shareToken}`, '_blank');
  };

  const deleteTravelBro = async (id: string) => {
    if (!confirm('Weet je zeker dat je deze TravelBRO wilt verwijderen?')) return;

    try {
      const { error } = await db.supabase
        .from('travel_trips')
        .delete()
        .eq('id', id);

      if (error) throw error;

      alert('✅ TravelBRO verwijderd');
      loadData();
    } catch (error) {
      console.error('Error deleting TravelBRO:', error);
      alert('❌ Fout bij verwijderen');
    }
  };

  const testTwilioConnection = async () => {
    if (!testPhone.trim()) {
      alert('Vul een telefoonnummer in');
      return;
    }

    setSendingTest(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/test-twilio`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          to: testPhone,
          message: testMessage,
        }),
      });

      if (!response.ok) throw new Error('Test failed');

      alert('✅ Test bericht verzonden! Check je WhatsApp.');
    } catch (error) {
      console.error('Error testing Twilio:', error);
      alert('❌ Fout bij verzenden test bericht. Check de console voor details.');
    } finally {
      setSendingTest(false);
    }
  };

  const copyWebhookUrl = () => {
    const webhookUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/whatsapp-webhook`;
    navigator.clipboard.writeText(webhookUrl);
    alert('Webhook URL gekopieerd!');
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
      </div>
    );
  }

  const isTwilioConfigured = apiSettings?.twilio_account_sid && apiSettings?.twilio_auth_token;
  const webhookUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/whatsapp-webhook`;

  return (
    <div className="p-6">
      <div className="mb-6">
        <div className="flex items-center space-x-3 mb-2">
          <div className="w-12 h-12 rounded-lg flex items-center justify-center bg-gradient-to-br from-orange-500 to-amber-500">
            <Bot className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">TravelBRO Assistent</h1>
            <p className="text-gray-600">Configureer en beheer je AI reisassistent</p>
          </div>
        </div>
      </div>

      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'overview', label: 'Overzicht', icon: Bot },
            { id: 'new', label: 'Nieuwe TravelBRO', icon: Plus },
            { id: 'active', label: 'Actieve TravelBRO\'s', icon: Users },
            { id: 'sessions', label: 'WhatsApp Sessies', icon: MessageSquare },
            { id: 'test', label: 'Test', icon: Send },
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab.id
                    ? 'border-orange-500 text-orange-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon size={18} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900">Actieve TravelBRO's</h3>
                <Bot className="text-orange-500" size={24} />
              </div>
              <p className="text-3xl font-bold text-gray-900">{activeTravelBros.length}</p>
              <p className="text-sm text-gray-600">Reizen beschikbaar</p>
            </div>

            <div className="bg-white rounded-lg shadow-sm border p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900">WhatsApp Sessies</h3>
                <MessageSquare className="text-blue-500" size={24} />
              </div>
              <p className="text-3xl font-bold text-gray-900">{whatsappSessions.length}</p>
              <p className="text-sm text-gray-600">Actieve conversaties</p>
            </div>

            <div className="bg-white rounded-lg shadow-sm border p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900">Twilio Status</h3>
                {isTwilioConfigured ? (
                  <CheckCircle className="text-green-500" size={24} />
                ) : (
                  <XCircle className="text-red-500" size={24} />
                )}
              </div>
              <p className="text-sm text-gray-600">
                {isTwilioConfigured ? 'Geconfigureerd' : 'Niet geconfigureerd'}
              </p>
            </div>
          </div>

          <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-lg border border-orange-200 p-6">
            <h3 className="font-semibold text-gray-900 mb-3">Hoe werkt TravelBRO?</h3>
            <ul className="space-y-2 text-sm text-gray-700">
              <li className="flex items-start space-x-2">
                <span className="text-orange-600 font-bold">1.</span>
                <span>Maak een nieuwe TravelBRO aan met PDF en/of URLs</span>
              </li>
              <li className="flex items-start space-x-2">
                <span className="text-orange-600 font-bold">2.</span>
                <span>Deel de link met je klanten</span>
              </li>
              <li className="flex items-start space-x-2">
                <span className="text-orange-600 font-bold">3.</span>
                <span>Klanten vullen intake formulier in met hun voorkeuren</span>
              </li>
              <li className="flex items-start space-x-2">
                <span className="text-orange-600 font-bold">4.</span>
                <span>AI beantwoordt hun vragen over de reis via WhatsApp of web chat</span>
              </li>
            </ul>
          </div>
        </div>
      )}

      {activeTab === 'new' && (
        <div className="max-w-3xl mx-auto">
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-6">Maak Nieuwe TravelBRO</h3>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Reis Naam *
                </label>
                <input
                  type="text"
                  value={newTripName}
                  onChange={(e) => setNewTripName(e.target.value)}
                  placeholder="Bijv: Kroatië Avontuur 2025"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <FileText className="inline w-4 h-4 mr-1" />
                  Upload Reis PDF
                </label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-orange-500 transition-colors">
                  <input
                    type="file"
                    accept=".pdf"
                    onChange={(e) => setPdfFile(e.target.files?.[0] || null)}
                    className="hidden"
                    id="pdf-upload"
                  />
                  <label htmlFor="pdf-upload" className="cursor-pointer">
                    {pdfFile ? (
                      <div className="text-sm text-gray-700">
                        <CheckCircle className="w-8 h-8 text-green-500 mx-auto mb-2" />
                        <p className="font-medium">{pdfFile.name}</p>
                        <p className="text-xs text-gray-500 mt-1">Klik om ander bestand te kiezen</p>
                      </div>
                    ) : (
                      <div className="text-sm text-gray-600">
                        <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                        <p>Klik om PDF te uploaden</p>
                        <p className="text-xs text-gray-500 mt-1">AI zal het reisdocument analyseren</p>
                      </div>
                    )}
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <LinkIcon className="inline w-4 h-4 mr-1" />
                  Extra Bron URLs
                </label>
                {sourceUrls.map((url, index) => (
                  <div key={index} className="flex space-x-2 mb-2">
                    <input
                      type="url"
                      value={url}
                      onChange={(e) => {
                        const updated = [...sourceUrls];
                        updated[index] = e.target.value;
                        setSourceUrls(updated);
                      }}
                      placeholder="https://example.com/reis-info"
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    />
                    {sourceUrls.length > 1 && (
                      <button
                        onClick={() => setSourceUrls(sourceUrls.filter((_, i) => i !== index))}
                        className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 size={18} />
                      </button>
                    )}
                  </div>
                ))}
                <button
                  onClick={() => setSourceUrls([...sourceUrls, ''])}
                  className="text-sm text-orange-600 hover:text-orange-700 flex items-center space-x-1"
                >
                  <Plus size={16} />
                  <span>URL toevoegen</span>
                </button>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Reizigers Pre-fill (optioneel)
                </label>
                <p className="text-xs text-gray-500 mb-3">
                  Vul alvast de namen en leeftijden in. Klanten vullen hun voorkeuren later aan.
                </p>
                {travelers.map((traveler, index) => (
                  <div key={index} className="bg-gray-50 rounded-lg p-4 mb-3">
                    <div className="grid grid-cols-3 gap-3">
                      <input
                        type="text"
                        value={traveler.name}
                        onChange={(e) => {
                          const updated = [...travelers];
                          updated[index].name = e.target.value;
                          setTravelers(updated);
                        }}
                        placeholder="Naam"
                        className="px-3 py-2 border border-gray-300 rounded-lg"
                      />
                      <input
                        type="number"
                        value={traveler.age}
                        onChange={(e) => {
                          const updated = [...travelers];
                          updated[index].age = e.target.value;
                          setTravelers(updated);
                        }}
                        placeholder="Leeftijd"
                        className="px-3 py-2 border border-gray-300 rounded-lg"
                      />
                      <select
                        value={traveler.relation}
                        onChange={(e) => {
                          const updated = [...travelers];
                          updated[index].relation = e.target.value;
                          setTravelers(updated);
                        }}
                        className="px-3 py-2 border border-gray-300 rounded-lg"
                      >
                        <option value="adult">Volwassene</option>
                        <option value="child">Kind</option>
                        <option value="teen">Tiener</option>
                      </select>
                    </div>
                    {travelers.length > 1 && (
                      <button
                        onClick={() => setTravelers(travelers.filter((_, i) => i !== index))}
                        className="mt-2 text-sm text-red-600 hover:text-red-700"
                      >
                        Verwijder
                      </button>
                    )}
                  </div>
                ))}
                <button
                  onClick={() => setTravelers([...travelers, { name: '', age: '', relation: 'adult' }])}
                  className="text-sm text-orange-600 hover:text-orange-700 flex items-center space-x-1"
                >
                  <Plus size={16} />
                  <span>Reiziger toevoegen</span>
                </button>
              </div>

              <button
                onClick={handleCreateTravelBro}
                disabled={creating}
                className="w-full bg-orange-600 hover:bg-orange-700 text-white py-3 rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
              >
                {creating ? (
                  <>
                    <Loader className="w-5 h-5 animate-spin" />
                    <span>TravelBRO aanmaken...</span>
                  </>
                ) : (
                  <>
                    <Plus size={20} />
                    <span>Maak TravelBRO aan</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'active' && (
        <div className="space-y-4">
          {activeTravelBros.length === 0 ? (
            <div className="bg-white rounded-lg shadow-sm border p-12 text-center">
              <Bot className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Nog geen TravelBRO's</h3>
              <p className="text-gray-600 mb-4">Maak je eerste TravelBRO aan om te beginnen</p>
              <button
                onClick={() => setActiveTab('new')}
                className="inline-flex items-center space-x-2 bg-orange-600 hover:bg-orange-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
              >
                <Plus size={20} />
                <span>Nieuwe TravelBRO</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {activeTravelBros.map((trip) => (
                <div key={trip.id} className="bg-white rounded-lg shadow-sm border p-6 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">{trip.name}</h3>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-gray-600">PDF:</span>
                          <span className="ml-2 text-gray-900">{trip.pdf_url ? '✓' : '–'}</span>
                        </div>
                        <div>
                          <span className="text-gray-600">URLs:</span>
                          <span className="ml-2 text-gray-900">{trip.source_urls?.length || 0}</span>
                        </div>
                        <div>
                          <span className="text-gray-600">Pre-filled reizigers:</span>
                          <span className="ml-2 text-gray-900">{trip.intake_template?.travelers?.length || 0}</span>
                        </div>
                        <div>
                          <span className="text-gray-600">Status:</span>
                          <span className={`ml-2 font-medium ${trip.is_active ? 'text-green-600' : 'text-gray-400'}`}>
                            {trip.is_active ? 'Actief' : 'Inactief'}
                          </span>
                        </div>
                      </div>
                      <p className="text-xs text-gray-500 mt-2">
                        Aangemaakt: {new Date(trip.created_at).toLocaleDateString('nl-NL')}
                      </p>
                    </div>

                    <div className="flex items-center space-x-2 ml-4">
                      <button
                        onClick={() => copyClientLink(trip.share_token)}
                        className="p-2 text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
                        title="Kopieer client link voor reizigers"
                      >
                        <Share2 size={18} />
                      </button>
                      <button
                        onClick={() => openClientPreview(trip.share_token)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Bekijk client pagina"
                      >
                        <Eye size={18} />
                      </button>
                      <button
                        onClick={() => {
                          alert('Edit functionaliteit komt binnenkort!');
                        }}
                        className="p-2 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
                        title="Bewerk TravelBRO"
                      >
                        <Edit size={18} />
                      </button>
                      <button
                        onClick={() => deleteTravelBro(trip.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Verwijder"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'sessions' && (
        <div className="space-y-4">
          {whatsappSessions.length === 0 ? (
            <div className="bg-white rounded-lg shadow-sm border p-12 text-center">
              <MessageSquare className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Nog geen sessies</h3>
              <p className="text-gray-600">WhatsApp conversaties verschijnen hier zodra klanten beginnen te chatten</p>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Telefoon
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Reis
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Laatste activiteit
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {whatsappSessions.map((session) => (
                    <tr key={session.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {session.phone_number}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {session.trip_id ? 'Actieve reis' : 'Geen reis'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          Actief
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {new Date(session.last_message_at || session.created_at).toLocaleString('nl-NL')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === 'test' && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Test WhatsApp Bericht</h3>

            {isTwilioConfigured ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Telefoonnummer (inclusief landcode, bijv: +31612345678)
                  </label>
                  <input
                    type="tel"
                    value={testPhone}
                    onChange={(e) => setTestPhone(e.target.value)}
                    placeholder="+31612345678"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Test Bericht
                  </label>
                  <textarea
                    value={testMessage}
                    onChange={(e) => setTestMessage(e.target.value)}
                    rows={4}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                </div>

                <button
                  onClick={testTwilioConnection}
                  disabled={sendingTest || !testPhone.trim()}
                  className="w-full bg-orange-600 hover:bg-orange-700 text-white py-3 rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                >
                  {sendingTest ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      <span>Verzenden...</span>
                    </>
                  ) : (
                    <>
                      <Send size={18} />
                      <span>Verstuur Test Bericht</span>
                    </>
                  )}
                </button>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-blue-800">
                    💡 Tip: Zorg dat je nummer eerst geautoriseerd is in je Twilio Sandbox voor WhatsApp tests.
                  </p>
                </div>
              </div>
            ) : (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-sm text-yellow-800">
                  Configureer eerst Twilio in de Setup tab voordat je test berichten kunt versturen.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
