import { useEffect, useRef, useCallback, useState } from 'react';
import {
  startMeasure,
  endMeasure,
  onRenderCallback,
  createMeasurer,
  getMemoryUsage,
} from '../utils/performance';

/**
 * Hook to measure component mount/update performance
 * Logs timing in development mode
 */
export function useRenderTiming(componentName: string): void {
  const renderCount = useRef(0);
  const mountTime = useRef(performance.now());

  useEffect(() => {
    const duration = performance.now() - mountTime.current;
    if (import.meta.env.DEV && duration > 16) {
      console.log(`[Perf] ${componentName} mount: ${duration.toFixed(2)}ms`);
    }
  }, [componentName]);

  useEffect(() => {
    renderCount.current += 1;
    if (!import.meta.env.DEV || renderCount.current <= 1) {
      return;
    }
    // Track re-renders after mount
    const label = `${componentName}:render-${renderCount.current}`;
    startMeasure(label);
    return () => {
      endMeasure(label, false);
    };
  });
}

/**
 * Hook to measure an async effect
 */
export function useMeasuredEffect(
  name: string,
  effect: () => Promise<void> | void,
  deps: React.DependencyList
): void {
  useEffect(() => {
    const run = async () => {
      startMeasure(name);
      await effect();
      endMeasure(name, import.meta.env.DEV);
    };
    void run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

/**
 * Hook that returns measurement utilities bound to a component
 */
export function useComponentMeasurer(componentName: string): {
  measure: <T>(name: string, fn: () => T) => T;
  measureAsync: <T>(name: string, fn: () => Promise<T>) => Promise<T>;
} {
  return createMeasurer(componentName);
}

/**
 * Hook to track and warn about excessive re-renders
 */
export function useRenderCount(componentName: string, warnThreshold = 10): number {
  const renderCount = useRef(0);
  const lastResetTime = useRef(Date.now());

  renderCount.current += 1;

  // Reset counter every 5 seconds
  if (Date.now() - lastResetTime.current > 5000) {
    if (import.meta.env.DEV && renderCount.current > warnThreshold) {
      console.warn(
        `[Perf] ${componentName} rendered ${renderCount.current} times in 5 seconds`
      );
    }
    renderCount.current = 1;
    lastResetTime.current = Date.now();
  }

  return renderCount.current;
}

/**
 * Hook to monitor memory usage (development only)
 * Returns current memory stats or null if unavailable
 */
export function useMemoryMonitor(
  intervalMs = 5000
): { usedMB: number; totalMB: number } | null {
  const [memoryStats, setMemoryStats] = useState<{ usedMB: number; totalMB: number } | null>(null);

  useEffect(() => {
    if (!import.meta.env.DEV) return;

    const checkMemory = () => {
      const memory = getMemoryUsage();
      if (memory) {
        setMemoryStats({
          usedMB: Math.round(memory.usedJSHeapSize / 1024 / 1024),
          totalMB: Math.round(memory.totalJSHeapSize / 1024 / 1024),
        });
      }
    };

    checkMemory();
    const intervalId = setInterval(checkMemory, intervalMs);

    return () => clearInterval(intervalId);
  }, [intervalMs]);

  return memoryStats;
}

/**
 * Hook to create a debounced callback that measures its execution
 */
export function useMeasuredCallback<T extends (...args: unknown[]) => unknown>(
  callback: T,
  name: string,
  deps: React.DependencyList
): T {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useCallback(
    ((...args) => {
      startMeasure(name);
      const result = callback(...args);
      endMeasure(name, import.meta.env.DEV);
      return result;
    }) as T,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    deps
  );
}

/**
 * Re-export the Profiler onRender callback for convenience
 */
export { onRenderCallback };
