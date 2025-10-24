import React, { useState, useEffect } from 'react';
import { Menu, Plus, Edit2, Trash2, ExternalLink, RefreshCw } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { openBuilder } from '../../lib/jwtHelper';

interface MenuData {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

export function MenuBuilder() {
  const { user } = useAuth();
  const [menus, setMenus] = useState<MenuData[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadMenus();

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log('Page became visible, refreshing menu list...');
        loadMenus();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [user?.brand_id]);

  const loadMenus = async () => {
    if (!user?.brand_id) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('menus')
        .select('*')
        .eq('brand_id', user.brand_id)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      setMenus(data || []);
    } catch (err) {
      console.error('Error loading menus:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadMenus();
  };

  const handleCreateNew = async () => {
    if (!user?.brand_id) return;

    const returnUrl = `${window.location.origin}${window.location.pathname}#/brand/menu`;
    await openBuilder({
      brand_id: user.brand_id,
      mode: 'menu',
      return_url: returnUrl,
    });
  };

  const handleEdit = async (menuId: string) => {
    if (!user?.brand_id) return;

    const returnUrl = `${window.location.origin}${window.location.pathname}#/brand/menu`;
    await openBuilder({
      brand_id: user.brand_id,
      mode: 'menu',
      menu_id: menuId,
      return_url: returnUrl,
    });
  };

  const handleDelete = async (menuId: string, menuName: string) => {
    if (!confirm(`Weet je zeker dat je het menu "${menuName}" wilt verwijderen?`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('menus')
        .delete()
        .eq('id', menuId);

      if (error) throw error;

      setMenus(menus.filter(m => m.id !== menuId));
    } catch (err) {
      console.error('Error deleting menu:', err);
      alert('Fout bij verwijderen van menu');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mb-4"></div>
          <p className="text-gray-600">Menu's laden...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Menu className="w-8 h-8 text-orange-600" />
          <h1 className="text-3xl font-bold text-gray-900">Menu Beheer</h1>
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
            <span>Nieuw Menu</span>
          </button>
        </div>
      </div>

      {menus.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border-2 border-dashed border-gray-300">
          <Menu className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Nog geen menu's</h3>
          <p className="text-gray-600 mb-6">Maak je eerste menu aan om te beginnen.</p>
          <button
            onClick={handleCreateNew}
            className="px-6 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors inline-flex items-center space-x-2"
          >
            <Plus className="w-5 h-5" />
            <span>Nieuw Menu Maken</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {menus.map((menu) => (
            <div
              key={menu.id}
              className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-lg transition-shadow"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">{menu.name}</h3>
                  <p className="text-sm text-gray-500">
                    Laatst bijgewerkt: {new Date(menu.updated_at).toLocaleDateString('nl-NL')}
                  </p>
                </div>
                <Menu className="w-6 h-6 text-orange-600 flex-shrink-0" />
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => handleEdit(menu.id)}
                  className="flex-1 px-3 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors flex items-center justify-center space-x-2"
                >
                  <Edit2 className="w-4 h-4" />
                  <span>Bewerken</span>
                </button>
                <button
                  onClick={() => handleDelete(menu.id, menu.name)}
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
            <p className="font-medium mb-1">Menu's bewerken in de Builder</p>
            <p>
              Wanneer je op "Bewerken" of "Nieuw Menu" klikt, wordt de externe Website Builder geopend.
              Na het opslaan word je automatisch teruggebracht naar deze pagina met de bijgewerkte menu's.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
