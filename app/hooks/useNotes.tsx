// Description: Custom hook to manage notes using AsyncStorage and Supabase authentication
// This hook provides functions to load, save, add, update, delete, archive, and toggle trash for notes. It also handles authentication state changes to clear notes when the user logs out.
import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import supabase from '../utils/supabase';

const useNotes = () => {
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);

  // Get the current user ID from Supabase
  const getCurrentUserId = async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data?.user) return null;
    return data.user.id;
  };

  // Clear all notes
  const clearAllNotes = useCallback(async () => {
    const userId = await getCurrentUserId();
    if (!userId) return;

    const storageKey = `notes_${userId}`;
    await AsyncStorage.setItem(storageKey, JSON.stringify([]));
    setNotes([]);

    return true;
  }, []);

  // Load notes
  const loadNotes = useCallback(async () => {
    try {
      setLoading(true);
      const userId = await getCurrentUserId();
      if (!userId) {
        setNotes([]);
        return;
      }

      const storageKey = `notes_${userId}`;
      const savedNotes = await AsyncStorage.getItem(storageKey);

      setNotes(savedNotes ? JSON.parse(savedNotes) : []);
    } catch (error) {
      setNotes([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Save notes
  const saveNotes = async updatedNotes => {
    try {
      const userId = await getCurrentUserId();
      if (!userId) return;

      const storageKey = `notes_${userId}`;
      await AsyncStorage.setItem(storageKey, JSON.stringify(updatedNotes));

      setNotes(updatedNotes);
    } catch (error) {
      // Error saving notes, we are saving the log
      console.error('Error saving notes:', error);
    }
  };

  // Watch for auth state changes
  useEffect(() => {
    // Clear all notes on first load
    clearAllNotes().then(() => {
      // Set up Supabase auth state change listener
      const { data: authListener } = supabase.auth.onAuthStateChange(() => {
        loadNotes();
      });

      // Clean up subscription when component unmounts
      return () => {
        if (authListener?.subscription) authListener.subscription.unsubscribe();
      };
    });
  }, [clearAllNotes, loadNotes]);

  // Add note
  const addNote = async newNote => {
    const updatedNotes = [newNote, ...notes];
    await saveNotes(updatedNotes);
  };

  // Update note
  const updateNote = async (id, updatedNote) => {
    const updatedNotes = notes.map(note => (note.id === id ? { ...note, ...updatedNote } : note));
    await saveNotes(updatedNotes);
  };

  // Delete note
  const deleteNote = async id => {
    const updatedNotes = notes.filter(note => note.id !== id);
    await saveNotes(updatedNotes);
  };

  // Archive/Unarchive note
  const toggleArchive = async id => {
    const updatedNotes = notes.map(note =>
      note.id === id ? { ...note, isArchived: !note.isArchived } : note
    );
    await saveNotes(updatedNotes);
  };

  // Move to trash/Undo trash
  const toggleTrash = async id => {
    const updatedNotes = notes.map(note =>
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
