// This file is Note Screen component, which is used to display the list of notes.
import { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { useSearch } from '../context/SearchContext';
import NoteCard from '../components/NoteCard';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { FlatList } from 'react-native-gesture-handler';

export default function NotesScreen() {
  const { theme, themeColors, accentColor } = useTheme();
  const { searchQuery } = useSearch();
  const [notes, setNotes] = useState([]);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedNotes, setSelectedNotes] = useState([]);

  const loadNotes = useCallback(async () => {
    try {
      const storedNotes = await AsyncStorage.getItem('notes');
      if (storedNotes) {
        let parsedNotes = JSON.parse(storedNotes);

        // Filter notes that are not in the trash
        parsedNotes = parsedNotes.filter(note => !note.isTrash);

        // Filter if there is a search query
        if (searchQuery) {
          parsedNotes = parsedNotes.filter(
            note =>
              note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
              note.content.toLowerCase().includes(searchQuery.toLowerCase())
          );
        }

        // Sort notes by date (newest on top)
        parsedNotes.sort(
          (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        );

        setNotes(parsedNotes);
      }
    } catch (error) {
      // Note loading error, we are saving the log
      console.error('Error loading notes:', error);
    }
  }, [searchQuery]);

  useEffect(() => {
    loadNotes();
  }, [loadNotes]);

  const handleDeleteNote = async noteId => {
    try {
      const storedNotes = await AsyncStorage.getItem('notes');
      if (storedNotes) {
        const parsedNotes = JSON.parse(storedNotes);

        // Find the note and set the isTrash property to true
        const updatedNotes = parsedNotes.map(note => {
          if (note.id === noteId) {
            return { ...note, isTrash: true };
          }
          return note;
        });

        // Save updated notes
        await AsyncStorage.setItem('notes', JSON.stringify(updatedNotes));

        // Reload notes
        loadNotes();
      }
    } catch (error) {
      Alert.alert('Error', 'An error occurred while deleting the note.');
    }
  };

  const handleMoveToVault = async () => {
    try {
      router.push('/(modal)/vault');
    } catch (error) {
      console.error('Vault page redirect error:', error);
    }
  };

  const handleSelectAll = () => {
    if (selectedNotes.length === notes.length) {
      setSelectedNotes([]);
    } else {
      setSelectedNotes(notes.map(note => note.id));
    }
  };

  const handleNotePress = noteId => {
    if (isSelectionMode) {
      if (selectedNotes.includes(noteId)) {
        setSelectedNotes(selectedNotes.filter(id => id !== noteId));
        if (selectedNotes.length === 1) {
          setIsSelectionMode(false);
        }
      } else {
        setSelectedNotes([...selectedNotes, noteId]);
      }
    }
  };

  const handleNoteLongPress = noteId => {
    if (!isSelectionMode) {
      setIsSelectionMode(true);
      setSelectedNotes([noteId]);
    }
  };

  const renderActionBar = () => (
    <View style={[styles.actionBar, { backgroundColor: theme.card }]}>
      <TouchableOpacity style={styles.actionButton} onPress={handleSelectAll}>
        <Ionicons
          name={selectedNotes.length === notes.length ? 'close-circle' : 'checkmark-circle'}
          size={22}
          color={themeColors[accentColor]}
        />
        <Text style={[styles.actionText, { color: theme.text }]}>
          {selectedNotes.length === notes.length ? 'Uncheck' : 'Select All'}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.actionButton} onPress={handleMoveToVault}>
        <Ionicons name="lock-closed" size={22} color={themeColors[accentColor]} />
        <Text style={[styles.actionText, { color: theme.text }]}>Move to Vault</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <GestureHandlerRootView style={styles.gestureContainer}>
        <FlatList
          data={notes}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <NoteCard
              note={item}
              onRefresh={() => handleDeleteNote(item.id)}
              isSelectionMode={isSelectionMode}
              isSelected={selectedNotes.includes(item.id)}
              onLongPress={() => handleNoteLongPress(item.id)}
              onPress={() => handleNotePress(item.id)}
              style={{}}
            />
          )}
          contentContainerStyle={styles.listContent}
        />
      </GestureHandlerRootView>
      {isSelectionMode && renderActionBar()}
    </View>
  );
}

const COLORS = {
  divider: 'rgba(0,0,0,0.1)',
};

// Styles for the component
const styles = StyleSheet.create({
  actionBar: {
    borderTopColor: COLORS.divider,
    borderTopWidth: 1,
    bottom: 0,
    flexDirection: 'row',
    justifyContent: 'space-around',
    left: 0,
    paddingVertical: 16,
    position: 'absolute',
    right: 0,
  },
  actionButton: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  actionText: {
    fontSize: 16,
    fontWeight: '500',
  },
  container: {
    flex: 1,
  },
  gestureContainer: {
    flex: 1,
  },
  listContent: {
    padding: 16,
  },
});
