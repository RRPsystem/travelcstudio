import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../lib/supabase';
import { Rocket, ExternalLink, Edit2, Trash2, Globe, Calendar, CheckCircle, Eye, ChevronDown, ChevronUp, Check, X } from 'lucide-react';

interface Website {
  id: string;
  brand_id: string;
  name: string;
  template_name?: string;
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
  const { user } = useAuth();
  const [websites, setWebsites] = useState<Website[]>([]);
  const [loading, setLoading] = useState(true);
  const [brand, setBrand] = useState<Brand | null>(null);
  const [publishingWebsiteId, setPublishingWebsiteId] = useState<string | null>(null);
  const [expandedWebsites, setExpandedWebsites] = useState<Set<string>>(new Set());
  const [editingNameId, setEditingNameId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  useEffect(() => {
    if (user?.brand_id) {
      loadBrand();
      loadWebsites();
      handleTemplateReturn();
    }
  }, [user?.brand_id]);

  async function loadBrand() {
    if (!user?.brand_id) return;

    try {
      const { data, error } = await db.supabase
        .from('brands')
        .select('id, name, slug, domain')
        .eq('id', user.brand_id)
        .single();

      if (error) throw error;
      setBrand(data);
    } catch (error) {
      console.error('Error loading brand:', error);
    }
  }

  async function loadWebsites() {
    if (!user?.brand_id) return;

    setLoading(true);
    try {
      const { data, error } = await db.supabase
        .from('websites')
        .select('*')
        .eq('brand_id', user.brand_id)
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

    if (exportData && user?.brand_id) {
      try {
        const data = JSON.parse(exportData);

        const { error } = await db.supabase
          .from('websites')
          .insert({
            brand_id: user.brand_id,
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
    if (!user?.brand_id || !db.supabase) return '';

    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    const returnUrl = window.location.href;

    const { data: { session } } = await db.supabase.auth.getSession();
    const jwtToken = session?.access_token || '';

    const params = new URLSearchParams({
      brand_id: user.brand_id,
      token: jwtToken,
      apikey: supabaseKey,
      api: `${supabaseUrl}/functions/v1`,
      return_url: returnUrl
    });

    return `https://www.ai-websitestudio.nl/template-selector.html?${params.toString()}`;
  }

  async function editWebsite(website: Website) {
    if (!user?.brand_id || !website.id || !db.supabase) return;

    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

    const { data: { session } } = await db.supabase.auth.getSession();
    const jwtToken = session?.access_token || '';

    const params = new URLSearchParams({
      website_id: website.id,
      brand_id: user.brand_id,
      token: jwtToken,
      apikey: supabaseKey,
      api: `${supabaseUrl}/functions/v1`,
      return_url: window.location.href
    });

    window.location.href = `https://www.ai-websitestudio.nl/template-editor.html?${params.toString()}`;
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

  async function publishToLive(website: Website) {
    if (!brand?.domain) {
      alert('⚠️ Configureer eerst een domein in Brand Settings');
      return;
    }

    if (!confirm(`Website publiceren naar ${brand.domain}?`)) {
      return;
    }

    setPublishingWebsiteId(website.id);

    try {
      const response = await fetch('/api/vercel/add-domain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          domain: brand.domain,
          websiteId: website.id,
          type: 'live'
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to publish to live domain');
      }

      const { error: updateError } = await db.supabase
        .from('websites')
        .update({
          live_url: brand.domain,
          status: 'live',
          published_at: new Date().toISOString()
        })
        .eq('id', website.id);

      if (updateError) throw updateError;

      await loadWebsites();
      alert(`✅ Website live op ${brand.domain}!`);

    } catch (error) {
      console.error('Publish error:', error);
      alert('❌ Fout bij publiceren naar live domein: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setPublishingWebsiteId(null);
    }
  }

  function getStatusBadge(status: string) {
    switch (status) {
      case 'live':
        return <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded">🟢 Live</span>;
      case 'preview':
        return <span className="inline-flex items-center gap-1 px-2 py-1 bg-yellow-100 text-yellow-700 text-xs font-medium rounded">🟡 Preview</span>;
      default:
        return <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-700 text-xs font-medium rounded">⚪ Draft</span>;
    }
  }

  function toggleWebsite(id: string) {
    setExpandedWebsites(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  }

  function navigateToSettings() {
    window.location.hash = '#brand-settings-domains';
  }

  function startEditingName(website: Website) {
    setEditingNameId(website.id);
    setEditingName(website.name);
  }

  function cancelEditingName() {
    setEditingNameId(null);
    setEditingName('');
  }

  async function saveWebsiteName(websiteId: string) {
    if (!editingName.trim()) {
      alert('⚠️ Naam mag niet leeg zijn');
      return;
    }

    try {
      const { error } = await db.supabase
        .from('websites')
        .update({ name: editingName.trim() })
        .eq('id', websiteId);

      if (error) throw error;

      await loadWebsites();
      setEditingNameId(null);
      setEditingName('');
    } catch (error) {
      console.error('Error updating website name:', error);
      alert('❌ Fout bij opslaan naam');
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Laden...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-3">
              <Rocket className="w-8 h-8 text-blue-600" />
              <h2 className="text-2xl font-bold text-gray-900">Quick Start Website</h2>
            </div>
            <p className="text-gray-600 mb-4">
              Maak snel een professionele website met onze kant-en-klare templates.
              Kies een template, pas deze aan naar wens, en publiceer direct!
            </p>
            <button
              onClick={async () => {
                const deeplink = await generateQuickStartDeeplink();
                if (deeplink) {
                  window.location.href = deeplink;
                }
              }}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 font-medium"
            >
              <Rocket size={20} />
              Nieuwe Website Maken
            </button>
          </div>
        </div>
      </div>

      {websites.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
          <Globe className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Nog geen websites</h3>
          <p className="text-gray-600 mb-4">Begin met het maken van je eerste website!</p>
        </div>
      ) : (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">Mijn Websites ({websites.length})</h3>

          <div className="grid gap-4">
            {websites.map((website) => {
              const isExpanded = expandedWebsites.has(website.id);

              return (
                <div
                  key={website.id}
                  className="bg-white rounded-lg border border-gray-200 hover:shadow-md transition-shadow"
                >
                  <div
                    className="p-5 cursor-pointer hover:bg-gray-50 transition-colors"
                    onClick={() => toggleWebsite(website.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 flex-1">
                        {editingNameId === website.id ? (
                          <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="text"
                              value={editingName}
                              onChange={(e) => setEditingName(e.target.value)}
                              className="px-3 py-1 border border-blue-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-base font-semibold"
                              autoFocus
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') saveWebsiteName(website.id);
                                if (e.key === 'Escape') cancelEditingName();
                              }}
                            />
                            <button
                              onClick={() => saveWebsiteName(website.id)}
                              className="p-1.5 bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
                              title="Opslaan"
                            >
                              <Check size={16} />
                            </button>
                            <button
                              onClick={cancelEditingName}
                              className="p-1.5 bg-gray-400 text-white rounded hover:bg-gray-500 transition-colors"
                              title="Annuleren"
                            >
                              <X size={16} />
                            </button>
                          </div>
                        ) : (
                          <>
                            <h4 className="text-lg font-semibold text-gray-900">{website.name}</h4>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                startEditingName(website);
                              }}
                              className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                              title="Naam bewerken"
                            >
                              <Edit2 size={14} />
                            </button>
                          </>
                        )}
                        {getStatusBadge(website.status)}

                        {website.live_url && (
                          <a
                            href={`https://${website.live_url}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="text-green-600 hover:text-green-700 flex items-center gap-1 transition-colors"
                            title="Open Live Site"
                          >
                            <ExternalLink size={16} />
                          </a>
                        )}
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="text-sm text-gray-500">
                          {website.pages && Array.isArray(website.pages) ? website.pages.length : 0} pagina's
                        </span>
                        {isExpanded ? (
                          <ChevronUp className="text-gray-400" size={20} />
                        ) : (
                          <ChevronDown className="text-gray-400" size={20} />
                        )}
                      </div>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="border-t border-gray-200 bg-white">
                      <div className="p-6 space-y-4">
                        <div className="bg-gray-50 p-4 rounded-lg">
                          <div className="flex items-center gap-2 mb-1">
                            <Calendar size={14} className="text-gray-500" />
                            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Aangemaakt</span>
                          </div>
                          <p className="text-sm font-medium text-gray-900">{new Date(website.created_at).toLocaleDateString('nl-NL')}</p>
                        </div>

                        {website.preview_url && (
                          <div>
                            <div className="flex items-center gap-2 mb-2">
                              <Eye size={16} className="text-blue-600" />
                              <label className="font-semibold text-gray-900">Preview URL</label>
                            </div>
                            <div className="flex items-center gap-2 p-3 bg-white border border-gray-200 rounded-lg">
                              <code className="flex-1 text-sm font-mono text-blue-600 truncate">{website.preview_url}</code>
                              <a
                                href={`https://${website.preview_url}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center gap-2"
                                title="Open Preview"
                              >
                                <ExternalLink size={16} />
                                Open
                              </a>
                            </div>
                          </div>
                        )}

                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <Globe size={16} className="text-green-600" />
                            <label className="font-semibold text-gray-900">Live Publicatie</label>
                          </div>
                          {website.live_url ? (
                            <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                              <code className="flex-1 text-sm font-mono text-green-700 truncate">{website.live_url}</code>
                              <a
                                href={`https://${website.live_url}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium flex items-center gap-2"
                                title="Open Live Site"
                              >
                                <ExternalLink size={16} />
                                Open
                              </a>
                            </div>
                          ) : (
                            <div>
                              {brand?.domain ? (
                                <button
                                  onClick={() => publishToLive(website)}
                                  disabled={publishingWebsiteId === website.id}
                                  className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                                >
                                  {publishingWebsiteId === website.id ? (
                                    <span className="flex items-center justify-center gap-2">
                                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                                      Publiceren naar {brand.domain}...
                                    </span>
                                  ) : (
                                    <span className="flex items-center justify-center gap-2">
                                      <Rocket size={16} />
                                      Publiceer naar {brand.domain}
                                    </span>
                                  )}
                                </button>
                              ) : (
                                <div className="p-4 bg-yellow-50 border border-yellow-300 rounded-lg text-center">
                                  <Globe className="w-10 h-10 text-yellow-600 mx-auto mb-2" />
                                  <p className="text-sm text-gray-700 mb-3">Geen domein geconfigureerd</p>
                                  <a
                                    href="#brand-settings-domains"
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      window.location.hash = 'brand-settings-domains';
                                    }}
                                    className="inline-block px-4 py-2 bg-yellow-600 text-white rounded-lg font-semibold hover:bg-yellow-700 transition-colors"
                                  >
                                    Configureer Domein →
                                  </a>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-3 p-6 pt-0">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            editWebsite(website);
                          }}
                          className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold"
                        >
                          <Edit2 size={16} />
                          Bewerken in Builder
                        </button>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteWebsite(website.id);
                          }}
                          className="px-4 py-3 text-red-600 hover:bg-red-50 rounded-lg transition-colors font-semibold flex items-center gap-2"
                        >
                          <Trash2 size={16} />
                          Verwijderen
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
