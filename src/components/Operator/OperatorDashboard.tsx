import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { GPTManagement } from './GPTManagement';
import { SystemHealth } from './SystemHealth';
import { OAuthManagement } from './OAuthManagement';
import { APISettings } from './APISettings';
import { ChatbotManagement } from './ChatbotManagement';
import { MonitoringDashboard } from './MonitoringDashboard';
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
  Layout
} from 'lucide-react';
import RoadmapManagement from './RoadmapManagement';
import TestManagement from './TestManagement';
import WordPressTemplateManager from './WordPressTemplateManager';

export function OperatorDashboard() {
  const { user, signOut } = useAuth();
  const [activeSection, setActiveSection] = useState('test-management');

  const sidebarItems = [
    { id: 'test-management', label: 'Test Management', icon: ClipboardCheck },
    { id: 'wordpress-templates', label: 'WordPress Templates', icon: Layout },
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
                {activeSection === 'test-management' && 'Test Management'}
                {activeSection === 'wordpress-templates' && 'WordPress Templates'}
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
                {activeSection === 'test-management' && 'Manage testing rounds and review feedback from testers'}
                {activeSection === 'wordpress-templates' && 'Manage WordPress templates available to brands'}
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
        <main className="flex-1 p-6 overflow-y-auto">
          {activeSection === 'test-management' && <TestManagement />}
          {activeSection === 'wordpress-templates' && <WordPressTemplateManager />}
          {activeSection === 'roadmap' && <RoadmapManagement />}
          {activeSection === 'monitoring' && <MonitoringDashboard />}
          {activeSection === 'system-health' && <SystemHealth />}
          {activeSection === 'api-settings' && <APISettings />}
          {activeSection === 'gpt-management' && <GPTManagement />}
          {activeSection === 'oauth-management' && <OAuthManagement />}
          {activeSection === 'chatbot-management' && <ChatbotManagement />}
          {activeSection === 'travel-journal' && (
            <div className="max-w-6xl mx-auto">
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Travel Journaal</h2>
                <p className="text-gray-600">Coming soon: Houd een dagboek bij van je reizen en deel je ervaringen.</p>
              </div>
            </div>
          )}
        </main>
      </div>
      <HelpBot />
    </div>
  );
}