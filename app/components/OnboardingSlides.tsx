// This component is responsible for displaying the onboarding slides to the user.
// It includes a series of slides that introduce the app's features and functionality.
// The user can navigate through the slides and complete the onboarding process.
// The component uses React Native's FlatList for horizontal scrolling and AsyncStorage for persisting the onboarding completion state.
import { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Dimensions,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  useColorScheme,
  AccessibilityInfo,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useTranslation } from 'react-i18next';
import { useOnboarding } from '../context/OnboardingContext';

const { width } = Dimensions.get('window');

// Constants
const STORAGE_KEY = '@onboarding_completed';

// Color constants
const COLORS = {
  WHITE: 'white',
  TRANSPARENT: 'transparent',
  BLUE: '#4F8EF7',
  GREEN: '#4CAF50',
  PURPLE: '#9C27B0',
  ORANGE: '#FF9800',
};

const OnboardingSlides = () => {
  const flatListRef = useRef(null);
  const { theme, themeColors, accentColor } = useTheme();
  const { t } = useTranslation();
  const { setHasSeenOnboarding } = useOnboarding();
  const [currentIndex, setCurrentIndex] = useState(0);
  const colorScheme = useColorScheme();
  const [isScreenReaderEnabled, setIsScreenReaderEnabled] = useState(false);

  // Check for screen reader
  useEffect(() => {
    AccessibilityInfo.isScreenReaderEnabled().then(setIsScreenReaderEnabled);
    const subscription = AccessibilityInfo.addEventListener(
      'screenReaderChanged',
      setIsScreenReaderEnabled
    );

    return () => {
      subscription?.remove();
    };
  }, []);

  // Memoized slides data
  const slides = useMemo(
    () => [
      {
        id: '1',
        title: t('onboarding.welcome'),
        description: t('onboarding.welcomeDesc'),
        icon: 'book-outline',
        iconColor: COLORS.BLUE,
        accessibilityLabel: t('onboarding.welcomeAccessibility'),
      },
      {
        id: '2',
        title: t('onboarding.notes'),
        description: t('onboarding.notesDesc'),
        icon: 'document-text-outline',
        iconColor: COLORS.GREEN,
        accessibilityLabel: t('onboarding.notesAccessibility'),
      },
      {
        id: '3',
        title: t('onboarding.security'),
        description: t('onboarding.securityDesc'),
        icon: 'lock-closed-outline',
        iconColor: COLORS.PURPLE,
        accessibilityLabel: t('onboarding.securityAccessibility'),
      },
      {
        id: '4',
        title: t('onboarding.sync'),
        description: t('onboarding.syncDesc'),
        icon: 'cloud-outline',
        iconColor: COLORS.ORANGE,
        accessibilityLabel: t('onboarding.syncAccessibility'),
      },
    ],
    [t]
  );

  // Storage operations with error handling
  const handleStorageOperation = useCallback(async () => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, 'true');
      return true;
    } catch (error) {
      console.error('Storage operation failed:', error);
      return false;
    }
  }, []);

  // Navigation with error handling
  const navigateToLogin = useCallback(async () => {
    try {
      // 1. Update storage first
      await handleStorageOperation();

      // 2. Update the context, which will trigger navigation in _layout.tsx
      setHasSeenOnboarding(true);
    } catch (error) {
      console.error('Onboarding completion failed:', error);
      // Even if storage fails, try to update the context to escape the screen
      setHasSeenOnboarding(true);
    }
  }, [handleStorageOperation, setHasSeenOnboarding]);

  const handleComplete = useCallback(async () => {
    await navigateToLogin();
  }, [navigateToLogin]);

  const handleNext = useCallback(() => {
    if (currentIndex < slides.length - 1) {
      flatListRef.current?.scrollToIndex({
        index: currentIndex + 1,
        animated: true,
      });
    } else {
      handleComplete();
    }
  }, [currentIndex, slides.length, handleComplete]);

  const handlePrevious = useCallback(() => {
    if (currentIndex > 0) {
      flatListRef.current?.scrollToIndex({
        index: currentIndex - 1,
        animated: true,
      });
    }
  }, [currentIndex]);

  const handleSkip = useCallback(async () => {
    await navigateToLogin();
  }, [navigateToLogin]);

  const handleScroll = useCallback(
    event => {
      const contentOffsetX = event.nativeEvent.contentOffset.x;
      const newIndex = Math.round(contentOffsetX / width);
      if (newIndex !== currentIndex && newIndex >= 0 && newIndex < slides.length) {
        setCurrentIndex(newIndex);
      }
    },
    [currentIndex, slides.length]
  );

  // Memoized render functions
  const renderItem = useCallback(
    ({ item }) => (
      <View
        style={[styles.slide, { backgroundColor: theme.background }]}
        accessible={true}
        accessibilityLabel={item.accessibilityLabel}
        accessibilityRole="header"
      >
        <View style={styles.iconContainer}>
          <View
            style={[styles.iconCircle, { backgroundColor: `${item.iconColor}20` }]}
            accessible={true}
            accessibilityRole="image"
            accessibilityLabel={t('onboarding.iconLabel', { icon: item.title })}
          >
            <Ionicons name={item.icon} size={80} color={item.iconColor} />
          </View>
        </View>
        <View style={styles.contentContainer}>
          <Text style={[styles.title, { color: theme.text }]} accessibilityRole="header">
            {item.title}
          </Text>
          <Text
            style={[styles.description, { color: theme.textSecondary }]}
            accessibilityRole="text"
          >
            {item.description}
          </Text>
        </View>
      </View>
    ),
    [theme, t]
  );

  const renderPagination = useCallback(() => {
    if (isScreenReaderEnabled) {
      return (
        <View
          style={styles.paginationContainer}
          accessible={true}
          accessibilityLabel={t('onboarding.pageIndicator', {
            current: currentIndex + 1,
            total: slides.length,
          })}
        >
          <Text style={{ color: theme.text }}>
            {currentIndex + 1} / {slides.length}
          </Text>
        </View>
      );
    }

    return (
      <View style={styles.paginationContainer} accessibilityRole="tablist">
        <View style={styles.dotsContainer}>
          {slides.map((_, index) => {
            const dotWidth = index === currentIndex ? 16 : 8;
            return (
              <View
                key={index}
                style={[
                  styles.dot,
                  {
                    backgroundColor:
                      index === currentIndex ? themeColors[accentColor] : theme.border,
                    width: dotWidth,
                  },
                ]}
                accessible={true}
                accessibilityRole="tab"
                accessibilityLabel={t('onboarding.dotIndicator', { number: index + 1 })}
                accessibilityState={{ selected: index === currentIndex }}
              />
            );
          })}
        </View>
      </View>
    );
  }, [currentIndex, theme, themeColors, accentColor, isScreenReaderEnabled, t, slides]);

  // Add this before the return statement
  const previousButtonOpacity = currentIndex > 0 ? 1 : 0;
  const skipButtonOpacity = currentIndex < slides.length - 1 ? 1 : 0;

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.background }]}
      accessible={true}
      accessibilityRole="tablist"
      accessibilityLabel={t('onboarding.screenTitle')}
    >
      <StatusBar barStyle={colorScheme === 'dark' ? 'light-content' : 'dark-content'} />

      <TouchableOpacity
        style={[styles.skipButton, { opacity: skipButtonOpacity }]}
        onPress={handleSkip}
        disabled={currentIndex >= slides.length - 1}
        accessible={true}
        accessibilityRole="button"
        accessibilityLabel={t('common.skipAccessibility')}
        accessibilityHint={t('onboarding.skipHint')}
      >
        <Text style={[styles.skipText, { color: themeColors[accentColor] }]}>
          {t('common.skip')}
        </Text>
      </TouchableOpacity>

      <FlatList
        ref={flatListRef}
        data={slides}
        renderItem={renderItem}
        horizontal
        showsHorizontalScrollIndicator={false}
        pagingEnabled
        bounces={false}
        keyExtractor={item => item.id}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        accessible={true}
        accessibilityRole="adjustable"
        accessibilityLabel={t('onboarding.slidesList')}
      />

      {renderPagination()}

      <View style={styles.bottomContainer} accessible={true} accessibilityRole="toolbar">
        <TouchableOpacity
          style={[styles.button, styles.previousButton, { opacity: previousButtonOpacity }]}
          onPress={handlePrevious}
          disabled={currentIndex === 0}
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel={t('common.previousAccessibility')}
        >
          <Ionicons name="chevron-back" size={24} color={themeColors[accentColor]} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.nextButton, { backgroundColor: themeColors[accentColor] }]}
          onPress={handleNext}
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel={
            currentIndex === slides.length - 1
              ? t('common.getStartedAccessibility')
              : t('common.nextAccessibility')
          }
        >
          {currentIndex === slides.length - 1 ? (
            <Text style={styles.nextButtonText}>{t('common.getStarted')}</Text>
          ) : (
            <Ionicons name="chevron-forward" size={24} color={COLORS.WHITE} />
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

// Styles for the component
const styles = StyleSheet.create({
  bottomContainer: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingBottom: 40,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  button: {
    alignItems: 'center',
    borderRadius: 10,
    justifyContent: 'center',
    padding: 15,
  },
  container: {
    flex: 1,
  },
  contentContainer: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'flex-start',
    paddingHorizontal: 20,
  },
  description: {
    fontSize: 16,
    paddingHorizontal: 20,
    textAlign: 'center',
  },
  dot: {
    borderRadius: 4,
    height: 8,
    marginHorizontal: 4,
  },
  dotsContainer: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  iconCircle: {
    alignItems: 'center',
    borderRadius: 80,
    height: 160,
    justifyContent: 'center',
    width: 160,
  },
  iconContainer: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    marginTop: 40,
  },
  nextButton: {
    flexGrow: 1,
    marginLeft: 10,
    maxWidth: 200,
  },
  nextButtonText: {
    color: COLORS.WHITE,
    fontSize: 16,
    fontWeight: 'bold',
  },
  paginationContainer: {
    alignItems: 'center',
    bottom: 140,
    left: 0,
    position: 'absolute',
    right: 0,
  },
  previousButton: {
    backgroundColor: COLORS.TRANSPARENT,
  },
  skipButton: {
    position: 'absolute',
    right: 20,
    top: 50,
    zIndex: 10,
  },
  skipText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  slide: {
    alignItems: 'center',
    height: '100%',
    justifyContent: 'center',
    paddingHorizontal: 20,
    width,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 10,
    marginTop: 20,
    textAlign: 'center',
  },
});

export default OnboardingSlides;
