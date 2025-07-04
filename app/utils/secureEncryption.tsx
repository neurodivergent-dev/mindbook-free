// This utility provides an enhanced version of encryption that uses
// local environment encryption keys only - no session checks
import CryptoJS from 'crypto-js';
import Constants from 'expo-constants';

// Get encryption key from local environment only
const getLocalEncryptionKey = (): string | null => {
  try {
    const localKey =
      Constants.expoConfig?.extra?.encryptionKey ||
      Constants.expoConfig?.extra?._e ||
      process.env.ENCRYPTION_KEY;

    if (localKey) {
      return localKey;
    }

    console.error('No encryption key found in local environment');
    return null;
  } catch (error) {
    console.error('Error getting local encryption key:', error);
    return null;
  }
};

/**
 * Encrypts data using local environment encryption key
 * @param {any} data - Data to be encrypted
 * @returns {Promise<string|null>} Encrypted data or null on error
 */
export const encryptDataSecurely = async (data: any): Promise<string | null> => {
  try {
    // Get encryption key from local environment
    const encryptionKey = getLocalEncryptionKey();

    if (!encryptionKey) {
      console.error('Cannot encrypt: Could not get ENCRYPTION_KEY from local environment');
      return null;
    }

    // Convert parsed key to format required by CryptoJS
    const cryptoKey = CryptoJS.enc.Utf8.parse(encryptionKey);

    // Generate IV value from encryption key
    const derivedIV = encryptionKey.substring(0, 16);
    const cryptoIV = CryptoJS.enc.Utf8.parse(derivedIV);

    // Convert data to JSON string
    const jsonStr = JSON.stringify(data || []);

    // Convert String to UTF8
    const wordArray = CryptoJS.enc.Utf8.parse(jsonStr);

    // Encrypt with CryptoJS
    const encrypted = CryptoJS.AES.encrypt(wordArray, cryptoKey, {
      iv: cryptoIV,
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7,
    });

    return encrypted.toString();
  } catch (error) {
    console.error('Secure encryption error:', error);
    return null;
  }
};

/**
 * Decrypts encrypted data using local environment encryption key
 * @param {string} encryptedData - Encrypted data
 * @returns {Promise<any>} Decrypted data or empty array on error
 */
export const decryptDataSecurely = async (encryptedData: string): Promise<any> => {
  try {
    if (!encryptedData) return [];

    // Get encryption key from local environment
    const encryptionKey = getLocalEncryptionKey();

    if (!encryptionKey) {
      console.error('Cannot decrypt: Could not get ENCRYPTION_KEY from local environment');
      return [];
    }

    // Convert parsed key to format required by CryptoJS
    const cryptoKey = CryptoJS.enc.Utf8.parse(encryptionKey);

    // Generate IV value from encryption key
    const derivedIV = encryptionKey.substring(0, 16);
    const cryptoIV = CryptoJS.enc.Utf8.parse(derivedIV);

    // Decrypt
    const decrypted = CryptoJS.AES.decrypt(encryptedData, cryptoKey, {
      iv: cryptoIV,
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7,
    });

    // Convert to UTF8
    const jsonStr = decrypted.toString(CryptoJS.enc.Utf8);

    // Parse JSON
    const data = JSON.parse(jsonStr);
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error('Secure decryption error:', error);
    return [];
  }
};

/**
 * Test the secure encryption functionality using local key
 * @returns {Promise<boolean>} True if encryption/decryption works
 */
export const testSecureEncryption = async (): Promise<boolean> => {
  try {
    const testData = [{ id: 1, title: 'Test Note', content: 'Test Content' }];

    const encrypted = await encryptDataSecurely(testData);
    if (!encrypted) return false;

    const decrypted = await decryptDataSecurely(encrypted);

    return JSON.stringify(testData) === JSON.stringify(decrypted);
  } catch (error) {
    console.error('Secure encryption test failed:', error);
    return false;
  }
};

export default {
  encryptDataSecurely,
  decryptDataSecurely,
  testSecureEncryption,
};
