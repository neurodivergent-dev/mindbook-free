// This file is Tasks screen, which displays a list of task lists.
// It allows users to create new task lists and view existing ones.
import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Stack, router, useFocusEffect } from 'expo-router';
import { useTranslation } from 'react-i18next';

// Define colors as constants
const Colors = {
  white: '#FFFFFF',
  black: '#000',
  transparent: 'transparent',
};

export default function TaskListsScreen() {
  const [taskLists, setTaskLists] = useState([]);
  const { theme, themeColors, accentColor } = useTheme();
  const { t } = useTranslation();

  // Refresh the lists each time the screen gets focus
  useFocusEffect(
    React.useCallback(() => {
      loadTaskLists();
    }, [])
  );

  const loadTaskLists = async () => {
    try {
      const storedLists = await AsyncStorage.getItem('taskLists');
      if (storedLists) {
        const lists = JSON.parse(storedLists);

        setTaskLists(lists);
      }
    } catch (error) {
      console.error('Error loading task lists:', error);
    }
  };

  const renderTaskList = ({ item }) => {
    const completedTasks = item.completedTasks || 0;
    const totalTasks = item.totalTasks || 0;

    const getProgressWidth = () => {
      return totalTasks > 0 ? `${(completedTasks / totalTasks) * 100}%` : '0%';
    };

    return (
      <TouchableOpacity
        style={[styles.listCard, { backgroundColor: theme.card }]}
        onPress={() => {
          router.push({
            pathname: '/(modal)/task-detail',
            params: { id: item.id },
          });
        }}
      >
        <View style={styles.listHeader}>
          <View style={styles.listTitleContainer}>
            <Ionicons name="checkbox-outline" size={24} color={themeColors[accentColor]} />
            <Text style={[styles.listTitle, { color: theme.text }]}>{item.name}</Text>
          </View>
          <Text style={[styles.taskCount, { color: theme.textSecondary }]}>
            {completedTasks}/{totalTasks}
          </Text>
        </View>

        <View style={[styles.progressBar, { backgroundColor: theme.border + '40' }]}>
          <View
            style={[
              styles.progressFill,
              {
                backgroundColor: themeColors[accentColor],
                width: getProgressWidth(),
              },
            ]}
          />
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Stack.Screen
        options={{
          title: t('notes.taskLists'),
          headerStyle: { backgroundColor: themeColors[accentColor] },
          headerTintColor: Colors.white,
          headerShadowVisible: false,
          headerRight: () => (
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => router.push('/(modal)/new-task-list')}
            >
              <Ionicons name="add" size={24} color={Colors.white} />
            </TouchableOpacity>
          ),
        }}
      />

      <FlashList
        data={taskLists}
        estimatedItemSize={120}
        renderItem={renderTaskList}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={() => {
          const screenHeight = Dimensions.get('window').height;
          return (
            <View
              style={{
                justifyContent: 'center',
                alignItems: 'center',
                minHeight: screenHeight * 0.8,
              }}
            >
              <Ionicons
                name="checkbox"
                size={64}
                color={themeColors[accentColor]}
                style={styles.emptyIcon}
              />
              <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
                {t('notes.noTasksYet')}
              </Text>
              <TouchableOpacity
                style={[styles.createButton, { backgroundColor: themeColors[accentColor] }]}
                onPress={() => router.push('/(modal)/new-task-list')}
              >
                <Ionicons
                  name="add"
                  size={24}
                  color={Colors.white}
                  style={styles.createButtonIcon}
                />
                <Text style={styles.createButtonText}>{t('notes.newTaskList')}</Text>
              </TouchableOpacity>
            </View>
          );
        }}
        extraData={[taskLists.length]}
      />
    </View>
  );
}

// It uses React Native components and Expo libraries for navigation and icons.
// The screen displays a list of task lists, each with a progress bar indicating the completion status.
const styles = StyleSheet.create({
  addButton: {
    marginRight: 8,
  },
  container: {
    flex: 1,
  },
  createButton: {
    alignItems: 'center',
    borderRadius: 12,
    elevation: 2,
    flexDirection: 'row',
    height: 48,
    justifyContent: 'center',
    minWidth: 48,
    paddingHorizontal: 20,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  createButtonIcon: {
    marginRight: 8,
  },
  createButtonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  emptyIcon: {
    marginBottom: 16,
  },
  emptyListContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 16,
    marginBottom: 20,
    textAlign: 'center',
  },
  listCard: {
    borderRadius: 12,
    elevation: 2,
    marginBottom: 16,
    padding: 16,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  listContainer: {
    flexGrow: 1,
    padding: 16,
  },
  listHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  listTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  listTitleContainer: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
  },
  progressBar: {
    borderRadius: 2,
    height: 4,
    overflow: 'hidden',
  },
  progressFill: {
    borderRadius: 2,
    height: '100%',
  },
  taskCount: {
    fontSize: 14,
  },
});
