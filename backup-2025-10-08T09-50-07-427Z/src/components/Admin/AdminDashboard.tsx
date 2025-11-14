import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../lib/supabase';
import { AgentManagement } from './AgentManagement';
import { BrandForm } from './BrandForm';
import { NewsManagement } from './NewsManagement';
import { PageManagementView } from '../Brand/WebsiteManagement/PageManagementView';
import { MenuBuilderView } from '../Brand/WebsiteManagement/MenuBuilderView';
import { FooterBuilderView } from '../Brand/WebsiteManagement/FooterBuilderView';
import { NewPage } from '../Brand/WebsiteManagement/NewPage';
import { Users, Building2, FileText, Settings, Plus, Search, Filter, CreditCard as Edit, Trash2, LayoutGrid as Layout, Menu, Globe, Newspaper, MapPin, Plane } from 'lucide-react'
import { ChevronDown, ChevronRight } from 'lucide-react';

export function AdminDashboard() {
  const { user, signOut } = useAuth();
  const [activeSection, setActiveSection] = useState('dashboard');
  const [showWebsiteSubmenu, setShowWebsiteSubmenu] = useState(false);
  const [showContentSubmenu, setShowContentSubmenu] = useState(false);
  const [showBrandForm, setShowBrandForm] = useState(false);
  const [editingBrand, setEditingBrand] = useState<any>(null);
  const [brands, setBrands] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const SYSTEM_BRAND_ID = '00000000-0000-0000-0000-000000000001';

  React.useEffect(() => {
    if (['new-page', 'page-management', 'menu-builder', 'footer-builder'].includes(activeSection)) {
      setShowWebsiteSubmenu(true);
    }
    if (['admin-news', 'destinations', 'trips'].includes(activeSection)) {
      setShowContentSubmenu(true);
    }
  }, [activeSection]);

  const loadBrands = async () => {
    setLoading(true);
    try {
      console.log('🔄 Loading brands...');
      const data = await db.getBrands();
      console.log('✅ Brands loaded:', data);
      setBrands(data || []);
    } catch (error) {
      console.error('❌ Error loading brands:', error);
      setBrands([]);
      alert(`Database error: ${error.message || error}`);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    if (activeSection === 'brands' || ['page-management', 'menu-builder', 'footer-builder'].includes(activeSection)) {
      loadBrands();
    }
  }, [activeSection]);

  const handleBrandFormSuccess = () => {
    setShowBrandForm(false);
    setEditingBrand(null);
    loadBrands();
  };

  const handleEditBrand = (brand: any) => {
    setEditingBrand(brand);
    setShowBrandForm(true);
  };

  const handleDeleteBrand = async (brand: any) => {
    if (window.confirm(`Weet je zeker dat je "${brand.name}" wilt verwijderen?`)) {
      try {
        console.log('🗑️ Deleting brand:', brand.name, brand.id);
        await db.deleteBrand(brand.id);
        console.log('✅ Brand deleted successfully');
        await loadBrands();
      } catch (error) {
        console.error('❌ Error deleting brand:', error);
        alert(`Er is een fout opgetreden bij het verwijderen van de brand: ${error.message || error}`);
      }
    }
  };

  const sidebarItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Settings },
    { id: 'brands', label: 'Brand Management', icon: Building2 },
    { id: 'agents', label: 'Agent Management', icon: Users },
  ];

  const websiteItems = [
    { id: 'new-page', label: 'Nieuwe Pagina', icon: Plus },
    { id: 'page-management', label: 'Pagina Beheer', icon: FileText },
    { id: 'menu-builder', label: 'Menu Builder', icon: Menu },
    { id: 'footer-builder', label: 'Footer Builder', icon: Layout },
  ];

  const contentItems = [
    { id: 'admin-news', label: 'Nieuwsbeheer', icon: Newspaper },
    { id: 'destinations', label: 'Bestemmingen', icon: MapPin },
    { id: 'trips', label: 'Reizen', icon: Plane },
  ];

  const handleTravelStudioClick = () => {
    window.open('https://travelstudio.travelstudio-accept.bookunited.com/login', '_blank');
  };

  if (showBrandForm) {
    return (
      <div className="flex min-h-screen bg-gray-50">
        {/* Sidebar */}
        <div className="w-64 bg-slate-800 text-white flex flex-col min-h-screen">
          <div className="p-4 border-b border-slate-700">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-orange-600 rounded flex items-center justify-center">
                <span className="text-white font-bold text-sm">A</span>
              </div>
              <span className="font-semibold">Administrator</span>
            </div>
          </div>

          <nav className="flex-1 p-4">
            <ul className="space-y-2">
              {sidebarItems.map((item) => {
                const Icon = item.icon;
                return (
                  <li key={item.id}>
                    <button
                      onClick={() => setActiveSection(item.id)}
                      className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-left transition-colors ${
                        activeSection === item.id
                          ? 'bg-slate-700 text-white'
                          : 'text-slate-300 hover:text-white hover:bg-slate-700'
                      }`}
                    >
                      <Icon size={20} />
                      <span>{item.label}</span>
                    </button>
                  </li>
                );
              })}

              {/* Website Management Menu */}
              <li>
                <button
                  onClick={() => setShowWebsiteSubmenu(!showWebsiteSubmenu)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-left transition-colors ${
                    ['new-page', 'page-management', 'menu-builder', 'footer-builder'].includes(activeSection)
                      ? 'bg-slate-700 text-white'
                      : 'text-slate-300 hover:text-white hover:bg-slate-700'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <Globe size={20} />
                    <span>Website Management</span>
                  </div>
                  {showWebsiteSubmenu ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                </button>

                {showWebsiteSubmenu && (
                  <ul className="mt-2 ml-6 space-y-1">
                    {websiteItems.map((item) => {
                      const Icon = item.icon;
                      return (
                        <li key={item.id}>
                          <button
                            onClick={() => setActiveSection(item.id)}
                            className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-left transition-colors text-sm ${
                              activeSection === item.id
                                ? 'bg-slate-700 text-white'
                                : 'text-slate-400 hover:text-white hover:bg-slate-700'
                            }`}
                          >
                            <Icon size={16} />
                            <span>{item.label}</span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </li>

              {/* Travel Studio Link */}
              <li>
                <button
                  onClick={handleTravelStudioClick}
                  className="w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-left transition-colors text-slate-300 hover:text-white hover:bg-slate-700"
                >
                  <Globe size={20} />
                  <span>Travel Studio</span>
                </button>
              </li>
            </ul>
          </nav>

          <div className="p-4 border-t border-slate-700">
            <button
              onClick={signOut}
              className="w-full flex items-center space-x-3 px-3 py-2 text-slate-300 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
            >
              <Settings size={20} />
              <span>Settings</span>
            </button>
            <button
              onClick={signOut}
              className="w-full flex items-center space-x-3 px-3 py-2 text-slate-300 hover:text-white hover:bg-slate-700 rounded-lg transition-colors mt-2"
            >
              <span>Logout</span>
            </button>
          </div>
        </div>

        {/* Brand Form */}
        <BrandForm 
          onBack={() => setShowBrandForm(false)}
          onSuccess={handleBrandFormSuccess}
          editingBrand={editingBrand}
        />
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-gray-50">
      {/* Sidebar */}
      <div className="fixed left-0 top-0 bottom-0 w-64 bg-slate-800 text-white flex flex-col">
        <div className="p-4 border-b border-slate-700">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-orange-600 rounded flex items-center justify-center">
              <span className="text-white font-bold text-sm">A</span>
            </div>
            <span className="font-semibold">Administrator</span>
          </div>
        </div>

        <nav className="flex-1 p-4">
          <ul className="space-y-2">
            {sidebarItems.map((item) => {
              const Icon = item.icon;
              return (
                <li key={item.id}>
                  <button
                    onClick={() => setActiveSection(item.id)}
                    className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-left transition-colors ${
                      activeSection === item.id
                        ? 'bg-slate-700 text-white'
                        : 'text-slate-300 hover:text-white hover:bg-slate-700'
                    }`}
                  >
                    <Icon size={20} />
                    <span>{item.label}</span>
                  </button>
                </li>
              );
            })}

            {/* Website Management Menu */}
            <li>
              <button
                onClick={() => setShowWebsiteSubmenu(!showWebsiteSubmenu)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-left transition-colors ${
                  ['new-page', 'page-management', 'menu-builder', 'footer-builder'].includes(activeSection)
                    ? 'bg-slate-700 text-white'
                    : 'text-slate-300 hover:text-white hover:bg-slate-700'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <Globe size={20} />
                  <span>Website Management</span>
                </div>
                {showWebsiteSubmenu ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
              </button>

              {showWebsiteSubmenu && (
                <ul className="mt-2 ml-6 space-y-1">
                  {websiteItems.map((item) => {
                    const Icon = item.icon;
                    return (
                      <li key={item.id}>
                        <button
                          onClick={() => setActiveSection(item.id)}
                          className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-left transition-colors text-sm ${
                            activeSection === item.id
                              ? 'bg-slate-700 text-white'
                              : 'text-slate-400 hover:text-white hover:bg-slate-700'
                          }`}
                        >
                          <Icon size={16} />
                          <span>{item.label}</span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </li>

            {/* Content Menu */}
            <li>
              <button
                onClick={() => setShowContentSubmenu(!showContentSubmenu)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-left transition-colors ${
                  ['admin-news', 'destinations', 'trips'].includes(activeSection)
                    ? 'bg-slate-700 text-white'
                    : 'text-slate-300 hover:text-white hover:bg-slate-700'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <FileText size={20} />
                  <span>Content</span>
                </div>
                {showContentSubmenu ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
              </button>

              {showContentSubmenu && (
                <ul className="mt-2 ml-6 space-y-1">
                  {contentItems.map((item) => {
                    const Icon = item.icon;
                    return (
                      <li key={item.id}>
                        <button
                          onClick={() => setActiveSection(item.id)}
                          className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-left transition-colors text-sm ${
                            activeSection === item.id
                              ? 'bg-slate-700 text-white'
                              : 'text-slate-400 hover:text-white hover:bg-slate-700'
                          }`}
                        >
                          <Icon size={16} />
                          <span>{item.label}</span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </li>

            {/* Travel Studio Link */}
            <li>
              <button
                onClick={handleTravelStudioClick}
                className="w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-left transition-colors text-slate-300 hover:text-white hover:bg-slate-700"
              >
                <Globe size={20} />
                <span>Travel Studio</span>
              </button>
            </li>
          </ul>
        </nav>

        <div className="p-4 border-t border-slate-700">
          <button
            onClick={signOut}
            className="w-full flex items-center space-x-3 px-3 py-2 text-slate-300 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
          >
            <Settings size={20} />
            <span>Settings</span>
          </button>
          <button
            onClick={signOut}
            className="w-full flex items-center space-x-3 px-3 py-2 text-slate-300 hover:text-white hover:bg-slate-700 rounded-lg transition-colors mt-2"
          >
            <span>Logout</span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="ml-64 flex flex-col min-h-screen">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {activeSection === 'dashboard' && 'Dashboard'}
                {activeSection === 'brands' && 'Brand Management'}
                {activeSection === 'agents' && 'Agent Management'}
                {activeSection === 'new-page' && 'Nieuwe Pagina'}
                {activeSection === 'page-management' && 'Pagina Beheer'}
                {activeSection === 'menu-builder' && 'Menu Builder'}
                {activeSection === 'footer-builder' && 'Footer Builder'}
              </h1>
              <p className="text-gray-600 mt-1">
                {activeSection === 'brands' && 'Manage all brands in the system'}
                {activeSection === 'dashboard' && 'System overview and statistics'}
                {activeSection === 'new-page' && 'Maak een nieuwe pagina voor je website'}
                {activeSection === 'page-management' && 'Beheer alle pagina\'s van je website'}
                {activeSection === 'menu-builder' && 'Bouw en organiseer je website navigatie'}
                {activeSection === 'footer-builder' && 'Ontwerp en beheer je website footer'}
              </p>
            </div>
            
            {activeSection === 'brands' && (
              <button 
                onClick={() => setShowBrandForm(true)}
                className="bg-black text-white px-4 py-2 rounded-lg flex items-center space-x-2 hover:bg-gray-800 transition-colors"
              >
                <Plus size={16} />
                <span>Add Brand</span>
              </button>
            )}
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 p-6">
          {activeSection === 'agents' && <AgentManagement />}
          {activeSection === 'admin-news' && <NewsManagement />}

          {/* Website Management Content - Admin uses System Templates brand */}
          {activeSection === 'new-page' && <NewPage brandId={SYSTEM_BRAND_ID} />}
          {activeSection === 'page-management' && <PageManagementView brandId={SYSTEM_BRAND_ID} hideCreateButtons={true} />}
          {activeSection === 'menu-builder' && <MenuBuilderView brandId={SYSTEM_BRAND_ID} />}
          {activeSection === 'footer-builder' && <FooterBuilderView brandId={SYSTEM_BRAND_ID} />}

          {activeSection === 'dashboard' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white p-6 rounded-lg shadow-sm border">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Total Brands</p>
                    <p className="text-2xl font-bold text-gray-900">12</p>
                  </div>
                  <Building2 className="h-8 w-8 text-blue-600" />
                </div>
              </div>
              <div className="bg-white p-6 rounded-lg shadow-sm border">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Active Agents</p>
                    <p className="text-2xl font-bold text-gray-900">48</p>
                  </div>
                  <Users className="h-8 w-8 text-green-600" />
                </div>
              </div>
              <div className="bg-white p-6 rounded-lg shadow-sm border">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Published Websites</p>
                    <p className="text-2xl font-bold text-gray-900">8</p>
                  </div>
                  <FileText className="h-8 w-8 text-purple-600" />
                </div>
              </div>
              <div className="bg-white p-6 rounded-lg shadow-sm border">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Content Articles</p>
                    <p className="text-2xl font-bold text-gray-900">156</p>
                  </div>
                  <FileText className="h-8 w-8 text-orange-600" />
                </div>
              </div>
            </div>
          )}

          {activeSection === 'brands' && (
            <div className="bg-white rounded-lg shadow-sm border">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
                      <Building2 size={20} />
                      <span>All Brands</span>
                    </h2>
                    <p className="text-sm text-gray-600 mt-1">
                      {loading ? 'Loading...' : `${brands.length} brands in the system`}
                    </p>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                      <input
                        type="text"
                        placeholder="Search brands..."
                        className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <button className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50">
                      <Filter size={16} />
                    </button>
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Brand</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Slug</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {loading ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-8 text-center">
                          <div className="flex items-center justify-center">
                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-orange-600 mr-3"></div>
                            <span className="text-gray-500">Loading brands...</span>
                          </div>
                        </td>
                      </tr>
                    ) : brands.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-8 text-center">
                          <div className="text-gray-500">
                            <Building2 className="mx-auto h-12 w-12 text-gray-300 mb-4" />
                            <h3 className="text-lg font-medium text-gray-900 mb-2">No brands yet</h3>
                            <p className="text-gray-600">Get started by creating your first brand.</p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      brands.map((brand, index) => {
                        const initials = brand.name
                          .split(' ')
                          .map((word: string) => word[0])
                          .join('')
                          .toUpperCase()
                          .slice(0, 2);
                        
                        const colors = [
                          'bg-blue-100 text-blue-600',
                          'bg-green-100 text-green-600', 
                          'bg-purple-100 text-purple-600',
                          'bg-orange-100 text-orange-600',
                          'bg-pink-100 text-pink-600',
                          'bg-indigo-100 text-indigo-600'
                        ];
                        const colorClass = colors[index % colors.length];
                        
                        return (
                          <tr key={brand.id}>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <div className={`w-8 h-8 ${colorClass} rounded-lg flex items-center justify-center mr-3`}>
                                  <span className="font-semibold text-sm">{initials}</span>
                                </div>
                                <span className="font-medium text-gray-900">{brand.name}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{brand.slug}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{brand.description || brand.business_type}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {new Date(brand.created_at).toLocaleDateString('nl-NL')}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              <div className="flex items-center space-x-2">
                                <button 
                                  onClick={() => handleEditBrand(brand)}
                                  className="p-1 hover:bg-gray-100 rounded"
                                  title="Bewerk brand"
                                >
                                  <Edit size={16} className="text-blue-600" />
                                </button>
                                <button 
                                  onClick={() => handleDeleteBrand(brand)}
                                  className="p-1 hover:bg-gray-100 rounded"
                                  title="Verwijder brand"
                                >
                                  <Trash2 size={16} className="text-red-600" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}