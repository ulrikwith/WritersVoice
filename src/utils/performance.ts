/**
 * Performance Monitoring Utilities for BookArchitect
 *
 * Provides tools for:
 * - Component render timing
 * - Custom performance marks
 * - Web Vitals collection
 * - Memory monitoring (development only)
 */

// Performance entry types
interface PerformanceMark {
  name: string;
  startTime: number;
  duration?: number;
}

interface ComponentRenderMetric {
  component: string;
  phase: 'mount' | 'update';
  actualDuration: number;
  baseDuration: number;
  startTime: number;
  commitTime: number;
}

// Store for collected metrics
const metricsStore: {
  marks: PerformanceMark[];
  renders: ComponentRenderMetric[];
  webVitals: Record<string, number>;
} = {
  marks: [],
  renders: [],
  webVitals: {},
};

// Maximum metrics to keep in memory
const MAX_METRICS = 100;

/**
 * Start a performance measurement
 */
export function startMeasure(name: string): void {
  if (typeof performance === 'undefined') return;

  try {
    performance.mark(`${name}-start`);
  } catch {
    // Ignore if performance API unavailable
  }
}

/**
 * End a performance measurement and optionally log it
 */
export function endMeasure(name: string, log = false): number | null {
  if (typeof performance === 'undefined') return null;

  try {
    performance.mark(`${name}-end`);
    performance.measure(name, `${name}-start`, `${name}-end`);

    const entries = performance.getEntriesByName(name, 'measure');
    const entry = entries[entries.length - 1];

    if (entry) {
      const duration = entry.duration;

      // Store the metric
      metricsStore.marks.push({
        name,
        startTime: entry.startTime,
        duration,
      });

      // Keep metrics bounded
      if (metricsStore.marks.length > MAX_METRICS) {
        metricsStore.marks.shift();
      }

      // Clean up performance entries
      performance.clearMarks(`${name}-start`);
      performance.clearMarks(`${name}-end`);
      performance.clearMeasures(name);

      if (log && import.meta.env.DEV) {
        console.log(`[Perf] ${name}: ${duration.toFixed(2)}ms`);
      }

      return duration;
    }
  } catch {
    // Ignore errors
  }

  return null;
}

/**
 * Measure an async operation
 */
export async function measureAsync<T>(
  name: string,
  fn: () => Promise<T>,
  log = false
): Promise<T> {
  startMeasure(name);
  try {
    const result = await fn();
    endMeasure(name, log);
    return result;
  } catch (error) {
    endMeasure(name, log);
    throw error;
  }
}

/**
 * Measure a synchronous operation
 */
export function measureSync<T>(name: string, fn: () => T, log = false): T {
  startMeasure(name);
  try {
    const result = fn();
    endMeasure(name, log);
    return result;
  } catch (error) {
    endMeasure(name, log);
    throw error;
  }
}

/**
 * React Profiler onRender callback
 * Use with: <Profiler id="ComponentName" onRender={onRenderCallback}>
 */
export function onRenderCallback(
  id: string,
  phase: 'mount' | 'update',
  actualDuration: number,
  baseDuration: number,
  startTime: number,
  commitTime: number
): void {
  const metric: ComponentRenderMetric = {
    component: id,
    phase,
    actualDuration,
    baseDuration,
    startTime,
    commitTime,
  };

  metricsStore.renders.push(metric);

  // Keep metrics bounded
  if (metricsStore.renders.length > MAX_METRICS) {
    metricsStore.renders.shift();
  }

  // Log slow renders in development
  if (import.meta.env.DEV && actualDuration > 16) {
    console.warn(
      `[Perf] Slow render: ${id} (${phase}) took ${actualDuration.toFixed(2)}ms`
    );
  }
}

/**
 * Web Vitals reporting
 * Call this on app mount to start collecting Core Web Vitals
 */
export function initWebVitals(
  onReport?: (metric: { name: string; value: number; rating: string }) => void
): void {
  if (typeof window === 'undefined') return;

  // Use the web-vitals library if available, otherwise use basic measurements
  const reportWebVital = (name: string, value: number) => {
    metricsStore.webVitals[name] = value;

    // Determine rating based on thresholds
    let rating: 'good' | 'needs-improvement' | 'poor' = 'good';
    switch (name) {
      case 'LCP':
        if (value > 4000) rating = 'poor';
        else if (value > 2500) rating = 'needs-improvement';
        break;
      case 'FID':
        if (value > 300) rating = 'poor';
        else if (value > 100) rating = 'needs-improvement';
        break;
      case 'CLS':
        if (value > 0.25) rating = 'poor';
        else if (value > 0.1) rating = 'needs-improvement';
        break;
      case 'FCP':
        if (value > 3000) rating = 'poor';
        else if (value > 1800) rating = 'needs-improvement';
        break;
      case 'TTFB':
        if (value > 1800) rating = 'poor';
        else if (value > 800) rating = 'needs-improvement';
        break;
    }

    if (import.meta.env.DEV) {
      const color = rating === 'good' ? 'green' : rating === 'needs-improvement' ? 'orange' : 'red';
      console.log(`[WebVital] ${name}: ${value.toFixed(2)} (${rating})`, `color: ${color}`);
    }

    onReport?.({ name, value, rating });
  };

  // Observe FCP and LCP
  if ('PerformanceObserver' in window) {
    try {
      // First Contentful Paint
      const fcpObserver = new PerformanceObserver((entryList) => {
        const entries = entryList.getEntries();
        const fcp = entries.find((e) => e.name === 'first-contentful-paint');
        if (fcp) {
          reportWebVital('FCP', fcp.startTime);
        }
      });
      fcpObserver.observe({ type: 'paint', buffered: true });

      // Largest Contentful Paint
      const lcpObserver = new PerformanceObserver((entryList) => {
        const entries = entryList.getEntries();
        const lastEntry = entries[entries.length - 1];
        if (lastEntry) {
          reportWebVital('LCP', lastEntry.startTime);
        }
      });
      lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });

      // Layout Shift
      let clsValue = 0;
      const clsObserver = new PerformanceObserver((entryList) => {
        for (const entry of entryList.getEntries()) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          if (!(entry as any).hadRecentInput) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            clsValue += (entry as any).value;
          }
        }
        reportWebVital('CLS', clsValue);
      });
      clsObserver.observe({ type: 'layout-shift', buffered: true });

      // First Input Delay
      const fidObserver = new PerformanceObserver((entryList) => {
        const entries = entryList.getEntries();
        const firstInput = entries[0];
        if (firstInput) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const delay = (firstInput as any).processingStart - firstInput.startTime;
          reportWebVital('FID', delay);
        }
      });
      fidObserver.observe({ type: 'first-input', buffered: true });
    } catch {
      // PerformanceObserver may not support all entry types
    }
  }

  // Time to First Byte from navigation timing
  if (performance.getEntriesByType) {
    const navEntries = performance.getEntriesByType('navigation');
    if (navEntries.length > 0) {
      const navEntry = navEntries[0] as PerformanceNavigationTiming;
      reportWebVital('TTFB', navEntry.responseStart);
    }
  }
}

/**
 * Get current memory usage (development only)
 */
export function getMemoryUsage(): { usedJSHeapSize: number; totalJSHeapSize: number } | null {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const perfMemory = (performance as any).memory;
  if (perfMemory) {
    return {
      usedJSHeapSize: perfMemory.usedJSHeapSize,
      totalJSHeapSize: perfMemory.totalJSHeapSize,
    };
  }
  return null;
}

/**
 * Get all collected metrics
 */
export function getMetrics(): {
  marks: PerformanceMark[];
  renders: ComponentRenderMetric[];
  webVitals: Record<string, number>;
} {
  return { ...metricsStore };
}

/**
 * Clear all collected metrics
 */
export function clearMetrics(): void {
  metricsStore.marks = [];
  metricsStore.renders = [];
  metricsStore.webVitals = {};
}

/**
 * Create a performance-aware debounce function
 * Measures the debounced function execution time
 */
export function measureDebounce<T extends (...args: unknown[]) => unknown>(
  fn: T,
  delay: number,
  name: string
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  return (...args: Parameters<T>) => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    timeoutId = setTimeout(() => {
      startMeasure(name);
      fn(...args);
      endMeasure(name, import.meta.env.DEV);
      timeoutId = null;
    }, delay);
  };
}

/**
 * Hook-friendly performance measurement
 * Returns a function that measures execution time
 */
export function createMeasurer(prefix: string): {
  measure: <T>(name: string, fn: () => T) => T;
  measureAsync: <T>(name: string, fn: () => Promise<T>) => Promise<T>;
} {
  return {
    measure: <T>(name: string, fn: () => T) => measureSync(`${prefix}:${name}`, fn),
    measureAsync: <T>(name: string, fn: () => Promise<T>) => measureAsync(`${prefix}:${name}`, fn),
  };
}

// Development-only: Log performance summary on page unload
if (import.meta.env.DEV && typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    const metrics = getMetrics();
    if (metrics.marks.length > 0 || metrics.renders.length > 0) {
      console.group('[Perf Summary]');

      if (metrics.marks.length > 0) {
        const avgDurations = metrics.marks.reduce((acc, m) => {
          if (!acc[m.name]) {
            acc[m.name] = { total: 0, count: 0 };
          }
          acc[m.name].total += m.duration ?? 0;
          acc[m.name].count += 1;
          return acc;
        }, {} as Record<string, { total: number; count: number }>);

        console.log('Measurements:', Object.entries(avgDurations).map(([name, data]) => ({
          name,
          avgMs: (data.total / data.count).toFixed(2),
          calls: data.count,
        })));
      }

      if (metrics.renders.length > 0) {
        const slowRenders = metrics.renders.filter(r => r.actualDuration > 16);
        if (slowRenders.length > 0) {
          console.warn('Slow renders (>16ms):', slowRenders.length);
        }
      }

      console.log('Web Vitals:', metrics.webVitals);
      console.groupEnd();
    }
  });
}
