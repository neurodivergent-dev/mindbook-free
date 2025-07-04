import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';

interface OfflineFallbackScreenProps {
  onRetry: () => void;
  message?: string;
  isBanner?: boolean;
}

const COLORS = {
  primary: '#2196f3',
  white: '#fff',
  bannerBackground: 'rgba(0,0,0,0.8)',
  screenBackground: '#f5f5f5',
  message: '#666',
  title: '#333',
};

/**
 * Fallback screen displayed when there is no network connection
 */
const OfflineFallbackScreen: React.FC<OfflineFallbackScreenProps> = ({
  onRetry,
  message,
  isBanner = false,
}) => {
  const { t } = useTranslation();

  // Banner mode with a more compact design
  if (isBanner) {
    return (
      <View style={styles.bannerContainer}>
        <Ionicons name="cloud-offline" size={20} color={COLORS.white} style={styles.bannerIcon} />
        <Text style={styles.bannerText}>{t('common.offlineTitle')}</Text>
        <TouchableOpacity style={styles.bannerButton} onPress={onRetry}>
          <Text style={styles.bannerButtonText}>{t('common.retryConnection')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Full screen mode
  return (
    <View style={styles.container}>
      <Ionicons name="cloud-offline" size={64} color={COLORS.message} style={styles.icon} />

      <Text style={styles.title}>{t('common.offlineTitle')}</Text>

      <Text style={styles.message}>{message || t('common.offlineMessage')}</Text>

      <TouchableOpacity style={styles.button} onPress={onRetry}>
        <Ionicons name="refresh" size={20} color={COLORS.white} style={styles.buttonIcon} />
        <Text style={styles.buttonText}>{t('common.retryConnection')}</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  // Banner styles
  bannerButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 15,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  bannerButtonText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: '500',
  },
  bannerContainer: {
    alignItems: 'center',
    backgroundColor: COLORS.bannerBackground,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    paddingVertical: 10,
  },
  bannerIcon: {
    marginRight: 8,
  },
  bannerText: {
    color: COLORS.white,
    flex: 1,
    fontSize: 14,
  },
  button: {
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    borderRadius: 25,
    flexDirection: 'row',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  buttonIcon: {
    marginRight: 8,
  },
  buttonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '500',
  },
  container: {
    alignItems: 'center',
    backgroundColor: COLORS.screenBackground,
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  icon: {
    marginBottom: 20,
  },
  message: {
    color: COLORS.message,
    fontSize: 16,
    lineHeight: 22,
    marginBottom: 30,
    textAlign: 'center',
  },
  title: {
    color: COLORS.title,
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 10,
  },
});

export default OfflineFallbackScreen;
