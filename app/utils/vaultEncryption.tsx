// Vault-specific encryption system
// Uses environment key and stores it in SecureStore for offline access
import CryptoJS from 'crypto-js';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Emergency data recovery function for malformed UTF-8 vault data
 * @param {string} corruptedData - Corrupted encrypted data
 * @returns {Promise<any>} Recovered data or empty array
 */
export const emergencyVaultDataRecovery = async (corruptedData: string): Promise<any> => {
  console.log('🚨 Emergency vault data recovery started...');

  try {
    // Try different decryption methods in order of likelihood
    const recoveryMethods = [
      () => tryVaultDecryption(corruptedData),
      () => tryRegularEncryptionDecryption(corruptedData),
      () => tryLegacyDecryption(corruptedData),
      () => tryRawJSONParse(corruptedData),
      () => tryBase64Decode(corruptedData),
    ];

    for (const method of recoveryMethods) {
      try {
        const result = await method();
        if (result && Array.isArray(result) && result.length > 0) {
          console.log('✅ Data recovery successful with method:', method.name);
          return result;
        }
      } catch (error) {
        console.log(
          `⚠️ Recovery method ${method.name} failed:`,
          error instanceof Error ? error.message : String(error)
        );
        continue;
      }
    }

    console.error('❌ All recovery methods failed');
    return [];
  } catch (error) {
    console.error('❌ Emergency recovery error:', error);
    return [];
  }
};

/**
 * Try vault-specific decryption
 */
const tryVaultDecryption = async (encryptedData: string): Promise<any> => {
  const key = await getVaultKey();
  if (!key) throw new Error('No vault key');

  const ENCRYPTION_KEY = CryptoJS.enc.Utf8.parse(key);
  const derivedIV = key.substring(0, 16);
  const ENCRYPTION_IV = CryptoJS.enc.Utf8.parse(derivedIV);

  const decrypted = CryptoJS.AES.decrypt(encryptedData, ENCRYPTION_KEY, {
    iv: ENCRYPTION_IV,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7,
  });

  const jsonStr = decrypted.toString(CryptoJS.enc.Utf8);
  if (!jsonStr) throw new Error('Empty decryption result');

  return JSON.parse(jsonStr);
};

/**
 * Try regular encryption decryption (for mixed data)
 */
const tryRegularEncryptionDecryption = async (encryptedData: string): Promise<any> => {
  const key = (await getVaultKey()) || (await getRegularEncryptionKey());
  if (!key) throw new Error('No encryption key');

  const ENCRYPTION_KEY = CryptoJS.enc.Utf8.parse(key);

  const decrypted = CryptoJS.AES.decrypt(encryptedData, ENCRYPTION_KEY);
  const jsonStr = decrypted.toString(CryptoJS.enc.Utf8);
  if (!jsonStr) throw new Error('Empty decryption result');

  return JSON.parse(jsonStr);
};

/**
 * Try legacy decryption with different IV methods
 */
const tryLegacyDecryption = async (encryptedData: string): Promise<any> => {
  const key = await getVaultKey();
  if (!key) throw new Error('No vault key');

  // Try different IV generation methods that might have been used
  const ivMethods = [
    key.substring(0, 16),
    key.substring(key.length - 16),
    'mindbook_iv_2024',
    '1234567890123456',
  ];

  for (const iv of ivMethods) {
    try {
      const ENCRYPTION_KEY = CryptoJS.enc.Utf8.parse(key);
      const ENCRYPTION_IV = CryptoJS.enc.Utf8.parse(iv);

      const decrypted = CryptoJS.AES.decrypt(encryptedData, ENCRYPTION_KEY, {
        iv: ENCRYPTION_IV,
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7,
      });

      const jsonStr = decrypted.toString(CryptoJS.enc.Utf8);
      if (jsonStr) {
        return JSON.parse(jsonStr);
      }
    } catch (error) {
      continue;
    }
  }

  throw new Error('All IV methods failed');
};

/**
 * Try raw JSON parse (unencrypted data)
 */
const tryRawJSONParse = async (data: string): Promise<any> => {
  return JSON.parse(data);
};

/**
 * Try Base64 decode then JSON parse
 */
const tryBase64Decode = async (data: string): Promise<any> => {
  const decoded = CryptoJS.enc.Base64.parse(data).toString(CryptoJS.enc.Utf8);
  return JSON.parse(decoded);
};

/**
 * Get regular encryption key for fallback
 */
const getRegularEncryptionKey = async (): Promise<string | null> => {
  try {
    return (
      Constants.expoConfig?.extra?.encryptionKey ||
      Constants.expoConfig?.extra?._e ||
      process.env.ENCRYPTION_KEY ||
      null
    );
  } catch (error) {
    return null;
  }
};

/**
 * Gets the vault encryption key - ONLY from app.config extra
 * @returns {string|null} The encryption key or null on error
 */
const getVaultKey = (): string | null => {
  return Constants.expoConfig?.extra?._v || Constants.expoConfig?.extra?.vaultEncryptionKey || null;
};

/**
 * Encrypts vault notes with improved error handling
 * @param {any} notes - Notes to encrypt
 * @returns {Promise<string|null>} Encrypted notes or null on error
 */
export const encryptVaultNotes = async (notes: any): Promise<string | null> => {
  try {
    const key = getVaultKey();
    if (!key) {
      console.error('Cannot encrypt vault notes: No encryption key available');
      return null;
    }
    const ENCRYPTION_KEY = CryptoJS.enc.Utf8.parse(key);
    const derivedIV = key.substring(0, 16);
    const ENCRYPTION_IV = CryptoJS.enc.Utf8.parse(derivedIV);
    const jsonStr = JSON.stringify(notes || []);
    if (!jsonStr) {
      console.error('Failed to stringify notes for encryption');
      return null;
    }
    const wordArray = CryptoJS.enc.Utf8.parse(jsonStr);
    const encrypted = CryptoJS.AES.encrypt(wordArray, ENCRYPTION_KEY, {
      iv: ENCRYPTION_IV,
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7,
    });
    const encryptedString = encrypted.toString();
    if (!encryptedString) {
      console.error('Encryption resulted in empty string');
      return null;
    }
    return encryptedString;
  } catch (error) {
    console.error('Vault note encryption error:', error);
    return null;
  }
};

/**
 * Decrypts vault notes with emergency recovery fallback
 * @param {string} encryptedData - Encrypted notes
 * @returns {Promise<any>} Decrypted notes or empty array on error
 */
export const decryptVaultNotes = async (encryptedData: string): Promise<any> => {
  try {
    if (!encryptedData) return [];
    const key = getVaultKey();
    if (!key) {
      console.error('Cannot decrypt vault notes: No encryption key available');
      return [];
    }
    const ENCRYPTION_KEY = CryptoJS.enc.Utf8.parse(key);
    const derivedIV = key.substring(0, 16);
    const ENCRYPTION_IV = CryptoJS.enc.Utf8.parse(derivedIV);
    const decrypted = CryptoJS.AES.decrypt(encryptedData, ENCRYPTION_KEY, {
      iv: ENCRYPTION_IV,
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7,
    });
    const jsonStr = decrypted.toString(CryptoJS.enc.Utf8);
    if (!jsonStr) {
      console.warn('Normal decryption failed, trying emergency recovery...');
      return await emergencyVaultDataRecovery(encryptedData);
    }
    const data = JSON.parse(jsonStr);
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error('Vault note decryption error:', error);
    console.warn('Attempting emergency data recovery...');
    try {
      return await emergencyVaultDataRecovery(encryptedData);
    } catch (recoveryError) {
      console.error('Emergency recovery failed:', recoveryError);
      return [];
    }
  }
};

/**
 * Migrates vault data from old encryption to new encryption
 * @returns {Promise<boolean>} Migration success
 */
export const migrateVaultData = async (): Promise<boolean> => {
  try {
    console.log('🔄 Starting vault data migration...');

    const vaultNotesStr = await AsyncStorage.getItem('vault_notes');
    if (!vaultNotesStr) {
      console.log('No vault data to migrate');
      return true;
    }

    // Try to recover data using emergency recovery
    const recoveredData = await emergencyVaultDataRecovery(vaultNotesStr);

    if (recoveredData && Array.isArray(recoveredData) && recoveredData.length > 0) {
      // Re-encrypt with current system
      const reEncrypted = await encryptVaultNotes(recoveredData);
      if (reEncrypted) {
        await AsyncStorage.setItem('vault_notes', reEncrypted);
        console.log('✅ Vault data migration successful');
        return true;
      }
    }

    console.log('⚠️ No data recovered during migration');
    return false;
  } catch (error) {
    console.error('❌ Vault data migration failed:', error);
    return false;
  }
};

/**
 * Tests the vault encryption functionality
 * @returns {Promise<boolean>} True if encryption/decryption works
 */
export const testVaultEncryption = async (): Promise<boolean> => {
  try {
    const testData = [{ id: 1, title: 'Test Vault Note', content: 'Test Content' }];

    const encrypted = await encryptVaultNotes(testData);
    if (!encrypted) return false;

    const decrypted = await decryptVaultNotes(encrypted);

    const success = JSON.stringify(testData) === JSON.stringify(decrypted);
    console.log('Vault encryption test result:', success);
    return success;
  } catch (error) {
    console.error('Vault encryption test failed:', error);
    return false;
  }
};

/**
 * Check vault data integrity and attempt recovery if needed
 * @returns {Promise<{success: boolean, recovered: boolean, count: number}>}
 */
export const checkVaultDataIntegrity = async (): Promise<{
  success: boolean;
  recovered: boolean;
  count: number;
}> => {
  try {
    console.log('🔍 Checking vault data integrity...');

    const vaultNotesStr = await AsyncStorage.getItem('vault_notes');
    if (!vaultNotesStr) {
      return { success: true, recovered: false, count: 0 };
    }

    // Try normal decryption first
    let notes;
    let recovered = false;

    try {
      const key = getVaultKey();
      if (!key) throw new Error('No vault key');

      const ENCRYPTION_KEY = CryptoJS.enc.Utf8.parse(key);
      const derivedIV = key.substring(0, 16);
      const ENCRYPTION_IV = CryptoJS.enc.Utf8.parse(derivedIV);

      const decrypted = CryptoJS.AES.decrypt(vaultNotesStr, ENCRYPTION_KEY, {
        iv: ENCRYPTION_IV,
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7,
      });

      const jsonStr = decrypted.toString(CryptoJS.enc.Utf8);
      notes = JSON.parse(jsonStr);

      console.log('✅ Vault data integrity check passed');
    } catch (error) {
      console.warn('⚠️ Vault data integrity check failed, attempting recovery...');
      notes = await emergencyVaultDataRecovery(vaultNotesStr);
      recovered = true;

      if (notes && Array.isArray(notes) && notes.length > 0) {
        // Re-encrypt recovered data
        const reEncrypted = await encryptVaultNotes(notes);
        if (reEncrypted) {
          await AsyncStorage.setItem('vault_notes', reEncrypted);
          console.log('✅ Vault data recovered and re-encrypted');
        }
      }
    }

    const count = Array.isArray(notes) ? notes.length : 0;
    return { success: true, recovered, count };
  } catch (error) {
    console.error('❌ Vault integrity check failed:', error);
    return { success: false, recovered: false, count: 0 };
  }
};
