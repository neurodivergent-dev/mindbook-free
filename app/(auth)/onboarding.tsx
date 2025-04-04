// Onboarding screen for the app
// This screen is displayed when the user first opens the app
// It contains a series of slides that explain the app's features and functionality
import { View, StyleSheet, BackHandler, Platform } from 'react-native';
import { Stack } from 'expo-router';
import OnboardingSlides from '../components/OnboardingSlides';
import { useEffect } from 'react';
import { useTheme } from '../context/ThemeContext';

export default function OnboardingScreen() {
  const { theme } = useTheme();

  // Disable hardware back button on Android
  useEffect(() => {
    if (Platform.OS === 'android') {
      const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
        return true; // Prevents default behavior
      });

      return () => backHandler.remove();
    }
  }, []);

  // Disable swipe back gesture on iOS
  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Stack.Screen
        options={{
          headerShown: false,
          gestureEnabled: false,
          animation: 'none',
          animationDuration: 0,
        }}
      />
      <OnboardingSlides />
    </View>
  );
}

// Styles for the Onboarding screen
// This includes the container style for the main view
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
