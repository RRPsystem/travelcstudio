import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Check, ExternalLink, Palette, Layout } from 'lucide-react';

interface WordPressTemplate {
  id: string;
  name: string;
  description: string | null;
  preview_image_url: string | null;
  category: string;
  color_scheme: any;
}

interface WordPressTemplateSelectorProps {
  onSelect: (template: WordPressTemplate) => void;
  selectedTemplateId?: string | null;
}

export default function WordPressTemplateSelector({
  onSelect,
  selectedTemplateId
}: WordPressTemplateSelectorProps) {
  const [templates, setTemplates] = useState<WordPressTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('wordpress_templates')
        .select('id, name, description, preview_image_url, category, color_scheme')
        .eq('is_active', true)
        .order('order_index');

      if (error) throw error;
      setTemplates(data || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const categories = ['all', ...new Set(templates.map(t => t.category))];

  const filteredTemplates = selectedCategory === 'all'
    ? templates
    : templates.filter(t => t.category === selectedCategory);

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
        <h3 className="text-lg font-semibold text-gray-900">
          Kies een WordPress Template
        </h3>
        <div className="flex gap-2">
          {categories.map(category => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                selectedCategory === category
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {category === 'all' ? 'Alle' : category.charAt(0).toUpperCase() + category.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredTemplates.map(template => (
          <div
            key={template.id}
            onClick={() => onSelect(template)}
            className={`relative cursor-pointer rounded-lg overflow-hidden border-2 transition-all ${
              selectedTemplateId === template.id
                ? 'border-blue-600 shadow-lg ring-2 ring-blue-200'
                : 'border-gray-200 hover:border-blue-300 hover:shadow-md'
            }`}
          >
            {selectedTemplateId === template.id && (
              <div className="absolute top-4 right-4 z-10 bg-blue-600 text-white rounded-full p-2 shadow-lg">
                <Check className="h-5 w-5" />
              </div>
            )}

            <div className="aspect-video bg-gray-100 relative">
              {template.preview_image_url ? (
                <img
                  src={template.preview_image_url}
                  alt={template.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="flex items-center justify-center h-full">
                  <Layout className="h-16 w-16 text-gray-300" />
                </div>
              )}
            </div>

            <div className="p-4 bg-white">
              <div className="flex items-start justify-between mb-2">
                <h4 className="font-semibold text-gray-900">{template.name}</h4>
                <span className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded capitalize">
                  {template.category}
                </span>
              </div>

              {template.description && (
                <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                  {template.description}
                </p>
              )}

              <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Palette className="h-4 w-4" />
                  <span>Aanpasbaar</span>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelect(template);
                  }}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    selectedTemplateId === template.id
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {selectedTemplateId === template.id ? 'Geselecteerd' : 'Selecteer'}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredTemplates.length === 0 && (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <p className="text-gray-600">
            Geen templates gevonden in de categorie "{selectedCategory}"
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