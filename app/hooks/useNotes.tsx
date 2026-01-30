// Simplified useNotes hook for Mindbook Free
// This hook provides functions to manage notes using local AsyncStorage only
import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const NOTES_KEY = '@notes';

const useNotes = () => {
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);

  // Clear all notes
  const clearAllNotes = useCallback(async () => {
    await AsyncStorage.setItem(NOTES_KEY, JSON.stringify([]));
    setNotes([]);
    return true;
  }, []);

  // Load notes
  const loadNotes = useCallback(async () => {
    try {
      setLoading(true);
      const savedNotes = await AsyncStorage.getItem(NOTES_KEY);
      setNotes(savedNotes ? JSON.parse(savedNotes) : []);
    } catch (error) {
      console.error('Error loading notes:', error);
      setNotes([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Save notes
  const saveNotes = async (updatedNotes) => {
    try {
      await AsyncStorage.setItem(NOTES_KEY, JSON.stringify(updatedNotes));
      setNotes(updatedNotes);
    } catch (error) {
      console.error('Error saving notes:', error);
    }
  };

  // Load notes on mount
  useEffect(() => {
    loadNotes();
  }, [loadNotes]);

  // Add note
  const addNote = async (newNote) => {
    const updatedNotes = [newNote, ...notes];
    await saveNotes(updatedNotes);
  };

  // Update note
  const updateNote = async (id, updatedNote) => {
    const updatedNotes = notes.map((note) =>
      note.id === id ? { ...note, ...updatedNote } : note
    );
    await saveNotes(updatedNotes);
  };

  // Delete note
  const deleteNote = async (id) => {
    const updatedNotes = notes.filter((note) => note.id !== id);
    await saveNotes(updatedNotes);
  };

  // Archive/Unarchive note
  const toggleArchive = async (id) => {
    const updatedNotes = notes.map((note) =>
      note.id === id ? { ...note, isArchived: !note.isArchived } : note
    );
    await saveNotes(updatedNotes);
  };

  // Move to trash/Undo trash
  const toggleTrash = async (id) => {
    const updatedNotes = notes.map((note) =>
      note.id === id ? { ...note, isDeleted: !note.isDeleted } : note
    );
    await saveNotes(updatedNotes);
  };

  return {
    notes,
    loading,
    addNote,
    updateNote,
    deleteNote,
    toggleArchive,
    toggleTrash,
    loadNotes,
    clearAllNotes,
  };
};

export default useNotes;
