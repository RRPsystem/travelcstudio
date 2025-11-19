import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Plus, RefreshCw, Trash2, Eye, Save, X } from 'lucide-react';

interface WordPressSource {
  id: string;
  name: string;
  url: string;
  is_active: boolean;
}

interface WordPressTemplate {
  id: string;
  wordpress_source_id: string;
  wp_page_id: string;
  name: string;
  description: string | null;
  preview_image_url: string | null;
  category: string;
  color_scheme: any;
  is_active: boolean;
  order_index: number;
  cached_html: string | null;
  cache_updated_at: string | null;
  created_at: string;
}

export default function WordPressTemplateManager() {
  const [sources, setSources] = useState<WordPressSource[]>([]);
  const [templates, setTemplates] = useState<WordPressTemplate[]>([]);
  const [selectedSource, setSelectedSource] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [showNewTemplate, setShowNewTemplate] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [newTemplate, setNewTemplate] = useState({
    wp_page_id: '',
    name: '',
    description: '',
    preview_image_url: '',
    category: 'general'
  });

  useEffect(() => {
    fetchSources();
  }, []);

  useEffect(() => {
    if (selectedSource) {
      fetchTemplates(selectedSource);
    }
  }, [selectedSource]);

  const fetchSources = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('wordpress_sources')
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

  const fetchTemplates = async (sourceId: string) => {
    try {
      const { data, error } = await supabase
        .from('wordpress_templates')
        .select('*')
        .eq('wordpress_source_id', sourceId)
        .order('order_index');

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
      const source = sources.find(s => s.id === selectedSource);
      if (!source) throw new Error('Source not found');

      const { data, error } = await supabase.functions.invoke('wordpress-sync', {
        body: { source_id: selectedSource }
      });

      if (error) throw error;

      setSuccess(`Synced ${data?.synced || 0} templates from WordPress`);
      await fetchTemplates(selectedSource);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSyncing(false);
    }
  };

  const addTemplate = async () => {
    if (!selectedSource || !newTemplate.wp_page_id || !newTemplate.name) {
      setError('WordPress Page ID and Name are required');
      return;
    }

    try {
      const { error } = await supabase
        .from('wordpress_templates')
        .insert({
          wordpress_source_id: selectedSource,
          wp_page_id: newTemplate.wp_page_id,
          name: newTemplate.name,
          description: newTemplate.description || null,
          preview_image_url: newTemplate.preview_image_url || null,
          category: newTemplate.category,
          is_active: true,
          order_index: templates.length
        });

      if (error) throw error;

      setSuccess('Template added successfully');
      setShowNewTemplate(false);
      setNewTemplate({
        wp_page_id: '',
        name: '',
        description: '',
        preview_image_url: '',
        category: 'general'
      });
      await fetchTemplates(selectedSource);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const toggleTemplateActive = async (templateId: string, currentState: boolean) => {
    try {
      const { error } = await supabase
        .from('wordpress_templates')
        .update({ is_active: !currentState })
        .eq('id', templateId);

      if (error) throw error;

      setSuccess('Template updated');
      await fetchTemplates(selectedSource!);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const deleteTemplate = async (templateId: string) => {
    if (!confirm('Are you sure you want to delete this template?')) return;

    try {
      const { error } = await supabase
        .from('wordpress_templates')
        .delete()
        .eq('id', templateId);

      if (error) throw error;

      setSuccess('Template deleted');
      await fetchTemplates(selectedSource!);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const refreshTemplateCache = async (templateId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('wordpress-fetch-template', {
        body: { template_id: templateId }
      });

      if (error) throw error;

      setSuccess('Template cache refreshed');
      await fetchTemplates(selectedSource!);
    } catch (err: any) {
      setError(err.message);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">WordPress Templates</h2>
        <div className="flex gap-2">
          <button
            onClick={syncFromWordPress}
            disabled={syncing || !selectedSource}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? 'Syncing...' : 'Sync from WordPress'}
          </button>
          <button
            onClick={() => setShowNewTemplate(true)}
            disabled={!selectedSource}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
          >
            <Plus className="h-4 w-4" />
            Add Template
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
          {success}
        </div>
      )}

      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            WordPress Source
          </label>
          <select
            value={selectedSource || ''}
            onChange={(e) => setSelectedSource(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            {sources.map(source => (
              <option key={source.id} value={source.id}>
                {source.name} ({source.url})
              </option>
            ))}
          </select>
        </div>

        {showNewTemplate && (
          <div className="mb-6 p-4 border-2 border-blue-200 rounded-lg bg-blue-50">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Add New Template</h3>
              <button
                onClick={() => setShowNewTemplate(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  WordPress Page ID *
                </label>
                <input
                  type="text"
                  value={newTemplate.wp_page_id}
                  onChange={(e) => setNewTemplate({ ...newTemplate, wp_page_id: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="42"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Template Name *
                </label>
                <input
                  type="text"
                  value={newTemplate.name}
                  onChange={(e) => setNewTemplate({ ...newTemplate, name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Modern Agency Template"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={newTemplate.description}
                  onChange={(e) => setNewTemplate({ ...newTemplate, description: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  rows={2}
                  placeholder="Perfect for modern travel agencies..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Preview Image URL
                </label>
                <input
                  type="text"
                  value={newTemplate.preview_image_url}
                  onChange={(e) => setNewTemplate({ ...newTemplate, preview_image_url: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="https://..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Category
                </label>
                <select
                  value={newTemplate.category}
                  onChange={(e) => setNewTemplate({ ...newTemplate, category: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="general">General</option>
                  <option value="agency">Agency</option>
                  <option value="tours">Tours</option>
                  <option value="luxury">Luxury</option>
                  <option value="adventure">Adventure</option>
                </select>
              </div>
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setShowNewTemplate(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={addTemplate}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  <Save className="h-4 w-4" />
                  Add Template
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">
            Templates ({templates.length})
          </h3>

          {templates.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <p>No templates found.</p>
              <p className="text-sm mt-2">Click "Add Template" or "Sync from WordPress" to get started.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {templates.map(template => (
                <div
                  key={template.id}
                  className={`border rounded-lg overflow-hidden ${
                    template.is_active ? 'border-green-200 bg-white' : 'border-gray-200 bg-gray-50'
                  }`}
                >
                  {template.preview_image_url && (
                    <img
                      src={template.preview_image_url}
                      alt={template.name}
                      className="w-full h-48 object-cover"
                    />
                  )}
                  <div className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h4 className="font-semibold text-gray-900">{template.name}</h4>
                        <p className="text-sm text-gray-500">ID: {template.wp_page_id}</p>
                      </div>
                      <span className={`text-xs px-2 py-1 rounded ${
                        template.is_active
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {template.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    {template.description && (
                      <p className="text-sm text-gray-600 mb-3">{template.description}</p>
                    )}
                    <div className="flex items-center justify-between text-sm text-gray-500 mb-3">
                      <span className="capitalize">{template.category}</span>
                      {template.cache_updated_at && (
                        <span>Cached: {new Date(template.cache_updated_at).toLocaleDateString()}</span>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => toggleTemplateActive(template.id, template.is_active)}
                        className={`flex-1 px-3 py-2 text-sm rounded ${
                          template.is_active
                            ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            : 'bg-green-100 text-green-700 hover:bg-green-200'
                        }`}
                      >
                        {template.is_active ? 'Deactivate' : 'Activate'}
                      </button>
                      <button
                        onClick={() => refreshTemplateCache(template.id)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                        title="Refresh cache"
                      >
                        <RefreshCw className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => deleteTemplate(template.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded"
                        title="Delete template"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-semibold text-blue-900 mb-2">How to use:</h3>
        <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
          <li>Create templates in WordPress (Pages or Custom Post Types)</li>
          <li>Note the Page ID from WordPress (find in URL when editing)</li>
          <li>Add templates here manually OR use "Sync from WordPress"</li>
          <li>Activate templates to make them available to brands</li>
          <li>Brands can now select these templates when creating websites</li>
        </ol>
      </div>
    </div>
  );
}