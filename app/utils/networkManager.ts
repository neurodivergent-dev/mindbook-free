// NetworkManager.ts
// Handles network connectivity state management with debouncing and reachability probes.

import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import { Platform } from 'react-native';

const NETWORK_STATE_KEY = '@network_state';

// Configurable constants
const STATE_FRESHNESS_MS = 2 * 60 * 1000; // 2 minutes
const REACHABILITY_URL = 'https://www.google.com/generate_204';
const FALLBACK_REACHABILITY_URLS = [
  'https://www.cloudflare.com/cdn-cgi/trace',
  'https://www.apple.com/library/test/success.html',
  'https://www.amazon.com/robots.txt',
  'https://www.microsoft.com/robots.txt',
];
const PROBE_INTERVAL_MS = 5_000; // 5 seconds
const PROBE_TIMEOUT_MS = 1_000; // 1 second
const CELLULAR_PROBE_TIMEOUT_MS = 1_000; // 1 second for cellular connections
const MAX_REACHABILITY_FAILURES = 2;
const CELLULAR_MAX_REACHABILITY_FAILURES = 1; // More strict for cellular

export interface EnhancedNetworkState {
  isConnected: boolean;
  lastChecked: number;
  connectionType: string | null;
  isInternetReachable: boolean | null;
  effectivelyConnected: boolean;
}

export const DEFAULT_OFFLINE_TIMEOUT = 1_000; // 1 second

let cachedNetworkState: EnhancedNetworkState = {
  isConnected: true,
  lastChecked: Date.now(),
  connectionType: null,
  isInternetReachable: null,
  effectivelyConnected: true,
};

const listeners: Array<(state: EnhancedNetworkState) => void> = [];

let consecutiveReachabilityFailures = 0;

let unsubscribeNetInfo: (() => void) | null = null;
let reachabilityIntervalId: ReturnType<typeof setInterval> | null = null;

/**
 * Initialize the network manager.
 * Call this once early in the app lifecycle.
 */
export const initNetworkManager = async () => {
  // Parallelize storage fetch and initial NetInfo.fetch()
  const [storedStateStr, currentState] = await Promise.all([
    AsyncStorage.getItem(NETWORK_STATE_KEY).catch(() => null),
    NetInfo.fetch(),
  ]);

  // Restore cached state if it's fresh
  if (storedStateStr) {
    try {
      const parsed: EnhancedNetworkState = JSON.parse(storedStateStr);
      if (Date.now() - parsed.lastChecked < STATE_FRESHNESS_MS) {
        cachedNetworkState = parsed;
      }
    } catch (err) {
      console.error('Failed to parse stored network state:', err);
    }
  }

  // Immediately update with the fetched state
  updateNetworkState(currentState);

  // Set up debounced listener
  let debounceTimeout: ReturnType<typeof setTimeout> | null = null;
  let lastStateChange = Date.now();

  unsubscribeNetInfo = NetInfo.addEventListener(state => {
    if (debounceTimeout) clearTimeout(debounceTimeout);

    const debounceDelay = Date.now() - lastStateChange < 1_000 ? 500 : 100;

    debounceTimeout = setTimeout(() => {
      updateNetworkState(state);
      lastStateChange = Date.now();
    }, debounceDelay);
  });

  // Start reachability probes
  startReachabilityProbe(true);
};

/**
 * Clean up listeners and intervals to avoid memory leaks.
 */
export const cleanupNetworkManager = () => {
  if (unsubscribeNetInfo) {
    unsubscribeNetInfo();
    unsubscribeNetInfo = null;
  }
  if (reachabilityIntervalId !== null) {
    clearInterval(reachabilityIntervalId);
    reachabilityIntervalId = null;
  }
};

/**
 * Start periodic reachability checks.
 * @param immediate Run the first check immediately if true.
 */
const startReachabilityProbe = (immediate = false) => {
  const checkReachability = async () => {
    try {
      const isCellular = cachedNetworkState.connectionType === 'cellular';
      const timeoutDuration = isCellular ? CELLULAR_PROBE_TIMEOUT_MS : PROBE_TIMEOUT_MS;

      // Try primary reachability URL
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeoutDuration);

        const response = await fetch(REACHABILITY_URL, {
          method: 'HEAD',
          signal: controller.signal,
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            Pragma: 'no-cache',
            Expires: '0',
          },
        });

        clearTimeout(timeoutId);

        if (response.status === 204) {
          handleReachabilitySuccess();
          return;
        }
      } catch (primaryError) {
        console.log('Primary reachability check failed, trying fallbacks...');
      }

      // If primary fails, try fallbacks in parallel for faster response
      try {
        const results = await Promise.race([
          ...FALLBACK_REACHABILITY_URLS.map(url => {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), timeoutDuration);

            return fetch(url, {
              method: 'HEAD',
              cache: 'no-store',
              headers: {
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                Pragma: 'no-cache',
                Expires: '0',
              },
              signal: controller.signal,
            })
              .then(response => {
                clearTimeout(timeoutId);
                return { success: response.status >= 200 && response.status < 400 };
              })
              .catch(() => {
                clearTimeout(timeoutId);
                return { success: false };
              });
          }),
          // Add a timeout promise that resolves after all URLs should have been tried
          new Promise<{ success: boolean }>(resolve =>
            setTimeout(() => resolve({ success: false }), timeoutDuration * 1.5)
          ),
        ]);

        if (results.success) {
          handleReachabilitySuccess();
          return;
        }
      } catch (error) {
        // All fallbacks failed or timed out
      }

      // If we reach here, all checks failed
      handleReachabilityFailure();
    } catch (err: any) {
      if (err.name === 'AbortError') {
        console.warn('Reachability probe timed out');
      } else {
        console.error('Reachability probe error:', err);
      }
      handleReachabilityFailure();
    }
  };

  if (immediate) checkReachability();
  reachabilityIntervalId = setInterval(checkReachability, PROBE_INTERVAL_MS);
};

/**
 * Handle successful reachability probe.
 */
const handleReachabilitySuccess = () => {
  consecutiveReachabilityFailures = 0;
  if (!cachedNetworkState.effectivelyConnected) {
    cachedNetworkState = {
      ...cachedNetworkState,
      effectivelyConnected: true,
      isInternetReachable: true,
    };
    notifyListeners();
  }
};

/**
 * Handle reachability probe failures.
 */
const handleReachabilityFailure = () => {
  consecutiveReachabilityFailures++;

  // Different thresholds for different connection types
  const maxFailures =
    cachedNetworkState.connectionType === 'cellular'
      ? CELLULAR_MAX_REACHABILITY_FAILURES
      : MAX_REACHABILITY_FAILURES;

  if (consecutiveReachabilityFailures >= maxFailures && cachedNetworkState.effectivelyConnected) {
    cachedNetworkState = {
      ...cachedNetworkState,
      effectivelyConnected: false,
      isInternetReachable: false,
    };
    notifyListeners();
  }
};

/**
 * Notify all subscribers and persist the current network state.
 */
const notifyListeners = () => {
  listeners.forEach(fn => fn(cachedNetworkState));
  AsyncStorage.setItem(NETWORK_STATE_KEY, JSON.stringify(cachedNetworkState)).catch(err => {
    console.error('Failed to store network state:', err);
  });
};

/**
 * Update the cached network state based on a NetInfoState.
 */
const updateNetworkState = (state: NetInfoState) => {
  const isCellular = state.type === 'cellular';
  const isLTE =
    isCellular &&
    ['4g', '5g', '4g+', 'lte', 'lte+'].includes(
      (state.details?.cellularGeneration || '').toLowerCase()
    );

  // Special handling for cellular connections that report connected but have no data
  if (isCellular) {
    // If we're on cellular and isInternetReachable is explicitly false
    if (state.isInternetReachable === false) {
      cachedNetworkState = {
        isConnected: false,
        lastChecked: Date.now(),
        connectionType: state.type,
        isInternetReachable: false,
        effectivelyConnected: false,
      };
      notifyListeners();
      return;
    }

    // If we're on 4G/5G but isInternetReachable is null (unknown), perform an additional check
    if (isLTE && state.isInternetReachable === null) {
      // Start a reachability probe immediately
      startReachabilityProbe(true);

      // If we already have consecutive failures, consider as offline
      if (consecutiveReachabilityFailures >= CELLULAR_MAX_REACHABILITY_FAILURES) {
        cachedNetworkState = {
          isConnected: true, // Device thinks it's connected
          lastChecked: Date.now(),
          connectionType: state.type,
          isInternetReachable: false, // But we know better
          effectivelyConnected: false,
        };
        notifyListeners();
        return;
      }
    }

    // For cellular connections on Android, be more aggressive with probing
    if (Platform.OS === 'android' && isLTE) {
      startReachabilityProbe(true);
    }
  }

  // Standard connectivity determination
  const isEffectively =
    !!state.isConnected &&
    state.isInternetReachable !== false &&
    (state.isInternetReachable === true ||
      (!isCellular && consecutiveReachabilityFailures < MAX_REACHABILITY_FAILURES) ||
      (isCellular && consecutiveReachabilityFailures === 0)); // More strict for cellular

  cachedNetworkState = {
    isConnected: !!state.isConnected,
    lastChecked: Date.now(),
    connectionType: state.type,
    isInternetReachable: state.isInternetReachable,
    effectivelyConnected: isEffectively,
  };

  notifyListeners();
};

/**
 * Get the current network state.
 */
export const getNetworkState = () => cachedNetworkState;

/**
 * Force a network state refresh and return the updated state.
 */
export const refreshNetworkState = async () => {
  const state = await NetInfo.fetch();
  updateNetworkState(state);
  return cachedNetworkState;
};

/**
 * Subscribe to network state changes. Returns an unsubscribe function.
 */
export const subscribeToNetworkChanges = (callback: (state: EnhancedNetworkState) => void) => {
  listeners.push(callback);
  callback(cachedNetworkState);
  return () => {
    const idx = listeners.indexOf(callback);
    if (idx !== -1) listeners.splice(idx, 1);
  };
};

/**
 * React hook for components to consume network state.
 */
export const useNetworkState = () => {
  const [state, setState] = useState<EnhancedNetworkState>(cachedNetworkState);
  useEffect(() => subscribeToNetworkChanges(setState), []);
  return state;
};

/**
 * Wrap an async operation with a network-based timeout.
 * If there's no effective connection, fails fast or returns fallback.
 * For cellular connections, it will attempt the operation with a shorter timeout.
 */
export const withNetworkTimeout = async <T>(
  operation: () => Promise<T>,
  timeoutMs: number = DEFAULT_OFFLINE_TIMEOUT,
  fallback?: T
): Promise<T> => {
  // If we're definitely offline, fail fast or return fallback
  if (!cachedNetworkState.effectivelyConnected) {
    if (fallback !== undefined) return fallback;
    throw new Error('No network connection');
  }

  // For cellular connections, use a shorter timeout
  const actualTimeout =
    cachedNetworkState.connectionType === 'cellular'
      ? Math.min(timeoutMs, 5000) // Max 5 seconds for cellular
      : timeoutMs;

  const timeout = new Promise<never>((_, reject) => {
    const id = setTimeout(() => {
      clearTimeout(id);
      reject(new Error(`Operation timed out after ${actualTimeout}ms`));
    }, actualTimeout);
  });

  try {
    return await Promise.race([operation(), timeout]);
  } catch (err) {
    // If the operation fails on cellular, check if we need to update connectivity state
    if (cachedNetworkState.connectionType === 'cellular') {
      consecutiveReachabilityFailures++;
      if (consecutiveReachabilityFailures >= CELLULAR_MAX_REACHABILITY_FAILURES) {
        cachedNetworkState = {
          ...cachedNetworkState,
          effectivelyConnected: false,
          isInternetReachable: false,
        };
        notifyListeners();
      }
    }

    if (fallback !== undefined) return fallback;
    throw err;
  }
};

/**
 * Checks if the device is effectively offline and forces an immediate network state update if needed.
 * This is useful for critical operations that need the most up-to-date network status.
 *
 * @returns A promise that resolves to true if the device is offline, false otherwise
 */
export const checkAndUpdateOfflineStatus = async (): Promise<boolean> => {
  // First check the cached state
  if (!cachedNetworkState.effectivelyConnected) {
    return true; // We already know we're offline
  }

  // Force a network state refresh
  const state = await NetInfo.fetch();
  updateNetworkState(state);

  // If we're on cellular, do an additional reachability check
  if (state.type === 'cellular') {
    try {
      // Try a quick fetch with a short timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 1500); // Short timeout

      const response = await fetch(REACHABILITY_URL, {
        method: 'HEAD',
        signal: controller.signal,
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          Pragma: 'no-cache',
          Expires: '0',
        },
      });

      clearTimeout(timeoutId);

      if (response.status !== 204) {
        // Non-success response, likely offline
        handleReachabilityFailure();
        return !cachedNetworkState.effectivelyConnected;
      }

      // Success, we're online
      handleReachabilitySuccess();
      return false;
    } catch (error) {
      // Error making the request, likely offline
      handleReachabilityFailure();
      return true;
    }
  }

  return !cachedNetworkState.effectivelyConnected;
};
