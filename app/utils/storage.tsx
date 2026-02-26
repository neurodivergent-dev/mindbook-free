// This utility file is responsible for managing notes and categories using AsyncStorage.
// It includes functions to get, save, update, delete notes and categories,
// as well as to manage note states like favorites, archives, and trash.
// It also includes functions to backup notes to the cloud and restore them from the cloud.
// Importing AsyncStorage from @react-native-async-storage/async-storage
// and defining constants for keys used in AsyncStorage.
import AsyncStorage from '@react-native-async-storage/async-storage';

// Performance optimization: debounce index building
let indexBuildTimeout: NodeJS.Timeout | null = null;
const backupTimeout: NodeJS.Timeout | null = null;

// Memory cache for notes - massive performance boost!
let notesCache: Note[] | null = null;

// Pagination cache
let paginationCache: { [key: string]: Note[] } = {};

// Search results cache for faster search
let searchCache: { [key: string]: Note[] } = {};

export const NOTES_KEY = '@notes';
export const CATEGORIES_KEY = '@categories';
// Index keys
export const CATEGORY_INDEX_KEY = '@notes_index_categories';
export const FAVORITE_INDEX_KEY = '@notes_index_favorites';
export const DATE_INDEX_KEY = '@notes_index_dates';

// Cache management
const invalidateCache = () => {
  // If we just nullify, next read will be slow.
  // We'll handle cache updates manually in write functions for maximum speed.
  clearPaginationCache();
  searchCache = {};
};

// Performance optimized functions
const debouncedBuildNoteIndices = async () => {
  if (indexBuildTimeout) {
    clearTimeout(indexBuildTimeout);
  }

  return new Promise<void>(resolve => {
    indexBuildTimeout = setTimeout(async () => {
      await buildNoteIndices();
      resolve();
    }, 300); // 300ms delay
  });
};

// Get notes - Now returns direct memory reference for MAXIMUM SPEED
export const getAllNotes = async (): Promise<Note[]> => {
  try {
    // If cache exists, return reference immediately (0 allocations, 0ms)
    if (notesCache) {
      return notesCache;
    }

    // Cache miss - load from storage once
    const notesStr = await AsyncStorage.getItem(NOTES_KEY);
    if (!notesStr) {
      notesCache = [];
      return [];
    }

    const notes = JSON.parse(notesStr);
    if (!Array.isArray(notes)) {
      notesCache = [];
      return [];
    }

    // Update cache
    notesCache = notes;
    return notesCache;
  } catch (error) {
    return [];
  }
};

// Pagination - get notes in chunks for better performance
export const getPaginatedNotes = async (
  page: number = 0,
  pageSize: number = 50
): Promise<{ notes: Note[]; hasMore: boolean; total: number }> => {
  try {
    const cacheKey = `page_${page}_${pageSize}`;

    // Check pagination cache
    if (paginationCache[cacheKey]) {
      const allNotes = await getAllNotes();
      const startIndex = page * pageSize;
      const endIndex = startIndex + pageSize;
      const hasMore = endIndex < allNotes.length;

      return {
        notes: paginationCache[cacheKey],
        hasMore,
        total: allNotes.length,
      };
    }

    const allNotes = await getAllNotes();
    const startIndex = page * pageSize;
    const endIndex = startIndex + pageSize;
    const paginatedNotes = allNotes.slice(startIndex, endIndex);
    const hasMore = endIndex < allNotes.length;

    // Cache the page
    paginationCache[cacheKey] = paginatedNotes;

    return {
      notes: paginatedNotes,
      hasMore,
      total: allNotes.length,
    };
  } catch (error) {
    return { notes: [], hasMore: false, total: 0 };
  }
};

// Clear pagination cache when data changes
const clearPaginationCache = () => {
  paginationCache = {};
};

// Super fast search with caching
export const searchNotesOptimized = async (query: string): Promise<Note[]> => {
  if (!query.trim()) return await getAllNotes();

  const cacheKey = query.toLowerCase().trim();

  // Check search cache
  if (searchCache[cacheKey]) {
    return searchCache[cacheKey];
  }

  const allNotes = await getAllNotes();
  const lowerQuery = cacheKey;

  // Fast search using simple loop for better V8 optimization than filter
  const results = [];
  const len = allNotes.length;

  for (let i = 0; i < len; i++) {
    const note = allNotes[i];
    // Check title first (fastest)
    if (note.title && note.title.toLowerCase().includes(lowerQuery)) {
      results.push(note);
      continue;
    }
    // Then category
    if (note.category && note.category.toLowerCase().includes(lowerQuery)) {
      results.push(note);
      continue;
    }
    // Finally content (slowest, largest text)
    if (note.content && note.content.toLowerCase().includes(lowerQuery)) {
      results.push(note);
    }
  }

  // Cache results
  searchCache[cacheKey] = results;

  return results;
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

// Batch update notes - Optimized to update memory cache first
export const batchUpdateNotes = async (notesToUpdate: Partial<Note>[]): Promise<boolean> => {
  try {
    if (!notesToUpdate || notesToUpdate.length === 0) return false;

    const validUpdates = notesToUpdate.filter(note => note.id);
    if (validUpdates.length === 0) return false;

    // 1. Get current notes (from memory)
    const allNotes = await getAllNotes();

    // 2. Prepare updated list
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

    // 3. IMMEDIATELY update memory cache for instant UI response
    notesCache = updatedAllNotes;
    invalidateCache();

    // 4. Save to disk in background
    AsyncStorage.setItem(NOTES_KEY, JSON.stringify(updatedAllNotes)).catch(err =>
      console.error('Background disk write failed:', err)
    );

    await debouncedBuildNoteIndices();
    await AsyncStorage.setItem('@lastChangeTimestamp', now);

    return true;
  } catch (error) {
    console.error('Error in batch update notes:', error);
    return false;
  }
};

// Save note - Optimized for instant feedback
export const saveNote = async note => {
  try {
    const allNotes = await getAllNotes();
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

    // 1. Update memory cache immediately
    notesCache = [newNote, ...allNotes];
    invalidateCache();

    // 2. Background disk write
    AsyncStorage.setItem(NOTES_KEY, JSON.stringify(notesCache)).catch(err =>
      console.error('Disk save failed:', err)
    );

    await debouncedBuildNoteIndices();
    await AsyncStorage.setItem('@lastChangeTimestamp', now);

    return true;
  } catch (error) {
    return false;
  }
};

// Update note - Optimized for instant feedback
export const updateNote = async (noteId, updatedNote) => {
  try {
    const allNotes = await getAllNotes();
    const noteIndex = allNotes.findIndex(note => note.id === noteId);

    if (noteIndex === -1) {
      throw new Error('Note not found');
    }

    const now = new Date().toISOString();
    const updatedNoteFull = {
      ...allNotes[noteIndex],
      ...updatedNote,
      updatedAt: now,
    };

    // 1. Update memory cache immediately
    const updatedAllNotes = [...allNotes];
    updatedAllNotes[noteIndex] = updatedNoteFull;
    notesCache = updatedAllNotes;
    invalidateCache();

    // 2. Background disk write
    AsyncStorage.setItem(NOTES_KEY, JSON.stringify(notesCache)).catch(err =>
      console.error('Disk update failed:', err)
    );

    await debouncedBuildNoteIndices();
    await AsyncStorage.setItem('@lastChangeTimestamp', now);

    return true;
  } catch (error) {
    throw new Error('Error updating note');
  }
};

// Delete note - Optimized for instant feedback
export const deleteNote = async noteId => {
  try {
    const allNotes = await getAllNotes();
    const noteIds = Array.isArray(noteId) ? noteId : [noteId];

    console.log('[Storage] Kalıcı silme işlemi başladı. Silinecek ID\'ler:', noteIds);

    // Verify notes exist before deletion
    const notesToDelete = allNotes.filter(note => noteIds.includes(note.id));
    if (notesToDelete.length === 0) {
      console.warn('[Storage] Silinecek not bulunamadı:', noteIds);
      return false;
    }

    console.log('[Storage] Silinecek notlar:', notesToDelete.length, 'adet');

    // 1. Update memory cache immediately
    notesCache = allNotes.filter(note => !noteIds.includes(note.id));
    invalidateCache();

    // 2. Background disk write
    AsyncStorage.setItem(NOTES_KEY, JSON.stringify(notesCache)).catch(err =>
      console.error('[Storage] Disk silme hatası:', err)
    );

    // Wait for indices to rebuild
    await debouncedBuildNoteIndices();
    const now = new Date().toISOString();
    await AsyncStorage.setItem('@lastChangeTimestamp', now);

    console.log('[Storage] Kalıcı silme tamamlandı. Kalan not sayısı:', notesCache.length);
    return true;
  } catch (error) {
    console.error('[Storage] Silme hatası:', error);
    throw new Error('Not silinirken hata oluştu');
  }
};

// Add to Remove from favorites
export const toggleFavorite = async noteId => {
  const allNotes = await getAllNotes();
  const noteIndex = allNotes.findIndex(note => note.id === noteId);

  if (noteIndex === -1) {
    throw new Error('Note not found');
  }

  const updatedNote = {
    ...allNotes[noteIndex],
    isFavorite: !allNotes[noteIndex].isFavorite,
    updatedAt: new Date().toISOString(),
  };

  // 1. Update memory cache immediately
  const updatedAllNotes = [...allNotes];
  updatedAllNotes[noteIndex] = updatedNote;
  notesCache = updatedAllNotes;
  invalidateCache();

  // 2. Background disk write
  AsyncStorage.setItem(NOTES_KEY, JSON.stringify(notesCache)).catch(err =>
    console.error('Disk toggle favorite failed:', err)
  );

  // Update indices
  await buildNoteIndices();

  // Set lastChangeTimestamp for backup detection
  await AsyncStorage.setItem('@lastChangeTimestamp', new Date().toISOString());

  return true;
};

// Add/remove to archive
export const toggleArchive = async noteId => {
  const allNotes = await getAllNotes();
  const noteIndex = allNotes.findIndex(note => note.id === noteId);

  if (noteIndex === -1) {
    throw new Error('Note not found');
  }

  const updatedNote = {
    ...allNotes[noteIndex],
    isArchived: !allNotes[noteIndex].isArchived,
    updatedAt: new Date().toISOString(),
  };

  // 1. Update memory cache immediately
  const updatedAllNotes = [...allNotes];
  updatedAllNotes[noteIndex] = updatedNote;
  notesCache = updatedAllNotes;
  invalidateCache();

  // 2. Background disk write
  AsyncStorage.setItem(NOTES_KEY, JSON.stringify(notesCache)).catch(err =>
    console.error('Disk toggle archive failed:', err)
  );

  // Update indices
  await buildNoteIndices();

  // Set lastChangeTimestamp for backup detection
  await AsyncStorage.setItem('@lastChangeTimestamp', new Date().toISOString());

  return true;
};

// Move to trash
export const moveToTrash = async noteId => {
  try {
    const allNotes = await getAllNotes();
    const noteIds = Array.isArray(noteId) ? noteId : [noteId];

    let found = false;
    const now = new Date().toISOString();

    // 1. Update memory cache immediately
    const updatedAllNotes = allNotes.map(note => {
      if (noteIds.includes(note.id)) {
        found = true;
        return {
          ...note,
          isTrash: true,
          trashedAt: now,
          updatedAt: now,
        };
      }
      return note;
    });

    if (!found) {
      throw new Error('Note not found');
    }

    notesCache = updatedAllNotes;
    invalidateCache();

    // 2. Background disk write
    AsyncStorage.setItem(NOTES_KEY, JSON.stringify(notesCache)).catch(err =>
      console.error('Disk move to trash failed:', err)
    );

    // Update indices (debounced)
    await debouncedBuildNoteIndices();

    // Set lastChangeTimestamp for backup detection
    await AsyncStorage.setItem('@lastChangeTimestamp', now);

    return true;
  } catch (error) {
    console.error('Move to trash error:', error);
    throw error;
  }
};

// Restore from trash
export const restoreFromTrash = async noteId => {
  try {
    const allNotes = await getAllNotes();
    const noteIndex = allNotes.findIndex(note => note.id === noteId);

    if (noteIndex === -1) {
      throw new Error('No notes found');
    }

    // 1. Update memory cache immediately
    const updatedAllNotes = [...allNotes];
    updatedAllNotes[noteIndex] = {
      ...allNotes[noteIndex],
      isTrash: false,
      updatedAt: new Date().toISOString(),
    };

    notesCache = updatedAllNotes;
    invalidateCache();

    // 2. Background disk write
    AsyncStorage.setItem(NOTES_KEY, JSON.stringify(notesCache)).catch(err =>
      console.error('Disk restore failed:', err)
    );

    // Update indices (debounced)
    await debouncedBuildNoteIndices();

    // Set lastChangeTimestamp for backup detection
    const now = new Date().toISOString();
    await AsyncStorage.setItem('@lastChangeTimestamp', now);

    return true;
  } catch (error) {
    console.error('Error while restoring from trash:', error);
    throw error;
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

// Backup removed for free version - debug function removed

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

  // Backup removed for free version

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

    // 1. Update memory cache immediately
    notesCache = updatedNotes;
    invalidateCache();

    // 2. Background disk write
    AsyncStorage.setItem(NOTES_KEY, JSON.stringify(updatedNotes)).catch(err =>
      console.error('Disk update category notes failed:', err)
    );

    // Set lastChangeTimestamp for backup detection
    await AsyncStorage.setItem('@lastChangeTimestamp', new Date().toISOString());

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

  // 1. Update memory cache immediately
  notesCache = updatedNotes;
  invalidateCache();

  // 2. Background disk write
  AsyncStorage.setItem(NOTES_KEY, JSON.stringify(updatedNotes)).catch(err =>
    console.error('Disk delete category notes failed:', err)
  );

  // Set lastChangeTimestamp for backup detection
  await AsyncStorage.setItem('@lastChangeTimestamp', new Date().toISOString());

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

    // Backup removed for free version

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

    // Backup removed for free version

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

// Create backup data string
export const createBackup = async (): Promise<string> => {
  try {
    const notes = await getAllNotes();
    const categories = await getCategories();

    // Silinen notları (çöp kutusundakiler) backup'a dahil etme
    const activeNotes = notes.filter(note => !note.isTrash);

    const backupData = {
      version: 1,
      date: new Date().toISOString(),
      notes: activeNotes,
      categories,
    };

    return JSON.stringify(backupData);
  } catch (error) {
    console.error('Create backup error:', error);
    throw error;
  }
};

// Restore backup data from string
export const restoreBackup = async (backupString: string): Promise<boolean> => {
  try {
    let data;
    try {
      data = JSON.parse(backupString);
    } catch (e) {
      console.error('[Storage] JSON parse error:', e);
      throw new Error('Invalid JSON format');
    }

    // Basic validation
    if (!data || typeof data !== 'object') {
      console.error('[Storage] Invalid data object:', typeof data);
      throw new Error('Invalid backup data');
    }

    if (!Array.isArray(data.notes)) {
      console.error('[Storage] Invalid notes format, type:', typeof data.notes);
      throw new Error('Invalid notes format in backup');
    }

    console.log('[Storage] Restoring', data.notes.length, 'notes');

    // Restore notes
    const notes = data.notes;
    notesCache = notes;
    invalidateCache();
    await AsyncStorage.setItem(NOTES_KEY, JSON.stringify(notes));

    // Restore categories if available
    if (Array.isArray(data.categories)) {
      console.log('[Storage] Restoring', data.categories.length, 'categories');
      await AsyncStorage.setItem(CATEGORIES_KEY, JSON.stringify(data.categories));
    }

    // Update indices and timestamp
    await debouncedBuildNoteIndices();
    await AsyncStorage.setItem('@lastChangeTimestamp', new Date().toISOString());

    console.log('[Storage] Restore complete');
    return true;
  } catch (error) {
    console.error('[Storage] Restore backup error:', error);
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
  createBackup,
  restoreBackup,
};

/**
 * Check if file is using encryption module
 */
