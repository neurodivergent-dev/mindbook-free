// This layout file is used to manage the main navigation and global state of the app.
// It includes authentication, theme management, and language settings.
// It also handles the onboarding process and user session management.
// The layout uses Expo Router and React Navigation for navigation and routing.
import { withTimeout } from './utils/withTimeout';
import { Stack } from 'expo-router';
import { useEffect, useState } from 'react';
import { useRouter, useSegments } from 'expo-router';
import './translations';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { LanguageProvider } from './context/LanguageContext';
import { SearchProvider } from './context/SearchContext';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StyleSheet, View, StatusBar, useColorScheme } from 'react-native';
import CustomDrawer from './components/CustomDrawer';
import AsyncStorage from '@react-native-async-storage/async-storage';
import backup from './utils/backup';
import { NOTES_KEY, buildNoteIndices, getAllNotes } from './utils/storage';
import { useFonts } from 'expo-font';
import { Poppins_400Regular, Poppins_700Bold } from '@expo-google-fonts/poppins';
import { Raleway_400Regular, Raleway_700Bold } from '@expo-google-fonts/raleway';
import { Lato_400Regular, Lato_700Bold } from '@expo-google-fonts/lato';
import { Inter_400Regular, Inter_700Bold } from '@expo-google-fonts/inter';
import { useTranslation } from 'react-i18next';
import { OnboardingProvider, useOnboarding } from './context/OnboardingContext';
import { initNetworkManager } from './utils/networkManager';
import { OfflineService } from './services/offline';
import { initStorage } from './utils/initStorage';
import { OfflineProvider } from './context/OfflineContext';
import ErrorBoundary from './components/ErrorBoundary';
import NetworkAwareSessionHandler from './components/NetworkAwareSessionHandler';

import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider as NavigationThemeProvider,
} from '@react-navigation/native';

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
  const [navigationHandled, setNavigationHandled] = useState(false);
  const [appInitialized, setAppInitialized] = useState(false);

  // Sequential app initialization
  useEffect(() => {
    const initializeApp = async () => {
      try {
        // Step 1: Initialize network services first (critical)
        console.log('Initializing network manager...');
        await withTimeout(initNetworkManager(), 5000);

        console.log('Initializing offline service...');
        await withTimeout(OfflineService.initialize(), 5000);

        console.log('Network services initialized successfully');

        // Step 2: Check onboarding status after network initialization
        await withTimeout(checkOnboardingStatus(), 3000);

        // Step 3: Initialize storage buckets
        console.log('Initializing storage buckets...');
        await withTimeout(initStorage(), 5000);
        console.log('Storage buckets initialized successfully');

        // Step 4: Initialize other services in parallel
        await Promise.all([initIndices()]);

        // Step 5: Mark app as fully initialized
        setAppInitialized(true);
        console.log('App initialization complete');
      } catch (error) {
        if (error instanceof Error) {
          console.error('App init error:', error.message);
        } else {
          console.error('App init unknown error:', error);
        }

        // continue as fallback
        setAppInitialized(true);
      }
    };

    // Helper functions
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

    initializeApp();
  }, [setHasSeenOnboarding]);

  // Add back the automatic backup interval functionality with dependency on initialization state
  useEffect(() => {
    // Don't start the backup interval until app is fully initialized
    if (!appInitialized) return;

    // Don't proceed if user is not logged in
    if (!user) return;
    const isLoggedIn = user && !user.isAnonymous;
    if (!isLoggedIn) return;

    console.log('Setting up automatic backup interval...');

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

    // Initial check for backup
    checkForAutomaticBackup();

    // Set interval to check for backup (every 30 minutes)
    const backupInterval = setInterval(() => {
      checkForAutomaticBackup();
    }, 30 * 60 * 1000);

    return () => {
      clearInterval(backupInterval);
    };
  }, [appInitialized, user, t]);

  // We've removed the old AppState listener and replaced it with NetworkAwareSessionHandler component

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
    const manageNavigation = async () => {
      // Don't navigate until app is fully initialized
      if (!appInitialized) {
        return;
      }

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
        const inTabsGroup = segmentsArray[0] === '(tabs)';
        const inOnboardingScreen = inAuthGroup && segmentsArray[1] === 'onboarding';
        const inLoginScreen = inAuthGroup && segmentsArray[1] === 'login';

        console.log('Navigation control:', {
          hasSeenOnboarding,
          inOnboardingScreen,
          inLoginScreen,
          inAuthGroup,
          inTabsGroup,
          navigationHandled,
        });

        // If we're already in the tabs group and the user is logged in,
        // we shouldn't redirect back to the index tab
        if (inTabsGroup && (user || isGuestMode) && navigationHandled) {
          return;
        }

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

            // 2.3. If the user is logged in and in auth group
            if ((user || isGuestMode) && inAuthGroup) {
              router.replace('/(tabs)/');
              setNavigationHandled(true);
              return;
            }

            // 2.4. If the user is not logged in and not in auth group
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
    navigationHandled,
    setHasSeenOnboarding,
    appInitialized,
  ]);

  return (
    <>
      <StatusBar
        translucent
        backgroundColor="transparent"
        barStyle={colorScheme === 'dark' ? 'light-content' : 'dark-content'}
      />
      <NetworkAwareSessionHandler>
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
      </NetworkAwareSessionHandler>
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

  // Verify default theme exists in AsyncStorage
  useEffect(() => {
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
  }, [themeInitialized]);

  // Show a minimal loading state until the theme is initialized
  if (!themeInitialized || !fontsLoaded) {
    return (
      <GestureHandlerRootView style={styles.container}>
        <View style={[styles.container, styles.whiteBackground]} />
      </GestureHandlerRootView>
    );
  }

  return (
    <GestureHandlerRootView style={styles.gestureContainer}>
      <ErrorBoundary>
        <NavigationThemeProvider
          value={colorScheme === 'dark' ? customDarkTheme : customLightTheme}
        >
          <ThemeProvider>
            <LanguageProvider>
              <SearchProvider>
                <OnboardingProvider>
                  <AuthProvider>
                    <OfflineProvider>
                      <View
                        style={[
                          styles.container,
                          colorScheme === 'dark' ? styles.darkBackground : styles.whiteBackground,
                        ]}
                      >
                        <RootLayoutNav />
                      </View>
                    </OfflineProvider>
                  </AuthProvider>
                </OnboardingProvider>
              </SearchProvider>
            </LanguageProvider>
          </ThemeProvider>
        </NavigationThemeProvider>
      </ErrorBoundary>
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
