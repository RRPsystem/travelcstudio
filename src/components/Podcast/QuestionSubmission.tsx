import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Send, Calendar, Users, CheckCircle, FolderOpen } from 'lucide-react';

interface UpcomingEpisode {
  id: string;
  title: string;
  description: string;
  topic: string;
  scheduled_date: string;
  announcement_text: string;
}

interface Topic {
  id: string;
  title: string;
  description: string | null;
}

export default function QuestionSubmission() {
  const { user } = useAuth();
  const [upcomingEpisodes, setUpcomingEpisodes] = useState<UpcomingEpisode[]>([]);
  const [selectedEpisode, setSelectedEpisode] = useState<UpcomingEpisode | null>(null);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
  const [question, setQuestion] = useState('');
  const [submitterName, setSubmitterName] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    loadUpcomingEpisodes();
    loadCurrentUser();
  }, []);

  useEffect(() => {
    if (selectedEpisode) {
      loadTopics();
    }
  }, [selectedEpisode]);

  const loadCurrentUser = async () => {
    if (user) {
      const { data } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single();
      setCurrentUser(data);
    }
  };

  const loadUpcomingEpisodes = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('podcast_episodes_planning')
      .select('*')
      .eq('allow_questions', true)
      .in('status', ['scheduled', 'planning'])
      .order('scheduled_date', { ascending: true });

    if (!error && data) {
      setUpcomingEpisodes(data);
      if (data.length > 0) {
        setSelectedEpisode(data[0]);
      }
    }
    setLoading(false);
  };

  const loadTopics = async () => {
    if (!selectedEpisode) return;

    const { data, error } = await supabase
      .from('podcast_topics')
      .select('*')
      .eq('episode_planning_id', selectedEpisode.id)
      .order('order_index', { ascending: true });

    if (!error && data) {
      setTopics(data);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!question.trim() || !selectedEpisode) return;

    const sourceType = currentUser?.role === 'brand' ? 'brand' :
                       currentUser?.role === 'agent' ? 'agent' : 'public';

    const { error } = await supabase.from('podcast_questions').insert({
      episode_planning_id: selectedEpisode.id,
      question: question.trim(),
      source_type: sourceType,
      submitted_by: user?.id || null,
      submitter_name: submitterName.trim() || currentUser?.email || (user?.email || 'Anoniem'),
      status: 'suggested',
      phase: (sourceType === 'brand' || sourceType === 'agent') ? 'pre_submitted' : 'preparation',
      topic_id: selectedTopic,
      visible_to_submitter: true
    });

    if (error) {
      alert('Fout bij indienen: ' + error.message);
    } else {
      setSubmitted(true);
      setQuestion('');
      setSelectedTopic(null);
      setTimeout(() => setSubmitted(false), 3000);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Laden...</div>
      </div>
    );
  }

  if (upcomingEpisodes.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md text-center">
          <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Geen aankomende episodes</h2>
          <p className="text-gray-600">Er zijn momenteel geen podcast episodes waarvoor je vragen kunt insturen.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Stel je vraag voor de podcast</h1>
          <p className="text-gray-600">Help ons interessante onderwerpen te bespreken</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {upcomingEpisodes.map((episode) => (
            <button
              key={episode.id}
              onClick={() => setSelectedEpisode(episode)}
              className={`p-6 rounded-xl text-left transition-all ${
                selectedEpisode?.id === episode.id
                  ? 'bg-blue-600 text-white shadow-xl scale-105'
                  : 'bg-white hover:shadow-lg'
              }`}
            >
              <h3 className={`font-semibold mb-2 ${
                selectedEpisode?.id === episode.id ? 'text-white' : 'text-gray-900'
              }`}>
                {episode.title}
              </h3>
              <p className={`text-sm mb-3 line-clamp-2 ${
                selectedEpisode?.id === episode.id ? 'text-blue-100' : 'text-gray-600'
              }`}>
                {episode.topic}
              </p>
              {episode.scheduled_date && (
                <div className={`flex items-center gap-2 text-sm ${
                  selectedEpisode?.id === episode.id ? 'text-blue-100' : 'text-gray-500'
                }`}>
                  <Calendar className="w-4 h-4" />
                  {new Date(episode.scheduled_date).toLocaleDateString('nl-NL')}
                </div>
              )}
            </button>
          ))}
        </div>

        {selectedEpisode && (
          <div className="bg-white rounded-xl shadow-lg overflow-hidden">
            <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white p-8">
              <h2 className="text-3xl font-bold mb-3">{selectedEpisode.title}</h2>
              <p className="text-blue-100 mb-4">{selectedEpisode.description}</p>
              {selectedEpisode.announcement_text && (
                <div className="bg-white/20 rounded-lg p-4 backdrop-blur-sm">
                  <p className="text-white">{selectedEpisode.announcement_text}</p>
                </div>
              )}
            </div>

            <div className="p-8">
              {submitted ? (
                <div className="text-center py-12">
                  <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">Bedankt!</h3>
                  <p className="text-gray-600">Je vraag is succesvol ingediend en zal worden beoordeeld door de hosts.</p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-6">
                  {topics.length > 0 && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Onderwerp (optioneel)
                      </label>
                      <div className="grid grid-cols-1 gap-3">
                        {topics.map((topic) => (
                          <button
                            key={topic.id}
                            type="button"
                            onClick={() => setSelectedTopic(selectedTopic === topic.id ? null : topic.id)}
                            className={`p-4 rounded-lg border-2 transition-all text-left ${
                              selectedTopic === topic.id
                                ? 'border-blue-500 bg-blue-50'
                                : 'border-gray-200 hover:border-blue-300 bg-white'
                            }`}
                          >
                            <div className="flex items-center gap-2 mb-1">
                              <FolderOpen size={16} className={selectedTopic === topic.id ? 'text-blue-600' : 'text-gray-600'} />
                              <span className={`font-medium ${selectedTopic === topic.id ? 'text-blue-900' : 'text-gray-900'}`}>
                                {topic.title}
                              </span>
                            </div>
                            {topic.description && (
                              <p className={`text-sm ${selectedTopic === topic.id ? 'text-blue-700' : 'text-gray-600'}`}>
                                {topic.description}
                              </p>
                            )}
                          </button>
                        ))}
                      </div>
                      <p className="text-sm text-gray-500 mt-2">
                        Kies een onderwerp waar je vraag het beste bij past (optioneel)
                      </p>
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Jouw vraag *
                    </label>
                    <textarea
                      required
                      value={question}
                      onChange={(e) => setQuestion(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      rows={4}
                      placeholder="Wat wil je graag weten over dit onderwerp?"
                    />
                    <p className="text-sm text-gray-500 mt-1">
                      Stel een open vraag die tot interessante gesprekken leidt
                    </p>
                  </div>

                  {!user && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Je naam (optioneel)
                      </label>
                      <input
                        type="text"
                        value={submitterName}
                        onChange={(e) => setSubmitterName(e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Hoe mogen we je noemen?"
                      />
                    </div>
                  )}

                  <div className="bg-blue-50 rounded-lg p-4">
                    <h4 className="font-medium text-blue-900 mb-2">Tips voor een goede vraag:</h4>
                    <ul className="text-sm text-blue-800 space-y-1">
                      <li>• Stel open vragen die beginnen met "Hoe", "Waarom" of "Wat"</li>
                      <li>• Vermijd ja/nee vragen</li>
                      <li>• Wees specifiek maar niet te technisch</li>
                      <li>• Denk aan wat andere luisteraars ook interessant zouden vinden</li>
                    </ul>
                  </div>

                  <button
                    type="submit"
                    className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl"
                  >
                    <Send className="w-5 h-5" />
                    Vraag Insturen
                  </button>
                </form>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}