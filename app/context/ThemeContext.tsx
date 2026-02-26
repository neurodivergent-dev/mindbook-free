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
  forestLime: '#6B8E23',
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
  deepForest: '#228B22',
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
  pastelBlue: '#6B9BD8',
  pastelPink: '#E89BB5',
  pastelGreen: '#77DD77',
  pastelPurple: '#B39EB5',
  pastelYellow: '#a0a82d',
  pastelOrange: '#FFB347',
  // Metallic colors
  silver: '#8C8C8C',
  metallicBronze: '#CD7F32',
  platinum: '#B8B6B3',
  copper: '#B87333',
  // Nature colors
  leafGreen: '#71AA34',
  oceanBlue: '#4F42B5',
  sandBeige: '#C4A676',
  sunsetOrange: '#FD5E53',
  skyAzure: '#007FFF',
  roseWood: '#65000B',
  // Neon/Vivid colors
  neonPink: '#FF10F0',
  electricBlue: '#0892D0',
  vividPurple: '#9A0EEA',
  neonGreen: '#21b505',
  neonOrange: '#FF5F1F',
  brightYellow: '#d1c004',
  // Vintage colors
  vintageRose: '#e39c96',
  vintageSeafoam: '#70baae',
  vintageMustard: '#E3B448',
  vintageNavy: '#2B4162',
  vintageMaroon: '#6E3B3B',
  vintageSage: '#5e7a5e',
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
  cherryBlossom: '#E087A3',
  royalPurple: '#673AB7',
  midnightIndigo: '#2C3E50',
  // Warm colors
  flamingo: '#FF8E9E',
  tangerine: '#F28500',
  cinnamon: '#7B3F00',
  rust: '#B7410E',
  terracotta: '#E57254',
  // Cool colors
  mint: '#4CAF50',
  aqua: '#00FFFF',
  iceBlue: '#4A90E2',
  periwinkle: '#9999E6',
  lavenderMist: '#8A7CA8',
  // Exotic colors
  dragonFruit: '#FD4659',
  mango: '#FDBE3B',
  pistachio: '#93C572',
  kiwi: '#8EE53F',
  acai: '#4A2C40',
  matcha: '#91B93E',
  // Essential colors (missing basic colors)
  charcoal: '#2F4F4F',
  deepCharcoal: '#36454F',
  steel: '#4682B4',
  gunmetal: '#2C3539',
  pewter: '#96A8A1',
  bronze: '#CD7F32',
  darkBronze: '#8B4513',
  darkSteel: '#36648B',
  darkSlate: '#2F4F4F',
  richBrown: '#654321',
  dustyRose: '#C4A484',
  beige: '#D4C4A8',
  khaki: '#BDB76B',
  peach: '#DDA577',
  lightGray: '#999999',
  darkGray: '#A9A9A9',
  cream: '#E6E2B8',
  wheat: '#D2B48C',
  tan: '#A67C52',
  // Professional/Business colors
  slate: '#483D8B',
  darkSlate2: '#2F4F4F',
  graphite: '#36454F',
  darkGraphite: '#2C2C2C',
  businessBlue: '#1F4E79',
  corporateGray: '#36454F',
  executiveNavy: '#1C3A5B',
  professionalTeal: '#2F5F5F',
  darkOlive: '#556B2F',
  // Additional distinctive dark colors
  deepWine: '#722F37',
  darkEmerald: '#355E3B',
  midnightPurple: '#301934',
  darkCrimson: '#8B0000',
  // Creative & Mystical colors (unique combinations)
  stormySea: '#2E4057', // Stormy sea - dark blue-gray
  ancientGold: '#B8860B', // Ancient gold - mat gold tone
  shadowForest: '#2D4A22', // Shadow forest - very dark green
  velvetNight: '#4A148C', // Velvet night - deep purple
  mysticAmber: '#8B4A00', // Mystic amber - warm brown-orange
  dragonScale: '#4A5D23', // Dragon scale - green-brown mix
  // Light but readable colors (header-friendly)
  softCoral: '#D2847A', // Soft coral - warm light tone
  dustyLavender: '#9B8AA3', // Dusty lavender - light purple-gray
  paleGold: '#C9A96E', // Pale gold - light yellow tone
  mistySage: '#A4B494', // Misty sage - light green-gray
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
  const [accentColor, setAccentColor] = useState('green');
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

      // Set accent color with default green
      setAccentColor(savedAccent || 'green');

      // Set font size with default medium
      setFontSize(savedFontSize || 'medium');

      // Set font family with default system
      setFontFamily(savedFontFamily || 'system');
    } catch (error) {
      // If error occurs, set default values
      setThemeMode('system');
      setAccentColor('green');
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
