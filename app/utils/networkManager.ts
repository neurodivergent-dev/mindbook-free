// NetworkManager.ts - Handles network connectivity state management
// This utility provides robust network state detection with debouncing to prevent UI flickering
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const NETWORK_STATE_KEY = '@network_state';

// Network state with additional metadata
export interface EnhancedNetworkState {
  isConnected: boolean;
  lastChecked: number;
  connectionType?: string | null;
  isInternetReachable?: boolean | null;
  effectivelyConnected: boolean; // New property to track actual internet connectivity
}

// Default timeout for network operations when offline (to fail fast)
export const DEFAULT_OFFLINE_TIMEOUT = 3000; // 3 seconds

// Cache the network state to reduce direct NetInfo calls
let cachedNetworkState: EnhancedNetworkState = {
  isConnected: true, // Assume connected by default until we know otherwise
  lastChecked: Date.now(),
  connectionType: null,
  isInternetReachable: null,
  effectivelyConnected: true, // Assume effectively connected by default
};

// List of listeners to notify when network state changes
const listeners: Array<(state: EnhancedNetworkState) => void> = [];

// Track failed connectivity checks to determine effective connectivity
let consecutiveReachabilityFailures = 0;
const MAX_REACHABILITY_FAILURES = 2; // Number of consecutive failures before considering disconnected

/**
 * Initialize the network manager
 * This should be called early in the app lifecycle
 */
export const initNetworkManager = async () => {
  // Try to restore last known network state from storage
  try {
    const storedState = await AsyncStorage.getItem(NETWORK_STATE_KEY);
    if (storedState) {
      const parsedState = JSON.parse(storedState);
      // Only use stored state if it's recent (within last 5 minutes)
      if (Date.now() - parsedState.lastChecked < 5 * 60 * 1000) {
        cachedNetworkState = parsedState;
      }
    }
  } catch (error) {
    console.error('Error loading stored network state:', error);
  }

  // Subscribe to network changes with debouncing to avoid rapid state changes
  let debounceTimeout: NodeJS.Timeout | null = null;
  let lastStateChange = Date.now();

  // Setup ongoing listener
  NetInfo.addEventListener(state => {
    // Clear any pending debounce
    if (debounceTimeout) {
      clearTimeout(debounceTimeout);
    }

    // Debounce network changes to prevent rapid toggling
    // Only if it's been at least 2 seconds since last change
    const debounceTime = Date.now() - lastStateChange < 2000 ? 1000 : 200;

    debounceTimeout = setTimeout(() => {
      updateNetworkState(state);
      lastStateChange = Date.now();
    }, debounceTime);
  });

  // Perform initial check
  const initialState = await NetInfo.fetch();
  updateNetworkState(initialState);

  // Set up reachability probe to periodically check actual connectivity
  startReachabilityProbe();
};

/**
 * Start a periodic probe to check actual internet reachability beyond just the connection state
 */
const startReachabilityProbe = () => {
  // Check reachability every 10 seconds
  setInterval(async () => {
    try {
      // This timeout is intentionally short to quickly fail when connection is poor
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch('https://www.google.com/generate_204', {
        method: 'HEAD',
        signal: controller.signal,
        cache: 'no-store',
      });

      clearTimeout(timeoutId);

      if (response.status === 204) {
        // Success - reset failures counter
        consecutiveReachabilityFailures = 0;

        // Only update if current state is false to avoid unnecessary updates
        if (!cachedNetworkState.effectivelyConnected) {
          const updatedState = {
            ...cachedNetworkState,
            effectivelyConnected: true,
            isInternetReachable: true,
          };
          cachedNetworkState = updatedState;
          notifyListeners();
        }
      } else {
        handleReachabilityFailure();
      }
    } catch (error) {
      handleReachabilityFailure();
    }
  }, 10000);
};

/**
 * Handle a reachability check failure
 */
const handleReachabilityFailure = () => {
  consecutiveReachabilityFailures++;

  // If we've had multiple consecutive failures, consider effectively disconnected
  if (
    consecutiveReachabilityFailures >= MAX_REACHABILITY_FAILURES &&
    cachedNetworkState.effectivelyConnected
  ) {
    const updatedState = {
      ...cachedNetworkState,
      effectivelyConnected: false,
      isInternetReachable: false,
    };
    cachedNetworkState = updatedState;
    notifyListeners();
  }
};

/**
 * Notify all listeners of the current state
 */
const notifyListeners = () => {
  listeners.forEach(listener => listener(cachedNetworkState));

  // Store in AsyncStorage for persistence
  AsyncStorage.setItem(NETWORK_STATE_KEY, JSON.stringify(cachedNetworkState)).catch(error => {
    console.error('Error storing network state:', error);
  });
};

/**
 * Update the network state and notify listeners
 */
const updateNetworkState = (state: NetInfoState) => {
  // Determine effective connectivity based on both connection state and reachability
  const isEffectivelyConnected = !!(
    state.isConnected &&
    // If isInternetReachable is explicitly false, we know connection is bad
    // If it's null/undefined, rely on our reachability probe track record
    state.isInternetReachable !== false &&
    (state.isInternetReachable === true ||
      consecutiveReachabilityFailures < MAX_REACHABILITY_FAILURES)
  );

  const enhancedState: EnhancedNetworkState = {
    isConnected: !!state.isConnected,
    lastChecked: Date.now(),
    connectionType: state.type,
    isInternetReachable: state.isInternetReachable,
    effectivelyConnected: isEffectivelyConnected,
  };

  // Update cached state
  cachedNetworkState = enhancedState;

  // Notify listeners
  notifyListeners();
};

/**
 * Get the current network state
 */
export const getNetworkState = (): EnhancedNetworkState => {
  return cachedNetworkState;
};

/**
 * Force a network state refresh and return the updated state
 */
export const refreshNetworkState = async (): Promise<EnhancedNetworkState> => {
  const state = await NetInfo.fetch();
  updateNetworkState(state);
  return cachedNetworkState;
};

/**
 * Subscribe to network state changes
 * @returns Unsubscribe function
 */
export const subscribeToNetworkChanges = (
  callback: (state: EnhancedNetworkState) => void
): (() => void) => {
  listeners.push(callback);
  // Immediately notify with current state
  callback(cachedNetworkState);

  // Return unsubscribe function
  return () => {
    const index = listeners.indexOf(callback);
    if (index !== -1) {
      listeners.splice(index, 1);
    }
  };
};

/**
 * React hook for using network state in components
 */
export const useNetworkState = () => {
  const [networkState, setNetworkState] = useState<EnhancedNetworkState>(cachedNetworkState);

  useEffect(() => {
    const unsubscribe = subscribeToNetworkChanges(setNetworkState);
    return unsubscribe;
  }, []);

  return networkState;
};

/**
 * Wrap a function with timeout handling for network operations
 * This prevents hanging during connectivity issues
 */
export const withNetworkTimeout = async <T>(
  operation: () => Promise<T>,
  timeoutMs: number = DEFAULT_OFFLINE_TIMEOUT,
  fallbackValue?: T
): Promise<T> => {
  try {
    // Check for EFFECTIVE connectivity instead of just isConnected
    if (!cachedNetworkState.effectivelyConnected) {
      // If we know we're offline, fail fast with fallback
      if (fallbackValue !== undefined) {
        return fallbackValue;
      }
      throw new Error('Network is not effectively connected');
    }

    // Create a timeout promise that rejects after specified time
    const timeout = new Promise<never>((_, reject) => {
      const id = setTimeout(() => {
        clearTimeout(id);
        reject(new Error(`Operation timed out after ${timeoutMs}ms`));
      }, timeoutMs);
    });

    // Race the operation against the timeout
    return await Promise.race([operation(), timeout]);
  } catch (error) {
    if (fallbackValue !== undefined) {
      return fallbackValue;
    }
    throw error;
  }
};
