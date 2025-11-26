import React, { useState, useEffect } from 'react';
import { CreditCard as Edit, Copy, Trash2, Eye, Plus, RefreshCw, Upload, FileX, ExternalLink, Wrench } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { openBuilder, generateBuilderJWT } from '../../lib/jwtHelper';
import { useAuth } from '../../contexts/AuthContext';
import {
  detectPageType,
  getPageTypeLabel,
  getPageTypeBadgeColor,
  generateTemplatePreviewUrl,
  isTemplateVisibleType,
  PageMetadata
} from '../../lib/pageHelpers';

interface Page {
  id: string;
  title: string;
  slug: string;
  status: string;
  updated_at: string;
  published_at: string | null;
  body_html?: string;
  show_in_menu: boolean;
  menu_order: number;
  parent_slug: string | null;
  metadata?: PageMetadata;
}

export function PageManagement() {
  const { user } = useAuth();
  const [pages, setPages] = useState<Page[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingPageId, setEditingPageId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [editingSlug, setEditingSlug] = useState('');

  useEffect(() => {
    if (user?.brand_id) {
      loadPages(user.brand_id);
    }
  }, [user?.brand_id]);

  useEffect(() => {
    const handleFocus = () => {
      if (user?.brand_id) {
        loadPages(user.brand_id, false);
      }
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [user?.brand_id]);

  const loadPages = async (brandId: string, showLoading = true) => {
    try {
      if (showLoading) setLoading(true);

      const { data, error } = await supabase
        .from('pages')
        .select('*')
        .eq('brand_id', brandId)
        .or('content_type.eq.page,content_type.is.null')
        .or('is_template.is.null,is_template.eq.false')
        .order('updated_at', { ascending: false });

      if (error) {
        console.error('Error loading pages:', error);
        throw error;
      }

      const pagesWithMetadata = (data || []).map(page => {
        if (!page.metadata || !page.metadata.type) {
          const detectedType = detectPageType(page.slug, page.title);
          return {
            ...page,
            metadata: {
              ...page.metadata,
              type: detectedType
            }
          };
        }
        return page;
      });

      setPages(pagesWithMetadata);

      const pagesToUpdate = pagesWithMetadata.filter(
        page => !data?.find(p => p.id === page.id)?.metadata?.type
      );

      if (pagesToUpdate.length > 0) {
        for (const page of pagesToUpdate) {
          await supabase
            .from('pages')
            .update({ metadata: page.metadata })
            .eq('id', page.id);
        }
      }
    } catch (error) {
      console.error('Error loading pages:', error);
    } finally {
      setLoading(false);
    }
  };

  const openInBuilder = async (pageId: string) => {
    if (!user || !user.brand_id) {
      console.error('[PageManagement] Missing user or brand_id:', { user });
      alert('Gebruiker of brand ID ontbreekt');
      return;
    }

    try {
      console.log('[PageManagement] Opening builder for page:', {
        pageId,
        userId: user.id,
        brandId: user.brand_id
      });

      const returnUrl = `${import.meta.env.VITE_APP_URL || window.location.origin}#/brand/website/pages`;
      console.log('[PageManagement] Return URL:', returnUrl);

      const deeplink = await openBuilder(user.brand_id, user.id, { pageId, returnUrl });
      console.log('[PageManagement] Generated deeplink:', deeplink);

      const newWindow = window.open(deeplink, '_blank');
      console.log('[PageManagement] Window opened:', !!newWindow);

      if (!newWindow) {
        alert('Popup geblokkeerd! Sta popups toe voor deze website.');
      }
    } catch (error) {
      console.error('[PageManagement] Error generating deeplink:', error);
      alert('Kon de website builder niet openen: ' + error);
    }
  };

  const createNewPage = async () => {
    if (!user || !user.brand_id) return;

    try {
      const returnUrl = `${import.meta.env.VITE_APP_URL || window.location.origin}#/brand/website/pages`;
      const deeplink = await openBuilder(user.brand_id, user.id, { returnUrl });
      window.open(deeplink, '_blank');
    } catch (error) {
      console.error('Error generating deeplink:', error);
    }
  };

  const duplicatePage = async (pageId: string) => {
    if (!user?.brand_id) return;

    try {
      const { data: originalPage } = await supabase
        .from('pages')
        .select('*')
        .eq('id', pageId)
        .single();

      if (originalPage) {
        await supabase.from('pages').insert({
          brand_id: originalPage.brand_id,
          owner_user_id: originalPage.owner_user_id,
          title: `${originalPage.title} (kopie)`,
          slug: `${originalPage.slug}-copy-${Date.now()}`,
          status: 'draft',
          content_json: originalPage.content_json,
          content_type: 'page',
        });

        await loadPages(user.brand_id);
      }
    } catch (error) {
      console.error('Error duplicating page:', error);
    }
  };

  const deletePage = async (pageId: string) => {
    if (!confirm('Weet je zeker dat je deze pagina wilt verwijderen?')) return;
    if (!user?.brand_id) return;

    try {
      const { error } = await supabase
        .from('pages')
        .delete()
        .eq('id', pageId)
        .eq('brand_id', user.brand_id);

      if (error) {
        console.error('[PageManagement] Delete failed:', error);
        throw error;
      }

      console.log('[PageManagement] Page deleted successfully');
      await loadPages(user.brand_id, false);
    } catch (error) {
      console.error('[PageManagement] Error deleting page:', error);
      alert('Kon pagina niet verwijderen: ' + error);
    }
  };

  const startEditPage = (page: Page) => {
    setEditingPageId(page.id);
    setEditingTitle(page.title);
    setEditingSlug(page.slug);
  };

  const cancelEdit = () => {
    setEditingPageId(null);
    setEditingTitle('');
    setEditingSlug('');
  };

  const saveEdit = async () => {
    if (!user?.brand_id || !editingPageId) return;

    try {
      const { error } = await supabase
        .from('pages')
        .update({
          title: editingTitle,
          slug: editingSlug,
          updated_at: new Date().toISOString()
        })
        .eq('id', editingPageId)
        .eq('brand_id', user.brand_id);

      if (error) throw error;

      await loadPages(user.brand_id, false);
      cancelEdit();
    } catch (error) {
      console.error('Error updating page:', error);
      alert('Kon pagina niet bijwerken: ' + error);
    }
  };

  const togglePublishStatus = async (pageId: string, currentStatus: string) => {
    if (!user?.brand_id) return;

    const isPublished = currentStatus === 'published';
    const newStatus = isPublished ? 'draft' : 'published';
    const action = isPublished ? 'depubliceren' : 'publiceren';

    if (!confirm(`Weet je zeker dat je deze pagina wilt ${action}?`)) return;

    try {
      const updateData: any = {
        status: newStatus,
        updated_at: new Date().toISOString()
      };

      if (!isPublished) {
        updateData.published_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('pages')
        .update(updateData)
        .eq('id', pageId)
        .eq('brand_id', user.brand_id);

      if (error) throw error;

      await loadPages(user.brand_id, false);
    } catch (error) {
      console.error(`Error ${action} page:`, error);
      alert(`Kon pagina niet ${action}: ` + error);
    }
  };

  const toggleShowInMenu = async (pageId: string, currentValue: boolean) => {
    if (!user?.brand_id) return;

    try {
      const { error } = await supabase
        .from('pages')
        .update({
          show_in_menu: !currentValue,
          updated_at: new Date().toISOString()
        })
        .eq('id', pageId)
        .eq('brand_id', user.brand_id);

      if (error) throw error;

      await loadPages(user.brand_id, false);
    } catch (error) {
      console.error('Error updating menu settings:', error);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('nl-NL', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="p-8">
      <div className="flex items-center justify-end mb-8 space-x-3">
        <button
          onClick={() => user?.brand_id && loadPages(user.brand_id, false)}
          className="inline-flex items-center space-x-2 px-4 py-3 bg-gray-100 text-gray-700 rounded-lg font-medium transition-colors hover:bg-gray-200"
          title="Ververs pagina's"
        >
          <RefreshCw size={20} />
          <span>Ververs</span>
        </button>
        <button
          onClick={createNewPage}
          className="inline-flex items-center space-x-2 px-6 py-3 text-white rounded-lg font-medium transition-colors hover:bg-blue-700"
          style={{ backgroundColor: '#0ea5e9' }}
        >
          <Plus size={20} />
          <span>Nieuwe Pagina</span>
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Pagina's laden...</p>
        </div>
      ) : pages.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <p className="text-gray-600 mb-4">Je hebt nog geen pagina's aangemaakt</p>
          <button
            onClick={createNewPage}
            className="inline-flex items-center space-x-2 px-6 py-3 border-2 border-blue-600 text-blue-600 rounded-lg font-medium transition-colors hover:bg-blue-50"
          >
            <Plus size={20} />
            <span>Maak je eerste pagina</span>
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Titel
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Slug
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  In Menu
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Laatst gepubliceerd
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Acties
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {pages.map((page) => {
                const pageType = page.metadata?.type || 'page';
                const isVisible = isTemplateVisibleType(pageType);

                return (
                <tr key={page.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    {editingPageId === page.id ? (
                      <input
                        type="text"
                        value={editingTitle}
                        onChange={(e) => setEditingTitle(e.target.value)}
                        className="w-full px-2 py-1 text-sm border border-orange-300 rounded focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      />
                    ) : (
                      <div>
                        <div className="text-sm font-medium text-gray-900">{page.title}</div>
                        {isVisible && (
                          <div className="mt-1 flex items-center gap-1 text-xs text-blue-600">
                            <ExternalLink size={12} />
                            <span>Zichtbaar in template</span>
                          </div>
                        )}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {editingPageId === page.id ? (
                      <input
                        type="text"
                        value={editingSlug}
                        onChange={(e) => setEditingSlug(e.target.value)}
                        className="w-full px-2 py-1 text-sm border border-orange-300 rounded font-mono focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      />
                    ) : (
                      <div className="text-sm text-gray-600 font-mono">{page.slug}</div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getPageTypeBadgeColor(pageType)}`}>
                      {getPageTypeLabel(pageType)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        page.status === 'published'
                          ? 'bg-green-100 text-green-800'
                          : page.status === 'review'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {page.status === 'published' ? 'Gepubliceerd' : page.status === 'review' ? 'Review' : 'Concept'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <button
                      onClick={() => toggleShowInMenu(page.id, page.show_in_menu)}
                      className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                        page.show_in_menu
                          ? 'bg-orange-100 text-orange-800 hover:bg-orange-200'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                      title={page.show_in_menu ? 'Verberg in menu' : 'Toon in menu'}
                    >
                      {page.show_in_menu ? 'Ja' : 'Nee'}
                    </button>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {formatDate(page.published_at)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end space-x-2">
                      {editingPageId === page.id ? (
                        <>
                          <button
                            onClick={saveEdit}
                            className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
                            title="Opslaan"
                          >
                            Opslaan
                          </button>
                          <button
                            onClick={cancelEdit}
                            className="px-3 py-1 text-sm bg-gray-300 text-gray-700 rounded hover:bg-gray-400 transition-colors"
                            title="Annuleren"
                          >
                            Annuleren
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => startEditPage(page)}
                            className="p-2 text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
                            title="Titel en Slug Bewerken"
                          >
                            <Edit size={18} />
                          </button>
                          {isVisible && user?.brand_id && (
                            <button
                              onClick={() => {
                                const url = generateTemplatePreviewUrl(user.brand_id!, pageType);
                                window.open(url, '_blank');
                              }}
                              className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                              title="Bekijk in Template"
                            >
                              <ExternalLink size={18} />
                            </button>
                          )}
                          <button
                            onClick={() => openInBuilder(page.id)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Openen in Builder"
                          >
                            <Wrench size={18} />
                          </button>
                        </>
                      )}
                      <button
                        onClick={() => {
                          window.open(`/preview/${page.id}`, '_blank');
                        }}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Preview"
                      >
                        <Eye size={18} />
                      </button>
                      <button
                        onClick={() => togglePublishStatus(page.id, page.status)}
                        className={`relative inline-flex items-center h-6 w-11 rounded-full transition-colors ${
                          page.status === 'published' ? 'bg-green-600' : 'bg-gray-300'
                        }`}
                        title={page.status === 'published' ? 'Depubliceren' : 'Publiceren'}
                      >
                        <span
                          className={`inline-block w-4 h-4 bg-white rounded-full transition-transform ${
                            page.status === 'published' ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                      <button
                        onClick={() => duplicatePage(page.id)}
                        className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                        title="Dupliceren"
                      >
                        <Copy size={18} />
                      </button>
                      <button
                        onClick={() => deletePage(page.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Verwijderen"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
