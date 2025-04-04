/**
 * Environment Variables Control File (For React Native Expo)
 * This file tests if variables from app.config.js are imported correctly
 */

import Constants from 'expo-constants';
import { Alert } from 'react-native';

/**
 * Checks environment variables and returns status
 * @returns An object containing the results of the check
 */
export const checkEnvVariables = () => {
  const extra = Constants.expoConfig?.extra;

  if (!extra) {
    return {
      status: 'error',
      message: 'Expo configuration not found! Constants.expoConfig.extra is not defined.',
      variables: {},
    };
  }

  // Check critical variables
  const criticalVars = [
    'supabaseUrl',
    'supabaseAnonKey',
    'encryptionKey',
    'googleWebClientId',
    'googleAndroidClientId',
    'aiGenerateEndpoint',
    'expoDevHost',
    'expoDevPort',
  ];

  // Get all extra variables (sensitive information masked)
  const variables = {};
  Object.keys(extra).forEach(key => {
    const value =
      criticalVars.includes(key) && typeof extra[key] === 'string'
        ? maskSensitiveValue(extra[key])
        : extra[key];

    variables[key] = value;
  });

  // Check for missing variables
  const missingVars = criticalVars.filter(key => !extra[key]);

  return {
    status: missingVars.length === 0 ? 'success' : 'warning',
    message:
      missingVars.length === 0
        ? 'All critical variables are present.'
        : `Missing variables: ${missingVars.join(', ')}`,
    variables,
    missingVars,
  };
};

/**
 * Masks sensitive information (shows only the first and last few characters)
 * @param value Value to mask
 * @returns Masked value
 */
const maskSensitiveValue = (value: string): string => {
  if (!value || value.length < 8) return '***';

  // Adjust masking strategy based on value length
  if (value.length > 30) {
    // For long values (like Google Client IDs)
    return `${value.substring(0, 5)}...${value.substring(value.length - 3)}`;
  }

  // For normal length values (like Supabase keys)
  return `${value.substring(0, 3)}...${value.substring(value.length - 3)}`;
};

/**
 * Prints environment variables to the console
 * @param showAlert Option to display results as an alert
 */
export const logEnvVariables = (showAlert = false) => {
  const result = checkEnvVariables();

  // Print to console
  console.log('\n🔍 EXPO ENVIRONMENT VARIABLES CONTROL');
  console.log('=====================================');
  console.log(
    `Status: ${
      result.status === 'success'
        ? '✅ Success'
        : result.status === 'warning'
        ? '⚠️ Warning'
        : '❌ Error'
    }`
  );
  console.log(`Message: ${result.message}`);
  console.log('\nVariables:');
  console.table(result.variables);
  console.log('=====================================');

  // Show alert if desired
  if (showAlert) {
    Alert.alert(
      'Checking Environment Variables',
      `Status: ${
        result.status === 'success'
          ? 'Success ✅'
          : result.status === 'warning'
          ? 'Warning ⚠️'
          : 'Error ❌'
      }
      
${result.message}

${result.missingVars?.length > 0 ? `Missing variables: ${result.missingVars.join(', ')}` : ''}`,
      [{ text: 'Ok', style: 'default' }]
    );
  }

  return result;
};

export default {
  checkEnvVariables,
  logEnvVariables,
};
