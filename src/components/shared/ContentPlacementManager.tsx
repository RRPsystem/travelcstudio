import React, { useState, useEffect } from 'react';
import { Layout, ExternalLink, Trash2, Plus, Save, AlertCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface ContentPlacementManagerProps {
  contentType: 'destination' | 'news' | 'trip' | 'page';
  contentId: string;
  brandId: string;
}

interface Placement {
  id?: string;
  template_type: 'wordpress' | 'external_builder';
  template_id?: string;
  page_id?: string;
  is_active: boolean;
  placement_config: any;
}

export default function ContentPlacementManager({ contentType, contentId, brandId }: ContentPlacementManagerProps) {
  const [placements, setPlacements] = useState<Placement[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [pages, setPages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    loadData();
  }, [contentId, brandId]);

  const loadData = async () => {
    try {
      setLoading(true);

      const [placementsRes, templatesRes, pagesRes] = await Promise.all([
        supabase
          .from('content_placements')
          .select('*')
          .eq('content_type', contentType)
          .eq('content_id', contentId)
          .eq('brand_id', brandId),
        supabase
          .from('wordpress_templates')
          .select('*')
          .eq('brand_id', brandId)
          .eq('is_active', true),
        supabase
          .from('website_pages')
          .select('id, title, slug, website_id')
          .eq('brand_id', brandId)
      ]);

      if (placementsRes.data) {
        setPlacements(placementsRes.data);
      }

      if (templatesRes.data) {
        setTemplates(templatesRes.data);
      }

      if (pagesRes.data) {
        setPages(pagesRes.data);
      }
    } catch (err) {
      console.error('Error loading placements:', err);
      setError('Kon placements niet laden');
    } finally {
      setLoading(false);
    }
  };

  const addPlacement = () => {
    setPlacements([
      ...placements,
      {
        template_type: 'wordpress',
        is_active: true,
        placement_config: {}
      }
    ]);
  };

  const removePlacement = async (index: number) => {
    const placement = placements[index];

    if (placement.id) {
      const { error: deleteError } = await supabase
        .from('content_placements')
        .delete()
        .eq('id', placement.id);

      if (deleteError) {
        console.error('Error deleting placement:', deleteError);
        setError('Kon placement niet verwijderen');
        return;
      }
    }

    setPlacements(placements.filter((_, i) => i !== index));
    setSuccess(true);
    setTimeout(() => setSuccess(false), 2000);
  };

  const updatePlacement = (index: number, updates: Partial<Placement>) => {
    const updated = [...placements];
    updated[index] = { ...updated[index], ...updates };
    setPlacements(updated);
  };

  const savePlacements = async () => {
    try {
      setSaving(true);
      setError(null);

      const { data: { user } } = await supabase.auth.getUser();

      for (const placement of placements) {
        const placementData = {
          brand_id: brandId,
          content_type: contentType,
          content_id: contentId,
          template_type: placement.template_type,
          template_id: placement.template_id || null,
          page_id: placement.page_id || null,
          placement_config: placement.placement_config,
          is_active: placement.is_active,
          created_by: user?.id
        };

        if (placement.id) {
          const { error: updateError } = await supabase
            .from('content_placements')
            .update(placementData)
            .eq('id', placement.id);

          if (updateError) throw updateError;
        } else {
          const { error: insertError } = await supabase
            .from('content_placements')
            .insert(placementData);

          if (insertError) throw insertError;
        }
      }

      setSuccess(true);
      setTimeout(() => setSuccess(false), 2000);
      await loadData();
    } catch (err) {
      console.error('Error saving placements:', err);
      setError('Kon placements niet opslaan');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Layout className="text-blue-600" size={24} />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Template Placements</h3>
              <p className="text-sm text-gray-600">Koppel content aan templates</p>
            </div>
          </div>
          <button
            onClick={addPlacement}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus size={18} />
            <span>Toevoegen</span>
          </button>
        </div>
      </div>

      <div className="p-6 space-y-4">
        {placements.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Layout size={48} className="mx-auto mb-4 opacity-20" />
            <p>Nog geen placements. Klik op 'Toevoegen' om te beginnen.</p>
          </div>
        ) : (
          placements.map((placement, index) => (
            <div key={index} className="border border-gray-200 rounded-lg p-4 space-y-4">
              <div className="flex items-start justify-between">
                <div className="flex-1 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Template Type
                      </label>
                      <select
                        value={placement.template_type}
                        onChange={(e) => updatePlacement(index, {
                          template_type: e.target.value as 'wordpress' | 'external_builder',
                          template_id: undefined,
                          page_id: undefined
                        })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="wordpress">WordPress Template</option>
                        <option value="external_builder">External Builder</option>
                      </select>
                    </div>

                    {placement.template_type === 'wordpress' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          WordPress Template
                        </label>
                        <select
                          value={placement.template_id || ''}
                          onChange={(e) => updatePlacement(index, { template_id: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                          <option value="">Selecteer template...</option>
                          {templates.map(template => (
                            <option key={template.id} value={template.id}>
                              {template.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    {placement.template_type === 'external_builder' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Pagina
                        </label>
                        <select
                          value={placement.page_id || ''}
                          onChange={(e) => updatePlacement(index, { page_id: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                          <option value="">Selecteer pagina...</option>
                          {pages.map(page => (
                            <option key={page.id} value={page.id}>
                              {page.title} ({page.slug})
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={placement.is_active}
                        onChange={(e) => updatePlacement(index, { is_active: e.target.checked })}
                        className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700">Actief</span>
                    </label>

                    {placement.page_id && (
                      <a
                        href={`/builder/${placement.page_id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700"
                      >
                        <ExternalLink size={14} />
                        <span>Open in builder</span>
                      </a>
                    )}
                  </div>
                </div>

                <button
                  onClick={() => removePlacement(index)}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          ))
        )}

        {error && (
          <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">
            <AlertCircle size={20} />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="flex items-center gap-2 p-4 bg-green-50 border border-green-200 rounded-lg text-green-800">
            <Save size={20} />
            <span>Placements opgeslagen!</span>
          </div>
        )}
      </div>

      {placements.length > 0 && (
        <div className="p-6 border-t border-gray-200">
          <button
            onClick={savePlacements}
            disabled={saving}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                <span>Opslaan...</span>
              </>
            ) : (
              <>
                <Save size={20} />
                <span>Placements Opslaan</span>
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}