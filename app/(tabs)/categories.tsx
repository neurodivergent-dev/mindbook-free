// This file is Categories Screen component, which displays a list of categories and allows users to manage them.
// It includes functionality to add, delete, and select categories, as well as view the number of notes in each category.
import { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import { useTheme } from '../context/ThemeContext';
import {
  getCategories,
  addCategory,
  updateCategory,
  deleteCategory,
  getAllNotes,
  getNotesByCategory,
  buildNoteIndices,
} from '../utils/storage';
import { useTranslation } from 'react-i18next';
import EmptyState from '../components/EmptyState';
import {
  emitCategoryAdded,
  emitCategoryDeleted,
  emitCategoryUpdated,
} from '../utils/categoryEvents';

// Color constants
const COLORS = {
  black: '#000',
  white: '#fff',
  danger: '#dc2626',
  borderBottom: 'rgba(0,0,0,0.1)',
  statsBadgeBg: 'rgba(0,0,0,0.05)',
};

export default function CategoriesScreen() {
  const [categories, setCategories] = useState<string[]>([]);
  const [categoryNotes, setCategoryNotes] = useState<Record<string, number>>({});
  const [totalNotes, setTotalNotes] = useState(0);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();
  const { theme, themeMode, accentColor, themeColors } = useTheme();
  const { t } = useTranslation();

  const loadCategories = useCallback(async () => {
    const loadedCategories = await getCategories();
    setCategories(loadedCategories);

    // Rebuild indices to ensure getNotesByCategory works correctly
    await buildNoteIndices();
  }, []);

  const loadNoteCounts = useCallback(async () => {
    try {
      // Get all active notes count
      const notes = await getAllNotes();
      const activeNotes = notes.filter(note => !note.isTrash && !note.isArchived);
      const total = activeNotes.length;
      setTotalNotes(total);

      // Get loaded categories
      const loadedCategories = await getCategories();

      // Create a counts object
      const counts = {};

      // For each category, use indexed function to get notes
      for (const category of loadedCategories) {
        const categoryNotes = await getNotesByCategory(category);
        // Only count active notes (not trash or archived)
        const activeCategoryNotes = categoryNotes.filter(note => !note.isTrash && !note.isArchived);
        counts[category] = activeCategoryNotes.length;
      }

      setCategoryNotes(counts);
    } catch (error) {
      console.error('Error loading note counts:', error);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      // Load categories and note counts when the screen is focused
      loadCategories();
      loadNoteCounts();
    }, [loadCategories, loadNoteCounts])
  );

  const handleAddCategory = async categoryName => {
    if (categoryName.trim()) {
      try {
        await addCategory(categoryName.trim());

        // Update UI immediately
        await loadCategories();
        await loadNoteCounts();

        // Emit event for other screens to update
        emitCategoryAdded(categoryName.trim());
      } catch (error: unknown) {
        if (error instanceof Error && error.message === 'Category name too long') {
          Alert.alert(t('common.error'), t('notes.categoryTooLong'));
        } else if (error instanceof Error && error.message === 'Category already exists') {
          Alert.alert(t('common.error'), t('notes.addCategoryError'));
        } else {
          Alert.alert(t('common.error'), t('notes.addCategoryError'));
        }
      }
    }
  };

  const handleEditCategory = async (oldName: string, newName: string) => {
    if (newName.trim()) {
      try {
        await updateCategory(oldName, newName.trim());

        // Update UI immediately
        await loadCategories();
        await loadNoteCounts();

        // Emit event for other screens to update
        emitCategoryUpdated(oldName, newName.trim());
      } catch (error: unknown) {
        if (error instanceof Error && error.message === 'Category name too long') {
          Alert.alert(t('common.error'), t('notes.categoryTooLong'));
        } else if (error instanceof Error && error.message === 'Category already exists') {
          Alert.alert(t('common.error'), t('notes.addCategoryError'));
        } else if (error instanceof Error && error.message === 'Category name cannot be empty') {
          Alert.alert(t('common.error'), t('notes.emptyCategoryError'));
        } else {
          Alert.alert(t('common.error'), t('notes.editCategoryError'));
        }
      }
    }
  };

  const openEditPage = (category: string) => {
    router.push({
      pathname: '/(modal)/category-input',
      params: { mode: 'edit', editingCategory: category },
    });
  };

  const openAddPage = () => {
    router.push({
      pathname: '/(modal)/category-input',
      params: { mode: 'add' },
    });
  };

  const handleDeleteCategory = async category => {
    const noteCount = categoryNotes[category] || 0;
    const noteText =
      noteCount === 1 ? `1 ${t('notes.notesCount')}` : `${noteCount} ${t('notes.notesCount')}`;

    Alert.alert(
      t('notes.deleteCategory'),
      t('notes.deleteCategoryConfirmation') + `\n\n${noteText}, ${t('notes.willBeRemoved')}`,
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteCategory(category);

              // Update UI immediately
              await loadCategories();
              await loadNoteCounts();

              // Emit event for other screens to update
              emitCategoryDeleted(category);
            } catch (error) {
              Alert.alert(t('common.error'), t('notes.deleteCategoryError'));
            }
          },
        },
      ]
    );
  };

  const handleSelectCategory = category => {
    if (isSelectionMode) {
      if (selectedCategories.includes(category)) {
        setSelectedCategories(selectedCategories.filter(c => c !== category));
      } else {
        setSelectedCategories([...selectedCategories, category]);
      }
    } else {
      handleCategoryPress(category);
    }
  };

  const handleDeleteSelected = () => {
    if (selectedCategories.length === 0) return;

    const totalNotesInSelected = selectedCategories.reduce(
      (total, category) => total + (categoryNotes[category] || 0),
      0
    );

    const noteText =
      totalNotesInSelected === 1
        ? `1 ${t('notes.notesCount')}`
        : `${totalNotesInSelected} ${t('notes.notesCount')}`;

    Alert.alert(
      t('notes.deleteCategories'),
      `${t('notes.deleteCategoriesConfirmation', {
        count: selectedCategories.length,
      })}\n\n${noteText}, ${t('notes.willBeRemoved')}`,
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              // Delete each category in order
              for (const category of selectedCategories) {
                await deleteCategory(category);
                // Emit event for each deleted category
                emitCategoryDeleted(category);
              }

              // Update UI immediately
              setSelectedCategories([]);
              setIsSelectionMode(false);
              await loadCategories();
              await loadNoteCounts();
            } catch (error) {
              Alert.alert(t('common.error'), t('notes.deleteCategoryError'));
            }
          },
        },
      ]
    );
  };

  const handleLongPressCategory = category => {
    if (!isSelectionMode) {
      setIsSelectionMode(true);
      setSelectedCategories([category]);
    }
  };

  const exitSelectionMode = () => {
    setIsSelectionMode(false);
    setSelectedCategories([]);
  };

  const handleCategoryPress = category => {
    router.push({
      pathname: '/(tabs)/',
      params: { selectedCategory: category },
    });
  };

  const inputBackground = themeMode === 'dark' ? '#1a1a1a' : theme.card;

  // Prepare data for FlashList
  const listData =
    categories.length > 0
      ? [
          {
            id: 'all-notes',
            type: 'all-notes',
            category: null,
            count: totalNotes,
          },
          ...categories.map(category => ({
            id: category,
            type: 'category',
            category,
            count: categoryNotes[category] || 0,
          })),
        ]
      : [];

  const renderCategoryItem = ({ item }) => {
    if (item.type === 'all-notes') {
      return (
        <TouchableOpacity
          style={[
            styles.categoryItem,
            {
              backgroundColor: inputBackground,
              borderColor: theme.border,
            },
          ]}
          onPress={() => router.push('/(tabs)/')}
        >
          <View style={styles.categoryInfo}>
            <Ionicons name="albums-outline" size={24} color={themeColors[accentColor]} />
            <Text style={[styles.categoryName, { color: theme.text }]}>{t('notes.allNotes')}</Text>
            <View style={[styles.noteCount, { backgroundColor: themeColors[accentColor] + '20' }]}>
              <Text style={[styles.noteCountText, { color: themeColors[accentColor] }]}>
                {totalNotes} {t('notes.notesCount')}
              </Text>
            </View>
          </View>
        </TouchableOpacity>
      );
    }

    return (
      <TouchableOpacity
        style={[
          styles.categoryItem,
          {
            backgroundColor: inputBackground,
            borderColor: theme.border,
            ...(isSelectionMode &&
              selectedCategories.includes(item.category) && {
                borderColor: themeColors[accentColor],
                borderWidth: 2,
              }),
          },
        ]}
        onPress={() => handleSelectCategory(item.category)}
        onLongPress={() => handleLongPressCategory(item.category)}
      >
        <View style={styles.categoryInfo}>
          {isSelectionMode && (
            <View style={styles.checkboxContainer}>
              <Ionicons
                name={selectedCategories.includes(item.category) ? 'checkbox' : 'square-outline'}
                size={24}
                color={themeColors[accentColor]}
              />
            </View>
          )}
          <Ionicons name="folder-outline" size={24} color={themeColors[accentColor]} />
          <Text style={[styles.categoryName, { color: theme.text }]}>{item.category}</Text>
          <View style={[styles.noteCount, { backgroundColor: themeColors[accentColor] + '20' }]}>
            <Text style={[styles.noteCountText, { color: themeColors[accentColor] }]}>
              {item.count} {t('notes.notesCount')}
            </Text>
          </View>
        </View>
        {!isSelectionMode && (
          <View style={styles.categoryActions}>
            <TouchableOpacity onPress={() => openEditPage(item.category)} style={styles.editButton}>
              <Ionicons name="pencil-outline" size={20} color={themeColors[accentColor]} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => handleDeleteCategory(item.category)}
              style={styles.deleteButton}
            >
              <Ionicons name="trash-outline" size={20} color={COLORS.danger} />
            </TouchableOpacity>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { backgroundColor: theme.card }]}>
        <View style={styles.headerLeft}>
          <View style={styles.titleContainer}>
            <Text style={[styles.title, { color: theme.text }]}>{t('notes.categories')}</Text>
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
                  {`${selectedCategories.length} ${t('common.selected')}`}
                </Text>
              </View>
            )}
          </View>

          <View style={styles.headerStats}>
            <Ionicons
              name="folder-outline"
              size={18}
              color={themeColors[accentColor]}
              style={styles.headerIcon}
            />
            <Text style={[styles.statsText, { color: theme.text }]}>
              {categories.length}{' '}
              {categories.length === 1 ? t('notes.category') : t('notes.categories')}
            </Text>

            {totalNotes > 0 && (
              <View style={styles.statsBadge}>
                <Ionicons name="document-text-outline" size={14} color={themeColors[accentColor]} />
                <Text style={[styles.badgeText, { color: theme.text }]}>{totalNotes}</Text>
              </View>
            )}

            {Object.values(categoryNotes).filter(
              (count): count is number => typeof count === 'number' && count > 0
            ).length > 0 && (
              <View style={styles.statsBadge}>
                <Ionicons name="documents-outline" size={14} color={themeColors[accentColor]} />
                <Text style={[styles.badgeText, { color: theme.text }]}>
                  {
                    Object.values(categoryNotes).filter(
                      (count): count is number => typeof count === 'number' && count > 0
                    ).length
                  }{' '}
                  {t('common.active')}
                </Text>
              </View>
            )}
          </View>

          <Text style={[styles.lastUpdateText, { color: theme.textSecondary }]}>
            {categories.length > 0
              ? `${t('notes.lastUpdate')}: ${new Date().toLocaleDateString()}`
              : t('notes.emptyCategories')}
          </Text>
        </View>

        {isSelectionMode ? (
          <View style={styles.selectionActions}>
            <TouchableOpacity
              style={[styles.selectionButton, { backgroundColor: COLORS.danger }]}
              onPress={handleDeleteSelected}
              disabled={selectedCategories.length === 0}
            >
              <Ionicons name="trash-outline" size={18} color={COLORS.white} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.selectionButton,
                styles.cancelButton,
                { backgroundColor: theme.card, borderColor: theme.border },
              ]}
              onPress={exitSelectionMode}
            >
              <Ionicons name="close" size={18} color={theme.text} />
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            style={[styles.addButton, { backgroundColor: themeColors[accentColor] }]}
            onPress={openAddPage}
          >
            <Ionicons name="add" size={20} color={COLORS.white} />
          </TouchableOpacity>
        )}
      </View>

      <FlashList
        data={listData}
        estimatedItemSize={100}
        renderItem={renderCategoryItem}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.scrollContent}
        ListEmptyComponent={
          <EmptyState
            icon="folder"
            title={t('notes.emptyCategories')}
            message={t('notes.emptyCategoryMessage')}
            heightMultiplier={0.6}
            action={{
              label: t('notes.createCategory'),
              onPress: openAddPage,
            }}
          />
        }
        refreshing={refreshing}
        onRefresh={async () => {
          setRefreshing(true);
          await loadCategories();
          await loadNoteCounts();
          setRefreshing(false);
        }}
        extraData={[
          selectedCategories.length,
          isSelectionMode,
          selectedCategories.join(','),
          categoryNotes,
        ]}
      />
    </View>
  );
}

// Styles for the component
const styles = StyleSheet.create({
  addButton: {
    alignItems: 'center',
    borderRadius: 8,
    height: 36,
    justifyContent: 'center',
    padding: 8,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    width: 36,
  },
  badgeIcon: {
    marginRight: 4,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 4,
  },
  cancelButton: {
    borderWidth: 1,
  },
  categoriesList: {
    flex: 1,
    paddingHorizontal: 24,
  },
  categoryActions: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  categoryInfo: {
    alignItems: 'center',
    flexDirection: 'row',
    flex: 1,
    gap: 12,
  },
  categoryItem: {
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
    marginHorizontal: 8,
    minHeight: 72,
    paddingHorizontal: 18,
    paddingVertical: 20,
  },
  categoryName: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
  },
  checkboxContainer: {
    marginRight: 4,
  },
  container: {
    flex: 1,
  },
  deleteButton: {
    padding: 8,
  },
  editButton: {
    padding: 8,
  },
  emptyStateContainer: {
    flex: 1,
    marginTop: 40,
  },
  header: {
    alignItems: 'center',
    borderBottomColor: COLORS.borderBottom,
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
  noteCount: {
    borderRadius: 12,
    marginLeft: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  noteCountText: {
    fontSize: 12,
    fontWeight: '500',
  },
  scrollContent: {
    paddingBottom: 100,
    paddingVertical: 16,
  },
  selectionActions: {
    flexDirection: 'row',
    gap: 8,
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
  selectionButton: {
    alignItems: 'center',
    borderRadius: 8,
    height: 40,
    justifyContent: 'center',
    width: 40,
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
