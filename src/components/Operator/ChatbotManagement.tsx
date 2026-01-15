import React, { useState, useEffect } from 'react';
import { MessageCircle, Clock, User, TrendingUp, AlertCircle, RefreshCw, Settings, Save, ThumbsUp, ThumbsDown } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface Conversation {
  id: string;
  user_id: string;
  user_role: string;
  user_question: string;
  bot_response: string;
  was_helpful: boolean | null;
  created_at: string;
}

interface ConversationStats {
  total: number;
  byRole: Record<string, number>;
  recent24h: number;
  helpfulCount: number;
  notHelpfulCount: number;
}

export function ChatbotManagement() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [stats, setStats] = useState<ConversationStats>({ total: 0, byRole: {}, recent24h: 0, helpfulCount: 0, notHelpfulCount: 0 });
  const [loading, setLoading] = useState(true);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [filter, setFilter] = useState<'all' | 'operator' | 'admin' | 'brand' | 'agent'>('all');
  const [showSystemPrompt, setShowSystemPrompt] = useState(false);
  const [systemPrompt, setSystemPrompt] = useState('');
  const [savingPrompt, setSavingPrompt] = useState(false);

  const loadConversations = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('helpbot_conversations')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (filter !== 'all') {
        query = query.eq('user_role', filter);
      }

      const { data, error } = await query;

      if (error) throw error;

      setConversations(data || []);

      const total = data?.length || 0;
      const byRole: Record<string, number> = {};
      const yesterday = new Date();
      yesterday.setHours(yesterday.getHours() - 24);
      let recent24h = 0;
      let helpfulCount = 0;
      let notHelpfulCount = 0;

      data?.forEach((conv) => {
        byRole[conv.user_role] = (byRole[conv.user_role] || 0) + 1;
        if (new Date(conv.created_at) > yesterday) {
          recent24h++;
        }
        if (conv.was_helpful === true) {
          helpfulCount++;
        } else if (conv.was_helpful === false) {
          notHelpfulCount++;
        }
      });

      setStats({ total, byRole, recent24h, helpfulCount, notHelpfulCount });
    } catch (error) {
      console.error('Error loading conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadSystemPrompt = async () => {
    try {
      const { data, error } = await supabase
        .from('chatbot_settings')
        .select('system_prompt')
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      if (data) {
        setSystemPrompt(data.system_prompt);
      }
    } catch (error) {
      console.error('Error loading system prompt:', error);
    }
  };

  const saveSystemPrompt = async () => {
    setSavingPrompt(true);
    try {
      const { data: settings } = await supabase
        .from('chatbot_settings')
        .select('id')
        .limit(1)
        .maybeSingle();

      if (settings) {
        const { error } = await supabase
          .from('chatbot_settings')
          .update({
            system_prompt: systemPrompt,
            updated_at: new Date().toISOString(),
          })
          .eq('id', settings.id);

        if (error) throw error;
      }

      alert('System prompt succesvol opgeslagen!');
    } catch (error) {
      console.error('Error saving system prompt:', error);
      alert('Fout bij opslaan van system prompt');
    } finally {
      setSavingPrompt(false);
    }
  };

  useEffect(() => {
    loadConversations();
    loadSystemPrompt();
  }, [filter]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('nl-NL', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getRoleColor = (role: string) => {
    const colors: Record<string, string> = {
      operator: 'bg-purple-100 text-purple-800',
      admin: 'bg-red-100 text-red-800',
      brand: 'bg-blue-100 text-blue-800',
      agent: 'bg-green-100 text-green-800',
    };
    return colors[role] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Chatbot Management</h1>
          <p className="text-gray-600 mt-1">Bekijk en analyseer helpbot conversaties</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowSystemPrompt(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Settings className="w-4 h-4" />
            System Prompt Bewerken
          </button>
          <button
            onClick={loadConversations}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Ververs
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-100 rounded-lg">
              <MessageCircle className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Totaal Conversaties</p>
              <p className="text-2xl font-bold">{stats.total}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-green-100 rounded-lg">
              <TrendingUp className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Laatste 24u</p>
              <p className="text-2xl font-bold">{stats.recent24h}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-purple-100 rounded-lg">
              <User className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Per Rol</p>
              <div className="text-xs space-y-1 mt-1">
                {Object.entries(stats.byRole).map(([role, count]) => (
                  <div key={role} className="flex justify-between">
                    <span className="capitalize">{role}:</span>
                    <span className="font-semibold">{count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-green-100 rounded-lg">
              <ThumbsUp className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Nuttig / Niet Nuttig</p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-lg font-bold text-green-600">{stats.helpfulCount}</span>
                <span className="text-gray-400">/</span>
                <span className="text-lg font-bold text-red-600">{stats.notHelpfulCount}</span>
              </div>
              {stats.helpfulCount + stats.notHelpfulCount > 0 && (
                <p className="text-xs text-gray-500 mt-1">
                  {Math.round((stats.helpfulCount / (stats.helpfulCount + stats.notHelpfulCount)) * 100)}% positief
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-yellow-100 rounded-lg">
              <AlertCircle className="w-6 h-6 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Meest Voorkomende Rol</p>
              <p className="text-sm font-semibold mt-1 capitalize">
                {Object.entries(stats.byRole).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A'}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                filter === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Alle
            </button>
            <button
              onClick={() => setFilter('operator')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                filter === 'operator' ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Operators
            </button>
            <button
              onClick={() => setFilter('admin')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                filter === 'admin' ? 'bg-red-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Admins
            </button>
            <button
              onClick={() => setFilter('brand')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                filter === 'brand' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Brands
            </button>
            <button
              onClick={() => setFilter('agent')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                filter === 'agent' ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Agents
            </button>
          </div>
        </div>

        <div className="divide-y divide-gray-100">
          {loading ? (
            <div className="p-8 text-center text-gray-500">
              <RefreshCw className="w-8 h-8 mx-auto mb-2 animate-spin" />
              Laden...
            </div>
          ) : conversations.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <MessageCircle className="w-12 h-12 mx-auto mb-2 text-gray-300" />
              Geen conversaties gevonden
            </div>
          ) : (
            conversations.map((conv) => (
              <div
                key={conv.id}
                className="p-4 hover:bg-gray-50 cursor-pointer transition-colors"
                onClick={() => setSelectedConversation(conv)}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${getRoleColor(conv.user_role)}`}>
                      {conv.user_role}
                    </span>
                    <div className="flex items-center gap-1 text-xs text-gray-500">
                      <Clock className="w-3 h-3" />
                      {formatDate(conv.created_at)}
                    </div>
                  </div>
                </div>
                <p className="text-sm font-medium text-gray-900 mb-1">
                  <span className="text-gray-500">Q:</span> {conv.user_question.substring(0, 100)}
                  {conv.user_question.length > 100 && '...'}
                </p>
                <p className="text-sm text-gray-600">
                  <span className="text-gray-500">A:</span> {conv.bot_response.substring(0, 150)}
                  {conv.bot_response.length > 150 && '...'}
                </p>
              </div>
            ))
          )}
        </div>
      </div>

      {selectedConversation && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
          onClick={() => setSelectedConversation(null)}
        >
          <div
            className="bg-white rounded-xl max-w-3xl w-full max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold">Conversatie Details</h2>
                <button
                  onClick={() => setSelectedConversation(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
              <div className="flex items-center gap-2 mt-2">
                <span className={`px-2 py-1 rounded text-xs font-medium ${getRoleColor(selectedConversation.user_role)}`}>
                  {selectedConversation.user_role}
                </span>
                <span className="text-sm text-gray-500">{formatDate(selectedConversation.created_at)}</span>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Vraag:</h3>
                <p className="text-gray-700 bg-gray-50 p-4 rounded-lg">{selectedConversation.user_question}</p>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Antwoord:</h3>
                <p className="text-gray-700 bg-blue-50 p-4 rounded-lg whitespace-pre-wrap">
                  {selectedConversation.bot_response}
                </p>
              </div>
              {selectedConversation.was_helpful !== null && (
                <div className="flex items-center gap-2 p-4 bg-gray-50 rounded-lg">
                  {selectedConversation.was_helpful ? (
                    <>
                      <ThumbsUp className="w-5 h-5 text-green-600" />
                      <span className="text-sm text-gray-700">Gebruiker vond dit nuttig</span>
                    </>
                  ) : (
                    <>
                      <ThumbsDown className="w-5 h-5 text-red-600" />
                      <span className="text-sm text-gray-700">Gebruiker vond dit niet nuttig</span>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {showSystemPrompt && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
          onClick={() => setShowSystemPrompt(false)}
        >
          <div
            className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold">System Prompt Bewerken</h2>
                <button
                  onClick={() => setShowSystemPrompt(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
              <p className="text-sm text-gray-600 mt-2">
                Hier kun je de system prompt aanpassen die de chatbot gebruikt.
                Zorg ervoor dat alle belangrijke informatie behouden blijft.
              </p>
            </div>
            <div className="p-6 flex-1 overflow-y-auto">
              <textarea
                value={systemPrompt}
                onChange={(e) => setSystemPrompt(e.target.value)}
                className="w-full h-[500px] p-4 border border-gray-300 rounded-lg font-mono text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="System prompt..."
              />
            </div>
            <div className="p-6 border-t border-gray-100 flex justify-end gap-2">
              <button
                onClick={() => setShowSystemPrompt(false)}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Annuleren
              </button>
              <button
                onClick={saveSystemPrompt}
                disabled={savingPrompt}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400"
              >
                {savingPrompt ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Opslaan...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Opslaan
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
