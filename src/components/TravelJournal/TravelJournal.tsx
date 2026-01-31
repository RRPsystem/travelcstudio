import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Play, Calendar, Eye, MessageSquare, Send, Users, CheckCircle, Clock } from 'lucide-react';

interface Episode {
  id: string;
  title: string;
  description: string;
  media_url: string;
  thumbnail_url: string;
  media_type: 'video' | 'audio';
  duration: number;
  published_at: string;
  is_published: boolean;
  view_count: number;
}

interface UpcomingEpisode {
  id: string;
  title: string;
  description: string;
  topic: string;
  scheduled_date: string;
  status: string;
  announcement_text: string;
  allow_questions: boolean;
  hosts: string[];
  host_names?: string[];
}

interface Question {
  id: string;
  question: string;
  submitter_name: string;
  status: string;
  created_at: string;
  source_type: string;
}

export default function TravelJournal() {
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [upcomingEpisodes, setUpcomingEpisodes] = useState<UpcomingEpisode[]>([]);
  const [selectedEpisode, setSelectedEpisode] = useState<Episode | null>(null);
  const [selectedUpcoming, setSelectedUpcoming] = useState<UpcomingEpisode | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [newQuestion, setNewQuestion] = useState('');
  const [submitterName, setSubmitterName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'episodes' | 'upcoming'>('upcoming');

  useEffect(() => {
    fetchCurrentUser();
    fetchEpisodes();
    fetchUpcomingEpisodes();
  }, []);

  useEffect(() => {
    if (selectedUpcoming) {
      fetchQuestionsForEpisode(selectedUpcoming.id);
    }
  }, [selectedUpcoming]);

  const fetchCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
      setCurrentUser(user);

      const { data: userData } = await supabase
        .from('users')
        .select('role, brand_id')
        .eq('id', user.id)
        .single();

      if (userData) {
        setUserRole(userData.role);

        if (userData.role === 'brand' && userData.brand_id) {
          const { data: brandData } = await supabase
            .from('brands')
            .select('name')
            .eq('id', userData.brand_id)
            .single();

          if (brandData) {
            setSubmitterName(brandData.name);
          }
        } else if (userData.role === 'agent') {
          const { data: agentData } = await supabase
            .from('agents')
            .select('name')
            .eq('id', user.id)
            .single();

          if (agentData) {
            setSubmitterName(agentData.name);
          }
        }
      }
    }
  };

  const fetchEpisodes = async () => {
    setLoading(true);

    const { data, error } = await supabase
      .from('travel_journal_episodes')
      .select('*')
      .eq('is_published', true)
      .order('published_at', { ascending: false });

    if (!error && data) {
      setEpisodes(data);
    }

    setLoading(false);
  };

  const fetchUpcomingEpisodes = async () => {
    const { data, error } = await supabase
      .from('podcast_episodes_planning')
      .select('*')
      .in('status', ['scheduled', 'published'])
      .eq('allow_questions', true)
      .order('scheduled_date', { ascending: true });

    if (!error && data) {
      const episodesWithHosts = await Promise.all(
        data.map(async (episode) => {
          if (episode.hosts && episode.hosts.length > 0) {
            const { data: hostData } = await supabase
              .from('podcast_hosts')
              .select('name')
              .in('id', episode.hosts);

            return {
              ...episode,
              host_names: hostData?.map(h => h.name) || []
            };
          }
          return { ...episode, host_names: [] };
        })
      );

      setUpcomingEpisodes(episodesWithHosts);
    }
  };

  const fetchQuestionsForEpisode = async (episodeId: string) => {
    const { data, error } = await supabase
      .from('podcast_questions')
      .select('*')
      .eq('episode_planning_id', episodeId)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setQuestions(data);
    }
  };

  const handlePlayEpisode = async (episode: Episode) => {
    setSelectedEpisode(episode);
    setSelectedUpcoming(null);

    await supabase
      .from('travel_journal_episodes')
      .update({ view_count: episode.view_count + 1 })
      .eq('id', episode.id);
  };

  const handleSelectUpcoming = (episode: UpcomingEpisode) => {
    setSelectedUpcoming(episode);
    setSelectedEpisode(null);
    fetchQuestionsForEpisode(episode.id);
  };

  const handleSubmitQuestion = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newQuestion.trim() || !selectedUpcoming) return;

    setSubmitting(true);

    const sourceType = currentUser && userRole ? userRole : 'public';
    const displayName = submitterName || 'Anoniem';

    const { error } = await supabase
      .from('podcast_questions')
      .insert({
        episode_planning_id: selectedUpcoming.id,
        question: newQuestion.trim(),
        source_type: sourceType,
        submitted_by: currentUser?.id || null,
        submitter_name: displayName,
        status: 'suggested'
      });

    if (!error) {
      setNewQuestion('');
      fetchQuestionsForEpisode(selectedUpcoming.id);
      alert('Je vraag is verstuurd! De admin zal deze beoordelen.');
    } else {
      alert('Er ging iets mis bij het versturen van je vraag.');
    }

    setSubmitting(false);
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'text-green-600 bg-green-50';
      case 'suggested': return 'text-yellow-600 bg-yellow-50';
      case 'asked': return 'text-blue-600 bg-blue-50';
      case 'skipped': return 'text-gray-600 bg-gray-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'approved': return 'Goedgekeurd';
      case 'suggested': return 'In afwachting';
      case 'asked': return 'Gesteld';
      case 'skipped': return 'Overgeslagen';
      default: return status;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Laden...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="max-w-7xl mx-auto px-4 py-8">

        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">TravelC Talk</h1>
          <p className="text-gray-600">Jouw interactieve reispodcast - Stel je vragen en doe mee!</p>
        </div>

        <div className="mb-8 flex justify-center gap-4">
          <button
            onClick={() => setActiveTab('upcoming')}
            className={`px-6 py-3 rounded-lg font-medium transition-colors ${
              activeTab === 'upcoming'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              <span>Aankomende Episodes</span>
            </div>
          </button>
          <button
            onClick={() => setActiveTab('episodes')}
            className={`px-6 py-3 rounded-lg font-medium transition-colors ${
              activeTab === 'episodes'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            <div className="flex items-center gap-2">
              <Play className="w-5 h-5" />
              <span>Bekijk Episodes</span>
            </div>
          </button>
        </div>

        {activeTab === 'upcoming' && (
          <div className="space-y-6">
            {selectedUpcoming && (
              <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
                <div className="mb-6">
                  <h2 className="text-3xl font-bold text-gray-900 mb-2">{selectedUpcoming.title}</h2>
                  <div className="flex items-center gap-4 text-sm text-gray-600 mb-4">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      {new Date(selectedUpcoming.scheduled_date).toLocaleDateString('nl-NL', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                    {selectedUpcoming.host_names && selectedUpcoming.host_names.length > 0 && (
                      <span className="flex items-center gap-1">
                        <Users className="w-4 h-4" />
                        {selectedUpcoming.host_names.join(', ')}
                      </span>
                    )}
                  </div>
                  {selectedUpcoming.topic && (
                    <div className="inline-block px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm mb-4">
                      {selectedUpcoming.topic}
                    </div>
                  )}
                  <p className="text-gray-700 mb-4">{selectedUpcoming.description}</p>
                  {selectedUpcoming.announcement_text && (
                    <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
                      <p className="text-gray-800">{selectedUpcoming.announcement_text}</p>
                    </div>
                  )}
                </div>

                {selectedUpcoming.allow_questions && (
                  <div className="border-t pt-6">
                    <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                      <MessageSquare className="w-5 h-5" />
                      Stel je vraag
                    </h3>

                    <form onSubmit={handleSubmitQuestion} className="mb-6">
                      {!currentUser && (
                        <div className="mb-4">
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Je naam (optioneel)
                          </label>
                          <input
                            type="text"
                            value={submitterName}
                            onChange={(e) => setSubmitterName(e.target.value)}
                            placeholder="Laat leeg voor anoniem"
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </div>
                      )}

                      <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Je vraag voor deze episode
                        </label>
                        <textarea
                          value={newQuestion}
                          onChange={(e) => setNewQuestion(e.target.value)}
                          placeholder="Wat wil je weten over dit onderwerp?"
                          rows={4}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                          required
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={submitting || !newQuestion.trim()}
                        className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                      >
                        <Send className="w-4 h-4" />
                        {submitting ? 'Versturen...' : 'Verstuur vraag'}
                      </button>
                    </form>

                    {questions.length > 0 && (
                      <div>
                        <h4 className="text-lg font-semibold text-gray-900 mb-4">
                          Ingediende vragen ({questions.length})
                        </h4>
                        <div className="space-y-3">
                          {questions.map((q) => (
                            <div
                              key={q.id}
                              className="bg-gray-50 rounded-lg p-4 border border-gray-200"
                            >
                              <div className="flex items-start justify-between mb-2">
                                <div className="flex-1">
                                  <p className="text-gray-800 font-medium">{q.question}</p>
                                  <p className="text-sm text-gray-500 mt-1">
                                    Door: {q.submitter_name || 'Anoniem'} • {new Date(q.created_at).toLocaleDateString('nl-NL')}
                                  </p>
                                </div>
                                <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(q.status)}`}>
                                  {q.status === 'approved' && <CheckCircle className="w-3 h-3 inline mr-1" />}
                                  {q.status === 'suggested' && <Clock className="w-3 h-3 inline mr-1" />}
                                  {getStatusLabel(q.status)}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {upcomingEpisodes.map((episode) => (
                <button
                  key={episode.id}
                  onClick={() => handleSelectUpcoming(episode)}
                  className={`bg-white rounded-xl shadow-md overflow-hidden hover:shadow-xl transition-all text-left ${
                    selectedUpcoming?.id === episode.id ? 'ring-2 ring-blue-500' : ''
                  }`}
                >
                  <div className="relative aspect-video bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                    <Calendar className="w-16 h-16 text-white opacity-80" />
                    <div className="absolute top-2 right-2 px-3 py-1 bg-white bg-opacity-90 rounded-full text-xs font-medium text-gray-800">
                      Aankomend
                    </div>
                  </div>

                  <div className="p-4">
                    <h3 className="font-semibold text-lg mb-2 line-clamp-2">{episode.title}</h3>
                    <p className="text-gray-600 text-sm line-clamp-2 mb-3">{episode.description}</p>

                    <div className="space-y-2 text-sm text-gray-500">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        <span>{new Date(episode.scheduled_date).toLocaleDateString('nl-NL')}</span>
                      </div>

                      {episode.host_names && episode.host_names.length > 0 && (
                        <div className="flex items-center gap-1">
                          <Users className="w-4 h-4" />
                          <span className="line-clamp-1">{episode.host_names.join(', ')}</span>
                        </div>
                      )}

                      {episode.allow_questions && (
                        <div className="flex items-center gap-1 text-blue-600">
                          <MessageSquare className="w-4 h-4" />
                          <span>Vragen welkom</span>
                        </div>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>

            {upcomingEpisodes.length === 0 && (
              <div className="text-center py-12">
                <p className="text-gray-500 text-lg">Geen aankomende episodes gepland</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'episodes' && (
          <div className="space-y-6">
            {selectedEpisode && (
              <div className="mb-8 bg-white rounded-xl shadow-lg overflow-hidden">
                <div className="aspect-video bg-black">
                  {selectedEpisode.media_type === 'video' ? (
                    <video
                      controls
                      autoPlay
                      className="w-full h-full"
                      src={selectedEpisode.media_url}
                    >
                      Je browser ondersteunt geen video.
                    </video>
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <audio
                        controls
                        autoPlay
                        className="w-full max-w-2xl px-8"
                        src={selectedEpisode.media_url}
                      >
                        Je browser ondersteunt geen audio.
                      </audio>
                    </div>
                  )}
                </div>
                <div className="p-6">
                  <h2 className="text-2xl font-bold mb-2">{selectedEpisode.title}</h2>
                  <p className="text-gray-600 mb-4">{selectedEpisode.description}</p>
                  <div className="flex items-center gap-4 text-sm text-gray-500">
                    <span className="flex items-center gap-1">
                      <Eye className="w-4 h-4" />
                      {selectedEpisode.view_count} views
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      {new Date(selectedEpisode.published_at).toLocaleDateString('nl-NL')}
                    </span>
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {episodes.map((episode) => (
                <button
                  key={episode.id}
                  onClick={() => handlePlayEpisode(episode)}
                  className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-xl transition-shadow text-left group"
                >
                  <div className="relative aspect-video bg-gray-200 overflow-hidden">
                    {episode.thumbnail_url ? (
                      <img
                        src={episode.thumbnail_url}
                        alt={episode.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full bg-gradient-to-br from-blue-500 to-purple-600">
                        <Play className="w-16 h-16 text-white opacity-80" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all flex items-center justify-center">
                      <Play className="w-12 h-12 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                    {episode.duration > 0 && (
                      <div className="absolute bottom-2 right-2 px-2 py-1 bg-black bg-opacity-70 text-white text-xs rounded">
                        {formatDuration(episode.duration)}
                      </div>
                    )}
                  </div>

                  <div className="p-4">
                    <h3 className="font-semibold text-lg mb-2 line-clamp-2">{episode.title}</h3>
                    <p className="text-gray-600 text-sm line-clamp-2 mb-3">{episode.description}</p>

                    <div className="flex items-center justify-between text-sm text-gray-500">
                      <span className="flex items-center gap-1">
                        <Eye className="w-4 h-4" />
                        {episode.view_count}
                      </span>
                      <span>{new Date(episode.published_at).toLocaleDateString('nl-NL')}</span>
                    </div>
                  </div>
                </button>
              ))}
            </div>

            {episodes.length === 0 && (
              <div className="text-center py-12">
                <p className="text-gray-500 text-lg">Nog geen episodes beschikbaar</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
