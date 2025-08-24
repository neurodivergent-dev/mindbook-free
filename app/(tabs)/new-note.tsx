// This file is Creates a new note screen for the app.
// It includes a title input, content input, category selection, and a save button.
// It also includes a toolbar for inserting markdown formatting into the content input.

import { useState, useEffect, useRef } from 'react';
import {
  View,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Text,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Image,
  Platform,
  Keyboard,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { saveNote, getCategories, addCategory, deleteCategory } from '../utils/storage';
import { useTheme } from '../context/ThemeContext';
import Markdown from 'react-native-markdown-display';
import { useTranslation } from 'react-i18next';
import { triggerAutoBackup } from '../utils/backup';
import supabase from '../utils/supabase';
import { showToast as platformShowToast } from '../utils/android';
import { categoryEvents, CATEGORY_EVENTS } from '../utils/categoryEvents';
import FullScreenReader from '../components/FullScreenReader';
import ImageUploader from '../components/ImageUploader';
import AIContentGenerator from '../components/AIContentGenerator';
import * as Clipboard from 'expo-clipboard';

const Colors = {
  transparent: 'transparent',
  white: '#fff',
  black: '#000',
  modalOverlay: 'rgba(0,0,0,0.5)',
  borderTransparent: 'rgba(0,0,0,0.1)',
};

interface MarkdownToolbarProps {
  onInsert: (text: string) => void;
}

const MarkdownToolbar = ({ onInsert }: MarkdownToolbarProps) => {
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

  const toolbarStyles = {
    container: [styles.toolbarContainer, { backgroundColor: theme.card }],
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
};

type CategoryState = string[] | [];

interface ExtendedTextInput extends TextInput {
  _lastNativeSelection?: {
    start: number;
    end: number;
  };
  setNativeProps(props: object): void;
}

const NewNote = () => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [showFullScreen, setShowFullScreen] = useState(false);
  const [coverImage, setCoverImage] = useState<string>('');
  const [categories, setCategories] = useState<CategoryState>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const [showAIGenerator, setShowAIGenerator] = useState(false);

  const router = useRouter();
  const { theme, accentColor, themeColors, fontSize, fontSizes, fontFamily, fontFamilies } =
    useTheme();
  const { t } = useTranslation();

  // Refs for scroll management
  const scrollViewRef = useRef<ScrollView>(null);
  const titleRef = useRef<TextInput>(null);
  const contentRef = useRef<TextInput>(null);
  const screenHeight = Dimensions.get('window').height;

  useEffect(() => {
    loadCategories();

    // Global functions for header menu
    window.toggleFullScreen = () => {
      setShowFullScreen(true);
    };

    window.checkContentAndToggleFullScreen = () => {
      if (!content.trim()) {
        platformShowToast(t('notes.noContentToRead'));
        return;
      }
      setShowFullScreen(true);
    };

    window.saveNewNote = () => {
      handleSave();
    };

    window.resetNewNote = () => {
      resetForm();
    };

    window.toggleFocusMode = () => {
      handleFocusMode();
    };

    window.showAIGenerator = () => {
      setShowAIGenerator(true);
    };

    window.copyContent = () => {
      copyContent();
    };

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

    // Keyboard event listeners
    const keyboardWillShow = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      e => {
        setKeyboardHeight(e.endCoordinates.height);
        setIsKeyboardVisible(true);
      }
    );

    const keyboardWillHide = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        setKeyboardHeight(0);
        setIsKeyboardVisible(false);
      }
    );

    return () => {
      categoryEvents.off(CATEGORY_EVENTS.CATEGORIES_CHANGED, handleCategoriesChanged);
      categoryEvents.off(CATEGORY_EVENTS.CATEGORY_UPDATED, handleCategoryUpdated);
      categoryEvents.off(CATEGORY_EVENTS.CATEGORY_DELETED, handleCategoryDeleted);
      keyboardWillShow.remove();
      keyboardWillHide.remove();
    };
  }, [selectedCategory, content]);

  const loadCategories = async () => {
    const loadedCategories = await getCategories();
    setCategories(loadedCategories);
  };

  // Smart scroll function to keep focused input visible
  const scrollToInput = (inputRef: React.RefObject<TextInput>, extraOffset: number = 0) => {
    if (inputRef.current && scrollViewRef.current && isKeyboardVisible) {
      setTimeout(
        () => {
          inputRef.current?.measure((x, y, width, height, pageX, pageY) => {
            const inputBottom = pageY + height;
            const keyboardTop = screenHeight - keyboardHeight;
            const bufferSpace = 80; // Extra space between input and keyboard

            if (inputBottom + bufferSpace > keyboardTop) {
              const scrollOffset = inputBottom + bufferSpace - keyboardTop + extraOffset;
              scrollViewRef.current?.scrollTo({
                y: scrollOffset,
                animated: true,
              });
            }
          });
        },
        Platform.OS === 'ios' ? 300 : 100
      ); // iOS needs more delay for keyboard animation
    }
  };

  const handleTitleFocus = () => {
    scrollToInput(titleRef, 20);
  };

  const handleContentFocus = () => {
    scrollToInput(contentRef, 40);
  };

  const handleAddCategory = async (categoryName: string) => {
    if (categoryName.trim()) {
      try {
        await addCategory(categoryName.trim());
        await loadCategories();
        await triggerAutoBackup(null);
        setSelectedCategory(categoryName.trim());
      } catch (error) {
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

  const resetForm = () => {
    setTitle('');
    setContent('');
    setSelectedCategory(null);
    setCoverImage('');
  };

  const handleSave = async () => {
    if (!title.trim() || !content.trim()) {
      Alert.alert(t('common.warning'), t('notes.fillAllFields'));
      return;
    }

    try {
      const note = {
        title: title.trim(),
        content: content.trim(),
        category: selectedCategory,
        coverImage: coverImage || undefined,
        createdAt: new Date().toISOString(),
      };

      console.log('Starting to save note:', note);
      const result = await saveNote(note);
      console.log('Note save result:', result);

      if (result) {
        const { data: userData } = await supabase.auth.getUser();
        if (userData?.user) {
          triggerAutoBackup(userData.user);
        }

        resetForm();
        Alert.alert(t('common.success'), t('notes.noteSaved'), [
          {
            text: t('common.ok'),
            onPress: () => router.push('/(tabs)/'),
          },
        ]);
      } else {
        throw new Error('Failed to save note');
      }
    } catch (error) {
      console.error('Note save error details:', error);
      Alert.alert(
        t('common.error'),
        error instanceof Error ? error.message : t('notes.saveNoteError')
      );
    }
  };

  const showToast = () => {
    platformShowToast(t('notes.readingModeEditing'));
  };

  const handleReadingMode = () => {
    if (!content.trim()) {
      platformShowToast(t('notes.noContentToRead'));
      return;
    }
    setShowFullScreen(true);
  };

  const handleFocusMode = () => {
    setIsFocusMode(!isFocusMode);
  };

  const copyContent = async () => {
    const fullText = `${title}\n\n${content}`;
    await Clipboard.setStringAsync(fullText);
    platformShowToast(t('common.copied'));
  };

  const handleCategoryPress = (category: string) => {
    if (selectedCategory === category) {
      setSelectedCategory(null);
    } else {
      setSelectedCategory(category);
    }
  };

  const handleDeleteCategory = (categoryToDelete: string) => {
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
            await triggerAutoBackup(null);
          } catch (error) {
            console.error('Error deleting category:', error);
            Alert.alert(t('common.error'), t('notes.deleteCategoryError'));
          }
        },
      },
    ]);
  };

  const handleContentChange = (newContent: string) => {
    if (contentRef.current) {
      contentRef.current.setNativeProps({ text: newContent });
    }
    setContent(newContent);
  };

  const handleToolInsert = (text: string) => {
    if (contentRef.current) {
      const currentContent = content;
      const selection = (contentRef.current as ExtendedTextInput)._lastNativeSelection;

      if (!selection) {
        setContent(currentContent + text);
        return;
      }

      const start = selection.start;
      const end = selection.end;
      const beforeCursor = currentContent.substring(0, start);
      const afterCursor = currentContent.substring(end);
      const newContent = beforeCursor + text + afterCursor;

      setContent(newContent);

      const newCursorPosition = start + text.length;
      (contentRef.current as ExtendedTextInput).setNativeProps({
        selection: {
          start: newCursorPosition,
          end: newCursorPosition,
        },
      });
    }
  };

  const handleAIContentGenerated = (
    generatedContent: string,
    coverImageUrl?: string,
    generatedTitle?: string
  ) => {
    // Set cover image if provided
    if (coverImageUrl) {
      setCoverImage(coverImageUrl);
    }

    // Set title if provided and current title is empty
    if (generatedTitle && !title.trim()) {
      setTitle(generatedTitle);
    }

    // AI içeriğini mevcut içeriğe ekle veya değiştir
    if (content.trim()) {
      // Eğer mevcut içerik varsa, kullanıcıya seçenek sun
      Alert.alert(t('ai.insertContent'), t('ai.insertContentMessage'), [
        {
          text: t('ai.replace'),
          onPress: () => {
            setContent(generatedContent);
            // Also set title if replacing content and no title exists
            if (generatedTitle && !title.trim()) {
              setTitle(generatedTitle);
            }
          },
        },
        {
          text: t('ai.append'),
          onPress: () => setContent(content + '\n\n' + generatedContent),
        },
        {
          text: t('common.cancel'),
          style: 'cancel',
        },
      ]);
    } else {
      // Eğer içerik yoksa direkt ekle
      setContent(generatedContent);
    }
  };

  // Calculate keyboard avoiding view offset
  const getKeyboardVerticalOffset = () => {
    if (Platform.OS === 'ios') {
      return 90;
    }
    return 0;
  };

  // Dynamic styles
  const dynamicStyles = {
    container: [styles.container, { backgroundColor: theme.background }],
    scrollViewContent: [
      styles.scrollViewContent,
      { paddingBottom: isKeyboardVisible ? keyboardHeight + 100 : 100 }, // Extra space for fixed buttons
    ],
    titleInput: [
      styles.titleInput,
      {
        color: theme.text,
        backgroundColor: theme.card,
        fontSize: fontSizes[fontSize].contentSize + 4,
        fontFamily: fontFamilies[fontFamily].family,
        borderColor: theme.border,
      },
    ],
    pickerButton: [
      styles.pickerButton,
      showCategoryPicker && styles.pickerButtonActive,
      {
        backgroundColor: theme.card,
        borderColor: showCategoryPicker ? themeColors[accentColor] : theme.border,
      },
    ],
    pickerText: [styles.pickerText, { color: theme.text }],
    pickerChevron: {
      color: showCategoryPicker ? themeColors[accentColor] : theme.text,
    },
    pickerIcon: {
      color: showCategoryPicker ? themeColors[accentColor] : theme.text,
    },
    dropdownContainer: [styles.dropdownContainer, { backgroundColor: theme.card }],
    categoryChip: (category: string) => [
      styles.categoryChip,
      {
        backgroundColor: selectedCategory === category ? themeColors[accentColor] : theme.card,
        borderColor: selectedCategory === category ? themeColors[accentColor] : theme.border,
      },
      styles.categoryChipShadow,
    ],
    categoryText: (category: string) => [
      styles.categoryTextWithMargin,
      {
        color: selectedCategory === category ? Colors.white : themeColors[accentColor],
      },
    ],
    addCategoryChip: [
      styles.categoryChip,
      {
        backgroundColor: theme.card,
        borderColor: themeColors[accentColor],
      },
      styles.categoryChipShadow,
    ],
    addCategoryText: [styles.categoryText, { color: themeColors[accentColor] }],
    readingContainer: [styles.readingContainer, { borderColor: theme.border }],
    contentInput: [
      styles.contentInput,
      {
        color: theme.text,
        backgroundColor: theme.card,
        fontSize: fontSizes[fontSize].contentSize,
        fontFamily: fontFamilies[fontFamily].family,
        borderColor: theme.border,
      },
    ],
    fixedButtonContainer: [styles.fixedButtonContainer, { backgroundColor: theme.background }],
    primaryButton: [
      styles.button,
      styles.primaryButton,
      {
        backgroundColor: themeColors[accentColor],
        shadowColor: themeColors[accentColor],
      },
    ],
    secondaryButton: [
      styles.button,
      styles.secondaryButton,
      { borderColor: themeColors[accentColor] },
    ],
    primaryButtonText: [
      styles.buttonText,
      {
        fontSize: fontSizes[fontSize].contentSize,
        fontFamily: fontFamilies[fontFamily].family,
      },
    ],
    secondaryButtonText: [
      styles.buttonText,
      {
        fontSize: fontSizes[fontSize].contentSize,
        fontFamily: fontFamilies[fontFamily].family,
        color: themeColors[accentColor],
      },
    ],
  };

  const markdownStyles = {
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
      backgroundColor: theme.card,
      borderColor: themeColors[accentColor],
      fontSize: fontSizes[fontSize].contentSize,
    },
  };

  // Focus Mode UI
  if (isFocusMode) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <View
          style={[
            styles.focusHeader,
            { backgroundColor: theme.background, borderBottomColor: theme.border },
          ]}
        >
          <TouchableOpacity onPress={handleFocusMode} style={styles.focusExitButton}>
            <Ionicons name="expand-outline" size={24} color={themeColors[accentColor]} />
            <Text style={[styles.focusExitText, { color: themeColors[accentColor] }]}>
              {t('common.exitFocus')}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.focusSaveButton, { backgroundColor: themeColors[accentColor] }]}
            onPress={handleSave}
          >
            <Ionicons name="checkmark" size={20} color="white" />
            <Text style={styles.focusSaveButtonText}>{t('common.save')}</Text>
          </TouchableOpacity>
        </View>
        <TextInput
          style={[
            styles.focusContentInput,
            {
              color: theme.text,
              backgroundColor: theme.background,
              fontSize: fontSizes[fontSize].contentSize,
              fontFamily: fontFamilies[fontFamily].family,
            },
          ]}
          placeholder={t('notes.noteContent')}
          placeholderTextColor={theme.textSecondary}
          value={content}
          onChangeText={setContent}
          multiline
          autoFocus
        />
      </View>
    );
  }

  return (
    <View style={dynamicStyles.container}>
      <KeyboardAvoidingView
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={getKeyboardVerticalOffset()}
      >
        <ScrollView
          ref={scrollViewRef}
          style={styles.scrollView}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={dynamicStyles.scrollViewContent}
        >
          <TextInput
            ref={titleRef}
            style={dynamicStyles.titleInput}
            placeholder={t('notes.noteTitle')}
            placeholderTextColor={theme.textSecondary}
            value={title}
            onChangeText={text => {
              if (text.length <= 40) {
                setTitle(text);
              }
            }}
            onFocus={handleTitleFocus}
            maxLength={40}
          />

          <MarkdownToolbar onInsert={handleToolInsert} />

          <ImageUploader
            key={`image-uploader-${coverImage || 'empty'}`}
            onImageSelect={setCoverImage}
            selectedImage={coverImage}
          />

          <View style={styles.pickerContainer}>
            <TouchableOpacity
              style={dynamicStyles.pickerButton}
              onPress={() => setShowCategoryPicker(!showCategoryPicker)}
            >
              <View style={styles.pickerButtonContent}>
                <View style={styles.pickerLeftContent}>
                  <Ionicons
                    name="pricetag-outline"
                    size={20}
                    color={dynamicStyles.pickerIcon.color}
                  />
                  <Text style={dynamicStyles.pickerText}>
                    {selectedCategory || t('notes.selectCategory')}
                  </Text>
                </View>
                <Ionicons
                  name={showCategoryPicker ? 'chevron-up' : 'chevron-down'}
                  size={20}
                  color={dynamicStyles.pickerChevron.color}
                />
              </View>
            </TouchableOpacity>

            {showCategoryPicker && (
              <View style={dynamicStyles.dropdownContainer}>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={styles.categoryScroll}
                  contentContainerStyle={styles.categoryScrollContent}
                >
                  {categories.map(category => (
                    <TouchableOpacity
                      key={category}
                      style={dynamicStyles.categoryChip(category)}
                      onPress={() => {
                        handleCategoryPress(category);
                        setShowCategoryPicker(false);
                      }}
                      onLongPress={() => handleDeleteCategory(category)}
                    >
                      <Text
                        style={dynamicStyles.categoryText(category)}
                        numberOfLines={1}
                        ellipsizeMode="tail"
                      >
                        {category}
                      </Text>
                    </TouchableOpacity>
                  ))}
                  <TouchableOpacity
                    style={dynamicStyles.addCategoryChip}
                    onPress={() => router.push('/(modal)/category-input')}
                  >
                    <Ionicons name="add" size={14} color={themeColors[accentColor]} />
                    <Text
                      style={dynamicStyles.addCategoryText}
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

          <TextInput
            ref={contentRef}
            style={dynamicStyles.contentInput}
            placeholder={t('notes.noteContent')}
            placeholderTextColor={theme.textSecondary}
            value={content}
            onChangeText={handleContentChange}
            onFocus={handleContentFocus}
            onSelectionChange={event => {
              if (contentRef.current) {
                (contentRef.current as ExtendedTextInput)._lastNativeSelection =
                  event.nativeEvent.selection;
              }
            }}
            multiline
            textAlignVertical="top"
          />
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Fixed Button Container */}
      <View style={dynamicStyles.fixedButtonContainer}>
        <TouchableOpacity style={dynamicStyles.primaryButton} onPress={handleSave}>
          <Ionicons name="checkmark-circle-outline" size={24} color="white" />
          <Text style={dynamicStyles.primaryButtonText}>{t('common.save')}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={dynamicStyles.secondaryButton} onPress={handleReadingMode}>
          <Ionicons name="eye-outline" size={24} color={themeColors[accentColor]} />
          <Text style={dynamicStyles.secondaryButtonText}>{t('common.readingMode')}</Text>
        </TouchableOpacity>
      </View>

      <FullScreenReader
        visible={showFullScreen}
        onClose={() => setShowFullScreen(false)}
        content={content}
        title={title}
        coverImage={coverImage}
      />

      <AIContentGenerator
        visible={showAIGenerator}
        onClose={() => setShowAIGenerator(false)}
        onContentGenerated={handleAIContentGenerated}
      />
    </View>
  );
};

export default NewNote;

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    borderRadius: 12,
    flexDirection: 'row',
    gap: 8,
    height: 60,
    justifyContent: 'center',
    minWidth: 160,
    padding: 16,
  },
  buttonText: {
    color: Colors.white,
    fontSize: 16,
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
  categoryChipShadow: {
    elevation: 2,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
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
  container: {
    flex: 1,
  },
  contentInput: {
    borderRadius: 12,
    borderWidth: 1,
    flex: 1,
    lineHeight: 24,
    marginBottom: 8,
    marginTop: 16,
    minHeight: 300,
    padding: 16,
    textAlignVertical: 'top',
  },
  dropdownContainer: {
    borderRadius: 12,
    elevation: 4,
    marginTop: 8,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    zIndex: 5,
  },
  fixedButtonContainer: {
    alignItems: 'center',
    borderTopColor: Colors.borderTransparent,
    borderTopWidth: 1,
    bottom: 0,
    elevation: 8,
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
    left: 0,
    paddingBottom: 20,
    paddingHorizontal: 16,
    paddingTop: 16,
    position: 'absolute',
    right: 0,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    zIndex: 10,
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  markdownImage: {
    borderRadius: 8,
    height: 200,
    width: '100%',
  },
  pickerButton: {
    borderRadius: 12,
    borderWidth: 1,
  },
  pickerButtonActive: {
    borderWidth: 2,
  },
  pickerButtonContent: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 12,
  },
  pickerContainer: {
    marginBottom: 10,
    zIndex: 1,
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
  primaryButton: {
    elevation: 3,
    flex: 1,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  readingContainer: {
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    marginBottom: 16,
    padding: 16,
  },
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    padding: 16,
  },
  secondaryButton: {
    backgroundColor: Colors.transparent,
    borderWidth: 1.5,
    elevation: 0,
    flex: 1,
    shadowOpacity: 0,
  },
  titleInput: {
    borderRadius: 12,
    borderWidth: 1,
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
    padding: 16,
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
    borderColor: Colors.borderTransparent,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
    overflow: 'hidden',
  },
  toolbarContent: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    padding: 12,
  },
  toolbarToggle: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    padding: 12,
  },
  toolbarToggleText: {
    color: Colors.white,
    fontSize: 15,
    fontWeight: '600',
  },
  // Focus Mode Styles
  focusHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  focusExitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  focusExitText: {
    fontSize: 16,
    fontWeight: '600',
  },
  focusSaveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  focusSaveButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  focusContentInput: {
    flex: 1,
    padding: 16,
    fontSize: 16,
    lineHeight: 24,
    textAlignVertical: 'top',
  },
});
