// This file is Debug Screen for development purposes.
// It displays application information and environment variables.
// It is not intended for production use and should not be shared with anyone.
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Clipboard,
} from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../context/ThemeContext';
import EnvDebugger from '../components/EnvDebugger';
import Constants from 'expo-constants';
import { logEnvVariables } from '../utils/envCheck';
import secureKeyService from '../utils/secureKeyService';
import { OpenRouterService } from '../utils/openRouterService';
import supabase from '../utils/supabase';

// Color constants
const COLORS = {
  WHITE: 'white',
  BLACK: 'black',
  TRANSPARENT_BLACK: 'rgba(0,0,0,0.05)',
};

// Debug screen - Development tools
const DebugScreen = () => {
  const router = useRouter();
  const { theme, themeColors, accentColor } = useTheme();
  const { t } = useTranslation();
  const [testResult, setTestResult] = useState<string | null>(null);
  const [apiKeyResult, setApiKeyResult] = useState<string | null>(null);
  const [validationResult, setValidationResult] = useState<string | null>(null);
  const [jwtToken, setJwtToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isApiKeyLoading, setIsApiKeyLoading] = useState(false);
  const [isValidationLoading, setIsValidationLoading] = useState(false);
  const [isTokenLoading, setIsTokenLoading] = useState(false);

  // Check environment variables when application starts and print to console
  useEffect(() => {
    try {
      logEnvVariables();
    } catch (error) {
      console.error('Error logging environment variables:', error);
    }
  }, []);

  // App information to display
  const appInfo = {
    name: Constants.expoConfig?.name || 'Unknown',
    version: Constants.expoConfig?.version || 'Unknown',
    buildNumber: Constants.expoConfig?.ios?.buildNumber || 'Unknown',
    sdkVersion: Constants.expoConfig?.sdkVersion || 'Unknown',
    bundleId: Constants.expoConfig?.ios?.bundleIdentifier || 'Unknown',
    isDevelopment: __DEV__ ? 'Yes' : 'No',
  };

  // Test Edge Function
  const testEdgeFunction = async () => {
    try {
      setIsLoading(true);
      setTestResult('Test başlatıldı...');
      // const result = await secureKeyService.testEdgeFunction();
      // setTestResult(result);
    } catch (error) {
      setTestResult(`Error: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Test OpenRouter API Key
  const testOpenRouterApiKey = async () => {
    try {
      setIsApiKeyLoading(true);
      setApiKeyResult('API anahtarı alınıyor...');

      // Clear cache and try again
      secureKeyService.clearKeysCache();

      const apiKey = await secureKeyService.getOpenRouterApiKey();
      if (apiKey) {
        setApiKeyResult(
          `API anahtarı alındı! (${apiKey.substring(0, 5)}...${apiKey.substring(
            apiKey.length - 4
          )})`
        );
      } else {
        setApiKeyResult('API anahtarı alınamadı!');
      }
    } catch (error) {
      setApiKeyResult(`Error: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsApiKeyLoading(false);
    }
  };

  // Test OpenRouter API Key Validity with a simple query
  const validateOpenRouterApiKey = async () => {
    try {
      setIsValidationLoading(true);
      setValidationResult('API anahtarı test ediliyor...');

      // Clear cache and get a fresh key
      secureKeyService.clearKeysCache();
      const apiKey = await secureKeyService.getOpenRouterApiKey();

      if (!apiKey) {
        setValidationResult('❌ API anahtarı alınamadı!');
        return;
      }

      // Directly create a service with the key
      const openRouterService = new OpenRouterService(apiKey);

      // Try a simple completion to validate the key
      const response = await openRouterService.askQuestion('Test message, please respond with OK');

      if (response.error) {
        setValidationResult(`❌ API anahtarı geçersiz: ${response.error}`);
      } else {
        setValidationResult(
          `✅ API anahtarı geçerli! Cevap: ${response.content.substring(0, 50)}${
            response.content.length > 50 ? '...' : ''
          }`
        );
      }
    } catch (error) {
      setValidationResult(`❌ Hata: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsValidationLoading(false);
    }
  };

  // Get JWT Token for testing
  const getJwtToken = async () => {
    try {
      setIsTokenLoading(true);
      setJwtToken('JWT token alınıyor...');

      const { data, error } = await supabase.auth.getSession();

      if (error || !data.session) {
        setJwtToken('❌ JWT token alınamadı! Giriş yapılmamış olabilir.');
        return;
      }

      const token = data.session.access_token;
      setJwtToken(`✅ JWT token alındı! (${token.substring(0, 15)}...)`);

      // Copy to clipboard
      await Clipboard.setString(token);
      Alert.alert('JWT Token', 'Token panoya kopyalandı!');

      console.log('JWT Token for testing:', token);
    } catch (error) {
      setJwtToken(`❌ Hata: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsTokenLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Stack.Screen
        options={{
          title: t('common.debug') || 'Debug',
          headerStyle: {
            backgroundColor: themeColors[accentColor],
          },
          headerShadowVisible: true,
          headerTintColor: COLORS.WHITE,
          headerTitleStyle: {
            fontWeight: '600',
            fontSize: 18,
            color: COLORS.WHITE,
          },
        }}
      />

      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        style={{ backgroundColor: theme.background }}
      >
        <Text style={[styles.title, { color: theme.text }]}>Debug Information</Text>

        <View
          style={[
            styles.sectionCard,
            {
              backgroundColor: theme.background,
              borderColor: theme.border,
            },
          ]}
        >
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Application Information</Text>
          {Object.entries(appInfo).map(([key, value]) => (
            <View key={key} style={styles.infoRow}>
              <Text style={[styles.infoLabel, { color: theme.text }]}>{key}:</Text>
              <Text style={[styles.infoValue, { color: theme.textSecondary }]}>
                {value || 'Undefined'}
              </Text>
            </View>
          ))}
        </View>

        <EnvDebugger />

        {/* JWT Token for Testing */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>JWT Token</Text>
          <Text style={[styles.description, { color: theme.textSecondary }]}>
            JWT token al ve panoya kopyala (Postman testi için)
          </Text>

          <TouchableOpacity
            style={[styles.button, { backgroundColor: themeColors.purple }]}
            onPress={getJwtToken}
            disabled={isTokenLoading}
          >
            <Text style={styles.buttonText}>
              {isTokenLoading ? 'Token alınıyor...' : 'JWT Token Al ve Kopyala'}
            </Text>
          </TouchableOpacity>

          {jwtToken && (
            <View
              style={[styles.resultBox, { backgroundColor: theme.card, borderColor: theme.border }]}
            >
              <Text style={[styles.resultText, { color: theme.text }]}>{jwtToken}</Text>
            </View>
          )}
        </View>

        {/* Edge Function Test */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Edge Function Test</Text>
          <Text style={[styles.description, { color: theme.textSecondary }]}>
            Test Edge Function connectivity and authentication
          </Text>

          <TouchableOpacity
            style={[styles.button, { backgroundColor: themeColors[accentColor] }]}
            onPress={testEdgeFunction}
            disabled={isLoading}
          >
            <Text style={styles.buttonText}>
              {isLoading ? 'Test çalışıyor...' : 'Edge Function Test Et'}
            </Text>
          </TouchableOpacity>

          {testResult && (
            <View
              style={[styles.resultBox, { backgroundColor: theme.card, borderColor: theme.border }]}
            >
              <Text style={[styles.resultText, { color: theme.text }]}>{testResult}</Text>
            </View>
          )}
        </View>

        {/* OpenRouter API Key Test */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>OpenRouter API Key Test</Text>
          <Text style={[styles.description, { color: theme.textSecondary }]}>
            Directly test getting OpenRouter API key
          </Text>

          <TouchableOpacity
            style={[styles.button, { backgroundColor: themeColors[accentColor] }]}
            onPress={testOpenRouterApiKey}
            disabled={isApiKeyLoading}
          >
            <Text style={styles.buttonText}>
              {isApiKeyLoading ? 'API Key alınıyor...' : 'OpenRouter API Key Test Et'}
            </Text>
          </TouchableOpacity>

          {apiKeyResult && (
            <View
              style={[styles.resultBox, { backgroundColor: theme.card, borderColor: theme.border }]}
            >
              <Text style={[styles.resultText, { color: theme.text }]}>{apiKeyResult}</Text>
            </View>
          )}
        </View>

        {/* OpenRouter API Key Validation Test */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>
            API Anahtarı Doğrulama Testi
          </Text>
          <Text style={[styles.description, { color: theme.textSecondary }]}>
            OpenRouter API anahtarının doğruluğunu ve çalıştığını test et
          </Text>

          <TouchableOpacity
            style={[styles.button, { backgroundColor: themeColors.green }]}
            onPress={validateOpenRouterApiKey}
            disabled={isValidationLoading}
          >
            <Text style={styles.buttonText}>
              {isValidationLoading ? 'Doğrulanıyor...' : 'OpenRouter API Anahtarını Doğrula'}
            </Text>
          </TouchableOpacity>

          {validationResult && (
            <View
              style={[styles.resultBox, { backgroundColor: theme.card, borderColor: theme.border }]}
            >
              <Text style={[styles.resultText, { color: theme.text }]}>{validationResult}</Text>
            </View>
          )}
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.button, { backgroundColor: themeColors[accentColor] }]}
            onPress={() => logEnvVariables(true)}
          >
            <Text style={styles.buttonText}>Show Environment Variables</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, { backgroundColor: themeColors.red }]}
            onPress={() => router.back()}
          >
            <Text style={styles.buttonText}>Close</Text>
          </TouchableOpacity>
        </View>

        <Text style={[styles.warningText, { color: theme.textSecondary }]}>
          ⚠️ This screen is for development purposes only. It may contain sensitive information.
          Please do not share it with anyone.
        </Text>
      </ScrollView>
    </View>
  );
};

// Debug screen styles
const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    borderRadius: 8,
    flex: 1,
    justifyContent: 'center',
    marginHorizontal: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
    marginTop: 20,
  },
  buttonText: {
    color: COLORS.WHITE,
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  container: {
    flex: 1,
  },
  description: {
    fontSize: 14,
    marginBottom: 12,
    marginTop: 4,
  },
  infoLabel: {
    flex: 1,
    fontWeight: 'bold',
  },
  infoRow: {
    borderBottomColor: COLORS.TRANSPARENT_BLACK,
    borderBottomWidth: 1,
    flexDirection: 'row',
    marginBottom: 8,
    paddingBottom: 8,
  },
  infoValue: {
    flex: 1.5,
  },
  resultBox: {
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 12,
    padding: 16,
  },
  resultText: {
    fontSize: 14,
  },
  scrollContainer: {
    padding: 16,
    paddingBottom: 40,
  },
  section: {
    marginBottom: 24,
    marginTop: 12,
  },
  sectionCard: {
    borderRadius: 12,
    borderWidth: 1,
    elevation: 2,
    marginBottom: 16,
    padding: 16,
    shadowColor: COLORS.BLACK,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
    marginTop: 8,
  },
  warningText: {
    fontSize: 12,
    marginTop: 12,
    textAlign: 'center',
  },
});

export default DebugScreen;
