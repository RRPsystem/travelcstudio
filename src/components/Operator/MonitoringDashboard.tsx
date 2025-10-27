import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import {
  AlertTriangle,
  CheckCircle,
  XCircle,
  TrendingUp,
  TrendingDown,
  Activity,
  DollarSign,
  Zap,
  Clock,
  RefreshCw,
  Bell,
  BellOff,
  CheckCheck,
  BarChart3,
} from 'lucide-react';

interface SystemAlert {
  id: string;
  alert_type: string;
  severity: 'critical' | 'warning' | 'info';
  title: string;
  description: string;
  threshold_value: number | null;
  current_value: number | null;
  acknowledged: boolean;
  resolved: boolean;
  created_at: string;
}

interface ErrorSummary {
  total: number;
  critical: number;
  errors: number;
  warnings: number;
  unresolved: number;
  last24h: number;
}

interface ApiCostSummary {
  total_cost_today: number;
  total_cost_month: number;
  openai_calls_today: number;
  google_calls_today: number;
  avg_response_time: number;
}

interface APIStatus {
  id: string;
  provider: string;
  service_name: string;
  is_active: boolean;
  test_status: string;
  last_tested: string | null;
  usage_count: number;
  usage_limit: number | null;
  monthly_cost: number;
}

interface MetricData {
  name: string;
  current: number;
  change: number;
  trend: 'up' | 'down' | 'stable';
  unit: string;
}

export function MonitoringDashboard() {
  const [alerts, setAlerts] = useState<SystemAlert[]>([]);
  const [errorSummary, setErrorSummary] = useState<ErrorSummary | null>(null);
  const [apiCosts, setApiCosts] = useState<ApiCostSummary | null>(null);
  const [metrics, setMetrics] = useState<MetricData[]>([]);
  const [apiStatuses, setApiStatuses] = useState<APIStatus[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  useEffect(() => {
    loadMonitoringData();
    const interval = setInterval(loadMonitoringData, 60000);
    return () => clearInterval(interval);
  }, []);

  const loadMonitoringData = async () => {
    await Promise.all([
      loadAlerts(),
      loadErrorSummary(),
      loadApiCosts(),
      loadMetrics(),
      loadApiStatuses(),
    ]);
    setLastRefresh(new Date());
  };

  const loadApiStatuses = async () => {
    const { data, error } = await supabase
      .from('api_settings')
      .select('id, provider, service_name, is_active, test_status, last_tested, usage_count, usage_limit, monthly_cost')
      .order('provider');

    if (!error && data) {
      setApiStatuses(data);
    }
  };

  const loadAlerts = async () => {
    const { data, error } = await supabase
      .from('system_alerts')
      .select('*')
      .eq('resolved', false)
      .order('created_at', { ascending: false })
      .limit(10);

    if (!error && data) {
      setAlerts(data);
    }
  };

  const loadErrorSummary = async () => {
    const { data: errors } = await supabase
      .from('system_errors')
      .select('severity, resolved, created_at');

    if (errors) {
      const now = new Date();
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      const summary: ErrorSummary = {
        total: errors.length,
        critical: errors.filter(e => e.severity === 'critical').length,
        errors: errors.filter(e => e.severity === 'error').length,
        warnings: errors.filter(e => e.severity === 'warning').length,
        unresolved: errors.filter(e => !e.resolved).length,
        last24h: errors.filter(e => new Date(e.created_at) > yesterday).length,
      };

      setErrorSummary(summary);
    }
  };

  const loadApiCosts = async () => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const { data: logs } = await supabase
      .from('api_usage_logs')
      .select('api_name, cost_estimate, response_time_ms, created_at');

    if (logs) {
      const todayLogs = logs.filter(l => new Date(l.created_at) >= today);
      const monthLogs = logs.filter(l => new Date(l.created_at) >= monthStart);

      const costs: ApiCostSummary = {
        total_cost_today: todayLogs.reduce((sum, l) => sum + (l.cost_estimate || 0), 0),
        total_cost_month: monthLogs.reduce((sum, l) => sum + (l.cost_estimate || 0), 0),
        openai_calls_today: todayLogs.filter(l => l.api_name === 'OpenAI').length,
        google_calls_today: todayLogs.filter(l => l.api_name?.includes('Google')).length,
        avg_response_time: todayLogs.length > 0
          ? todayLogs.reduce((sum, l) => sum + (l.response_time_ms || 0), 0) / todayLogs.length
          : 0,
      };

      setApiCosts(costs);
    }
  };

  const loadMetrics = async () => {
    const { data: recentMetrics } = await supabase
      .from('system_metrics')
      .select('metric_name, metric_value, metric_unit, recorded_at')
      .order('recorded_at', { ascending: false })
      .limit(100);

    if (recentMetrics) {
      const metricGroups = new Map<string, typeof recentMetrics>();
      recentMetrics.forEach(m => {
        if (!metricGroups.has(m.metric_name)) {
          metricGroups.set(m.metric_name, []);
        }
        metricGroups.get(m.metric_name)!.push(m);
      });

      const processedMetrics: MetricData[] = [];
      metricGroups.forEach((values, name) => {
        if (values.length >= 2) {
          const current = values[0].metric_value;
          const previous = values[1].metric_value;
          const change = ((current - previous) / previous) * 100;

          processedMetrics.push({
            name,
            current,
            change,
            trend: change > 5 ? 'up' : change < -5 ? 'down' : 'stable',
            unit: values[0].metric_unit,
          });
        }
      });

      setMetrics(processedMetrics);
    }
  };

  const acknowledgeAlert = async (alertId: string) => {
    const { data: session } = await supabase.auth.getSession();

    await supabase
      .from('system_alerts')
      .update({
        acknowledged: true,
        acknowledged_by: session?.session?.user?.id,
        acknowledged_at: new Date().toISOString(),
      })
      .eq('id', alertId);

    loadAlerts();
  };

  const resolveAlert = async (alertId: string) => {
    const { data: session } = await supabase.auth.getSession();

    await supabase
      .from('system_alerts')
      .update({
        resolved: true,
        resolved_by: session?.session?.user?.id,
        resolved_at: new Date().toISOString(),
      })
      .eq('id', alertId);

    loadAlerts();
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadMonitoringData();
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'warning':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'info':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const criticalAlerts = alerts.filter(a => a.severity === 'critical').length;
  const unacknowledgedAlerts = alerts.filter(a => !a.acknowledged).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">System Monitoring & Alerts</h2>
          <p className="text-gray-600">Real-time monitoring, error tracking, and performance metrics</p>
        </div>
        <div className="flex items-center space-x-3">
          <span className="text-sm text-gray-500">
            Last updated: {lastRefresh.toLocaleTimeString()}
          </span>
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
          >
            <RefreshCw size={16} className={isRefreshing ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Active Alerts</p>
              <p className="text-2xl font-bold text-gray-900">{alerts.length}</p>
              <p className="text-xs text-red-600 mt-1">{criticalAlerts} critical</p>
            </div>
            <Bell className={`h-8 w-8 ${criticalAlerts > 0 ? 'text-red-600 animate-pulse' : 'text-gray-400'}`} />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Errors (24h)</p>
              <p className="text-2xl font-bold text-gray-900">{errorSummary?.last24h || 0}</p>
              <p className="text-xs text-gray-500 mt-1">{errorSummary?.unresolved || 0} unresolved</p>
            </div>
            <AlertTriangle className="h-8 w-8 text-yellow-600" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">API Cost Today</p>
              <p className="text-2xl font-bold text-gray-900">${apiCosts?.total_cost_today.toFixed(2) || '0.00'}</p>
              <p className="text-xs text-gray-500 mt-1">MTD: ${apiCosts?.total_cost_month.toFixed(2) || '0.00'}</p>
            </div>
            <DollarSign className="h-8 w-8 text-green-600" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Avg Response Time</p>
              <p className="text-2xl font-bold text-gray-900">{Math.round(apiCosts?.avg_response_time || 0)}ms</p>
              <p className="text-xs text-gray-500 mt-1">API latency</p>
            </div>
            <Clock className="h-8 w-8 text-blue-600" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <Bell className="mr-2" size={20} />
              Active Alerts
              {unacknowledgedAlerts > 0 && (
                <span className="ml-2 px-2 py-1 text-xs bg-red-100 text-red-800 rounded-full">
                  {unacknowledgedAlerts} new
                </span>
              )}
            </h3>
          </div>
          <div className="divide-y divide-gray-200 max-h-96 overflow-y-auto">
            {alerts.length === 0 ? (
              <div className="p-6 text-center text-gray-500">
                <CheckCircle className="w-12 h-12 mx-auto mb-2 text-green-500" />
                <p>No active alerts</p>
                <p className="text-sm">System is running smoothly</p>
              </div>
            ) : (
              alerts.map(alert => (
                <div key={alert.id} className={`p-4 ${!alert.acknowledged ? 'bg-gray-50' : ''}`}>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <span className={`px-2 py-1 text-xs rounded-full border ${getSeverityColor(alert.severity)}`}>
                          {alert.severity}
                        </span>
                        <span className="text-xs text-gray-500">
                          {new Date(alert.created_at).toLocaleString()}
                        </span>
                      </div>
                      <h4 className="font-medium text-gray-900">{alert.title}</h4>
                      <p className="text-sm text-gray-600 mt-1">{alert.description}</p>
                      {alert.threshold_value && (
                        <p className="text-xs text-gray-500 mt-1">
                          Threshold: {alert.threshold_value} | Current: {alert.current_value}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col space-y-2 ml-4">
                      {!alert.acknowledged && (
                        <button
                          onClick={() => acknowledgeAlert(alert.id)}
                          className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded"
                          title="Acknowledge"
                        >
                          <BellOff size={16} />
                        </button>
                      )}
                      <button
                        onClick={() => resolveAlert(alert.id)}
                        className="p-2 text-gray-600 hover:text-green-600 hover:bg-green-50 rounded"
                        title="Resolve"
                      >
                        <CheckCheck size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <AlertTriangle className="mr-2" size={20} />
              Error Summary
            </h3>
          </div>
          <div className="p-6">
            {errorSummary && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-600">Total Errors</p>
                    <p className="text-2xl font-bold text-gray-900">{errorSummary.total}</p>
                  </div>
                  <div className="p-4 bg-red-50 rounded-lg">
                    <p className="text-sm text-red-600">Critical</p>
                    <p className="text-2xl font-bold text-red-900">{errorSummary.critical}</p>
                  </div>
                  <div className="p-4 bg-yellow-50 rounded-lg">
                    <p className="text-sm text-yellow-600">Errors</p>
                    <p className="text-2xl font-bold text-yellow-900">{errorSummary.errors}</p>
                  </div>
                  <div className="p-4 bg-orange-50 rounded-lg">
                    <p className="text-sm text-orange-600">Warnings</p>
                    <p className="text-2xl font-bold text-orange-900">{errorSummary.warnings}</p>
                  </div>
                </div>

                <div className="pt-4 border-t border-gray-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-600">Last 24 Hours</span>
                    <span className="text-lg font-bold text-gray-900">{errorSummary.last24h}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Unresolved</span>
                    <span className="text-lg font-bold text-red-600">{errorSummary.unresolved}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <DollarSign className="mr-2" size={20} />
            API Usage & Costs
          </h3>
        </div>
        <div className="p-6">
          <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-green-50 border border-blue-200 rounded-lg">
            <h4 className="font-semibold text-gray-900 mb-4 flex items-center">
              <Zap className="mr-2" size={18} />
              API Status Overview
            </h4>
            <div className="space-y-3">
              {apiStatuses.length === 0 ? (
                <div className="text-center text-gray-500 py-4">
                  <p>Geen API configuraties gevonden</p>
                </div>
              ) : (
                apiStatuses.map((api) => (
                  <div key={api.id} className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg hover:shadow-sm transition-shadow">
                    <div className="flex items-center space-x-3 flex-1">
                      {api.test_status === 'success' ? (
                        <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                      ) : api.test_status === 'failed' ? (
                        <XCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                      ) : (
                        <AlertTriangle className="w-5 h-5 text-gray-400 flex-shrink-0" />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-gray-900 truncate">{api.service_name}</p>
                        <p className="text-xs text-gray-500">{api.provider}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4 text-sm">
                      <div className="text-right">
                        <p className="text-xs text-gray-500">Status</p>
                        <p className="font-medium">{api.is_active ? '🟢' : '🔴'}</p>
                      </div>
                      <div className="text-right min-w-[60px]">
                        <p className="text-xs text-gray-500">Gebruik</p>
                        <p className="font-medium">{api.usage_count || 0}</p>
                      </div>
                      <div className="text-right min-w-[70px]">
                        <p className="text-xs text-gray-500">Kosten/mnd</p>
                        <p className="font-medium text-green-600">${(api.monthly_cost || 0).toFixed(2)}</p>
                      </div>
                    </div>
                  </div>
                ))
              )}
              <div className="pt-3 border-t border-gray-300 flex justify-between items-center px-3">
                <span className="font-semibold text-gray-900">Totale Maandelijkse Kosten</span>
                <span className="font-bold text-green-600 text-xl">
                  ${apiStatuses.reduce((sum, api) => sum + (api.monthly_cost || 0), 0).toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-4 border border-gray-200 rounded-lg">
              <p className="text-sm text-gray-600 mb-2">OpenAI Calls Today</p>
              <p className="text-2xl font-bold text-gray-900">{apiCosts?.openai_calls_today || 0}</p>
              <p className="text-xs text-gray-500 mt-1">Average: {Math.round((apiCosts?.openai_calls_today || 0) / 24)}/hour</p>
            </div>
            <div className="p-4 border border-gray-200 rounded-lg">
              <p className="text-sm text-gray-600 mb-2">Google API Calls</p>
              <p className="text-2xl font-bold text-gray-900">{apiCosts?.google_calls_today || 0}</p>
              <p className="text-xs text-gray-500 mt-1">Maps + Search combined</p>
            </div>
            <div className="p-4 border border-gray-200 rounded-lg">
              <p className="text-sm text-gray-600 mb-2">Monthly Cost Trend</p>
              <p className="text-2xl font-bold text-gray-900">${apiCosts?.total_cost_month.toFixed(2) || '0.00'}</p>
              <p className="text-xs text-gray-500 mt-1">Projected: ${((apiCosts?.total_cost_month || 0) / new Date().getDate() * 30).toFixed(2)}</p>
            </div>
          </div>
        </div>
      </div>

      {metrics.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <BarChart3 className="mr-2" size={20} />
              Performance Metrics
            </h3>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {metrics.map((metric, index) => (
                <div key={index} className="p-4 border border-gray-200 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-600">{metric.name}</span>
                    {metric.trend === 'up' && <TrendingUp className="w-4 h-4 text-red-600" />}
                    {metric.trend === 'down' && <TrendingDown className="w-4 h-4 text-green-600" />}
                    {metric.trend === 'stable' && <Activity className="w-4 h-4 text-gray-400" />}
                  </div>
                  <p className="text-xl font-bold text-gray-900">
                    {metric.current} {metric.unit}
                  </p>
                  <p className={`text-xs mt-1 ${metric.change > 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {metric.change > 0 ? '+' : ''}{metric.change.toFixed(1)}% from last reading
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
