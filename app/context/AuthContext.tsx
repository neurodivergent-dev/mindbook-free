// This context is used to manage user authentication and session state in a React Native application.
// It provides methods for logging in, registering, logging out, and managing guest mode.
// It also handles session persistence using AsyncStorage and listens for authentication state changes from Supabase.
// The context is created using React's createContext and provides the authentication state and methods to its children.
import { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as supabaseAuth from '../utils/supabaseAuth';
import supabase from '../utils/supabase';
import { maybeCompleteAuthSession } from 'expo-web-browser';
import NetInfo from '@react-native-community/netinfo';
import { withTimeout } from '../utils/withTimeout';

// Allow the authentication session to complete
maybeCompleteAuthSession({
  skipRedirectCheck: true, // This option skips redirect checking
});

// Type definitions for Auth context
interface AuthResult {
  success: boolean;
  error?: string;
  data?: any;
}

interface AuthContextType {
  user: any;
  loading: boolean;
  isGuestModeActive: boolean;
  isGuestMode: boolean;
  login: (email: string, password: string) => Promise<AuthResult>;
  register: (email: string, password: string, displayName?: string) => Promise<AuthResult>;
  logout: () => Promise<AuthResult>;
  loginWithGoogle: () => Promise<AuthResult>;
  registerWithGoogle: () => Promise<AuthResult>;
  continueAsGuest: () => Promise<AuthResult>;
  forceLogin: () => Promise<AuthResult>;
  resetPassword: (email: string) => Promise<AuthResult>;
}

// We create with type instead of empty object
const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isGuestModeActive, setIsGuestModeActive] = useState(false);
  const [isGuestMode, setIsGuestMode] = useState(false);

  // Session status control
  useEffect(() => {
    const checkSession = async () => {
      try {
        // First check the saved session information from AsyncStorage
        const storedSession = await AsyncStorage.getItem('userSession');

        if (storedSession) {
          const sessionData = JSON.parse(storedSession);

          // Guest mode control
          if (sessionData.isGuestMode) {
            setIsGuestModeActive(true);
            setIsGuestMode(true);
            setUser(null);
            setLoading(false);
            return;
          }

          // Access token and refresh token control
          if (sessionData.access_token && sessionData.refresh_token) {
            try {
              // Check network connectivity before attempting to refresh the session
              const networkState = await NetInfo.fetch();
              const isConnected = networkState.isConnected && networkState.isInternetReachable;

              // If we have connectivity, try to refresh the session with a timeout
              if (isConnected) {
                try {
                  // Use withTimeout to prevent blocking indefinitely
                  const { data: sessionResult, error: sessionError } = await withTimeout(
                    supabase.auth.setSession({
                      access_token: sessionData.access_token,
                      refresh_token: sessionData.refresh_token,
                    }),
                    2000 // 2 second timeout
                  );

                  if (!sessionError && sessionResult?.session) {
                    setUser(sessionResult.session.user);
                    setIsGuestMode(false);

                    // Update session information
                    await AsyncStorage.setItem(
                      'userSession',
                      JSON.stringify({
                        isLoggedIn: true,
                        isAnonymous: false,
                        email: sessionResult.session.user.email,
                        isGuestMode: false,
                        access_token: sessionResult.session.access_token,
                        refresh_token: sessionResult.session.refresh_token,
                        timestamp: new Date().toISOString(),
                        user_id: sessionResult.session.user.id,
                      })
                    );

                    setLoading(false);
                    return; // Successful session refresh, exit function
                  }
                } catch (timeoutError) {
                  console.log('Session refresh timed out, using cached session');
                  // Continue with cached session
                }
              }

              // If offline or refresh failed, use the cached session
              console.log('Using cached session (offline or refresh failed)');
              setUser({
                id: sessionData.user_id,
                email: sessionData.email,
                // Set minimum required user properties
                user_metadata: {},
                app_metadata: {},
                aud: 'authenticated',
              });
              setIsGuestMode(false);
              setLoading(false);
              return;
            } catch (refreshError) {
              // Error occurred, continue with normal getSession flow
              console.log('Session refresh error, continuing with getSession flow');
            }
          }
        }

        // Guest mode control
        const isInGuestMode = await supabaseAuth.isGuestMode();
        if (isInGuestMode) {
          setIsGuestModeActive(true);
          setIsGuestMode(true);
          setUser(null);
          setLoading(false);
          return;
        }

        // Check network connectivity before calling getSession
        const networkState = await NetInfo.fetch();
        const isConnected = networkState.isConnected && networkState.isInternetReachable;

        if (isConnected) {
          try {
            // Supabase session control with timeout
            const { data, error } = await withTimeout(supabaseAuth.getSession(), 2000);

            if (error) {
              setUser(null);
              await AsyncStorage.removeItem('userSession');
              setLoading(false);
              return;
            }

            if (data?.session?.user) {
              setUser(data.session.user);
              setIsGuestMode(false);

              // Save full session information
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
            } else {
              setUser(null);
              await AsyncStorage.removeItem('userSession');
            }
          } catch (timeoutError) {
            console.log('getSession timed out:', timeoutError);
            setUser(null);
          }
        } else {
          // When offline and no stored session, just set user to null
          console.log('Device is offline with no valid stored session');
          setUser(null);
        }
      } catch (error) {
        // Clear session by default on error
        console.error('Session check error:', error);
        setUser(null);
        await AsyncStorage.removeItem('userSession');
      } finally {
        setLoading(false);
      }
    };

    checkSession();

    // Session change listener
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('🔔 Auth status changed:', event, session ? 'Has Session' : 'No Session');

      // Log session details in debug mode
      if (__DEV__ && session) {
        console.log('📝 Session User:', session.user?.email);
        console.log('📝 Session Type:', session.token_type);
        console.log(
          '📝 Access Token (first 10 chars):',
          session.access_token ? session.access_token.substring(0, 10) + '...' : 'None'
        );
      }

      if (session?.user) {
        console.log('✅ Session established:', session.user.email);
        setUser(session.user);
        setIsGuestModeActive(false);
        setIsGuestMode(false);
        await AsyncStorage.setItem(
          'userSession',
          JSON.stringify({
            isLoggedIn: true,
            isAnonymous: false,
            email: session.user.email,
            isGuestMode: false,
            access_token: session.access_token,
            refresh_token: session.refresh_token,
            token_type: session.token_type || 'bearer',
            timestamp: new Date().toISOString(),
            user_id: session.user.id,
          })
        );
      } else {
        // Guest mode control
        const isInGuestMode = await supabaseAuth.isGuestMode();
        if (isInGuestMode) {
          setIsGuestModeActive(true);
          setIsGuestMode(true);
          setUser(null);
        } else {
          setIsGuestModeActive(false);
          setIsGuestMode(false);
          setUser(null);
          await AsyncStorage.removeItem('userSession');
        }
      }
    });

    return () => {
      if (authListener?.subscription) authListener.subscription.unsubscribe();
    };
  }, []);

  // Sign up
  const register = async (email, password, displayName = '') => {
    try {
      setLoading(true);

      // Add displayName to user metadata
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: await supabaseAuth.getRedirectUrl('auth-callback'),
          data: {
            full_name: displayName,
          },
        },
      });

      if (error) throw error;

      return { success: true, data };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Registration failed';
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  // Login
  const login = async (email, password) => {
    try {
      setLoading(true);
      const { error } = await supabaseAuth.signIn(email, password);
      if (error) throw error;

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Login failed',
      };
    } finally {
      setLoading(false);
    }
  };

  // Sign in with Google - central method
  const loginWithGoogle = async () => {
    try {
      setLoading(true);

      // Initialize Google OAuth using Supabase
      const result = await supabaseAuth.alternativeGoogleSignIn();

      if (!result.success) {
        throw new Error(result.error || 'Google sign in failed');
      }

      return { success: true, data: result.data };
    } catch (error) {
      const errorMessage = typeof error === 'string' ? error : 'Google giriş hatası oluştu';
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Sign Up with Google - central method
  const registerWithGoogle = async () => {
    try {
      setLoading(true);

      // Start Google OAuth using Supabase (we use the same function)
      const result = await supabaseAuth.alternativeGoogleSignIn();

      if (!result.success) {
        throw new Error(result.error || 'Google sign up failed');
      }

      return { success: true, data: result.data };
    } catch (error) {
      const errorMessage =
        typeof error === 'string' ? error : 'A Google registration error occurred';
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Log out
  const logout = async () => {
    try {
      // Let's clear the userSession for exiting guest mode
      if (isGuestModeActive) {
        await AsyncStorage.removeItem('userSession');
        setIsGuestModeActive(false);
        setIsGuestMode(false);
        return { success: true };
      }

      // Normal session exit - for Supabase
      const { error } = await supabaseAuth.signOut();
      if (error) {
        // Continue even if Supabase exits with an error, not critical
        console.log('Supabase çıkış hatası:', error);
      }

      // Clear user session
      await AsyncStorage.removeItem('userSession');

      // Clear user state
      setUser(null);

      return { success: true };
    } catch (error) {
      // Try to clear the session even if there is an error
      await AsyncStorage.removeItem('userSession');
      setUser(null);
      const errorMessage = error instanceof Error ? error.message : 'Logout failed';
      return { success: false, error: errorMessage };
    }
  };

  // Continue as guest
  const continueAsGuest = async () => {
    try {
      setLoading(true);
      const result = await supabaseAuth.continueAsGuest();
      if (!result.success) throw new Error(result.error);

      setIsGuestModeActive(true);
      setIsGuestMode(true);

      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to continue as guest';
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  // Redirect to login page and disable guest mode
  const forceLogin = async () => {
    try {
      // Disabling guest mode
      setIsGuestModeActive(false);
      setIsGuestMode(false);

      // Removing userSession from AsyncStorage
      await AsyncStorage.removeItem('userSession');

      // Clearing user state
      setUser(null);

      // Redirection
      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Force login failed';
      return { success: false, error: errorMessage };
    }
  };

  // Password reset function
  const resetPassword = async (email: string) => {
    try {
      console.log(`Attempting to send password reset email to: ${email}`);

      // Email format control
      if (!email || !email.includes('@')) {
        return {
          success: false,
          error: 'Please enter a valid email address',
        };
      }

      // Redirect to landing page (without spaces)
      const redirectTo = 'https://mindbookpro.netlify.app/auth-action';

      // Send password reset email via Supabase
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: redirectTo,
      });

      if (error) {
        // If the error is "User not found", show a private message to the user
        if (error.message?.includes('User not found') || error.message?.includes('Invalid email')) {
          return {
            success: false,
            error: 'This email is not registered in our system.',
          };
        }
        throw error;
      }

      console.log('Password reset email sent successfully');
      return {
        success: true,
        message: 'Please check your email and follow the instructions to reset your password.',
      };
    } catch (error) {
      console.error('Password reset error:', error);
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'An error occurred while sending the reset email.',
      };
    }
  };

  if (loading) {
    return null;
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        register,
        login,
        logout,
        loginWithGoogle,
        registerWithGoogle,
        continueAsGuest,
        forceLogin,
        isGuestMode,
        isGuestModeActive,
        resetPassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthProvider;
