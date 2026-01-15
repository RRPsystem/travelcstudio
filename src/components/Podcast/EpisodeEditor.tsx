import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { X, Save, Users, MessageSquare, Mic, Calendar, Clock, User, Brain, CheckCircle, AlertCircle, ArrowLeft } from 'lucide-react';
import QuestionBoard from './QuestionBoard';
import GuestManagement from './GuestManagement';
import EpisodeTimeline from './EpisodeTimeline';
import AIAssistant from './AIAssistant';
import DiscussionPanel from './DiscussionPanel';

interface EpisodeEditorProps {
  episodeId: string;
  onClose: () => void;
  onSave: () => void;
}

interface Episode {
  id: string;
  title: string;
  description: string;
  topic: string;
  scheduled_date: string;
  status: string;
  hosts: string[];
  allow_questions: boolean;
  announcement_text: string;
  total_duration_minutes: number;
  recording_notes: string;
  created_at: string;
  updated_at: string;
}

interface Stats {
  totalQuestions: number;
  approvedQuestions: number;
  discussionThreads: number;
  confirmedGuests: number;
  totalSegments: number;
  aiSuggestions: number;
}

export default function EpisodeEditor({ episodeId, onClose, onSave }: EpisodeEditorProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'questions' | 'guests' | 'timeline' | 'ai'>('overview');
  const [episode, setEpisode] = useState<Episode | null>(null);
  const [stats, setStats] = useState<Stats>({
    totalQuestions: 0,
    approvedQuestions: 0,
    discussionThreads: 0,
    confirmedGuests: 0,
    totalSegments: 0,
    aiSuggestions: 0
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showDiscussionPanel, setShowDiscussionPanel] = useState(false);
  const [selectedQuestionId, setSelectedQuestionId] = useState<string | null>(null);
  const [collaborators, setCollaborators] = useState<any[]>([]);

  useEffect(() => {
    loadEpisode();
    loadStats();
    loadCollaborators();
    const interval = setInterval(() => {
      loadStats();
      loadCollaborators();
    }, 10000);
    return () => clearInterval(interval);
  }, [episodeId]);

  const loadEpisode = async () => {
    try {
      const { data, error } = await supabase
        .from('podcast_episodes_planning')
        .select('*')
        .eq('id', episodeId)
        .single();

      if (error) throw error;
      setEpisode(data);
    } catch (error) {
      console.error('Error loading episode:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const [questions, discussions, guests, segments, aiSuggestions] = await Promise.all([
        supabase.from('podcast_questions').select('id, status', { count: 'exact' }).eq('episode_planning_id', episodeId),
        supabase.from('podcast_discussions').select('id', { count: 'exact' }).eq('episode_planning_id', episodeId).is('parent_id', null),
        supabase.from('podcast_guests').select('id, status', { count: 'exact' }).eq('episode_planning_id', episodeId),
        supabase.from('podcast_segments').select('id', { count: 'exact' }).eq('episode_planning_id', episodeId),
        supabase.from('podcast_ai_suggestions').select('id, status', { count: 'exact' }).eq('episode_planning_id', episodeId).eq('status', 'pending')
      ]);

      setStats({
        totalQuestions: questions.data?.length || 0,
        approvedQuestions: questions.data?.filter(q => q.status === 'approved' || q.status === 'in_schedule').length || 0,
        discussionThreads: discussions.count || 0,
        confirmedGuests: guests.data?.filter(g => g.status === 'confirmed').length || 0,
        totalSegments: segments.count || 0,
        aiSuggestions: aiSuggestions.count || 0
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const loadCollaborators = async () => {
    try {
      const { data } = await supabase
        .from('podcast_discussions')
        .select('author_id, author_name')
        .eq('episode_planning_id', episodeId)
        .gte('created_at', new Date(Date.now() - 30 * 60 * 1000).toISOString())
        .order('created_at', { ascending: false });

      if (data) {
        const unique = Array.from(new Map(data.map(item => [item.author_id, item])).values());
        setCollaborators(unique.slice(0, 5));
      }
    } catch (error) {
      console.error('Error loading collaborators:', error);
    }
  };

  const handleSave = async () => {
    if (!episode) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('podcast_episodes_planning')
        .update({
          title: episode.title,
          description: episode.description,
          topic: episode.topic,
          scheduled_date: episode.scheduled_date,
          status: episode.status,
          allow_questions: episode.allow_questions,
          announcement_text: episode.announcement_text,
          total_duration_minutes: episode.total_duration_minutes,
          recording_notes: episode.recording_notes,
          updated_at: new Date().toISOString()
        })
        .eq('id', episodeId);

      if (error) throw error;
      onSave();
    } catch (error) {
      console.error('Error saving episode:', error);
      alert('Fout bij opslaan');
    } finally {
      setSaving(false);
    }
  };

  const openDiscussion = (questionId?: string) => {
    setSelectedQuestionId(questionId || null);
    setShowDiscussionPanel(true);
  };

  if (loading || !episode) {
    return (
      <div className="fixed inset-0 bg-gray-50 z-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Episode laden...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-white z-50 flex flex-col">
      {/* Header */}
      <header className="bg-gradient-to-r from-orange-600 to-orange-700 text-white px-6 py-4 shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            >
              <ArrowLeft size={24} />
            </button>
            <div>
              <div className="flex items-center space-x-3">
                <Mic className="text-orange-200" size={28} />
                <h1 className="text-2xl font-bold">{episode.title}</h1>
              </div>
              <div className="flex items-center space-x-4 mt-2 text-orange-100 text-sm">
                <div className="flex items-center space-x-1">
                  <Calendar size={14} />
                  <span>{episode.scheduled_date ? new Date(episode.scheduled_date).toLocaleDateString('nl-NL') : 'Geen datum'}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Clock size={14} />
                  <span>{episode.total_duration_minutes || 0} min</span>
                </div>
                <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                  episode.status === 'published' ? 'bg-green-500' :
                  episode.status === 'recording' ? 'bg-red-500' :
                  episode.status === 'scheduled' ? 'bg-blue-500' :
                  'bg-orange-500'
                }`}>
                  {episode.status}
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            {/* Active Collaborators */}
            {collaborators.length > 0 && (
              <div className="flex items-center space-x-2">
                <div className="flex -space-x-2">
                  {collaborators.map((collab, idx) => (
                    <div
                      key={idx}
                      className="w-8 h-8 rounded-full bg-white text-orange-600 flex items-center justify-center border-2 border-orange-700 text-xs font-semibold"
                      title={collab.author_name}
                    >
                      {collab.author_name.charAt(0).toUpperCase()}
                    </div>
                  ))}
                </div>
                <span className="text-sm text-orange-100">actief</span>
              </div>
            )}

            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center space-x-2 px-4 py-2 bg-white text-orange-600 rounded-lg hover:bg-orange-50 transition-colors disabled:opacity-50 font-medium"
            >
              <Save size={18} />
              <span>{saving ? 'Opslaan...' : 'Opslaan'}</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            >
              <X size={24} />
            </button>
          </div>
        </div>

        {/* Stats Bar */}
        <div className="mt-4 grid grid-cols-5 gap-4">
          <div className="bg-white/10 rounded-lg p-3 backdrop-blur-sm">
            <div className="text-2xl font-bold">{stats.totalQuestions}</div>
            <div className="text-xs text-orange-100">Vragen Totaal</div>
          </div>
          <div className="bg-white/10 rounded-lg p-3 backdrop-blur-sm">
            <div className="text-2xl font-bold">{stats.approvedQuestions}</div>
            <div className="text-xs text-orange-100">Goedgekeurd</div>
          </div>
          <div className="bg-white/10 rounded-lg p-3 backdrop-blur-sm">
            <div className="text-2xl font-bold">{stats.confirmedGuests}</div>
            <div className="text-xs text-orange-100">Gasten</div>
          </div>
          <div className="bg-white/10 rounded-lg p-3 backdrop-blur-sm">
            <div className="text-2xl font-bold">{stats.totalSegments}</div>
            <div className="text-xs text-orange-100">Segmenten</div>
          </div>
          <div className="bg-white/10 rounded-lg p-3 backdrop-blur-sm relative">
            <div className="text-2xl font-bold">{stats.aiSuggestions}</div>
            <div className="text-xs text-orange-100">AI Suggesties</div>
            {stats.aiSuggestions > 0 && (
              <div className="absolute top-2 right-2 w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
            )}
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="bg-white border-b border-gray-200">
        <nav className="flex px-6">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-6 py-4 font-medium border-b-2 transition-colors ${
              activeTab === 'overview'
                ? 'border-orange-600 text-orange-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <div className="flex items-center space-x-2">
              <CheckCircle size={18} />
              <span>Overzicht</span>
            </div>
          </button>
          <button
            onClick={() => setActiveTab('questions')}
            className={`px-6 py-4 font-medium border-b-2 transition-colors ${
              activeTab === 'questions'
                ? 'border-orange-600 text-orange-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <div className="flex items-center space-x-2">
              <MessageSquare size={18} />
              <span>Vragen ({stats.totalQuestions})</span>
              {stats.discussionThreads > 0 && (
                <span className="ml-1 px-2 py-0.5 bg-orange-100 text-orange-600 text-xs rounded-full">
                  {stats.discussionThreads}
                </span>
              )}
            </div>
          </button>
          <button
            onClick={() => setActiveTab('guests')}
            className={`px-6 py-4 font-medium border-b-2 transition-colors ${
              activeTab === 'guests'
                ? 'border-orange-600 text-orange-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <div className="flex items-center space-x-2">
              <Users size={18} />
              <span>Gasten ({stats.confirmedGuests})</span>
            </div>
          </button>
          <button
            onClick={() => setActiveTab('timeline')}
            className={`px-6 py-4 font-medium border-b-2 transition-colors ${
              activeTab === 'timeline'
                ? 'border-orange-600 text-orange-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <div className="flex items-center space-x-2">
              <Clock size={18} />
              <span>Timeline ({stats.totalSegments})</span>
            </div>
          </button>
          <button
            onClick={() => setActiveTab('ai')}
            className={`px-6 py-4 font-medium border-b-2 transition-colors relative ${
              activeTab === 'ai'
                ? 'border-orange-600 text-orange-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <div className="flex items-center space-x-2">
              <Brain size={18} />
              <span>AI Assistant</span>
              {stats.aiSuggestions > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-green-500 text-white text-xs rounded-full flex items-center justify-center">
                  {stats.aiSuggestions}
                </span>
              )}
            </div>
          </button>
        </nav>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden flex">
        <div className={`flex-1 overflow-y-auto ${showDiscussionPanel ? 'pr-96' : ''}`}>
          <div className="p-6">
            {activeTab === 'overview' && (
              <div className="max-w-4xl mx-auto space-y-6">
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <h2 className="text-xl font-bold text-gray-900 mb-4">Episode Informatie</h2>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Titel</label>
                      <input
                        type="text"
                        value={episode.title}
                        onChange={(e) => setEpisode({ ...episode, title: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Beschrijving</label>
                      <textarea
                        value={episode.description || ''}
                        onChange={(e) => setEpisode({ ...episode, description: e.target.value })}
                        rows={4}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Onderwerp</label>
                        <input
                          type="text"
                          value={episode.topic || ''}
                          onChange={(e) => setEpisode({ ...episode, topic: e.target.value })}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Geplande Datum</label>
                        <input
                          type="datetime-local"
                          value={episode.scheduled_date ? new Date(episode.scheduled_date).toISOString().slice(0, 16) : ''}
                          onChange={(e) => setEpisode({ ...episode, scheduled_date: e.target.value })}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Opname Notities</label>
                      <textarea
                        value={episode.recording_notes || ''}
                        onChange={(e) => setEpisode({ ...episode, recording_notes: e.target.value })}
                        rows={3}
                        placeholder="Technische notities, talking points, etc..."
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      />
                    </div>

                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="allow_questions"
                        checked={episode.allow_questions}
                        onChange={(e) => setEpisode({ ...episode, allow_questions: e.target.checked })}
                        className="w-4 h-4 text-orange-600 focus:ring-orange-500 border-gray-300 rounded"
                      />
                      <label htmlFor="allow_questions" className="text-sm font-medium text-gray-700">
                        Sta vraaginzendingen toe van brands en agents
                      </label>
                    </div>

                    {episode.allow_questions && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Aankondiging Tekst (voor brands/agents)</label>
                        <textarea
                          value={episode.announcement_text || ''}
                          onChange={(e) => setEpisode({ ...episode, announcement_text: e.target.value })}
                          rows={3}
                          placeholder="Uitleg over het onderwerp en wat voor vragen jullie zoeken..."
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                        />
                      </div>
                    )}
                  </div>
                </div>

                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200 p-6">
                  <h3 className="font-semibold text-gray-900 mb-2">Algemene Discussie</h3>
                  <p className="text-sm text-gray-600 mb-4">Start een discussie over de episode of bekijk eerdere opmerkingen</p>
                  <button
                    onClick={() => openDiscussion()}
                    className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <MessageSquare size={18} />
                    <span>Open Discussie ({stats.discussionThreads})</span>
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'questions' && (
              <QuestionBoard
                episodeId={episodeId}
                onOpenDiscussion={openDiscussion}
                onStatsUpdate={loadStats}
              />
            )}

            {activeTab === 'guests' && (
              <GuestManagement
                episodeId={episodeId}
                onStatsUpdate={loadStats}
              />
            )}

            {activeTab === 'timeline' && (
              <EpisodeTimeline
                episodeId={episodeId}
                totalDuration={episode.total_duration_minutes}
                onDurationChange={(minutes) => setEpisode({ ...episode, total_duration_minutes: minutes })}
                onStatsUpdate={loadStats}
              />
            )}

            {activeTab === 'ai' && (
              <AIAssistant
                episodeId={episodeId}
                episode={episode}
                onStatsUpdate={loadStats}
                onApplySuggestion={(suggestion) => {
                  if (suggestion.suggestion_type === 'title') {
                    setEpisode({ ...episode, title: suggestion.content });
                  } else if (suggestion.suggestion_type === 'description') {
                    setEpisode({ ...episode, description: suggestion.content });
                  }
                }}
              />
            )}
          </div>
        </div>

        {/* Discussion Panel Sidebar */}
        {showDiscussionPanel && (
          <DiscussionPanel
            episodeId={episodeId}
            questionId={selectedQuestionId}
            onClose={() => setShowDiscussionPanel(false)}
            onUpdate={loadStats}
          />
        )}
      </div>
    </div>
  );
}
