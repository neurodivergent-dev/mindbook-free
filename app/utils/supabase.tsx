// This utility file is used to create a Supabase client instance
// with custom storage for mobile apps using AsyncStorage.
// It also imports necessary dependencies and handles environment variables.
// It is important to keep this file secure and not expose sensitive information.
// Do not expose this file to the public or share it without proper security measures.
// This file is not meant to be used in a web environment, as it uses AsyncStorage for storage.
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import 'react-native-url-polyfill/auto';
import Constants from 'expo-constants';

// Get values using Constants (comes from .env via app.config.js)
const SUPABASE_URL = Constants.expoConfig?.extra?._s || Constants.expoConfig?.extra?.supabaseUrl;
const SUPABASE_ANON_KEY =
  Constants.expoConfig?.extra?._a || Constants.expoConfig?.extra?.supabaseAnonKey;

// ✅ SECURE CONFIGURATION CHECK - NO SENSITIVE DATA LOGGED
if (__DEV__) {
  console.log('🔒 Supabase configuration status:');
  console.log('  URL:', SUPABASE_URL ? '✅ Set' : '❌ Missing');
  console.log('  Anon Key:', SUPABASE_ANON_KEY ? '✅ Set (public key)' : '❌ Missing');
  console.log('  Security Level: ENHANCED');
}

// Create StorageAdapter for mobile apps
const customStorageAdapter = {
  getItem: key => AsyncStorage.getItem(key),
  setItem: (key, value) => AsyncStorage.setItem(key, value),
  removeItem: key => AsyncStorage.removeItem(key),
};

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
    storage: customStorageAdapter, // Usage with AsyncStorage
  },
});

export default supabase;
