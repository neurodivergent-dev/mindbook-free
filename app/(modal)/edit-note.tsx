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
  Keyboard,
  KeyboardAvoidingView,
  StatusBar,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NOTE_COLORS, DARK_NOTE_COLORS } from '../utils/colors';
import Markdown from 'react-native-markdown-display';
import { useTranslation } from 'react-i18next';
import { showToast as androidShowToast, useBackButtonHandler } from '../utils/android';
import { BLACK } from '../../utils/colors';
import { categoryEvents, CATEGORY_EVENTS } from '../utils/categoryEvents';
import { getEditModeSetting } from '../utils/editModeSettings';
import ImageUploader from '../components/ImageUploader';
import FullScreenReader from '../components/FullScreenReader';
import * as Clipboard from 'expo-clipboard';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

interface MarkdownToolbarProps {
  onInsert: (text: string) => void;
}

// This toolbar UI is aligned with app/(tabs)/new-note.tsx for professional consistency.
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

  // Centralized toolbar styles for professional consistency
  const toolbarStyles = {
    container: [
      styles.toolbarContainer,
      {
        backgroundColor: theme.card,
        borderColor: theme.border,
        borderWidth: 1,
        overflow: 'hidden',
      },
    ],
    toggle: [styles.toolbarToggle, { backgroundColor: themeColors[accentColor] }],
    button: () => [
      styles.toolButton,
      {
        backgroundColor: theme.background,
        borderColor: themeColors[accentColor] + '30',
      },
    ],
    label: [styles.toolLabel, { color: themeColors[accentColor] }],
  };

  return (
    <View style={toolbarStyles.container}>
      <TouchableOpacity
        style={toolbarStyles.toggle}
        onPress={() => setIsVisible(!isVisible)}
        activeOpacity={0.8}
      >
        <Ionicons name={isVisible ? 'chevron-up' : 'chevron-down'} size={20} color="#FFF" />
        <Text style={styles.toolbarToggleText}>{t('notes.markdownEditor')}</Text>
      </TouchableOpacity>

      {isVisible && (
        <View style={styles.toolbarContent}>
          {tools.map((tool, index) => (
            <TouchableOpacity
              key={index}
              style={toolbarStyles.button()}
              onPress={() => onInsert(tool.insert)}
              activeOpacity={0.7}
            >
              <Ionicons
                name={(tool.icon + '-outline') as any}
                size={18}
                color={themeColors[accentColor]}
              />
              <Text style={toolbarStyles.label}>{tool.label}</Text>
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
  const [showColorOptions, setShowColorOptions] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [coverImage, setCoverImage] = useState('');
  const [showFullScreen, setShowFullScreen] = useState(false);
  const [showHeaderMenu, setShowHeaderMenu] = useState(false);
  const contentRef = useRef(null);
  const { id: paramId } = useLocalSearchParams();
  const id = typeof paramId === 'string' ? paramId : Array.isArray(paramId) ? paramId[0] : '';
  const router = useRouter();
  const insets = useSafeAreaInsets();
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
        setCoverImage((sanitizedNote as any).coverImage || '');
        return;
      }

      // Vault feature removed for free version
    } catch (error) {
      return null;
    }
  };

  useEffect(() => {
    const initializeNote = async () => {
      await loadNote();
      await loadCategories();

      // Set initial reading mode based on user preference
      const defaultMode = await getEditModeSetting();
      setIsReadingMode(defaultMode === 'reading');
    };

    initializeNote();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    // Listen for category changes
    const handleCategoriesChanged = () => {
      loadCategories();
    };

    const handleCategoryUpdated = ({ oldName, newName }) => {
      // Update selected category if it was renamed
      if (selectedCategory === oldName) {
        setSelectedCategory(newName);
      }
      loadCategories();
    };

    const handleCategoryDeleted = deletedCategory => {
      // Clear selected category if it was deleted
      if (selectedCategory === deletedCategory) {
        setSelectedCategory(null);
      }
      loadCategories();
    };

    categoryEvents.on(CATEGORY_EVENTS.CATEGORIES_CHANGED, handleCategoriesChanged);
    categoryEvents.on(CATEGORY_EVENTS.CATEGORY_UPDATED, handleCategoryUpdated);
    categoryEvents.on(CATEGORY_EVENTS.CATEGORY_DELETED, handleCategoryDeleted);

    return () => {
      categoryEvents.off(CATEGORY_EVENTS.CATEGORIES_CHANGED, handleCategoriesChanged);
      categoryEvents.off(CATEGORY_EVENTS.CATEGORY_UPDATED, handleCategoryUpdated);
      categoryEvents.off(CATEGORY_EVENTS.CATEGORY_DELETED, handleCategoryDeleted);
    };
  }, [selectedCategory]);

  // Component unmount olduğunda status bar'ı geri yükle
  useEffect(() => {
    return () => {
      if (isFocusMode && Platform.OS === 'android') {
        StatusBar.setBackgroundColor(themeColors[accentColor], true);
        StatusBar.setBarStyle('light-content', true);
      }
    };
  }, [isFocusMode, themeColors, accentColor]);

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
        coverImage: coverImage || undefined,
        updatedAt: new Date().toISOString(),
      };

      // Vault feature removed for free version
      await updateNote(id, updatedNote);

      // Backup removed for free version

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
    // Direkt tam ekran reader'ı aç
    setShowFullScreen(true);
  };

  const copyContent = async () => {
    const fullText = `${title}\n\n${content}`;
    await Clipboard.setStringAsync(fullText);
    androidShowToast(t('common.copied'));
  };

  const exportToPdf = async () => {
    try {
      const htmlContent = `
        <html>
          <head>
            <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no" />
            <style>
              body { font-family: 'Helvetica', sans-serif; padding: 40px; color: #333; }
              h1 { border-bottom: 2px solid #eee; padding-bottom: 10px; margin-bottom: 20px; }
              .meta { color: #666; font-size: 12px; margin-bottom: 30px; }
              .content { white-space: pre-wrap; line-height: 1.6; font-size: 14px; }
            </style>
          </head>
          <body>
            <h1>${title || 'Untitled Note'}</h1>
            <div class="meta">
              <strong>Date:</strong> ${new Date().toLocaleDateString()}<br/>
              ${selectedCategory ? `<strong>Category:</strong> ${selectedCategory}` : ''}
            </div>
            <div class="content">${content}</div>
          </body>
        </html>
      `;

      const { uri } = await Print.printToFileAsync({ html: htmlContent });
      await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });
    } catch (error) {
      Alert.alert(t('common.error'), 'Failed to export PDF');
    }
  };

  themeMode === 'dark' ? '#1a1a1a' : theme.card;

  const handleCategoryPress = category => {
    if (selectedCategory === category) {
      setSelectedCategory(null);
    } else {
      setSelectedCategory(category);
    }
    setHasUnsavedChanges(true);
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
            // Backup removed for free version
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
                size={22}
                color={showCategoryPicker ? themeColors[accentColor] : theme.text}
              />
              <Text style={[styles.pickerText, { color: theme.text }]}>
                {selectedCategory || t('notes.selectCategory')}
              </Text>
            </View>
            <Ionicons
              name={showCategoryPicker ? 'chevron-up' : 'chevron-down'}
              size={22}
              color={showCategoryPicker ? themeColors[accentColor] : theme.text}
            />
          </View>
        </TouchableOpacity>

        {showCategoryPicker && (
          <View style={[styles.dropdownContainer, { backgroundColor: theme.card }]}>
            <ScrollView
              showsVerticalScrollIndicator={false}
              style={styles.categoryScroll}
              contentContainerStyle={styles.categoryScrollContent}
              nestedScrollEnabled={true}
            >
              {categories.map(category => {
                const isSelected = selectedCategory === category;
                const chipBg = isSelected ? themeColors[accentColor] : theme.card;
                const chipBorder = isSelected ? themeColors[accentColor] : theme.border;
                const textColor = isSelected ? '#fff' : themeColors[accentColor];
                return (
                  <TouchableOpacity
                    key={category}
                    style={[
                      isSelected ? styles.categoryChipSelected : styles.categoryChipUnselected,
                      { backgroundColor: chipBg, borderColor: chipBorder },
                    ]}
                    onPress={() => {
                      handleCategoryPress(category);
                      setShowCategoryPicker(false);
                    }}
                    onLongPress={() => handleDeleteCategory(category)}
                  >
                    <Text
                      style={[
                        isSelected ? styles.categoryTextSelected : styles.categoryTextUnselected,
                        { color: textColor },
                      ]}
                      numberOfLines={1}
                      ellipsizeMode="tail"
                    >
                      {category}
                    </Text>
                  </TouchableOpacity>
                );
              })}
              <TouchableOpacity
                style={[
                  styles.categoryChip,
                  {
                    backgroundColor: theme.card,
                    borderColor: themeColors[accentColor],
                    elevation: 2 as number,
                    shadowColor: BLACK,
                    shadowOffset: { width: 0, height: 1 },
                    shadowOpacity: 0.2 as number,
                    shadowRadius: 1.41 as number,
                  },
                ]}
                onPress={() => router.push('/(modal)/category-input')}
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

  const handleFocusMode = () => {
    setIsFocusMode(!isFocusMode);

    if (!isFocusMode) {
      // Focus mode açılırken - status bar'ı gizleme, sadece renk değiştir
      if (Platform.OS === 'android') {
        StatusBar.setBackgroundColor('transparent', true);
        StatusBar.setBarStyle(
          theme.background === '#000000' ? 'light-content' : 'dark-content',
          true
        );
      }

      // Focus mode açıldıktan sonra keyboard'u göster
      setTimeout(() => {
        contentRef.current?.focus();
      }, 200);
    } else {
      // Focus mode'dan çıkarken
      Keyboard.dismiss();

      if (Platform.OS === 'android') {
        StatusBar.setBackgroundColor(themeColors[accentColor], true);
        StatusBar.setBarStyle('light-content', true);
      }
    }
  };

  if (!note) {
    return null;
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
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
            <View style={[styles.headerRightContainer, { zIndex: 100000 }]}>
              {/* Three Dots Menu */}
              <View style={styles.headerMenuContainer}>
                <View
                  onTouchStart={() => {
                    setShowHeaderMenu(!showHeaderMenu);
                  }}
                  style={styles.headerIconContainer}
                >
                  <Ionicons name="ellipsis-vertical" size={24} color="#fff" />
                </View>
              </View>
            </View>
          ),
        }}
      />

      {/* Header Menu Dropdown - Rendered at root level for proper positioning */}
      {showHeaderMenu && (
        <>
          <TouchableOpacity
            style={[styles.headerMenuOverlay, { backgroundColor: 'rgba(0,0,0,0.1)' }]}
            onPress={() => setShowHeaderMenu(false)}
            activeOpacity={1}
          />
          <View
            style={[
              styles.headerDropdown,
              { backgroundColor: theme.card, borderColor: theme.border },
            ]}
          >
            <TouchableOpacity
              onPress={() => {
                setShowHeaderMenu(false);
                handleFocusMode();
              }}
              style={styles.headerMenuItem}
            >
              <Ionicons name="contract-outline" size={20} color={theme.text} />
              <Text style={[styles.headerMenuText, { color: theme.text }]}>
                {t('common.focusMode')}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                setShowHeaderMenu(false);
                handleReadingMode();
              }}
              style={styles.headerMenuItem}
            >
              <Ionicons name="expand-outline" size={20} color={theme.text} />
              <Text style={[styles.headerMenuText, { color: theme.text }]}>
                {t('common.readingMode')}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                setShowHeaderMenu(false);
                copyContent();
              }}
              style={styles.headerMenuItem}
            >
              <Ionicons name="copy-outline" size={20} color={theme.text} />
              <Text style={[styles.headerMenuText, { color: theme.text }]}>{t('common.copy')}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                setShowHeaderMenu(false);
                exportToPdf();
              }}
              style={styles.headerMenuItem}
            >
              <Ionicons name="document-text-outline" size={20} color={theme.text} />
              <Text style={[styles.headerMenuText, { color: theme.text }]}>Export PDF</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                setShowHeaderMenu(false);
                handleSave();
              }}
              style={styles.headerMenuItem}
            >
              <Ionicons name="save-outline" size={20} color={theme.text} />
              <Text style={[styles.headerMenuText, { color: theme.text }]}>{t('common.save')}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                setShowHeaderMenu(false);
                handleDelete();
              }}
              style={[styles.headerMenuItem, styles.headerMenuItemDanger]}
            >
              <Ionicons name="trash-outline" size={20} color="#ff4757" />
              <Text style={[styles.headerMenuText, { color: '#ff4757' }]}>
                {t('common.delete')}
              </Text>
            </TouchableOpacity>
          </View>
        </>
      )}

      {isFocusMode ? (
        // Focus Mode - Minimal UI with full screen text input
        <View style={styles.focusModeContainer}>
          {/* Focus Mode StatusBar */}
          <StatusBar
            barStyle={theme.background === '#000000' ? 'light-content' : 'dark-content'}
            backgroundColor="transparent"
            translucent={false}
            hidden={false}
          />

          <KeyboardAvoidingView
            style={styles.focusKeyboardContainer}
            behavior={Platform.OS === 'ios' ? 'padding' : 'padding'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 80}
          >
            {/* Focus Mode Header */}
            <View
              style={[
                styles.focusHeader,
                {
                  backgroundColor: theme.background,
                  borderBottomColor: theme.border,
                  paddingTop: Platform.OS === 'ios' ? insets.top + 10 : 10,
                },
              ]}
            >
              <TouchableOpacity onPress={handleFocusMode} style={styles.focusExitButton}>
                <Ionicons name="expand-outline" size={24} color={themeColors[accentColor]} />
                <Text style={[styles.focusExitText, { color: themeColors[accentColor] }]}>
                  {t('common.exitFocus')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleSave}
                style={[styles.focusSaveButton, { backgroundColor: themeColors[accentColor] }]}
              >
                <Ionicons name="checkmark" size={20} color="white" />
              </TouchableOpacity>
            </View>

            {/* Focus Mode Text Input */}
            <ScrollView
              style={styles.focusScrollContainer}
              contentContainerStyle={styles.focusScrollContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              keyboardDismissMode="interactive"
              automaticallyAdjustKeyboardInsets={true}
            >
              <TextInput
                ref={contentRef}
                style={[
                  styles.focusTextInput,
                  {
                    color: theme.text,
                    backgroundColor: theme.background,
                    fontSize: fontSizes[fontSize].contentSize,
                    fontFamily: fontFamilies[fontFamily].family,
                  },
                ]}
                placeholder={t('notes.focusModePlaceholder')}
                placeholderTextColor={theme.textSecondary}
                value={content}
                onChangeText={handleContentChange}
                multiline
                textAlignVertical="top"
                autoFocus
                scrollEnabled={false}
              />
            </ScrollView>
          </KeyboardAvoidingView>
        </View>
      ) : (
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

            {/* Note Details Toggle */}
            {!isReadingMode && (
              <View>
                <TouchableOpacity
                  style={[
                    styles.sectionToggle,
                    {
                      backgroundColor: theme.card,
                      borderColor: theme.border,
                    },
                  ]}
                  onPress={() => setShowOptions(!showOptions)}
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name={showOptions ? 'chevron-up' : 'chevron-down'}
                    size={20}
                    color={themeColors[accentColor]}
                  />
                  <Text style={[styles.sectionToggleText, { color: themeColors[accentColor] }]}>
                    {t('notes.details') || 'Note Details'}
                  </Text>
                </TouchableOpacity>

                {showOptions && (
                  <View style={styles.optionsContent}>
                    {/* Color Picker */}
                    <View style={styles.optionContainer}>
                      <Text style={[styles.optionLabel, { color: theme.textSecondary }]}>
                        {t('notes.color')}
                      </Text>

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

                      {showColorOptions && (
                        <View style={[styles.colorSelector, { borderColor: theme.border }]}>
                          {['default', 'red', 'orange', 'yellow', 'green', 'blue']
                            .map(key => allColors[key])
                            .filter(Boolean)
                            .map(color => (
                              <TouchableOpacity
                                key={color.id}
                                style={[styles.colorCircle, colorCircleStyle(color.background)]}
                                onPress={async () => {
                                  setSelectedColor(color.id);

                                  if (note) {
                                    const updatedNote = {
                                      ...note,
                                      color: color.id,
                                      updatedAt: new Date().toISOString(),
                                    };

                                    setNote(updatedNote);

                                    try {
                                      await updateNote(note.id, updatedNote);
                                      setHasUnsavedChanges(false);
                                      androidShowToast(t('notes.noteSaved'));
                                    } catch (error) {
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

                    {/* Image Uploader */}
                    <View style={styles.optionContainer}>
                      <Text style={[styles.optionLabel, { color: theme.textSecondary }]}>
                        {t('notes.coverImage')}
                      </Text>
                      <ImageUploader onImageSelect={setCoverImage} selectedImage={coverImage} />
                    </View>
                  </View>
                )}
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
                    table: {
                      backgroundColor: theme.card,
                      borderColor: theme.border,
                      borderWidth: 1,
                      borderRadius: 8,
                      marginVertical: 8,
                    },
                    tr: {
                      backgroundColor: theme.card,
                      borderBottomColor: theme.border,
                      borderBottomWidth: 1,
                    },
                    th: {
                      backgroundColor:
                        themeMode === 'dark' ? theme.background : theme.border + '40',
                      color: theme.text,
                      fontWeight: 'bold',
                      padding: 8,
                      borderRightColor: theme.border,
                      borderRightWidth: 1,
                    },
                    td: {
                      backgroundColor: theme.card,
                      color: theme.text,
                      padding: 8,
                      borderRightColor: theme.border,
                      borderRightWidth: 1,
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
      )}

      {/* Bottom Action Buttons - Hide in focus mode */}
      {!isFocusMode && (
        <View
          style={[
            styles.buttonContainer,
            {
              backgroundColor: theme.background,
              borderTopColor: theme.border,
              paddingBottom: Math.max(insets.bottom + 8, 20),
            },
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
            <Ionicons name="expand-outline" size={24} color={themeColors[accentColor]} />
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
              {t('common.readingMode')}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Full Screen Reader */}
      <FullScreenReader
        visible={showFullScreen}
        onClose={() => setShowFullScreen(false)}
        content={content}
        title={title}
        coverImage={coverImage}
      />
    </KeyboardAvoidingView>
  );
}

// Edit Note Styles
const styles = StyleSheet.create({
  sectionToggle: {
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
    marginTop: 12,
    padding: 12,
  },
  sectionToggleText: {
    fontSize: 15,
    fontWeight: '600',
  },
  optionsContent: {
    marginBottom: 16,
    paddingHorizontal: 4,
  },
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
    paddingVertical: 12,
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
    height: 42,
    justifyContent: 'center',
    marginBottom: 8,
    marginRight: 8,
    minWidth: 80,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  categoryChipSelected: {
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    elevation: 2,
    flexDirection: 'row',
    height: 42,
    justifyContent: 'center',
    marginBottom: 8,
    marginRight: 8,
    minWidth: 80,
    paddingHorizontal: 14,
    paddingVertical: 8,
    shadowColor: BLACK,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
  },
  categoryChipUnselected: {
    alignItems: 'center',
    backgroundColor: undefined,
    borderColor: undefined,
    borderRadius: 12,
    borderWidth: 1,
    elevation: 2,
    flexDirection: 'row',
    height: 42,
    justifyContent: 'center',
    marginBottom: 8,
    marginRight: 8,
    minWidth: 80,
    paddingHorizontal: 14,
    paddingVertical: 8,
    shadowColor: BLACK,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
  },
  categoryScroll: {
    paddingVertical: 12,
  },
  categoryScrollContent: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 12,
  },
  categoryText: {
    fontSize: 14,
    fontWeight: '600',
    maxWidth: 120,
    textAlign: 'center',
  },
  categoryTextSelected: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 2,
    maxWidth: 120,
    textAlign: 'center',
  },
  categoryTextUnselected: {
    color: undefined,
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 2,
    maxWidth: 120,
    textAlign: 'center',
  },
  colorCircle: {
    alignItems: 'center',
    borderRadius: 21,
    height: 42,
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    width: 42,
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
    gap: 8,
    justifyContent: 'space-between',
    padding: 12,
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
    shadowColor: BLACK,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    zIndex: 5,
  },
  headerIconContainer: {
    padding: 10,
  },
  headerMenuContainer: {
    position: 'relative',
    zIndex: 10000,
  },
  headerDropdown: {
    borderRadius: 12,
    borderWidth: 1,
    elevation: 10,
    minWidth: 180,
    paddingVertical: 8,
    position: 'absolute',
    right: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    top: 5,
    zIndex: 99999,
  },
  headerMenuItem: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerMenuItemDanger: {
    borderTopColor: '#ff475720',
    borderTopWidth: 1,
  },
  headerMenuText: {
    fontSize: 14,
    fontWeight: '500',
  },
  headerMenuOverlay: {
    bottom: -1000,
    left: -1000,
    position: 'absolute',
    right: -1000,
    top: -1000,
    zIndex: 99998,
  },
  headerRightContainer: {
    alignItems: 'flex-end',
    flexDirection: 'row' as const,
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
    justifyContent: 'center',
    minHeight: 52,
  },
  pickerButtonContent: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 14,
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
    fontSize: 16,
    fontWeight: '600',
  },
  readingContainer: {
    backgroundColor: 'transparent' as string,
    borderRadius: 12,
    marginBottom: 16,
    marginTop: 16,
    padding: 16,
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
    shadowColor: BLACK,
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
  // Focus Mode Styles
  focusModeContainer: {
    bottom: 0,
    flex: 1,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
    zIndex: 999,
  },
  focusKeyboardContainer: {
    flex: 1,
  },
  focusScrollContainer: {
    flex: 1,
  },
  focusScrollContent: {
    flexGrow: 1,
    minHeight: '100%',
  },
  focusHeader: {
    alignItems: 'center',
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  focusExitButton: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  focusExitText: {
    fontSize: 16,
    fontWeight: '600',
  },
  focusSaveButton: {
    alignItems: 'center',
    borderRadius: 20,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  focusTextInput: {
    flex: 1,
    padding: 16,
    paddingTop: 16,
    paddingBottom: Platform.OS === 'android' ? 80 : 40, // Keyboard için daha fazla padding
    fontSize: 18,
    lineHeight: 28,
    textAlignVertical: 'top',
  },
});
