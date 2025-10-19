import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../lib/supabase';
import { AIContentGenerator } from './AIContentGenerator';
import { TravelBro } from './AITools/TravelBro';
import { SocialMedia } from './AITools/SocialMedia';
import { BrandSettings } from './BrandSettings';
import { HelpBot } from '../shared/HelpBot';
import { Users, Settings, Plus, Bot, Sparkles, Import as FileImport, ChevronDown, ChevronRight, LayoutGrid as Layout, FileText, Globe, Newspaper, MapPin, Plane, Share2, Map, ArrowRight } from 'lucide-react';
import RoadmapBoard from './RoadmapBoard';

export function BrandDashboard() {
  const { user, signOut } = useAuth();
  const [activeSection, setActiveSection] = useState('dashboard');
  const [showAISubmenu, setShowAISubmenu] = useState(false);
  const [showWebsiteSubmenu, setShowWebsiteSubmenu] = useState(false);
  const [showContentSubmenu, setShowContentSubmenu] = useState(false);
  const [websites, setWebsites] = useState<any[]>([]);
  const [brandData, setBrandData] = useState<any>(null);
  const [stats, setStats] = useState({ pages: 0, newsItems: 0, agents: 0 });
  const [newRoadmapCount, setNewRoadmapCount] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash;
      if (hash.includes('/brand/website/pages')) {
        console.log('Hash routing: Navigating to pages section');
        setActiveSection('pages');
        setShowWebsiteSubmenu(true);
      } else if (hash.includes('/brand/website/menu')) {
        console.log('Hash routing: Navigating to menu section');
        setActiveSection('menus');
        setShowWebsiteSubmenu(true);
      } else if (hash.includes('/brand/website/footer')) {
        console.log('Hash routing: Navigating to footer section');
        setActiveSection('footers');
        setShowWebsiteSubmenu(true);
      } else if (hash.includes('/brand/content/news')) {
        console.log('Hash routing: Navigating to news section');
        setActiveSection('nieuwsbeheer');
        setShowContentSubmenu(true);
      }
    };

    handleHashChange();
    window.addEventListener('hashchange', handleHashChange);

    return () => {
      window.removeEventListener('hashchange', handleHashChange);
    };
  }, []);

  useEffect(() => {
    if (activeSection === 'dashboard') {
      loadDashboardData();
    }
  }, [activeSection, user?.brand_id]);

  const loadDashboardData = async () => {
    if (!user?.brand_id) return;
    setLoading(true);
    try {
      const [brandResult, websitesResult, newsResult, agentsResult] = await Promise.all([
        db.supabase.from('brands').select('*').eq('id', user.brand_id).maybeSingle(),
        db.supabase.from('websites').select('id', { count: 'exact' }).eq('brand_id', user.brand_id),
        db.supabase.from('news_items').select('id', { count: 'exact' }).eq('brand_id', user.brand_id),
        db.supabase.from('agents').select('id', { count: 'exact' }).eq('brand_id', user.brand_id)
      ]);

      let pagesCount = 0;
      if (websitesResult.data && websitesResult.data.length > 0) {
        const websiteIds = websitesResult.data.map((w: any) => w.id);
        const pagesResult = await db.supabase
          .from('website_pages')
          .select('id', { count: 'exact' })
          .in('website_id', websiteIds);
        pagesCount = pagesResult.count || 0;
      }

      if (brandResult.data) setBrandData(brandResult.data);
      setStats({
        pages: pagesCount,
        newsItems: newsResult.count || 0,
        agents: agentsResult.count || 0
      });

      loadRoadmapNotifications();
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadRoadmapNotifications = async () => {
    try {
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

      const { data, error } = await db.supabase
        .from('roadmap_items')
        .select('id')
        .gte('created_at', oneWeekAgo.toISOString());

      if (data) {
        setNewRoadmapCount(data.length);
      }
    } catch (error) {
      console.error('Error loading roadmap notifications:', error);
    }
  };

  const loadWebsites = async () => {
    if (!user?.brand_id) return;
    setLoading(true);
    try {
      const data = await db.getWebsites(user.brand_id);
      setWebsites(data || []);
    } catch (error) {
      console.error('Error loading websites:', error);
      setWebsites([]);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    if (['new-page', 'pages', 'menus', 'footers'].includes(activeSection)) {
      setShowWebsiteSubmenu(true);
    }
    if (['ai-content', 'ai-travelbro', 'ai-import'].includes(activeSection)) {
      setShowAISubmenu(true);
    }
    if (['nieuwsbeheer', 'destinations', 'trips'].includes(activeSection)) {
      setShowContentSubmenu(true);
    }
    if (activeSection === 'websites') {
      loadWebsites();
    }
  }, [activeSection, user?.brand_id]);

  const sidebarItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Sparkles },
    { id: 'agents', label: 'Agents', icon: Users },
    { id: 'social-media', label: 'Social Media', icon: Share2 },
  ];

  const websiteManagementItems = [
    { id: 'template-gallery', label: 'Template Gallery', icon: Layout },
    { id: 'new-page', label: 'Nieuwe Pagina', icon: Plus },
    { id: 'pages', label: 'Pagina Beheer', icon: FileText },
    { id: 'menus', label: 'Menu Builder', icon: Layout },
    { id: 'footers', label: 'Footer Builder', icon: Layout },
  ];

  const aiToolsItems = [
    { id: 'ai-content', label: 'AI Content Generator', icon: Sparkles },
    { id: 'ai-travelbro', label: 'AI TravelBRO', icon: Bot },
    { id: 'ai-import', label: 'AI TravelImport', icon: FileImport },
  ];

  const contentItems = [
    { id: 'nieuwsbeheer', label: 'Nieuwsbeheer', icon: Newspaper },
    { id: 'destinations', label: 'Bestemmingen', icon: MapPin },
    { id: 'trips', label: 'Reizen', icon: Plane },
  ];

  const handleTravelStudioClick = () => {
    window.open('https://travelstudio.travelstudio-accept.bookunited.com/login', '_blank');
  };

  const quickActions = [
    {
      title: 'Nieuwe Pagina',
      description: 'Maak een nieuwe website pagina',
      icon: Plus,
      color: 'from-blue-500 to-blue-600',
      action: () => setActiveSection('new-page')
    },
    {
      title: 'AI Content',
      description: 'Genereer content met AI',
      icon: Sparkles,
      color: 'from-purple-500 to-purple-600',
      action: () => setActiveSection('ai-content')
    },
    {
      title: 'Social Media',
      description: 'Beheer je sociale media',
      icon: Share2,
      color: 'from-pink-500 to-pink-600',
      action: () => setActiveSection('social-media')
    },
    {
      title: 'TravelBRO',
      description: 'Chat met je AI assistent',
      icon: Bot,
      color: 'from-orange-500 to-orange-600',
      action: () => setActiveSection('ai-travelbro')
    },
    {
      title: 'Nieuws Beheer',
      description: 'Bekijk en publiceer nieuws',
      icon: Newspaper,
      color: 'from-green-500 to-green-600',
      action: () => setActiveSection('nieuwsbeheer')
    },
    {
      title: 'Templates',
      description: 'Kies uit professionele templates',
      icon: Layout,
      color: 'from-indigo-500 to-indigo-600',
      action: () => setActiveSection('template-gallery')
    }
  ];

  return (
    <div className="flex h-screen bg-gray-50">
      <div className="w-64 bg-gray-800 text-white flex flex-col">
        <div className="p-4 border-b border-gray-700">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-orange-600 rounded flex items-center justify-center" style={{ backgroundColor: '#ff7700' }}>
              <span className="text-white font-bold text-sm">B</span>
            </div>
            <div>
              <div className="font-semibold">Brand Dashboard</div>
              <div className="text-xs text-gray-400">{user?.email}</div>
            </div>
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
                        ? 'bg-gray-700 text-white'
                        : 'text-gray-300 hover:text-white hover:bg-gray-700'
                    }`}
                  >
                    <Icon size={20} />
                    <span>{item.label}</span>
                  </button>
                </li>
              );
            })}

            <li>
              <button
                onClick={() => setShowWebsiteSubmenu(!showWebsiteSubmenu)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-left transition-colors ${
                  ['pages', 'menus', 'footers'].includes(activeSection)
                    ? 'bg-gray-700 text-white'
                    : 'text-gray-300 hover:text-white hover:bg-gray-700'
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
                  {websiteManagementItems.map((item) => {
                    const Icon = item.icon;
                    return (
                      <li key={item.id}>
                        <button
                          onClick={() => setActiveSection(item.id)}
                          className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-left transition-colors text-sm ${
                            activeSection === item.id
                              ? 'bg-gray-700 text-white'
                              : 'text-gray-400 hover:text-white hover:bg-gray-700'
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

            <li>
              <button
                onClick={() => setShowContentSubmenu(!showContentSubmenu)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-left transition-colors ${
                  ['nieuwsbeheer', 'destinations', 'trips'].includes(activeSection)
                    ? 'bg-gray-700 text-white'
                    : 'text-gray-300 hover:text-white hover:bg-gray-700'
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
                              ? 'bg-gray-700 text-white'
                              : 'text-gray-400 hover:text-white hover:bg-gray-700'
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

            <li>
              <button
                onClick={() => setShowAISubmenu(!showAISubmenu)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-left transition-colors ${
                  ['ai-content', 'ai-travelbro', 'ai-import'].includes(activeSection)
                    ? 'bg-gray-700 text-white'
                    : 'text-gray-300 hover:text-white hover:bg-gray-700'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <Bot size={20} />
                  <span>AI Tools</span>
                </div>
                {showAISubmenu ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
              </button>

              {showAISubmenu && (
                <ul className="mt-2 ml-6 space-y-1">
                  {aiToolsItems.map((item) => {
                    const Icon = item.icon;
                    return (
                      <li key={item.id}>
                        <button
                          onClick={() => setActiveSection(item.id)}
                          className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-left transition-colors text-sm ${
                            activeSection === item.id
                              ? 'bg-gray-700 text-white'
                              : 'text-gray-400 hover:text-white hover:bg-gray-700'
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

            <li>
              <button
                onClick={handleTravelStudioClick}
                className="w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-left transition-colors text-gray-300 hover:text-white hover:bg-gray-700"
              >
                <Globe size={20} />
                <span>Travel Studio</span>
              </button>
            </li>
          </ul>
        </nav>

        <div className="p-4 border-t border-gray-700 space-y-2">
          <button
            onClick={() => setActiveSection('settings')}
            className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-left transition-colors ${
              activeSection === 'settings'
                ? 'bg-gray-700 text-white'
                : 'text-gray-300 hover:text-white hover:bg-gray-700'
            }`}
          >
            <Settings size={20} />
            <span>Brand Settings</span>
          </button>
          <button
            onClick={() => setActiveSection('roadmap')}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-left transition-colors ${
              activeSection === 'roadmap'
                ? 'bg-gray-700 text-white'
                : 'text-gray-300 hover:text-white hover:bg-gray-700'
            }`}
          >
            <div className="flex items-center space-x-3">
              <Map size={20} />
              <span>Roadmap</span>
            </div>
            {newRoadmapCount > 0 && (
              <span className="bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {newRoadmapCount}
              </span>
            )}
          </button>
          <button
            onClick={signOut}
            className="w-full flex items-center space-x-3 px-3 py-2 text-gray-300 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
          >
            <span>Logout</span>
          </button>
        </div>
      </div>

      <div className="flex-1 flex flex-col">
        <header className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {activeSection === 'dashboard' && 'Brand Dashboard'}
                {activeSection === 'websites' && 'My Websites'}
                {activeSection === 'agents' && 'Agents'}
                {activeSection === 'pages' && 'Pagina Beheer'}
                {activeSection === 'menus' && 'Menu Builder'}
                {activeSection === 'footers' && 'Footer Builder'}
                {activeSection === 'nieuwsbeheer' && 'Nieuwsbeheer'}
                {activeSection === 'content' && 'Nieuwsberichten'}
                {activeSection === 'destinations' && 'Bestemmingen'}
                {activeSection === 'settings' && 'Brand Settings'}
                {activeSection === 'ai-content' && 'AI Content Generator'}
                {activeSection === 'ai-travelbro' && 'AI TravelBRO'}
                {activeSection === 'ai-import' && 'AI TravelImport'}
                {activeSection === 'social-media' && 'Social Media Manager'}
                {activeSection === 'roadmap' && 'Roadmap'}
              </h1>
              <p className="text-gray-600 mt-1">
                {activeSection === 'dashboard' && 'Welkom terug bij je brand dashboard'}
                {activeSection === 'websites' && 'Manage your travel websites'}
                {activeSection === 'pages' && 'Beheer alle pagina\'s van je website'}
                {activeSection === 'menus' && 'Beheer menu\'s en hun structuur'}
                {activeSection === 'footers' && 'Beheer footer layouts voor je website'}
                {activeSection === 'nieuwsbeheer' && 'Beheer en publiceer je nieuwsberichten'}
                {activeSection === 'ai-content' && 'Generate travel content with AI'}
                {activeSection === 'ai-travelbro' && 'Your AI travel assistant'}
                {activeSection === 'ai-import' && 'Import travel data with AI'}
                {activeSection === 'social-media' && 'Manage your social media presence'}
                {activeSection === 'roadmap' && 'Vote on features and track development progress'}
              </p>
            </div>

            {activeSection === 'websites' && (
              <button className="text-white px-4 py-2 rounded-lg flex items-center space-x-2 hover:bg-orange-700 transition-colors" style={{ backgroundColor: '#ff7700' }}>
                <Plus size={16} />
                <span>New Website</span>
              </button>
            )}
          </div>
        </header>

        <main className="flex-1 overflow-auto">
          {activeSection === 'dashboard' && (
            <div className="p-6">
              {loading ? (
                <div className="flex items-center justify-center h-64">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2" style={{ borderColor: '#ff7700' }}></div>
                </div>
              ) : (
                <div className="max-w-7xl mx-auto">
                  <div className="mb-8">
                    <div className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-2xl p-8 text-white shadow-lg">
                      <h2 className="text-3xl font-bold mb-2">Welkom, {brandData?.name || 'Brand'}!</h2>
                      <p className="text-orange-100">Bouw en beheer je reiswebsite met krachtige AI tools</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <div className="bg-white rounded-xl p-6 shadow-md border border-gray-100">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-gray-600">Website Pagina's</h4>
                        <FileText className="w-5 h-5 text-blue-500" />
                      </div>
                      <p className="text-3xl font-bold text-gray-900">{stats.pages}</p>
                    </div>

                    <div className="bg-white rounded-xl p-6 shadow-md border border-gray-100">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-gray-600">Nieuwsberichten</h4>
                        <Newspaper className="w-5 h-5 text-green-500" />
                      </div>
                      <p className="text-3xl font-bold text-gray-900">{stats.newsItems}</p>
                    </div>

                    <div className="bg-white rounded-xl p-6 shadow-md border border-gray-100">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-gray-600">Agenten</h4>
                        <Users className="w-5 h-5 text-purple-500" />
                      </div>
                      <p className="text-3xl font-bold text-gray-900">{stats.agents}</p>
                    </div>
                  </div>

                  <div className="mb-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Snelkoppelingen</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {quickActions.map((action, index) => {
                        const Icon = action.icon;
                        return (
                          <button
                            key={index}
                            onClick={action.action}
                            className="group relative bg-white rounded-2xl p-6 shadow-md hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2 border border-gray-100"
                          >
                            <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${action.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300 shadow-lg`}>
                              <Icon className="w-7 h-7 text-white" />
                            </div>
                            <h4 className="font-semibold text-gray-900 mb-2">{action.title}</h4>
                            <p className="text-sm text-gray-600 mb-3">{action.description}</p>
                            <div className="flex items-center text-sm font-medium" style={{ color: '#ff7700' }}>
                              Start <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeSection === 'template-gallery' && (
            <div className="bg-white rounded-lg shadow-sm border p-8 text-center">
              <Layout className="mx-auto h-16 w-16 text-gray-400 mb-4" />
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Template Gallery</h2>
              <p className="text-gray-600">Kies uit professionele website templates (Binnenkort beschikbaar)</p>
            </div>
          )}
          {activeSection === 'pages' && (
            <div className="bg-white rounded-lg shadow-sm border p-8 text-center">
              <FileText className="mx-auto h-16 w-16 text-gray-400 mb-4" />
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Pagina Beheer</h2>
              <p className="text-gray-600">Beheer alle pagina's van je website (Binnenkort beschikbaar)</p>
            </div>
          )}
          {activeSection === 'menus' && (
            <div className="bg-white rounded-lg shadow-sm border p-8 text-center">
              <Layout className="mx-auto h-16 w-16 text-gray-400 mb-4" />
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Menu Builder</h2>
              <p className="text-gray-600">Beheer menu's en hun structuur (Binnenkort beschikbaar)</p>
            </div>
          )}
          {activeSection === 'footers' && (
            <div className="bg-white rounded-lg shadow-sm border p-8 text-center">
              <Layout className="mx-auto h-16 w-16 text-gray-400 mb-4" />
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Footer Builder</h2>
              <p className="text-gray-600">Beheer footer layouts voor je website (Binnenkort beschikbaar)</p>
            </div>
          )}
          {activeSection === 'settings' && <BrandSettings />}
          {activeSection === 'nieuwsbeheer' && (
            <div className="bg-white rounded-lg shadow-sm border p-8 text-center">
              <Newspaper className="mx-auto h-16 w-16 text-gray-400 mb-4" />
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Nieuws Beheer</h2>
              <p className="text-gray-600">Beheer en publiceer je nieuwsberichten (Binnenkort beschikbaar)</p>
            </div>
          )}
          {activeSection === 'ai-content' && <AIContentGenerator />}
          {activeSection === 'ai-travelbro' && <TravelBro />}
          {activeSection === 'social-media' && <SocialMedia />}
          {activeSection === 'roadmap' && <RoadmapBoard />}

          {activeSection === 'ai-import' && (
            <div className="bg-white rounded-lg shadow-sm border p-8 text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #ff7700, #ffaa44)' }}>
                <FileImport className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">AI TravelImport</h2>
              <p className="text-gray-600 mb-6">Import and process travel data intelligently with AI</p>
              <button className="text-white px-6 py-3 rounded-lg font-medium transition-colors hover:bg-orange-700" style={{ backgroundColor: '#ff7700' }}>
                Start Import Process
              </button>
            </div>
          )}

          {activeSection === 'websites' && (
            <div className="p-6">
              {loading ? (
                <div className="flex items-center justify-center h-64">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
                </div>
              ) : websites.length === 0 ? (
                <div className="bg-white rounded-lg shadow-sm border p-12 text-center">
                  <Globe className="mx-auto h-16 w-16 text-gray-400 mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">No websites yet</h3>
                  <p className="text-gray-600 mb-6">Create your first travel website to get started</p>
                  <button className="text-white px-6 py-3 rounded-lg font-medium transition-colors hover:bg-orange-700" style={{ backgroundColor: '#ff7700' }}>
                    <Plus className="inline-block mr-2" size={16} />
                    Create Website
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {websites.map((website) => (
                    <div key={website.id} className="bg-white rounded-lg shadow-sm border overflow-hidden">
                      <div className="h-32" style={{ background: 'linear-gradient(135deg, #ff7700, #ffaa44)' }}></div>
                      <div className="p-4">
                        <h3 className="font-semibold text-gray-900 mb-2">{website.name}</h3>
                        <p className="text-sm text-gray-600 mb-3">{website.domain || 'No domain set'}</p>
                        <div className="flex items-center justify-between text-xs text-gray-500 mb-3">
                          <span>{website.page_count || 0} pages</span>
                          <span className={`px-2 py-1 rounded ${
                            website.status === 'published'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {website.status || 'Draft'}
                          </span>
                        </div>
                        <div className="flex space-x-2">
                          <button className="flex-1 text-white py-2 px-3 rounded text-sm hover:bg-orange-700 transition-colors" style={{ backgroundColor: '#ff7700' }}>
                            Edit
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                  <div className="bg-white rounded-lg shadow-sm border border-dashed border-gray-300 flex items-center justify-center min-h-64 hover:border-orange-400 transition-colors cursor-pointer">
                    <div className="text-center">
                      <Plus className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                      <h3 className="text-lg font-medium text-gray-900">Create New Website</h3>
                      <p className="text-gray-500">Start building your travel website</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </main>
      </div>
      <HelpBot />
    </div>
  );
}
