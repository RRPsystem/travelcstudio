import { supabase } from './supabase';

export type ErrorSeverity = 'critical' | 'error' | 'warning' | 'info';
export type ErrorType = 'frontend' | 'backend' | 'api' | 'database' | 'edge_function';

interface ErrorLogData {
  type: ErrorType;
  severity: ErrorSeverity;
  message: string;
  stackTrace?: string;
  url?: string;
  context?: Record<string, any>;
}

export class ErrorTracker {
  private static instance: ErrorTracker;
  private isInitialized = false;

  private constructor() {}

  static getInstance(): ErrorTracker {
    if (!ErrorTracker.instance) {
      ErrorTracker.instance = new ErrorTracker();
    }
    return ErrorTracker.instance;
  }

  initialize() {
    if (this.isInitialized) return;

    window.addEventListener('error', (event) => {
      this.logError({
        type: 'frontend',
        severity: 'error',
        message: event.message,
        stackTrace: event.error?.stack,
        url: window.location.href,
        context: {
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
        },
      });
    });

    window.addEventListener('unhandledrejection', (event) => {
      this.logError({
        type: 'frontend',
        severity: 'error',
        message: `Unhandled Promise Rejection: ${event.reason}`,
        stackTrace: event.reason?.stack,
        url: window.location.href,
        context: {
          reason: String(event.reason),
        },
      });
    });

    this.isInitialized = true;
    console.log('Error tracking initialized');
  }

  async logError(data: ErrorLogData) {
    try {
      console.error('Error logged:', data.message);

      const { data: session } = await supabase.auth.getSession();

      const errorData = {
        error_type: data.type,
        severity: data.severity,
        message: data.message,
        stack_trace: data.stackTrace,
        user_id: session?.session?.user?.id || null,
        url: data.url || window.location.href,
        user_agent: navigator.userAgent,
        context: data.context || {},
      };

      const { error } = await supabase
        .from('system_errors')
        .insert(errorData);

      if (error) {
        console.error('Failed to log error to database:', error);
      }

      if (data.severity === 'critical') {
        this.createAlert({
          title: 'Critical Error Detected',
          description: data.message,
          severity: 'critical',
        }).catch(err => {
          console.error('Failed to create alert:', err);
        });
      }
    } catch (err) {
      console.error('Error in error tracking (non-fatal):', err);
    }
  }

  async createAlert(alert: {
    title: string;
    description: string;
    severity: 'critical' | 'warning' | 'info';
    alertType?: string;
    thresholdValue?: number;
    currentValue?: number;
  }) {
    try {
      await supabase.from('system_alerts').insert({
        alert_type: alert.alertType || 'error_spike',
        severity: alert.severity,
        title: alert.title,
        description: alert.description,
        threshold_value: alert.thresholdValue,
        current_value: alert.currentValue,
      });
    } catch (err) {
      console.error('Failed to create alert:', err);
    }
  }

  logApiUsage(usage: {
    apiName: string;
    endpoint?: string;
    tokensUsed?: number;
    costEstimate?: number;
    responseTimeMs?: number;
    statusCode?: number;
    brandId?: string;
  }) {
    supabase.auth.getSession().then(({ data: session }) => {
      supabase.from('api_usage_logs').insert({
        api_name: usage.apiName,
        endpoint: usage.endpoint,
        tokens_used: usage.tokensUsed,
        cost_estimate: usage.costEstimate,
        response_time_ms: usage.responseTimeMs,
        status_code: usage.statusCode,
        brand_id: usage.brandId,
        user_id: session?.session?.user?.id || null,
      });
    });
  }

  recordMetric(metric: {
    name: string;
    value: number;
    unit: string;
    tags?: Record<string, any>;
  }) {
    supabase.from('system_metrics').insert({
      metric_name: metric.name,
      metric_value: metric.value,
      metric_unit: metric.unit,
      tags: metric.tags || {},
    });
  }
}

export const errorTracker = ErrorTracker.getInstance();
