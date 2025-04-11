// This file is used to configure the application.
import 'dotenv/config';

// We get environment variables
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;
const GOOGLE_WEB_CLIENT_ID = process.env.GOOGLE_WEB_CLIENT_ID;
const GOOGLE_ANDROID_CLIENT_ID = process.env.GOOGLE_ANDROID_CLIENT_ID;
const AI_GENERATE_ENDPOINT_PROD = process.env.AI_GENERATE_ENDPOINT_PROD;
const AI_GENERATE_ENDPOINT_DEV = process.env.AI_GENERATE_ENDPOINT_DEV;
const EXPO_DEV_HOST = process.env.EXPO_DEV_HOST;
const EXPO_DEV_PORT = process.env.EXPO_DEV_PORT;

// Choosing the right AI endpoint based on the environment
const IS_DEVELOPMENT = process.env.NODE_ENV === 'development';
const AI_GENERATE_ENDPOINT = IS_DEVELOPMENT ? AI_GENERATE_ENDPOINT_DEV : AI_GENERATE_ENDPOINT_PROD;

// We define the configuration directly (without needing the app.json file)
export default {
  expo: {
    name: 'Mindbook Pro',
    slug: 'mindbook',
    version: '4.0.2',
    orientation: 'portrait',
    icon: './assets/icon.png',
    userInterfaceStyle: 'automatic',
    splash: {
      image: './assets/icon.png',
      resizeMode: 'contain',
      backgroundColor: '#1a91ff',
    },
    assetBundlePatterns: ['**/*'],
    ios: {
      supportsTablet: true,
      bundleIdentifier: 'com.melihcandemir.mindbook',
    },
    android: {
      adaptiveIcon: {
        foregroundImage: './assets/icon.png',
        backgroundColor: '#1a91ff',
      },
      package: 'com.melihcandemir.mindbook',
      newArchEnabled: true,
      versionCode: 2,
    },
    web: {
      favicon: './assets/icon.png',
    },
    plugins: [
      'expo-router',
      'expo-font',
      [
        'expo-build-properties',
        {
          android: {
            newArchEnabled: true,
          },
        },
      ],
    ],
    scheme: 'mindbook',
    extra: {
      supabaseUrl: SUPABASE_URL,
      supabaseAnonKey: SUPABASE_ANON_KEY,
      encryptionKey: ENCRYPTION_KEY,
      googleWebClientId: GOOGLE_WEB_CLIENT_ID,
      googleAndroidClientId: GOOGLE_ANDROID_CLIENT_ID,
      aiGenerateEndpoint: AI_GENERATE_ENDPOINT,
      expoDevHost: EXPO_DEV_HOST,
      expoDevPort: EXPO_DEV_PORT,
      router: {
        origin: false,
      },
      eas: {
        projectId: '2f77920c-b155-4d50-a42a-f4427ecf24e2',
      },
    },
    primaryColor: '#6366F1',
    newArchEnabled: true,
  },
};
