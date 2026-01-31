import React, { useState, useEffect } from 'react';
import { Newspaper, Plus, Edit2, Trash2, Eye } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { NewsEditor } from './NewsEditor';

interface NewsItem {
  id: string;
  title: string;
  slug: string;
  created_at: string;
  enabled_for_brands: boolean;
  enabled_for_franchise: boolean;
  is_mandatory: boolean;
  tags: string[];
  content: any;
  excerpt: string;
  featured_image: string;
  status: 'draft' | 'published';
  author_type: string;
  author_id: string;
}

interface Brand {
  id: string;
  name: string;
  business_type: 'franchise' | 'custom';
}

export function NewsManagement() {
  const { user } = useAuth();
  const [newsItems, setNewsItems] = useState<NewsItem[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingNews, setEditingNews] = useState<NewsItem | null>(null);

  useEffect(() => {
    loadNewsItems();
    loadBrands();
  }, []);

  const loadNewsItems = async () => {
    try {
      const { data, error } = await supabase
        .from('news_items')
        .select('*')
        .eq('author_type', 'admin')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setNewsItems(data || []);
    } catch (error) {
      console.error('Error loading news:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadBrands = async () => {
    try {
      const { data, error } = await supabase
        .from('brands')
        .select('id, name, business_type')
        .order('name');

      if (error) throw error;
      setBrands(data || []);
    } catch (error) {
      console.error('Error loading brands:', error);
    }
  };

  const handleCreateNews = () => {
    setEditingNews(null);
    setIsEditorOpen(true);
  };

  const handleEditNews = (news: NewsItem) => {
    setEditingNews(news);
    setIsEditorOpen(true);
  };

  const handleCloseEditor = () => {
    setIsEditorOpen(false);
    setEditingNews(null);
  };

  const handleSaveNews = () => {
    loadNewsItems();
  };

  const handleToggleBrands = async (newsId: string, currentValue: boolean) => {
    try {
      const { error } = await supabase
        .from('news_items')
        .update({ enabled_for_brands: !currentValue })
        .eq('id', newsId);

      if (error) throw error;

      if (!currentValue) {
        const customBrands = brands.filter(b => b.business_type === 'custom').map(b => b.id);
        const assignments = customBrands.map(brandId => ({
          news_id: newsId,
          brand_id: brandId,
          status: 'pending'
        }));

        await supabase
          .from('news_brand_assignments')
          .upsert(assignments, { onConflict: 'news_id,brand_id' });
      } else {
        const customBrands = brands.filter(b => b.business_type === 'custom').map(b => b.id);
        await supabase
          .from('news_brand_assignments')
          .delete()
          .eq('news_id', newsId)
          .in('brand_id', customBrands);
      }

      loadNewsItems();
    } catch (error) {
      console.error('Error toggling brands:', error);
      alert('Failed to update');
    }
  };

  const handleToggleFranchise = async (newsId: string, currentValue: boolean) => {
    try {
      const { error } = await supabase
        .from('news_items')
        .update({ enabled_for_franchise: !currentValue })
        .eq('id', newsId);

      if (error) throw error;

      if (!currentValue) {
        const franchiseBrands = brands.filter(b => b.business_type === 'franchise').map(b => b.id);
        const assignments = franchiseBrands.map(brandId => ({
          news_id: newsId,
          brand_id: brandId,
          status: 'pending'
        }));

        await supabase
          .from('news_brand_assignments')
          .upsert(assignments, { onConflict: 'news_id,brand_id' });
      } else {
        const franchiseBrands = brands.filter(b => b.business_type === 'franchise').map(b => b.id);
        await supabase
          .from('news_brand_assignments')
          .delete()
          .eq('news_id', newsId)
          .in('brand_id', franchiseBrands);
      }

      loadNewsItems();
    } catch (error) {
      console.error('Error toggling franchise:', error);
      alert('Failed to update');
    }
  };

  const handleToggleMandatory = async (newsId: string, currentValue: boolean) => {
    try {
      const { error: updateError } = await supabase
        .from('news_items')
        .update({ is_mandatory: !currentValue })
        .eq('id', newsId);

      if (updateError) throw updateError;

      const newStatus = !currentValue ? 'mandatory' : 'pending';
      const { error: assignError } = await supabase
        .from('news_brand_assignments')
        .update({ status: newStatus })
        .eq('news_id', newsId);

      if (assignError) throw assignError;

      loadNewsItems();
    } catch (error) {
      console.error('Error toggling mandatory:', error);
      alert('Failed to update');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Weet je zeker dat je dit nieuwsbericht wilt verwijderen?')) return;

    try {
      const { error } = await supabase
        .from('news_items')
        .delete()
        .eq('id', id);

      if (error) throw error;
      loadNewsItems();
    } catch (error) {
      console.error('Error deleting news:', error);
      alert('Failed to delete news item');
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

  if (loading) {
    return <div className="p-8">Loading...</div>;
  }

  return (
    <div className="p-8">
      {isEditorOpen && (
        <NewsEditor
          newsItem={editingNews}
          onClose={handleCloseEditor}
          onSave={handleSaveNews}
        />
      )}

      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Newspaper className="w-8 h-8 text-orange-600" />
          <h1 className="text-2xl font-bold">Admin News Management</h1>
        </div>
        <button
          onClick={handleCreateNews}
          className="flex items-center gap-2 bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700"
        >
          <Plus className="w-5 h-5" />
          Create News
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Titel</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tags</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Datum</th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Custom Brand</th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Franchise</th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Verplicht</th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Acties</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {newsItems.map((item) => (
              <tr key={item.id} className="hover:bg-gray-50">
                <td className="px-6 py-4">
                  <div className="font-medium text-gray-900">{item.title}</div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex flex-wrap gap-1">
                    {item.tags && item.tags.length > 0 ? (
                      item.tags.map((tag, index) => (
                        <span
                          key={index}
                          className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                        >
                          {tag}
                        </span>
                      ))
                    ) : (
                      <span className="text-sm text-gray-400 italic">Geen tags</span>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">
                  {new Date(item.created_at).toLocaleDateString('nl-NL')}
                </td>
                <td className="px-6 py-4 text-center">
                  <button
                    onClick={() => handleToggleBrands(item.id, item.enabled_for_brands)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      item.enabled_for_brands ? 'bg-green-500' : 'bg-gray-300'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        item.enabled_for_brands ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </td>
                <td className="px-6 py-4 text-center">
                  <button
                    onClick={() => handleToggleFranchise(item.id, item.enabled_for_franchise)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      item.enabled_for_franchise ? 'bg-green-500' : 'bg-gray-300'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        item.enabled_for_franchise ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </td>
                <td className="px-6 py-4 text-center">
                  <button
                    onClick={() => handleToggleMandatory(item.id, item.is_mandatory)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      item.is_mandatory ? 'bg-green-500' : 'bg-gray-300'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        item.is_mandatory ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center justify-center gap-2">
                    <button
                      onClick={() => openPreview(item.slug)}
                      className="text-blue-600 hover:text-blue-800"
                      title="Preview"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleEditNews(item)}
                      className="text-orange-600 hover:text-orange-800"
                      title="Bewerken"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(item.id)}
                      className="text-red-600 hover:text-red-800"
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

        {newsItems.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            Nog geen nieuwsberichten. Maak je eerste bericht aan!
          </div>
        )}
      </div>
    </div>
  );
}
