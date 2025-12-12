import React, { useState, useEffect } from 'react';
import { Newspaper, Eye, Plus, Pencil, Trash2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { NewsEditor } from '../Admin/NewsEditor';
import { generateBuilderJWT, generateBuilderDeeplink } from '../../lib/jwtHelper';

interface NewsAssignment {
  id: string;
  news_id: string;
  status: 'pending' | 'approved' | 'rejected' | 'mandatory' | 'brand';
  is_published: boolean;
  assigned_at: string;
  page_id?: string;
  news_item: {
    id: string;
    title: string;
    slug: string;
    excerpt: string;
    featured_image: string;
    is_mandatory: boolean;
    published_at: string;
    tags?: string[];
  };
}

export function NewsApproval() {
  const { user } = useAuth();
  const [assignments, setAssignments] = useState<NewsAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [showEditor, setShowEditor] = useState(false);
  const [editingNewsId, setEditingNewsId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'assigned' | 'own'>('assigned');
  const [websiteType, setWebsiteType] = useState<string>('internal');
  const [websiteId, setWebsiteId] = useState<string | null>(null);

  useEffect(() => {
    if (user?.brand_id && !isLoadingData) {
      loadWebsiteInfo();
      loadAssignments();
    } else if (!user?.brand_id) {
      setLoading(false);
    }
  }, [user?.brand_id]);

  const loadWebsiteInfo = async () => {
    if (!user?.brand_id) return;

    try {
      const { data: brandData, error: brandError } = await supabase
        .from('brands')
        .select('website_type')
        .eq('id', user.brand_id)
        .maybeSingle();

      if (!brandError && brandData) {
        setWebsiteType(brandData.website_type || 'internal');
      }

      const { data: websiteData, error: websiteError } = await supabase
        .from('websites')
        .select('id')
        .eq('brand_id', user.brand_id)
        .maybeSingle();

      if (!websiteError && websiteData) {
        setWebsiteId(websiteData.id);
      }
    } catch (error) {
      console.error('Error loading website info:', error);
    }
  };

  const loadAssignments = async () => {
    if (!user?.brand_id || isLoadingData) {
      return;
    }

    setLoading(true);
    setIsLoadingData(true);
    try {
      const { data: assignmentData, error: assignmentError } = await supabase
        .from('news_brand_assignments')
        .select(`
          id,
          news_id,
          status,
          is_published,
          assigned_at,
          news_items!inner (
            id,
            title,
            slug,
            excerpt,
            featured_image,
            is_mandatory,
            published_at,
            tags
          )
        `)
        .eq('brand_id', user.brand_id)
        .order('assigned_at', { ascending: false });

      if (assignmentError) throw assignmentError;

      const formattedAssignments = (assignmentData || []).map(item => ({
        id: item.id,
        news_id: item.news_id,
        status: item.status,
        is_published: item.is_published || false,
        assigned_at: item.assigned_at,
        news_item: Array.isArray(item.news_items) ? item.news_items[0] : item.news_items
      }));

      // Get all news_item IDs that are already in assignments to avoid duplicates
      const assignedNewsIds = new Set(formattedAssignments.map(a => a.news_id));

      const { data: brandNewsData, error: brandNewsError } = await supabase
        .from('news_items')
        .select('id, title, slug, excerpt, featured_image, created_at, published_at, status, tags')
        .eq('brand_id', user.brand_id)
        .order('created_at', { ascending: false });

      if (brandNewsError) throw brandNewsError;

      // Filter out news items that are already in assignments
      const filteredBrandNews = (brandNewsData || []).filter(item => !assignedNewsIds.has(item.id));

      const formattedBrandNews = filteredBrandNews.map(item => ({
        id: `brand-news-${item.id}`,
        news_id: item.id,
        page_id: item.id,
        status: 'brand' as const,
        is_published: item.status === 'published',
        assigned_at: item.created_at,
        news_item: {
          id: item.id,
          title: item.title,
          slug: item.slug,
          excerpt: item.excerpt || '',
          featured_image: item.featured_image || '',
          is_mandatory: false,
          published_at: item.published_at,
          tags: item.tags || []
        }
      }));

      const allNews = [...formattedAssignments, ...formattedBrandNews].sort((a, b) =>
        new Date(b.assigned_at).getTime() - new Date(a.assigned_at).getTime()
      );

      setAssignments(allNews);
    } catch (error) {
      console.error('Error loading assignments:', error);
    } finally {
      setLoading(false);
      setIsLoadingData(false);
    }
  };

  const handleTogglePublish = async (assignmentId: string, currentValue: boolean, assignment: NewsAssignment) => {
    try {
      if (assignment.status === 'brand' && assignment.news_id) {
        const { error } = await supabase
          .from('news_items')
          .update({ status: !currentValue ? 'published' : 'draft' })
          .eq('id', assignment.news_id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('news_brand_assignments')
          .update({
            is_published: !currentValue,
            status: !currentValue ? 'accepted' : 'pending'
          })
          .eq('id', assignmentId);

        if (error) throw error;
      }
      await loadAssignments();
    } catch (error) {
      console.error('Error toggling publish:', error);
      alert('Failed to update');
    }
  };

  const handleToggleApprove = async (assignmentId: string, currentStatus: string) => {
    try {
      const newStatus = currentStatus === 'approved' ? 'pending' : 'approved';

      const { error } = await supabase
        .from('news_brand_assignments')
        .update({
          status: newStatus,
          acknowledged_at: new Date().toISOString()
        })
        .eq('id', assignmentId);

      if (error) throw error;
      loadAssignments();
    } catch (error) {
      console.error('Error toggling approval:', error);
      alert('Failed to update');
    }
  };

  const openPreview = (slug: string) => {
    const currentOrigin = window.location.origin;
    let previewUrl = currentOrigin;

    if (currentOrigin.includes('bolt.') && currentOrigin.includes('supabase.co')) {
      previewUrl = currentOrigin.replace('bolt.', '');
    }

    window.open(`${previewUrl}/preview/news/${slug}`, '_blank');
  };

  const handleEdit = async (assignment: NewsAssignment) => {
    if (!user || !user.brand_id) return;

    const usesExternalEditor = websiteType === 'wordpress' || websiteType === 'external_builder' || websiteType === 'quickstart';

    if (usesExternalEditor) {
      try {
        const returnUrl = `${import.meta.env.VITE_APP_URL || window.location.origin}#/brand/content/news`;

        const scopes = [
          'pages:read',
          'pages:write',
          'content:read',
          'content:write',
          'news:read',
          'news:write'
        ];

        const jwtResponse = await generateBuilderJWT(
          user.brand_id,
          user.id,
          scopes,
          {
            contentType: 'news',
            newsSlug: assignment.news_item.slug,
            returnUrl,
            mode: 'edit'
          }
        );

        const deeplink = generateBuilderDeeplink({
          jwtResponse,
          returnUrl,
          contentType: 'news',
          newsSlug: assignment.news_item.slug,
          mode: 'edit'
        });

        window.open(deeplink, '_blank');
      } catch (error) {
        console.error('Error opening builder:', error);
        alert('Kon builder niet openen. Probeer het opnieuw.');
      }
    } else {
      setEditingNewsId(assignment.news_item.id);
      setShowEditor(true);
    }
  };

  const handleDelete = async (assignment: NewsAssignment) => {
    if (!confirm(`Weet je zeker dat je "${assignment.news_item.title}" wilt verwijderen?`)) {
      return;
    }

    try {
      console.log('[NewsApproval] Deleting assignment:', {
        status: assignment.status,
        news_id: assignment.news_id,
        news_item_id: assignment.news_item.id,
        assignment_id: assignment.id
      });

      if (assignment.status === 'brand') {
        const newsId = assignment.news_id || assignment.news_item.id;
        console.log('[NewsApproval] Deleting brand news item:', newsId, 'User brand_id:', user?.brand_id);

        const { data, error } = await supabase
          .from('news_items')
          .delete()
          .eq('id', newsId)
          .select();

        if (error) {
          console.error('[NewsApproval] Delete error:', error);
          alert(`Fout bij verwijderen: ${error.message}`);
          throw error;
        }

        if (!data || data.length === 0) {
          console.error('[NewsApproval] No rows deleted - item not found or no permission');
          alert('Item kon niet worden verwijderd');
          return;
        }

        console.log('[NewsApproval] News item deleted successfully:', data);
      } else {
        const assignmentId = assignment.id.startsWith('brand-news-')
          ? assignment.news_id
          : assignment.id;

        console.log('[NewsApproval] Deleting assignment:', assignmentId, 'for brand:', user?.brand_id);
        const { data, error } = await supabase
          .from('news_brand_assignments')
          .delete()
          .eq('id', assignmentId)
          .select();

        if (error) {
          console.error('[NewsApproval] Delete assignment error:', error);
          alert(`Fout bij verwijderen: ${error.message}`);
          throw error;
        }

        if (!data || data.length === 0) {
          console.error('[NewsApproval] No assignment rows deleted - not found. Assignment ID:', assignmentId);
          alert('Assignment kon niet worden verwijderd');
          return;
        }

        console.log('[NewsApproval] Assignment deleted successfully:', data);
      }

      // Remove from state immediately for instant UI feedback
      console.log('[NewsApproval] Removing from UI...');
      setAssignments(prev => prev.filter(a => a.id !== assignment.id));
      console.log('[NewsApproval] Item removed from UI');
    } catch (error) {
      console.error('[NewsApproval] Error deleting:', error);
      alert(`Fout bij verwijderen: ${error instanceof Error ? error.message : 'Onbekende fout'}`);
    }
  };

  const createNewArticle = async () => {
    if (!user || !user.brand_id) return;

    const usesExternalEditor = websiteType === 'wordpress' || websiteType === 'external_builder' || websiteType === 'quickstart';

    if (usesExternalEditor) {
      try {
        const returnUrl = `${import.meta.env.VITE_APP_URL || window.location.origin}#/brand/content/news`;

        const scopes = [
          'pages:read',
          'pages:write',
          'content:read',
          'content:write',
          'news:read',
          'news:write'
        ];

        const jwtResponse = await generateBuilderJWT(
          user.brand_id,
          user.id,
          scopes,
          {
            contentType: 'news',
            returnUrl,
            mode: 'create'
          }
        );

        const deeplink = generateBuilderDeeplink({
          jwtResponse,
          returnUrl,
          contentType: 'news',
          mode: 'create'
        });

        window.open(deeplink, '_blank');
      } catch (error) {
        console.error('Error opening builder:', error);
        alert('Kon builder niet openen. Probeer het opnieuw.');
      }
    } else {
      setEditingNewsId(null);
      setShowEditor(true);
    }
  };

  const handleEditorClose = () => {
    setShowEditor(false);
    setEditingNewsId(null);
    loadAssignments();
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (showEditor) {
    return (
      <NewsEditor
        newsId={editingNewsId || undefined}
        onSave={handleEditorClose}
        onCancel={handleEditorClose}
        mode="brand"
        inline={true}
      />
    );
  }

  const assignedNews = assignments.filter(a => a.status !== 'brand');
  const ownNews = assignments.filter(a => a.status === 'brand');
  const displayedAssignments = activeTab === 'assigned' ? assignedNews : ownNews;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
            <Newspaper className="w-6 h-6 text-orange-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900">Nieuwsbeheer</h2>
        </div>
        {activeTab === 'own' && (
          <button
            onClick={createNewArticle}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 transition-colors"
          >
            <Plus className="h-5 w-5 mr-2" />
            Nieuw Bericht
          </button>
        )}
      </div>

      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('assigned')}
            className={`whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'assigned'
                ? 'border-orange-600 text-orange-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Toegewezen Nieuws
            {assignedNews.length > 0 && (
              <span className="ml-2 py-0.5 px-2 rounded-full text-xs bg-orange-100 text-orange-800">
                {assignedNews.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('own')}
            className={`whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'own'
                ? 'border-orange-600 text-orange-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Eigen Nieuws
            {ownNews.length > 0 && (
              <span className="ml-2 py-0.5 px-2 rounded-full text-xs bg-purple-100 text-purple-800">
                {ownNews.length}
              </span>
            )}
          </button>
        </nav>
      </div>

      {displayedAssignments.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <Newspaper className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">
            {activeTab === 'assigned' ? 'Geen toegewezen nieuwsberichten' : 'Geen eigen nieuwsberichten'}
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            {activeTab === 'assigned'
              ? 'Er zijn nog geen nieuwsberichten toegewezen aan jouw brand.'
              : 'Maak je eerste nieuws artikel met de knop hierboven.'}
          </p>
          {activeTab === 'own' && (
            <button
              onClick={createNewArticle}
              className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-orange-600 hover:bg-orange-700 transition-colors"
            >
              <Plus className="h-5 w-5 mr-2" />
              Nieuw Bericht
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <table className="min-w-full">
          <thead>
            <tr className="border-b border-gray-200">
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Titel</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tags</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Datum</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
              <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Publiceren</th>
              <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Acties</th>
            </tr>
          </thead>
          <tbody className="bg-white">
            {displayedAssignments.map((assignment) => (
              <tr key={assignment.id} className="border-b border-gray-100 last:border-b-0 hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4">
                  <div className="flex items-start flex-col">
                    <div className="font-medium text-gray-900">{assignment.news_item.title}</div>
                    <div className="text-xs text-gray-500 mt-0.5">{assignment.news_item.slug}</div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  {assignment.news_item.tags && assignment.news_item.tags.length > 0 ? (
                    <div className="text-sm text-gray-500">
                      {assignment.news_item.tags.join(', ')}
                    </div>
                  ) : (
                    <div className="text-sm text-gray-400 italic">Geen tags</div>
                  )}
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">
                  {new Date(assignment.assigned_at).toLocaleDateString('nl-NL', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric'
                  })}
                </td>
                <td className="px-6 py-4">
                  <span className={`inline-flex px-2.5 py-1 text-xs font-medium rounded-full ${
                    assignment.status === 'mandatory' ? 'bg-red-100 text-red-700' :
                    assignment.status === 'brand' ? 'bg-purple-100 text-purple-700' :
                    'bg-blue-100 text-blue-700'
                  }`}>
                    {assignment.status === 'mandatory' ? 'Verplicht' :
                     assignment.status === 'brand' ? 'Eigen Nieuws' :
                     'Optioneel'}
                  </span>
                </td>
                <td className="px-6 py-4 text-center">
                  {assignment.status === 'mandatory' ? (
                    <div className="flex items-center justify-center">
                      <button
                        className="relative inline-flex h-6 w-11 items-center rounded-full bg-green-500 opacity-50 cursor-not-allowed"
                        disabled={true}
                        title="Verplichte nieuwsberichten zijn altijd gepubliceerd"
                      >
                        <span className="inline-block h-4 w-4 transform rounded-full bg-white shadow translate-x-6 transition-transform" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center">
                      <button
                        onClick={() => handleTogglePublish(assignment.id, assignment.is_published, assignment)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                          assignment.is_published ? 'bg-green-500' : 'bg-gray-300'
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                            assignment.is_published ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>
                  )}
                </td>
                <td className="px-6 py-4 text-center">
                  <div className="flex items-center justify-center gap-2">
                    <button
                      onClick={() => openPreview(assignment.news_item.slug)}
                      className="text-blue-600 hover:text-blue-700 transition-colors"
                      title="Preview"
                    >
                      <Eye className="w-5 h-5" />
                    </button>
                    {assignment.status !== 'mandatory' && (
                      <>
                        <button
                          onClick={() => handleEdit(assignment)}
                          className="text-orange-600 hover:text-orange-700 transition-colors"
                          title="Bewerken"
                        >
                          <Pencil className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => handleDelete(assignment)}
                          className="text-red-600 hover:text-red-700 transition-colors"
                          title="Verwijderen"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      )}
    </div>
  );
}
