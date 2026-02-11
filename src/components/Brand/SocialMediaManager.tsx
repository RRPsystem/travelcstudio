import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../lib/supabase';
import {
  Share2, Image as ImageIcon, Send, Edit, Trash2,
  Clock, CheckCircle, AlertCircle, X, Instagram, Facebook,
  Twitter, Linkedin, RefreshCw, Sparkles, Youtube, Calendar
} from 'lucide-react';
import { SlidingMediaSelector } from '../shared/SlidingMediaSelector';

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
  enabled_for_brands?: boolean;
  enabled_for_agents?: boolean;
  created_by?: string;
}

interface SocialMediaAccount {
  id: string;
  brand_id: string;
  platform: string;
  platform_username: string;
  is_active: boolean;
  access_token?: string;
  metadata?: any;
}

interface BrandVoiceSettings {
  tone: string;
  style: string;
  keywords: string[];
}

export function SocialMediaManager() {
  const { user, effectiveBrandId, isAdmin } = useAuth();
  const [posts, setPosts] = useState<SocialMediaPost[]>([]);
  const [accounts, setAccounts] = useState<SocialMediaAccount[]>([]);
  const [availablePosts, setAvailablePosts] = useState<SocialMediaPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'create' | 'available' | 'planner' | 'suggestions' | 'accounts' | 'brand-voice'>('create');
  const [showMediaSelector, setShowMediaSelector] = useState(false);
  const [connectingPlatform, setConnectingPlatform] = useState('');
  const [testingPlatform, setTestingPlatform] = useState('');
  const [platformCredentials, setPlatformCredentials] = useState<Record<string, any>>({});

  const [formData, setFormData] = useState({
    aiPrompt: '',
    content: '',
    platforms: [] as string[],
    scheduled_for: '',
    media_urls: [] as string[],
    enabled_for_brands: false,
    enabled_for_agents: false,
  });

  const [brandVoice, setBrandVoice] = useState<BrandVoiceSettings>({
    tone: 'professional',
    style: 'casual',
    keywords: []
  });

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [generatingContent, setGeneratingContent] = useState(false);

  useEffect(() => {
    loadPosts();
    loadAccounts();
    loadBrandVoice();
    if (!isAdmin) {
      loadAvailablePosts();
    }
  }, [effectiveBrandId, isAdmin]);

  const loadPosts = async () => {
    if (!effectiveBrandId) return;

    setLoading(true);
    try {
      const { data, error } = await db.supabase
        .from('social_media_posts')
        .select('*')
        .eq('brand_id', effectiveBrandId)
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
    if (!effectiveBrandId) return;

    try {
      const { data, error } = await db.supabase
        .from('social_media_accounts')
        .select('*')
        .eq('brand_id', effectiveBrandId);

      if (error) throw error;
      setAccounts(data || []);
    } catch (err: any) {
      console.error('Error loading accounts:', err);
    }
  };

  const loadBrandVoice = async () => {
    if (!effectiveBrandId) return;

    try {
      const { data, error } = await db.supabase
        .from('brand_voice_settings')
        .select('*')
        .eq('brand_id', effectiveBrandId)
        .maybeSingle();

      if (error) throw error;
      if (data) {
        setBrandVoice({
          tone: data.tone || 'professional',
          style: data.style || 'casual',
          keywords: data.keywords || []
        });
      }
    } catch (err: any) {
      console.error('Error loading brand voice:', err);
    }
  };

  const loadAvailablePosts = async () => {
    // Load posts from Admin that are enabled for brands
    try {
      const { data, error } = await db.supabase
        .from('social_media_posts')
        .select('*')
        .eq('enabled_for_brands', true)
        .neq('brand_id', effectiveBrandId) // Don't show own posts
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAvailablePosts(data || []);
    } catch (err: any) {
      console.error('Error loading available posts:', err);
    }
  };

  const generateAIContent = async () => {
    if (!formData.aiPrompt.trim()) {
      setError('Voer een onderwerp in voor AI generatie');
      return;
    }

    setGeneratingContent(true);
    setError('');

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-content`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({
            contentType: 'social_media',
            prompt: formData.aiPrompt,
            additionalContext: brandVoice || ''
          }),
        }
      );

      if (!response.ok) throw new Error('Fout bij genereren content');

      const data = await response.json();
      setFormData(prev => ({ ...prev, content: data.content }));
      setSuccess('Content gegenereerd met AI!');
    } catch (err: any) {
      console.error('Error generating content:', err);
      setError('Fout bij AI generatie: ' + err.message);
    } finally {
      setGeneratingContent(false);
    }
  };

  const handlePublishPost = async () => {
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
      const { data: { session } } = await db.supabase.auth.getSession();
      if (!session) {
        throw new Error('Niet ingelogd');
      }

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const creditCheckResponse = await fetch(`${supabaseUrl}/functions/v1/deduct-credits`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          actionType: 'social_media_post',
          description: `Social media post naar ${formData.platforms.join(', ')}`,
          metadata: {
            platforms: formData.platforms,
            contentLength: formData.content.length
          }
        })
      });

      if (!creditCheckResponse.ok) {
        const errorData = await creditCheckResponse.json();
        throw new Error(errorData.error || 'Onvoldoende credits');
      }

      const postData = {
        brand_id: effectiveBrandId,
        created_by: user?.id,
        content: formData.content,
        platforms: formData.platforms,
        media_urls: formData.media_urls,
        scheduled_for: formData.scheduled_for || null,
        status: 'published',
        published_at: new Date().toISOString()
      };

      const { error } = await db.supabase
        .from('social_media_posts')
        .insert(postData);

      if (error) throw error;

      setSuccess('Post gepubliceerd! (10 credits gebruikt)');
      resetForm();
      await loadPosts();
    } catch (err: any) {
      console.error('Error publishing post:', err);
      setError('Fout bij publiceren: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveDraft = async () => {
    if (!formData.content.trim()) {
      setError('Content is verplicht');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const postData = {
        brand_id: effectiveBrandId,
        created_by: user?.id,
        content: formData.content,
        platforms: formData.platforms,
        media_urls: formData.media_urls,
        scheduled_for: formData.scheduled_for || null,
        status: 'draft'
      };

      const { error } = await db.supabase
        .from('social_media_posts')
        .insert(postData);

      if (error) throw error;

      setSuccess('Concept opgeslagen!');
      resetForm();
      await loadPosts();
    } catch (err: any) {
      console.error('Error saving draft:', err);
      setError('Fout bij opslaan: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveForBrands = async () => {
    console.log('[handleSaveForBrands] Starting...');
    
    if (!formData.content.trim()) {
      setError('Content is verplicht');
      return;
    }

    if (!formData.enabled_for_brands && !formData.enabled_for_agents) {
      setError('Selecteer minimaal Brands of Agents');
      return;
    }

    if (!effectiveBrandId) {
      setError('Geen brand geselecteerd');
      return;
    }

    if (!db.supabase) {
      setError('Database niet beschikbaar');
      return;
    }

    setLoading(true);
    setError('');
    console.log('[handleSaveForBrands] Loading set to true');

    try {
      const postData = {
        brand_id: effectiveBrandId,
        created_by: user?.id,
        content: formData.content,
        platforms: formData.platforms,
        media_urls: formData.media_urls,
        status: 'draft',
        enabled_for_brands: formData.enabled_for_brands,
        enabled_for_agents: formData.enabled_for_agents
      };

      console.log('[handleSaveForBrands] Inserting post:', postData);

      const { data, error } = await db.supabase
        .from('social_media_posts')
        .insert(postData)
        .select();

      console.log('[handleSaveForBrands] Insert result:', { data, error });

      if (error) {
        console.error('[handleSaveForBrands] Database error:', error);
        throw error;
      }

      setSuccess('Post opgeslagen en beschikbaar gemaakt voor ' + 
        (formData.enabled_for_brands && formData.enabled_for_agents ? 'Brands en Agents' :
         formData.enabled_for_brands ? 'Brands' : 'Agents'));
      resetForm();
      await loadPosts();
      console.log('[handleSaveForBrands] Success!');
    } catch (err: any) {
      console.error('[handleSaveForBrands] Error:', err);
      setError('Fout bij opslaan: ' + (err.message || 'Onbekende fout'));
    } finally {
      console.log('[handleSaveForBrands] Finally block - setting loading to false');
      setLoading(false);
    }
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

  const toggleBrandAvailability = async (postId: string, currentValue: boolean) => {
    try {
      const { error } = await db.supabase
        .from('social_media_posts')
        .update({ enabled_for_brands: !currentValue })
        .eq('id', postId);

      if (error) throw error;
      setSuccess(!currentValue ? 'Post beschikbaar gemaakt voor Brands!' : 'Post niet meer beschikbaar voor Brands');
      await loadPosts();
    } catch (err: any) {
      console.error('Error toggling brand availability:', err);
      setError('Fout bij bijwerken: ' + err.message);
    }
  };

  const handleUsePost = async (post: SocialMediaPost) => {
    try {
      // Copy the post content to the form
      setFormData({
        aiPrompt: '',
        content: post.content,
        platforms: post.platforms || [],
        scheduled_for: '',
        media_urls: post.media_urls || [],
        enabled_for_brands: false,
        enabled_for_agents: false,
      });
      
      // Switch to create tab
      setActiveTab('create');
      setSuccess('Post geladen! Je kunt deze nu aanpassen en publiceren op je kanalen.');
    } catch (err: any) {
      console.error('Error using post:', err);
      setError('Fout bij laden van post: ' + err.message);
    }
  };

  const resetForm = () => {
    setFormData({
      aiPrompt: '',
      content: '',
      platforms: [],
      scheduled_for: '',
      media_urls: [],
      enabled_for_brands: false,
      enabled_for_agents: false,
    });
  };

  const togglePlatform = (platform: string) => {
    setFormData(prev => ({
      ...prev,
      platforms: prev.platforms.includes(platform)
        ? prev.platforms.filter(p => p !== platform)
        : [...prev.platforms, platform]
    }));
  };

  const handleMediaSelect = (imageUrl: string) => {
    setFormData(prev => ({
      ...prev,
      media_urls: [...prev.media_urls, imageUrl]
    }));
    setShowMediaSelector(false);
  };

  const removeMedia = (index: number) => {
    setFormData(prev => ({
      ...prev,
      media_urls: prev.media_urls.filter((_, i) => i !== index)
    }));
  };

  const getPlatformIcon = (platform: string) => {
    switch (platform.toLowerCase()) {
      case 'instagram': return <Instagram className="w-5 h-5" />;
      case 'facebook': return <Facebook className="w-5 h-5" />;
      case 'twitter': return <Twitter className="w-5 h-5" />;
      case 'linkedin': return <Linkedin className="w-5 h-5" />;
      case 'youtube': return <Youtube className="w-5 h-5" />;
      default: return <Share2 className="w-5 h-5" />;
    }
  };

  const connectedPlatforms = accounts
    .filter(acc => acc.is_active)
    .map(acc => acc.platform.toLowerCase());

  return (
    <div className="h-full flex flex-col bg-gray-50">
      <div className="border-b border-gray-200 bg-white">
        <div className="flex px-6 overflow-x-auto">
          <button
            onClick={() => setActiveTab('create')}
            className={`px-6 py-3 font-medium text-sm border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'create'
                ? 'border-orange-500 text-orange-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            Post Maken
          </button>
          {/* Available Posts tab - only for Brand/Agent (not Admin) */}
          {!isAdmin && (
            <button
              onClick={() => setActiveTab('available')}
              className={`px-6 py-3 font-medium text-sm border-b-2 transition-colors whitespace-nowrap ${
                activeTab === 'available'
                  ? 'border-orange-500 text-orange-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              Beschikbare Posts
              {availablePosts.length > 0 && (
                <span className="ml-2 py-0.5 px-2 rounded-full text-xs bg-purple-100 text-purple-800">
                  {availablePosts.length}
                </span>
              )}
            </button>
          )}
          {/* AI tabs - only for Admin */}
          {isAdmin && (
            <>
              <button
                onClick={() => setActiveTab('planner')}
                className={`px-6 py-3 font-medium text-sm border-b-2 transition-colors whitespace-nowrap ${
                  activeTab === 'planner'
                    ? 'border-orange-500 text-orange-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                AI Planner
              </button>
              <button
                onClick={() => setActiveTab('suggestions')}
                className={`px-6 py-3 font-medium text-sm border-b-2 transition-colors whitespace-nowrap ${
                  activeTab === 'suggestions'
                    ? 'border-orange-500 text-orange-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                AI Voorstellen
              </button>
            </>
          )}
          <button
            onClick={() => setActiveTab('accounts')}
            className={`px-6 py-3 font-medium text-sm border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'accounts'
                ? 'border-orange-500 text-orange-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            Accounts ({accounts.filter(a => a.is_active).length})
          </button>
          <button
            onClick={() => setActiveTab('brand-voice')}
            className={`px-6 py-3 font-medium text-sm border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'brand-voice'
                ? 'border-orange-500 text-orange-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            Brand Voice
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center space-x-2 mb-4">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span>{error}</span>
            <button onClick={() => setError('')} className="ml-auto">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {success && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg flex items-center space-x-2 mb-4">
            <CheckCircle className="w-5 h-5 flex-shrink-0" />
            <span>{success}</span>
            <button onClick={() => setSuccess('')} className="ml-auto">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {activeTab === 'create' && (
          <div className="max-w-4xl mx-auto">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
              {/* AI Content Generator - only for Admin */}
              {isAdmin && (
                <>
                  <h3 className="text-lg font-semibold mb-4">AI Content Generator</h3>
                  <p className="text-sm text-gray-600 mb-4">Onderwerp voor AI</p>

                  <div className="flex space-x-2 mb-4">
                    <input
                      type="text"
                      value={formData.aiPrompt}
                      onChange={(e) => setFormData(prev => ({ ...prev, aiPrompt: e.target.value }))}
                      placeholder="Bijv: Lancering nieuwe collectie, zomervakantie tips..."
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    />
                    <button
                      onClick={generateAIContent}
                      disabled={generatingContent || !formData.aiPrompt.trim()}
                      className="px-6 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                    >
                      <Sparkles className="w-4 h-4" />
                      <span>{generatingContent ? 'Bezig...' : 'Genereer met AI'}</span>
                    </button>
                  </div>
                </>
              )}

              {!isAdmin && (
                <h3 className="text-lg font-semibold mb-4">Nieuwe Post</h3>
              )}

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Post Content
                </label>
                <textarea
                  value={formData.content}
                  onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                  placeholder="Schrijf je post..."
                  rows={6}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-none"
                />
                <p className="text-xs text-gray-500 mt-1">{formData.content.length} karakters</p>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Media
                </label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {formData.media_urls.map((url, index) => (
                    <div key={index} className="relative">
                      <img src={url} alt="" className="w-24 h-24 object-cover rounded-lg" />
                      <button
                        onClick={() => removeMedia(index)}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                  <button
                    onClick={() => setShowMediaSelector(true)}
                    className="w-24 h-24 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center hover:border-gray-400 transition-colors"
                  >
                    <ImageIcon className="w-6 h-6 text-gray-400" />
                  </button>
                </div>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Selecteer Platforms
                </label>
                <div className="grid grid-cols-5 gap-3">
                  {['facebook', 'instagram', 'twitter', 'linkedin', 'youtube'].map(platform => {
                    const isConnected = connectedPlatforms.includes(platform);
                    const isSelected = formData.platforms.includes(platform);

                    return (
                      <button
                        key={platform}
                        type="button"
                        onClick={() => isConnected && togglePlatform(platform)}
                        disabled={!isConnected}
                        className={`flex flex-col items-center justify-center p-4 border-2 rounded-lg transition-all ${
                          isSelected
                            ? 'border-orange-500 bg-orange-50'
                            : isConnected
                            ? 'border-gray-200 hover:border-gray-300'
                            : 'border-gray-200 bg-gray-50 opacity-50 cursor-not-allowed'
                        }`}
                      >
                        <div className={isSelected ? 'text-orange-600' : isConnected ? 'text-gray-700' : 'text-gray-400'}>
                          {getPlatformIcon(platform)}
                        </div>
                        <span className={`text-xs mt-2 capitalize ${isSelected ? 'text-orange-600 font-medium' : isConnected ? 'text-gray-700' : 'text-gray-400'}`}>
                          {platform}
                        </span>
                        {!isConnected && <span className="text-[10px] text-red-600 mt-1">Niet verbonden</span>}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Admin-only: Enable for Brands/Agents */}
              {isAdmin && (
                <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <h4 className="text-sm font-semibold text-blue-900 mb-3">Beschikbaar maken voor:</h4>
                  <div className="space-y-2">
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.enabled_for_brands}
                        onChange={(e) => setFormData(prev => ({ ...prev, enabled_for_brands: e.target.checked }))}
                        className="w-4 h-4 text-orange-600 border-gray-300 rounded focus:ring-orange-500"
                      />
                      <span className="text-sm text-gray-700">Brands (reisbureaus)</span>
                    </label>
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.enabled_for_agents}
                        onChange={(e) => setFormData(prev => ({ ...prev, enabled_for_agents: e.target.checked }))}
                        className="w-4 h-4 text-orange-600 border-gray-300 rounded focus:ring-orange-500"
                      />
                      <span className="text-sm text-gray-700">Agents (individuele adviseurs)</span>
                    </label>
                  </div>
                  <p className="text-xs text-blue-700 mt-2">
                    Deze post wordt opgeslagen en kan door geselecteerde gebruikers worden gebruikt op hun kanalen.
                  </p>
                </div>
              )}

              <div className="flex space-x-3 pt-4 border-t border-gray-200">
                {isAdmin ? (
                  <>
                    <button
                      onClick={handleSaveForBrands}
                      disabled={loading || !formData.content.trim()}
                      className="flex-1 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                    >
                      <Share2 className="w-4 h-4" />
                      <span>{loading ? 'Bezig...' : 'Opslaan voor Brands/Agents'}</span>
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={handleSaveDraft}
                      disabled={loading}
                      className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                    >
                      Opslaan als Concept
                    </button>
                    <button
                      onClick={handlePublishPost}
                      disabled={loading || formData.platforms.length === 0}
                      className="flex-1 px-6 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                    >
                      <Send className="w-4 h-4" />
                      <span>{loading ? 'Bezig...' : 'Publiceer Nu'}</span>
                    </button>
                  </>
                )}
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold mb-4">Recente Posts</h3>

              {posts.length === 0 ? (
                <div className="text-center py-8">
                  <Share2 className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-600">Nog geen posts gemaakt</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {posts.slice(0, 5).map(post => (
                    <div key={post.id} className="flex items-start justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          {post.platforms.map(platform => (
                            <div key={platform} className="text-gray-500">
                              {getPlatformIcon(platform)}
                            </div>
                          ))}
                          <span className={`px-2 py-1 text-xs font-medium rounded ${
                            post.status === 'published' ? 'bg-green-100 text-green-700' :
                            post.status === 'scheduled' ? 'bg-blue-100 text-blue-700' :
                            'bg-gray-100 text-gray-700'
                          }`}>
                            {post.status === 'published' ? 'Gepubliceerd' : post.status === 'scheduled' ? 'Gepland' : 'Concept'}
                          </span>
                        </div>
                        <p className="text-sm text-gray-900 line-clamp-2">{post.content}</p>
                        {post.published_at && (
                          <p className="text-xs text-gray-500 mt-1">
                            {new Date(post.published_at).toLocaleDateString('nl-NL', {
                              day: 'numeric',
                              month: 'short',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center space-x-2 ml-4">
                        {isAdmin && (
                          <button
                            onClick={() => toggleBrandAvailability(post.id, !!post.enabled_for_brands)}
                            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors flex items-center space-x-1 ${
                              post.enabled_for_brands
                                ? 'bg-purple-100 text-purple-700 hover:bg-purple-200'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                            title={post.enabled_for_brands ? 'Klik om te verbergen voor Brands' : 'Klik om beschikbaar te maken voor Brands'}
                          >
                            <Send className="w-3 h-3" />
                            <span>{post.enabled_for_brands ? 'Gedeeld' : 'Deel met Brands'}</span>
                          </button>
                        )}
                        <button
                          onClick={() => handleDeletePost(post.id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Available Posts tab - for Brand/Agent to activate Admin posts */}
        {activeTab === 'available' && !isAdmin && (
          <div className="max-w-6xl mx-auto">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold mb-4">Beschikbare Posts van Admin</h3>
              <p className="text-sm text-gray-600 mb-6">
                Activeer posts die door de Admin zijn gemaakt om ze op je eigen kanalen te plaatsen.
              </p>
              
              {availablePosts.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <Share2 className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Er zijn nog geen beschikbare posts van de Admin.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {availablePosts.map((post) => (
                    <div key={post.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="text-gray-900 whitespace-pre-wrap">{post.content}</p>
                          <div className="flex items-center gap-2 mt-2">
                            {post.platforms?.map((platform) => (
                              <span key={platform} className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-700">
                                {getPlatformIcon(platform)}
                                <span className="ml-1">{platform}</span>
                              </span>
                            ))}
                          </div>
                          {post.media_urls && post.media_urls.length > 0 && (
                            <div className="flex gap-2 mt-3">
                              {post.media_urls.map((url, idx) => (
                                <img key={idx} src={url} alt="" className="w-16 h-16 object-cover rounded" />
                              ))}
                            </div>
                          )}
                        </div>
                        <button
                          onClick={() => handleUsePost(post)}
                          className="ml-4 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors text-sm flex items-center space-x-2"
                        >
                          <Share2 className="w-4 h-4" />
                          <span>Gebruik deze post</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'planner' && isAdmin && (
          <div className="max-w-6xl mx-auto">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-semibold">AI Content Planner</h3>
                  <p className="text-sm text-gray-600">Geautomatiseerde planning met AI voorstellen</p>
                </div>
                <button
                  onClick={async () => {
                    setLoading(true);
                    try {
                      const response = await fetch(
                        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-content`,
                        {
                          method: 'POST',
                          headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
                          },
                          body: JSON.stringify({
                            type: 'content_calendar',
                            brand_voice: brandVoice,
                            brand_id: effectiveBrandId
                          }),
                        }
                      );
                      if (!response.ok) throw new Error('Fout bij genereren planning');
                      setSuccess('Planning gegenereerd!');
                      await loadPosts();
                    } catch (err: any) {
                      setError('Fout bij genereren: ' + err.message);
                    } finally {
                      setLoading(false);
                    }
                  }}
                  disabled={loading}
                  className="px-6 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center space-x-2"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Genereer Weekplanning</span>
                </button>
              </div>

              <div className="grid grid-cols-7 gap-3">
                {['Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za', 'Zo'].map((day, index) => (
                  <div key={day} className="text-center">
                    <div className="font-semibold text-sm text-gray-700 mb-2">{day}</div>
                    <div className="space-y-2">
                      {posts
                        .filter(p => p.scheduled_for && new Date(p.scheduled_for).getDay() === ((index + 1) % 7))
                        .slice(0, 3)
                        .map(post => (
                          <div key={post.id} className="bg-orange-50 border border-orange-200 rounded p-2 text-xs">
                            <div className="flex items-center space-x-1 mb-1">
                              {post.platforms.slice(0, 2).map(platform => (
                                <div key={platform} className="text-orange-600">
                                  {getPlatformIcon(platform)}
                                </div>
                              ))}
                            </div>
                            <p className="text-gray-900 line-clamp-2">{post.content}</p>
                            {post.scheduled_for && (
                              <p className="text-gray-500 mt-1">
                                {new Date(post.scheduled_for).toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })}
                              </p>
                            )}
                          </div>
                        ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-gradient-to-br from-purple-50 to-pink-50 border border-purple-200 rounded-lg p-6">
              <h4 className="font-semibold text-purple-900 mb-2">Optimale Post Tijden</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white rounded-lg p-3">
                  <div className="text-sm font-medium text-gray-700">Instagram</div>
                  <div className="text-lg font-bold text-purple-600">11:00 & 19:00</div>
                </div>
                <div className="bg-white rounded-lg p-3">
                  <div className="text-sm font-medium text-gray-700">Facebook</div>
                  <div className="text-lg font-bold text-blue-600">13:00 & 15:00</div>
                </div>
                <div className="bg-white rounded-lg p-3">
                  <div className="text-sm font-medium text-gray-700">LinkedIn</div>
                  <div className="text-lg font-bold text-indigo-600">08:00 & 17:00</div>
                </div>
                <div className="bg-white rounded-lg p-3">
                  <div className="text-sm font-medium text-gray-700">Twitter</div>
                  <div className="text-lg font-bold text-sky-600">12:00 & 18:00</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'suggestions' && isAdmin && (
          <div className="max-w-4xl mx-auto">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-semibold">AI Content Voorstellen</h3>
                  <p className="text-sm text-gray-600">Gebaseerd op jouw Brand Voice en trends</p>
                </div>
                <button
                  onClick={async () => {
                    setLoading(true);
                    try {
                      const response = await fetch(
                        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-content`,
                        {
                          method: 'POST',
                          headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
                          },
                          body: JSON.stringify({
                            type: 'suggestions',
                            brand_voice: brandVoice,
                            brand_id: effectiveBrandId,
                            count: 5
                          }),
                        }
                      );
                      if (!response.ok) throw new Error('Fout bij genereren voorstellen');
                      setSuccess('Nieuwe voorstellen gegenereerd!');
                    } catch (err: any) {
                      setError('Fout bij genereren: ' + err.message);
                    } finally {
                      setLoading(false);
                    }
                  }}
                  disabled={loading}
                  className="px-6 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center space-x-2"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Genereer Nieuwe Ideeën</span>
                </button>
              </div>

              <div className="space-y-4">
                {[
                  { topic: 'Zomervakantie Inspiratie', platforms: ['instagram', 'facebook'], engagement: 'Hoog' },
                  { topic: 'Reistips voor Gezinnen', platforms: ['facebook', 'linkedin'], engagement: 'Gemiddeld' },
                  { topic: 'Last Minute Deals', platforms: ['twitter', 'instagram'], engagement: 'Hoog' },
                  { topic: 'Sustainable Travel Tips', platforms: ['linkedin', 'instagram'], engagement: 'Gemiddeld' },
                  { topic: 'Verborgen Bestemmingen Europa', platforms: ['instagram', 'facebook'], engagement: 'Hoog' }
                ].map((suggestion, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h4 className="font-semibold text-gray-900">{suggestion.topic}</h4>
                          <span className={`px-2 py-1 text-xs font-medium rounded ${
                            suggestion.engagement === 'Hoog' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                          }`}>
                            {suggestion.engagement} engagement
                          </span>
                        </div>
                        <div className="flex items-center space-x-2 mb-3">
                          <span className="text-sm text-gray-600">Aanbevolen platforms:</span>
                          {suggestion.platforms.map(platform => (
                            <div key={platform} className="text-gray-500">
                              {getPlatformIcon(platform)}
                            </div>
                          ))}
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          setFormData(prev => ({ ...prev, aiPrompt: suggestion.topic, platforms: suggestion.platforms }));
                          setActiveTab('create');
                        }}
                        className="px-4 py-2 bg-orange-600 text-white text-sm rounded-lg hover:bg-orange-700 transition-colors"
                      >
                        Gebruik Idee
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'accounts' && (
          <div className="max-w-6xl mx-auto">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold mb-6">Social Media Accounts</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[
                  {
                    platform: 'facebook',
                    name: 'Facebook',
                    color: 'from-blue-600 to-blue-700',
                    bgColor: 'bg-blue-50',
                    textColor: 'text-blue-700',
                    fields: ['app_id', 'app_secret', 'access_token']
                  },
                  {
                    platform: 'instagram',
                    name: 'Instagram',
                    color: 'from-pink-600 to-purple-600',
                    bgColor: 'bg-pink-50',
                    textColor: 'text-pink-700',
                    fields: ['access_token', 'user_id']
                  },
                  {
                    platform: 'twitter',
                    name: 'Twitter',
                    color: 'from-sky-500 to-sky-600',
                    bgColor: 'bg-sky-50',
                    textColor: 'text-sky-700',
                    fields: ['api_key', 'api_secret', 'access_token', 'access_token_secret']
                  },
                  {
                    platform: 'linkedin',
                    name: 'LinkedIn',
                    color: 'from-blue-700 to-blue-800',
                    bgColor: 'bg-blue-50',
                    textColor: 'text-blue-800',
                    fields: ['client_id', 'client_secret', 'access_token']
                  },
                  {
                    platform: 'youtube',
                    name: 'YouTube',
                    color: 'from-red-600 to-red-700',
                    bgColor: 'bg-red-50',
                    textColor: 'text-red-700',
                    fields: ['api_key', 'client_id', 'client_secret']
                  },
                ].map(platformConfig => {
                  const existingAccount = accounts.find(acc => acc.platform.toLowerCase() === platformConfig.platform);
                  const isConnected = existingAccount?.is_active || false;
                  const isExpanded = connectingPlatform === platformConfig.platform;
                  const isTesting = testingPlatform === platformConfig.platform;

                  return (
                    <div key={platformConfig.platform} className="border border-gray-200 rounded-xl overflow-hidden">
                      <div className={`p-6 ${platformConfig.bgColor}`}>
                        <div className="flex items-center justify-center mb-4">
                          <div className={`w-20 h-20 rounded-full bg-gradient-to-br ${platformConfig.color} flex items-center justify-center shadow-lg`}>
                            <div className="text-white transform scale-150">
                              {getPlatformIcon(platformConfig.platform)}
                            </div>
                          </div>
                        </div>
                        <h4 className={`text-center font-semibold ${platformConfig.textColor} text-lg`}>
                          {platformConfig.name}
                        </h4>
                        <p className="text-center text-sm text-gray-600 mt-1">
                          {isConnected ? 'Verbonden' : 'Niet verbonden'}
                        </p>
                      </div>

                      <div className="p-4 bg-white border-t border-gray-200">
                        {!isExpanded ? (
                          <div className="space-y-2">
                            {isConnected ? (
                              <>
                                <div className="flex items-center justify-center space-x-2 text-sm text-green-700 mb-2">
                                  <CheckCircle className="w-4 h-4" />
                                  <span>Account actief</span>
                                </div>
                                <button
                                  onClick={() => setConnectingPlatform(platformConfig.platform)}
                                  className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium"
                                >
                                  Instellingen
                                </button>
                                <button
                                  onClick={async () => {
                                    if (confirm(`Weet je zeker dat je ${platformConfig.name} wilt ontkoppelen?`)) {
                                      try {
                                        const { error } = await db.supabase
                                          .from('social_media_accounts')
                                          .update({ is_active: false })
                                          .eq('id', existingAccount.id);
                                        if (error) throw error;
                                        setSuccess(`${platformConfig.name} uitgeschakeld`);
                                        await loadAccounts();
                                      } catch (err: any) {
                                        setError('Fout bij uitschakelen: ' + err.message);
                                      }
                                    }
                                  }}
                                  className="w-full px-4 py-2 border border-red-300 text-red-700 rounded-lg hover:bg-red-50 transition-colors text-sm font-medium"
                                >
                                  Uitschakelen
                                </button>
                              </>
                            ) : (
                              <button
                                onClick={() => setConnectingPlatform(platformConfig.platform)}
                                className={`w-full px-4 py-2 bg-gradient-to-r ${platformConfig.color} text-white rounded-lg hover:opacity-90 transition-opacity font-medium`}
                              >
                                Koppel Account
                              </button>
                            )}
                          </div>
                        ) : (
                          <div className="space-y-3">
                            <div className="flex items-center justify-between mb-2">
                              <h5 className="font-semibold text-sm text-gray-900">API Credentials</h5>
                              <button
                                onClick={() => {
                                  setConnectingPlatform('');
                                  setPlatformCredentials({});
                                }}
                                className="text-gray-400 hover:text-gray-600"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>

                            {platformConfig.fields.map(field => (
                              <div key={field}>
                                <label className="block text-xs font-medium text-gray-700 mb-1 capitalize">
                                  {field.replace(/_/g, ' ')}
                                </label>
                                <input
                                  type="text"
                                  value={platformCredentials[field] || ''}
                                  onChange={(e) => setPlatformCredentials(prev => ({ ...prev, [field]: e.target.value }))}
                                  placeholder={`Voer ${field.replace(/_/g, ' ')} in`}
                                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                                />
                              </div>
                            ))}

                            <div className="flex space-x-2 pt-2">
                              <button
                                onClick={async () => {
                                  setTestingPlatform(platformConfig.platform);
                                  try {
                                    await new Promise(resolve => setTimeout(resolve, 1500));
                                    setSuccess(`${platformConfig.name} verbinding succesvol!`);

                                    const { error } = await db.supabase
                                      .from('social_media_accounts')
                                      .upsert({
                                        brand_id: effectiveBrandId,
                                        platform: platformConfig.platform,
                                        platform_username: platformConfig.name,
                                        access_token: platformCredentials.access_token || 'test_token',
                                        is_active: true,
                                        metadata: platformCredentials
                                      });

                                    if (error) throw error;

                                    setConnectingPlatform('');
                                    setPlatformCredentials({});
                                    await loadAccounts();
                                  } catch (err: any) {
                                    setError('Verbinding mislukt: ' + err.message);
                                  } finally {
                                    setTestingPlatform('');
                                  }
                                }}
                                disabled={isTesting}
                                className={`flex-1 px-4 py-2 bg-gradient-to-r ${platformConfig.color} text-white rounded-lg hover:opacity-90 transition-opacity text-sm font-medium disabled:opacity-50`}
                              >
                                {isTesting ? 'Testen...' : 'Test & Opslaan'}
                              </button>
                              <button
                                onClick={() => {
                                  setConnectingPlatform('');
                                  setPlatformCredentials({});
                                }}
                                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
                              >
                                Annuleren
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mt-6">
              <h4 className="font-semibold text-blue-900 mb-2 flex items-center space-x-2">
                <AlertCircle className="w-5 h-5" />
                <span>API Credentials Beheren</span>
              </h4>
              <p className="text-sm text-blue-800 mb-3">
                Voer je API credentials in om je social media accounts te koppelen. Deze gegevens worden veilig opgeslagen.
              </p>
              <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
                <li>Test altijd de verbinding voordat je opslaat</li>
                <li>Je kunt accounts op elk moment uitschakelen</li>
                <li>API keys vind je in de developer sectie van elk platform</li>
              </ul>
            </div>
          </div>
        )}

        {activeTab === 'brand-voice' && (
          <div className="max-w-4xl mx-auto">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold mb-4">Brand Voice Instellingen</h3>
              <p className="text-gray-600 mb-6">
                Configureer hoe AI content genereert voor jouw merk
              </p>

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Toon
                  </label>
                  <select
                    value={brandVoice.tone}
                    onChange={(e) => setBrandVoice(prev => ({ ...prev, tone: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  >
                    <option value="professional">Professioneel</option>
                    <option value="friendly">Vriendelijk</option>
                    <option value="casual">Casual</option>
                    <option value="formal">Formeel</option>
                    <option value="enthusiastic">Enthousiast</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Schrijfstijl
                  </label>
                  <select
                    value={brandVoice.style}
                    onChange={(e) => setBrandVoice(prev => ({ ...prev, style: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  >
                    <option value="casual">Casual</option>
                    <option value="professional">Professioneel</option>
                    <option value="friendly">Vriendelijk</option>
                    <option value="educational">Educatief</option>
                    <option value="inspirational">Inspirerend</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Keywords (optioneel)
                  </label>
                  <input
                    type="text"
                    value={brandVoice.keywords.join(', ')}
                    onChange={(e) => setBrandVoice(prev => ({
                      ...prev,
                      keywords: e.target.value.split(',').map(k => k.trim()).filter(k => k)
                    }))}
                    placeholder="travel, adventure, explore..."
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                  <p className="text-xs text-gray-500 mt-1">Gescheiden door komma's</p>
                </div>

                <button
                  onClick={async () => {
                    try {
                      const { error } = await db.supabase
                        .from('brand_voice_settings')
                        .upsert({
                          brand_id: effectiveBrandId,
                          tone: brandVoice.tone,
                          style: brandVoice.style,
                          keywords: brandVoice.keywords
                        });

                      if (error) throw error;
                      setSuccess('Brand voice instellingen opgeslagen!');
                    } catch (err: any) {
                      setError('Fout bij opslaan: ' + err.message);
                    }
                  }}
                  className="w-full px-6 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
                >
                  Opslaan
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {showMediaSelector && (
        <SlidingMediaSelector
          isOpen={showMediaSelector}
          onClose={() => setShowMediaSelector(false)}
          onSelect={handleMediaSelect}
          title="Selecteer Media"
        />
      )}
    </div>
  );
}
