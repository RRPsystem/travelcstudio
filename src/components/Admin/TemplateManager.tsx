import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Eye, Layout, Settings, X, Save, Upload } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { openTemplateBuilder } from '../../lib/jwtHelper';

interface Template {
  id: string;
  title: string;
  slug: string;
  template_category: string;
  preview_image_url: string | null;
  status: string;
  created_at: string;
  sort_order: number;
  theme_label: string | null;
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
  const [selectedFileName, setSelectedFileName] = useState<string>('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    slug: '',
    template_category: 'general',
    preview_image_url: '/image copy copy.png',
  });

  useEffect(() => {
    loadTemplates();

    const handleFocus = () => {
      console.log('Template Manager regained focus, reloading templates...');
      loadTemplates();
    };

    window.addEventListener('focus', handleFocus);

    return () => {
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  const loadTemplates = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('pages')
        .select('*')
        .eq('is_template', true)
        .order('sort_order', { ascending: true })
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
      const returnUrl = `${import.meta.env.VITE_APP_URL || window.location.origin}#/admin/templates`;

      const deeplink = await openTemplateBuilder(user.id, {
        mode: 'create-template',
        title: formData.title,
        slug: formData.slug,
        templateCategory: formData.template_category,
        previewImageUrl: formData.preview_image_url || undefined,
        returnUrl,
      });

      window.open(deeplink, '_blank');

      setShowCreateForm(false);
      setFormData({
        title: '',
        slug: '',
        template_category: 'general',
        preview_image_url: '/image copy copy.png',
      });
    } catch (error) {
      console.error('Error creating template:', error);
      alert('Er is een fout opgetreden bij het aanmaken van de template');
    }
  };

  const handleEditTemplate = async (templateId: string) => {
    if (!user) return;

    try {
      // Tijdelijk ZONDER returnUrl om errors te kunnen zien
      const deeplink = await openTemplateBuilder(user.id, {
        mode: 'edit-template',
        pageId: templateId,
        // returnUrl: `${import.meta.env.VITE_APP_URL || window.location.origin}#/admin/templates`,
      });

      window.open(deeplink, '_blank');
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

  const handleOpenEditMetadata = (template: Template) => {
    setEditingTemplate({
      ...template,
      sort_order: template.sort_order ?? 0,
      theme_label: template.theme_label ?? null
    });
  };

  const handleSaveMetadata = async () => {
    if (!editingTemplate) return;

    try {
      console.log('Saving template metadata:', {
        id: editingTemplate.id,
        title: editingTemplate.title,
        sort_order: editingTemplate.sort_order,
        theme_label: editingTemplate.theme_label
      });

      const { error } = await supabase
        .from('pages')
        .update({
          title: editingTemplate.title,
          template_category: editingTemplate.template_category,
          preview_image_url: editingTemplate.preview_image_url,
          sort_order: editingTemplate.sort_order ?? 0,
          theme_label: editingTemplate.theme_label || null,
        })
        .eq('id', editingTemplate.id);

      if (error) {
        console.error('Save error:', error);
        throw error;
      }

      console.log('Save successful, reloading templates...');
      await loadTemplates();
      setEditingTemplate(null);
      setSelectedFileName('');
      alert('Template metadata succesvol bijgewerkt!');
    } catch (error: any) {
      console.error('Error updating template metadata:', error);
      alert(`Opslaan mislukt: ${error?.message || 'Onbekende fout'}`);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    console.log('=== handleImageUpload called ===');

    if (!e.target.files || e.target.files.length === 0 || !editingTemplate) {
      console.log('No files or no editing template');
      return;
    }

    const file = e.target.files[0];
    console.log('Selected file:', file.name, file.size, file.type);

    if (!file.type.startsWith('image/')) {
      alert('Selecteer een geldige afbeelding');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert('Afbeelding mag maximaal 5MB zijn');
      return;
    }

    setSelectedFileName(file.name);
    setUploading(true);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${editingTemplate.id}-${Date.now()}.${fileExt}`;

      console.log('Uploading to storage:', fileName);

      const { error: uploadError } = await supabase.storage
        .from('template-previews')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: true
        });

      if (uploadError) {
        console.error('Storage upload error:', uploadError);
        throw new Error(uploadError.message);
      }

      const { data: publicUrlData } = supabase.storage
        .from('template-previews')
        .getPublicUrl(fileName);

      const publicUrl = publicUrlData.publicUrl;
      console.log('Public URL generated:', publicUrl);

      setEditingTemplate({
        ...editingTemplate,
        preview_image_url: publicUrl
      });

      setUploading(false);
      console.log('Upload complete - image ready for save');
    } catch (error: any) {
      console.error('Upload failed:', error);
      alert(`Upload mislukt: ${error?.message || 'Onbekende fout'}`);
      setUploading(false);
      setSelectedFileName('');
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
                    onError={(e) => {
                      const img = e.target as HTMLImageElement;
                      img.style.display = 'none';
                      const parent = img.parentElement;
                      if (parent) {
                        parent.innerHTML = '<div class="w-full h-48 bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center"><svg class="h-16 w-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="3" y1="9" x2="21" y2="9"></line><line x1="9" y1="21" x2="9" y2="9"></line></svg></div>';
                      }
                    }}
                  />
                ) : (
                  <div className="w-full h-48 bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                    <Layout className="h-16 w-16 text-gray-400" />
                  </div>
                )}

                <div className="p-4">
                  <div className="mb-3">
                    <div className="flex items-start justify-between mb-1">
                      <h3 className="font-semibold text-gray-900">{template.title}</h3>
                      <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                        #{template.sort_order ?? 0}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600">
                      {categories.find(c => c.value === template.template_category)?.label || template.template_category}
                    </p>
                    {template.theme_label && (
                      <div className="mt-2">
                        <span className="inline-block text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded-full">
                          🏷️ {template.theme_label}
                        </span>
                      </div>
                    )}
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
                      onClick={() => handleOpenEditMetadata(template)}
                      className="bg-gray-600 text-white px-3 py-2 rounded-lg hover:bg-gray-700 transition-colors"
                      title="Metadata bewerken"
                    >
                      <Settings size={16} />
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

      {editingTemplate && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-gray-900">Template Metadata Bewerken</h3>
                <button
                  onClick={() => {
                    setEditingTemplate(null);
                    setSelectedFileName('');
                  }}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Titel
                    </label>
                    <input
                      type="text"
                      value={editingTemplate.title}
                      onChange={(e) => setEditingTemplate({ ...editingTemplate, title: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      placeholder="Bijv: Home 2"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Volgorde
                      <span className="text-xs text-gray-500 ml-2">(laag = eerst getoond)</span>
                    </label>
                    <input
                      type="number"
                      value={editingTemplate.sort_order}
                      onChange={(e) => setEditingTemplate({ ...editingTemplate, sort_order: parseInt(e.target.value) || 0 })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      placeholder="0"
                      min="0"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Categorie
                    </label>
                    <select
                      value={editingTemplate.template_category}
                      onChange={(e) => setEditingTemplate({ ...editingTemplate, template_category: e.target.value })}
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
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Theme Label
                      <span className="text-xs text-gray-500 ml-2">(optioneel, bijv: "Golf")</span>
                    </label>
                    <input
                      type="text"
                      value={editingTemplate.theme_label || ''}
                      onChange={(e) => setEditingTemplate({ ...editingTemplate, theme_label: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      placeholder="Bijv: Golf, Travel, Business"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Preview Afbeelding
                  </label>

                  <div className="space-y-3">
                    {/* Upload button */}
                    <div>
                      <input
                        type="file"
                        id="image-upload"
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="hidden"
                        disabled={uploading}
                      />
                      <label
                        htmlFor="image-upload"
                        className={`inline-flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors ${
                          uploading ? 'opacity-50 cursor-not-allowed' : ''
                        }`}
                      >
                        <Upload size={18} />
                        <span>{uploading ? 'Uploaden...' : 'Upload Afbeelding'}</span>
                      </label>
                      {selectedFileName && (
                        <p className="text-sm text-green-600 mt-2">
                          ✓ {selectedFileName}
                        </p>
                      )}
                      <p className="text-xs text-gray-500 mt-1">
                        Max 5MB - JPEG, PNG, GIF of WebP
                      </p>
                    </div>

                    {/* Or enter URL */}
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">Of voer een URL in:</label>
                      <input
                        type="text"
                        value={editingTemplate.preview_image_url || ''}
                        onChange={(e) => setEditingTemplate({ ...editingTemplate, preview_image_url: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                        placeholder="/image.png of https://..."
                      />
                    </div>
                  </div>
                </div>

                {editingTemplate.preview_image_url && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Preview
                    </label>
                    <img
                      src={editingTemplate.preview_image_url}
                      alt="Preview"
                      className="w-full h-48 object-cover rounded-lg border"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  </div>
                )}
              </div>

              <div className="flex space-x-3 mt-6">
                <button
                  onClick={handleSaveMetadata}
                  className="flex-1 bg-orange-600 text-white px-6 py-3 rounded-lg hover:bg-orange-700 transition-colors flex items-center justify-center space-x-2"
                >
                  <Save size={20} />
                  <span>Opslaan</span>
                </button>
                <button
                  onClick={() => {
                    setEditingTemplate(null);
                    setSelectedFileName('');
                  }}
                  className="bg-gray-200 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Annuleren
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
