// This file is used to configure the application.
import 'dotenv/config';

// Obfuscated helper functions
const _0x1a2b = str => Buffer.from(str, 'base64').toString();
const _0x3c4d = str => str.split('').reverse().join('');
const _0x5e6f = (key, fallback) => process.env[key] || fallback;

// Obfuscated environment variable mapping
const _env = {
  _s: _0x5e6f('SUPABASE_URL', ''),
  _a: _0x5e6f('SUPABASE_ANON_KEY', ''),
  _e: _0x5e6f('ENCRYPTION_KEY', ''),
  _v: _0x5e6f('VAULT_ENCRYPTION_KEY', _0x5e6f('ENCRYPTION_KEY', '')),
  _g: _0x5e6f('GOOGLE_WEB_CLIENT_ID', ''),
  _ga: _0x5e6f('GOOGLE_ANDROID_CLIENT_ID', ''),
  _ai:
    process.env.NODE_ENV === 'development'
      ? _0x5e6f('AI_GENERATE_ENDPOINT_DEV', '')
      : _0x5e6f('AI_GENERATE_ENDPOINT_PROD', ''),
  _ed: _0x5e6f('EXPO_DEV_HOST', ''),
  _ep: _0x5e6f('EXPO_DEV_PORT', ''),
  _o: _0x5e6f('OPENROUTER_API_KEY', ''),
  _om: _0x5e6f('OPENROUTER_MODEL', 'qwen/qwen2.5-vl-72b-instruct:free'),
};

// We define the configuration directly (without needing the app.json file)
export default {
  expo: {
    name: _0x1a2b('TWluZGJvb2sgUHJv'), // "Mindbook Pro" in base64
    slug: _0x3c4d('koobdnim'), // "mindbook" reversed
    version: '4.1.4',
    orientation: 'default',
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
        foregroundImage: './assets/icons/res/mipmap-xxxhdpi/ic_launcher_foreground.png',
        backgroundImage: './assets/icons/res/mipmap-xxxhdpi/ic_launcher_background.png',
        backgroundColor: '#1a91ff',
        monochromeImage: './assets/icons/res/mipmap-xxxhdpi/ic_launcher_monochrome.png',
      },
      icon: './assets/icons/res/mipmap-xxxhdpi/ic_launcher.png',
      package: 'com.melihcandemir.mindbook',
      newArchEnabled: true,
      versionCode: 4,
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
            enableProguardInReleaseBuilds: true,
            enableR8: true,
            targetSdkVersion: 35,
            compileSdkVersion: 35,
          },
        },
      ],
    ],
    scheme: _0x3c4d('koobdnim'), // "mindbook" reversed
    extra: {
      // Obfuscated environment variables - will be minified in production
      ..._env,
      router: {
        origin: false,
      },
      eas: {
        projectId: _0x5e6f('EAS_PROJECT_ID', '2f77920c-b155-4d50-a42a-f4427ecf24e2'),
      },
    },
    primaryColor: '#6366F1',
    newArchEnabled: true,
  },
};
