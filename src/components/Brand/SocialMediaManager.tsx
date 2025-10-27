import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../lib/supabase';
import {
  Share2, Plus, Calendar, Image as ImageIcon, Send, Edit, Trash2,
  Clock, CheckCircle, AlertCircle, X, Instagram, Facebook,
  Twitter, Linkedin, RefreshCw, Eye, Sparkles
} from 'lucide-react';

interface SocialMediaPost {
  id: string;
  brand_id: string;
  content: string;
  media_urls: string[];
  platforms: string[];
  status: 'draft' | 'scheduled' | 'published' | 'failed';
  scheduled_for: string | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

interface SocialMediaAccount {
  id: string;
  brand_id: string;
  platform: string;
  account_name: string;
  is_connected: boolean;
  tier: string;
}

export function SocialMediaManager() {
  const { user } = useAuth();
  const [posts, setPosts] = useState<SocialMediaPost[]>([]);
  const [accounts, setAccounts] = useState<SocialMediaAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingPost, setEditingPost] = useState<SocialMediaPost | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'draft' | 'scheduled' | 'published'>('all');

  const [formData, setFormData] = useState({
    content: '',
    platforms: [] as string[],
    scheduled_for: '',
    media_urls: [] as string[],
  });

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    loadPosts();
    loadAccounts();
  }, [user?.brand_id]);

  const loadPosts = async () => {
    if (!user?.brand_id) return;

    setLoading(true);
    try {
      const { data, error } = await db.supabase
        .from('social_media_posts')
        .select('*')
        .eq('brand_id', user.brand_id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPosts(data || []);
    } catch (err: any) {
      console.error('Error loading posts:', err);
      setError('Fout bij laden van posts: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadAccounts = async () => {
    if (!user?.brand_id) return;

    try {
      const { data, error } = await db.supabase
        .from('social_media_accounts')
        .select('*')
        .eq('brand_id', user.brand_id);

      if (error) throw error;
      setAccounts(data || []);
    } catch (err: any) {
      console.error('Error loading accounts:', err);
    }
  };

  const handleCreatePost = async () => {
    if (!formData.content.trim()) {
      setError('Content is verplicht');
      return;
    }

    if (formData.platforms.length === 0) {
      setError('Selecteer minimaal één platform');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const postData = {
        brand_id: user?.brand_id,
        content: formData.content,
        platforms: formData.platforms,
        media_urls: formData.media_urls,
        scheduled_for: formData.scheduled_for || null,
        status: formData.scheduled_for ? 'scheduled' : 'draft'
      };

      if (editingPost) {
        const { error } = await db.supabase
          .from('social_media_posts')
          .update(postData)
          .eq('id', editingPost.id);

        if (error) throw error;
        setSuccess('Post bijgewerkt!');
      } else {
        const { error } = await db.supabase
          .from('social_media_posts')
          .insert(postData);

        if (error) throw error;
        setSuccess('Post aangemaakt!');
      }

      resetForm();
      await loadPosts();
    } catch (err: any) {
      console.error('Error saving post:', err);
      setError('Fout bij opslaan: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEditPost = (post: SocialMediaPost) => {
    setEditingPost(post);
    setFormData({
      content: post.content,
      platforms: post.platforms,
      scheduled_for: post.scheduled_for || '',
      media_urls: post.media_urls || [],
    });
    setShowCreateForm(true);
  };

  const handleDeletePost = async (postId: string) => {
    if (!confirm('Weet je zeker dat je deze post wilt verwijderen?')) return;

    try {
      const { error } = await db.supabase
        .from('social_media_posts')
        .delete()
        .eq('id', postId);

      if (error) throw error;
      setSuccess('Post verwijderd');
      await loadPosts();
    } catch (err: any) {
      console.error('Error deleting post:', err);
      setError('Fout bij verwijderen: ' + err.message);
    }
  };

  const handlePublishNow = async (postId: string) => {
    try {
      const { error } = await db.supabase
        .from('social_media_posts')
        .update({
          status: 'published',
          published_at: new Date().toISOString()
        })
        .eq('id', postId);

      if (error) throw error;
      setSuccess('Post gepubliceerd!');
      await loadPosts();
    } catch (err: any) {
      console.error('Error publishing post:', err);
      setError('Fout bij publiceren: ' + err.message);
    }
  };

  const resetForm = () => {
    setFormData({
      content: '',
      platforms: [],
      scheduled_for: '',
      media_urls: [],
    });
    setEditingPost(null);
    setShowCreateForm(false);
  };

  const togglePlatform = (platform: string) => {
    setFormData(prev => ({
      ...prev,
      platforms: prev.platforms.includes(platform)
        ? prev.platforms.filter(p => p !== platform)
        : [...prev.platforms, platform]
    }));
  };

  const getPlatformIcon = (platform: string) => {
    switch (platform.toLowerCase()) {
      case 'instagram': return <Instagram className="w-4 h-4" />;
      case 'facebook': return <Facebook className="w-4 h-4" />;
      case 'twitter': return <Twitter className="w-4 h-4" />;
      case 'linkedin': return <Linkedin className="w-4 h-4" />;
      default: return <Share2 className="w-4 h-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'published': return 'bg-green-100 text-green-700';
      case 'scheduled': return 'bg-blue-100 text-blue-700';
      case 'draft': return 'bg-gray-100 text-gray-700';
      case 'failed': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'published': return <CheckCircle className="w-4 h-4" />;
      case 'scheduled': return <Clock className="w-4 h-4" />;
      case 'draft': return <Edit className="w-4 h-4" />;
      case 'failed': return <AlertCircle className="w-4 h-4" />;
      default: return <AlertCircle className="w-4 h-4" />;
    }
  };

  const filteredPosts = posts.filter(post => {
    if (activeTab === 'all') return true;
    return post.status === activeTab;
  });

  const connectedPlatforms = accounts
    .filter(acc => acc.is_connected)
    .map(acc => acc.platform.toLowerCase());

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Social Media Manager</h2>
          <p className="text-gray-600 mt-1">Beheer je social media posts en planning</p>
        </div>
        <button
          onClick={() => setShowCreateForm(true)}
          className="flex items-center space-x-2 px-4 py-2 text-white rounded-lg hover:bg-opacity-90 transition-colors"
          style={{ backgroundColor: '#ff7700' }}
        >
          <Plus className="w-4 h-4" />
          <span>Nieuwe Post</span>
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center space-x-2">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
          <button onClick={() => setError('')} className="ml-auto">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg flex items-center space-x-2">
          <CheckCircle className="w-5 h-5 flex-shrink-0" />
          <span>{success}</span>
          <button onClick={() => setSuccess('')} className="ml-auto">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {connectedPlatforms.length === 0 && (
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded-lg flex items-center space-x-2">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>Je hebt nog geen social media accounts verbonden. Verbind eerst accounts via Social Media Connector.</span>
        </div>
      )}

      {showCreateForm && (
        <div className="bg-white rounded-lg shadow-lg p-6 border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">
              {editingPost ? 'Post Bewerken' : 'Nieuwe Post Maken'}
            </h3>
            <button onClick={resetForm} className="text-gray-400 hover:text-gray-600">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Content *
              </label>
              <textarea
                value={formData.content}
                onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                placeholder="Schrijf je post tekst..."
                rows={5}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-none"
              />
              <div className="flex items-center justify-between mt-1">
                <p className="text-xs text-gray-500">
                  {formData.content.length} karakters
                </p>
                <button
                  type="button"
                  className="text-sm text-orange-600 hover:text-orange-700 flex items-center space-x-1"
                  onClick={() => {
                    setError('AI content generatie komt binnenkort beschikbaar');
                  }}
                >
                  <Sparkles className="w-4 h-4" />
                  <span>AI Verbeteren</span>
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Platforms * {connectedPlatforms.length === 0 && <span className="text-red-600">(Geen verbonden accounts)</span>}
              </label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {['instagram', 'facebook', 'twitter', 'linkedin'].map(platform => {
                  const isConnected = connectedPlatforms.includes(platform);
                  const isSelected = formData.platforms.includes(platform);

                  return (
                    <button
                      key={platform}
                      type="button"
                      onClick={() => isConnected && togglePlatform(platform)}
                      disabled={!isConnected}
                      className={`flex items-center justify-center space-x-2 px-4 py-3 border-2 rounded-lg transition-all ${
                        isSelected
                          ? 'border-orange-500 bg-orange-50 text-orange-700'
                          : isConnected
                          ? 'border-gray-300 hover:border-gray-400'
                          : 'border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed'
                      }`}
                    >
                      {getPlatformIcon(platform)}
                      <span className="capitalize font-medium">{platform}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Publicatie Datum & Tijd (optioneel)
              </label>
              <input
                type="datetime-local"
                value={formData.scheduled_for}
                onChange={(e) => setFormData(prev => ({ ...prev, scheduled_for: e.target.value }))}
                min={new Date().toISOString().slice(0, 16)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-500 mt-1">
                Laat leeg voor concept. Vul in om te plannen voor later.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Media (optioneel)
              </label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors cursor-pointer">
                <ImageIcon className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-600">Media upload komt binnenkort beschikbaar</p>
              </div>
            </div>

            <div className="flex space-x-3 pt-4 border-t">
              <button
                onClick={handleCreatePost}
                disabled={loading || formData.platforms.length === 0}
                className="flex-1 px-4 py-2 text-white rounded-lg hover:bg-opacity-90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ backgroundColor: '#ff7700' }}
              >
                {loading ? 'Bezig...' : editingPost ? 'Bijwerken' : formData.scheduled_for ? 'Inplannen' : 'Opslaan als Concept'}
              </button>
              <button
                onClick={resetForm}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Annuleren
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow">
        <div className="border-b border-gray-200">
          <div className="flex space-x-1 p-1">
            {[
              { id: 'all', label: 'Alle', count: posts.length },
              { id: 'draft', label: 'Concepten', count: posts.filter(p => p.status === 'draft').length },
              { id: 'scheduled', label: 'Gepland', count: posts.filter(p => p.status === 'scheduled').length },
              { id: 'published', label: 'Gepubliceerd', count: posts.filter(p => p.status === 'published').length },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex-1 px-4 py-2 text-sm font-medium rounded transition-colors ${
                  activeTab === tab.id
                    ? 'bg-orange-100 text-orange-700'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                {tab.label} ({tab.count})
              </button>
            ))}
          </div>
        </div>

        <div className="divide-y divide-gray-200">
          {loading ? (
            <div className="p-8 text-center text-gray-500">
              <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2" />
              <p>Laden...</p>
            </div>
          ) : filteredPosts.length === 0 ? (
            <div className="p-8 text-center">
              <Share2 className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Geen posts</h3>
              <p className="text-gray-600 mb-4">
                {activeTab === 'all'
                  ? 'Maak je eerste social media post'
                  : `Geen ${activeTab === 'draft' ? 'concepten' : activeTab === 'scheduled' ? 'geplande posts' : 'gepubliceerde posts'}`
                }
              </p>
            </div>
          ) : (
            filteredPosts.map(post => (
              <div key={post.id} className="p-6 hover:bg-gray-50 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <span className={`px-2 py-1 text-xs font-medium rounded flex items-center space-x-1 ${getStatusColor(post.status)}`}>
                        {getStatusIcon(post.status)}
                        <span className="capitalize">{post.status === 'draft' ? 'Concept' : post.status === 'scheduled' ? 'Gepland' : post.status === 'published' ? 'Gepubliceerd' : post.status}</span>
                      </span>
                      <div className="flex items-center space-x-1">
                        {post.platforms.map(platform => (
                          <div key={platform} className="text-gray-500" title={platform}>
                            {getPlatformIcon(platform)}
                          </div>
                        ))}
                      </div>
                    </div>

                    <p className="text-gray-900 whitespace-pre-wrap mb-3">{post.content}</p>

                    <div className="flex items-center space-x-4 text-sm text-gray-500">
                      {post.scheduled_for && (
                        <div className="flex items-center space-x-1">
                          <Calendar className="w-4 h-4" />
                          <span>
                            {new Date(post.scheduled_for).toLocaleDateString('nl-NL', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                        </div>
                      )}
                      {post.published_at && (
                        <div className="flex items-center space-x-1">
                          <CheckCircle className="w-4 h-4" />
                          <span>
                            {new Date(post.published_at).toLocaleDateString('nl-NL', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex space-x-2 ml-4">
                    {post.status === 'draft' && (
                      <button
                        onClick={() => handlePublishNow(post.id)}
                        className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                        title="Nu publiceren"
                      >
                        <Send className="w-5 h-5" />
                      </button>
                    )}
                    <button
                      onClick={() => handleEditPost(post)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Bewerken"
                    >
                      <Edit className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => handleDeletePost(post.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Verwijderen"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
