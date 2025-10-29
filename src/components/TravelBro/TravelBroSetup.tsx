import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { db, supabase } from '../../lib/supabase';
import { Bot, Phone, MessageSquare, Users, Settings, CheckCircle, XCircle, ExternalLink, Copy, Send, Plus, FileText, Link as LinkIcon, Trash2, Share2, Upload, Loader, Edit, Clock, Calendar, ArrowRight, MapPin, Route, Navigation } from 'lucide-react';
import { GooglePlacesAutocomplete } from '../shared/GooglePlacesAutocomplete';
import { edgeAIService } from '../../lib/apiServices';

export function TravelBroSetup() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'new' | 'active' | 'settings' | 'detail'>('overview');
  const [apiSettings, setApiSettings] = useState<any>(null);
  const [activeTravelBros, setActiveTravelBros] = useState<any[]>([]);

  const [selectedTrip, setSelectedTrip] = useState<any>(null);
  const [tripIntakes, setTripIntakes] = useState<any[]>([]);
  const [tripSessions, setTripSessions] = useState<any[]>([]);
  const [loadingTripDetails, setLoadingTripDetails] = useState(false);

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
  const [skipIntake, setSkipIntake] = useState(false);

  const [scheduledMessages, setScheduledMessages] = useState<any[]>([]);
  const [showScheduleForm, setShowScheduleForm] = useState(false);
  const [scheduleMessage, setScheduleMessage] = useState('');
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleTime, setScheduleTime] = useState('09:00');
  const [scheduleTimezone, setScheduleTimezone] = useState('Europe/Amsterdam');
  const [scheduleType, setScheduleType] = useState('custom');
  const [schedulePhone, setSchedulePhone] = useState('');
  const [savingSchedule, setSavingSchedule] = useState(false);

  const [showRouteGenerator, setShowRouteGenerator] = useState(false);
  const [routeFrom, setRouteFrom] = useState('');
  const [routeTo, setRouteTo] = useState('');
  const [routeType, setRouteType] = useState<'short' | 'long'>('short');
  const [generatingRoute, setGeneratingRoute] = useState(false);

  const [isEditingTrip, setIsEditingTrip] = useState(false);
  const [editTripName, setEditTripName] = useState('');
  const [editSourceUrls, setEditSourceUrls] = useState<string[]>(['']);
  const [editTravelers, setEditTravelers] = useState<any[]>([]);
  const [editCustomContext, setEditCustomContext] = useState('');
  const [editGptModel, setEditGptModel] = useState('gpt-4o');
  const [editGptTemperature, setEditGptTemperature] = useState(0.7);
  const [editPdfFile, setEditPdfFile] = useState<File | null>(null);
  const [savingTripEdit, setSavingTripEdit] = useState(false);

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

      const { data: systemTwilio } = await db.supabase
        .from('api_settings')
        .select('*')
        .eq('provider', 'system')
        .eq('service_name', 'Twilio WhatsApp')
        .maybeSingle();

      setApiSettings({
        ...settings,
        twilio_account_sid: systemTwilio?.twilio_account_sid || settings?.twilio_account_sid,
        twilio_auth_token: systemTwilio?.twilio_auth_token || settings?.twilio_auth_token,
        twilio_whatsapp_number: systemTwilio?.twilio_whatsapp_number || settings?.twilio_whatsapp_number,
      });

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

  const loadTripDetails = async (trip: any) => {
    setSelectedTrip(trip);
    setActiveTab('detail');
    setLoadingTripDetails(true);
    try {
      const { data: intakes } = await db.supabase
        .from('travel_intakes')
        .select('*')
        .eq('trip_id', trip.id)
        .order('created_at', { ascending: false });

      setTripIntakes(intakes || []);

      const { data: sessions } = await db.supabase
        .from('travel_whatsapp_sessions')
        .select('*')
        .eq('trip_id', trip.id)
        .order('last_message_at', { ascending: false});

      setTripSessions(sessions || []);

      const { data: messages } = await db.supabase
        .from('scheduled_whatsapp_messages')
        .select('*')
        .eq('trip_id', trip.id)
        .order('scheduled_date', { ascending: true });

      setScheduledMessages(messages || []);
    } catch (error) {
      console.error('Error loading trip details:', error);
    } finally {
      setLoadingTripDetails(false);
    }
  };

  const saveScheduledMessage = async () => {
    if (!selectedTrip || !scheduleMessage.trim() || !scheduleDate || !schedulePhone.trim()) {
      alert('Vul alle velden in');
      return;
    }

    setSavingSchedule(true);
    try {
      const { error } = await db.supabase
        .from('scheduled_whatsapp_messages')
        .insert({
          trip_id: selectedTrip.id,
          brand_id: user?.brand_id,
          message_content: scheduleMessage,
          scheduled_date: scheduleDate,
          scheduled_time: scheduleTime,
          timezone: scheduleTimezone,
          message_type: scheduleType,
          recipient_phone: schedulePhone,
        });

      if (error) throw error;

      alert('✅ Gepland bericht opgeslagen!\n\nLet op: Berichten worden automatisch verstuurd op de geplande tijd. Je kunt de scheduler ook handmatig triggeren via de knop onderaan.');
      setScheduleMessage('');
      setScheduleDate('');
      setScheduleTime('09:00');
      setSchedulePhone('');
      setShowScheduleForm(false);
      await loadTripDetails(selectedTrip);
    } catch (error) {
      console.error('Error saving scheduled message:', error);
      alert('❌ Fout bij opslaan: ' + (error instanceof Error ? error.message : 'Onbekende fout'));
    } finally {
      setSavingSchedule(false);
    }
  };

  const processScheduledMessages = async () => {
    if (!confirm('Wil je alle geplande berichten verwerken die nu verstuurd zouden moeten worden?')) {
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/process-scheduled-messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();

      if (result.success) {
        alert(`✅ Scheduler uitgevoerd!\n\nVerwerkt: ${result.processed}\nSuccesvol: ${result.successful}\nMislukt: ${result.failed}`);
        if (selectedTrip) {
          await loadTripDetails(selectedTrip);
        }
      } else {
        throw new Error(result.error || 'Onbekende fout');
      }
    } catch (error) {
      console.error('Error processing scheduled messages:', error);
      alert('❌ Fout bij verwerken: ' + (error instanceof Error ? error.message : 'Onbekende fout'));
    } finally {
      setLoading(false);
    }
  };

  const generateWhatsAppRoute = async () => {
    if (!routeFrom.trim() || !routeTo.trim()) {
      alert('Vul beide locaties in');
      return;
    }

    setGeneratingRoute(true);
    try {
      const response = await edgeAIService.generateRouteDescription(
        routeFrom,
        routeTo,
        routeType === 'long'
      );

      if (response.error) throw new Error(response.error);

      let message = `🗺️ Route van ${routeFrom} naar ${routeTo}\n\n`;
      message += `📍 Afstand: ${response.distance}\n`;
      message += `⏱️ Reistijd: ${response.duration}\n\n`;

      if (response.story) {
        message += `${response.story}\n\n`;
      }

      message += `🧭 Navigatie:\n`;
      message += `${window.location.origin.replace('http://', 'https://')}/maps?from=${encodeURIComponent(routeFrom)}&to=${encodeURIComponent(routeTo)}`;

      setScheduleMessage(message);
      setScheduleType('route_description');
      setShowRouteGenerator(false);

      alert('✅ Route gegenereerd! Pas het bericht aan indien nodig.');
    } catch (error) {
      console.error('Error generating route:', error);
      alert('❌ Fout bij genereren route: ' + (error instanceof Error ? error.message : 'Onbekende fout'));
    } finally {
      setGeneratingRoute(false);
    }
  };

  const deleteScheduledMessage = async (messageId: string) => {
    if (!confirm('Weet je zeker dat je dit geplande bericht wilt verwijderen?')) return;

    try {
      const { error } = await db.supabase
        .from('scheduled_whatsapp_messages')
        .delete()
        .eq('id', messageId);

      if (error) throw error;

      alert('✅ Gepland bericht verwijderd');
      if (selectedTrip) {
        await loadTripDetails(selectedTrip);
      }
    } catch (error) {
      console.error('Error deleting scheduled message:', error);
      alert('❌ Fout bij verwijderen');
    }
  };

  const closeTripDetails = () => {
    setSelectedTrip(null);
    setTripIntakes([]);
    setTripSessions([]);
    setScheduledMessages([]);
    setInvitePhone('');
    setInviteClientName('');
    setSkipIntake(false);
    setShowScheduleForm(false);
    setScheduleMessage('');
    setScheduleDate('');
    setScheduleTime('09:00');
    setSchedulePhone('');
    setActiveTab('active');
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
    if (!selectedTrip || !invitePhone.trim()) {
      alert('Vul een telefoonnummer in');
      return;
    }

    if (!isTwilioConfigured) {
      alert('⚠️ WhatsApp is nog niet geconfigureerd. Ga naar de Settings tab.');
      return;
    }

    setSendingInvite(true);
    try {
      const clientLink = getShareUrl(selectedTrip.share_token);
      const clientNameText = inviteClientName.trim() ? inviteClientName.trim() : 'Alex';

      const message = skipIntake
        ? `Hoi ${clientNameText}! 👋\n\nJe reisagent heeft een persoonlijke TravelBRO assistent voor je klaargezet voor: *${selectedTrip.name}*\n\nJe kun je direct hier in WhatsApp al je vragen stellen over de reis! ✈️\n\nIk ben 24/7 beschikbaar om je te helpen. Tot zo! 🌴`
        : `Hoi ${clientNameText}! 👋\n\nJe reisagent heeft een persoonlijke TravelBRO assistent voor je klaargezet voor: *${selectedTrip.name}*\n\n📋 Vul eerst even je reisgegevens in via deze link:\n${clientLink}\n\nDaarna kun je direct hier in WhatsApp al je vragen stellen over de reis! ✈️\n\nIk ben 24/7 beschikbaar om je te helpen. Tot zo! 🌴`;

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-whatsapp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          to: invitePhone,
          message: message,
          brandId: user?.brand_id,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Verzenden mislukt');
      }

      alert(`✅ WhatsApp uitnodiging verzonden naar ${invitePhone}!`);
      setInvitePhone('');
      setInviteClientName('');
      setSkipIntake(false);
      await loadTripDetails(selectedTrip);
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
    <>
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
          <div className="bg-white rounded-lg shadow-sm border p-6 max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">Actieve TravelBRO's</h3>
              <Bot className="text-orange-500" size={24} />
            </div>
            <p className="text-3xl font-bold text-gray-900">{activeTravelBros.length}</p>
            <p className="text-sm text-gray-600">Reizen beschikbaar</p>
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

      {activeTab === 'detail' && selectedTrip && (
        <div className="space-y-6">
          <div className="flex items-center space-x-4 mb-6">
            <button
              onClick={closeTripDetails}
              className="flex items-center space-x-2 px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowRight className="rotate-180" size={20} />
              <span>Terug naar lijst</span>
            </button>
            <div className="h-8 w-px bg-gray-300"></div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">{selectedTrip.name}</h2>
              <p className="text-sm text-gray-600">Aangemaakt: {new Date(selectedTrip.created_at).toLocaleDateString('nl-NL')}</p>
            </div>
          </div>

          {loadingTripDetails ? (
            <div className="flex items-center justify-center py-12">
              <Loader className="w-8 h-8 animate-spin text-orange-600" />
            </div>
          ) : (
            <div className="space-y-6">
              <div className="bg-white rounded-lg shadow-sm border p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                    <Settings className="w-5 h-5 mr-2 text-gray-600" />
                    Reis Instellingen
                  </h3>
                  <button
                    onClick={() => {
                      if (isEditingTrip) {
                        setIsEditingTrip(false);
                      } else {
                        setIsEditingTrip(true);
                        setEditTripName(selectedTrip.name);
                        setEditSourceUrls(selectedTrip.source_urls?.length > 0 ? selectedTrip.source_urls : ['']);
                        setEditTravelers(selectedTrip.intake_template?.travelers || [{ name: '', age: '', relation: 'adult' }]);
                        setEditCustomContext(selectedTrip.custom_context || '');
                        setEditGptModel(selectedTrip.gpt_model || 'gpt-4o');
                        setEditGptTemperature(selectedTrip.gpt_temperature ?? 0.7);
                      }
                    }}
                    className="flex items-center space-x-2 px-4 py-2 text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
                  >
                    {isEditingTrip ? (
                      <>
                        <XCircle size={18} />
                        <span>Annuleren</span>
                      </>
                    ) : (
                      <>
                        <Edit size={18} />
                        <span>Bewerken</span>
                      </>
                    )}
                  </button>
                </div>

                {isEditingTrip ? (
                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Reis Naam
                      </label>
                      <input
                        type="text"
                        value={editTripName}
                        onChange={(e) => setEditTripName(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        <FileText className="inline w-4 h-4 mr-1" />
                        Extra PDF Toevoegen
                      </label>
                      <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-orange-500 transition-colors">
                        <input
                          type="file"
                          accept=".pdf"
                          onChange={(e) => setEditPdfFile(e.target.files?.[0] || null)}
                          className="hidden"
                          id="edit-pdf-upload"
                        />
                        <label htmlFor="edit-pdf-upload" className="cursor-pointer">
                          {editPdfFile ? (
                            <div className="text-sm text-gray-700">
                              <CheckCircle className="w-6 h-6 text-green-500 mx-auto mb-2" />
                              <p className="font-medium">{editPdfFile.name}</p>
                            </div>
                          ) : (
                            <div className="text-sm text-gray-600">
                              <Upload className="w-6 h-6 text-gray-400 mx-auto mb-2" />
                              <p>Klik om extra PDF toe te voegen</p>
                            </div>
                          )}
                        </label>
                      </div>
                      {selectedTrip.pdf_url && (
                        <p className="text-xs text-gray-500 mt-2">
                          Huidige PDF: <a href={selectedTrip.pdf_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Bekijk</a>
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        <LinkIcon className="inline w-4 h-4 mr-1" />
                        Bron URLs
                      </label>
                      {editSourceUrls.map((url, index) => (
                        <div key={index} className="flex space-x-2 mb-2">
                          <input
                            type="url"
                            value={url}
                            onChange={(e) => {
                              const updated = [...editSourceUrls];
                              updated[index] = e.target.value;
                              setEditSourceUrls(updated);
                            }}
                            placeholder="https://example.com/reis-info"
                            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                          />
                          {editSourceUrls.length > 1 && (
                            <button
                              onClick={() => setEditSourceUrls(editSourceUrls.filter((_, i) => i !== index))}
                              className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            >
                              <Trash2 size={18} />
                            </button>
                          )}
                        </div>
                      ))}
                      <button
                        onClick={() => setEditSourceUrls([...editSourceUrls, ''])}
                        className="text-sm text-orange-600 hover:text-orange-700 flex items-center space-x-1"
                      >
                        <Plus size={16} />
                        <span>URL toevoegen</span>
                      </button>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Reizigers Pre-fill
                      </label>
                      {editTravelers.map((traveler, index) => (
                        <div key={index} className="bg-gray-50 rounded-lg p-4 mb-3">
                          <div className="grid grid-cols-3 gap-3">
                            <input
                              type="text"
                              value={traveler.name}
                              onChange={(e) => {
                                const updated = [...editTravelers];
                                updated[index].name = e.target.value;
                                setEditTravelers(updated);
                              }}
                              placeholder="Naam"
                              className="px-3 py-2 border border-gray-300 rounded-lg"
                            />
                            <input
                              type="number"
                              value={traveler.age}
                              onChange={(e) => {
                                const updated = [...editTravelers];
                                updated[index].age = e.target.value;
                                setEditTravelers(updated);
                              }}
                              placeholder="Leeftijd"
                              className="px-3 py-2 border border-gray-300 rounded-lg"
                            />
                            <select
                              value={traveler.relation}
                              onChange={(e) => {
                                const updated = [...editTravelers];
                                updated[index].relation = e.target.value;
                                setEditTravelers(updated);
                              }}
                              className="px-3 py-2 border border-gray-300 rounded-lg"
                            >
                              <option value="adult">Volwassene</option>
                              <option value="child">Kind</option>
                              <option value="teen">Tiener</option>
                            </select>
                          </div>
                          {editTravelers.length > 1 && (
                            <button
                              onClick={() => setEditTravelers(editTravelers.filter((_, i) => i !== index))}
                              className="mt-2 text-sm text-red-600 hover:text-red-700"
                            >
                              Verwijder
                            </button>
                          )}
                        </div>
                      ))}
                      <button
                        onClick={() => setEditTravelers([...editTravelers, { name: '', age: '', relation: 'adult' }])}
                        className="text-sm text-orange-600 hover:text-orange-700 flex items-center space-x-1"
                      >
                        <Plus size={16} />
                        <span>Reiziger toevoegen</span>
                      </button>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Custom Context / Instructies voor AI
                      </label>
                      <textarea
                        value={editCustomContext}
                        onChange={(e) => setEditCustomContext(e.target.value)}
                        rows={4}
                        placeholder="Bijvoorbeeld: Dit is een huwelijksreis voor een jong stel. Ze houden van avontuur en romantiek..."
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          GPT Model
                        </label>
                        <select
                          value={editGptModel}
                          onChange={(e) => setEditGptModel(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                        >
                          <option value="gpt-4o">GPT-4o (aanbevolen)</option>
                          <option value="gpt-4-turbo">GPT-4 Turbo</option>
                          <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Temperature ({editGptTemperature})
                        </label>
                        <input
                          type="range"
                          min="0"
                          max="2"
                          step="0.1"
                          value={editGptTemperature}
                          onChange={(e) => setEditGptTemperature(parseFloat(e.target.value))}
                          className="w-full"
                        />
                        <div className="flex justify-between text-xs text-gray-500 mt-1">
                          <span>Precies</span>
                          <span>Creatief</span>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={async () => {
                        if (!editTripName.trim()) {
                          alert('Vul een naam in');
                          return;
                        }

                        setSavingTripEdit(true);
                        try {
                          let newPdfUrl = selectedTrip.pdf_url;
                          let newParsedData = selectedTrip.parsed_data;

                          if (editPdfFile) {
                            const fileName = `${Date.now()}_${editPdfFile.name}`;
                            const { data: uploadData, error: uploadError } = await supabase.storage
                              .from('travel-documents')
                              .upload(fileName, editPdfFile);

                            if (uploadError) throw uploadError;

                            const { data: { publicUrl } } = supabase.storage
                              .from('travel-documents')
                              .getPublicUrl(fileName);

                            newPdfUrl = publicUrl;

                            const parseResponse = await fetch(
                              `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/parse-trip-pdf`,
                              {
                                method: 'POST',
                                headers: {
                                  'Content-Type': 'application/json',
                                  'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
                                },
                                body: JSON.stringify({ pdfUrl: newPdfUrl }),
                              }
                            );

                            if (parseResponse.ok) {
                              newParsedData = await parseResponse.json();
                            }
                          }

                          const filteredUrls = editSourceUrls.filter(u => u.trim());
                          const intakeTemplate = editTravelers.some(t => t.name || t.age)
                            ? { travelers: editTravelers }
                            : null;

                          const { error } = await db.supabase
                            .from('travel_trips')
                            .update({
                              name: editTripName,
                              pdf_url: newPdfUrl,
                              parsed_data: newParsedData || {},
                              source_urls: filteredUrls,
                              intake_template: intakeTemplate,
                              custom_context: editCustomContext,
                              gpt_model: editGptModel,
                              gpt_temperature: editGptTemperature,
                            })
                            .eq('id', selectedTrip.id);

                          if (error) throw error;

                          alert('✅ Reis bijgewerkt!');
                          setIsEditingTrip(false);
                          setEditPdfFile(null);
                          await loadData();
                          const updatedTrip = activeTravelBros.find(t => t.id === selectedTrip.id);
                          if (updatedTrip) {
                            setSelectedTrip(updatedTrip);
                          }
                        } catch (error) {
                          console.error('Error updating trip:', error);
                          alert('❌ Fout bij bijwerken: ' + (error instanceof Error ? error.message : 'Onbekende fout'));
                        } finally {
                          setSavingTripEdit(false);
                        }
                      }}
                      disabled={savingTripEdit}
                      className="w-full flex items-center justify-center space-x-2 bg-orange-600 hover:bg-orange-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white px-6 py-3 rounded-lg font-semibold transition-colors"
                    >
                      {savingTripEdit ? (
                        <>
                          <Loader className="w-5 h-5 animate-spin" />
                          <span>Opslaan...</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle size={20} />
                          <span>Wijzigingen Opslaan</span>
                        </>
                      )}
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600">PDF:</span>
                        <span className="ml-2 text-gray-900">{selectedTrip.pdf_url ? '✓ Ja' : '– Nee'}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">URLs:</span>
                        <span className="ml-2 text-gray-900">{selectedTrip.source_urls?.length || 0}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Reizigers:</span>
                        <span className="ml-2 text-gray-900">{selectedTrip.intake_template?.travelers?.length || 0}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">GPT Model:</span>
                        <span className="ml-2 text-gray-900">{selectedTrip.gpt_model || 'gpt-4o'}</span>
                      </div>
                    </div>
                    {selectedTrip.custom_context && (
                      <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                        <p className="text-xs text-gray-600 mb-1">Custom Context:</p>
                        <p className="text-sm text-gray-900">{selectedTrip.custom_context}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="bg-white rounded-lg shadow-sm border p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <Phone className="w-5 h-5 mr-2 text-orange-600" />
                  Stuur WhatsApp Uitnodiging
                </h3>

                {!isTwilioConfigured && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                    <p className="text-sm text-yellow-800">
                      <strong>WhatsApp niet geconfigureerd.</strong> Ga naar de Settings tab om je Twilio credentials in te vullen.
                    </p>
                  </div>
                )}

                <div className="space-y-4">
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
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <label className="flex items-start cursor-pointer">
                      <input
                        type="checkbox"
                        checked={skipIntake}
                        onChange={(e) => setSkipIntake(e.target.checked)}
                        className="mt-1 h-4 w-4 text-orange-600 border-gray-300 rounded focus:ring-orange-500"
                      />
                      <span className="ml-3 flex-1">
                        <span className="text-sm font-medium text-gray-900 block">Intake formulier overslaan</span>
                        <span className="text-xs text-gray-600">Klant kan direct chatten zonder intake</span>
                      </span>
                    </label>
                  </div>

                  <button
                    onClick={sendWhatsAppInvite}
                    disabled={sendingInvite || !isTwilioConfigured || !invitePhone.trim()}
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

              <div className="bg-white rounded-lg shadow-sm border p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <FileText className="w-5 h-5 mr-2 text-blue-600" />
                  Ingevulde Intake Formulieren ({tripIntakes.length})
                </h3>

                {tripIntakes.length === 0 ? (
                  <p className="text-gray-600 text-sm">Nog geen intake formulieren ingevuld voor deze reis</p>
                ) : (
                  <div className="space-y-3">
                    {tripIntakes.map((intake) => (
                      <div key={intake.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-gray-900">
                              {intake.travelers_count} reiziger{intake.travelers_count !== 1 ? 's' : ''}
                            </p>
                            <p className="text-xs text-gray-500">
                              {new Date(intake.completed_at || intake.created_at).toLocaleString('nl-NL')}
                            </p>
                          </div>
                          <button
                            onClick={() => {
                              console.log('Intake data:', intake.intake_data);
                              alert('Intake data zie je in de console');
                            }}
                            className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                          >
                            Bekijk details
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="bg-white rounded-lg shadow-sm border p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <MessageSquare className="w-5 h-5 mr-2 text-green-600" />
                  WhatsApp Sessies ({tripSessions.length})
                </h3>

                {tripSessions.length === 0 ? (
                  <p className="text-gray-600 text-sm">Nog geen WhatsApp conversaties voor deze reis</p>
                ) : (
                  <div className="space-y-3">
                    {tripSessions.map((session) => (
                      <div key={session.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-gray-900">{session.phone_number}</p>
                            <p className="text-xs text-gray-500">
                              Laatste bericht: {new Date(session.last_message_at || session.created_at).toLocaleString('nl-NL')}
                            </p>
                          </div>
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            Actief
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="bg-white rounded-lg shadow-sm border p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                    <Clock className="w-5 h-5 mr-2 text-purple-600" />
                    Geplande WhatsApp Berichten ({scheduledMessages.filter(m => !m.is_sent).length})
                  </h3>
                  <button
                    onClick={() => setShowScheduleForm(!showScheduleForm)}
                    className="flex items-center space-x-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium transition-colors"
                  >
                    <Plus size={16} />
                    <span>Plan Bericht</span>
                  </button>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                  <p className="text-sm text-blue-900">
                    <strong>📅 Automatische berichten:</strong> Plan berichten die automatisch verstuurd worden op een specifieke datum en tijd. Perfect voor routebeschrijvingen, hotel check-in reminders, of vlucht informatie.
                  </p>
                  <p className="text-xs text-blue-700 mt-2">
                    💡 <strong>Tijdzone support:</strong> Het systeem houdt automatisch rekening met tijdsverschillen! Stel de timezone in van de bestemming waar je klant is.
                  </p>
                </div>

                {showScheduleForm && (
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4 space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Telefoonnummer
                      </label>
                      <input
                        type="tel"
                        value={schedulePhone}
                        onChange={(e) => setSchedulePhone(e.target.value)}
                        placeholder="+31612345678"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          <Calendar className="w-4 h-4 inline mr-1" />
                          Datum
                        </label>
                        <input
                          type="date"
                          value={scheduleDate}
                          onChange={(e) => setScheduleDate(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          <Clock className="w-4 h-4 inline mr-1" />
                          Tijd
                        </label>
                        <input
                          type="time"
                          value={scheduleTime}
                          onChange={(e) => setScheduleTime(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Timezone (waar de klant is)
                      </label>
                      <select
                        value={scheduleTimezone}
                        onChange={(e) => setScheduleTimezone(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      >
                        <option value="Europe/Amsterdam">Nederland (Amsterdam)</option>
                        <option value="Europe/Brussels">België (Brussels)</option>
                        <option value="Europe/London">UK (London)</option>
                        <option value="Europe/Paris">Frankrijk (Paris)</option>
                        <option value="Europe/Berlin">Duitsland (Berlin)</option>
                        <option value="Europe/Madrid">Spanje (Madrid)</option>
                        <option value="Europe/Rome">Italië (Rome)</option>
                        <option value="Europe/Athens">Griekenland (Athens)</option>
                        <option value="Asia/Bangkok">Thailand (Bangkok)</option>
                        <option value="Asia/Tokyo">Japan (Tokyo)</option>
                        <option value="Asia/Dubai">UAE (Dubai)</option>
                        <option value="America/New_York">VS Oost (New York)</option>
                        <option value="America/Los_Angeles">VS West (Los Angeles)</option>
                        <option value="America/Cancun">Mexico (Cancun)</option>
                        <option value="Pacific/Auckland">Nieuw-Zeeland (Auckland)</option>
                        <option value="Australia/Sydney">Australië (Sydney)</option>
                      </select>
                      <p className="text-xs text-gray-500 mt-1">
                        Belangrijk: Kies de timezone waar je klant zich bevindt tijdens de reis
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Bericht Type
                      </label>
                      <select
                        value={scheduleType}
                        onChange={(e) => setScheduleType(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      >
                        <option value="route_description">🗺️ Routebeschrijving</option>
                        <option value="hotel_checkin">🏨 Hotel Check-in</option>
                        <option value="flight_reminder">✈️ Vlucht Reminder</option>
                        <option value="activity_reminder">🎯 Activiteit Reminder</option>
                        <option value="custom">📝 Custom Bericht</option>
                      </select>
                    </div>

                    {scheduleType === 'route_description' && !showRouteGenerator && (
                      <button
                        onClick={() => setShowRouteGenerator(true)}
                        className="w-full flex items-center justify-center space-x-2 bg-blue-50 hover:bg-blue-100 text-blue-700 px-4 py-3 rounded-lg border-2 border-dashed border-blue-300 transition-colors"
                      >
                        <Route size={18} />
                        <span className="font-medium">Genereer Route met AI</span>
                      </button>
                    )}

                    {showRouteGenerator && (
                      <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4 space-y-3">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-semibold text-blue-900 flex items-center space-x-2">
                            <Navigation size={16} />
                            <span>Route Generator</span>
                          </h4>
                          <button
                            onClick={() => setShowRouteGenerator(false)}
                            className="text-blue-600 hover:text-blue-800 text-sm"
                          >
                            Sluiten
                          </button>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-blue-900 mb-1">
                            Van
                          </label>
                          <GooglePlacesAutocomplete
                            value={routeFrom}
                            onChange={setRouteFrom}
                            placeholder="Startlocatie..."
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-blue-900 mb-1">
                            Naar
                          </label>
                          <GooglePlacesAutocomplete
                            value={routeTo}
                            onChange={setRouteTo}
                            placeholder="Eindbestemming..."
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-blue-900 mb-2">
                            Route type
                          </label>
                          <div className="flex space-x-2">
                            <button
                              onClick={() => setRouteType('short')}
                              className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                                routeType === 'short'
                                  ? 'bg-blue-600 text-white'
                                  : 'bg-white text-blue-900 border border-blue-300 hover:bg-blue-100'
                              }`}
                            >
                              🛣️ Snelweg
                            </button>
                            <button
                              onClick={() => setRouteType('long')}
                              className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                                routeType === 'long'
                                  ? 'bg-blue-600 text-white'
                                  : 'bg-white text-blue-900 border border-blue-300 hover:bg-blue-100'
                              }`}
                            >
                              🌳 Binnendoor
                            </button>
                          </div>
                        </div>

                        <button
                          onClick={generateWhatsAppRoute}
                          disabled={generatingRoute || !routeFrom.trim() || !routeTo.trim()}
                          className="w-full flex items-center justify-center space-x-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg font-medium transition-colors"
                        >
                          {generatingRoute ? (
                            <>
                              <Loader className="w-4 h-4 animate-spin" />
                              <span>Genereren...</span>
                            </>
                          ) : (
                            <>
                              <Route size={16} />
                              <span>Genereer Route</span>
                            </>
                          )}
                        </button>
                      </div>
                    )}

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Bericht
                      </label>
                      <textarea
                        value={scheduleMessage}
                        onChange={(e) => setScheduleMessage(e.target.value)}
                        rows={8}
                        placeholder="Bijv: Hoi! Vandaag reis je van Bangkok naar Chiang Mai. Hier is je routebeschrijving..."
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent font-mono text-sm"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        💡 Tip: Schrijf het bericht alsof je direct met de klant praat
                      </p>
                    </div>

                    <div className="flex space-x-3">
                      <button
                        onClick={saveScheduledMessage}
                        disabled={savingSchedule || !scheduleMessage.trim() || !scheduleDate || !schedulePhone.trim()}
                        className="flex-1 flex items-center justify-center space-x-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white px-6 py-3 rounded-lg font-semibold transition-colors"
                      >
                        {savingSchedule ? (
                          <>
                            <Loader className="w-5 h-5 animate-spin" />
                            <span>Opslaan...</span>
                          </>
                        ) : (
                          <>
                            <CheckCircle size={20} />
                            <span>Opslaan</span>
                          </>
                        )}
                      </button>
                      <button
                        onClick={() => {
                          setShowScheduleForm(false);
                          setScheduleMessage('');
                          setScheduleDate('');
                          setSchedulePhone('');
                        }}
                        className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        Annuleren
                      </button>
                    </div>
                  </div>
                )}

                {scheduledMessages.length === 0 ? (
                  <p className="text-gray-600 text-sm">Nog geen geplande berichten</p>
                ) : (
                  <div className="space-y-3">
                    {scheduledMessages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`border rounded-lg p-4 ${msg.is_sent ? 'bg-gray-50 border-gray-200' : 'bg-white hover:bg-gray-50'} transition-colors`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-2">
                              {msg.message_type === 'route_description' && <span>🗺️</span>}
                              {msg.message_type === 'hotel_checkin' && <span>🏨</span>}
                              {msg.message_type === 'flight_reminder' && <span>✈️</span>}
                              {msg.message_type === 'activity_reminder' && <span>🎯</span>}
                              {msg.message_type === 'custom' && <span>📝</span>}
                              <span className="font-medium text-gray-900 capitalize">
                                {msg.message_type.replace('_', ' ')}
                              </span>
                              {msg.is_sent && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                  <CheckCircle size={12} className="mr-1" />
                                  Verzonden
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-gray-700 mb-2 line-clamp-2">{msg.message_content}</p>
                            <div className="flex items-center space-x-4 text-xs text-gray-500">
                              <span>📱 {msg.recipient_phone}</span>
                              <span>📅 {new Date(msg.scheduled_date + 'T' + msg.scheduled_time).toLocaleDateString('nl-NL')}</span>
                              <span>⏰ {msg.scheduled_time}</span>
                              <span>🌍 {msg.timezone.split('/')[1]}</span>
                            </div>
                            {msg.is_sent && msg.sent_at && (
                              <p className="text-xs text-green-600 mt-1">
                                Verzonden: {new Date(msg.sent_at).toLocaleString('nl-NL')}
                              </p>
                            )}
                          </div>
                          {!msg.is_sent && (
                            <button
                              onClick={() => deleteScheduledMessage(msg.id)}
                              className="ml-4 p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Verwijder"
                            >
                              <Trash2 size={18} />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="mt-6 pt-6 border-t">
                  <div className="bg-blue-50 rounded-lg p-4 mb-4">
                    <div className="flex items-start space-x-3">
                      <Clock className="w-5 h-5 text-blue-600 mt-0.5" />
                      <div className="flex-1">
                        <h4 className="font-semibold text-blue-900 mb-1">Automatische Scheduler</h4>
                        <p className="text-sm text-blue-700 mb-2">
                          Geplande berichten worden automatisch verstuurd op de ingestelde datum en tijd.
                          Je kunt de scheduler ook handmatig triggeren om berichten die nu verstuurd zouden moeten worden direct te verwerken.
                        </p>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={processScheduledMessages}
                    disabled={loading}
                    className="w-full flex items-center justify-center space-x-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white px-6 py-3 rounded-lg font-semibold transition-colors"
                  >
                    {loading ? (
                      <>
                        <Loader className="w-5 h-5 animate-spin" />
                        <span>Verwerken...</span>
                      </>
                    ) : (
                      <>
                        <Clock className="w-5 h-5" />
                        <span>Verwerk Geplande Berichten Nu</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
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
                    <div className="flex-1 cursor-pointer" onClick={() => loadTripDetails(trip)}>
                      <h3 className="text-lg font-semibold text-gray-900 mb-2 hover:text-orange-600 transition-colors">{trip.name}</h3>
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
                        onClick={(e) => { e.stopPropagation(); loadTripDetails(trip); }}
                        className="p-2 text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
                        title="Open details"
                      >
                        <Edit size={18} />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); copyClientLink(trip.share_token); }}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Kopieer client link voor reizigers"
                      >
                        <Share2 size={18} />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); deleteTravelBro(trip.id); }}
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
    </>
  );
}
