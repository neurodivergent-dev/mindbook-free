import { ExpoConfig, ConfigContext } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => {
  // Environment variables are automatically loaded by Expo from .env file
  // No need for dotenv in the app runtime

  return {
    ...config,
    name: 'Mindbook Pro',
    slug: 'mindbook',
    owner: 'mindbook',
    version: '1.5.0',
    orientation: 'portrait',
    icon: './assets/icon.png',
    userInterfaceStyle: 'automatic',
    splash: {
      image: './assets/splash.png',
      resizeMode: 'contain',
      backgroundColor: '#ffffff',
    },
    assetBundlePatterns: ['**/*'],
    ios: {
      supportsTablet: true,
      bundleIdentifier: 'com.mindbook.app',
      buildNumber: '12',
    },
    android: {
      adaptiveIcon: {
        foregroundImage: './assets/adaptive-icon.png',
        backgroundColor: '#ffffff',
      },
      package: 'com.mindbook.app',
      versionCode: 12,
    },
    web: {
      favicon: './assets/favicon.png',
    },
    extra: {
      eas: {
        projectId: process.env.EAS_PROJECT_ID || '',
      },
      supabaseUrl: process.env.SUPABASE_URL || '',
      supabaseAnonKey: process.env.SUPABASE_ANON_KEY || '',
      encryptionKey: process.env.ENCRYPTION_KEY || '',
      googleWebClientId: process.env.GOOGLE_WEB_CLIENT_ID || '',
      googleAndroidClientId: process.env.GOOGLE_ANDROID_CLIENT_ID || '',
      aiGenerateEndpoint:
        process.env.NODE_ENV === 'production'
          ? process.env.AI_GENERATE_ENDPOINT_PROD || ''
          : process.env.AI_GENERATE_ENDPOINT_DEV || '',
      expoDevHost: process.env.EXPO_DEV_HOST || '',
      expoDevPort: process.env.EXPO_DEV_PORT || '',
      openrouterApiKey: process.env.OPENROUTER_API_KEY || '',
      openrouterModel: process.env.OPENROUTER_MODEL || 'qwen/qwen2.5-vl-72b-instruct:free',
    },
    plugins: [
      'expo-router',
      'expo-secure-store',
      'expo-font',
      'expo-image-picker',
      [
        'expo-build-properties',
        {
          ios: {
            useFrameworks: 'static',
          },
        },
      ],
    ],
    experiments: {
      tsconfigPaths: true,
    },
    updates: {
      url: 'https://u.expo.dev/2f77920c-b155-4d50-a42a-f4427ecf24e2',
    },
    runtimeVersion: {
      policy: 'sdkVersion',
    },
  };
};
