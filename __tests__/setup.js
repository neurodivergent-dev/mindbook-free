// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn(() => Promise.resolve()),
  getItem: jest.fn(() => Promise.resolve(null)),
  removeItem: jest.fn(() => Promise.resolve()),
  clear: jest.fn(() => Promise.resolve()),
}));

// Mock the Expo modules
jest.mock('expo-font', () => ({
  useFonts: jest.fn(() => [true, null]),
}));

jest.mock('expo-status-bar', () => ({
  StatusBar: () => 'StatusBar',
}));

jest.mock('expo-localization', () => ({
  locale: 'en-US',
}));

jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
  }),
  useSegments: jest.fn(() => []),
  Link: () => 'Link',
  Stack: () => 'Stack',
}));

// Mock Supabase
jest.mock('../app/utils/supabase', () => ({
  __esModule: true,
  default: {
    auth: {
      signInWithPassword: jest.fn(() => Promise.resolve({ data: null, error: null })),
      signOut: jest.fn(() => Promise.resolve({ error: null })),
      onAuthStateChange: jest.fn(() => ({ data: { subscription: { unsubscribe: jest.fn() } } })),
      getUser: jest.fn(() => Promise.resolve({ data: { user: null }, error: null })),
    },
  },
}));

// Setup React Native gesture handler
jest.mock('react-native-gesture-handler', () => {
  const View = require('react-native').View;
  return {
    Swipeable: View,
    GestureHandlerRootView: View,
  };
});

// Silence the warning: Animated: `useNativeDriver` is not supported because the native animated module is missing
// Updated mock - for React Native 0.76+
jest.mock(
  'react-native/Libraries/Animated/NativeAnimatedHelper',
  () => ({
    __esModule: true,
    default: {
      API: {},
    },
  }),
  { virtual: true }
);

// Set up react-i18next
jest.mock('react-i18next', () => ({
  useTranslation: () => {
    return {
      t: str => str,
      i18n: {
        changeLanguage: jest.fn(),
      },
    };
  },
}));

// Mock Expo Vector Icons
jest.mock('@expo/vector-icons/Ionicons', () => 'Ionicons');
jest.mock('@expo/vector-icons/MaterialIcons', () => 'MaterialIcons');
jest.mock('@expo/vector-icons', () => {
  const { View } = require('react-native');
  return {
    Ionicons: props => {
      return <View testID={`icon-${props.name}`}>{props.name}</View>;
    },
    MaterialIcons: props => {
      return <View testID={`icon-${props.name}`}>{props.name}</View>;
    },
  };
});
