import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Zap, Check, ExternalLink, Loader } from 'lucide-react';

interface QuickStartTemplate {
  id: string;
  display_name: string;
  description: string;
  selected_pages: string[];
  builder: {
    id: string;
    name: string;
    editor_url?: string;
  };
  category: {
    id: string;
    category_slug: string;
    display_name: string;
    preview_url?: string;
    total_pages: number;
  };
}

interface QuickStartSelectorProps {
  brandId: string;
  onSelect: (template: QuickStartTemplate) => void;
  onCancel: () => void;
}

export default function QuickStartSelector({ brandId, onSelect, onCancel }: QuickStartSelectorProps) {
  const [templates, setTemplates] = useState<QuickStartTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTemplate, setSelectedTemplate] = useState<QuickStartTemplate | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from('quickstart_templates')
        .select(`
          *,
          builder:external_builders!inner(id, name, editor_url),
          category:builder_categories!inner(id, category_slug, display_name, preview_url, total_pages)
        `)
        .eq('is_active', true)
        .order('display_order');

      if (error) throw error;

      const templatesWithHttps = data?.map(t => ({
        ...t,
        category: {
          ...t.category,
          preview_url: t.category?.preview_url
            ? t.category.preview_url.replace(/^http:\/\//i, 'https://')
            : undefined
        }
      })) || [];

      console.log('[QuickStartSelector] Loaded templates with HTTPS:', templatesWithHttps);
      templatesWithHttps.forEach(t => {
        console.log(`[QuickStartSelector] ${t.display_name}: preview_url = ${t.category?.preview_url}`);
      });
      setTemplates(templatesWithHttps);
    } catch (err: any) {
      console.error('[QuickStartSelector] Error loading templates:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (template: QuickStartTemplate) => {
    setSelectedTemplate(template);
  };

  const confirmSelection = () => {
    if (selectedTemplate) {
      onSelect(selectedTemplate);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Loader className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading Windsurf templates...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
        <p className="text-red-600">{error}</p>
      </div>
    );
  }

  if (templates.length === 0) {
    return (
      <div className="text-center py-12">
        <Zap className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">No Windsurf Templates Available</h3>
        <p className="text-gray-600 mb-6">
          There are currently no Windsurf templates configured. Contact your system administrator.
        </p>
        <button
          onClick={onCancel}
          className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
        >
          Go Back
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Zap className="w-6 h-6 text-blue-600" />
            Choose a Windsurf Template
          </h3>
          <p className="text-gray-600 mt-1">
            Get started quickly with a pre-configured Windsurf template package
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {templates.map((template) => (
          <div
            key={template.id}
            onClick={() => handleSelect(template)}
            className={`cursor-pointer rounded-lg border-2 transition-all hover:shadow-lg ${
              selectedTemplate?.id === template.id
                ? 'border-blue-500 bg-blue-50 shadow-lg'
                : 'border-gray-200 hover:border-blue-300'
            }`}
          >
            <div className="relative">
              {template.category.preview_url ? (
                <img
                  src={template.category.preview_url}
                  alt={template.display_name}
                  className="w-full h-48 object-cover rounded-t-lg"
                  onLoad={() => {
                    console.log(`[QuickStartSelector] ✅ Image loaded: ${template.display_name} from ${template.category.preview_url}`);
                  }}
                  onError={(e) => {
                    console.error(`[QuickStartSelector] ❌ Image failed to load: ${template.display_name} from ${template.category.preview_url}`);
                    const parent = e.currentTarget.parentElement;
                    if (parent) {
                      parent.innerHTML = `<div class="w-full h-48 bg-gradient-to-br from-red-100 to-red-200 rounded-t-lg flex items-center justify-center"><div class="text-red-600 text-center"><svg class="w-12 h-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg><p class="text-sm">Image failed</p></div></div>`;
                    }
                  }}
                />
              ) : (
                <div className="w-full h-48 bg-gradient-to-br from-gray-50 via-gray-100 to-gray-200 rounded-t-lg flex flex-col items-center justify-center border-b border-gray-300">
                  <div className="bg-white p-4 rounded-lg shadow-sm mb-2">
                    <Zap className="w-12 h-12 text-gray-400" />
                  </div>
                  <p className="text-sm font-medium text-gray-500">{template.category.display_name}</p>
                  <p className="text-xs text-gray-400">Preview coming soon</p>
                </div>
              )}
              {selectedTemplate?.id === template.id && (
                <div className="absolute top-2 right-2 bg-blue-600 text-white p-2 rounded-full">
                  <Check className="w-5 h-5" />
                </div>
              )}
            </div>

            <div className="p-4">
              <h4 className="font-semibold text-gray-900 mb-1">{template.display_name}</h4>
              {template.description && (
                <p className="text-sm text-gray-600 mb-3">{template.description}</p>
              )}

              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Builder:</span>
                  <span className="font-medium text-gray-900">{template.builder.name}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Category:</span>
                  <span className="font-medium text-gray-900">{template.category.display_name}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Pages:</span>
                  <span className="font-medium text-gray-900">{template.selected_pages.length} included</span>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-gray-200">
                <p className="text-xs text-gray-500 mb-2">Included pages:</p>
                <div className="flex flex-wrap gap-1">
                  {template.selected_pages.map((page, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded"
                    >
                      {page}
                    </span>
                  ))}
                </div>
              </div>

              {template.builder.editor_url && (
                <a
                  href={template.builder.editor_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="mt-3 flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700"
                >
                  <ExternalLink className="w-3 h-3" />
                  Preview Editor
                </a>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between pt-6 border-t border-gray-200">
        <button
          onClick={onCancel}
          className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
        >
          Cancel
        </button>
        <button
          onClick={confirmSelection}
          disabled={!selectedTemplate}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          <Zap className="w-4 h-4" />
          Create Website with {selectedTemplate?.display_name || 'Template'}
        </button>
      </div>
    </div>
  );
}
