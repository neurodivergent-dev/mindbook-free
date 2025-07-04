import Constants from 'expo-constants';

// Cache mechanism for the encryption key
let encryptionKeyCache: string | null = null;
// Cache mechanism for the OpenRouter API key
let openrouterApiKeyCache: string | null = null;

// DEBUG MODE - Can be enabled or disabled
const DEBUG_MODE = true;

/**
 * Gets encryption key from local environment only
 * No session checks or Edge Function calls
 * @returns {Promise<string|null>} The encryption key or null if error
 */
export async function getEncryptionKey(): Promise<string | null> {
  try {
    // Return from cache if available
    if (encryptionKeyCache) {
      if (DEBUG_MODE) console.log('✅ Encryption key returned from cache');
      return encryptionKeyCache;
    }

    // Get from local environment
    const localKey =
      Constants.expoConfig?.extra?.encryptionKey ||
      Constants.expoConfig?.extra?._e ||
      process.env.ENCRYPTION_KEY;

    if (localKey) {
      if (DEBUG_MODE) console.log('✅ Encryption key retrieved from local environment');
      encryptionKeyCache = localKey;
      return localKey;
    }

    if (DEBUG_MODE) console.error('❌ No encryption key found in local environment');
    return null;
  } catch (error) {
    console.error('Error getting encryption key:', error);
    return null;
  }
}

/**
 * Gets OpenRouter API key from local environment only
 * No session checks or Edge Function calls
 * @returns {Promise<string|null>} The API key or null if error
 */
export async function getOpenRouterApiKey(): Promise<string | null> {
  try {
    // Return from cache if available
    if (openrouterApiKeyCache) {
      if (DEBUG_MODE) console.log('✅ OpenRouter API key returned from cache');
      return openrouterApiKeyCache;
    }

    // Get from local environment
    const localKey =
      Constants.expoConfig?.extra?.openrouterApiKey || process.env.OPENROUTER_API_KEY;

    if (localKey) {
      if (DEBUG_MODE) {
        console.log(
          `✅ OpenRouter API key retrieved from local environment, length: ${localKey.length}`
        );
        console.log(
          `✅ Key format: ${localKey.substring(0, 8)}...${localKey.substring(localKey.length - 5)}`
        );
      }
      openrouterApiKeyCache = localKey;
      return localKey;
    }

    if (DEBUG_MODE) console.error('❌ No OpenRouter API key found in local environment');
    return null;
  } catch (error) {
    console.error('Error getting OpenRouter API key:', error);
    return null;
  }
}

/**
 * Test function to verify local keys are working
 */
export async function testLocalKeys(): Promise<string> {
  try {
    console.log('🧪 TESTING LOCAL KEYS');

    const encryptionKey = await getEncryptionKey();
    const openRouterKey = await getOpenRouterApiKey();

    if (encryptionKey && openRouterKey) {
      console.log('✅ Both keys retrieved successfully from local environment');
      return 'Local keys test completed successfully!';
    } else {
      console.log('❌ Some keys missing from local environment');
      return 'Local keys test failed. Check your environment variables.';
    }
  } catch (error) {
    console.error('🚨 Test failed with error:', error);
    return `Local keys test failed with error: ${
      error instanceof Error ? error.message : String(error)
    }`;
  }
}

/**
 * Clears all secure keys from cache
 * Should be called on logout
 */
export function clearKeysCache() {
  encryptionKeyCache = null;
  openrouterApiKeyCache = null;
  console.log('Secure keys cache cleared');
}

/**
 * Clears just the encryption key from cache
 * @deprecated Use clearKeysCache() instead
 */
export function clearEncryptionKeyCache() {
  encryptionKeyCache = null;
}

export default {
  getEncryptionKey,
  getOpenRouterApiKey,
  clearKeysCache,
  clearEncryptionKeyCache,
  testLocalKeys,
};
