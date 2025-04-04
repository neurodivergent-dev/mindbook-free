// This utility file is responsible for handling deep linking in the application.
// It defines the linking configuration, including URL prefixes and screen mappings.
// It also includes logic for handling OAuth callbacks and extracting access tokens from URLs.
import { LinkingOptions } from '@react-navigation/native';
import * as Linking from 'expo-linking';
import Constants from 'expo-constants';

// URL scheme of the application
const scheme = 'mindbook';

// Get Supabase URL from environment variables
const SUPABASE_URL = Constants.expoConfig?.extra?.supabaseUrl;

// Validate Supabase URL (DEV mode only)
if (!SUPABASE_URL && __DEV__) {
  console.warn(
    'Warning: SUPABASE_URL is not defined in environment variables. Deep linking for Supabase auth might not work correctly.'
  );
}

const config = {
  screens: {
    // Auth routes
    '(auth)': {
      screens: {
        login: 'login',
        register: 'register',
      },
    },
    // Tab routes
    '(tabs)': {
      screens: {
        index: 'notes',
        search: 'search',
        categories: 'categories',
        settings: 'settings',
      },
    },
    // Modal routes
    '(modal)': {
      screens: {
        edit: 'edit',
        detail: 'note/:id',
        trash: 'trash',
      },
    },
    // OAuth callback route
    'auth-callback': 'auth-callback',
  },
};

// Build the prefixes array dynamically
const buildPrefixes = () => {
  const prefixesArray = [
    // For the web
    Linking.createURL('/'),
    // Native app scheme
    `${scheme}://`,
  ];

  // Add development URL in dev mode
  if (__DEV__) {
    // Hardcoded URL yerine yapılandırmadan al
    const devHost = Constants.expoConfig?.extra?.expoDevHost;
    const devPort = Constants.expoConfig?.extra?.expoDevPort;
    prefixesArray.push(`exp://${devHost}:${devPort}`);
  }

  // Add Supabase URL if available
  if (SUPABASE_URL) {
    prefixesArray.push(SUPABASE_URL);
  }

  return prefixesArray;
};

const linking: LinkingOptions<ReactNavigation.RootParamList> = {
  prefixes: buildPrefixes(),
  config,
  // In case of error, print the deep link to the console
  async getInitialURL() {
    // Deep link control
    try {
      const url = await Linking.getInitialURL();
      console.log('Retrieved starting URL:', url);

      // Extract hash fragment from URL (for access_token)
      if (url && url.includes('#access_token=')) {
        console.log('Access_token found in URL');
        return url;
      }

      return url;
    } catch (e) {
      console.error('Start URL error:', e);
      return null;
    }
  },
  subscribe(listener) {
    // Listen for URL changes
    const subscription = Linking.addEventListener('url', ({ url }) => {
      console.log('New URL received:', url);

      // Extract hash fragment from URL (for access_token)
      if (url && url.includes('#access_token=')) {
        console.log('Access_token found in URL');
      }

      listener(url);
    });

    return () => {
      subscription.remove();
    };
  },
};

export default linking;
