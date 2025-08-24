// This file is Empty State component for React Native applications.
// It provides a visual representation when there are no items to display.
import { View, Text, TouchableOpacity, Dimensions } from 'react-native';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';

// Added interface for props
interface EmptyStateProps {
  icon?: string;
  title: string;
  message?: string;
  heightMultiplier?: number;
  action?: {
    label: string;
    onPress: () => void;
  };
}

export default function EmptyState({
  icon,
  title,
  message,
  heightMultiplier = 0.9,
  action,
}: EmptyStateProps) {
  // Cast useTheme result to any to satisfy TS
  const { theme, themeColors, accentColor } = useTheme() as any;
  const { t } = useTranslation();

  const getEmptyStateIcon = () => {
    // If an icon parameter comes from outside, use it.
    if (icon) {
      return icon;
    }

    // Otherwise use automatic selection
    if (title.includes('Favori') || title.includes('Favorite')) {
      return 'heart-outline';
    } else if (title.includes('Arama') || title.includes('Search')) {
      return 'search';
    } else if (title.includes('Çöp') || title.includes('Trash')) {
      return 'trash-outline';
    } else if (title.includes('Arşiv') || title.includes('Archive')) {
      return 'archive-outline';
    } else if (title.includes('Kasa') || title.includes('Vault') || title.includes('emptyVault')) {
      return 'lock-closed';
    } else if (
      title.includes('Not bulunamadı') ||
      title.includes('notesNotFound') ||
      title.includes('No notes found')
    ) {
      return 'document-text';
    }
    return 'document-text';
  };

  const getEmptyStateTitle = () => {
    if (title.includes('Favori') || title.includes('Favorite')) {
      return t('notes.emptyFavorites');
    } else if (title.includes('Not bulunamadı') || title.includes('No notes found')) {
      return t('notes.emptyNotes');
    } else if (title.includes('kategorisinde not bulunamadı') || title.includes('category')) {
      return t('notes.emptyCategoryNotes', { category: title.split(' ')[0] });
    }
    return title;
  };

  const getEmptyStateMessage = () => {
    if (title.includes('Favori') || title.includes('Favorite')) {
      return t('notes.emptyFavoritesMessage');
    } else if (title.includes('Arşiv') || title.includes('Archive')) {
      return t('notes.emptyArchiveMessage');
    } else if (title.includes('Not bulunamadı') || title.includes('No notes found')) {
      return t('notes.emptyNotesMessage');
    } else if (title.includes('kategorisinde not bulunamadı') || title.includes('category')) {
      return t('notes.emptyCategoryMessage');
    }
    return message;
  };

  const shouldUseIonicons = () => {
    // First check if an icon is assigned directly (as a prop)
    if (icon) {
      return (
        icon === 'trash-outline' ||
        icon === 'trash-bin-outline' ||
        icon === 'archive-outline' ||
        icon === 'heart-outline' ||
        icon === 'lock-closed' ||
        icon === 'document-text'
      );
    }

    // Then check the content
    return (
      title.includes('Çöp') ||
      title.includes('Trash') ||
      title.includes('Arşiv') ||
      title.includes('Archive') ||
      title.includes('Favori') ||
      title.includes('Favorite') ||
      title.includes('Kasa') ||
      title.includes('Vault') ||
      title.includes('emptyVault') ||
      title.includes('Not bulunamadı') ||
      title.includes('notesNotFound') ||
      title.includes('No notes found')
    );
  };

  // Function that checks if notes are empty
  const isEmptyNotesState = () => {
    // if the title has the keyword "notesNotFound" or
    // if title is equal to translation key
    return (
      title.includes('notesNotFound') ||
      title === t('notes.notesNotFound') ||
      title === 'Not bulunamadı' ||
      title === 'No notes found'
    );
  };

  const screenHeight = Dimensions.get('window').height;

  return (
    <View
      style={{
        justifyContent: 'center' as const,
        alignItems: 'center' as const,
        minHeight: screenHeight * heightMultiplier,
        paddingHorizontal: 32 as number,
      }}
    >
      <View style={{ marginBottom: 24 as number }}>
        <View
          style={{
            width: 120 as number,
            height: 120 as number,
            borderRadius: 60 as number,
            backgroundColor: (themeColors[accentColor] + '15') as string,
            justifyContent: 'center' as const,
            alignItems: 'center' as const,
          }}
        >
          {shouldUseIonicons() ? (
            <Ionicons
              name={getEmptyStateIcon() as any}
              size={56}
              color={themeColors[accentColor]}
            />
          ) : (
            <MaterialIcons
              name={getEmptyStateIcon() as any}
              size={56}
              color={themeColors[accentColor]}
            />
          )}
        </View>
      </View>

      <View style={{ marginBottom: 32 as number }}>
        <Text
          style={{
            fontSize: 20 as number,
            fontWeight: '700' as const,
            color: theme.text as string,
            marginBottom: 12 as number,
            textAlign: 'center' as const,
            letterSpacing: 0.5 as number,
          }}
        >
          {getEmptyStateTitle()}
        </Text>

        <Text
          style={{
            fontSize: 15 as number,
            color: theme.textSecondary as string,
            textAlign: 'center' as const,
            lineHeight: 22 as number,
            letterSpacing: 0.3 as number,
          }}
        >
          {getEmptyStateMessage()}
        </Text>
      </View>

      {isEmptyNotesState() && (
        <View>
          <TouchableOpacity
            onPress={() => router.push('/new-note')}
            style={{
              flexDirection: 'row' as const,
              alignItems: 'center' as const,
              backgroundColor: themeColors[accentColor] as string,
              paddingHorizontal: 20 as number,
              paddingVertical: 12 as number,
              borderRadius: 12 as number,
              gap: 8 as number,
              elevation: 2 as number,
              shadowColor: '#000' as string,
              shadowOffset: { width: 0 as number, height: 1 as number },
              shadowOpacity: 0.2 as number,
              shadowRadius: 1.41 as number,
            }}
          >
            <MaterialIcons name="add-circle" size={22} color="#FFFFFF" />
            <Text
              style={{
                color: '#FFFFFF' as string,
                fontWeight: '600' as const,
                fontSize: 15 as number,
              }}
            >
              {t('notes.createNote')}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {action && (
        <View>
          <TouchableOpacity
            onPress={action.onPress}
            style={{
              flexDirection: 'row' as const,
              alignItems: 'center' as const,
              backgroundColor: themeColors[accentColor] as string,
              paddingHorizontal: 20 as number,
              paddingVertical: 12 as number,
              borderRadius: 12 as number,
              gap: 8 as number,
              elevation: 2 as number,
              shadowColor: '#000' as string,
              shadowOffset: { width: 0 as number, height: 1 as number },
              shadowOpacity: 0.2 as number,
              shadowRadius: 1.41 as number,
            }}
          >
            <MaterialIcons name="arrow-forward" size={22} color="#FFFFFF" />
            <Text
              style={{
                color: '#FFFFFF' as string,
                fontWeight: '600' as
                  | '100'
                  | '200'
                  | '300'
                  | '400'
                  | '500'
                  | '600'
                  | '700'
                  | '800'
                  | '900'
                  | 'bold'
                  | 'normal',
                fontSize: 15 as number,
              }}
            >
              {action.label}
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}
