/**
 * Constant values used throughout the application
 * This file is created to be used in place of hardcoded values within the application.
 */

// Base colors (fixed colors used outside the theme)
export const COLORS = {
  // UI colors
  OVERLAY_BACKGROUND: 'rgba(0,0,0,0.5)',
  SHADOW_COLOR: '#000000',
  TRANSPARENT: 'transparent',

  // Theme colors (to be taken from themeContext. Here for reference only)
  PRIMARY_BLUE: '#1a91ff',
  PRIMARY_INDIGO: '#6366F1',
};

// Port numbers
export const PORTS = {
  DEV_SERVER: 8081,
  AI_ASSISTANT: 5000,
};

// API and endpoints - used in development environment
export const API = {
  DEFAULT_TIMEOUT: 10000, // 10 seconds
};

// UI dimensions
export const UI = {
  DRAWER_WIDTH: Math.min(window.innerWidth * 0.7, 280),
  SWIPE_THRESHOLD: 50,
};
