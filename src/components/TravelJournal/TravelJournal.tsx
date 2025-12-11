import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Play, Calendar, Eye } from 'lucide-react';

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

export default function TravelJournal() {
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [selectedEpisode, setSelectedEpisode] = useState<Episode | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEpisodes();
  }, []);

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

  const handlePlayEpisode = async (episode: Episode) => {
    setSelectedEpisode(episode);

    await supabase
      .from('travel_journal_episodes')
      .update({ view_count: episode.view_count + 1 })
      .eq('id', episode.id);
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
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
    </div>
  );
}