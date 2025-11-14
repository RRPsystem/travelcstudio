import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Clock,
  Users,
  Bot,
  Download,
  Filter,
  RefreshCw
} from 'lucide-react';
import { db } from '../../lib/supabase';

export function UsageMonitoring() {
  const [timeRange, setTimeRange] = useState('7d');
  const [loading, setLoading] = useState(true);
  const [apiSettings, setApiSettings] = useState<any[]>([]);

  useEffect(() => {
    loadUsageData();
  }, [timeRange]);

  const loadUsageData = async () => {
    try {
      setLoading(true);
      const data = await db.getAPISettings();
      setApiSettings(data || []);
    } catch (error) {
      console.error('Failed to load usage data:', error);
    } finally {
      setLoading(false);
    }
  };

  const totalCalls = apiSettings.reduce((sum, api) => sum + api.usage_count, 0);
  const totalCost = apiSettings.reduce((sum, api) => sum + Number(api.monthly_cost), 0);
  const activeAPIs = apiSettings.filter(api => api.is_active).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Usage Monitoring</h2>
          <p className="text-gray-600">Track API usage, costs, and performance metrics</p>
        </div>
        <div className="flex items-center space-x-3">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="24h">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
            <option value="90d">Last 90 Days</option>
          </select>
          <button
            onClick={loadUsageData}
            className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            <RefreshCw size={16} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total API Calls</p>
              <p className="text-2xl font-bold text-gray-900">{totalCalls.toLocaleString()}</p>
              <p className="text-xs text-gray-500 mt-1">All time</p>
            </div>
            <BarChart3 className="h-8 w-8 text-blue-600" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Cost</p>
              <p className="text-2xl font-bold text-gray-900">${totalCost.toFixed(2)}</p>
              <p className="text-xs text-gray-500 mt-1">This month</p>
            </div>
            <DollarSign className="h-8 w-8 text-green-600" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Active APIs</p>
              <p className="text-2xl font-bold text-gray-900">{activeAPIs}</p>
              <p className="text-xs text-gray-500 mt-1">Configured</p>
            </div>
            <Users className="h-8 w-8 text-purple-600" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Avg Response Time</p>
              <p className="text-2xl font-bold text-gray-900">-</p>
              <p className="text-xs text-gray-500 mt-1">No data yet</p>
            </div>
            <Clock className="h-8 w-8 text-orange-600" />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">API Usage Breakdown</h3>
          <p className="text-sm text-gray-600 mt-1">Current usage by API endpoint</p>
        </div>

        <div className="p-6">
          {apiSettings.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Bot className="w-12 h-12 mx-auto mb-3 text-gray-400" />
              <p>No API configurations yet</p>
              <p className="text-sm mt-1">Configure your APIs in API Settings</p>
            </div>
          ) : (
            <div className="space-y-4">
              {apiSettings.map((api, index) => {
                const percentage = totalCalls > 0 ? Math.round((api.usage_count / totalCalls) * 100) : 0;

                return (
                  <div key={index} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        <Bot className="w-5 h-5 text-gray-400" />
                        <div>
                          <div className="font-medium text-gray-900">{api.service_name}</div>
                          <div className="text-sm text-gray-500">
                            {api.usage_count.toLocaleString()} calls • ${Number(api.monthly_cost).toFixed(2)}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium text-gray-900">{percentage}%</div>
                        <div className={`text-xs ${api.is_active ? 'text-green-600' : 'text-gray-400'}`}>
                          {api.is_active ? 'Active' : 'Inactive'}
                        </div>
                      </div>
                    </div>

                    {totalCalls > 0 && (
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full"
                          style={{ width: `${percentage}%` }}
                        ></div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Cost Analysis</h3>
          <p className="text-sm text-gray-600 mt-1">Current month cost breakdown</p>
        </div>

        <div className="p-6 space-y-6">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">Current Month</span>
              <span className="text-sm font-medium text-gray-900">${totalCost.toFixed(2)}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div className="bg-blue-600 h-2 rounded-full" style={{ width: '0%' }}></div>
            </div>
            <div className="text-xs text-gray-500 mt-1">Configure budget limits in API Settings</div>
          </div>

          <div className="pt-4 border-t border-gray-200">
            <h4 className="font-medium text-gray-900 mb-3">Getting Started</h4>
            <ul className="space-y-2 text-sm text-gray-600">
              <li className="flex items-start space-x-2">
                <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                <span>Configure your API keys in API Settings to start tracking usage</span>
              </li>
              <li className="flex items-start space-x-2">
                <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                <span>Test your APIs to verify they are working correctly</span>
              </li>
              <li className="flex items-start space-x-2">
                <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                <span>Usage data will appear here as you make API calls</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}