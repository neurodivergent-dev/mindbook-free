// This layout file is used to manage the main navigation and global state of the app.
// It includes authentication, theme management, and language settings.
// It also handles the onboarding process and user session management.
// The layout uses Expo Router and React Navigation for navigation and routing.
import { Stack } from 'expo-router';
import { useEffect, useState } from 'react';
import { useRouter, useSegments } from 'expo-router';
import './translations';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { LanguageProvider } from './context/LanguageContext';
import { SearchProvider } from './context/SearchContext';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StyleSheet, View, StatusBar, useColorScheme, AppState } from 'react-native';
import CustomDrawer from './components/CustomDrawer';
import AsyncStorage from '@react-native-async-storage/async-storage';
import backup from './utils/backup';
import { NOTES_KEY, buildNoteIndices } from './utils/storage';
import { triggerAutoBackup } from './utils/backup';
import { useFonts } from 'expo-font';
import { Poppins_400Regular, Poppins_700Bold } from '@expo-google-fonts/poppins';
import { Raleway_400Regular, Raleway_700Bold } from '@expo-google-fonts/raleway';
import { Lato_400Regular, Lato_700Bold } from '@expo-google-fonts/lato';
import { Inter_400Regular, Inter_700Bold } from '@expo-google-fonts/inter';
import { useTranslation } from 'react-i18next';
import { OnboardingProvider, useOnboarding } from './context/OnboardingContext';

import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider as NavigationThemeProvider,
} from '@react-navigation/native';
import supabase from './utils/supabase';

// Color constants
const COLORS = {
  white: '#ffffff',
  black: '#000000',
};

// Extend global namespace for typed access to global variables
declare global {
  interface Global {
    requestLogin: () => void;
    toggleDrawer: () => void;
  }
}

function RootLayoutNav() {
  const { user, loading, isGuestMode } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const [isDrawerVisible, setIsDrawerVisible] = useState(false);
  const colorScheme = useColorScheme();
  const { hasSeenOnboarding, setHasSeenOnboarding } = useOnboarding();
  const [isLoginRequested, setIsLoginRequested] = useState(false);
  const [checkingOnboarding, setCheckingOnboarding] = useState(true);
  const { t } = useTranslation();

  // Check if the user has completed onboarding
  useEffect(() => {
    const checkOnboardingStatus = async () => {
      try {
        const value = await AsyncStorage.getItem('@onboarding_completed');
        console.log('Root layout - Onboarding status:', value);

        // Check onboarding status precisely
        if (value === 'true') {
          setHasSeenOnboarding(true);
        } else {
          // If onboarding is not seen or the value is null
          setHasSeenOnboarding(false);
          // Clear the value for extra security
          await AsyncStorage.setItem('@onboarding_completed', 'false');
        }
        setCheckingOnboarding(false);
      } catch (error) {
        console.error('Error checking onboarding status:', error);
        setHasSeenOnboarding(false);
        setCheckingOnboarding(false);
      }
    };

    checkOnboardingStatus();
  }, [setHasSeenOnboarding]);

  // Add an AppState listener to watch the app transition from background to foreground
  useEffect(() => {
    const handleAppStateChange = async nextAppState => {
      if (nextAppState === 'active') {
        // Recheck session state
        try {
          const storedSession = await AsyncStorage.getItem('userSession');
          if (storedSession) {
            const sessionData = JSON.parse(storedSession);

            if (sessionData.access_token && sessionData.refresh_token) {
              // Refresh the Supabase session
              const { data, error } = await supabase.auth.setSession({
                access_token: sessionData.access_token,
                refresh_token: sessionData.refresh_token,
              });

              if (error) {
                // If session refresh fails, no logout is required
                // User will be automatically directed to the login screen
                console.error('Session refresh failed:', error.message);
              } else if (data?.session) {
                // Update session information
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
              }
            }
          }
        } catch (error) {
          console.error('Error checking session:', error);
        }
      }
    };

    // Add AppState listener
    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription.remove();
    };
  }, []);

  // Build note indices for faster filtering
  useEffect(() => {
    const initIndices = async () => {
      try {
        // Check if there are any notes to index
        const notesStr = await AsyncStorage.getItem(NOTES_KEY);
        if (notesStr) {
          console.log('Building note indices for faster filtering...');
          await buildNoteIndices();
          console.log('Note indices built successfully');
        }
      } catch (error) {
        console.error('Error initializing note indices:', error);
      }
    };

    initIndices();
  }, []);

  useEffect(() => {
    if (isLoginRequested && segments.length > 0 && segments[0] === '(auth)') {
      setIsLoginRequested(false);
    }
  }, [segments, isLoginRequested]);

  useEffect(() => {
    // @ts-ignore - We ignore the global TypeScript type
    global.requestLogin = () => {
      setIsLoginRequested(true);
      router.replace('/(auth)/login');
    };
  }, [router]);

  useEffect(() => {
    const segmentsArray = segments as string[];
    const isNotesTab =
      segmentsArray.length > 0 &&
      segmentsArray[0] === '(tabs)' &&
      (segmentsArray.length < 2 || !segmentsArray[1] || segmentsArray[1] === 'index');

    // @ts-ignore - We ignore the global TypeScript type
    global.toggleDrawer = () => {
      if (isNotesTab) {
        setIsDrawerVisible(prev => !prev);
      }
    };

    if (!isNotesTab && isDrawerVisible) {
      setIsDrawerVisible(false);
    }
  }, [segments, isDrawerVisible]);

  useEffect(() => {
    const handleAutoBackup = async () => {
      if (user && !loading) {
        await triggerAutoBackup(user);
      }
    };

    handleAutoBackup();
  }, [user, loading]);

  // Auto backup process
  useEffect(() => {
    // Check if user is logged in
    if (!user) return;
    const isLoggedIn = user && !user.isAnonymous;
    if (!isLoggedIn) return;

    // Create a function to check for automatic backup
    const checkForAutomaticBackup = async () => {
      try {
        // Check if auto backup is enabled
        const autoBackupEnabled = await AsyncStorage.getItem('@auto_backup_enabled');
        if (autoBackupEnabled !== 'true') return;

        // Check if notes have changed since last backup
        const allNotes = await getAllNotes();
        const hasChanged = await backup.hasChangedSinceLastBackup(user.id, allNotes);

        // If there are changes, trigger automatic backup
        if (hasChanged) {
          const backupResult = await backup.triggerAutoBackup(user);
          console.log('Auto backup result:', backupResult);

          // After automatic backup, refresh last backup time in case it's visible in other screens
          if (backupResult && backupResult.success) {
            // No need to set the last backup time here - it's already set in triggerAutoBackup
            // Just for notification or debugging purposes
            const backupDate = new Date().toLocaleString(
              t('common.language') === 'tr' ? 'tr-TR' : 'en-US',
              {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
              }
            );
            console.log(t('settings.autoBackupCompleted', { date: backupDate }));
          }
        }
      } catch (error) {
        console.error('Auto backup failed:', error);
      }
    };

    // Check for backup when the component mounts
    checkForAutomaticBackup();

    // Set interval to check for backup (every 30 minutes)
    const backupInterval = setInterval(() => {
      checkForAutomaticBackup();
    }, 30 * 60 * 1000);

    return () => {
      clearInterval(backupInterval);
    };
  }, [user, t]);

  useEffect(() => {
    const manageNavigation = async () => {
      // Check onboarding status
      if (checkingOnboarding) {
        try {
          const value = await AsyncStorage.getItem('@onboarding_completed');
          setHasSeenOnboarding(value === 'true');
          setCheckingOnboarding(false);
        } catch (error) {
          console.error('Error checking onboarding status:', error);
          setHasSeenOnboarding(false);
          setCheckingOnboarding(false);
        }
        return;
      }

      // If the loading is complete, manage navigation
      if (!loading && !checkingOnboarding) {
        const segmentsArray = segments as string[];
        const inAuthGroup = segmentsArray[0] === '(auth)';
        const inOnboardingScreen = inAuthGroup && segmentsArray[1] === 'onboarding';
        const inLoginScreen = inAuthGroup && segmentsArray[1] === 'login';

        console.log('Navigation control:', {
          hasSeenOnboarding,
          inOnboardingScreen,
          inLoginScreen,
          inAuthGroup,
        });

        setTimeout(() => {
          // 1. Onboarding control
          if (!hasSeenOnboarding && !inOnboardingScreen) {
            router.replace('/(auth)/onboarding');
            return;
          }

          // 2. If onboarding is complete
          if (hasSeenOnboarding) {
            // 2.1. If still on the onboarding screen
            if (inOnboardingScreen) {
              router.replace('/(auth)/login');
              return;
            }

            // 2.2. If there is a login request
            if (isLoginRequested && !inLoginScreen) {
              router.replace('/(auth)/login');
              setIsLoginRequested(false);
              return;
            }

            // 2.3. If the user is logged in
            if ((user || isGuestMode) && inAuthGroup) {
              router.replace('/(tabs)/');
              return;
            }

            // 2.4. If the user is not logged in
            if (!user && !isGuestMode && !inAuthGroup) {
              router.replace('/(auth)/login');
              return;
            }
          }
        }, 100);
      }
    };

    manageNavigation();
  }, [
    user,
    loading,
    segments,
    isGuestMode,
    isLoginRequested,
    router,
    hasSeenOnboarding,
    checkingOnboarding,
    setHasSeenOnboarding,
  ]);

  return (
    <>
      <StatusBar
        translucent
        backgroundColor="transparent"
        barStyle={colorScheme === 'dark' ? 'light-content' : 'dark-content'}
      />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: {
            backgroundColor: 'transparent',
          },
          animation: 'fade',
          animationDuration: 200, // Slightly slower animations for better stability
        }}
      >
        <Stack.Screen
          name="(auth)"
          options={{
            headerShown: false,
            // For first load, disable animations to avoid race conditions
            animation: 'none',
          }}
        />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="auth-callback"
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="(modal)"
          options={{
            headerShown: false,
            presentation: 'modal',
            animation: 'slide_from_bottom',
          }}
        />
      </Stack>
      {isDrawerVisible && (
        <CustomDrawer
          isVisible={isDrawerVisible}
          onClose={() => setIsDrawerVisible(false)}
          onOpen={() => setIsDrawerVisible(true)}
        />
      )}
    </>
  );
}

export default function RootLayout() {
  const [themeInitialized, setThemeInitialized] = useState(false);
  const colorScheme = useColorScheme();

  const [fontsLoaded] = useFonts({
    'CaveatBrush-Regular': require('../assets/fonts/CaveatBrush-Regular.ttf'),
    'Montserrat-Regular': require('../assets/fonts/Montserrat-Regular.ttf'),
    'OpenSans-Regular': require('../assets/fonts/OpenSans-Regular.ttf'),
    'Roboto-Regular': require('../assets/fonts/Roboto-Regular.ttf'),
    'Poppins-Regular': Poppins_400Regular,
    'Poppins-Bold': Poppins_700Bold,
    'Raleway-Regular': Raleway_400Regular,
    'Raleway-Bold': Raleway_700Bold,
    'Lato-Regular': Lato_400Regular,
    'Lato-Bold': Lato_700Bold,
    'Inter-Regular': Inter_400Regular,
    'Inter-Bold': Inter_700Bold,
  });

  useEffect(() => {
    // Verify default theme exists in AsyncStorage
    async function verifyThemeSettings() {
      try {
        const themeMode = await AsyncStorage.getItem('@theme_mode');
        const accentColor = await AsyncStorage.getItem('@accent_color');
        const language = await AsyncStorage.getItem('@language');

        if (themeMode === null) {
          await AsyncStorage.setItem('@theme_mode', 'system');
        }

        if (accentColor === null) {
          await AsyncStorage.setItem('@accent_color', 'blue');
        }

        if (language === null) {
          await AsyncStorage.setItem('@language', 'en');
        }

        setThemeInitialized(true);
      } catch (error) {
        // Proceed anyway to prevent blocking the app
        setThemeInitialized(true);
      }
    }

    verifyThemeSettings();
  }, []); // This useEffect only works once, for theme validation
  // We manage the timeout logic with a separate useEffect
  useEffect(() => {
    // Safety timeout - Force continue if theme initialization is not completed within 100ms
    const safetyTimeout = setTimeout(() => {
      if (!themeInitialized) {
        console.log('Theme initialization timeout - proceeding anyway');
        setThemeInitialized(true);
      }
    }, 100); // 100ms timeout

    return () => clearTimeout(safetyTimeout);
  }, [themeInitialized]); // Added as themeInitialized dependency

  // Show a minimal loading state until the theme is initialized
  if (!themeInitialized || !fontsLoaded) {
    return (
      <GestureHandlerRootView style={styles.container}>
        <View style={[styles.container, styles.whiteBackground]} />
      </GestureHandlerRootView>
    );
  }

  // Modify default themes to remove header border
  const customDarkTheme = {
    ...DarkTheme,
    colors: {
      ...DarkTheme.colors,
      card: COLORS.black,
      background: COLORS.black,
      border: 'transparent',
    },
  };

  const customLightTheme = {
    ...DefaultTheme,
    colors: {
      ...DefaultTheme.colors,
      card: COLORS.white,
      background: COLORS.white,
      border: 'transparent',
    },
  };

  return (
    <GestureHandlerRootView style={styles.gestureContainer}>
      <NavigationThemeProvider value={colorScheme === 'dark' ? customDarkTheme : customLightTheme}>
        <ThemeProvider>
          <LanguageProvider>
            <SearchProvider>
              <OnboardingProvider>
                <AuthProvider>
                  <View
                    style={[
                      styles.container,
                      colorScheme === 'dark' ? styles.darkBackground : styles.whiteBackground,
                    ]}
                  >
                    <RootLayoutNav />
                  </View>
                </AuthProvider>
              </OnboardingProvider>
            </SearchProvider>
          </LanguageProvider>
        </ThemeProvider>
      </NavigationThemeProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  darkBackground: {
    backgroundColor: COLORS.black,
  },
  gestureContainer: {
    flex: 1,
  },
  whiteBackground: {
    backgroundColor: COLORS.white,
  },
});

// Helper function to get all notes
const getAllNotes = async () => {
  try {
    const notesJson = await AsyncStorage.getItem(NOTES_KEY);
    return notesJson ? JSON.parse(notesJson) : [];
  } catch (error) {
    console.error('Error getting all notes:', error);
    return [];
  }
};
