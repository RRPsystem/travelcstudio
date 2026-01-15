import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../lib/supabase';
import { openVideoGenerator, openTravelImport } from '../../lib/jwtHelper';
import { AIContentGenerator } from '../Brand/AIContentGenerator';
import { SocialMediaManager } from '../Brand/SocialMediaManager';
import { TravelBroSetup } from '../TravelBro/TravelBroSetup';
import AgentProfileEdit from './AgentProfileEdit';
import { HelpBot } from '../shared/HelpBot';
import { Bot, User, ChevronDown, ChevronRight, Share2, Plane, Sparkles, Import as FileImport, Map, ArrowRight, Bell, ClipboardCheck, Video, BookOpen } from 'lucide-react';
import RoadmapBoard from '../Brand/RoadmapBoard';
import TestDashboard from '../Testing/TestDashboard';

export function AgentDashboard() {
  const { user, signOut } = useAuth();
  const [activeSection, setActiveSection] = useState('dashboard');
  const [showAISubmenu, setShowAISubmenu] = useState(false);
  const [agentData, setAgentData] = useState<any>(null);
  const [newRoadmapCount, setNewRoadmapCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAgentData();
    loadRoadmapNotifications();
  }, [user]);

  const loadAgentData = async () => {
    if (!user?.id) return;

    setLoading(true);
    try {
      const { data, error } = await db.supabase
        .from('agents')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (data) {
        setAgentData(data);
      }
    } catch (error) {
      console.error('Error loading agent data:', error);
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

  React.useEffect(() => {
    if (['ai-content', 'ai-travelbro', 'ai-import'].includes(activeSection)) {
      setShowAISubmenu(true);
    }
  }, [activeSection]);

  const sidebarItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Sparkles },
    { id: 'profile', label: 'Profiel', icon: User },
    { id: 'social-media', label: 'Social Media', icon: Share2 },
    { id: 'testing', label: 'Test Dashboard', icon: ClipboardCheck },
  ];

  const aiToolsItems = [
    { id: 'ai-content', label: 'Travel Content Generator', icon: Sparkles },
    { id: 'ai-import', label: 'Reis Import', icon: FileImport },
    { id: 'ai-travelbro', label: 'AI TravelBRO', icon: Bot },
    { id: 'ai-video', label: 'AI Travel Video', icon: Video },
  ];

  const handleTravelStudioClick = () => {
    window.open('https://travelstudio.travelstudio-accept.bookunited.com/login', '_blank');
  };

  const handleVideoGeneratorClick = async () => {
    if (!user || !user.brand_id) {
      console.error('No user or brand_id available');
      return;
    }

    try {
      const returnUrl = `${import.meta.env.VITE_APP_URL || window.location.origin}#/agent`;
      const deeplink = await openVideoGenerator(user.brand_id, user.id, { returnUrl });
      window.open(deeplink, '_blank');
    } catch (error) {
      console.error('Error opening video generator:', error);
      alert('Er is een fout opgetreden bij het openen van de video generator. Probeer het opnieuw.');
    }
  };

  const handleTravelImportClick = async () => {
    if (!user || !user.brand_id) {
      console.error('No user or brand_id available');
      return;
    }

    try {
      const returnUrl = `${import.meta.env.VITE_APP_URL || window.location.origin}#/agent`;
      const deeplink = await openTravelImport(user.brand_id, user.id, { returnUrl });
      window.open(deeplink, '_blank');
    } catch (error) {
      console.error('Error opening travel import:', error);
      alert('Er is een fout opgetreden bij het openen van de travel import. Probeer het opnieuw.');
    }
  };

  const quickActions = [
    {
      title: 'Profiel Bewerken',
      description: 'Update je foto, bio en contactgegevens',
      icon: User,
      color: 'from-blue-500 to-blue-600',
      action: () => setActiveSection('profile')
    },
    {
      title: 'Social Media',
      description: 'Beheer je social media posts',
      icon: Share2,
      color: 'from-pink-500 to-pink-600',
      action: () => setActiveSection('social-media')
    },
    {
      title: 'Content Generator',
      description: 'Genereer reiscontent met AI',
      icon: Sparkles,
      color: 'from-purple-500 to-purple-600',
      action: () => setActiveSection('ai-content')
    },
    {
      title: 'TravelBRO',
      description: 'Chat met je AI reisassistent',
      icon: Bot,
      color: 'from-orange-500 to-orange-600',
      action: () => setActiveSection('ai-travelbro')
    }
  ];

  return (
    <div className="flex h-screen bg-gray-50">
      <div className="w-64 bg-gray-800 text-white flex flex-col">
        <div className="p-4 border-b border-gray-700">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-orange-600 rounded flex items-center justify-center" style={{ backgroundColor: '#ff7700' }}>
              <span className="text-white font-bold text-sm">A</span>
            </div>
            <div>
              <div className="font-semibold">Agent Dashboard</div>
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
                onClick={() => setShowAISubmenu(!showAISubmenu)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-left transition-colors ${
                  ['ai-content', 'ai-travelbro', 'ai-import', 'ai-video'].includes(activeSection)
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
                          onClick={() => {
                            if (item.id === 'ai-video') {
                              handleVideoGeneratorClick();
                            } else if (item.id === 'ai-import') {
                              handleTravelImportClick();
                            } else {
                              setActiveSection(item.id);
                            }
                          }}
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
                <Plane size={20} />
                <span>Travel Studio</span>
              </button>
            </li>
          </ul>
        </nav>

        <div className="p-4 border-t border-gray-700 space-y-2">
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
            onClick={() => setActiveSection('travel-journal')}
            className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-left transition-colors ${
              activeSection === 'travel-journal'
                ? 'bg-gray-700 text-white'
                : 'text-gray-300 hover:text-white hover:bg-gray-700'
            }`}
          >
            <BookOpen size={20} />
            <span>Travel Journaal</span>
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
                {activeSection === 'dashboard' && 'Dashboard'}
                {activeSection === 'profile' && 'Profiel'}
                {activeSection === 'social-media' && 'Social Media'}
                {activeSection === 'testing' && 'Test Dashboard'}
                {activeSection === 'ai-content' && 'Travel Content Generator'}
                {activeSection === 'ai-import' && 'Reis Import'}
                {activeSection === 'ai-travelbro' && 'AI TravelBRO'}
                {activeSection === 'ai-video' && 'AI Travel Video'}
                {activeSection === 'roadmap' && 'Roadmap'}
                {activeSection === 'travel-journal' && 'Travel Journaal'}
              </h1>
              <p className="text-gray-600 mt-1">
                {activeSection === 'dashboard' && 'Welkom terug bij je agent dashboard'}
                {activeSection === 'profile' && 'Beheer je profiel en instellingen'}
                {activeSection === 'social-media' && 'Beheer je social media accounts en posts'}
                {activeSection === 'testing' && 'Test features and provide feedback'}
                {activeSection === 'ai-content' && 'Generate travel content with AI'}
                {activeSection === 'ai-import' && 'Import travel data with AI'}
                {activeSection === 'ai-travelbro' && 'Your AI travel assistant'}
                {activeSection === 'ai-video' && 'Create engaging travel videos with AI'}
                {activeSection === 'roadmap' && 'Vote on features and track development progress'}
                {activeSection === 'travel-journal' && 'Houd een dagboek bij van je reizen en deel je ervaringen'}
              </p>
            </div>
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
                      <h2 className="text-3xl font-bold mb-2">Hallo, {agentData?.first_name || 'Agent'}!</h2>
                      <p className="text-orange-100">Klaar om je klanten te helpen met hun droomreis?</p>
                    </div>
                  </div>

                  <div className="mb-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Snelkoppelingen</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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

                  {agentData && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                      <div className="bg-white rounded-xl p-6 shadow-md border border-gray-100">
                        <div className="flex items-center justify-between mb-4">
                          <h4 className="font-semibold text-gray-900">Profiel Status</h4>
                          <div className={`w-3 h-3 rounded-full ${agentData.profile_image_url ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
                        </div>
                        <div className="space-y-3">
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Profielfoto</span>
                            <span className="font-medium">{agentData.profile_image_url ? '✓' : '–'}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Bio</span>
                            <span className="font-medium">{agentData.bio ? '✓' : '–'}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Specialisaties</span>
                            <span className="font-medium">{agentData.specializations?.length > 0 ? '✓' : '–'}</span>
                          </div>
                        </div>
                      </div>

                      <div className="bg-white rounded-xl p-6 shadow-md border border-gray-100">
                        <h4 className="font-semibold text-gray-900 mb-4">Contact</h4>
                        <div className="space-y-3">
                          <div className="text-sm">
                            <span className="text-gray-600">Email</span>
                            <p className="font-medium text-gray-900 truncate">{agentData.contact_email || user?.email}</p>
                          </div>
                          {agentData.phone && (
                            <div className="text-sm">
                              <span className="text-gray-600">Telefoon</span>
                              <p className="font-medium text-gray-900">{agentData.phone}</p>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="bg-white rounded-xl p-6 shadow-md border border-gray-100">
                        <h4 className="font-semibold text-gray-900 mb-4">Reviews</h4>
                        <div className="text-center">
                          <div className="text-3xl font-bold text-gray-900 mb-1">
                            {agentData.average_rating ? agentData.average_rating.toFixed(1) : '–'}
                          </div>
                          <div className="text-sm text-gray-600">
                            {agentData.review_count || 0} reviews
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {activeSection === 'profile' && <AgentProfileEdit />}
          {activeSection === 'social-media' && <SocialMediaManager />}
          {activeSection === 'testing' && <TestDashboard />}
          {activeSection === 'ai-content' && <AIContentGenerator />}
          {activeSection === 'ai-travelbro' && <TravelBroSetup />}
          {activeSection === 'roadmap' && <RoadmapBoard />}
          {activeSection === 'travel-journal' && (
            <div className="p-6">
              <div className="max-w-6xl mx-auto">
                <div className="bg-white rounded-lg shadow-md p-6">
                  <h2 className="text-2xl font-bold text-gray-900 mb-4">Travel Journaal</h2>
                  <p className="text-gray-600">Coming soon: Houd een dagboek bij van je reizen en deel je ervaringen.</p>
                </div>
              </div>
            </div>
          )}
          {activeSection === 'ai-import' && (
            <div className="p-6">
              <div className="bg-white rounded-lg shadow-sm border p-8 text-center max-w-2xl mx-auto">
                <div className="w-16 h-16 mx-auto mb-4 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #ff7700, #ffaa44)' }}>
                  <FileImport className="w-8 h-8 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Reis Import</h2>
                <p className="text-gray-600 mb-6">Import en verwerk reisgegevens intelligent met AI</p>
                <button className="text-white px-6 py-3 rounded-lg font-medium transition-colors hover:bg-orange-700" style={{ backgroundColor: '#ff7700' }}>
                  Start Import Proces
                </button>
              </div>
            </div>
          )}
        </main>
      </div>
      <HelpBot />
    </div>
  );
}
