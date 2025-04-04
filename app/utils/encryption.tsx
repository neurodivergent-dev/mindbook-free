// This utility file provides functions for encrypting and decrypting data using AES encryption.
// It uses the CryptoJS library for encryption and decryption.
// The encryption key is retrieved from environment variables using Expo Constants.
// If the encryption key is not found, an error is logged to the console.
// The utility includes functions for encrypting and decrypting general data as well as notes specifically.
import CryptoJS from 'crypto-js';
import Constants from 'expo-constants';

// Get encryption key from .env file, otherwise throw error
const ENV_ENCRYPTION_KEY = Constants.expoConfig?.extra?.encryptionKey;
if (!ENV_ENCRYPTION_KEY) {
  console.error('ENCRYPTION_KEY not found in environment variables');
  // Show additional information in development mode
  if (__DEV__) {
    console.error('Make sure your .env file contains ENCRYPTION_KEY and app is restarted');
  }
}

const ENCRYPTION_KEY = CryptoJS.enc.Utf8.parse(ENV_ENCRYPTION_KEY || '');

// Generate IV value from encryption key
const derivedIV = ENV_ENCRYPTION_KEY ? ENV_ENCRYPTION_KEY.substring(0, 16) : '';
const ENCRYPTION_IV = CryptoJS.enc.Utf8.parse(derivedIV);

/**
 * Encrypts data
 * @param {any} data - Data to be encrypted
 * @returns {string|null} Encrypted data or null on error
 */
export const encryptData = data => {
  if (!ENV_ENCRYPTION_KEY) {
    console.error('Cannot encrypt: ENCRYPTION_KEY is missing');
    return null;
  }

  try {
    // Convert data to JSON string
    const jsonStr = JSON.stringify(data || []);

    // Encrypt with CryptoJS
    const encrypted = CryptoJS.AES.encrypt(jsonStr, ENCRYPTION_KEY);
    return encrypted.toString();
  } catch (error) {
    console.error('Encryption error:', error);
    return null;
  }
};

/**
 * Decrypts encrypted data
 * @param {string} encryptedData - Encrypted data
 * @returns {any|null} Decrypted data or null on error
 */
export const decryptData = encryptedData => {
  if (!encryptedData) return [];
  if (!ENV_ENCRYPTION_KEY) {
    console.error('Cannot decrypt: ENCRYPTION_KEY is missing');
    return [];
  }

  try {
    // Decrypt with CryptoJS
    const decrypted = CryptoJS.AES.decrypt(encryptedData, ENCRYPTION_KEY);
    const jsonStr = decrypted.toString(CryptoJS.enc.Utf8);

    // Parse JSON
    const data = JSON.parse(jsonStr);
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error('Decryption error:', error);
    return [];
  }
};

// Note encryption functions
export const encryptNotes = notes => {
  if (!ENV_ENCRYPTION_KEY) {
    console.error('Cannot encrypt notes: ENCRYPTION_KEY is missing');
    return null;
  }

  try {
    // Convert data to JSON string
    const jsonStr = JSON.stringify(notes || []);

    // Convert String to UTF8
    const wordArray = CryptoJS.enc.Utf8.parse(jsonStr);

    // Simple AES encryption
    const encrypted = CryptoJS.AES.encrypt(wordArray, ENCRYPTION_KEY, {
      iv: ENCRYPTION_IV,
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7,
    });

    return encrypted.toString();
  } catch (error) {
    console.error('Note encryption error:', error);
    return null;
  }
};

export const decryptNotes = encryptedData => {
  try {
    if (!encryptedData) return [];
    if (!ENV_ENCRYPTION_KEY) {
      console.error('Cannot decrypt notes: ENCRYPTION_KEY is missing');
      return [];
    }

    // Decrypt
    const decrypted = CryptoJS.AES.decrypt(encryptedData, ENCRYPTION_KEY, {
      iv: ENCRYPTION_IV,
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7,
    });

    // Convert to UTF8
    const jsonStr = decrypted.toString(CryptoJS.enc.Utf8);

    // JSON parse
    const data = JSON.parse(jsonStr);
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error('Note decryption error:', error);
    return [];
  }
};

// Test function
export const testEncryption = () => {
  const testData = [{ id: 1, title: 'Test Note', content: 'Test Content' }];

  const encrypted = encryptNotes(testData);

  const decrypted = decryptNotes(encrypted);

  const success = JSON.stringify(testData) === JSON.stringify(decrypted);

  return success;
};

export default {
  encryptData,
  decryptData,
  encryptNotes,
  decryptNotes,
  testEncryption,
};
