// expo-router: (tabs) layout
import {
  Platform,
  View,
  TextInput,
  TouchableOpacity,
  Text,
  StyleSheet,
  Pressable,
} from 'react-native';
import { Tabs, useSegments, Link } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { StatusBar } from 'expo-status-bar';
import { useState, useEffect } from 'react';
import { useSearch } from '../context/SearchContext';
import Animated, { FadeInRight, FadeOutRight } from 'react-native-reanimated';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import { useTranslation } from 'react-i18next';

// We define custom properties by extending the global type
declare global {
  interface Window {
    toggleDrawer?: () => void;
    toggleFavorites?: () => void;
    toggleSort?: () => void;
    setSortOption?: (option: string) => void;
    showFavorites?: boolean;
    toggleFullScreen?: () => void;
    checkContentAndToggleFullScreen?: () => void;
    saveNewNote?: () => void;
    resetNewNote?: () => void;
    toggleFocusMode?: () => void;
    showAIGenerator?: () => void;
    copyContent?: () => void;
  }
}

// Fixed colors
const COLORS = {
  white: '#FFFFFF',
  transparent: 'transparent',
  black: '#000000',
  shadowColor: '#000000',
  whiteSemiTransparent: 'rgba(255,255,255,0.15)',
  whiteTintTransparent: 'rgba(255,255,255,0.7)',
  blackOverlay: 'rgba(0,0,0,0.05)',
  blackDivider: 'rgba(0,0,0,0.1)',
};

export default function TabLayout() {
  const { theme, accentColor, themeColors } = useTheme();
  const { showSearch, setShowSearch, searchQuery, setSearchQuery } = useSearch();
  const [isSearchActive, setIsSearchActive] = useState(false);
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [sortBy, setSortBy] = useState('date');
  const [showNewNoteMenu, setShowNewNoteMenu] = useState(false);
  const segments = useSegments();
  const { t } = useTranslation();

  useEffect(() => {}, [segments]);

  const isNotesScreen = () => {
    return segments[0] === '(tabs)';
  };

  const toggleSearch = () => {
    setIsSearchActive(!isSearchActive);
    setShowSearch(!showSearch);
    if (isSearchActive) {
      setSearchQuery('');
    }
  };

  useEffect(() => {
    window.toggleSort = () => {
      setShowSortMenu(prev => !prev);
    };
    window.setSortOption = option => {
      setSortBy(option);
    };
  }, []);

  const panGesture = Gesture.Pan()
    .activeOffsetX(10)
    .onStart(event => {
      if (event.x < 20 && isNotesScreen()) {
        window.toggleDrawer?.();
      }
    });

  const handleSort = (option: string) => {
    setSortBy(option);
    setShowSortMenu(false);
    if (window.setSortOption) {
      window.setSortOption(option);
    }
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
    },
    headerButton: {
      marginRight: 4,
      padding: 4,
    },
    headerRightContainer: {
      flexDirection: 'row',
      gap: 12,
      marginRight: 8,
    },
    headerRow: {
      alignItems: 'center',
      flexDirection: 'row',
      gap: 8,
    },
    headerTitle: {
      color: COLORS.white,
      fontSize: 20,
      fontWeight: '600',
    },
    infoIcon: {
      marginRight: 15,
    },
    lastSortMenuItem: {
      borderBottomWidth: 0,
    },
    menuButton: {
      marginLeft: 16,
    },
    menuOverlay: {
      bottom: -1000,
      left: -1000,
      position: 'absolute',
      right: -1000,
      top: -1000,
      zIndex: 99998,
    },
    newNoteMenuContainer: {
      borderRadius: 12,
      borderWidth: 1,
      elevation: 10,
      minWidth: 160,
      paddingVertical: 8,
      position: 'absolute',
      right: 4,
      shadowColor: '#000',
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity: 0.25,
      shadowRadius: 3.84,
      top: Platform.OS === 'ios' ? 100 : 90,
      zIndex: 99999,
    },
    newNoteMenuItem: {
      alignItems: 'center',
      flexDirection: 'row',
      gap: 12,
      paddingHorizontal: 16,
      paddingVertical: 12,
    },
    newNoteMenuItemDanger: {
      borderTopColor: '#ff475720',
      borderTopWidth: 1,
    },
    newNoteMenuText: {
      fontSize: 14,
      fontWeight: '500',
    },
    searchBackButton: {
      alignItems: 'center',
      backgroundColor: COLORS.whiteSemiTransparent,
      borderRadius: 12,
      height: 40,
      justifyContent: 'center',
      width: 40,
    },
    searchHeader: {
      alignItems: 'center',
      flexDirection: 'row',
      gap: 12,
      height: Platform.OS === 'ios' ? 110 : 100,
      paddingHorizontal: 16,
      paddingTop: Platform.OS === 'ios' ? 50 : 40,
    },
    searchInput: {
      color: COLORS.white,
      flex: 1,
      fontSize: 16,
      height: '100%',
      padding: 0,
    },
    searchInputContainer: {
      alignItems: 'center',
      backgroundColor: COLORS.whiteSemiTransparent,
      borderRadius: 12,
      flex: 1,
      flexDirection: 'row',
      gap: 8,
      height: 40,
      paddingHorizontal: 12,
    },
    searchOverlay: {
      left: 0,
      position: 'absolute',
      right: 0,
      top: 0,
      zIndex: 1000,
    },
    sortMenuContainer: {
      borderRadius: 12,
      borderWidth: 1,
      elevation: 5,
      position: 'absolute',
      right: 16,
      shadowColor: COLORS.shadowColor,
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity: 0.25,
      shadowRadius: 3.84,
      top: Platform.OS === 'ios' ? 100 : 90,
      width: 200,
      zIndex: 1000,
    },
    sortMenuItem: {
      alignItems: 'center',
      borderBottomColor: COLORS.blackDivider,
      borderBottomWidth: 0.5,
      flexDirection: 'row',
      justifyContent: 'space-between',
      padding: 12,
    },
    sortMenuText: {
      fontSize: 14,
    },
  });

  return (
    <GestureDetector gesture={panGesture}>
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <StatusBar style="light" />

        <Tabs
          screenOptions={{
            headerStyle: {
              backgroundColor: themeColors[accentColor],
              height: Platform.OS === 'ios' ? 110 : 100,
            },
            headerTitleStyle: {
              color: COLORS.white,
              fontSize: 20,
              fontWeight: '600',
            },
            headerTintColor: COLORS.white,
            headerTitleAlign: 'left',
            headerShadowVisible: false,
            tabBarStyle: {
              backgroundColor: theme.background,
              borderTopColor: theme.border,
            },
            tabBarActiveTintColor: themeColors[accentColor],
            tabBarInactiveTintColor: theme.text + '80',
          }}
        >
          <Tabs.Screen
            name="index"
            options={{
              title: t('notes.myNotes'),
              headerTitle: () => (
                <View style={styles.headerRow}>
                  <Ionicons name="document-text" size={24} color={COLORS.white} />
                  <Text style={styles.headerTitle}>{t('notes.myNotes')}</Text>
                </View>
              ),
              headerLeft: () => {
                const showMenu = isNotesScreen();
                return showMenu ? (
                  <TouchableOpacity
                    onPress={() => window.toggleDrawer?.()}
                    style={styles.menuButton}
                  >
                    <Ionicons name="menu" size={24} color={COLORS.white} />
                  </TouchableOpacity>
                ) : null;
              },
              headerRight: () => (
                <View style={styles.headerRightContainer}>
                  <TouchableOpacity onPress={toggleSearch}>
                    <Ionicons name="search" size={24} color={COLORS.white} />
                  </TouchableOpacity>
                </View>
              ),
              tabBarIcon: ({ color }) => <Ionicons name="document-text" size={24} color={color} />,
            }}
          />
          <Tabs.Screen
            name="favorites"
            options={{
              title: t('notes.favorites'),
              headerTitle: () => (
                <View style={styles.headerRow}>
                  <Ionicons name="star" size={24} color={COLORS.white} />
                  <Text style={styles.headerTitle}>{t('notes.favorites')}</Text>
                </View>
              ),
              tabBarIcon: ({ color }) => <Ionicons name="star-outline" size={24} color={color} />,
            }}
          />
          <Tabs.Screen
            name="categories"
            options={{
              title: t('notes.categories'),
              headerTitle: () => (
                <View style={styles.headerRow}>
                  <Ionicons name="folder" size={24} color={COLORS.white} />
                  <Text style={styles.headerTitle}>{t('notes.categories')}</Text>
                </View>
              ),
              tabBarIcon: ({ color }) => <Ionicons name="folder-outline" size={24} color={color} />,
            }}
          />
          <Tabs.Screen
            name="new-note"
            options={{
              title: t('notes.newNote'),
              headerTitle: () => (
                <View style={styles.headerRow}>
                  <Ionicons name="create" size={24} color={COLORS.white} />
                  <Text style={styles.headerTitle}>{t('notes.newNote')}</Text>
                </View>
              ),
              headerRight: () => (
                <View style={styles.headerRightContainer}>
                  <TouchableOpacity
                    onPress={() => setShowNewNoteMenu(!showNewNoteMenu)}
                    style={styles.headerButton}
                  >
                    <Ionicons name="ellipsis-vertical" size={24} color={COLORS.white} />
                  </TouchableOpacity>
                </View>
              ),
              tabBarIcon: ({ color }) => <Ionicons name="create-outline" size={24} color={color} />,
            }}
          />
          <Tabs.Screen
            name="tasks"
            options={{
              title: t('notes.tasks'),
              tabBarLabel: t('notes.tasks'),
              headerTitle: () => (
                <View style={styles.headerRow}>
                  <Ionicons name="checkbox" size={24} color={COLORS.white} />
                  <Text style={styles.headerTitle}>{t('notes.taskLists')}</Text>
                </View>
              ),
              tabBarIcon: ({ color }) => (
                <Ionicons name="checkbox-outline" size={24} color={color} />
              ),
            }}
          />
          <Tabs.Screen
            name="settings"
            options={{
              title: t('settings.settings'),
              headerTitle: () => (
                <View style={styles.headerRow}>
                  <Ionicons name="cog" size={24} color={COLORS.white} />
                  <Text style={styles.headerTitle}>{t('settings.settings')}</Text>
                </View>
              ),
              tabBarIcon: ({ color }) => <Ionicons name="cog-outline" size={24} color={color} />,
            }}
          />
          <Tabs.Screen
            name="performance-test"
            options={{
              title: t('tabs.performance') || 'Performance',
              tabBarIcon: ({ color }) => <Ionicons name="analytics" color={color} />,
              headerRight: () => (
                <Link href="/about" asChild>
                  <Pressable style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1 })}>
                    <Ionicons
                      name="information-circle-outline"
                      size={25}
                      color={themeColors[accentColor]}
                      style={styles.infoIcon}
                    />
                  </Pressable>
                </Link>
              ),
            }}
          />
        </Tabs>

        {isSearchActive && (
          <Animated.View style={styles.searchOverlay}>
            <Animated.View
              entering={FadeInRight.duration(200)}
              exiting={FadeOutRight.duration(200)}
              style={[styles.searchHeader, { backgroundColor: themeColors[accentColor] }]}
            >
              <TouchableOpacity onPress={toggleSearch} style={styles.searchBackButton}>
                <Ionicons name="arrow-back" size={22} color={COLORS.white} />
              </TouchableOpacity>

              <View style={styles.searchInputContainer}>
                <Ionicons name="search" size={20} color={COLORS.whiteTintTransparent} />
                <TextInput
                  placeholder={t('notes.searchNotes')}
                  placeholderTextColor={COLORS.whiteTintTransparent}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  style={styles.searchInput}
                  autoFocus
                />
                {searchQuery.length > 0 && (
                  <TouchableOpacity
                    onPress={() => setSearchQuery('')}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Ionicons name="close-circle" size={20} color={COLORS.whiteTintTransparent} />
                  </TouchableOpacity>
                )}
              </View>
            </Animated.View>
          </Animated.View>
        )}

        {showSortMenu && (
          <View
            style={[
              styles.sortMenuContainer,
              { backgroundColor: theme.background, borderColor: theme.border },
            ]}
          >
            <TouchableOpacity
              style={[
                styles.sortMenuItem,
                { backgroundColor: sortBy === 'date' ? COLORS.blackOverlay : COLORS.transparent },
              ]}
              onPress={() => handleSort('date')}
            >
              <Text style={[styles.sortMenuText, { color: theme.text }]}>By Date (New-Old)</Text>
              {sortBy === 'date' && (
                <Ionicons name="checkmark" size={20} color={themeColors[accentColor]} />
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.sortMenuItem,
                {
                  backgroundColor: sortBy === 'date-asc' ? COLORS.blackOverlay : COLORS.transparent,
                },
              ]}
              onPress={() => handleSort('date-asc')}
            >
              <Text style={[styles.sortMenuText, { color: theme.text }]}>By Date (Old-New)</Text>
              {sortBy === 'date-asc' && (
                <Ionicons name="checkmark" size={20} color={themeColors[accentColor]} />
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.sortMenuItem,
                { backgroundColor: sortBy === 'title' ? COLORS.blackOverlay : COLORS.transparent },
              ]}
              onPress={() => handleSort('title')}
            >
              <Text style={[styles.sortMenuText, { color: theme.text }]}>By Name (A-Z)</Text>
              {sortBy === 'title' && (
                <Ionicons name="checkmark" size={20} color={themeColors[accentColor]} />
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.sortMenuItem,
                styles.lastSortMenuItem,
                {
                  backgroundColor:
                    sortBy === 'title-desc' ? COLORS.blackOverlay : COLORS.transparent,
                },
              ]}
              onPress={() => handleSort('title-desc')}
            >
              <Text style={[styles.sortMenuText, { color: theme.text }]}>By Name (Z-A)</Text>
              {sortBy === 'title-desc' && (
                <Ionicons name="checkmark" size={20} color={themeColors[accentColor]} />
              )}
            </TouchableOpacity>
          </View>
        )}

        {showNewNoteMenu && (
          <>
            <TouchableOpacity
              style={styles.menuOverlay}
              onPress={() => setShowNewNoteMenu(false)}
              activeOpacity={1}
            />
            <View
              style={[
                styles.newNoteMenuContainer,
                { backgroundColor: theme.background, borderColor: theme.border },
              ]}
            >
              <TouchableOpacity
                style={styles.newNoteMenuItem}
                onPress={() => {
                  setShowNewNoteMenu(false);
                  // Focus mode functionality will be handled by the new-note page
                  if (window.toggleFocusMode) {
                    window.toggleFocusMode();
                  }
                }}
              >
                <Ionicons name="contract-outline" size={20} color={theme.text} />
                <Text style={[styles.newNoteMenuText, { color: theme.text }]}>
                  {t('common.focusMode')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.newNoteMenuItem}
                onPress={() => {
                  setShowNewNoteMenu(false);
                  if (window.checkContentAndToggleFullScreen) {
                    window.checkContentAndToggleFullScreen();
                  }
                }}
              >
                <Ionicons name="expand-outline" size={20} color={theme.text} />
                <Text style={[styles.newNoteMenuText, { color: theme.text }]}>
                  {t('common.readingMode')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.newNoteMenuItem}
                onPress={() => {
                  setShowNewNoteMenu(false);
                  if (window.copyContent) {
                    window.copyContent();
                  }
                }}
              >
                <Ionicons name="copy-outline" size={20} color={theme.text} />
                <Text style={[styles.newNoteMenuText, { color: theme.text }]}>
                  {t('common.copy')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.newNoteMenuItem}
                onPress={() => {
                  setShowNewNoteMenu(false);
                  // Save functionality will be handled by the new-note page
                  if (window.saveNewNote) {
                    window.saveNewNote();
                  }
                }}
              >
                <Ionicons name="save-outline" size={20} color={theme.text} />
                <Text style={[styles.newNoteMenuText, { color: theme.text }]}>
                  {t('common.save')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.newNoteMenuItem, styles.newNoteMenuItemDanger]}
                onPress={() => {
                  setShowNewNoteMenu(false);
                  // Reset functionality will be handled by the new-note page
                  if (window.resetNewNote) {
                    window.resetNewNote();
                  }
                }}
              >
                <Ionicons name="refresh-outline" size={20} color="#ff4757" />
                <Text style={[styles.newNoteMenuText, { color: '#ff4757' }]}>
                  {t('common.reset')}
                </Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </View>
    </GestureDetector>
  );
}
