import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { db, supabase } from '../../lib/supabase';
import { AgentManagement } from './AgentManagement';
import { BrandForm } from './BrandForm';
import { NewsManagement } from './NewsManagement';
import { DestinationManagement } from './DestinationManagement';
import { TemplateManager } from './TemplateManager';
import { TripCatalogManager } from './TripCatalogManager';
import DeeplinkTester from './DeeplinkTester';
import { HelpBot } from '../shared/HelpBot';
import { WordPressCatalogSync } from '../Operator/WordPressCatalogSync';
import PodcastManagement from '../Podcast/PodcastManagement';
import { GPTManagement } from '../Operator/GPTManagement';
import { AIContentGenerator } from '../Brand/AIContentGenerator';
import { Users, Building2, FileText, Settings, Plus, Search, Filter, CreditCard as Edit, Trash2, LayoutGrid as Layout, Menu, Globe, Newspaper, MapPin, Plane, Link, Key, X, Lock, BookOpen, Mic, Bot, Wand2 } from 'lucide-react'
import { ChevronDown, ChevronRight } from 'lucide-react';

export function AdminDashboard() {
  const { user, signOut, impersonationContext, resetContext } = useAuth();
  const [activeSection, setActiveSection] = useState('dashboard');
  const [showWebsiteSubmenu, setShowWebsiteSubmenu] = useState(false);
  const [showContentSubmenu, setShowContentSubmenu] = useState(false);
  const [showAIToolsSubmenu, setShowAIToolsSubmenu] = useState(false);
  const [showBrandForm, setShowBrandForm] = useState(false);
  const [editingBrand, setEditingBrand] = useState<any>(null);
  const [brands, setBrands] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedBrandId, setSelectedBrandId] = useState<string>('');
  const [dashboardStats, setDashboardStats] = useState({
    totalBrands: 0,
    activeAgents: 0,
    publishedPages: 0,
    newsArticles: 0
  });
  const SYSTEM_BRAND_ID = '00000000-0000-0000-0000-000000000999';
  const [resetPasswordBrand, setResetPasswordBrand] = useState<any>(null);
  const [newPassword, setNewPassword] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetError, setResetError] = useState('');

  React.useEffect(() => {
    if (['template-manager'].includes(activeSection)) {
      setShowWebsiteSubmenu(true);
    }
    if (['admin-news', 'destinations', 'trips', 'trip-catalog', 'wordpress-catalog'].includes(activeSection)) {
      setShowContentSubmenu(true);
    }
    if (['gpt-management', 'ai-content-generator'].includes(activeSection)) {
      setShowAIToolsSubmenu(true);
    }
  }, [activeSection]);

  const loadBrands = async () => {
    setLoading(true);
    try {
      console.log('🔄 Loading brands...');
      const data = await db.getBrands();
      console.log('✅ Brands loaded:', data);
      setBrands(data || []);
      if (data && data.length > 0 && !selectedBrandId) {
        setSelectedBrandId(data[0].id);
      }
    } catch (error) {
      console.error('❌ Error loading brands:', error);
      setBrands([]);
      alert(`Database error: ${error.message || error}`);
    } finally {
      setLoading(false);
    }
  };

  const loadDashboardStats = async () => {
    try {
      const [brandsData, usersData, pagesData, newsData] = await Promise.all([
        db.getBrands(),
        db.getUsers(),
        db.getPages(),
        db.getNewsItems()
      ]);

      setDashboardStats({
        totalBrands: brandsData?.length || 0,
        activeAgents: usersData?.filter((u: any) => u.role === 'agent')?.length || 0,
        publishedPages: pagesData?.filter((p: any) => p.is_published)?.length || 0,
        newsArticles: newsData?.length || 0
      });
    } catch (error) {
      console.error('Error loading dashboard stats:', error);
    }
  };

  React.useEffect(() => {
    if (activeSection === 'dashboard') {
      loadDashboardStats();
    }
    if (activeSection === 'brands') {
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

  const handleResetBrandPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetPasswordBrand) return;

    setResetLoading(true);
    setResetError('');

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Not logged in');
      }

      const { data: brandUser } = await db.getUserByBrandId(resetPasswordBrand.id);
      if (!brandUser) {
        throw new Error('Brand user not found');
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/reset-user-password`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            user_id: brandUser.id,
            new_password: newPassword
          })
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to reset password');
      }

      setResetLoading(false);

      alert(`✅ Wachtwoord gereset!\n\n📧 Email: ${brandUser.email}\n🔑 Nieuw wachtwoord: ${newPassword}\n\n⚠️ Noteer dit wachtwoord - het wordt maar 1x getoond!`);

      setResetPasswordBrand(null);
      setNewPassword('');
    } catch (err: any) {
      setResetError(err.message || 'Failed to reset password');
    } finally {
      setResetLoading(false);
    }
  };

  const sidebarItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Settings },
    { id: 'brands', label: 'Brand Management', icon: Building2 },
    { id: 'agents', label: 'Agent Management', icon: Users },
    { id: 'deeplink-tester', label: 'Deeplink Tester', icon: Link },
    { id: 'podcast', label: 'Podcast Beheer', icon: Mic },
  ];

  const websiteItems = [
    { id: 'template-manager', label: 'Template Manager', icon: Layout },
  ];

  const contentItems = [
    { id: 'admin-news', label: 'Nieuwsbeheer', icon: Newspaper },
    { id: 'destinations', label: 'Bestemmingen', icon: MapPin },
    { id: 'trips', label: 'Reizen', icon: Plane },
    { id: 'trip-catalog', label: 'Reizen Catalogus', icon: BookOpen },
    { id: 'wordpress-catalog', label: 'WordPress Catalogus', icon: Globe },
  ];

  const aiToolsItems = [
    { id: 'gpt-management', label: 'GPT Management', icon: Bot },
    { id: 'ai-content-generator', label: 'AI Content Generator', icon: Wand2 },
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
                    ['template-manager'].includes(activeSection)
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

              {/* AI Tools Menu */}
              <li>
                <button
                  onClick={() => setShowAIToolsSubmenu(!showAIToolsSubmenu)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-left transition-colors ${
                    ['gpt-management', 'ai-content-generator'].includes(activeSection)
                      ? 'bg-slate-700 text-white'
                      : 'text-slate-300 hover:text-white hover:bg-slate-700'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <Bot size={20} />
                    <span>AI Tools</span>
                  </div>
                  {showAIToolsSubmenu ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                </button>

                {showAIToolsSubmenu && (
                  <ul className="mt-2 ml-6 space-y-1">
                    {aiToolsItems.map((item) => {
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
                  ['template-manager'].includes(activeSection)
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
                  ['admin-news', 'destinations', 'trips', 'trip-catalog', 'wordpress-catalog'].includes(activeSection)
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

            {/* AI Tools Menu */}
            <li>
              <button
                onClick={() => setShowAIToolsSubmenu(!showAIToolsSubmenu)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-left transition-colors ${
                  ['gpt-management', 'ai-content-generator'].includes(activeSection)
                    ? 'bg-slate-700 text-white'
                    : 'text-slate-300 hover:text-white hover:bg-slate-700'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <Bot size={20} />
                  <span>AI Tools</span>
                </div>
                {showAIToolsSubmenu ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
              </button>

              {showAIToolsSubmenu && (
                <ul className="mt-2 ml-6 space-y-1">
                  {aiToolsItems.map((item) => {
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

        <div className="p-4 border-t border-slate-700 space-y-2">
          {impersonationContext?.role === 'admin' && user?.role === 'operator' && (
            <button
              onClick={resetContext}
              className="w-full flex items-center space-x-3 px-3 py-2 bg-orange-600 text-white hover:bg-orange-700 rounded-lg transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></svg>
              <span>Terug naar Operator</span>
            </button>
          )}
          <button
            onClick={() => setActiveSection('settings')}
            className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-left transition-colors ${
              activeSection === 'settings'
                ? 'bg-slate-700 text-white'
                : 'text-slate-300 hover:text-white hover:bg-slate-700'
            }`}
          >
            <Settings size={20} />
            <span>Settings</span>
          </button>
          <button
            onClick={() => setActiveSection('travel-journal')}
            className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-left transition-colors ${
              activeSection === 'travel-journal'
                ? 'bg-slate-700 text-white'
                : 'text-slate-300 hover:text-white hover:bg-slate-700'
            }`}
          >
            <BookOpen size={20} />
            <span>TravelC Talk</span>
          </button>
          <button
            onClick={signOut}
            className="w-full flex items-center space-x-3 px-3 py-2 text-slate-300 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
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
                {activeSection === 'admin-news' && 'Admin News Management'}
                {activeSection === 'destinations' && 'Bestemmingen Beheer'}
                {activeSection === 'trip-catalog' && 'Reizen Catalogus'}
                {activeSection === 'wordpress-catalog' && 'WordPress Catalogus'}
                {activeSection === 'podcast' && 'Podcast Beheer'}
                {activeSection === 'deeplink-tester' && 'Deeplink Tester'}
                {activeSection === 'template-manager' && 'Template Manager'}
                {activeSection === 'gpt-management' && 'GPT Management'}
                {activeSection === 'ai-content-generator' && 'AI Content Generator'}
                {activeSection === 'settings' && 'Settings'}
                {activeSection === 'travel-journal' && 'TravelC Talk'}
              </h1>
              <p className="text-gray-600 mt-1">
                {activeSection === 'brands' && 'Manage all brands in the system'}
                {activeSection === 'dashboard' && 'System overview and statistics'}
                {activeSection === 'admin-news' && 'Create and manage news items for all brands'}
                {activeSection === 'destinations' && 'Beheer bestemmingen voor alle brands'}
                {activeSection === 'trip-catalog' && 'Beoordeel tour operator reizen en wijs ze toe aan brands'}
                {activeSection === 'wordpress-catalog' && 'Import reizen vanuit WordPress RBS Travel catalogus'}
                {activeSection === 'podcast' && 'Plan en beheer podcast afleveringen, vragen en host notities'}
                {activeSection === 'deeplink-tester' && 'Test external builder integration'}
                {activeSection === 'template-manager' && 'Maak en beheer pagina templates voor brands'}
                {activeSection === 'gpt-management' && 'Configureer custom GPTs en content generatie instellingen'}
                {activeSection === 'ai-content-generator' && 'Genereer AI content voor bestemmingen, reizen en nieuws'}
                {activeSection === 'settings' && 'Systeeminstellingen en configuratie'}
                {activeSection === 'travel-journal' && 'Houd een dagboek bij van je reizen en deel je ervaringen'}
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
          {activeSection === 'destinations' && <DestinationManagement />}
          {activeSection === 'trip-catalog' && <TripCatalogManager />}
          {activeSection === 'wordpress-catalog' && <WordPressCatalogSync />}
          {activeSection === 'podcast' && <PodcastManagement />}
          {activeSection === 'deeplink-tester' && <DeeplinkTester />}
          {activeSection === 'template-manager' && <TemplateManager />}
          {activeSection === 'gpt-management' && <GPTManagement />}
          {activeSection === 'ai-content-generator' && <AIContentGenerator />}
          {activeSection === 'settings' && (
            <div className="max-w-6xl mx-auto">
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Instellingen</h2>
                <p className="text-gray-600">Coming soon: Systeemconfiguratie en instellingen.</p>
              </div>
            </div>
          )}
          {activeSection === 'travel-journal' && (
            <div className="max-w-6xl mx-auto">
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">TravelC Talk</h2>
                <p className="text-gray-600">Coming soon: Houd een dagboek bij van je reizen en deel je ervaringen.</p>
              </div>
            </div>
          )}

          {activeSection === 'dashboard' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white p-6 rounded-lg shadow-sm border">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Total Brands</p>
                    <p className="text-2xl font-bold text-gray-900">{dashboardStats.totalBrands}</p>
                  </div>
                  <Building2 className="h-8 w-8 text-blue-600" />
                </div>
              </div>
              <div className="bg-white p-6 rounded-lg shadow-sm border">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Active Agents</p>
                    <p className="text-2xl font-bold text-gray-900">{dashboardStats.activeAgents}</p>
                  </div>
                  <Users className="h-8 w-8 text-green-600" />
                </div>
              </div>
              <div className="bg-white p-6 rounded-lg shadow-sm border">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Published Pages</p>
                    <p className="text-2xl font-bold text-gray-900">{dashboardStats.publishedPages}</p>
                  </div>
                  <FileText className="h-8 w-8 text-purple-600" />
                </div>
              </div>
              <div className="bg-white p-6 rounded-lg shadow-sm border">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">News Articles</p>
                    <p className="text-2xl font-bold text-gray-900">{dashboardStats.newsArticles}</p>
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
                                  onClick={() => setResetPasswordBrand(brand)}
                                  className="p-1 hover:bg-gray-100 rounded"
                                  title="Reset wachtwoord"
                                >
                                  <Key size={16} className="text-orange-600" />
                                </button>
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

      {resetPasswordBrand && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900 flex items-center space-x-2">
                <Key size={20} className="text-orange-600" />
                <span>Reset Wachtwoord</span>
              </h2>
              <button
                onClick={() => {
                  setResetPasswordBrand(null);
                  setNewPassword('');
                  setResetError('');
                }}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleResetBrandPassword} className="p-6">
              {resetError && (
                <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
                  {resetError}
                </div>
              )}

              <div className="mb-4 bg-gray-50 border border-gray-200 rounded-lg p-4">
                <p className="text-sm text-gray-600 mb-1">Brand</p>
                <p className="font-medium text-gray-900">{resetPasswordBrand.name}</p>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <div className="flex items-center space-x-2">
                    <Lock size={16} />
                    <span>Nieuw Wachtwoord <span className="text-red-500">*</span></span>
                  </div>
                </label>
                <input
                  type="text"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Minimaal 6 karakters"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  required
                  minLength={6}
                />
                <p className="text-xs text-gray-500 mt-2">Het nieuwe wachtwoord wordt in een alert getoond na het resetten.</p>
              </div>

              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-6">
                <p className="text-sm text-orange-800">
                  <strong>Let op:</strong> Noteer het nieuwe wachtwoord. Het wordt maar 1x getoond!
                </p>
              </div>

              <div className="flex justify-end space-x-4">
                <button
                  type="button"
                  onClick={() => {
                    setResetPasswordBrand(null);
                    setNewPassword('');
                    setResetError('');
                  }}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Annuleren
                </button>
                <button
                  type="submit"
                  disabled={resetLoading}
                  className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50"
                >
                  {resetLoading ? 'Bezig...' : 'Wachtwoord Resetten'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      <HelpBot />
    </div>
  );
}