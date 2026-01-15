import React from 'react';
import { MapPin, Navigation, Phone, Share2, ExternalLink, Eye } from 'lucide-react';

interface DisplayCard {
  type: 'restaurant' | 'route' | 'info' | 'image' | 'weather' | 'hotel' | 'activity';
  title: string;
  data: any;
  priority: number;
}

interface Action {
  type: 'navigate' | 'call' | 'save' | 'share' | 'open_url';
  label: string;
  data: any;
}

interface TravelBroResponse {
  text: string;
  speech_text: string;
  display_cards: DisplayCard[];
  actions: Action[];
  requires_clarification: boolean;
  vision_used: boolean;
  audio_url?: string;
  metadata: {
    processing_time_ms: number;
    tokens_used: number;
    cost_eur: number;
  };
}

interface ResponseDisplayProps {
  response: TravelBroResponse;
}

export function ResponseDisplay({ response }: ResponseDisplayProps) {
  const handleAction = (action: Action) => {
    switch (action.type) {
      case 'navigate':
        if (action.data.destination) {
          window.open(
            `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(action.data.destination)}`,
            '_blank'
          );
        }
        break;
      case 'share':
        if (navigator.share) {
          navigator.share({
            title: 'TravelBro Antwoord',
            text: response.speech_text || response.text,
          });
        }
        break;
      case 'open_url':
        if (action.data.url) {
          window.open(action.data.url, '_blank');
        }
        break;
    }
  };

  return (
    <div className="space-y-3">
      <div className="text-sm whitespace-pre-wrap">
        {response.text}
      </div>

      {response.vision_used && (
        <div className="flex items-center space-x-2 text-xs text-blue-600 bg-blue-50 px-3 py-1.5 rounded-full w-fit">
          <Eye className="w-3.5 h-3.5" />
          <span>Vision analyse gebruikt</span>
        </div>
      )}

      {response.display_cards && response.display_cards.length > 0 && (
        <div className="space-y-2 mt-3">
          {response.display_cards.map((card, index) => (
            <DisplayCardComponent key={index} card={card} />
          ))}
        </div>
      )}

      {response.actions && response.actions.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-3">
          {response.actions.map((action, index) => (
            <ActionButton
              key={index}
              action={action}
              onClick={() => handleAction(action)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function DisplayCardComponent({ card }: { card: DisplayCard }) {
  if (card.type === 'restaurant') {
    return (
      <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
        <div className="flex items-start space-x-2">
          <MapPin className="w-4 h-4 text-orange-600 mt-0.5 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="font-medium text-gray-900 text-sm">{card.title}</div>
            {card.data.address && (
              <div className="text-xs text-gray-600 mt-0.5">{card.data.address}</div>
            )}
            {card.data.distance_meters && (
              <div className="text-xs text-orange-600 mt-1">
                {card.data.distance_meters}m afstand
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (card.type === 'route') {
    return (
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
        <div className="flex items-start space-x-2">
          <Navigation className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="font-medium text-gray-900 text-sm">{card.title}</div>
            <div className="flex items-center space-x-3 mt-1 text-xs text-gray-600">
              <span>{card.data.distance_km} km</span>
              <span>•</span>
              <span>{card.data.duration_minutes} min</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (card.type === 'info') {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
        <div className="text-sm text-gray-700">{card.title}</div>
      </div>
    );
  }

  return null;
}

function ActionButton({ action, onClick }: { action: Action; onClick: () => void }) {
  const getIcon = () => {
    switch (action.type) {
      case 'navigate':
        return <Navigation className="w-3.5 h-3.5" />;
      case 'call':
        return <Phone className="w-3.5 h-3.5" />;
      case 'share':
        return <Share2 className="w-3.5 h-3.5" />;
      case 'open_url':
        return <ExternalLink className="w-3.5 h-3.5" />;
      default:
        return null;
    }
  };

  return (
    <button
      onClick={onClick}
      className="flex items-center space-x-1.5 px-3 py-1.5 bg-white border border-gray-300 text-gray-700 text-xs rounded-lg hover:bg-gray-50 hover:border-gray-400 transition-colors"
    >
      {getIcon()}
      <span>{action.label}</span>
    </button>
  );
}
