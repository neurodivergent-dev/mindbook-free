// This file is Task Detail screen, which shows the details of a task list and allows the user to add, edit, delete tasks and mark them as completed.
// It uses React Native components, Expo Router for navigation, and AsyncStorage for data persistence.
import { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Stack, useLocalSearchParams, router } from 'expo-router';
import { useTranslation } from 'react-i18next';

export default function TaskDetailScreen() {
  const { id } = useLocalSearchParams();
  const [list, setList] = useState(null);
  const [todos, setTodos] = useState([]);
  const [newTodo, setNewTodo] = useState('');
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedTodos, setSelectedTodos] = useState({});
  const { theme, themeColors, accentColor, fontSize, fontSizes } = useTheme();
  const { t } = useTranslation();

  useEffect(() => {
    loadList();
    loadTodos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const loadList = async () => {
    try {
      const storedLists = await AsyncStorage.getItem('taskLists');
      if (storedLists) {
        const lists = JSON.parse(storedLists);
        const foundList = lists.find(l => l.id === id);
        if (foundList) {
          setList(foundList);
        }
      }
    } catch (error) {
      return null;
    }
  };

  const loadTodos = async () => {
    try {
      const storedTodos = await AsyncStorage.getItem(`todos_${id}`);
      if (storedTodos) {
        setTodos(JSON.parse(storedTodos));
      }
    } catch (error) {
      return [];
    }
  };

  const updateList = async updatedList => {
    try {
      const storedLists = await AsyncStorage.getItem('taskLists');
      if (storedLists) {
        const lists = JSON.parse(storedLists);
        const updatedLists = lists.map(l => (l.id === id ? updatedList : l));
        await AsyncStorage.setItem('taskLists', JSON.stringify(updatedLists));
      }
    } catch (error) {
      return null;
    }
  };

  const saveTodos = async updatedTodos => {
    try {
      await AsyncStorage.setItem(`todos_${id}`, JSON.stringify(updatedTodos));

      if (list) {
        const completedCount = updatedTodos.filter(todo => todo.completed).length;
        const updatedList = {
          ...list,
          completedTasks: completedCount,
          totalTasks: updatedTodos.length,
        };
        setList(updatedList);
        await updateList(updatedList);
      }
    } catch (error) {
      return null;
    }
  };

  const addTodo = async () => {
    if (!newTodo.trim()) return;

    const todo = {
      id: Date.now().toString(),
      text: newTodo.trim(),
      completed: false,
      createdAt: new Date(),
    };

    const updatedTodos = [...todos, todo];
    setTodos(updatedTodos);
    await saveTodos(updatedTodos);
    setNewTodo('');
  };

  const toggleTodo = async todoId => {
    if (selectionMode) {
      toggleSelection(todoId);
      return;
    }
    const updatedTodos = todos.map(todo =>
      todo.id === todoId ? { ...todo, completed: !todo.completed } : todo
    );
    setTodos(updatedTodos);
    await saveTodos(updatedTodos);
  };

  const toggleSelectionMode = () => {
    setSelectionMode(!selectionMode);
    setSelectedTodos({});
  };

  const toggleSelection = todoId => {
    setSelectedTodos(prev => ({
      ...prev,
      [todoId]: !prev[todoId],
    }));
  };

  const deleteSelectedTodos = () => {
    const selectedIds = Object.keys(selectedTodos).filter(id => selectedTodos[id]);

    if (selectedIds.length === 0) return;

    Alert.alert(
      t('common.warning'),
      t('common.deleteMultipleTasksConfirmation', { count: selectedIds.length }),
      [
        {
          text: t('common.cancel'),
          style: 'cancel',
        },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            const updatedTodos = todos.filter(todo => !selectedTodos[todo.id]);
            setTodos(updatedTodos);
            await saveTodos(updatedTodos);
            setSelectionMode(false);
            setSelectedTodos({});
          },
        },
      ]
    );
  };

  const deleteTodo = async todoId => {
    Alert.alert(t('common.warning'), t('common.deleteTaskConfirmation'), [
      {
        text: t('common.cancel'),
        style: 'cancel',
      },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: async () => {
          const updatedTodos = todos.filter(todo => todo.id !== todoId);
          setTodos(updatedTodos);
          await saveTodos(updatedTodos);
        },
      },
    ]);
  };

  const deleteList = async () => {
    Alert.alert(t('common.warning'), t('common.deleteConfirmation'), [
      {
        text: t('common.cancel'),
        style: 'cancel',
      },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: async () => {
          try {
            // Delete the list
            const storedLists = await AsyncStorage.getItem('taskLists');
            if (storedLists) {
              const lists = JSON.parse(storedLists);
              const updatedLists = lists.filter(l => l.id !== id);
              await AsyncStorage.setItem('taskLists', JSON.stringify(updatedLists));
            }

            // Delete tasks
            await AsyncStorage.removeItem(`todos_${id}`);

            router.back();
          } catch (error) {
            return null;
          }
        },
      },
    ]);
  };

  const renderTodoItem = ({ item }) => (
    <TouchableOpacity
      style={[
        styles.todoItem,
        {
          backgroundColor: theme.card,
          ...(selectionMode && selectedTodos[item.id]
            ? { borderColor: themeColors[accentColor], borderWidth: 2 }
            : {}),
        },
      ]}
      onPress={() => toggleTodo(item.id)}
      onLongPress={() => {
        if (!selectionMode) {
          setSelectionMode(true);
          toggleSelection(item.id);
        }
      }}
    >
      {selectionMode ? (
        <View style={styles.todoCheckbox}>
          <Ionicons
            name={selectedTodos[item.id] ? 'checkbox' : 'square-outline'}
            size={24}
            color={selectedTodos[item.id] ? themeColors[accentColor] : theme.text}
          />
        </View>
      ) : (
        <View style={styles.todoCheckbox}>
          <Ionicons
            name={item.completed ? 'checkmark-circle' : 'radio-button-off'}
            size={24}
            color={item.completed ? themeColors[accentColor] : theme.text}
          />
        </View>
      )}
      <Text
        style={[
          styles.todoText,
          {
            color: theme.text,
            fontSize: fontSizes[fontSize].contentSize,
            textDecorationLine: (item.completed ? 'line-through' : 'none') as
              | 'none'
              | 'line-through'
              | 'underline'
              | 'underline line-through',
            opacity: (item.completed ? 0.7 : 1) as number,
          },
        ]}
      >
        {item.text}
      </Text>
      <TouchableOpacity style={styles.todoDeleteButton} onPress={() => deleteTodo(item.id)}>
        <Ionicons name="trash-outline" size={20} color={theme.textSecondary} />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  if (!list) return null;

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Stack.Screen
        options={{
          title: list.name,
          headerStyle: { backgroundColor: themeColors[accentColor] },
          headerTintColor: '#FFFFFF',
          headerShadowVisible: false,
          headerRight: () => (
            <View style={styles.headerButtonsContainer}>
              {selectionMode ? (
                <>
                  <View style={styles.headerButtonWithMargin} onTouchStart={deleteSelectedTodos}>
                    <Ionicons name="trash-outline" size={26} color="#FFFFFF" />
                  </View>
                  <View style={styles.headerButton} onTouchStart={toggleSelectionMode}>
                    <Ionicons name="close" size={26} color="#FFFFFF" />
                  </View>
                </>
              ) : (
                <>
                  <View style={styles.headerButtonWithMargin} onTouchStart={toggleSelectionMode}>
                    <Ionicons name="checkbox-outline" size={26} color="#FFFFFF" />
                  </View>
                  <View style={styles.headerButton} onTouchStart={deleteList}>
                    <Ionicons name="trash-outline" size={26} color="#FFFFFF" />
                  </View>
                </>
              )}
            </View>
          ),
        }}
      />

      <View style={[styles.progressCard, { backgroundColor: theme.card }]}>
        <Text style={[styles.progressText, { color: theme.text }]}>
          {list.completedTasks} / {list.totalTasks} {t('notes.completed')}
        </Text>
        <View style={[styles.progressBar, { backgroundColor: theme.border + '40' }]}>
          <View
            style={[
              styles.progressFill,
              {
                backgroundColor: themeColors[accentColor],
                width: (list.totalTasks > 0
                  ? `${(list.completedTasks / list.totalTasks) * 100}%`
                  : '0%') as string,
              },
            ]}
          />
        </View>
      </View>

      <View style={[styles.inputContainer, { backgroundColor: theme.card }]}>
        <TextInput
          style={[
            styles.input,
            {
              color: theme.text,
              backgroundColor: theme.background,
            },
          ]}
          value={newTodo}
          onChangeText={setNewTodo}
          placeholder={t('notes.addTask') + '...'}
          placeholderTextColor={theme.textSecondary}
          onSubmitEditing={addTodo}
        />
        <TouchableOpacity
          style={[styles.addButton, { backgroundColor: themeColors[accentColor] }]}
          onPress={addTodo}
        >
          <Ionicons name="add" size={24} color="white" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={todos}
        renderItem={renderTodoItem}
        keyExtractor={item => item.id}
        style={styles.list}
        contentContainerStyle={styles.listContent}
      />
    </View>
  );
}

// Task Detail screen styles
const styles = StyleSheet.create({
  addButton: {
    alignItems: 'center',
    borderRadius: 20,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  container: {
    flex: 1,
  },
  headerButton: {
    alignItems: 'center',
    height: 44,
    justifyContent: 'center',
    padding: 10,
    width: 44,
  },
  headerButtonWithMargin: {
    alignItems: 'center',
    height: 44,
    justifyContent: 'center',
    marginRight: 12,
    padding: 10,
    width: 44,
  },
  headerButtonsContainer: {
    flexDirection: 'row',
    marginRight: 8,
  },
  input: {
    borderRadius: 8,
    flex: 1,
    fontSize: 16,
    marginRight: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  inputContainer: {
    alignItems: 'center',
    borderRadius: 12,
    elevation: 2,
    flexDirection: 'row',
    marginBottom: 16,
    marginHorizontal: 16,
    padding: 16,
    shadowColor: '#000' as string,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingBottom: 24,
  },
  progressBar: {
    borderRadius: 2,
    height: 4,
    overflow: 'hidden',
  },
  progressCard: {
    borderRadius: 12,
    elevation: 2,
    margin: 16,
    padding: 16,
    shadowColor: '#000' as string,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  progressFill: {
    borderRadius: 2,
    height: '100%',
  },
  progressText: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 12,
    textAlign: 'center',
  },
  todoCheckbox: {
    marginRight: 12,
  },
  todoDeleteButton: {
    padding: 5,
  },
  todoItem: {
    alignItems: 'center',
    borderRadius: 12,
    elevation: 2,
    flexDirection: 'row',
    marginBottom: 12,
    marginHorizontal: 16,
    padding: 16,
    shadowColor: '#000' as string,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  todoText: {
    flex: 1,
  },
});
