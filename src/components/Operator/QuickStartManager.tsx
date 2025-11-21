import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Plus, Edit2, Trash2, Eye, Check } from 'lucide-react';

interface Builder {
  id: string;
  name: string;
}

interface Category {
  id: string;
  builder_id: string;
  category_slug: string;
  display_name: string;
  total_pages: number;
  recommended_pages: string[];
}

interface AvailablePage {
  slug: string;
  title: string;
  description?: string;
  preview_url?: string;
}

interface QuickStartTemplate {
  id: string;
  builder_id: string;
  category_id: string;
  display_name: string;
  description: string;
  selected_pages: string[];
  is_active: boolean;
  display_order: number;
  builder?: { name: string };
  category?: { display_name: string };
}

export default function QuickStartManager() {
  const [templates, setTemplates] = useState<QuickStartTemplate[]>([]);
  const [builders, setBuilders] = useState<Builder[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [availablePages, setAvailablePages] = useState<AvailablePage[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    builder_id: '',
    category_id: '',
    display_name: '',
    description: '',
    selected_pages: [] as string[],
    is_active: true,
    display_order: 0,
  });

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (formData.builder_id) {
      loadCategories(formData.builder_id);
    }
  }, [formData.builder_id]);

  useEffect(() => {
    if (formData.category_id && formData.builder_id) {
      loadAvailablePages(formData.builder_id, formData.category_id);
    }
  }, [formData.category_id, formData.builder_id]);

  const loadData = async () => {
    try {
      const [templatesRes, buildersRes] = await Promise.all([
        supabase
          .from('quickstart_templates')
          .select(`
            *,
            builder:external_builders(name),
            category:builder_categories(display_name)
          `)
          .order('display_order'),
        supabase
          .from('external_builders')
          .select('id, name')
          .eq('is_active', true)
          .order('name'),
      ]);

      if (templatesRes.error) throw templatesRes.error;
      if (buildersRes.error) throw buildersRes.error;

      setTemplates(templatesRes.data || []);
      setBuilders(buildersRes.data || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadCategories = async (builderId: string) => {
    try {
      const { data, error } = await supabase
        .from('builder_categories')
        .select('*')
        .eq('builder_id', builderId)
        .eq('is_active', true)
        .order('display_name');

      if (error) throw error;
      setCategories(data || []);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const loadAvailablePages = async (builderId: string, categoryId: string) => {
    try {
      const category = categories.find(c => c.id === categoryId);
      if (!category) return;

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/fetch-external-page?builder_id=${builderId}&category=${category.category_slug}&action=list`,
        {
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
        }
      );

      const result = await response.json();
      if (!response.ok) throw new Error(result.error);

      setAvailablePages(result.pages || []);

      if (category.recommended_pages.length > 0 && formData.selected_pages.length === 0) {
        setFormData(prev => ({
          ...prev,
          selected_pages: category.recommended_pages,
        }));
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      if (editingId) {
        const { error } = await supabase
          .from('quickstart_templates')
          .update(formData)
          .eq('id', editingId);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('quickstart_templates')
          .insert([formData]);

        if (error) throw error;
      }

      resetForm();
      await loadData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleEdit = (template: QuickStartTemplate) => {
    setFormData({
      builder_id: template.builder_id,
      category_id: template.category_id,
      display_name: template.display_name,
      description: template.description,
      selected_pages: template.selected_pages,
      is_active: template.is_active,
      display_order: template.display_order,
    });
    setEditingId(template.id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this QuickStart template?')) return;

    try {
      const { error } = await supabase
        .from('quickstart_templates')
        .delete()
        .eq('id', id);

      if (error) throw error;
      await loadData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const resetForm = () => {
    setFormData({
      builder_id: '',
      category_id: '',
      display_name: '',
      description: '',
      selected_pages: [],
      is_active: true,
      display_order: 0,
    });
    setEditingId(null);
    setShowForm(false);
    setCategories([]);
    setAvailablePages([]);
  };

  const togglePageSelection = (pageSlug: string) => {
    setFormData(prev => ({
      ...prev,
      selected_pages: prev.selected_pages.includes(pageSlug)
        ? prev.selected_pages.filter(p => p !== pageSlug)
        : [...prev.selected_pages, pageSlug],
    }));
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
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">QuickStart Templates</h2>
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus className="w-4 h-4" />
            Create QuickStart
          </button>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-600">{error}</p>
          </div>
        )}

        {showForm && (
          <form onSubmit={handleSubmit} className="mb-8 p-6 bg-gray-50 rounded-lg space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              {editingId ? 'Edit QuickStart Template' : 'Create New QuickStart Template'}
            </h3>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Builder</label>
              <select
                value={formData.builder_id}
                onChange={(e) => setFormData({ ...formData, builder_id: e.target.value, category_id: '', selected_pages: [] })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">Select a builder</option>
                {builders.map((builder) => (
                  <option key={builder.id} value={builder.id}>
                    {builder.name}
                  </option>
                ))}
              </select>
            </div>

            {formData.builder_id && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                <select
                  value={formData.category_id}
                  onChange={(e) => setFormData({ ...formData, category_id: e.target.value, selected_pages: [] })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">Select a category</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.display_name} ({category.total_pages} pages)
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Display Name</label>
              <input
                type="text"
                value={formData.display_name}
                onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
                placeholder="e.g., Gowild Starter"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {availablePages.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Pages ({formData.selected_pages.length} selected)
                </label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 max-h-96 overflow-y-auto p-4 border border-gray-200 rounded-lg">
                  {availablePages.map((page) => (
                    <button
                      key={page.slug}
                      type="button"
                      onClick={() => togglePageSelection(page.slug)}
                      className={`p-3 rounded-lg border-2 text-left transition-colors ${
                        formData.selected_pages.includes(page.slug)
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-sm">{page.title}</span>
                        {formData.selected_pages.includes(page.slug) && (
                          <Check className="w-4 h-4 text-blue-600" />
                        )}
                      </div>
                      {page.description && (
                        <p className="text-xs text-gray-600">{page.description}</p>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="w-4 h-4 text-blue-600"
                />
                <span className="text-sm text-gray-700">Active</span>
              </label>

              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-2">Display Order</label>
                <input
                  type="number"
                  value={formData.display_order}
                  onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value) })}
                  className="w-24 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <button
                type="submit"
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                {editingId ? 'Update' : 'Create'} QuickStart
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        <div className="space-y-4">
          {templates.length === 0 ? (
            <p className="text-gray-500">No QuickStart templates created yet.</p>
          ) : (
            templates.map((template) => (
              <div
                key={template.id}
                className="border border-gray-200 rounded-lg p-6 hover:border-blue-300 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h4 className="text-lg font-semibold text-gray-900">{template.display_name}</h4>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        template.is_active
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {template.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    {template.description && (
                      <p className="text-gray-600 mb-3">{template.description}</p>
                    )}
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <span>Builder: {template.builder?.name}</span>
                      <span>Category: {template.category?.display_name}</span>
                      <span>{template.selected_pages.length} pages</span>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {template.selected_pages.map((page) => (
                        <span key={page} className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded">
                          {page}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEdit(template)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                      title="Edit"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(template.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
