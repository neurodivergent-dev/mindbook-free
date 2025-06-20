// This utility file contains functions for authentication using Supabase and Google OAuth.
// It includes functions for signing up, signing in, signing out, and handling Google authentication.
// It also manages user sessions and guest mode functionality.
// It is designed to work with React Native and Expo, ensuring compatibility across platforms.
// The code uses AsyncStorage for local storage and WebBrowser for handling authentication sessions.
import supabase from './supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import Constants from 'expo-constants';
import NetInfo from '@react-native-community/netinfo';
import { withTimeout } from './withTimeout';

// Ensure Expo WebBrowser sessions are completed
WebBrowser.maybeCompleteAuthSession();

// Helper function that creates the most appropriate redirectTo URL for the device
export const getRedirectUrl = (path: string) => {
  // In production mode
  if (!__DEV__) {
    // Using native app scheme
    const scheme = 'mindbook';
    return `${scheme}://${path}`;
  }

  // In development mode
  try {
    // Try to work at Expo Go
    // @ts-ignore - We ignore the Constants typing issues
    let hostName = Constants.expoConfig?.extra?.expoDevHost;
    let port = Constants.expoConfig?.extra?.expoDevPort;

    // Different builds for different Expo SDK versions
    if (Constants.expoConfig) {
      // @ts-ignore - SDK 48+
      hostName = Constants.expoConfig.hostUri?.split(':')[0] || hostName;
    }

    // Then the process of getting the port
    if (Constants.expoConfig?.extra?.expoGo?.debuggerHost) {
      // @ts-ignore - SDK 48+
      port = Constants.expoConfig.extra.expoGo.debuggerHost.split(':')[1] || port;
    }

    return `exp://${hostName}:${port}/--/${path}`;
  } catch (error) {
    console.log('Error getting host URI:', error);
    // Use native URL scheme as a last resort
    return `mindbook://${path}`;
  }
};

/**
 * Retrieves current session information
 * @returns Subbase session information
 */
export const getSession = async () => {
  try {
    // First, check network connectivity
    const networkState = await NetInfo.fetch();
    const isConnected = networkState.isConnected && networkState.isInternetReachable;

    // First, let's check the session information from the local storage
    const localSession = await AsyncStorage.getItem('userSession');

    // If we're offline but have local session, use it
    if (!isConnected && localSession) {
      console.log('Using cached session (device is offline)');
      return {
        data: {
          session: JSON.parse(localSession),
        },
        error: null,
      };
    }

    // Check the Supabase session with timeout to prevent blocking
    if (isConnected) {
      try {
        return await withTimeout(supabase.auth.getSession(), 1000);
      } catch (timeoutError) {
        console.log('Session retrieval timed out:', timeoutError);

        // Fall back to stored session if available
        if (localSession) {
          return {
            data: {
              session: JSON.parse(localSession),
            },
            error: null,
          };
        }
      }
    }

    // If offline with no local session, or other error
    return { data: null, error: new Error('Cannot retrieve session') };
  } catch (e) {
    return { data: null, error: e };
  }
};

/**
 * Register with email and password
 * @param email User Email
 * @param password User Password
 * @returns Registration result
 */
export const signUp = async (email, password) => {
  // URL to be redirected after user verification
  let redirectTo;

  // In production mode
  if (!__DEV__) {
    // Using native app scheme
    redirectTo = 'mindbook://auth-callback';
  } else {
    // In development mode
    try {
      // Try to work at Expo Go
      // @ts-ignore - We ignore the Constants typing issues
      let hostName = Constants.expoConfig?.extra?.expoDevHost;
      let port = Constants.expoConfig?.extra?.expoDevPort;

      // Different builds for different Expo SDK versions
      if (Constants.expoConfig) {
        // @ts-ignore - SDK 48+
        hostName = Constants.expoConfig.hostUri?.split(':')[0] || hostName;
      }

      // Then the process of getting the port
      if (Constants.expoConfig?.extra?.expoGo?.debuggerHost) {
        // @ts-ignore - SDK 48+
        port = Constants.expoConfig.extra.expoGo.debuggerHost.split(':')[1] || port;
      }

      redirectTo = `exp://${hostName}:${port}/--/auth-callback`;
    } catch (error) {
      console.log('Error getting host URI:', error);
      // Use native URL scheme as a last resort
      redirectTo = 'mindbook://auth-callback';
    }
  }

  console.log('🔐 Redirect URL for verification email:', redirectTo);

  return await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: redirectTo,
    },
  });
};

/**
 * Login with email and password
 * @param email User Email
 * @param password User Password
 * @returns Login result
 */
export const signIn = async (email, password) => {
  return await supabase.auth.signInWithPassword({ email, password });
};

/**
 * Google sign-in function - Hook version
 * This function returns a React Hook and should be used inside React components.
 */
export const useGoogleAuth = () => {
  // Google OAuth configuration - ID'leri env'den al
  const googleWebClientId = Constants.expoConfig?.extra?.googleWebClientId;
  const googleAndroidClientId = Constants.expoConfig?.extra?.googleAndroidClientId;

  // Env değerleri yoksa uyarı logla
  if (!googleWebClientId || !googleAndroidClientId) {
    console.error('Google OAuth client IDs are missing in environment variables');
    if (__DEV__) {
      console.error(
        'Make sure your .env file contains GOOGLE_WEB_CLIENT_ID and GOOGLE_ANDROID_CLIENT_ID'
      );
    }
  }

  const [request, response, promptAsync] = Google.useAuthRequest({
    // NOTE: 'clientId' should be used instead of 'expoClientId'
    clientId: googleWebClientId,
    androidClientId: googleAndroidClientId,
    webClientId: googleWebClientId,
    // IMPORTANT: We will use proxy, so we remove redirectUri
  });

  // Start Google sign in
  const signInWithGoogle = async () => {
    if (!googleWebClientId || !googleAndroidClientId) {
      return {
        success: false,
        error: 'Google OAuth client IDs are missing. Cannot proceed with Google sign-in.',
      };
    }

    try {
      // Let's remove the useProxy parameter and make it compatible with current typings.
      const result = await promptAsync({
        // For Expo WebBrowser 12+ we use native features instead of useProxy
        showInRecents: true,
      });

      if (result.type === 'success') {
        // Get token from Google
        const { id_token, access_token } = result.params;
        console.log('Google token received:', {
          id_token_exists: !!id_token,
          access_token_exists: !!access_token,
        });

        // Exchange tokens with Supabase
        const { data, error } = await supabase.auth.signInWithIdToken({
          provider: 'google',
          token: id_token,
        });

        if (error) throw error;
        return { success: true, data };
      } else {
        return { success: false, error: 'Google login cancelled or failed' };
      }
    } catch (error) {
      // Check error.message for type safety
      const errorMessage = error instanceof Error ? error.message : 'Google login error occurred';
      return { success: false, error: errorMessage };
    }
  };

  return { signInWithGoogle, response, request };
};

/**
 * Log out
 * @returns Output result
 */
export const signOut = async () => {
  return await supabase.auth.signOut();
};

/**
 * Alternative Google sign-in method - Directly using Supabase OAuth
 * This function can be used instead of the standard signInWithGoogle
 * Works properly without linter errors
 */
export const alternativeGoogleSignIn = async () => {
  try {
    let redirectUrl;
    if (Platform.OS === 'web') {
      redirectUrl = `${window.location.origin}/auth/callback`;
    } else {
      // For the development environment, the application schema should be used instead of Expo's own schema
      // Mindbook:// scheme will be used for APK
      //redirectUrl = 'exp:/your_local_ip_address:8081';
      redirectUrl = 'mindbook://auth-callback';
    }

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectUrl,
        skipBrowserRedirect: false, // To open the browser
      },
    });

    if (error) {
      throw error;
    }

    if (Platform.OS !== 'web') {
      // Let's open the browser for mobile devices
      if (data?.url) {
        try {
          // Let's open the browser and wait
          const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUrl, {
            showInRecents: true,
          });

          // On success, parse token information from the incoming URL
          if (result.type === 'success' && result.url) {
            // Extract token information from URL (after # in URL trailer)
            const hashFragment = result.url.split('#').pop();
            if (!hashFragment) {
              throw new Error('Token information not found');
            }

            // Parse token parameters using URLSearchParams
            const params = new URLSearchParams(hashFragment);
            const accessToken = params.get('access_token');
            const expiresIn = params.get('expires_in');
            const refreshToken = params.get('refresh_token');
            const tokenType = params.get('token_type');

            console.log('Token information parsed:', {
              accessToken_exists: !!accessToken,
              expiresIn,
              refreshToken_exists: !!refreshToken,
              tokenType,
            });

            if (!accessToken) {
              throw new Error('Access token not found');
            }

            // Create a Supabase session with the parsed token
            const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });

            if (sessionError) {
              throw sessionError;
            }

            // Save user information to AsyncStorage
            if (sessionData?.session?.user) {
              await AsyncStorage.setItem(
                'userSession',
                JSON.stringify({
                  isLoggedIn: true,
                  isAnonymous: false,
                  email: sessionData.session.user.email,
                  isGuestMode: false,
                  access_token: sessionData.session.access_token,
                  refresh_token: sessionData.session.refresh_token,
                  timestamp: new Date().toISOString(),
                })
              );
            }

            return { success: true, data: sessionData };
          }

          // If the browser is not successful
          return {
            success: false,
            error: 'Google login could not be completed',
          };
        } catch (browserError) {
          return {
            success: false,
            error: 'The browser could not be opened or the operation was cancelled',
          };
        }
      }
    }

    return { success: true, data };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Google sign in failed';
    return { success: false, error: errorMessage };
  }
};

/**
 * Continue as guest
 * It does not perform any real auth operation, it just stores the flag locally.
 */
export const continueAsGuest = async () => {
  try {
    await AsyncStorage.setItem(
      'userSession',
      JSON.stringify({
        isLoggedIn: true,
        isAnonymous: true,
        isGuestMode: true,
      })
    );
    return { success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to continue as guest';
    return { success: false, error: errorMessage };
  }
};

/**
 * Check if guest mode is active
 */
export const isGuestMode = async () => {
  try {
    const userSessionStr = await AsyncStorage.getItem('userSession');
    if (userSessionStr) {
      const userSession = JSON.parse(userSessionStr);
      return userSession.isGuestMode === true;
    }
    return false;
  } catch (error) {
    return false;
  }
};

export default {
  getSession,
  signUp,
  signIn,
  useGoogleAuth,
  signOut,
  continueAsGuest,
  isGuestMode,
  alternativeGoogleSignIn,
};
