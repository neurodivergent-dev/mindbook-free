import React, { useMemo, useCallback, useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  StatusBar,
  Image,
  SafeAreaView,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import Markdown from 'react-native-markdown-display';

// --- Constants for Styling ---
const SPACING = {
  small: 8,
  medium: 16,
  large: 20,
};

const SIZES = {
  icon: 28,
  title: 18,
  coverImageHeight: 200,
};

const BORDER_RADIUS = {
  medium: 12,
};

// --- Component Props Interface ---
interface FullScreenReaderProps {
  visible: boolean;
  onClose: () => void;
  content: string;
  title?: string;
  coverImage?: string;
}

/**
 * İçeriği, isteğe bağlı olarak bir başlık ve kapak resmi ile tam ekran bir modalda görüntülemek için optimize edilmiş bileşen.
 * @param {FullScreenReaderProps} props Bileşenin prop'ları.
 * @returns {React.ReactElement | null}
 */
const FullScreenReader = ({
  visible,
  onClose,
  content,
  title = '',
  coverImage,
}: FullScreenReaderProps): React.ReactElement | null => {
  // State to toggle between markdown and selectable modes
  const [isSelectableMode, setIsSelectableMode] = useState(true);
  // Key to force re-render of ScrollView when switching modes
  const [scrollKey, setScrollKey] = useState(0);

  // Ref for ScrollView
  const scrollViewRef = useRef<ScrollView>(null);

  const {
    theme,
    fontSize,
    fontSizes,
    fontFamily,
    fontFamilies,
    themeMode,
    themeColors,
    accentColor,
  } = useTheme();

  // Memoize close handler to prevent re-renders
  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);

  // Toggle between markdown and selectable modes
  const toggleSelectableMode = useCallback(() => {
    setIsSelectableMode(prev => {
      // Force ScrollView re-render by changing key
      setScrollKey(k => k + 1);
      return !prev;
    });
  }, []);

  // Reset scroll position and force refresh when modal opens or content changes
  useEffect(() => {
    if (visible) {
      // Keep WebView mode when modal opens
      setIsSelectableMode(true);
      setScrollKey(k => k + 1);

      // Small delay to ensure the modal is fully rendered
      const timer = setTimeout(() => {
        scrollViewRef.current?.scrollTo({ x: 0, y: 0, animated: false });
      }, 150);

      return () => clearTimeout(timer);
    }
  }, [visible, content]);

  // Force ScrollView refresh when switching back to markdown mode
  useEffect(() => {
    if (visible && !isSelectableMode) {
      const timer = setTimeout(() => {
        // Force a complete refresh of the ScrollView
        setScrollKey(k => k + 1);

        // Additional timeout for scroll reset
        setTimeout(() => {
          scrollViewRef.current?.scrollTo({ x: 0, y: 0, animated: false });
        }, 50);
      }, 100);

      return () => clearTimeout(timer);
    }
  }, [visible, isSelectableMode]);

  // Memoize markdown styles for better performance
  const markdownStyles = useMemo(
    () => ({
      body: {
        color: theme.text,
        fontSize: fontSizes[fontSize].contentSize + 2,
        fontFamily: fontFamilies[fontFamily].family,
        lineHeight: (fontSizes[fontSize].contentSize + 2) * 1.6,
      },
      heading1: {
        fontSize: fontSizes[fontSize].contentSize + 8,
        color: theme.text,
        marginTop: SPACING.medium,
        marginBottom: SPACING.medium,
      },
      heading2: {
        fontSize: fontSizes[fontSize].contentSize + 6,
        color: theme.text,
        marginTop: SPACING.medium,
        marginBottom: SPACING.small,
      },
      heading3: {
        fontSize: fontSizes[fontSize].contentSize + 4,
        color: theme.text,
        marginTop: SPACING.small,
        marginBottom: SPACING.small,
      },
      paragraph: {
        marginBottom: SPACING.small,
      },
      code_inline: {
        backgroundColor: themeMode === 'dark' ? '#1a1b26' : '#f7f7f7',
        color: themeMode === 'dark' ? '#7dcfff' : '#0550ae',
        fontFamily: 'monospace',
        paddingHorizontal: 4,
        paddingVertical: 2,
        borderRadius: 4,
        fontSize: fontSizes[fontSize].contentSize,
      },
      code_block: {
        backgroundColor: themeMode === 'dark' ? '#1a1b26' : '#f7f7f7',
        color: themeMode === 'dark' ? '#c0caf5' : '#1a1b26',
        fontFamily: 'monospace',
        padding: SPACING.medium,
        borderRadius: BORDER_RADIUS.medium,
        marginVertical: SPACING.small,
      },
      fence: {
        backgroundColor: themeMode === 'dark' ? '#1a1b26' : '#f7f7f7',
        color: themeMode === 'dark' ? '#c0caf5' : '#1a1b26',
        fontFamily: 'monospace',
        padding: SPACING.medium,
        borderRadius: BORDER_RADIUS.medium,
        marginVertical: SPACING.small,
      },
      link: {
        color: '#007AFF',
      },
      table: {
        backgroundColor: theme.card,
        borderColor: theme.border,
        borderWidth: 1,
        borderRadius: 8,
        marginVertical: 8,
      },
      tr: {
        backgroundColor: theme.card,
        borderBottomColor: theme.border,
        borderBottomWidth: 1,
      },
      th: {
        backgroundColor: theme.card,
        color: theme.text,
        fontWeight: 'bold',
        padding: 8,
        borderRightColor: theme.border,
        borderRightWidth: 1,
      },
      td: {
        backgroundColor: theme.card,
        color: theme.text,
        padding: 8,
        borderRightColor: theme.border,
        borderRightWidth: 1,
      },
    }),
    [theme, fontSize, fontSizes, fontFamily, fontFamilies, themeMode]
  );

  // Memoize content to prevent unnecessary re-processing
  const memoizedContent = useMemo(() => content, [content]);

  // Helper function to convert markdown to plain text
  const markdownToPlainText = useMemo(() => {
    return content
      .replace(/#{1,6}\s?/g, '') // Remove headers
      .replace(/\*\*(.*?)\*\*/g, '$1') // Remove bold
      .replace(/\*(.*?)\*/g, '$1') // Remove italic
      .replace(/`(.*?)`/g, '$1') // Remove inline code
      .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1') // Remove links
      .replace(/^\s*[-\*\+]\s+/gm, '') // Remove list items
      .replace(/^\s*\d+\.\s+/gm, '') // Remove numbered lists
      .replace(/```[\s\S]*?```/g, '') // Remove code blocks
      .replace(/\n\s*\n/g, '\n') // Remove extra line breaks
      .trim();
  }, [content]);

  if (!visible) {
    return null;
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} transparent={false}>
      <StatusBar hidden={true} />
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        {/* Header: Flexbox ile mükemmel hizalama */}
        <View style={styles.header}>
          {/* Sol Öğe: Kapatma Butonu */}
          <TouchableOpacity onPress={handleClose} style={styles.headerAction} activeOpacity={0.7}>
            <Ionicons name="close-circle" size={SIZES.icon} color={theme.text} />
          </TouchableOpacity>

          {/* Orta Öğe: Başlık */}
          {!!title && (
            <Text style={[styles.title, { color: theme.text }]} numberOfLines={1}>
              {title}
            </Text>
          )}

          {/* Sağ Öğe: Seçim Modu Toggle Butonu */}
          <TouchableOpacity
            onPress={toggleSelectableMode}
            style={styles.headerAction}
            activeOpacity={0.7}
          >
            <Ionicons
              name={isSelectableMode ? 'document-text' : 'text-outline'}
              size={SIZES.icon}
              color={theme.text}
            />
          </TouchableOpacity>
        </View>

        {isSelectableMode ? (
          // WebView for guaranteed text selection
          <WebView
            source={{
              html: `
                <html>
                  <head>
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <style>
                      body {
                        font-family: ${fontFamilies[fontFamily].family};
                        font-size: ${fontSizes[fontSize].contentSize + 2}px;
                        line-height: ${(fontSizes[fontSize].contentSize + 2) * 1.6}px;
                        color: ${theme.text};
                        background-color: ${theme.background};
                        margin: 0;
                        padding: 16px;
                        user-select: text;
                        -webkit-user-select: text;
                      }
                      ${
                        coverImage
                          ? `
                        .cover-image {
                          width: 100%;
                          max-width: 100%;
                          height: 200px;
                          object-fit: cover;
                          border-radius: 12px;
                          margin-bottom: 16px;
                          box-shadow: 0 4px 8px rgba(0,0,0,0.1);
                        }
                      `
                          : ''
                      }
                    </style>
                  </head>
                  <body>
                    ${
                      coverImage
                        ? `<img src="${coverImage}" class="cover-image" alt="Cover" onload="this.style.display='block'" onerror="this.style.display='none'" />`
                        : ''
                    }
                    ${markdownToPlainText.replace(/\n/g, '<br>')}
                  </body>
                </html>
              `,
            }}
            style={{ flex: 1 }}
            showsVerticalScrollIndicator={false}
          />
        ) : (
          // Markdown mode with proper ScrollView
          <ScrollView
            key={scrollKey} // Force re-render with key
            ref={scrollViewRef}
            style={styles.contentScrollView}
            contentContainerStyle={styles.contentContainer}
            showsVerticalScrollIndicator={false}
            removeClippedSubviews={false}
            scrollEventThrottle={16}
            nestedScrollEnabled={true}
            overScrollMode="always"
            bounces={true}
          >
            {/* Cover Image with lazy loading */}
            {!!coverImage && (
              <View style={styles.coverImageContainer}>
                <Image
                  source={{ uri: coverImage }}
                  style={styles.coverImage}
                  resizeMode="cover"
                  fadeDuration={300}
                  onLoadStart={() => console.log('Image loading...')}
                  onLoad={() => console.log('Image loaded')}
                  onError={error => console.log('Image error:', error)}
                />
              </View>
            )}

            {/* Markdown Content */}
            <View style={styles.markdownContainer}>
              <Markdown style={markdownStyles}>{memoizedContent}</Markdown>
            </View>
          </ScrollView>
        )}
      </SafeAreaView>
    </Modal>
  );
};

// --- Styles ---
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    flexGrow: 1,
    paddingBottom: 10,
  },
  contentScrollView: {
    flex: 1,
    paddingHorizontal: SPACING.large,
  },
  coverImage: {
    borderRadius: BORDER_RADIUS.medium,
    height: SIZES.coverImageHeight,
    width: '100%',
  },
  coverImageContainer: {
    elevation: 5,
    marginBottom: SPACING.medium,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.medium,
    paddingVertical: SPACING.small,
  },
  headerAction: {
    alignItems: 'flex-start',
    width: SIZES.icon + SPACING.small,
  },
  markdownContainer: {
    flex: 1,
  },
  title: {
    flex: 1,
    fontSize: SIZES.title,
    fontWeight: '600',
    marginHorizontal: SPACING.small,
    textAlign: 'center',
  },
});

// --- Memoization ---
export default React.memo(FullScreenReader);
