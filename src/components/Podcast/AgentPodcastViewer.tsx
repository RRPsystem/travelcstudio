import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Calendar, Users, MessageSquare, Plus, Send, CheckCircle, Clock, X } from 'lucide-react';

interface PodcastEpisode {
  id: string;
  title: string;
  description: string;
  topic: string;
  scheduled_date: string;
  status: string;
  hosts: string[];
}

interface Topic {
  id: string;
  title: string;
  description: string;
  duration_minutes: number;
  order_index: number;
}

interface Host {
  id: string;
  name: string;
  bio: string;
  profile_image_url: string;
}

interface Question {
  id: string;
  question: string;
  status: string;
  submitted_by: string;
  created_at: string;
}

interface Proposal {
  id: string;
  proposal_type: string;
  title: string;
  description: string;
  status: string;
  created_at: string;
  admin_notes: string;
}

export default function AgentPodcastViewer() {
  const { user } = useAuth();
  const [episodes, setEpisodes] = useState<PodcastEpisode[]>([]);
  const [selectedEpisode, setSelectedEpisode] = useState<PodcastEpisode | null>(null);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [hosts, setHosts] = useState<Host[]>([]);
  const [myQuestions, setMyQuestions] = useState<Question[]>([]);
  const [myProposals, setMyProposals] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'episodes' | 'my-questions' | 'propose'>('episodes');

  const [showQuestionForm, setShowQuestionForm] = useState(false);
  const [selectedTopicId, setSelectedTopicId] = useState<string | null>(null);
  const [newQuestion, setNewQuestion] = useState('');

  const [showProposalForm, setShowProposalForm] = useState(false);
  const [proposalType, setProposalType] = useState<'topic' | 'guest'>('topic');
  const [proposalTitle, setProposalTitle] = useState('');
  const [proposalDescription, setProposalDescription] = useState('');

  useEffect(() => {
    loadEpisodes();
    loadMyQuestions();
    loadMyProposals();
  }, []);

  useEffect(() => {
    if (selectedEpisode) {
      loadTopics(selectedEpisode.id);
      loadHosts(selectedEpisode.hosts);
    }
  }, [selectedEpisode]);

  const loadEpisodes = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('podcast_episodes_planning')
      .select('*')
      .in('status', ['scheduled', 'published'])
      .order('scheduled_date', { ascending: true });

    if (!error && data) {
      setEpisodes(data);
      if (data.length > 0 && !selectedEpisode) {
        setSelectedEpisode(data[0]);
      }
    }
    setLoading(false);
  };

  const loadTopics = async (episodeId: string) => {
    const { data } = await supabase
      .from('podcast_topics')
      .select('*')
      .eq('episode_planning_id', episodeId)
      .order('order_index');

    if (data) {
      setTopics(data);
    }
  };

  const loadHosts = async (hostIds: string[]) => {
    if (!hostIds || hostIds.length === 0) {
      setHosts([]);
      return;
    }

    const { data } = await supabase
      .from('podcast_hosts')
      .select('*')
      .in('id', hostIds);

    if (data) {
      setHosts(data);
    }
  };

  const loadMyQuestions = async () => {
    if (!user) return;

    const { data } = await supabase
      .from('podcast_questions')
      .select('*')
      .eq('submitted_by', user.id)
      .order('created_at', { ascending: false });

    if (data) {
      setMyQuestions(data);
    }
  };

  const loadMyProposals = async () => {
    if (!user) return;

    const { data } = await supabase
      .from('podcast_proposals')
      .select('*')
      .eq('proposed_by', user.id)
      .order('created_at', { ascending: false });

    if (data) {
      setMyProposals(data);
    }
  };

  const submitQuestion = async () => {
    if (!user || !selectedEpisode || !selectedTopicId || !newQuestion.trim()) {
      alert('Vul alle velden in');
      return;
    }

    const { data: userData } = await supabase
      .from('users')
      .select('email')
      .eq('id', user.id)
      .single();

    const { error } = await supabase
      .from('podcast_questions')
      .insert({
        episode_planning_id: selectedEpisode.id,
        topic_id: selectedTopicId,
        question: newQuestion.trim(),
        source_type: 'agent',
        submitted_by: user.id,
        submitter_name: userData?.email || 'Agent',
        status: 'pending'
      });

    if (error) {
      alert('Fout bij indienen vraag: ' + error.message);
    } else {
      alert('Vraag ingediend! Deze wordt beoordeeld door een admin.');
      setNewQuestion('');
      setShowQuestionForm(false);
      setSelectedTopicId(null);
      loadMyQuestions();
    }
  };

  const submitProposal = async () => {
    if (!user || !proposalTitle.trim()) {
      alert('Vul minimaal een titel in');
      return;
    }

    const { data: userData } = await supabase
      .from('users')
      .select('email')
      .eq('id', user.id)
      .single();

    const { error } = await supabase
      .from('podcast_proposals')
      .insert({
        proposal_type: proposalType,
        title: proposalTitle.trim(),
        description: proposalDescription.trim(),
        proposed_by: user.id,
        proposer_name: userData?.email || 'Agent',
        status: 'pending'
      });

    if (error) {
      alert('Fout bij indienen voorstel: ' + error.message);
    } else {
      alert('Voorstel ingediend! Deze wordt beoordeeld door een admin.');
      setProposalTitle('');
      setProposalDescription('');
      setShowProposalForm(false);
      loadMyProposals();
    }
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      pending: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
      in_review: 'bg-blue-100 text-blue-800'
    };

    const labels = {
      pending: 'In afwachting',
      approved: 'Goedgekeurd',
      rejected: 'Afgewezen',
      in_review: 'In behandeling'
    };

    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status as keyof typeof styles]}`}>
        {labels[status as keyof typeof labels] || status}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6 border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('episodes')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'episodes'
                  ? 'border-orange-600 text-orange-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Calendar className="inline-block w-4 h-4 mr-2" />
              Komende Episodes
            </button>
            <button
              onClick={() => setActiveTab('my-questions')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'my-questions'
                  ? 'border-orange-600 text-orange-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <MessageSquare className="inline-block w-4 h-4 mr-2" />
              Mijn Vragen ({myQuestions.length})
            </button>
            <button
              onClick={() => setActiveTab('propose')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'propose'
                  ? 'border-orange-600 text-orange-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Plus className="inline-block w-4 h-4 mr-2" />
              Onderwerp Voorstellen ({myProposals.length})
            </button>
          </nav>
        </div>

        {activeTab === 'episodes' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1">
              <h3 className="text-lg font-semibold mb-4">Episodes</h3>
              <div className="space-y-2">
                {episodes.map((episode) => (
                  <button
                    key={episode.id}
                    onClick={() => setSelectedEpisode(episode)}
                    className={`w-full text-left p-4 rounded-lg border transition-colors ${
                      selectedEpisode?.id === episode.id
                        ? 'border-orange-600 bg-orange-50'
                        : 'border-gray-200 hover:border-orange-300'
                    }`}
                  >
                    <div className="font-medium text-gray-900">{episode.title}</div>
                    <div className="text-sm text-gray-500 mt-1">
                      {new Date(episode.scheduled_date).toLocaleDateString('nl-NL', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="lg:col-span-2">
              {selectedEpisode ? (
                <div>
                  <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">{selectedEpisode.title}</h2>
                    <p className="text-gray-600 mb-4">{selectedEpisode.description}</p>
                    <div className="flex items-center text-sm text-gray-500">
                      <Calendar className="w-4 h-4 mr-2" />
                      {new Date(selectedEpisode.scheduled_date).toLocaleDateString('nl-NL', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </div>
                  </div>

                  {hosts.length > 0 && (
                    <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
                      <h3 className="font-semibold text-gray-900 mb-4 flex items-center">
                        <Users className="w-5 h-5 mr-2" />
                        Hosts
                      </h3>
                      <div className="space-y-3">
                        {hosts.map((host) => (
                          <div key={host.id} className="flex items-center space-x-3">
                            {host.profile_image_url ? (
                              <img
                                src={host.profile_image_url}
                                alt={host.name}
                                className="w-10 h-10 rounded-full object-cover"
                              />
                            ) : (
                              <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center">
                                <span className="text-orange-600 font-medium">{host.name[0]}</span>
                              </div>
                            )}
                            <div>
                              <div className="font-medium text-gray-900">{host.name}</div>
                              {host.bio && <div className="text-sm text-gray-500">{host.bio}</div>}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="bg-white rounded-lg border border-gray-200 p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-semibold text-gray-900">Onderwerpen</h3>
                      <button
                        onClick={() => {
                          setShowQuestionForm(true);
                          setSelectedTopicId(null);
                        }}
                        className="bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 transition-colors flex items-center text-sm"
                      >
                        <MessageSquare className="w-4 h-4 mr-2" />
                        Vraag Indienen
                      </button>
                    </div>

                    {topics.length > 0 ? (
                      <div className="space-y-4">
                        {topics.map((topic) => (
                          <div key={topic.id} className="border border-gray-200 rounded-lg p-4">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <h4 className="font-medium text-gray-900">{topic.title}</h4>
                                {topic.description && (
                                  <p className="text-sm text-gray-600 mt-1">{topic.description}</p>
                                )}
                                <div className="text-xs text-gray-500 mt-2">
                                  <Clock className="inline w-3 h-3 mr-1" />
                                  {topic.duration_minutes} minuten
                                </div>
                              </div>
                              <button
                                onClick={() => {
                                  setSelectedTopicId(topic.id);
                                  setShowQuestionForm(true);
                                }}
                                className="ml-4 text-orange-600 hover:text-orange-700 text-sm font-medium"
                              >
                                Vraag stellen
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-500 text-center py-8">Nog geen onderwerpen gepland</p>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-center text-gray-500 py-12">
                  Selecteer een episode om details te bekijken
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'my-questions' && (
          <div className="bg-white rounded-lg border border-gray-200">
            <div className="p-6">
              <h3 className="text-lg font-semibold mb-4">Mijn Ingediende Vragen</h3>
              {myQuestions.length > 0 ? (
                <div className="space-y-4">
                  {myQuestions.map((question) => (
                    <div key={question.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div className="font-medium text-gray-900">{question.question}</div>
                        {getStatusBadge(question.status)}
                      </div>
                      <div className="text-xs text-gray-500">
                        Ingediend op {new Date(question.created_at).toLocaleDateString('nl-NL')}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-8">Je hebt nog geen vragen ingediend</p>
              )}
            </div>
          </div>
        )}

        {activeTab === 'propose' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-lg font-semibold mb-4">Nieuw Voorstel Indienen</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Type</label>
                  <div className="flex space-x-4">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        checked={proposalType === 'topic'}
                        onChange={() => setProposalType('topic')}
                        className="mr-2"
                      />
                      Onderwerp
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        checked={proposalType === 'guest'}
                        onChange={() => setProposalType('guest')}
                        className="mr-2"
                      />
                      Gast
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Titel *
                  </label>
                  <input
                    type="text"
                    value={proposalTitle}
                    onChange={(e) => setProposalTitle(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    placeholder={proposalType === 'topic' ? 'Onderwerp titel' : 'Naam van de gast'}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Omschrijving
                  </label>
                  <textarea
                    value={proposalDescription}
                    onChange={(e) => setProposalDescription(e.target.value)}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    placeholder={proposalType === 'topic' ? 'Waarom is dit een interessant onderwerp?' : 'Waarom zou deze gast interessant zijn?'}
                  />
                </div>

                <button
                  onClick={submitProposal}
                  className="w-full bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 transition-colors flex items-center justify-center"
                >
                  <Send className="w-4 h-4 mr-2" />
                  Voorstel Indienen
                </button>
              </div>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-lg font-semibold mb-4">Mijn Voorstellen</h3>
              {myProposals.length > 0 ? (
                <div className="space-y-4">
                  {myProposals.map((proposal) => (
                    <div key={proposal.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <div className="font-medium text-gray-900">{proposal.title}</div>
                          <div className="text-xs text-gray-500 mt-1">
                            {proposal.proposal_type === 'topic' ? 'Onderwerp' : 'Gast'}
                          </div>
                        </div>
                        {getStatusBadge(proposal.status)}
                      </div>
                      {proposal.description && (
                        <p className="text-sm text-gray-600 mb-2">{proposal.description}</p>
                      )}
                      {proposal.admin_notes && proposal.status !== 'pending' && (
                        <div className="mt-2 p-2 bg-gray-50 rounded text-sm">
                          <div className="font-medium text-gray-700">Admin notitie:</div>
                          <div className="text-gray-600">{proposal.admin_notes}</div>
                        </div>
                      )}
                      <div className="text-xs text-gray-500 mt-2">
                        Ingediend op {new Date(proposal.created_at).toLocaleDateString('nl-NL')}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-8">Je hebt nog geen voorstellen ingediend</p>
              )}
            </div>
          </div>
        )}

        {showQuestionForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-lg w-full mx-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Vraag Indienen</h3>
                <button onClick={() => {
                  setShowQuestionForm(false);
                  setSelectedTopicId(null);
                  setNewQuestion('');
                }} className="text-gray-400 hover:text-gray-600">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                {!selectedTopicId && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Selecteer onderwerp
                    </label>
                    <select
                      value={selectedTopicId || ''}
                      onChange={(e) => setSelectedTopicId(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    >
                      <option value="">Kies een onderwerp...</option>
                      {topics.map((topic) => (
                        <option key={topic.id} value={topic.id}>
                          {topic.title}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Je vraag
                  </label>
                  <textarea
                    value={newQuestion}
                    onChange={(e) => setNewQuestion(e.target.value)}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    placeholder="Stel je vraag over dit onderwerp..."
                  />
                </div>

                <div className="flex justify-end space-x-3">
                  <button
                    onClick={() => {
                      setShowQuestionForm(false);
                      setSelectedTopicId(null);
                      setNewQuestion('');
                    }}
                    className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                  >
                    Annuleren
                  </button>
                  <button
                    onClick={submitQuestion}
                    disabled={!selectedTopicId || !newQuestion.trim()}
                    className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Indienen
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
