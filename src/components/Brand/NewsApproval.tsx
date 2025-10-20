import React, { useState, useEffect } from 'react';
import { Newspaper, Eye, Plus, Pencil, Trash2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
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

  useEffect(() => {
    loadAssignments();
  }, [user]);

  const loadAssignments = async () => {
    if (!user?.brand_id) return;

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

      const { data: brandNewsData, error: brandNewsError } = await supabase
        .from('news_items')
        .select('id, title, slug, excerpt, featured_image, created_at, published_at, status, tags')
        .eq('author_type', 'brand')
        .eq('brand_id', user.brand_id)
        .order('created_at', { ascending: false });

      if (brandNewsError) throw brandNewsError;

      const formattedBrandNews = (brandNewsData || []).map(item => ({
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
    if (!user?.brand_id || !user?.id) return;

    try {
      console.log('Opening builder for news item:', assignment.news_item);
      const jwtResponse = await generateBuilderJWT(user.brand_id, user.id, ['content:read', 'content:write'], {
        newsSlug: assignment.news_item.slug,
        authorType: 'brand',
        authorId: user.id,
        mode: 'news'
      });
      const builderBaseUrl = 'https://www.ai-websitestudio.nl';
      const apiBaseUrl = jwtResponse.api_url || import.meta.env.VITE_SUPABASE_URL;
      const apiKey = jwtResponse.api_key || import.meta.env.VITE_SUPABASE_ANON_KEY;

      // Use the API base URL to construct the return URL (BOLT app, not WebContainer)
      const boltBaseUrl = apiBaseUrl.replace('/functions/v1', '').replace('https://', 'https://bolt.');
      const returnUrl = `${boltBaseUrl}/#/brand/content/news`;

      const deeplink = `${builderBaseUrl}?api=${encodeURIComponent(apiBaseUrl)}&apikey=${encodeURIComponent(apiKey)}&brand_id=${user.brand_id}&token=${encodeURIComponent(jwtResponse.token)}&content_type=news_items&news_slug=${assignment.news_item.slug}&return_url=${encodeURIComponent(returnUrl)}#/mode/news`;

      console.log('Generated deeplink:', deeplink);
      window.open(deeplink, '_blank');
    } catch (error) {
      console.error('Error opening builder:', error);
      alert('Kon de website builder niet openen');
    }
  };

  const handleDelete = async (assignment: NewsAssignment) => {
    if (!confirm(`Weet je zeker dat je "${assignment.news_item.title}" wilt verwijderen?`)) {
      return;
    }

    try {
      if (assignment.status === 'brand' && assignment.news_id) {
        const { error } = await supabase
          .from('news_items')
          .delete()
          .eq('id', assignment.news_id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('news_brand_assignments')
          .delete()
          .eq('id', assignment.id);

        if (error) throw error;
      }
      await loadAssignments();
    } catch (error) {
      console.error('Error deleting:', error);
      alert('Failed to delete');
    }
  };

  const createNewArticle = async () => {
    if (!user?.brand_id || !user?.id) return;

    try {
      const jwtResponse = await generateBuilderJWT(user.brand_id, user.id, ['content:read', 'content:write'], {
        authorType: 'brand',
        authorId: user.id,
        mode: 'news'
      });
      const builderBaseUrl = 'https://www.ai-websitestudio.nl';
      const apiBaseUrl = jwtResponse.api_url || import.meta.env.VITE_SUPABASE_URL;
      const apiKey = jwtResponse.api_key || import.meta.env.VITE_SUPABASE_ANON_KEY;

      // Use the API base URL to construct the return URL (BOLT app, not WebContainer)
      const boltBaseUrl = apiBaseUrl.replace('/functions/v1', '').replace('https://', 'https://bolt.');
      const returnUrl = `${boltBaseUrl}/#/brand/content/news`;

      const deeplink = `${builderBaseUrl}?api=${encodeURIComponent(apiBaseUrl)}&apikey=${encodeURIComponent(apiKey)}&brand_id=${user.brand_id}&token=${encodeURIComponent(jwtResponse.token)}&content_type=news_items&return_url=${encodeURIComponent(returnUrl)}#/mode/news`;

      window.open(deeplink, '_blank');
    } catch (error) {
      console.error('Error opening builder:', error);
      alert('Kon de website builder niet openen');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
            <Newspaper className="w-6 h-6 text-orange-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900">Nieuwsbeheer</h2>
        </div>
        <button
          onClick={createNewArticle}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 transition-colors"
        >
          <Plus className="h-5 w-5 mr-2" />
          Nieuw Bericht
        </button>
      </div>

      {assignments.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <Newspaper className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">Geen nieuwsberichten</h3>
          <p className="mt-1 text-sm text-gray-500">Er zijn nog geen nieuwsberichten beschikbaar.</p>
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
            {assignments.map((assignment) => (
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
                    {assignment.status === 'brand' && assignment.page_id && (
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
