// This utility file provides functions for encrypting and decrypting data using AES encryption.
// It uses the CryptoJS library for encryption and decryption.
// The encryption key is retrieved from local environment only - no session checks
import CryptoJS from 'crypto-js';
import Constants from 'expo-constants';

// Get encryption key from local environment only
const ENV_ENCRYPTION_KEY =
  Constants.expoConfig?.extra?.encryptionKey ||
  Constants.expoConfig?.extra?._e ||
  process.env.ENCRYPTION_KEY;

if (!ENV_ENCRYPTION_KEY && __DEV__) {
  console.error('ENCRYPTION_KEY not found in environment variables');
  console.error('Make sure your .env file contains ENCRYPTION_KEY for development');
}

/**
 * Gets the encryption key from local environment only
 * No session checks or Edge Function calls
 * @returns {string|null} The encryption key or null on error
 */
const getLocalKey = (): string | null => {
  try {
    if (ENV_ENCRYPTION_KEY) {
      return ENV_ENCRYPTION_KEY;
    }
    throw new Error('No encryption key available in local environment');
  } catch (error) {
    console.error('Error getting encryption key:', error);
    return null;
  }
};

/**
 * Encrypts data using local encryption key
 * @param {any} data - Data to be encrypted
 * @returns {Promise<string|null>} Encrypted data or null on error
 */
export const encryptData = async data => {
  try {
    const key = getLocalKey();
    if (!key) {
      console.error('Cannot encrypt: No encryption key available');
      return null;
    }

    const ENCRYPTION_KEY = CryptoJS.enc.Utf8.parse(key);

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
 * Decrypts encrypted data using local encryption key
 * @param {string} encryptedData - Encrypted data
 * @returns {Promise<any>} Decrypted data or empty array on error
 */
export const decryptData = async encryptedData => {
  if (!encryptedData) return [];

  try {
    const key = getLocalKey();
    if (!key) {
      console.error('Cannot decrypt: No encryption key available');
      return [];
    }

    const ENCRYPTION_KEY = CryptoJS.enc.Utf8.parse(key);

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

/**
 * Encrypts notes specifically using local encryption key
 * @param {any} notes - Notes to encrypt
 * @returns {Promise<string|null>} Encrypted notes or null on error
 */
export const encryptNotes = async notes => {
  try {
    const key = getLocalKey();
    if (!key) {
      console.error('Cannot encrypt notes: No encryption key available');
      return null;
    }

    const ENCRYPTION_KEY = CryptoJS.enc.Utf8.parse(key);

    // Generate IV from the key
    const derivedIV = key.substring(0, 16);
    const ENCRYPTION_IV = CryptoJS.enc.Utf8.parse(derivedIV);

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

/**
 * Decrypts encrypted notes using local encryption key
 * @param {string} encryptedData - Encrypted notes
 * @returns {Promise<any>} Decrypted notes or empty array on error
 */
export const decryptNotes = async encryptedData => {
  try {
    if (!encryptedData) return [];

    const key = getLocalKey();
    if (!key) {
      console.error('Cannot decrypt notes: No encryption key available');
      return [];
    }

    const ENCRYPTION_KEY = CryptoJS.enc.Utf8.parse(key);

    // Generate IV from the key
    const derivedIV = key.substring(0, 16);
    const ENCRYPTION_IV = CryptoJS.enc.Utf8.parse(derivedIV);

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

/**
 * Tests the encryption functionality using local key
 * @returns {Promise<boolean>} True if encryption/decryption works
 */
export const testEncryption = async () => {
  try {
    const testData = [{ id: 1, title: 'Test Note', content: 'Test Content' }];

    const encrypted = await encryptNotes(testData);
    if (!encrypted) return false;

    const decrypted = await decryptNotes(encrypted);

    const success = JSON.stringify(testData) === JSON.stringify(decrypted);
    return success;
  } catch (error) {
    console.error('Encryption test failed:', error);
    return false;
  }
};

export default {
  encryptData,
  decryptData,
  encryptNotes,
  decryptNotes,
  testEncryption,
};
