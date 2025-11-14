import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { GPTManagement } from './GPTManagement';
import { UsageMonitoring } from './UsageMonitoring';
import { SystemHealth } from './SystemHealth';
import { UserActivity } from './UserActivity';
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
  Clock
} from 'lucide-react';

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
      setSystemStats({
        totalUsers: 0,
        activeChats: 0,
        apiCallsToday: 0,
        monthlyCost: 0
      });
    };

    if (activeSection === 'overview') {
      loadSystemStats();
    }
  }, [activeSection]);

  const sidebarItems = [
    { id: 'overview', label: 'System Overview', icon: BarChart3 },
    { id: 'gpt-management', label: 'GPT Management', icon: Bot },
    { id: 'usage-monitoring', label: 'Usage Monitoring', icon: TrendingUp },
    { id: 'user-activity', label: 'User Activity', icon: Users },
    { id: 'system-health', label: 'System Health', icon: Activity },
  ];

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <div className="w-64 bg-slate-900 text-white flex flex-col">
        <div className="p-4 border-b border-slate-700">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-red-600 rounded flex items-center justify-center">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="font-semibold">Operator Panel</div>
              <div className="text-xs text-slate-400">System Administrator</div>
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
                        ? 'bg-slate-700 text-white'
                        : 'text-slate-300 hover:text-white hover:bg-slate-800'
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

        <div className="p-4 border-t border-slate-700">
          <button
            onClick={signOut}
            className="w-full flex items-center space-x-3 px-3 py-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
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
                {activeSection === 'gpt-management' && 'GPT Management'}
                {activeSection === 'usage-monitoring' && 'Usage Monitoring'}
                {activeSection === 'user-activity' && 'User Activity'}
                {activeSection === 'system-health' && 'System Health'}
              </h1>
              <p className="text-gray-600 mt-1">
                {activeSection === 'overview' && 'Monitor system performance and key metrics'}
                {activeSection === 'gpt-management' && 'Configure custom GPTs and content generation'}
                {activeSection === 'usage-monitoring' && 'Track API usage and costs'}
                {activeSection === 'user-activity' && 'Monitor user behavior and activity logs'}
                {activeSection === 'system-health' && 'System status and performance monitoring'}
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
                      <p className="text-2xl font-bold text-gray-900">-</p>
                      <p className="text-xs text-gray-500 mt-1">No data yet</p>
                    </div>
                    <Users className="h-8 w-8 text-blue-600" />
                  </div>
                </div>

                <div className="bg-white p-6 rounded-lg shadow-sm border">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Active Chats</p>
                      <p className="text-2xl font-bold text-gray-900">-</p>
                      <p className="text-xs text-gray-500 mt-1">No sessions</p>
                    </div>
                    <Bot className="h-8 w-8 text-green-600" />
                  </div>
                </div>

                <div className="bg-white p-6 rounded-lg shadow-sm border">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">API Calls Today</p>
                      <p className="text-2xl font-bold text-gray-900">-</p>
                      <p className="text-xs text-gray-500 mt-1">Configure APIs</p>
                    </div>
                    <Zap className="h-8 w-8 text-orange-600" />
                  </div>
                </div>

                <div className="bg-white p-6 rounded-lg shadow-sm border">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Monthly Cost</p>
                      <p className="text-2xl font-bold text-gray-900">$0.00</p>
                      <p className="text-xs text-gray-500 mt-1">No usage yet</p>
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
                        <span className="text-sm font-medium text-green-600">-</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Average Response Time</span>
                      <div className="flex items-center space-x-2">
                        <CheckCircle className="w-4 h-4 text-green-500" />
                        <span className="text-sm font-medium text-green-600">-</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">OpenAI API Status</span>
                      <div className="flex items-center space-x-2">
                        <CheckCircle className="w-4 h-4 text-green-500" />
                        <span className="text-sm font-medium text-green-600">Operational</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Google APIs Status</span>
                      <div className="flex items-center space-x-2">
                        <AlertTriangle className="w-4 h-4 text-yellow-500" />
                        <span className="text-sm font-medium text-yellow-600">Limited</span>
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
                        <p className="text-sm text-gray-900">System initialized</p>
                        <p className="text-xs text-gray-500">Configure APIs to see activity</p>
                      </div>
                    </div>
                    <div className="flex items-start space-x-3">
                      <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                      <div>
                        <p className="text-sm text-gray-900">Waiting for real data</p>
                        <p className="text-xs text-gray-500">Connect APIs for live metrics</p>
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

          {activeSection === 'gpt-management' && <GPTManagement />}
          {activeSection === 'usage-monitoring' && <UsageMonitoring />}
          {activeSection === 'user-activity' && <UserActivity />}
          {activeSection === 'system-health' && <SystemHealth />}
        </main>
      </div>
    </div>
  );
}