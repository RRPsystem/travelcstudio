import React, { useState, useEffect } from 'react';
import { Newspaper, Plus, Edit2, Trash2, Eye, ArrowLeft, Save, Image as ImageIcon, X, Tag as TagIcon } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { SlidingMediaSelector } from '../shared/SlidingMediaSelector';

interface NewsItem {
  id: string;
  title: string;
  slug: string;
  created_at: string;
  published_at?: string;
  enabled_for_brands: boolean;
  enabled_for_franchise: boolean;
  is_mandatory: boolean;
  tags: string[];
  content: any;
  excerpt: string;
  closing_text?: string;
  featured_image: string;
  status: 'draft' | 'published';
  author_type: string;
  author_id: string;
}

interface Brand {
  id: string;
  name: string;
  business_type: 'franchise' | 'custom';
  website_url?: string;
  wordpress_url?: string;
}

interface NewsAssignment {
  news_id: string;
  brand_id: string;
  status: string;
}

type ViewMode = 'list' | 'create' | 'edit';

const SYSTEM_BRAND_ID = '00000000-0000-0000-0000-000000000999';

const emptyFormData = {
  title: '',
  slug: '',
  excerpt: '',
  content: '',
  closing_text: '',
  featured_image: '',
  status: 'draft' as 'draft' | 'published',
  tags: [] as string[],
  is_mandatory: false,
  enabled_for_brands: false,
  enabled_for_franchise: false
};

export function NewsManagement() {
  const { user } = useAuth();
  const [newsItems, setNewsItems] = useState<NewsItem[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [assignments, setAssignments] = useState<NewsAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [editingNews, setEditingNews] = useState<NewsItem | null>(null);
  const [saving, setSaving] = useState(false);
  const [showMediaSelector, setShowMediaSelector] = useState(false);
  const [formData, setFormData] = useState(emptyFormData);
  const [tagInput, setTagInput] = useState('');

  useEffect(() => {
    loadNewsItems();
    loadBrands();
    loadAssignments();
  }, []);

  const loadNewsItems = async () => {
    try {
      const { data, error } = await supabase
        .from('news_items')
        .select('*')
        .eq('author_type', 'admin')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setNewsItems(data || []);
    } catch (error) {
      console.error('Error loading news:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadBrands = async () => {
    try {
      const { data, error } = await supabase
        .from('brands')
        .select('id, name, business_type, website_url, wordpress_url')
        .order('name');

      if (error) throw error;
      setBrands(data || []);
    } catch (error) {
      console.error('Error loading brands:', error);
    }
  };

  const loadAssignments = async () => {
    try {
      const { data, error } = await supabase
        .from('news_brand_assignments')
        .select('news_id, brand_id, status')
        .in('status', ['accepted', 'mandatory']);

      if (error) throw error;
      setAssignments(data || []);
    } catch (error) {
      console.error('Error loading assignments:', error);
    }
  };

  const getPreviewUrl = (newsSlug: string, newsId: string) => {
    const newsAssignments = assignments.filter(a => a.news_id === newsId);
    for (const assignment of newsAssignments) {
      const brand = brands.find(b => b.id === assignment.brand_id);
      const siteUrl = brand?.wordpress_url || brand?.website_url;
      if (siteUrl) {
        return `${siteUrl.replace(/\/$/, '')}/nieuws/${newsSlug}/`;
      }
    }
    return null;
  };

  const generateSlug = (text: string) => {
    return text
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  };

  const handleCreateNews = () => {
    setFormData(emptyFormData);
    setEditingNews(null);
    setViewMode('create');
  };

  const handleEditNews = (news: NewsItem) => {
    setEditingNews(news);
    setFormData({
      title: news.title || '',
      slug: news.slug || '',
      excerpt: news.excerpt || '',
      content: typeof news.content === 'string' ? news.content : news.content?.html || '',
      closing_text: news.closing_text || '',
      featured_image: news.featured_image || '',
      status: news.status || 'draft',
      tags: news.tags || [],
      is_mandatory: news.is_mandatory || false,
      enabled_for_brands: news.enabled_for_brands || false,
      enabled_for_franchise: news.enabled_for_franchise || false
    });
    setViewMode('edit');
  };

  const handleCancel = () => {
    setViewMode('list');
    setEditingNews(null);
    setFormData(emptyFormData);
  };

  const handleTitleChange = (value: string) => {
    setFormData(prev => ({
      ...prev,
      title: value,
      slug: editingNews ? prev.slug : generateSlug(value)
    }));
  };

  const handleAddTag = () => {
    if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, tagInput.trim()]
      }));
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  const handleSave = async () => {
    if (!formData.title.trim()) {
      alert('Titel is verplicht');
      return;
    }

    if (!formData.slug.trim()) {
      alert('Slug is verplicht');
      return;
    }

    setSaving(true);

    try {
      const newsData: any = {
        title: formData.title.trim(),
        slug: formData.slug.trim(),
        excerpt: formData.excerpt.trim(),
        content: { html: formData.content.trim() },
        closing_text: formData.closing_text.trim(),
        featured_image: formData.featured_image.trim(),
        status: formData.status,
        tags: formData.tags,
        is_mandatory: formData.is_mandatory,
        enabled_for_brands: formData.enabled_for_brands,
        enabled_for_franchise: formData.enabled_for_franchise,
        author_type: 'admin',
        author_id: user?.id,
        brand_id: SYSTEM_BRAND_ID,
        published_at: formData.status === 'published' ? new Date().toISOString() : null
      };

      if (editingNews?.id) {
        const { error } = await supabase
          .from('news_items')
          .update(newsData)
          .eq('id', editingNews.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('news_items')
          .insert([newsData]);

        if (error) throw error;
      }

      await loadNewsItems();
      setViewMode('list');
      setEditingNews(null);
      setFormData(emptyFormData);
    } catch (error: any) {
      console.error('Error saving news:', error);
      alert(`Fout bij opslaan: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Weet je zeker dat je dit nieuwsbericht wilt verwijderen?')) return;

    try {
      const { error } = await supabase
        .from('news_items')
        .delete()
        .eq('id', id);

      if (error) throw error;
      loadNewsItems();
    } catch (error) {
      console.error('Error deleting news:', error);
      alert('Failed to delete news item');
    }
  };

  const handleMediaSelect = (url: string) => {
    setFormData(prev => ({ ...prev, featured_image: url }));
    setShowMediaSelector(false);
  };

  if (loading) {
    return <div className="p-8">Loading...</div>;
  }

  // CREATE/EDIT VIEW
  if (viewMode === 'create' || viewMode === 'edit') {
    return (
      <div className="p-8">
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={handleCancel}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="w-5 h-5" />
            Terug naar overzicht
          </button>
        </div>

        <div className="flex items-center gap-3 mb-6">
          <Newspaper className="w-8 h-8 text-orange-600" />
          <h1 className="text-2xl font-bold">
            {viewMode === 'edit' ? 'Nieuwsbericht Bewerken' : 'Nieuw Nieuwsbericht'}
          </h1>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Column */}
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Titel *
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => handleTitleChange(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  placeholder="Voer een titel in"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Slug *
                </label>
                <input
                  type="text"
                  value={formData.slug}
                  onChange={(e) => setFormData(prev => ({ ...prev, slug: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  placeholder="url-vriendelijke-naam"
                />
                <p className="mt-1 text-sm text-gray-500">
                  Wordt automatisch gegenereerd op basis van de titel
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Samenvatting
                </label>
                <textarea
                  value={formData.excerpt}
                  onChange={(e) => setFormData(prev => ({ ...prev, excerpt: e.target.value }))}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  placeholder="Korte samenvatting van het artikel"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Inhoud
                </label>
                <textarea
                  value={formData.content}
                  onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                  rows={12}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent font-mono text-sm"
                  placeholder="Artikel inhoud (HTML wordt ondersteund)"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Slottekst
                </label>
                <textarea
                  value={formData.closing_text}
                  onChange={(e) => setFormData(prev => ({ ...prev, closing_text: e.target.value }))}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  placeholder="Afsluitende tekst voor het artikel"
                />
              </div>
            </div>

            {/* Right Column */}
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <div className="flex items-center gap-2">
                    <ImageIcon className="w-4 h-4" />
                    Uitgelichte Afbeelding
                  </div>
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={formData.featured_image}
                    onChange={(e) => setFormData(prev => ({ ...prev, featured_image: e.target.value }))}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    placeholder="https://example.com/image.jpg"
                  />
                  <button
                    type="button"
                    onClick={() => setShowMediaSelector(true)}
                    className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors flex items-center gap-2"
                  >
                    <ImageIcon className="w-4 h-4" />
                    Kies Media
                  </button>
                </div>
                {formData.featured_image && (
                  <div className="mt-2">
                    <img
                      src={formData.featured_image}
                      alt="Preview"
                      className="w-full max-w-md h-48 object-cover rounded-lg"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <div className="flex items-center gap-2">
                    <TagIcon className="w-4 h-4" />
                    Tags
                  </div>
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    placeholder="Voeg een tag toe en druk op Enter"
                  />
                  <button
                    type="button"
                    onClick={handleAddTag}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    Toevoegen
                  </button>
                </div>
                {formData.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {formData.tags.map((tag, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                      >
                        {tag}
                        <button
                          type="button"
                          onClick={() => handleRemoveTag(tag)}
                          className="hover:text-blue-900"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value as 'draft' | 'published' }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                >
                  <option value="draft">Concept</option>
                  <option value="published">Gepubliceerd</option>
                </select>
              </div>

              <div className="space-y-3 pt-4 border-t">
                <h3 className="font-medium text-gray-900">Beschikbaarheid</h3>
                
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={formData.enabled_for_brands}
                    onChange={(e) => setFormData(prev => ({ ...prev, enabled_for_brands: e.target.checked }))}
                    className="w-4 h-4 text-orange-600 border-gray-300 rounded focus:ring-orange-500"
                  />
                  <span className="text-sm text-gray-700">
                    Beschikbaar voor custom merken
                  </span>
                </label>

                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={formData.enabled_for_franchise}
                    onChange={(e) => setFormData(prev => ({ ...prev, enabled_for_franchise: e.target.checked }))}
                    className="w-4 h-4 text-orange-600 border-gray-300 rounded focus:ring-orange-500"
                  />
                  <span className="text-sm text-gray-700">
                    Beschikbaar voor franchise merken
                  </span>
                </label>

                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={formData.is_mandatory}
                    onChange={(e) => setFormData(prev => ({ ...prev, is_mandatory: e.target.checked }))}
                    className="w-4 h-4 text-orange-600 border-gray-300 rounded focus:ring-orange-500"
                  />
                  <span className="text-sm font-medium text-gray-700">
                    Verplicht voor alle merken
                  </span>
                </label>
              </div>
            </div>
          </div>

          {/* Save Button */}
          <div className="flex items-center justify-end gap-3 mt-8 pt-6 border-t">
            <button
              onClick={handleCancel}
              className="px-4 py-2 text-gray-700 hover:text-gray-900 transition-colors"
              disabled={saving}
            >
              Annuleren
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-6 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Opslaan...' : 'Opslaan'}
            </button>
          </div>
        </div>

        {showMediaSelector && (
          <SlidingMediaSelector
            isOpen={showMediaSelector}
            onClose={() => setShowMediaSelector(false)}
            onSelect={handleMediaSelect}
            title="Selecteer Uitgelichte Afbeelding"
          />
        )}
      </div>
    );
  }

  // LIST VIEW
  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Newspaper className="w-8 h-8 text-orange-600" />
          <h1 className="text-2xl font-bold">Nieuwsbeheer</h1>
        </div>
        <button
          onClick={handleCreateNews}
          className="flex items-center gap-2 bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700"
        >
          <Plus className="w-5 h-5" />
          Nieuw Bericht
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Titel</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tags</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Datum</th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Acties</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {newsItems.map((item) => {
              const previewUrl = getPreviewUrl(item.slug, item.id);
              return (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="font-medium text-gray-900">{item.title}</div>
                    <div className="text-sm text-gray-500">/{item.slug}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-1">
                      {item.tags && item.tags.length > 0 ? (
                        item.tags.slice(0, 3).map((tag, index) => (
                          <span
                            key={index}
                            className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                          >
                            {tag}
                          </span>
                        ))
                      ) : (
                        <span className="text-sm text-gray-400 italic">Geen tags</span>
                      )}
                      {item.tags && item.tags.length > 3 && (
                        <span className="text-xs text-gray-500">+{item.tags.length - 3}</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      item.status === 'published' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {item.status === 'published' ? 'Gepubliceerd' : 'Concept'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {new Date(item.created_at).toLocaleDateString('nl-NL')}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-center gap-2">
                      {previewUrl && (
                        <a
                          href={previewUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800"
                          title="Bekijk op website"
                        >
                          <Eye className="w-4 h-4" />
                        </a>
                      )}
                      <button
                        onClick={() => handleEditNews(item)}
                        className="text-orange-600 hover:text-orange-800"
                        title="Bewerken"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="text-red-600 hover:text-red-800"
                        title="Verwijderen"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {newsItems.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            Nog geen nieuwsberichten. Maak je eerste bericht aan!
          </div>
        )}
      </div>
    </div>
  );
}
