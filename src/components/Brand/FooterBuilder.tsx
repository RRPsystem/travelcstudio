import React, { useState, useEffect } from 'react';
import { Layout, Plus, Edit2, Trash2, ExternalLink, RefreshCw, CheckCircle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { openBuilder } from '../../lib/jwtHelper';

interface FooterData {
  id: string;
  name: string;
  type: string;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export function FooterBuilder() {
  const { user } = useAuth();
  const [footers, setFooters] = useState<FooterData[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadFooters();

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log('Page became visible, refreshing footer list...');
        loadFooters();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [user?.brand_id]);

  const loadFooters = async () => {
    if (!user?.brand_id) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('layouts')
        .select('*')
        .eq('brand_id', user.brand_id)
        .eq('type', 'footer')
        .order('updated_at', { ascending: false });

      if (error) throw error;
      setFooters(data || []);
    } catch (err) {
      console.error('Error loading footers:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadFooters();
  };

  const handleCreateNew = async () => {
    if (!user?.brand_id) return;

    const returnUrl = `${window.location.origin}${window.location.pathname}#/brand/footer`;
    await openBuilder({
      brand_id: user.brand_id,
      mode: 'footer',
      return_url: returnUrl,
    });
  };

  const handleEdit = async (footerId: string) => {
    if (!user?.brand_id) return;

    const returnUrl = `${window.location.origin}${window.location.pathname}#/brand/footer`;
    await openBuilder({
      brand_id: user.brand_id,
      mode: 'footer',
      footer_id: footerId,
      return_url: returnUrl,
    });
  };

  const handleSetDefault = async (footerId: string) => {
    try {
      await supabase
        .from('layouts')
        .update({ is_default: false })
        .eq('brand_id', user?.brand_id)
        .eq('type', 'footer');

      const { error } = await supabase
        .from('layouts')
        .update({ is_default: true })
        .eq('id', footerId);

      if (error) throw error;

      loadFooters();
    } catch (err) {
      console.error('Error setting default footer:', err);
      alert('Fout bij instellen van standaard footer');
    }
  };

  const handleDelete = async (footerId: string, footerName: string) => {
    if (!confirm(`Weet je zeker dat je de footer "${footerName}" wilt verwijderen?`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('layouts')
        .delete()
        .eq('id', footerId);

      if (error) throw error;

      setFooters(footers.filter(f => f.id !== footerId));
    } catch (err) {
      console.error('Error deleting footer:', err);
      alert('Fout bij verwijderen van footer');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mb-4"></div>
          <p className="text-gray-600">Footers laden...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Layout className="w-8 h-8 text-orange-600" />
          <h1 className="text-3xl font-bold text-gray-900">Footer Beheer</h1>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors flex items-center space-x-2 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            <span>Ververs</span>
          </button>
          <button
            onClick={handleCreateNew}
            className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors flex items-center space-x-2"
          >
            <Plus className="w-4 h-4" />
            <span>Nieuwe Footer</span>
          </button>
        </div>
      </div>

      {footers.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border-2 border-dashed border-gray-300">
          <Layout className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Nog geen footers</h3>
          <p className="text-gray-600 mb-6">Maak je eerste footer aan om te beginnen.</p>
          <button
            onClick={handleCreateNew}
            className="px-6 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors inline-flex items-center space-x-2"
          >
            <Plus className="w-5 h-5" />
            <span>Nieuwe Footer Maken</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {footers.map((footer) => (
            <div
              key={footer.id}
              className={`bg-white rounded-lg border ${
                footer.is_default ? 'border-green-500 shadow-lg' : 'border-gray-200'
              } p-6 hover:shadow-lg transition-shadow relative`}
            >
              {footer.is_default && (
                <div className="absolute top-3 right-3">
                  <div className="bg-green-100 text-green-700 px-2 py-1 rounded-full flex items-center space-x-1 text-xs font-medium">
                    <CheckCircle className="w-3 h-3" />
                    <span>Standaard</span>
                  </div>
                </div>
              )}

              <div className="flex items-start justify-between mb-4">
                <div className="flex-1 pr-20">
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">{footer.name}</h3>
                  <p className="text-sm text-gray-500">
                    Laatst bijgewerkt: {new Date(footer.updated_at).toLocaleDateString('nl-NL')}
                  </p>
                </div>
                <Layout className="w-6 h-6 text-orange-600 flex-shrink-0" />
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => handleEdit(footer.id)}
                  className="flex-1 px-3 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors flex items-center justify-center space-x-2"
                >
                  <Edit2 className="w-4 h-4" />
                  <span>Bewerken</span>
                </button>
                {!footer.is_default && (
                  <button
                    onClick={() => handleSetDefault(footer.id)}
                    className="px-3 py-2 border border-green-300 text-green-600 rounded-lg hover:bg-green-50 transition-colors"
                    title="Instellen als standaard"
                  >
                    <CheckCircle className="w-4 h-4" />
                  </button>
                )}
                <button
                  onClick={() => handleDelete(footer.id, footer.name)}
                  className="px-3 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                  title="Verwijderen"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <ExternalLink className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-800">
            <p className="font-medium mb-1">Footers bewerken in de Builder</p>
            <p>
              Wanneer je op "Bewerken" of "Nieuwe Footer" klikt, wordt de externe Website Builder geopend.
              Na het opslaan word je automatisch teruggebracht naar deze pagina met de bijgewerkte footers.
              De standaard footer wordt automatisch toegepast op alle pagina's.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
