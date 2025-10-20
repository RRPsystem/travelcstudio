import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Eye, Layout } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { generateBuilderJWT, generateBuilderDeeplink } from '../../lib/jwtHelper';

interface Template {
  id: string;
  title: string;
  slug: string;
  template_category: string;
  preview_image_url: string | null;
  status: string;
  created_at: string;
}

const categories = [
  { value: 'home', label: 'Home Pagina\'s' },
  { value: 'about', label: 'Over Ons' },
  { value: 'contact', label: 'Contact' },
  { value: 'team', label: 'Team' },
  { value: 'general', label: 'Algemeen' },
];

export function TemplateManager() {
  const { user } = useAuth();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    slug: '',
    template_category: 'general',
    preview_image_url: '',
  });

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
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTemplates(data || []);
    } catch (error) {
      console.error('Error loading templates:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTemplate = async () => {
    if (!user) return;

    try {
      const jwtResponse = await generateBuilderJWT(
        'template',
        user.id,
        ['pages:write', 'content:write', 'layouts:write', 'menus:write'],
        {
          forceBrandId: false,
          mode: 'create-template',
        }
      );

      const params = new URLSearchParams({
        api: `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`,
        token: jwtResponse.token,
        apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
        brand_id: '00000000-0000-0000-0000-000000000999',
        mode: 'create-template',
        content_type: 'page',
        is_template: 'true',
        title: formData.title,
        slug: formData.slug,
        template_category: formData.template_category,
        preview_image_url: formData.preview_image_url || '',
      });

      const url = `https://www.ai-websitestudio.nl/?${params.toString()}`;
      window.open(url, '_blank');

      setShowCreateForm(false);
      setFormData({
        title: '',
        slug: '',
        template_category: 'general',
        preview_image_url: '',
      });

      setTimeout(() => {
        loadTemplates();
      }, 2000);
    } catch (error) {
      console.error('Error creating template:', error);
      alert('Er is een fout opgetreden bij het aanmaken van de template');
    }
  };

  const handleEditTemplate = async (templateId: string) => {
    if (!user) return;

    try {
      const jwtResponse = await generateBuilderJWT(
        'template',
        user.id,
        ['pages:write', 'content:write', 'layouts:write', 'menus:write'],
        {
          pageId: templateId,
          forceBrandId: false,
          mode: 'edit-template',
        }
      );

      const params = new URLSearchParams({
        api: `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`,
        token: jwtResponse.token,
        apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
        brand_id: '00000000-0000-0000-0000-000000000999',
        page_id: templateId,
        mode: 'edit-template',
        content_type: 'page',
      });

      const url = `https://www.ai-websitestudio.nl/?${params.toString()}`;
      window.open(url, '_blank');
    } catch (error) {
      console.error('Error editing template:', error);
      alert('Er is een fout opgetreden bij het bewerken van de template');
    }
  };

  const handleDeleteTemplate = async (templateId: string) => {
    if (!confirm('Weet je zeker dat je deze template wilt verwijderen?')) return;

    try {
      const { error } = await supabase
        .from('pages')
        .delete()
        .eq('id', templateId);

      if (error) throw error;
      await loadTemplates();
    } catch (error) {
      console.error('Error deleting template:', error);
      alert('Er is een fout opgetreden bij het verwijderen van de template');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Pagina Templates</h2>
            <p className="text-gray-600 mt-1">Maak templates die brands kunnen gebruiken</p>
          </div>
          <button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="bg-orange-600 text-white px-4 py-2 rounded-lg flex items-center space-x-2 hover:bg-orange-700 transition-colors"
          >
            <Plus size={16} />
            <span>Nieuwe Template</span>
          </button>
        </div>

        {showCreateForm && (
          <div className="bg-gray-50 rounded-lg p-6 mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Nieuwe Template Aanmaken</h3>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Titel</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  placeholder="Bijv: Home Pagina 1"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Slug</label>
                <input
                  type="text"
                  value={formData.slug}
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value.toLowerCase().replace(/\s+/g, '-') })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  placeholder="bijv: home-1"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Categorie</label>
                <select
                  value={formData.template_category}
                  onChange={(e) => setFormData({ ...formData, template_category: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                >
                  {categories.map((cat) => (
                    <option key={cat.value} value={cat.value}>
                      {cat.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Preview Afbeelding URL (optioneel)</label>
                <input
                  type="text"
                  value={formData.preview_image_url}
                  onChange={(e) => setFormData({ ...formData, preview_image_url: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  placeholder="https://..."
                />
              </div>
            </div>
            <div className="flex space-x-2">
              <button
                onClick={handleCreateTemplate}
                disabled={!formData.title || !formData.slug}
                className="bg-orange-600 text-white px-6 py-2 rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Open Builder & Maak Template
              </button>
              <button
                onClick={() => setShowCreateForm(false)}
                className="bg-gray-200 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Annuleren
              </button>
            </div>
          </div>
        )}

        {templates.length === 0 ? (
          <div className="text-center py-12">
            <Layout className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Geen templates gevonden</h3>
            <p className="text-gray-600">Maak je eerste template om te beginnen</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {templates.map((template) => (
              <div key={template.id} className="bg-white border rounded-lg overflow-hidden hover:shadow-md transition-shadow">
                {template.preview_image_url ? (
                  <img
                    src={template.preview_image_url}
                    alt={template.title}
                    className="w-full h-48 object-cover"
                  />
                ) : (
                  <div className="w-full h-48 bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                    <Layout className="h-16 w-16 text-gray-400" />
                  </div>
                )}

                <div className="p-4">
                  <div className="mb-2">
                    <h3 className="font-semibold text-gray-900">{template.title}</h3>
                    <p className="text-sm text-gray-600">
                      {categories.find(c => c.value === template.template_category)?.label || template.template_category}
                    </p>
                  </div>

                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleEditTemplate(template.id)}
                      className="flex-1 bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2"
                    >
                      <Edit size={16} />
                      <span>Bewerken</span>
                    </button>
                    <button
                      onClick={() => handleDeleteTemplate(template.id)}
                      className="bg-red-600 text-white px-3 py-2 rounded-lg hover:bg-red-700 transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
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
