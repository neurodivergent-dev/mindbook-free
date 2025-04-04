import React from 'react';
import { View, Text, StyleSheet, Pressable, Dimensions } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import Animated, {
  FadeIn,
  FadeInLeft,
  useAnimatedStyle,
  withSpring,
  useSharedValue,
  interpolate,
  runOnJS,
} from 'react-native-reanimated';
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
  ScrollView as GHScrollView,
} from 'react-native-gesture-handler';
import { useTranslation } from 'react-i18next';
import { Logo } from '../../components/Logo';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const DRAWER_WIDTH = Math.min(SCREEN_WIDTH * 0.7, 280);
const SWIPE_THRESHOLD = 50;
const COLORS = {
  shadow: '#000000',
  overlayBackground: 'rgba(0,0,0,0.5)',
};

Animated.createAnimatedComponent(Pressable);

interface CustomDrawerProps {
  isVisible: boolean;
  onClose: () => void;
  onOpen: () => void;
}

interface ThemeContextProps {
  theme: {
    background: string;
    border: string;
    text: string;
  };
  accentColor: string;
  themeColors: { [key: string]: string };
}

interface MenuItemProps {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  title: string;
  onPress: () => Promise<void> | void;
  color: string;
  index: number;
}

export default function CustomDrawer({ isVisible, onClose, onOpen }: CustomDrawerProps) {
  const { theme, accentColor, themeColors } = useTheme() as ThemeContextProps;
  const { t } = useTranslation();
  const translateX = useSharedValue(isVisible ? 0 : -DRAWER_WIDTH);
  const overlayOpacity = useSharedValue(isVisible ? 1 : 0);
  const panGestureRef = React.useRef(null);

  React.useEffect(() => {
    if (isVisible) {
      translateX.value = withSpring(0, {
        mass: 0.8,
        damping: 15,
        stiffness: 100,
      });
      overlayOpacity.value = withSpring(1, {
        mass: 0.8,
        damping: 15,
        stiffness: 100,
      });
    } else {
      translateX.value = withSpring(-DRAWER_WIDTH, {
        mass: 0.8,
        damping: 15,
        stiffness: 100,
      });
      overlayOpacity.value = withSpring(0, {
        mass: 0.8,
        damping: 15,
        stiffness: 100,
      });
    }
  }, [isVisible, translateX, overlayOpacity]);

  const panGesture = Gesture.Pan()
    .onUpdate(event => {
      const newX = Math.min(0, Math.max(-DRAWER_WIDTH, event.translationX));
      if (isVisible) {
        translateX.value = newX;
        overlayOpacity.value = interpolate(newX, [-DRAWER_WIDTH, 0], [0, 1]);
      } else if (event.translationX > 0) {
        translateX.value = -DRAWER_WIDTH + event.translationX;
        overlayOpacity.value = interpolate(event.translationX, [0, DRAWER_WIDTH], [0, 1]);
      }
    })
    .onEnd(event => {
      if (isVisible) {
        if (event.translationX < -SWIPE_THRESHOLD) {
          translateX.value = withSpring(-DRAWER_WIDTH);
          overlayOpacity.value = withSpring(0);
          runOnJS(onClose)();
        } else {
          translateX.value = withSpring(0);
          overlayOpacity.value = withSpring(1);
        }
      } else {
        if (event.translationX > SWIPE_THRESHOLD) {
          translateX.value = withSpring(0);
          overlayOpacity.value = withSpring(1);
          runOnJS(onOpen)();
        } else {
          translateX.value = withSpring(-DRAWER_WIDTH);
          overlayOpacity.value = withSpring(0);
        }
      }
    });

  const drawerAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const overlayAnimatedStyle = useAnimatedStyle(() => ({
    opacity: overlayOpacity.value,
  }));

  const menuItems: {
    icon: React.ComponentProps<typeof Ionicons>['name'];
    title: string;
    onPress: () => Promise<void> | void;
    color: string;
  }[] = [
    {
      icon: 'document-text-outline' as React.ComponentProps<typeof Ionicons>['name'],
      title: t('drawer.notes'),
      onPress: () => {
        onClose();
        setTimeout(() => {
          router.push('/(tabs)/');
        }, 300);
      },
      color: themeColors[accentColor],
    },
    {
      icon: 'checkmark-circle-outline' as React.ComponentProps<typeof Ionicons>['name'],
      title: t('drawer.tasks'),
      onPress: () => {
        onClose();
        setTimeout(() => {
          router.push('/(tabs)/tasks');
        }, 300);
      },
      color: themeColors[accentColor],
    },
    {
      icon: 'folder-outline' as React.ComponentProps<typeof Ionicons>['name'],
      title: t('drawer.categories'),
      onPress: () => {
        onClose();
        setTimeout(() => {
          router.push('/(tabs)/categories');
        }, 300);
      },
      color: themeColors[accentColor],
    },
    {
      icon: 'star-outline' as React.ComponentProps<typeof Ionicons>['name'],
      title: t('drawer.favorites'),
      onPress: () => {
        onClose();
        setTimeout(() => {
          router.push('/(tabs)/favorites');
        }, 300);
      },
      color: themeColors[accentColor],
    },
    {
      icon: 'lock-closed-outline' as React.ComponentProps<typeof Ionicons>['name'],
      title: t('drawer.vault'),
      onPress: () => {
        onClose();
        setTimeout(() => {
          router.push('/(modal)/vault');
        }, 300);
      },
      color: themeColors[accentColor],
    },
    {
      icon: 'archive-outline' as React.ComponentProps<typeof Ionicons>['name'],
      title: t('drawer.archive'),
      onPress: () => {
        onClose();
        setTimeout(() => {
          router.push('/(modal)/archive');
        }, 300);
      },
      color: themeColors[accentColor],
    },
    {
      icon: 'trash-outline' as React.ComponentProps<typeof Ionicons>['name'],
      title: t('drawer.trash'),
      onPress: () => {
        onClose();
        setTimeout(() => {
          router.push('/(modal)/trash');
        }, 300);
      },
      color: themeColors[accentColor],
    },
    {
      icon: 'settings-outline' as React.ComponentProps<typeof Ionicons>['name'],
      title: t('drawer.settings'),
      onPress: () => {
        onClose();
        setTimeout(() => {
          router.push('/(tabs)/settings');
        }, 300);
      },
      color: themeColors[accentColor],
    },
    {
      icon: 'information-outline' as React.ComponentProps<typeof Ionicons>['name'],
      title: t('drawer.about'),
      onPress: () => {
        onClose();
        setTimeout(() => {
          router.push('/(modal)/about');
        }, 300);
      },
      color: themeColors[accentColor],
    },
    // Debug screen is visible only in development mode
    ...(__DEV__
      ? [
          {
            icon: 'chatbubble-ellipses-outline' as React.ComponentProps<typeof Ionicons>['name'],
            title: t('drawer.aiChat'),
            onPress: () => {
              onClose();
              setTimeout(() => {
                router.push('/(modal)/ai-chat');
              }, 300);
            },
            color: themeColors[accentColor],
          },
          {
            icon: 'bug-outline' as React.ComponentProps<typeof Ionicons>['name'],
            title: 'Debug',
            onPress: () => {
              onClose();
              setTimeout(() => {
                router.push('/(modal)/debug');
              }, 300);
            },
            color: themeColors.red || '#F44336',
          },
          {
            icon: 'speedometer-outline' as React.ComponentProps<typeof Ionicons>['name'],
            title: 'Performance Test',
            onPress: () => {
              onClose();
              setTimeout(() => {
                router.push('/(modal)/performance-test');
              }, 300);
            },
            color: themeColors[accentColor],
          },
        ]
      : []),
  ];

  const MenuItem: React.FC<MenuItemProps> = ({ icon, title, onPress, color, index }) => {
    const itemScale = useSharedValue(1);

    const animatedStyle = useAnimatedStyle(() => {
      return {
        transform: [
          {
            scale: withSpring(itemScale.value, {
              mass: 0.5,
              damping: 12,
              stiffness: 100,
            }),
          },
        ],
      };
    });

    const handlePressIn = () => {
      itemScale.value = withSpring(0.97, {
        mass: 0.5,
        damping: 12,
        stiffness: 100,
      });
    };

    const handlePressOut = () => {
      itemScale.value = withSpring(1, {
        mass: 0.5,
        damping: 12,
        stiffness: 100,
      });
    };

    const handlePress = async () => {
      handlePressOut();
      onClose();
      setTimeout(async () => {
        if (typeof onPress === 'function') {
          await onPress();
        }
      }, 300);
    };

    return (
      <Animated.View entering={(FadeInLeft as any).delay(50 * index).springify()}>
        <Animated.View style={animatedStyle}>
          <Pressable
            style={[styles.menuItem, { borderBottomColor: theme.border + '20' }]}
            onPress={handlePress}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
          >
            <View style={[styles.iconContainer, { backgroundColor: color + '15' }]}>
              <Ionicons name={icon} size={24} color={color} />
            </View>
            <Text style={[styles.menuItemText, { color: theme.text }]}>{title}</Text>
          </Pressable>
        </Animated.View>
      </Animated.View>
    );
  };

  if (!isVisible && translateX.value === -DRAWER_WIDTH) return null;

  return (
    <GestureHandlerRootView style={styles.container}>
      <GestureDetector gesture={panGesture}>
        <Animated.View
          style={[
            styles.container,
            isVisible || translateX.value > -DRAWER_WIDTH ? styles.visible : styles.hidden,
          ]}
        >
          <Animated.View style={[styles.overlay, styles.overlayBackground, overlayAnimatedStyle]}>
            <Pressable style={styles.overlayPressable} onPress={onClose} />
          </Animated.View>

          <Animated.View style={styles.drawerWrapper}>
            <Animated.View
              style={[styles.drawer, { backgroundColor: theme.background }, drawerAnimatedStyle]}
            >
              <Animated.View>
                <Animated.View
                  entering={FadeInLeft.delay(200).springify()}
                  style={[styles.header, { borderBottomColor: theme.border + '20' }]}
                >
                  <View style={styles.logoContainer}>
                    <Animated.View>
                      <Animated.View
                        entering={(FadeIn as any).delay(400).springify()}
                        style={[
                          styles.logo,
                          {
                            backgroundColor: themeColors[accentColor] + '15',
                            borderColor: themeColors[accentColor] + '30',
                          },
                        ]}
                      >
                        <Logo size={48} color={themeColors[accentColor]} style={{}} />
                      </Animated.View>
                    </Animated.View>

                    <Animated.View>
                      <Animated.Text
                        entering={FadeInLeft.delay(500).springify()}
                        style={[styles.appName, { color: theme.text }]}
                      >
                        Mindbook Pro
                      </Animated.Text>
                    </Animated.View>
                  </View>
                </Animated.View>
              </Animated.View>

              <GHScrollView
                style={styles.menuScrollView}
                contentContainerStyle={styles.menuScrollContent}
                showsVerticalScrollIndicator={true}
                scrollEventThrottle={16}
                bounces={true}
                scrollIndicatorInsets={{ right: 1 }}
                ref={panGestureRef}
                overScrollMode="always"
                waitFor={panGestureRef}
              >
                <View style={styles.menuContainer}>
                  {menuItems.map((item, index) => (
                    <MenuItem
                      key={index}
                      icon={item.icon}
                      title={item.title}
                      onPress={item.onPress}
                      color={item.color}
                      index={index}
                    />
                  ))}
                  <View style={styles.menuBottomSpace} />
                </View>
              </GHScrollView>
            </Animated.View>
          </Animated.View>
        </Animated.View>
      </GestureDetector>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  appName: {
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  container: {
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
    zIndex: 1000,
  },
  drawer: {
    bottom: 0,
    elevation: 5,
    left: 0,
    position: 'absolute',
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    top: 0,
    width: DRAWER_WIDTH,
  },
  drawerWrapper: {
    bottom: 0,
    left: 0,
    position: 'absolute',
    top: 0,
    width: DRAWER_WIDTH,
  },
  header: {
    alignItems: 'center',
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    paddingBottom: 20,
    paddingTop: 56,
  },
  hidden: {
    display: 'none',
  },
  iconContainer: {
    borderRadius: 10,
    padding: 8,
  },
  logo: {
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: 'center',
    padding: 4,
  },
  logoContainer: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 16,
  },
  menuBottomSpace: {
    height: 80,
  },
  menuContainer: {
    paddingTop: 8,
  },
  menuItem: {
    alignItems: 'center',
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: 14,
    padding: 14,
    paddingHorizontal: 16,
  },
  menuItemText: {
    fontSize: 15,
    fontWeight: '500',
    letterSpacing: 0.3,
  },
  menuScrollContent: {
    flexGrow: 1,
    paddingBottom: 100,
    paddingTop: 8,
  },
  menuScrollView: {
    flex: 1,
  },
  overlay: {
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  overlayBackground: {
    backgroundColor: COLORS.overlayBackground,
  },
  overlayPressable: {
    flex: 1,
  },
  visible: {
    display: 'flex',
  },
});
