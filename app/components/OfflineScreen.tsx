import React from 'react';
import { View, Text, Button, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import { checkAndUpdateOfflineStatus } from '../utils/networkManager';

const OfflineScreen = ({ error, resetError }: { error?: Error; resetError?: () => void }) => {
  const { t } = useTranslation();
  const router = useRouter();

  const handleRetry = async () => {
    const isOffline = await checkAndUpdateOfflineStatus();
    if (!isOffline && resetError) {
      resetError(); // Retry rendering
      router.replace('/(tabs)/'); // Navigate to main app
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{error ? t('error.title') : t('offline.title')}</Text>
      <Text style={styles.message}>
        {error ? t('error.message', { error: error.message }) : t('offline.message')}
      </Text>
      <Button title={t('common.retry')} onPress={handleRetry} />
      <Button title={t('offline.continueOffline')} onPress={() => router.replace('/(tabs)/')} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { alignItems: 'center', flex: 1, justifyContent: 'center', padding: 20 },
  message: { fontSize: 16, marginBottom: 20, textAlign: 'center' },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 10 },
});

export default OfflineScreen;
