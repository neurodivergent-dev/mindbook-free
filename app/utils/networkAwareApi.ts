// networkAwareApi.ts - Provides network-aware API request wrappers
// This utility prevents UI freezes during network operations and handles offline state gracefully
import { getNetworkState, withNetworkTimeout } from './networkManager';
import { OfflineService } from '../services/offline';

// Default timeout for API requests
const DEFAULT_API_TIMEOUT = 10000; // 10 seconds

/**
 * Network-aware fetch implementation
 * Wraps the native fetch with timeout handling and offline awareness
 */
export const networkAwareFetch = async (
  url: string,
  options: RequestInit = {},
  timeoutMs: number = DEFAULT_API_TIMEOUT,
  offlineQueueConfig?: {
    type: 'create' | 'update' | 'delete';
    entity: string;
    data: any;
  }
): Promise<Response> => {
  try {
    // Check if we're effectively offline
    const { effectivelyConnected } = getNetworkState();

    // If we're offline and have offline queue config, queue the operation
    if (!effectivelyConnected && offlineQueueConfig) {
      await OfflineService.queueOperation({
        ...offlineQueueConfig,
      });

      // Throw a specific offline error
      throw new Error('Operation queued for offline mode');
    }

    // Execute the fetch with a timeout
    return await withNetworkTimeout<Response>(async () => {
      const response = await fetch(url, {
        ...options,
        // Add a cache-busting parameter to prevent stale responses
        headers: {
          ...options.headers,
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          Pragma: 'no-cache',
          Expires: '0',
        },
      });

      // Check if the response indicates a network problem
      if (!response.ok && (response.status === 0 || response.status >= 500)) {
        throw new Error(`Network error: ${response.status}`);
      }

      return response;
    }, timeoutMs);
  } catch (error) {
    // If we have offline queue config, try to queue the operation
    if (
      offlineQueueConfig &&
      error instanceof Error &&
      !error.message.includes('queued for offline')
    ) {
      await OfflineService.queueOperation({
        ...offlineQueueConfig,
      });
    }

    throw error;
  }
};

/**
 * Convenience wrapper for GET requests
 */
export const networkAwareGet = async (
  url: string,
  options: Omit<RequestInit, 'method'> = {},
  timeoutMs: number = DEFAULT_API_TIMEOUT
): Promise<Response> => {
  return networkAwareFetch(
    url,
    {
      ...options,
      method: 'GET',
    },
    timeoutMs
  );
};

/**
 * Convenience wrapper for POST requests with offline queueing
 */
export const networkAwarePost = async (
  url: string,
  data: any,
  entity: string,
  options: Omit<RequestInit, 'method' | 'body'> = {},
  timeoutMs: number = DEFAULT_API_TIMEOUT
): Promise<Response> => {
  return networkAwareFetch(
    url,
    {
      ...options,
      method: 'POST',
      body: JSON.stringify(data),
      headers: {
        ...options.headers,
        'Content-Type': 'application/json',
      },
    },
    timeoutMs,
    {
      type: 'create',
      entity,
      data,
    }
  );
};

/**
 * Convenience wrapper for PUT requests with offline queueing
 */
export const networkAwarePut = async (
  url: string,
  data: any,
  entity: string,
  options: Omit<RequestInit, 'method' | 'body'> = {},
  timeoutMs: number = DEFAULT_API_TIMEOUT
): Promise<Response> => {
  return networkAwareFetch(
    url,
    {
      ...options,
      method: 'PUT',
      body: JSON.stringify(data),
      headers: {
        ...options.headers,
        'Content-Type': 'application/json',
      },
    },
    timeoutMs,
    {
      type: 'update',
      entity,
      data,
    }
  );
};

/**
 * Convenience wrapper for DELETE requests with offline queueing
 */
export const networkAwareDelete = async (
  url: string,
  entity: string,
  id: string,
  options: Omit<RequestInit, 'method'> = {},
  timeoutMs: number = DEFAULT_API_TIMEOUT
): Promise<Response> => {
  return networkAwareFetch(
    url,
    {
      ...options,
      method: 'DELETE',
    },
    timeoutMs,
    {
      type: 'delete',
      entity,
      data: { id },
    }
  );
};
