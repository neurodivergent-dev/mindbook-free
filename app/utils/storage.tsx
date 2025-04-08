// This utility file is responsible for managing notes and categories using AsyncStorage.
// It includes functions to get, save, update, delete notes and categories,
// as well as to manage note states like favorites, archives, and trash.
// It also includes functions to backup notes to the cloud and restore them from the cloud.
// Importing AsyncStorage from @react-native-async-storage/async-storage
// and defining constants for keys used in AsyncStorage.
import AsyncStorage from '@react-native-async-storage/async-storage';

export const NOTES_KEY = '@notes';
export const CATEGORIES_KEY = '@categories';

// Get notes
export const getAllNotes = async () => {
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

    notes[noteIndex] = {
      ...notes[noteIndex],
      ...updatedNote,
      updatedAt: new Date().toISOString(),
    };

    await AsyncStorage.setItem(NOTES_KEY, JSON.stringify(notes));

    // Update indices
    await buildNoteIndices();

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
  await AsyncStorage.setItem(NOTES_KEY, JSON.stringify(notes));

  // Update indices
  await buildNoteIndices();

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
  await AsyncStorage.setItem(NOTES_KEY, JSON.stringify(notes));

  // Update indices
  await buildNoteIndices();

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
  return categoriesJson ? JSON.parse(categoriesJson) : [];
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

  return true;
};

// Delete category
export const deleteCategory = async category => {
  const categories = await getCategories();
  const updatedCategories = categories.filter(c => c !== category);
  await AsyncStorage.setItem(CATEGORIES_KEY, JSON.stringify(updatedCategories));

  const allNotes = await getAllNotes();
  const updatedNotes = allNotes.map(note => {
    if (note.category === category) {
      return { ...note, category: null };
    }
    return note;
  });

  await AsyncStorage.setItem(NOTES_KEY, JSON.stringify(updatedNotes));
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
  deleteCategory,
  getArchivedNotes,
  getTrashNotes,
  getFavoriteNotes,
  NOTES_KEY,
  CATEGORIES_KEY,
};

// Index keys
export const CATEGORY_INDEX_KEY = '@notes_index_categories';
export const FAVORITE_INDEX_KEY = '@notes_index_favorites';
export const DATE_INDEX_KEY = '@notes_index_dates';

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

// Get notes by category using the index
export const getNotesByCategory = async category => {
  try {
    // Get the category index
    const indexStr = await AsyncStorage.getItem(CATEGORY_INDEX_KEY);
    const categoryIndex = indexStr ? JSON.parse(indexStr) : {};

    // Get note IDs for this category
    const noteIds = categoryIndex[category] || [];
    if (noteIds.length === 0) return [];

    // Get all notes
    const allNotes = await getAllNotes();

    // Filter only the relevant notes
    return allNotes.filter(note => noteIds.includes(note.id));
  } catch (error) {
    console.error('Error getting notes by category:', error);
    return [];
  }
};

// Get favorite notes using the index
export const getFavoriteNotesIndexed = async () => {
  try {
    // Get the favorite index
    const indexStr = await AsyncStorage.getItem(FAVORITE_INDEX_KEY);
    const favoriteIds = indexStr ? JSON.parse(indexStr) : [];

    if (favoriteIds.length === 0) return [];

    // Get all notes
    const allNotes = await getAllNotes();

    // Filter only favorite notes
    return allNotes.filter(
      note => favoriteIds.includes(note.id) && !note.isTrash && !note.isArchived
    );
  } catch (error) {
    console.error('Error getting favorite notes:', error);
    return [];
  }
};

// Get notes by date range
export const getNotesByDateRange = async (startDate, endDate) => {
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
    const noteIds = new Set();
    months.forEach(month => {
      const idsForMonth = dateIndex[month] || [];
      idsForMonth.forEach(id => noteIds.add(id));
    });

    if (noteIds.size === 0) return [];

    // Get all notes
    const allNotes = await getAllNotes();

    // Filter only notes in the date range
    return allNotes.filter(note => {
      if (noteIds.has(note.id)) {
        const noteDate = new Date(note.updatedAt || note.createdAt);
        return noteDate >= start && noteDate <= end;
      }
      return false;
    });
  } catch (error) {
    console.error('Error getting notes by date range:', error);
    return [];
  }
};
