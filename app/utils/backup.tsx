// This utils is for backup and restore operations using Supabase
// It includes functions for backup, restore, and checking the last backup date
// It also includes functions for checking if there are changes since the last backup
// and cleaning up old backups
// It uses AsyncStorage for local storage and Expo's Crypto for hashing
import AsyncStorage from '@react-native-async-storage/async-storage';
import supabase from './supabase';
import { NOTES_KEY, CATEGORIES_KEY, buildNoteIndices } from './storage';
import { encryptNotes, decryptNotes } from './encryption';
import Constants from 'expo-constants';
import i18n from 'i18next';
import * as Crypto from 'expo-crypto';
import * as Network from 'expo-network';

// Access translations via the t function
const t = (key: string) => i18n.t(key);

/**
 * Merges notes by unique ID
 * @param {Array} cloudNotes - Notes from cloud
 * @param {Array} localNotes - Notes from local storage
 * @returns {Array} - Merged notes
 */
export const mergeByUniqueId = (cloudNotes, localNotes) => {
  // Create a map to hold all notes
  const mergedMap = new Map();

  // First add cloud notes
  cloudNotes.forEach(note => {
    mergedMap.set(note.id, note);
  });

  // Then add local notes (will overwrite if same ID exists, or add if new)
  localNotes.forEach(note => {
    // If same ID exists in both cloud and local, decide based on last modified date
    if (mergedMap.has(note.id)) {
      const cloudNote = mergedMap.get(note.id);
      // Keep the most recently updated note
      if (new Date(note.updatedAt) > new Date(cloudNote.updatedAt)) {
        mergedMap.set(note.id, note);
      }
    } else {
      mergedMap.set(note.id, note);
    }
  });

  // Convert map back to array
  return Array.from(mergedMap.values());
};

/**
 * Merges categories arrays (simple string arrays)
 * @param {Array} cloudCategories - Categories from cloud
 * @param {Array} localCategories - Categories from local storage
 * @returns {Array} - Merged categories (unique values only)
 */
export const mergeCategories = (cloudCategories, localCategories) => {
  // Ensure both inputs are arrays
  const safeCloudCategories = Array.isArray(cloudCategories) ? cloudCategories : [];
  const safeLocalCategories = Array.isArray(localCategories) ? localCategories : [];

  // Combine both arrays and remove duplicates
  const allCategories = [...safeCloudCategories, ...safeLocalCategories];
  const uniqueCategories = [...new Set(allCategories)];

  return uniqueCategories;
};

/**
 * Backup notes and categories on Supabase
 * @param {string} userId - User ID
 * @returns {Promise<Object>} - Backup result
 */
export const backupToCloud = async (userId: string) => {
  try {
    // Offline check: Prevent backup if not connected
    const networkState = await Network.getNetworkStateAsync();
    if (!networkState.isConnected) {
      return { success: false, error: 'Offline mode: backup not performed' };
    }

    // Add additional validation
    if (!userId || userId === 'undefined') {
      const currentUser = await getCurrentUserId();
      if (!currentUser) {
        throw new Error('No active users found');
      }
      userId = currentUser;
    }

    // 1. User control
    if (!userId) {
      throw new Error('User ID required');
    }

    // 2. Retrieve data from AsyncStorage
    const notesJson = await AsyncStorage.getItem(NOTES_KEY);
    const categoriesJson = await AsyncStorage.getItem(CATEGORIES_KEY);

    // 3. JSON parse
    const notes = notesJson ? JSON.parse(notesJson) : [];
    const categories = categoriesJson ? JSON.parse(categoriesJson) : [];

    // 4. Change control
    const hasChanged = await hasChangedSinceLastBackup(userId, notes, categories);

    if (!hasChanged) {
      return { success: true, message: 'No changes, skipping backup' };
    }

    // 5. Get existing cloud backup
    const { data: existingBackup, error: fetchError } = await supabase
      .from('backups')
      .select('data')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })
      .limit(1);

    let cloudNotes = [];
    let cloudCategories = [];

    if (!fetchError && existingBackup && existingBackup.length > 0) {
      const backupData = existingBackup[0].data;
      cloudNotes = (await decryptNotes(backupData.notes)) || [];
      cloudCategories = (await decryptNotes(backupData.categories)) || [];
    }

    // 6. Merge notes and categories
    const mergedNotes = mergeByUniqueId(cloudNotes, notes);
    const mergedCategories = mergeCategories(cloudCategories, categories);

    // 7. Encrypt data
    const encryptedNotes = await encryptNotes(mergedNotes);
    const encryptedCategories = await encryptNotes(mergedCategories);

    if (!encryptedNotes || !encryptedCategories) {
      throw new Error('Data could not be encrypted');
    }

    // 8. Prepare backup data
    const backupData = {
      notes: encryptedNotes,
      categories: encryptedCategories,
      backup_date: new Date().toISOString(),
      app_version: Constants.expoConfig?.version || '1.0.0',
    };

    // 9. First check if a backup exists
    const { data: existingBackupCheck } = await supabase
      .from('backups')
      .select('id')
      .eq('user_id', userId)
      .limit(1);

    let backupResult;

    if (existingBackupCheck && existingBackupCheck.length > 0) {
      // Update existing backup
      backupResult = await supabase
        .from('backups')
        .update({
          data: backupData,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId);
    } else {
      // Insert new backup
      backupResult = await supabase.from('backups').insert({
        user_id: userId,
        data: backupData,
        updated_at: new Date().toISOString(),
      });
    }

    const upsertError = backupResult.error;

    if (upsertError) {
      throw new Error(`Backup error: ${JSON.stringify(upsertError)}`);
    }

    // 10. Clean up old backups
    cleanupOldBackups(userId).catch(() => {
      // Failure to clean old backups should not affect new backups
      console.log('Error occurred while cleaning old backups');
    });

    // Set update flags for UI refresh after successful backup
    try {
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      await AsyncStorage.setItem('@categories_updated', 'true');
      await AsyncStorage.setItem('@notes_updated', 'true');
    } catch (flagError) {
      // Flag setting failure shouldn't affect backup success
      console.log('Failed to set update flags:', flagError);
    }

    return { success: true };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
};

/**
 * Restores notes and categories from Supabase
 * @param {string} userId - User ID
 * @returns {Promise<Object>} - Restore result
 */
export const restoreFromCloud = async userId => {
  try {
    // Offline check: Prevent restore if not connected
    const networkState = await Network.getNetworkStateAsync();
    if (!networkState.isConnected) {
      throw new Error('Offline mode: cannot restore backup');
    }

    if (!userId) {
      throw new Error('User ID required');
    }

    const { data, error } = await supabase
      .from('backups')
      .select('data')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })
      .limit(1);

    if (error) {
      if (error.code === 'PGRST116') {
        throw new Error(t('settings.backupDatabaseError'));
      }
      throw error;
    }

    if (!data || data.length === 0) {
      throw new Error(t('settings.noBackupFound'));
    }

    const backupData = data[0].data;

    const cloudNotes = await decryptNotes(backupData.notes);
    const cloudCategories = await decryptNotes(backupData.categories);

    // Get local notes and categories
    const notesJson = await AsyncStorage.getItem(NOTES_KEY);
    const categoriesJson = await AsyncStorage.getItem(CATEGORIES_KEY);

    // Parse local data
    const localNotes = notesJson ? JSON.parse(notesJson) : [];
    const localCategories = categoriesJson ? JSON.parse(categoriesJson) : [];

    // If we have local notes, ask user what to do
    if (localNotes.length > 0) {
      // For now, we'll automatically merge
      // In a future update, you could implement a user prompt here

      // Merge notes and categories
      const mergedNotes = mergeByUniqueId(cloudNotes, localNotes);
      const mergedCategories = mergeCategories(cloudCategories, localCategories);

      // Save merged data
      await AsyncStorage.setItem(NOTES_KEY, JSON.stringify(mergedNotes));
      await AsyncStorage.setItem(CATEGORIES_KEY, JSON.stringify(mergedCategories));

      // CRITICAL: Rebuild note indices after restore
      await buildNoteIndices();

      // Set update flags for UI refresh
      await AsyncStorage.setItem('@categories_updated', 'true');
      await AsyncStorage.setItem('@notes_updated', 'true');

      return {
        success: true,
        message:
          t('settings.restoreMergeSuccess') +
          '\n' +
          new Date(backupData.backup_date).toLocaleString(
            i18n.language === 'tr' ? 'tr-TR' : 'en-US',
            {
              year: 'numeric',
              month: '2-digit',
              day: '2-digit',
              hour: '2-digit',
              minute: '2-digit',
            }
          ),
        backupDate: backupData.backup_date,
      };
    } else {
      // If no local notes, just restore from cloud
      await AsyncStorage.setItem(NOTES_KEY, JSON.stringify(cloudNotes));
      await AsyncStorage.setItem(CATEGORIES_KEY, JSON.stringify(cloudCategories));

      // CRITICAL: Rebuild note indices after restore
      await buildNoteIndices();

      // Set update flags for UI refresh
      await AsyncStorage.setItem('@categories_updated', 'true');
      await AsyncStorage.setItem('@notes_updated', 'true');

      return {
        success: true,
        message:
          t('settings.restoreSuccess') +
          '\n' +
          new Date(backupData.backup_date).toLocaleString(
            i18n.language === 'tr' ? 'tr-TR' : 'en-US',
            {
              year: 'numeric',
              month: '2-digit',
              day: '2-digit',
              hour: '2-digit',
              minute: '2-digit',
            }
          ),
        backupDate: backupData.backup_date,
      };
    }
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
};

/**
 * Gets the last backup date in Supabase
 * @param {string} userId - User ID
 * @returns {Promise<string|null>} - Backup date
 */
export const getLastCloudBackupDate = async userId => {
  try {
    const { data, error } = await supabase
      .from('backups')
      .select('data')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })
      .limit(1);

    if (error) {
      return null;
    }

    if (!data || data.length === 0) {
      return null;
    }

    return data[0].data.backup_date || null;
  } catch (error) {
    return null;
  }
};

/**
 * Gets the current logged in user ID
 * @returns {Promise<string|null>} - User ID or null
 */
export const getCurrentUserId = async () => {
  try {
    // 1. First try to get the active Supabase session
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession();

    if (error) {
      // Error occurred while retrieving session, user may not be logged in
      console.log('Failed to retrieve session information:', error);
    }

    if (session?.user?.id) {
      // Store the session info in AsyncStorage for backup
      await AsyncStorage.setItem(
        '@user',
        JSON.stringify({
          id: session.user.id,
          email: session.user.email,
        })
      );

      return session.user.id;
    }

    // 2. Try to get from AsyncStorage if no active session
    const storedUser = await AsyncStorage.getItem('@user');
    if (storedUser) {
      const userData = JSON.parse(storedUser);
      if (userData?.id) {
        return userData.id;
      }
    }

    // 3. If no user found, attempt to refresh the session
    const { data: refreshData } = await supabase.auth.refreshSession();
    if (refreshData?.session?.user?.id) {
      return refreshData.session.user.id;
    }

    return null;
  } catch (error) {
    return null;
  }
};

/**
 * Automatic backup trigger
 * @param {Object|string} user - User information or user ID
 * @param {boolean} forceBackup - Force backup regardless of conditions
 * @returns {Promise<Object|null>} - Backup result or null
 */
export const triggerAutoBackup = async (user, forceBackup = false) => {
  try {
    // User controls
    let userId = null;

    // User information sent as a parameter
    if (user && typeof user === 'object' && user.id) {
      userId = user.id;
    } else if (user && typeof user === 'string') {
      userId = user; // If a string is passed, assume it's the user ID
    } else {
      // Check active user
      userId = await getCurrentUserId();
    }

    if (!userId) {
      return null;
    }

    // If forceBackup is true, bypass all checks and perform backup immediately
    if (forceBackup) {
      console.log('Forcing immediate backup...');
      const backupResult = await backupToCloud(userId);

      if (backupResult.success) {
        // Update last backup timestamp after successful backup
        const now = new Date().toISOString();
        await AsyncStorage.setItem('@lastBackupTimestamp', now);
        await AsyncStorage.setItem('@last_backup_time', now);
        console.log('Immediate backup completed successfully');
      } else {
        console.error('Immediate backup failed:', backupResult.error || 'Unknown error');
      }

      return backupResult;
    }

    // Normal backup flow with checks (existing code)
    // Check last backup date
    const lastBackupDate = await getLastCloudBackupDate(userId);
    const now = new Date();

    // Check the modification timestamp
    const lastChangeTimestamp = await AsyncStorage.getItem('@lastChangeTimestamp');
    const lastBackupTimestamp = await AsyncStorage.getItem('@lastBackupTimestamp');

    // If there is no last modification time or it is not older than the last backup timestamp, there is no need to make a backup
    if (
      !lastChangeTimestamp ||
      (lastBackupTimestamp && lastChangeTimestamp <= lastBackupTimestamp)
    ) {
      return { success: true, message: 'Backup is skipped because there is no change' };
    }

    // If the last backup was made 24 hours ago or not at all or if there are changes, make a backup
    if (
      !lastBackupDate ||
      now.getTime() - new Date(lastBackupDate).getTime() > 24 * 60 * 60 * 1000 ||
      lastChangeTimestamp
    ) {
      // Perform backup operation
      const backupResult = await backupToCloud(userId);

      if (backupResult.success) {
        // Update last backup timestamp after successful backup
        await AsyncStorage.setItem('@lastBackupTimestamp', new Date().toISOString());

        // Update @last_backup_time for UI display
        const now = new Date();
        await AsyncStorage.setItem('@last_backup_time', now.toISOString());
      }

      return backupResult;
    }

    return { success: true, message: 'Backup conditions not met' };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
};

/**
 * Brings up backup history
 * @param {string} userId - User ID
 * @returns {Promise<Array>} - Backup history
 */
export const getBackupHistory = async userId => {
  try {
    if (!userId) {
      throw new Error('User ID required');
    }

    const { data, error } = await supabase
      .from('backups')
      .select('data, created_at, updated_at')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })
      .limit(10); // Last 10 backups

    if (error) {
      throw new Error('Failed to retrieve backup history: ' + error.message);
    }

    return data.map(backup => ({
      date: backup.data.backup_date,
      device_id: backup.data.device_id,
      version: backup.data.version || '1.0',
      app_version: backup.data.app_version || 'unknown',
      created_at: backup.created_at,
      updated_at: backup.updated_at,
    }));
  } catch (error) {
    return [];
  }
};

/**
 * Restores backup from a specific date
 * @param {string} userId - User ID
 * @param {string} backupDate - Backup date
 * @returns {Promise<Object>} - Restore result
 */
export const restoreFromDate = async (userId, backupDate) => {
  try {
    if (!userId || !backupDate) {
      throw new Error('User ID and date required');
    }

    const { data, error } = await supabase
      .from('backups')
      .select('data')
      .eq('user_id', userId)
      .eq('data->>backup_date', backupDate)
      .single();

    if (error) {
      // Custom error messages
      if (error.message.includes('No rows returned')) {
        throw new Error(t('settings.specificBackupNotFound'));
      }
      if (error.message.includes('JSON object requested, multiple')) {
        throw new Error(t('settings.multipleBackupSameDate'));
      }
      throw new Error(t('settings.restoreError'));
    }

    if (!data) {
      throw new Error(t('settings.specificBackupNotFound'));
    }

    const backupData = data.data;

    // Extract encrypted data
    console.log('🔓 Starting decryption process...');
    console.log('📦 Backup data structure:', Object.keys(backupData));

    const notes = await decryptNotes(backupData.notes);
    const categories = await decryptNotes(backupData.categories);

    console.log('🔓 Decryption completed:', {
      notesDecrypted: Array.isArray(notes),
      notesCount: Array.isArray(notes) ? notes.length : 'ERROR',
      categoriesDecrypted: Array.isArray(categories),
      categoriesCount: Array.isArray(categories) ? categories.length : 'ERROR',
      categoriesSample: Array.isArray(categories) ? categories.slice(0, 3) : 'ERROR',
    });

    // Verify and restore data
    if (!Array.isArray(notes) || !Array.isArray(categories)) {
      console.error('❌ Decryption failed - invalid data format:', {
        notesType: typeof notes,
        categoriesType: typeof categories,
      });
      throw new Error('Invalid data format');
    }

    await AsyncStorage.setItem(NOTES_KEY, JSON.stringify(notes));
    await AsyncStorage.setItem(CATEGORIES_KEY, JSON.stringify(categories));

    // CRITICAL: Rebuild note indices after restore
    await buildNoteIndices();
    console.log('🔄 Note indices rebuilt after specific date restore');

    // DEBUG: Verify storage write immediately after restore
    const verifyCategories = await AsyncStorage.getItem(CATEGORIES_KEY);
    const verifyNotes = await AsyncStorage.getItem(NOTES_KEY);
    console.log('🔍 POST-RESTORE VERIFICATION:', {
      categoriesWritten: !!verifyCategories,
      categoriesLength: verifyCategories ? JSON.parse(verifyCategories).length : 0,
      categoriesSample: verifyCategories ? JSON.parse(verifyCategories).slice(0, 3) : [],
      notesWritten: !!verifyNotes,
      notesLength: verifyNotes ? JSON.parse(verifyNotes).length : 0,
    });

    // Set update flags for UI refresh
    await AsyncStorage.setItem('@categories_updated', 'true');
    await AsyncStorage.setItem('@notes_updated', 'true');
    console.log(
      '✅ Backup restore completed - Categories:',
      categories.length,
      'Notes:',
      notes.length
    );
    console.log('🚩 Update flags set: @categories_updated = true, @notes_updated = true');

    return {
      success: true,
      message: 'Backup on specified date restored',
      backupInfo: {
        date: backupData.backup_date,
        app_version: backupData.app_version,
      },
    };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
};

/**
 * Retrieves last backup data
 * @param {string} userId - User ID
 * @returns {Promise<Object|null>} - Last backup data or null
 */
export const getLastBackupData = async userId => {
  try {
    if (!userId) {
      return null;
    }

    const { data, error } = await supabase
      .from('backups')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      return null;
    }

    if (!data) {
      return null;
    }

    return data;
  } catch (error) {
    return null;
  }
};

/**
 * Checks if there are any changes since the last backup
 * @param {string} userId - User ID
 * @param {Array} notes - List of notes
 * @param {Array} categories - List of categories
 * @returns {Promise<boolean>} - True if there is a change, false otherwise
 */
export const hasChangedSinceLastBackup = async (userId, notes, categories = []) => {
  try {
    // Get last backup data
    const lastBackupData = await getLastBackupData(userId);

    // If there is no backup, there is a change
    if (!lastBackupData) {
      return true;
    }

    // Decrypt both notes and categories from backup
    const decryptedNotes = await decryptNotes(lastBackupData.data.notes);
    const decryptedCategories = await decryptNotes(lastBackupData.data.categories);

    if (!decryptedNotes || !Array.isArray(decryptedCategories)) {
      return true;
    }

    // Check categories first (simpler comparison)
    const currentCategories = Array.isArray(categories) ? [...categories].sort() : [];
    const lastCategories = Array.isArray(decryptedCategories)
      ? [...decryptedCategories].sort()
      : [];

    if (JSON.stringify(currentCategories) !== JSON.stringify(lastCategories)) {
      return true; // Categories changed
    }

    // Check notes
    const prepareNotesForHash = notesList => {
      return notesList
        .map(note => ({
          id: note.id,
          title: note.title,
          content: note.content,
          category: note.category,
          isFavorite: note.isFavorite,
          isArchived: note.isArchived,
          isTrash: note.isTrash,
        }))
        .sort((a, b) => (a.id > b.id ? 1 : -1));
    };

    const currentNotesReduced = prepareNotesForHash(notes);
    const lastNotesReduced = prepareNotesForHash(decryptedNotes);

    // Additional control: Compare arrays
    const currentLength = currentNotesReduced.length;
    const lastLength = lastNotesReduced.length;

    if (currentLength !== lastLength) {
      return true;
    }

    // Calculate hash values for notes
    const currentHash = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      JSON.stringify(currentNotesReduced)
    );

    const lastHash = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      JSON.stringify(lastNotesReduced)
    );

    // If the hash values are the same there is no change
    return currentHash !== lastHash;
  } catch (error) {
    // In case of error, stay on the safe side and make a backup
    return true;
  }
};

/**
 * Cleans up old backups
 * @param {string} userId - User ID
 * @returns {Promise<boolean>} - True if the operation was successful, false otherwise.
 */
export const cleanupOldBackups = async userId => {
  try {
    if (!userId) {
      return false;
    }

    // Keep the last 5 backups, delete the others
    const { data, error } = await supabase
      .from('backups')
      .select('id')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })
      .range(5, 1000); // All records after 5

    if (error) {
      return false;
    }

    if (data && data.length > 0) {
      const idsToDelete = data.map(item => item.id);
      const { error: deleteError } = await supabase.from('backups').delete().in('id', idsToDelete);

      if (deleteError) {
        return false;
      }

      return true;
    }

    return true;
  } catch (error) {
    return false;
  }
};

export default {
  backupToCloud,
  restoreFromCloud,
  getLastCloudBackupDate,
  triggerAutoBackup,
  getBackupHistory,
  restoreFromDate,
  getLastBackupData,
  hasChangedSinceLastBackup,
  cleanupOldBackups,
  getCurrentUserId, // include the new function in the default export
};
