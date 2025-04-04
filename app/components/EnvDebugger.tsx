// Description: This component is used to check the environment variables in a React Native application. It provides a UI to display the status of the environment variables and allows the user to refresh the check.
import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import envCheck from '../utils/envCheck';
import { useTheme } from '../context/ThemeContext';

// Color constants
const COLORS = {
  BLACK: '#000',
  WHITE: 'white',
  TRANSPARENT_BLACK: 'rgba(0,0,0,0.05)',
};

/**
 * Developer tool to inspect environment variables
 * This component should only be used during development.
 */
const EnvDebugger = () => {
  const { theme } = useTheme();
  const [checkResult, setCheckResult] = useState<any>(null);
  const [expanded, setExpanded] = useState(true);

  useEffect(() => {
    // Check environment variables when application starts
    const result = envCheck.checkEnvVariables();
    setCheckResult(result);
  }, []);

  if (!checkResult) {
    return null;
  }

  const toggleExpand = () => {
    setExpanded(!expanded);
  };

  // Status colors
  const statusColors = {
    success: '#4CAF50', // Green
    warning: '#FF9800', // Orange
    error: '#F44336', // Red
  };

  // Choose color according to current status
  const statusColor = statusColors[checkResult.status] || '#2196F3';

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <TouchableOpacity onPress={toggleExpand} style={styles.header}>
        <View style={[styles.statusIndicator, { backgroundColor: statusColor }]} />
        <Text style={[styles.title, { color: theme.text }]}>ENV Variables Debugger</Text>
        <Text style={[styles.expandButton, { color: theme.textSecondary }]}>
          {expanded ? '▲' : '▼'}
        </Text>
      </TouchableOpacity>

      {expanded && (
        <ScrollView style={styles.content}>
          <Text style={[styles.statusText, { color: statusColor }]}>
            Status:{' '}
            {checkResult.status === 'success'
              ? '✅ Success'
              : checkResult.status === 'warning'
              ? '⚠️ Warning'
              : '❌ Error'}
          </Text>

          <Text style={[styles.message, { color: theme.text }]}>{checkResult.message}</Text>

          {Object.keys(checkResult.variables).length > 0 && (
            <View style={styles.variablesContainer}>
              <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>Variables:</Text>

              <Text style={[styles.securityWarning, { color: statusColors.warning }]}>
                🔒 Sensitive information is partially masked for security
              </Text>

              {Object.entries(checkResult.variables).map(([key, value]) => (
                <View key={key} style={styles.variableRow}>
                  <Text style={[styles.variableKey, { color: theme.text }]}>{key}:</Text>
                  <Text style={[styles.variableValue, { color: theme.textSecondary }]}>
                    {String(value)}
                  </Text>
                </View>
              ))}
            </View>
          )}

          <TouchableOpacity
            style={[styles.refreshButton, { backgroundColor: statusColor }]}
            onPress={() => {
              const result = envCheck.logEnvVariables(true);
              setCheckResult(result);
            }}
          >
            <Text style={styles.refreshButtonText}>Kontrol Et</Text>
          </TouchableOpacity>
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 8,
    elevation: 3,
    margin: 10,
    overflow: 'hidden',
    shadowColor: COLORS.BLACK,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  content: {
    maxHeight: 400,
    padding: 12,
  },
  expandButton: {
    fontSize: 18,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    padding: 12,
  },
  message: {
    fontSize: 14,
    marginBottom: 16,
  },
  refreshButton: {
    alignItems: 'center',
    borderRadius: 4,
    padding: 12,
  },
  refreshButtonText: {
    color: COLORS.WHITE,
    fontWeight: 'bold',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  securityWarning: {
    fontSize: 12,
    fontStyle: 'italic',
    marginBottom: 8,
  },
  statusIndicator: {
    borderRadius: 6,
    height: 12,
    marginRight: 8,
    width: 12,
  },
  statusText: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  title: {
    flex: 1,
    fontSize: 16,
    fontWeight: 'bold',
  },
  variableKey: {
    flex: 1,
    fontWeight: 'bold',
  },
  variableRow: {
    borderBottomColor: COLORS.TRANSPARENT_BLACK,
    borderBottomWidth: 1,
    flexDirection: 'row',
    marginBottom: 4,
    paddingVertical: 4,
  },
  variableValue: {
    flex: 1.5,
  },
  variablesContainer: {
    marginBottom: 16,
  },
});

export default EnvDebugger;
