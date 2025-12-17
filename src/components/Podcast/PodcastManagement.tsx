import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Plus, Calendar, Users, MessageSquare, FileText, Sparkles, Send, Check, X, Eye, EyeOff, Clock, Play, Edit as EditIcon } from 'lucide-react';
import EpisodeEditor from './EpisodeEditor';

interface PodcastEpisode {
  id: string;
  title: string;
  description: string;
  topic: string;
  scheduled_date: string;
  status: string;
  riverside_recording_id: string;
  hosts: string[];
  allow_questions: boolean;
  announcement_text: string;
  created_at: string;
}

interface Question {
  id: string;
  question: string;
  source_type: string;
  submitted_by: string;
  submitter_name: string;
  status: string;
  order_index: number;
  notes: string;
  created_at: string;
}

interface HostNote {
  id: string;
  host_id: string;
  note: string;
  is_private: boolean;
  created_at: string;
  host_name?: string;
}

export default function PodcastManagement() {
  const { user } = useAuth();
  const [episodes, setEpisodes] = useState<PodcastEpisode[]>([]);
  const [selectedEpisode, setSelectedEpisode] = useState<PodcastEpisode | null>(null);
  const [editingEpisodeId, setEditingEpisodeId] = useState<string | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [hostNotes, setHostNotes] = useState<HostNote[]>([]);
  const [hosts, setHosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'episodes' | 'planning' | 'questions' | 'notes'>('episodes');
  const [showNewEpisodeForm, setShowNewEpisodeForm] = useState(false);

  useEffect(() => {
    loadEpisodes();
    loadHosts();
  }, []);

  useEffect(() => {
    if (selectedEpisode) {
      loadQuestions(selectedEpisode.id);
      loadHostNotes(selectedEpisode.id);
    }
  }, [selectedEpisode]);

  const loadEpisodes = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('podcast_episodes_planning')
      .select('*')
      .order('scheduled_date', { ascending: false });

    if (!error && data) {
      setEpisodes(data);
      if (data.length > 0 && !selectedEpisode) {
        setSelectedEpisode(data[0]);
      }
    }
    setLoading(false);
  };

  const loadHosts = async () => {
    const { data } = await supabase
      .from('podcast_hosts')
      .select('*')
      .eq('is_active', true);

    if (data) {
      setHosts(data);
    }
  };

  const loadQuestions = async (episodeId: string) => {
    const { data } = await supabase
      .from('podcast_questions')
      .select('*')
      .eq('episode_planning_id', episodeId)
      .order('order_index');

    if (data) {
      setQuestions(data);
    }
  };

  const loadHostNotes = async (episodeId: string) => {
    const { data } = await supabase
      .from('podcast_host_notes')
      .select(`
        *,
        podcast_hosts!inner(name)
      `)
      .eq('episode_planning_id', episodeId)
      .order('created_at', { ascending: false });

    if (data) {
      setHostNotes(data.map(note => ({
        ...note,
        host_name: note.podcast_hosts?.name
      })));
    }
  };

  const generateAIQuestions = async (episodeId: string, topic: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        alert('Je moet ingelogd zijn om AI vragen te genereren');
        return;
      }

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const response = await fetch(`${supabaseUrl}/functions/v1/generate-podcast-questions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          episode_id: episodeId,
          topic: topic
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Fout bij genereren van vragen');
      }

      loadQuestions(episodeId);
      alert(result.message || 'AI vragen succesvol gegenereerd!');
    } catch (error: any) {
      console.error('Error generating questions:', error);
      alert('Fout bij genereren van vragen: ' + error.message);
    }
  };

  const updateQuestionStatus = async (questionId: string, status: string) => {
    await supabase
      .from('podcast_questions')
      .update({ status })
      .eq('id', questionId);

    loadQuestions(selectedEpisode!.id);
  };

  const addHostNote = async (note: string, isPrivate: boolean) => {
    if (!selectedEpisode || !user) return;

    const { data: hostData } = await supabase
      .from('podcast_hosts')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (hostData) {
      await supabase.from('podcast_host_notes').insert({
        episode_planning_id: selectedEpisode.id,
        host_id: hostData.id,
        note,
        is_private: isPrivate
      });

      loadHostNotes(selectedEpisode.id);
    }
  };

  const statusColors: Record<string, string> = {
    planning: 'bg-gray-100 text-gray-700',
    scheduled: 'bg-blue-100 text-blue-700',
    recording: 'bg-red-100 text-red-700',
    editing: 'bg-yellow-100 text-yellow-700',
    published: 'bg-green-100 text-green-700',
    cancelled: 'bg-gray-300 text-gray-600'
  };

  if (editingEpisodeId) {
    return (
      <EpisodeEditor
        episodeId={editingEpisodeId}
        onClose={() => {
          setEditingEpisodeId(null);
          loadEpisodes();
        }}
        onSave={() => {
          loadEpisodes();
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-end mb-6">
          <button
            onClick={() => setShowNewEpisodeForm(true)}
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-5 h-5" />
            Nieuwe Episode
          </button>
        </div>

        {showNewEpisodeForm && (
          <NewEpisodeForm
            hosts={hosts}
            onClose={() => setShowNewEpisodeForm(false)}
            onSuccess={() => {
              setShowNewEpisodeForm(false);
              loadEpisodes();
            }}
          />
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-md overflow-hidden">
              <div className="p-4 bg-gray-50 border-b">
                <h2 className="font-semibold text-gray-900">Episodes</h2>
              </div>

              <div className="divide-y max-h-[600px] overflow-y-auto">
                {episodes.map((episode) => (
                  <div
                    key={episode.id}
                    className={`p-4 hover:bg-gray-50 transition-colors ${
                      selectedEpisode?.id === episode.id ? 'bg-blue-50 border-l-4 border-blue-600' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <button
                        onClick={() => setSelectedEpisode(episode)}
                        className="flex-1 text-left"
                      >
                        <h3 className="font-medium text-gray-900 line-clamp-2">{episode.title}</h3>
                        {episode.scheduled_date && (
                          <div className="flex items-center gap-2 text-sm text-gray-500 mt-1">
                            <Calendar className="w-4 h-4" />
                            {new Date(episode.scheduled_date).toLocaleDateString('nl-NL')}
                          </div>
                        )}
                      </button>
                      <div className="flex items-center space-x-2">
                        <span className={`px-2 py-1 text-xs rounded-full ${statusColors[episode.status]}`}>
                          {episode.status}
                        </span>
                        <button
                          onClick={() => setEditingEpisodeId(episode.id)}
                          className="p-2 text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
                          title="Open Volledige Editor"
                        >
                          <EditIcon className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="lg:col-span-2">
            {selectedEpisode ? (
              <div className="bg-white rounded-xl shadow-md overflow-hidden">
                <div className="p-6 bg-gradient-to-r from-blue-500 to-purple-600 text-white">
                  <h2 className="text-2xl font-bold mb-2">{selectedEpisode.title}</h2>
                  <p className="text-blue-100">{selectedEpisode.description}</p>
                  {selectedEpisode.riverside_recording_id && (
                    <div className="mt-4 px-3 py-2 bg-white/20 rounded-lg inline-block">
                      <span className="text-sm">Riverside ID: {selectedEpisode.riverside_recording_id}</span>
                    </div>
                  )}
                </div>

                <div className="border-b">
                  <div className="flex">
                    {[
                      { id: 'questions', label: 'Vragen', icon: MessageSquare },
                      { id: 'notes', label: 'Host Notes', icon: FileText },
                      { id: 'planning', label: 'Planning', icon: Calendar }
                    ].map((tab) => {
                      const Icon = tab.icon;
                      return (
                        <button
                          key={tab.id}
                          onClick={() => setActiveTab(tab.id as any)}
                          className={`flex items-center gap-2 px-6 py-4 font-medium transition-colors ${
                            activeTab === tab.id
                              ? 'text-blue-600 border-b-2 border-blue-600'
                              : 'text-gray-600 hover:text-gray-900'
                          }`}
                        >
                          <Icon className="w-5 h-5" />
                          {tab.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="p-6">
                  {activeTab === 'questions' && (
                    <QuestionsTab
                      questions={questions}
                      episodeId={selectedEpisode.id}
                      topic={selectedEpisode.topic}
                      onUpdateStatus={updateQuestionStatus}
                      onGenerateAI={(topics: string) => generateAIQuestions(selectedEpisode.id, topics)}
                      onRefresh={() => loadQuestions(selectedEpisode.id)}
                    />
                  )}

                  {activeTab === 'notes' && (
                    <HostNotesTab
                      notes={hostNotes}
                      onAddNote={addHostNote}
                    />
                  )}

                  {activeTab === 'planning' && (
                    <PlanningTab episode={selectedEpisode} hosts={hosts} onUpdate={loadEpisodes} />
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-xl shadow-md p-12 text-center">
                <Play className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Selecteer een episode</h3>
                <p className="text-gray-600">Kies een episode uit de lijst om te bewerken</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function NewEpisodeForm({ hosts, onClose, onSuccess }: any) {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    topic: '',
    scheduled_date: '',
    riverside_recording_id: '',
    hosts: [] as string[],
    allow_questions: true,
    announcement_text: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const { error } = await supabase
      .from('podcast_episodes_planning')
      .insert({
        ...formData,
        status: 'planning',
        created_by: user?.id
      });

    if (error) {
      alert('Fout bij aanmaken: ' + error.message);
    } else {
      onSuccess();
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
      <h2 className="text-2xl font-bold mb-4">Nieuwe Episode Plannen</h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">Titel *</label>
          <input
            type="text"
            required
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            placeholder="Bijv: Reizen naar Japan in 2025"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Beschrijving</label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            rows={3}
            placeholder="Korte beschrijving van de episode"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">Hoofdonderwerp *</label>
            <input
              type="text"
              required
              value={formData.topic}
              onChange={(e) => setFormData({ ...formData, topic: e.target.value })}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="Bijv: Japan, Culinair, Backpacking"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Geplande Datum</label>
            <input
              type="datetime-local"
              value={formData.scheduled_date}
              onChange={(e) => setFormData({ ...formData, scheduled_date: e.target.value })}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Riverside Recording ID (optioneel)</label>
          <input
            type="text"
            value={formData.riverside_recording_id}
            onChange={(e) => setFormData({ ...formData, riverside_recording_id: e.target.value })}
            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            placeholder="Vul in als je al een recording hebt"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Aankondigingstekst (publiek zichtbaar)</label>
          <textarea
            value={formData.announcement_text}
            onChange={(e) => setFormData({ ...formData, announcement_text: e.target.value })}
            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            rows={3}
            placeholder="Deze tekst wordt getoond aan luisteraars die vragen kunnen insturen"
          />
        </div>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="allow_questions"
            checked={formData.allow_questions}
            onChange={(e) => setFormData({ ...formData, allow_questions: e.target.checked })}
            className="w-4 h-4"
          />
          <label htmlFor="allow_questions" className="text-sm">Sta vragen van luisteraars toe</label>
        </div>

        <div className="flex gap-4 pt-4">
          <button
            type="submit"
            className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Episode Aanmaken
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
          >
            Annuleren
          </button>
        </div>
      </form>
    </div>
  );
}

function QuestionsTab({ questions, episodeId, topic, onUpdateStatus, onGenerateAI, onRefresh }: any) {
  const { user } = useAuth();
  const [newQuestion, setNewQuestion] = useState('');
  const [additionalTopics, setAdditionalTopics] = useState('');
  const [showTopicInput, setShowTopicInput] = useState(false);

  const handleAddQuestion = async () => {
    if (!newQuestion.trim()) return;

    await supabase.from('podcast_questions').insert({
      episode_planning_id: episodeId,
      question: newQuestion,
      source_type: 'host',
      submitted_by: user?.id,
      status: 'approved',
      order_index: questions.length
    });

    setNewQuestion('');
    onRefresh();
  };

  const handleGenerateAI = () => {
    const allTopics = additionalTopics.trim()
      ? `${topic}, ${additionalTopics}`
      : topic;
    onGenerateAI(allTopics);
    setShowTopicInput(false);
    setAdditionalTopics('');
  };

  const questionsByStatus = {
    suggested: questions.filter((q: Question) => q.status === 'suggested'),
    approved: questions.filter((q: Question) => q.status === 'approved'),
    asked: questions.filter((q: Question) => q.status === 'asked')
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-semibold mb-3">Snel vraag toevoegen</h3>
        <div className="flex gap-2">
          <input
            type="text"
            value={newQuestion}
            onChange={(e) => setNewQuestion(e.target.value)}
            className="flex-1 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            placeholder="Type je vraag hier..."
            onKeyPress={(e) => e.key === 'Enter' && handleAddQuestion()}
          />
          <button
            onClick={handleAddQuestion}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex gap-4">
          <button
            onClick={() => setShowTopicInput(!showTopicInput)}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            <Sparkles className="w-5 h-5" />
            Genereer vragen met AI
          </button>
        </div>

        {showTopicInput && (
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
            <h4 className="font-semibold text-gray-900 mb-2">AI Vraag Generatie</h4>
            <p className="text-sm text-gray-600 mb-3">
              Hoofdonderwerp: <span className="font-medium">{topic}</span>
            </p>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Extra onderwerpen (optioneel)
                </label>
                <input
                  type="text"
                  value={additionalTopics}
                  onChange={(e) => setAdditionalTopics(e.target.value)}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                  placeholder="Bijv: cultuur, eten, budget reizen"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Voeg meerdere onderwerpen toe gescheiden door komma's
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleGenerateAI}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                >
                  10 Vragen Genereren
                </button>
                <button
                  onClick={() => {
                    setShowTopicInput(false);
                    setAdditionalTopics('');
                  }}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Annuleren
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {['suggested', 'approved', 'asked'].map((status) => {
        const statusQuestions = questionsByStatus[status as keyof typeof questionsByStatus];
        if (statusQuestions.length === 0) return null;

        return (
          <div key={status}>
            <h3 className="font-semibold mb-3 capitalize">
              {status === 'suggested' && 'Voorgestelde vragen'}
              {status === 'approved' && 'Goedgekeurde vragen'}
              {status === 'asked' && 'Gestelde vragen'}
            </h3>
            <div className="space-y-2">
              {statusQuestions.map((question: Question) => (
                <div key={question.id} className="p-4 border rounded-lg bg-white">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="text-gray-900">{question.question}</p>
                      <div className="flex items-center gap-3 mt-2 text-sm text-gray-500">
                        <span className="px-2 py-1 bg-gray-100 rounded text-xs">
                          {question.source_type}
                        </span>
                        {question.submitter_name && (
                          <span>van {question.submitter_name}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2 ml-4">
                      {status === 'suggested' && (
                        <>
                          <button
                            onClick={() => onUpdateStatus(question.id, 'approved')}
                            className="p-2 text-green-600 hover:bg-green-50 rounded-lg"
                            title="Goedkeuren"
                          >
                            <Check className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => onUpdateStatus(question.id, 'skipped')}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                            title="Afwijzen"
                          >
                            <X className="w-5 h-5" />
                          </button>
                        </>
                      )}
                      {status === 'approved' && (
                        <button
                          onClick={() => onUpdateStatus(question.id, 'asked')}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                          title="Markeren als gesteld"
                        >
                          <Check className="w-5 h-5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function HostNotesTab({ notes, onAddNote }: any) {
  const [newNote, setNewNote] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);

  const handleAddNote = () => {
    if (!newNote.trim()) return;

    onAddNote(newNote, isPrivate);
    setNewNote('');
    setIsPrivate(false);
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-semibold mb-3">Nieuwe notitie toevoegen</h3>
        <textarea
          value={newNote}
          onChange={(e) => setNewNote(e.target.value)}
          className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
          rows={3}
          placeholder="Type je notitie of idee hier..."
        />
        <div className="flex items-center justify-between mt-2">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="private"
              checked={isPrivate}
              onChange={(e) => setIsPrivate(e.target.checked)}
              className="w-4 h-4"
            />
            <label htmlFor="private" className="text-sm flex items-center gap-1">
              {isPrivate ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              Privé notitie (alleen zichtbaar voor hosts)
            </label>
          </div>
          <button
            onClick={handleAddNote}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Notitie Toevoegen
          </button>
        </div>
      </div>

      <div className="space-y-3">
        {notes.map((note: HostNote) => (
          <div
            key={note.id}
            className={`p-4 rounded-lg ${
              note.is_private ? 'bg-yellow-50 border border-yellow-200' : 'bg-gray-50'
            }`}
          >
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="font-medium text-gray-900">{note.host_name}</span>
                {note.is_private && (
                  <span className="flex items-center gap-1 px-2 py-1 bg-yellow-200 text-yellow-800 text-xs rounded">
                    <EyeOff className="w-3 h-3" />
                    Privé
                  </span>
                )}
              </div>
              <span className="text-sm text-gray-500">
                {new Date(note.created_at).toLocaleString('nl-NL')}
              </span>
            </div>
            <p className="text-gray-700">{note.note}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function PlanningTab({ episode, hosts, onUpdate }: any) {
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({ ...episode });

  const handleSave = async () => {
    await supabase
      .from('podcast_episodes_planning')
      .update(formData)
      .eq('id', episode.id);

    setEditing(false);
    onUpdate();
  };

  return (
    <div className="space-y-4">
      {editing ? (
        <>
          <div>
            <label className="block text-sm font-medium mb-2">Titel</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-4 py-2 border rounded-lg"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Status</label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              className="w-full px-4 py-2 border rounded-lg"
            >
              <option value="planning">Planning</option>
              <option value="scheduled">Scheduled</option>
              <option value="recording">Recording</option>
              <option value="editing">Editing</option>
              <option value="published">Published</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          <div className="flex gap-4">
            <button
              onClick={handleSave}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Opslaan
            </button>
            <button
              onClick={() => setEditing(false)}
              className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
            >
              Annuleren
            </button>
          </div>
        </>
      ) : (
        <>
          <div className="space-y-3">
            <div>
              <span className="text-sm text-gray-500">Status:</span>
              <p className="font-medium">{episode.status}</p>
            </div>
            <div>
              <span className="text-sm text-gray-500">Onderwerp:</span>
              <p className="font-medium">{episode.topic}</p>
            </div>
            {episode.scheduled_date && (
              <div>
                <span className="text-sm text-gray-500">Gepland op:</span>
                <p className="font-medium">
                  {new Date(episode.scheduled_date).toLocaleString('nl-NL')}
                </p>
              </div>
            )}
            {episode.riverside_recording_id && (
              <div>
                <span className="text-sm text-gray-500">Riverside Recording ID:</span>
                <p className="font-mono text-sm">{episode.riverside_recording_id}</p>
              </div>
            )}
          </div>

          <button
            onClick={() => setEditing(true)}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Bewerken
          </button>
        </>
      )}
    </div>
  );
}