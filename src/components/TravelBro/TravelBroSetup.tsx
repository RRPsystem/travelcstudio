import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { db, supabase } from '../../lib/supabase';
import { Bot, Phone, MessageSquare, Users, Settings, CheckCircle, XCircle, ExternalLink, Copy, Send, Plus, FileText, Link as LinkIcon, Trash2, Upload, Loader, CreditCard as Edit, Clock, Calendar, ArrowRight, MapPin, Route, Navigation, CreditCard, BookOpen, Share2 } from 'lucide-react';
import { GooglePlacesAutocomplete } from '../shared/GooglePlacesAutocomplete';
import { edgeAIService } from '../../lib/apiServices';

const DEFAULT_CUSTOM_CONTEXT = `FOTO HERKENNING:
- Wanneer de reiziger een foto stuurt van een landmark of locatie, gebruik DIE herkende locatie als vertrekpunt voor route-vragen
- Leg uit wat je op de foto ziet voordat je antwoord geeft
- Bij route vragen: altijd vanaf de laatst herkende locatie starten

COMMUNICATIE STIJL:
- Wees enthousiast en persoonlijk, alsof je een goede vriend bent die meereist
- Gebruik lokale tips en insider informatie waar mogelijk
- Stem je antwoorden af op het type reis en de reizigers

PRAKTISCH:
- Geef concrete tijden, afstanden en transportopties
- Waarschuw voor praktische zaken (openingstijden, drukte, weer)
- Vraag door als iets onduidelijk is over hun voorkeuren`;

function normalizePhoneNumber(phone: string): string {
  let normalized = phone.trim().replace(/\s+/g, '');

  if (normalized.startsWith('00')) {
    normalized = '+' + normalized.substring(2);
  } else if (normalized.startsWith('0') && !normalized.startsWith('00')) {
    normalized = '+31' + normalized.substring(1);
  } else if (!normalized.startsWith('+')) {
    normalized = '+' + normalized;
  }

  return normalized;
}

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
  const [compositorBookingId, setCompositorBookingId] = useState('');
  const [micrositeId, setMicrositeId] = useState('rondreis-planner');
  const [microsites, setMicrosites] = useState<Array<{id: string, name: string, hasCredentials: boolean}>>([]);
  const [loadingMicrosites, setLoadingMicrosites] = useState(false);
  const [syncingCompositor, setSyncingCompositor] = useState(false);
  const [compositorData, setCompositorData] = useState<any>(null);
  const [syncedTripId, setSyncedTripId] = useState<string | null>(null);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [sourceUrls, setSourceUrls] = useState<string[]>(['']);
  const [travelers, setTravelers] = useState([{ name: '', age: '', relation: 'adult', phone: '' }]);
  const [customContext, setCustomContext] = useState(DEFAULT_CUSTOM_CONTEXT);
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

  // Chat history modal state
  const [showChatModal, setShowChatModal] = useState(false);
  const [selectedSession, setSelectedSession] = useState<any>(null);
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [loadingChat, setLoadingChat] = useState(false);

  const [showRouteGenerator, setShowRouteGenerator] = useState(false);
  const [routeFrom, setRouteFrom] = useState('');
  const [routeTo, setRouteTo] = useState('');
  const [routeType, setRouteType] = useState<'short' | 'long'>('short');
  const [generatingRoute, setGeneratingRoute] = useState(false);

  const [isEditingTrip, setIsEditingTrip] = useState(false);
  const [editTripName, setEditTripName] = useState('');
  const [editSourceUrls, setEditSourceUrls] = useState<string[]>(['']);
  const [editTravelers, setEditTravelers] = useState<any[]>([]);
  const [editCustomContext, setEditCustomContext] = useState(DEFAULT_CUSTOM_CONTEXT);
  const [editGptModel, setEditGptModel] = useState('gpt-4o');
  const [editGptTemperature, setEditGptTemperature] = useState(0.7);
  const [editPdfFile, setEditPdfFile] = useState<File | null>(null);
  const [editCompositorId, setEditCompositorId] = useState('');
  const [savingTripEdit, setSavingTripEdit] = useState(false);

  const [creditBalance, setCreditBalance] = useState<number | null>(null);
  
  const [roadbooks, setRoadbooks] = useState<any[]>([]);
  const [selectedRoadbookId, setSelectedRoadbookId] = useState<string>('');
  const [loadingRoadbooks, setLoadingRoadbooks] = useState(false);

  useEffect(() => {
    loadData();
    loadMicrosites();
    loadRoadbooks();
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

      const { data: creditWallet } = await db.supabase
        .from('credit_wallets')
        .select('balance')
        .eq('user_id', user?.id)
        .maybeSingle();

      setCreditBalance(creditWallet?.balance ?? null);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMicrosites = async () => {
    setLoadingMicrosites(true);
    try {
      // Load microsites from tc_microsites table
      const { data: micrositesData, error } = await db.supabase
        .from('tc_microsites')
        .select('microsite_id, name, is_active')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;

      if (micrositesData && micrositesData.length > 0) {
        const formattedMicrosites = micrositesData.map(ms => ({
          id: ms.microsite_id,
          name: ms.name,
          hasCredentials: true
        }));
        setMicrosites(formattedMicrosites);
        setMicrositeId(formattedMicrosites[0].id);
      } else {
        // Fallback to default if no microsites configured
        console.log('ℹ️ No microsites found in database, using default');
        setMicrosites([{ id: 'rondreis-planner', name: 'Rondreis Planner', hasCredentials: true }]);
      }
    } catch (error) {
      console.error('Error loading microsites:', error);
      // Fallback to default on error
      setMicrosites([{ id: 'rondreis-planner', name: 'Rondreis Planner', hasCredentials: true }]);
    } finally {
      setLoadingMicrosites(false);
    }
  };

  const loadRoadbooks = async () => {
    if (!db.supabase || !user?.brand_id) return;
    setLoadingRoadbooks(true);
    try {
      const { data, error } = await db.supabase
        .from('travel_roadbooks')
        .select('id, title, client_name')
        .eq('brand_id', user.brand_id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRoadbooks(data || []);
    } catch (error) {
      console.error('Error loading roadbooks:', error);
    } finally {
      setLoadingRoadbooks(false);
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

  const loadChatHistory = async (session: any) => {
    setSelectedSession(session);
    setShowChatModal(true);
    setLoadingChat(true);
    setChatMessages([]);
    
    try {
      if (!db.supabase) return;
      const { data: messages } = await db.supabase
        .from('travel_chat_messages')
        .select('*')
        .eq('session_token', session.session_token)
        .order('created_at', { ascending: true });

      setChatMessages(messages || []);
    } catch (error) {
      console.error('Error loading chat history:', error);
    } finally {
      setLoadingChat(false);
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
    console.log('🟡 Step 1: Starting handleCreateTravelBro');
    console.log('🟡 Step 2: newTripName=', newTripName);
    console.log('🟡 Step 3: pdfFile=', pdfFile);
    console.log('🟡 Step 4: sourceUrls=', sourceUrls);

    try {
      console.log('🟡 Step 5: Checking validation...');
      const hasName = !!newTripName.trim();
      const hasPdf = !!pdfFile;
      const hasUrls = sourceUrls.filter(u => u.trim()).length > 0;
      console.log('Validation:', { hasName, hasPdf, hasUrls });

      if (!hasName || (!hasPdf && !hasUrls)) {
        alert('Vul minimaal een naam en upload een PDF of voeg URLs toe');
        return;
      }

      console.log('✅ Validation passed, starting creation...');
      setCreating(true);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Niet ingelogd');
      }

      console.log('💳 Checking credits...');
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const creditCheckResponse = await fetch(`${supabaseUrl}/functions/v1/deduct-credits`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          actionType: 'travelbro_setup',
          description: `TravelBro aanmaken: ${newTripName}`,
          metadata: {
            tripName: newTripName,
            hasPdf: !!pdfFile,
            hasUrls: sourceUrls.filter(u => u.trim()).length > 0
          }
        })
      });

      if (!creditCheckResponse.ok) {
        const errorData = await creditCheckResponse.json();
        throw new Error(errorData.error || 'Onvoldoende credits');
      }

      console.log('✅ Credits deducted, continuing with creation...');
      console.log('📤 Uploading PDF...');
      let pdfUrl = null;
      let parsedData = null;

      if (pdfFile) {
        console.log('📄 Preparing file upload:', {
          name: pdfFile.name,
          size: pdfFile.size,
          type: pdfFile.type
        });

        const { data: { session } } = await supabase.auth.getSession();
        console.log('🔐 User session:', session ? 'authenticated' : 'NOT authenticated');

        const fileName = `${Date.now()}_${pdfFile.name}`;
        console.log('📄 fileName:', fileName);
        console.log('🔄 Calling supabase.storage.upload...');

        const uploadPromise = supabase.storage
          .from('travel-documents')
          .upload(fileName, pdfFile);

        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Upload timeout after 30s')), 30000)
        );

        const { data: uploadData, error: uploadError } = await Promise.race([
          uploadPromise,
          timeoutPromise
        ]) as any;

        console.log('✅ Upload response:', { uploadData, uploadError });
        if (uploadError) throw uploadError;

        console.log('🔗 Getting public URL...');
        const { data: { publicUrl } } = supabase.storage
          .from('travel-documents')
          .getPublicUrl(fileName);

        console.log('🔗 Public URL:', publicUrl);
        pdfUrl = publicUrl;

        console.log('🤖 Calling parse-trip-pdf...');
        console.log('🤖 PDF URL:', pdfUrl);

        try {
          const { data: { session } } = await supabase.auth.getSession();

          if (!session) {
            throw new Error('No authentication session found');
          }

          const parseResponse = await fetch(
            `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/parse-trip-pdf`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${session.access_token}`,
              },
              body: JSON.stringify({ pdfUrl }),
            }
          );

          console.log('🤖 Parse response status:', parseResponse.status);

          if (parseResponse.ok) {
            const parseResult = await parseResponse.json();
            console.log('📋 Parsed data:', parseResult);

            parsedData = parseResult;

            if (parseResult.itinerary) {
              console.log('📅 Itinerary found, storing in metadata');
            }

            await loadData();
          } else {
            const errorText = await parseResponse.text();
            console.error('❌ PDF parsing failed:', errorText);

            let errorMsg = '⚠️ PDF parsing mislukt: ';
            if (parseResponse.status === 402) {
              errorMsg += 'Onvoldoende credits. Neem contact op met de operator om credits bij te kopen.';
            } else {
              errorMsg += errorText.substring(0, 200);
            }
            errorMsg += '\n\nDe TravelBRO wordt wel aangemaakt, maar zonder PDF data.';
            alert(errorMsg);
          }
        } catch (fetchError) {
          console.error('❌ Fetch error:', fetchError);
          alert(`⚠️ Kon PDF niet verwerken: ${fetchError.message}. De TravelBRO wordt wel aangemaakt, maar zonder PDF data.`);
        }
      }

      const filteredUrls = sourceUrls.filter(u => u.trim());
      const intakeTemplate = travelers.some(t => t.name || t.age)
        ? { travelers }
        : null;

      const itinerary = parsedData?.itinerary;
      const tripMetadata = itinerary ? { itinerary } : null;

      let createdTrip: any;

      // If trip was already created by sync-travel API, update it instead of creating new
      if (syncedTripId) {
        console.log('💾 Trip already exists from sync, updating:', syncedTripId);
        
        const { data, error } = await db.supabase
          .from('travel_trips')
          .update({
            name: newTripName,
            pdf_url: pdfUrl,
            metadata: tripMetadata,
            intake_template: intakeTemplate,
            gpt_model: gptModel,
            gpt_temperature: gptTemperature,
            created_by: user?.id,
          })
          .eq('id', syncedTripId)
          .select()
          .single();

        console.log('💾 Update response:', { data, error });
        if (error) throw error;
        createdTrip = data;
      } else {
        // No synced trip, create new one
        console.log('💾 Creating new trip...');
        
        const { data, error } = await db.supabase
          .from('travel_trips')
          .insert({
            brand_id: user?.brand_id,
            name: newTripName,
            compositor_booking_id: compositorBookingId.trim() || null,
            pdf_url: pdfUrl,
            parsed_data: parsedData || {},
            metadata: tripMetadata,
            source_urls: filteredUrls,
            intake_template: intakeTemplate,
            custom_context: customContext,
            gpt_model: gptModel,
            gpt_temperature: gptTemperature,
            created_by: user?.id,
          })
          .select()
          .single();

        console.log('💾 Insert response:', { data, error });
        if (error) throw error;
        createdTrip = data;
      }

      if (compositorBookingId.trim()) {
        console.log('🔔 Notifying External Builder webhook for Compositor sync...');
        try {
          const { data: { session } } = await supabase.auth.getSession();
          const webhookResponse = await fetch(
            `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/notify-compositor-webhook`,
            {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${session?.access_token}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                trip_id: createdTrip.id,
                event: 'trip.created',
              }),
            }
          );

          if (webhookResponse.ok) {
            const webhookResult = await webhookResponse.json();
            console.log('✅ Webhook notification sent:', webhookResult);
          } else {
            console.warn('⚠️ Webhook notification failed, but continuing...', await webhookResponse.text());
          }
        } catch (webhookError) {
          console.error('⚠️ Error notifying webhook:', webhookError);
        }
      }

      const travelersWithPhone = travelers.filter(t => t.phone && t.phone.trim());

      if (travelersWithPhone.length > 0) {
        console.log(`📤 Scheduling welkomstberichten voor ${travelersWithPhone.length} reizigers...`);

        let successCount = 0;
        let failCount = 0;

        for (const traveler of travelersWithPhone) {
          try {
            const normalizedPhone = normalizePhoneNumber(traveler.phone);
            console.log(`📱 Normalized phone: ${traveler.phone} -> ${normalizedPhone}`);

            const { error: participantError } = await db.supabase
              .from('trip_participants')
              .insert({
                trip_id: createdTrip.id,
                brand_id: user?.brand_id,
                phone_number: normalizedPhone,
                participant_name: traveler.name || 'Reiziger',
                is_primary_contact: successCount === 0,
              });

            if (participantError) {
              console.error(`❌ Error adding participant ${traveler.name}:`, participantError);
              failCount++;
              continue;
            }

            // Send welcome message directly via edge function
            const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-whatsapp`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
              },
              body: JSON.stringify({
                to: normalizedPhone,
                brandId: user?.brand_id,
                useTemplate: true,
                templateSid: 'HX23e0ee5840758fb35bd1bedf502fdf42',
                templateVariables: {
                  '1': (traveler.name || 'Reiziger').substring(0, 100),
                  '2': (createdTrip.name || 'jouw reis').substring(0, 100),
                },
                tripId: createdTrip.id,
                sessionToken: crypto.randomUUID(),
              }),
            });

            if (!response.ok) {
              const result = await response.json();
              console.error(`❌ Error sending message for ${traveler.name}:`, result);
              failCount++;
            } else {
              successCount++;
              console.log(`✅ Welcome message sent to ${traveler.name}`);
            }
          } catch (error) {
            console.error(`❌ Error processing traveler ${traveler.name}:`, error);
            failCount++;
          }
        }

        if (successCount > 0) {
          alert(`✅ TravelBRO aangemaakt!\n\n${successCount} welkomstbericht(en) verstuurd naar je klant(en).${failCount > 0 ? `\n⚠️ ${failCount} bericht(en) mislukt.` : ''}`);
        } else {
          alert('⚠️ TravelBRO aangemaakt, maar WhatsApp berichten konden niet worden verstuurd. Check de Twilio instellingen.');
        }
      } else if (intakeTemplate) {
        console.log('📋 TravelBRO heeft intake formulier - klant moet eerst formulier invullen');
        alert('✅ TravelBRO aangemaakt! (50 credits gebruikt) Deel de client link met je klant zodat ze het intake formulier kunnen invullen.');
      } else {
        alert('✅ TravelBRO aangemaakt! (50 credits gebruikt, geen telefoonnummers opgegeven)');
      }

      console.log('✅ TravelBRO created successfully!');
      setNewTripName('');
      setCompositorBookingId('');
      setCompositorData(null);
      setSyncedTripId(null);
      setPdfFile(null);
      setSourceUrls(['']);
      setTravelers([{ name: '', age: '', relation: 'adult', phone: '' }]);
      setCustomContext(DEFAULT_CUSTOM_CONTEXT);
      setGptModel('gpt-4o');
      setGptTemperature(0.7);
      
      // Navigate directly to the new trip's detail page
      await loadData();
      loadTripDetails(createdTrip);
    } catch (error) {
      console.error('❌ Error in handleCreateTravelBro:', error);
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
    setCustomContext(trip.custom_context || DEFAULT_CUSTOM_CONTEXT);
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
    setCustomContext(DEFAULT_CUSTOM_CONTEXT);
    setGptModel('gpt-4o');
    setGptTemperature(0.7);
  };

  const handleUpdateTravelBro = async () => {
    console.log('DEBUG UPDATE: newTripName=', newTripName, 'editingTrip=', editingTrip);
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


  const handleSyncCompositorData = async () => {
    if (!compositorBookingId.trim()) {
      alert('⚠️ Vul eerst een Compositor Booking ID in');
      return;
    }

    if (!micrositeId) {
      alert('⚠️ Selecteer eerst een microsite');
      return;
    }

    setSyncingCompositor(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/fetch-external-api`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: 'https://www.ai-websitestudio.nl/api/travelbro/sync-travel',
          method: 'POST',
          body: {
            id: compositorBookingId.trim(),
            micrositeId: micrositeId,
            language: 'NL',
            brand_id: user?.brand_id || '00000000-0000-0000-0000-000000000999' // Admin Workspace fallback
          }
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Fetch-external-api error:', errorText);
        throw new Error(`Compositor API fout (${response.status}): ${errorText || response.statusText}`);
      }

      const proxyResult = await response.json();
      console.log('📦 Proxy result:', proxyResult);

      if (!proxyResult.success) {
        const errorMsg = proxyResult.error || proxyResult.details || 'Sync failed';
        console.error('❌ Proxy error:', errorMsg);
        throw new Error(errorMsg);
      }

      const result = proxyResult.data;
      console.log('📦 API result:', result);

      if (!result.success) {
        const errorMsg = result.error || result.details || 'Sync failed';
        console.error('❌ API error:', errorMsg);
        throw new Error(errorMsg);
      }

      setCompositorData(result.data);
      
      // Store the trip_id from sync so we don't create a duplicate
      if (result.trip_id) {
        setSyncedTripId(result.trip_id);
        console.log('✅ Trip already created by sync-travel API:', result.trip_id);
      }

      if (result.data?.title) {
        setNewTripName(result.data.title);
      }

      if (result.data?.destination_names && result.data.destination_names.length > 0) {
        setSourceUrls([result.data.destination_names.join(', ')]);
      }

      alert(`✅ Data opgehaald én opgeslagen van Travel Compositor!\n\nReis: ${result.data?.title}\nTC ID: ${result.tc_idea_id}\nDuur: ${result.data?.duration_days || 0} dagen`);

      await loadData();
    } catch (error) {
      console.error('❌ Compositor sync error:', error);
      alert('❌ Kon geen data ophalen: ' + (error instanceof Error ? error.message : 'Onbekende fout'));
    } finally {
      setSyncingCompositor(false);
    }
  };

  const handleResyncTripFromCompositor = async (trip: any) => {
    if (!trip.compositor_booking_id) {
      alert('⚠️ Deze reis heeft geen Compositor Booking ID');
      return;
    }

    if (!confirm(`Wil je de data voor "${trip.name}" opnieuw ophalen uit Travel Compositor?\n\nDit synchroniseert de trip data!`)) {
      return;
    }

    setLoading(true);
    try {
      console.log('[Re-sync] Starting compositor sync for trip:', trip.id);

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/compositor-sync`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          trip_id: trip.id,
          compositor_booking_id: trip.compositor_booking_id.trim(),
          compositor_api_url: 'https://www.ai-websitestudio.nl/api/travelbro/get-travel',
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[Re-sync] API error:', response.status, errorText);
        throw new Error(`Compositor API fout (${response.status}): ${errorText || response.statusText}`);
      }

      const result = await response.json();
      console.log('[Re-sync] Received data:', result);

      if (!result.success) {
        throw new Error(result.error || 'Sync failed');
      }

      const structuredData = result.structured_itinerary;

      alert(`✅ Data opnieuw gesynchroniseerd!\n\nReis: ${structuredData.title}\nTC ID: ${trip.compositor_booking_id}\nDuur: ${structuredData.duration_days || 0} dagen\nHotels: ${structuredData.hotels?.length || 0}\nBestemmingen: ${structuredData.destinations?.length || 0}`);

      await loadData();

      const updatedTrip = activeTravelBros.find((t: any) => t.id === trip.id);
      if (updatedTrip) {
        setSelectedTrip(updatedTrip);
        await loadTripDetails(updatedTrip);
      }
    } catch (error) {
      console.error('❌ Re-sync error:', error);
      alert('❌ Kon data niet opnieuw ophalen: ' + (error instanceof Error ? error.message : 'Onbekende fout'));
    } finally {
      setLoading(false);
    }
  };

  const copyWebhookUrl = () => {
    const webhookUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/whatsapp-webhook`;
    navigator.clipboard.writeText(webhookUrl);
    alert('Webhook URL gekopieerd!');
  };

  const getShareUrl = (shareToken: string) => {
    const domain = brandData?.travelbro_domain || systemDefaultDomain || 'travelbro.nl';
    return `https://${domain}/${shareToken}`;
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

  const handleCreateRoadbook = async (trip: any) => {
    // Only allow roadbook creation if trip has a compositor_booking_id
    if (!trip.compositor_booking_id) {
      alert('❌ Roadbook kan alleen aangemaakt worden voor reizen met een Travel Compositor ID.\n\nReizen aangemaakt via PDF of handmatig kunnen (nog) geen roadbook krijgen.');
      return;
    }

    // Open the builder directly with the TC ID pre-filled
    // The builder will handle loading the trip data and creating the page
    const builderUrl = new URL('https://www.ai-websitestudio.nl/builder.html');
    builderUrl.searchParams.set('tc_id', trip.compositor_booking_id);
    builderUrl.searchParams.set('mode', 'roadbook');
    builderUrl.searchParams.set('brand_id', trip.brand_id);
    builderUrl.searchParams.set('trip_id', trip.id);
    builderUrl.searchParams.set('trip_name', trip.name);
    
    window.open(builderUrl.toString(), '_blank');
  };

  const [showQRCode, setShowQRCode] = useState(false);

  const toggleQRCode = () => {
    setShowQRCode(!showQRCode);
  };

  const getQRCodeData = () => {
    if (!selectedTrip) return null;

    const code = selectedTrip.share_token.substring(0, 8).toUpperCase();
    const whatsappNumber = apiSettings?.twilio_whatsapp_number || '+14155238886';
    const cleanNumber = whatsappNumber.replace('whatsapp:', '').replace('+', '');
    const whatsappUrl = `https://wa.me/${cleanNumber}?text=${encodeURIComponent(code)}`;
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(whatsappUrl)}`;

    return { code, cleanNumber, qrCodeUrl };
  };

  const sendWhatsAppInvite = async () => {
    if (!selectedTrip || !invitePhone.trim()) {
      alert('Vul een telefoonnummer in');
      return;
    }

    // Don't block on isTwilioConfigured - edge function will use system credentials

    setSendingInvite(true);
    try {
      const sessionToken = crypto.randomUUID();
      const clientNameText = inviteClientName.trim() ? inviteClientName.trim() : 'Reiziger';

      const { data: brandInfo } = await supabase
        .from('brands')
        .select('travelbro_domain')
        .eq('id', user?.brand_id)
        .maybeSingle();

      const shareLink = `https://${brandInfo?.travelbro_domain || 'travelbro.nl'}/${selectedTrip.share_token}`;

      const requestPayload = {
        to: invitePhone,
        brandId: user?.brand_id,
        useTemplate: true,
        templateSid: 'HX23e0ee5840758fb35bd1bedf502fdf42',
        templateVariables: {
          '1': clientNameText,
          '2': selectedTrip.destination || 'je reis'
        },
        tripId: selectedTrip.id,
        sessionToken: sessionToken,
        skipIntake: skipIntake
      };

      console.log('🚀 Sending WhatsApp invite request:', JSON.stringify(requestPayload, null, 2));

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-whatsapp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify(requestPayload),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        console.error('WhatsApp send error:', result);
        const errorMsg = result.error || 'Verzenden mislukt';
        const details = result.details ? `\n\nDetails: ${JSON.stringify(result.details, null, 2)}` : '';
        throw new Error(errorMsg + details);
      }

      console.log('WhatsApp sent successfully:', result);
      alert(`✅ WhatsApp uitnodiging verzonden naar ${invitePhone}!\n\nMessage SID: ${result.messageSid}`);
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
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 rounded-lg flex items-center justify-center bg-gradient-to-br from-orange-500 to-amber-500">
              <Bot className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">TravelBRO Assistent</h1>
              <p className="text-gray-600">Configureer en beheer je AI reisassistent</p>
            </div>
          </div>
          {creditBalance !== null && (
            <div className={`px-4 py-2 rounded-lg ${creditBalance < 50 ? 'bg-red-100 border border-red-300' : 'bg-green-100 border border-green-300'}`}>
              <div className="flex items-center space-x-2">
                <CreditCard className={`w-5 h-5 ${creditBalance < 50 ? 'text-red-600' : 'text-green-600'}`} />
                <div>
                  <p className="text-xs text-gray-600">Credits</p>
                  <p className={`font-bold ${creditBalance < 50 ? 'text-red-700' : 'text-green-700'}`}>
                    {creditBalance.toFixed(2)}
                  </p>
                  {creditBalance < 50 && (
                    <p className="text-xs text-red-600">Niet genoeg voor TravelBRO!</p>
                  )}
                </div>
              </div>
            </div>
          )}
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
          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl p-5 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-orange-100 text-sm">Actieve Reizen</p>
                  <p className="text-3xl font-bold">{activeTravelBros.length}</p>
                </div>
                <Bot className="text-white/80" size={32} />
              </div>
            </div>
            <button
              onClick={() => setActiveTab('new')}
              className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-5 text-white text-left hover:from-blue-600 hover:to-blue-700 transition-all"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-100 text-sm">Nieuwe Reis</p>
                  <p className="text-lg font-semibold">+ TravelBRO aanmaken</p>
                </div>
                <Plus className="text-white/80" size={32} />
              </div>
            </button>
            <button
              onClick={() => setActiveTab('active')}
              className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-5 text-white text-left hover:from-green-600 hover:to-green-700 transition-all"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-100 text-sm">Beheer</p>
                  <p className="text-lg font-semibold">Bekijk reizen →</p>
                </div>
                <Users className="text-white/80" size={32} />
              </div>
            </button>
          </div>

          {/* Quick Start Guide - Compact */}
          <div className="bg-white rounded-xl border p-6">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center">
              <Bot className="mr-2 text-orange-500" size={20} />
              Snel aan de slag
            </h3>
            <div className="grid md:grid-cols-4 gap-4 text-sm">
              <div className="flex items-start space-x-3">
                <span className="bg-orange-100 text-orange-600 rounded-full w-6 h-6 flex items-center justify-center font-bold text-xs shrink-0">1</span>
                <div>
                  <p className="font-medium text-gray-900">Maak TravelBRO</p>
                  <p className="text-gray-500 text-xs">Upload PDF of sync TC</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <span className="bg-orange-100 text-orange-600 rounded-full w-6 h-6 flex items-center justify-center font-bold text-xs shrink-0">2</span>
                <div>
                  <p className="font-medium text-gray-900">Deel link</p>
                  <p className="text-gray-500 text-xs">Via email of WhatsApp</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <span className="bg-orange-100 text-orange-600 rounded-full w-6 h-6 flex items-center justify-center font-bold text-xs shrink-0">3</span>
                <div>
                  <p className="font-medium text-gray-900">Klant vult intake</p>
                  <p className="text-gray-500 text-xs">Voorkeuren & wensen</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <span className="bg-orange-100 text-orange-600 rounded-full w-6 h-6 flex items-center justify-center font-bold text-xs shrink-0">4</span>
                <div>
                  <p className="font-medium text-gray-900">AI helpt 24/7</p>
                  <p className="text-gray-500 text-xs">WhatsApp of webchat</p>
                </div>
              </div>
            </div>
          </div>

          {/* Recent TravelBROs */}
          {activeTravelBros.length > 0 && (
            <div className="bg-white rounded-xl border p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Recente TravelBRO's</h3>
              <div className="space-y-2">
                {activeTravelBros.slice(0, 5).map((trip: any) => (
                  <button
                    key={trip.id}
                    onClick={() => loadTripDetails(trip)}
                    className="w-full flex items-center justify-between p-3 bg-gray-50 hover:bg-orange-50 rounded-lg transition-colors text-left"
                  >
                    <div className="flex items-center space-x-3">
                      <Bot className="text-orange-500" size={20} />
                      <div>
                        <p className="font-medium text-gray-900">{trip.name}</p>
                        <p className="text-xs text-gray-500">
                          {new Date(trip.created_at).toLocaleDateString('nl-NL')}
                          {trip.compositor_booking_id && ` • TC: ${trip.compositor_booking_id}`}
                        </p>
                      </div>
                    </div>
                    <ArrowRight className="text-gray-400" size={16} />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'new' && (
        <div className="max-w-3xl mx-auto">
          {/* Flow Stepper - alleen tonen bij nieuwe TravelBro */}
          {!editingTrip && (
            <div className="bg-gradient-to-r from-orange-50 to-amber-50 rounded-xl border border-orange-200 p-4 mb-6">
              <h4 className="font-semibold text-orange-800 mb-3 flex items-center gap-2">
                <Route className="w-5 h-5" />
                TravelBRO Setup Flow
              </h4>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${compositorData ? 'bg-green-500 text-white' : 'bg-orange-500 text-white'}`}>
                    {compositorData ? '✓' : '1'}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-800">Sync Data</p>
                    <p className="text-xs text-gray-500">Haal reisinfo op</p>
                  </div>
                </div>
                <div className="flex-1 h-1 bg-gray-200 mx-3 rounded">
                  <div className={`h-full rounded transition-all ${compositorData ? 'bg-green-500 w-full' : 'bg-gray-200 w-0'}`} />
                </div>
                <div className="flex items-center gap-2">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${compositorData ? 'bg-orange-500 text-white' : 'bg-gray-300 text-gray-500'}`}>
                    2
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-800">Aanmaken</p>
                    <p className="text-xs text-gray-500">Sla TravelBro op</p>
                  </div>
                </div>
                <div className="flex-1 h-1 bg-gray-200 mx-3 rounded" />
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-gray-300 text-gray-500 flex items-center justify-center text-sm font-bold">
                    3
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-800">Versturen</p>
                    <p className="text-xs text-gray-500">WhatsApp uitnodiging</p>
                  </div>
                </div>
              </div>
              <div className="mt-3 p-2 bg-white/60 rounded-lg">
                <p className="text-xs text-orange-700">
                  <strong>⚠️ Belangrijk:</strong> Sync eerst de data (stap 1) voordat je de TravelBro aanmaakt. 
                  Zo heeft de AI alle reisinformatie beschikbaar wanneer de klant vragen stelt.
                </p>
              </div>
            </div>
          )}

          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-6">
              {editingTrip ? `TravelBRO Bewerken: ${editingTrip.name}` : 'Stap 1: Sync Reisdata & Maak TravelBRO'}
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

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Route className="inline w-4 h-4 mr-1" />
                  Travel Compositor Booking ID (optioneel)
                </label>

                <div className="mb-3">
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Microsite
                  </label>
                  <select
                    value={micrositeId}
                    onChange={(e) => setMicrositeId(e.target.value)}
                    disabled={loadingMicrosites}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white disabled:bg-gray-100"
                  >
                    {loadingMicrosites ? (
                      <option>Laden...</option>
                    ) : (
                      microsites.map((ms) => (
                        <option key={ms.id} value={ms.id}>
                          {ms.name} {ms.hasCredentials ? '✓' : ''}
                        </option>
                      ))
                    )}
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    Selecteer de microsite waar het TC ID vandaan komt
                  </p>
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    value={compositorBookingId}
                    onChange={(e) => setCompositorBookingId(e.target.value)}
                    placeholder="12345"
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                  <button
                    type="button"
                    onClick={handleSyncCompositorData}
                    disabled={!compositorBookingId.trim() || !micrositeId || syncingCompositor}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {syncingCompositor ? (
                      <>
                        <Loader className="w-4 h-4 animate-spin" />
                        Syncing...
                      </>
                    ) : (
                      <>
                        <ArrowRight className="w-4 h-4" />
                        Sync Data
                      </>
                    )}
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Klik op "Sync Data" om reis informatie op te halen én op te slaan van Travel Compositor
                </p>
                {compositorData && (
                  <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center gap-2 text-green-800 text-sm font-medium mb-2">
                      <CheckCircle className="w-4 h-4" />
                      Data gesynchroniseerd en opgeslagen
                    </div>
                    <div className="text-xs text-green-700 space-y-1">
                      <div><strong>Reis:</strong> {compositorData.title || compositorData.trip_name}</div>
                      <div><strong>TC Idea ID:</strong> {compositorData.tc_idea_id}</div>
                      <div><strong>Duur:</strong> {compositorData.duration_days || compositorData.total_days} dagen</div>
                      {compositorData.destination_names && compositorData.destination_names.length > 0 && (
                        <div><strong>Bestemmingen:</strong> {compositorData.destination_names.join(', ')}</div>
                      )}
                      {compositorData.countries && compositorData.countries.length > 0 && (
                        <div><strong>Landen:</strong> {compositorData.countries.join(', ')}</div>
                      )}
                      {compositorData.price_per_person && (
                        <div><strong>Prijs p.p.:</strong> {compositorData.currency} {compositorData.price_per_person}</div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Roadbook Selector */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <BookOpen className="inline w-4 h-4 mr-1" />
                  Roadbook (optioneel)
                </label>
                <select
                  value={selectedRoadbookId}
                  onChange={(e) => setSelectedRoadbookId(e.target.value)}
                  disabled={loadingRoadbooks}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white disabled:bg-gray-100"
                >
                  <option value="">Geen roadbook</option>
                  {loadingRoadbooks ? (
                    <option>Laden...</option>
                  ) : (
                    roadbooks.map((rb) => (
                      <option key={rb.id} value={rb.id}>
                        {rb.title} - {rb.client_name}
                      </option>
                    ))
                  )}
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  Selecteer een roadbook uit Travel Docs om te koppelen aan deze TravelBro
                </p>
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
                    <div className="grid grid-cols-2 gap-3 mb-2">
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
                        type="tel"
                        value={traveler.phone || ''}
                        onChange={(e) => {
                          const updated = [...travelers];
                          updated[index].phone = e.target.value;
                          setTravelers(updated);
                        }}
                        placeholder="Telefoon (+31612345678)"
                        className="px-3 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
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
                  onClick={() => setTravelers([...travelers, { name: '', age: '', relation: 'adult', phone: '' }])}
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
                      rows={6}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm font-mono"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      💡 Tip: Geef specifieke instructies over toon, voorkeuren, en hoe om te gaan met foto's. De AI gebruikt dit bij ALLE antwoorden.
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
                  onClick={() => {
                    console.log('🔵 Button clicked! editingTrip=', editingTrip, 'creating=', creating, 'updating=', updating);
                    if (editingTrip) {
                      handleUpdateTravelBro();
                    } else {
                      handleCreateTravelBro();
                    }
                  }}
                  disabled={creating || updating}
                  onMouseEnter={() => console.log('🟢 Button hover - disabled?', creating || updating)}
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
          {/* Modern Header Card */}
          <div className="bg-gradient-to-r from-orange-500 to-amber-500 rounded-xl p-6 text-white shadow-lg">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <button
                  onClick={closeTripDetails}
                  className="flex items-center space-x-1 text-white/80 hover:text-white mb-3 text-sm transition-colors"
                >
                  <ArrowRight className="rotate-180" size={16} />
                  <span>Terug naar overzicht</span>
                </button>
                <h2 className="text-2xl font-bold mb-2">{selectedTrip.name}</h2>
                <div className="flex flex-wrap items-center gap-3 text-sm text-white/90">
                  <span className="flex items-center gap-1">
                    <Calendar size={14} />
                    {new Date(selectedTrip.created_at).toLocaleDateString('nl-NL')}
                  </span>
                  {selectedTrip.compositor_booking_id && (
                    <span className="bg-white/20 px-2 py-0.5 rounded text-xs font-medium">
                      TC: {selectedTrip.compositor_booking_id}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex flex-col gap-2 ml-4">
                {selectedTrip.compositor_booking_id && (
                  <button
                    onClick={() => handleResyncTripFromCompositor(selectedTrip)}
                    disabled={loading}
                    className="flex items-center justify-center space-x-2 px-4 py-2 bg-white/20 hover:bg-white/30 disabled:opacity-50 rounded-lg text-sm font-medium transition-colors"
                  >
                    {loading ? <Loader className="w-4 h-4 animate-spin" /> : <Navigation size={16} />}
                    <span>Re-sync</span>
                  </button>
                )}
                <button
                  onClick={() => copyClientLink(selectedTrip.share_token)}
                  className="flex items-center justify-center space-x-2 px-4 py-2 bg-white text-orange-600 hover:bg-orange-50 rounded-lg text-sm font-medium transition-colors"
                >
                  <Share2 size={16} />
                  <span>Deel Link</span>
                </button>
              </div>
            </div>
            
            {/* Quick Stats */}
            <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-white/20">
              {selectedTrip.parsed_data && Object.keys(selectedTrip.parsed_data).length > 0 && (
                <span className="bg-white/20 px-3 py-1 rounded-full text-xs font-medium">✓ Data geladen</span>
              )}
              {selectedTrip.page_id && (
                <span className="bg-white/20 px-3 py-1 rounded-full text-xs font-medium">🗺️ Roadbook</span>
              )}
              {selectedTrip.pdf_url && (
                <span className="bg-white/20 px-3 py-1 rounded-full text-xs font-medium">📄 PDF</span>
              )}
              <span className="bg-white/20 px-3 py-1 rounded-full text-xs font-medium">
                💬 {tripSessions.length} chat{tripSessions.length !== 1 ? 's' : ''}
              </span>
            </div>
          </div>

          {loadingTripDetails ? (
            <div className="flex items-center justify-center py-12">
              <Loader className="w-8 h-8 animate-spin text-orange-600" />
            </div>
          ) : (
            <div className="space-y-6">
              {/* Reis Instellingen - standaard ingeklapt */}
              <details className="bg-white rounded-lg shadow-sm border">
                <summary className="p-4 cursor-pointer hover:bg-gray-50 transition-colors flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Settings className="w-5 h-5 text-gray-600" />
                    <span className="font-semibold text-gray-900">Reis Instellingen</span>
                  </div>
                  <span className="text-xs text-gray-400">Klik om te openen</span>
                </summary>
                <div className="p-6 border-t">
                <div className="flex justify-end mb-4">
                  <button
                    onClick={() => {
                      if (isEditingTrip) {
                        setIsEditingTrip(false);
                      } else {
                        setIsEditingTrip(true);
                        setEditTripName(selectedTrip.name);
                        setEditSourceUrls(selectedTrip.source_urls?.length > 0 ? selectedTrip.source_urls : ['']);
                        setEditTravelers(selectedTrip.intake_template?.travelers || [{ name: '', age: '', relation: 'adult' }]);
                        setEditCustomContext(selectedTrip.custom_context || DEFAULT_CUSTOM_CONTEXT);
                        setEditGptModel(selectedTrip.gpt_model || 'gpt-4o');
                        setEditGptTemperature(selectedTrip.gpt_temperature ?? 0.7);
                        setEditCompositorId(selectedTrip.compositor_booking_id || '');
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
                        <Navigation className="inline w-4 h-4 mr-1" />
                        Travel Compositor Booking ID
                      </label>
                      <input
                        type="text"
                        value={editCompositorId}
                        onChange={(e) => setEditCompositorId(e.target.value)}
                        placeholder="bijv. 44848140"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Als je een Travel Compositor ID invult, kun je automatisch de reisdata synchroniseren via de "Re-sync" knop
                      </p>
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
                        rows={6}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm font-mono"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        💡 Tip: Geef specifieke instructies over toon, voorkeuren, en hoe om te gaan met foto's. De AI gebruikt dit bij ALLE antwoorden.
                      </p>
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

                            const { data: { session } } = await supabase.auth.getSession();

                            if (session) {
                              const parseResponse = await fetch(
                                `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/parse-trip-pdf`,
                                {
                                  method: 'POST',
                                  headers: {
                                    'Content-Type': 'application/json',
                                    'Authorization': `Bearer ${session.access_token}`,
                                  },
                                  body: JSON.stringify({ pdfUrl: newPdfUrl }),
                                }
                              );

                              if (parseResponse.ok) {
                                newParsedData = await parseResponse.json();
                                await loadData();
                                console.log('✅ PDF parsing successful:', newParsedData);
                              } else if (parseResponse.status === 402) {
                                throw new Error('Onvoldoende credits. Neem contact op met de operator om credits bij te kopen.');
                              } else {
                                const errorText = await parseResponse.text();
                                console.error('❌ PDF parsing failed:', parseResponse.status, errorText);
                                throw new Error(`PDF parsing mislukt (status ${parseResponse.status}): ${errorText.substring(0, 200)}`);
                              }
                            }
                          }

                          const filteredUrls = editSourceUrls.filter(u => u.trim());
                          const intakeTemplate = editTravelers.some(t => t.name || t.age)
                            ? { travelers: editTravelers }
                            : null;

                          const itinerary = newParsedData?.itinerary;
                          const tripMetadata = itinerary ? { itinerary } : selectedTrip.metadata;

                          const { error } = await db.supabase
                            .from('travel_trips')
                            .update({
                              name: editTripName,
                              compositor_booking_id: editCompositorId.trim() || null,
                              pdf_url: newPdfUrl,
                              parsed_data: newParsedData || {},
                              metadata: tripMetadata,
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
                        <span className="text-gray-600">Compositor ID:</span>
                        <span className="ml-2 text-gray-900">{selectedTrip.compositor_booking_id || '– Niet gekoppeld'}</span>
                      </div>
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
              </details>

              {/* === ACTIES - MODERNE CARD LAYOUT === */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {/* Deel Link */}
                <button
                  onClick={() => copyClientLink(selectedTrip.share_token)}
                  className="group bg-gradient-to-br from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 rounded-xl p-4 text-white transition-all hover:scale-105 hover:shadow-lg"
                >
                  <Share2 className="w-8 h-8 mx-auto mb-2 group-hover:scale-110 transition-transform" />
                  <p className="text-sm font-semibold">Deel Link</p>
                  <p className="text-xs opacity-80">Kopieer naar klant</p>
                </button>

                {/* WhatsApp */}
                <button
                  onClick={() => {
                    const phone = prompt('WhatsApp nummer (bijv. +31612345678):');
                    if (phone) {
                      setInvitePhone(phone);
                      sendWhatsAppInvite();
                    }
                  }}
                  className="group bg-gradient-to-br from-green-400 to-green-600 hover:from-green-500 hover:to-green-700 rounded-xl p-4 text-white transition-all hover:scale-105 hover:shadow-lg"
                >
                  <MessageSquare className="w-8 h-8 mx-auto mb-2 group-hover:scale-110 transition-transform" />
                  <p className="text-sm font-semibold">WhatsApp</p>
                  <p className="text-xs opacity-80">Stuur uitnodiging</p>
                </button>

                {/* Roadbook */}
                {selectedTrip.page_id ? (
                  <button
                    onClick={() => window.open(`https://www.ai-websitestudio.nl/preview.html?page_id=${selectedTrip.page_id}&brand_id=${selectedTrip.brand_id}`, '_blank')}
                    className="group bg-gradient-to-br from-purple-500 to-violet-600 hover:from-purple-600 hover:to-violet-700 rounded-xl p-4 text-white transition-all hover:scale-105 hover:shadow-lg"
                  >
                    <Route className="w-8 h-8 mx-auto mb-2 group-hover:scale-110 transition-transform" />
                    <p className="text-sm font-semibold">Roadbook</p>
                    <p className="text-xs opacity-80">Bekijk / Bewerk</p>
                  </button>
                ) : selectedTrip.compositor_booking_id ? (
                  <button
                    onClick={() => handleCreateRoadbook(selectedTrip)}
                    className="group bg-gradient-to-br from-purple-500 to-violet-600 hover:from-purple-600 hover:to-violet-700 rounded-xl p-4 text-white transition-all hover:scale-105 hover:shadow-lg"
                  >
                    <Route className="w-8 h-8 mx-auto mb-2 group-hover:scale-110 transition-transform" />
                    <p className="text-sm font-semibold">Roadbook</p>
                    <p className="text-xs opacity-80">Maak nieuw</p>
                  </button>
                ) : (
                  <div className="bg-gray-100 rounded-xl p-4 text-gray-400 opacity-50">
                    <Route className="w-8 h-8 mx-auto mb-2" />
                    <p className="text-sm font-semibold">Roadbook</p>
                    <p className="text-xs">Alleen met TC ID</p>
                  </div>
                )}

                {/* Intake */}
                <button
                  onClick={() => {
                    const intakeUrl = getShareUrl(selectedTrip.share_token);
                    navigator.clipboard.writeText(intakeUrl);
                    alert('✅ Intake link gekopieerd!');
                  }}
                  className="group bg-gradient-to-br from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 rounded-xl p-4 text-white transition-all hover:scale-105 hover:shadow-lg"
                >
                  <FileText className="w-8 h-8 mx-auto mb-2 group-hover:scale-110 transition-transform" />
                  <p className="text-sm font-semibold">Intake</p>
                  <p className="text-xs opacity-80">Kopieer link</p>
                </button>
              </div>

              {/* === QR CODE (compact) === */}
              {(() => {
                const qrData = getQRCodeData();
                return qrData ? (
                  <div className="bg-white rounded-xl shadow-sm border p-4 flex items-center gap-4">
                    <img src={qrData.qrCodeUrl} alt="QR Code" className="w-20 h-20 rounded-lg shadow bg-white p-1" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">WhatsApp QR Code</p>
                      <p className="text-xs text-gray-500">Klant kan scannen om te starten</p>
                      <p className="text-sm font-mono font-bold text-orange-600 mt-1">{qrData.code}</p>
                    </div>
                  </div>
                ) : null;
              })()}

              {/* === WHATSAPP GESPREKKEN === */}
              {tripSessions.length > 0 && (
                <div className="bg-white rounded-xl shadow-sm border p-4">
                  <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-green-600" />
                    WhatsApp Gesprekken ({tripSessions.length})
                  </h4>
                  <div className="space-y-2">
                    {tripSessions.map((session) => (
                      <div 
                        key={session.id} 
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-green-50 cursor-pointer transition-colors"
                        onClick={() => loadChatHistory(session)}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center">
                            <MessageSquare className="w-4 h-4 text-white" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">{session.phone_number}</p>
                            <p className="text-xs text-gray-500">{new Date(session.last_message_at || session.created_at).toLocaleDateString('nl-NL')}</p>
                          </div>
                        </div>
                        <ArrowRight className="w-4 h-4 text-gray-400" />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* === INTAKE & GEPLANDE BERICHTEN (compact) === */}
              <div className="grid md:grid-cols-2 gap-4">
                {/* Intake Formulieren */}
                <div className="bg-white rounded-xl shadow-sm border p-5">
                  <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-blue-600" />
                    Intake ({tripIntakes.length})
                  </h4>
                  {tripIntakes.length === 0 ? (
                    <p className="text-sm text-gray-500">Nog geen intake ingevuld</p>
                  ) : (
                    <div className="space-y-2">
                      {tripIntakes.slice(0, 3).map((intake) => (
                        <div key={intake.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg text-sm">
                          <span className="text-gray-900">{intake.travelers_count} reiziger(s)</span>
                          <span className="text-xs text-gray-500">{new Date(intake.completed_at || intake.created_at).toLocaleDateString('nl-NL')}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Geplande Berichten */}
                <div className="bg-white rounded-xl shadow-sm border p-5">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                      <Clock className="w-4 h-4 text-purple-600" />
                      Gepland ({scheduledMessages.filter(m => !m.is_sent).length})
                    </h4>
                    <button
                      onClick={() => setShowScheduleForm(!showScheduleForm)}
                      className="text-purple-600 hover:text-purple-700 text-xs font-medium"
                    >
                      + Nieuw
                    </button>
                  </div>
                  {scheduledMessages.filter(m => !m.is_sent).length === 0 ? (
                    <p className="text-sm text-gray-500">Geen geplande berichten</p>
                  ) : (
                    <div className="space-y-2">
                      {scheduledMessages.filter(m => !m.is_sent).slice(0, 3).map((msg) => (
                        <div key={msg.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg text-sm">
                          <span className="text-gray-900 truncate">{msg.message_type.replace('_', ' ')}</span>
                          <span className="text-xs text-gray-500">{msg.scheduled_date}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Geplande Berichten Form (alleen als open) */}
              {showScheduleForm && (
              <div className="bg-white rounded-xl shadow-sm border p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-gray-900">Nieuw Gepland Bericht</h3>
                  <button onClick={() => setShowScheduleForm(false)} className="text-gray-400 hover:text-gray-600">
                    <XCircle size={20} />
                  </button>
                </div>

                <div className="space-y-4">
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
                        className="flex-1 flex items-center justify-center space-x-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg font-medium transition-colors"
                      >
                        {savingSchedule ? <Loader className="w-4 h-4 animate-spin" /> : <CheckCircle size={16} />}
                        <span>{savingSchedule ? 'Opslaan...' : 'Opslaan'}</span>
                      </button>
                      <button
                        onClick={() => setShowScheduleForm(false)}
                        className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        Annuleren
                      </button>
                    </div>
                  </div>
              </div>
              )}
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {activeTravelBros.map((trip) => (
                <div 
                  key={trip.id} 
                  className="bg-white rounded-xl shadow-sm border hover:shadow-lg hover:border-orange-300 transition-all cursor-pointer overflow-hidden"
                  onClick={() => loadTripDetails(trip)}
                >
                  <div className="bg-gradient-to-r from-orange-500 to-amber-500 p-4">
                    <h3 className="text-lg font-bold text-white truncate">{trip.name}</h3>
                    <p className="text-sm text-white/80">{new Date(trip.created_at).toLocaleDateString('nl-NL')}</p>
                  </div>
                  <div className="p-4">
                    <div className="flex flex-wrap gap-2 mb-4">
                      {trip.parsed_data && Object.keys(trip.parsed_data).length > 0 && (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">✓ Data</span>
                      )}
                      {trip.page_id && (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-700">🗺️ Roadbook</span>
                      )}
                      {trip.pdf_url && (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">📄 PDF</span>
                      )}
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${trip.is_active !== false ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                        {trip.is_active !== false ? '🟢 Actief' : '⚪ Inactief'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between pt-3 border-t">
                      <div className="flex items-center space-x-1">
                        <button
                          onClick={(e) => { e.stopPropagation(); copyClientLink(trip.share_token); }}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Kopieer link"
                        >
                          <Share2 size={16} />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); deleteTravelBro(trip.id); }}
                          className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          title="Verwijder"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                      <div className="flex items-center text-orange-600 text-sm font-medium">
                        <span>Bekijk</span>
                        <ArrowRight size={16} className="ml-1" />
                      </div>
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

    {/* Chat History Modal */}
    {showChatModal && selectedSession && (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col">
          {/* Modal Header */}
          <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-green-500 to-green-600 rounded-t-xl">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                <MessageSquare className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-white">{selectedSession.phone_number}</h3>
                <p className="text-sm text-white/80">Chat geschiedenis</p>
              </div>
            </div>
            <button
              onClick={() => setShowChatModal(false)}
              className="text-white/80 hover:text-white p-2 rounded-lg hover:bg-white/10 transition-colors"
            >
              <XCircle className="w-6 h-6" />
            </button>
          </div>

          {/* Chat Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
            {loadingChat ? (
              <div className="flex items-center justify-center py-12">
                <Loader className="w-8 h-8 animate-spin text-green-600" />
              </div>
            ) : chatMessages.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <MessageSquare className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p>Geen berichten gevonden</p>
              </div>
            ) : (
              chatMessages.map((msg, index) => (
                <div
                  key={index}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                      msg.role === 'user'
                        ? 'bg-green-500 text-white rounded-br-md'
                        : 'bg-white text-gray-900 shadow-sm border rounded-bl-md'
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                    <p className={`text-xs mt-1 ${msg.role === 'user' ? 'text-white/70' : 'text-gray-400'}`}>
                      {new Date(msg.created_at).toLocaleString('nl-NL')}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Modal Footer */}
          <div className="p-4 border-t bg-white rounded-b-xl">
            <p className="text-xs text-gray-500 text-center">
              Dit is een alleen-lezen weergave van de chat geschiedenis
            </p>
          </div>
        </div>
      </div>
    )}
    </>
  );
}
