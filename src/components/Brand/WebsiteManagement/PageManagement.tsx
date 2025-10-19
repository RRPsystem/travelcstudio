import React, { useState, useEffect } from 'react';
import { FileText, Plus, Edit2, Trash2, Eye, Globe, ExternalLink } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../contexts/AuthContext';
import { generateBuilderJWT } from '../../../lib/jwtHelper';

interface Page {
  id: string;
  title: string;
  slug: string;
  status: 'draft' | 'published';
  content_type: string;
  created_at: string;
  updated_at: string;
  published_at?: string;
  show_in_menu: boolean;
  menu_order: number;
}

export function PageManagement() {
  const { user } = useAuth();
  const [pages, setPages] = useState<Page[]>([]);
  const [loading, setLoading] = useState(true);
  const [publishingId, setPublishingId] = useState<string | null>(null);

  useEffect(() => {
    loadPages();
  }, [user]);

  useEffect(() => {
    const handleFocus = () => {
      loadPages();
    };

    window.addEventListener('focus', handleFocus);
    return () => {
      window.removeEventListener('focus', handleFocus);
    };
  }, [user]);

  const loadPages = async () => {
    if (!user?.brand_id) return;

    try {
      const { data, error } = await supabase
        .from('pages')
        .select('*')
        .eq('brand_id', user.brand_id)
        .or('content_type.eq.page,content_type.is.null')
        .order('updated_at', { ascending: false });

      if (error) throw error;
      setPages(data || []);
    } catch (error) {
      console.error('Error loading pages:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePage = async () => {
    try {
      if (!user?.id || !user?.brand_id) {
        alert('User not authenticated');
        return;
      }

      const jwtResponse = await generateBuilderJWT(user.brand_id, user.id, ['content:read', 'content:write'], {
        forceBrandId: true,
        mode: 'page',
      });

      const builderBaseUrl = 'https://www.ai-websitestudio.nl';
      const apiBaseUrl = jwtResponse.api_url || `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;
      const apiKey = jwtResponse.api_key || import.meta.env.VITE_SUPABASE_ANON_KEY;
      const returnUrl = 'https://www.ai-travelstudio.nl/#/brand/website/pages';

      const deeplink = `${builderBaseUrl}/?api=${encodeURIComponent(apiBaseUrl)}&brand_id=${user.brand_id}&token=${jwtResponse.token}&apikey=${encodeURIComponent(apiKey)}&content_type=page&return_url=${encodeURIComponent(returnUrl)}`;

      console.log('🔗 Opening page builder deeplink:', deeplink);

      const newWindow = window.open(deeplink, '_blank');
      if (!newWindow) {
        navigator.clipboard.writeText(deeplink);
        alert('Pop-up geblokkeerd! URL is gekopieerd naar clipboard. Plak in nieuwe tab.');
      }
    } catch (err) {
      console.error('Error generating deeplink:', err);
      alert('Failed to generate builder link');
    }
  };

  const handleEditPage = async (page: Page) => {
    try {
      if (!user?.id || !user?.brand_id) {
        alert('User not authenticated');
        return;
      }

      const jwtResponse = await generateBuilderJWT(user.brand_id, user.id, ['content:read', 'content:write'], {
        forceBrandId: true,
        pageId: page.id,
        mode: 'page',
      });

      const builderBaseUrl = 'https://www.ai-websitestudio.nl';
      const apiBaseUrl = jwtResponse.api_url || `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;
      const apiKey = jwtResponse.api_key || import.meta.env.VITE_SUPABASE_ANON_KEY;
      const returnUrl = 'https://www.ai-travelstudio.nl/#/brand/website/pages';

      const deeplink = `${builderBaseUrl}?api=${encodeURIComponent(apiBaseUrl)}&brand_id=${user.brand_id}&token=${jwtResponse.token}&apikey=${encodeURIComponent(apiKey)}&page_id=${page.id}&content_type=page&return_url=${encodeURIComponent(returnUrl)}`;

      console.log('🔗 Opening page edit deeplink:', deeplink);

      const newWindow = window.open(deeplink, '_blank');
      if (!newWindow) {
        navigator.clipboard.writeText(deeplink);
        alert('Pop-up geblokkeerd! URL is gekopieerd naar clipboard. Plak in nieuwe tab.');
      }
    } catch (err) {
      console.error('Error generating deeplink:', err);
      alert('Failed to generate builder link');
    }
  };

  const handlePublishPage = async (pageId: string) => {
    if (!confirm('Weet je zeker dat je deze pagina wilt publiceren?')) return;

    setPublishingId(pageId);
    try {
      const { data: page } = await supabase
        .from('pages')
        .select('content_json')
        .eq('id', pageId)
        .maybeSingle();

      if (!page?.content_json?.htmlSnapshot) {
        alert('Deze pagina heeft nog geen content. Bewerk de pagina eerst in de builder.');
        return;
      }

      const { error } = await supabase
        .from('pages')
        .update({
          status: 'published',
          published_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', pageId);

      if (error) throw error;

      alert('Pagina succesvol gepubliceerd!');
      loadPages();
    } catch (error) {
      console.error('Error publishing page:', error);
      alert('Er ging iets mis bij het publiceren');
    } finally {
      setPublishingId(null);
    }
  };

  const handleUnpublishPage = async (pageId: string) => {
    if (!confirm('Weet je zeker dat je deze pagina wilt depubliceren?')) return;

    try {
      const { error } = await supabase
        .from('pages')
        .update({
          status: 'draft',
          updated_at: new Date().toISOString(),
        })
        .eq('id', pageId);

      if (error) throw error;

      alert('Pagina gedepubliceerd');
      loadPages();
    } catch (error) {
      console.error('Error unpublishing page:', error);
      alert('Er ging iets mis bij het depubliceren');
    }
  };

  const handleDeletePage = async (pageId: string) => {
    if (!confirm('Weet je zeker dat je deze pagina wilt verwijderen? Dit kan niet ongedaan gemaakt worden.')) return;

    try {
      const { error } = await supabase
        .from('pages')
        .delete()
        .eq('id', pageId);

      if (error) throw error;

      alert('Pagina verwijderd');
      loadPages();
    } catch (error) {
      console.error('Error deleting page:', error);
      alert('Er ging iets mis bij het verwijderen');
    }
  };

  const handlePreview = (page: Page) => {
    const previewUrl = `${window.location.origin}/#/preview/${page.id}`;
    window.open(previewUrl, '_blank');
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
          <p className="mt-4 text-gray-600">Laden...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pagina Beheer</h1>
          <p className="text-gray-600 mt-1">Beheer alle pagina's van je website</p>
        </div>
        <button
          onClick={handleCreatePage}
          className="flex items-center gap-2 px-4 py-2 text-white rounded-lg font-medium transition-colors hover:bg-orange-700"
          style={{ backgroundColor: '#ff7700' }}
        >
          <Plus className="w-5 h-5" />
          Nieuwe Pagina
        </button>
      </div>

      {pages.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm border p-12 text-center">
          <FileText className="w-16 h-16 mx-auto mb-4 text-gray-400" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Nog geen pagina's</h3>
          <p className="text-gray-600 mb-6">Begin met het maken van je eerste pagina</p>
          <button
            onClick={handleCreatePage}
            className="px-6 py-3 text-white rounded-lg font-medium transition-colors hover:bg-orange-700"
            style={{ backgroundColor: '#ff7700' }}
          >
            Maak je Eerste Pagina
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Pagina
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Slug
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Menu
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Laatst Gewijzigd
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Acties
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {pages.map((page) => (
                <tr key={page.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <FileText className="w-5 h-5 text-gray-400 mr-3" />
                      <div>
                        <div className="text-sm font-medium text-gray-900">{page.title}</div>
                        {page.published_at && (
                          <div className="text-xs text-gray-500">
                            Gepubliceerd: {new Date(page.published_at).toLocaleDateString('nl-NL')}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-600 font-mono">/{page.slug}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {page.status === 'published' ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        <Globe className="w-3 h-3 mr-1" />
                        Gepubliceerd
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                        Concept
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {page.show_in_menu ? (
                      <span className="text-xs text-green-600 font-medium">
                        Ja (#{page.menu_order})
                      </span>
                    ) : (
                      <span className="text-xs text-gray-400">Nee</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(page.updated_at).toLocaleDateString('nl-NL', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handlePreview(page)}
                        className="text-gray-600 hover:text-gray-900 p-2 hover:bg-gray-100 rounded"
                        title="Voorbeeld"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleEditPage(page)}
                        className="text-blue-600 hover:text-blue-900 p-2 hover:bg-blue-50 rounded"
                        title="Bewerken"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      {page.status === 'draft' ? (
                        <button
                          onClick={() => handlePublishPage(page.id)}
                          disabled={publishingId === page.id}
                          className="text-green-600 hover:text-green-900 p-2 hover:bg-green-50 rounded disabled:opacity-50"
                          title="Publiceren"
                        >
                          {publishingId === page.id ? (
                            <div className="w-4 h-4 border-2 border-green-600 border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <Globe className="w-4 h-4" />
                          )}
                        </button>
                      ) : (
                        <button
                          onClick={() => handleUnpublishPage(page.id)}
                          className="text-yellow-600 hover:text-yellow-900 p-2 hover:bg-yellow-50 rounded"
                          title="Depubliceren"
                        >
                          <Globe className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={() => handleDeletePage(page.id)}
                        className="text-red-600 hover:text-red-900 p-2 hover:bg-red-50 rounded"
                        title="Verwijderen"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <ExternalLink className="w-5 h-5 text-blue-600 mt-0.5" />
          <div>
            <h4 className="text-sm font-medium text-blue-900 mb-1">Tip: Publieke URL's</h4>
            <p className="text-sm text-blue-700">
              Gepubliceerde pagina's zijn binnenkort beschikbaar op je eigen domein.
              Gebruik de preview functie om de pagina te bekijken voordat je publiceert.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
