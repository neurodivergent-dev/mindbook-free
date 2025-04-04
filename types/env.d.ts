// This file is used to declare the environment variables for the application.
declare module '@env' {
  export const SUPABASE_URL: string;
  export const SUPABASE_ANON_KEY: string;
  export const ENCRYPTION_KEY: string;
  export const NODE_ENV: 'development' | 'production';
  export const GOOGLE_WEB_CLIENT_ID: string;
  export const GOOGLE_ANDROID_CLIENT_ID: string;
  export const EXPO_METRO_MIN_LOG_LEVEL: 'error' | 'warn' | 'info' | 'debug';
  export const EXPO_METRO_QUIET: 'true' | 'false';
  export const EXPO_DEV_CLIENT: 'true' | 'false';
  export const AI_GENERATE_ENDPOINT: string;
  export const EXPO_DEV_HOST: string;
  export const EXPO_DEV_PORT: string;
}
