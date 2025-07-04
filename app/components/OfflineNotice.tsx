import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { useNetworkState } from '../utils/networkManager';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRef } from 'react';

interface OfflineNoticeProps {
  onDismiss?: () => void;
}

const COLORS = {
  white: '#fff',
};

/**
 * OfflineNotice component
 * - Listens to network state via useNetworkState()
 * - Shows a small banner when effectivelyConnected === false
 * - Supports dark mode via ThemeContext
 * - Uses translations for all text content
 * - Can be dismissed by user
 */
const OfflineNotice: React.FC<OfflineNoticeProps> = ({ onDismiss }) => {
  const { effectivelyConnected, connectionType } = useNetworkState();
  const [visible, setVisible] = useState(false);
  const { t } = useTranslation();
  const { themeColors } = useTheme();
  const insets = useSafeAreaInsets();
  const slideAnim = useRef(new Animated.Value(-100)).current;

  useEffect(() => {
    if (!effectivelyConnected) {
      setVisible(true);
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: -100,
        duration: 300,
        useNativeDriver: true,
      }).start(() => {
        setVisible(false);
      });
    }
  }, [effectivelyConnected, slideAnim]);

  const handleDismiss = () => {
    Animated.timing(slideAnim, {
      toValue: -100,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      setVisible(false);
      if (onDismiss) {
        onDismiss();
      }
    });
  };

  if (!visible) return null;

  return (
    <Animated.View
      style={[
        styles.banner,
        {
          backgroundColor: themeColors.red,
          paddingTop: insets.top,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <View style={styles.content}>
        <Ionicons
          name={connectionType === 'cellular' ? 'cellular-outline' : 'wifi-outline'}
          size={20}
          color={COLORS.white}
        />
        <Text style={styles.text}>{t('common.networkFailedMessage')}</Text>
        <TouchableOpacity onPress={handleDismiss} style={styles.closeButton}>
          <Ionicons name="close" size={20} color={COLORS.white} />
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
};

export default OfflineNotice;

const styles = StyleSheet.create({
  banner: {
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
    zIndex: 9999,
  },
  closeButton: {
    padding: 4,
  },
  content: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  text: {
    color: COLORS.white,
    flex: 1,
    fontSize: 14,
    marginHorizontal: 8,
  },
});
