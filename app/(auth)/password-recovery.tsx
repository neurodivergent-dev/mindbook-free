// Purpose: This file contains the Password Recovery screen component for the authentication flow.
// It provides a user interface for users to recover their passwords by contacting support via email.
import { View, Text, TouchableOpacity, StyleSheet, Alert, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../context/ThemeContext';
import { useTranslation } from 'react-i18next';
import Ionicons from '@expo/vector-icons/Ionicons';

// Fixed color values
const COLORS = {
  white: '#fff',
};

// This component is the Password Recovery screen
export default function PasswordRecoveryScreen() {
  const { theme, accentColor, themeColors } = useTheme();
  const router = useRouter();
  const { t } = useTranslation();

  const handleSupportContact = () => {
    Alert.alert(t('auth.contactInfo'), t('auth.contactEmailMessage'), [
      {
        text: t('common.ok'),
        onPress: () => {},
      },
    ]);
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.background }]}
      contentContainerStyle={styles.contentContainer}
    >
      <View style={styles.header}>
        <Ionicons name="lock-closed" size={64} color={themeColors[accentColor]} />
        <Text style={[styles.title, { color: theme.text }]}>{t('auth.passwordRecoveryTitle')}</Text>
        <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
          {t('auth.passwordRecoverySubtitle')}
        </Text>
      </View>

      <View style={styles.messageContainer}>
        <Text style={[styles.messageText, { color: theme.text }]}>
          {t('auth.passwordRecoveryMessage')}
        </Text>

        <TouchableOpacity
          style={[styles.emailContainer, { backgroundColor: theme.card }]}
          onPress={handleSupportContact}
        >
          <Ionicons name="mail" size={24} color={themeColors[accentColor]} />
          <Text style={[styles.emailText, { color: themeColors[accentColor] }]}>
            {t('auth.passwordRecoveryEmail')}
          </Text>
        </TouchableOpacity>

        <Text style={[styles.instructionText, { color: theme.textSecondary }]}>
          {t('auth.passwordRecoveryInstructions')}
        </Text>
      </View>

      <TouchableOpacity
        style={[styles.button, { backgroundColor: themeColors[accentColor] }]}
        onPress={() => router.back()}
      >
        <Text style={styles.buttonText}>{t('auth.backToLoginButton')}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

// Styles for the Password Recovery screen
// This includes styles for the container, header, buttons, and text elements
const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    borderRadius: 8,
    height: 50,
    justifyContent: 'center',
    marginTop: 30,
  },
  buttonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '600',
  },
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  emailContainer: {
    alignItems: 'center',
    borderRadius: 12,
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'center',
    marginVertical: 20,
    padding: 16,
  },
  emailText: {
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
    marginTop: 60,
  },
  instructionText: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  messageContainer: {
    borderRadius: 12,
    padding: 16,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    marginTop: 8,
    textAlign: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 16,
    textAlign: 'center',
  },
});
