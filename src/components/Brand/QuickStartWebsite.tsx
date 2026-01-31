import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../lib/supabase';
import { Rocket, ExternalLink, Edit2, Trash2, Globe, Eye, Plus, Layout } from 'lucide-react';
import WordPressTemplateSelector from './WordPressTemplateSelector';
import { WordPressEditor } from './WordPressEditor';
import { ExternalBuilderTemplateSelector } from './ExternalBuilderTemplateSelector';

interface Website {
  id: string;
  brand_id: string;
  name: string;
  template_name?: string;
  source_type?: string;
  pages?: Array<{
    name: string;
    path: string;
    html: string;
    modified: boolean;
    order: number;
  }>;
  status: 'draft' | 'preview' | 'live';
  domain?: string;
  preview_url?: string;
  live_url?: string;
  created_at: string;
  updated_at: string;
  published_at?: string;
}

interface Brand {
  id: string;
  name: string;
  slug: string;
  domain?: string;
}

export function QuickStartWebsite() {
  const { user, effectiveBrandId } = useAuth();
  const [websites, setWebsites] = useState<Website[]>([]);
  const [loading, setLoading] = useState(true);
  const [brand, setBrand] = useState<Brand | null>(null);
  const [publishingWebsiteId, setPublishingWebsiteId] = useState<string | null>(null);
  const [togglingWebsiteId, setTogglingWebsiteId] = useState<string | null>(null);
  const [showNewWebsiteModal, setShowNewWebsiteModal] = useState(false);
  const [selectedSourceType, setSelectedSourceType] = useState<'external_builder' | 'wordpress_template' | null>(null);
  const [selectedWPCategory, setSelectedWPCategory] = useState<string | null>(null);
  const [selectedWPTemplates, setSelectedWPTemplates] = useState<any[]>([]);
  const [selectedEBCategory, setSelectedEBCategory] = useState<string | null>(null);
  const [selectedEBTemplates, setSelectedEBTemplates] = useState<any[]>([]);
  const [creatingWebsite, setCreatingWebsite] = useState(false);
  const [editingWebsiteId, setEditingWebsiteId] = useState<string | null>(null);

  useEffect(() => {
    if (effectiveBrandId) {
      loadBrand();
      loadWebsites();
      handleTemplateReturn();
    }
  }, [effectiveBrandId]);

  async function loadBrand() {
    if (!effectiveBrandId) return;

    try {
      const { data, error } = await db.supabase
        .from('brands')
        .select('id, name, slug')
        .eq('id', effectiveBrandId)
        .single();

      if (error) throw error;
      setBrand(data);
    } catch (error) {
      console.error('Error loading brand:', error);
    }
  }

  async function loadWebsites() {
    if (!effectiveBrandId) return;

    setLoading(true);
    try {
      const { data, error } = await db.supabase
        .from('websites')
        .select('*')
        .eq('brand_id', effectiveBrandId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setWebsites(data || []);
    } catch (error) {
      console.error('Error loading websites:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleTemplateReturn() {
    const exportData = localStorage.getItem('template_export');

    if (exportData && effectiveBrandId) {
      try {
        const data = JSON.parse(exportData);

        const { error } = await db.supabase
          .from('websites')
          .insert({
            brand_id: effectiveBrandId,
            created_by: user.id,
            name: `${data.template.charAt(0).toUpperCase() + data.template.slice(1)} Website`,
            slug: `${data.template}-${Date.now()}`,
            template_name: data.template,
            pages: data.pages || [],
            status: 'published',
            is_published: true,
            published_at: new Date().toISOString()
          });

        if (error) throw error;

        localStorage.removeItem('template_export');

        await loadWebsites();

        alert('✅ Website succesvol geïmporteerd!');

      } catch (error) {
        console.error('Error importing website:', error);
        alert('❌ Fout bij importeren website');
      }
    }
  }

  async function generateQuickStartDeeplink(): Promise<string> {
    if (!effectiveBrandId || !db.supabase) return '';

    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    const returnUrl = window.location.href;

    const { data: { session } } = await db.supabase.auth.getSession();
    const jwtToken = session?.access_token || '';

    const params = new URLSearchParams({
      brand_id: effectiveBrandId,
      token: jwtToken,
      apikey: supabaseKey,
      api: `${supabaseUrl}/functions/v1`,
      return_url: returnUrl
    });

    return `https://www.ai-websitestudio.nl/template-selector.html?${params.toString()}`;
  }

  async function editWebsite(website: Website) {
    if (!effectiveBrandId || !website.id || !db.supabase) return;

    if (website.source_type === 'wordpress_template') {
      setEditingWebsiteId(website.id);
    } else if (website.source_type === 'external_builder') {
      if (!website.external_builder_id) {
        alert('❌ Geen externe builder gekoppeld aan deze website');
        return;
      }

      try {
        const { data: builder, error: builderError } = await db.supabase
          .from('external_builders')
          .select('editor_url, name')
          .eq('id', website.external_builder_id)
          .maybeSingle();

        console.log('🔍 Builder data from DB:', { builder, error: builderError });

        if (builderError) {
          throw new Error(`Database error: ${builderError.message}`);
        }

        if (!builder) {
          throw new Error('Builder niet gevonden in database');
        }

        if (!builder.editor_url) {
          throw new Error(`Builder "${builder.name}" heeft geen editor_url geconfigureerd. Neem contact op met de operator.`);
        }

        const { data: pages, error: pagesError } = await db.supabase
          .from('pages')
          .select('id, title, slug')
          .eq('website_id', website.id)
          .order('menu_order', { ascending: true })
          .limit(1);

        if (pagesError) throw pagesError;

        if (!pages || pages.length === 0) {
          throw new Error('Geen pagina gevonden voor deze website');
        }

        const firstPage = pages[0];

        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

        const { data: { session } } = await db.supabase.auth.getSession();
        const jwtToken = session?.access_token || '';

        const response = await fetch(`${supabaseUrl}/functions/v1/generate-builder-jwt`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${jwtToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            brand_id: effectiveBrandId,
            return_url: window.location.href
          })
        });

        const result = await response.json();

        if (result.error) {
          throw new Error(result.error);
        }

        const params = new URLSearchParams({
          page_id: firstPage.id,
          website_id: website.id,
          brand_id: effectiveBrandId,
          token: result.token,
          apikey: supabaseKey,
          api: `${supabaseUrl}/functions/v1`,
          return_url: window.location.href
        });

        const editorUrl = `${builder.editor_url}?${params.toString()}`;
        console.log('🔨 Opening editor:', {
          builder_editor_url: builder.editor_url,
          full_url: editorUrl,
          page_id: firstPage.id,
          website_id: website.id
        });
        window.open(editorUrl, '_blank');
      } catch (error: any) {
        console.error('Error opening builder:', error);
        alert(`❌ Fout bij openen van de builder: ${error.message}`);
      }
    } else {
      try {
        const { data: pages, error: pagesError } = await db.supabase
          .from('pages')
          .select('id, title, slug')
          .eq('website_id', website.id)
          .order('menu_order', { ascending: true })
          .limit(1);

        if (pagesError) throw pagesError;

        if (!pages || pages.length === 0) {
          alert('❌ Geen pagina gevonden voor deze website');
          return;
        }

        const firstPage = pages[0];

        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

        const { data: { session } } = await db.supabase.auth.getSession();
        const jwtToken = session?.access_token || '';

        const params = new URLSearchParams({
          page_id: firstPage.id,
          website_id: website.id,
          brand_id: effectiveBrandId,
          token: jwtToken,
          apikey: supabaseKey,
          api: `${supabaseUrl}/functions/v1`,
          return_url: window.location.href
        });

        window.location.href = `https://www.ai-websitestudio.nl/template-editor.html?${params.toString()}`;
      } catch (error) {
        console.error('Error opening editor:', error);
        alert('❌ Fout bij openen van de editor: ' + (error instanceof Error ? error.message : 'Onbekende fout'));
      }
    }
  }

  async function deleteWebsite(id: string) {
    if (!confirm('Weet je zeker dat je deze website wilt verwijderen?')) return;

    try {
      const { error } = await db.supabase
        .from('websites')
        .delete()
        .eq('id', id);

      if (error) throw error;

      await loadWebsites();
      alert('✅ Website verwijderd');
    } catch (error) {
      console.error('Error deleting website:', error);
      alert('❌ Fout bij verwijderen website');
    }
  }

  async function toggleWebsiteStatus(websiteId: string, currentStatus: string) {
    setTogglingWebsiteId(websiteId);

    const isCurrentlyLive = currentStatus === 'live';
    const newStatus = isCurrentlyLive ? 'draft' : 'live';

    try {
      const updateData: any = {
        status: newStatus,
        updated_at: new Date().toISOString()
      };

      if (newStatus === 'live') {
        updateData.published_at = new Date().toISOString();
      }

      const { error } = await db.supabase
        .from('websites')
        .update(updateData)
        .eq('id', websiteId);

      if (error) throw error;

      await loadWebsites();
    } catch (error) {
      console.error('Error updating website status:', error);
      alert('Fout bij wijzigen status: ' + (error instanceof Error ? error.message : 'Onbekende fout'));
    } finally {
      setTogglingWebsiteId(null);
    }
  }

  function getStatusBadge(status: string) {
    const statusConfig = {
      live: { bg: '#dcfce7', text: '#15803d', label: 'Live' },
      preview: { bg: '#fff3e6', text: '#ff7700', label: 'Preview' },
      draft: { bg: '#f3f4f6', text: '#374151', label: 'Draft' }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.draft;

    return (
      <span
        className="px-3 py-1 text-xs font-semibold rounded-full"
        style={{ backgroundColor: config.bg, color: config.text }}
      >
        {config.label}
      </span>
    );
  }

  function formatDate(dateString: string) {
    return new Date(dateString).toLocaleDateString('nl-NL', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  async function createExternalBuilderWebsite() {
    if (!selectedEBCategory || selectedEBTemplates.length === 0 || !effectiveBrandId) return;

    setCreatingWebsite(true);
    try {
      const websiteSlug = `${selectedEBCategory.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`;

      const { data: websiteData, error: insertError } = await db.supabase
        .from('websites')
        .insert({
          brand_id: effectiveBrandId,
          created_by: user.id,
          name: selectedEBCategory,
          slug: websiteSlug,
          template_name: selectedEBCategory,
          source_type: 'external_builder',
          status: 'draft'
        })
        .select()
        .single();

      if (insertError) throw insertError;

      const selectedTemplateIds = selectedEBTemplates.map(t => t.id);

      if (selectedTemplateIds.length === 0) {
        throw new Error('Geen templates geselecteerd');
      }

      const { data: templatePages, error: templateError } = await db.supabase
        .from('website_page_templates')
        .select('*')
        .in('id', selectedTemplateIds)
        .order('order_index');

      if (templateError) throw templateError;

      if (!templatePages || templatePages.length === 0) {
        throw new Error(`Geen template pages gevonden voor IDs: ${selectedTemplateIds.join(', ')}`);
      }

      if (templatePages.length !== selectedTemplateIds.length) {
        console.warn(`Verwachtte ${selectedTemplateIds.length} templates, maar kreeg ${templatePages.length}`);
      }

      if (templatePages && templatePages.length > 0) {
        const baseTimestamp = Date.now();
        const newPages = templatePages.map((tp: any, index: number) => {
          const baseSlug = tp.template_name.toLowerCase().replace(/\s+/g, '-');
          const uniqueSlug = index === 0 ? baseSlug : `${baseSlug}-${baseTimestamp + index}`;

          return {
            website_id: websiteData.id,
            brand_id: effectiveBrandId,
            created_by: user.id,
            title: tp.template_name,
            slug: uniqueSlug,
            status: 'draft',
            body_html: tp.cached_html || '',
            content_json: {},
            show_in_menu: true,
            menu_order: tp.order_index || index,
            menu_label: tp.template_name
          };
        });

        const { error: pagesError } = await db.supabase
          .from('pages')
          .insert(newPages);

        if (pagesError) throw pagesError;
      }

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const previewUrl = `${supabaseUrl}/functions/v1/website-viewer?website_id=${websiteData.id}`;

      await db.supabase
        .from('websites')
        .update({
          preview_url: previewUrl,
          live_url: previewUrl
        })
        .eq('id', websiteData.id);

      setShowNewWebsiteModal(false);
      setSelectedSourceType(null);
      setSelectedEBCategory(null);
      setSelectedEBTemplates([]);

      await loadWebsites();

      alert(`✅ Website "${selectedEBCategory}" aangemaakt met ${templatePages?.length || 0} pagina's!\n\n📍 Preview URL: ${previewUrl}\n\nJe gaat nu naar de editor om de website aan te passen.`);

      await editWebsite(websiteData);
    } catch (error: any) {
      console.error('Error creating external builder website:', error);

      // Check for duplicate key error
      if (error?.code === '23505' || error?.message?.includes('duplicate key') || error?.message?.includes('already exists')) {
        alert('ℹ️ Deze website bestaat al! Je kunt deze vinden in Website Management.');
        await loadWebsites();
        return;
      }

      const errorMsg = error?.message || JSON.stringify(error);
      alert('❌ Fout bij aanmaken website: ' + errorMsg);
    } finally {
      setCreatingWebsite(false);
    }
  }

  async function createWordPressWebsite() {
    if (!selectedWPCategory || selectedWPTemplates.length === 0 || !effectiveBrandId) return;

    setCreatingWebsite(true);
    try {
      console.log('Creating website with templates:', selectedWPTemplates);

      // Fetch HTML for templates that don't have cached_html
      const templatesWithHtml = await Promise.all(
        selectedWPTemplates.map(async (template) => {
          console.log(`Template ${template.template_name} - FULL OBJECT:`, template);
          console.log(`Template ${template.template_name} - DETAILS:`, {
            has_cached_html: !!template.cached_html,
            html_length: template.cached_html?.length || 0,
            cached_html_type: typeof template.cached_html,
          });

          // If no cached HTML, fetch it from WordPress
          if (!template.cached_html || template.cached_html.length === 0) {
            console.log(`Fetching HTML for ${template.template_name}...`);
            try {
              const response = await fetch(`${db.supabase.supabaseUrl}/functions/v1/wordpress-fetch-template`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${db.supabase.supabaseKey}`
                },
                body: JSON.stringify({ template_id: template.id })
              });

              if (response.ok) {
                const result = await response.json();
                console.log(`Fetched HTML for ${template.template_name}:`, result.template?.content?.substring(0, 100));
                return { ...template, cached_html: result.template?.content || '' };
              } else {
                const errorBody = await response.text();
                console.error(`Failed to fetch HTML for ${template.template_name}:`, response.status, errorBody);
              }
            } catch (error) {
              console.error(`Error fetching HTML for ${template.template_name}:`, error);
            }
          }

          return template;
        })
      );

      const baseTimestamp = Date.now();
      const pages = templatesWithHtml.map((template, index) => {
        const basePath = template.template_name.toLowerCase().replace(/\s+/g, '-');
        const uniquePath = index === 0 ? '/' : `/${basePath}-${baseTimestamp + index}`;

        return {
          name: template.template_name,
          path: uniquePath,
          html: template.cached_html || '',
          modified: false,
          order: index
        };
      });

      const { error: insertError } = await db.supabase
        .from('websites')
        .insert({
          brand_id: effectiveBrandId,
          created_by: user.id,
          name: selectedWPCategory,
          slug: `${selectedWPCategory.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`,
          template_name: selectedWPCategory,
          source_type: 'wordpress_template',
          pages: pages,
          status: 'draft'
        });

      if (insertError) throw insertError;

      setShowNewWebsiteModal(false);
      setSelectedSourceType(null);
      setSelectedWPCategory(null);
      setSelectedWPTemplates([]);
      await loadWebsites();

      alert(`✅ Website "${selectedWPCategory}" aangemaakt met ${pages.length} pagina's! Je kunt deze nu aanpassen en publiceren.`);
    } catch (error: any) {
      console.error('Error creating WordPress website:', error);

      // Check for duplicate key error
      if (error?.code === '23505' || error?.message?.includes('duplicate key') || error?.message?.includes('already exists')) {
        alert('ℹ️ Deze website bestaat al! Je kunt deze vinden in Website Management.');
        await loadWebsites();
        return;
      }

      const errorMsg = error?.message || JSON.stringify(error);
      alert('❌ Fout bij aanmaken website: ' + errorMsg);
    } finally {
      setCreatingWebsite(false);
    }
  }

  if (editingWebsiteId) {
    return (
      <WordPressEditor
        websiteId={editingWebsiteId}
        onBack={() => {
          setEditingWebsiteId(null);
          loadWebsites();
        }}
      />
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 mx-auto mb-4" style={{ borderColor: '#ff7700' }}></div>
          <p className="text-gray-600">Laden...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Rocket className="w-8 h-8" style={{ color: '#ff7700' }} />
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Website Beheer</h2>
            <p className="text-gray-600 text-sm mt-1">
              Maak en beheer professionele websites met onze templates
            </p>
          </div>
        </div>
        <button
          onClick={() => setShowNewWebsiteModal(true)}
          className="text-white px-6 py-3 rounded-lg transition-colors flex items-center gap-2 font-medium"
          style={{ backgroundColor: '#ff7700' }}
          onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#e66900'}
          onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#ff7700'}
        >
          <Plus size={20} />
          Nieuwe Website
        </button>
      </div>

      {websites.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-lg border border-gray-200">
          <Globe className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Nog geen websites</h3>
          <p className="text-gray-600 mb-6">Begin met het maken van je eerste website!</p>
          <button
            onClick={async () => {
              const deeplink = await generateQuickStartDeeplink();
              if (deeplink) {
                window.location.href = deeplink;
              }
            }}
            className="text-white px-6 py-3 rounded-lg transition-colors inline-flex items-center gap-2 font-medium"
            style={{ backgroundColor: '#ff7700' }}
            onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#e66900'}
            onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#ff7700'}
          >
            <Rocket size={20} />
            Maak je eerste website
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Naam
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Template
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Pagina's
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Datum
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Publiceren
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Acties
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {websites.map((website) => (
                <tr key={website.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div>
                        <div className="text-sm font-semibold text-gray-900">{website.name}</div>
                        {website.live_url && (
                          <div className="text-xs text-gray-500">{website.live_url}</div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900 capitalize">
                      {website.template_name || '-'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {website.pages && Array.isArray(website.pages) ? website.pages.length : 0}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{formatDate(website.created_at)}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getStatusBadge(website.status)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <button
                      onClick={() => toggleWebsiteStatus(website.id, website.status)}
                      disabled={togglingWebsiteId === website.id}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                        website.status === 'live' ? 'bg-green-600' : 'bg-gray-300'
                      }`}
                      title={togglingWebsiteId === website.id ? 'Bezig...' : (website.status === 'live' ? 'Live - Klik om offline te zetten' : 'Offline - Klik om live te zetten')}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          website.status === 'live' ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={async () => {
                          if (website.source_type === 'external_builder' && website.external_builder_id) {
                            if (!website.pages || website.pages.length === 0) {
                              alert('❌ Geen pagina\'s gevonden om te bekijken');
                              return;
                            }

                            const indexPage = website.pages.find((p: any) => p.slug === 'index' || p.is_homepage);
                            const firstPage = indexPage || website.pages[0];

                            if (!firstPage?.id) {
                              alert('❌ Geen geldige pagina gevonden');
                              return;
                            }

                            const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
                            const previewUrl = `${supabaseUrl}/functions/v1/pages-preview?page_id=${firstPage.id}`;
                            console.log('📱 Opening preview URL:', previewUrl);
                            console.log('📄 Page details:', { id: firstPage.id, slug: firstPage.slug, name: firstPage.name });
                            window.open(previewUrl, '_blank');
                          } else if (website.live_url) {
                            const url = website.live_url.startsWith('http') ? website.live_url : `https://${website.live_url}`;
                            window.open(url, '_blank');
                          } else {
                            alert('❌ Preview URL niet beschikbaar');
                          }
                        }}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Bekijk website"
                      >
                        <Eye size={18} />
                      </button>
                      <button
                        onClick={() => editWebsite(website)}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                        style={{ color: '#ff7700' }}
                        title="Bewerken"
                      >
                        <Edit2 size={18} />
                      </button>
                      <button
                        onClick={() => deleteWebsite(website.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Verwijderen"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showNewWebsiteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-2xl font-bold text-gray-900">Nieuwe Website Maken</h3>
                <button
                  onClick={() => {
                    setShowNewWebsiteModal(false);
                    setSelectedSourceType(null);
                    setSelectedWPCategory(null);
                    setSelectedWPTemplates([]);
                    setSelectedEBCategory(null);
                    setSelectedEBTemplates([]);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="p-6">
              {!selectedSourceType ? (
                <div className="space-y-4">
                  <p className="text-gray-600 mb-6">Kies hoe je jouw website wilt maken:</p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <button
                      onClick={() => setSelectedSourceType('wordpress_template')}
                      className="p-6 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all text-left"
                    >
                      <div className="flex items-start gap-4">
                        <div className="p-3 bg-blue-100 rounded-lg">
                          <Layout className="h-8 w-8 text-blue-600" />
                        </div>
                        <div>
                          <h4 className="text-lg font-semibold text-gray-900 mb-2">WordPress Templates</h4>
                          <p className="text-sm text-gray-600">
                            Kies uit professionele, kant-en-klare templates. Snel en makkelijk aanpasbaar.
                          </p>
                          <div className="mt-3 flex items-center gap-2 text-sm text-green-600">
                            <span>✓</span>
                            <span>Aanbevolen voor snelle start</span>
                          </div>
                        </div>
                      </div>
                    </button>

                    <button
                      onClick={() => setSelectedSourceType('external_builder')}
                      className="p-6 border-2 border-gray-200 rounded-lg hover:border-orange-500 hover:bg-orange-50 transition-all text-left"
                    >
                      <div className="flex items-start gap-4">
                        <div className="p-3 bg-orange-100 rounded-lg">
                          <Rocket className="h-8 w-8" style={{ color: '#ff7700' }} />
                        </div>
                        <div>
                          <h4 className="text-lg font-semibold text-gray-900 mb-2">Externe Builder Templates</h4>
                          <p className="text-sm text-gray-600">
                            Professionele templates met volledige aanpasbaarheid via onze externe editor.
                          </p>
                          <div className="mt-3 flex items-center gap-2 text-sm" style={{ color: '#ff7700' }}>
                            <span>→</span>
                            <span>Met drag & drop editor</span>
                          </div>
                        </div>
                      </div>
                    </button>
                  </div>
                </div>
              ) : selectedSourceType === 'wordpress_template' ? (
                <div className="space-y-6">
                  <WordPressTemplateSelector
                    onSelect={(category, templates) => {
                      setSelectedWPCategory(category);
                      setSelectedWPTemplates(templates);
                    }}
                    selectedCategory={selectedWPCategory}
                  />

                  {selectedWPCategory && (
                    <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
                      <button
                        onClick={() => {
                          setSelectedSourceType(null);
                          setSelectedWPCategory(null);
                          setSelectedWPTemplates([]);
                        }}
                        className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        Terug
                      </button>
                      <button
                        onClick={createWordPressWebsite}
                        disabled={creatingWebsite}
                        className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                      >
                        {creatingWebsite ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                            <span>Bezig...</span>
                          </>
                        ) : (
                          <>
                            <Plus className="h-5 w-5" />
                            <span>Website Aanmaken</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              ) : selectedSourceType === 'external_builder' ? (
                <div className="space-y-6">
                  <ExternalBuilderTemplateSelector
                    onSelect={(category, templates) => {
                      setSelectedEBCategory(category);
                      setSelectedEBTemplates(templates);
                    }}
                    selectedCategory={selectedEBCategory}
                  />

                  {selectedEBCategory && selectedEBTemplates.length > 0 && (
                    <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
                      <button
                        onClick={() => {
                          setSelectedSourceType(null);
                          setSelectedEBCategory(null);
                          setSelectedEBTemplates([]);
                        }}
                        className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        Terug
                      </button>
                      <button
                        onClick={createExternalBuilderWebsite}
                        disabled={creatingWebsite}
                        className="px-6 py-3 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        style={{ backgroundColor: '#ff7700' }}
                        onMouseOver={(e) => !creatingWebsite && (e.currentTarget.style.backgroundColor = '#e66900')}
                        onMouseOut={(e) => !creatingWebsite && (e.currentTarget.style.backgroundColor = '#ff7700')}
                      >
                        {creatingWebsite ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                            <span>Website aanmaken...</span>
                          </>
                        ) : (
                          <>
                            <Rocket className="h-5 w-5" />
                            <span>Maak Website & Open Editor</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
