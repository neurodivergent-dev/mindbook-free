// Simplified app.config.js for Mindbook Free
// Removed all cloud backend configurations (Supabase, Google OAuth, etc.)

export default {
  expo: {
    name: 'Mindbook Free',
    slug: 'mindbook-free',
    version: '1.0.0',
    orientation: 'default',
    icon: './assets/icon.png',
    userInterfaceStyle: 'automatic',
    splash: {
      image: './assets/icon.png',
      resizeMode: 'contain',
      backgroundColor: '#22ae3b',
    },
    assetBundlePatterns: ['**/*'],
    ios: {
      supportsTablet: true,
      bundleIdentifier: 'com.melihcandemir.mindbookfree',
    },
    android: {
      adaptiveIcon: {
        backgroundColor: '#22ae3b',
      },
      icon: './assets/icon.png',
      package: 'com.melihcandemir.mindbook.free',
      newArchEnabled: true,
      versionCode: 1,
    },
    web: {
      favicon: './assets/icon.png',
    },
    plugins: [
      'expo-router',
      'expo-font',
      'expo-localization',
      [
        'expo-build-properties',
        {
          android: {
            newArchEnabled: true,
            enableProguardInReleaseBuilds: true,
            enableR8: true,
            targetSdkVersion: 35,
            compileSdkVersion: 35,
            softwareKeyboardLayoutMode: 'pan',
          },
        },
      ],
    ],
    scheme: 'mindbook-free',
    extra: {
      router: {
        origin: false,
      },
      eas: {
        projectId: '933c4851-4494-44ae-acc3-8183ed3c96b9',
      },
    },
    primaryColor: '#63FF61',
    newArchEnabled: true,
    devClient: false,
  },
};
