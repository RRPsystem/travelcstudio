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
    tags: string[];
  };
}

export function NewsApproval() {
  const { user } = useAuth();
  const [assignments, setAssignments] = useState<NewsAssignment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAssignments();
  }, [user]);

  useEffect(() => {
    const handleFocus = () => {
      loadAssignments();
    };

    window.addEventListener('focus', handleFocus);
    return () => {
      window.removeEventListener('focus', handleFocus);
    };
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
          page_id,
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

      const typedAssignments = (assignmentData || []).map((item: any) => ({
        id: item.id,
        news_id: item.news_id,
        status: item.status,
        is_published: item.is_published,
        assigned_at: item.assigned_at,
        page_id: item.page_id,
        news_item: item.news_items
      }));

      setAssignments(typedAssignments);
    } catch (error) {
      console.error('Error loading news assignments:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = async (assignment: NewsAssignment) => {
    try {
      if (!assignment.page_id) {
        console.error('No page_id found for this assignment');
        return;
      }

      const returnUrl = `${window.location.origin}${window.location.pathname}#/brand/content/news`;

      const jwtResponse = await generateBuilderJWT({
        page_id: assignment.page_id,
        return_url: returnUrl,
        scopes: ['content:read', 'content:write'],
        mode: 'edit'
      });

      if (jwtResponse.url) {
        window.open(jwtResponse.url, '_blank');
      }
    } catch (error) {
      console.error('Error opening builder:', error);
    }
  };

  const handleTogglePublish = async (assignmentId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('news_brand_assignments')
        .update({ is_published: !currentStatus })
        .eq('id', assignmentId);

      if (error) throw error;

      setAssignments(prev => prev.map(a =>
        a.id === assignmentId ? { ...a, is_published: !currentStatus } : a
      ));
    } catch (error) {
      console.error('Error toggling publish status:', error);
    }
  };

  const handleDelete = async (assignmentId: string) => {
    if (!confirm('Weet je zeker dat je dit nieuwsbericht wilt verwijderen?')) return;

    try {
      const { error } = await supabase
        .from('news_brand_assignments')
        .delete()
        .eq('id', assignmentId);

      if (error) throw error;

      setAssignments(prev => prev.filter(a => a.id !== assignmentId));
    } catch (error) {
      console.error('Error deleting assignment:', error);
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
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Nieuwsbeheer</h2>
      </div>

      {assignments.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <Newspaper className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">Geen nieuwsberichten</h3>
          <p className="mt-1 text-sm text-gray-500">Er zijn nog geen nieuwsberichten beschikbaar.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {assignments.map((assignment) => (
            <div key={assignment.id} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
              {assignment.news_item.featured_image && (
                <img
                  src={assignment.news_item.featured_image}
                  alt={assignment.news_item.title}
                  className="w-full h-48 object-cover"
                />
              )}
              <div className="p-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {assignment.news_item.title}
                </h3>
                <p className="text-sm text-gray-600 mb-4 line-clamp-3">
                  {assignment.news_item.excerpt}
                </p>

                {assignment.news_item.tags && assignment.news_item.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-4">
                    {assignment.news_item.tags.map((tag, idx) => (
                      <span key={idx} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}

                <div className="flex items-center justify-between mb-4">
                  <span className={`px-3 py-1 text-xs font-medium rounded-full ${
                    assignment.news_item.is_mandatory
                      ? 'bg-red-100 text-red-800'
                      : 'bg-green-100 text-green-800'
                  }`}>
                    {assignment.news_item.is_mandatory ? 'Verplicht' : 'Optioneel'}
                  </span>

                  <label className="flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={assignment.is_published}
                      onChange={() => handleTogglePublish(assignment.id, assignment.is_published)}
                      className="sr-only peer"
                    />
                    <div className="relative w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    <span className="ms-3 text-sm font-medium text-gray-700">
                      {assignment.is_published ? 'Gepubliceerd' : 'Concept'}
                    </span>
                  </label>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => handleEdit(assignment)}
                    className="flex-1 inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                  >
                    <Pencil className="h-4 w-4 mr-2" />
                    Bewerken
                  </button>

                  <button
                    onClick={() => handleDelete(assignment.id)}
                    className="inline-flex items-center justify-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
