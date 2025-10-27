import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { db, supabase } from '../../lib/supabase';
import { Bot, Phone, MessageSquare, Users, Settings, CheckCircle, XCircle, ExternalLink, Copy, Send, Plus, FileText, Link as LinkIcon, Trash2, Eye, Share2, Upload, Loader, Edit } from 'lucide-react';

export function TravelBroSetup() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'new' | 'active' | 'sessions' | 'invite' | 'settings'>('overview');
  const [apiSettings, setApiSettings] = useState<any>(null);
  const [whatsappSessions, setWhatsappSessions] = useState<any[]>([]);
  const [activeTravelBros, setActiveTravelBros] = useState<any[]>([]);

  const [newTripName, setNewTripName] = useState('');
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [sourceUrls, setSourceUrls] = useState<string[]>(['']);
  const [travelers, setTravelers] = useState([{ name: '', age: '', relation: 'adult' }]);
  const [customContext, setCustomContext] = useState('');
  const [gptModel, setGptModel] = useState('gpt-4o');
  const [gptTemperature, setGptTemperature] = useState(0.7);
  const [creating, setCreating] = useState(false);

  const [editingTrip, setEditingTrip] = useState<any>(null);
  const [updating, setUpdating] = useState(false);

  const [brandData, setBrandData] = useState<any>(null);
  const [travelbroDomain, setTravelbroDomain] = useState('');
  const [savingDomain, setSavingDomain] = useState(false);
  const [systemDefaultDomain, setSystemDefaultDomain] = useState<string>('');

  const [sendingInvite, setSendingInvite] = useState(false);
  const [invitePhone, setInvitePhone] = useState('');
  const [inviteClientName, setInviteClientName] = useState('');
  const [selectedTripForInvite, setSelectedTripForInvite] = useState<string>('');
  const [skipIntake, setSkipIntake] = useState(false);

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

      const { data: brand } = await db.supabase
        .from('brands')
        .select('travelbro_domain')
        .eq('id', user?.brand_id)
        .maybeSingle();

      setBrandData(brand);
      setTravelbroDomain(brand?.travelbro_domain || '');

      const { data: systemDomain } = await db.supabase
        .from('api_settings')
        .select('api_key')
        .eq('provider', 'system')
        .eq('service_name', 'TravelBRO Domain')
        .maybeSingle();

      setSystemDefaultDomain(systemDomain?.api_key || '');

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
          custom_context: customContext,
          gpt_model: gptModel,
          gpt_temperature: gptTemperature,
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
      setCustomContext('');
      setGptModel('gpt-4o');
      setGptTemperature(0.7);
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
    const clientLink = getShareUrl(shareToken);
    navigator.clipboard.writeText(clientLink);
    alert('✅ Client link gekopieerd! Deel deze met je klanten.');
  };

  const openClientPreview = (shareToken: string) => {
    const url = getShareUrl(shareToken);
    window.open(url, '_blank');
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

  const startEditingTrip = (trip: any) => {
    setEditingTrip(trip);
    setNewTripName(trip.name);
    setSourceUrls(trip.source_urls?.length > 0 ? trip.source_urls : ['']);
    setTravelers(trip.intake_template?.travelers || [{ name: '', age: '', relation: 'adult' }]);
    setCustomContext(trip.custom_context || '');
    setGptModel(trip.gpt_model || 'gpt-4o');
    setGptTemperature(trip.gpt_temperature ?? 0.7);
    setActiveTab('new');
  };

  const cancelEditing = () => {
    setEditingTrip(null);
    setNewTripName('');
    setPdfFile(null);
    setSourceUrls(['']);
    setTravelers([{ name: '', age: '', relation: 'adult' }]);
    setCustomContext('');
    setGptModel('gpt-4o');
    setGptTemperature(0.7);
  };

  const handleUpdateTravelBro = async () => {
    if (!newTripName.trim()) {
      alert('Vul minimaal een naam in');
      return;
    }

    setUpdating(true);
    try {
      const filteredUrls = sourceUrls.filter(u => u.trim());
      const intakeTemplate = travelers.some(t => t.name || t.age)
        ? { travelers }
        : null;

      const { error } = await db.supabase
        .from('travel_trips')
        .update({
          name: newTripName,
          source_urls: filteredUrls,
          intake_template: intakeTemplate,
          custom_context: customContext,
          gpt_model: gptModel,
          gpt_temperature: gptTemperature,
        })
        .eq('id', editingTrip.id);

      if (error) throw error;

      alert('✅ TravelBRO bijgewerkt!');
      cancelEditing();
      setActiveTab('active');
      loadData();
    } catch (error) {
      console.error('Error updating TravelBRO:', error);
      alert('❌ Fout bij bijwerken: ' + (error instanceof Error ? error.message : 'Onbekende fout'));
    } finally {
      setUpdating(false);
    }
  };


  const copyWebhookUrl = () => {
    const webhookUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/whatsapp-webhook`;
    navigator.clipboard.writeText(webhookUrl);
    alert('Webhook URL gekopieerd!');
  };

  const getShareUrl = (shareToken: string) => {
    if (brandData?.travelbro_domain) {
      return `https://${brandData.travelbro_domain}/${shareToken}`;
    }
    if (systemDefaultDomain) {
      return `https://${systemDefaultDomain}/${shareToken}`;
    }
    return `${window.location.origin}/travelbro/${shareToken}`;
  };

  const handleSaveDomain = async () => {
    setSavingDomain(true);
    try {
      const { error } = await db.supabase
        .from('brands')
        .update({ travelbro_domain: travelbroDomain.trim() || null })
        .eq('id', user?.brand_id);

      if (error) throw error;

      alert('✅ TravelBRO domein opgeslagen!');
      loadData();
    } catch (error) {
      console.error('Error saving domain:', error);
      alert('❌ Fout bij opslaan: ' + (error instanceof Error ? error.message : 'Onbekende fout'));
    } finally {
      setSavingDomain(false);
    }
  };

  const sendWhatsAppInvite = async () => {
    if (!selectedTripForInvite || !invitePhone.trim()) {
      alert('Selecteer een TravelBRO en vul een telefoonnummer in');
      return;
    }

    if (!isTwilioConfigured) {
      alert('⚠️ WhatsApp is nog niet geconfigureerd. Ga naar de Settings tab.');
      return;
    }

    setSendingInvite(true);
    try {
      const trip = activeTravelBros.find(t => t.id === selectedTripForInvite);
      if (!trip) throw new Error('Trip niet gevonden');

      const clientLink = getShareUrl(trip.share_token);
      const brandName = brandData?.name || 'je reisagent';
      const clientNameText = inviteClientName.trim() ? inviteClientName.trim() : 'Alex';

      const message = skipIntake
        ? `Hoi ${clientNameText}! 👋\n\nJe reisagent heeft een persoonlijke TravelBRO assistent voor je klaargezet voor: *${trip.name}*\n\nDaarna kun je direct hier in WhatsApp al je vragen stellen over de reis! ✈️\n\nIk ben 24/7 beschikbaar om je te helpen. Tot zo! 🌴`
        : `Hoi ${clientNameText}! 👋\n\nJe reisagent heeft een persoonlijke TravelBRO assistent voor je klaargezet voor: *${trip.name}*\n\n📋 Vul eerst even je reisgegevens in via deze link:\n${clientLink}\n\nDaarna kun je direct hier in WhatsApp al je vragen stellen over de reis! ✈️\n\nIk ben 24/7 beschikbaar om je te helpen. Tot zo! 🌴`;

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/test-twilio`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          to: invitePhone,
          message: message,
        }),
      });

      if (!response.ok) throw new Error('Verzenden mislukt');

      alert(`✅ WhatsApp uitnodiging verzonden naar ${invitePhone}!`);
      setInvitePhone('');
      setInviteClientName('');
      setSelectedTripForInvite('');
      setSkipIntake(false);
    } catch (error) {
      console.error('Error sending invite:', error);
      alert('❌ Fout bij verzenden uitnodiging: ' + (error instanceof Error ? error.message : 'Onbekende fout'));
    } finally {
      setSendingInvite(false);
    }
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
            { id: 'invite', label: 'WhatsApp Uitnodiging', icon: Phone },
            { id: 'sessions', label: 'WhatsApp Sessies', icon: MessageSquare },
            { id: 'settings', label: 'Instellingen', icon: Settings },
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
          </div>

          <div className="space-y-6">
            <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-lg border border-orange-200 p-6">
              <h3 className="font-semibold text-gray-900 mb-4 text-lg">Hoe werkt TravelBRO?</h3>
              <div className="space-y-3 text-sm text-gray-700">
                <div className="flex items-start space-x-3">
                  <span className="text-orange-600 font-bold text-lg">1.</span>
                  <div>
                    <p className="font-semibold text-gray-900">Maak een TravelBRO aan</p>
                    <p className="text-gray-600">Upload een reis PDF en/of voeg URLs toe met reisinformatie</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <span className="text-orange-600 font-bold text-lg">2.</span>
                  <div>
                    <p className="font-semibold text-gray-900">Deel de link</p>
                    <p className="text-gray-600">Stuur de client link naar je reizigers via email of WhatsApp</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <span className="text-orange-600 font-bold text-lg">3.</span>
                  <div>
                    <p className="font-semibold text-gray-900">Reizigers vullen intake in</p>
                    <p className="text-gray-600">Zij delen hun voorkeuren, allergieën, verwachtingen en interesses</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <span className="text-orange-600 font-bold text-lg">4.</span>
                  <div>
                    <p className="font-semibold text-gray-900">AI helpt 24/7</p>
                    <p className="text-gray-600">TravelBRO beantwoordt vragen via WhatsApp of webchat met betrouwbare informatie</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-lg border border-blue-200 p-6">
              <h3 className="font-semibold text-gray-900 mb-4 text-lg flex items-center">
                <Bot className="mr-2 text-blue-600" size={20} />
                Wat kan TravelBRO beantwoorden?
              </h3>
              <div className="grid md:grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="font-semibold text-blue-900 mb-2">📍 Locatie & Routes</p>
                  <ul className="space-y-1 text-gray-700 ml-4 list-disc">
                    <li>"Hoe kom ik bij het hotel?"</li>
                    <li>"Wat is het adres van restaurant X?"</li>
                    <li>"Hoe ver is het naar de volgende stop?"</li>
                    <li>Automatische route-info met afstand en reistijd</li>
                  </ul>
                </div>
                <div>
                  <p className="font-semibold text-blue-900 mb-2">🍽️ Restaurants & Eten</p>
                  <ul className="space-y-1 text-gray-700 ml-4 list-disc">
                    <li>"Waar kan ik Pizza eten?" (o.b.v. voorkeuren)</li>
                    <li>"Welke restaurants zijn geschikt voor vegetariërs?"</li>
                    <li>Top 5 restaurants in de buurt met ratings</li>
                    <li>Let op allergieën en dieetwensen</li>
                  </ul>
                </div>
                <div>
                  <p className="font-semibold text-blue-900 mb-2">🎯 Activiteiten & Tips</p>
                  <ul className="space-y-1 text-gray-700 ml-4 list-disc">
                    <li>"Wat is er te doen voor kinderen?"</li>
                    <li>"Welke bezienswaardigheden zijn must-see?"</li>
                    <li>Persoonlijke tips o.b.v. interesses</li>
                    <li>Info uit het reisdocument</li>
                  </ul>
                </div>
                <div>
                  <p className="font-semibold text-blue-900 mb-2">🏨 Accommodatie & Reis</p>
                  <ul className="space-y-1 text-gray-700 ml-4 list-disc">
                    <li>"Hoe laat is check-in?"</li>
                    <li>"Wat zijn de vluchtgegevens?"</li>
                    <li>"Is er WiFi in het hotel?"</li>
                    <li>Alle praktische reisinformatie</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg border border-green-200 p-6">
              <h3 className="font-semibold text-gray-900 mb-4 text-lg flex items-center">
                <CheckCircle className="mr-2 text-green-600" size={20} />
                Waar haalt TravelBRO zijn informatie vandaan?
              </h3>
              <div className="space-y-3 text-sm">
                <div className="bg-white rounded-lg p-4 border border-green-100">
                  <p className="font-semibold text-green-900 mb-2">📄 Reisdocument (PDF)</p>
                  <p className="text-gray-700">Alle informatie uit het door jou geüploade reisdocument wordt geanalyseerd door AI en gebruikt om vragen te beantwoorden.</p>
                </div>
                <div className="bg-white rounded-lg p-4 border border-green-100">
                  <p className="font-semibold text-green-900 mb-2">🔗 Extra URLs</p>
                  <p className="text-gray-700">Links naar websites, hotel info, activiteiten, etc. die je toevoegt worden gebruikt als extra informatiebronnen.</p>
                </div>
                <div className="bg-white rounded-lg p-4 border border-green-100">
                  <p className="font-semibold text-green-900 mb-2">👥 Intake Formulier</p>
                  <p className="text-gray-700">Persoonlijke voorkeuren, allergieën, verwachtingen en interesses van de reizigers worden actief gebruikt voor gepersonaliseerde adviezen.</p>
                </div>
                <div className="bg-white rounded-lg p-4 border border-green-100">
                  <p className="font-semibold text-green-900 mb-2">🔍 Google Search</p>
                  <p className="text-gray-700">Real-time zoekresultaten voor actuele informatie over restaurants, activiteiten en bezienswaardigheden.</p>
                </div>
                <div className="bg-white rounded-lg p-4 border border-green-100">
                  <p className="font-semibold text-green-900 mb-2">🗺️ Google Maps & Places</p>
                  <p className="text-gray-700">Adressen, routes, afstanden, reistijden, restaurant ratings en locatie-details worden opgehaald via Google's API's.</p>
                </div>
              </div>
              <div className="mt-4 bg-green-100 border-2 border-green-300 rounded-lg p-4">
                <p className="font-bold text-green-900 flex items-center">
                  <CheckCircle className="mr-2" size={18} />
                  100% Betrouwbare Informatie
                </p>
                <p className="text-green-800 text-sm mt-1">
                  TravelBRO verzint NOOIT informatie. Alle antwoorden zijn gebaseerd op echte data uit bovenstaande bronnen.
                  <strong>Zorg jij voor goede input, dan zorgt TravelBRO voor betrouwbare output!</strong>
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'new' && (
        <div className="max-w-3xl mx-auto">
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-6">
              {editingTrip ? `TravelBRO Bewerken: ${editingTrip.name}` : 'Maak Nieuwe TravelBRO'}
            </h3>

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

              {!editingTrip && (
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
              )}

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

              <div className="border-t pt-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <Bot className="inline w-5 h-5 mr-2" />
                  AI Configuratie (GPT)
                </h3>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Custom Context
                    </label>
                    <textarea
                      value={customContext}
                      onChange={(e) => setCustomContext(e.target.value)}
                      placeholder="Bijvoorbeeld: Dit is een huwelijksreis voor een jong stel. Ze houden van avontuur en romantiek..."
                      rows={4}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Geef context over deze reis die de AI moet gebruiken bij het beantwoorden van vragen.
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        GPT Model
                      </label>
                      <select
                        value={gptModel}
                        onChange={(e) => setGptModel(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      >
                        <option value="gpt-4o">GPT-4o (aanbevolen)</option>
                        <option value="gpt-4-turbo">GPT-4 Turbo</option>
                        <option value="gpt-3.5-turbo">GPT-3.5 Turbo (sneller)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Temperature ({gptTemperature})
                      </label>
                      <input
                        type="range"
                        min="0"
                        max="2"
                        step="0.1"
                        value={gptTemperature}
                        onChange={(e) => setGptTemperature(parseFloat(e.target.value))}
                        className="w-full"
                      />
                      <div className="flex justify-between text-xs text-gray-500 mt-1">
                        <span>Precies</span>
                        <span>Creatief</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex space-x-3">
                {editingTrip && (
                  <button
                    onClick={cancelEditing}
                    className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 py-3 rounded-lg font-semibold transition-colors"
                  >
                    Annuleren
                  </button>
                )}
                <button
                  onClick={editingTrip ? handleUpdateTravelBro : handleCreateTravelBro}
                  disabled={creating || updating}
                  className="flex-1 bg-orange-600 hover:bg-orange-700 text-white py-3 rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                >
                  {(creating || updating) ? (
                    <>
                      <Loader className="w-5 h-5 animate-spin" />
                      <span>{editingTrip ? 'Bijwerken...' : 'TravelBRO aanmaken...'}</span>
                    </>
                  ) : (
                    <>
                      {editingTrip ? <Edit size={20} /> : <Plus size={20} />}
                      <span>{editingTrip ? 'Bijwerken' : 'Maak TravelBRO aan'}</span>
                    </>
                  )}
                </button>
              </div>
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
                        onClick={() => startEditingTrip(trip)}
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

      {activeTab === 'invite' && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <Phone className="w-5 h-5 mr-2 text-orange-600" />
              Stuur WhatsApp Uitnodiging
            </h3>

            {!isTwilioConfigured && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-yellow-800">WhatsApp niet geconfigureerd</h3>
                    <p className="mt-1 text-sm text-yellow-700">
                      Ga naar de Settings tab om je Twilio credentials in te vullen voordat je uitnodigingen kunt versturen.
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Selecteer TravelBRO
                </label>
                <select
                  value={selectedTripForInvite}
                  onChange={(e) => setSelectedTripForInvite(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  disabled={activeTravelBros.length === 0}
                >
                  <option value="">-- Kies een reis --</option>
                  {activeTravelBros.map((trip) => (
                    <option key={trip.id} value={trip.id}>
                      {trip.name}
                    </option>
                  ))}
                </select>
                {activeTravelBros.length === 0 && (
                  <p className="text-sm text-gray-500 mt-1">
                    Maak eerst een TravelBRO aan voordat je uitnodigingen kunt versturen
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Naam klant (optioneel)
                </label>
                <input
                  type="text"
                  value={inviteClientName}
                  onChange={(e) => setInviteClientName(e.target.value)}
                  placeholder="bijv. Alex"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-500 mt-1">
                  De naam wordt gebruikt in het welkomstbericht
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  WhatsApp Nummer
                </label>
                <input
                  type="tel"
                  value={invitePhone}
                  onChange={(e) => setInvitePhone(e.target.value)}
                  placeholder="+31612345678"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Inclusief landcode (bijv. +31 voor Nederland)
                </p>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start">
                  <input
                    type="checkbox"
                    id="skipIntake"
                    checked={skipIntake}
                    onChange={(e) => setSkipIntake(e.target.checked)}
                    className="mt-1 h-4 w-4 text-orange-600 border-gray-300 rounded focus:ring-orange-500"
                  />
                  <label htmlFor="skipIntake" className="ml-3 flex-1">
                    <span className="text-sm font-medium text-gray-900">
                      Intake formulier overslaan
                    </span>
                    <p className="text-xs text-gray-600 mt-1">
                      Wanneer aangevinkt: klant kan direct chatten zonder intake in te vullen.
                      Gebruik dit als je alleen WhatsApp wilt gebruiken zonder web intake.
                    </p>
                  </label>
                </div>
              </div>

              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <h4 className="text-sm font-semibold text-gray-900 mb-2">Preview bericht:</h4>
                <div className="text-sm text-gray-700 whitespace-pre-wrap font-mono bg-white p-3 rounded border">
                  {selectedTripForInvite ? (
                    skipIntake ? (
                      `Hoi ${inviteClientName.trim() || 'Alex'}! 👋\n\nJe reisagent heeft een persoonlijke TravelBRO assistent voor je klaargezet voor: *${activeTravelBros.find(t => t.id === selectedTripForInvite)?.name || '[Reis]'}*\n\nDaarna kun je direct hier in WhatsApp al je vragen stellen over de reis! ✈️\n\nIk ben 24/7 beschikbaar om je te helpen. Tot zo! 🌴`
                    ) : (
                      `Hoi ${inviteClientName.trim() || 'Alex'}! 👋\n\nJe reisagent heeft een persoonlijke TravelBRO assistent voor je klaargezet voor: *${activeTravelBros.find(t => t.id === selectedTripForInvite)?.name || '[Reis]'}*\n\n📋 Vul eerst even je reisgegevens in via deze link:\n${getShareUrl(activeTravelBros.find(t => t.id === selectedTripForInvite)?.share_token || '')}\n\nDaarna kun je direct hier in WhatsApp al je vragen stellen over de reis! ✈️\n\nIk ben 24/7 beschikbaar om je te helpen. Tot zo! 🌴`
                    )
                  ) : (
                    'Selecteer eerst een TravelBRO om het bericht te zien'
                  )}
                </div>
              </div>

              <button
                onClick={sendWhatsAppInvite}
                disabled={sendingInvite || !isTwilioConfigured || !selectedTripForInvite || !invitePhone.trim()}
                className="w-full flex items-center justify-center space-x-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white px-6 py-3 rounded-lg font-semibold transition-colors"
              >
                {sendingInvite ? (
                  <>
                    <Loader className="w-5 h-5 animate-spin" />
                    <span>Verzenden...</span>
                  </>
                ) : (
                  <>
                    <Send size={20} />
                    <span>Verstuur WhatsApp Uitnodiging</span>
                  </>
                )}
              </button>
            </div>
          </div>
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


      {activeTab === 'settings' && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center space-x-3 mb-6">
              <LinkIcon className="text-orange-500" size={24} />
              <div>
                <h3 className="text-lg font-semibold text-gray-900">TravelBRO Domein</h3>
                <p className="text-sm text-gray-600">Gebruik je eigen domeinnaam voor TravelBRO chat links</p>
              </div>
            </div>

            <div className="space-y-4">
              {systemDefaultDomain && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center space-x-2 mb-2">
                    <LinkIcon className="text-blue-600" size={20} />
                    <h4 className="font-medium text-blue-900">Standaard domein</h4>
                  </div>
                  <p className="text-sm text-blue-800 mb-2">
                    Alle TravelBRO links gebruiken standaard:
                  </p>
                  <code className="block bg-white px-3 py-2 rounded border border-blue-300 text-sm">
                    https://{systemDefaultDomain}/[token]
                  </code>
                  <p className="text-xs text-blue-700 mt-2">
                    Je kunt hieronder je eigen custom domein instellen om dit te overschrijven.
                  </p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Custom Domein (optioneel)
                </label>
                <input
                  type="text"
                  value={travelbroDomain}
                  onChange={(e) => setTravelbroDomain(e.target.value)}
                  placeholder={systemDefaultDomain ? `Laat leeg voor ${systemDefaultDomain}` : "chat.jouwreisbureau.nl"}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                />
                <p className="mt-2 text-sm text-gray-500">
                  Voer alleen de domeinnaam in, zonder https:// of paden. Laat leeg om het standaard domein te gebruiken.
                </p>
              </div>

              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-2">Hoe werkt het?</h4>
                <ol className="text-sm text-gray-700 space-y-2 list-decimal list-inside">
                  <li>Standaard gebruiken alle brands het systeem-brede domein ({systemDefaultDomain || 'nog niet ingesteld'})</li>
                  <li>Wil je een eigen domein? Voer deze hierboven in en klik op "Opslaan"</li>
                  <li>Configureer DNS: voeg een CNAME of A record toe die naar deze applicatie wijst</li>
                  <li>Al je TravelBRO links gebruiken automatisch jouw custom domein</li>
                </ol>
              </div>

              {brandData?.travelbro_domain && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center space-x-2 mb-2">
                    <CheckCircle className="text-green-600" size={20} />
                    <h4 className="font-medium text-green-900">Actief domein</h4>
                  </div>
                  <p className="text-sm text-green-800 mb-2">
                    Je TravelBRO links gebruiken nu:
                  </p>
                  <code className="block bg-white px-3 py-2 rounded border border-green-300 text-sm">
                    https://{brandData.travelbro_domain}/[token]
                  </code>
                </div>
              )}

              <div className="flex space-x-3">
                <button
                  onClick={handleSaveDomain}
                  disabled={savingDomain}
                  className="px-6 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50 flex items-center space-x-2"
                >
                  {savingDomain ? (
                    <>
                      <Loader className="animate-spin" size={18} />
                      <span>Opslaan...</span>
                    </>
                  ) : (
                    <span>Opslaan</span>
                  )}
                </button>
                {travelbroDomain !== (brandData?.travelbro_domain || '') && (
                  <button
                    onClick={() => setTravelbroDomain(brandData?.travelbro_domain || '')}
                    className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                  >
                    Annuleren
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center space-x-3 mb-4">
              <Settings className="text-gray-500" size={24} />
              <h3 className="text-lg font-semibold text-gray-900">DNS Configuratie</h3>
            </div>

            <div className="space-y-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-3">DNS Records instellen voor Vercel</h4>
                <div className="space-y-4 text-sm text-gray-700">
                  <div>
                    <strong className="text-gray-900">Voor Root Domein (bijv. travelbro.nl)</strong>
                    <div className="mt-2 bg-white p-3 rounded border font-mono text-xs space-y-1">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Type:</span>
                        <span className="font-semibold">A</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Name:</span>
                        <span className="font-semibold">@</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Value:</span>
                        <span className="font-semibold">76.76.21.21</span>
                      </div>
                    </div>
                    <p className="mt-2 text-xs text-gray-500">
                      Voeg ook deze tweede A record toe:
                    </p>
                    <div className="mt-1 bg-white p-3 rounded border font-mono text-xs space-y-1">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Type:</span>
                        <span className="font-semibold">A</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Name:</span>
                        <span className="font-semibold">@</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Value:</span>
                        <span className="font-semibold">76.76.21.22</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <strong className="text-gray-900">Voor Subdomain (bijv. chat.jouwreisbureau.nl)</strong>
                    <div className="mt-2 bg-white p-3 rounded border font-mono text-xs space-y-1">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Type:</span>
                        <span className="font-semibold">CNAME</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Name:</span>
                        <span className="font-semibold">chat</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Value:</span>
                        <span className="font-semibold">cname.vercel-dns.com</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded p-3">
                    <p className="text-xs text-blue-900 font-medium mb-1">Belangrijke stappen:</p>
                    <ol className="text-xs text-blue-800 list-decimal list-inside space-y-1">
                      <li>Voeg eerst de DNS records toe bij je domain provider</li>
                      <li>Voeg daarna het domein toe in Vercel Dashboard → Project Settings → Domains</li>
                      <li>Wacht 24-48 uur voor DNS propagatie</li>
                    </ol>
                  </div>
                </div>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-sm text-yellow-800">
                  <strong>Let op:</strong> DNS wijzigingen kunnen 24-48 uur duren voordat ze wereldwijd actief zijn.
                  Test je domein voordat je het met klanten deelt.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
