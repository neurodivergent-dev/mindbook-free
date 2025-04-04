// This file is Drawer Content for the Expo Router app.
// It contains the navigation menu for the app.
import { View, Text, TouchableOpacity, StyleSheet, TextStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSegments } from 'expo-router';
import { useTheme } from '../context/ThemeContext';
import { useTranslation } from 'react-i18next';

const DrawerContent = ({ navigation }) => {
  const { theme, themeColors, accentColor } = useTheme();
  const segments = useSegments();
  const { t } = useTranslation();

  const menuItems = [
    {
      icon: 'document-text-outline',
      label: t('notes.allNotes'),
      route: '/',
    },
    {
      icon: 'checkbox-outline',
      label: t('notes.tasks'),
      route: '/(tabs)/tasks',
    },
    {
      icon: 'heart-outline',
      label: t('notes.favorites'),
      route: '/favorites',
    },
    {
      icon: 'folder-outline',
      label: t('notes.categories'),
      route: '/categories',
    },
    {
      icon: 'trash-outline',
      label: t('notes.trash'),
      route: '/trash',
    },
  ];

  const isActiveRoute = route => {
    // Handle home route special case
    if (route === '/') {
      // Check if we're at the root tabs/index
      return segments.join('/') === '(tabs)/index';
    }

    // For other routes, check if the route path is included in the segments
    const routePath = route.replace(/^\//, '').replace(/\//g, '_');
    return segments.includes(routePath);
  };

  const getActiveMenuItemStyle = isActive => {
    if (!isActive) return null;
    return {
      backgroundColor: `${themeColors[accentColor]}20`,
      borderLeftWidth: 3,
      borderLeftColor: themeColors[accentColor],
    };
  };

  const getTextStyle = (isActive): TextStyle => {
    return {
      color: isActive ? themeColors[accentColor] : theme.text,
      fontWeight: isActive ? '600' : '400',
    };
  };

  const getIconName = (baseIconName, isActive) => {
    if (!isActive) return baseIconName;
    // Only replace if the icon name contains '-outline'
    return baseIconName.includes('-outline') ? baseIconName.replace('-outline', '') : baseIconName;
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {menuItems.map((item, index) => {
        const isActive = isActiveRoute(item.route);
        const iconName = getIconName(item.icon, isActive);
        return (
          <TouchableOpacity
            key={index}
            style={[styles.menuItem, getActiveMenuItemStyle(isActive)]}
            onPress={() => {
              navigation.navigate(item.route);
            }}
          >
            <Ionicons
              name={iconName}
              size={22}
              color={isActive ? themeColors[accentColor] : theme.text}
            />
            <Text style={[styles.menuText, getTextStyle(isActive)]}>{item.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

// Styles for the DrawerContent component
const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 20,
  },
  menuItem: {
    alignItems: 'center',
    borderRadius: 8,
    flexDirection: 'row',
    marginHorizontal: 8,
    marginVertical: 4,
    padding: 12,
    paddingLeft: 16,
  },
  menuText: {
    fontSize: 16,
    marginLeft: 12,
  },
});

export default DrawerContent;
