import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Loader2, Bot, User, ThumbsUp, ThumbsDown } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  conversationId?: string;
  feedback?: 'helpful' | 'not_helpful';
}

export function HelpBot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: 'Hallo! Ik ben de TravelBro Help Assistent. Ik ken alle ins en outs van dit systeem en kan je helpen met vragen over functionaliteiten, instellingen, en problemen oplossen. Waar kan ik je mee helpen?',
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleFeedback = async (messageId: string, conversationId: string, helpful: boolean) => {
    try {
      const { error } = await supabase
        .from('helpbot_conversations')
        .update({ was_helpful: helpful })
        .eq('id', conversationId);

      if (error) throw error;

      setMessages(prev => prev.map(msg =>
        msg.id === messageId
          ? { ...msg, feedback: helpful ? 'helpful' : 'not_helpful' }
          : msg
      ));
    } catch (error) {
      console.error('Error saving feedback:', error);
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      if (!supabase) {
        const errorMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: 'Sorry, er is een configuratiefout. Supabase is niet geïnitialiseerd.',
          timestamp: new Date()
        };
        setMessages(prev => [...prev, errorMessage]);
        setIsLoading(false);
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        const errorMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: 'Sorry, je moet ingelogd zijn om de helpbot te gebruiken.',
          timestamp: new Date()
        };
        setMessages(prev => [...prev, errorMessage]);
        setIsLoading(false);
        return;
      }

      const conversationHistory = messages.map(m => ({
        role: m.role,
        content: m.content
      }));

      conversationHistory.push({
        role: 'user',
        content: input.trim()
      });

      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/helpbot-chat`;

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY
        },
        body: JSON.stringify({
          messages: [
            {
              role: 'system',
              content: `Je bent een hulpvaardige assistent voor het TravelBro platform. Je kent alle functionaliteiten, instellingen en workflows van het systeem. Geef altijd concrete, stapsgewijze uitleg in het Nederlands. Wees vriendelijk en geduldig.

BELANGRIJKE SYSTEEMKENNIS:

GEBRUIKERSROLLEN EN TOEGANG:
1. OPERATOR (System Administrator)
   - API Settings: Beheer OpenAI, Google, Unsplash API keys
   - GPT Management: Configureer custom GPT models
   - OAuth Management: Social media OAuth applicaties
   - Usage Monitoring: API gebruik en kosten
   - System Health: Systeem monitoring
   - Roadmap Management: Feature prioriteiten

2. ADMIN (Administrator)
   - Brand Management: Maak en beheer reisorganisaties
   - Agent Management: Beheer reisagenten
   - News Management: Nieuwsberichten voor alle brands
   - Template Management: Website templates
   - Deeplink Tester: Test deeplinks

3. BRAND (Reisorganisatie)
   - Website Management: Paginas, menus, footers
   - Content Management: Nieuws goedkeuren
   - AI Tools: Social Media + TravelBro chatbot
   - Brand Settings: Instellingen en brand voice
   - Roadmap: Bekijk en stem op features

4. AGENT (Reisagent)
   - Agent Profile: Profiel beheren met foto, bio
   - Reviews: Klantreviews beheren
   - Recommended Trips: Aanbevolen reizen
   - Social Links: Social media koppelingen

BELANGRIJKSTE FUNCTIONALITEITEN:

Website Builder:
- Drag-and-drop pagina editor
- Templates uit gallery gebruiken
- Menu's en footers bouwen
- Content types: Static, News Overview, News Detail
- Deeplinks voor externe systemen

Social Media AI:
- Verbind accounts (Facebook, Instagram, Twitter, LinkedIn, YouTube)
- Genereer AI content met brand voice
- Plan en publiceer posts
- Content suggesties op basis van trends
- LET OP: Operator moet eerst OpenAI API key instellen via API Settings!

TravelBro AI Chatbot:
- Upload reis PDFs voor context
- Interactieve reisadviezen
- Geïntegreerd in brand websites

VEELVOORKOMENDE PROBLEMEN:

Problem: "OpenAI API key niet ingesteld"
Oplossing:
1. Log in als Operator
2. Ga naar "API Settings" (tweede menu item)
3. Vul OpenAI API key in
4. Vink "Actief" aan
5. Klik "Opslaan"

Problem: "Social media account kan niet verbinden"
Oplossing: Operator moet OAuth app configureren in OAuth Management

Problem: "Website preview werkt niet"
Oplossing: Controleer of pagina is gepubliceerd en brand slug correct is

Problem: "AI content generatie geeft fout"
Oplossing:
1. Check OpenAI API key in API Settings
2. Controleer brand voice in Brand Settings
3. Check API usage limits

BELANGRIJKE INSTRUCTIES VOOR BUG REPORTS EN FEATURE REQUESTS:

Als een gebruiker een bug meldt, een systeemfout rapporteert, of een nieuwe feature wil aanvragen, leid ze dan ALTIJD naar de Roadmap:

Voor OPERATORS en BRANDS:
"Om een bug te melden of een feature te verzoeken, ga naar de Roadmap:
- Operators: Klik op 'Roadmap Management' in het menu
- Brands: Klik op 'Roadmap' in het menu
Hier kun je nieuwe items aanmaken, bestaande items bekijken, en stemmen op feature prioriteiten."

Voor ADMINS en AGENTS:
"Om een bug te melden of een feature te verzoeken, neem contact op met de Operator of Brand eigenaar. Zij hebben toegang tot de Roadmap waar dit kan worden geregistreerd."

De Roadmap is het centrale communicatiekanaal voor:
- Bug reports en systeemfouten
- Feature requests en nieuwe functies
- Verbetersuggesties
- Prioritering van ontwikkelingen

BEST PRACTICES:
- Brands: Stel eerst Brand Voice in via Brand Settings
- Operators: Monitor API usage regelmatig
- Admins: Gebruik duidelijke brand slugs (lowercase, geen spaties)
- ALLE GEBRUIKERS: Gebruik de Roadmap voor bug reports en feature requests!

Geef altijd concrete stappen en verwijs naar de juiste menu items!`
            },
            ...conversationHistory
          ]
        })
      });

      if (!response.ok) {
        throw new Error('API call failed');
      }

      const data = await response.json();
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.choices[0].message.content,
        timestamp: new Date(),
        conversationId: data.conversation_id
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error: any) {
      console.error('Error:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Sorry, er ging iets mis. Controleer of de OpenAI API key correct is ingesteld via Operator > API Settings.',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <>
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 w-14 h-14 bg-orange-600 hover:bg-orange-700 text-white rounded-full shadow-lg flex items-center justify-center transition-all hover:scale-110 z-50"
          style={{ backgroundColor: '#ff7700' }}
        >
          <MessageCircle className="w-6 h-6" />
        </button>
      )}

      {isOpen && (
        <div className="fixed bottom-6 right-6 w-96 h-[600px] bg-white rounded-lg shadow-2xl flex flex-col z-50 border border-gray-200">
          <div className="bg-orange-600 text-white p-4 rounded-t-lg flex items-center justify-between" style={{ backgroundColor: '#ff7700' }}>
            <div className="flex items-center gap-2">
              <Bot className="w-5 h-5" />
              <div>
                <h3 className="font-semibold">TravelBro Help</h3>
                <p className="text-xs opacity-90">Altijd beschikbaar</p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="hover:bg-orange-700 p-1 rounded transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex gap-2 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {message.role === 'assistant' && (
                  <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <Bot className="w-4 h-4 text-orange-600" style={{ color: '#ff7700' }} />
                  </div>
                )}
                <div className="flex flex-col gap-1">
                  <div
                    className={`p-3 rounded-lg ${
                      message.role === 'user'
                        ? 'bg-orange-600 text-white'
                        : 'bg-white text-gray-900 border border-gray-200'
                    }`}
                    style={message.role === 'user' ? { backgroundColor: '#ff7700' } : {}}
                  >
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                    <p className={`text-xs mt-1 ${message.role === 'user' ? 'text-orange-100' : 'text-gray-500'}`}>
                      {message.timestamp.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  {message.role === 'assistant' && message.conversationId && (
                    <div className="flex gap-2 items-center pl-1">
                      <button
                        onClick={() => handleFeedback(message.id, message.conversationId!, true)}
                        disabled={message.feedback !== undefined}
                        className={`p-1 rounded hover:bg-gray-100 transition-colors disabled:opacity-50 ${
                          message.feedback === 'helpful' ? 'text-green-600' : 'text-gray-400'
                        }`}
                        title="Nuttig"
                      >
                        <ThumbsUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleFeedback(message.id, message.conversationId!, false)}
                        disabled={message.feedback !== undefined}
                        className={`p-1 rounded hover:bg-gray-100 transition-colors disabled:opacity-50 ${
                          message.feedback === 'not_helpful' ? 'text-red-600' : 'text-gray-400'
                        }`}
                        title="Niet nuttig"
                      >
                        <ThumbsDown className="w-3.5 h-3.5" />
                      </button>
                      {message.feedback && (
                        <span className="text-xs text-gray-500 ml-1">
                          Bedankt voor je feedback!
                        </span>
                      )}
                    </div>
                  )}
                </div>
                {message.role === 'user' && (
                  <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center flex-shrink-0">
                    <User className="w-4 h-4 text-gray-600" />
                  </div>
                )}
              </div>
            ))}
            {isLoading && (
              <div className="flex gap-2 justify-start">
                <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <Bot className="w-4 h-4 text-orange-600" style={{ color: '#ff7700' }} />
                </div>
                <div className="bg-white border border-gray-200 p-3 rounded-lg">
                  <Loader2 className="w-4 h-4 animate-spin text-orange-600" style={{ color: '#ff7700' }} />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="p-4 border-t border-gray-200 bg-white rounded-b-lg">
            <div className="flex gap-2">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Stel een vraag..."
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 resize-none"
                rows={2}
                disabled={isLoading}
              />
              <button
                onClick={sendMessage}
                disabled={!input.trim() || isLoading}
                className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
                style={{ backgroundColor: '#ff7700' }}
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Tip: Enter = versturen, Shift+Enter = nieuwe regel
            </p>
          </div>
        </div>
      )}
    </>
  );
}
