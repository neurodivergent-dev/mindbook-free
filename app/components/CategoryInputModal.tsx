// This component is a professional modal that allows users to input and manage category names.
// It features stable animations, elegant design, and smooth keyboard handling.
// Fixed for Android 15 keyboard issues
import React, { useState, memo, useRef, useEffect } from 'react';
import {
  View,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Text,
  Platform,
  Modal,
  StatusBar,
  Pressable,
  KeyboardAvoidingView,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Constants
const MAX_CATEGORY_LENGTH = 30;
const MIN_CATEGORY_LENGTH = 1;
const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface Theme {
  background: string;
  card: string;
  text: string;
  textSecondary: string;
  border: string;
}

interface CategoryInputModalProps {
  visible: boolean;
  onClose: () => void;
  onAdd: (categoryName: string) => void;
  onEdit?: (oldName: string, newName: string) => void;
  theme: Theme;
  themeColors: Record<string, string>;
  accentColor: string;
  mode?: 'add' | 'edit';
  editingCategory?: string;
}

const COLORS = {
  black: '#000000',
  white: '#FFFFFF',
  danger: '#EF4444',
  overlay: 'rgba(0,0,0,0.4)',
};

const CategoryInputModal = memo(
  ({
    visible,
    onClose,
    onAdd,
    onEdit,
    theme,
    themeColors,
    accentColor,
    mode = 'add',
    editingCategory = '',
  }: CategoryInputModalProps) => {
    const [categoryText, setCategoryText] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [validationError, setValidationError] = useState('');
    const { t } = useTranslation();
    const insets = useSafeAreaInsets();

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
    }, [mode, editingCategory, visible]);

    // Focus input when modal becomes visible
    useEffect(() => {
      if (visible) {
        setTimeout(() => {
          inputRef.current?.focus();
        }, 50);
      }
    }, [visible]);

    if (!visible) return null;

    const handleSubmit = async () => {
      const trimmedText = categoryText.trim();
      const error = validateCategoryName(trimmedText);

      if (error) {
        setValidationError(error);
        return;
      }

      setIsSubmitting(true);

      try {
        if (mode === 'edit' && onEdit && editingCategory) {
          await onEdit(editingCategory, trimmedText);
        } else {
          await onAdd(trimmedText);
        }
        handleClose();
      } catch (error) {
        console.error('Category operation failed:', error);
      } finally {
        setIsSubmitting(false);
      }
    };

    const handleClose = () => {
      setCategoryText('');
      setValidationError('');
      setIsSubmitting(false);
      onClose();
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
      <Modal
        visible={visible}
        transparent={true}
        animationType="none"
        onRequestClose={handleClose}
        statusBarTranslucent={true}
      >
        <StatusBar backgroundColor="rgba(0,0,0,0.4)" barStyle="light-content" />

        {/* Overlay */}
        <View style={styles.overlay}>
          <Pressable style={styles.overlayPress} onPress={handleClose} />
        </View>

        {/* Modal Content with KeyboardAvoidingView */}
        <KeyboardAvoidingView
          style={styles.keyboardAvoidingView}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
        >
          <View style={[styles.container, { paddingBottom: Math.max(insets.bottom, 16) }]}>
            <View style={styles.modalContainer}>
              <View style={[styles.modal, { backgroundColor: theme.card }]}>
                {/* Handle Bar */}
                <View style={styles.handleBar}>
                  <View style={[styles.handle, { backgroundColor: theme.border }]} />
                </View>

                {/* Header */}
                <View style={styles.header}>
                  <View style={styles.headerContent}>
                    <Text style={[styles.title, { color: theme.text }]}>
                      {mode === 'edit' ? t('notes.editCategory') : t('notes.addCategory')}
                    </Text>
                    <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
                      {mode === 'edit'
                        ? t('notes.editCategoryDescription')
                        : t('notes.addCategoryDescription')}
                    </Text>
                  </View>
                </View>

                {/* Content */}
                <View style={styles.content}>
                  {/* Input Container */}
                  <View style={styles.inputContainer}>
                    <Text style={[styles.inputLabel, { color: theme.text }]}>
                      {t('notes.categoryName')}
                    </Text>

                    <View
                      style={[
                        styles.inputWrapper,
                        {
                          borderColor: inputBorderColor,
                          backgroundColor: theme.background,
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
                        <Ionicons name="warning" size={16} color="#EF4444" />
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
                          backgroundColor: theme.background,
                          borderColor: theme.border,
                        },
                      ]}
                      onPress={handleClose}
                      disabled={isSubmitting}
                      activeOpacity={0.7}
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
                          <View style={styles.loadingSpinner}>
                            <Ionicons name="sync" size={18} color="#FFFFFF" />
                          </View>
                          <Text style={styles.submitButtonText}>{t('common.saving')}...</Text>
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
                </View>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    );
  }
);

const styles = StyleSheet.create({
  actionContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  buttonContent: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  cancelButton: {
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 2,
    flex: 1,
    justifyContent: 'center',
    paddingVertical: 16,
  },
  cancelButtonText: {
    fontSize: 17,
    fontWeight: '600',
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
  container: {
    flex: 1,
    justifyContent: 'center',
    pointerEvents: 'box-none',
  },
  content: {
    paddingBottom: 24,
    paddingHorizontal: 24,
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
  handle: {
    borderRadius: 2,
    height: 4,
    opacity: 0.3,
    width: 40,
  },
  handleBar: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  header: {
    paddingBottom: 8,
    paddingHorizontal: 24,
  },
  headerContent: {
    alignItems: 'center',
  },
  input: {
    flex: 1,
    fontSize: 17,
    paddingHorizontal: 0,
    paddingVertical: 14,
  },
  inputContainer: {
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 17,
    fontWeight: '600',
    marginBottom: 12,
  },
  inputWrapper: {
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 2,
    flexDirection: 'row',
    minHeight: 52,
    paddingHorizontal: 16,
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
  modal: {
    borderRadius: 20,
    elevation: 10,
    overflow: 'hidden',
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
  },
  modalContainer: {
    marginHorizontal: 16,
    maxHeight: SCREEN_HEIGHT * 0.8,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: COLORS.overlay,
  },
  overlayPress: {
    flex: 1,
  },
  submitButton: {
    alignItems: 'center',
    borderRadius: 14,
    elevation: 5,
    flex: 2,
    justifyContent: 'center',
    paddingVertical: 16,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  submitButtonText: {
    color: COLORS.white,
    fontSize: 17,
    fontWeight: '700',
    marginLeft: 6,
  },
  subtitle: {
    fontSize: 16,
    lineHeight: 22,
    opacity: 0.8,
    textAlign: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 6,
    textAlign: 'center',
  },
});

export default CategoryInputModal;
