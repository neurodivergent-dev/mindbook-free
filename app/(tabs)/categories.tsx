// This file is Categories Screen component, which displays a list of categories and allows users to manage them.
// It includes functionality to add, delete, and select categories, as well as view the number of notes in each category.
import { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import { useTheme } from '../context/ThemeContext';
import { getCategories, addCategory, deleteCategory, getAllNotes } from '../utils/storage';
import { useTranslation } from 'react-i18next';
import EmptyState from '../components/EmptyState';
import CategoryInputModal from '../components/CategoryInputModal';

// Color constants
const COLORS = {
  white: '#fff',
  danger: '#dc2626',
};

export default function CategoriesScreen() {
  const [categories, setCategories] = useState([]);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [categoryNotes, setCategoryNotes] = useState({});
  const [totalNotes, setTotalNotes] = useState(0);
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const router = useRouter();
  const { theme, themeMode, accentColor, themeColors } = useTheme();
  const { t } = useTranslation();

  useFocusEffect(
    useCallback(() => {
      loadCategories();
      loadNoteCounts();
    }, [])
  );

  const loadCategories = async () => {
    const loadedCategories = await getCategories();
    setCategories(loadedCategories);
  };

  const loadNoteCounts = async () => {
    const notes = await getAllNotes();
    const counts = {};

    const activeNotes = notes.filter(note => !note.isTrash && !note.isArchived);
    const total = activeNotes.length;

    activeNotes.forEach(note => {
      if (note.category) {
        counts[note.category] = (counts[note.category] || 0) + 1;
      }
    });

    setCategoryNotes(counts);
    setTotalNotes(total);
  };

  const handleAddCategory = async categoryName => {
    if (categoryName.trim()) {
      try {
        await addCategory(categoryName.trim());
        await loadCategories();
        setShowCategoryModal(false);
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

  const handleDeleteCategory = category => {
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
              }
              // Clear selected categories
              setSelectedCategories([]);
              setIsSelectionMode(false);
              // Refresh category list and note counts
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

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.header}>
        <View style={styles.titleContainer}>
          <Text style={[styles.title, { color: theme.text }]}>{t('notes.categories')}</Text>
        </View>

        {isSelectionMode ? (
          <View style={styles.selectionActions}>
            <TouchableOpacity
              style={[styles.selectionButton, { backgroundColor: COLORS.danger }]}
              onPress={handleDeleteSelected}
              disabled={selectedCategories.length === 0}
            >
              <Ionicons name="trash-outline" size={20} color={COLORS.white} />
              <Text style={styles.selectionButtonText}>
                {selectedCategories.length > 0
                  ? `${t('common.delete')} (${selectedCategories.length})`
                  : t('common.delete')}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.selectionButton,
                styles.cancelButton,
                { backgroundColor: theme.card, borderColor: theme.border },
              ]}
              onPress={exitSelectionMode}
            >
              <Ionicons name="close" size={20} color={theme.text} />
              <Text style={[styles.selectionButtonText, { color: theme.text }]}>
                {t('common.cancel')}
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            style={[styles.addButton, { backgroundColor: themeColors[accentColor] }]}
            onPress={() => setShowCategoryModal(true)}
          >
            <Ionicons name="add" size={24} color={COLORS.white} />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView style={styles.categoriesList}>
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

        {categories.length > 0 ? (
          categories.map(category => (
            <TouchableOpacity
              key={category}
              style={[
                styles.categoryItem,
                {
                  backgroundColor: inputBackground,
                  borderColor: theme.border,
                  ...(isSelectionMode &&
                    selectedCategories.includes(category) && {
                      borderColor: themeColors[accentColor],
                      borderWidth: 2,
                    }),
                },
              ]}
              onPress={() => handleSelectCategory(category)}
              onLongPress={() => handleLongPressCategory(category)}
            >
              <View style={styles.categoryInfo}>
                {isSelectionMode && (
                  <View style={styles.checkboxContainer}>
                    <Ionicons
                      name={selectedCategories.includes(category) ? 'checkbox' : 'square-outline'}
                      size={24}
                      color={themeColors[accentColor]}
                    />
                  </View>
                )}
                <Ionicons name="folder-outline" size={24} color={themeColors[accentColor]} />
                <Text style={[styles.categoryName, { color: theme.text }]}>{category}</Text>
                <View
                  style={[styles.noteCount, { backgroundColor: themeColors[accentColor] + '20' }]}
                >
                  <Text style={[styles.noteCountText, { color: themeColors[accentColor] }]}>
                    {categoryNotes[category] || 0} {t('notes.notesCount')}
                  </Text>
                </View>
              </View>
              {!isSelectionMode && (
                <TouchableOpacity
                  onPress={() => handleDeleteCategory(category)}
                  style={styles.deleteButton}
                >
                  <Ionicons name="trash-outline" size={24} color={COLORS.danger} />
                </TouchableOpacity>
              )}
            </TouchableOpacity>
          ))
        ) : (
          <View style={styles.emptyStateContainer}>
            <EmptyState
              icon="folder"
              title={t('notes.emptyCategories')}
              message={t('notes.emptyCategoryMessage')}
              action={{
                label: t('notes.createCategory'),
                onPress: () => setShowCategoryModal(true),
              }}
            />
          </View>
        )}
      </ScrollView>

      <CategoryInputModal
        visible={showCategoryModal}
        onClose={() => setShowCategoryModal(false)}
        onAdd={handleAddCategory}
        theme={theme}
        themeColors={themeColors}
        accentColor={accentColor}
      />
    </View>
  );
}

// Styles for the component
const styles = StyleSheet.create({
  addButton: {
    borderRadius: 8,
    padding: 8,
  },
  cancelButton: {
    borderWidth: 1,
  },
  categoriesList: {
    flex: 1,
  },
  categoryInfo: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
  },
  categoryItem: {
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
    padding: 16,
  },
  categoryName: {
    fontSize: 16,
    fontWeight: '500',
  },
  checkboxContainer: {
    marginRight: 4,
  },
  container: {
    flex: 1,
    padding: 16,
  },
  deleteButton: {
    padding: 4,
  },
  emptyStateContainer: {
    flex: 1,
    marginTop: 40,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
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
  selectionActions: {
    flexDirection: 'row',
    gap: 8,
  },
  selectionButton: {
    alignItems: 'center',
    borderRadius: 8,
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  selectionButtonText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '500',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  titleContainer: {
    alignItems: 'flex-end',
    flexDirection: 'row',
  },
});
