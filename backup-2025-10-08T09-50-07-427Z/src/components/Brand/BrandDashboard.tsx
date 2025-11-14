import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { AIContentGenerator } from './AIContentGenerator';
import { NewPage } from './WebsiteManagement/NewPage';
import PageManagementView from './WebsiteManagement/PageManagementView';
import MenuBuilderView from './WebsiteManagement/MenuBuilderView';
import FooterBuilderView from './WebsiteManagement/FooterBuilderView';
import { NewsApproval } from './ContentManagement/NewsApproval';
import { Users, Settings, Plus, Bot, Sparkles, Import as FileImport, ChevronDown, ChevronRight, LayoutGrid as Layout, FileText, Globe, Newspaper, MapPin, Plane } from 'lucide-react';

export function BrandDashboard() {
  const { user, signOut } = useAuth();
  const [activeSection, setActiveSection] = useState('dashboard');
  const [showAISubmenu, setShowAISubmenu] = useState(false);
  const [showWebsiteSubmenu, setShowWebsiteSubmenu] = useState(false);
  const [showContentSubmenu, setShowContentSubmenu] = useState(false);

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
  }, [activeSection]);

  const sidebarItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Settings },
    { id: 'agents', label: 'Agents', icon: Users },
    { id: 'settings', label: 'Brand Settings', icon: Settings },
  ];

  const websiteManagementItems = [
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
  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
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

            {/* Website Management Menu */}
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

            {/* Content Menu */}
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

            {/* AI Tools Menu */}
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

            {/* Travel Studio Link */}
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

        <div className="p-4 border-t border-gray-700">
          <button
            onClick={signOut}
            className="w-full flex items-center space-x-3 px-3 py-2 text-gray-300 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
          >
            <span>Logout</span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
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
                {activeSection === 'content' && 'Nieuwsberichten'}
                {activeSection === 'destinations' && 'Bestemmingen'}
                {activeSection === 'settings' && 'Brand Settings'}
                {activeSection === 'ai-content' && 'AI Content Generator'}
                {activeSection === 'ai-travelbro' && 'AI TravelBRO'}
                {activeSection === 'ai-import' && 'AI TravelImport'}
              </h1>
              <p className="text-gray-600 mt-1">
                {activeSection === 'websites' && 'Manage your travel websites'}
                {activeSection === 'dashboard' && 'Overview of your brand performance'}
                {activeSection === 'pages' && 'Beheer alle pagina\'s van je website'}
                {activeSection === 'menus' && 'Beheer menu\'s en hun structuur'}
                {activeSection === 'footers' && 'Beheer footer layouts voor je website'}
                {activeSection === 'ai-content' && 'Generate travel content with AI'}
                {activeSection === 'ai-travelbro' && 'Your AI travel assistant'}
                {activeSection === 'ai-import' && 'Import travel data with AI'}
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

        {/* Content */}
        <main className="flex-1 overflow-auto">
          {activeSection === 'new-page' && <NewPage brandId={user?.brand_id} onPageCreated={() => setActiveSection('pages')} />}
          {activeSection === 'pages' && <PageManagementView />}
          {activeSection === 'menus' && <MenuBuilderView />}
          {activeSection === 'footers' && <FooterBuilderView />}

          {/* Content Management */}
          {activeSection === 'nieuwsbeheer' && <NewsApproval />}

          {/* AI Tools Content */}
          {activeSection === 'ai-content' && (
            <AIContentGenerator />
          )}

          {activeSection === 'ai-travelbro' && (
            <div className="bg-white rounded-lg shadow-sm border p-8 text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #ff7700, #ffaa44)' }}>
                <Bot className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">AI TravelBRO</h2>
              <p className="text-gray-600 mb-6">Your intelligent travel assistant for personalized recommendations</p>
              <button className="text-white px-6 py-3 rounded-lg font-medium transition-colors hover:bg-orange-700" style={{ backgroundColor: '#ff7700' }}>
                Chat with TravelBRO
              </button>
            </div>
          )}
          
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
          
          {activeSection === 'dashboard' && (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #ff7700, #ffaa44)' }}>
                  <Settings className="w-8 h-8 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Brand Dashboard</h2>
                <p className="text-gray-600">Welkom bij het Brand Dashboard</p>
              </div>
            </div>
          )}

          {activeSection === 'websites' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
                <div className="h-32" style={{ background: 'linear-gradient(135deg, #ff7700, #ffaa44)' }}></div>
                <div className="p-4">
                  <h3 className="font-semibold text-gray-900 mb-2">Summer Destinations</h3>
                  <p className="text-sm text-gray-600 mb-3">summer-destinations.travel</p>
                  <div className="flex items-center justify-between text-xs text-gray-500 mb-3">
                    <span>5 pages</span>
                    <span className="bg-green-100 text-green-800 px-2 py-1 rounded">Published</span>
                  </div>
                  <div className="flex space-x-2">
                    <button className="flex-1 text-white py-2 px-3 rounded text-sm hover:bg-orange-700 transition-colors" style={{ backgroundColor: '#ff7700' }}>
                      Edit
                    </button>
                    <button className="p-2 text-gray-600 hover:text-gray-900 border border-gray-300 rounded">
                      <Eye size={16} />
                    </button>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
                <div className="h-32" style={{ background: 'linear-gradient(135deg, #ff7700, #ffaa44)' }}></div>
                <div className="p-4">
                  <h3 className="font-semibold text-gray-900 mb-2">Winter Adventures</h3>
                  <p className="text-sm text-gray-600 mb-3">winter-adventures.travel</p>
                  <div className="flex items-center justify-between text-xs text-gray-500 mb-3">
                    <span>3 pages</span>
                    <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded">Draft</span>
                  </div>
                  <div className="flex space-x-2">
                    <button className="flex-1 text-white py-2 px-3 rounded text-sm hover:bg-orange-700 transition-colors" style={{ backgroundColor: '#ff7700' }}>
                      Edit
                    </button>
                    <button className="p-2 text-gray-600 hover:text-gray-900 border border-gray-300 rounded">
                      <Eye size={16} />
                    </button>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm border border-dashed border-gray-300 flex items-center justify-center min-h-64 hover:border-orange-400 transition-colors cursor-pointer">
                <div className="text-center">
                  <Plus className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900">Create New Website</h3>
                  <p className="text-gray-500">Start building your travel website</p>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}