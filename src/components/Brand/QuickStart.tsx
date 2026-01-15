import React, { useState, useEffect } from 'react';
import { Grid3x3, Wrench, Search, Globe, Layout } from 'lucide-react';
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

interface WebsiteTemplate {
  id: string;
  title: string;
  description: string;
  template_type: 'wordpress' | 'external_builder';
  category: string | null;
  preview_image_url: string | null;
  sort_order: number;
}

interface TemplateCategory {
  category: string;
  template_type: 'wordpress' | 'external_builder';
  preview_url: string | null;
  page_count: number;
  pages: WebsiteTemplate[];
}

const categories = [
  { value: 'all', label: 'Alle Templates' },
  { value: 'home', label: 'Home Pagina\'s' },
  { value: 'about', label: 'Over Ons' },
  { value: 'contact', label: 'Contact' },
  { value: 'team', label: 'Team' },
  { value: 'general', label: 'Algemeen' },
];

export function QuickStart() {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedTheme, setSelectedTheme] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [templates, setTemplates] = useState<Template[]>([]);
  const [themes, setThemes] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const { user, effectiveBrandId } = useAuth();

  const [websiteTemplates, setWebsiteTemplates] = useState<WebsiteTemplate[]>([]);
  const [websiteCategories, setWebsiteCategories] = useState<TemplateCategory[]>([]);

  useEffect(() => {
    loadTemplates();
    loadWebsiteTemplates();
  }, []);

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

  const loadWebsiteTemplates = async () => {
    try {
      const { data: wpTemplates, error: wpError } = await supabase
        .from('website_page_templates')
        .select('id, template_name, description, template_type, category, preview_image_url, category_preview_url, order_index')
        .eq('is_active', true)
        .order('category, order_index');

      if (wpError) console.error('Error loading website_page_templates:', wpError);

      const allTemplates: any[] = [];

      if (wpTemplates && wpTemplates.length > 0) {
        const wpGrouped = wpTemplates.reduce((acc, template) => {
          const key = `${template.template_type}-${template.category}`;
          if (!acc[key]) {
            acc[key] = {
              category: template.category || 'Unnamed',
              template_type: template.template_type as 'wordpress' | 'external_builder',
              preview_url: template.category_preview_url || template.preview_image_url,
              page_count: 0,
              pages: []
            };
          }
          acc[key].pages.push({
            id: template.id,
            title: template.template_name,
            description: template.description || '',
            template_type: template.template_type as 'wordpress' | 'external_builder',
            category: template.category,
            preview_image_url: template.preview_image_url,
            sort_order: template.order_index
          });
          acc[key].page_count = acc[key].pages.length;
          return acc;
        }, {} as Record<string, TemplateCategory>);
        allTemplates.push(...Object.values(wpGrouped));
      }

      setWebsiteCategories(allTemplates);
    } catch (error) {
      console.error('Error loading website templates:', error);
    }
  };

  const filteredTemplates = templates.filter(template => {
    const matchesCategory = selectedCategory === 'all' || template.template_category === selectedCategory;
    const matchesTheme = selectedTheme === 'all' || template.theme_label === selectedTheme;
    const matchesSearch = template.title.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesTheme && matchesSearch;
  });

  const getCategoryCounts = () => {
    const counts: { [key: string]: number } = {};
    categories.forEach(cat => {
      counts[cat.value] = cat.value === 'all'
        ? templates.length
        : templates.filter(t => t.template_category === cat.value).length;
    });
    return counts;
  };

  const categoryCounts = getCategoryCounts();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Quick Start</h1>
        <p className="text-gray-600">Kies hoe je wilt beginnen met je website</p>
      </div>

      <div className="mb-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-6">Enkele Pagina Maken</h2>
        <p className="text-gray-600 mb-6">
          Kies een kant-en-klare template of bouw zelf een pagina met de pagebuilder
        </p>

        <div className="grid md:grid-cols-2 gap-6">
          <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 hover:border-orange-400 transition-colors bg-white">
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4" style={{ backgroundColor: '#ff7700' }}>
                <Wrench className="text-white" size={32} />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Pagebuilder</h3>
              <p className="text-gray-600 mb-4">
                Bouw je pagina helemaal zelf met drag-and-drop blokken
              </p>
              <button
                onClick={async () => {
                  if (!effectiveBrandId || !user?.id) return;
                  const returnUrl = `${import.meta.env.VITE_APP_URL || window.location.origin}#/brand/quick-start`;
                  const deeplink = await openBuilder(effectiveBrandId, user.id, { returnUrl, mode: 'page' });
                  window.open(deeplink, '_blank');
                }}
                className="px-6 py-3 text-white rounded-lg transition-colors font-medium flex items-center gap-2 cursor-pointer"
                style={{ backgroundColor: '#ff7700' }}
                onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#e66900'}
                onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#ff7700'}
              >
                <Wrench size={20} />
                Start met Bouwen
              </button>
            </div>
          </div>

          <div className="border-2 border-dashed border-blue-300 rounded-xl p-8 bg-blue-50">
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mb-4">
                <Grid3x3 className="text-white" size={32} />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Kant-en-klare Pagina's</h3>
              <p className="text-gray-600 mb-4">
                Kies uit professionele templates en pas ze aan naar jouw wensen
              </p>
              <a
                href="#page-gallery"
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium inline-flex items-center gap-2"
              >
                <Layout size={20} />
                Bekijk Templates Hieronder
              </a>
            </div>
          </div>
        </div>
      </div>

      <div className="mb-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-6">Complete Website Templates</h2>
        <p className="text-gray-600 mb-6">
          Kies een complete website template collectie met meerdere pagina's
        </p>

        {websiteCategories.length === 0 ? (
          <div className="border-2 border-dashed border-gray-300 rounded-xl p-12 bg-gray-50">
            <div className="text-center">
              <Globe size={48} className="mx-auto text-gray-400 mb-4" />
              <p className="text-gray-500 font-medium mb-2">Geen templates beschikbaar</p>
              <p className="text-gray-400 text-sm">
                Website templates komen hier beschikbaar
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {websiteCategories.map((category, idx) => (
              <div
                key={idx}
                className="border border-gray-200 rounded-lg overflow-hidden hover:shadow-lg transition-shadow bg-white cursor-pointer"
                onClick={async () => {
                  if (!effectiveBrandId) return;

                  if (category.template_type === 'wordpress') {
                    alert('WordPress template functionaliteit komt binnenkort');
                    return;
                  }

                  try {
                    console.log('Creating website from category:', category);
                    const websiteSlug = `${category.category.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`;

                    const { data: websiteData, error: insertError } = await supabase
                      .from('websites')
                      .insert({
                        brand_id: effectiveBrandId,
                        created_by: user.id,
                        name: category.category,
                        slug: websiteSlug,
                        template_name: category.category,
                        source_type: 'external_builder',
                        status: 'draft'
                      })
                      .select()
                      .single();

                    if (insertError) {
                      console.error('Website insert error:', insertError);
                      throw insertError;
                    }
                    console.log('Website created:', websiteData);

                    const pageIds = category.pages.map(p => p.id);
                    console.log('Looking up template pages with IDs:', pageIds);

                    const { data: templatePages, error: templateError } = await supabase
                      .from('website_page_templates')
                      .select('*')
                      .in('id', pageIds)
                      .order('order_index');

                    if (templateError) {
                      console.error('Template pages error:', templateError);
                      throw templateError;
                    }
                    console.log('Found template pages:', templatePages);

                    if (!templatePages || templatePages.length === 0) {
                      throw new Error(`Geen template pages gevonden voor IDs: ${pageIds.join(', ')}`);
                    }

                    const newPages = templatePages.map((tp: any, index: number) => ({
                      website_id: websiteData.id,
                      brand_id: effectiveBrandId,
                      created_by: user.id,
                      title: tp.template_name,
                      slug: index === 0 ? '/' : `/${tp.template_name.toLowerCase().replace(/\s+/g, '-')}`,
                      status: 'draft',
                      body_html: tp.cached_html || '',
                      content_json: {},
                      is_template: false,
                      show_in_menu: true,
                      menu_order: tp.order_index,
                      menu_label: tp.template_name
                    }));

                    console.log('Creating pages:', newPages);
                    const { error: pagesError } = await supabase
                      .from('pages')
                      .insert(newPages);

                    if (pagesError) {
                      console.error('Pages insert error:', pagesError);
                      throw pagesError;
                    }

                    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
                    const previewUrl = `${supabaseUrl}/functions/v1/website-viewer?website_id=${websiteData.id}`;

                    await supabase
                      .from('websites')
                      .update({
                        preview_url: previewUrl,
                        live_url: previewUrl
                      })
                      .eq('id', websiteData.id);

                    alert(`✅ Website "${category.category}" aangemaakt met ${templatePages.length} pagina's!\n\n📍 Preview URL: ${previewUrl}\n\nDe website is nu beschikbaar in Website Management.`);

                    window.location.href = '#/brand/website/manage';
                  } catch (error: any) {
                    console.error('Error creating website:', error);

                    // Check for duplicate key error
                    if (error?.code === '23505' || error?.message?.includes('duplicate key') || error?.message?.includes('already exists')) {
                      alert('ℹ️ Deze website bestaat al! Je kunt deze vinden in Website Management.');
                      return;
                    }

                    alert('❌ Fout bij aanmaken website: ' + (error instanceof Error ? error.message : JSON.stringify(error)));
                  }
                }}
              >
                {category.preview_url ? (
                  <div className="h-80 bg-gray-100 overflow-hidden">
                    <img
                      src={category.preview_url}
                      alt={category.category}
                      className="w-full h-full object-cover object-top"
                    />
                  </div>
                ) : (
                  <div className="h-80 bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                    <Globe className="text-white" size={64} />
                  </div>
                )}
                <div className="p-5">
                  <div className="flex items-center gap-2 mb-3">
                    {category.template_type === 'wordpress' ? (
                      <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded">
                        WordPress
                      </span>
                    ) : (
                      <span className="px-2 py-1 bg-orange-100 text-orange-700 text-xs font-medium rounded">
                        Builder
                      </span>
                    )}
                    <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs font-medium rounded">
                      {category.page_count} {category.page_count === 1 ? 'pagina' : "pagina's"}
                    </span>
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">{category.category}</h3>
                  <p className="text-sm text-gray-600 mb-4">
                    Complete website met {category.page_count} professioneel ontworpen {category.page_count === 1 ? 'pagina' : "pagina's"}
                  </p>
                  <button
                    className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                  >
                    Gebruik Template
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div id="page-gallery" className="mb-8">
        <div className="mb-6">
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">Pagina Galerij</h2>
          <p className="text-gray-600">Kies uit onze collectie van professionele HTML pagina templates</p>
        </div>

        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Zoek templates op naam..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        <div className="mb-6">
          <h3 className="text-sm font-medium text-gray-700 mb-3">Categorie</h3>
          <div className="flex flex-wrap gap-2">
            {categories.map(cat => (
              <button
                key={cat.value}
                onClick={() => setSelectedCategory(cat.value)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  selectedCategory === cat.value
                    ? 'bg-orange-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
                style={selectedCategory === cat.value ? { backgroundColor: '#ff7700' } : {}}
                onMouseOver={(e) => {
                  if (selectedCategory === cat.value) e.currentTarget.style.backgroundColor = '#e66900';
                }}
                onMouseOut={(e) => {
                  if (selectedCategory === cat.value) e.currentTarget.style.backgroundColor = '#ff7700';
                }}
              >
                {cat.label} ({categoryCounts[cat.value] || 0})
              </button>
            ))}
          </div>
        </div>

        {themes.length > 0 && (
          <div className="mb-6">
            <h3 className="text-sm font-medium text-gray-700 mb-3">Thema</h3>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setSelectedTheme('all')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  selectedTheme === 'all'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Alle Thema's
              </button>
              {themes.map(theme => (
                <button
                  key={theme}
                  onClick={() => setSelectedTheme(theme)}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
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
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
          </div>
        ) : filteredTemplates.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">Geen templates gevonden</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTemplates.map(template => (
              <div
                key={template.id}
                className="group border border-gray-200 rounded-lg overflow-hidden hover:shadow-lg transition-shadow cursor-pointer bg-white"
                onClick={async () => {
                  if (!effectiveBrandId || !user?.id) return;
                  const returnUrl = `${import.meta.env.VITE_APP_URL || window.location.origin}#/brand/quick-start`;
                  const deeplink = await openBuilder(effectiveBrandId, user.id, {
                    templateId: template.id,
                    returnUrl,
                    mode: 'page'
                  });
                  window.open(deeplink, '_blank');
                }}
              >
                <div className="aspect-video bg-gray-100 relative overflow-hidden">
                  {template.preview_image_url ? (
                    <img
                      src={template.preview_image_url}
                      alt={template.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Layout size={48} className="text-gray-300" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all duration-300 flex items-center justify-center">
                    <button className="opacity-0 group-hover:opacity-100 transition-opacity bg-white text-gray-900 px-6 py-2 rounded-lg font-medium">
                      Gebruik Template
                    </button>
                  </div>
                </div>
                <div className="p-4">
                  <h3 className="font-semibold text-gray-900 mb-1">{template.title}</h3>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-gray-500">{categories.find(c => c.value === template.template_category)?.label}</span>
                    {template.theme_label && (
                      <>
                        <span className="text-gray-300">•</span>
                        <span className="text-blue-600">{template.theme_label}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
