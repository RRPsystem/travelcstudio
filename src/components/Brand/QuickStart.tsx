import React, { useState, useEffect } from 'react';
import { Grid3x3, Wrench, Search, Globe, Rocket, Layout } from 'lucide-react';
import { openBuilder } from '../../lib/jwtHelper';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { db } from '../../lib/supabase';
import WordPressTemplateSelector from './WordPressTemplateSelector';

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

export function QuickStart() {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedTheme, setSelectedTheme] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [templates, setTemplates] = useState<Template[]>([]);
  const [themes, setThemes] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const [creatingWebsite, setCreatingWebsite] = useState(false);
  const [selectedWPCategory, setSelectedWPCategory] = useState<string | null>(null);
  const [selectedWPTemplates, setSelectedWPTemplates] = useState<any[]>([]);

  useEffect(() => {
    loadTemplates();
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

  async function handleCreateWordPressWebsite() {
    if (!user?.brand_id || !selectedWPCategory || selectedWPTemplates.length === 0) {
      alert('Selecteer eerst een template');
      return;
    }

    setCreatingWebsite(true);
    try {
      const websiteName = prompt('Naam voor je nieuwe website:', selectedWPCategory);
      if (!websiteName) {
        setCreatingWebsite(false);
        return;
      }

      const { data: newWebsite, error } = await db.supabase
        .from('websites')
        .insert({
          brand_id: user.brand_id,
          name: websiteName,
          template_name: selectedWPCategory,
          source_type: 'wordpress_template',
          status: 'draft'
        })
        .select()
        .single();

      if (error) throw error;

      alert('✅ Website aangemaakt! Je wordt doorgestuurd naar de editor...');

      window.location.href = `/?view=wordpress-editor&website_id=${newWebsite.id}`;
    } catch (error) {
      console.error('Error creating website:', error);
      alert('❌ Fout bij aanmaken website');
    } finally {
      setCreatingWebsite(false);
    }
  }

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
                  if (!user?.brand_id || !user?.id) return;
                  const returnUrl = `${import.meta.env.VITE_APP_URL || window.location.origin}#/brand/quick-start`;
                  const deeplink = await openBuilder(user.brand_id, user.id, { returnUrl });
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
        <h2 className="text-xl font-semibold text-gray-900 mb-6">Complete Website Starten</h2>
        <p className="text-gray-600 mb-6">
          Start met een complete website template en pas deze aan in de editor
        </p>

        <div className="space-y-8">
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              <Globe className="inline mr-2" size={20} />
              WordPress Template Websites
            </h3>
            <p className="text-gray-600 mb-4 text-sm">
              Kies een professionele WordPress template collectie met meerdere pagina's
            </p>

            <WordPressTemplateSelector
              onSelect={(category, pages) => {
                setSelectedWPCategory(category);
                setSelectedWPTemplates(pages);
              }}
              selectedCategory={selectedWPCategory}
            />

            {selectedWPCategory && selectedWPTemplates.length > 0 && (
              <div className="mt-6 flex items-center justify-between bg-green-50 border border-green-200 rounded-lg p-4">
                <div>
                  <p className="text-green-900 font-medium">
                    Template geselecteerd: {selectedWPCategory}
                  </p>
                  <p className="text-green-700 text-sm">
                    {selectedWPTemplates.length} pagina's
                  </p>
                </div>
                <button
                  onClick={handleCreateWordPressWebsite}
                  disabled={creatingWebsite}
                  className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium disabled:opacity-50 flex items-center gap-2"
                >
                  <Rocket size={20} />
                  {creatingWebsite ? 'Aanmaken...' : 'Website Aanmaken'}
                </button>
              </div>
            )}
          </div>

          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              <Rocket className="inline mr-2" size={20} />
              HTML Complete Websites
            </h3>
            <p className="text-gray-600 mb-4 text-sm">
              Complete website templates gebouwd met de externe builder - Binnenkort beschikbaar
            </p>
            <div className="border-2 border-dashed border-gray-300 rounded-xl p-12 bg-gray-50">
              <div className="text-center">
                <Rocket size={48} className="mx-auto text-gray-400 mb-4" />
                <p className="text-gray-500 font-medium mb-2">HTML Website Templates</p>
                <p className="text-gray-400 text-sm">
                  Complete website templates met de externe builder komen hier beschikbaar
                </p>
              </div>
            </div>
          </div>
        </div>
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
                  if (!user?.brand_id || !user?.id) return;
                  const returnUrl = `${import.meta.env.VITE_APP_URL || window.location.origin}#/brand/quick-start`;
                  const deeplink = await openBuilder(user.brand_id, user.id, { templateId: template.id, returnUrl });
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
