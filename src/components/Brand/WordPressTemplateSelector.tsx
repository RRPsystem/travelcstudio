import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Check, ExternalLink, Palette, Layout } from 'lucide-react';

interface WordPressTemplate {
  id: string;
  template_name: string;
  description: string | null;
  preview_image_url: string | null;
  category: string;
  category_preview_url: string | null;
  color_scheme: any;
  wp_page_id: string;
}

interface TemplateCategory {
  category: string;
  preview_url: string | null;
  pages: WordPressTemplate[];
}

interface WordPressTemplateSelectorProps {
  onSelect: (category: string, templates: WordPressTemplate[]) => void;
  selectedCategory?: string | null;
}

export default function WordPressTemplateSelector({
  onSelect,
  selectedCategory: externalSelectedCategory
}: WordPressTemplateSelectorProps) {
  const [templates, setTemplates] = useState<WordPressTemplate[]>([]);
  const [categories, setCategories] = useState<TemplateCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterCategory, setFilterCategory] = useState<string>('all');

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('wordpress_templates')
        .select('id, template_name, description, preview_image_url, category, category_preview_url, color_scheme, wp_page_id')
        .eq('is_active', true)
        .order('category, order_index');

      if (error) throw error;
      setTemplates(data || []);

      const grouped = (data || []).reduce((acc, template) => {
        if (!acc[template.category]) {
          acc[template.category] = {
            category: template.category,
            preview_url: template.category_preview_url || template.preview_image_url,
            pages: []
          };
        }
        acc[template.category].pages.push(template);
        return acc;
      }, {} as Record<string, TemplateCategory>);

      setCategories(Object.values(grouped));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const categoryNames = ['all', ...categories.map(c => c.category)];

  const filteredCategories = filterCategory === 'all'
    ? categories
    : categories.filter(c => c.category === filterCategory);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
        {error}
      </div>
    );
  }

  if (templates.length === 0) {
    return (
      <div className="text-center py-12 bg-gray-50 rounded-lg">
        <Layout className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Geen templates beschikbaar
        </h3>
        <p className="text-gray-600">
          Er zijn momenteel geen WordPress templates beschikbaar.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            Kies een WordPress Template
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            Selecteer een template collectie en krijg alle pagina's
          </p>
        </div>
        <div className="flex gap-2">
          {categoryNames.map(category => (
            <button
              key={category}
              onClick={() => setFilterCategory(category)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filterCategory === category
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {category === 'all' ? 'Alle' : category}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredCategories.map(categoryData => (
          <div
            key={categoryData.category}
            onClick={() => onSelect(categoryData.category, categoryData.pages)}
            className={`relative cursor-pointer rounded-lg overflow-hidden border-2 transition-all ${
              externalSelectedCategory === categoryData.category
                ? 'border-blue-600 shadow-lg ring-2 ring-blue-200'
                : 'border-gray-200 hover:border-blue-300 hover:shadow-md'
            }`}
          >
            {externalSelectedCategory === categoryData.category && (
              <div className="absolute top-4 right-4 z-10 bg-blue-600 text-white rounded-full p-2 shadow-lg">
                <Check className="h-5 w-5" />
              </div>
            )}

            <div className="aspect-[4/5] bg-gray-100 relative">
              {categoryData.preview_url ? (
                <img
                  src={categoryData.preview_url}
                  alt={categoryData.category}
                  className="w-full h-full object-cover object-top"
                />
              ) : (
                <div className="flex items-center justify-center h-full">
                  <Layout className="h-16 w-16 text-gray-300" />
                </div>
              )}
            </div>

            <div className="p-4 bg-white">
              <div className="flex items-start justify-between mb-2">
                <h4 className="font-semibold text-gray-900">{categoryData.category}</h4>
                <span className="text-xs px-2 py-1 bg-green-100 text-green-800 rounded">
                  {categoryData.pages.length} pagina's
                </span>
              </div>

              <div className="mb-3">
                <p className="text-xs text-gray-500 font-medium mb-1">Bevat:</p>
                <div className="flex flex-wrap gap-1">
                  {categoryData.pages.map(page => (
                    <span key={page.id} className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded">
                      {page.template_name}
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Palette className="h-4 w-4" />
                  <span>Aanpasbaar</span>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelect(categoryData.category, categoryData.pages);
                  }}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    externalSelectedCategory === categoryData.category
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {externalSelectedCategory === categoryData.category ? 'Geselecteerd' : 'Selecteer'}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredCategories.length === 0 && (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <p className="text-gray-600">
            Geen templates gevonden in de filter "{filterCategory}"
          </p>
        </div>
      )}

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-semibold text-blue-900 mb-2">💡 Wat krijg je?</h4>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>✓ Professioneel ontworpen template</li>
          <li>✓ Volledig aanpasbaar met jouw kleuren en logo</li>
          <li>✓ Responsive design (werkt op alle apparaten)</li>
          <li>✓ Klaar om te publiceren op jouw eigen domein</li>
        </ul>
      </div>
    </div>
  );
}