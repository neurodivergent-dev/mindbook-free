// This component is a professional page that allows users to input and manage category names.
// It features elegant design, smooth keyboard handling, and full-page layout.
// Converted from modal to full page layout
import React, { useState, memo, useRef, useEffect } from 'react';
import {
  View,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Text,
  Platform,
  StatusBar,
  KeyboardAvoidingView,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTheme } from '../context/ThemeContext';
import {
  addCategory,
  updateCategory,
} from '../utils/storage';
import { Alert } from 'react-native';
import { emitCategoryAdded, emitCategoryUpdated } from '../utils/categoryEvents';

// Constants
const MAX_CATEGORY_LENGTH = 30;
const MIN_CATEGORY_LENGTH = 1;

interface CategoryInputPageProps {
  onAdd?: (categoryName: string) => void;
  onEdit?: (oldName: string, newName: string) => void;
}

const COLORS = {
  black: '#000000',
  white: '#FFFFFF',
  danger: '#EF4444',
};

const CategoryInputPage = memo(() => {
  const { theme, themeColors, accentColor } = useTheme();
  const [categoryText, setCategoryText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationError, setValidationError] = useState('');
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams();
  
  // Get mode and editing category from params
  const mode = (params.mode as 'add' | 'edit') || 'add';
  const editingCategory = (params.editingCategory as string) || '';

  // Input ref for focus management
  const inputRef = useRef<TextInput>(null);

  // Validate category name in real-time
  const validateCategoryName = (text: string) => {
    if (!text.trim()) {
      return t('notes.emptyCategoryError');
    }
    if (text.length > MAX_CATEGORY_LENGTH) {
      return t('notes.categoryTooLong');
    }
    if (text.trim().length < MIN_CATEGORY_LENGTH) {
      return t('notes.categoryTooShort');
    }
    return '';
  };

  // Handle text change with validation
  const handleTextChange = (text: string) => {
    setCategoryText(text);
    const error = validateCategoryName(text);
    setValidationError(error);
  };

  // Set initial text when editing
  useEffect(() => {
    if (mode === 'edit' && editingCategory) {
      setCategoryText(editingCategory);
      setValidationError('');
    } else {
      setCategoryText('');
      setValidationError('');
    }
  }, [mode, editingCategory]);

  // Focus input when component mounts
  useEffect(() => {
    setTimeout(() => {
      inputRef.current?.focus();
    }, 100);
  }, []);

  const handleSubmit = async () => {
    const trimmedText = categoryText.trim();
    const error = validateCategoryName(trimmedText);

    if (error) {
      setValidationError(error);
      return;
    }

    setIsSubmitting(true);

    try {
      if (mode === 'edit' && editingCategory) {
        await updateCategory(editingCategory, trimmedText);
        // Emit event for other screens to update
        emitCategoryUpdated(editingCategory, trimmedText);
      } else {
        await addCategory(trimmedText);
        // Emit event for other screens to update
        emitCategoryAdded(trimmedText);
      }

      router.back();
    } catch (error: unknown) {
      if (error instanceof Error && error.message === 'Category name too long') {
        Alert.alert(t('common.error'), t('notes.categoryTooLong'));
      } else if (error instanceof Error && error.message === 'Category already exists') {
        Alert.alert(t('common.error'), t('notes.addCategoryError'));
      } else if (error instanceof Error && error.message === 'Category name cannot be empty') {
        Alert.alert(t('common.error'), t('notes.emptyCategoryError'));
      } else {
        Alert.alert(t('common.error'), mode === 'edit' ? t('notes.editCategoryError') : t('notes.addCategoryError'));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    router.back();
  };

  const remainingChars = MAX_CATEGORY_LENGTH - categoryText.length;
  const isValid = !validationError && categoryText.trim().length >= MIN_CATEGORY_LENGTH;
  const showCharCounter = categoryText.length > MAX_CATEGORY_LENGTH * 0.7;

  const charCounterColor = remainingChars < 5 ? COLORS.danger : theme.textSecondary;

  const inputBorderColor = validationError
    ? COLORS.danger
    : categoryText.length > 0
    ? themeColors[accentColor]
    : theme.border;

  const submitButtonBg = isValid && !isSubmitting ? themeColors[accentColor] : theme.background;
  const submitButtonShadowOpacity = isValid && !isSubmitting ? 0.2 : 0;
  const submitButtonElevation = isValid && !isSubmitting ? 5 : 0;
  const submitButtonTextColor = isValid && !isSubmitting ? COLORS.white : theme.textSecondary;

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar
        backgroundColor={theme.background}
        barStyle={theme.background === '#000000' ? 'light-content' : 'dark-content'}
      />

      {/* Header */}
      <View style={[styles.header, { backgroundColor: themeColors[accentColor], paddingTop: insets.top + 16 }]}>
        <TouchableOpacity
          style={styles.closeButton}
          onPress={handleClose}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="chevron-back" size={24} color={COLORS.white} />
        </TouchableOpacity>

        <View style={styles.headerContent}>
          <Text style={[styles.headerTitle, { color: COLORS.white }]}>
            {mode === 'edit' ? t('notes.editCategory') : t('notes.addCategory')}
          </Text>
        </View>

        <TouchableOpacity
          style={[
            styles.saveButton,
            {
              backgroundColor: isValid && !isSubmitting ? COLORS.white : 'transparent',
              borderColor: isValid && !isSubmitting ? 'transparent' : COLORS.white + '40',
              borderWidth: 1,
              shadowOpacity: submitButtonShadowOpacity,
              elevation: submitButtonElevation,
            },
          ]}
          onPress={handleSubmit}
          disabled={!isValid || isSubmitting}
          activeOpacity={0.8}
        >
          {isSubmitting ? (
            <View style={styles.loadingContainer}>
              <Ionicons name="sync" size={18} color={themeColors[accentColor]} />
            </View>
          ) : (
            <Ionicons
              name={mode === 'edit' ? 'checkmark' : 'add'}
              size={20}
              color={isValid && !isSubmitting ? themeColors[accentColor] : COLORS.white}
            />
          )}
        </TouchableOpacity>
      </View>

      {/* Content */}
      <KeyboardAvoidingView
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        <ScrollView
          style={styles.scrollContainer}
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}
          keyboardShouldPersistTaps="handled"
        >
          {/* Description */}
          <View style={styles.descriptionContainer}>
            <Text style={[styles.description, { color: theme.textSecondary }]}>
              {mode === 'edit'
                ? t('notes.editCategoryDescription')
                : t('notes.addCategoryDescription')}
            </Text>
          </View>

          {/* Input Section */}
          <View style={styles.inputSection}>
            <Text style={[styles.inputLabel, { color: theme.text }]}>
              {t('notes.categoryName')}
            </Text>

            <View
              style={[
                styles.inputWrapper,
                {
                  borderColor: inputBorderColor,
                  backgroundColor: theme.card,
                  shadowColor: COLORS.black,
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.05,
                  shadowRadius: 8,
                  elevation: 2,
                },
              ]}
            >
              <TextInput
                ref={inputRef}
                style={[styles.input, { color: theme.text }]}
                placeholder={t('notes.categoryPlaceholder')}
                placeholderTextColor={theme.textSecondary}
                value={categoryText}
                onChangeText={handleTextChange}
                onSubmitEditing={handleSubmit}
                maxLength={MAX_CATEGORY_LENGTH + 5}
                returnKeyType="done"
                editable={!isSubmitting}
                autoCapitalize="words"
                autoCorrect={false}
                selectTextOnFocus={mode === 'edit'}
                blurOnSubmit={false}
              />
              {categoryText.length > 0 && (
                <TouchableOpacity
                  onPress={() => handleTextChange('')}
                  style={styles.clearButton}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons name="close-circle" size={20} color={theme.textSecondary} />
                </TouchableOpacity>
              )}
            </View>

            {/* Validation Error */}
            {validationError ? (
              <View style={styles.errorContainer}>
                <Ionicons name="warning" size={16} color={COLORS.danger} />
                <Text style={styles.errorText}>{validationError}</Text>
              </View>
            ) : null}

            {/* Character Counter */}
            {showCharCounter && (
              <View style={styles.charCounterContainer}>
                <Text style={[styles.charCounter, { color: charCounterColor }]}>
                  {remainingChars} {t('common.charactersRemaining')}
                </Text>
              </View>
            )}
          </View>

          {/* Action Buttons */}
          <View style={styles.actionContainer}>
            <TouchableOpacity
              style={[
                styles.cancelButton,
                {
                  backgroundColor: theme.card,
                  borderColor: theme.border,
                  shadowColor: COLORS.black,
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.05,
                  shadowRadius: 4,
                  elevation: 1,
                },
              ]}
              onPress={handleClose}
              disabled={isSubmitting}
              activeOpacity={0.8}
            >
              <Text style={[styles.cancelButtonText, { color: theme.text }]}>
                {t('common.cancel')}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.submitButton,
                {
                  backgroundColor: submitButtonBg,
                  borderColor: isValid && !isSubmitting ? themeColors[accentColor] : theme.border,
                  borderWidth: 2,
                  shadowColor: isValid && !isSubmitting ? themeColors[accentColor] : COLORS.black,
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: isValid && !isSubmitting ? 0.3 : 0.1,
                  shadowRadius: 8,
                  elevation: isValid && !isSubmitting ? 6 : 2,
                  transform: [{ scale: isValid && !isSubmitting ? 1 : 0.98 }],
                },
              ]}
              onPress={handleSubmit}
              disabled={!isValid || isSubmitting}
              activeOpacity={0.9}
            >
              {isSubmitting ? (
                <View style={styles.loadingContainer}>
                  <View style={styles.loadingSpinner}>
                    <Ionicons name="sync" size={18} color={COLORS.white} />
                  </View>
                  <Text style={[styles.submitButtonText, { color: COLORS.white }]}>
                    {t('common.saving')}...
                  </Text>
                </View>
              ) : (
                <View style={styles.buttonContent}>
                  <Ionicons
                    name={mode === 'edit' ? 'checkmark-circle' : 'add-circle'}
                    size={20}
                    color={submitButtonTextColor}
                  />
                  <Text style={[styles.submitButtonText, { color: submitButtonTextColor }]}>
                    {mode === 'edit' ? t('common.update') : t('common.create')}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
});

const styles = StyleSheet.create({
  actionContainer: {
    flexDirection: 'row',
    gap: 20,
    marginTop: 48,
  },
  buttonContent: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  cancelButton: {
    alignItems: 'center',
    borderRadius: 20,
    borderWidth: 2,
    flex: 1,
    justifyContent: 'center',
    paddingVertical: 20,
  },
  cancelButtonText: {
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  charCounter: {
    fontSize: 13,
    fontWeight: '500',
  },
  charCounterContainer: {
    alignItems: 'flex-end',
    marginTop: 8,
    paddingHorizontal: 4,
  },
  clearButton: {
    marginLeft: 8,
    padding: 4,
  },
  closeButton: {
    alignItems: 'center',
    borderRadius: 12,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: 32,
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
    letterSpacing: 0.2,
    opacity: 0.8,
  },
  descriptionContainer: {
    marginBottom: 40,
    paddingHorizontal: 8,
  },
  errorContainer: {
    alignItems: 'center',
    flexDirection: 'row',
    marginTop: 8,
    paddingHorizontal: 4,
  },
  errorText: {
    color: COLORS.danger,
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 6,
  },
  header: {
    alignItems: 'center',
    borderBottomColor: 'rgba(0,0,0,0.1)',
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingBottom: 16,
    paddingHorizontal: 20,
  },
  headerContent: {
    flex: 1,
    marginHorizontal: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'left',
  },
  input: {
    flex: 1,
    fontSize: 18,
    paddingHorizontal: 0,
    paddingVertical: 20,
    letterSpacing: 0.2,
    fontWeight: '500',
  },
  inputLabel: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 20,
    letterSpacing: 0.3,
  },
  inputSection: {
    marginBottom: 32,
  },
  inputWrapper: {
    alignItems: 'center',
    borderRadius: 20,
    borderWidth: 2,
    flexDirection: 'row',
    minHeight: 64,
    paddingHorizontal: 24,
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  loadingContainer: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  loadingSpinner: {
    marginRight: 8,
  },
  saveButton: {
    alignItems: 'center',
    borderRadius: 12,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  scrollContainer: {
    flex: 1,
  },
  submitButton: {
    alignItems: 'center',
    borderRadius: 20,
    elevation: 5,
    flex: 2,
    justifyContent: 'center',
    paddingVertical: 20,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  submitButtonText: {
    fontSize: 17,
    fontWeight: '700',
    marginLeft: 8,
    letterSpacing: 0.3,
  },
});

CategoryInputPage.displayName = 'CategoryInputPage';

export default CategoryInputPage;