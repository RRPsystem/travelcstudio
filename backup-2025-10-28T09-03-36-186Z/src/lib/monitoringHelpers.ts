import { errorTracker } from './errorTracking';

export function wrapWithErrorTracking<T extends (...args: any[]) => any>(
  fn: T,
  context: { name: string; type: 'api' | 'database' | 'frontend' }
): T {
  return (async (...args: Parameters<T>) => {
    try {
      const startTime = Date.now();
      const result = await fn(...args);
      const duration = Date.now() - startTime;

      errorTracker.recordMetric({
        name: `${context.type}_${context.name}_duration`,
        value: duration,
        unit: 'ms',
        tags: { type: context.type, operation: context.name },
      });

      return result;
    } catch (error) {
      errorTracker.logError({
        type: context.type === 'frontend' ? 'frontend' : context.type === 'api' ? 'api' : 'database',
        severity: 'error',
        message: `Error in ${context.name}: ${error instanceof Error ? error.message : String(error)}`,
        stackTrace: error instanceof Error ? error.stack : undefined,
        context: {
          operation: context.name,
          type: context.type,
        },
      });

      throw error;
    }
  }) as T;
}

export async function trackApiCall<T>(
  apiName: string,
  endpoint: string,
  fn: () => Promise<T>,
  options?: {
    estimateCost?: (result: T) => number;
    extractTokens?: (result: T) => number;
    brandId?: string;
  }
): Promise<T> {
  const startTime = Date.now();

  try {
    const result = await fn();
    const responseTime = Date.now() - startTime;

    errorTracker.logApiUsage({
      apiName,
      endpoint,
      responseTimeMs: responseTime,
      statusCode: 200,
      tokensUsed: options?.extractTokens?.(result),
      costEstimate: options?.estimateCost?.(result),
      brandId: options?.brandId,
    });

    errorTracker.recordMetric({
      name: `api_${apiName}_response_time`,
      value: responseTime,
      unit: 'ms',
      tags: { api: apiName, endpoint },
    });

    return result;
  } catch (error) {
    const responseTime = Date.now() - startTime;

    errorTracker.logApiUsage({
      apiName,
      endpoint,
      responseTimeMs: responseTime,
      statusCode: error instanceof Error && 'status' in error ? (error as any).status : 500,
      brandId: options?.brandId,
    });

    errorTracker.logError({
      type: 'api',
      severity: 'error',
      message: `API call to ${apiName} failed: ${error instanceof Error ? error.message : String(error)}`,
      stackTrace: error instanceof Error ? error.stack : undefined,
      context: {
        api: apiName,
        endpoint,
        responseTime,
      },
    });

    throw error;
  }
}

export function checkThresholds(config: {
  metricName: string;
  currentValue: number;
  thresholds: {
    warning?: number;
    critical?: number;
  };
  comparison?: 'greater' | 'less';
}) {
  const { metricName, currentValue, thresholds, comparison = 'greater' } = config;

  if (thresholds.critical !== undefined) {
    const isCritical = comparison === 'greater'
      ? currentValue > thresholds.critical
      : currentValue < thresholds.critical;

    if (isCritical) {
      errorTracker.createAlert({
        title: `Critical: ${metricName} threshold exceeded`,
        description: `${metricName} is at ${currentValue}, which exceeds the critical threshold of ${thresholds.critical}`,
        severity: 'critical',
        alertType: 'threshold_exceeded',
        thresholdValue: thresholds.critical,
        currentValue,
      });
      return 'critical';
    }
  }

  if (thresholds.warning !== undefined) {
    const isWarning = comparison === 'greater'
      ? currentValue > thresholds.warning
      : currentValue < thresholds.warning;

    if (isWarning) {
      errorTracker.createAlert({
        title: `Warning: ${metricName} approaching threshold`,
        description: `${metricName} is at ${currentValue}, which exceeds the warning threshold of ${thresholds.warning}`,
        severity: 'warning',
        alertType: 'threshold_warning',
        thresholdValue: thresholds.warning,
        currentValue,
      });
      return 'warning';
    }
  }

  return 'ok';
}
