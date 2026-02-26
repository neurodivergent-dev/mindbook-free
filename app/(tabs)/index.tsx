// This file is Main Screen of the app, which is the main entry point for the app.
// It contains the main logic for displaying notes, categories, and other features.
// It also handles the navigation and state management for the app.
import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  Alert,
  Share,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { useTheme } from '../context/ThemeContext';
import { useSearch } from '../context/SearchContext';
import {
  getAllNotes,
  NOTES_KEY,
  batchToggleFavorite,
  batchToggleArchive,
  batchMoveToTrash,
} from '../utils/storage';
import NoteCard from '../components/NoteCard';
import EmptyState from '../components/EmptyState';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTranslation } from 'react-i18next';
import { Note } from '../models/Note';

// Color constants
const COLORS = {
  WHITE: '#FFFFFF',
  DANGER: '#dc2626',
  TRANSPARENT_BLACK: 'rgba(0,0,0,0.5)',
  TRANSPARENT_LIGHT: 'rgba(0,0,0,0.1)',
  BLACK: '#000',
  TEXT_WHITE: '#fff',
  TRANSPARENT: 'transparent',
  BADGE_BG: 'rgba(0,0,0,0.05)',
  BORDER_COLOR: 'rgba(0,0,0,0.1)',
};

// Define page size for pagination
const PAGE_SIZE = 20;

export default function NotesScreen() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [filteredNotes, setFilteredNotes] = useState<Note[]>([]);
  const [visibleNotes, setVisibleNotes] = useState<Note[]>([]);
  const [page, setPage] = useState(0);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const { theme, themeColors, accentColor, themeMode } = useTheme();
  const { searchQuery } = useSearch() || { searchQuery: '' };
  const { selectedCategory } = useLocalSearchParams();
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const [selectedNotes, setSelectedNotes] = useState(new Set<string>());
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [sortBy, setSortBy] = useState('dateNewest');
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'grid' | 'compact'>('list');
  const isGridView = viewMode === 'grid';
  const { t } = useTranslation();

  const sortOptions = [
    { id: 'dateNewest', label: t('common.dateNewest'), icon: 'time' as const },
    { id: 'dateOldest', label: t('common.dateOldest'), icon: 'time-outline' as const },
    { id: 'titleAZ', label: t('common.titleAZ'), icon: 'text' as const },
    { id: 'titleZA', label: t('common.titleZA'), icon: 'text-outline' as const },
  ];

  useEffect(() => {
    loadViewMode();
  }, []);

  const loadViewMode = async () => {
    try {
      const savedViewMode = await AsyncStorage.getItem('@view_mode');
      if (savedViewMode === 'grid' || savedViewMode === 'compact' || savedViewMode === 'list') {
        setViewMode(savedViewMode);
      }
    } catch (error) {
      console.error('Error loading view mode:', error);
    }
  };

  const toggleViewMode = async () => {
    let newMode: 'list' | 'grid' | 'compact' = 'list';
    if (viewMode === 'list') newMode = 'grid';
    else if (viewMode === 'grid') newMode = 'compact';
    else newMode = 'list';

    setViewMode(newMode);
    try {
      await AsyncStorage.setItem('@view_mode', newMode);
    } catch (error) {
      console.error('Error saving view mode:', error);
    }
  };

  const renderSortMenu = () => {
    if (!showSortMenu) return null;

    return (
      <TouchableOpacity
        style={styles.sortMenuOverlay}
        activeOpacity={1}
        onPress={() => setShowSortMenu(false)}
      >
        <View style={[styles.sortMenu, { backgroundColor: theme.card }]}>
          {sortOptions.map(option => (
            <TouchableOpacity
              key={option.id}
              style={[
                styles.sortOption,
                sortBy === option.id && { backgroundColor: themeColors[accentColor] + '20' },
              ]}
              onPress={() => {
                setSortBy(option.id);
                setShowSortMenu(false);
                filterNotes();
              }}
            >
              <Ionicons
                name={option.icon}
                size={20}
                color={sortBy === option.id ? themeColors[accentColor] : theme.text}
              />
              <Text
                style={[
                  styles.sortOptionText,
                  { color: sortBy === option.id ? themeColors[accentColor] : theme.text },
                ]}
              >
                {option.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </TouchableOpacity>
    );
  };

  async () => {
    try {
      await AsyncStorage.setItem(NOTES_KEY, JSON.stringify([])); // Clear only notes
      setNotes([]); // Reset the state
      setFilteredNotes([]); // Reset filtered notes
      Alert.alert(t('common.success'), t('notes.allNotesDeleted'));
    } catch (error) {
      Alert.alert(t('common.error'), t('notes.deleteNotesError'));
    }
  };

  const loadNotes = useCallback(async () => {
    try {
      const notesStr = await AsyncStorage.getItem(NOTES_KEY);
      const parsedNotes = notesStr ? JSON.parse(notesStr) : [];
      setNotes(parsedNotes);
    } catch (error) {
      console.error('An error occurred while loading notes:', error);
    }
  }, []);

  const checkForUpdatesAndLoadNotes = useCallback(async () => {
    // Instead of relying on flag system, load notes directly on focus
    await loadNotes();
  }, [loadNotes]);

  const filterNotes = useCallback(
    (currentNotes: Note[] = notes) => {
      const filtered = [...currentNotes].filter(note => {
        if (!note || typeof note !== 'object') return false;
        if (note.isArchived || note.isTrash) return false;
        if (note.isVaulted === true) return false;
        if (selectedCategory && note.category !== selectedCategory) return false;

        if (searchQuery) {
          const query = searchQuery.toLowerCase();
          const matchesTitle = note.title?.toLowerCase().includes(query);
          const matchesContent = note.content?.toLowerCase().includes(query);
          const matchesCategory = note.category?.toLowerCase().includes(query);
          return matchesTitle || matchesContent || matchesCategory;
        }

        return true;
      });

      // Sorting process
      filtered.sort((a, b) => {
        switch (sortBy) {
          case 'titleAZ':
            return (a.title || '').localeCompare(b.title || '');
          case 'titleZA':
            return (b.title || '').localeCompare(a.title || '');
          case 'dateOldest':
            return (
              new Date(a.updatedAt || a.createdAt).getTime() -
              new Date(b.updatedAt || b.createdAt).getTime()
            );
          case 'dateNewest':
          default:
            return (
              new Date(b.updatedAt || b.createdAt).getTime() -
              new Date(a.updatedAt || a.createdAt).getTime()
            );
        }
      });

      setFilteredNotes(filtered);

      // Reset pagination
      setPage(0);
      setVisibleNotes(filtered.slice(0, PAGE_SIZE));
      setHasMore(filtered.length > PAGE_SIZE);
    },
    [notes, searchQuery, selectedCategory, sortBy]
  );

  useFocusEffect(
    useCallback(() => {
      checkForUpdatesAndLoadNotes();
      return () => {};
    }, [checkForUpdatesAndLoadNotes])
  );

  // reorder notes when sortBy changes
  useEffect(() => {
    if (notes.length > 0) {
      filterNotes(notes);
    }
  }, [filterNotes, notes]);

  // Update visible notes when filtered notes change
  useEffect(() => {
    setVisibleNotes(filteredNotes.slice(0, PAGE_SIZE));
    setHasMore(filteredNotes.length > PAGE_SIZE);
    setPage(0);
  }, [filteredNotes]);

  const toggleNoteSelection = useCallback(
    (noteId: string) => {
      setSelectedNotes(prevSelected => {
        const newSelectedNotes = new Set(prevSelected);
        if (newSelectedNotes.has(noteId)) {
          newSelectedNotes.delete(noteId);
        } else {
          newSelectedNotes.add(noteId);
        }

        // isSelectionMode durumunu Set'in boyutuna bağlı olarak güncelle
        setTimeout(() => {
          setIsSelectionMode(newSelectedNotes.size > 0);
        }, 0);

        return newSelectedNotes; // Always return a new Set reference
      });
    },
    [] // empty dependency list because we are using setState functions
  );

  const handleSelectAll = () => {
    if (selectedNotes.size === filteredNotes.length) {
      // Deselect all selections
      setSelectedNotes(new Set());
      setIsSelectionMode(false);
    } else {
      // Select all
      setSelectedNotes(new Set(filteredNotes.map(note => note.id)));
    }
  };

  const handleShare = async () => {
    if (selectedNotes.size === 0) {
      Alert.alert(t('common.warning'), t('notes.selectNotesToShare'));
      return;
    }

    try {
      const selectedNotesList = filteredNotes.filter(note => selectedNotes.has(note.id));
      const shareText = selectedNotesList
        .map(note => `${note.title}\n\n${note.content}`)
        .join('\n\n---\n\n');

      await Share.share({
        message: shareText,
        title: 'Mindbook Notes',
      });
    } catch (error) {
      Alert.alert(t('common.error'), t('notes.shareError'));
    }
  };

  const handleFavorite = async () => {
    if (selectedNotes.size === 0) {
      Alert.alert(t('common.warning'), t('notes.selectNotesToFavorite'));
      return;
    }

    try {
      // Convert Set to Array for the batch operation
      const selectedNoteIds = Array.from(selectedNotes);

      // Use batch update
      const success = await batchToggleFavorite(selectedNoteIds);

      if (success) {
        // Refresh notes on success
        await loadNotes();
        // Clear selection
        setSelectedNotes(new Set());
        setIsSelectionMode(false);

        // Notify the user
        Alert.alert(t('common.success'), t('notes.favoriteUpdated'));
      } else {
        Alert.alert(t('common.error'), t('notes.favoriteUpdateError'));
      }
    } catch (error) {
      Alert.alert(t('common.error'), t('notes.favoriteUpdateError'));
    }
  };

  const handleArchive = async () => {
    if (selectedNotes.size === 0) {
      Alert.alert(t('common.warning'), t('notes.selectNotesToArchive'));
      return;
    }

    try {
      // Convert Set to Array for the batch operation
      const selectedNoteIds = Array.from(selectedNotes);

      // Use batch update
      const success = await batchToggleArchive(selectedNoteIds);

      if (success) {
        // Refresh notes on success
        await loadNotes();
        // Clear selection
        setSelectedNotes(new Set());
        setIsSelectionMode(false);

        // Notify the user
        Alert.alert(t('common.success'), t('notes.notesArchived', { count: selectedNotes.size }));
      } else {
        Alert.alert(t('common.error'), t('notes.archiveError'));
      }
    } catch (error) {
      Alert.alert(t('common.error'), t('notes.archiveError'));
    }
  };

  const handleTrash = async () => {
    if (selectedNotes.size === 0) {
      Alert.alert(t('common.warning'), t('notes.selectNotesToTrash'));
      return;
    }

    Alert.alert(t('common.warning'), t('notes.moveToTrashConfirmation'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: async () => {
          try {
            // Convert Set to Array for the batch operation
            const selectedNoteIds = Array.from(selectedNotes);

            // Use batch update
            const success = await batchMoveToTrash(selectedNoteIds);

            if (success) {
              // Refresh notes on success
              await loadNotes();
              // Clear selection
              setSelectedNotes(new Set());
              setIsSelectionMode(false);

              // Notify the user
              Alert.alert(
                t('common.success'),
                t('notes.notesMovedToTrash', { count: selectedNotes.size })
              );
            } else {
              Alert.alert(t('common.error'), t('notes.moveToTrashError'));
            }
          } catch (error) {
            Alert.alert(t('common.error'), t('notes.moveToTrashError'));
          }
        },
      },
    ]);
  };

  // Vault feature removed for free version

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await checkForUpdatesAndLoadNotes();
    setRefreshing(false);
    // Reset pagination state
    setPage(0);
    if (filteredNotes.length > 0) {
      setVisibleNotes(filteredNotes.slice(0, PAGE_SIZE));
      setHasMore(filteredNotes.length > PAGE_SIZE);
    }
  }, [checkForUpdatesAndLoadNotes, filteredNotes]);

  const renderEmptyState = () => {
    if (selectedCategory) {
      return (
        <EmptyState
          icon="folder-open"
          title={`${selectedCategory} ${t('notes.categoryNotFound')}`}
          message={t('notes.emptyCategoryMessage')}
        />
      );
    }
    return (
      <EmptyState
        icon="document-text"
        title={t('notes.notesNotFound')}
        message={t('notes.emptyNotesMessage')}
      />
    );
  };

  const renderActionBar = () => {
    if (!isSelectionMode) return null;

    // Let's calculate the variable first
    const topBorderColor =
      themeMode === 'dark' ? 'rgba(255,255,255,0.1)' : COLORS.TRANSPARENT_LIGHT;

    return (
      <View
        style={[
          styles.actionBar,
          {
            backgroundColor: theme.card,
            borderTopColor: topBorderColor,
          },
        ]}
      >
        <View style={styles.actionBarContainer}>
          {/* Sol taraf - Tik butonu */}
          <TouchableOpacity
            style={[
              styles.selectAllButton,
              {
                borderColor: themeColors[accentColor],
                backgroundColor: themeMode === 'dark' ? theme.card : COLORS.WHITE,
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

          {/* Orta - Boş alan */}
          <View style={styles.flex1} />

          {/* Sağ taraf - Butonlar */}
          <View style={styles.rowGap6}>
            <TouchableOpacity
              style={[
                styles.actionIconButton,
                {
                  borderColor: themeColors[accentColor],
                  backgroundColor: themeMode === 'dark' ? theme.card : COLORS.WHITE,
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
                  backgroundColor: themeMode === 'dark' ? theme.card : COLORS.WHITE,
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
                  backgroundColor: themeMode === 'dark' ? theme.card : COLORS.WHITE,
                },
              ]}
              onPress={handleFavorite}
            >
              <Ionicons name="star-outline" size={20} color={themeColors[accentColor]} />
            </TouchableOpacity>

            {/* Vault button removed for free version */}

            <TouchableOpacity
              style={[
                styles.actionIconButtonDanger,
                {
                  borderColor: COLORS.DANGER,
                  backgroundColor: themeMode === 'dark' ? theme.card : COLORS.WHITE,
                },
              ]}
              onPress={handleTrash}
            >
              <Ionicons name="trash-outline" size={20} color={COLORS.DANGER} />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  // Pre-calculated colors
  const WHITE_COLOR = '#FFFFFF';
  const textColor = isSelectionMode ? WHITE_COLOR : themeColors[accentColor];
  const badgeBackgroundColor = isSelectionMode
    ? themeColors[accentColor]
    : themeColors[accentColor] + '15';

  // Load more notes when user scrolls to the end
  const loadMoreNotes = () => {
    if (isLoadingMore || !hasMore) return;

    setIsLoadingMore(true);

    const nextPage = page + 1;
    const start = nextPage * PAGE_SIZE;
    const end = start + PAGE_SIZE;

    if (start < filteredNotes.length) {
      const newNotes = [...visibleNotes, ...filteredNotes.slice(start, end)];
      setVisibleNotes(newNotes);
      setPage(nextPage);
      setHasMore(end < filteredNotes.length);
    } else {
      setHasMore(false);
    }

    setIsLoadingMore(false);
  };

  // Render a note item
  const renderNoteItem = useCallback(
    ({ item }: { item: Note }) => (
      <View
        style={[
          viewMode === 'grid' ? styles.gridItemContainer : styles.listItemContainer,
          viewMode === 'compact' && styles.compactItemContainer,
        ]}
      >
        <NoteCard
          key={item.id}
          note={item}
          onRefresh={onRefresh}
          isSelectionMode={isSelectionMode}
          isSelected={selectedNotes.has(item.id)}
          onLongPress={() => {
            setIsSelectionMode(true);
            toggleNoteSelection(item.id);
          }}
          onPress={() => {
            if (isSelectionMode) {
              toggleNoteSelection(item.id);
            } else {
              router.push({
                pathname: '/(modal)/edit-note',
                params: { id: item.id },
              });
            }
          }}
          showReadingTime={viewMode === 'list'}
          showTags={viewMode === 'list'}
          showLastEditInfo={viewMode !== 'compact'}
          style={viewMode === 'grid' ? styles.gridNoteCard : styles.noteItemMargin}
          compact={viewMode === 'grid'}
          ultraCompact={viewMode === 'compact'}
        />
      </View>
    ),
    [isSelectionMode, selectedNotes, onRefresh, router, toggleNoteSelection, viewMode]
  );

  // Footer component to show loading indicator
  const renderFooter = () => {
    if (!isLoadingMore) return null;

    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="small" color={themeColors[accentColor]} />
      </View>
    );
  };

  // Create the FlashList content container style based on selection mode
  const flashListContentStyle = useMemo(() => {
    if (isSelectionMode) {
      return styles.flashListContentWithSelection;
    }
    return styles.flashListContent;
  }, [isSelectionMode]);

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {isSelectionMode && renderActionBar()}

      <View style={[styles.header, { backgroundColor: theme.card }]}>
        {selectedCategory ? (
          <View style={styles.categoryInfo}>
            <View style={styles.categoryTitleContainer}>
              <Text style={[styles.categoryName, { color: themeColors[accentColor] }]}>
                {selectedCategory}
              </Text>
              <Text style={[styles.categoryTitle, { color: theme.text }]}>
                {t('notes.category')}
              </Text>
            </View>
            <Text style={[styles.categoryCount, { color: theme.text }]}>
              {filteredNotes.length} {t('notes.notesCount')}
            </Text>
          </View>
        ) : (
          <View style={styles.headerLeft}>
            <View style={styles.titleContainer}>
              <Text style={[styles.titleText, { color: theme.text }]}>{t('notes.title')}</Text>
              {isSelectionMode && (
                <View style={[styles.notesCountBadge, { backgroundColor: badgeBackgroundColor }]}>
                  <Ionicons
                    name="checkmark-circle"
                    size={16}
                    color={WHITE_COLOR}
                    style={styles.notesCountIcon}
                  />
                  <Text style={[styles.notesCountText, { color: textColor }]}>
                    {`${selectedNotes.size} ${t('common.selected')}`}
                  </Text>
                </View>
              )}
            </View>

            <View style={styles.headerStats}>
              <Ionicons
                name="documents-outline"
                size={18}
                color={themeColors[accentColor]}
                style={styles.headerIcon}
              />
              <Text style={[styles.statsText, { color: theme.text }]}>
                {filteredNotes.length} {t('notes.notesCount')}
              </Text>

              {notes.filter(note => note.isFavorite).length > 0 && (
                <View style={styles.statsBadge}>
                  <Ionicons name="star" size={14} color={themeColors[accentColor]} />
                  <Text style={[styles.badgeText, { color: theme.text }]}>
                    {notes.filter(note => note.isFavorite).length}
                  </Text>
                </View>
              )}

              {notes.some(note => note.category) && (
                <View style={styles.statsBadge}>
                  <Ionicons name="folder" size={14} color={themeColors[accentColor]} />
                  <Text style={[styles.badgeText, { color: theme.text }]}>
                    {new Set(notes.filter(note => note.category).map(note => note.category)).size}
                  </Text>
                </View>
              )}
            </View>

            <Text style={[styles.lastSyncText, { color: theme.textSecondary }]}>
              {notes.length > 0
                ? t('notes.lastEdit') +
                  ': ' +
                  (() => {
                    try {
                      // Filter out any notes with invalid dates first
                      const validNotes = notes.filter(n => {
                        const dateStr = n.updatedAt || n.createdAt;
                        if (!dateStr) return false;
                        const date = new Date(dateStr);
                        return !isNaN(date.getTime());
                      });

                      if (validNotes.length === 0) return t('common.notAvailable');

                      // Find the most recent date
                      const latestTimestamp = Math.max(
                        ...validNotes.map(n => new Date(n.updatedAt || n.createdAt).getTime())
                      );

                      // Check if the result is valid
                      if (isNaN(latestTimestamp) || latestTimestamp === -Infinity) {
                        return t('common.notAvailable');
                      }

                      return new Date(latestTimestamp).toLocaleDateString();
                    } catch (error) {
                      console.error('Error formatting last edit date:', error);
                      return t('common.notAvailable');
                    }
                  })()
                : t('notes.emptyNotes')}
            </Text>
          </View>
        )}

        <View style={styles.headerActions}>
          <TouchableOpacity
            style={[styles.iconButton, { backgroundColor: themeColors[accentColor] + '10' }]}
            onPress={toggleViewMode}
          >
            <Ionicons
              name={
                viewMode === 'list'
                  ? 'grid-outline'
                  : viewMode === 'grid'
                  ? 'list-outline'
                  : 'albums-outline'
              }
              size={20}
              color={themeColors[accentColor]}
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.sortButton, { backgroundColor: themeColors[accentColor] + '10' }]}
            onPress={() => setShowSortMenu(!showSortMenu)}
          >
            <Ionicons name="layers-outline" size={20} color={themeColors[accentColor]} />
            <Text style={[styles.sortButtonText, { color: themeColors[accentColor] }]}>
              {t('common.sortBy')}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {selectedCategory && (
        <TouchableOpacity
          style={[styles.allNotesButton, { backgroundColor: themeColors[accentColor] }]}
          onPress={() => router.replace('/(tabs)/')}
        >
          <Ionicons name="albums-outline" size={18} color="#fff" />
          <Text style={styles.allNotesButtonText}>{t('notes.allNotes')}</Text>
        </TouchableOpacity>
      )}

      <View style={styles.listContainer}>
        <FlashList
          key={isGridView ? 'grid-view' : 'list-view'}
          data={visibleNotes}
          numColumns={isGridView ? 2 : 1}
          estimatedItemSize={isGridView ? 150 : 200}
          renderItem={renderNoteItem}
          keyExtractor={item => item.id}
          onEndReached={loadMoreNotes}
          onEndReachedThreshold={0.5}
          ListEmptyComponent={<View style={styles.emptyStateWrapper}>{renderEmptyState()}</View>}
          ListFooterComponent={renderFooter}
          showsVerticalScrollIndicator={true}
          refreshing={refreshing}
          onRefresh={onRefresh}
          contentContainerStyle={flashListContentStyle}
          extraData={[
            selectedNotes.size,
            isSelectionMode,
            Array.from(selectedNotes).join(','),
            isGridView,
          ]}
        />
      </View>
      {renderSortMenu()}
    </View>
  );
}

// Styles for the component
const styles = StyleSheet.create({
  actionBar: {
    borderTopColor: COLORS.TRANSPARENT_LIGHT,
    borderTopWidth: 1,
    bottom: 0,
    elevation: 4,
    left: 0,
    paddingVertical: 10,
    position: 'absolute',
    right: 0,
    shadowColor: COLORS.BLACK,
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    zIndex: 1001,
  },
  actionBarContainer: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    width: '100%',
  },
  actionButton: {
    alignItems: 'center',
    borderColor: COLORS.BORDER_COLOR,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    marginHorizontal: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  actionIconButton: {
    alignItems: 'center',
    backgroundColor: COLORS.WHITE,
    borderRadius: 8,
    borderWidth: 1,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  actionIconButtonDanger: {
    alignItems: 'center',
    backgroundColor: COLORS.WHITE,
    borderColor: COLORS.DANGER,
    borderRadius: 8,
    borderWidth: 1,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  actionText: {
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 6,
  },
  allNotesButton: {
    alignItems: 'center',
    borderRadius: 8,
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  allNotesButtonText: {
    color: COLORS.TEXT_WHITE,
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 6,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 4,
  },
  categoryCount: {
    fontSize: 14,
  },
  categoryInfo: {
    flex: 1,
  },
  categoryName: {
    fontSize: 16,
    fontWeight: '600',
  },
  categoryTitle: {
    fontSize: 16,
    fontWeight: '400',
  },
  categoryTitleContainer: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 4,
  },
  compactItemContainer: {
    paddingBottom: 1,
  },
  container: {
    flex: 1,
  },
  emptyStateWrapper: {
    alignItems: 'center',
    flex: 1,
    height: Dimensions.get('window').height * 0.6,
    justifyContent: 'center',
    paddingVertical: 40,
  },
  flashListContent: {
    paddingBottom: 16,
    paddingHorizontal: 4,
    paddingVertical: 4,
  },
  flashListContentWithSelection: {
    paddingBottom: 80,
    paddingHorizontal: 4,
    paddingVertical: 4,
  },
  flex1: {
    flex: 1,
  },
  gridItemContainer: {
    flex: 1,
    padding: 6,
  },
  gridNoteCard: {
    flex: 1,
    marginHorizontal: 0,
  },
  header: {
    alignItems: 'center',
    borderBottomColor: COLORS.TRANSPARENT_LIGHT,
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
  },
  headerActions: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
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
  iconButton: {
    alignItems: 'center',
    borderRadius: 18,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  lastSyncText: {
    fontSize: 12,
    marginTop: 4,
  },
  listContainer: {
    flex: 1,
  },
  listItemContainer: {
    flex: 1,
    paddingBottom: 2,
    paddingHorizontal: 0,
  },
  loaderContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
  },
  noteItemMargin: {
    marginBottom: 4,
    marginHorizontal: 2,
  },
  notesCountBadge: {
    alignItems: 'center',
    borderRadius: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  notesCountIcon: {
    marginRight: 4,
  },
  notesCountText: {
    fontSize: 16,
    fontWeight: '700',
  },
  rowGap6: {
    flexDirection: 'row',
    gap: 6,
  },
  selectAllButton: {
    alignItems: 'center',
    backgroundColor: COLORS.WHITE,
    borderRadius: 8,
    borderWidth: 1,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  sortButton: {
    alignItems: 'center',
    backgroundColor: COLORS.TRANSPARENT,
    borderRadius: 18,
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 8,
    shadowColor: COLORS.BLACK,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  sortButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  sortMenu: {
    borderRadius: 12,
    elevation: 5,
    minWidth: 180,
    padding: 8,
    position: 'absolute',
    right: 16,
    shadowColor: COLORS.BLACK,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    top: 60,
  },
  sortMenuOverlay: {
    backgroundColor: COLORS.TRANSPARENT_BLACK,
    bottom: 0,
    justifyContent: 'flex-start',
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
    zIndex: 1000,
  },
  sortOption: {
    alignItems: 'center',
    borderRadius: 8,
    flexDirection: 'row',
    padding: 12,
  },
  sortOptionText: {
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 12,
  },
  statsBadge: {
    alignItems: 'center',
    backgroundColor: COLORS.BADGE_BG,
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
  titleContainer: {
    alignItems: 'center',
    flexDirection: 'row',
    marginBottom: 8,
  },
  titleText: {
    fontSize: 22,
    fontWeight: '700',
    marginRight: 8,
  },
});
