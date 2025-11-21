import React, { useState, useEffect } from 'react';
import { Grid3x3, Wrench, Search, Plus, Eye, Layout } from 'lucide-react';
import { openBuilder } from '../../lib/jwtHelper';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';

interface Template {
  id: string;
  title: string;
  slug: string;
  template_category: string;
  preview_image_url: string | null;
  theme_label: string | null;
  sort_order: number;
}

const categories = [
  { value: 'all', label: 'Alle Templates' },
  { value: 'home', label: 'Home Pagina\'s' },
  { value: 'about', label: 'Over Ons' },
  { value: 'contact', label: 'Contact' },
  { value: 'team', label: 'Team' },
  { value: 'general', label: 'Algemeen' },
];

export function NewPage() {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedTheme, setSelectedTheme] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [templates, setTemplates] = useState<Template[]>([]);
  const [themes, setThemes] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [initialPageCount, setInitialPageCount] = useState<number | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    loadTemplates();
  }, []);

  useEffect(() => {
    if (!user?.brand_id) return;

    const loadPageCount = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/pages-api/list?brand_id=${user.brand_id}`;
        const response = await fetch(apiUrl, {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
        });

        if (response.ok) {
          const data = await response.json();
          const count = data.items?.length || 0;

          if (initialPageCount === null) {
            setInitialPageCount(count);
          } else if (count > initialPageCount) {
            console.log('New page detected!');
          }
        }
      } catch (error) {
        console.error('Error loading page count:', error);
      }
    };

    loadPageCount();
    const interval = setInterval(loadPageCount, 3000);

    return () => clearInterval(interval);
  }, [user?.brand_id, initialPageCount]);

  const loadTemplates = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('pages')
        .select('*')
        .eq('is_template', true)
        .eq('is_approved_for_brands', true)
        .order('sort_order', { ascending: true });

      if (error) throw error;

      setTemplates(data || []);

      const uniqueThemes = Array.from(
        new Set(data?.filter(t => t.theme_label).map(t => t.theme_label))
      ) as string[];
      setThemes(uniqueThemes);
    } catch (error) {
      console.error('Error loading templates:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenPageBuilder = async () => {
    if (!user || !user.brand_id) {
      console.error('No user or brand_id available');
      return;
    }

    try {
      const { data: existingPages } = await supabase
        .from('pages')
        .select('menu_order')
        .eq('brand_id', user.brand_id)
        .order('menu_order', { ascending: false })
        .limit(1);

      const nextMenuOrder = existingPages && existingPages.length > 0
        ? (existingPages[0].menu_order || 0) + 1
        : 1;

      const newPage = {
        title: 'Nieuwe Pagina',
        slug: `page-${Date.now()}`,
        content_json: {},
        brand_id: user.brand_id,
        status: 'draft',
        version: 1,
        content_type: 'page',
        is_template: false,
        owner_user_id: user.id,
        created_by: user.id,
        show_in_menu: true,
        menu_order: nextMenuOrder,
      };

      const { data: newPageData, error: createError } = await supabase
        .from('pages')
        .insert(newPage)
        .select('id')
        .maybeSingle();

      if (createError || !newPageData) {
        throw new Error('Kon geen pagina aanmaken');
      }

      const returnUrl = `${import.meta.env.VITE_APP_URL || window.location.origin}#/brand/website/pages`;
      const deeplink = await openBuilder(user.brand_id, user.id, {
        pageId: newPageData.id,
        returnUrl
      });
      window.open(deeplink, '_blank');
    } catch (error) {
      console.error('Error opening builder:', error);
      alert('Er is een fout opgetreden bij het openen van de builder. Probeer het opnieuw.');
    }
  };

  const handleUseTemplate = async (templateId: string) => {
    if (!user || !user.brand_id) return;

    try {
      const { data: template, error: templateError } = await supabase
        .from('pages')
        .select('*')
        .eq('id', templateId)
        .maybeSingle();

      if (templateError || !template) {
        throw new Error('Template niet gevonden');
      }

      const { data: existingPages } = await supabase
        .from('pages')
        .select('menu_order')
        .eq('brand_id', user.brand_id)
        .order('menu_order', { ascending: false })
        .limit(1);

      const nextMenuOrder = existingPages && existingPages.length > 0
        ? (existingPages[0].menu_order || 0) + 1
        : 1;

      console.log('[NewPage] Template content_json:', template.content_json);

      let contentJson = template.content_json || {};

      // Apply the same conversion logic as the pages-api does for the builder
      if (contentJson && contentJson.htmlSnapshot && !contentJson.layout && !contentJson.json) {
        console.log('[NewPage] Converting htmlSnapshot to layout for builder compatibility');
        contentJson = {
          ...contentJson,
          layout: {
            html: contentJson.htmlSnapshot,
            css: contentJson.css || '',
            js: contentJson.js || ''
          }
        };
      }

      // Double-check: If content_json doesn't have the expected builder format, log a warning
      if (contentJson && !contentJson.html && !contentJson.layout && !contentJson.components) {
        console.warn('[NewPage] Warning: Template content_json may not have builder-compatible structure:', contentJson);
      }

      const newPage = {
        title: template.title,
        slug: `${template.slug}-${Date.now()}`,
        content_json: contentJson,
        brand_id: user.brand_id,
        status: 'draft',
        version: 1,
        content_type: 'page',
        is_template: false,
        owner_user_id: user.id,
        created_by: user.id,
        show_in_menu: true,
        menu_order: nextMenuOrder,
      };

      const { data: newPageData, error: createError } = await supabase
        .from('pages')
        .insert(newPage)
        .select('id')
        .maybeSingle();

      if (createError || !newPageData) {
        throw new Error('Kon geen pagina aanmaken van template');
      }

      // Now open the builder with the new page
      const returnUrl = `${import.meta.env.VITE_APP_URL || window.location.origin}#/brand/website/pages`;
      const deeplink = await openBuilder(user.brand_id, user.id, {
        pageId: newPageData.id,
        returnUrl
      });
      window.open(deeplink, '_blank');
    } catch (error) {
      console.error('Error opening builder with template:', error);
      alert('Er is een fout opgetreden bij het openen van de template. Probeer het opnieuw.');
    }
  };

  const filteredTemplates = templates.filter(template => {
    const matchesCategory = selectedCategory === 'all' || template.template_category === selectedCategory;
    const matchesTheme = selectedTheme === 'all' || template.theme_label === selectedTheme;
    const matchesSearch = template.title.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesTheme && matchesSearch;
  });

  const categoryCounts = categories.map(cat => ({
    ...cat,
    count: cat.value === 'all'
      ? templates.length
      : templates.filter(t => t.template_category === cat.value).length
  }));

  return (
    <div className="bg-gray-50 min-h-screen p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Nieuwe Pagina Maken</h1>
          <p className="text-gray-600">Kies een kant-en-klare template of bouw zelf een pagina met de pagebuilder</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
          <div className="bg-white rounded-lg border-2 border-dashed border-transparent hover:border-orange-400 p-8 text-center transition-colors cursor-pointer">
            <div className="w-16 h-16 mx-auto mb-4 rounded-lg bg-orange-100 flex items-center justify-center">
              <Grid3x3 className="w-8 h-8 text-orange-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Pagebuilder</h3>
            <p className="text-gray-600 mb-6">Bouw je pagina helemaal zelf met drag-and-drop blokken</p>
            <button
              onClick={handleOpenPageBuilder}
              className="inline-flex items-center space-x-2 px-6 py-3 text-white rounded-lg font-medium transition-colors hover:bg-orange-700"
              style={{ backgroundColor: '#ff7700' }}
            >
              <Wrench size={18} />
              <span>Start met Bouwen</span>
            </button>
          </div>

          <div className="bg-white rounded-lg border-2 border-dashed border-transparent hover:border-blue-400 p-8 text-center transition-colors cursor-pointer">
            <div className="w-16 h-16 mx-auto mb-4 rounded-lg bg-blue-100 flex items-center justify-center">
              <Grid3x3 className="w-8 h-8 text-blue-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Kant-en-klare Templates</h3>
            <p className="text-gray-600 mb-6">Kies uit professionele templates en pas ze aan naar jouw wensen</p>
            <button className="inline-flex items-center space-x-2 px-6 py-3 border-2 border-blue-600 text-blue-600 rounded-lg font-medium transition-colors hover:bg-blue-50">
              <span>Bekijk Templates Hieronder</span>
            </button>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-semibold text-gray-900 mb-1">Template Gallerij</h2>
              <p className="text-gray-600">Kies uit onze collectie van professionele website templates</p>
            </div>
          </div>

          <div className="mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Zoek templates op naam..."
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
            </div>
          </div>

          <div className="mb-6">
            <h4 className="text-sm font-medium text-gray-700 mb-3">Categorie</h4>
            <div className="flex flex-wrap gap-2">
              {categoryCounts.map((category) => (
                <button
                  key={category.value}
                  onClick={() => setSelectedCategory(category.value)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    selectedCategory === category.value
                      ? 'bg-orange-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {category.label} <span className="ml-1">({category.count})</span>
                </button>
              ))}
            </div>
          </div>

          {themes.length > 0 && (
            <div className="mb-8 pb-6 border-b border-gray-200">
              <h4 className="text-sm font-medium text-gray-700 mb-3">Thema</h4>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setSelectedTheme('all')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    selectedTheme === 'all'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Alle Thema's
                </button>
                {themes.map((theme) => (
                  <button
                    key={theme}
                    onClick={() => setSelectedTheme(theme)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      selectedTheme === theme
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {theme}
                  </button>
                ))}
              </div>
            </div>
          )}

          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Templates laden...</p>
            </div>
          ) : filteredTemplates.length === 0 ? (
            <div className="text-center py-12">
              <Layout className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Geen templates gevonden</h3>
              <p className="text-gray-600">Probeer een andere categorie of filter</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredTemplates.map((template) => (
                <div key={template.id} className="bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-lg transition-shadow">
                  {template.preview_image_url ? (
                    <img
                      src={template.preview_image_url}
                      alt={template.title}
                      className="w-full h-48 object-cover"
                      onError={(e) => {
                        const img = e.target as HTMLImageElement;
                        img.style.display = 'none';
                        const parent = img.parentElement;
                        if (parent) {
                          parent.innerHTML = '<div class="w-full h-48 bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center"><svg class="h-16 w-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="3" y1="9" x2="21" y2="9"></line><line x1="9" y1="21" x2="9" y2="9"></line></svg></div>';
                        }
                      }}
                    />
                  ) : (
                    <div className="w-full h-48 bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                      <Layout className="h-16 w-16 text-gray-400" />
                    </div>
                  )}

                  <div className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="text-lg font-semibold text-gray-900 flex-1">{template.title}</h4>
                      <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded ml-2">
                        #{template.sort_order ?? 0}
                      </span>
                    </div>

                    <p className="text-sm text-gray-600 mb-3">
                      {categories.find(c => c.value === template.template_category)?.label || template.template_category}
                    </p>

                    {template.theme_label && (
                      <div className="mb-4">
                        <span className="inline-block text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded-full">
                          🏷️ {template.theme_label}
                        </span>
                      </div>
                    )}

                    <button
                      onClick={() => handleUseTemplate(template.id)}
                      className="w-full bg-green-600 text-white py-2 px-4 rounded-lg text-sm font-medium hover:bg-green-700 transition-colors flex items-center justify-center space-x-2"
                    >
                      <span>↓</span>
                      <span>Template Gebruiken</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
