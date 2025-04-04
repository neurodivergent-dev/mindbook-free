// This file Edit Note Modal component is responsible for editing notes in the app. It includes features like title and content editing, color and category selection, and markdown formatting. The component also handles saving, deleting, and moving notes to trash, as well as managing categories.
import { useState, useEffect, useRef, memo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  Platform,
  Image,
} from 'react-native';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import { useTheme } from '../context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import {
  getAllNotes,
  updateNote,
  getCategories,
  addCategory,
  deleteCategory,
  moveToTrash,
} from '../utils/storage';
import { decryptNotes, encryptNotes } from '../utils/encryption';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NOTE_COLORS, DARK_NOTE_COLORS } from '../utils/colors';
import Markdown from 'react-native-markdown-display';
import { useTranslation } from 'react-i18next';
import { triggerAutoBackup } from '../utils/backup';
import { showToast as androidShowToast, useBackButtonHandler } from '../utils/android';
import supabase from '../utils/supabase';
import CategoryInputModal from '../components/CategoryInputModal';

interface MarkdownToolbarProps {
  onInsert: (text: string) => void;
}

const MarkdownToolbar = memo(({ onInsert }: MarkdownToolbarProps) => {
  const { theme, themeColors, accentColor } = useTheme();
  const [isVisible, setIsVisible] = useState(false);
  const { t } = useTranslation();

  const tools = [
    { icon: 'text', label: 'H1', insert: '# ', description: t('notes.heading1') },
    { icon: 'text', label: 'H2', insert: '## ', description: t('notes.heading2') },
    { icon: 'text', label: 'H3', insert: '### ', description: t('notes.heading3') },
    { icon: 'document-text', label: 'B', insert: '**text**', description: t('notes.bold') },
    { icon: 'document-text', label: 'I', insert: '*text*', description: t('notes.italic') },
    { icon: 'list', label: '•', insert: '- ', description: t('notes.list') },
    { icon: 'list-circle', label: '1.', insert: '1. ', description: t('notes.numberedList') },
    { icon: 'link', label: 'URL', insert: '[text](url)', description: t('notes.link') },
    { icon: 'code-slash', label: '<>', insert: '`code`', description: t('notes.code') },
    { icon: 'document-text', label: '"', insert: '> ', description: t('notes.quote') },
    {
      icon: 'image',
      label: 'IMG',
      insert: '![explanation](image_url)',
      description: t('notes.image'),
    },
  ];

  return (
    <View style={[styles.toolbarContainer, { backgroundColor: theme.card }]}>
      <TouchableOpacity
        style={[styles.toolbarToggle, { backgroundColor: themeColors[accentColor] }]}
        onPress={() => setIsVisible(!isVisible)}
        activeOpacity={0.8}
      >
        <Ionicons
          name={isVisible ? 'chevron-up' : 'chevron-down'}
          size={20}
          color="#FFF"
          as
          string
        />
        <Text style={styles.toolbarToggleText}>{t('notes.markdownEditor')}</Text>
      </TouchableOpacity>

      {isVisible && (
        <View style={styles.toolbarContent}>
          {tools.map((tool, index) => (
            <TouchableOpacity
              key={index}
              style={[
                styles.toolButton,
                {
                  backgroundColor: theme.background,
                  borderColor: themeColors[accentColor] + '30',
                },
              ]}
              onPress={() => onInsert(tool.insert)}
              activeOpacity={0.7}
            >
              <Ionicons
                name={`${tool.icon}-outline` as any}
                size={18}
                color={themeColors[accentColor]}
              />
              <Text style={[styles.toolLabel, { color: themeColors[accentColor] }]}>
                {tool.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
});

export default function EditNoteModal() {
  const [note, setNote] = useState(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isReadingMode, setIsReadingMode] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [categories, setCategories] = useState([]);
  const [selectedColor, setSelectedColor] = useState('default');
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showColorOptions, setShowColorOptions] = useState(false);
  const contentRef = useRef(null);
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const {
    theme,
    themeMode,
    accentColor,
    themeColors,
    fontSize,
    fontSizes,
    fontFamily,
    fontFamilies,
  } = useTheme();
  const { t } = useTranslation();

  const colors = themeMode === 'dark' ? DARK_NOTE_COLORS : NOTE_COLORS;
  const EXTRA_COLORS =
    themeMode === 'dark'
      ? {
          purple: {
            id: 'purple',
            background: '#6b46c1',
            text: '#fff',
            nameKey: 'notes.purpleColor',
          },
          teal: { id: 'teal', background: '#319795', text: '#fff', nameKey: 'notes.tealColor' },
          pink: { id: 'pink', background: '#d53f8c', text: '#fff', nameKey: 'notes.pinkColor' },
          cyan: { id: 'cyan', background: '#00B5D8', text: '#fff', nameKey: 'notes.cyanColor' },
          indigo: {
            id: 'indigo',
            background: '#5a67d8',
            text: '#fff',
            nameKey: 'notes.indigoColor',
          },
          lime: { id: 'lime', background: '#86D11A', text: '#fff', nameKey: 'notes.limeColor' },
        }
      : {
          purple: {
            id: 'purple',
            background: '#9C6DD3',
            text: '#fff',
            nameKey: 'notes.purpleColor',
          },
          teal: { id: 'teal', background: '#4FD1C5', text: '#fff', nameKey: 'notes.tealColor' },
          pink: { id: 'pink', background: '#ED64A6', text: '#fff', nameKey: 'notes.pinkColor' },
          cyan: { id: 'cyan', background: '#76E4F7', text: '#000', nameKey: 'notes.cyanColor' },
          indigo: {
            id: 'indigo',
            background: '#7886D7',
            text: '#fff',
            nameKey: 'notes.indigoColor',
          },
          lime: { id: 'lime', background: '#B4F063', text: '#000', nameKey: 'notes.limeColor' },
        };

  const allColors = { ...colors, ...EXTRA_COLORS };

  useBackButtonHandler(() => {
    if (hasUnsavedChanges) {
      Alert.alert(t('common.warning'), t('notes.unsavedChanges'), [
        { text: t('common.cancel'), style: 'cancel', onPress: () => {} },
        {
          text: t('common.close'),
          style: 'destructive',
          onPress: () => router.back(),
        },
      ]);
      return true;
    }
    return false;
  });

  const loadCategories = async () => {
    const loadedCategories = await getCategories();
    setCategories(loadedCategories);
  };

  const loadNote = async () => {
    try {
      const notes = await getAllNotes();
      const foundNote = notes.find(n => n.id === id);

      if (foundNote) {
        // Ensure date values are properly formatted
        const sanitizedNote = {
          ...foundNote,
          createdAt: foundNote.createdAt
            ? new Date(foundNote.createdAt).toISOString()
            : new Date().toISOString(),
          updatedAt: foundNote.updatedAt
            ? new Date(foundNote.updatedAt).toISOString()
            : new Date().toISOString(),
          deletedAt: foundNote.deletedAt ? new Date(foundNote.deletedAt).toISOString() : null,
        };

        setNote(sanitizedNote);
        setTitle(sanitizedNote.title || '');
        setContent(sanitizedNote.content || '');
        setSelectedCategory(sanitizedNote.category || null);
        setSelectedColor(sanitizedNote.color || 'default');
        return;
      }

      const vaultNotesStr = await AsyncStorage.getItem('vault_notes');
      if (vaultNotesStr) {
        const decryptedNotes = await decryptNotes(vaultNotesStr);
        const foundVaultNote = decryptedNotes.find(n => n.id === id);

        if (foundVaultNote) {
          // Ensure date values are properly formatted for vault notes
          const sanitizedVaultNote = {
            ...foundVaultNote,
            createdAt: foundVaultNote.createdAt
              ? new Date(foundVaultNote.createdAt).toISOString()
              : new Date().toISOString(),
            updatedAt: foundVaultNote.updatedAt
              ? new Date(foundVaultNote.updatedAt).toISOString()
              : new Date().toISOString(),
            deletedAt: foundVaultNote.deletedAt
              ? new Date(foundVaultNote.deletedAt).toISOString()
              : null,
          };

          setNote(sanitizedVaultNote);
          setTitle(sanitizedVaultNote.title || '');
          setContent(sanitizedVaultNote.content || '');
          setSelectedCategory(sanitizedVaultNote.category || null);
          setSelectedColor(sanitizedVaultNote.color || 'default');
        }
      }
    } catch (error) {
      return null;
    }
  };

  useEffect(() => {
    loadNote();
    loadCategories();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleTitleChange = newTitle => {
    // Apply 40 character limit for title
    if (newTitle.length <= 40) {
      setTitle(newTitle);
      setHasUnsavedChanges(true);
    }
  };

  const handleContentChange = newContent => {
    // Native kontrolü direkt güncelle (silme işlemi için ek önlem)
    if (contentRef.current) {
      contentRef.current.setNativeProps({ text: newContent });
    }

    setContent(newContent);
    setHasUnsavedChanges(true);
  };

  const handleSave = async () => {
    try {
      // Title and content control
      if (!title.trim() || !content.trim()) {
        Alert.alert(t('common.warning'), t('notes.fillAllFields'));
        return;
      }

      const updatedNote = {
        ...note,
        title: title.trim(),
        content: content.trim(),
        category: selectedCategory,
        color: selectedColor,
        updatedAt: new Date().toISOString(),
      };

      if (note?.isVaulted) {
        // Update Vault note
        const vaultNotesStr = await AsyncStorage.getItem('vault_notes');
        if (vaultNotesStr) {
          const decryptedNotes = await decryptNotes(vaultNotesStr);
          const updatedNotes = decryptedNotes.map(n => (n.id === note.id ? updatedNote : n));
          const encryptedNotes = await encryptNotes(updatedNotes);
          await AsyncStorage.setItem('vault_notes', encryptedNotes);
        }
      } else {
        // Update normal grade
        await updateNote(id, updatedNote);
      }

      // Trigger automatic backup
      const { data: userData } = await supabase.auth.getUser();
      if (userData?.user) {
        triggerAutoBackup(userData.user);
      }

      setHasUnsavedChanges(false);
      androidShowToast(t('notes.noteSaved'));
    } catch (error) {
      Alert.alert(t('common.error'), t('notes.saveNoteError'));
    }
  };

  const handleDelete = () => {
    Alert.alert(t('common.warning'), t('notes.deleteNoteConfirmation'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: async () => {
          try {
            await moveToTrash(id);
            router.push('/(tabs)/');
          } catch (error) {
            Alert.alert(t('common.error'), t('notes.deleteNoteError'));
          }
        },
      },
    ]);
  };

  const showReadingModeToast = () => {
    if (Platform.OS === 'android') {
      androidShowToast(t('notes.readingModeEditing'));
    } else {
      Alert.alert(t('common.warning'), t('notes.readingModeEditing'));
    }
  };

  const handleReadingMode = () => {
    setIsReadingMode(!isReadingMode);
  };

  themeMode === 'dark' ? '#1a1a1a' : theme.card;

  const handleCategoryPress = category => {
    if (selectedCategory === category) {
      setSelectedCategory(null);
    } else {
      setSelectedCategory(category);
    }
  };

  const handleDeleteCategory = categoryToDelete => {
    Alert.alert(t('notes.deleteCategory'), t('notes.deleteCategoryConfirmation'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: async () => {
          try {
            if (selectedCategory === categoryToDelete) {
              setSelectedCategory(null);
            }
            await deleteCategory(categoryToDelete);
            loadCategories();
          } catch (error) {
            Alert.alert(t('common.error'), t('notes.deleteCategoryError'));
          }
        },
      },
    ]);
  };

  const CategoryPicker = () => {
    if (!theme) return null;

    return (
      <View style={styles.pickerContainer}>
        <TouchableOpacity
          style={[
            styles.pickerButton,
            {
              backgroundColor: theme.card,
              borderColor: showCategoryPicker ? themeColors[accentColor] : theme.border,
              borderWidth: (showCategoryPicker ? 2 : 1) as number,
            },
          ]}
          onPress={() => setShowCategoryPicker(!showCategoryPicker)}
        >
          <View style={styles.pickerButtonContent}>
            <View style={styles.pickerLeftContent}>
              <Ionicons
                name="pricetag-outline"
                size={20}
                color={showCategoryPicker ? themeColors[accentColor] : theme.text}
              />
              <Text style={[styles.pickerText, { color: theme.text }]}>
                {selectedCategory || t('notes.selectCategory')}
              </Text>
            </View>
            <Ionicons
              name={showCategoryPicker ? 'chevron-up' : 'chevron-down'}
              size={20}
              color={showCategoryPicker ? themeColors[accentColor] : theme.text}
            />
          </View>
        </TouchableOpacity>

        {showCategoryPicker && (
          <View style={[styles.dropdownContainer, { backgroundColor: theme.card }]}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.categoryScroll}
              contentContainerStyle={styles.categoryScrollContent}
            >
              {categories.map(category => (
                <TouchableOpacity
                  key={category}
                  style={[
                    styles.categoryChip,
                    {
                      backgroundColor:
                        selectedCategory === category ? themeColors[accentColor] : theme.card,
                      borderColor:
                        selectedCategory === category ? themeColors[accentColor] : theme.border,
                      elevation: 2 as number,
                      shadowColor: '#000' as string,
                      shadowOffset: { width: 0, height: 1 },
                      shadowOpacity: 0.2 as number,
                      shadowRadius: 1.41 as number,
                    },
                  ]}
                  onPress={() => {
                    handleCategoryPress(category);
                    setShowCategoryPicker(false);
                  }}
                  onLongPress={() => handleDeleteCategory(category)}
                >
                  <Text
                    style={[
                      styles.categoryTextWithMargin,
                      {
                        color: themeColors[accentColor],
                      },
                    ]}
                    numberOfLines={1}
                    ellipsizeMode="tail"
                  >
                    {category}
                  </Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity
                style={[
                  styles.categoryChip,
                  {
                    backgroundColor: theme.card,
                    borderColor: themeColors[accentColor],
                    elevation: 2 as number,
                    shadowColor: '#000' as string,
                    shadowOffset: { width: 0, height: 1 },
                    shadowOpacity: 0.2 as number,
                    shadowRadius: 1.41 as number,
                  },
                ]}
                onPress={() => setShowCategoryModal(true)}
              >
                <Ionicons name="add" size={14} color={themeColors[accentColor]} />
                <Text
                  style={[
                    styles.categoryText,
                    {
                      color: themeColors[accentColor],
                    },
                  ]}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  {t('common.create')}
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        )}
      </View>
    );
  };

  const handleAddNewCategory = async categoryText => {
    try {
      await addCategory(categoryText);
      await loadCategories();
      setSelectedCategory(categoryText);
      setShowCategoryModal(false);
    } catch (error) {
      if ((error as Error).message === 'Category name too long') {
        Alert.alert(t('common.error'), t('notes.categoryTooLong'));
      } else if ((error as Error).message === 'Category already exists') {
        Alert.alert(t('common.error'), t('notes.addCategoryError'));
      } else {
        Alert.alert(t('common.error'), t('notes.addCategoryError'));
      }
    }
  };

  const handleToolInsert = text => {
    if (contentRef.current) {
      const currentContent = content;
      const selection = contentRef.current._lastNativeSelection;

      if (!selection) {
        // If there is no selection, add it to the end
        setContent(currentContent + text);
        return;
      }

      const start = selection.start;
      const end = selection.end;

      // Get the text before and after the cursor
      const beforeCursor = currentContent.substring(0, start);
      const afterCursor = currentContent.substring(end);

      // Insert new text at cursor position
      const newContent = beforeCursor + text + afterCursor;
      setContent(newContent);

      // Move the cursor to the end of the inserted text
      const newCursorPosition = start + text.length;

      // Position the cursor immediately
      contentRef.current.setNativeProps({
        selection: {
          start: newCursorPosition,
          end: newCursorPosition,
        },
      });
    }
  };

  const colorHeaderStyle = {
    backgroundColor: 'transparent' as const,
    borderColor: theme.border,
    marginBottom: showColorOptions ? 12 : 0,
  };

  const colorCircleStyle = (colorId: string) => ({
    backgroundColor: colorId === 'transparent' ? theme.card : colorId,
    borderColor: selectedColor === colorId ? themeColors[accentColor] : 'transparent',
    borderWidth: selectedColor === colorId ? 2 : 0,
    shadowColor: theme.shadow,
  });

  const codeTextStyle = {
    color: themeMode === 'dark' ? '#c0caf5' : '#1a1b26',
    fontFamily: 'monospace',
  };

  const codeBlockStyle = {
    backgroundColor: themeMode === 'dark' ? '#1a1b26' : '#f7f7f7',
    borderWidth: 1,
    borderColor: themeMode === 'dark' ? '#292e42' : '#e1e1e1',
  };

  if (!note) {
    return null;
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Stack.Screen
        options={{
          headerShown: true,
          presentation: 'modal',
          title: t('notes.editNote'),
          headerStyle: {
            backgroundColor: themeColors[accentColor],
          },
          headerTintColor: '#fff' as string,
          headerTitleStyle: {
            fontWeight: '600',
            fontSize: 18,
            fontFamily: fontFamilies[fontFamily].family,
          },
          headerLeft: () => (
            <View
              onTouchStart={() => {
                if (hasUnsavedChanges) {
                  Alert.alert(t('common.warning'), t('notes.unsavedChanges'), [
                    { text: t('common.cancel'), style: 'cancel', onPress: () => {} },
                    {
                      text: t('common.close'),
                      style: 'destructive',
                      onPress: () => router.back(),
                    },
                  ]);
                } else {
                  router.back();
                }
              }}
              style={styles.headerIconContainer}
            >
              <Ionicons name="chevron-back" size={24} color="#fff" />
            </View>
          ),
          headerRight: () => (
            <View style={styles.headerRightContainer}>
              <View onTouchStart={handleReadingMode} style={styles.readingModeIconContainer}>
                <Ionicons
                  name={isReadingMode ? 'create-outline' : 'eye-outline'}
                  size={24}
                  color="#fff"
                />
              </View>

              <View onTouchStart={handleSave} style={styles.headerIconContainer}>
                <Ionicons name="save-outline" size={24} color="#fff" />
              </View>

              <View onTouchStart={handleDelete} style={styles.headerIconContainer}>
                <Ionicons name="trash-outline" size={24} color="#fff" />
              </View>
            </View>
          ),
        }}
      />

      <ScrollView
        style={styles.scrollView}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.contentContainer}>
          {/* Title Input */}
          <TextInput
            style={[
              styles.titleInput,
              {
                color: theme.text,
                backgroundColor: theme.card,
                fontSize: fontSizes[fontSize].titleSize,
                fontFamily: fontFamilies[fontFamily].family,
                borderColor: theme.border,
              },
            ]}
            placeholder={t('notes.noteTitle')}
            placeholderTextColor={theme.textSecondary}
            value={title}
            onChangeText={handleTitleChange}
            editable={!isReadingMode}
            onPressIn={() => isReadingMode && showReadingModeToast()}
            maxLength={40}
          />

          {/* Options Section */}
          {!isReadingMode && (
            <View style={styles.optionsSection}>
              {/* Color Picker */}
              <View style={styles.optionContainer}>
                <Text style={[styles.optionLabel, { color: theme.textSecondary }]}>
                  {t('notes.color')}
                </Text>

                {/* Renk seçici başlık - tıklanabilir */}
                <TouchableOpacity
                  style={[styles.colorHeader, colorHeaderStyle]}
                  onPress={() => setShowColorOptions(!showColorOptions)}
                >
                  <View style={styles.selectedColorPreviewContainer}>
                    <View
                      style={[
                        styles.selectedColorPreview,
                        {
                          backgroundColor: selectedColor
                            ? allColors[selectedColor]?.background === 'transparent'
                              ? theme.card
                              : allColors[selectedColor]?.background
                            : theme.card,
                        },
                      ]}
                    />
                    <Text style={[styles.colorName, { color: theme.text }]}>
                      {selectedColor
                        ? t(`colors.${selectedColor}`) || selectedColor
                        : t('common.default')}
                    </Text>
                  </View>
                  <Ionicons
                    name={showColorOptions ? 'chevron-up' : 'chevron-down'}
                    size={24}
                    color={theme.text}
                  />
                </TouchableOpacity>

                {/* Renk seçici içeriği - açılır kapanır */}
                {showColorOptions && (
                  <View style={[styles.colorSelector, { borderColor: theme.border }]}>
                    {Object.values(allColors).map(color => (
                      <TouchableOpacity
                        key={color.id}
                        style={[styles.colorCircle, colorCircleStyle(color.background)]}
                        onPress={async () => {
                          setSelectedColor(color.id);

                          // Update the color of the note object directly
                          if (note) {
                            const updatedNote = {
                              ...note,
                              color: color.id,
                              updatedAt: new Date().toISOString(),
                            };

                            setNote(updatedNote);

                            // Save note directly
                            try {
                              if (note?.isVaulted) {
                                // Update Vault note
                                const vaultNotesStr = await AsyncStorage.getItem('vault_notes');
                                if (vaultNotesStr) {
                                  const decryptedNotes = await decryptNotes(vaultNotesStr);
                                  const updatedNotes = decryptedNotes.map(n =>
                                    n.id === note.id ? updatedNote : n
                                  );
                                  const encryptedNotes = await encryptNotes(updatedNotes);
                                  await AsyncStorage.setItem('vault_notes', encryptedNotes);
                                }
                              } else {
                                // Update normal grade
                                await updateNote(note.id, updatedNote);
                              }
                              // Notify that changes have been saved
                              setHasUnsavedChanges(false);
                              androidShowToast(t('notes.noteSaved'));
                            } catch (error) {
                              // Notify the user in case of error
                              Alert.alert(t('common.error'), t('notes.saveNoteError'));
                              setHasUnsavedChanges(true);
                            }
                          }
                        }}
                      >
                        {selectedColor === color.id && (
                          <Ionicons name="checkmark" size={18} color="white" />
                        )}
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>

              {/* Category Picker */}
              <View style={styles.optionContainer}>
                <Text style={[styles.optionLabel, { color: theme.textSecondary }]}>
                  {t('notes.category')}
                </Text>
                <CategoryPicker />
              </View>
            </View>
          )}

          {/* Markdown Toolbar */}
          {!isReadingMode && <MarkdownToolbar onInsert={handleToolInsert} />}

          {/* Content Area */}
          {isReadingMode ? (
            <View style={[styles.readingContainer, { backgroundColor: theme.card }]}>
              <Markdown
                style={{
                  body: {
                    color: theme.text,
                    fontFamily: fontFamilies[fontFamily].family,
                    fontSize: fontSizes[fontSize].contentSize,
                  },
                  heading1: {
                    color: theme.text,
                    fontFamily: fontFamilies[fontFamily].family,
                    fontSize: fontSizes[fontSize].contentSize * 1.8,
                  },
                  heading2: {
                    color: theme.text,
                    fontFamily: fontFamilies[fontFamily].family,
                    fontSize: fontSizes[fontSize].contentSize * 1.5,
                  },
                  heading3: {
                    color: theme.text,
                    fontFamily: fontFamilies[fontFamily].family,
                    fontSize: fontSizes[fontSize].contentSize * 1.2,
                  },
                  paragraph: {
                    color: theme.text,
                    fontFamily: fontFamilies[fontFamily].family,
                    fontSize: fontSizes[fontSize].contentSize,
                    lineHeight: fontSizes[fontSize].contentSize * 1.5,
                  },
                  link: {
                    color: themeColors[accentColor],
                    fontSize: fontSizes[fontSize].contentSize,
                  },
                  blockquote: {
                    backgroundColor: theme.background,
                    borderColor: themeColors[accentColor],
                    fontSize: fontSizes[fontSize].contentSize,
                  },
                  code_inline: {
                    backgroundColor: themeMode === 'dark' ? '#1a1b26' : '#f7f7f7',
                    color: themeMode === 'dark' ? '#7dcfff' : '#0550ae',
                    fontFamily: 'monospace',
                    fontSize: fontSizes[fontSize].contentSize * 0.9,
                    padding: 4,
                    borderRadius: 4,
                  },
                  code_block: {
                    backgroundColor: themeMode === 'dark' ? '#1a1b26' : '#f7f7f7',
                    color: themeMode === 'dark' ? '#c0caf5' : '#1a1b26',
                    fontFamily: 'monospace',
                    fontSize: fontSizes[fontSize].contentSize * 0.9,
                    padding: 8,
                    borderRadius: 6,
                    marginVertical: 8,
                  },
                  fence: {
                    backgroundColor: themeMode === 'dark' ? '#1a1b26' : '#f7f7f7',
                    color: themeMode === 'dark' ? '#c0caf5' : '#1a1b26',
                    fontFamily: 'monospace',
                    fontSize: fontSizes[fontSize].contentSize * 0.9,
                    padding: 8,
                    borderRadius: 6,
                    marginVertical: 8,
                  },
                }}
                rules={{
                  image: (node, index) => {
                    const { src, alt } = node.attributes;
                    return (
                      <Image
                        key={`image-${index}-${src}`}
                        source={{ uri: src }}
                        style={{
                          width: '100%' as string,
                          height: 200 as number,
                          borderRadius: 8 as number,
                        }}
                        accessible={true}
                        accessibilityLabel={alt || t('common.image')}
                      />
                    );
                  },
                  code_block: (node, children, parent, styles) => {
                    return (
                      <View key={node.key} style={[styles.code_block, codeBlockStyle]}>
                        <Text style={codeTextStyle}>{node.content}</Text>
                      </View>
                    );
                  },
                  fence: (node, children, parent, styles) => {
                    return (
                      <View key={node.key} style={[styles.code_block, codeBlockStyle]}>
                        <Text style={codeTextStyle}>{node.content}</Text>
                      </View>
                    );
                  },
                }}
              >
                {content}
              </Markdown>
            </View>
          ) : (
            <TextInput
              ref={contentRef}
              style={[
                styles.contentInput,
                {
                  color: theme.text,
                  backgroundColor: theme.card,
                  fontSize: fontSizes[fontSize].contentSize,
                  fontFamily: fontFamilies[fontFamily].family,
                },
              ]}
              placeholder={t('notes.noteContent')}
              placeholderTextColor={theme.textSecondary}
              value={content}
              onChangeText={handleContentChange}
              onSelectionChange={event => {
                contentRef.current._lastNativeSelection = event.nativeEvent.selection;
              }}
              multiline
              textAlignVertical="top"
              editable={!isReadingMode}
              onPressIn={() => isReadingMode && showReadingModeToast()}
            />
          )}
        </View>
      </ScrollView>

      {/* Bottom Action Buttons */}
      <View
        style={[
          styles.buttonContainer,
          { backgroundColor: theme.background, borderTopColor: theme.border },
        ]}
      >
        <TouchableOpacity
          style={[
            styles.button,
            {
              backgroundColor: themeColors[accentColor],
              elevation: 3 as number,
              shadowColor: themeColors[accentColor],
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.25 as number,
              shadowRadius: 3.84 as number,
              flex: 1 as number,
            },
          ]}
          onPress={handleSave}
        >
          <Ionicons name="checkmark-circle-outline" size={24} color="white" />
          <Text
            style={[
              styles.buttonText,
              {
                fontSize: fontSizes[fontSize].contentSize,
                fontFamily: fontFamilies[fontFamily].family,
              },
            ]}
          >
            {t('common.save')}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.button,
            {
              backgroundColor: 'transparent' as string,
              borderWidth: 1.5 as number,
              borderColor: themeColors[accentColor],
              elevation: 0 as number,
              shadowOpacity: 0 as number,
              flex: 1 as number,
            },
          ]}
          onPress={handleReadingMode}
        >
          <Ionicons
            name={isReadingMode ? 'create-outline' : 'eye-outline'}
            size={24}
            color={themeColors[accentColor]}
          />
          <Text
            style={[
              styles.buttonText,
              {
                fontSize: fontSizes[fontSize].contentSize,
                fontFamily: fontFamilies[fontFamily].family,
                color: themeColors[accentColor],
              },
            ]}
          >
            {isReadingMode ? t('common.editMode') : t('common.readingMode')}
          </Text>
        </TouchableOpacity>
      </View>

      <CategoryInputModal
        visible={showCategoryModal}
        onClose={() => setShowCategoryModal(false)}
        onAdd={handleAddNewCategory}
        theme={theme}
        themeColors={themeColors}
        accentColor={accentColor}
      />
    </View>
  );
}

// Edit Note Styles
const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    borderRadius: 12,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    minWidth: 100,
    padding: 14,
  },
  buttonContainer: {
    alignItems: 'center',
    borderTopWidth: 1,
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  buttonText: {
    color: 'white' as string,
    fontWeight: '600',
  },
  categoryChip: {
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    height: 32,
    justifyContent: 'center',
    marginRight: 8,
    minWidth: 80,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  categoryScroll: {
    paddingVertical: 12,
  },
  categoryScrollContent: {
    paddingHorizontal: 12,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '600',
    maxWidth: 90,
    textAlign: 'center',
  },
  categoryTextWithMargin: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 2,
    maxWidth: 90,
    textAlign: 'center',
  },
  colorCircle: {
    alignItems: 'center',
    borderRadius: 18,
    height: 36,
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    width: 36,
  },
  colorHeader: {
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 0,
    paddingHorizontal: 8,
    paddingVertical: 12,
  },
  colorName: {
    fontSize: 14,
    fontWeight: '500',
  },
  colorSelector: {
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'flex-start',
    padding: 8,
  },
  container: {
    flex: 1,
  },
  contentContainer: {
    flex: 1,
    padding: 16,
  },
  contentInput: {
    borderRadius: 12,
    flex: 1,
    marginBottom: 16,
    marginTop: 16,
    minHeight: 200,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  dropdownContainer: {
    borderRadius: 12,
    elevation: 4,
    marginTop: 8,
    shadowColor: '#000' as string,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    zIndex: 5,
  },
  headerIconContainer: {
    marginRight: 10,
    padding: 10,
  },
  headerRightContainer: {
    flexDirection: 'row' as const,
    marginRight: 8,
  },
  optionContainer: {
    marginBottom: 16,
  },
  optionLabel: {
    fontSize: 14,
    fontWeight: '500',
    letterSpacing: 0.5,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  optionsSection: {
    marginTop: 16,
  },
  pickerButton: {
    borderRadius: 12,
    borderWidth: 1,
  },
  pickerButtonContent: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 12,
  },
  pickerContainer: {
    marginTop: 8,
    position: 'relative',
    zIndex: 5,
  },
  pickerLeftContent: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
  },
  pickerText: {
    fontSize: 15,
    fontWeight: '500',
  },
  readingContainer: {
    backgroundColor: 'transparent' as string,
    borderRadius: 12,
    marginBottom: 16,
    marginTop: 16,
    padding: 16,
  },
  readingModeIconContainer: {
    marginRight: 10,
    padding: 10,
  },
  scrollView: {
    flex: 1,
  },
  selectedColorPreview: {
    borderRadius: 12,
    height: 24,
    marginRight: 12,
    width: 24,
  },
  selectedColorPreviewContainer: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  titleInput: {
    borderRadius: 12,
    fontSize: 20,
    fontWeight: 'bold',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  toolButton: {
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 6,
    justifyContent: 'center',
    minWidth: 50,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  toolLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  toolbarContainer: {
    borderRadius: 12,
    elevation: 2,
    marginBottom: 16,
    shadowColor: '#000' as string,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
  },
  toolbarContent: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    padding: 12,
  },
  toolbarToggle: {
    alignItems: 'center',
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    flexDirection: 'row',
    gap: 8,
    padding: 12,
  },
  toolbarToggleText: {
    color: '#FFF' as string,
    fontSize: 15,
    fontWeight: '600',
  },
});
