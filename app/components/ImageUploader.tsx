import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Alert, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '../context/ThemeContext';
import { useTranslation } from 'react-i18next';

interface ImageUploaderProps {
  onImageSelect: (imageUri: string) => void;
  selectedImage?: string;
}

export default function ImageUploader({ onImageSelect, selectedImage }: ImageUploaderProps) {
  const { theme, themeColors, accentColor } = useTheme();
  const { t } = useTranslation();
  const [image, setImage] = useState<string | null>(selectedImage || null);

  // selectedImage prop'u değiştiğinde image state'ini güncelle
  useEffect(() => {
    setImage(selectedImage || null);
  }, [selectedImage]);

  const requestPermissions = async () => {
    if (Platform.OS !== 'web') {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(t('notes.permissionRequired'), t('notes.cameraPermissionMessage'), [
          { text: t('common.ok') },
        ]);
        return false;
      }
    }
    return true;
  };

  const pickImage = async () => {
    const hasPermission = await requestPermissions();
    if (!hasPermission) return;

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const imageUri = result.assets[0].uri;
        setImage(imageUri);
        onImageSelect(imageUri);
      }
    } catch (error) {
      Alert.alert(t('common.error'), t('notes.imageSelectionError'));
    }
  };

  const removeImage = () => {
    setImage(null);
    onImageSelect('');
  };

  return (
    <View style={styles.container}>
      <Text style={[styles.label, { color: theme.text }]}>{t('notes.coverImage')}</Text>

      {image ? (
        <View style={styles.imageContainer}>
          <Image source={{ uri: image }} style={styles.image} />
          <TouchableOpacity
            style={[styles.removeButton, { backgroundColor: theme.card }]}
            onPress={removeImage}
          >
            <Ionicons name="close" size={20} color={theme.text} />
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity
          style={[styles.uploadButton, { borderColor: theme.border }]}
          onPress={pickImage}
        >
          <Ionicons name="image-outline" size={32} color={themeColors[accentColor]} />
          <Text style={[styles.uploadText, { color: theme.textSecondary }]}>
            {t('notes.addImage')}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  image: {
    borderRadius: 12,
    height: 200,
    width: '100%',
  },
  imageContainer: {
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  removeButton: {
    alignItems: 'center',
    borderRadius: 16,
    elevation: 3,
    height: 32,
    justifyContent: 'center',
    position: 'absolute',
    right: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    top: 8,
    width: 32,
  },
  uploadButton: {
    alignItems: 'center',
    borderRadius: 12,
    borderStyle: 'dashed',
    borderWidth: 2,
    justifyContent: 'center',
    minHeight: 120,
    padding: 24,
  },
  uploadText: {
    fontSize: 14,
    marginTop: 8,
  },
});
