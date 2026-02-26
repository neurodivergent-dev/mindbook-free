// Simplified Root Layout for Mindbook Free
// Focused on fast startup and clean navigation
import { Stack } from 'expo-router';
import { useEffect, useState } from 'react';
import { useSegments, useRouter } from 'expo-router';
import './translations';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import { LanguageProvider } from './context/LanguageContext';
import { SearchProvider } from './context/SearchContext';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StyleSheet, View, StatusBar, useColorScheme, Platform } from 'react-native';
import * as SystemUI from 'expo-system-ui';
import SystemNavigationBar from 'react-native-system-navigation-bar';
import CustomDrawer from './components/CustomDrawer';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NOTES_KEY, buildNoteIndices } from './utils/storage';
import { useFonts } from 'expo-font';
import { Poppins_400Regular, Poppins_700Bold } from '@expo-google-fonts/poppins';
import { Raleway_400Regular, Raleway_700Bold } from '@expo-google-fonts/raleway';
import { Lato_400Regular, Lato_700Bold } from '@expo-google-fonts/lato';
import { Inter_400Regular, Inter_700Bold } from '@expo-google-fonts/inter';
import ErrorBoundary from './components/ErrorBoundary';

import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider as NavigationThemeProvider,
} from '@react-navigation/native';

declare global {
  interface Global {
    toggleDrawer: () => void;
  }
}

function RootLayoutNav() {
  const segments = useSegments();
  const [isDrawerVisible, setIsDrawerVisible] = useState(false);
  const colorScheme = useColorScheme();

  // Initialize app data
  useEffect(() => {
    const initIndices = async () => {
      try {
        const notesStr = await AsyncStorage.getItem(NOTES_KEY);
        if (notesStr) {
          await buildNoteIndices();
        }
      } catch (error) {
        console.error('Error initializing note indices:', error);
      }
    };
    initIndices();
  }, []);

  // Handle Drawer Toggle
  useEffect(() => {
    const segmentsArray = segments as string[];
    const isNotesTab =
      segmentsArray.length > 0 &&
      segmentsArray[0] === '(tabs)' &&
      (segmentsArray.length < 2 || !segmentsArray[1] || segmentsArray[1] === 'index');

    // @ts-ignore
    global.toggleDrawer = () => {
      if (isNotesTab) {
        setIsDrawerVisible(prev => !prev);
      }
    };

    if (!isNotesTab && isDrawerVisible) {
      setIsDrawerVisible(false);
    }
  }, [segments, isDrawerVisible]);

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
          animationDuration: 200,
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
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

function ThemedApp() {
  const [themeInitialized, setThemeInitialized] = useState(false);
  const colorScheme = useColorScheme();
  const { theme } = useTheme();

  useEffect(() => {
    const setSystemUIStyle = async () => {
      if (Platform.OS === 'android') {
        try {
          const bgColor = theme?.background || (colorScheme === 'dark' ? '#121212' : '#FFFFFF');
          await SystemUI.setBackgroundColorAsync(bgColor);

          if (SystemNavigationBar && typeof SystemNavigationBar.setNavigationColor === 'function') {
            await SystemNavigationBar.setNavigationColor(
              bgColor,
              colorScheme === 'dark' ? 'light' : 'dark',
              'navigation'
            ).catch(() => {});
          }
        } catch (e) {}
      }
    };
    setSystemUIStyle();
  }, [theme?.background, colorScheme]);

  const [fontsLoaded] = useFonts({
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
    async function verifyThemeSettings() {
      try {
        if ((await AsyncStorage.getItem('@theme_mode')) === null) {
          await AsyncStorage.setItem('@theme_mode', 'system');
        }
        if ((await AsyncStorage.getItem('@accent_color')) === null) {
          await AsyncStorage.setItem('@accent_color', 'green');
        }
        if ((await AsyncStorage.getItem('@language')) === null) {
          await AsyncStorage.setItem('@language', 'en');
        }
      } catch (e) {}
      setThemeInitialized(true);
    }
    verifyThemeSettings();
  }, []);

  const customDarkTheme = {
    ...DarkTheme,
    colors: {
      ...DarkTheme.colors,
      card: theme?.background || '#121212',
      background: theme?.background || '#121212',
      border: 'transparent',
    },
  };

  const customLightTheme = {
    ...DefaultTheme,
    colors: {
      ...DefaultTheme.colors,
      card: theme?.background || '#FFFFFF',
      background: theme?.background || '#FFFFFF',
      border: 'transparent',
    },
  };

  if (!themeInitialized || !fontsLoaded) {
    return (
      <View
        style={[
          styles.container,
          {
            backgroundColor: theme?.background || (colorScheme === 'dark' ? '#121212' : '#FFFFFF'),
          },
        ]}
      />
    );
  }

  return (
    <GestureHandlerRootView style={styles.gestureContainer}>
      <ErrorBoundary>
        <NavigationThemeProvider
          value={colorScheme === 'dark' ? customDarkTheme : customLightTheme}
        >
          <LanguageProvider>
            <SearchProvider>
              <View
                style={[
                  styles.container,
                  {
                    backgroundColor:
                      theme?.background || (colorScheme === 'dark' ? '#121212' : '#FFFFFF'),
                  },
                ]}
              >
                <RootLayoutNav />
              </View>
            </SearchProvider>
          </LanguageProvider>
        </NavigationThemeProvider>
      </ErrorBoundary>
    </GestureHandlerRootView>
  );
}

export default function RootLayout() {
  return (
    <ThemeProvider>
      <ThemedApp />
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gestureContainer: {
    flex: 1,
  },
});
