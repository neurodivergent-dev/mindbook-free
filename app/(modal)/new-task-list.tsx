// This file is create a new task list in the app. It is used in the modal route of the app.
// It is a screen that allows the user to create a new task list by entering a name for the list.
import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Stack, router } from 'expo-router';
import { useTranslation } from 'react-i18next';

export default function NewTaskListScreen() {
  const [name, setName] = useState('');
  const { theme, themeColors, accentColor } = useTheme();
  const { t } = useTranslation();

  const createList = async () => {
    if (!name.trim()) {
      // Show alert for empty task list name
      Alert.alert(t('common.error'), t('notes.emptyTaskListError'), [
        { text: t('common.ok'), style: 'default' },
      ]);
      return;
    }

    try {
      const storedLists = await AsyncStorage.getItem('taskLists');
      const lists = storedLists ? JSON.parse(storedLists) : [];

      const newList = {
        id: Date.now().toString(),
        name: name.trim(),
        createdAt: new Date(),
        completedTasks: 0,
        totalTasks: 0,
      };

      const updatedLists = [...lists, newList];
      await AsyncStorage.setItem('taskLists', JSON.stringify(updatedLists));

      router.back();
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Stack.Screen
        options={{
          title: t('notes.newTaskList'),
          headerStyle: { backgroundColor: themeColors[accentColor] },
          headerTintColor: '#FFFFFF',
          headerShadowVisible: false,
        }}
      />

      <View style={[styles.card, { backgroundColor: theme.card }]}>
        <View style={styles.inputContainer}>
          <Ionicons name="list" size={24} color={themeColors[accentColor]} />
          <TextInput
            style={[styles.input, { color: theme.text }]}
            value={name}
            onChangeText={setName}
            placeholder={t('notes.taskName')}
            placeholderTextColor={theme.textSecondary}
          />
        </View>
      </View>

      <TouchableOpacity
        style={[styles.createButton, { backgroundColor: themeColors[accentColor] }]}
        onPress={createList}
      >
        <Text style={styles.createButtonText}>{t('common.create')}</Text>
      </TouchableOpacity>
    </View>
  );
}

// Styles for the component
// This is a simple style sheet for the component. It uses the StyleSheet API from React Native to create styles.
const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    elevation: 2,
    padding: 16,
    shadowColor: '#000' as string,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  container: {
    flex: 1,
    padding: 16,
  },
  createButton: {
    alignItems: 'center',
    borderRadius: 12,
    marginTop: 16,
    padding: 16,
  },
  createButtonText: {
    color: 'white' as string,
    fontSize: 16,
    fontWeight: '600',
  },
  input: {
    flex: 1,
    fontSize: 16,
    padding: 8,
  },
  inputContainer: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
  },
});
