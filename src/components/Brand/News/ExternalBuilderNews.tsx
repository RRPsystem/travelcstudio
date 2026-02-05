import React, { useState, useEffect } from 'react';
import { Newspaper, Eye, Plus, Pencil, Trash2 } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../contexts/AuthContext';
import { generateBuilderJWT, generateBuilderDeeplink } from '../../../lib/jwtHelper';
import { triggerWordPressSync } from '../../../lib/wordpressSync';

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

export function ExternalBuilderNews() {
  const { user, effectiveBrandId } = useAuth();
  const [assignments, setAssignments] = useState<NewsAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [activeTab, setActiveTab] = useState<'assigned' | 'own'>('assigned');

  useEffect(() => {
    if (effectiveBrandId && !isLoadingData) {
      loadAssignments();
    } else if (!effectiveBrandId) {
      setLoading(false);
    }
  }, [effectiveBrandId]);

  const loadAssignments = async () => {
    if (!effectiveBrandId || isLoadingData) {
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
        .eq('brand_id', effectiveBrandId)
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

      const assignedNewsIds = new Set(formattedAssignments.map(a => a.news_id));

      const { data: brandNewsData, error: brandNewsError } = await supabase
        .from('news_items')
        .select('id, title, slug, excerpt, featured_image, created_at, published_at, status, tags')
        .eq('brand_id', effectiveBrandId)
        .order('created_at', { ascending: false });

      if (brandNewsError) throw brandNewsError;

      const filteredBrandNews = (brandNewsData || []).filter(item => !assignedNewsIds.has(item.id));

      // 3. Get available Admin news (enabled_for_brands = true)
      // Admin news is stored with SYSTEM_BRAND_ID, not null
      const SYSTEM_BRAND_ID = '00000000-0000-0000-0000-000000000999';
      const { data: availableNewsData, error: availableNewsError } = await supabase
        .from('news_items')
        .select('id, title, slug, excerpt, featured_image, created_at, published_at, status, tags, is_mandatory, enabled_for_brands')
        .eq('enabled_for_brands', true)
        .eq('brand_id', SYSTEM_BRAND_ID)
        .order('created_at', { ascending: false });

      if (availableNewsError) throw availableNewsError;

      const filteredAvailableNews = (availableNewsData || []).filter(item => !assignedNewsIds.has(item.id));

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

      const formattedAvailableNews = filteredAvailableNews.map(item => ({
        id: `available-news-${item.id}`,
        news_id: item.id,
        status: item.is_mandatory ? 'mandatory' as const : 'pending' as const,
        is_published: false,
        assigned_at: item.created_at,
        news_item: {
          id: item.id,
          title: item.title,
          slug: item.slug,
          excerpt: item.excerpt || '',
          featured_image: item.featured_image || '',
          is_mandatory: item.is_mandatory || false,
          published_at: item.published_at,
          tags: item.tags || []
        }
      }));

      const allNews = [...formattedAssignments, ...formattedBrandNews, ...formattedAvailableNews].sort((a, b) =>
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
      } else if (assignmentId.startsWith('available-news-') || !assignmentId.includes('-')) {
        // Available news without assignment - create one
        if (!currentValue && effectiveBrandId) {
          const { error } = await supabase
            .from('news_brand_assignments')
            .insert({
              brand_id: effectiveBrandId,
              news_id: assignment.news_id,
              status: 'accepted',
              is_published: true,
              assigned_at: new Date().toISOString()
            });

          if (error) throw error;
          
          // Trigger WordPress sync after accepting news
          triggerWordPressSync(effectiveBrandId, 'news');
        }
      } else {
        const { error } = await supabase
          .from('news_brand_assignments')
          .update({
            is_published: !currentValue,
            status: !currentValue ? 'accepted' : 'pending'
          })
          .eq('id', assignmentId);

        if (error) throw error;
        
        // Trigger WordPress sync after toggling publish status
        if (effectiveBrandId && !currentValue) {
          triggerWordPressSync(effectiveBrandId, 'news');
        }
      }
      await loadAssignments();
    } catch (error) {
      console.error('Error toggling publish:', error);
      alert('Publicatiestatus kon niet worden bijgewerkt');
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
    if (!user || !effectiveBrandId) return;

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
        effectiveBrandId,
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
  };

  const handleDelete = async (assignment: NewsAssignment) => {
    if (!confirm(`Weet je zeker dat je "${assignment.news_item.title}" wilt verwijderen?`)) {
      return;
    }

    try {
      if (assignment.status === 'brand') {
        const newsId = assignment.news_id || assignment.news_item.id;

        const { data, error } = await supabase
          .from('news_items')
          .delete()
          .eq('id', newsId)
          .select();

        if (error) throw error;

        if (!data || data.length === 0) {
          alert('Item kon niet worden verwijderd');
          return;
        }
      } else {
        const assignmentId = assignment.id.startsWith('brand-news-')
          ? assignment.news_id
          : assignment.id;

        const { data, error } = await supabase
          .from('news_brand_assignments')
          .delete()
          .eq('id', assignmentId)
          .select();

        if (error) throw error;

        if (!data || data.length === 0) {
          alert('Assignment kon niet worden verwijderd');
          return;
        }
      }

      setAssignments(prev => prev.filter(a => a.id !== assignment.id));
    } catch (error) {
      console.error('Error deleting:', error);
      alert(`Fout bij verwijderen: ${error instanceof Error ? error.message : 'Onbekende fout'}`);
    }
  };

  const createNewArticle = async () => {
    if (!user || !effectiveBrandId) return;

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
        effectiveBrandId,
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
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
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
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Nieuwsbeheer</h2>
            <p className="text-sm text-gray-500">Beheer via externe builder</p>
          </div>
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
              <span className="ml-2 py-0.5 px-2 rounded-full text-xs bg-green-100 text-green-800">
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
                    assignment.status === 'brand' ? 'bg-green-100 text-green-700' :
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
                    {/* Only show edit/delete for brand's own news, not Admin news */}
                    {assignment.status === 'brand' && (
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
