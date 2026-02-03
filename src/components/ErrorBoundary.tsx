/* eslint-disable react-refresh/only-export-components */
import React, { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { handleReactError } from '../utils/errorTracking';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  /** Optional callback for error reporting/analytics */
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  /** Component name for error tracking */
  name?: string;
  /** Variant: 'page' for full-page, 'section' for inline, 'silent' for no UI */
  variant?: 'page' | 'section' | 'silent';
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const componentName = this.props.name || 'Unknown';
    console.error(`[ErrorBoundary:${componentName}] Caught error:`, error, errorInfo);
    this.setState({ errorInfo });

    // Send to error tracking service
    handleReactError(error, { componentStack: errorInfo.componentStack || '' });

    // Call optional error handler (for analytics/reporting)
    this.props.onError?.(error, errorInfo);

    // Store error in sessionStorage for debugging (development only)
    if (import.meta.env.DEV) {
      try {
        const errorLog = {
          message: error.message,
          stack: error.stack,
          componentStack: errorInfo.componentStack,
          timestamp: new Date().toISOString(),
          component: componentName,
        };
        const existingLogs = JSON.parse(sessionStorage.getItem('errorLogs') || '[]');
        existingLogs.push(errorLog);
        sessionStorage.setItem('errorLogs', JSON.stringify(existingLogs.slice(-10)));
      } catch {
        // Ignore storage errors
      }
    }
  }

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Silent variant - render nothing
      if (this.props.variant === 'silent') {
        return null;
      }

      // Section variant - compact inline error
      if (this.props.variant === 'section') {
        return (
          <div className="flex flex-col items-center justify-center p-6 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
            <AlertTriangle className="w-8 h-8 text-red-400 mb-3" />
            <p className="text-sm text-red-600 dark:text-red-300 text-center mb-3">
              {this.state.error?.message || 'Something went wrong'}
            </p>
            <button
              onClick={this.handleRetry}
              className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded text-sm flex items-center gap-1.5"
            >
              <RefreshCw className="w-3 h-3" />
              Retry
            </button>
          </div>
        );
      }

      // Page variant (default) - full page error
      return (
        <div className="min-h-screen flex items-center justify-center bg-[#0B1120] text-slate-300 p-4">
          <div className="max-w-md w-full bg-slate-800/50 rounded-xl border border-slate-700 p-8 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-500/20 flex items-center justify-center">
              <AlertTriangle className="w-8 h-8 text-red-400" />
            </div>

            <h1 className="text-xl font-bold text-white mb-2">Something went wrong</h1>
            <p className="text-slate-400 mb-6">
              An unexpected error occurred. Your data is safe - try refreshing the page.
            </p>

            {this.state.error && (
              <details className="text-left mb-6 p-3 bg-slate-900/50 rounded-lg text-xs">
                <summary className="cursor-pointer text-slate-500 hover:text-slate-400">
                  Error details
                </summary>
                <pre className="mt-2 text-red-400 overflow-auto max-h-32">
                  {this.state.error.message}
                </pre>
                {this.state.errorInfo && (
                  <pre className="mt-2 text-slate-500 overflow-auto max-h-32">
                    {this.state.errorInfo.componentStack}
                  </pre>
                )}
              </details>
            )}

            <div className="flex gap-3 justify-center">
              <button
                onClick={this.handleRetry}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg flex items-center gap-2 transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                Try Again
              </button>
              <button
                onClick={this.handleGoHome}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg flex items-center gap-2 transition-colors"
              >
                <Home className="w-4 h-4" />
                Go Home
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Higher-order component to wrap any component with an error boundary
 */
export function withErrorBoundary<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  boundaryProps?: Omit<Props, 'children'>
): React.FC<P> {
  const WithErrorBoundary: React.FC<P> = (props) => (
    <ErrorBoundary {...boundaryProps}>
      <WrappedComponent {...props} />
    </ErrorBoundary>
  );

  WithErrorBoundary.displayName = `WithErrorBoundary(${WrappedComponent.displayName || WrappedComponent.name || 'Component'})`;

  return WithErrorBoundary;
}

/**
 * Silent error boundary for overlays - logs but shows nothing on error
 */
export const OverlayErrorBoundary: React.FC<{ children: ReactNode }> = ({ children }) => (
  <ErrorBoundary
    variant="silent"
    name="Overlay"
    onError={(error) => {
      console.warn('Overlay error suppressed:', error.message);
    }}
  >
    {children}
  </ErrorBoundary>
);

/**
 * Section error boundary with compact fallback
 */
export const SectionErrorBoundary: React.FC<{ children: ReactNode; name?: string }> = ({
  children,
  name,
}) => (
  <ErrorBoundary variant="section" name={name}>
    {children}
  </ErrorBoundary>
);

export default ErrorBoundary;
