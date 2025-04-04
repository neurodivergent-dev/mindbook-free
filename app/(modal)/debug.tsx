// This file is Debug Screen for development purposes.
// It displays application information and environment variables.
// It is not intended for production use and should not be shared with anyone.
import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { useTheme } from '../context/ThemeContext';
import EnvDebugger from '../components/EnvDebugger';
import Constants from 'expo-constants';
import { logEnvVariables } from '../utils/envCheck';

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

  // Check environment variables when application starts and print to console
  useEffect(() => {
    logEnvVariables();
  }, []);

  // Get AppConfig information
  const appInfo = {
    name: Constants.expoConfig?.name || 'Unknown',
    version: Constants.expoConfig?.version || 'Unknown',
    buildNumber:
      Platform.OS === 'ios'
        ? Constants.expoConfig?.ios?.buildNumber
        : Constants.expoConfig?.android?.versionCode,
    bundleId:
      Platform.OS === 'ios'
        ? Constants.expoConfig?.ios?.bundleIdentifier
        : Constants.expoConfig?.android?.package,
    platform: Platform.OS,
    nodeEnv: process.env.NODE_ENV || 'production',
    isDevelopment: __DEV__ ? 'Yes' : 'No',
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Stack.Screen
        options={{
          title: 'Development Tools',
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

import { Platform } from 'react-native';

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
  scrollContainer: {
    padding: 16,
    paddingBottom: 40,
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
  warningText: {
    fontSize: 12,
    marginTop: 12,
    textAlign: 'center',
  },
});

export default DebugScreen;
