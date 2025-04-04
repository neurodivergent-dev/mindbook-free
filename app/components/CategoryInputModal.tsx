// This component is a modal that allows users to input a new category name.
// It includes a text input field and a save button.
import { useState, memo } from 'react';
import {
  View,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Text,
  KeyboardAvoidingView,
  Platform,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

const Colors = {
  white: '#fff',
};

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
  theme: Theme;
  themeColors: Record<string, string>;
  accentColor: string;
  fullScreen?: boolean;
}

const CategoryInputModal = memo(
  ({ visible, onClose, onAdd, theme, themeColors, accentColor }: CategoryInputModalProps) => {
    const [categoryText, setCategoryText] = useState('');
    const { t } = useTranslation();

    if (!visible) return null;

    const handleSubmit = () => {
      if (categoryText.trim()) {
        onAdd(categoryText.trim());
        setCategoryText('');
      }
    };

    return (
      <Modal visible={visible} transparent={false} animationType="slide" onRequestClose={onClose}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={[styles.container, { backgroundColor: theme.background }]}
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={[styles.title, { color: theme.text }]}>{t('notes.addCategory')}</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={30} color={theme.text} />
            </TouchableOpacity>
          </View>

          {/* Input field */}
          <View style={styles.inputContainer}>
            <TextInput
              style={[
                styles.input,
                {
                  color: theme.text,
                  backgroundColor: theme.background,
                  borderColor: theme.border,
                },
              ]}
              placeholder={t('notes.categoryName')}
              placeholderTextColor={theme.textSecondary}
              value={categoryText}
              onChangeText={setCategoryText}
              autoFocus={true}
              onSubmitEditing={handleSubmit}
            />
          </View>

          {/* Save button */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[
                styles.saveButton,
                {
                  backgroundColor: themeColors[accentColor],
                },
              ]}
              onPress={handleSubmit}
            >
              <Text style={styles.saveButtonText}>{t('common.save')}</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    );
  }
);

const styles = StyleSheet.create({
  buttonContainer: {
    alignItems: 'flex-start',
    marginLeft: 20,
  },
  closeButton: {
    padding: 10,
  },
  container: {
    flex: 1,
    padding: 20,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 30,
    marginTop: 16,
  },
  input: {
    borderRadius: 25,
    borderWidth: 1,
    fontSize: 18,
    padding: 16,
  },
  inputContainer: {
    marginBottom: 30,
    paddingHorizontal: 10,
  },
  saveButton: {
    alignItems: 'center',
    borderRadius: 8,
    justifyContent: 'center',
    paddingHorizontal: 30,
    paddingVertical: 12,
  },
  saveButtonText: {
    color: Colors.white,
    fontSize: 18,
    fontWeight: 'bold',
  },
  title: {
    fontSize: 30,
    fontWeight: 'bold',
  },
});

export default CategoryInputModal;
