import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { MessageSquare, Plus, CheckCircle, Clock, AlertCircle, Trash2, ArrowUp, ArrowDown, Brain, User, Building2, Users as UsersIcon, FolderOpen, Edit2, Upload, Video, X } from 'lucide-react';
import { SlidingMediaSelector } from '../shared/SlidingMediaSelector';

interface Topic {
  id: string;
  title: string;
  description: string | null;
  order_index: number;
  duration_minutes: number | null;
  interviewer_id: string | null;
  leading_id: string | null;
  sidekick_id: string | null;
  show_visuals: boolean;
  visuals_url: string | null;
}

interface Guest {
  id: string;
  name: string;
}

interface Host {
  id: string;
  name: string;
  is_active: boolean;
}

interface Question {
  id: string;
  question: string;
  status: string;
  source_type: string;
  submitted_by: string | null;
  submitter_name: string | null;
  order_index: number;
  notes: string | null;
  discussion_count: number;
  ai_generated: boolean;
  priority: number;
  topic_id: string | null;
  guest_id: string | null;
  phase: string;
  created_at: string;
  updated_at: string;
}

interface QuestionBoardProps {
  episodeId: string;
  onOpenDiscussion: (questionId: string) => void;
  onStatsUpdate: () => void;
}

export default function QuestionBoard({ episodeId, onOpenDiscussion, onStatsUpdate }: QuestionBoardProps) {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [guests, setGuests] = useState<Guest[]>([]);
  const [hosts, setHosts] = useState<Host[]>([]);
  const [loading, setLoading] = useState(true);
  const [newQuestion, setNewQuestion] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [showTopicForm, setShowTopicForm] = useState(false);
  const [editingTopicId, setEditingTopicId] = useState<string | null>(null);
  const [newTopicTitle, setNewTopicTitle] = useState('');
  const [newTopicDescription, setNewTopicDescription] = useState('');
  const [newTopicInterviewer, setNewTopicInterviewer] = useState<string | null>(null);
  const [newTopicLeading, setNewTopicLeading] = useState<string | null>(null);
  const [newTopicSidekick, setNewTopicSidekick] = useState<string | null>(null);
  const [newTopicShowVisuals, setNewTopicShowVisuals] = useState(false);
  const [newTopicVisualsUrl, setNewTopicVisualsUrl] = useState('');
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
  const [selectedGuest, setSelectedGuest] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'concept' | 'under_discussion' | 'approved' | 'in_schedule'>('all');
  const [viewMode, setViewMode] = useState<'by_topic' | 'by_status'>('by_topic');
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [showMediaSelector, setShowMediaSelector] = useState(false);
  const [showAddHostForm, setShowAddHostForm] = useState(false);
  const [newHostName, setNewHostName] = useState('');

  useEffect(() => {
    loadQuestions();
    loadTopics();
    loadGuests();
    loadHosts();
    loadCurrentUser();

    const questionsSubscription = supabase
      .channel(`questions_${episodeId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'podcast_questions',
        filter: `episode_planning_id=eq.${episodeId}`
      }, () => {
        loadQuestions();
        onStatsUpdate();
      })
      .subscribe();

    const topicsSubscription = supabase
      .channel(`topics_${episodeId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'podcast_topics',
        filter: `episode_planning_id=eq.${episodeId}`
      }, () => {
        loadTopics();
      })
      .subscribe();

    return () => {
      questionsSubscription.unsubscribe();
      topicsSubscription.unsubscribe();
    };
  }, [episodeId, filter]);

  const loadCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single();
      setCurrentUser(data);
    }
  };

  const loadTopics = async () => {
    try {
      const { data, error } = await supabase
        .from('podcast_topics')
        .select('*')
        .eq('episode_planning_id', episodeId)
        .order('order_index', { ascending: true });

      if (error) throw error;
      setTopics(data || []);
    } catch (error) {
      console.error('Error loading topics:', error);
    }
  };

  const loadGuests = async () => {
    try {
      const { data, error } = await supabase
        .from('podcast_guests')
        .select('id, name')
        .eq('episode_planning_id', episodeId);

      if (error) throw error;
      setGuests(data || []);
    } catch (error) {
      console.error('Error loading guests:', error);
    }
  };

  const loadHosts = async () => {
    try {
      const { data, error } = await supabase
        .from('podcast_hosts')
        .select('id, name, is_active')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setHosts(data || []);
    } catch (error) {
      console.error('Error loading hosts:', error);
    }
  };

  const addHost = async () => {
    if (!newHostName.trim()) {
      return;
    }

    try {
      const { error } = await supabase
        .from('podcast_hosts')
        .insert({
          name: newHostName.trim(),
          is_active: true
        });

      if (error) throw error;

      setNewHostName('');
      loadHosts();
    } catch (error) {
      console.error('Error adding host:', error);
      alert('Fout bij toevoegen host: ' + (error as any).message);
    }
  };

  const loadQuestions = async () => {
    try {
      let query = supabase
        .from('podcast_questions')
        .select('*')
        .eq('episode_planning_id', episodeId)
        .order('order_index', { ascending: true });

      if (filter !== 'all') {
        query = query.eq('status', filter);
      }

      const { data, error } = await query;
      if (error) throw error;
      setQuestions(data || []);
    } catch (error) {
      console.error('Error loading questions:', error);
    } finally {
      setLoading(false);
    }
  };

  const addTopic = async () => {
    if (!newTopicTitle.trim()) return;

    try {
      if (editingTopicId) {
        const { error } = await supabase
          .from('podcast_topics')
          .update({
            title: newTopicTitle.trim(),
            description: newTopicDescription.trim() || null,
            interviewer_id: newTopicInterviewer || null,
            leading_id: newTopicLeading || null,
            sidekick_id: newTopicSidekick || null,
            show_visuals: newTopicShowVisuals,
            visuals_url: newTopicVisualsUrl.trim() || null
          })
          .eq('id', editingTopicId);

        if (error) throw error;
      } else {
        const maxOrder = Math.max(...topics.map(t => t.order_index), 0);

        const { error } = await supabase
          .from('podcast_topics')
          .insert({
            episode_planning_id: episodeId,
            title: newTopicTitle.trim(),
            description: newTopicDescription.trim() || null,
            order_index: maxOrder + 1,
            interviewer_id: newTopicInterviewer || null,
            leading_id: newTopicLeading || null,
            sidekick_id: newTopicSidekick || null,
            show_visuals: newTopicShowVisuals,
            visuals_url: newTopicVisualsUrl.trim() || null
          });

        if (error) throw error;
      }

      setNewTopicTitle('');
      setNewTopicDescription('');
      setNewTopicVisualsUrl('');
      setNewTopicInterviewer(null);
      setNewTopicLeading(null);
      setNewTopicSidekick(null);
      setNewTopicShowVisuals(false);
      setShowTopicForm(false);
      setEditingTopicId(null);
      loadTopics();
    } catch (error) {
      console.error('Error saving topic:', error);
      alert('Fout bij opslaan onderwerp');
    }
  };

  const editTopic = (topic: Topic) => {
    setNewTopicTitle(topic.title);
    setNewTopicDescription(topic.description || '');
    setNewTopicInterviewer(topic.interviewer_id);
    setNewTopicLeading(topic.leading_id);
    setNewTopicSidekick(topic.sidekick_id);
    setNewTopicShowVisuals(topic.show_visuals);
    setNewTopicVisualsUrl(topic.visuals_url || '');
    setEditingTopicId(topic.id);
    setShowTopicForm(true);
  };

  const cancelTopicForm = () => {
    setShowTopicForm(false);
    setNewTopicTitle('');
    setNewTopicDescription('');
    setNewTopicInterviewer(null);
    setNewTopicLeading(null);
    setNewTopicSidekick(null);
    setNewTopicShowVisuals(false);
    setNewTopicVisualsUrl('');
    setEditingTopicId(null);
  };

  const addQuestion = async () => {
    if (!newQuestion.trim()) {
      alert('Voer een vraag in');
      return;
    }

    if (!currentUser) {
      alert('Gebruiker niet geladen. Probeer de pagina te verversen.');
      return;
    }

    try {
      const maxOrder = Math.max(...questions.map(q => q.order_index), 0);

      const { error } = await supabase
        .from('podcast_questions')
        .insert({
          episode_planning_id: episodeId,
          question: newQuestion.trim(),
          source_type: 'admin',
          submitted_by: currentUser.id,
          submitter_name: currentUser.email,
          status: 'concept',
          phase: 'preparation',
          topic_id: selectedTopic,
          guest_id: selectedGuest,
          order_index: maxOrder + 1,
          discussion_count: 0,
          ai_generated: false,
          priority: 0
        });

      if (error) throw error;

      setNewQuestion('');
      setSelectedTopic(null);
      setSelectedGuest(null);
      setShowAddForm(false);
      onStatsUpdate();
    } catch (error) {
      console.error('Error adding question:', error);
      alert('Fout bij toevoegen vraag: ' + (error as any).message);
    }
  };

  const updateQuestionStatus = async (questionId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('podcast_questions')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', questionId);

      if (error) throw error;
      onStatsUpdate();
    } catch (error) {
      console.error('Error updating question status:', error);
    }
  };

  const moveQuestion = async (questionId: string, direction: 'up' | 'down') => {
    const currentIndex = questions.findIndex(q => q.id === questionId);
    if (currentIndex === -1) return;
    if (direction === 'up' && currentIndex === 0) return;
    if (direction === 'down' && currentIndex === questions.length - 1) return;

    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    const current = questions[currentIndex];
    const target = questions[targetIndex];

    try {
      await Promise.all([
        supabase.from('podcast_questions').update({ order_index: target.order_index }).eq('id', current.id),
        supabase.from('podcast_questions').update({ order_index: current.order_index }).eq('id', target.id)
      ]);
    } catch (error) {
      console.error('Error moving question:', error);
    }
  };

  const deleteQuestion = async (questionId: string) => {
    if (!confirm('Weet je zeker dat je deze vraag wilt verwijderen?')) return;

    try {
      const { error } = await supabase
        .from('podcast_questions')
        .delete()
        .eq('id', questionId);

      if (error) throw error;
      onStatsUpdate();
    } catch (error) {
      console.error('Error deleting question:', error);
    }
  };

  const deleteTopic = async (topicId: string) => {
    if (topicId === 'no-topic') return;

    const topic = topics.find(t => t.id === topicId);
    if (!topic) return;

    const questionsInTopic = questions.filter(q => q.topic_id === topicId).length;

    if (questionsInTopic > 0) {
      if (!confirm(`Dit onderwerp bevat ${questionsInTopic} vragen. Deze vragen blijven behouden maar worden losgekoppeld van dit onderwerp. Weet je zeker dat je dit onderwerp wilt verwijderen?`)) {
        return;
      }
    } else {
      if (!confirm(`Weet je zeker dat je het onderwerp "${topic.title}" wilt verwijderen?`)) {
        return;
      }
    }

    try {
      const { error } = await supabase
        .from('podcast_topics')
        .delete()
        .eq('id', topicId);

      if (error) throw error;
      loadTopics();
    } catch (error) {
      console.error('Error deleting topic:', error);
      alert('Fout bij verwijderen onderwerp: ' + (error as any).message);
    }
  };

  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'concept':
        return { label: 'Concept', color: 'bg-gray-100 text-gray-700', icon: Clock };
      case 'under_discussion':
        return { label: 'In Discussie', color: 'bg-blue-100 text-blue-700', icon: MessageSquare };
      case 'approved':
        return { label: 'Goedgekeurd', color: 'bg-green-100 text-green-700', icon: CheckCircle };
      case 'in_schedule':
        return { label: 'In Schema', color: 'bg-purple-100 text-purple-700', icon: CheckCircle };
      case 'asked':
        return { label: 'Gesteld', color: 'bg-indigo-100 text-indigo-700', icon: CheckCircle };
      case 'skipped':
        return { label: 'Overgeslagen', color: 'bg-orange-100 text-orange-700', icon: AlertCircle };
      case 'rejected':
        return { label: 'Afgewezen', color: 'bg-red-100 text-red-700', icon: AlertCircle };
      default:
        return { label: status, color: 'bg-gray-100 text-gray-700', icon: Clock };
    }
  };

  const getSourceIcon = (sourceType: string) => {
    switch (sourceType) {
      case 'ai':
        return <Brain size={14} className="text-purple-600" title="AI Gegenereerd" />;
      case 'brand':
        return <Building2 size={14} className="text-blue-600" title="Van Brand" />;
      case 'agent':
        return <UsersIcon size={14} className="text-green-600" title="Van Agent" />;
      case 'admin':
        return <User size={14} className="text-gray-600" title="Van Admin" />;
      default:
        return <User size={14} className="text-gray-600" />;
    }
  };

  const filteredQuestions = filter === 'all' ? questions : questions.filter(q => q.status === filter);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
      </div>
    );
  }

  const getGuestName = (guestId: string | null) => {
    if (!guestId) return null;
    const guest = guests.find(g => g.id === guestId);
    return guest?.name || null;
  };

  const getHostName = (hostId: string | null) => {
    if (!hostId) return null;
    const host = hosts.find(h => h.id === hostId);
    return host?.name || null;
  };

  const getTopicTitle = (topicId: string | null) => {
    if (!topicId) return 'Geen onderwerp';
    const topic = topics.find(t => t.id === topicId);
    return topic?.title || 'Onbekend onderwerp';
  };

  // Group questions by topic for 'by_topic' view
  let questionsByTopic = topics.map(topic => ({
    topic,
    questions: questions.filter(q => q.topic_id === topic.id)
  }));

  // Add questions without topic
  const questionsWithoutTopic = questions.filter(q => !q.topic_id);
  if (questionsWithoutTopic.length > 0) {
    questionsByTopic.push({
      topic: {
        id: 'no-topic',
        title: 'Geen onderwerp toegewezen',
        description: null,
        order_index: 999,
        duration_minutes: null,
        interviewer_id: null,
        leading_id: null,
        sidekick_id: null,
        show_visuals: false
      },
      questions: questionsWithoutTopic
    });
  }

  // Apply topic filter if selected
  if (selectedTopic) {
    questionsByTopic = questionsByTopic.filter(({ topic }) => topic.id === selectedTopic);
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Topic Management */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <FolderOpen size={20} />
            Onderwerpen ({topics.length})
          </h3>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowAddHostForm(!showAddHostForm)}
              className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
            >
              <User size={16} />
              <span>Host</span>
            </button>
            <button
              onClick={() => setShowTopicForm(!showTopicForm)}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
            >
              <Plus size={16} />
              <span>Onderwerp</span>
            </button>
          </div>
        </div>

        {showAddHostForm && (
          <div className="mb-4 p-4 bg-green-50 rounded-lg border border-green-200">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-semibold text-gray-900">Host Beheer</h4>
              <button
                onClick={() => {
                  setShowAddHostForm(false);
                  setNewHostName('');
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex gap-3 mb-4">
              <input
                type="text"
                value={newHostName}
                onChange={(e) => setNewHostName(e.target.value)}
                placeholder="Naam van host..."
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    addHost();
                  }
                }}
              />
              <button
                onClick={addHost}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
              >
                <Plus size={16} />
                Toevoegen
              </button>
            </div>

            {hosts.length > 0 && (
              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">Beschikbare hosts ({hosts.length}):</p>
                <div className="flex flex-wrap gap-2">
                  {hosts.map(host => (
                    <div
                      key={host.id}
                      className="px-3 py-1 bg-white border border-green-300 text-green-800 rounded-lg text-sm flex items-center gap-2"
                    >
                      <User size={14} />
                      <span>{host.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {showTopicForm && (
          <div className="mb-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <h4 className="font-semibold text-gray-900 mb-3">
              {editingTopicId ? 'Onderwerp Bewerken' : 'Nieuw Onderwerp'}
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
              <div className="md:col-span-2">
                <input
                  type="text"
                  value={newTopicTitle}
                  onChange={(e) => setNewTopicTitle(e.target.value)}
                  placeholder="Titel van onderwerp..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div className="md:col-span-2">
                <textarea
                  value={newTopicDescription}
                  onChange={(e) => setNewTopicDescription(e.target.value)}
                  placeholder="Beschrijving (optioneel)..."
                  rows={2}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Interviewer
                </label>
                <select
                  value={newTopicInterviewer || ''}
                  onChange={(e) => setNewTopicInterviewer(e.target.value || null)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Geen interviewer</option>
                  {hosts.map(host => (
                    <option key={host.id} value={host.id}>{host.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Leading
                </label>
                <select
                  value={newTopicLeading || ''}
                  onChange={(e) => setNewTopicLeading(e.target.value || null)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Geen leading</option>
                  {hosts.map(host => (
                    <option key={host.id} value={host.id}>{host.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Sidekick
                </label>
                <select
                  value={newTopicSidekick || ''}
                  onChange={(e) => setNewTopicSidekick(e.target.value || null)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Geen sidekick</option>
                  {hosts.map(host => (
                    <option key={host.id} value={host.id}>{host.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Beeldmateriaal URL (optioneel)
                </label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={newTopicVisualsUrl}
                    onChange={(e) => setNewTopicVisualsUrl(e.target.value)}
                    placeholder="https://youtube.com/... of https://example.com/image.jpg"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <button
                    type="button"
                    onClick={() => setShowMediaSelector(true)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                    title="Selecteer foto"
                  >
                    <Upload size={20} />
                    <span>Foto's</span>
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-1">Link naar YouTube video of afbeelding. Of gebruik de foto selector voor stock foto's.</p>
              </div>
              <div className="flex items-center">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newTopicShowVisuals}
                    onChange={(e) => setNewTopicShowVisuals(e.target.checked)}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-gray-700">
                    Beeldmateriaal tonen tijdens opname
                  </span>
                </label>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={addTopic}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                {editingTopicId ? 'Opslaan' : 'Onderwerp Toevoegen'}
              </button>
              <button
                onClick={cancelTopicForm}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Annuleren
              </button>
            </div>
          </div>
        )}

        {topics.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {topics.map((topic) => (
              <div
                key={topic.id}
                className="px-3 py-2 bg-blue-100 text-blue-800 rounded-lg text-sm flex items-center gap-2"
              >
                <FolderOpen size={14} />
                <span className="font-medium">{topic.title}</span>
                <span className="text-blue-600">
                  ({questions.filter(q => q.topic_id === topic.id).length})
                </span>
                <button
                  onClick={() => editTopic(topic)}
                  className="p-1 hover:bg-blue-200 rounded transition-colors"
                  title="Bewerk onderwerp"
                >
                  <Edit2 size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setViewMode('by_topic')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                viewMode === 'by_topic' ? 'bg-orange-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Per Onderwerp
            </button>
            <button
              onClick={() => setViewMode('by_status')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                viewMode === 'by_status' ? 'bg-orange-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Per Status
            </button>
          </div>

          {viewMode === 'by_topic' && topics.length > 0 && (
            <div className="flex items-center space-x-2">
              <label className="text-sm font-medium text-gray-700">Filter onderwerp:</label>
              <select
                value={selectedTopic || ''}
                onChange={(e) => setSelectedTopic(e.target.value || null)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm"
              >
                <option value="">Alle onderwerpen</option>
                {topics.map(topic => (
                  <option key={topic.id} value={topic.id}>
                    {topic.title} ({questions.filter(q => q.topic_id === topic.id).length})
                  </option>
                ))}
                <option value="no-topic">
                  Zonder onderwerp ({questions.filter(q => !q.topic_id).length})
                </option>
              </select>
            </div>
          )}
        </div>

        {viewMode === 'by_status' && (
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setFilter('all')}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  filter === 'all' ? 'bg-orange-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Alle ({questions.length})
              </button>
            <button
              onClick={() => setFilter('concept')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                filter === 'concept' ? 'bg-orange-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Concept ({questions.filter(q => q.status === 'concept').length})
            </button>
            <button
              onClick={() => setFilter('under_discussion')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                filter === 'under_discussion' ? 'bg-orange-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Discussie ({questions.filter(q => q.status === 'under_discussion').length})
            </button>
            <button
              onClick={() => setFilter('approved')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                filter === 'approved' ? 'bg-orange-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Goedgekeurd ({questions.filter(q => q.status === 'approved').length})
            </button>
            <button
              onClick={() => setFilter('in_schedule')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                filter === 'in_schedule' ? 'bg-orange-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              In Schema ({questions.filter(q => q.status === 'in_schedule').length})
            </button>
            </div>

            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="flex items-center space-x-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
            >
              <Plus size={18} />
              <span>Nieuwe Vraag</span>
            </button>
          </div>
        )}

        {viewMode === 'by_topic' && (
          <div className="flex justify-end">
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="flex items-center space-x-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
            >
              <Plus size={18} />
              <span>Nieuwe Vraag</span>
            </button>
          </div>
        )}

        {showAddForm && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <textarea
              value={newQuestion}
              onChange={(e) => setNewQuestion(e.target.value)}
              placeholder="Typ hier je vraag..."
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent mb-3"
            />

            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Onderwerp</label>
                <select
                  value={selectedTopic || ''}
                  onChange={(e) => setSelectedTopic(e.target.value || null)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                >
                  <option value="">Geen onderwerp</option>
                  {topics.map(topic => (
                    <option key={topic.id} value={topic.id}>{topic.title}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Gast (optioneel)</label>
                <select
                  value={selectedGuest || ''}
                  onChange={(e) => setSelectedGuest(e.target.value || null)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                >
                  <option value="">Geen specifieke gast</option>
                  {guests.map(guest => (
                    <option key={guest.id} value={guest.id}>{guest.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={addQuestion}
                className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
              >
                Vraag Toevoegen
              </button>
              <button
                onClick={() => {
                  setShowAddForm(false);
                  setNewQuestion('');
                  setSelectedTopic(null);
                  setSelectedGuest(null);
                }}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Annuleren
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Questions List */}
      <div className="space-y-3">
        {viewMode === 'by_topic' ? (
          questionsByTopic.length === 0 ? (
            <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
              <MessageSquare className="mx-auto h-12 w-12 text-gray-300 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Geen onderwerpen</h3>
              <p className="text-gray-600 mb-4">Voeg eerst onderwerpen toe voor deze episode</p>
              <button
                onClick={() => setShowTopicForm(true)}
                className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus size={18} />
                <span>Onderwerp Toevoegen</span>
              </button>
            </div>
          ) : (
            questionsByTopic.map(({ topic, questions: topicQuestions }) => (
              <div key={topic.id} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                <div className="bg-blue-50 border-b border-blue-200 px-4 py-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FolderOpen size={18} className="text-blue-600" />
                      <h3 className="font-semibold text-gray-900">{topic.title}</h3>
                      <span className="text-sm text-gray-600">({topicQuestions.length} vragen)</span>
                    </div>
                    {topic.id !== 'no-topic' && (
                      <button
                        onClick={() => deleteTopic(topic.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Verwijder onderwerp"
                      >
                        <Trash2 size={18} />
                      </button>
                    )}
                  </div>
                  {topic.description && (
                    <p className="text-sm text-gray-600 mt-1">{topic.description}</p>
                  )}
                  {topic.id !== 'no-topic' && (topic.interviewer_id || topic.leading_id || topic.sidekick_id || topic.show_visuals) && (
                    <div className="mt-2 flex flex-wrap gap-2 text-xs">
                      {topic.interviewer_id && (
                        <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded flex items-center gap-1">
                          <User size={12} />
                          Interviewer: {getHostName(topic.interviewer_id)}
                        </span>
                      )}
                      {topic.leading_id && (
                        <span className="px-2 py-1 bg-green-100 text-green-800 rounded flex items-center gap-1">
                          <User size={12} />
                          Leading: {getHostName(topic.leading_id)}
                        </span>
                      )}
                      {topic.sidekick_id && (
                        <span className="px-2 py-1 bg-orange-100 text-orange-800 rounded flex items-center gap-1">
                          <UsersIcon size={12} />
                          Sidekick: {getHostName(topic.sidekick_id)}
                        </span>
                      )}
                      {topic.show_visuals && (
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded flex items-center gap-1">
                          📺 Beeldmateriaal
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {topicQuestions.length === 0 ? (
                  <div className="p-6 text-center text-gray-500">
                    Nog geen vragen voor dit onderwerp
                  </div>
                ) : (
                  <div className="divide-y divide-gray-100">
                    {topicQuestions.map((question, index) => {
                      const statusInfo = getStatusInfo(question.status);
                      const StatusIcon = statusInfo.icon;
                      const guestName = getGuestName(question.guest_id);

                      return (
                        <div key={question.id} className="p-4 hover:bg-gray-50 transition-colors">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center space-x-2 mb-2">
                                <span className="text-sm font-medium text-gray-500">#{index + 1}</span>
                                {getSourceIcon(question.source_type)}
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusInfo.color} flex items-center space-x-1`}>
                                  <StatusIcon size={12} />
                                  <span>{statusInfo.label}</span>
                                </span>
                                {guestName && (
                                  <span className="px-2 py-1 bg-green-50 text-green-700 text-xs rounded-full">
                                    Voor: {guestName}
                                  </span>
                                )}
                                {question.phase !== 'preparation' && (
                                  <span className="px-2 py-1 bg-purple-50 text-purple-700 text-xs rounded-full">
                                    {question.phase === 'pre_submitted' ? 'Vooraf ingestuurd' :
                                     question.phase === 'live' ? 'Live' : 'Follow-up'}
                                  </span>
                                )}
                              </div>

                              <p className="text-gray-900 text-lg mb-2">{question.question}</p>

                              {question.notes && (
                                <p className="text-sm text-gray-600 italic mb-2">Notitie: {question.notes}</p>
                              )}

                              <div className="flex items-center space-x-4 text-xs text-gray-500">
                                <span>Door: {question.submitter_name || 'Onbekend'}</span>
                                <span>{new Date(question.created_at).toLocaleDateString('nl-NL')}</span>
                              </div>
                            </div>

                            <div className="flex items-center space-x-2 ml-4">
                              <select
                                value={question.status}
                                onChange={(e) => updateQuestionStatus(question.id, e.target.value)}
                                className="px-3 py-1 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                              >
                                <option value="concept">Concept</option>
                                <option value="under_discussion">In Discussie</option>
                                <option value="approved">Goedgekeurd</option>
                                <option value="in_schedule">In Schema</option>
                                <option value="asked">Gesteld</option>
                                <option value="skipped">Overgeslagen</option>
                                <option value="rejected">Afgewezen</option>
                              </select>

                              <button
                                onClick={() => onOpenDiscussion(question.id)}
                                className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors relative"
                                title="Open discussie"
                              >
                                <MessageSquare size={18} />
                                {question.discussion_count > 0 && (
                                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-blue-600 text-white text-xs rounded-full flex items-center justify-center">
                                    {question.discussion_count}
                                  </span>
                                )}
                              </button>

                              <button
                                onClick={() => deleteQuestion(question.id)}
                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                title="Verwijder vraag"
                              >
                                <Trash2 size={18} />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ))
          )
        ) : (
          filteredQuestions.length === 0 ? (
            <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
              <MessageSquare className="mx-auto h-12 w-12 text-gray-300 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Geen vragen</h3>
              <p className="text-gray-600 mb-4">Voeg de eerste vraag toe voor deze episode</p>
              <button
                onClick={() => setShowAddForm(true)}
                className="inline-flex items-center space-x-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
              >
                <Plus size={18} />
                <span>Nieuwe Vraag</span>
              </button>
            </div>
          ) : (
            filteredQuestions.map((question, index) => {
            const statusInfo = getStatusInfo(question.status);
            const StatusIcon = statusInfo.icon;

              const guestName = getGuestName(question.guest_id);
              const topicTitle = getTopicTitle(question.topic_id);

              return (
                <div
                  key={question.id}
                  className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <span className="text-sm font-medium text-gray-500">#{index + 1}</span>
                        {getSourceIcon(question.source_type)}
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusInfo.color} flex items-center space-x-1`}>
                          <StatusIcon size={12} />
                          <span>{statusInfo.label}</span>
                        </span>
                        <span className="px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded-full">
                          {topicTitle}
                        </span>
                        {guestName && (
                          <span className="px-2 py-1 bg-green-50 text-green-700 text-xs rounded-full">
                            Voor: {guestName}
                          </span>
                        )}
                        {question.discussion_count > 0 && (
                          <span className="flex items-center space-x-1 text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded-full">
                            <MessageSquare size={12} />
                            <span>{question.discussion_count}</span>
                          </span>
                        )}
                      </div>

                      <p className="text-gray-900 text-lg mb-2">{question.question}</p>

                    {question.notes && (
                      <p className="text-sm text-gray-600 italic mb-2">Notitie: {question.notes}</p>
                    )}

                    <div className="flex items-center space-x-4 text-xs text-gray-500">
                      <span>Door: {question.submitter_name || 'Onbekend'}</span>
                      <span>{new Date(question.created_at).toLocaleDateString('nl-NL')}</span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 ml-4">
                    {/* Move buttons */}
                    {filter === 'all' && (
                      <div className="flex flex-col space-y-1">
                        <button
                          onClick={() => moveQuestion(question.id, 'up')}
                          disabled={index === 0}
                          className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded disabled:opacity-30"
                        >
                          <ArrowUp size={14} />
                        </button>
                        <button
                          onClick={() => moveQuestion(question.id, 'down')}
                          disabled={index === filteredQuestions.length - 1}
                          className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded disabled:opacity-30"
                        >
                          <ArrowDown size={14} />
                        </button>
                      </div>
                    )}

                    {/* Status dropdown */}
                    <select
                      value={question.status}
                      onChange={(e) => updateQuestionStatus(question.id, e.target.value)}
                      className="px-3 py-1 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    >
                      <option value="concept">Concept</option>
                      <option value="under_discussion">In Discussie</option>
                      <option value="approved">Goedgekeurd</option>
                      <option value="in_schedule">In Schema</option>
                      <option value="asked">Gesteld</option>
                      <option value="skipped">Overgeslagen</option>
                      <option value="rejected">Afgewezen</option>
                    </select>

                    {/* Discussion button */}
                    <button
                      onClick={() => onOpenDiscussion(question.id)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors relative"
                      title="Open discussie"
                    >
                      <MessageSquare size={18} />
                      {question.discussion_count > 0 && (
                        <span className="absolute -top-1 -right-1 w-4 h-4 bg-blue-600 text-white text-xs rounded-full flex items-center justify-center">
                          {question.discussion_count}
                        </span>
                      )}
                    </button>

                    {/* Delete button */}
                    <button
                      onClick={() => deleteQuestion(question.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Verwijder vraag"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              </div>
            );
          }))
        )}
      </div>

      <SlidingMediaSelector
        isOpen={showMediaSelector}
        onClose={() => setShowMediaSelector(false)}
        onSelect={(url) => {
          setNewTopicVisualsUrl(url);
          setShowMediaSelector(false);
        }}
        title="Selecteer Foto"
      />
    </div>
  );
}
