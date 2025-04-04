// This file is Performance Test screen for the app.
// It contains buttons to run various performance tests and displays the results.
// The tests include loading notes, storage tests, and API tests.
import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { runNoteLoadTest, runStressTestSuite } from '../utils/performanceTest';
import {
  runLocalStorageStressTest,
  runSupabaseApiStressTest,
  showStressTestResults,
} from '../utils/stressTest';
import { useRouter } from 'expo-router';
import { Stack } from 'expo-router';

export default function PerformanceTestScreen() {
  const { theme, themeColors, accentColor } = useTheme();
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState([]);
  const [testType, setTestType] = useState('basic');
  const router = useRouter();

  // Development mode check
  if (!__DEV__) {
    router.back();
    return null;
  }

  const runSingleTest = async count => {
    setLoading(true);
    try {
      const result = await runNoteLoadTest(count);
      setResults(prev => [result, ...prev]);
    } catch (error) {
      console.error('Test error:', error);
      Alert.alert('Test Error', error.toString());
    } finally {
      setLoading(false);
    }
  };

  const runFullTest = async () => {
    setLoading(true);
    try {
      const suiteResults = await runStressTestSuite();
      setResults(suiteResults);
    } catch (error) {
      console.error('Test suite error:', error);
      Alert.alert('Test Suite Error', error.toString());
    } finally {
      setLoading(false);
    }
  };

  // Depolama test fonksiyonları
  const runStorageTest = async options => {
    setLoading(true);
    try {
      const result = await runLocalStorageStressTest(options);
      showStressTestResults(result);
      setResults(prev => [result, ...prev]);
    } catch (error) {
      console.error('Depolama testi hatası:', error);
      Alert.alert('Depolama Testi Hatası', error.toString());
    } finally {
      setLoading(false);
    }
  };

  // API test fonksiyonları
  const runApiTest = async options => {
    setLoading(true);
    try {
      const result = await runSupabaseApiStressTest(options);
      showStressTestResults(result);
      setResults(prev => [result, ...prev]);
    } catch (error) {
      console.error('API testi hatası:', error);
      Alert.alert('API Testi Hatası', error.toString());
    } finally {
      setLoading(false);
    }
  };

  // Test type selection buttons
  const renderTestTypeButtons = () => (
    <View style={styles.testTypeContainer}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <TouchableOpacity
          style={[
            styles.testTypeButton,
            testType === 'basic' && { backgroundColor: themeColors[accentColor] },
          ]}
          onPress={() => setTestType('basic')}
        >
          <Text style={[styles.testTypeText, testType === 'basic' && { color: themeColors.white }]}>
            Basic Tests
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.testTypeButton,
            testType === 'storage' && { backgroundColor: themeColors[accentColor] },
          ]}
          onPress={() => setTestType('storage')}
        >
          <Text
            style={[styles.testTypeText, testType === 'storage' && { color: themeColors.white }]}
          >
            Storage Tests
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.testTypeButton,
            testType === 'api' && { backgroundColor: themeColors[accentColor] },
          ]}
          onPress={() => setTestType('api')}
        >
          <Text style={[styles.testTypeText, testType === 'api' && { color: themeColors.white }]}>
            API Tests
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.testTypeButton,
            testType === 'components' && { backgroundColor: themeColors[accentColor] },
          ]}
          onPress={() => setTestType('components')}
        >
          <Text
            style={[styles.testTypeText, testType === 'components' && { color: themeColors.white }]}
          >
            Component Tests
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );

  // Basic tests
  const renderBasicTests = () => (
    <ScrollView style={styles.buttonContainer} contentContainerStyle={styles.buttonGrid}>
      <TouchableOpacity
        style={[styles.button, { backgroundColor: themeColors[accentColor] }]}
        onPress={() => runSingleTest(100)}
        disabled={loading}
      >
        <Text style={[styles.buttonText, { color: themeColors.white }]}>100 Notes Test</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.button, { backgroundColor: themeColors[accentColor] }]}
        onPress={() => runSingleTest(1000)}
        disabled={loading}
      >
        <Text style={[styles.buttonText, { color: themeColors.white }]}>1000 Notes Test</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.button, { backgroundColor: themeColors[accentColor] }]}
        onPress={() => runSingleTest(2500)}
        disabled={loading}
      >
        <Text style={[styles.buttonText, { color: themeColors.white }]}>2500 Notes Test</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.button, { backgroundColor: themeColors[accentColor] }]}
        onPress={() => runSingleTest(4000)}
        disabled={loading}
      >
        <Text style={[styles.buttonText, { color: themeColors.white }]}>4000 Notes Test</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.button, { backgroundColor: themeColors[accentColor] }]}
        onPress={() => runSingleTest(4500)}
        disabled={loading}
      >
        <Text style={[styles.buttonText, { color: themeColors.white }]}>4500 Notes Test</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.button, { backgroundColor: themeColors[accentColor] }]}
        onPress={() => runSingleTest(5000)}
        disabled={loading}
      >
        <Text style={[styles.buttonText, { color: themeColors.white }]}>5000 Notes Test</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.button, { backgroundColor: themeColors[accentColor] }]}
        onPress={runFullTest}
        disabled={loading}
      >
        <Text style={[styles.buttonText, { color: themeColors.white }]}>Full Stress Test</Text>
      </TouchableOpacity>
    </ScrollView>
  );

  // Storage tests
  const renderStorageTests = () => (
    <ScrollView style={styles.buttonContainer} contentContainerStyle={styles.buttonGrid}>
      <TouchableOpacity
        style={[styles.button, { backgroundColor: themeColors[accentColor] }]}
        onPress={() => runStorageTest({ noteCount: 100, noteSize: 'small' })}
        disabled={loading}
      >
        <Text style={[styles.buttonText, { color: themeColors.white }]}>100 Small Notes</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.button, { backgroundColor: themeColors[accentColor] }]}
        onPress={() => runStorageTest({ noteCount: 1000, noteSize: 'small' })}
        disabled={loading}
      >
        <Text style={[styles.buttonText, { color: themeColors.white }]}>1000 Small Notes</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.button, { backgroundColor: themeColors[accentColor] }]}
        onPress={() => runStorageTest({ noteCount: 100, noteSize: 'medium' })}
        disabled={loading}
      >
        <Text style={[styles.buttonText, { color: themeColors.white }]}>100 Medium Notes</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.button, { backgroundColor: themeColors[accentColor] }]}
        onPress={() => runStorageTest({ noteCount: 100, noteSize: 'large' })}
        disabled={loading}
      >
        <Text style={[styles.buttonText, { color: themeColors.white }]}>100 Large Notes</Text>
      </TouchableOpacity>
    </ScrollView>
  );

  // API tests
  const renderApiTests = () => (
    <ScrollView style={styles.buttonContainer} contentContainerStyle={styles.buttonGrid}>
      <TouchableOpacity
        style={[styles.button, { backgroundColor: themeColors[accentColor] }]}
        onPress={() => runApiTest({ requestCount: 5, concurrent: false })}
        disabled={loading}
      >
        <Text style={[styles.buttonText, { color: themeColors.white }]}>5 Sequential Requests</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.button, { backgroundColor: themeColors[accentColor] }]}
        onPress={() => runApiTest({ requestCount: 5, concurrent: true })}
        disabled={loading}
      >
        <Text style={[styles.buttonText, { color: themeColors.white }]}>5 Concurrent Requests</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.button, { backgroundColor: themeColors[accentColor] }]}
        onPress={() => runApiTest({ requestCount: 20, concurrent: true })}
        disabled={loading}
      >
        <Text style={[styles.buttonText, { color: themeColors.white }]}>
          20 Concurrent Requests
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.button, { backgroundColor: themeColors[accentColor] }]}
        onPress={() =>
          Alert.alert(
            'Info',
            'For more comprehensive API tests, you can use the k6 tool. Check the "scripts/supabase-load-test.js" file.'
          )
        }
        disabled={loading}
      >
        <Text style={[styles.buttonText, { color: themeColors.white }]}>Info</Text>
      </TouchableOpacity>
    </ScrollView>
  );

  // Component testing
  const renderComponentTests = () => (
    <View style={[styles.infoContainer, { borderColor: themeColors.gray }]}>
      <Text style={[styles.infoText, { color: theme.text }]}>
        Use React Profiler tool and React DevTools extension for component performance tests. You
        can measure performance under the Profiler tab in Developer Tools.
      </Text>
    </View>
  );

  // Showing relevant test buttons according to test type
  const renderTestButtons = () => {
    switch (testType) {
      case 'storage':
        return renderStorageTests();
      case 'api':
        return renderApiTests();
      case 'components':
        return renderComponentTests();
      default:
        return renderBasicTests();
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Stack.Screen
        options={{
          title: 'Performance Test',
          headerStyle: {
            backgroundColor: themeColors[accentColor],
          },
          headerShadowVisible: true,
          headerTintColor: '#FFFFFF',
          headerTitleStyle: {
            fontWeight: '600',
            fontSize: 18,
            color: '#FFFFFF',
          },
        }}
      />

      {renderTestTypeButtons()}
      {renderTestButtons()}

      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={themeColors[accentColor]} />
          <Text style={[styles.loadingText, { color: theme.text }]}>Running test...</Text>
        </View>
      )}

      <ScrollView style={styles.resultsContainer}>
        <Text style={[styles.resultsTitle, { color: theme.text }]}>Latest Test Results</Text>

        {results.map((result, index) => {
          // Skip if user has called the results display function
          if (result.noteSize || result.requestCount) return null;

          return (
            <View key={index} style={[styles.resultCard, { backgroundColor: theme.card }]}>
              {result.error ? (
                <>
                  <Text style={[styles.resultCardTitle, { color: themeColors.red }]}>Error</Text>
                  <Text style={{ color: themeColors.red }}>{result.error}</Text>
                </>
              ) : (
                <>
                  <Text style={[styles.resultCardTitle, { color: theme.text }]}>
                    {result.noteCount} Notes Test
                  </Text>
                  <Text style={{ color: theme.textSecondary }}>
                    Creation: {result.createDuration?.toFixed(2)} ms
                  </Text>
                  <Text style={{ color: theme.textSecondary }}>
                    Write: {result.writeDuration?.toFixed(2)} ms
                  </Text>
                  <Text style={{ color: theme.textSecondary }}>
                    Read: {result.readDuration?.toFixed(2)} ms
                  </Text>
                  <Text style={{ color: theme.textSecondary }}>
                    Encryption: {result.encryptDuration?.toFixed(2)} ms
                  </Text>
                </>
              )}
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

// Styling for the Performance Test screen
const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    borderRadius: 8,
    justifyContent: 'center',
    margin: 4,
    minWidth: '47%',
    padding: 12,
  },
  buttonContainer: {
    marginBottom: 16,
    maxHeight: 180,
  },
  buttonGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  buttonText: {
    fontWeight: 'bold',
  },
  container: {
    flex: 1,
  },
  infoContainer: {
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 16,
    padding: 16,
  },
  infoText: {
    lineHeight: 20,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  loadingText: {
    fontSize: 16,
    marginTop: 8,
  },
  resultCard: {
    borderRadius: 8,
    marginBottom: 12,
    padding: 16,
  },
  resultCardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  resultsContainer: {
    flex: 1,
    padding: 16,
  },
  resultsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  testTypeButton: {
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  testTypeContainer: {
    marginBottom: 16,
    padding: 16,
  },
  testTypeText: {
    fontWeight: '500',
  },
});
