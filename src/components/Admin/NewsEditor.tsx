import React, { useState, useEffect } from 'react';
import { X, Save, Image as ImageIcon, Tag as TagIcon } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

interface NewsItem {
  id: string;
  title: string;
  slug: string;
  content: any;
  excerpt: string;
  featured_image: string;
  status: 'draft' | 'published';
  tags: string[];
  author_type: string;
  author_id: string;
  is_mandatory: boolean;
  enabled_for_brands: boolean;
  enabled_for_franchise: boolean;
}

interface NewsEditorProps {
  newsItem?: NewsItem | null;
  newsId?: string;
  onClose?: () => void;
  onSave: () => void;
  onCancel?: () => void;
  mode?: 'admin' | 'brand';
  inline?: boolean;
}

export function NewsEditor({ newsItem: propNewsItem, newsId, onClose, onSave, onCancel, mode = 'admin', inline = false }: NewsEditorProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [newsItem, setNewsItem] = useState<NewsItem | null>(propNewsItem || null);
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [excerpt, setExcerpt] = useState('');
  const [content, setContent] = useState('');
  const [featuredImage, setFeaturedImage] = useState('');
  const [status, setStatus] = useState<'draft' | 'published'>('draft');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [isMandatory, setIsMandatory] = useState(false);
  const [enabledForBrands, setEnabledForBrands] = useState(false);
  const [enabledForFranchise, setEnabledForFranchise] = useState(false);

  const SYSTEM_BRAND_ID = '00000000-0000-0000-0000-000000000999';

  useEffect(() => {
    if (newsId && !newsItem) {
      loadNewsItem();
    }
  }, [newsId]);

  const loadNewsItem = async () => {
    if (!newsId) return;

    try {
      const { data, error } = await supabase
        .from('news_items')
        .select('*')
        .eq('id', newsId)
        .single();

      if (error) throw error;
      setNewsItem(data);
    } catch (error) {
      console.error('Error loading news item:', error);
      alert('Kon nieuwsbericht niet laden');
    }
  };

  useEffect(() => {
    if (newsItem) {
      setTitle(newsItem.title || '');
      setSlug(newsItem.slug || '');
      setExcerpt(newsItem.excerpt || '');
      setContent(typeof newsItem.content === 'string' ? newsItem.content : newsItem.content?.html || '');
      setFeaturedImage(newsItem.featured_image || '');
      setStatus(newsItem.status || 'draft');
      setTags(newsItem.tags || []);
      setIsMandatory(newsItem.is_mandatory || false);
      setEnabledForBrands(newsItem.enabled_for_brands || false);
      setEnabledForFranchise(newsItem.enabled_for_franchise || false);
    }
  }, [newsItem]);

  const generateSlug = (text: string) => {
    return text
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  };

  const handleTitleChange = (value: string) => {
    setTitle(value);
    if (!newsItem) {
      setSlug(generateSlug(value));
    }
  };

  const handleAddTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()]);
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTag();
    }
  };

  const handleSave = async () => {
    if (!title.trim()) {
      alert('Titel is verplicht');
      return;
    }

    if (!slug.trim()) {
      alert('Slug is verplicht');
      return;
    }

    setLoading(true);

    try {
      const newsData: any = {
        title: title.trim(),
        slug: slug.trim(),
        excerpt: excerpt.trim(),
        content: { html: content.trim() },
        featured_image: featuredImage.trim(),
        status,
        tags,
        author_type: mode === 'brand' ? 'brand' : 'admin',
        author_id: user?.id,
        brand_id: mode === 'brand' ? user?.brand_id : SYSTEM_BRAND_ID,
        published_at: status === 'published' ? new Date().toISOString() : null
      };

      if (mode === 'admin') {
        newsData.is_mandatory = isMandatory;
        newsData.enabled_for_brands = enabledForBrands;
        newsData.enabled_for_franchise = enabledForFranchise;
      }

      if (newsItem?.id || newsId) {
        const { error } = await supabase
          .from('news_items')
          .update(newsData)
          .eq('id', newsItem?.id || newsId);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('news_items')
          .insert([newsData]);

        if (error) throw error;
      }

      onSave();
      if (onClose) onClose();
      if (onCancel) onCancel();
    } catch (error: any) {
      console.error('Error saving news:', error);
      alert(`Fout bij opslaan: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (onClose) onClose();
    if (onCancel) onCancel();
  };

  const editorContent = (
    <div className={inline ? "bg-white rounded-lg shadow-sm border border-gray-200 flex flex-col" : "bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col"}>
      <div className="flex items-center justify-between px-6 py-4 border-b">
        <h2 className="text-xl font-bold text-gray-900">
          {newsItem || newsId ? 'Nieuwsbericht Bewerken' : 'Nieuw Nieuwsbericht'}
        </h2>
        {!inline && (
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        )}
      </div>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Titel *
              </label>
              <input
                type="text"
                value={title}
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
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
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
                value={excerpt}
                onChange={(e) => setExcerpt(e.target.value)}
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
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={10}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent font-mono text-sm"
                placeholder="Artikel inhoud (HTML wordt ondersteund)"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <div className="flex items-center gap-2">
                  <ImageIcon className="w-4 h-4" />
                  Uitgelichte Afbeelding URL
                </div>
              </label>
              <input
                type="text"
                value={featuredImage}
                onChange={(e) => setFeaturedImage(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                placeholder="https://example.com/image.jpg"
              />
              {featuredImage && (
                <div className="mt-2">
                  <img
                    src={featuredImage}
                    alt="Preview"
                    className="w-full max-w-md h-48 object-cover rounded-lg"
                    onError={(e) => {
                      e.currentTarget.src = '';
                      e.currentTarget.alt = 'Afbeelding kon niet worden geladen';
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
                  onKeyPress={handleKeyPress}
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
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {tags.map((tag, index) => (
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
                value={status}
                onChange={(e) => setStatus(e.target.value as 'draft' | 'published')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              >
                <option value="draft">Concept</option>
                <option value="published">Gepubliceerd</option>
              </select>
            </div>

            {mode === 'admin' && (
              <div className="space-y-3 pt-4 border-t">
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={isMandatory}
                    onChange={(e) => setIsMandatory(e.target.checked)}
                    className="w-4 h-4 text-orange-600 border-gray-300 rounded focus:ring-orange-500"
                  />
                  <span className="text-sm font-medium text-gray-700">
                    Verplicht voor alle merken
                  </span>
                </label>

                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={enabledForBrands}
                    onChange={(e) => setEnabledForBrands(e.target.checked)}
                    className="w-4 h-4 text-orange-600 border-gray-300 rounded focus:ring-orange-500"
                  />
                  <span className="text-sm font-medium text-gray-700">
                    Beschikbaar voor custom merken
                  </span>
                </label>

                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={enabledForFranchise}
                    onChange={(e) => setEnabledForFranchise(e.target.checked)}
                    className="w-4 h-4 text-orange-600 border-gray-300 rounded focus:ring-orange-500"
                  />
                  <span className="text-sm font-medium text-gray-700">
                    Beschikbaar voor franchise merken
                  </span>
                </label>
              </div>
            )}
          </div>
        </div>

      <div className="flex items-center justify-end gap-3 px-6 py-4 border-t bg-gray-50">
        <button
          onClick={handleClose}
          className="px-4 py-2 text-gray-700 hover:text-gray-900 transition-colors"
          disabled={loading}
        >
          Annuleren
        </button>
        <button
          onClick={handleSave}
          disabled={loading}
          className="flex items-center gap-2 px-6 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Save className="w-4 h-4" />
          {loading ? 'Opslaan...' : 'Opslaan'}
        </button>
      </div>
    </div>
  );

  if (inline) {
    return editorContent;
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      {editorContent}
    </div>
  );
}
