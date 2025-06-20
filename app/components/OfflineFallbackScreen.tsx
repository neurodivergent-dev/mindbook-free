import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';

interface OfflineFallbackScreenProps {
  onRetry: () => void;
  message?: string;
  isBanner?: boolean;
}

/**
 * Ağ bağlantısı olmadığında gösterilen fallback ekranı
 */
const OfflineFallbackScreen: React.FC<OfflineFallbackScreenProps> = ({
  onRetry,
  message,
  isBanner = false,
}) => {
  const { t } = useTranslation();

  // Banner modu için daha kompakt bir tasarım
  if (isBanner) {
    return (
      <View style={styles.bannerContainer}>
        <Ionicons name="cloud-offline" size={20} color="#fff" style={styles.bannerIcon} />
        <Text style={styles.bannerText}>{t('common.offlineTitle')}</Text>
        <TouchableOpacity style={styles.bannerButton} onPress={onRetry}>
          <Text style={styles.bannerButtonText}>{t('common.retryConnection')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Tam ekran modu
  return (
    <View style={styles.container}>
      <Ionicons name="cloud-offline" size={64} color="#666" style={styles.icon} />

      <Text style={styles.title}>{t('common.offlineTitle')}</Text>

      <Text style={styles.message}>{message || t('common.offlineMessage')}</Text>

      <TouchableOpacity style={styles.button} onPress={onRetry}>
        <Ionicons name="refresh" size={20} color="#fff" style={styles.buttonIcon} />
        <Text style={styles.buttonText}>{t('common.retryConnection')}</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  // Banner stilleri
  bannerButton: {
    backgroundColor: '#2196f3',
    borderRadius: 15,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  bannerButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
  },
  bannerContainer: {
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.8)',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    paddingVertical: 10,
  },
  bannerIcon: {
    marginRight: 8,
  },
  bannerText: {
    color: '#fff',
    flex: 1,
    fontSize: 14,
  },
  button: {
    alignItems: 'center',
    backgroundColor: '#2196f3',
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
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  container: {
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  icon: {
    marginBottom: 20,
  },
  message: {
    color: '#666',
    fontSize: 16,
    lineHeight: 22,
    marginBottom: 30,
    textAlign: 'center',
  },
  title: {
    color: '#333',
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 10,
  },
});

export default OfflineFallbackScreen;
