import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTranslation } from 'react-i18next';

export default function ResetPasswordScreen() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const { theme, accentColor, themeColors } = useTheme();
  const { resetPassword } = useAuth();
  const router = useRouter();
  const { t } = useTranslation();

  const handleResetPassword = async () => {
    if (!email) {
      Alert.alert(t('common.error'), t('auth.enterEmail'));
      return;
    }

    setLoading(true);
    try {
      const result = await resetPassword(email);

      if (!result.success) {
        Alert.alert(t('common.error'), result.error || t('auth.resetPasswordError'));
        setLoading(false);
        return;
      }

      setSent(true);
      Alert.alert(t('common.success'), t('auth.resetPasswordLinkSent'), [
        { text: t('common.ok'), onPress: () => router.back() },
      ]);
    } catch (error) {
      Alert.alert(t('common.error'), error instanceof Error ? error.message : String(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.flex1}
    >
      <ScrollView
        style={[styles.container, { backgroundColor: theme.background }]}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <Ionicons name="key" size={64} color={themeColors[accentColor]} />
          <Text style={[styles.title, { color: theme.text }]}>{t('auth.resetPassword')}</Text>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
            {t('auth.resetPasswordDesc')}
          </Text>
        </View>

        <View style={styles.form}>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: theme.card,
                color: theme.text,
                borderWidth: 1 as number,
                borderColor: theme.border,
              } as any,
            ]}
            placeholder={t('auth.email')}
            placeholderTextColor={theme.textSecondary}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            editable={!sent}
          />

          <TouchableOpacity
            style={[
              styles.button,
              {
                backgroundColor: sent ? theme.card : themeColors[accentColor],
              },
            ]}
            onPress={handleResetPassword}
            disabled={loading || sent}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text
                style={[styles.buttonText, { color: sent ? theme.textSecondary : '#fff' } as any]}
              >
                {sent ? t('auth.linkSent') : t('auth.resetMyPassword')}
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity style={styles.loginLink} onPress={() => router.back()}>
            <Text style={[styles.loginLinkText, { color: theme.textSecondary }]}>
              {t('auth.backToLogin')}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    borderRadius: 8,
    height: 50,
    justifyContent: 'center',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  container: {
    flex: 1,
    padding: 20,
  },
  flex1: {
    flex: 1,
  },
  form: {
    gap: 16,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
    marginTop: 60,
  },
  input: {
    borderRadius: 8,
    fontSize: 16,
    height: 50,
    paddingHorizontal: 16,
  },
  loginLink: {
    alignItems: 'center',
    marginTop: 24,
  },
  loginLinkText: {
    fontSize: 14,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 20,
    paddingBottom: 70,
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
  },
});
