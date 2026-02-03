import React, { useState, useEffect } from 'react';
import { Newspaper, Plus, Edit2, Trash2, Eye, ArrowLeft, Save, Image as ImageIcon, X, Tag as TagIcon, Sparkles, Calendar, Lightbulb, RefreshCw, Clock } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { SlidingMediaSelector } from '../shared/SlidingMediaSelector';
import { edgeAIService } from '../../lib/apiServices';

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

type ViewMode = 'list' | 'create' | 'edit' | 'planning';

const NEWS_CATEGORIES = [
  { id: 'bestemmingen', name: 'Bestemmingen', icon: '🌍', color: 'bg-blue-100 text-blue-800' },
  { id: 'reistips', name: 'Reistips', icon: '💡', color: 'bg-yellow-100 text-yellow-800' },
  { id: 'seizoenen', name: 'Seizoenen', icon: '🌸', color: 'bg-pink-100 text-pink-800' },
  { id: 'events', name: 'Events & Festivals', icon: '🎉', color: 'bg-purple-100 text-purple-800' },
  { id: 'praktisch', name: 'Praktische Info', icon: '📋', color: 'bg-gray-100 text-gray-800' },
  { id: 'inspiratie', name: 'Inspiratie', icon: '✨', color: 'bg-orange-100 text-orange-800' },
  { id: 'leveranciers', name: 'Leveranciers', icon: '🤝', color: 'bg-teal-100 text-teal-800' },
];

interface AISuggestion {
  category: string;
  topic: string;
  reason: string;
  urgency: 'high' | 'medium' | 'low';
}

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
  const [generatingAI, setGeneratingAI] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<AISuggestion[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('');

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

  // AI Content Generation
  const generateAIContent = async (topic: string) => {
    if (!topic.trim()) {
      alert('Voer eerst een onderwerp in');
      return;
    }

    setGeneratingAI(true);
    try {
      const userPrompt = `Je bent een professionele reisredacteur die boeiende nieuwsartikelen schrijft voor een reiswebsite.

BELANGRIJKE REGELS:
- Schrijf ALLEEN feitelijk correcte informatie. Verzin GEEN feiten, cijfers, namen of locaties.
- Als je iets niet zeker weet, geef dan algemene informatie of laat het weg.
- Gebruik geen specifieke prijzen, data of statistieken tenzij je zeker bent dat ze kloppen.
- Noem geen specifieke hotels, restaurants of bedrijven tenzij het algemeen bekende ketens zijn.
- Focus op tijdloze, evergreen content die niet snel veroudert.

SCHRIJFSTIJL:
- Schrijf in het Nederlands, in een vriendelijke maar professionele toon.
- Maak de tekst informatief en inspirerend voor reizigers.
- Gebruik korte alinea's en duidelijke structuur.
- Geef praktische tips die altijd geldig zijn.

Schrijf een compleet nieuwsartikel over: "${topic}"

Geef het antwoord in het volgende JSON formaat:
{
  "title": "Pakkende titel",
  "excerpt": "Korte samenvatting van 1-2 zinnen",
  "content": "Volledige artikel inhoud met meerdere alinea's",
  "tags": ["tag1", "tag2", "tag3"],
  "closing_text": "Afsluitende call-to-action"
}

Alleen JSON, geen andere tekst.`;

      const response = await edgeAIService.generateContent(
        'planning', // Use 'planning' type to get raw text response
        userPrompt,
        'professional'
      );

      console.log('AI Response:', response, typeof response);
      
      // Parse JSON response - handle both string and object responses
      let responseText = response;
      if (typeof response === 'object') {
        responseText = JSON.stringify(response);
      }
      if (!responseText) {
        throw new Error('Geen geldige response van AI ontvangen');
      }
      
      const jsonMatch = String(responseText).match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const generated = JSON.parse(jsonMatch[0]);
        setFormData(prev => ({
          ...prev,
          title: generated.title || prev.title,
          excerpt: generated.excerpt || prev.excerpt,
          content: generated.content || prev.content,
          closing_text: generated.closing_text || prev.closing_text,
          tags: generated.tags || prev.tags,
          slug: prev.slug || generateSlug(generated.title || topic)
        }));
      } else {
        throw new Error('Kon geen JSON vinden in AI response');
      }
    } catch (error: any) {
      console.error('AI generation error:', error);
      alert(`Fout bij AI generatie: ${error.message}`);
    } finally {
      setGeneratingAI(false);
    }
  };

  // AI Topic Suggestions
  const loadAISuggestions = async () => {
    setLoadingSuggestions(true);
    try {
      // Analyze existing news to find gaps
      const categoryStats = NEWS_CATEGORIES.map(cat => {
        const catNews = newsItems.filter(n => 
          n.tags?.some(t => t.toLowerCase().includes(cat.id.toLowerCase()))
        );
        const lastPost = catNews.length > 0 
          ? new Date(Math.max(...catNews.map(n => new Date(n.created_at).getTime())))
          : null;
        const daysSince = lastPost 
          ? Math.floor((Date.now() - lastPost.getTime()) / (1000 * 60 * 60 * 24))
          : 999;
        
        return { ...cat, count: catNews.length, daysSince, lastPost };
      });

      // Sort by days since last post
      categoryStats.sort((a, b) => b.daysSince - a.daysSince);

      const currentMonth = new Date().toLocaleString('nl-NL', { month: 'long' });
      const currentSeason = getSeason();
      
      const prompt = `Je bent een content planner voor een reiswebsite. 
Analyseer deze categorieën en geef 3 concrete artikel suggesties:

Categorieën (dagen sinds laatste post):
${categoryStats.map(c => `- ${c.name}: ${c.daysSince} dagen geleden (${c.count} artikelen totaal)`).join('\n')}

Het is nu ${currentMonth} (${currentSeason}).

Geef 3 suggesties in JSON formaat:
[
  {"category": "categorie_id", "topic": "Concreet artikel onderwerp", "reason": "Waarom nu", "urgency": "high/medium/low"}
]

Alleen JSON array, geen andere tekst.`;

      const response = await edgeAIService.generateContent(
        'planning', // Use 'planning' type to get raw text response
        prompt,
        'professional'
      );

      console.log('AI Suggestions Response:', response, typeof response);
      
      let responseText = response;
      if (typeof response === 'object') {
        responseText = JSON.stringify(response);
      }
      if (!responseText) {
        throw new Error('Geen geldige response van AI ontvangen');
      }
      const jsonMatch = String(responseText).match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const suggestions = JSON.parse(jsonMatch[0]);
        setAiSuggestions(suggestions);
      }
    } catch (error: any) {
      console.error('AI suggestions error:', error);
      // Fallback suggestions
      setAiSuggestions([
        { category: 'seizoenen', topic: 'Beste bestemmingen voor dit seizoen', reason: 'Seizoensgebonden content', urgency: 'high' as const },
        { category: 'reistips', topic: 'Handige inpaktips voor je volgende reis', reason: 'Evergreen content', urgency: 'medium' as const },
        { category: 'inspiratie', topic: 'Verborgen parels in Europa', reason: 'Inspirerende content', urgency: 'low' as const }
      ]);
    } finally {
      setLoadingSuggestions(false);
    }
  };

  const getSeason = () => {
    const month = new Date().getMonth();
    if (month >= 2 && month <= 4) return 'lente';
    if (month >= 5 && month <= 7) return 'zomer';
    if (month >= 8 && month <= 10) return 'herfst';
    return 'winter';
  };

  const handleUseSuggestion = (suggestion: AISuggestion) => {
    setSelectedCategory(suggestion.category);
    setFormData({
      ...emptyFormData,
      tags: [suggestion.category]
    });
    setViewMode('create');
    // Auto-generate content for the suggestion
    setTimeout(() => generateAIContent(suggestion.topic), 100);
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

        {/* AI Assistant Panel */}
        <div className="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-lg p-4 mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-5 h-5 text-purple-600" />
            <h3 className="font-medium text-purple-900">AI Nieuws Assistent</h3>
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Beschrijf het onderwerp (bijv. 'Beste stranden in Griekenland')"
              className="flex-1 px-3 py-2 border border-purple-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white"
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  generateAIContent((e.target as HTMLInputElement).value);
                }
              }}
              id="ai-topic-input"
            />
            <button
              onClick={() => {
                const input = document.getElementById('ai-topic-input') as HTMLInputElement;
                generateAIContent(input?.value || formData.title);
              }}
              disabled={generatingAI}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
            >
              {generatingAI ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Genereren...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Genereer met AI
                </>
              )}
            </button>
          </div>
          <p className="text-xs text-purple-600 mt-2">
            Voer een onderwerp in en laat AI een compleet artikel genereren
          </p>
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

  // PLANNING VIEW
  if (viewMode === 'planning') {
    return (
      <div className="p-8">
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => setViewMode('list')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="w-5 h-5" />
            Terug naar overzicht
          </button>
        </div>

        <div className="flex items-center gap-3 mb-6">
          <Calendar className="w-8 h-8 text-purple-600" />
          <h1 className="text-2xl font-bold">Content Planning</h1>
        </div>

        {/* Category Overview */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
          {NEWS_CATEGORIES.map(cat => {
            const catNews = newsItems.filter(n => 
              n.tags?.some(t => t.toLowerCase().includes(cat.id.toLowerCase()))
            );
            const lastPost = catNews.length > 0 
              ? new Date(Math.max(...catNews.map(n => new Date(n.created_at).getTime())))
              : null;
            const daysSince = lastPost 
              ? Math.floor((Date.now() - lastPost.getTime()) / (1000 * 60 * 60 * 24))
              : null;
            
            return (
              <div 
                key={cat.id}
                className={`p-4 rounded-lg border-2 ${
                  daysSince && daysSince > 30 ? 'border-red-300 bg-red-50' :
                  daysSince && daysSince > 14 ? 'border-yellow-300 bg-yellow-50' :
                  'border-gray-200 bg-white'
                }`}
              >
                <div className="text-2xl mb-1">{cat.icon}</div>
                <div className="font-medium text-sm">{cat.name}</div>
                <div className="text-xs text-gray-500 mt-1">
                  {catNews.length} artikelen
                </div>
                <div className="text-xs mt-1">
                  {daysSince !== null ? (
                    <span className={daysSince > 30 ? 'text-red-600 font-medium' : daysSince > 14 ? 'text-yellow-600' : 'text-green-600'}>
                      <Clock className="w-3 h-3 inline mr-1" />
                      {daysSince}d geleden
                    </span>
                  ) : (
                    <span className="text-gray-400">Nog geen</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* AI Suggestions */}
        <div className="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-lg p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Lightbulb className="w-5 h-5 text-purple-600" />
              <h3 className="font-medium text-purple-900">AI Suggesties</h3>
            </div>
            <button
              onClick={loadAISuggestions}
              disabled={loadingSuggestions}
              className="flex items-center gap-2 px-3 py-1.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm disabled:opacity-50"
            >
              {loadingSuggestions ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Laden...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Genereer Suggesties
                </>
              )}
            </button>
          </div>

          {aiSuggestions.length > 0 ? (
            <div className="space-y-3">
              {aiSuggestions.map((suggestion, index) => {
                const category = NEWS_CATEGORIES.find(c => c.id === suggestion.category);
                return (
                  <div 
                    key={index}
                    className="flex items-center justify-between bg-white p-4 rounded-lg border border-purple-100"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`px-2 py-0.5 rounded-full text-xs ${
                          suggestion.urgency === 'high' ? 'bg-red-100 text-red-700' :
                          suggestion.urgency === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-green-100 text-green-700'
                        }`}>
                          {suggestion.urgency === 'high' ? 'Urgent' : suggestion.urgency === 'medium' ? 'Aanbevolen' : 'Optioneel'}
                        </span>
                        {category && (
                          <span className={`px-2 py-0.5 rounded-full text-xs ${category.color}`}>
                            {category.icon} {category.name}
                          </span>
                        )}
                      </div>
                      <div className="font-medium">{suggestion.topic}</div>
                      <div className="text-sm text-gray-500">{suggestion.reason}</div>
                    </div>
                    <button
                      onClick={() => handleUseSuggestion(suggestion)}
                      className="flex items-center gap-1 px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm ml-4"
                    >
                      <Sparkles className="w-4 h-4" />
                      Maak Artikel
                    </button>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-purple-600 text-sm">
              Klik op "Genereer Suggesties" om AI-gestuurde content ideeën te krijgen op basis van je bestaande artikelen en het huidige seizoen.
            </p>
          )}
        </div>

        {/* Recent Articles by Category */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="font-medium text-gray-900 mb-4">Recente Artikelen per Categorie</h3>
          <div className="space-y-4">
            {NEWS_CATEGORIES.map(cat => {
              const catNews = newsItems
                .filter(n => n.tags?.some(t => t.toLowerCase().includes(cat.id.toLowerCase())))
                .slice(0, 3);
              
              return (
                <div key={cat.id} className="border-b pb-4 last:border-b-0">
                  <div className="flex items-center gap-2 mb-2">
                    <span>{cat.icon}</span>
                    <span className="font-medium">{cat.name}</span>
                    <span className="text-xs text-gray-500">({catNews.length} recent)</span>
                  </div>
                  {catNews.length > 0 ? (
                    <div className="pl-6 space-y-1">
                      {catNews.map(news => (
                        <div key={news.id} className="flex items-center justify-between text-sm">
                          <span className="text-gray-700">{news.title}</span>
                          <span className="text-gray-400">
                            {new Date(news.created_at).toLocaleDateString('nl-NL')}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="pl-6 text-sm text-gray-400 italic">Nog geen artikelen in deze categorie</p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
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
        <div className="flex items-center gap-2">
          <button
            onClick={() => setViewMode('planning')}
            className="flex items-center gap-2 bg-purple-100 text-purple-700 px-4 py-2 rounded-lg hover:bg-purple-200"
          >
            <Calendar className="w-5 h-5" />
            Planning
          </button>
          <button
            onClick={handleCreateNews}
            className="flex items-center gap-2 bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700"
          >
            <Plus className="w-5 h-5" />
            Nieuw Bericht
          </button>
        </div>
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
