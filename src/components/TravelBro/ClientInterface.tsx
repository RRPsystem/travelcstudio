import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { Send, Loader, Bot, User, Sparkles } from 'lucide-react';

interface Trip {
  id: string;
  name: string;
  parsed_data: any;
  source_urls: string[];
  intake_template: any;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export function ClientInterface({ shareToken }: { shareToken: string }) {
  const [trip, setTrip] = useState<Trip | null>(null);
  const [loading, setLoading] = useState(true);
  const [showIntake, setShowIntake] = useState(true);
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadTripFromSession();
  }, [shareToken]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadTripFromSession = async () => {
    try {
      const { data: tripData, error: tripError } = await supabase
        .from('travel_trips')
        .select('*')
        .eq('share_token', shareToken)
        .maybeSingle();

      if (tripError) throw tripError;

      if (!tripData) {
        console.error('Trip not found for share_token:', shareToken);
        alert('Deze reis is niet beschikbaar');
        return;
      }

      const { data: existingSession } = await supabase
        .from('travel_whatsapp_sessions')
        .select('session_token')
        .eq('trip_id', tripData.id)
        .eq('phone_number', 'web_' + shareToken)
        .maybeSingle();

      if (existingSession) {
        const { data: intakeData } = await supabase
          .from('travel_intakes')
          .select('*')
          .eq('session_token', existingSession.session_token)
          .maybeSingle();

        setTrip(tripData);
        setSessionToken(existingSession.session_token);

        if (intakeData?.completed_at) {
          setShowIntake(false);
          loadConversations(existingSession.session_token);
        }
      } else {
        const newSessionToken = crypto.randomUUID().replace(/-/g, '');

        const { error: intakeInsertError } = await supabase
          .from('travel_intakes')
          .insert({
            session_token: newSessionToken,
            trip_id: tripData.id,
            brand_id: tripData.brand_id,
            travelers_count: 0,
            intake_data: {}
          });

        if (intakeInsertError) {
          console.error('Error creating intake:', {
            message: intakeInsertError.message,
            code: intakeInsertError.code,
            details: intakeInsertError.details,
            hint: intakeInsertError.hint,
            full: intakeInsertError
          });
          alert('Kon intake niet aanmaken: ' + intakeInsertError.message + ' (Code: ' + intakeInsertError.code + ')');
          return;
        }

        const { error: sessionInsertError } = await supabase
          .from('travel_whatsapp_sessions')
          .insert({
            session_token: newSessionToken,
            trip_id: tripData.id,
            phone_number: 'web_' + shareToken
          });

        if (sessionInsertError) {
          console.error('Error creating session:', {
            message: sessionInsertError.message,
            code: sessionInsertError.code,
            details: sessionInsertError.details,
            hint: sessionInsertError.hint,
            full: sessionInsertError
          });
          alert('Kon sessie niet aanmaken: ' + sessionInsertError.message + ' (Code: ' + sessionInsertError.code + ')');
          return;
        }

        setTrip(tripData);
        setSessionToken(newSessionToken);
      }
    } catch (error) {
      console.error('Error loading trip:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadConversations = async (token: string) => {
    try {
      const { data, error } = await supabase
        .from('travel_conversations')
        .select('*')
        .eq('session_token', token)
        .order('created_at', { ascending: true });

      if (error) throw error;

      const msgs: Message[] = (data || []).map((conv) => ({
        role: conv.role,
        content: conv.message,
        timestamp: new Date(conv.created_at),
      }));

      if (msgs.length === 0 && trip) {
        const welcomeMessage: Message = {
          role: 'assistant',
          content: `Welkom bij TravelBRO! 👋\n\nIk ben je persoonlijke reisassistent voor **${trip.name}**. Ik help je graag met:\n\n🗺️ Routes en navigatie\n🍽️ Restaurant tips\n🏥 Medische voorzieningen\n🛒 Winkels en diensten in de buurt\n⚡ Activiteiten en bezienswaardigheden\n📍 Praktische informatie over je bestemming\n\nStel me gerust je vragen! Ik gebruik actuele informatie en Google zoekresultaten om je de beste antwoorden te geven.`,
          timestamp: new Date(),
        };

        await supabase.from('travel_conversations').insert({
          trip_id: trip.id,
          session_token: token,
          message: welcomeMessage.content,
          role: 'assistant',
        });

        msgs.push(welcomeMessage);
      }

      setMessages(msgs);
    } catch (error) {
      console.error('Error loading conversations:', error);
    }
  };

  const handleIntakeComplete = (token: string) => {
    setShowIntake(false);
    loadConversations(token);
  };

  const sendMessage = async () => {
    if (!inputMessage.trim() || !sessionToken || sending) return;

    const userMessage: Message = {
      role: 'user',
      content: inputMessage.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputMessage('');
    setSending(true);

    try {
      await supabase.from('travel_conversations').insert({
        trip_id: trip?.id,
        session_token: sessionToken,
        message: userMessage.content,
        role: 'user',
      });

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/travelbro-chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tripId: trip?.id,
          sessionToken,
          message: userMessage.content,
        }),
      });

      if (!response.ok) throw new Error('Failed to get response');

      const data = await response.json();

      const assistantMessage: Message = {
        role: 'assistant',
        content: data.response,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);

      await supabase.from('travel_conversations').insert({
        trip_id: trip?.id,
        session_token: sessionToken,
        message: data.response,
        role: 'assistant',
      });
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage: Message = {
        role: 'assistant',
        content: 'Sorry, er ging iets mis. Probeer het opnieuw.',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Laden...</p>
        </div>
      </div>
    );
  }

  if (!trip) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Reis niet gevonden</h1>
          <p className="text-gray-600">Deze reis is niet beschikbaar</p>
        </div>
      </div>
    );
  }

  if (showIntake) {
    return <IntakeForm trip={trip} sessionToken={sessionToken || shareToken} onComplete={handleIntakeComplete} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-50 flex flex-col">
      <div className="bg-white border-b shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #ff7700, #ffaa44)' }}>
              <Bot className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">{trip.name}</h1>
              <p className="text-sm text-gray-600">TravelBRO Assistent</p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="space-y-4">
            {messages.map((msg, index) => (
              <div
                key={index}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`flex items-start space-x-2 max-w-[80%] ${
                    msg.role === 'user' ? 'flex-row-reverse space-x-reverse' : ''
                  }`}
                >
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                      msg.role === 'user'
                        ? 'bg-gray-300'
                        : 'bg-gradient-to-br from-orange-500 to-amber-500'
                    }`}
                  >
                    {msg.role === 'user' ? (
                      <User className="w-4 h-4 text-gray-700" />
                    ) : (
                      <Bot className="w-4 h-4 text-white" />
                    )}
                  </div>
                  <div
                    className={`rounded-2xl px-4 py-3 ${
                      msg.role === 'user'
                        ? 'bg-orange-600 text-white'
                        : 'bg-white border border-gray-200 text-gray-900'
                    }`}
                    style={msg.role === 'user' ? { backgroundColor: '#ff7700' } : {}}
                  >
                    <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                  </div>
                </div>
              </div>
            ))}
            {sending && (
              <div className="flex justify-start">
                <div className="flex items-start space-x-2">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center bg-gradient-to-br from-orange-500 to-amber-500">
                    <Bot className="w-4 h-4 text-white" />
                  </div>
                  <div className="rounded-2xl px-4 py-3 bg-white border border-gray-200">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-orange-600 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-orange-600 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                      <div className="w-2 h-2 bg-orange-600 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    </div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>
      </div>

      <div className="bg-white border-t shadow-lg">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex space-x-3">
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
              placeholder="Stel je vraag over de reis..."
              className="flex-1 px-4 py-3 border border-gray-300 rounded-full focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              disabled={sending}
            />
            <button
              onClick={sendMessage}
              disabled={!inputMessage.trim() || sending}
              className="w-12 h-12 rounded-full flex items-center justify-center text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              style={{ backgroundColor: '#ff7700' }}
            >
              {sending ? (
                <Loader className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function IntakeForm({ trip, sessionToken, onComplete }: { trip: Trip; sessionToken: string; onComplete: (token: string) => void }) {
  const templateTravelers = trip.intake_template?.travelers || [{ name: '', age: '', relation: 'adult' }];
  const [travelersCount, setTravelersCount] = useState(templateTravelers.length);
  const [travelers, setTravelers] = useState<any[]>(templateTravelers);
  const [submitting, setSubmitting] = useState(false);

  const addTraveler = () => {
    setTravelers([...travelers, { name: '', age: '', relation: 'child', interests: [] }]);
    setTravelersCount(travelersCount + 1);
  };

  const updateTraveler = (index: number, field: string, value: any) => {
    const updated = [...travelers];
    updated[index][field] = value;
    setTravelers(updated);
  };

  const toggleInterest = (index: number, interest: string) => {
    const updated = [...travelers];
    if (!updated[index].interests) updated[index].interests = [];

    const interests = updated[index].interests;
    const interestIndex = interests.indexOf(interest);

    if (interestIndex > -1) {
      interests.splice(interestIndex, 1);
    } else {
      interests.push(interest);
    }

    setTravelers(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const { data, error } = await supabase
        .from('travel_intakes')
        .update({
          travelers_count: travelersCount,
          intake_data: { travelers },
          completed_at: new Date().toISOString(),
        })
        .eq('session_token', sessionToken)
        .select()
        .single();

      if (error) {
        console.error('Database error:', {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint,
          full: error
        });
        alert('Database fout bij opslaan: ' + error.message + ' (Code: ' + error.code + ')');
        throw error;
      }

      if (!data) {
        console.error('No data returned from update');
        throw new Error('Geen data ontvangen van database');
      }

      const { data: brandInfo } = await supabase
        .from('brands')
        .select('travelbro_domain')
        .eq('id', trip.brand_id)
        .maybeSingle();

      const { data: participants } = await supabase
        .from('trip_participants')
        .select('phone_number, participant_name')
        .eq('trip_id', trip.id);

      if (participants && participants.length > 0) {
        console.log(`Scheduling welcome messages for ${participants.length} participants after intake completion...`);

        for (const participant of participants) {
          if (participant.phone_number) {
            const now = new Date();
            const isoString = now.toISOString();
            const scheduleDate = isoString.split('T')[0];
            const scheduleTime = isoString.split('T')[1].split('.')[0];
            const shareLink = `https://${brandInfo?.travelbro_domain || 'travelbro.nl'}/${trip.share_token}`;

            await supabase
              .from('travel_whatsapp_sessions')
              .upsert({
                trip_id: trip.id,
                session_token: sessionToken,
                phone_number: participant.phone_number,
                last_message_at: new Date().toISOString()
              }, {
                onConflict: 'trip_id,phone_number'
              });

            await supabase
              .from('scheduled_whatsapp_messages')
              .insert({
                trip_id: trip.id,
                brand_id: data.brand_id,
                recipient_phone: participant.phone_number,
                template_name: 'travelbro',
                message_content: '',
                scheduled_date: scheduleDate,
                scheduled_time: scheduleTime,
                timezone: 'Europe/Amsterdam',
                message_type: 'intake_completed',
                template_variables: {
                  '1': (participant.name || 'Reiziger').substring(0, 100),
                  '2': (trip.name || 'jouw reis').substring(0, 100),
                  '3': shareLink
                },
              });
          }
        }
      }

      onComplete(data.session_token);
    } catch (error) {
      console.error('Error submitting intake:', error);
      alert('Er ging iets mis bij het opslaan: ' + (error instanceof Error ? error.message : 'Onbekende fout'));
    } finally {
      setSubmitting(false);
    }
  };

  const interestOptions = [
    { id: 'gaming', label: '🎮 Gaming', value: 'gaming' },
    { id: 'tiktok', label: '📱 TikTok/Social Media', value: 'tiktok' },
    { id: 'drawing', label: '🎨 Tekenen/Knutselen', value: 'drawing' },
    { id: 'sports', label: '⚽ Sport', value: 'sports' },
    { id: 'reading', label: '📚 Lezen', value: 'reading' },
    { id: 'music', label: '🎵 Muziek', value: 'music' },
    { id: 'animals', label: '🐾 Dieren', value: 'animals' },
    { id: 'adventure', label: '🏔️ Avontuur/Buiten', value: 'adventure' },
    { id: 'puzzles', label: '🧩 Puzzelen', value: 'puzzles' },
  ];

  const hasPrefilled = travelers.some(t => t.name && t.age);

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <div className="w-20 h-20 mx-auto mb-4 rounded-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #ff7700, #ffaa44)' }}>
            <Sparkles className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">{trip.name}</h1>
          <p className="text-gray-600">
            {hasPrefilled
              ? 'Vertel ons meer over je voorkeuren voor deze reis'
              : 'Vertel ons over jezelf en je reisgenoten'}
          </p>
        </div>

        {hasPrefilled && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-blue-800">
              💡 Je reisagent heeft al wat basisinfo voor je ingevuld. Vul hieronder je voorkeuren aan zodat TravelBRO je nog beter kan helpen!
            </p>
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-xl p-8">
          <form onSubmit={handleSubmit} className="space-y-8">
            {travelers.map((traveler, index) => (
              <div key={index} className="pb-6 border-b border-gray-200 last:border-0">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  {traveler.name ? traveler.name : `Reiziger ${index + 1}`}
                </h3>

                <div className="space-y-4">
                  {hasPrefilled ? (
                    <div className="bg-gray-50 rounded-lg p-4 mb-4">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-gray-600">Naam:</span>
                          <span className="ml-2 font-medium text-gray-900">{traveler.name}</span>
                        </div>
                        <div>
                          <span className="text-gray-600">Leeftijd:</span>
                          <span className="ml-2 font-medium text-gray-900">{traveler.age} jaar</span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Naam *
                        </label>
                        <input
                          type="text"
                          value={traveler.name}
                          onChange={(e) => updateTraveler(index, 'name', e.target.value)}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Leeftijd *
                        </label>
                        <input
                          type="number"
                          value={traveler.age}
                          onChange={(e) => updateTraveler(index, 'age', e.target.value)}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                          required
                        />
                      </div>
                    </div>
                  )}

                  {!hasPrefilled && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Relatie
                      </label>
                      <select
                        value={traveler.relation}
                        onChange={(e) => updateTraveler(index, 'relation', e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      >
                        <option value="adult">Volwassene</option>
                        <option value="child">Kind</option>
                        <option value="teen">Tiener</option>
                      </select>
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Favoriet Eten
                    </label>
                    <input
                      type="text"
                      value={traveler.favoriteFood || ''}
                      onChange={(e) => updateTraveler(index, 'favoriteFood', e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      placeholder="Bijv: Pizza, Mac Donalds, Pasta"
                    />
                  </div>

                  {(traveler.relation === 'child' || traveler.relation === 'teen') && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-3">
                        Interesses & Hobby's
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        {interestOptions.map((interest) => (
                          <button
                            key={interest.id}
                            type="button"
                            onClick={() => toggleInterest(index, interest.value)}
                            className={`px-4 py-2 rounded-lg border-2 text-sm font-medium transition-all ${
                              traveler.interests?.includes(interest.value)
                                ? 'border-orange-600 bg-orange-50 text-orange-700'
                                : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                            }`}
                          >
                            {interest.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Allergieën of Dieetwensen
                    </label>
                    <input
                      type="text"
                      value={traveler.dietary || ''}
                      onChange={(e) => updateTraveler(index, 'dietary', e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      placeholder="Bijv: Lactose intolerant, vegetarisch"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Waar kijk je naar uit op deze reis?
                    </label>
                    <textarea
                      value={traveler.lookingForward || ''}
                      onChange={(e) => updateTraveler(index, 'lookingForward', e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      placeholder="Bijv: Zwemmen in het zwembad, nieuwe vriendjes maken"
                      rows={2}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Bijzonderheden of Extra Info
                    </label>
                    <textarea
                      value={traveler.specialNeeds || ''}
                      onChange={(e) => updateTraveler(index, 'specialNeeds', e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      placeholder="Bijv: Wordt snel wagenziek, heeft knuffel nodig om te slapen"
                      rows={2}
                    />
                  </div>
                </div>
              </div>
            ))}

            {!hasPrefilled && (
              <button
                type="button"
                onClick={addTraveler}
                className="w-full py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-orange-500 hover:text-orange-600 transition-colors"
              >
                + Voeg reiziger toe
              </button>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-orange-600 hover:bg-orange-700 text-white py-3 rounded-lg font-semibold transition-colors disabled:opacity-50"
              style={{ backgroundColor: '#ff7700' }}
            >
              {submitting ? 'Bezig...' : 'Start chat met TravelBRO'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
