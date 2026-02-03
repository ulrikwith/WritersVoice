/**
 * Error Tracking Utility for BookArchitect
 *
 * Provides a unified interface for error reporting that can be
 * connected to external services like Sentry, LogRocket, or similar.
 *
 * In development, errors are logged to console.
 * In production, errors are sent to the configured service.
 */

// Error severity levels
export type ErrorSeverity = 'fatal' | 'error' | 'warning' | 'info';

// Error context for additional debugging information
export interface ErrorContext {
  // Component or module where error occurred
  component?: string;
  // User action that triggered the error
  action?: string;
  // Additional metadata
  metadata?: Record<string, unknown>;
  // User ID (anonymized)
  userId?: string;
  // Session ID for grouping related errors
  sessionId?: string;
}

// Error report structure
export interface ErrorReport {
  message: string;
  stack?: string;
  severity: ErrorSeverity;
  context: ErrorContext;
  timestamp: number;
  url: string;
  userAgent: string;
}

// Queue for batching errors (reduces network calls)
const errorQueue: ErrorReport[] = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;

// Configuration
const config = {
  enabled: import.meta.env.PROD,
  endpoint: import.meta.env.VITE_ERROR_TRACKING_ENDPOINT || '',
  batchSize: 10,
  flushInterval: 5000, // 5 seconds
  maxQueueSize: 100,
};

// Generate a session ID for grouping errors
const sessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

/**
 * Initialize error tracking
 * Call this once on app startup
 */
export function initErrorTracking(): void {
  if (typeof window === 'undefined') return;

  // Global error handler
  window.addEventListener('error', (event) => {
    captureError(event.error || new Error(event.message), {
      component: 'window',
      action: 'unhandled-error',
      metadata: {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
      },
    });
  });

  // Unhandled promise rejection handler
  window.addEventListener('unhandledrejection', (event) => {
    const error = event.reason instanceof Error
      ? event.reason
      : new Error(String(event.reason));

    captureError(error, {
      component: 'window',
      action: 'unhandled-rejection',
    });
  });

  // Flush remaining errors before page unload
  window.addEventListener('beforeunload', () => {
    flushErrors(true);
  });

  if (import.meta.env.DEV) {
    console.log('[ErrorTracking] Initialized in development mode');
  }
}

/**
 * Capture and report an error
 */
export function captureError(
  error: Error | string,
  context: ErrorContext = {},
  severity: ErrorSeverity = 'error'
): void {
  const errorObj = typeof error === 'string' ? new Error(error) : error;

  const report: ErrorReport = {
    message: errorObj.message,
    stack: errorObj.stack,
    severity,
    context: {
      ...context,
      sessionId,
    },
    timestamp: Date.now(),
    url: typeof window !== 'undefined' ? window.location.href : '',
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
  };

  // Always log in development
  if (import.meta.env.DEV) {
    const logFn = severity === 'fatal' || severity === 'error'
      ? console.error
      : severity === 'warning'
      ? console.warn
      : console.info;

    logFn(`[ErrorTracking] ${severity.toUpperCase()}:`, {
      message: report.message,
      context: report.context,
      stack: report.stack,
    });
  }

  // Queue for sending to service
  if (config.enabled && config.endpoint) {
    queueError(report);
  }
}

/**
 * Capture a message (non-error event)
 */
export function captureMessage(
  message: string,
  context: ErrorContext = {},
  severity: ErrorSeverity = 'info'
): void {
  captureError(new Error(message), context, severity);
}

/**
 * Set user context for error reports
 */
export function setUser(userId: string | null): void {
  if (userId) {
    // Store anonymized user ID
    config.endpoint && localStorage.setItem('error_tracking_user', userId);
  } else {
    localStorage.removeItem('error_tracking_user');
  }
}

/**
 * Add breadcrumb for debugging
 * Breadcrumbs help trace user actions leading to an error
 */
const breadcrumbs: Array<{
  message: string;
  category: string;
  timestamp: number;
  data?: Record<string, unknown>;
}> = [];

export function addBreadcrumb(
  message: string,
  category: string = 'action',
  data?: Record<string, unknown>
): void {
  breadcrumbs.push({
    message,
    category,
    timestamp: Date.now(),
    data,
  });

  // Keep only last 20 breadcrumbs
  if (breadcrumbs.length > 20) {
    breadcrumbs.shift();
  }
}

/**
 * Get current breadcrumbs (for error context)
 */
export function getBreadcrumbs(): typeof breadcrumbs {
  return [...breadcrumbs];
}

// Internal: Queue error for batch sending
function queueError(report: ErrorReport): void {
  if (errorQueue.length >= config.maxQueueSize) {
    // Drop oldest errors if queue is full
    errorQueue.shift();
  }

  errorQueue.push(report);

  // Schedule flush if not already scheduled
  if (!flushTimer) {
    flushTimer = setTimeout(() => flushErrors(), config.flushInterval);
  }

  // Flush immediately if batch size reached
  if (errorQueue.length >= config.batchSize) {
    flushErrors();
  }
}

// Internal: Send queued errors to the tracking service
async function flushErrors(sync = false): Promise<void> {
  if (flushTimer) {
    clearTimeout(flushTimer);
    flushTimer = null;
  }

  if (errorQueue.length === 0 || !config.endpoint) return;

  const errors = errorQueue.splice(0, errorQueue.length);

  const payload = {
    errors,
    breadcrumbs: getBreadcrumbs(),
    app: {
      name: 'BookArchitect',
      version: import.meta.env.VITE_APP_VERSION || '1.0.0',
      environment: import.meta.env.MODE,
    },
  };

  try {
    if (sync && navigator.sendBeacon) {
      // Use sendBeacon for reliable delivery on page unload
      navigator.sendBeacon(config.endpoint, JSON.stringify(payload));
    } else {
      await fetch(config.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    }
  } catch (e) {
    // Don't throw - we don't want error tracking to cause errors
    if (import.meta.env.DEV) {
      console.warn('[ErrorTracking] Failed to send errors:', e);
    }
  }
}

/**
 * React Error Boundary integration
 * Use this as the onError callback for ErrorBoundary
 */
export function handleReactError(
  error: Error,
  errorInfo: { componentStack: string }
): void {
  captureError(error, {
    component: 'ErrorBoundary',
    action: 'react-error',
    metadata: {
      componentStack: errorInfo.componentStack,
    },
  }, 'fatal');
}

/**
 * Wrap an async function with error tracking
 */
export function withErrorTracking<T extends (...args: unknown[]) => Promise<unknown>>(
  fn: T,
  context: ErrorContext
): T {
  return (async (...args: Parameters<T>) => {
    try {
      return await fn(...args);
    } catch (error) {
      captureError(error instanceof Error ? error : new Error(String(error)), context);
      throw error;
    }
  }) as T;
}
