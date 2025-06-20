import React, { useEffect, useRef, useState } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { safeSupabase } from '../utils/safeSupabase';

interface Props {
  onSessionRefreshed?: () => void;
  children: React.ReactNode;
}

/**
 * Component that handles session refresh based on both AppState and network changes.
 * This is a more resilient approach to session management in offline scenarios.
 */
const NetworkAwareSessionHandler: React.FC<Props> = ({ onSessionRefreshed, children }) => {
  const appState = useRef(AppState.currentState);
  const [appStateVisible, setAppStateVisible] = useState(appState.current);
  const lastRefreshAttempt = useRef<number>(Date.now());
  const refreshInProgress = useRef(false);
  const pendingRefresh = useRef(false);

  // Debounce session refresh to prevent excessive calls
  const MIN_REFRESH_INTERVAL = 1000; // 10 saniyeden 1 saniyeye düşürüldü

  // Track network state
  const [isConnected, setIsConnected] = useState(true);

  // Handle network state changes
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      const newConnected = !!(state.isConnected && state.isInternetReachable);

      // If we're transitioning from offline to online
      if (!isConnected && newConnected) {
        console.log('Network reconnected, checking session state');
        refreshSessionIfNeeded();
      }

      setIsConnected(newConnected);
    });

    // Initial network check
    NetInfo.fetch().then(state => {
      setIsConnected(!!(state.isConnected && state.isInternetReachable));
    });

    return () => {
      unsubscribe();
    };
  }, [isConnected]);

  // Handle AppState changes
  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextAppState => {
      // When the app comes to the foreground
      if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
        console.log('App has come to the foreground');
        refreshSessionIfNeeded();
      }

      appState.current = nextAppState;
      setAppStateVisible(appState.current);
    });

    return () => {
      subscription.remove();
    };
  }, []);

  /**
   * Safe function to refresh session
   * - Checks network connectivity first
   * - Debounces frequent calls
   * - Prevents overlapping refreshes
   * - Handles failure gracefully
   */
  const refreshSessionIfNeeded = async () => {
    // Skip if not connected
    if (!isConnected) {
      console.log('Skipping session refresh - device offline');
      pendingRefresh.current = true;
      return;
    }

    // Debounce frequent refreshes
    const now = Date.now();
    if (now - lastRefreshAttempt.current < MIN_REFRESH_INTERVAL) {
      console.log('Skipping session refresh - too soon after last attempt');
      pendingRefresh.current = true;
      return;
    }

    // Prevent overlapping refreshes
    if (refreshInProgress.current) {
      console.log('Session refresh already in progress');
      pendingRefresh.current = true;
      return;
    }

    try {
      refreshInProgress.current = true;
      lastRefreshAttempt.current = now;

      // Get the stored session
      const storedSession = await AsyncStorage.getItem('userSession');
      if (!storedSession) {
        console.log('No stored session to refresh');
        refreshInProgress.current = false;
        return;
      }

      const sessionData = JSON.parse(storedSession);

      if (sessionData.isGuestMode) {
        console.log('Guest mode active, no session to refresh');
        refreshInProgress.current = false;
        return;
      }

      if (!sessionData.access_token || !sessionData.refresh_token) {
        console.log('Invalid session tokens');
        refreshInProgress.current = false;
        return;
      }

      // Safe session refresh with timeout
      console.log('Attempting to refresh session');
      const { data, error } = await safeSupabase.auth.setSession({
        access_token: sessionData.access_token,
        refresh_token: sessionData.refresh_token,
      });

      if (error) {
        // Missing token errors are expected when offline
        if (!error.message.includes('Refresh Token Not Found')) {
          console.error('Session refresh failed:', error.message);
        }
        refreshInProgress.current = false;
        return;
      }

      if (data?.session) {
        // Update stored session
        await AsyncStorage.setItem(
          'userSession',
          JSON.stringify({
            isLoggedIn: true,
            isAnonymous: false,
            email: data.session.user.email,
            isGuestMode: false,
            access_token: data.session.access_token,
            refresh_token: data.session.refresh_token,
            timestamp: new Date().toISOString(),
            user_id: data.session.user.id,
          })
        );

        console.log('Session refreshed successfully');

        // Notify parent if needed
        if (onSessionRefreshed) {
          onSessionRefreshed();
        }
      }
    } catch (error) {
      console.error('Error during session refresh:', error);
    } finally {
      refreshInProgress.current = false;

      // If a refresh was requested while we were refreshing, try again
      if (pendingRefresh.current) {
        pendingRefresh.current = false;

        // Add a small delay to prevent immediate retry
        setTimeout(() => {
          refreshSessionIfNeeded();
        }, 1000);
      }
    }
  };

  // Component doesn't render anything additional
  return <>{children}</>;
};

export default NetworkAwareSessionHandler;
