import { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { Send, Loader, Bot, User, MapPin } from 'lucide-react';
import { MultimodalInput } from './MultimodalInput';
import { ResponseDisplay } from './ResponseDisplay';

interface ChatEmbedProps {
  tripId?: string;
  shareToken?: string;
}

interface Trip {
  id: string;
  name: string;
  parsed_data: any;
  brand_id: string;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  imageUrl?: string;
  response?: any;
}

/**
 * Embeddable TravelBro chat component - can be used in iframes
 * URL: /travelbro/embed/[share_token] or /travelbro/embed?trip_id=[trip_id]
 */
export function ChatEmbed({ tripId, shareToken }: ChatEmbedProps) {
  const [trip, setTrip] = useState<Trip | null>(null);
  const [loading, setLoading] = useState(true);
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadTrip();
    requestLocation();
  }, [tripId, shareToken]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const requestLocation = async () => {
    if (!navigator.geolocation) return;
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: false,
          timeout: 5000,
          maximumAge: 300000
        });
      });
      setUserLocation({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude
      });
    } catch (error) {
      console.log('GPS not available');
    }
  };

  const loadTrip = async () => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    try {
      let tripData = null;

      if (shareToken) {
        const { data } = await supabase
          .from('travel_trips')
          .select('*')
          .eq('share_token', shareToken)
          .maybeSingle();
        tripData = data;
      } else if (tripId) {
        const { data } = await supabase
          .from('travel_trips')
          .select('*')
          .eq('id', tripId)
          .maybeSingle();
        tripData = data;
      }

      if (!tripData) {
        console.error('Trip not found');
        setLoading(false);
        return;
      }

      setTrip(tripData);

      // Create or get session
      const sessionKey = `travelbro_embed_${tripData.id}`;
      let existingToken = sessionStorage.getItem(sessionKey);

      if (!existingToken) {
        existingToken = crypto.randomUUID().replace(/-/g, '');
        sessionStorage.setItem(sessionKey, existingToken);
      }

      setSessionToken(existingToken);

      // Load existing messages
      const { data: conversations } = await supabase
        .from('travel_conversations')
        .select('*')
        .eq('session_token', existingToken)
        .order('created_at', { ascending: true });

      if (conversations && conversations.length > 0) {
        setMessages(conversations.map((c: any) => ({
          role: c.role,
          content: c.message,
          timestamp: new Date(c.created_at)
        })));
      } else {
        // Welcome message
        setMessages([{
          role: 'assistant',
          content: `Hoi! 👋 Ik ben je TravelBRO assistent voor **${tripData.name}**.\n\nStel me gerust je vragen over routes, restaurants, activiteiten of wat dan ook!`,
          timestamp: new Date()
        }]);
      }
    } catch (error) {
      console.error('Error loading trip:', error);
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async () => {
    if ((!inputMessage.trim() && !selectedImage) || !sessionToken || !trip || sending) return;

    const userMessage: Message = {
      role: 'user',
      content: inputMessage.trim() || '📸 [Foto]',
      timestamp: new Date(),
      imageUrl: selectedImage || undefined,
    };

    setMessages(prev => [...prev, userMessage]);
    const messageToSend = inputMessage.trim();
    const imageToSend = selectedImage;
    setInputMessage('');
    setSelectedImage(null);
    setSending(true);

    // Add empty assistant message that we'll stream into
    const assistantMsg: Message = { role: 'assistant', content: '', timestamp: new Date() };
    setMessages(prev => [...prev, assistantMsg]);

    try {
      const requestBody: any = {
        tripId: trip.id,
        sessionToken,
        deviceType: 'web_embed',
        message: messageToSend || 'Wat zie je op deze foto?',
      };

      if (imageToSend) requestBody.imageBase64 = imageToSend;
      if (userLocation) requestBody.userLocation = userLocation;

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/travelbro-chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[ChatEmbed] Error response:', errorText);
        throw new Error(`Failed to get response: ${response.status}`);
      }

      const contentType = response.headers.get('content-type') || '';

      if (contentType.includes('text/event-stream')) {
        // ⚡ STREAMING: read SSE chunks and update message in real-time
        const reader = response.body!.getReader();
        const decoder = new TextDecoder();
        let accumulated = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n').filter(l => l.startsWith('data: '));

          for (const line of lines) {
            const data = line.slice(6).trim();
            if (data === '[DONE]') continue;
            try {
              const parsed = JSON.parse(data);
              if (parsed.text) {
                accumulated += parsed.text;
                // Update the last message (assistant) with accumulated text
                setMessages(prev => {
                  const updated = [...prev];
                  updated[updated.length - 1] = { ...updated[updated.length - 1], content: accumulated };
                  return updated;
                });
              }
            } catch (e) {
              // Skip unparseable chunks
            }
          }
        }
      } else {
        // Fallback: non-streaming JSON response
        const data = await response.json();
        const responseText = data.text || data.message || data.response || data.reply ||
                            (data.choices && data.choices[0]?.message?.content) ||
                            'Geen antwoord ontvangen';
        setMessages(prev => {
          const updated = [...prev];
          updated[updated.length - 1] = { ...updated[updated.length - 1], content: responseText, response: data };
          return updated;
        });
      }
    } catch (error) {
      console.error('Error:', error);
      setMessages(prev => {
        const updated = [...prev];
        updated[updated.length - 1] = { ...updated[updated.length - 1], content: 'Sorry, er ging iets mis. Probeer het opnieuw.' };
        return updated;
      });
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-50">
        <Loader className="w-8 h-8 text-orange-500 animate-spin" />
      </div>
    );
  }

  if (!trip) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-50 p-4">
        <div className="text-center">
          <Bot className="w-12 h-12 text-gray-400 mx-auto mb-2" />
          <p className="text-gray-600">Chat niet beschikbaar</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-gradient-to-br from-orange-50 to-amber-50">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="space-y-3 max-w-2xl mx-auto">
          {messages.map((msg, index) => (
            <div
              key={index}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`flex items-start space-x-2 max-w-[85%] ${msg.role === 'user' ? 'flex-row-reverse space-x-reverse' : ''}`}>
                <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${
                  msg.role === 'user' ? 'bg-gray-300' : 'bg-gradient-to-br from-orange-500 to-amber-500'
                }`}>
                  {msg.role === 'user' ? <User className="w-4 h-4 text-gray-700" /> : <Bot className="w-4 h-4 text-white" />}
                </div>
                <div className={`rounded-2xl px-3 py-2 ${
                  msg.role === 'user' ? 'bg-orange-600 text-white' : 'bg-white border border-gray-200 text-gray-900'
                }`}>
                  {msg.imageUrl && (
                    <img src={msg.imageUrl} alt="Upload" className="w-full max-w-[200px] rounded-lg mb-2" />
                  )}
                  {msg.role === 'assistant' && msg.response ? (
                    <ResponseDisplay response={msg.response} />
                  ) : (
                    <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                  )}
                </div>
              </div>
            </div>
          ))}
          {sending && (
            <div className="flex justify-start">
              <div className="flex items-start space-x-2">
                <div className="w-7 h-7 rounded-full flex items-center justify-center bg-gradient-to-br from-orange-500 to-amber-500">
                  <Bot className="w-4 h-4 text-white" />
                </div>
                <div className="rounded-2xl px-3 py-2 bg-white border border-gray-200">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-orange-500 rounded-full animate-bounce" />
                    <div className="w-2 h-2 bg-orange-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                    <div className="w-2 h-2 bg-orange-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                  </div>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input */}
      <div className="bg-white border-t p-3">
        <div className="max-w-2xl mx-auto">
          {userLocation && (
            <div className="flex items-center space-x-1 mb-2 text-xs text-gray-500">
              <MapPin className="w-3 h-3 text-green-600" />
              <span>GPS actief</span>
            </div>
          )}
          <div className="flex items-end space-x-2">
            <MultimodalInput
              onImageCapture={(base64) => setSelectedImage(base64)}
              onImageRemove={() => setSelectedImage(null)}
              selectedImage={selectedImage}
              disabled={sending}
            />
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && !sending && sendMessage()}
              placeholder="Stel je vraag..."
              className="flex-1 px-3 py-2 border border-gray-300 rounded-full text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              disabled={sending}
            />
            <button
              onClick={sendMessage}
              disabled={(!inputMessage.trim() && !selectedImage) || sending}
              className="w-10 h-10 rounded-full flex items-center justify-center bg-orange-600 text-white disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {sending ? <Loader className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ChatEmbed;
