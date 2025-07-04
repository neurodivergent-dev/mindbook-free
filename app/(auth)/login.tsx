// Login screen for the app
// This screen allows users to log in with email and password, continue as a guest, or log in with Google
import { useState, useEffect } from 'react';
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
import { Logo } from '../../components/Logo';
import NetInfo from '@react-native-community/netinfo';

// Constant color values
const COLORS = {
  white: '#fff',
};

export default function LoginScreen() {
  // State variables for email, password, loading state, and internet connection status
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const { theme, accentColor, themeColors } = useTheme();
  const { login, continueAsGuest, loginWithGoogle } = useAuth();
  const router = useRouter();
  const { t } = useTranslation();
  const [isConnected, setIsConnected] = useState(true);

  // Check internet connection status using NetInfo
  // This effect runs once when the component mounts and sets up a listener for connection changes
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsConnected(!!state.isConnected);
    });

    return () => unsubscribe();
  }, []);

  const handleLogin = async (): Promise<void> => {
    if (!isConnected) {
      Alert.alert(t('common.error'), t('auth.noInternetConnection'));
      return;
    }

    if (!email || !password) {
      Alert.alert(t('common.error'), t('auth.fillAllFields'));
      return;
    }

    setLoading(true);
    try {
      const result = await login(email, password);
      if (!result.success) {
        throw new Error(String(result.error) || t('auth.loginError'));
      }

      // We give a short delay for the Root Layout to load completely
      setTimeout(() => {
        router.replace('/(tabs)/');
      }, 500);
    } catch (error: unknown) {
      if (error instanceof Error) {
        Alert.alert(t('common.error'), error.message);
      } else {
        Alert.alert(t('common.error'), t('auth.loginError'));
      }
      setLoading(false);
    }
  };

  const handleContinueWithoutAccount = async () => {
    setLoading(true);
    try {
      const result = await continueAsGuest();
      if (!result.success) {
        throw new Error(String(result.error) || t('auth.guestLoginError'));
      }

      // We use push instead of replace and give it a time of 1 second
      setTimeout(() => {
        router.push('/(tabs)/');
      }, 1000);
    } catch (error: unknown) {
      Alert.alert(
        t('common.error'),
        error instanceof Error ? error.message : t('auth.guestLoginError')
      );
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    if (!isConnected) {
      Alert.alert(t('common.error'), t('auth.noInternetConnection'));
      return;
    }

    setLoading(true);
    try {
      // Use central loginWithGoogle function in AuthContext
      const result = await loginWithGoogle();

      if (!result.success) {
        throw new Error(String(result.error) || t('auth.googleLoginError'));
      }

      // Redirect on successful login
      setTimeout(() => {
        router.replace('/(tabs)/');
      }, 500);
    } catch (error: unknown) {
      Alert.alert(
        t('common.error'),
        error instanceof Error ? error.message : t('auth.googleLoginError')
      );
      setLoading(false);
    }
    // We don't do setLoading(false) here because we want to show loading during navigation
  };

  const opacityValue = isConnected ? 1 : 0.5;

  // Render the login screen
  // It includes a logo, title, subtitle, email and password input fields, login button, links to register and recover password, and a Google sign-in button
  // The screen is styled based on the current theme and accent color
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
          <View
            style={[
              styles.logoContainer,
              {
                backgroundColor: themeColors[accentColor] + '15',
                borderColor: themeColors[accentColor] + '30',
              },
            ]}
          >
            <Text>
              <Logo size={80} color={themeColors[accentColor]} style={{}} />
            </Text>
          </View>
          <Text style={[styles.title, { color: theme.text }]}>Mindbook Pro</Text>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
            {t('common.appDescription')}
          </Text>
        </View>

        <View style={styles.form}>
          <TextInput
            style={[
              styles.input,
              styles.inputBorder,
              {
                backgroundColor: theme.card,
                color: theme.text,
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
          <View style={styles.passwordContainer}>
            <TextInput
              style={[
                styles.input,
                styles.inputBorder,
                styles.passwordInput,
                {
                  backgroundColor: theme.card,
                  color: theme.text,
                  borderColor: theme.border,
                },
              ]}
              placeholder={t('auth.password')}
              placeholderTextColor={theme.textSecondary}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!passwordVisible}
            />
            <TouchableOpacity
              style={styles.passwordVisibilityButton}
              onPress={() => setPasswordVisible(!passwordVisible)}
            >
              <Ionicons
                name={passwordVisible ? 'eye-off-outline' : 'eye-outline'}
                size={22}
                color={theme.textSecondary}
              />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[
              styles.button,
              {
                backgroundColor: themeColors[accentColor],
                opacity: opacityValue,
              },
            ]}
            onPress={handleLogin}
            disabled={loading || !isConnected}
          >
            {loading ? (
              <ActivityIndicator color={COLORS.white} />
            ) : (
              <Text style={styles.buttonText}>{t('auth.login')}</Text>
            )}
          </TouchableOpacity>

          <View style={styles.links}>
            <TouchableOpacity
              onPress={() => router.push('/(auth)/reset-password')}
              style={styles.forgotPasswordLink}
            >
              <Text style={[styles.forgotPasswordText, { color: theme.textSecondary }]}>
                {t('auth.forgotPassword') || 'Forgot Password'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => router.push('/register')} style={styles.registerLink}>
              <Text style={[styles.link, { color: themeColors[accentColor] }]}>
                {t('auth.register') || 'Register'}
              </Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.skipButton}
            onPress={handleContinueWithoutAccount}
            disabled={loading}
          >
            <Text style={[styles.skipButtonText, { color: theme.textSecondary }]}>
              {t('auth.continueWithoutAccount')}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.divider}>
          <View style={[styles.dividerLine, { backgroundColor: theme.border }]} />
          <Text style={[styles.dividerText, { color: theme.textSecondary }]}>{t('auth.or')}</Text>
          <View style={[styles.dividerLine, { backgroundColor: theme.border }]} />
        </View>

        <TouchableOpacity
          style={[
            styles.googleButton,
            {
              backgroundColor: theme.card,
              opacity: opacityValue,
            },
          ]}
          onPress={handleGoogleSignIn}
          disabled={loading || !isConnected}
        >
          <Ionicons name="logo-google" size={24} color={theme.text} />
          <Text style={[styles.googleButtonText, { color: theme.text }]}>
            {t('auth.continueWithGoogle')}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// Styles for the login screen
// The styles are defined using React Native's StyleSheet API
const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    borderRadius: 8,
    height: 50,
    justifyContent: 'center',
  },
  buttonText: {
    color: COLORS.white as string,
    fontSize: 16,
    fontWeight: '600',
  },
  container: {
    flex: 1,
    padding: 20,
  },
  divider: {
    alignItems: 'center',
    flexDirection: 'row',
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    fontSize: 14,
    marginHorizontal: 10,
  },
  flex1: {
    flex: 1,
  },
  forgotPasswordLink: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 0,
  },
  forgotPasswordText: {
    fontSize: 14,
  },
  form: {
    gap: 16,
  },
  googleButton: {
    alignItems: 'center',
    borderRadius: 12,
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'center',
    marginBottom: 12,
    padding: 16,
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
  inputBorder: {
    borderWidth: 1 as number,
  },
  link: {
    fontSize: 14,
    fontWeight: '500',
  },
  links: {
    alignItems: 'center',
    flexDirection: 'row',
    height: 40,
    justifyContent: 'space-between',
    marginTop: 0,
  },
  logoContainer: {
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1 as number,
    justifyContent: 'center',
    padding: 4,
  },
  passwordContainer: {
    position: 'relative',
    width: '100%',
  },
  passwordInput: {
    paddingRight: 50,
  },
  passwordVisibilityButton: {
    padding: 5,
    position: 'absolute',
    right: 12,
    top: 13,
  },
  registerLink: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 0,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 50,
  },
  skipButton: {
    alignItems: 'center',
    marginTop: 24,
  },
  skipButtonText: {
    fontSize: 14,
  },
  subtitle: {
    fontSize: 16,
    marginTop: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 16,
  },
});
