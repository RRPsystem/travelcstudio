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
  is_approved_for_brands: boolean;
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
  const [notification, setNotification] = useState<{ type: 'success' | 'error', message: string } | null>(null);
  const [selectedFileName, setSelectedFileName] = useState<string>('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    slug: '',
    template_category: 'general',
    preview_image_url: '',
  });

  useEffect(() => {
    loadTemplates();

    let isSelectingFile = false;

    const handleFocus = () => {
      if (isSelectingFile) {
        console.log('⏸️  Focus event ignored - user is selecting file');
        isSelectingFile = false;
        return;
      }
      console.log('Template Manager regained focus, reloading templates...');
      loadTemplates();
    };

    const markFileSelection = () => {
      isSelectingFile = true;
    };

    window.addEventListener('focus', handleFocus);
    window.addEventListener('file-select-start', markFileSelection);

    return () => {
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('file-select-start', markFileSelection);
    };
  }, []);

  const loadTemplates = async () => {
    try {
      console.log('🔄 loadTemplates: Starting...');
      setLoading(true);
      const { data, error } = await supabase
        .from('pages')
        .select('*')
        .eq('is_template', true)
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: false });

      console.log('🔄 loadTemplates: Query completed', { data, error });

      if (error) throw error;
      setTemplates(data || []);
      console.log('✅ loadTemplates: Success, templates count:', data?.length || 0);
    } catch (error) {
      console.error('❌ loadTemplates: Error:', error);
      setTemplates([]);
      setNotification({ type: 'error', message: 'Fout bij laden van templates' });
      setTimeout(() => setNotification(null), 5000);
    } finally {
      setLoading(false);
      console.log('✅ loadTemplates: Complete, loading set to false');
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
        preview_image_url: '',
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

  const handleApprovalToggle = async (templateId: string, isApproved: boolean) => {
    try {
      const { error } = await supabase
        .from('pages')
        .update({ is_approved_for_brands: isApproved })
        .eq('id', templateId);

      if (error) throw error;

      setTemplates(prev =>
        prev.map(t => t.id === templateId ? { ...t, is_approved_for_brands: isApproved } : t)
      );

      alert(`Template ${isApproved ? 'goedgekeurd' : 'afgekeurd'} voor brands`);
    } catch (error) {
      console.error('Error updating approval status:', error);
      alert('Fout bij het wijzigen van goedkeuringsstatus');
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
        theme_label: editingTemplate.theme_label,
        preview_image_url: editingTemplate.preview_image_url
      });

      const updateData = {
        title: editingTemplate.title,
        template_category: editingTemplate.template_category,
        preview_image_url: editingTemplate.preview_image_url,
        sort_order: editingTemplate.sort_order ?? 0,
        theme_label: editingTemplate.theme_label || null,
      };

      console.log('Update data being sent:', updateData);

      const { data: updatedData, error } = await supabase
        .from('pages')
        .update(updateData)
        .eq('id', editingTemplate.id)
        .select();

      if (error) {
        console.error('Save error:', error);
        throw error;
      }

      console.log('✅ Save successful! Updated record:', updatedData);
      console.log('🔄 Reloading templates...');
      await loadTemplates();
      console.log('✅ Templates reloaded');
      setEditingTemplate(null);
      setSelectedFileName('');
      console.log('✅ Modal closed');
      setNotification({ type: 'success', message: 'Template metadata succesvol bijgewerkt!' });
      setTimeout(() => setNotification(null), 3000);
    } catch (error: any) {
      console.error('Error updating template metadata:', error);
      setNotification({ type: 'error', message: `Opslaan mislukt: ${error?.message || 'Onbekende fout'}` });
      setTimeout(() => setNotification(null), 5000);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    alert('handleImageUpload aangeroepen!'); // TEST
    console.log('📸 === handleImageUpload called ===');
    console.log('📸 Files:', e.target.files);
    console.log('📸 Editing template:', editingTemplate);

    if (!e.target.files || e.target.files.length === 0 || !editingTemplate) {
      console.log('❌ No files or no editing template');
      return;
    }

    const file = e.target.files[0];
    console.log('Selected file:', file.name, file.size, file.type);

    if (!file.type.startsWith('image/')) {
      setNotification({ type: 'error', message: 'Selecteer een geldige afbeelding' });
      setTimeout(() => setNotification(null), 3000);
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setNotification({ type: 'error', message: 'Afbeelding mag maximaal 5MB zijn' });
      setTimeout(() => setNotification(null), 3000);
      return;
    }

    setSelectedFileName(file.name);
    setUploading(true);

    try {
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        console.log('✅ Image converted to base64, length:', result.length);

        setEditingTemplate({
          ...editingTemplate,
          preview_image_url: result
        });

        setUploading(false);
        setNotification({ type: 'success', message: 'Afbeelding succesvol geüpload!' });
        setTimeout(() => setNotification(null), 3000);
      };

      reader.onerror = () => {
        console.error('❌ FileReader error');
        setUploading(false);
        setSelectedFileName('');
        setNotification({ type: 'error', message: 'Upload mislukt' });
        setTimeout(() => setNotification(null), 3000);
      };

      reader.readAsDataURL(file);
    } catch (error: any) {
      console.error('❌ Upload error:', error);
      setUploading(false);
      setSelectedFileName('');
      setNotification({ type: 'error', message: `Upload mislukt: ${error?.message || 'Onbekende fout'}` });
      setTimeout(() => setNotification(null), 5000);
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {templates.map((template) => (
              <div key={template.id} className="bg-white border rounded-lg overflow-hidden hover:shadow-md transition-shadow">
                {template.preview_image_url ? (
                  <img
                    src={template.preview_image_url}
                    alt={template.title}
                    className="w-full h-80 object-cover"
                    onError={(e) => {
                      const img = e.target as HTMLImageElement;
                      img.style.display = 'none';
                      const parent = img.parentElement;
                      if (parent) {
                        parent.innerHTML = '<div class="w-full h-80 bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center"><svg class="h-16 w-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="3" y1="9" x2="21" y2="9"></line><line x1="9" y1="21" x2="9" y2="9"></line></svg></div>';
                      }
                    }}
                  />
                ) : (
                  <div className="w-full h-80 bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
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

                    <div className="mt-3 flex items-center space-x-2">
                      <label className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={template.is_approved_for_brands}
                          onChange={(e) => handleApprovalToggle(template.id, e.target.checked)}
                          className="w-4 h-4 text-green-600 bg-gray-100 border-gray-300 rounded focus:ring-green-500"
                        />
                        <span className="text-sm font-medium text-gray-700">
                          {template.is_approved_for_brands ? (
                            <span className="text-green-600">✓ Goedgekeurd voor Brands</span>
                          ) : (
                            <span className="text-gray-500">Niet goedgekeurd</span>
                          )}
                        </span>
                      </label>
                    </div>
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
                        ref={(el) => {
                          if (el) (window as any).imageUploadInput = el;
                        }}
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="hidden"
                        disabled={uploading}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          console.log('🔵 Button clicked!');
                          console.log('🎯 Marking file selection to prevent reload');
                          window.dispatchEvent(new Event('file-select-start'));
                          const input = (window as any).imageUploadInput;
                          if (input) {
                            console.log('🔵 Triggering file input click');
                            input.click();
                          } else {
                            console.error('❌ Input not found');
                          }
                        }}
                        disabled={uploading}
                        className={`inline-flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors ${
                          uploading ? 'opacity-50 cursor-not-allowed' : ''
                        }`}
                      >
                        <Upload size={18} />
                        <span>{uploading ? 'Uploaden...' : 'Upload Afbeelding'}</span>
                      </button>
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

                {editingTemplate.preview_image_url ? (
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
                ) : (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <p className="text-sm text-yellow-800">
                      <strong>Let op:</strong> Geen preview afbeelding ingesteld. Upload een foto of voer een URL in.
                    </p>
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

      {notification && (
        <div className={`fixed bottom-4 right-4 px-6 py-4 rounded-lg shadow-lg z-50 ${
          notification.type === 'success' ? 'bg-green-500' : 'bg-red-500'
        } text-white`}>
          {notification.message}
        </div>
      )}
    </div>
  );
}
