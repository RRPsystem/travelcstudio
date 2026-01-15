import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Activity, Database, Zap, Lock, AlertTriangle, TrendingUp, HardDrive } from 'lucide-react';

interface PerformanceMetrics {
  id: string;
  timestamp: string;
  total_connections: number;
  active_connections: number;
  idle_connections: number;
  max_connections: number;
  connection_utilization: number;
  active_queries: number;
  slow_queries_count: number;
  avg_query_time_ms: number;
  max_query_time_ms: number;
  active_locks: number;
  blocking_locks: number;
  deadlocks_detected: number;
  cache_hit_ratio: number;
  database_size_mb: number;
}

interface SlowQuery {
  id: string;
  timestamp: string;
  query_text: string;
  duration_ms: number;
  brand_id: string | null;
  table_name: string | null;
  row_count: number | null;
}

export default function DatabasePerformanceMonitor() {
  const [currentMetrics, setCurrentMetrics] = useState<PerformanceMetrics | null>(null);
  const [historicalMetrics, setHistoricalMetrics] = useState<PerformanceMetrics[]>([]);
  const [slowQueries, setSlowQueries] = useState<SlowQuery[]>([]);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const captureMetrics = async () => {
    try {
      const { data, error } = await supabase.rpc('capture_performance_metrics');

      if (error) throw error;

      await fetchLatestMetrics();
    } catch (error) {
      console.error('Error capturing metrics:', error);
    }
  };

  const fetchLatestMetrics = async () => {
    try {
      const { data: latest, error: latestError } = await supabase
        .from('performance_metrics')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (latestError) throw latestError;

      if (latest) {
        setCurrentMetrics(latest);
      }

      const { data: historical, error: historicalError } = await supabase
        .from('performance_metrics')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(20);

      if (historicalError) throw historicalError;

      if (historical) {
        setHistoricalMetrics(historical);
      }

      const { data: slow, error: slowError } = await supabase
        .from('slow_query_log')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(10);

      if (slowError) throw slowError;

      if (slow) {
        setSlowQueries(slow);
      }

      setLoading(false);
    } catch (error) {
      console.error('Error fetching metrics:', error);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLatestMetrics();

    if (autoRefresh) {
      const interval = setInterval(() => {
        captureMetrics();
      }, 30000);

      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  const getStatusColor = (utilization: number) => {
    if (utilization >= 80) return 'text-red-600 bg-red-50';
    if (utilization >= 60) return 'text-amber-600 bg-amber-50';
    return 'text-green-600 bg-green-50';
  };

  const getMetricStatus = (value: number, warning: number, critical: number) => {
    if (value >= critical) return 'critical';
    if (value >= warning) return 'warning';
    return 'healthy';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Database className="h-12 w-12 text-blue-500 animate-pulse mx-auto mb-4" />
          <p className="text-gray-600">Loading performance metrics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              autoRefresh
                ? 'bg-green-100 text-green-700 hover:bg-green-200'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {autoRefresh ? 'Auto-refresh ON' : 'Auto-refresh OFF'}
          </button>

          <button
            onClick={captureMetrics}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
          >
            Capture Now
          </button>
        </div>
      </div>

      {currentMetrics && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className={`p-4 rounded-lg border-2 ${
              getStatusColor(currentMetrics.connection_utilization)
            }`}>
              <div className="flex items-center justify-between mb-2">
                <Database className="h-5 w-5" />
                <span className="text-xs font-medium">Connections</span>
              </div>
              <div className="text-2xl font-bold">
                {currentMetrics.total_connections} / {currentMetrics.max_connections}
              </div>
              <div className="text-sm mt-1">
                {currentMetrics.connection_utilization.toFixed(1)}% utilized
              </div>
              <div className="text-xs mt-2 opacity-75">
                Active: {currentMetrics.active_connections} | Idle: {currentMetrics.idle_connections}
              </div>
            </div>

            <div className="p-4 rounded-lg border-2 bg-blue-50 text-blue-700">
              <div className="flex items-center justify-between mb-2">
                <Zap className="h-5 w-5" />
                <span className="text-xs font-medium">Queries</span>
              </div>
              <div className="text-2xl font-bold">
                {currentMetrics.active_queries}
              </div>
              <div className="text-sm mt-1">Active queries</div>
              <div className="text-xs mt-2 opacity-75">
                Avg: {currentMetrics.avg_query_time_ms?.toFixed(1) || 0}ms |
                Max: {currentMetrics.max_query_time_ms?.toFixed(1) || 0}ms
              </div>
            </div>

            <div className={`p-4 rounded-lg border-2 ${
              currentMetrics.blocking_locks > 0
                ? 'bg-red-50 text-red-700'
                : 'bg-green-50 text-green-700'
            }`}>
              <div className="flex items-center justify-between mb-2">
                <Lock className="h-5 w-5" />
                <span className="text-xs font-medium">Locks</span>
              </div>
              <div className="text-2xl font-bold">
                {currentMetrics.active_locks}
              </div>
              <div className="text-sm mt-1">Active locks</div>
              <div className="text-xs mt-2 opacity-75">
                Blocking: {currentMetrics.blocking_locks} |
                Deadlocks: {currentMetrics.deadlocks_detected}
              </div>
            </div>

            <div className={`p-4 rounded-lg border-2 ${
              currentMetrics.cache_hit_ratio < 90
                ? 'bg-amber-50 text-amber-700'
                : 'bg-green-50 text-green-700'
            }`}>
              <div className="flex items-center justify-between mb-2">
                <TrendingUp className="h-5 w-5" />
                <span className="text-xs font-medium">Cache</span>
              </div>
              <div className="text-2xl font-bold">
                {currentMetrics.cache_hit_ratio?.toFixed(1) || 0}%
              </div>
              <div className="text-sm mt-1">Hit ratio</div>
              <div className="text-xs mt-2 opacity-75">
                DB Size: {currentMetrics.database_size_mb?.toFixed(0) || 0} MB
              </div>
            </div>
          </div>

          {(currentMetrics.connection_utilization > 80 || currentMetrics.blocking_locks > 0) && (
            <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-red-900">Performance Alert</h3>
                  <ul className="mt-2 space-y-1 text-sm text-red-800">
                    {currentMetrics.connection_utilization > 80 && (
                      <li>Connection pool at {currentMetrics.connection_utilization.toFixed(1)}% - Consider scaling</li>
                    )}
                    {currentMetrics.blocking_locks > 0 && (
                      <li>{currentMetrics.blocking_locks} blocking locks detected - Check for long transactions</li>
                    )}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {slowQueries.length > 0 && (
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-600" />
                Recent Slow Queries
              </h3>

              <div className="space-y-3">
                {slowQueries.map((query) => (
                  <div key={query.id} className="border-l-4 border-amber-500 pl-4 py-2">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-1">
                          <span className="px-2 py-1 bg-amber-100 text-amber-800 text-xs font-medium rounded">
                            {query.duration_ms.toFixed(0)}ms
                          </span>
                          {query.table_name && (
                            <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs font-medium rounded">
                              {query.table_name}
                            </span>
                          )}
                          <span className="text-xs text-gray-500">
                            {new Date(query.timestamp).toLocaleString()}
                          </span>
                        </div>
                        <code className="text-sm text-gray-700 block truncate">
                          {query.query_text}
                        </code>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {historicalMetrics.length > 1 && (
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <HardDrive className="h-5 w-5 text-blue-600" />
                Historical Trends (Last Hour)
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Connection Utilization</h4>
                  <div className="space-y-1">
                    {historicalMetrics.slice(0, 10).map((metric, i) => (
                      <div key={metric.id} className="flex items-center gap-2">
                        <div className="text-xs text-gray-500 w-16">
                          {new Date(metric.timestamp).toLocaleTimeString()}
                        </div>
                        <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full ${
                              metric.connection_utilization >= 80 ? 'bg-red-500' :
                              metric.connection_utilization >= 60 ? 'bg-amber-500' :
                              'bg-green-500'
                            }`}
                            style={{ width: `${metric.connection_utilization}%` }}
                          />
                        </div>
                        <div className="text-xs font-medium w-12 text-right">
                          {metric.connection_utilization.toFixed(0)}%
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Active Queries</h4>
                  <div className="space-y-1">
                    {historicalMetrics.slice(0, 10).map((metric) => (
                      <div key={metric.id} className="flex items-center gap-2">
                        <div className="text-xs text-gray-500 w-16">
                          {new Date(metric.timestamp).toLocaleTimeString()}
                        </div>
                        <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-blue-500"
                            style={{ width: `${Math.min(100, (metric.active_queries / 50) * 100)}%` }}
                          />
                        </div>
                        <div className="text-xs font-medium w-12 text-right">
                          {metric.active_queries}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Cache Hit Ratio</h4>
                  <div className="space-y-1">
                    {historicalMetrics.slice(0, 10).map((metric) => (
                      <div key={metric.id} className="flex items-center gap-2">
                        <div className="text-xs text-gray-500 w-16">
                          {new Date(metric.timestamp).toLocaleTimeString()}
                        </div>
                        <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full ${
                              (metric.cache_hit_ratio || 0) >= 95 ? 'bg-green-500' :
                              (metric.cache_hit_ratio || 0) >= 90 ? 'bg-amber-500' :
                              'bg-red-500'
                            }`}
                            style={{ width: `${metric.cache_hit_ratio || 0}%` }}
                          />
                        </div>
                        <div className="text-xs font-medium w-12 text-right">
                          {metric.cache_hit_ratio?.toFixed(0) || 0}%
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-semibold text-blue-900 mb-2">Capacity Planning</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-blue-800">
              <div>
                <div className="font-medium">Current Capacity</div>
                <div className="mt-1">
                  ~{Math.floor((currentMetrics.max_connections / currentMetrics.total_connections) *
                    (currentMetrics.total_connections / (currentMetrics.active_connections || 1)))} concurrent users
                </div>
              </div>
              <div>
                <div className="font-medium">Recommended Max</div>
                <div className="mt-1">
                  400 users (Pro tier with Supavisor)
                </div>
              </div>
              <div>
                <div className="font-medium">Status</div>
                <div className="mt-1 font-semibold">
                  {currentMetrics.connection_utilization < 60 ? '✅ Healthy capacity' :
                   currentMetrics.connection_utilization < 80 ? '⚠️ Monitor closely' :
                   '🚨 Scale recommended'}
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
