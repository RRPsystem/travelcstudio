import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Brain, Check, X, Sparkles, Lightbulb } from 'lucide-react';

interface AISuggestion {
  id: string;
  suggestion_type: string;
  content: string;
  context: any;
  status: string;
  created_at: string;
}

interface AIAssistantProps {
  episodeId: string;
  episode: any;
  onStatsUpdate: () => void;
  onApplySuggestion: (suggestion: AISuggestion) => void;
}

export default function AIAssistant({ episodeId, episode, onStatsUpdate, onApplySuggestion }: AIAssistantProps) {
  const [suggestions, setSuggestions] = useState<AISuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    loadSuggestions();
  }, [episodeId]);

  const loadSuggestions = async () => {
    const { data } = await supabase
      .from('podcast_ai_suggestions')
      .select('*')
      .eq('episode_planning_id', episodeId)
      .order('created_at', { ascending: false });

    setSuggestions(data || []);
  };

  const generateSuggestions = async () => {
    setGenerating(true);
    try {
      const mockSuggestions = [
        {
          suggestion_type: 'question',
          content: 'Wat zijn de grootste uitdagingen in jullie branche momenteel?',
          context: { reason: 'Breed inleidende vraag om het gesprek te starten' }
        },
        {
          suggestion_type: 'question',
          content: `Hoe zie je de toekomst van ${episode.topic}?`,
          context: { reason: 'Toekomstgerichte vraag die diepgang toevoegt' }
        },
        {
          suggestion_type: 'improvement',
          content: 'Overweeg om een icebreaker vraag toe te voegen aan het begin',
          context: { reason: 'Helpt om de gast op zijn gemak te stellen' }
        }
      ];

      for (const suggestion of mockSuggestions) {
        await supabase.from('podcast_ai_suggestions').insert({
          episode_planning_id: episodeId,
          ...suggestion,
          status: 'pending'
        });
      }

      await loadSuggestions();
      onStatsUpdate();
    } catch (error) {
      console.error('Error generating suggestions:', error);
    } finally {
      setGenerating(false);
    }
  };

  const handleSuggestion = async (suggestionId: string, action: 'accept' | 'reject', suggestion?: AISuggestion) => {
    await supabase
      .from('podcast_ai_suggestions')
      .update({
        status: action === 'accept' ? 'accepted' : 'rejected',
        reviewed_at: new Date().toISOString()
      })
      .eq('id', suggestionId);

    if (action === 'accept' && suggestion) {
      if (suggestion.suggestion_type === 'question') {
        await supabase.from('podcast_questions').insert({
          episode_planning_id: episodeId,
          question: suggestion.content,
          source_type: 'ai',
          status: 'concept',
          ai_generated: true,
          order_index: 999
        });
      } else {
        onApplySuggestion(suggestion);
      }
    }

    await loadSuggestions();
    onStatsUpdate();
  };

  const pendingSuggestions = suggestions.filter(s => s.status === 'pending');

  return (
    <div className="max-w-5xl mx-auto">
      <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg p-6 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center space-x-3 mb-2">
              <Brain size={28} />
              <h2 className="text-2xl font-bold">AI Assistant</h2>
            </div>
            <p className="text-purple-100">Krijg slimme suggesties voor vragen, onderwerpen en verbeteringen</p>
          </div>
          <button
            onClick={generateSuggestions}
            disabled={generating}
            className="flex items-center space-x-2 px-6 py-3 bg-white text-purple-600 rounded-lg hover:bg-purple-50 transition-colors disabled:opacity-50 font-medium"
          >
            <Sparkles size={18} />
            <span>{generating ? 'Genereren...' : 'Genereer Suggesties'}</span>
          </button>
        </div>
      </div>

      <div className="space-y-4">
        {pendingSuggestions.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
            <Lightbulb className="mx-auto h-16 w-16 text-gray-300 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Geen AI Suggesties</h3>
            <p className="text-gray-600 mb-6">Klik op "Genereer Suggesties" om AI-gestuurde ideeën te krijgen</p>
            <button
              onClick={generateSuggestions}
              disabled={generating}
              className="inline-flex items-center space-x-2 px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
            >
              <Sparkles size={18} />
              <span>{generating ? 'Genereren...' : 'Genereer Suggesties'}</span>
            </button>
          </div>
        ) : (
          pendingSuggestions.map((suggestion) => (
            <div key={suggestion.id} className="bg-white rounded-lg border-2 border-purple-200 p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                    <Brain className="text-purple-600" size={20} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-purple-600 capitalize">
                      {suggestion.suggestion_type.replace('_', ' ')}
                    </p>
                    <p className="text-xs text-gray-500">
                      {new Date(suggestion.created_at).toLocaleString('nl-NL')}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleSuggestion(suggestion.id, 'accept', suggestion)}
                    className="p-2 bg-green-100 text-green-600 hover:bg-green-200 rounded-lg transition-colors"
                    title="Accepteren"
                  >
                    <Check size={18} />
                  </button>
                  <button
                    onClick={() => handleSuggestion(suggestion.id, 'reject')}
                    className="p-2 bg-red-100 text-red-600 hover:bg-red-200 rounded-lg transition-colors"
                    title="Afwijzen"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>

              <div className="bg-purple-50 rounded-lg p-4 mb-3">
                <p className="text-gray-900 font-medium">{suggestion.content}</p>
              </div>

              {suggestion.context?.reason && (
                <div className="flex items-start space-x-2 text-sm text-gray-600">
                  <Lightbulb size={16} className="mt-0.5 text-yellow-500" />
                  <p>{suggestion.context.reason}</p>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* History */}
      {suggestions.filter(s => s.status !== 'pending').length > 0 && (
        <div className="mt-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Eerdere Suggesties</h3>
          <div className="space-y-2">
            {suggestions.filter(s => s.status !== 'pending').map((suggestion) => (
              <div key={suggestion.id} className="bg-gray-50 rounded-lg p-4 flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-900">{suggestion.content}</p>
                  <p className="text-xs text-gray-500 capitalize">{suggestion.suggestion_type}</p>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                  suggestion.status === 'accepted' ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-700'
                }`}>
                  {suggestion.status === 'accepted' ? 'Geaccepteerd' : 'Afgewezen'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
