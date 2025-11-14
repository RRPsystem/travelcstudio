import React, { useState } from 'react';
import { aiTravelService } from '../../lib/apiServices';
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
  MoreHorizontal
} from 'lucide-react';

interface AIContentGeneratorProps {
  onClose?: () => void;
}

interface ChatMessage {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
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
  const [selectedVacationType, setSelectedVacationType] = useState('');
  const [selectedImageStyle, setSelectedImageStyle] = useState('');
  const [currentInput, setCurrentInput] = useState('');
  const [routeFrom, setRouteFrom] = useState('');
  const [routeTo, setRouteTo] = useState('');
  
  // Chat state
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);

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

  const vacationTypes = [
    { id: 'familie-met-kinderen', label: 'Familie met kinderen', icon: '👨‍👩‍👧‍👦' },
    { id: 'stelletjes', label: 'Stelletjes', icon: '💑' },
    { id: 'vrienden', label: 'Vrienden', icon: '👥' },
    { id: 'solo', label: 'Solo reiziger', icon: '🎒' },
    { id: 'zakelijk', label: 'Zakelijk', icon: '💼' }
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
      chatTitle = `Afbeelding maker - ${currentInput}...`;
      userMessage = `Genereer afbeelding: ${currentInput}`;
    }

    const newChat: ChatSession = {
      id: newChatId,
      title: chatTitle,
      contentType: contentTypes.find(c => c.id === selectedContentType)?.label || '',
      lastActivity: new Date(),
      writingStyle: selectedWritingStyle,
      vacationType: selectedVacationType,
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
    
    // Generate initial AI response
    setTimeout(async () => {
      try {
        let response = '';
        if (selectedContentType === 'image') {
          const imageUrl = await aiTravelService.generateImage(currentInput);
          response = imageUrl ? `![Generated Image](${imageUrl})\n\nAfbeelding gegenereerd voor: "${currentInput}"` : 'Kon geen afbeelding genereren.';
        } else {
          response = await aiTravelService.generateEnhancedContent(
            selectedContentType,
            selectedContentType === 'route' ? `Route van ${routeFrom} naar ${routeTo}` : currentInput,
            selectedWritingStyle || 'professional',
            additionalData,
            {
              vacationType: selectedVacationType || 'algemene',
              routeType: selectedRouteType,
              days: selectedDays,
              destination: currentInput
            }
          );
        }
        
        const aiResponse: ChatMessage = {
          id: Date.now().toString(),
          type: 'assistant',
          content: response,
          timestamp: new Date()
        };

        setChatSessions(prev => prev.map(chat => 
          chat.id === newChatId 
            ? { ...chat, messages: [...chat.messages, aiResponse] }
            : chat
        ));
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
      }
    }, 1500);
    
    // Reset form
    setSelectedContentType('');
    setSelectedWritingStyle('');
    setSelectedRouteType('');
    setSelectedDays('');
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
    setTimeout(async () => {
      try {
        const activeChat = chatSessions.find(c => c.id === activeChatId);
        const contentType = activeChat?.contentType.toLowerCase().replace(' ', '') || 'destination';
        
        let response = '';
        if (contentType.includes('afbeelding')) {
          // Generate image
          const imageUrl = await aiTravelService.generateImage(userInput);
          response = imageUrl ? `![Generated Image](${imageUrl})\n\nAfbeelding gegenereerd voor: "${userInput}"` : 'Kon geen afbeelding genereren.';
        } else {
          // Generate text content
          response = await aiTravelService.generateEnhancedContent(
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

        setChatSessions(prev => prev.map(chat => 
          chat.id === activeChatId 
            ? { ...chat, messages: [...chat.messages, aiResponse] }
            : chat
        ));
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
        <div className="p-4 border-b border-gray-200">
          <button 
            onClick={() => setShowSlidingPanel(true)}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-lg font-medium flex items-center justify-center space-x-2 transition-colors"
          >
            <Plus size={16} />
            <span>Nieuwe Chat</span>
          </button>
        </div>

        {/* GPT Status */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center space-x-2 mb-2">
            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
            <span className="text-sm text-blue-600">Sync GPTs</span>
            <span className="text-sm text-red-600 ml-auto">Wis</span>
          </div>
          <div className="text-xs text-green-600">✓ 20 Custom GPTs beschikbaar</div>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="p-4">
            <div className="space-y-2">
              {chatSessions.map((chat) => (
                <div 
                  key={chat.id}
                  onClick={() => setActiveChatId(chat.id)}
                  className={`p-3 rounded-lg cursor-pointer transition-colors border-l-2 ${
                    activeChatId === chat.id 
                      ? 'bg-blue-50 border-blue-500' 
                      : 'hover:bg-gray-50 border-transparent'
                  }`}
                >
                  <div className="flex items-start space-x-2">
                    <MapPin size={14} className="text-gray-400 mt-1 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
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
            <div className="bg-blue-600 border-b border-blue-700 px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <h1 className="text-lg font-semibold text-white">{activeChat.title}</h1>
                  <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">🔍 Live Search</span>
                  <span className="text-xs bg-orange-100 text-orange-800 px-2 py-1 rounded">📍 {activeChat.contentType}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <button className="bg-blue-500 hover:bg-blue-400 text-white px-3 py-1.5 rounded text-sm transition-colors">
                    Amsterdam
                  </button>
                  <div className="w-8 h-8 bg-gray-300 rounded-full"></div>
                </div>
              </div>
            </div>

            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="max-w-4xl mx-auto space-y-6">
                {activeChat.messages.map((message) => (
                  <div key={message.id} className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-3xl p-4 rounded-lg ${
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
                        className={`whitespace-pre-wrap ${message.type === 'user' ? 'text-white' : 'text-gray-900'}`}
                        style={{ lineHeight: '1.6' }}
                      >
                        {message.content}
                      </div>
                    </div>
                  </div>
                ))}
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

              <div className="grid grid-cols-5 gap-6 max-w-5xl mx-auto">
                {contentTypes.map((type) => {
                  const Icon = type.icon;
                  return (
                    <div
                      key={type.id}
                      onClick={() => handleContentTypeSelect(type.id)}
                      className="bg-white border-2 border-gray-200 rounded-xl p-6 hover:border-blue-400 hover:shadow-lg transition-all cursor-pointer group"
                    >
                      <div className="w-16 h-16 mx-auto mb-4 bg-blue-50 rounded-xl flex items-center justify-center group-hover:bg-blue-100 transition-colors">
                        <Icon className="w-8 h-8 text-blue-600" />
                      </div>
                      <h3 className="font-semibold text-gray-900 text-center">
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

            {/* Writing Style */}
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

            {/* Vacation Type */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Type Reis:</h3>
              <div className="grid grid-cols-2 gap-3">
                {vacationTypes.map((type) => (
                  <button
                    key={type.id}
                    onClick={() => setSelectedVacationType(type.id)}
                    className={`p-3 border-2 rounded-xl transition-all ${
                      selectedVacationType === type.id
                        ? 'border-orange-500 bg-orange-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="text-lg mb-1">{type.icon}</div>
                    <div className="text-sm font-medium text-gray-900">{type.label}</div>
                  </button>
                ))}
              </div>
            </div>

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
                      <div className="relative">
                        <input
                          type="text"
                          value={routeFrom}
                          onChange={(e) => setRouteFrom(e.target.value)}
                          placeholder="Startlocatie"
                          className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                        />
                        <Mic className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Naar:</label>
                      <div className="relative">
                        <input
                          type="text"
                          value={routeTo}
                          onChange={(e) => setRouteTo(e.target.value)}
                          placeholder="Eindlocatie"
                          className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                        />
                        <Mic className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                      </div>
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

          {/* Panel Footer */}
          <div className="p-6 border-t border-gray-200">
            <button
              onClick={handleCreateChat}
              disabled={!selectedContentType || (!currentInput && selectedContentType !== 'route') || (selectedContentType === 'route' && (!routeFrom || !routeTo))}
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
    </div>
  );
}