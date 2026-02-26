// Note Card component for displaying individual notes in a card format.
// This component is designed to be reusable and customizable, allowing for different styles and functionalities.
import { useRef, useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Pressable,
  Animated,
  Alert,
  ScrollView,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { NOTE_COLORS, DARK_NOTE_COLORS } from '../utils/colors';
import { Swipeable } from 'react-native-gesture-handler';
import { moveToTrash, toggleFavorite } from '../utils/storage';
import Markdown from 'react-native-markdown-display';
import { useTranslation } from 'react-i18next';
import * as Haptics from 'expo-haptics';

// Helper function for Markdown content preview
const getPreviewContent = content => {
  if (!content) return '';

  // Clean up Markdown links and images
  const cleanContent = content
    .replace(/!\[.*?\]\(.*?\)/g, '') // Remove image markers completely
    .replace(/\[(.*?)\]\(.*?\)/g, '$1') // Preserve link text, remove URLs
    .replace(/#{1,6}\s/g, '') // Remove heading marks
    .replace(/\*\*(.*?)\*\*/g, '$1') // Convert bold text to plain text
    .replace(/\*(.*?)\*/g, '$1') // Convert italics to plain text
    .replace(/```[\s\S]*?```/g, '[Kod Bloğu]') // Simplify code blocks
    .trim();

  // Fixed character count limitation - consistent preview regardless of font size
  const MAX_CHARS = 60;

  // Cut content to character limit
  const preview =
    cleanContent.length > MAX_CHARS
      ? cleanContent.substring(0, MAX_CHARS).trim() + ' ...'
      : cleanContent;

  return preview;
};

// Reading time calculation (average 200 words/minute)
const calculateReadingTime = content => {
  if (!content) return 0;
  const cleanContent = content
    .replace(/!\[.*?\]\(.*?\)/g, '')
    .replace(/\[(.*?)\]\(.*?\)/g, '$1')
    .replace(/#{1,6}\s/g, '')
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/```[\s\S]*?```/g, '')
    .trim();

  const words = cleanContent.split(/\s+/).filter(word => word.length > 0);
  const wordCount = words.length;
  const minutes = Math.ceil(wordCount / 200);
  return minutes;
};

// Get the URL and alt text of the first image
const getFirstImage = content => {
  if (!content) return null;

  // Support different URL formats using a more comprehensive regex
  // This regex now supports:
  // - Standard markdown images: ![alt](url)
  // - Images with query parameters
  // - Various image formats including SVG, ICO
  // - Both HTTP and HTTPS URLs
  const match = content.match(
    /!\[(.*?)\]\((https?:\/\/[^\s)]+\.(?:png|jpe?g|gif|bmp|webp|svg|ico)(?:\?[^\s)]*)?)\)/i
  );

  if (!match) return null;

  // match[0] = exact match "![alt](url)"
  // match[1] = first group "alt" text
  // match[2] = second group "url"
  const altText = match[1];
  const url = match[2];

  if (!url) return null;

  return { url, altText: altText || 'Image' };
};

// Function to extract all images from content for potential gallery view
const getAllImages = content => {
  if (!content) return [];

  const matches = content.matchAll(
    /!\[(.*?)\]\((https?:\/\/[^\s)]+\.(?:png|jpe?g|gif|bmp|webp|svg|ico)(?:\?[^\s)]*)?)\)/gi
  );

  const images = [];
  for (const match of matches) {
    const altText = match[1];
    const url = match[2];
    if (url) {
      images.push({ url, altText: altText || 'Image' });
    }
  }

  return images;
};

// Function to extract tags (#tag)
const extractTags = content => {
  const tags = [];
  const regex = /(?:^|\s)#(\w+)/g;
  let match;

  while ((match = regex.exec(content)) !== null) {
    if (!tags.includes(match[1])) {
      tags.push(match[1]);
    }
  }

  return tags;
};

export default function NoteCard({
  note,
  onRefresh,
  isSelectionMode = false,
  isSelected = false,
  onLongPress,
  onPress,
  style,
  showReadingTime = true,
  showTags = true,
  showLastEditInfo = true,
  compact = false,
}) {
  const router = useRouter();
  const {
    theme,
    themeColors,
    accentColor,
    fontSize,
    fontSizes,
    fontFamily,
    fontFamilies,
    themeMode,
  } = useTheme();
  const swipeableRef = useRef(null);
  const [imageError, setImageError] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);
  const [showMenu, setShowMenu] = useState(false);
  const { t } = useTranslation();

  const getNoteColors = () => {
    const colors = themeMode === 'dark' ? DARK_NOTE_COLORS : NOTE_COLORS;
    const noteColor = colors[note?.color || 'default'] || colors['default'];

    return {
      background:
        noteColor?.background === 'transparent'
          ? theme?.card
          : noteColor?.background || theme?.card,
      text: noteColor?.text || theme?.text || '#000',
    };
  };

  const handlePress = () => {
    if (isSelectionMode) {
      onPress?.();
    } else {
      router.push(`/(modal)/edit-note?id=${note.id}`);
    }
  };

  const handleEditNote = () => {
    setShowMenu(false);
    router.push(`/(modal)/edit-note?id=${note.id}`);
  };

  const handleFavorite = async () => {
    try {
      await toggleFavorite(note.id);
      onRefresh?.();
    } catch (error) {
      Alert.alert('Error', 'An error occurred while updating the favorite status.');
    }
  };

  const handleDelete = () => {
    // Check if the note is already in the trash
    if (note.isTrash) {
      // If note is in trash, show permanent deletion warning
      Alert.alert(t('common.warning'), t('common.deleteConfirmation'), [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              // Turn off Swipeable in advance
              swipeableRef.current?.close();

              // Permanently delete a note using the deleteNote function
              const { deleteNote } = require('../utils/storage');
              await deleteNote(note.id);

              // Refresh list when operation is successful
              onRefresh?.();

              // Haptic feedback
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            } catch (error) {
              console.error('Permanent delete error:', error);

              // Haptic error feedback
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);

              // Show error message
              Alert.alert(
                t('common.error'),
                error instanceof Error ? error.message : t('notes.permanentDeleteError')
              );
            }
          },
        },
      ]);
    } else {
      // If not in trash, show move to trash prompt
      Alert.alert(t('common.warning'), t('common.deleteConfirmation'), [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              // Turn off Swipeable in advance
              swipeableRef.current?.close();

              // Send note ID
              await moveToTrash(note.id);

              // Refresh list when operation is successful
              onRefresh?.();

              // Haptic feedback
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            } catch (error) {
              console.error('Delete error:', error);

              // Haptic error feedback
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);

              // Show error message
              Alert.alert(
                t('common.error'),
                error instanceof Error ? error.message : t('notes.deleteNoteError')
              );
            }
          },
        },
      ]);
    }
  };

  const renderRightActions = (progress, dragX) => {
    const scale = dragX.interpolate({
      inputRange: [-100, 0],
      outputRange: [1, 0],
      extrapolate: 'clamp',
    });

    return (
      <View style={styles.deleteActionContainer}>
        <Animated.View
          style={[
            styles.deleteAction,
            {
              transform: [{ scale }],
            },
          ]}
        >
          <TouchableOpacity
            style={[styles.deleteButton, { backgroundColor: '#dc2626' as string }]}
            onPress={handleDelete}
          >
            <Ionicons name="trash-outline" size={24} color="#fff" />
          </TouchableOpacity>
        </Animated.View>
      </View>
    );
  };

  const getFormattedDate = dateString => {
    if (!dateString) return '';

    try {
      const date = new Date(dateString);

      // Check if it is a valid date
      if (isNaN(date.getTime())) return '';

      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      // Today
      if (date.toDateString() === today.toDateString()) {
        return (
          t('common.today') +
          ', ' +
          date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        );
      }

      // Yesterday
      if (date.toDateString() === yesterday.toDateString()) {
        return (
          t('common.yesterday') +
          ', ' +
          date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        );
      }

      // Within this year
      if (date.getFullYear() === today.getFullYear()) {
        return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
      }

      // Past years
      return date.toLocaleDateString([], { year: 'numeric', month: 'short', day: 'numeric' });
    } catch (error) {
      return '';
    }
  };

  const getStatusIcon = () => {
    if (note.isTrash) return { name: 'trash-outline' as const, color: '#dc2626', onPress: null };
    if (note.isArchived)
      return { name: 'archive' as const, color: themeColors[accentColor], onPress: null };
    if (note.isFavorite)
      return { name: 'star' as const, color: '#eab308', onPress: handleFavorite };
    return { name: 'star-outline' as const, color: '#6B7280', onPress: handleFavorite };
  };

  const getCategoryColor = () => {
    if (!note.category) return 'transparent';
    return themeColors[accentColor] + '20';
  };

  const getCategoryTextColor = () => {
    if (!note.category) return theme.text;
    return themeColors[accentColor];
  };

  const statusIcon = getStatusIcon();

  // Check if there is an image in the content
  const imageData = useMemo(() => getFirstImage(note.content), [note.content]);

  // Get all images for potential gallery view
  const allImages = useMemo(() => {
    const markdownImages = getAllImages(note.content);
    const coverImage = note.coverImage;

    // If there's a cover image and it's not already in markdown images, add it first
    if (coverImage && !markdownImages.some(img => img.url === coverImage)) {
      return [{ url: coverImage, altText: '' }, ...markdownImages];
    }

    return markdownImages;
  }, [note.content, note.coverImage]);

  // Remove labels
  const tags = useMemo(() => extractTags(note.content), [note.content]);

  // Calculate reading time
  const readingTime = useMemo(() => calculateReadingTime(note.content), [note.content]);

  return (
    <Swipeable
      ref={swipeableRef}
      renderRightActions={renderRightActions}
      rightThreshold={40}
      overshootRight={false}
      friction={2}
      enableTrackpadTwoFingerGesture
    >
      <Animated.View
        style={[
          isSelected && {
            borderWidth: 2 as number,
            borderColor: themeColors[accentColor] + '50',
            shadowColor: themeColors[accentColor],
            shadowOpacity: 0.2 as number,
            padding: 10 as number,
          },
          style,
        ]}
      >
        <Pressable
          onPress={handlePress}
          onLongPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            onLongPress && onLongPress();
          }}
          style={({ pressed }) => [
            styles.container,
            compact ? styles.compactContainer : {},
            {
              backgroundColor: getNoteColors().background,
              opacity: pressed ? 0.95 : 1,
            },
          ]}
        >
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              {note.category && (
                <View style={[styles.categoryBadge, { backgroundColor: getCategoryColor() }]}>
                  <Text
                    style={[styles.categoryText, { color: getCategoryTextColor() }]}
                    numberOfLines={1}
                    ellipsizeMode="tail"
                  >
                    {note.category}
                  </Text>
                </View>
              )}

              {/* Reading time - Hide in compact mode to save space */}
              {!compact && showReadingTime && readingTime > 0 && (
                <View style={[styles.readingTimeBadge, { backgroundColor: getCategoryColor() }]}>
                  <Ionicons name="time-outline" size={12} color={getCategoryTextColor()} />
                  <Text style={[styles.readingTimeText, { color: getCategoryTextColor() }]}>
                    {readingTime} {t('notes.minuteRead')}
                  </Text>
                </View>
              )}
            </View>

            <View style={styles.headerRight}>
              {/* Date - Hide in compact mode to save space */}
              {!compact && showLastEditInfo && (
                <Text style={[styles.dateText, { color: getNoteColors().text + '99' }]}>
                  {getFormattedDate(note.updatedAt)}
                </Text>
              )}
              {statusIcon && (
                <TouchableOpacity
                  onPress={statusIcon.onPress}
                  disabled={!statusIcon.onPress}
                  style={styles.statusIconButton}
                >
                  <Ionicons
                    name={statusIcon.name}
                    size={compact ? 16 : 18}
                    color={statusIcon.color}
                    style={{ opacity: 0.9 as number }}
                  />
                </TouchableOpacity>
              )}
              {!isSelectionMode && (
                <View style={styles.menuContainer}>
                  <TouchableOpacity
                    onPress={() => setShowMenu(!showMenu)}
                    style={styles.menuButton}
                  >
                    <Ionicons
                      name="ellipsis-vertical"
                      size={18}
                      color={getNoteColors().text + 'AA'}
                    />
                  </TouchableOpacity>
                </View>
              )}
              {isSelectionMode && (
                <View
                  style={[
                    styles.checkCircle,
                    themeMode === 'dark' ? styles.checkCircleBase : styles.checkCircleLight,
                    isSelected && {
                      backgroundColor: themeColors[accentColor],
                      borderColor: themeColors[accentColor],
                    },
                  ]}
                >
                  {isSelected && (
                    <Ionicons name="checkmark" size={16} color="#FFFFFF" style={styles.checkIcon} />
                  )}
                </View>
              )}
            </View>
          </View>

          <View style={[styles.content, compact ? styles.compactContent : {}]}>
            <Text
              style={[
                styles.title,
                {
                  color: getNoteColors().text,
                  fontSize: fontSizes[fontSize].titleSize,
                  fontFamily: fontFamilies[fontFamily].family,
                  lineHeight: 24 as number,
                  marginBottom: 6 as number,
                },
                compact ? styles.compactTitle : {},
              ]}
              numberOfLines={compact ? 1 : 2}
            >
              {note.title}
            </Text>

            <View style={[styles.previewContainer, compact ? styles.compactPreviewContainer : {}]}>
              {/* Image Gallery Display */}
              {allImages.length > 0 && !compact && (
                <View
                  style={[
                    styles.imageGalleryContainer,
                    allImages.length === 1 && styles.singleImageContainer,
                    allImages.length > 1 && styles.multiImageContainer,
                  ]}
                >
                  {allImages.slice(0, 3).map((image, index) => (
                    <View
                      key={`image-${index}`}
                      style={[
                        styles.imageGalleryItem,
                        allImages.length === 1 && styles.singleImageItem,
                        allImages.length > 1 && index === 0 && styles.firstImageItem,
                        allImages.length > 1 && index > 0 && styles.additionalImageItem,
                      ]}
                    >
                      {!imageError ? (
                        <>
                          <Image
                            source={{ uri: image.url }}
                            style={[
                              styles.galleryImage,
                              allImages.length === 1 && styles.singleImageStyle,
                              allImages.length > 1 && index === 0 && styles.firstImageStyle,
                              allImages.length > 1 && index > 0 && styles.additionalImageStyle,
                            ]}
                            resizeMode="cover"
                            onLoadStart={() => setImageLoading(true)}
                            onLoad={() => setImageLoading(false)}
                            onLoadEnd={() => setImageLoading(false)}
                            onError={() => {
                              console.log('Image error loading: ', image.url);
                              setImageError(true);
                              setImageLoading(false);
                            }}
                          />
                          {imageLoading && (
                            <View
                              style={[
                                styles.imageLoadingOverlay,
                                { backgroundColor: theme.background + '20' },
                              ]}
                            />
                          )}

                          {/* Image Alt Text Caption */}
                          {image.altText && image.altText !== 'Image' && (
                            <View style={styles.imageCaption}>
                              <Text style={[styles.imageCaptionText, { color: theme.text + '80' }]}>
                                {image.altText}
                              </Text>
                            </View>
                          )}
                        </>
                      ) : (
                        <View
                          style={[
                            styles.imageErrorContainer,
                            { backgroundColor: theme.background + '10' },
                          ]}
                        >
                          <Ionicons name="image-outline" size={24} color={theme.text + '80'} />
                          <Text style={[styles.imageAltText, { color: theme.text + '80' }]}>
                            {t('common.imageError', 'Image could not be loaded')}
                          </Text>
                        </View>
                      )}
                    </View>
                  ))}

                  {/* Show image count indicator if there are more than 3 images */}
                  {allImages.length > 3 && (
                    <View style={styles.imageCountOverlay}>
                      <Text style={styles.imageCountText}>+{allImages.length - 3}</Text>
                    </View>
                  )}
                </View>
              )}

              {/* Image Placeholder for notes that might contain image references */}
              {allImages.length === 0 &&
                note.content &&
                note.content.includes('![') &&
                !compact && (
                  <View
                    style={[styles.imagePlaceholder, { backgroundColor: theme.background + '10' }]}
                  >
                    <Ionicons name="image-outline" size={24} color={theme.text + '60'} />
                    <Text style={[styles.imagePlaceholderText, { color: theme.text + '60' }]}>
                      {t('notes.imagePlaceholder', 'Images will appear here')}
                    </Text>
                  </View>
                )}

              {/* Fallback to single image display for backward compatibility */}
              {imageData && allImages.length === 0 && !compact && (
                <View style={styles.imageContainer}>
                  {!imageError ? (
                    <>
                      <Image
                        source={{ uri: imageData.url }}
                        style={styles.previewImage}
                        resizeMode="cover"
                        onLoadStart={() => setImageLoading(true)}
                        onLoad={() => setImageLoading(false)}
                        onLoadEnd={() => setImageLoading(false)}
                        onError={() => {
                          console.log('Image error loading: ', imageData.url);
                          setImageError(true);
                          setImageLoading(false);
                        }}
                      />
                      {imageLoading && (
                        <View
                          style={[
                            styles.imageLoadingOverlay,
                            { backgroundColor: theme.background + '20' },
                          ]}
                        />
                      )}
                    </>
                  ) : (
                    <View
                      style={[
                        styles.imageErrorContainer,
                        { backgroundColor: theme.background + '10' },
                      ]}
                    >
                      <Ionicons name="image-outline" size={24} color={theme.text + '80'} />
                      <Text style={[styles.imageAltText, { color: theme.text + '80' }]}>
                        {t('common.imageError', 'Image could not be loaded')}
                      </Text>
                    </View>
                  )}
                </View>
              )}

              {/* Content Preview */}
              {compact ? (
                <View
                  style={{ height: fontSizes[fontSize].contentSize * 1.2 * 2, overflow: 'hidden' }}
                >
                  <Text
                    style={{
                      color: getNoteColors().text + 'AA',
                      fontSize: fontSizes[fontSize].contentSize * 0.85,
                      fontFamily: fontFamilies[fontFamily].family,
                      lineHeight: fontSizes[fontSize].contentSize * 1.2,
                    }}
                    numberOfLines={2}
                    ellipsizeMode="tail"
                  >
                    {getPreviewContent(note.content)}
                  </Text>
                </View>
              ) : (
                <Markdown
                  key={`markdown-preview-${note.id}`}
                  style={{
                    body: {
                      color: getNoteColors().text + 'DD',
                      fontSize: fontSizes[fontSize].contentSize,
                      fontFamily: fontFamilies[fontFamily].family,
                      lineHeight: fontSizes[fontSize].contentSize * 1.5,
                    },
                    heading1: {
                      fontSize: fontSizes[fontSize].contentSize * 1.8,
                      fontWeight: 'bold',
                      color: getNoteColors().text,
                      marginVertical: 16,
                      lineHeight: fontSizes[fontSize].contentSize * 2,
                      fontFamily: fontFamilies[fontFamily].family,
                    },
                    heading2: {
                      fontSize: fontSizes[fontSize].contentSize * 1.5,
                      fontWeight: 'bold',
                      color: getNoteColors().text,
                      marginVertical: 12,
                      lineHeight: fontSizes[fontSize].contentSize * 1.8,
                      fontFamily: fontFamilies[fontFamily].family,
                    },
                    heading3: {
                      fontSize: fontSizes[fontSize].contentSize * 1.2,
                      fontWeight: 'bold',
                      color: getNoteColors().text,
                      marginVertical: 8,
                      lineHeight: fontSizes[fontSize].contentSize * 1.5,
                      fontFamily: fontFamilies[fontFamily].family,
                    },
                    link: {
                      color: themeColors[accentColor],
                      textDecorationLine: 'underline',
                    },
                    list_item: {
                      marginVertical: 4,
                      flexDirection: 'row',
                      alignItems: 'flex-start',
                    },
                    bullet_list: {
                      marginVertical: 8,
                    },
                    ordered_list: {
                      marginVertical: 8,
                    },
                    strong: {
                      fontWeight: 'bold',
                      color: getNoteColors().text,
                    },
                    em: {
                      fontStyle: 'italic',
                      color: getNoteColors().text,
                    },
                    blockquote: {
                      backgroundColor: theme.border + '20',
                      borderLeftWidth: 4,
                      borderLeftColor: themeColors[accentColor],
                      paddingHorizontal: 12,
                      paddingVertical: 8,
                      marginVertical: 8,
                    },
                    code_inline: {
                      backgroundColor: theme.border + '30',
                      color: getNoteColors().text,
                      paddingHorizontal: 6,
                      paddingVertical: 2,
                      borderRadius: 4,
                      fontFamily: 'monospace',
                    },
                    code_block: {
                      backgroundColor: '#272822',
                      padding: 12,
                      borderRadius: 8,
                      marginVertical: 8,
                      fontFamily: 'monospace',
                    },
                    fence: {
                      backgroundColor: '#272822',
                      padding: 12,
                      borderRadius: 8,
                      marginVertical: 8,
                      fontFamily: 'monospace',
                    },
                    paragraph: {
                      marginVertical: 8,
                      color: getNoteColors().text,
                    },
                  }}
                >
                  {getPreviewContent(note.content)}
                </Markdown>
              )}
            </View>

            {/* Tags */}
            {showTags && tags.length > 0 && (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.tagsContainer}
                contentContainerStyle={styles.tagsContentContainer}
              >
                {tags.map((tag, index) => (
                  <View
                    key={`tag-${tag}-${index}`}
                    style={[
                      styles.tagBadge,
                      {
                        backgroundColor: themeColors[accentColor] + '20',
                        borderColor: themeColors[accentColor] + '40',
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.tagText,
                        {
                          color: themeColors[accentColor],
                          fontFamily: fontFamilies[fontFamily].family,
                        },
                      ]}
                    >
                      #{tag}
                    </Text>
                  </View>
                ))}
              </ScrollView>
            )}

            {/* Note information subsection */}
            {!compact && (note.favorite || note.isInVault || note.isArchived) && (
              <View style={styles.noteInfo}>
                {note.favorite && (
                  <View style={styles.noteInfoItem}>
                    <Ionicons name="star" size={14} color={themeColors.amber} />
                  </View>
                )}
                {note.isInVault && (
                  <View style={styles.noteInfoItem}>
                    <Ionicons name="lock-closed" size={14} color={themeColors.indigo} />
                  </View>
                )}
                {note.isArchived && (
                  <View style={styles.noteInfoItem}>
                    <Ionicons name="archive" size={14} color={themeColors.blueGrey} />
                  </View>
                )}
              </View>
            )}
          </View>
        </Pressable>

        {/* Menu Dropdown */}
        {showMenu && (
          <>
            <TouchableOpacity
              style={styles.menuOverlay}
              onPress={() => setShowMenu(false)}
              activeOpacity={1}
            />
            <View
              style={[
                styles.menuDropdown,
                { backgroundColor: theme.card, borderColor: theme.border },
              ]}
            >
              <TouchableOpacity onPress={handleEditNote} style={styles.menuItem}>
                <Ionicons name="create-outline" size={20} color={theme.text} />
                <Text style={[styles.menuText, { color: theme.text }]}>{t('notes.editNote')}</Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </Animated.View>
    </Swipeable>
  );
}

// Styles for the NoteCard component
// These styles are used to define the layout and appearance of the component.
const styles = StyleSheet.create({
  additionalImageItem: {
    width: '48%' as string, // Keep additional images at 48% for side-by-side layout
    aspectRatio: 1.1 as number, // Keep aspect ratio for additional images
    marginBottom: 8 as number, // Increased from 4 to 8 for better spacing
  },
  additionalImageStyle: {
    borderRadius: 8 as number,
    height: '100%' as string,
    width: '100%' as string,
  },
  categoryBadge: {
    alignSelf: 'flex-start' as const,
    borderRadius: 20 as number,
    paddingHorizontal: 12 as number,
    paddingVertical: 4 as number,
  },
  categoryText: {
    fontSize: 12 as number,
    fontWeight: '600' as const,
  },
  checkCircle: {
    alignItems: 'center' as const,
    backgroundColor: 'transparent' as string,
    borderColor: '#9CA3AF' as string,
    borderRadius: 11 as number,
    borderWidth: 2 as number,
    height: 22 as number,
    justifyContent: 'center' as const,
    width: 22 as number,
  },
  checkCircleBase: {
    backgroundColor: 'transparent' as string,
    borderColor: '#6B7280' as string,
  },
  checkCircleLight: {
    borderColor: '#9CA3AF' as string,
  },
  checkIcon: {
    marginTop: -1 as number,
  },
  compactContainer: {
    alignSelf: 'center' as const,
    borderRadius: 14 as number,
    marginVertical: 2 as number,
    width: '100%' as string,
  },
  compactContent: {
    padding: 12 as number,
    paddingTop: 4 as number,
  },
  compactPreviewContainer: {
    marginTop: 4 as number,
    maxHeight: 60 as number,
  },
  compactTitle: {
    fontSize: 16 as number,
    marginBottom: 4 as number,
  },
  container: {
    alignSelf: 'center' as const,
    borderRadius: 14 as number,
    elevation: 3 as number,
    marginHorizontal: 0 as number,
    marginVertical: 2 as number,
    overflow: 'hidden' as const,
    shadowColor: '#000' as string,
    shadowOffset: { width: 0, height: 2 } as { width: number; height: number },
    shadowOpacity: 0.1 as number,
    shadowRadius: 8 as number,
    width: '100%' as string,
  },
  content: {
    padding: 16 as number,
    paddingTop: 6 as number,
  },
  dateText: {
    fontSize: 12 as number,
    opacity: 0.8 as number,
  },
  deleteAction: {
    alignItems: 'center' as const,
    height: '100%' as string,
    justifyContent: 'center' as const,
    width: 80 as number,
  },
  deleteActionContainer: {
    alignItems: 'center' as const,
    flexDirection: 'row' as const,
    height: '100%' as string,
    justifyContent: 'flex-end' as const,
    width: 80 as number,
  },
  deleteButton: {
    alignItems: 'center' as const,
    borderRadius: 25 as number,
    height: 50 as number,
    justifyContent: 'center' as const,
    marginRight: 16 as number,
    width: 50 as number,
  },
  firstImageItem: {
    width: '100%' as string, // Changed from 48% to 100% for larger first image
    aspectRatio: 1.8 as number, // Changed from 1.1 to 1.8 for better proportions
    marginBottom: 8 as number, // Increased from 4 to 8 for better spacing
  },
  firstImageStyle: {
    width: '100%' as string,
    height: 180 as number, // Increased from 120 to 180
    borderRadius: 8 as number,
  },
  galleryImage: {
    borderRadius: 8 as number,
    height: '100%' as string,
    width: '100%' as string,
  },
  header: {
    alignItems: 'flex-start' as const,
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    paddingBottom: 4 as number,
    paddingHorizontal: 16 as number,
    paddingTop: 12 as number,
  },
  headerLeft: {
    alignItems: 'center' as const,
    flex: 1 as number,
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    gap: 8 as number,
  },
  headerRight: {
    alignItems: 'center' as const,
    flexDirection: 'row' as const,
    gap: 8 as number,
  },
  imageAltText: {
    fontSize: 14 as number,
    paddingHorizontal: 16 as number,
    textAlign: 'center' as const,
  },
  imageCaption: {
    position: 'absolute' as const,
    bottom: 0 as number,
    left: 0 as number,
    right: 0 as number,
    backgroundColor: 'rgba(0,0,0,0.5)' as string, // Reduced opacity from 0.7 to 0.5
    paddingVertical: 2 as number, // Reduced from 4 to 2
    paddingHorizontal: 8 as number,
    borderBottomLeftRadius: 8 as number,
    borderBottomRightRadius: 8 as number,
    zIndex: 1 as number,
  },
  imageCaptionText: {
    fontSize: 12 as number,
    textAlign: 'center' as const,
  },
  imageContainer: {
    backgroundColor: 'rgba(0,0,0,0.05)' as string,
    borderRadius: 8 as number,
    marginBottom: 8 as number,
    overflow: 'hidden' as const,
  },
  imageCountOverlay: {
    position: 'absolute' as const,
    top: 12 as number, // Increased from 8 to 12 for better positioning
    right: 12 as number, // Increased from 8 to 12 for better positioning
    backgroundColor: 'rgba(0,0,0,0.7)' as string,
    borderRadius: 12 as number,
    paddingHorizontal: 8 as number,
    paddingVertical: 4 as number,
    zIndex: 1 as number,
  },
  imageCountText: {
    color: '#fff' as string,
    fontSize: 12 as number,
    fontWeight: 'bold' as const,
  },
  imageErrorContainer: {
    alignItems: 'center' as const,
    borderRadius: 8 as number,
    gap: 8 as number,
    height: 150 as number,
    justifyContent: 'center' as const,
    width: '100%' as string,
  },
  imageGalleryContainer: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    gap: 4 as number,
    justifyContent: 'space-between' as const,
    marginBottom: 8 as number,
  },
  imageGalleryItem: {
    backgroundColor: 'rgba(0,0,0,0.05)' as string,
    borderRadius: 8 as number,
    overflow: 'hidden' as const,
  },
  imageLoadingOverlay: {
    alignItems: 'center' as const,
    bottom: 0 as number,
    justifyContent: 'center' as const,
    left: 0 as number,
    position: 'absolute' as const,
    right: 0 as number,
    top: 0 as number,
  },
  imagePlaceholder: {
    alignItems: 'center' as const,
    borderRadius: 8 as number,
    justifyContent: 'center' as const,
    marginTop: 8 as number,
    paddingHorizontal: 16 as number,
    paddingVertical: 20 as number,
  },
  imagePlaceholderText: {
    fontSize: 14 as number,
    marginTop: 8 as number,
    textAlign: 'center' as const,
  },
  menuButton: {
    padding: 4 as number,
  },
  menuContainer: {
    position: 'relative' as const,
    zIndex: 1000 as number,
  },
  menuDropdown: {
    borderRadius: 12 as number,
    borderWidth: 1 as number,
    elevation: 5 as number,
    minWidth: 150 as number,
    paddingVertical: 8 as number,
    position: 'absolute' as const,
    right: 8 as number,
    shadowColor: '#000' as string,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25 as number,
    shadowRadius: 3.84 as number,
    top: 45 as number,
    zIndex: 999 as number,
  },
  menuItem: {
    alignItems: 'center' as const,
    flexDirection: 'row' as const,
    gap: 12 as number,
    paddingHorizontal: 16 as number,
    paddingVertical: 12 as number,
  },
  menuOverlay: {
    bottom: -1000 as number,
    left: -1000 as number,
    position: 'absolute' as const,
    right: -1000 as number,
    top: -1000 as number,
    zIndex: 998 as number,
  },
  menuText: {
    fontSize: 14 as number,
    fontWeight: '500' as const,
  },
  multiImageContainer: {
    flexDirection: 'column' as const, // Changed from 'row' to 'column' for better layout
    alignItems: 'stretch' as const, // Changed from 'center' to 'stretch'
    justifyContent: 'flex-start' as const, // Changed from 'space-between' to 'flex-start'
    marginBottom: 8 as number,
    gap: 8 as number, // Increased from 4 to 8 for better spacing
  },
  noteInfo: {
    flexDirection: 'row' as const,
    gap: 12 as number,
    marginTop: 12 as number,
  },
  noteInfoItem: {
    alignItems: 'center' as const,
    flexDirection: 'row' as const,
    gap: 4 as number,
  },
  previewContainer: {
    marginTop: 8 as number,
    maxHeight: 300 as number, // Increased from 150 to 300 to accommodate larger images
    overflow: 'hidden' as const,
  },
  previewImage: {
    backgroundColor: 'transparent' as string,
    height: 150 as number,
    width: '100%' as string,
  },
  readingTimeBadge: {
    alignItems: 'center' as const,
    borderRadius: 20 as number,
    flexDirection: 'row' as const,
    gap: 4 as number,
    paddingHorizontal: 12 as number,
    paddingVertical: 4 as number,
  },
  readingTimeText: {
    fontSize: 11 as number,
    fontWeight: '500' as const,
  },
  singleImageContainer: {
    alignItems: 'center' as const,
    flexDirection: 'column' as const,
    justifyContent: 'center' as const,
    marginBottom: 8 as number,
  },
  singleImageItem: {
    width: '100%' as string,
    aspectRatio: 1.5 as number, // Changed from 1.2 to 1.5 for better proportions
    marginBottom: 4 as number,
  },
  singleImageStyle: {
    width: '100%' as string,
    height: 250 as number, // Increased from 180 to 250
    borderRadius: 8 as number,
  },
  statusIconButton: {
    padding: 4 as number,
  },
  tagBadge: {
    borderRadius: 16 as number,
    borderWidth: 1 as number,
    paddingHorizontal: 10 as number,
    paddingVertical: 3 as number,
  },
  tagText: {
    fontSize: 12 as number,
    fontWeight: '500' as const,
  },
  tagsContainer: {
    marginTop: 12 as number,
    maxHeight: 30 as number,
  },
  tagsContentContainer: {
    alignItems: 'center' as const,
    flexDirection: 'row' as const,
    gap: 8 as number,
  },
  title: {
    fontSize: 18 as number,
    fontWeight: '700' as const,
    letterSpacing: 0.25 as number,
    lineHeight: 24 as number,
    marginBottom: 8 as number,
  },
});
