export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;

  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null;
      func(...args);
    };

    if (timeout) {
      clearTimeout(timeout);
    }
    
    timeout = setTimeout(later, wait);
  };
}

/**
 * Creates a throttled function that only invokes the provided function
 * at most once per specified interval.
 */
export function throttle<T extends (...args: any[]) => void>(
  func: T,
  limit: number
): T {
  let inThrottle = false;
  let lastArgs: Parameters<T> | null = null;

  return function(this: any, ...args: Parameters<T>) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => {
        inThrottle = false;
        if (lastArgs) {
          func.apply(this, lastArgs);
          lastArgs = null;
        }
      }, limit);
    } else {
      lastArgs = args;
    }
  } as T;
}

/**
 * Creates a function that can only be called once until it completes (for async functions).
 * Prevents duplicate concurrent calls.
 */
export function singleFlight<T extends (...args: any[]) => Promise<any>>(
  func: T
): T {
  let inFlight: Promise<any> | null = null;

  return ((...args: Parameters<T>) => {
    if (inFlight) {
      console.log('Skipping duplicate call - previous call still in flight');
      return inFlight;
    }
    inFlight = func(...args).finally(() => {
      inFlight = null;
    });
    return inFlight;
  }) as T;
}
