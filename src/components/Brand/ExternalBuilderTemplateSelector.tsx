import React, { useState, useEffect } from 'react';
import { db } from '../../lib/supabase';
import { Layout, Check } from 'lucide-react';

interface Template {
  id: string;
  template_name: string;
  category: string;
  preview_image_url: string | null;
  category_preview_url: string | null;
}

interface TemplateCategory {
  category: string;
  preview_url: string;
  templates: Template[];
}

interface ExternalBuilderTemplateSelectorProps {
  onSelect: (category: string, templates: Template[]) => void;
  selectedCategory: string | null;
}

export function ExternalBuilderTemplateSelector({ onSelect, selectedCategory }: ExternalBuilderTemplateSelectorProps) {
  const [categories, setCategories] = useState<TemplateCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTemplates, setSelectedTemplates] = useState<string[]>([]);

  useEffect(() => {
    loadTemplates();
  }, []);

  async function loadTemplates() {
    setLoading(true);
    try {
      const { data: quickstartTemplates, error: qsError } = await db.supabase
        .from('quickstart_templates')
        .select(`
          id,
          display_name,
          description,
          selected_pages,
          category:builder_categories!category_id(
            id,
            category_slug,
            display_name,
            preview_url
          )
        `)
        .eq('is_active', true)
        .order('display_order');

      if (qsError) throw qsError;

      const categoriesMap: Record<string, TemplateCategory> = {};

      for (const qsTemplate of quickstartTemplates || []) {
        const category = qsTemplate.category;
        if (!category) continue;

        const categorySlug = category.category_slug;
        const categoryDisplayName = category.display_name || categorySlug;

        const capitalizedCategoryName = categorySlug.charAt(0).toUpperCase() + categorySlug.slice(1);

        const capitalizedPageNames = qsTemplate.selected_pages.map((slug: string) => {
          if (slug === 'index') return 'Home';
          return slug.charAt(0).toUpperCase() + slug.slice(1);
        });

        const { data: pageTemplates, error: ptError } = await db.supabase
          .from('website_page_templates')
          .select('*')
          .eq('template_type', 'external_builder')
          .ilike('category', categorySlug)
          .in('template_name', capitalizedPageNames)
          .eq('is_active', true);

        if (ptError) {
          console.error('Error loading page templates:', ptError);
          continue;
        }

        if (!categoriesMap[categoryDisplayName]) {
          categoriesMap[categoryDisplayName] = {
            category: categoryDisplayName,
            preview_url: category.preview_url || '',
            templates: []
          };
        }

        if (pageTemplates && pageTemplates.length > 0) {
          const validTemplates = pageTemplates.filter(t => t && t.id && typeof t === 'object');
          categoriesMap[categoryDisplayName].templates.push(...validTemplates);
        }
      }

      console.log('Loaded quickstart categories:', Object.values(categoriesMap));
      setCategories(Object.values(categoriesMap));
    } catch (error) {
      console.error('Error loading templates:', error);
    } finally {
      setLoading(false);
    }
  }

  function handleCategorySelect(category: TemplateCategory) {
    const templateIds = category.templates.map(t => t.id);
    console.log('Selected category:', category.category);
    console.log('Template IDs:', templateIds);
    console.log('Templates:', category.templates);
    setSelectedTemplates(templateIds);
    onSelect(category.category, category.templates);
  }

  function handleTemplateToggle(templateId: string, category: TemplateCategory) {
    const newSelected = selectedTemplates.includes(templateId)
      ? selectedTemplates.filter(id => id !== templateId)
      : [...selectedTemplates, templateId];

    setSelectedTemplates(newSelected);

    const selectedTemplatObjs = category.templates.filter(t => newSelected.includes(t.id));
    onSelect(category.category, selectedTemplatObjs);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 mx-auto mb-4" style={{ borderColor: '#ff7700' }}></div>
          <p className="text-gray-600">Templates laden...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h4 className="text-lg font-semibold text-gray-900 mb-2">Complete Website Templates</h4>
        <p className="text-sm text-gray-600 mb-6">
          Kies een complete website template collectie met meerdere pagina's
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {categories.map((category) => (
          <div key={category.category} className="space-y-3">
            <button
              onClick={() => handleCategorySelect(category)}
              className={`w-full border-2 rounded-lg overflow-hidden transition-all hover:shadow-lg ${
                selectedCategory === category.category
                  ? 'border-orange-500 shadow-lg'
                  : 'border-gray-200 hover:border-orange-300'
              }`}
            >
              {category.preview_url ? (
                <img
                  src={category.preview_url}
                  alt={category.category}
                  className="w-full h-48 object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                    (e.target as HTMLImageElement).parentElement!.querySelector('.fallback-icon')!.classList.remove('hidden');
                  }}
                />
              ) : null}
              <div className="fallback-icon hidden flex items-center justify-center h-48 bg-gray-100">
                <Layout className="w-16 h-16 text-gray-400" />
              </div>
              <div className="p-4 bg-white text-left">
                <div className="flex items-center justify-between">
                  <div>
                    <h5 className="font-semibold text-gray-900">{category.category}</h5>
                    <p className="text-sm text-gray-600 mt-1">
                      {category.templates.length} {category.templates.length === 1 ? 'pagina' : "pagina's"}
                    </p>
                  </div>
                  {selectedCategory === category.category && (
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-orange-100">
                      <Check className="w-5 h-5" style={{ color: '#ff7700' }} />
                    </div>
                  )}
                </div>
              </div>
            </button>

            {selectedCategory === category.category && (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <p className="text-sm font-medium text-gray-700 mb-3">Selecteer pagina's:</p>
                <div className="space-y-2">
                  {category.templates.map((template) => (
                    <label
                      key={template.id}
                      className="flex items-center gap-3 p-2 hover:bg-white rounded cursor-pointer transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={selectedTemplates.includes(template.id)}
                        onChange={() => handleTemplateToggle(template.id, category)}
                        className="w-4 h-4 rounded border-gray-300 focus:ring-orange-500"
                        style={{ accentColor: '#ff7700' }}
                      />
                      <span className="text-sm text-gray-700">{template.template_name}</span>
                    </label>
                  ))}
                </div>
                <button
                  onClick={() => {
                    const allIds = category.templates.map(t => t.id);
                    setSelectedTemplates(allIds);
                    onSelect(category.category, category.templates);
                  }}
                  className="mt-3 text-sm font-medium hover:underline"
                  style={{ color: '#ff7700' }}
                >
                  Selecteer alle pagina's
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {categories.length === 0 && (
        <div className="text-center py-12 bg-gray-50 rounded-lg border border-gray-200">
          <Layout className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">Geen templates beschikbaar</p>
        </div>
      )}
    </div>
  );
}
