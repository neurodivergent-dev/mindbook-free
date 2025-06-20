import supabase from './supabase';
import NetInfo from '@react-native-community/netinfo';

import { executeNetworkSafe } from './networkSafeOperations';

// Default timeout for Supabase operations (ms)
const DEFAULT_TIMEOUT = 5000;

/**
 * Network-safe wrapper for Supabase auth.getSession
 * Returns a cached session if offline or times out
 */
export async function safeGetSession(timeoutMs = DEFAULT_TIMEOUT): Promise<{
  data: any;
  error: any;
}> {
  return executeNetworkSafe(() => supabase.auth.getSession(), {
    timeoutMs,
    offlineFallback: { data: null, error: new Error('Offline or timeout') },
    debug: __DEV__,
  });
}

/**
 * Network-safe wrapper for Supabase auth.setSession
 * Prevents blocking indefinitely when offline
 */
export async function safeSetSession(
  { access_token, refresh_token }: { access_token: string; refresh_token: string },
  timeoutMs = DEFAULT_TIMEOUT
): Promise<{
  data: any;
  error: any;
}> {
  return executeNetworkSafe(() => supabase.auth.setSession({ access_token, refresh_token }), {
    timeoutMs,
    offlineFallback: { data: null, error: new Error('Offline or timeout') },
    debug: __DEV__,
  });
}

/**
 * Network-safe wrapper for Supabase auth.getUser
 */
export async function safeGetUser(timeoutMs = DEFAULT_TIMEOUT): Promise<{
  data: any;
  error: any;
}> {
  return executeNetworkSafe(() => supabase.auth.getUser(), {
    timeoutMs,
    offlineFallback: { data: null, error: new Error('Offline or timeout') },
    debug: __DEV__,
  });
}

/**
 * Network-safe wrapper for Supabase auth.signInWithPassword
 */
export async function safeSignInWithPassword(
  credentials: { email: string; password: string },
  timeoutMs = DEFAULT_TIMEOUT
): Promise<{
  data: any;
  error: any;
}> {
  return executeNetworkSafe(() => supabase.auth.signInWithPassword(credentials), {
    timeoutMs,
    offlineFallback: { data: null, error: new Error('Cannot sign in while offline') },
    debug: __DEV__,
  });
}

/**
 * Network-safe wrapper for Supabase auth.signOut
 */
export async function safeSignOut(timeoutMs = DEFAULT_TIMEOUT): Promise<{
  error: any;
}> {
  return executeNetworkSafe(() => supabase.auth.signOut(), {
    timeoutMs,
    offlineFallback: { error: null }, // Allow sign-out while offline
    debug: __DEV__,
  });
}

/**
 * Check if the device has internet connectivity
 */
export async function checkConnectivity(): Promise<boolean> {
  try {
    const networkState = await NetInfo.fetch();
    return !!(networkState.isConnected && networkState.isInternetReachable);
  } catch (error) {
    console.error('Error checking connectivity:', error);
    return false;
  }
}

/**
 * Safe Supabase utilities for offline-first approach
 */
export const safeSupabase = {
  auth: {
    getSession: safeGetSession,
    setSession: safeSetSession,
    getUser: safeGetUser,
    signInWithPassword: safeSignInWithPassword,
    signOut: safeSignOut,
  },
  checkConnectivity,
};

export default safeSupabase;
