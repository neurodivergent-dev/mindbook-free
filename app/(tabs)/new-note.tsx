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
import CategoryInputModal from '../components/CategoryInputModal';

// Let's define a palette for constant color values
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
    { icon: 'code-slash', label: '<>', insert: '`kod`', description: t('notes.code') },
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
        <Ionicons name={isVisible ? 'chevron-up' : 'chevron-down'} size={20} color="#FFF" />
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
                name={(tool.icon + '-outline') as any}
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
};

// Let's make a definition for the state type of the categories.
type CategoryState = string[] | [];

const NewNote = () => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isReadingMode, setIsReadingMode] = useState(false);
  const [categories, setCategories] = useState<CategoryState>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const router = useRouter();
  const { theme, accentColor, themeColors, fontSize, fontSizes, fontFamily, fontFamilies } =
    useTheme();
  const { t } = useTranslation();
  const contentRef = useRef<TextInput | null>(null);

  // Let's define a custom type for contentRef's _lastNativeSelection
  interface ExtendedTextInput extends TextInput {
    _lastNativeSelection?: {
      start: number;
      end: number;
    };
    setNativeProps(props: object): void;
  }

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    const loadedCategories = await getCategories();
    setCategories(loadedCategories);
  };

  const handleAddCategory = async (categoryName: string) => {
    if (categoryName.trim()) {
      try {
        await addCategory(categoryName.trim());
        await loadCategories();
        setShowCategoryModal(false);
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
        createdAt: new Date().toISOString(),
      };

      console.log('Starting to save note:', note);
      const result = await saveNote(note);
      console.log('Note save result:', result);

      if (result) {
        // Auto backup trigger
        // Use Supabase auth instead of Firebase
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
    setIsReadingMode(!isReadingMode);
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
          } catch (error) {
            console.error('Error deleting category:', error);
            Alert.alert(t('common.error'), t('notes.deleteCategoryError'));
          }
        },
      },
    ]);
  };

  const handleContentChange = (newContent: string) => {
    // Update contentRef directly too
    if (contentRef.current) {
      // Update native control directly (critical for deletion)
      contentRef.current.setNativeProps({ text: newContent });
    }

    // State update (for normal flow)
    setContent(newContent);
  };

  const handleToolInsert = (text: string) => {
    if (contentRef.current) {
      const currentContent = content;
      const selection = (contentRef.current as ExtendedTextInput)._lastNativeSelection;

      if (!selection) {
        // If there is no selection, add it to the end
        setContent(currentContent + text);
        return;
      }

      const start = selection.start;
      const end = selection.end;

      // Get text before and after the cursor
      const beforeCursor = currentContent.substring(0, start);
      const afterCursor = currentContent.substring(end);

      // Insert new text at cursor position
      const newContent = beforeCursor + text + afterCursor;
      setContent(newContent);

      // Place the cursor at the end of the inserted text
      const newCursorPosition = start + text.length;

      // Position the cursor immediately
      (contentRef.current as ExtendedTextInput).setNativeProps({
        selection: {
          start: newCursorPosition,
          end: newCursorPosition,
        },
      });
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <ScrollView
        style={styles.scrollView}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <TextInput
          style={[
            styles.titleInput,
            {
              color: theme.text,
              backgroundColor: theme.card,
              fontSize: fontSizes[fontSize].contentSize + 4,
              fontFamily: fontFamilies[fontFamily].family,
            },
          ]}
          placeholder={t('notes.noteTitle')}
          placeholderTextColor={theme.textSecondary}
          value={title}
          onChangeText={text => {
            // Apply 40 character limit for title
            if (text.length <= 40) {
              setTitle(text);
            }
          }}
          maxLength={40} // Maximum 40 characters
        />

        <MarkdownToolbar onInsert={handleToolInsert} />

        <View style={styles.pickerContainer}>
          <TouchableOpacity
            style={[
              styles.pickerButton,
              showCategoryPicker && styles.pickerButtonActive,
              {
                backgroundColor: theme.card,
                borderColor: showCategoryPicker ? themeColors[accentColor] : theme.border,
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
                      },
                      styles.categoryChipShadow,
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
                          color:
                            selectedCategory === category ? Colors.white : themeColors[accentColor],
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
                    },
                    styles.categoryChipShadow,
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

        {isReadingMode ? (
          <View style={styles.readingContainer}>
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
                  backgroundColor: theme.card,
                  borderColor: themeColors[accentColor],
                  fontSize: fontSizes[fontSize].contentSize,
                },
              }}
              rules={{
                image: (node, index) => {
                  const { src, alt } = node.attributes;
                  return (
                    <Image
                      key={`image-${index}-${src}`}
                      source={{ uri: src }}
                      style={styles.markdownImage}
                      accessible={true}
                      accessibilityLabel={alt || 'Markdown image'}
                    />
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
              if (contentRef.current) {
                (contentRef.current as ExtendedTextInput)._lastNativeSelection =
                  event.nativeEvent.selection;
              }
            }}
            multiline
            textAlignVertical="top"
            editable={!isReadingMode}
            onPressIn={() => isReadingMode && showToast()}
          />
        )}

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[
              styles.button,
              styles.primaryButton,
              {
                backgroundColor: themeColors[accentColor],
                shadowColor: themeColors[accentColor],
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
              styles.secondaryButton,
              {
                borderColor: themeColors[accentColor],
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
      </ScrollView>

      <CategoryInputModal
        visible={showCategoryModal}
        onClose={() => setShowCategoryModal(false)}
        onAdd={handleAddCategory}
        theme={theme}
        themeColors={themeColors}
        accentColor={accentColor}
      />
    </KeyboardAvoidingView>
  );
};

export default NewNote;

// Styles for the NewNote component
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
  buttonContainer: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
    marginBottom: 24,
    marginTop: 16,
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
});
