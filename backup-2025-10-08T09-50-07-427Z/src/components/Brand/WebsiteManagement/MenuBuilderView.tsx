import React, { useState, useEffect } from 'react';
import { CreditCard as Edit, Plus, Trash2, Menu as MenuIcon } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { generateBuilderJWT, generateBuilderDeeplink } from '../../../lib/jwtHelper';
import { useAuth } from '../../../contexts/AuthContext';

interface Menu {
  id: string;
  name: string;
  created_at: string;
}

interface MenuItem {
  id: string;
  label: string;
  url: string;
  parent_id: string | null;
  order: number;
  target: string;
  icon: string | null;
}

interface Page {
  id: string;
  title: string;
  slug: string;
  menu_label: string | null;
  menu_order: number;
  parent_slug: string | null;
}

interface Props {
  brandId?: string;
}

export function MenuBuilderView({ brandId: propBrandId }: Props = {}) {
  const { user } = useAuth();
  const [menus, setMenus] = useState<Menu[]>([]);
  const [selectedMenu, setSelectedMenu] = useState<Menu | null>(null);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [pages, setPages] = useState<Page[]>([]);
  const [loading, setLoading] = useState(true);
  const [brandId, setBrandId] = useState<string>('');

  useEffect(() => {
    loadBrandAndMenus();
  }, [user, propBrandId]);

  useEffect(() => {
    if (brandId) {
      loadPages(brandId);
    }
  }, [brandId]);

  useEffect(() => {
    if (selectedMenu) {
      loadMenuItems(selectedMenu.id);
    }
  }, [selectedMenu]);

  const loadBrandAndMenus = async () => {
    if (!user) return;

    try {
      if (propBrandId) {
        setBrandId(propBrandId);
        await loadMenus(propBrandId);
      } else {
        const { data: userData } = await supabase
          .from('users')
          .select('brand_id')
          .eq('id', user.id)
          .single();

        if (userData?.brand_id) {
          setBrandId(userData.brand_id);
          await loadMenus(userData.brand_id);
        }
      }
    } catch (error) {
      console.error('Error loading brand:', error);
    }
  };

  const loadMenus = async (brandId: string) => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('menus')
        .select('id, name, created_at')
        .eq('brand_id', brandId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setMenus(data || []);
      if (data && data.length > 0 && !selectedMenu) {
        setSelectedMenu(data[0]);
      }
    } catch (error) {
      console.error('Error loading menus:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadPages = async (brandId: string) => {
    try {
      const { data, error } = await supabase
        .from('pages')
        .select('id, title, slug, menu_label, menu_order, parent_slug')
        .eq('brand_id', brandId)
        .eq('show_in_menu', true)
        .order('menu_order', { ascending: true });

      if (error) throw error;
      setPages(data || []);
    } catch (error) {
      console.error('Error loading pages:', error);
    }
  };

  const loadMenuItems = async (menuId: string) => {
    try {
      const { data, error } = await supabase
        .from('menu_items')
        .select('id, label, url, parent_id, order, target, icon')
        .eq('menu_id', menuId)
        .order('order', { ascending: true });

      if (error) throw error;
      setMenuItems(data || []);
    } catch (error) {
      console.error('Error loading menu items:', error);
    }
  };

  const openInHeaderBuilder = async (menuId: string) => {
    if (!user || !brandId) return;

    try {
      const token = await generateBuilderJWT(brandId, user.id);
      const deeplink = generateBuilderDeeplink(brandId, token, { menuId });
      window.open(deeplink, '_blank');
    } catch (error) {
      console.error('Error generating deeplink:', error);
    }
  };

  const createNewMenu = async () => {
    if (!user || !brandId) return;

    try {
      const token = await generateBuilderJWT(brandId, user.id);
      const deeplink = generateBuilderDeeplink(brandId, token, { menuId: 'new' });
      window.open(deeplink, '_blank');
    } catch (error) {
      console.error('Error generating deeplink:', error);
    }
  };

  const deleteMenu = async (menuId: string) => {
    if (!confirm('Weet je zeker dat je dit menu wilt verwijderen?')) return;

    try {
      await supabase.from('menus').delete().eq('id', menuId);
      await loadMenus(brandId);
      setSelectedMenu(null);
      setMenuItems([]);
    } catch (error) {
      console.error('Error deleting menu:', error);
    }
  };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Menu Builder</h1>
          <p className="text-gray-600 mt-2">Beheer menu's en hun structuur</p>
        </div>
        <button
          onClick={createNewMenu}
          className="inline-flex items-center space-x-2 px-6 py-3 text-white rounded-lg font-medium transition-colors hover:bg-blue-700"
          style={{ backgroundColor: '#0ea5e9' }}
        >
          <Plus size={20} />
          <span>Nieuw Menu</span>
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Menu's laden...</p>
        </div>
      ) : menus.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <MenuIcon size={48} className="mx-auto text-gray-400 mb-4" />
          <p className="text-gray-600 mb-4">Je hebt nog geen menu's aangemaakt</p>
          <button
            onClick={createNewMenu}
            className="inline-flex items-center space-x-2 px-6 py-3 border-2 border-blue-600 text-blue-600 rounded-lg font-medium transition-colors hover:bg-blue-50"
          >
            <Plus size={20} />
            <span>Maak je eerste menu</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-12 gap-6">
          <div className="col-span-4">
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <div className="p-4 border-b border-gray-200">
                <h2 className="font-semibold text-gray-900">Menu's</h2>
              </div>
              <div className="divide-y divide-gray-200">
                {menus.map((menu) => (
                  <div
                    key={menu.id}
                    className={`p-4 cursor-pointer transition-colors ${
                      selectedMenu?.id === menu.id ? 'bg-blue-50' : 'hover:bg-gray-50'
                    }`}
                    onClick={() => setSelectedMenu(menu)}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-gray-900">{menu.name}</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteMenu(menu.id);
                        }}
                        className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="col-span-8">
            {selectedMenu ? (
              <div className="bg-white rounded-lg border border-gray-200">
                <div className="p-6 border-b border-gray-200 flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900">{selectedMenu.name}</h2>
                    <p className="text-sm text-gray-600 mt-1">
                      {pages.length + menuItems.length} items in dit menu
                      {pages.length > 0 && ` (${pages.length} pagina's, ${menuItems.length} custom items)`}
                    </p>
                  </div>
                  <button
                    onClick={() => openInHeaderBuilder(selectedMenu.id)}
                    className="inline-flex items-center space-x-2 px-4 py-2 text-white rounded-lg font-medium transition-colors hover:bg-blue-700"
                    style={{ backgroundColor: '#0ea5e9' }}
                  >
                    <Edit size={18} />
                    <span>Bewerk in Header Builder</span>
                  </button>
                </div>

                <div className="p-6">
                  {pages.length > 0 && (
                    <div className="mb-6">
                      <h3 className="text-sm font-semibold text-gray-700 mb-3">Pagina's in menu</h3>
                      <div className="space-y-2">
                        {pages.map((page) => (
                          <div
                            key={page.id}
                            className={`flex items-center justify-between p-3 border border-orange-200 bg-orange-50 rounded-lg ${
                              page.parent_slug ? 'ml-8' : ''
                            }`}
                          >
                            <div className="flex items-center space-x-3">
                              <div>
                                <div className="font-medium text-gray-900">
                                  {page.menu_label || page.title}
                                </div>
                                <div className="text-sm text-gray-500">/{page.slug}</div>
                              </div>
                            </div>
                            <span className="text-xs text-orange-700 px-2 py-1 bg-orange-100 rounded">
                              Volgorde: {page.menu_order}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {menuItems.length === 0 && pages.length === 0 ? (
                    <div className="text-center py-8">
                      <MenuIcon size={48} className="mx-auto text-gray-300 mb-4" />
                      <p className="text-gray-600 mb-4">Dit menu heeft nog geen items</p>
                      <button
                        onClick={() => openInHeaderBuilder(selectedMenu.id)}
                        className="inline-flex items-center space-x-2 px-4 py-2 border-2 border-blue-600 text-blue-600 rounded-lg font-medium transition-colors hover:bg-blue-50"
                      >
                        <Edit size={18} />
                        <span>Items toevoegen in Builder</span>
                      </button>
                    </div>
                  ) : menuItems.length > 0 ? (
                    <div>
                      <h3 className="text-sm font-semibold text-gray-700 mb-3">Custom menu items</h3>
                      <div className="space-y-2">
                        {menuItems.map((item) => (
                          <div
                            key={item.id}
                            className={`flex items-center justify-between p-3 border border-gray-200 rounded-lg ${
                              item.parent_id ? 'ml-8 bg-gray-50' : 'bg-white'
                            }`}
                          >
                            <div className="flex items-center space-x-3">
                              {item.icon && <span className="text-gray-400">{item.icon}</span>}
                              <div>
                                <div className="font-medium text-gray-900">{item.label}</div>
                                <div className="text-sm text-gray-500">{item.url}</div>
                              </div>
                            </div>
                            <span className="text-xs text-gray-500 px-2 py-1 bg-gray-100 rounded">
                              {item.target === '_blank' ? 'Nieuw venster' : 'Zelfde venster'}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
                <p className="text-gray-600">Selecteer een menu om de details te bekijken</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default MenuBuilderView;
