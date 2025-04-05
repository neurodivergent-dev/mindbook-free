// This file registers a new user using email and password or Google authentication.
// It also checks for internet connectivity and handles errors appropriately.
// The component uses hooks for state management and context for authentication and theming.
import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTranslation } from 'react-i18next';
import NetInfo from '@react-native-community/netinfo';

// This component is the registration screen for the app. It allows users to create an account using email and password or Google authentication.
export default function RegisterScreen() {
  // State variables for user input and loading state
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { theme, accentColor, themeColors } = useTheme();
  const { register, registerWithGoogle } = useAuth();
  const router = useRouter();
  const { t } = useTranslation();
  const [isConnected, setIsConnected] = useState(true);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsConnected(!!state.isConnected);
    });

    return () => unsubscribe();
  }, []);

  const handleRegister = async () => {
    if (!isConnected) {
      Alert.alert(t('common.error'), t('auth.noInternetConnection'));
      return;
    }

    if (!displayName || !email || !password || !confirmPassword) {
      Alert.alert(t('common.error'), t('auth.fillAllFields'));
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert(t('common.error'), t('auth.passwordsMustMatch'));
      return;
    }

    setLoading(true);
    try {
      const result = await register(email, password, displayName);

      if (result.success) {
        // Show alert for email verification
        Alert.alert(t('auth.emailVerification'), t('auth.emailVerificationMsg'), [
          {
            text: t('common.ok'),
            onPress: () => {
              router.replace('/(auth)/login');
            },
          },
        ]);
      } else {
        throw new Error(String(result.error) || t('auth.registerError'));
      }

      setLoading(false);
    } catch (error: unknown) {
      Alert.alert(
        t('common.error'),
        error instanceof Error ? error.message : t('auth.registerError')
      );
      setLoading(false);
    }
  };

  const handleGoogleRegister = async () => {
    if (!isConnected) {
      Alert.alert(t('common.error'), t('auth.noInternetConnection'));
      return;
    }

    setLoading(true);
    try {
      // Use registerWithGoogle function from AuthContext
      const result = await registerWithGoogle();

      if (!result.success) {
        throw new Error(result.error?.toString() || t('auth.googleRegisterError'));
      }

      // We give a short delay for the Root Layout to load completely
      setTimeout(() => {
        router.replace('/(tabs)/');
      }, 500);
    } catch (error: unknown) {
      Alert.alert(
        t('common.error') || 'Error',
        error instanceof Error ? error.message : t('auth.googleRegisterError')
      );
      setLoading(false);
    }
  };

  // Calculate the value at the beginning of the component or before rendering
  const opacityValue = isConnected ? 1 : 0.5;

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.header}>
        <Ionicons name="person-add" size={64} color={themeColors[accentColor]} />
        <Text style={[styles.title, { color: theme.text }]}>{t('auth.register')}</Text>
        <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
          {t('auth.createAccountDesc')}
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
            },
          ]}
          placeholder={t('auth.displayName')}
          placeholderTextColor={theme.textSecondary}
          value={displayName}
          onChangeText={setDisplayName}
        />
        <TextInput
          style={[
            styles.input,
            {
              backgroundColor: theme.card,
              color: theme.text,
              borderWidth: 1 as number,
              borderColor: theme.border,
            },
          ]}
          placeholder={t('auth.email')}
          placeholderTextColor={theme.textSecondary}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />
        <TextInput
          style={[
            styles.input,
            {
              backgroundColor: theme.card,
              color: theme.text,
              borderWidth: 1 as number,
              borderColor: theme.border,
            },
          ]}
          placeholder={t('auth.password')}
          placeholderTextColor={theme.textSecondary}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />
        <TextInput
          style={[
            styles.input,
            {
              backgroundColor: theme.card,
              color: theme.text,
              borderWidth: 1 as number,
              borderColor: theme.border,
            },
          ]}
          placeholder={t('auth.confirmPassword')}
          placeholderTextColor={theme.textSecondary}
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          secureTextEntry
        />

        <TouchableOpacity
          style={[
            styles.button,
            {
              backgroundColor: themeColors[accentColor],
              opacity: opacityValue,
            },
          ]}
          onPress={handleRegister}
          disabled={loading || !isConnected}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>{t('auth.register')}</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.googleButton,
            {
              backgroundColor: theme.card,
              opacity: opacityValue,
            },
          ]}
          onPress={handleGoogleRegister}
          disabled={loading || !isConnected}
        >
          <Ionicons name="logo-google" size={24} color={theme.text} />
          <Text style={[styles.googleButtonText, { color: theme.text }]}>
            {t('auth.registerWithGoogle')}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.loginLink} onPress={() => router.back()}>
          <Text style={[styles.loginLinkText, { color: theme.textSecondary }]}>
            {t('auth.alreadyHaveAccount')}{' '}
            <Text style={{ color: themeColors[accentColor] }}>{t('auth.login')}</Text>
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// Styles for the RegisterScreen component
// These styles are used to create a consistent and visually appealing layout for the registration form.
const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    borderRadius: 8,
    height: 50,
    justifyContent: 'center',
  },
  buttonText: {
    color: '#fff' as string,
    fontSize: 16,
    fontWeight: '600',
  },
  container: {
    flex: 1,
    padding: 20,
  },
  form: {
    gap: 16,
  },
  googleButton: {
    alignItems: 'center',
    borderRadius: 8,
    flexDirection: 'row',
    gap: 8,
    height: 50,
    justifyContent: 'center',
  },
  googleButtonText: {
    fontSize: 16,
    fontWeight: '600',
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
