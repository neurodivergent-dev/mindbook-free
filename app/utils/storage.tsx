// This utility file is responsible for managing notes and categories using AsyncStorage.
// It includes functions to get, save, update, delete notes and categories,
// as well as to manage note states like favorites, archives, and trash.
// It also includes functions to backup notes to the cloud and restore them from the cloud.
// Importing AsyncStorage from @react-native-async-storage/async-storage
// and defining constants for keys used in AsyncStorage.
import AsyncStorage from '@react-native-async-storage/async-storage';

export const NOTES_KEY = '@notes';
export const CATEGORIES_KEY = '@categories';
// Index keys
export const CATEGORY_INDEX_KEY = '@notes_index_categories';
export const FAVORITE_INDEX_KEY = '@notes_index_favorites';
export const DATE_INDEX_KEY = '@notes_index_dates';

// Note interface for better type checking
export interface Note {
  id: string;
  title: string;
  content: string;
  category?: string;
  createdAt: string;
  updatedAt: string;
  isFavorite: boolean;
  isArchived: boolean;
  isTrash: boolean;
  trashedAt?: string;
  isVaulted?: boolean;
  tags?: string[];
  color?: string;
  [key: string]: any; // Allow for additional properties
}

// Get notes
export const getAllNotes = async (): Promise<Note[]> => {
  try {
    const notesStr = await AsyncStorage.getItem(NOTES_KEY);
    if (!notesStr) return [];
    const notes = JSON.parse(notesStr);
    if (!Array.isArray(notes)) return [];
    return notes;
  } catch (error) {
    return [];
  }
};

// Batch get notes by IDs - new optimized function
export const batchGetNotes = async (noteIds: string[]): Promise<Note[]> => {
  try {
    if (!noteIds || noteIds.length === 0) return [];

    // Get all notes in one operation
    const allNotes = await getAllNotes();

    // Filter only the notes with matching IDs
    return allNotes.filter(note => noteIds.includes(note.id));
  } catch (error) {
    console.error('Error in batch get notes:', error);
    return [];
  }
};

// Batch update notes - new optimized function
export const batchUpdateNotes = async (notesToUpdate: Partial<Note>[]): Promise<boolean> => {
  try {
    if (!notesToUpdate || notesToUpdate.length === 0) return false;

    // Make sure each note to update has an ID
    const validUpdates = notesToUpdate.filter(note => note.id);
    if (validUpdates.length === 0) return false;

    // Get all notes
    const allNotes = await getAllNotes();

    // Update the matching notes
    const now = new Date().toISOString();
    const updatedAllNotes = allNotes.map(note => {
      const updateInfo = validUpdates.find(update => update.id === note.id);
      if (updateInfo) {
        return {
          ...note,
          ...updateInfo,
          updatedAt: now,
        };
      }
      return note;
    });

    // Save all notes in one operation
    await AsyncStorage.setItem(NOTES_KEY, JSON.stringify(updatedAllNotes));

    // Update indices
    await buildNoteIndices();

    // Set lastChangeTimestamp for backup detection
    await AsyncStorage.setItem('@lastChangeTimestamp', now);

    // Check if auto-backup is enabled and trigger immediate backup
    try {
      const autoBackupEnabled = await AsyncStorage.getItem('@auto_backup_enabled');
      if (autoBackupEnabled === 'true') {
        const { triggerAutoBackup, getCurrentUserId } = require('./backup');
        const userId = await getCurrentUserId();
        if (userId) {
          triggerAutoBackup(userId, true); // Force immediate backup
        }
      }
    } catch (error) {
      console.error('Error during auto-backup after batch update:', error);
      // Continue anyway since the main update operation succeeded
    }

    return true;
  } catch (error) {
    console.error('Error in batch update notes:', error);
    return false;
  }
};

// Get a single note by ID - new helper function
export const getNoteById = async (noteId: string): Promise<Note | null> => {
  try {
    const notes = await getAllNotes();
    const note = notes.find(note => note.id === noteId);
    return note || null;
  } catch (error) {
    console.error('Error getting note by ID:', error);
    return null;
  }
};

const generateId = () => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

// Save note
export const saveNote = async note => {
  try {
    const storedNotes = await AsyncStorage.getItem(NOTES_KEY);
    const notes = storedNotes ? JSON.parse(storedNotes) : [];

    const now = new Date().toISOString();
    const newNote = {
      ...note,
      id: generateId(),
      updatedAt: now,
      createdAt: now,
      isFavorite: false,
      isArchived: false,
      isTrash: false,
    };

    notes.unshift(newNote);
    await AsyncStorage.setItem(NOTES_KEY, JSON.stringify(notes));

    // Update indices
    await buildNoteIndices();

    // Set lastChangeTimestamp for backup detection
    await AsyncStorage.setItem('@lastChangeTimestamp', now);

    // Check if auto-backup is enabled and trigger immediate backup
    try {
      const autoBackupEnabled = await AsyncStorage.getItem('@auto_backup_enabled');
      if (autoBackupEnabled === 'true') {
        const { triggerAutoBackup, getCurrentUserId } = require('./backup');
        const userId = await getCurrentUserId();
        if (userId) {
          triggerAutoBackup(userId, true); // Force immediate backup
        }
      }
    } catch (error) {
      console.error('Error during auto-backup after save:', error);
      // Continue anyway since the main save operation succeeded
    }

    return true;
  } catch (error) {
    return false;
  }
};

// Update note
export const updateNote = async (noteId, updatedNote) => {
  try {
    const notes = await getAllNotes();
    const noteIndex = notes.findIndex(note => note.id === noteId);

    if (noteIndex === -1) {
      throw new Error('Note not found');
    }

    const now = new Date().toISOString();
    notes[noteIndex] = {
      ...notes[noteIndex],
      ...updatedNote,
      updatedAt: now,
    };

    await AsyncStorage.setItem(NOTES_KEY, JSON.stringify(notes));

    // Update indices
    await buildNoteIndices();

    // Set lastChangeTimestamp for backup detection
    await AsyncStorage.setItem('@lastChangeTimestamp', now);

    // Check if auto-backup is enabled and trigger immediate backup
    try {
      const autoBackupEnabled = await AsyncStorage.getItem('@auto_backup_enabled');
      if (autoBackupEnabled === 'true') {
        const { triggerAutoBackup, getCurrentUserId } = require('./backup');
        const userId = await getCurrentUserId();
        if (userId) {
          triggerAutoBackup(userId, true); // Force immediate backup
        }
      }
    } catch (error) {
      console.error('Error during auto-backup after update:', error);
      // Continue anyway since the main update operation succeeded
    }

    return true;
  } catch (error) {
    throw new Error('Error updating note');
  }
};

// Delete note
export const deleteNote = async noteId => {
  try {
    const notes = await getAllNotes();
    const noteIds = Array.isArray(noteId) ? noteId : [noteId];
    const filteredNotes = notes.filter(note => !noteIds.includes(note.id));
    await AsyncStorage.setItem(NOTES_KEY, JSON.stringify(filteredNotes));

    // Update indices
    await buildNoteIndices();

    // Set lastChangeTimestamp for backup detection
    const now = new Date().toISOString();
    await AsyncStorage.setItem('@lastChangeTimestamp', now);

    // Change timestamp approach didn't work, call backup directly
    try {
      const { backupToCloud, getCurrentUserId } = require('./backup');

      // Get the user id with getCurrentUserId
      const userId = await getCurrentUserId();

      if (userId) {
        await backupToCloud(userId);
      } else {
        return true;
      }
    } catch (e) {
      return true;
    }

    return true;
  } catch (error) {
    throw new Error('Error deleting note');
  }
};

// Add to Remove from favorites
export const toggleFavorite = async noteId => {
  const notes = await getAllNotes();
  const noteIndex = notes.findIndex(note => note.id === noteId);

  if (noteIndex === -1) {
    throw new Error('Note not found');
  }

  notes[noteIndex].isFavorite = !notes[noteIndex].isFavorite;
  notes[noteIndex].updatedAt = new Date().toISOString();
  await AsyncStorage.setItem(NOTES_KEY, JSON.stringify(notes));

  // Update indices
  await buildNoteIndices();

  // Set lastChangeTimestamp for backup detection
  await AsyncStorage.setItem('@lastChangeTimestamp', new Date().toISOString());

  return true;
};

// Add/remove to archive
export const toggleArchive = async noteId => {
  const notes = await getAllNotes();
  const noteIndex = notes.findIndex(note => note.id === noteId);

  if (noteIndex === -1) {
    throw new Error('Note not found');
  }

  notes[noteIndex].isArchived = !notes[noteIndex].isArchived;
  notes[noteIndex].updatedAt = new Date().toISOString();
  await AsyncStorage.setItem(NOTES_KEY, JSON.stringify(notes));

  // Update indices
  await buildNoteIndices();

  // Set lastChangeTimestamp for backup detection
  await AsyncStorage.setItem('@lastChangeTimestamp', new Date().toISOString());

  return true;
};

// Move to trash
export const moveToTrash = async noteId => {
  try {
    const notes = await getAllNotes();
    const noteIds = Array.isArray(noteId) ? noteId : [noteId];

    let updatedNotes = [...notes];
    let found = false;

    // Update notes that match any ID in the array
    updatedNotes = updatedNotes.map(note => {
      if (noteIds.includes(note.id)) {
        found = true;
        return {
          ...note,
          isTrash: true,
          trashedAt: new Date().toISOString(),
        };
      }
      return note;
    });

    if (!found) {
      throw new Error('Not bulunamadı');
    }

    await AsyncStorage.setItem(NOTES_KEY, JSON.stringify(updatedNotes));

    // Update indices
    await buildNoteIndices();

    // Set lastChangeTimestamp for backup detection
    const now = new Date().toISOString();
    await AsyncStorage.setItem('@lastChangeTimestamp', now);

    // Call backup directly after moving to trash
    try {
      const { backupToCloud, getCurrentUserId } = require('./backup');

      // Get the user id with getCurrentUserId
      const userId = await getCurrentUserId();

      if (userId) {
        await backupToCloud(userId);
      }
    } catch (e) {
      console.error('Backup error after trashing note:', e);
      // Continue anyway since the main operation succeeded
    }

    return true;
  } catch (error) {
    console.error('Move to trash error:', error);
    throw error; // Re-throw to allow caller to handle it
  }
};

// Restore from trash
export const restoreFromTrash = async noteId => {
  try {
    const notes = await getAllNotes();
    const noteIndex = notes.findIndex(note => note.id === noteId);

    if (noteIndex === -1) {
      throw new Error('No notes found');
    }

    notes[noteIndex].isTrash = false;
    await AsyncStorage.setItem(NOTES_KEY, JSON.stringify(notes));

    // Update indices
    await buildNoteIndices();

    // Set lastChangeTimestamp for backup detection
    const now = new Date().toISOString();
    await AsyncStorage.setItem('@lastChangeTimestamp', now);

    // Backup operation - should not affect the main operation if it fails
    try {
      const { backupToCloud, getCurrentUserId } = require('./backup');
      const userId = await getCurrentUserId();
      if (userId) {
        await backupToCloud(userId);
      }
    } catch (e) {
      // Backup failure should not affect the main process
      console.log('Error during backup:', e);
    }

    return true;
  } catch (error) {
    // We should actually catch and handle errors in the main process
    console.error('Error while restoring from trash:', error);
    throw error; // or it would be better to do error handling
  }
};

// Get categories
export const getCategories = async () => {
  const categoriesJson = await AsyncStorage.getItem(CATEGORIES_KEY);
  const categories = categoriesJson ? JSON.parse(categoriesJson) : [];
  return categories;
};

// DEBUG: Manual storage inspection function with Alert
export const debugStorage = async () => {
  try {
    // Check all storage keys
    const notes = await AsyncStorage.getItem(NOTES_KEY);
    const categories = await AsyncStorage.getItem(CATEGORIES_KEY);
    const categoriesFlag = await AsyncStorage.getItem('@categories_updated');
    const notesFlag = await AsyncStorage.getItem('@notes_updated');

    const result = {
      hasNotes: !!notes,
      hasCategories: !!categories,
      categoriesCount: categories ? JSON.parse(categories).length : 0,
      notesCount: notes ? JSON.parse(notes).length : 0,
      categoriesFlag,
      notesFlag,
    };

    // Show alert with debug info
    const { Alert } = require('react-native');
    Alert.alert(
      '🔍 STORAGE DEBUG',
      `Categories: ${result.categoriesCount}\nNotes: ${result.notesCount}\nFlags: C=${categoriesFlag} N=${notesFlag}`,
      [{ text: 'OK' }]
    );

    return result;
  } catch (error) {
    return null;
  }
};

// DEBUG: Backup inspection function
export const debugBackupContent = async () => {
  try {
    const { getCurrentUserId } = require('../utils/backup');
    const supabase = require('../utils/supabase').default;
    const { decryptNotes } = require('../utils/encryption');

    const userId = await getCurrentUserId();
    if (!userId) {
      const { Alert } = require('react-native');
      Alert.alert('Debug Error', 'No user ID found');
      return;
    }

    // Get raw backup data
    const { data, error } = await supabase
      .from('backups')
      .select('data')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })
      .limit(1);

    if (error || !data || data.length === 0) {
      const { Alert } = require('react-native');
      Alert.alert('Debug Error', 'No backup found in cloud');
      return;
    }

    const backupData = data[0].data;

    // Try to decrypt categories
    const categoriesRaw = backupData.categories;
    const categoriesDecrypted = await decryptNotes(categoriesRaw);

    // Try to decrypt notes
    const notesRaw = backupData.notes;
    const notesDecrypted = await decryptNotes(notesRaw);

    const { Alert } = require('react-native');
    Alert.alert(
      '☁️ BACKUP DEBUG',
      `Backup Date: ${backupData.backup_date || 'Unknown'}\n` +
        `Categories Encrypted: ${!!categoriesRaw}\n` +
        `Categories Decrypted: ${Array.isArray(categoriesDecrypted)}\n` +
        `Categories Count: ${
          Array.isArray(categoriesDecrypted) ? categoriesDecrypted.length : 'ERROR'
        }\n` +
        `Categories Sample: ${
          Array.isArray(categoriesDecrypted) ? categoriesDecrypted.slice(0, 2).join(', ') : 'ERROR'
        }\n\n` +
        `Notes Encrypted: ${!!notesRaw}\n` +
        `Notes Decrypted: ${Array.isArray(notesDecrypted)}\n` +
        `Notes Count: ${Array.isArray(notesDecrypted) ? notesDecrypted.length : 'ERROR'}`,
      [{ text: 'OK' }]
    );

    return {
      categoriesRaw: !!categoriesRaw,
      categoriesDecrypted: Array.isArray(categoriesDecrypted),
      categoriesCount: Array.isArray(categoriesDecrypted) ? categoriesDecrypted.length : 0,
      notesDecrypted: Array.isArray(notesDecrypted),
      notesCount: Array.isArray(notesDecrypted) ? notesDecrypted.length : 0,
    };
  } catch (error) {
    const { Alert } = require('react-native');
    Alert.alert(
      'Debug Error',
      'Backup debug failed: ' + (error instanceof Error ? error.message : String(error))
    );
    return null;
  }
};

// Add category
export const addCategory = async category => {
  // Check category length - maximum 30 characters
  if (category.length > 30) {
    throw new Error('Category name too long');
  }

  const categories = await getCategories();

  if (categories.includes(category)) {
    throw new Error('Category already exists');
  }

  const updatedCategories = [...categories, category];

  await AsyncStorage.setItem(CATEGORIES_KEY, JSON.stringify(updatedCategories));

  // Set lastChangeTimestamp for backup detection
  await AsyncStorage.setItem('@lastChangeTimestamp', new Date().toISOString());

  // Check if auto-backup is enabled and trigger immediate backup
  try {
    const autoBackupEnabled = await AsyncStorage.getItem('@auto_backup_enabled');
    if (autoBackupEnabled === 'true') {
      const { triggerAutoBackup, getCurrentUserId } = require('./backup');
      const userId = await getCurrentUserId();
      if (userId) {
        // Force immediate backup to include the new category
        await triggerAutoBackup(userId, true);
      }
    }
  } catch (error) {
    // Continue anyway since the main category add operation succeeded
  }

  return true;
};

// Update category name
export const updateCategory = async (oldCategoryName: string, newCategoryName: string) => {
  try {
    const trimmedNewName = newCategoryName.trim();

    // Validation
    if (!trimmedNewName) {
      throw new Error('Category name cannot be empty');
    }

    if (trimmedNewName.length > 30) {
      throw new Error('Category name too long');
    }

    // Check if new category name already exists (case-insensitive)
    const categories = await getCategories();
    const normalizedNewName = trimmedNewName.toLowerCase();
    const existingCategory = categories.find(cat => cat.toLowerCase() === normalizedNewName);

    if (existingCategory && existingCategory !== oldCategoryName) {
      throw new Error('Category already exists');
    }

    // Update categories list
    const updatedCategories = categories.map(category =>
      category === oldCategoryName ? trimmedNewName : category
    );

    await AsyncStorage.setItem(CATEGORIES_KEY, JSON.stringify(updatedCategories));

    // Update all notes that have this category
    const allNotes = await getAllNotes();
    const updatedNotes = allNotes.map(note => {
      if (note.category === oldCategoryName) {
        return {
          ...note,
          category: trimmedNewName,
          updatedAt: new Date().toISOString(),
        };
      }
      return note;
    });

    await AsyncStorage.setItem(NOTES_KEY, JSON.stringify(updatedNotes));

    // Set lastChangeTimestamp for backup detection
    await AsyncStorage.setItem('@lastChangeTimestamp', new Date().toISOString());

    // Check if auto-backup is enabled and trigger immediate backup
    try {
      const autoBackupEnabled = await AsyncStorage.getItem('@auto_backup_enabled');
      if (autoBackupEnabled === 'true') {
        const { triggerAutoBackup, getCurrentUserId } = require('./backup');
        const userId = await getCurrentUserId();
        if (userId) {
          // Force immediate backup to include the category update
          await triggerAutoBackup(userId, true);
        }
      }
    } catch (error) {
      // Continue anyway since the main category update operation succeeded
    }

    return true;
  } catch (error) {
    console.error('Error updating category:', error);
    throw error;
  }
};

// Delete category
export const deleteCategory = async category => {
  const categories = await getCategories();
  const updatedCategories = categories.filter(c => c !== category);
  await AsyncStorage.setItem(CATEGORIES_KEY, JSON.stringify(updatedCategories));

  const allNotes = await getAllNotes();
  const updatedNotes = allNotes.map(note => {
    if (note.category === category) {
      return {
        ...note,
        category: null,
        updatedAt: new Date().toISOString(),
      };
    }
    return note;
  });

  await AsyncStorage.setItem(NOTES_KEY, JSON.stringify(updatedNotes));

  // Set lastChangeTimestamp for backup detection
  await AsyncStorage.setItem('@lastChangeTimestamp', new Date().toISOString());

  // Check if auto-backup is enabled and trigger immediate backup
  try {
    const autoBackupEnabled = await AsyncStorage.getItem('@auto_backup_enabled');
    if (autoBackupEnabled === 'true') {
      const { triggerAutoBackup, getCurrentUserId } = require('./backup');
      const userId = await getCurrentUserId();
      if (userId) {
        // Force immediate backup to include the category deletion
        await triggerAutoBackup(userId, true);
      }
    }
  } catch (error) {
    // Continue anyway since the main category delete operation succeeded
  }

  return true;
};

// Get archived notes
export const getArchivedNotes = async () => {
  try {
    const notes = await getAllNotes();
    return notes.filter(note => note.isArchived && !note.isTrash);
  } catch (error) {
    return [];
  }
};

// Get notes from trash
export const getTrashNotes = async () => {
  try {
    const notes = await getAllNotes();
    return notes.filter(note => note.isTrash);
  } catch (error) {
    return [];
  }
};

// Get favorite notes
export const getFavoriteNotes = async () => {
  try {
    const notes = await getAllNotes();
    return notes.filter(note => note.isFavorite && !note.isTrash && !note.isArchived);
  } catch (error) {
    return [];
  }
};

// Get notes by category using the index - optimized with batch operation
export const getNotesByCategory = async (category: string): Promise<Note[]> => {
  try {
    // Get the category index
    const indexStr = await AsyncStorage.getItem(CATEGORY_INDEX_KEY);
    const categoryIndex = indexStr ? JSON.parse(indexStr) : {};

    // Get note IDs for this category
    const noteIds = categoryIndex[category] || [];
    if (noteIds.length === 0) return [];

    // Use batch operation to get notes
    return await batchGetNotes(noteIds);
  } catch (error) {
    console.error('Error getting notes by category:', error);
    return [];
  }
};

// Get favorite notes using the index - optimized with batch operation
export const getFavoriteNotesIndexed = async (): Promise<Note[]> => {
  try {
    // Get the favorite index
    const indexStr = await AsyncStorage.getItem(FAVORITE_INDEX_KEY);
    const favoriteIds = indexStr ? JSON.parse(indexStr) : [];

    if (favoriteIds.length === 0) return [];

    // Use batch operation to get notes
    const favoriteNotes = await batchGetNotes(favoriteIds);

    // Filter only active favorites
    return favoriteNotes.filter(note => !note.isTrash && !note.isArchived);
  } catch (error) {
    console.error('Error getting favorite notes:', error);
    return [];
  }
};

// Get notes by date range - optimized with batch operation
export const getNotesByDateRange = async (
  startDate: Date | string,
  endDate: Date | string
): Promise<Note[]> => {
  try {
    // Get the date index
    const indexStr = await AsyncStorage.getItem(DATE_INDEX_KEY);
    const dateIndex = indexStr ? JSON.parse(indexStr) : {};

    // Convert dates to Date objects if they are strings
    const start = typeof startDate === 'string' ? new Date(startDate) : startDate;
    const end = typeof endDate === 'string' ? new Date(endDate) : endDate;

    // Calculate all the months in the range
    const months = [];
    const currentDate = new Date(start);
    while (currentDate <= end) {
      const dateKey = `${currentDate.getFullYear()}-${currentDate.getMonth() + 1}`;
      months.push(dateKey);
      currentDate.setMonth(currentDate.getMonth() + 1);
    }

    // Get all note IDs in the date range
    const noteIds = new Set<string>();
    months.forEach(month => {
      const idsForMonth = dateIndex[month] || [];
      idsForMonth.forEach(id => noteIds.add(id));
    });

    if (noteIds.size === 0) return [];

    // Use batch operation to get notes
    const dateRangeNotes = await batchGetNotes(Array.from(noteIds));

    // Filter by actual date range
    return dateRangeNotes.filter(note => {
      const noteDate = new Date(note.updatedAt || note.createdAt);
      return noteDate >= start && noteDate <= end;
    });
  } catch (error) {
    console.error('Error getting notes by date range:', error);
    return [];
  }
};

// Add a batch toggle favorite function
export const batchToggleFavorite = async (noteIds: string[]): Promise<boolean> => {
  try {
    if (!noteIds || noteIds.length === 0) return false;

    // Get all notes
    const allNotes = await getAllNotes();

    // Find the notes to update
    const notesToUpdate = allNotes.filter(note => noteIds.includes(note.id));

    // Toggle favorite status for each note
    const updates = notesToUpdate.map(note => ({
      id: note.id,
      isFavorite: !note.isFavorite,
      updatedAt: new Date().toISOString(),
    }));

    // Use batch update
    const result = await batchUpdateNotes(updates);

    // Set lastChangeTimestamp for backup detection
    await AsyncStorage.setItem('@lastChangeTimestamp', new Date().toISOString());

    return result;
  } catch (error) {
    console.error('Error in batch toggle favorite:', error);
    return false;
  }
};

// Add a batch toggle archive function
export const batchToggleArchive = async (noteIds: string[]): Promise<boolean> => {
  try {
    if (!noteIds || noteIds.length === 0) return false;

    // Get all notes
    const allNotes = await getAllNotes();

    // Find the notes to update
    const notesToUpdate = allNotes.filter(note => noteIds.includes(note.id));

    // Toggle archive status for each note
    const updates = notesToUpdate.map(note => ({
      id: note.id,
      isArchived: !note.isArchived,
      updatedAt: new Date().toISOString(),
    }));

    // Use batch update
    const result = await batchUpdateNotes(updates);

    // Set lastChangeTimestamp for backup detection
    await AsyncStorage.setItem('@lastChangeTimestamp', new Date().toISOString());

    return result;
  } catch (error) {
    console.error('Error in batch toggle archive:', error);
    return false;
  }
};

// Add a batch move to trash function
export const batchMoveToTrash = async (noteIds: string[]): Promise<boolean> => {
  try {
    if (!noteIds || noteIds.length === 0) return false;

    // Get all notes
    const allNotes = await getAllNotes();

    // Find the notes to update
    const notesToUpdate = allNotes.filter(note => noteIds.includes(note.id));

    // Set trash status for each note
    const now = new Date().toISOString();
    const updates = notesToUpdate.map(note => ({
      id: note.id,
      isTrash: true,
      trashedAt: now,
      updatedAt: now,
    }));

    // Use batch update
    const result = await batchUpdateNotes(updates);

    // Set lastChangeTimestamp for backup detection
    await AsyncStorage.setItem('@lastChangeTimestamp', now);

    // Call backup directly after moving to trash
    try {
      const { backupToCloud, getCurrentUserId } = require('./backup');
      const userId = await getCurrentUserId();
      if (userId) {
        await backupToCloud(userId);
      }
    } catch (e) {
      console.error('Backup error after trashing notes:', e);
      // Continue anyway since the main operation succeeded
    }

    return result;
  } catch (error) {
    console.error('Error in batch move to trash:', error);
    return false;
  }
};

// Add a batch restore from trash function
export const batchRestoreFromTrash = async (noteIds: string[]): Promise<boolean> => {
  try {
    if (!noteIds || noteIds.length === 0) return false;

    // Get all notes
    const allNotes = await getAllNotes();

    // Find the notes to update
    const notesToUpdate = allNotes.filter(note => noteIds.includes(note.id));

    // Set restore status for each note
    const now = new Date().toISOString();
    const updates = notesToUpdate.map(note => ({
      id: note.id,
      isTrash: false,
      updatedAt: now,
    }));

    // Use batch update
    const result = await batchUpdateNotes(updates);

    // Set lastChangeTimestamp for backup detection
    await AsyncStorage.setItem('@lastChangeTimestamp', now);

    // Backup operation
    try {
      const { backupToCloud, getCurrentUserId } = require('./backup');
      const userId = await getCurrentUserId();
      if (userId) {
        await backupToCloud(userId);
      }
    } catch (e) {
      console.error('Backup error after restoring notes:', e);
      // Continue anyway since the main operation succeeded
    }

    return result;
  } catch (error) {
    console.error('Error in batch restore from trash:', error);
    return false;
  }
};

// Add a batch update category function
export const batchUpdateCategory = async (
  noteIds: string[],
  category: string | null
): Promise<boolean> => {
  try {
    if (!noteIds || noteIds.length === 0) return false;

    // Get all notes
    const allNotes = await getAllNotes();

    // Find the notes to update
    const notesToUpdate = allNotes.filter(note => noteIds.includes(note.id));

    // Update category for each note
    const now = new Date().toISOString();
    const updates = notesToUpdate.map(note => ({
      id: note.id,
      category: category,
      updatedAt: now,
    }));

    // Use batch update
    const result = await batchUpdateNotes(updates);

    // Set lastChangeTimestamp for backup detection
    await AsyncStorage.setItem('@lastChangeTimestamp', now);

    return result;
  } catch (error) {
    console.error('Error in batch update category:', error);
    return false;
  }
};

// Build indices for faster filtering
export const buildNoteIndices = async () => {
  try {
    const notes = await getAllNotes();

    // Category index: { category: [noteId1, noteId2, ...] }
    const categoryIndex = {};

    // Favorite index: [noteId1, noteId2, ...]
    const favoriteIds = [];

    // Date index (by month/year): { '2023-06': [noteId1, noteId2, ...] }
    const dateIndex = {};

    notes.forEach(note => {
      // Category index
      if (note.category) {
        if (!categoryIndex[note.category]) {
          categoryIndex[note.category] = [];
        }
        categoryIndex[note.category].push(note.id);
      }

      // Favorite index
      if (note.isFavorite) {
        favoriteIds.push(note.id);
      }

      // Date index
      const date = new Date(note.updatedAt || note.createdAt);
      const dateKey = `${date.getFullYear()}-${date.getMonth() + 1}`;
      if (!dateIndex[dateKey]) {
        dateIndex[dateKey] = [];
      }
      dateIndex[dateKey].push(note.id);
    });

    // Save indices
    await AsyncStorage.setItem(CATEGORY_INDEX_KEY, JSON.stringify(categoryIndex));
    await AsyncStorage.setItem(FAVORITE_INDEX_KEY, JSON.stringify(favoriteIds));
    await AsyncStorage.setItem(DATE_INDEX_KEY, JSON.stringify(dateIndex));

    console.log('Note indices built successfully');
    return true;
  } catch (error) {
    console.error('Error building indices:', error);
    return false;
  }
};

// Export all functions
export default {
  getAllNotes,
  saveNote,
  updateNote,
  deleteNote,
  moveToTrash,
  restoreFromTrash,
  toggleFavorite,
  toggleArchive,
  getCategories,
  addCategory,
  updateCategory,
  deleteCategory,
  getArchivedNotes,
  getTrashNotes,
  getFavoriteNotes,
  getNotesByCategory,
  getFavoriteNotesIndexed,
  getNotesByDateRange,
  buildNoteIndices,
  debugStorage,
  NOTES_KEY,
  CATEGORIES_KEY,
  // New batch functions
  batchGetNotes,
  batchUpdateNotes,
  getNoteById,
  batchToggleFavorite,
  batchToggleArchive,
  batchMoveToTrash,
  batchRestoreFromTrash,
  batchUpdateCategory,
  debugBackupContent,
};

/**
 * Check if file is using encryption module
 */
