// This file is Trash screen component that displays the notes in the trash.
// It allows the user to restore or permanently delete notes from the trash.
// It also provides an option to empty the trash completely.
// It uses React Native components and Expo Router for navigation.
import { useState, useCallback } from 'react';
import { View, StyleSheet, Text, TouchableOpacity, Alert } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useFocusEffect, useRouter, Stack } from 'expo-router';
import { getAllNotes, NOTES_KEY } from '../utils/storage';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../context/ThemeContext';
import NoteCard from '../components/NoteCard';
import EmptyState from '../components/EmptyState';
import { backupToCloud } from '../utils/backup';
import { useAuth } from '../context/AuthContext';

export default function TrashScreen() {
  const [notes, setNotes] = useState([]);
  const [selectedNotes, setSelectedNotes] = useState(new Set());
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const { t } = useTranslation();
  const router = useRouter();
  const { theme, accentColor, themeColors } = useTheme() || {
    theme: {},
    themeMode: 'light',
    accentColor: 'blue',
    themeColors: {},
  };
  const { user } = useAuth();

  const loadTrashNotes = async () => {
    try {
      const allNotes = await getAllNotes();
      const trashNotes = allNotes.filter(note => note.isTrash);
      setNotes(trashNotes);
      setIsSelectionMode(false);
      setSelectedNotes(new Set());
    } catch (error) {
      return null;
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadTrashNotes();
    }, [])
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

  const handleRestore = async () => {
    if (selectedNotes.size === 0) {
      Alert.alert(t('common.warning'), t('notes.selectNotesToRestore'));
      return;
    }

    try {
      // First get all notes
      const allNotes = await getAllNotes();
      const selectedNotesList = Array.from(selectedNotes);

      // Let's update the UI first
      const remainingTrashNotes = notes.filter(note => !selectedNotesList.includes(note.id));
      setNotes(remainingTrashNotes);
      setSelectedNotes(new Set());
      setIsSelectionMode(false);

      // Then let's update the database
      const updatedNotes = allNotes.map(note => {
        if (selectedNotesList.includes(note.id)) {
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const { isTrash, trashedAt, ...rest } = note;
          return rest;
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
        console.error('Auto backup after restore failed:', error);
      }

      // Notify the user
      Alert.alert(
        t('common.success'),
        t('notes.notesRestored', { count: selectedNotesList.length })
      );
    } catch (error) {
      // If there is an error, let's reload the notes
      loadTrashNotes();
      Alert.alert(t('common.error'), t('notes.restoreError'));
    }
  };

  const handleDelete = async () => {
    if (selectedNotes.size === 0) {
      Alert.alert(t('common.warning'), t('trash.selectNotesToDelete'));
      return;
    }

    Alert.alert(t('common.warning'), t('notes.confirmClearTrash', { count: selectedNotes.size }), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: async () => {
          try {
            const notesStr = await AsyncStorage.getItem(NOTES_KEY);
            const allNotes = notesStr ? JSON.parse(notesStr) : [];
            const selectedNotesList = Array.from(selectedNotes);

            // Let's do the state updates first
            const remainingTrashNotes = notes.filter(note => !selectedNotesList.includes(note.id));
            setNotes(remainingTrashNotes);
            setSelectedNotes(new Set());
            setIsSelectionMode(false);

            // Then let's update the database
            const remainingNotes = allNotes.filter(note => !selectedNotesList.includes(note.id));
            await AsyncStorage.setItem(NOTES_KEY, JSON.stringify(remainingNotes));

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
              console.error('Auto backup after delete failed:', error);
            }

            // Let's show notification
            Alert.alert(
              t('common.success'),
              t('notes.notesPermanentlyDeleted', {
                count: selectedNotesList.length,
              })
            );
          } catch (error) {
            // Let's reload notes in case of error
            loadTrashNotes();
            Alert.alert(t('common.error'), t('trash.deleteError'));
          }
        },
      },
    ]);
  };

  const handleEmptyTrash = async () => {
    if (notes.length === 0) {
      Alert.alert(t('common.warning'), t('trash.emptyTrashAlready'));
      return;
    }

    Alert.alert(t('common.warning'), t('notes.emptyTrashConfirmation'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: async () => {
          try {
            // Let's do the state updates first
            setNotes([]);
            setSelectedNotes(new Set());
            setIsSelectionMode(false);

            // Then let's update the database
            const notesStr = await AsyncStorage.getItem(NOTES_KEY);
            const allNotes = notesStr ? JSON.parse(notesStr) : [];
            const notTrashNotes = allNotes.filter(note => !note.isTrash);
            await AsyncStorage.setItem(NOTES_KEY, JSON.stringify(notTrashNotes));

            // Let's show notification
            Alert.alert(t('common.success'), t('notes.allNotesDeletedFromTrash'));

            // Backup to Supabase
            try {
              const { backupToCloud, getCurrentUserId } = require('../utils/backup');
              const userId = await getCurrentUserId();
              if (userId) {
                await backupToCloud(userId);
              }
            } catch (syncError) {
              console.log('Backup error:', syncError);
            }
          } catch (error) {
            // Let's reload notes in case of error
            loadTrashNotes();
            Alert.alert(t('common.error'), t('notes.emptyTrashError'));
          }
        },
      },
    ]);
  };

  const renderEmptyTrashButton = () => {
    if (notes.length === 0) return null;

    return (
      <TouchableOpacity
        style={[styles.emptyTrashButton, { backgroundColor: '#dc2626' as string }]}
        onPress={handleEmptyTrash}
      >
        <Ionicons name="trash-bin-outline" size={18} color={'#FFFFFF' as string} />
        <Text style={styles.emptyTrashButtonText}>{t('notes.emptyTrash')}</Text>
      </TouchableOpacity>
    );
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

      <TouchableOpacity style={styles.actionButton} onPress={handleRestore}>
        <Ionicons name="refresh-circle-outline" size={22} color={themeColors[accentColor]} />
        <Text style={[styles.actionText, { color: theme.text }]}>
          {t('notes.restoreFromTrash')}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.actionButton} onPress={handleDelete}>
        <Ionicons name="trash-outline" size={22} color="#dc2626" />
        <Text style={[styles.actionText, { color: theme.text }]}>
          {t('notes.permanentlyDelete')}
        </Text>
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
          {isSelectionMode ? t('notes.selected', { count: selectedNotes.size }) : t('notes.trash')}
        </Text>
        {!isSelectionMode && renderEmptyTrashButton()}
      </View>

      {isSelectionMode && renderActionBar()}

      <FlashList
        data={notes}
        estimatedItemSize={200}
        renderItem={({ item }) => (
          <NoteCard
            key={item.id}
            note={item}
            onRefresh={loadTrashNotes}
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
            style={{ marginHorizontal: 4 }}
          />
        )}
        keyExtractor={item => item.id}
        contentContainerStyle={{
          ...styles.listContent,
          paddingBottom: isSelectionMode ? 80 : 16,
        }}
        ListEmptyComponent={
          <EmptyState
            icon="trash-outline"
            title={t('notes.emptyTrash')}
            message={t('notes.emptyTrashMessage')}
          />
        }
        extraData={[selectedNotes.size, isSelectionMode, Array.from(selectedNotes).join(',')]}
      />
    </View>
  );
}

// Styles for the Trash screen component
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
  emptyTrashButton: {
    alignItems: 'center',
    borderRadius: 16,
    flexDirection: 'row',
    gap: 4,
    marginLeft: 'auto',
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  emptyTrashButtonText: {
    color: '#FFFFFF' as string,
    fontSize: 12,
    fontWeight: '500',
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
