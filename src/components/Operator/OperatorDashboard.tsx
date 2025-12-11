import React, { useState } from 'react';
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
  Mic,
  Users
} from 'lucide-react';
import RoadmapManagement from './RoadmapManagement';
import TestManagement from './TestManagement';
import TemplateManager from './TemplateManager';
import ExternalBuilderManager from './ExternalBuilderManager';
import QuickStartManager from './QuickStartManager';
import { WordPressDownloads } from './WordPressDownloads';
import PodcastManagement from '../Podcast/PodcastManagement';
import TravelJournal from '../TravelJournal/TravelJournal';

export function OperatorDashboard() {
  const { user, signOut } = useAuth();
  const [activeSection, setActiveSection] = useState('test-management');

  const sidebarItems = [
    { id: 'user-management', label: 'Gebruikersbeheer', icon: Users },
    { id: 'podcast-management', label: 'Podcast Management', icon: Mic },
    { id: 'test-management', label: 'Test Management', icon: ClipboardCheck },
    { id: 'external-builders', label: 'External Builders', icon: Puzzle },
    { id: 'quickstart', label: 'Windsurf Templates', icon: Zap },
    { id: 'templates', label: 'WordPress Templates', icon: Layout },
    { id: 'wordpress-downloads', label: 'WordPress Downloads', icon: Download },
    { id: 'roadmap', label: 'Roadmap Management', icon: Map },
    { id: 'monitoring', label: 'Monitoring & Alerts', icon: Bell },
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
                {activeSection === 'podcast-management' && 'Podcast Management'}
                {activeSection === 'test-management' && 'Test Management'}
                {activeSection === 'external-builders' && 'External Builders'}
                {activeSection === 'quickstart' && 'Windsurf Templates'}
                {activeSection === 'templates' && 'WordPress Templates'}
                {activeSection === 'wordpress-downloads' && 'WordPress Downloads'}
                {activeSection === 'roadmap' && 'Roadmap Management'}
                {activeSection === 'monitoring' && 'Monitoring & Alerts'}
                {activeSection === 'system-health' && 'System Health'}
                {activeSection === 'api-settings' && 'API Settings'}
                {activeSection === 'gpt-management' && 'GPT Management'}
                {activeSection === 'oauth-management' && 'OAuth App Management'}
                {activeSection === 'chatbot-management' && 'Chatbot Management'}
                {activeSection === 'travel-journal' && 'Travel Journaal'}
              </h1>
              <p className="text-gray-600 mt-1">
                {activeSection === 'user-management' && 'Beheer gebruikers en hun rechten'}
                {activeSection === 'podcast-management' && 'Plan episodes, beheer vragen en werk samen met hosts'}
                {activeSection === 'test-management' && 'Manage testing rounds and review feedback from testers'}
                {activeSection === 'external-builders' && 'Register and manage external template builders (Windsurf, AI Website Studio)'}
                {activeSection === 'quickstart' && 'Configure Windsurf template packages for brands'}
                {activeSection === 'templates' && 'Manage WordPress templates for brands'}
                {activeSection === 'wordpress-downloads' && 'Download WordPress plugins en integraties'}
                {activeSection === 'roadmap' && 'Manage feature requests and development priorities'}
                {activeSection === 'monitoring' && 'Real-time error tracking, alerts, and performance monitoring'}
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
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto">
          {activeSection === 'user-management' && <div className="p-6"><UserManagement /></div>}
          {activeSection === 'podcast-management' && <PodcastManagement />}
          {activeSection === 'test-management' && <div className="p-6"><TestManagement /></div>}
          {activeSection === 'external-builders' && <div className="p-6"><ExternalBuilderManager /></div>}
          {activeSection === 'quickstart' && <div className="p-6"><QuickStartManager /></div>}
          {activeSection === 'templates' && <div className="p-6"><TemplateManager /></div>}
          {activeSection === 'wordpress-downloads' && <div className="p-6"><WordPressDownloads /></div>}
          {activeSection === 'roadmap' && <div className="p-6"><RoadmapManagement /></div>}
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