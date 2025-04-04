// This context provides theme management for the application, including light/dark mode, accent colors, and font settings.
// It uses AsyncStorage to persist user preferences across app sessions.
// The context is created using React's Context API and provides a set of functions to change the theme, accent color, font size, and font family.
// It also provides a set of default themes and colors for the application.
import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useColorScheme } from 'react-native';
import { FONT_SIZES, FONT_FAMILIES } from '../utils/fonts';

// Type definitions for theme context
interface Theme {
  background: string;
  text: string;
  textSecondary: string;
  card: string;
  border: string;
  shadow?: string;
  // other theme features
}

interface FontSize {
  id: string;
  name: () => string;
  titleSize: number;
  contentSize: number;
}

interface FontFamily {
  id: string;
  name: () => string;
  family: string | any;
}

interface ThemeContextType {
  theme: Theme;
  themeMode: string;
  changeThemeMode: (mode: string) => Promise<void>;
  accentColor: string;
  changeAccentColor: (color: string) => Promise<void>;
  themeColors: Record<string, string>;
  fontSize: string;
  changeFontSize: (size: string) => Promise<void>;
  fontFamily: string;
  changeFontFamily: (family: string) => Promise<void>;
  fontSizes: Record<string, FontSize>;
  fontFamilies: Record<string, FontFamily>;
}

// We create with type instead of empty object
const ThemeContext = createContext<ThemeContextType>({} as ThemeContextType);

const THEME_KEY = '@theme_mode';
const ACCENT_KEY = '@accent_color';
const FONT_SIZE_KEY = '@font_size';
const FONT_FAMILY_KEY = '@font_family';

export const themeColors = {
  white: '#fff',
  white70: 'rgba(255,255,255,0.7)',
  black: '#000',
  black10: 'rgba(0,0,0,0.1)',
  transparent: 'transparent',
  blue: '#2196F3',
  purple: '#9C27B0',
  pink: '#E91E63',
  red: '#F44336',
  orange: '#FF9800',
  green: '#4CAF50',
  teal: '#009688',
  cyan: '#00BCD4',
  indigo: '#3F51B5',
  deepPurple: '#673AB7',
  lightBlue: '#03A9F4',
  lime: '#CDDC39',
  amber: '#FFC107',
  brown: '#795548',
  blueGrey: '#607D8B',
  deepOrange: '#FF5722',
  yellow: '#ffd600',
  navy: '#283593',
  rose: '#E11D48',
  turquoise: '#1abc9c',
  emerald: '#2ecc71',
  peterRiver: '#3498db',
  amethyst: '#9b59b6',
  wetAsphalt: '#34495e',
  sunFlower: '#f1c40f',
  carrot: '#e67e22',
  alizarin: '#e74c3c',
  clouds: '#ecf0f1',
  concrete: '#95a5a6',
  coral: '#FF7F50',
  crimson: '#DC143C',
  darkViolet: '#9400D3',
  forestGreen: '#228B22',
  gold: '#FFD700',
  hotPink: '#FF69B4',
  lavender: '#E6E6FA',
  limeGreen: '#32CD32',
  magenta: '#FF00FF',
  maroon: '#800000',
  midnightBlue: '#191970',
  olive: '#808000',
  orchid: '#DA70D6',
  plum: '#DDA0DD',
  salmon: '#FA8072',
  sienna: '#A0522D',
  skyBlue: '#87CEEB',
  slateBlue: '#6A5ACD',
  steelBlue: '#4682B4',
  tomato: '#FF6347',
  violet: '#EE82EE',
  // Pastel colors
  pastelBlue: '#A7C7E7',
  pastelPink: '#FFD1DC',
  pastelGreen: '#77DD77',
  pastelPurple: '#B39EB5',
  pastelYellow: '#FDFD96',
  pastelOrange: '#FFB347',
  // Metallic colors
  silver: '#C0C0C0',
  bronze: '#CD7F32',
  platinum: '#E5E4E2',
  copper: '#B87333',
  // Nature colors
  leafGreen: '#71AA34',
  oceanBlue: '#4F42B5',
  sandBeige: '#E1C699',
  sunsetOrange: '#FD5E53',
  skyAzure: '#007FFF',
  roseWood: '#65000B',
  // Neon/Vivid colors
  neonPink: '#FF10F0',
  electricBlue: '#0892D0',
  vividPurple: '#9A0EEA',
  neonGreen: '#39FF14',
  neonOrange: '#FF5F1F',
  brightYellow: '#FFEA00',
  // Vintage colors
  vintageRose: '#F3D7D4',
  vintageSeafoam: '#B5D7D2',
  vintageMustard: '#E3B448',
  vintageNavy: '#2B4162',
  vintageMaroon: '#6E3B3B',
  vintageSage: '#9CAE9C',
  // Retro colors
  retroTeal: '#0AB9B7',
  retroOrange: '#FF6F59',
  retroYellow: '#FFDA22',
  retroPink: '#FF7791',
  retroPurple: '#8971D0',
  retroRed: '#FF5348',
  // Space themed colors
  galaxyPurple: '#7A04EB',
  cosmicBlue: '#180A5E',
  nebulaPink: '#FF61D2',
  starYellow: '#FFD873',
  marsRed: '#BD1E2C',
  blackHole: '#131862',
  // Gradient effect colors
  sunsetGradient: '#FF7E5F',
  blueLagoon: '#36D1DC',
  tropicalGreen: '#41B37D',
  cherryBlossom: '#F8BBD0',
  royalPurple: '#673AB7',
  midnightIndigo: '#2C3E50',
  // Warm colors
  flamingo: '#FF8E9E',
  tangerine: '#F28500',
  cinnamon: '#7B3F00',
  rust: '#B7410E',
  terracotta: '#E57254',
  // Cool colors
  mint: '#98FF98',
  aqua: '#00FFFF',
  iceBlue: '#A5F2F3',
  periwinkle: '#CCCCFF',
  lavenderMist: '#E4E1FF',
  // Exotic colors
  dragonFruit: '#FD4659',
  mango: '#FDBE3B',
  pistachio: '#93C572',
  kiwi: '#8EE53F',
  acai: '#4A2C40',
  matcha: '#91B93E',
};

const lightTheme = {
  background: '#FFFFFF',
  text: '#000000',
  textSecondary: '#666666',
  card: '#F5F5F5',
  border: '#E0E0E0',
};

const darkTheme = {
  background: '#121212',
  text: '#FFFFFF',
  textSecondary: '#AAAAAA',
  card: '#1E1E1E',
  border: '#2C2C2C',
};

export function ThemeProvider({ children }) {
  const systemColorScheme = useColorScheme();
  const [themeMode, setThemeMode] = useState('system');
  const [accentColor, setAccentColor] = useState('blue');
  const [fontSize, setFontSize] = useState('medium');
  const [fontFamily, setFontFamily] = useState('system');

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const [savedTheme, savedAccent, savedFontSize, savedFontFamily] = await Promise.all([
        AsyncStorage.getItem(THEME_KEY),
        AsyncStorage.getItem(ACCENT_KEY),
        AsyncStorage.getItem(FONT_SIZE_KEY),
        AsyncStorage.getItem(FONT_FAMILY_KEY),
      ]);

      // Set theme with default fallback
      setThemeMode(savedTheme || 'system');

      // Set accent color with default blue
      setAccentColor(savedAccent || 'blue');

      // Set font size with default medium
      setFontSize(savedFontSize || 'medium');

      // Set font family with default system
      setFontFamily(savedFontFamily || 'system');
    } catch (error) {
      // If error occurs, set default values
      setThemeMode('system');
      setAccentColor('blue');
      setFontSize('medium');
      setFontFamily('system');
    }
  };

  const changeThemeMode = async mode => {
    setThemeMode(mode);
    await AsyncStorage.setItem(THEME_KEY, mode);
  };

  const changeAccentColor = async color => {
    setAccentColor(color);
    await AsyncStorage.setItem(ACCENT_KEY, color);
  };

  const changeFontSize = async size => {
    setFontSize(size);
    await AsyncStorage.setItem(FONT_SIZE_KEY, size);
  };

  const changeFontFamily = async family => {
    setFontFamily(family);
    await AsyncStorage.setItem(FONT_FAMILY_KEY, family);
  };

  const effectiveTheme =
    themeMode === 'system'
      ? systemColorScheme === 'dark'
        ? darkTheme
        : lightTheme
      : themeMode === 'dark'
      ? darkTheme
      : lightTheme;

  const value = {
    theme: effectiveTheme,
    themeMode,
    changeThemeMode,
    accentColor,
    changeAccentColor,
    themeColors,
    fontSize,
    changeFontSize,
    fontSizes: FONT_SIZES,
    fontFamily,
    changeFontFamily,
    fontFamilies: FONT_FAMILIES,
  };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export default ThemeProvider;
