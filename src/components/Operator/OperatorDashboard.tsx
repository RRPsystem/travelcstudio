import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { GPTManagement } from './GPTManagement';
import { SystemHealth } from './SystemHealth';
import { OAuthManagement } from './OAuthManagement';
import { APISettings } from './APISettings';
import { ChatbotManagement } from './ChatbotManagement';
import { MonitoringDashboard } from './MonitoringDashboard';
import { UserManagement } from './UserManagement';
import { HelpBot } from '../shared/HelpBot';
import {
  Settings,
  Bot,
  Activity,
  Key,
  Shield,
  Map,
  MessageCircle,
  Bell,
  ClipboardCheck,
  BookOpen,
  Layout,
  Puzzle,
  Zap,
  Download,
  Users,
  User,
  ChevronDown,
  Building2,
  UserCircle,
  Wrench,
  Database,
  Wallet
} from 'lucide-react';
import RoadmapManagement from './RoadmapManagement';
import TestManagement from './TestManagement';
import TemplateManager from './TemplateManager';
import ExternalBuilderManager from './ExternalBuilderManager';
import QuickStartManager from './QuickStartManager';
import { WordPressDownloads } from './WordPressDownloads';
import TravelJournal from '../TravelJournal/TravelJournal';
import DatabasePerformanceMonitor from './DatabasePerformanceMonitor';
import { BrandManagement } from './BrandManagement';
import CreditSystemManagement from './CreditSystemManagement';

export function OperatorDashboard() {
  const { user, signOut, impersonationContext, availableContexts, switchContext, resetContext } = useAuth();
  const [activeSection, setActiveSection] = useState('test-management');
  const [showContextMenu, setShowContextMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowContextMenu(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const sidebarItems = [
    { id: 'user-management', label: 'Gebruikersbeheer', icon: Users },
    { id: 'brand-management', label: 'Brand Management', icon: Building2 },
    { id: 'credit-system', label: 'Credit Systeem', icon: Wallet },
    { id: 'test-management', label: 'Test Management', icon: ClipboardCheck },
    { id: 'external-builders', label: 'External Builders', icon: Puzzle },
    { id: 'quickstart', label: 'Windsurf Templates', icon: Zap },
    { id: 'templates', label: 'WordPress Templates', icon: Layout },
    { id: 'wordpress-downloads', label: 'WordPress Downloads', icon: Download },
    { id: 'roadmap', label: 'Roadmap Management', icon: Map },
    { id: 'db-performance', label: 'DB Capaciteit (400 users)', icon: Database },
    { id: 'monitoring', label: 'Error Monitoring', icon: Bell },
    { id: 'system-health', label: 'System Health', icon: Activity },
    { id: 'api-settings', label: 'API Settings', icon: Key },
    { id: 'gpt-management', label: 'GPT Management', icon: Bot },
    { id: 'oauth-management', label: 'OAuth Apps', icon: Settings },
    { id: 'chatbot-management', label: 'Chatbot Logs', icon: MessageCircle },
  ];

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <div className="w-64 bg-gray-800 text-white flex flex-col">
        <div className="p-4 border-b border-gray-700">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-orange-600 rounded flex items-center justify-center" style={{ backgroundColor: '#ff7700' }}>
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="font-semibold">Operator Panel</div>
              <div className="text-xs text-gray-400">System Administrator</div>
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
          </ul>
        </nav>

        <div className="p-4 border-t border-gray-700 space-y-2">
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

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {activeSection === 'user-management' && 'Gebruikersbeheer'}
                {activeSection === 'brand-management' && 'Brand Management'}
                {activeSection === 'credit-system' && 'Credit Systeem Beheer'}
                {activeSection === 'test-management' && 'Test Management'}
                {activeSection === 'external-builders' && 'External Builders'}
                {activeSection === 'quickstart' && 'Windsurf Templates'}
                {activeSection === 'templates' && 'WordPress Templates'}
                {activeSection === 'wordpress-downloads' && 'WordPress Downloads'}
                {activeSection === 'roadmap' && 'Roadmap Management'}
                {activeSection === 'db-performance' && 'Database Capaciteit (400 users)'}
                {activeSection === 'monitoring' && 'Error Monitoring'}
                {activeSection === 'system-health' && 'System Health'}
                {activeSection === 'api-settings' && 'API Settings'}
                {activeSection === 'gpt-management' && 'GPT Management'}
                {activeSection === 'oauth-management' && 'OAuth App Management'}
                {activeSection === 'chatbot-management' && 'Chatbot Management'}
                {activeSection === 'travel-journal' && 'Travel Journaal'}
              </h1>
              <p className="text-gray-600 mt-1">
                {activeSection === 'user-management' && 'Beheer gebruikers en hun rechten'}
                {activeSection === 'brand-management' && 'Beheer brands en hun website types'}
                {activeSection === 'credit-system' && 'Beheer credit prijzen, Mollie integratie en systeem instellingen'}
                {activeSection === 'test-management' && 'Manage testing rounds and review feedback from testers'}
                {activeSection === 'external-builders' && 'Register and manage external template builders (Windsurf, AI Website Studio)'}
                {activeSection === 'quickstart' && 'Configure Windsurf template packages for brands'}
                {activeSection === 'templates' && 'Manage WordPress templates for brands'}
                {activeSection === 'wordpress-downloads' && 'Download WordPress plugins en integraties'}
                {activeSection === 'roadmap' && 'Manage feature requests and development priorities'}
                {activeSection === 'db-performance' && 'Database connections, queries, locks & capacity voor 400+ concurrent users'}
                {activeSection === 'monitoring' && 'Application errors, alerts en frontend performance tracking'}
                {activeSection === 'system-health' && 'Real-time browser metrics and service status'}
                {activeSection === 'api-settings' && 'Configure API keys and external service credentials'}
                {activeSection === 'gpt-management' && 'Configure custom GPTs and content generation'}
                {activeSection === 'oauth-management' && 'Manage social media OAuth apps and credentials'}
                {activeSection === 'chatbot-management' && 'View helpbot conversations and improve responses'}
                {activeSection === 'travel-journal' && 'Houd een dagboek bij van je reizen en deel je ervaringen'}
              </p>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-sm text-gray-600">System Online</span>
              </div>
              <div className="text-sm text-gray-500">
                Last updated: {new Date().toLocaleTimeString()}
              </div>

              <div className="relative pl-3 border-l border-gray-200" ref={menuRef}>
                <button
                  onClick={() => setShowContextMenu(!showContextMenu)}
                  className="flex items-center space-x-3 hover:bg-gray-50 rounded-lg px-3 py-2 transition-colors"
                >
                  <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                    {user?.avatar ? (
                      <img src={user.avatar} alt={user.email} className="w-8 h-8 rounded-full" />
                    ) : (
                      <User size={16} className="text-white" />
                    )}
                  </div>
                  <div className="text-sm text-left">
                    <div className="font-medium text-gray-900">
                      {impersonationContext ?
                        (impersonationContext.role === 'operator' ? '⚙️ Operator View' :
                         impersonationContext.role === 'admin' ? '🛡️ Admin View' :
                         impersonationContext.role === 'brand' ? `🏢 ${impersonationContext.brandName}` :
                         `👤 ${impersonationContext.agentName}`)
                        : user?.email || 'User'
                      }
                    </div>
                    {impersonationContext && (
                      <div className="text-xs text-gray-500">{user?.email}</div>
                    )}
                  </div>
                  <ChevronDown size={16} className="text-gray-500" />
                </button>

                {showContextMenu && (
                  <div className="absolute right-0 mt-2 w-72 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50 max-h-96 overflow-y-auto">
                    <div className="px-4 py-2 border-b border-gray-200">
                      <div className="text-xs font-semibold text-gray-500 uppercase">Switch Context</div>
                    </div>

                    {availableContexts.length === 0 ? (
                      <div className="px-4 py-3 text-sm text-gray-500">Loading...</div>
                    ) : (
                      <>
                        <div className="px-2 py-1">
                          <div className="text-xs font-semibold text-gray-500 uppercase px-2 py-1">System</div>
                          {availableContexts.filter(ctx => ctx.type === 'operator' || ctx.type === 'admin').map((ctx) => (
                            <button
                              key={ctx.type}
                              onClick={() => {
                                if (ctx.type === 'operator') {
                                  resetContext();
                                } else {
                                  switchContext({ role: ctx.type as any });
                                }
                                setShowContextMenu(false);
                              }}
                              className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors ${
                                (ctx.type === 'operator' && !impersonationContext) || impersonationContext?.role === ctx.type ? 'bg-blue-50 text-blue-700' : 'text-gray-700'
                              }`}
                            >
                              {ctx.type === 'operator' ? <Wrench size={16} /> : <Shield size={16} />}
                              <span className="text-sm font-medium">{ctx.name}</span>
                            </button>
                          ))}
                        </div>

                        {availableContexts.filter(ctx => ctx.type === 'brand').length > 0 && (
                          <div className="px-2 py-1 border-t border-gray-100">
                            <div className="text-xs font-semibold text-gray-500 uppercase px-2 py-1">Brands</div>
                            {availableContexts.filter(ctx => ctx.type === 'brand').map((ctx) => (
                              <button
                                key={ctx.id}
                                onClick={() => {
                                  switchContext({
                                    role: 'brand',
                                    brandId: ctx.brandId,
                                    brandName: ctx.name
                                  });
                                  setShowContextMenu(false);
                                }}
                                className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors ${
                                  impersonationContext?.brandId === ctx.id ? 'bg-blue-50 text-blue-700' : 'text-gray-700'
                                }`}
                              >
                                <Building2 size={16} />
                                <span className="text-sm">{ctx.name}</span>
                              </button>
                            ))}
                          </div>
                        )}

                        {availableContexts.filter(ctx => ctx.type === 'agent').length > 0 && (
                          <div className="px-2 py-1 border-t border-gray-100">
                            <div className="text-xs font-semibold text-gray-500 uppercase px-2 py-1">Agents</div>
                            {availableContexts.filter(ctx => ctx.type === 'agent').map((ctx) => (
                              <button
                                key={ctx.id}
                                onClick={() => {
                                  switchContext({
                                    role: 'agent',
                                    agentId: ctx.id,
                                    agentName: ctx.name,
                                    brandId: ctx.brandId
                                  });
                                  setShowContextMenu(false);
                                }}
                                className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors ${
                                  impersonationContext?.agentId === ctx.id ? 'bg-blue-50 text-blue-700' : 'text-gray-700'
                                }`}
                              >
                                <UserCircle size={16} />
                                <span className="text-sm">{ctx.name}</span>
                              </button>
                            ))}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto">
          {activeSection === 'user-management' && <div className="p-6"><UserManagement /></div>}
          {activeSection === 'brand-management' && <div className="p-6"><BrandManagement /></div>}
          {activeSection === 'credit-system' && <div className="p-6"><CreditSystemManagement /></div>}
          {activeSection === 'test-management' && <div className="p-6"><TestManagement /></div>}
          {activeSection === 'external-builders' && <div className="p-6"><ExternalBuilderManager /></div>}
          {activeSection === 'quickstart' && <div className="p-6"><QuickStartManager /></div>}
          {activeSection === 'templates' && <div className="p-6"><TemplateManager /></div>}
          {activeSection === 'wordpress-downloads' && <div className="p-6"><WordPressDownloads /></div>}
          {activeSection === 'roadmap' && <div className="p-6"><RoadmapManagement /></div>}
          {activeSection === 'db-performance' && <div className="p-6"><DatabasePerformanceMonitor /></div>}
          {activeSection === 'monitoring' && <div className="p-6"><MonitoringDashboard /></div>}
          {activeSection === 'system-health' && <div className="p-6"><SystemHealth /></div>}
          {activeSection === 'api-settings' && <div className="p-6"><APISettings /></div>}
          {activeSection === 'gpt-management' && <div className="p-6"><GPTManagement /></div>}
          {activeSection === 'oauth-management' && <div className="p-6"><OAuthManagement /></div>}
          {activeSection === 'chatbot-management' && <div className="p-6"><ChatbotManagement /></div>}
          {activeSection === 'travel-journal' && <TravelJournal />}
        </main>
      </div>
      <HelpBot />
    </div>
  );
}