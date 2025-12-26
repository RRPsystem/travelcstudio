import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Plus, Image, ExternalLink, Trash2, ArrowUp, ArrowDown, Save, Clock, CheckCircle, XCircle } from 'lucide-react';

interface WordPressTemplate {
  id: string;
  name: string;
  description: string | null;
  preview_image_url: string | null;
  example_site_url: string | null;
  is_active: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

interface TemplateSelection {
  id: string;
  brand_id: string;
  template_id: string;
  status: 'pending_setup' | 'in_progress' | 'active' | 'cancelled';
  selected_at: string;
  setup_started_at: string | null;
  setup_completed_at: string | null;
  operator_id: string | null;
  operator_notes: string | null;
  brand: {
    name: string;
    wordpress_url: string | null;
    wordpress_username: string | null;
  };
  template: {
    name: string;
  };
}

interface SetupFormData {
  wordpress_url: string;
  wordpress_username: string;
  wordpress_app_password: string;
}

export default function WordPressTemplateSetup() {
  const [templates, setTemplates] = useState<WordPressTemplate[]>([]);
  const [selections, setSelections] = useState<TemplateSelection[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'templates' | 'requests'>('templates');
  const [editingTemplate, setEditingTemplate] = useState<Partial<WordPressTemplate> | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [setupFormData, setSetupFormData] = useState<Record<string, SetupFormData>>({});
  const [setupInProgress, setSetupInProgress] = useState<Record<string, boolean>>({});

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    await Promise.all([loadTemplates(), loadSelections()]);
    setLoading(false);
  };

  const loadTemplates = async () => {
    const { data, error } = await supabase
      .from('wordpress_site_templates')
      .select('*')
      .order('display_order', { ascending: true });

    if (error) {
      console.error('Error loading templates:', error);
      return;
    }

    setTemplates(data || []);
  };

  const loadSelections = async () => {
    const { data, error } = await supabase
      .from('wordpress_template_selections')
      .select(`
        *,
        brand:brands(name, wordpress_url, wordpress_username),
        template:wordpress_site_templates(name)
      `)
      .order('selected_at', { ascending: false });

    if (error) {
      console.error('Error loading selections:', error);
      return;
    }

    setSelections(data || []);

    const formData: Record<string, SetupFormData> = {};
    data?.forEach((selection: any) => {
      formData[selection.id] = {
        wordpress_url: selection.brand.wordpress_url || '',
        wordpress_username: selection.brand.wordpress_username || '',
        wordpress_app_password: '',
      };
    });
    setSetupFormData(formData);
  };

  const saveTemplate = async () => {
    if (!editingTemplate) return;

    if (editingTemplate.id) {
      const { error } = await supabase
        .from('wordpress_site_templates')
        .update({
          name: editingTemplate.name,
          description: editingTemplate.description,
          preview_image_url: editingTemplate.preview_image_url,
          example_site_url: editingTemplate.example_site_url,
          is_active: editingTemplate.is_active,
          display_order: editingTemplate.display_order,
        })
        .eq('id', editingTemplate.id);

      if (error) {
        console.error('Error updating template:', error);
        alert(`Fout bij updaten template: ${error.message}`);
        return;
      }
    } else {
      const maxOrder = Math.max(...templates.map(t => t.display_order), 0);
      const { error } = await supabase
        .from('wordpress_site_templates')
        .insert({
          name: editingTemplate.name,
          description: editingTemplate.description,
          preview_image_url: editingTemplate.preview_image_url,
          example_site_url: editingTemplate.example_site_url,
          is_active: editingTemplate.is_active ?? true,
          display_order: editingTemplate.display_order ?? maxOrder + 1,
        });

      if (error) {
        console.error('Error creating template:', error);
        alert(`Fout bij aanmaken template: ${error.message}`);
        return;
      }
    }

    setEditingTemplate(null);
    setShowAddForm(false);
    loadTemplates();
  };

  const deleteTemplate = async (id: string) => {
    if (!confirm('Weet je zeker dat je deze template wilt verwijderen?')) return;

    const { error } = await supabase
      .from('wordpress_site_templates')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting template:', error);
      alert('Fout bij verwijderen template');
      return;
    }

    loadTemplates();
  };

  const moveTemplate = async (id: string, direction: 'up' | 'down') => {
    const index = templates.findIndex(t => t.id === id);
    if (index === -1) return;
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === templates.length - 1) return;

    const swapIndex = direction === 'up' ? index - 1 : index + 1;
    const template = templates[index];
    const swapTemplate = templates[swapIndex];

    const { error } = await supabase.rpc('swap_template_order', {
      id1: template.id,
      order1: swapTemplate.display_order,
      id2: swapTemplate.id,
      order2: template.display_order,
    });

    if (error) {
      const newOrder1 = swapTemplate.display_order;
      const newOrder2 = template.display_order;

      await supabase
        .from('wordpress_site_templates')
        .update({ display_order: newOrder1 })
        .eq('id', template.id);

      await supabase
        .from('wordpress_site_templates')
        .update({ display_order: newOrder2 })
        .eq('id', swapTemplate.id);
    }

    loadTemplates();
  };

  const updateSelectionStatus = async (
    selectionId: string,
    status: 'in_progress' | 'active' | 'cancelled',
    notes?: string
  ) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const updates: any = { status };

    if (status === 'in_progress' && !selections.find(s => s.id === selectionId)?.setup_started_at) {
      updates.setup_started_at = new Date().toISOString();
      updates.operator_id = user.id;
    }

    if (status === 'active') {
      updates.setup_completed_at = new Date().toISOString();
    }

    if (notes !== undefined) {
      updates.operator_notes = notes;
    }

    const { error } = await supabase
      .from('wordpress_template_selections')
      .update(updates)
      .eq('id', selectionId);

    if (error) {
      console.error('Error updating selection:', error);
      alert('Fout bij updaten status');
      return;
    }

    loadSelections();
  };

  const setupWordPressForBrand = async (selectionId: string) => {
    const selection = selections.find(s => s.id === selectionId);
    if (!selection) return;

    const formData = setupFormData[selectionId];
    if (!formData?.wordpress_url || !formData?.wordpress_username || !formData?.wordpress_app_password) {
      alert('Vul alle WordPress gegevens in');
      return;
    }

    setSetupInProgress({ ...setupInProgress, [selectionId]: true });

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('Niet ingelogd');
      }

      await updateSelectionStatus(selectionId, 'in_progress');

      const { error: brandError } = await supabase
        .from('brands')
        .update({
          wordpress_url: formData.wordpress_url,
          wordpress_username: formData.wordpress_username,
          wordpress_app_password: formData.wordpress_app_password,
          content_system: 'wordpress',
        })
        .eq('id', selection.brand_id);

      if (brandError) {
        throw new Error(`Fout bij opslaan WordPress credentials: ${brandError.message}`);
      }

      const { data: existingWebsite } = await supabase
        .from('websites')
        .select('id')
        .eq('brand_id', selection.brand_id)
        .maybeSingle();

      let websiteId = existingWebsite?.id;

      if (!websiteId) {
        const { data: newWebsite, error: websiteError } = await supabase
          .from('websites')
          .insert({
            brand_id: selection.brand_id,
            name: `${selection.brand.name} Website`,
            slug: selection.brand.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
            status: 'published',
            is_published: true,
            created_by: user.id,
          })
          .select()
          .single();

        if (websiteError) {
          throw new Error(`Fout bij aanmaken website: ${websiteError.message}`);
        }

        websiteId = newWebsite.id;
      }

      const wpUrl = formData.wordpress_url.replace(/\/$/, '');
      const wpApiUrl = `${wpUrl}/wp-json/wp/v2/pages?per_page=100&_fields=id,title,slug,link,status`;

      const authString = btoa(`${formData.wordpress_username}:${formData.wordpress_app_password}`);
      const wpResponse = await fetch(wpApiUrl, {
        headers: {
          'Authorization': `Basic ${authString}`,
          'Content-Type': 'application/json',
        },
      });

      if (!wpResponse.ok) {
        console.warn('Kon WordPress paginas niet ophalen, maar setup is wel voltooid');
      } else {
        const wpPages = await wpResponse.json();

        const pagesToInsert = wpPages.map((page: any, index: number) => ({
          website_id: websiteId,
          name: page.title.rendered || page.title,
          slug: page.slug,
          content: JSON.stringify({
            type: 'wordpress',
            wordpress_id: page.id,
            url: page.link,
            edit_url: `${wpUrl}/wp-admin/post.php?post=${page.id}&action=edit`,
          }),
          sort_order: index,
        }));

        const { error: pagesError } = await supabase
          .from('website_pages')
          .insert(pagesToInsert);

        if (pagesError) {
          console.error('Fout bij importeren paginas:', pagesError);
        }
      }

      await updateSelectionStatus(selectionId, 'active', 'WordPress setup succesvol afgerond');

      alert('WordPress setup succesvol afgerond! De brand kan nu aan de slag in Pagina Beheer.');

    } catch (error: any) {
      console.error('Setup error:', error);
      alert(`Fout bij setup: ${error.message}`);
      await updateSelectionStatus(selectionId, 'pending_setup', error.message);
    } finally {
      setSetupInProgress({ ...setupInProgress, [selectionId]: false });
    }
  };

  const getStatusBadge = (status: string) => {
    const config = {
      pending_setup: { label: 'Wacht op Setup', color: 'bg-yellow-100 text-yellow-800', icon: Clock },
      in_progress: { label: 'Bezig', color: 'bg-blue-100 text-blue-800', icon: Clock },
      active: { label: 'Actief', color: 'bg-green-100 text-green-800', icon: CheckCircle },
      cancelled: { label: 'Geannuleerd', color: 'bg-gray-100 text-gray-800', icon: XCircle },
    };

    const { label, color, icon: Icon } = config[status as keyof typeof config] || config.pending_setup;

    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${color}`}>
        <Icon className="w-3 h-3" />
        {label}
      </span>
    );
  };

  if (loading) {
    return <div className="p-8">Laden...</div>;
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">WordPress Template Setup</h1>
        <p className="text-gray-600">Beheer WordPress templates en setup verzoeken</p>
      </div>

      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setActiveTab('templates')}
          className={`px-4 py-2 rounded-lg font-medium ${
            activeTab === 'templates'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Templates ({templates.length})
        </button>
        <button
          onClick={() => setActiveTab('requests')}
          className={`px-4 py-2 rounded-lg font-medium ${
            activeTab === 'requests'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Setup Verzoeken ({selections.filter(s => s.status === 'pending_setup').length})
        </button>
      </div>

      {activeTab === 'templates' && (
        <div>
          <div className="mb-6">
            <button
              onClick={() => {
                setEditingTemplate({ is_active: true, display_order: templates.length + 1 });
                setShowAddForm(true);
              }}
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
            >
              <Plus className="w-5 h-5" />
              Nieuwe Template
            </button>
          </div>

          {(showAddForm || editingTemplate) && (
            <div className="bg-white p-6 rounded-lg border border-gray-200 mb-6">
              <h3 className="font-semibold text-lg mb-4">
                {editingTemplate?.id ? 'Template Bewerken' : 'Nieuwe Template'}
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Template Naam *
                  </label>
                  <input
                    type="text"
                    value={editingTemplate?.name || ''}
                    onChange={(e) => setEditingTemplate({ ...editingTemplate, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    placeholder="Bijv. Modern Travel Agency"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Beschrijving
                  </label>
                  <textarea
                    value={editingTemplate?.description || ''}
                    onChange={(e) => setEditingTemplate({ ...editingTemplate, description: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    rows={3}
                    placeholder="Korte beschrijving van de template"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Preview Afbeelding URL
                  </label>
                  <input
                    type="url"
                    value={editingTemplate?.preview_image_url || ''}
                    onChange={(e) => setEditingTemplate({ ...editingTemplate, preview_image_url: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    placeholder="https://voorbeeld.com/screenshot.jpg"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Voorbeeld Website URL
                  </label>
                  <input
                    type="url"
                    value={editingTemplate?.example_site_url || ''}
                    onChange={(e) => setEditingTemplate({ ...editingTemplate, example_site_url: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    placeholder="https://voorbeeld-site.com"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={editingTemplate?.is_active ?? true}
                    onChange={(e) => setEditingTemplate({ ...editingTemplate, is_active: e.target.checked })}
                    className="w-4 h-4"
                  />
                  <label className="text-sm font-medium text-gray-700">
                    Template actief (zichtbaar voor brands)
                  </label>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={saveTemplate}
                    disabled={!editingTemplate?.name}
                    className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  >
                    <Save className="w-4 h-4" />
                    Opslaan
                  </button>
                  <button
                    onClick={() => {
                      setEditingTemplate(null);
                      setShowAddForm(false);
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    Annuleren
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {templates.map((template, index) => (
              <div key={template.id} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                {template.preview_image_url ? (
                  <img
                    src={template.preview_image_url}
                    alt={template.name}
                    className="w-full h-48 object-cover"
                  />
                ) : (
                  <div className="w-full h-48 bg-gray-100 flex items-center justify-center">
                    <Image className="w-12 h-12 text-gray-400" />
                  </div>
                )}

                <div className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-semibold text-lg">{template.name}</h3>
                    {!template.is_active && (
                      <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                        Inactief
                      </span>
                    )}
                  </div>

                  {template.description && (
                    <p className="text-sm text-gray-600 mb-3">{template.description}</p>
                  )}

                  {template.example_site_url && (
                    <a
                      href={template.example_site_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 mb-3"
                    >
                      <ExternalLink className="w-4 h-4" />
                      Bekijk Voorbeeld
                    </a>
                  )}

                  <div className="flex items-center gap-2 pt-3 border-t border-gray-100">
                    <button
                      onClick={() => moveTemplate(template.id, 'up')}
                      disabled={index === 0}
                      className="p-1 hover:bg-gray-100 rounded disabled:opacity-30"
                      title="Omhoog"
                    >
                      <ArrowUp className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => moveTemplate(template.id, 'down')}
                      disabled={index === templates.length - 1}
                      className="p-1 hover:bg-gray-100 rounded disabled:opacity-30"
                      title="Omlaag"
                    >
                      <ArrowDown className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setEditingTemplate(template)}
                      className="ml-auto text-sm text-blue-600 hover:text-blue-700"
                    >
                      Bewerken
                    </button>
                    <button
                      onClick={() => deleteTemplate(template.id)}
                      className="text-sm text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {templates.length === 0 && (
            <div className="text-center py-12 bg-gray-50 rounded-lg">
              <Image className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600">Geen templates toegevoegd</p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'requests' && (
        <div className="space-y-6">
          {selections.map((selection) => (
            <div key={selection.id} className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold">{selection.brand.name}</h3>
                  <p className="text-sm text-gray-600">Template: {selection.template.name}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    Aangevraagd: {new Date(selection.selected_at).toLocaleDateString('nl-NL')}
                  </p>
                </div>
                {getStatusBadge(selection.status)}
              </div>

              {selection.operator_notes && (
                <div className="mb-4 p-3 bg-gray-50 rounded">
                  <p className="text-sm text-gray-700">{selection.operator_notes}</p>
                </div>
              )}

              {(selection.status === 'pending_setup' || selection.status === 'in_progress') && (
                <div className="space-y-4 border-t pt-4">
                  <h4 className="font-medium">WordPress Credentials</h4>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        WordPress URL *
                      </label>
                      <input
                        type="url"
                        value={setupFormData[selection.id]?.wordpress_url || ''}
                        onChange={(e) => setSetupFormData({
                          ...setupFormData,
                          [selection.id]: {
                            ...setupFormData[selection.id],
                            wordpress_url: e.target.value,
                          }
                        })}
                        placeholder="https://voorbeeld.com"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                        disabled={setupInProgress[selection.id]}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        WordPress Username *
                      </label>
                      <input
                        type="text"
                        value={setupFormData[selection.id]?.wordpress_username || ''}
                        onChange={(e) => setSetupFormData({
                          ...setupFormData,
                          [selection.id]: {
                            ...setupFormData[selection.id],
                            wordpress_username: e.target.value,
                          }
                        })}
                        placeholder="admin"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                        disabled={setupInProgress[selection.id]}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Application Password *
                      </label>
                      <input
                        type="password"
                        value={setupFormData[selection.id]?.wordpress_app_password || ''}
                        onChange={(e) => setSetupFormData({
                          ...setupFormData,
                          [selection.id]: {
                            ...setupFormData[selection.id],
                            wordpress_app_password: e.target.value,
                          }
                        })}
                        placeholder="xxxx xxxx xxxx xxxx"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                        disabled={setupInProgress[selection.id]}
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-2">
                    <button
                      onClick={() => setupWordPressForBrand(selection.id)}
                      disabled={setupInProgress[selection.id] ||
                        !setupFormData[selection.id]?.wordpress_url ||
                        !setupFormData[selection.id]?.wordpress_username ||
                        !setupFormData[selection.id]?.wordpress_app_password}
                      className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50"
                    >
                      {setupInProgress[selection.id] ? (
                        <>
                          <Clock className="w-4 h-4 animate-spin" />
                          Bezig met setup...
                        </>
                      ) : (
                        <>
                          <CheckCircle className="w-4 h-4" />
                          Setup & Activeer
                        </>
                      )}
                    </button>

                    {selection.status === 'in_progress' && !setupInProgress[selection.id] && (
                      <button
                        onClick={() => {
                          const notes = prompt('Reden van annulering:', selection.operator_notes || '');
                          if (notes !== null) {
                            updateSelectionStatus(selection.id, 'cancelled', notes);
                          }
                        }}
                        className="px-4 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50"
                      >
                        Annuleren
                      </button>
                    )}
                  </div>
                </div>
              )}

              {selection.status === 'active' && (
                <div className="border-t pt-4">
                  <div className="flex items-center gap-2 text-green-600">
                    <CheckCircle className="w-5 h-5" />
                    <span className="font-medium">Setup voltooid</span>
                  </div>
                  {selection.setup_completed_at && (
                    <p className="text-sm text-gray-600 mt-1">
                      Afgerond op: {new Date(selection.setup_completed_at).toLocaleString('nl-NL')}
                    </p>
                  )}
                </div>
              )}

              {selection.status === 'cancelled' && (
                <div className="border-t pt-4">
                  <div className="flex items-center gap-2 text-gray-600">
                    <XCircle className="w-5 h-5" />
                    <span className="font-medium">Geannuleerd</span>
                  </div>
                </div>
              )}
            </div>
          ))}

          {selections.length === 0 && (
            <div className="text-center py-12 bg-gray-50 rounded-lg">
              <p className="text-gray-600">Geen template verzoeken</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
