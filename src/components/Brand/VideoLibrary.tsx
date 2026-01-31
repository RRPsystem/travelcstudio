import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { generateVideoDeeplink } from '../../lib/videoDeeplinkHelper';
import { Film, Plus, Edit, Trash2, Download, Play, RefreshCw } from 'lucide-react';

interface Video {
  id: string;
  brand_id: string;
  agent_id?: string;
  trip_id?: string;
  title: string;
  slug: string;
  description?: string;
  video_url?: string;
  thumbnail_url?: string;
  duration_seconds?: number;
  status: 'draft' | 'generating' | 'published' | 'failed';
  script?: string;
  scenes?: any;
  voice_settings?: any;
  music_settings?: any;
  branding?: any;
  created_at: string;
  updated_at: string;
  published_at?: string;
}

export default function VideoLibrary() {
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);
  const [showPlayer, setShowPlayer] = useState(false);

  useEffect(() => {
    loadVideos();
  }, []);

  const loadVideos = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Niet ingelogd');

      const { data: userProfile } = await supabase
        .from('users')
        .select('brand_id')
        .eq('id', userData.user.id)
        .single();

      if (!userProfile?.brand_id) throw new Error('Geen brand gevonden');

      const { data, error: fetchError } = await supabase
        .from('brand_videos')
        .select('*')
        .eq('brand_id', userProfile.brand_id)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      setVideos(data || []);
    } catch (err) {
      console.error('Error loading videos:', err);
      setError(err instanceof Error ? err.message : 'Fout bij laden video\'s');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateNew = async () => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Niet ingelogd');

      const { data: userProfile } = await supabase
        .from('users')
        .select('brand_id')
        .eq('id', userData.user.id)
        .single();

      if (!userProfile?.brand_id) throw new Error('Geen brand gevonden');

      const deeplink = await generateVideoDeeplink(
        userProfile.brand_id,
        'create'
      );

      window.open(deeplink, '_blank');
    } catch (err) {
      console.error('Error creating video:', err);
      alert(err instanceof Error ? err.message : 'Fout bij aanmaken video');
    }
  };

  const handleEdit = async (video: Video) => {
    try {
      const deeplink = await generateVideoDeeplink(
        video.brand_id,
        'edit',
        video.id
      );

      window.open(deeplink, '_blank');
    } catch (err) {
      console.error('Error editing video:', err);
      alert(err instanceof Error ? err.message : 'Fout bij bewerken video');
    }
  };

  const handleDelete = async (videoId: string) => {
    if (!confirm('Weet je zeker dat je deze video wilt verwijderen?')) return;

    try {
      const { error: deleteError } = await supabase
        .from('brand_videos')
        .delete()
        .eq('id', videoId);

      if (deleteError) throw deleteError;

      setVideos(videos.filter(v => v.id !== videoId));
    } catch (err) {
      console.error('Error deleting video:', err);
      alert(err instanceof Error ? err.message : 'Fout bij verwijderen video');
    }
  };

  const handleDownload = async (video: Video) => {
    if (!video.video_url) {
      alert('Video URL niet beschikbaar');
      return;
    }

    try {
      const response = await fetch(video.video_url);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${video.slug}.mp4`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error('Error downloading video:', err);
      alert('Fout bij downloaden video');
    }
  };

  const handlePlay = (video: Video) => {
    setSelectedVideo(video);
    setShowPlayer(true);
  };

  const getStatusBadge = (status: Video['status']) => {
    const styles = {
      draft: 'bg-gray-100 text-gray-800',
      generating: 'bg-blue-100 text-blue-800',
      published: 'bg-green-100 text-green-800',
      failed: 'bg-red-100 text-red-800',
    };

    const labels = {
      draft: 'Concept',
      generating: 'Bezig met genereren',
      published: 'Gepubliceerd',
      failed: 'Mislukt',
    };

    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status]}`}>
        {labels[status]}
      </span>
    );
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return '-';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-end items-center mb-6">
        <div className="flex gap-3">
          <button
            onClick={loadVideos}
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
          <button
            onClick={handleCreateNew}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Nieuwe Video
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {videos.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <Film className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Geen video's</h3>
          <p className="text-gray-600 mb-4">
            Maak je eerste video om aan de slag te gaan
          </p>
          <button
            onClick={handleCreateNew}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Maak je eerste video
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {videos.map((video) => (
            <div
              key={video.id}
              className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow"
            >
              <div className="relative aspect-video bg-gray-100">
                {video.thumbnail_url ? (
                  <img
                    src={video.thumbnail_url}
                    alt={video.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <Film className="h-12 w-12 text-gray-400" />
                  </div>
                )}
                {video.status === 'generating' && (
                  <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
                  </div>
                )}
                {video.video_url && video.status === 'published' && (
                  <button
                    onClick={() => handlePlay(video)}
                    className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-0 hover:bg-opacity-30 transition-all group"
                  >
                    <Play className="h-12 w-12 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>
                )}
                <div className="absolute top-2 right-2">
                  {getStatusBadge(video.status)}
                </div>
              </div>

              <div className="p-4">
                <h3 className="font-medium text-gray-900 mb-1 truncate">
                  {video.title}
                </h3>
                {video.description && (
                  <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                    {video.description}
                  </p>
                )}

                <div className="flex items-center justify-between text-xs text-gray-500 mb-3">
                  <span>Duur: {formatDuration(video.duration_seconds)}</span>
                  <span>{new Date(video.created_at).toLocaleDateString('nl-NL')}</span>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => handleEdit(video)}
                    className="flex-1 px-3 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center justify-center gap-1"
                  >
                    <Edit className="h-3 w-3" />
                    Bewerken
                  </button>
                  {video.video_url && (
                    <button
                      onClick={() => handleDownload(video)}
                      className="px-3 py-2 text-sm bg-green-600 text-white rounded hover:bg-green-700"
                      title="Download"
                    >
                      <Download className="h-3 w-3" />
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(video.id)}
                    className="px-3 py-2 text-sm bg-red-600 text-white rounded hover:bg-red-700"
                    title="Verwijderen"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showPlayer && selectedVideo && (
        <div
          className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4"
          onClick={() => setShowPlayer(false)}
        >
          <div
            className="bg-white rounded-lg max-w-4xl w-full overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-gray-200 flex justify-between items-center">
              <h3 className="font-medium text-gray-900">{selectedVideo.title}</h3>
              <button
                onClick={() => setShowPlayer(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="aspect-video bg-black">
              {selectedVideo.video_url && (
                <video
                  src={selectedVideo.video_url}
                  controls
                  autoPlay
                  className="w-full h-full"
                >
                  Je browser ondersteunt geen video afspelen.
                </video>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
