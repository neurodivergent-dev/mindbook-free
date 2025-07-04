// This file archives notes and allows users to restore or delete them.
// Mindbook Pro is archive notes screen

import { useState, useCallback } from 'react';
import { View, StyleSheet, FlatList, Text, TouchableOpacity, Alert } from 'react-native';
import { Stack, useRouter, useFocusEffect } from 'expo-router';
import { useTheme } from '../context/ThemeContext';
import { getAllNotes, NOTES_KEY } from '../utils/storage';
import NoteCard from '../components/NoteCard';
import EmptyState from '../components/EmptyState';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTranslation } from 'react-i18next';
import { backupToCloud } from '../utils/backup';
import { useAuth } from '../context/AuthContext';

export default function ArchiveScreen() {
  const [notes, setNotes] = useState([]);
  const [selectedNotes, setSelectedNotes] = useState(new Set());
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const { theme, themeColors, accentColor } = useTheme();
  const router = useRouter();
  const { t } = useTranslation();
  const { user } = useAuth();

  const loadArchivedNotes = useCallback(async () => {
    try {
      const allNotes = await getAllNotes();
      const archivedNotes = allNotes.filter(note => note.isArchived && !note.isTrash);
      setNotes(archivedNotes);
      setIsSelectionMode(false);
      setSelectedNotes(new Set());
    } catch (error) {
      Alert.alert(t('common.error'), t('notes.loadError'));
    }
  }, [t]);

  useFocusEffect(
    useCallback(() => {
      loadArchivedNotes();
    }, [loadArchivedNotes])
  );

  const toggleNoteSelection = noteId => {
    const newSelectedNotes = new Set(selectedNotes);
    if (newSelectedNotes.has(noteId)) {
      newSelectedNotes.delete(noteId);
    } else {
      newSelectedNotes.add(noteId);
    }
    setSelectedNotes(newSelectedNotes);
    setIsSelectionMode(newSelectedNotes.size > 0);
  };

  const handleSelectAll = () => {
    if (selectedNotes.size === notes.length) {
      // Deselect all
      setSelectedNotes(new Set());
      setIsSelectionMode(false);
    } else {
      // Select all
      setSelectedNotes(new Set(notes.map(note => note.id)));
    }
  };

  const handleUnarchive = async () => {
    if (selectedNotes.size === 0) {
      Alert.alert(t('common.warning'), t('notes.selectNotesToRestore'));
      return;
    }

    try {
      // First get all notes
      const allNotes = await getAllNotes();
      const selectedNotesList = Array.from(selectedNotes);

      // Update selected notes
      const updatedNotes = allNotes.map(note => {
        if (selectedNotesList.includes(note.id)) {
          return { ...note, isArchived: false };
        }
        return note;
      });

      // Perform bulk update
      await AsyncStorage.setItem(NOTES_KEY, JSON.stringify(updatedNotes));

      // Auto backup kontrolü ve bulut güncellemesi
      try {
        const autoBackupEnabled = await AsyncStorage.getItem('@auto_backup_enabled');
        if (autoBackupEnabled === 'true' && user && !user.isAnonymous) {
          const result = await backupToCloud(user.uid);
          if (result.success) {
            await AsyncStorage.setItem('@last_backup_time', new Date().toISOString());
          }
        }
      } catch (error) {
        console.error('Auto backup after unarchive failed:', error);
      }

      // Update UI
      const archivedNotes = updatedNotes.filter(note => note.isArchived && !note.isTrash);
      setNotes(archivedNotes);
      setSelectedNotes(new Set());
      setIsSelectionMode(false);

      // Notify the user
      Alert.alert(t('common.success'), t('notes.notesRestored', { count: selectedNotes.size }));
    } catch (error) {
      Alert.alert(t('common.error'), t('notes.restoreError'));
    }
  };

  const handleTrash = async () => {
    if (selectedNotes.size === 0) {
      Alert.alert(t('common.warning'), t('notes.selectNotesToTrash'));
      return;
    }

    Alert.alert(t('notes.moveToTrash'), t('notes.moveToTrashConfirmation'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: async () => {
          try {
            // First get all notes
            const allNotes = await getAllNotes();
            const selectedNotesList = Array.from(selectedNotes);

            // Update selected notes
            const updatedNotes = allNotes.map(note => {
              if (selectedNotesList.includes(note.id)) {
                return { ...note, isTrash: true };
              }
              return note;
            });

            // Perform bulk update
            await AsyncStorage.setItem(NOTES_KEY, JSON.stringify(updatedNotes));

            // Auto backup kontrolü ve bulut güncellemesi
            try {
              const autoBackupEnabled = await AsyncStorage.getItem('@auto_backup_enabled');
              if (autoBackupEnabled === 'true' && user && !user.isAnonymous) {
                const result = await backupToCloud(user.uid);
                if (result.success) {
                  await AsyncStorage.setItem('@last_backup_time', new Date().toISOString());
                }
              }
            } catch (error) {
              console.error('Auto backup after archive trash failed:', error);
            }

            // Update UI
            const archivedNotes = updatedNotes.filter(note => note.isArchived && !note.isTrash);
            setNotes(archivedNotes);
            setSelectedNotes(new Set());
            setIsSelectionMode(false);

            Alert.alert(
              t('common.success'),
              t('notes.notesMovedToTrash', { count: selectedNotes.size })
            );
          } catch (error) {
            Alert.alert(t('common.error'), t('notes.moveToTrashError'));
          }
        },
      },
    ]);
  };

  const renderActionBar = () => (
    <View style={[styles.actionBar, { backgroundColor: theme.card }]}>
      <TouchableOpacity style={styles.actionButton} onPress={handleSelectAll}>
        <Ionicons
          name={selectedNotes.size === notes.length ? 'close-circle' : 'checkmark-circle'}
          size={22}
          color={themeColors[accentColor]}
        />
        <Text style={[styles.actionText, { color: theme.text }]}>
          {selectedNotes.size === notes.length ? t('common.unselectAll') : t('common.selectAll')}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.actionButton} onPress={handleUnarchive}>
        <Ionicons name="archive-outline" size={22} color={themeColors[accentColor]} />
        <Text style={[styles.actionText, { color: theme.text }]}>
          {t('notes.restoreFromArchive')}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.actionButton} onPress={handleTrash}>
        <Ionicons name="trash-outline" size={22} color="#dc2626" />
        <Text style={[styles.actionText, { color: theme.text }]}>{t('notes.moveToTrash')}</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Stack.Screen
        options={{
          headerShown: false,
          presentation: 'modal',
        }}
      />

      <View style={[styles.header, { backgroundColor: themeColors[accentColor] }]}>
        <TouchableOpacity
          style={styles.closeButton}
          onPress={() => {
            if (isSelectionMode) {
              setIsSelectionMode(false);
              setSelectedNotes(new Set());
            } else {
              router.back();
            }
          }}
        >
          <Ionicons name={isSelectionMode ? 'close' : 'chevron-back'} size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {isSelectionMode
            ? t('notes.selected', { count: selectedNotes.size })
            : t('notes.archive')}
        </Text>
      </View>

      {isSelectionMode && renderActionBar()}

      <FlatList
        data={notes}
        renderItem={({ item }) => (
          <NoteCard
            note={item}
            onRefresh={loadArchivedNotes}
            isSelectionMode={isSelectionMode}
            isSelected={selectedNotes.has(item.id)}
            onLongPress={() => {
              setIsSelectionMode(true);
              toggleNoteSelection(item.id);
            }}
            onPress={() => {
              if (isSelectionMode) {
                toggleNoteSelection(item.id);
              }
            }}
            style={{}}
          />
        )}
        keyExtractor={item => item.id}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: (isSelectionMode ? 80 : 16) as number },
        ]}
        ListEmptyComponent={
          <EmptyState
            icon="archive"
            title={t('notes.emptyArchive')}
            message={t('notes.emptyArchiveMessage')}
          />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  actionBar: {
    alignItems: 'center',
    backgroundColor: 'transparent' as string,
    borderBottomColor: 'rgba(0,0,0,0.1)' as string,
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 16,
  },
  actionButton: {
    alignItems: 'center',
    gap: 4,
  },
  actionText: {
    fontSize: 12,
  },
  closeButton: {
    marginRight: 8,
    padding: 8,
  },
  container: {
    flex: 1,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    padding: 16,
    paddingTop: 40,
  },
  headerTitle: {
    color: '#FFFFFF' as string,
    fontSize: 20,
    fontWeight: '600',
  },
  listContent: {
    flexGrow: 1,
    padding: 16,
  },
});
