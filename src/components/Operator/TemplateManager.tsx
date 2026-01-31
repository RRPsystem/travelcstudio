import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Plus, RefreshCw, Trash2, Eye, Save, X, Globe, Code } from 'lucide-react';

interface TemplateSource {
  id: string;
  name: string;
  url: string;
  is_active: boolean;
}

interface PageTemplate {
  id: string;
  template_source_id: string | null;
  wp_page_id: string | null;
  external_page_id: string | null;
  template_name: string;
  description: string | null;
  preview_image_url: string | null;
  category: string;
  category_preview_url: string | null;
  color_scheme: any;
  template_type: 'wordpress' | 'external_builder';
  is_active: boolean;
  order_index: number;
  cached_html: string | null;
  cache_updated_at: string | null;
  created_at: string;
}

interface ExternalPage {
  id: string;
  title: string;
  slug: string;
  is_template: boolean;
}

export default function TemplateManager() {
  const [activeTab, setActiveTab] = useState<'wordpress' | 'external_builder'>('wordpress');
  const [sources, setSources] = useState<TemplateSource[]>([]);
  const [templates, setTemplates] = useState<PageTemplate[]>([]);
  const [externalPages, setExternalPages] = useState<ExternalPage[]>([]);
  const [selectedSource, setSelectedSource] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [showNewTemplate, setShowNewTemplate] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [newTemplate, setNewTemplate] = useState({
    wp_page_id: '',
    external_page_id: '',
    template_name: '',
    description: '',
    preview_image_url: '',
    category: '',
    category_preview_url: ''
  });

  useEffect(() => {
    if (activeTab === 'wordpress') {
      fetchSources();
    } else {
      fetchExternalPages();
      fetchTemplates(null);
    }
  }, [activeTab]);

  useEffect(() => {
    if (selectedSource && activeTab === 'wordpress') {
      fetchTemplates(selectedSource);
    }
  }, [selectedSource]);

  const fetchSources = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('template_sources')
        .select('*')
        .order('name');

      if (error) throw error;
      setSources(data || []);
      if (data && data.length > 0 && !selectedSource) {
        setSelectedSource(data[0].id);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchExternalPages = async () => {
    try {
      const { data, error } = await supabase
        .from('pages')
        .select('id, title, slug, is_template')
        .eq('is_template', true)
        .eq('is_approved_for_brands', true)
        .order('title');

      if (error) throw error;
      setExternalPages(data || []);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const fetchTemplates = async (sourceId: string | null) => {
    try {
      let query = supabase
        .from('website_page_templates')
        .select('*')
        .eq('template_type', activeTab)
        .order('order_index');

      if (activeTab === 'wordpress' && sourceId) {
        query = query.eq('template_source_id', sourceId);
      }

      const { data, error } = await query;

      if (error) throw error;
      setTemplates(data || []);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const syncFromWordPress = async () => {
    if (!selectedSource) return;

    setSyncing(true);
    setError(null);
    setSuccess(null);

    try {
      const { data, error } = await supabase.functions.invoke('wordpress-sync', {
        body: { source_id: selectedSource }
      });

      if (error) throw error;

      setSuccess(`Successfully synced ${data.synced_count} pages from WordPress`);
      fetchTemplates(selectedSource);
    } catch (err: any) {
      setError(`Sync failed: ${err.message}`);
    } finally {
      setSyncing(false);
    }
  };

  const handleAddTemplate = async () => {
    if (!newTemplate.template_name || !newTemplate.category) {
      setError('Template name and category are required');
      return;
    }

    try {
      const templateData: any = {
        template_name: newTemplate.template_name,
        description: newTemplate.description || null,
        preview_image_url: newTemplate.preview_image_url || null,
        category: newTemplate.category,
        category_preview_url: newTemplate.category_preview_url || null,
        template_type: activeTab,
        is_active: true,
        order_index: templates.length
      };

      if (activeTab === 'wordpress') {
        if (!selectedSource || !newTemplate.wp_page_id) {
          setError('WordPress source and page ID are required');
          return;
        }
        templateData.template_source_id = selectedSource;
        templateData.wp_page_id = newTemplate.wp_page_id;
      } else {
        if (!newTemplate.external_page_id) {
          setError('External page must be selected');
          return;
        }
        templateData.external_page_id = newTemplate.external_page_id;
      }

      const { error } = await supabase
        .from('website_page_templates')
        .insert(templateData);

      if (error) throw error;

      setSuccess('Template added successfully');
      setShowNewTemplate(false);
      setNewTemplate({
        wp_page_id: '',
        external_page_id: '',
        template_name: '',
        description: '',
        preview_image_url: '',
        category: '',
        category_preview_url: ''
      });

      if (activeTab === 'wordpress' && selectedSource) {
        fetchTemplates(selectedSource);
      } else {
        fetchTemplates(null);
      }
    } catch (err: any) {
      setError(`Failed to add template: ${err.message}`);
    }
  };

  const handleDeleteTemplate = async (id: string) => {
    if (!confirm('Are you sure you want to delete this template?')) return;

    try {
      const { error } = await supabase
        .from('website_page_templates')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setSuccess('Template deleted successfully');
      if (activeTab === 'wordpress' && selectedSource) {
        fetchTemplates(selectedSource);
      } else {
        fetchTemplates(null);
      }
    } catch (err: any) {
      setError(`Failed to delete template: ${err.message}`);
    }
  };

  const toggleTemplateActive = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('website_page_templates')
        .update({ is_active: !currentStatus })
        .eq('id', id);

      if (error) throw error;

      if (activeTab === 'wordpress' && selectedSource) {
        fetchTemplates(selectedSource);
      } else {
        fetchTemplates(null);
      }
    } catch (err: any) {
      setError(`Failed to update template: ${err.message}`);
    }
  };

  return (
    <div className="max-w-7xl mx-auto">
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">
          {error}
          <button onClick={() => setError(null)} className="ml-4 text-red-600 hover:text-red-800">×</button>
        </div>
      )}

      {success && (
        <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg text-green-800">
          {success}
          <button onClick={() => setSuccess(null)} className="ml-4 text-green-600 hover:text-green-800">×</button>
        </div>
      )}

      <div className="bg-white rounded-lg shadow">
        <div className="border-b border-gray-200">
          <nav className="flex">
            <button
              onClick={() => setActiveTab('wordpress')}
              className={`px-6 py-4 text-sm font-medium border-b-2 ${
                activeTab === 'wordpress'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Globe className="inline mr-2" size={16} />
              WordPress Templates
            </button>
            <button
              onClick={() => setActiveTab('external_builder')}
              className={`px-6 py-4 text-sm font-medium border-b-2 ${
                activeTab === 'external_builder'
                  ? 'border-orange-500 text-orange-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Code className="inline mr-2" size={16} />
              External Builder Templates
            </button>
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'wordpress' && (
            <>
              <div className="mb-6 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <label className="text-sm font-medium text-gray-700">WordPress Source:</label>
                  <select
                    value={selectedSource || ''}
                    onChange={(e) => setSelectedSource(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg"
                  >
                    {sources.map(source => (
                      <option key={source.id} value={source.id}>{source.name}</option>
                    ))}
                  </select>
                  <button
                    onClick={syncFromWordPress}
                    disabled={syncing || !selectedSource}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
                  >
                    <RefreshCw size={16} className={syncing ? 'animate-spin' : ''} />
                    {syncing ? 'Syncing...' : 'Sync from WordPress'}
                  </button>
                </div>
                <button
                  onClick={() => setShowNewTemplate(true)}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
                >
                  <Plus size={16} />
                  Add Template
                </button>
              </div>
            </>
          )}

          {activeTab === 'external_builder' && (
            <div className="mb-6 flex items-center justify-end">
              <button
                onClick={() => setShowNewTemplate(true)}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
              >
                <Plus size={16} />
                Add Template
              </button>
            </div>
          )}

          {showNewTemplate && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg p-6 max-w-md w-full">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">Add New Template</h3>
                  <button onClick={() => setShowNewTemplate(false)} className="text-gray-400 hover:text-gray-600">
                    <X size={20} />
                  </button>
                </div>

                <div className="space-y-4">
                  {activeTab === 'wordpress' ? (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">WordPress Page ID</label>
                      <input
                        type="text"
                        value={newTemplate.wp_page_id}
                        onChange={(e) => setNewTemplate({ ...newTemplate, wp_page_id: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                        placeholder="e.g., 123"
                      />
                    </div>
                  ) : (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">External Builder Page</label>
                      <select
                        value={newTemplate.external_page_id}
                        onChange={(e) => setNewTemplate({ ...newTemplate, external_page_id: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      >
                        <option value="">Select a page...</option>
                        {externalPages.map(page => (
                          <option key={page.id} value={page.id}>{page.title}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Template Name</label>
                    <input
                      type="text"
                      value={newTemplate.template_name}
                      onChange={(e) => setNewTemplate({ ...newTemplate, template_name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                    <textarea
                      value={newTemplate.description}
                      onChange={(e) => setNewTemplate({ ...newTemplate, description: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      rows={3}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                    <input
                      type="text"
                      value={newTemplate.category}
                      onChange={(e) => setNewTemplate({ ...newTemplate, category: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      placeholder="e.g., Reisorganisatie Pro"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Preview Image URL</label>
                    <input
                      type="url"
                      value={newTemplate.preview_image_url}
                      onChange={(e) => setNewTemplate({ ...newTemplate, preview_image_url: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Category Preview URL</label>
                    <input
                      type="url"
                      value={newTemplate.category_preview_url}
                      onChange={(e) => setNewTemplate({ ...newTemplate, category_preview_url: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>

                  <div className="flex gap-2 pt-4">
                    <button
                      onClick={handleAddTemplate}
                      className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      <Save className="inline mr-2" size={16} />
                      Save
                    </button>
                    <button
                      onClick={() => setShowNewTemplate(false)}
                      className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {loading ? (
            <div className="text-center py-12 text-gray-500">Loading templates...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {templates.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                        No templates found
                      </td>
                    </tr>
                  ) : (
                    templates.map(template => (
                      <tr key={template.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <div className="font-medium text-gray-900">{template.template_name}</div>
                          {template.description && (
                            <div className="text-sm text-gray-500">{template.description}</div>
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-700">{template.category}</td>
                        <td className="px-6 py-4">
                          <button
                            onClick={() => toggleTemplateActive(template.id, template.is_active)}
                            className={`px-2 py-1 rounded text-xs font-medium ${
                              template.is_active
                                ? 'bg-green-100 text-green-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}
                          >
                            {template.is_active ? 'Active' : 'Inactive'}
                          </button>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button
                            onClick={() => handleDeleteTemplate(template.id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded"
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
