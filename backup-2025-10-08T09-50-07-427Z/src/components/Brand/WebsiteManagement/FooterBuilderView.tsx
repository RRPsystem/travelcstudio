import React, { useState, useEffect } from 'react';
import { CreditCard as Edit, Plus, Trash2, LayoutGrid as Layout } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { generateBuilderJWT, generateBuilderDeeplink } from '../../../lib/jwtHelper';
import { useAuth } from '../../../contexts/AuthContext';

interface Footer {
  id: string;
  name: string;
  type: string;
  is_default: boolean;
  created_at: string;
}

interface Props {
  brandId?: string;
}

export function FooterBuilderView({ brandId: propBrandId }: Props = {}) {
  const { user } = useAuth();
  const [footers, setFooters] = useState<Footer[]>([]);
  const [loading, setLoading] = useState(true);
  const [brandId, setBrandId] = useState<string>('');

  useEffect(() => {
    loadBrandAndFooters();
  }, [user, propBrandId]);

  const loadBrandAndFooters = async () => {
    if (!user) return;

    try {
      if (propBrandId) {
        setBrandId(propBrandId);
        await loadFooters(propBrandId);
      } else {
        const { data: userData } = await supabase
          .from('users')
          .select('brand_id')
          .eq('id', user.id)
          .single();

        if (userData?.brand_id) {
          setBrandId(userData.brand_id);
          await loadFooters(userData.brand_id);
        }
      }
    } catch (error) {
      console.error('Error loading brand:', error);
    }
  };

  const loadFooters = async (brandId: string) => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('layouts')
        .select('id, name, type, is_default, created_at')
        .eq('brand_id', brandId)
        .eq('type', 'footer')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setFooters(data || []);
    } catch (error) {
      console.error('Error loading footers:', error);
    } finally {
      setLoading(false);
    }
  };

  const openInFooterBuilder = async (footerId: string) => {
    if (!user || !brandId) return;

    try {
      const token = await generateBuilderJWT(brandId, user.id);
      const deeplink = generateBuilderDeeplink(brandId, token, { footerId });
      window.open(deeplink, '_blank');
    } catch (error) {
      console.error('Error generating deeplink:', error);
    }
  };

  const createNewFooter = async () => {
    if (!user || !brandId) return;

    try {
      const token = await generateBuilderJWT(brandId, user.id);
      const deeplink = generateBuilderDeeplink(brandId, token, { footerId: 'new' });
      window.open(deeplink, '_blank');
    } catch (error) {
      console.error('Error generating deeplink:', error);
    }
  };

  const deleteFooter = async (footerId: string) => {
    if (!confirm('Weet je zeker dat je deze footer wilt verwijderen?')) return;

    try {
      await supabase.from('layouts').delete().eq('id', footerId);
      await loadFooters(brandId);
    } catch (error) {
      console.error('Error deleting footer:', error);
    }
  };

  const setAsDefault = async (footerId: string) => {
    try {
      await supabase
        .from('layouts')
        .update({ is_default: false })
        .eq('brand_id', brandId)
        .eq('type', 'footer');

      await supabase
        .from('layouts')
        .update({ is_default: true })
        .eq('id', footerId);

      await loadFooters(brandId);
    } catch (error) {
      console.error('Error setting default footer:', error);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('nl-NL', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Footer Builder</h1>
          <p className="text-gray-600 mt-2">Beheer footer layouts voor je website</p>
        </div>
        <button
          onClick={createNewFooter}
          className="inline-flex items-center space-x-2 px-6 py-3 text-white rounded-lg font-medium transition-colors hover:bg-blue-700"
          style={{ backgroundColor: '#0ea5e9' }}
        >
          <Plus size={20} />
          <span>Nieuwe Footer</span>
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Footers laden...</p>
        </div>
      ) : footers.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <Layout size={48} className="mx-auto text-gray-400 mb-4" />
          <p className="text-gray-600 mb-4">Je hebt nog geen footer layouts aangemaakt</p>
          <button
            onClick={createNewFooter}
            className="inline-flex items-center space-x-2 px-6 py-3 border-2 border-blue-600 text-blue-600 rounded-lg font-medium transition-colors hover:bg-blue-50"
          >
            <Plus size={20} />
            <span>Maak je eerste footer</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {footers.map((footer) => (
            <div
              key={footer.id}
              className="bg-white rounded-lg border-2 border-gray-200 hover:border-blue-400 transition-colors overflow-hidden"
            >
              <div className="aspect-video bg-gray-100 flex items-center justify-center">
                <Layout size={48} className="text-gray-300" />
              </div>

              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{footer.name}</h3>
                    <p className="text-sm text-gray-500 mt-1">
                      Aangemaakt op {formatDate(footer.created_at)}
                    </p>
                  </div>
                  {footer.is_default && (
                    <span className="px-2 py-1 text-xs font-semibold text-green-800 bg-green-100 rounded-full">
                      Standaard
                    </span>
                  )}
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => openInFooterBuilder(footer.id)}
                    className="flex-1 inline-flex items-center justify-center space-x-2 px-4 py-2 text-white rounded-lg font-medium transition-colors hover:bg-blue-700"
                    style={{ backgroundColor: '#0ea5e9' }}
                  >
                    <Edit size={16} />
                    <span>Bewerken</span>
                  </button>

                  {!footer.is_default && (
                    <button
                      onClick={() => setAsDefault(footer.id)}
                      className="px-4 py-2 border-2 border-gray-300 text-gray-700 rounded-lg font-medium transition-colors hover:bg-gray-50"
                      title="Stel in als standaard"
                    >
                      Standaard
                    </button>
                  )}

                  <button
                    onClick={() => deleteFooter(footer.id)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Verwijderen"
                  >
                    <Trash2 size={18} />
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

export default FooterBuilderView;
