import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../lib/supabase';
import { GPTManagement } from './GPTManagement';
import { UsageMonitoring } from './UsageMonitoring';
import { SystemHealth } from './SystemHealth';
import { UserActivity } from './UserActivity';
import { OAuthManagement } from './OAuthManagement';
import { APISettings } from './APISettings';
import { ChatbotManagement } from './ChatbotManagement';
import { MonitoringDashboard } from './MonitoringDashboard';
import { HelpBot } from '../shared/HelpBot';
import {
  Settings,
  Bot,
  BarChart3,
  Activity,
  Users,
  Key,
  Database,
  Globe,
  Zap,
  Shield,
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  Clock,
  Map,
  MessageCircle,
  Bell,
  ClipboardCheck
} from 'lucide-react';
import RoadmapManagement from './RoadmapManagement';
import TestManagement from './TestManagement';

export function OperatorDashboard() {
  const { user, signOut } = useAuth();
  const [activeSection, setActiveSection] = useState('overview');
  const [systemStats, setSystemStats] = useState({
    totalUsers: 0,
    activeChats: 0,
    apiCallsToday: 0,
    monthlyCost: 0
  });

  useEffect(() => {
    const loadSystemStats = async () => {
      try {
        const [users, brands] = await Promise.all([
          db.getUsers(),
          db.getBrands()
        ]);

        setSystemStats({
          totalUsers: users?.length || 0,
          activeChats: 0,
          apiCallsToday: 0,
          monthlyCost: 0
        });
      } catch (error) {
        console.error('Error loading stats:', error);
      }
    };

    if (activeSection === 'overview') {
      loadSystemStats();
    }
  }, [activeSection]);

  const sidebarItems = [
    { id: 'overview', label: 'System Overview', icon: BarChart3 },
    { id: 'test-management', label: 'Test Management', icon: ClipboardCheck },
    { id: 'monitoring', label: 'Monitoring & Alerts', icon: Bell },
    { id: 'api-settings', label: 'API Settings', icon: Key },
    { id: 'gpt-management', label: 'GPT Management', icon: Bot },
    { id: 'oauth-management', label: 'OAuth Apps', icon: Settings },
    { id: 'chatbot-management', label: 'Chatbot Logs', icon: MessageCircle },
    { id: 'usage-monitoring', label: 'Usage Monitoring', icon: TrendingUp },
    { id: 'user-activity', label: 'User Activity', icon: Users },
    { id: 'system-health', label: 'System Health', icon: Activity },
    { id: 'roadmap', label: 'Roadmap Management', icon: Map },
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
                {activeSection === 'overview' && 'System Overview'}
                {activeSection === 'test-management' && 'Test Management'}
                {activeSection === 'monitoring' && 'Monitoring & Alerts'}
                {activeSection === 'api-settings' && 'API Settings'}
                {activeSection === 'gpt-management' && 'GPT Management'}
                {activeSection === 'oauth-management' && 'OAuth App Management'}
                {activeSection === 'chatbot-management' && 'Chatbot Management'}
                {activeSection === 'usage-monitoring' && 'Usage Monitoring'}
                {activeSection === 'user-activity' && 'User Activity'}
                {activeSection === 'system-health' && 'System Health'}
                {activeSection === 'roadmap' && 'Roadmap Management'}
              </h1>
              <p className="text-gray-600 mt-1">
                {activeSection === 'overview' && 'Monitor system performance and key metrics'}
                {activeSection === 'test-management' && 'Manage testing rounds and review feedback from testers'}
                {activeSection === 'monitoring' && 'Real-time error tracking, alerts, and performance monitoring'}
                {activeSection === 'api-settings' && 'Configure API keys and external service credentials'}
                {activeSection === 'gpt-management' && 'Configure custom GPTs and content generation'}
                {activeSection === 'oauth-management' && 'Manage social media OAuth apps and credentials'}
                {activeSection === 'chatbot-management' && 'View helpbot conversations and improve responses'}
                {activeSection === 'usage-monitoring' && 'Track API usage and costs'}
                {activeSection === 'user-activity' && 'Monitor user behavior and activity logs'}
                {activeSection === 'system-health' && 'System status and performance monitoring'}
                {activeSection === 'roadmap' && 'Manage feature requests and development priorities'}
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
          {activeSection === 'overview' && (
            <div className="space-y-6">
              {/* Key Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white p-6 rounded-lg shadow-sm border">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Total Users</p>
                      <p className="text-2xl font-bold text-gray-900">{systemStats.totalUsers}</p>
                      <p className="text-xs text-gray-500 mt-1">Registered users</p>
                    </div>
                    <Users className="h-8 w-8 text-blue-600" />
                  </div>
                </div>

                <div className="bg-white p-6 rounded-lg shadow-sm border">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Active Chats</p>
                      <p className="text-2xl font-bold text-gray-900">{systemStats.activeChats}</p>
                      <p className="text-xs text-gray-500 mt-1">Real-time tracking</p>
                    </div>
                    <Bot className="h-8 w-8 text-green-600" />
                  </div>
                </div>

                <div className="bg-white p-6 rounded-lg shadow-sm border">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">API Calls Today</p>
                      <p className="text-2xl font-bold text-gray-900">{systemStats.apiCallsToday}</p>
                      <p className="text-xs text-gray-500 mt-1">Track API usage</p>
                    </div>
                    <Zap className="h-8 w-8 text-orange-600" />
                  </div>
                </div>

                <div className="bg-white p-6 rounded-lg shadow-sm border">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Monthly Cost</p>
                      <p className="text-2xl font-bold text-gray-900">${systemStats.monthlyCost.toFixed(2)}</p>
                      <p className="text-xs text-gray-500 mt-1">Current month</p>
                    </div>
                    <TrendingUp className="h-8 w-8 text-red-600" />
                  </div>
                </div>
              </div>

              {/* System Status */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-lg shadow-sm border p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <Activity className="mr-2" size={20} />
                    System Health
                  </h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">System Uptime</span>
                      <div className="flex items-center space-x-2">
                        <CheckCircle className="w-4 h-4 text-green-500" />
                        <span className="text-sm font-medium text-green-600">99.9%</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Average Response Time</span>
                      <div className="flex items-center space-x-2">
                        <CheckCircle className="w-4 h-4 text-green-500" />
                        <span className="text-sm font-medium text-green-600">&lt;100ms</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Supabase Status</span>
                      <div className="flex items-center space-x-2">
                        <CheckCircle className="w-4 h-4 text-green-500" />
                        <span className="text-sm font-medium text-green-600">Operational</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Edge Functions</span>
                      <div className="flex items-center space-x-2">
                        <CheckCircle className="w-4 h-4 text-green-500" />
                        <span className="text-sm font-medium text-green-600">Active</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow-sm border p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <Clock className="mr-2" size={20} />
                    Recent Activity
                  </h3>
                  <div className="space-y-3">
                    <div className="flex items-start space-x-3">
                      <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                      <div>
                        <p className="text-sm text-gray-900">System online</p>
                        <p className="text-xs text-gray-500">All services operational</p>
                      </div>
                    </div>
                    <div className="flex items-start space-x-3">
                      <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                      <div>
                        <p className="text-sm text-gray-900">Database connected</p>
                        <p className="text-xs text-gray-500">Supabase running smoothly</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="bg-white rounded-lg shadow-sm border p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <button 
                    onClick={() => setActiveSection('gpt-management')}
                    className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-center"
                  >
                    <Bot className="w-6 h-6 mx-auto mb-2 text-blue-600" />
                    <span className="text-sm font-medium">Manage GPTs</span>
                  </button>
                  <button 
                    onClick={() => setActiveSection('usage-monitoring')}
                    className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-center"
                  >
                    <BarChart3 className="w-6 h-6 mx-auto mb-2 text-orange-600" />
                    <span className="text-sm font-medium">View Usage</span>
                  </button>
                  <button 
                    onClick={() => setActiveSection('system-health')}
                    className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-center"
                  >
                    <Activity className="w-6 h-6 mx-auto mb-2 text-red-600" />
                    <span className="text-sm font-medium">System Health</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeSection === 'test-management' && <TestManagement />}
          {activeSection === 'monitoring' && <MonitoringDashboard />}
          {activeSection === 'api-settings' && <APISettings />}
          {activeSection === 'gpt-management' && <GPTManagement />}
          {activeSection === 'oauth-management' && <OAuthManagement />}
          {activeSection === 'chatbot-management' && <ChatbotManagement />}
          {activeSection === 'usage-monitoring' && <UsageMonitoring />}
          {activeSection === 'user-activity' && <UserActivity />}
          {activeSection === 'system-health' && <SystemHealth />}
          {activeSection === 'roadmap' && <RoadmapManagement />}
        </main>
      </div>
      <HelpBot />
    </div>
  );
}