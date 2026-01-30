// This file is Favorites Screen component, which displays a list of favorite notes.
// It allows users to share, archive, un-favorite, or delete notes.
import { useState, useCallback, useEffect } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Text,
  Alert,
  Share,
  Platform,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useFocusEffect } from 'expo-router';
import { useTheme } from '../context/ThemeContext';
import { useSearch } from '../context/SearchContext';
import { getAllNotes, NOTES_KEY } from '../utils/storage';
import NoteCard from '../components/NoteCard';
import EmptyState from '../components/EmptyState';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTranslation } from 'react-i18next';

// Color constants
const COLORS = {
  white: '#FFFFFF',
  danger: '#dc2626',
  transparent: 'transparent',
  shadowColor: '#000',
  borderTopColor: 'rgba(0,0,0,0.1)',
  borderBottomColor: 'rgba(0,0,0,0.1)',
  statsBadgeBg: 'rgba(0,0,0,0.05)',
};

export default function FavoritesScreen() {
  const [notes, setNotes] = useState([]);
  const [filteredNotes, setFilteredNotes] = useState([]);
  const { theme, accentColor, themeColors, themeMode } = useTheme();
  const { searchQuery } = useSearch();
  const [refreshing, setRefreshing] = useState(false);
  const { t } = useTranslation();
  const [selectedNotes, setSelectedNotes] = useState(new Set<string>());
  const [isSelectionMode, setIsSelectionMode] = useState(false);

  // Filter function
  const filterNotes = useCallback(
    notesToFilter => {
      let filtered = [...notesToFilter];

      if (searchQuery) {
        filtered = filtered.filter(
          note =>
            note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            note.content.toLowerCase().includes(searchQuery.toLowerCase())
        );
      }

      setFilteredNotes(filtered);
    },
    [searchQuery]
  );

  const loadNotes = useCallback(async () => {
    try {
      const loadedNotes = await getAllNotes();
      const favoriteNotes = loadedNotes.filter(
        note => note.isFavorite && !note.isTrash && !note.isArchived
      );

      setNotes(favoriteNotes);
      filterNotes(favoriteNotes);
      // Reset selection mode and selected notes
      setIsSelectionMode(false);
      setSelectedNotes(new Set());
    } catch (error) {
      console.error('Error loading notes:', error);
    }
  }, [filterNotes]);

  useFocusEffect(
    useCallback(() => {
      loadNotes();
      return () => {
        // Clean up when tab changes
        setNotes([]);
        setFilteredNotes([]);
      };
    }, [loadNotes])
  );

  // Update filtering when searchQuery changes
  useEffect(() => {
    // Only run filterNotes when notes or searchQuery actually changes
    if (notes.length > 0) {
      filterNotes(notes);
    }
  }, [searchQuery, filterNotes, notes]);

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

  const handleShare = async () => {
    try {
      const selectedNotesList = filteredNotes.filter(note => selectedNotes.has(note.id));
      const shareText = selectedNotesList
        .map(note => `${note.title}\n\n${note.content}`)
        .join('\n\n---\n\n');

      await Share.share({
        message: shareText,
        title: 'Share Notes',
      });
    } catch (error) {
      Alert.alert('Error', 'An error occurred while sharing notes.');
    }
  };

  const handleArchive = async () => {
    if (selectedNotes.size === 0) {
      Alert.alert('Warning', 'Please select the notes you would like to archive.');
      return;
    }

    try {
      // First get all notes
      const allNotes = await getAllNotes();
      const selectedNotesList = Array.from(selectedNotes);

      // Update selected notes
      const updatedNotes = allNotes.map(note => {
        if (selectedNotesList.includes(note.id)) {
          return { ...note, isArchived: true };
        }
        return note;
      });

      // Perform bulk update
      await AsyncStorage.setItem(NOTES_KEY, JSON.stringify(updatedNotes));

      // Update UI
      const favoriteNotes = updatedNotes.filter(
        note => note.isFavorite && !note.isTrash && !note.isArchived
      );
      setNotes(favoriteNotes);
      filterNotes(favoriteNotes);
      setSelectedNotes(new Set());
      setIsSelectionMode(false);

      // Notify the user
      Alert.alert('Successful', `${selectedNotes.size} note moved to archive.`);
    } catch (error) {
      Alert.alert('Error', 'An error occurred while archiving notes.');
    }
  };

  const handleTrash = async () => {
    if (selectedNotes.size === 0) {
      Alert.alert('Warning', 'Please select the notes you want to delete.');
      return;
    }

    Alert.alert(
      'Move to Trash',
      `${selectedNotes.size} Are you sure you want to move the note to trash? You can restore it within 30 days.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Move',
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

              // Update UI
              const favoriteNotes = updatedNotes.filter(
                note => note.isFavorite && !note.isTrash && !note.isArchived
              );
              setNotes(favoriteNotes);
              filterNotes(favoriteNotes);
              setSelectedNotes(new Set());
              setIsSelectionMode(false);

              // Notify the user
              Alert.alert('Successful', `${selectedNotes.size} note moved to trash.`);
            } catch (error) {
              Alert.alert('Error', 'An error occurred while moving notes to the trash.');
            }
          },
        },
      ]
    );
  };

  const handleSelectAll = () => {
    if (selectedNotes.size === filteredNotes.length) {
      // Deselect all
      setSelectedNotes(new Set());
      setIsSelectionMode(false);
    } else {
      // Select all
      setSelectedNotes(new Set(filteredNotes.map(note => note.id)));
    }
  };

  const handleUnfavorite = async () => {
    if (selectedNotes.size === 0) {
      Alert.alert(t('common.warning'), t('notes.selectNotesToUnfavorite'));
      return;
    }

    try {
      // First get all notes
      const allNotes = await getAllNotes();
      const selectedNotesList = Array.from(selectedNotes);

      // Update selected notes
      const updatedNotes = allNotes.map(note => {
        if (selectedNotesList.includes(note.id)) {
          return { ...note, isFavorite: false };
        }
        return note;
      });

      // Perform bulk update
      await AsyncStorage.setItem(NOTES_KEY, JSON.stringify(updatedNotes));

      // Update UI
      const favoriteNotes = updatedNotes.filter(
        note => note.isFavorite && !note.isTrash && !note.isArchived
      );
      setNotes(favoriteNotes);
      filterNotes(favoriteNotes);
      setSelectedNotes(new Set());
      setIsSelectionMode(false);

      // Notify the user
      Alert.alert(
        t('common.success'),
        t('notes.notesRemovedFromFavorites', { count: selectedNotesList.length })
      );
    } catch (error) {
      Alert.alert(t('common.error'), t('notes.favoriteUpdateError'));
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadNotes();
    setRefreshing(false);
  };

  const renderEmptyState = () => (
    <EmptyState
      icon="star"
      title={t('notes.emptyFavorites')}
      message={t('notes.emptyFavoritesMessage')}
      heightMultiplier={0.6}
    />
  );

  const renderActionBar = () => {
    return (
      <View
        style={[
          styles.actionBar,
          {
            backgroundColor: theme.card,
            borderTopColor: themeMode === 'dark' ? theme.border : COLORS.borderTopColor,
          },
        ]}
      >
        <View style={styles.actionBarContent}>
          <View style={styles.actionBarLeft}>
            <TouchableOpacity
              style={[
                styles.actionIconButton,
                {
                  borderColor: themeColors[accentColor],
                  backgroundColor: themeMode === 'dark' ? theme.card : COLORS.white,
                },
              ]}
              onPress={handleSelectAll}
            >
              <Ionicons
                name={
                  selectedNotes.size === filteredNotes.length ? 'close-circle' : 'checkmark-circle'
                }
                size={20}
                color={themeColors[accentColor]}
              />
            </TouchableOpacity>
          </View>

          <View style={styles.actionButtonsGroup}>
            <TouchableOpacity
              style={[
                styles.actionIconButton,
                {
                  borderColor: themeColors[accentColor],
                  backgroundColor: themeMode === 'dark' ? theme.card : COLORS.white,
                },
              ]}
              onPress={handleShare}
            >
              <Ionicons name="share-outline" size={20} color={themeColors[accentColor]} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.actionIconButton,
                {
                  borderColor: themeColors[accentColor],
                  backgroundColor: themeMode === 'dark' ? theme.card : COLORS.white,
                },
              ]}
              onPress={handleArchive}
            >
              <Ionicons name="archive-outline" size={20} color={themeColors[accentColor]} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.actionIconButton,
                {
                  borderColor: themeColors[accentColor],
                  backgroundColor: themeMode === 'dark' ? theme.card : COLORS.white,
                },
              ]}
              onPress={handleUnfavorite}
            >
              <Ionicons name="star" size={20} color={themeColors[accentColor]} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.actionIconButtonDanger,
                {
                  borderColor: COLORS.danger,
                  backgroundColor: themeMode === 'dark' ? theme.card : COLORS.white,
                },
              ]}
              onPress={handleTrash}
            >
              <Ionicons name="trash-outline" size={20} color={COLORS.danger} />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { backgroundColor: theme.card }]}>
        <View style={styles.headerLeft}>
          <View style={styles.titleContainer}>
            <Text style={[styles.title, { color: theme.text }]}>{t('notes.favorites')}</Text>
            {isSelectionMode && (
              <View
                style={[
                  styles.selectionBadge,
                  { backgroundColor: themeColors[accentColor] + '20' },
                ]}
              >
                <Ionicons
                  name="checkmark-circle"
                  size={16}
                  color={themeColors[accentColor]}
                  style={styles.badgeIcon}
                />
                <Text style={[styles.selectionBadgeText, { color: themeColors[accentColor] }]}>
                  {`${selectedNotes.size} ${t('common.selected')}`}
                </Text>
              </View>
            )}
          </View>

          <View style={styles.headerStats}>
            <Ionicons
              name="star"
              size={18}
              color={themeColors[accentColor]}
              style={styles.headerIcon}
            />
            <Text style={[styles.statsText, { color: theme.text }]}>
              {filteredNotes.length} {t('notes.notesCount')}
            </Text>

            {filteredNotes.length > 0 && (
              <View style={styles.statsBadge}>
                <Ionicons name="time-outline" size={14} color={themeColors[accentColor]} />
                <Text style={[styles.badgeText, { color: theme.text }]}>
                  {new Date(
                    Math.max(
                      ...filteredNotes.map(n => new Date(n.updatedAt || n.createdAt).getTime())
                    )
                  ).toLocaleDateString()}
                </Text>
              </View>
            )}
          </View>

          <Text style={[styles.lastUpdateText, { color: theme.textSecondary }]}>
            {filteredNotes.length > 0
              ? `${t('notes.lastEdit')}: ${new Date().toLocaleDateString()}`
              : t('notes.emptyFavorites')}
          </Text>
        </View>
      </View>

      <FlashList
        data={filteredNotes}
        estimatedItemSize={200}
        renderItem={({ item }) => (
          <NoteCard
            note={item}
            onRefresh={loadNotes}
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
            showReadingTime={true}
            showTags={true}
            showLastEditInfo={true}
            compact={false}
            style={styles.noteItemMargin}
          />
        )}
        keyExtractor={item => item.id}
        contentContainerStyle={
          isSelectionMode 
            ? { ...styles.listContent, ...styles.listPaddingWithSelection }
            : { ...styles.listContent, ...styles.listPaddingWithoutSelection }
        }
        ListEmptyComponent={renderEmptyState}
        refreshing={refreshing}
        onRefresh={onRefresh}
        extraData={[selectedNotes.size, isSelectionMode, Array.from(selectedNotes).join(',')]}
      />
      {isSelectionMode && renderActionBar()}
    </View>
  );
}

// Styles for the component
const styles = StyleSheet.create({
  actionBar: {
    borderTopColor: COLORS.borderTopColor,
    borderTopWidth: 1,
    bottom: 0,
    elevation: 4,
    left: 0,
    paddingBottom: Platform.OS === 'ios' ? 28 : 12,
    paddingTop: 12,
    position: 'absolute',
    right: 0,
    shadowColor: COLORS.shadowColor,
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    zIndex: 999,
  },
  actionBarContent: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    zIndex: 1000,
  },
  actionBarLeft: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  actionButtonsGroup: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  actionIconButton: {
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 8,
    borderWidth: 1,
    elevation: 2,
    height: 40,
    justifyContent: 'center',
    shadowColor: COLORS.shadowColor,
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
    width: 40,
  },
  actionIconButtonDanger: {
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 8,
    borderWidth: 1,
    elevation: 2,
    height: 40,
    justifyContent: 'center',
    shadowColor: COLORS.shadowColor,
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
    width: 40,
  },
  badgeIcon: {
    marginRight: 4,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 4,
  },
  container: {
    flex: 1,
  },
  header: {
    alignItems: 'center',
    borderBottomColor: COLORS.borderBottomColor,
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
  },
  headerIcon: {
    marginRight: 6,
  },
  headerLeft: {
    flex: 1,
  },
  headerStats: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  lastUpdateText: {
    fontSize: 12,
    marginTop: 4,
  },
  listContent: {
    flexGrow: 1,
    padding: 8,
  },
  listPaddingWithSelection: {
    paddingBottom: 80,
  },
  listPaddingWithoutSelection: {
    paddingBottom: 16,
  },
  noteItemMargin: {
    marginHorizontal: 4,
  },
  selectionBadge: {
    alignItems: 'center',
    borderRadius: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    marginLeft: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  selectionBadgeText: {
    fontSize: 16,
    fontWeight: '700',
  },
  statsBadge: {
    alignItems: 'center',
    backgroundColor: COLORS.statsBadgeBg,
    borderRadius: 12,
    flexDirection: 'row',
    marginLeft: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  statsText: {
    fontSize: 15,
    fontWeight: '500',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  titleContainer: {
    alignItems: 'center',
    flexDirection: 'row',
    marginBottom: 8,
  },
});
