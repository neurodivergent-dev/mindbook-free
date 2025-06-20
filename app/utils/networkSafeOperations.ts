import NetInfo from '@react-native-community/netinfo';
import { withTimeout } from './withTimeout';

export interface NetworkSafeOperationOptions {
  /** Timeout in milliseconds */
  timeoutMs?: number;
  /** Default value to return if offline */
  offlineFallback?: any;
  /** Whether to throw an error if offline (default: false) */
  throwIfOffline?: boolean;
  /** Additional connectivity check before execution */
  checkConnectivity?: boolean;
  /** Whether to log details of the operation */
  debug?: boolean;
}

/**
 * Safely executes a network operation with connectivity checks and timeouts.
 *
 * @param operation The async operation to execute
 * @param options Configuration options
 * @returns Result of the operation or fallback value
 */
export async function executeNetworkSafe<T>(
  operation: () => Promise<T>,
  options: NetworkSafeOperationOptions = {}
): Promise<T> {
  const {
    timeoutMs = 5000,
    offlineFallback = undefined,
    throwIfOffline = false,
    checkConnectivity = true,
    debug = true,
  } = options;

  // Check network connectivity if needed
  if (checkConnectivity) {
    try {
      const networkState = await NetInfo.fetch();
      const isConnected = networkState.isConnected && networkState.isInternetReachable;

      if (!isConnected) {
        if (debug) {
          console.log('[NetworkSafe] Device is offline, using fallback');
          console.log(`[NetworkSafe] Network state: ${JSON.stringify(networkState)}`);
        }

        if (throwIfOffline) {
          throw new Error('Network operation failed: device is offline');
        }

        return offlineFallback as T;
      }
    } catch (error) {
      if (debug) {
        console.error('[NetworkSafe] Error checking connectivity:', error);
      }

      if (throwIfOffline) {
        throw new Error('Network operation failed: could not check connectivity');
      }

      return offlineFallback as T;
    }
  }

  // Execute operation with timeout
  try {
    if (debug) {
      console.log(`[NetworkSafe] Executing operation with ${timeoutMs}ms timeout`);
    }

    const result = await withTimeout(operation(), timeoutMs);
    return result;
  } catch (error) {
    if (debug) {
      console.error('[NetworkSafe] Operation failed:', error);

      // More detailed error information
      if (error instanceof Error) {
        console.error(`[NetworkSafe] Error name: ${error.name}, message: ${error.message}`);
        console.error(`[NetworkSafe] Error stack: ${error.stack}`);
      }
    }

    // Check if the error is timeout-related
    const isTimeoutError =
      error instanceof Error &&
      (error.message.includes('timeout') || error.message.includes('Timeout'));

    // If this is a timeout error but the device might still be online
    // (just slow connection), do an additional connectivity check
    if (isTimeoutError) {
      try {
        const networkState = await NetInfo.fetch();
        const isConnected = networkState.isConnected && networkState.isInternetReachable;

        if (!isConnected && debug) {
          console.log('[NetworkSafe] Timeout occurred and device appears to be offline');
          console.log(`[NetworkSafe] Network state: ${JSON.stringify(networkState)}`);
        } else if (debug) {
          console.log('[NetworkSafe] Timeout occurred but device appears to be online');
          console.log(`[NetworkSafe] Network state: ${JSON.stringify(networkState)}`);
        }
      } catch (netError) {
        // Ignore errors in this additional check
        if (debug) {
          console.error('[NetworkSafe] Error during post-timeout connectivity check:', netError);
        }
      }
    }

    if (throwIfOffline) {
      throw error;
    }

    return offlineFallback as T;
  }
}

/**
 * Creates a wrapped version of a function that executes with network safety
 *
 * @param fn The function to wrap
 * @param defaultOptions Default options to apply to all calls
 * @returns A network-safe version of the function
 */
export function createNetworkSafeFunction<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  defaultOptions: NetworkSafeOperationOptions = {}
): (...args: Parameters<T>) => Promise<Awaited<ReturnType<T>>> {
  return async (...args: Parameters<T>): Promise<Awaited<ReturnType<T>>> => {
    return executeNetworkSafe(() => fn(...args), defaultOptions);
  };
}

/**
 * Creates network-safe versions of an entire API object
 *
 * @param api Object containing API methods
 * @param defaultOptions Default options to apply to all methods
 * @returns Object with network-safe versions of API methods
 */
export function createNetworkSafeAPI<T extends Record<string, unknown>>(
  api: T,
  defaultOptions: NetworkSafeOperationOptions = {}
): {
  [K in keyof T]: T[K] extends (...args: infer A) => Promise<infer R>
    ? (...args: A) => Promise<R>
    : T[K];
} {
  const result = {} as {
    [K in keyof T]: T[K] extends (...args: infer A) => Promise<infer R>
      ? (...args: A) => Promise<R>
      : T[K];
  };

  for (const key in api) {
    if (typeof api[key] === 'function') {
      result[key] = createNetworkSafeFunction(api[key] as any, defaultOptions) as any;
    } else {
      result[key] = api[key] as any;
    }
  }

  return result;
}
