import React, { useState, useEffect } from 'react';
import { edgeAIService, aiTravelService } from '../../lib/apiServices';
import { supabase } from '../../lib/supabase';
import { APIStatusChecker } from './APIStatusChecker';
import { GooglePlacesAutocomplete } from '../shared/GooglePlacesAutocomplete';
import DOMPurify from 'dompurify';
import {
  X,
  MapPin,
  Route,
  Calendar,
  Building,
  Image as ImageIcon,
  Plus,
  Send,
  Mic,
  ChevronDown,
  Zap,
  Landmark,
  Shuffle,
  Globe,
  Paperclip,
  MoreHorizontal,
  Copy
} from 'lucide-react';

interface AIContentGeneratorProps {
  onClose?: () => void;
}

interface ChatMessage {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  routeData?: {
    from?: string;
    to?: string;
    distance: string;
    duration: string;
    steps: Array<{
      instruction: string;
      distance: string;
      duration: string;
    }>;
    waypoints?: Array<{
      name: string;
      location: { lat: number; lng: number };
      description?: string;
    }>;
  };
}

interface ChatSession {
  id: string;
  title: string;
  messages: ChatMessage[];
  contentType: string;
  lastActivity: Date;
  writingStyle?: string;
  vacationType?: string;
  routeType?: string;
  days?: string;
}

export function AIContentGenerator({ onClose }: AIContentGeneratorProps) {
  const [showSlidingPanel, setShowSlidingPanel] = useState(false);
  const [selectedContentType, setSelectedContentType] = useState('');
  const [selectedWritingStyle, setSelectedWritingStyle] = useState('');
  const [selectedRouteType, setSelectedRouteType] = useState('');
  const [selectedDays, setSelectedDays] = useState('');
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);
  const [selectedBudget, setSelectedBudget] = useState('');
  const [selectedMoreSetting, setSelectedMoreSetting] = useState('');
  const [selectedImageStyle, setSelectedImageStyle] = useState('');
  const [currentInput, setCurrentInput] = useState('');
  const [routeFrom, setRouteFrom] = useState('');
  const [routeTo, setRouteTo] = useState('');
  const [routeFromPlaceId, setRouteFromPlaceId] = useState('');
  const [routeToPlaceId, setRouteToPlaceId] = useState('');
  
  // Chat state
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showAPIStatus, setShowAPIStatus] = useState(false);
  const [generatedImages, setGeneratedImages] = useState<string[]>([]);

  // Load chat history on mount
  useEffect(() => {
    loadChatHistory();
  }, []);

  // Extract images from chat history
  useEffect(() => {
    const images: string[] = [];
    chatSessions.forEach(session => {
      session.messages.forEach(message => {
        if (message.type === 'assistant') {
          const markdownMatch = message.content.match(/!\[.*?\]\((https?:\/\/[^\)]+)\)/);
          const urlMatch = message.content.match(/(https?:\/\/[^\s]+\.(?:png|jpg|jpeg|gif|webp)[^\s]*)/i);
          if (markdownMatch || urlMatch) {
            const imageUrl = markdownMatch ? markdownMatch[1] : urlMatch![1];
            if (!images.includes(imageUrl)) {
              images.push(imageUrl);
            }
          }
        }
      });
    });
    setGeneratedImages(images.slice(0, 4));
  }, [chatSessions]);

  const loadChatHistory = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('content_generator_chats')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      if (data) {
        const loadedChats: ChatSession[] = data.map((chat: any) => ({
          id: chat.id,
          title: chat.title,
          messages: chat.messages || [],
          contentType: chat.content_type,
          lastActivity: new Date(chat.updated_at),
          writingStyle: chat.metadata?.writingStyle,
          vacationType: chat.metadata?.vacationType,
          routeType: chat.metadata?.routeType,
          days: chat.metadata?.days
        }));
        setChatSessions(loadedChats);
      }
    } catch (error) {
      console.error('Error loading chat history:', error);
    }
  };

  const saveChat = async (chat: ChatSession) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.error('No user found when saving chat');
        return;
      }

      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('brand_id')
        .eq('id', user.id)
        .maybeSingle();

      if (userError) {
        console.error('Error fetching user brand_id:', userError);
        return;
      }

      if (!userData?.brand_id) {
        console.error('No brand_id found for user');
        return;
      }

      console.log('Saving chat:', chat.id, 'for brand:', userData.brand_id);

      const { error } = await supabase
        .from('content_generator_chats')
        .upsert({
          id: chat.id,
          brand_id: userData.brand_id,
          user_id: user.id,
          title: chat.title,
          content_type: chat.contentType,
          messages: chat.messages,
          metadata: {
            writingStyle: chat.writingStyle,
            vacationType: chat.vacationType,
            routeType: chat.routeType,
            days: chat.days
          }
        });

      if (error) {
        console.error('Error upserting chat:', error);
        throw error;
      }

      console.log('Chat saved successfully:', chat.id);
    } catch (error) {
      console.error('Error saving chat:', error);
    }
  };

  const deleteChat = async (chatId: string) => {
    try {
      await supabase
        .from('content_generator_chats')
        .delete()
        .eq('id', chatId);

      setChatSessions(prev => prev.filter(c => c.id !== chatId));
      if (activeChatId === chatId) {
        setActiveChatId(null);
      }
    } catch (error) {
      console.error('Error deleting chat:', error);
    }
  };

  const contentTypes = [
    { id: 'destination', label: 'Bestemmings tekst', icon: MapPin, color: 'border-orange-500 bg-orange-50' },
    { id: 'route', label: 'Routebeschrijving', icon: Route, color: 'border-blue-500 bg-blue-50' },
    { id: 'planning', label: 'Dagplanning', icon: Calendar, color: 'border-green-500 bg-green-50' },
    { id: 'hotel', label: 'Hotel zoeker', icon: Building, color: 'border-purple-500 bg-purple-50' },
    { id: 'image', label: 'Afbeelding maker', icon: ImageIcon, color: 'border-pink-500 bg-pink-50' }
  ];

  const writingStyles = [
    { id: 'zakelijk', label: 'Zakelijk', icon: '💼' },
    { id: 'speels met kinderen', label: 'Speels met kinderen', icon: '😊' },
    { id: 'enthousiast voor stelletjes', label: 'Enthousiast voor stelletjes', icon: '🔥' },
    { id: 'beleefd in u-vorm', label: 'Beleefd in u-vorm', icon: '📝' }
  ];

  const routeTypes = [
    { 
      id: 'snelle-route', 
      label: 'Snelle Route', 
      icon: Zap, 
      description: 'Kortste tijd',
      color: 'border-red-500 bg-red-50'
    },
    { 
      id: 'toeristische-route', 
      label: 'Toeristische Route', 
      icon: Landmark, 
      description: 'Mooiste bezienswaardigheden',
      color: 'border-blue-500 bg-blue-50'
    },
    { 
      id: 'gemengd', 
      label: 'Gemengd', 
      icon: Shuffle, 
      description: 'Balans tussen tijd en bezienswaardigheden',
      color: 'border-orange-500 bg-orange-50'
    }
  ];

  const dayOptions = [
    { id: '1-dag', label: '1 Dag', icon: '☀️', description: 'Dagtrip' },
    { id: '2-dagen', label: '2 Dagen', icon: '🌅', description: 'Weekend' },
    { id: '3-dagen', label: '3 Dagen', icon: '🗓️', description: 'Lang weekend' }
  ];

  const moreSettings = [
    { id: 'rondreis', label: 'Rondreis', icon: '🗺️', description: 'Meerdere bestemmingen' },
    { id: 'strandvakantie', label: 'Strandvakantie', icon: '🏖️', description: 'Zon, zee en strand' },
    { id: 'offerte', label: 'Offerte', icon: '💰', description: 'Zakelijk met prijzen' },
    { id: 'roadbook', label: 'Roadbook', icon: '📋', description: 'Reis al geboekt' },
    { id: 'webtekst', label: 'Webtekst', icon: '🌐', description: 'SEO geoptimaliseerd' },
    { id: 'social-media', label: 'Social Media', icon: '📱', description: 'Kort en catchy' },
    { id: 'nieuwsbrief', label: 'Nieuwsbrief', icon: '✉️', description: 'Persoonlijk met CTA' }
  ];

  const imageStyles = [
    { id: 'realistic', label: 'Realistisch', icon: '📸', description: 'Fotorealistische afbeelding' },
    { id: 'drone', label: 'Drone View', icon: '🚁', description: 'Luchtfoto perspectief' },
    { id: 'cartoon', label: 'Cartoon', icon: '🎨', description: 'Geanimeerde cartoon stijl' },
    { id: 'vintage', label: 'Vintage', icon: '📷', description: 'Retro vintage look' },
    { id: 'artistic', label: 'Artistiek', icon: '🖼️', description: 'Schilderij achtig' },
    { id: 'modern', label: 'Modern', icon: '✨', description: 'Strak en minimalistisch' }
  ];

  const handleContentTypeSelect = (type: string) => {
    setSelectedContentType(type);
    setShowSlidingPanel(true);
  };

  const handleCreateChat = () => {
    if (!selectedContentType) return;
    
    // Create new chat session
    const newChatId = Date.now().toString();
    let chatTitle = '';
    let userMessage = '';
    let additionalData: any = {};

    if (selectedContentType === 'destination') {
      chatTitle = `Bestemmings tekst - ${currentInput}...`;
      userMessage = `Bestemmings tekst voor ${currentInput}`;
    } else if (selectedContentType === 'route') {
      chatTitle = `Routebeschrijving (${routeTypes.find(r => r.id === selectedRouteType)?.label || 'Route'})`;
      userMessage = `Route van ${routeFrom} naar ${routeTo}`;
      additionalData = { from: routeFrom, to: routeTo, routeType: selectedRouteType };
    } else if (selectedContentType === 'planning') {
      chatTitle = `Dagplanning (${selectedDays}) - ${currentInput}...`;
      userMessage = `Dagplanning voor ${selectedDays} in ${currentInput}`;
    } else if (selectedContentType === 'hotel') {
      chatTitle = `Hotel zoeker - ${currentInput}...`;
      userMessage = currentInput;
    } else if (selectedContentType === 'image') {
      const styleLabel = imageStyles.find(s => s.id === selectedImageStyle)?.label || '';
      chatTitle = `Afbeelding maker (${styleLabel}) - ${currentInput.substring(0, 30)}...`;
      userMessage = `Genereer afbeelding: ${currentInput} (${styleLabel})`;
    }

    const newChat: ChatSession = {
      id: newChatId,
      title: chatTitle,
      contentType: contentTypes.find(c => c.id === selectedContentType)?.label || '',
      lastActivity: new Date(),
      writingStyle: selectedWritingStyle,
      vacationType: selectedMoreSetting,
      routeType: selectedRouteType,
      days: selectedDays,
      messages: [
        {
          id: '1',
          type: 'user',
          content: userMessage,
          timestamp: new Date()
        }
      ]
    };

    setChatSessions([newChat, ...chatSessions]);
    setActiveChatId(newChatId);
    setShowSlidingPanel(false);

    // Save chat to database
    saveChat(newChat);

    // Generate initial AI response
    setIsGenerating(true);
    setTimeout(async () => {
      try {
        let response = '';
        let routeData = undefined;

        if (selectedContentType === 'image') {
          const stylePrompt = imageStyles.find(s => s.id === selectedImageStyle)?.label || '';
          const fullPrompt = `${currentInput}, ${stylePrompt} style`;
          const imageUrl = await aiTravelService.generateImage(fullPrompt);
          response = imageUrl ? `![Generated Image](${imageUrl})\n\nAfbeelding gegenereerd voor: "${currentInput}"\nStijl: ${stylePrompt}` : 'Kon geen afbeelding genereren.';
        } else if (selectedContentType === 'route') {
          const { data: { session } } = await supabase.auth.getSession();
          if (!session) throw new Error('Not authenticated');

          const routeResponse = await fetch(
            `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/google-routes`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${session.access_token}`,
              },
              body: JSON.stringify({
                from: routeFrom,
                to: routeTo,
                routeType: selectedRouteType,
                includeWaypoints: true
              })
            }
          );

          const routeResult = await routeResponse.json();

          console.log('=== ROUTE API RESPONSE ===');
          console.log('Full response:', JSON.stringify(routeResult, null, 2));
          console.log('Has eateries on route?', !!routeResult.route?.eateriesOnRoute);
          console.log('Has eateries at arrival?', !!routeResult.route?.eateriesAtArrival);
          console.log('Eateries on route:', routeResult.route?.eateriesOnRoute);
          console.log('Eateries at arrival:', routeResult.route?.eateriesAtArrival);

          if (routeResult.success && routeResult.route) {
            routeData = {
              ...routeResult.route,
              from: routeFrom,
              to: routeTo
            };

            const vacationTypeObj = moreSettings.find(s => s.id === selectedMoreSetting);
            const routeTypeObj = routeTypes.find(r => r.id === selectedRouteType);
            const daysObj = dayOptions.find(d => d.id === selectedDays);

            response = await edgeAIService.generateContent(
              'route',
              `Route van ${routeFrom} naar ${routeTo}`,
              selectedWritingStyle || 'zakelijk',
              {
                from: routeFrom,
                to: routeTo,
                distance: routeData.distance,
                duration: routeData.duration,
                waypoints: routeData.waypoints || [],
                eateriesOnRoute: routeData.eateriesOnRoute || [],
                eateriesAtArrival: routeData.eateriesAtArrival || []
              },
              {
                vacationType: selectedMoreSetting || 'algemene',
                vacationTypeDescription: vacationTypeObj?.description,
                routeType: selectedRouteType,
                routeTypeDescription: routeTypeObj?.description,
                days: selectedDays,
                daysDescription: daysObj?.description,
                destination: routeTo
              }
            );
          } else {
            response = `Kon geen route vinden: ${routeResult.error || 'Onbekende fout'}`;
          }
        } else {
          // Find descriptions for selected options
          const vacationTypeObj = moreSettings.find(s => s.id === selectedMoreSetting);
          const routeTypeObj = routeTypes.find(r => r.id === selectedRouteType);
          const daysObj = dayOptions.find(d => d.id === selectedDays);

          response = await edgeAIService.generateContent(
            selectedContentType,
            currentInput,
            selectedWritingStyle || 'professional',
            additionalData,
            {
              vacationType: selectedMoreSetting || 'algemene',
              vacationTypeDescription: vacationTypeObj?.description,
              routeType: selectedRouteType,
              routeTypeDescription: routeTypeObj?.description,
              days: selectedDays,
              daysDescription: daysObj?.description,
              destination: currentInput
            }
          );
        }

        const aiResponse: ChatMessage = {
          id: Date.now().toString(),
          type: 'assistant',
          content: response,
          timestamp: new Date(),
          routeData
        };

        setChatSessions(prev => {
          const updated = prev.map(chat =>
            chat.id === newChatId
              ? { ...chat, messages: [...chat.messages, aiResponse] }
              : chat
          );
          // Save updated chat
          const updatedChat = updated.find(c => c.id === newChatId);
          if (updatedChat) saveChat(updatedChat);
          return updated;
        });
        setIsGenerating(false);
      } catch (error) {
        const errorResponse: ChatMessage = {
          id: Date.now().toString(),
          type: 'assistant',
          content: `Er is een fout opgetreden: ${error instanceof Error ? error.message : 'Onbekende fout'}`,
          timestamp: new Date()
        };

        setChatSessions(prev => prev.map(chat =>
          chat.id === newChatId
            ? { ...chat, messages: [...chat.messages, errorResponse] }
            : chat
        ));
        setIsGenerating(false);
      }
    }, 1500);
    
    // Reset form
    setSelectedContentType('');
    setSelectedWritingStyle('');
    setSelectedRouteType('');
    setSelectedDays('');
    setSelectedMoreSetting('');
    setSelectedImageStyle('');
    setCurrentInput('');
    setRouteFrom('');
    setRouteTo('');
  };

  const handleSendMessage = () => {
    if (!currentInput.trim() || !activeChatId) return;

    const newMessage: ChatMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: currentInput,
      timestamp: new Date()
    };

    setChatSessions(prev => prev.map(chat => 
      chat.id === activeChatId 
        ? { ...chat, messages: [...chat.messages, newMessage], lastActivity: new Date() }
        : chat
    ));

    const userInput = currentInput;
    setCurrentInput('');

    // Generate AI response
    setIsGenerating(true);
    setTimeout(async () => {
      try {
        const activeChat = chatSessions.find(c => c.id === activeChatId);
        const contentType = activeChat?.contentType.toLowerCase().replace(' ', '') || 'destination';
        
        let response = '';
        if (contentType.includes('afbeelding')) {
          // Generate image with style
          const activeChat = chatSessions.find(c => c.id === activeChatId);
          const fullPrompt = userInput;
          const imageUrl = await aiTravelService.generateImage(fullPrompt);
          response = imageUrl ? `![Generated Image](${imageUrl})\n\nAfbeelding gegenereerd voor: "${userInput}"` : 'Kon geen afbeelding genereren.';
        } else {
          // Generate text content
          response = await edgeAIService.generateContent(
            contentType,
            userInput,
            activeChat?.writingStyle || 'professional',
            {},
            {
              vacationType: activeChat?.vacationType || 'algemene',
              routeType: activeChat?.routeType,
              days: activeChat?.days,
              destination: userInput
            }
          );
        }
        
        const aiResponse: ChatMessage = {
          id: (Date.now() + 1).toString(),
          type: 'assistant',
          content: response,
          timestamp: new Date()
        };

        setChatSessions(prev => {
          const updated = prev.map(chat =>
            chat.id === activeChatId
              ? { ...chat, messages: [...chat.messages, aiResponse] }
              : chat
          );
          // Save updated chat
          const updatedChat = updated.find(c => c.id === activeChatId);
          if (updatedChat) saveChat(updatedChat);
          return updated;
        });
        setIsGenerating(false);
      } catch (error) {
        const errorResponse: ChatMessage = {
          id: (Date.now() + 1).toString(),
          type: 'assistant',
          content: `Er is een fout opgetreden: ${error instanceof Error ? error.message : 'Onbekende fout'}`,
          timestamp: new Date()
        };

        setChatSessions(prev => prev.map(chat =>
          chat.id === activeChatId
            ? { ...chat, messages: [...chat.messages, errorResponse] }
            : chat
        ));
        setIsGenerating(false);
      }
    }, 1000);
  };

  const getButtonText = () => {
    if (selectedContentType === 'destination') return 'Genereer Bestemmings Tekst';
    if (selectedContentType === 'route') return 'Genereer Route Beschrijving';
    if (selectedContentType === 'planning') return 'Genereer Dag Planning';
    if (selectedContentType === 'hotel') return 'Zoek Hotels';
    if (selectedContentType === 'image') return 'Genereer Afbeelding';
    return 'Genereer Content';
  };

  const activeChat = chatSessions.find(chat => chat.id === activeChatId);

  return (
    <div className="flex h-full bg-gray-50 relative">
      {/* Left Sidebar - Chat History */}
      <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-200 space-y-2">
          <button
            onClick={() => setShowSlidingPanel(true)}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-lg font-medium flex items-center justify-center space-x-2 transition-colors"
          >
            <Plus size={16} />
            <span>Nieuwe Chat</span>
          </button>
          <button
            onClick={() => setShowAPIStatus(true)}
            className="w-full bg-orange-100 hover:bg-orange-200 text-orange-800 px-4 py-2 rounded-lg text-sm font-medium flex items-center justify-center space-x-2 transition-colors border border-orange-300"
          >
            <Globe size={14} />
            <span>Check API Status</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="p-4">
            <div className="space-y-2">
              {chatSessions.map((chat) => (
                <div
                  key={chat.id}
                  className={`p-3 rounded-lg transition-colors border-l-2 ${
                    activeChatId === chat.id
                      ? 'bg-blue-50 border-blue-500'
                      : 'hover:bg-gray-50 border-transparent'
                  }`}
                >
                  <div className="flex items-start space-x-2">
                    <MapPin size={14} className="text-gray-400 mt-1 flex-shrink-0" />
                    <div
                      onClick={() => setActiveChatId(chat.id)}
                      className="flex-1 min-w-0 cursor-pointer"
                    >
                      <div className="text-sm font-medium text-gray-900 truncate">
                        {chat.title}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {chat.messages.length} berichten
                      </div>
                      <div className="flex items-center space-x-1 mt-1">
                        <span className="text-xs bg-orange-100 text-orange-800 px-2 py-0.5 rounded">
                          {chat.contentType}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm('Chat verwijderen?')) {
                          deleteChat(chat.id);
                        }
                      }}
                      className="p-1 hover:bg-red-100 rounded transition-colors"
                      title="Verwijder chat"
                    >
                      <X size={14} className="text-gray-400 hover:text-red-600" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col">
        {activeChat ? (
          <>
            {/* Chat Header */}
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 border-b border-blue-800 px-6 py-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <h1 className="text-lg font-semibold text-white">{activeChat.title}</h1>
                  <span className="inline-flex items-center space-x-1.5 bg-emerald-500/20 backdrop-blur-sm text-emerald-100 px-3 py-1.5 rounded-full border border-emerald-400/30 text-xs font-medium">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <span>Live Search</span>
                  </span>
                  <span className="inline-flex items-center space-x-1.5 bg-orange-500/20 backdrop-blur-sm text-orange-100 px-3 py-1.5 rounded-full border border-orange-400/30 text-xs font-medium">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <span>{activeChat.contentType}</span>
                  </span>
                </div>
              </div>
            </div>

            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="w-full space-y-6">
                {activeChat.messages.map((message) => (
                  <div key={message.id} className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`${message.type === 'user' ? 'max-w-3xl' : 'w-full'} p-4 rounded-lg ${
                      message.type === 'user'
                        ? 'bg-blue-600 text-white'
                        : 'bg-white border border-gray-200'
                    }`}>
                      {message.type === 'assistant' && (
                        <div className="flex items-center space-x-2 mb-2">
                          <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center">
                            <span className="text-white text-xs">AI</span>
                          </div>
                        </div>
                      )}
                      <div
                        className={`${message.type === 'user' ? 'text-white' : 'text-gray-900'}`}
                        style={{ lineHeight: '1.6' }}
                      >
                        {message.routeData ? (
                          <div className="space-y-4">
                            <div className="bg-blue-50 rounded-lg p-4">
                              <h4 className="font-semibold text-blue-900 mb-2">Route Overzicht</h4>
                              <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                  <span className="text-gray-600">Afstand:</span>
                                  <span className="ml-2 font-medium">{message.routeData.distance}</span>
                                </div>
                                <div>
                                  <span className="text-gray-600">Reistijd:</span>
                                  <span className="ml-2 font-medium">{message.routeData.duration}</span>
                                </div>
                              </div>
                            </div>

                            {message.routeData.waypoints && message.routeData.waypoints.length > 0 && (
                              <div className="bg-green-50 rounded-lg p-4">
                                <h4 className="font-semibold text-green-900 mb-3">
                                  Bezienswaardigheden langs de route ({message.routeData.waypoints.length})
                                </h4>
                                <div className="space-y-2">
                                  {message.routeData.waypoints.map((waypoint, idx) => (
                                    <div key={idx} className="flex items-start space-x-2 text-sm">
                                      <MapPin className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                      <div>
                                        <div className="font-medium text-gray-900">{waypoint.name}</div>
                                        {waypoint.description && (
                                          <div className="text-gray-600 text-xs">{waypoint.description}</div>
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {message.routeData.from && message.routeData.to && (
                              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-200">
                                <h4 className="font-semibold text-blue-900 mb-3 flex items-center space-x-2">
                                  <Route className="w-5 h-5" />
                                  <span>Navigatie</span>
                                </h4>
                                <p className="text-sm text-gray-700 mb-3">
                                  Gebruik Google Maps voor turn-by-turn navigatie tijdens je reis.
                                </p>
                                <a
                                  href={`https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(message.routeData.from)}&destination=${encodeURIComponent(message.routeData.to)}&travelmode=driving`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
                                >
                                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                                  </svg>
                                  <span>Open in Google Maps</span>
                                </a>
                              </div>
                            )}

                            {message.content && (
                              <div className="bg-white rounded-lg p-4 border border-gray-200">
                                <div className="flex items-center justify-between mb-3">
                                  <h4 className="font-semibold text-gray-900">Verhaal</h4>
                                  <button
                                    onClick={() => {
                                      navigator.clipboard.writeText(message.content);
                                      alert('Tekst gekopieerd!');
                                    }}
                                    className="flex items-center space-x-1 text-sm text-gray-600 hover:text-blue-600 transition-colors"
                                  >
                                    <Copy size={14} />
                                    <span>Kopieer tekst</span>
                                  </button>
                                </div>
                                <div className="whitespace-pre-wrap text-gray-700">{message.content}</div>
                              </div>
                            )}

                            <div className="flex items-center space-x-2">
                              <button
                                onClick={() => {
                                  const url = `${window.location.origin}${window.location.pathname}?chat=${message.id}`;
                                  navigator.clipboard.writeText(url);
                                  alert('Link gekopieerd!');
                                }}
                                className="flex items-center space-x-2 bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg transition-colors text-sm"
                              >
                                <Copy size={14} />
                                <span>Kopieer Link</span>
                              </button>
                              <button
                                onClick={() => {
                                  const fullText = `Route Overzicht\nAfstand: ${message.routeData.distance}\nReistijd: ${message.routeData.duration}\n\n${message.content}`;
                                  navigator.clipboard.writeText(fullText);
                                  alert('Alles gekopieerd!');
                                }}
                                className="flex items-center space-x-2 bg-blue-100 hover:bg-blue-200 text-blue-700 px-4 py-2 rounded-lg transition-colors text-sm"
                              >
                                <Copy size={14} />
                                <span>Kopieer Alles</span>
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {(() => {
                              const markdownMatch = message.content.match(/!\[.*?\]\((https?:\/\/[^\)]+)\)/);
                              const urlMatch = message.content.match(/(https?:\/\/[^\s]+\.(?:png|jpg|jpeg|gif|webp)[^\s]*)/i);

                              if (markdownMatch || urlMatch) {
                                const imageUrl = markdownMatch ? markdownMatch[1] : urlMatch![1];
                                const textContent = message.content
                                  .replace(/!\[.*?\]\(https?:\/\/[^\)]+\)/, '')
                                  .replace(/https?:\/\/[^\s]+\.(?:png|jpg|jpeg|gif|webp)[^\s]*/i, '')
                                  .trim();

                                return (
                                  <div className="space-y-4">
                                    <div className="bg-gray-50 rounded-xl p-4 border-2 border-gray-200">
                                      <img
                                        src={imageUrl}
                                        alt="Generated Image"
                                        className="w-full rounded-lg shadow-lg"
                                        onError={(e) => {
                                          const target = e.target as HTMLImageElement;
                                          console.error('Image load failed:', imageUrl);
                                          target.style.display = 'none';
                                          const parent = target.parentElement;
                                          if (parent) {
                                            parent.innerHTML = `<div class="text-red-600 p-4 text-center">Kon afbeelding niet laden</div>`;
                                          }
                                        }}
                                      />
                                    </div>
                                    {textContent && (
                                      <div className="prose prose-sm max-w-none text-gray-700 leading-relaxed whitespace-pre-wrap">
                                        {textContent}
                                      </div>
                                    )}
                                  </div>
                                );
                              }

                              return (
                                <div
                                  className="prose prose-sm max-w-none text-gray-700 leading-relaxed"
                                  dangerouslySetInnerHTML={{
                                    __html: DOMPurify.sanitize(message.content
                                      .replace(/###\s(.+)/g, '<h3 class="text-lg font-bold text-gray-900 mt-4 mb-2">$1</h3>')
                                      .replace(/##\s(.+)/g, '<h2 class="text-xl font-bold text-gray-900 mt-6 mb-3">$1</h2>')
                                      .replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-gray-900">$1</strong>')
                                      .replace(/^\* (.+)$/gm, '<li class="ml-4">$1</li>')
                                      .replace(/^- (.+)$/gm, '<li class="ml-4">$1</li>')
                                      .replace(/(<li.*<\/li>[\n]*)+/g, '<ul class="list-disc list-inside space-y-1 my-3">$&</ul>')
                                      .replace(/\n\n/g, '</p><p class="mb-3">')
                                      .replace(/\n/g, '<br>')
                                      .replace(/^(.)/g, '<p class="mb-3">$1')
                                      .replace(/(.+)$/g, '$1</p>')
                                      .replace(/<p[^>]*><\/p>/g, ''))
                                  }}
                                />
                              );
                            })()}
                            {message.type === 'assistant' && (
                              <button
                                onClick={() => {
                                  navigator.clipboard.writeText(message.content);
                                  alert('Tekst gekopieerd!');
                                }}
                                className="flex items-center space-x-1 text-sm text-gray-600 hover:text-blue-600 transition-colors"
                              >
                                <Copy size={14} />
                                <span>Kopieer tekst</span>
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}

                {/* Loading Spinner */}
                {isGenerating && (
                  <div className="flex justify-start">
                    <div className="max-w-3xl p-4 rounded-lg bg-white border border-gray-200">
                      <div className="flex items-center space-x-2 mb-2">
                        <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center">
                          <span className="text-white text-xs">AI</span>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        <div className="flex space-x-1">
                          <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                          <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                          <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                        </div>
                        <span className="text-sm text-gray-500">AI genereert content...</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Chat Input */}
            <div className="bg-white border-t border-gray-200 p-4">
              <div className="max-w-4xl mx-auto">
                <div className="flex items-center space-x-3">
                  <div className="flex-1 relative">
                    <input
                      type="text"
                      value={currentInput}
                      onChange={(e) => setCurrentInput(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                      placeholder="Bestemming:"
                      className="w-full px-4 py-3 pr-20 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center space-x-2">
                      <button className="p-1 text-gray-400 hover:text-gray-600">
                        <Mic size={16} />
                      </button>
                      <button className="p-1 text-gray-400 hover:text-gray-600">
                        <Paperclip size={16} />
                      </button>
                    </div>
                  </div>
                  <button
                    onClick={handleSendMessage}
                    disabled={!currentInput.trim()}
                    className="bg-gray-600 hover:bg-gray-700 disabled:bg-gray-300 text-white p-3 rounded-lg transition-colors"
                  >
                    <Send size={16} />
                  </button>
                </div>
              </div>
            </div>
          </>
        ) : (
          /* Welcome Screen */
          <div className="flex-1 flex items-center justify-center p-8">
            <div className="text-center max-w-4xl">
              <div className="mb-8">
                <div className="w-24 h-24 mx-auto bg-gradient-to-br from-blue-500 via-purple-500 to-orange-500 rounded-2xl flex items-center justify-center shadow-lg">
                  <div className="w-16 h-16 bg-white rounded-xl flex items-center justify-center">
                    <Globe className="w-8 h-8 text-blue-600" />
                  </div>
                </div>
              </div>

              <h2 className="text-3xl font-bold text-gray-900 mb-4">
                Welkom bij Travel Content Generator
              </h2>
              <p className="text-lg text-gray-600 mb-12">
                Kies een content type om professionele reiscontent te genereren met automatische GPT selectie en actuele informatie
              </p>

              <div className="grid grid-cols-3 gap-6 max-w-4xl mx-auto">
                {contentTypes.map((type) => {
                  const Icon = type.icon;
                  return (
                    <div
                      key={type.id}
                      onClick={() => handleContentTypeSelect(type.id)}
                      className="bg-white border-2 border-gray-200 rounded-2xl p-8 hover:border-blue-400 hover:shadow-lg transition-all cursor-pointer group"
                    >
                      <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl flex items-center justify-center group-hover:from-blue-100 group-hover:to-blue-200 transition-all">
                        <Icon className="w-10 h-10 text-blue-600" />
                      </div>
                      <h3 className="font-semibold text-gray-900 text-center text-base leading-snug">
                        {type.label}
                      </h3>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Sliding Panel from Right */}
      <div className={`fixed top-0 right-0 h-full w-[600px] bg-white shadow-2xl transform transition-transform duration-300 ease-in-out z-50 ${
        showSlidingPanel ? 'translate-x-0' : 'translate-x-full'
      }`}>
        <div className="flex flex-col h-full">
          {/* Panel Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">Nieuwe Chat Maken</h2>
            <button 
              onClick={() => setShowSlidingPanel(false)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          {/* Panel Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-8">
            {/* Content Type Selection */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Kies Content Type:</h3>
              <div className="grid grid-cols-3 gap-4 mb-4">
                {contentTypes.slice(0, 3).map((type) => {
                  const Icon = type.icon;
                  return (
                    <button
                      key={type.id}
                      onClick={() => setSelectedContentType(type.id)}
                      className={`p-3 border-2 rounded-xl transition-all ${
                        selectedContentType === type.id
                          ? 'border-orange-500 bg-orange-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <Icon className="w-5 h-5 mx-auto mb-2 text-orange-600" />
                      <div className="text-xs font-medium text-gray-900">{type.label}</div>
                    </button>
                  );
                })}
              </div>
              <div className="grid grid-cols-2 gap-4">
                {contentTypes.slice(3).map((type) => {
                  const Icon = type.icon;
                  return (
                    <button
                      key={type.id}
                      onClick={() => setSelectedContentType(type.id)}
                      className={`p-3 border-2 rounded-xl transition-all ${
                        selectedContentType === type.id
                          ? 'border-orange-500 bg-orange-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <Icon className="w-5 h-5 mx-auto mb-2 text-orange-600" />
                      <div className="text-xs font-medium text-gray-900">{type.label}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Advanced Options */}
            <div>
              <button
                onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
                className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors"
              >
                <span>Geavanceerde opties</span>
                <ChevronDown className={`w-4 h-4 transition-transform ${showAdvancedOptions ? 'rotate-180' : ''}`} />
              </button>
            </div>

            {/* Writing Style (hide for image content type) */}
            {selectedContentType !== 'image' && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Kies Schrijfstijl:</h3>
                <div className="grid grid-cols-2 gap-3">
                  {writingStyles.map((style) => (
                    <button
                      key={style.id}
                      onClick={() => setSelectedWritingStyle(style.id)}
                      className={`p-3 border-2 rounded-xl transition-all ${
                        selectedWritingStyle === style.id
                          ? 'border-orange-500 bg-orange-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="text-lg mb-1">{style.icon}</div>
                      <div className="text-sm font-medium text-gray-900">{style.label}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* More Settings (hide for route and image content types) */}
            {selectedContentType !== 'route' && selectedContentType !== 'image' && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Meer Instellingen:</h3>
                <div className="grid grid-cols-3 gap-2">
                  {moreSettings.map((setting) => (
                    <button
                      key={setting.id}
                      onClick={() => setSelectedMoreSetting(setting.id)}
                      className={`p-2 border-2 rounded-lg transition-all shadow-sm hover:shadow-md ${
                        selectedMoreSetting === setting.id
                          ? 'border-orange-500 bg-orange-50 shadow-md'
                          : 'border-gray-200 hover:border-gray-300 bg-white'
                      }`}
                    >
                      <div className="text-base mb-0.5">{setting.icon}</div>
                      <div className="text-xs font-medium text-gray-900">{setting.label}</div>
                      <div className="text-[10px] text-gray-500 mt-0.5">{setting.description}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Route Type (only show for route content type) */}
            {selectedContentType === 'route' && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Route Type:</h3>
                <div className="grid grid-cols-1 gap-4">
                  {routeTypes.map((route) => {
                    const Icon = route.icon;
                    return (
                      <button
                        key={route.id}
                        onClick={() => setSelectedRouteType(route.id)}
                        className={`p-4 border-2 rounded-xl transition-all ${
                          selectedRouteType === route.id
                            ? route.color
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-center space-x-3">
                          <Icon className="w-6 h-6 text-gray-600" />
                          <div className="text-left">
                            <div className="text-sm font-medium text-gray-900">{route.label}</div>
                            <div className="text-xs text-gray-500">{route.description}</div>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Day Planning (only show for planning content type) */}
            {selectedContentType === 'planning' && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Aantal Dagen:</h3>
                <div className="grid grid-cols-1 gap-4">
                  {dayOptions.map((day) => (
                    <button
                      key={day.id}
                      onClick={() => setSelectedDays(day.id)}
                      className={`p-4 border-2 rounded-xl transition-all ${
                        selectedDays === day.id
                          ? 'border-orange-500 bg-orange-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <div className="text-2xl">{day.icon}</div>
                        <div className="text-left">
                          <div className="text-sm font-medium text-gray-900">{day.label}</div>
                          <div className="text-xs text-gray-500">{day.description}</div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Image Style Selection (only show for image content type) */}
            {selectedContentType === 'image' && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Kies Fotostijl:</h3>
                <div className="grid grid-cols-2 gap-4">
                  {imageStyles.map((style) => (
                    <button
                      key={style.id}
                      onClick={() => setSelectedImageStyle(style.id)}
                      className={`p-4 border-2 rounded-xl transition-all ${
                        selectedImageStyle === style.id
                          ? 'border-pink-500 bg-pink-50 shadow-md'
                          : 'border-gray-200 hover:border-gray-300 bg-white'
                      }`}
                    >
                      <div className="text-2xl mb-2">{style.icon}</div>
                      <div className="text-sm font-medium text-gray-900">{style.label}</div>
                      <div className="text-xs text-gray-500 mt-1">{style.description}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Universal Input Fields at Bottom */}
            {selectedContentType && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900">Details:</h3>

                {/* Destination Input */}
                {selectedContentType === 'destination' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Bestemming:</label>
                    <div className="relative">
                      <input
                        type="text"
                        value={currentInput}
                        onChange={(e) => setCurrentInput(e.target.value)}
                        placeholder="Bijv. Amsterdam, Parijs, Rome..."
                        className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      />
                      <Mic className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    </div>
                  </div>
                )}

                {/* Route Inputs */}
                {selectedContentType === 'route' && (
                  <div className="space-y-4">
                    <h4 className="text-md font-medium text-gray-800">Route Details:</h4>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Van:</label>
                      <GooglePlacesAutocomplete
                        value={routeFrom}
                        onChange={(value, placeId) => {
                          setRouteFrom(value);
                          if (placeId) setRouteFromPlaceId(placeId);
                        }}
                        placeholder="Startlocatie"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Naar:</label>
                      <GooglePlacesAutocomplete
                        value={routeTo}
                        onChange={(value, placeId) => {
                          setRouteTo(value);
                          if (placeId) setRouteToPlaceId(placeId);
                        }}
                        placeholder="Eindlocatie"
                      />
                    </div>
                  </div>
                )}

                {/* Planning Input */}
                {selectedContentType === 'planning' && selectedDays && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Stad/Bestemming:</label>
                    <div className="relative">
                      <input
                        type="text"
                        value={currentInput}
                        onChange={(e) => setCurrentInput(e.target.value)}
                        placeholder="Bijv. Barcelona, Amsterdam, Parijs..."
                        className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      />
                      <Mic className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    </div>
                  </div>
                )}

                {/* Hotel Input */}
                {selectedContentType === 'hotel' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Hotel zoekopdracht:</label>
                    <div className="relative">
                      <input
                        type="text"
                        value={currentInput}
                        onChange={(e) => setCurrentInput(e.target.value)}
                        placeholder="Hotels in Amsterdam met zwembad, adults only hotel Ibiza..."
                        className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      />
                      <Mic className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    </div>
                  </div>
                )}

                {/* Image Input */}
                {selectedContentType === 'image' && selectedImageStyle && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Afbeelding beschrijving:</label>
                    <div className="relative">
                      <input
                        type="text"
                        value={currentInput}
                        onChange={(e) => setCurrentInput(e.target.value)}
                        placeholder="Zonsondergang over de Eiffeltoren"
                        className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      />
                      <Mic className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Image Gallery - only show for Afbeelding Maker */}
          {selectedContentType === 'image' && generatedImages.length > 0 && (
            <div className="px-6 pb-4">
              <div className="text-xs font-semibold text-gray-500 uppercase mb-3">Laatste Afbeeldingen</div>
              <div className="grid grid-cols-4 gap-3">
                {generatedImages.slice(0, 4).map((imageUrl, index) => (
                  <div
                    key={index}
                    className="aspect-square rounded-lg overflow-hidden bg-gray-100 border-2 border-gray-200 hover:border-orange-400 transition-all cursor-pointer group shadow-sm hover:shadow-md"
                    onClick={() => {
                      setCurrentInput(`Maak een soortgelijke afbeelding als deze`);
                    }}
                  >
                    <img
                      src={imageUrl}
                      alt={`Generated ${index + 1}`}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Panel Footer */}
          <div className="p-6 border-t border-gray-200">
            <button
              onClick={handleCreateChat}
              disabled={
                !selectedContentType ||
                (!currentInput && selectedContentType !== 'route') ||
                (selectedContentType === 'route' && (!routeFrom || !routeTo)) ||
                (selectedContentType === 'image' && !selectedImageStyle)
              }
              className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 disabled:from-gray-300 disabled:to-gray-400 text-white py-3 px-6 rounded-lg font-medium transition-all disabled:cursor-not-allowed"
            >
              {getButtonText()}
            </button>
          </div>
        </div>
      </div>

      {/* Overlay */}
      {showSlidingPanel && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={() => setShowSlidingPanel(false)}
        />
      )}

      {/* API Status Modal */}
      {showAPIStatus && (
        <APIStatusChecker onClose={() => setShowAPIStatus(false)} />
      )}
    </div>
  );
}