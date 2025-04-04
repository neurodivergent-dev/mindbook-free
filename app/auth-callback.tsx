// This file is responsible for handling the authentication callback process.
// It is used to handle the authentication callback process when the user is redirected to the app after logging in with a provider.
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { useEffect, useState } from 'react';
import { Stack, useRouter } from 'expo-router';
import { useTheme } from './context/ThemeContext';
import * as Linking from 'expo-linking';
import supabase from './utils/supabase';

const Colors = {
  white: '#fff',
  text: '#333',
};

export default function AuthCallbackScreen() {
  const [message, setMessage] = useState('Logging in...');
  const router = useRouter();
  const { themeColors, accentColor } = useTheme();

  useEffect(() => {
    const processAuth = async () => {
      try {
        console.log('🔑 Processing Auth Callback');

        // 1. URL analysis
        const url = await Linking.getInitialURL();
        console.log('📱 URL:', url);

        if (!url) {
          console.log('❌ URL not found');
          setTimeout(() => {
            router.replace('/(auth)/login');
          }, 1000);
          return;
        }

        // 2. Token issuance process
        let accessToken = null;
        let refreshToken = null;

        // Removing token from fragment section (#access_token=...)
        const hashIndex = url.indexOf('#');
        if (hashIndex !== -1) {
          const hashPart = url.substring(hashIndex + 1);
          const fragmentParams = new URLSearchParams(hashPart);

          accessToken = fragmentParams.get('access_token');
          refreshToken = fragmentParams.get('refresh_token');
          fragmentParams.get('type');

          if (accessToken) {
            console.log(
              '🔑 Fragment Access Token Found (first 5 characters):',
              accessToken.substring(0, 5) + '...'
            );
          }

          if (refreshToken) {
            console.log('🔄 Fragment Refresh Token Found');
          }
        }

        // Extracting tokens from query parameters (?access_token=...)
        const queryIndex = url.indexOf('?');
        if (queryIndex !== -1 && !accessToken) {
          const queryPart = url.substring(queryIndex + 1);
          const queryParams = new URLSearchParams(queryPart);

          accessToken = queryParams.get('access_token');
          refreshToken = queryParams.get('refresh_token');
          queryParams.get('type');

          if (accessToken) {
            console.log(
              '🔑 Query Access Token Found (first 5 characters):',
              accessToken.substring(0, 5) + '...'
            );
          }

          if (refreshToken) {
            console.log('🔄 Query Refresh Token Found');
          }
        }

        // 3. Token control
        if (!accessToken) {
          console.log('❌ Token not found');
          setTimeout(() => {
            router.replace('/(auth)/login');
          }, 1000);
          return;
        }

        // 4. Setting up a session
        try {
          setMessage('Verifying session information...');

          if (accessToken && refreshToken) {
            const { data, error } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });

            if (error) {
              console.error('❌ Error while establishing session:', error.message);
              throw error;
            }

            if (data?.session) {
              setMessage('Session established successfully!');
              console.log('✅ Session established:', data.session.user.email);

              // 5. Redirect to home screen
              setTimeout(() => {
                router.replace('/(tabs)');
              }, 1000);
              return;
            }
          }
        } catch (sessionError) {
          console.error('❌ Error while establishing session:', sessionError);
        }

        // 6. Fallback - redirect to login page
        setMessage('Could not log in. You are being redirected to the login page...');
        setTimeout(() => {
          router.replace('/(auth)/login');
        }, 2000);
      } catch (error) {
        console.error('❌ Auth Callback Processing Error:', error);
        setMessage('An error occurred. You are being directed to the login page...');

        setTimeout(() => {
          router.replace('/(auth)/login');
        }, 2000);
      }
    };

    processAuth();
  }, [router]);

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <ActivityIndicator size="large" color={themeColors[accentColor]} />
      <Text style={styles.message}>{message}</Text>
    </View>
  );
}

// Styles for the AuthCallbackScreen component
const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    backgroundColor: Colors.white,
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  message: {
    color: Colors.text,
    fontSize: 16,
    marginTop: 20,
    textAlign: 'center',
  },
});
