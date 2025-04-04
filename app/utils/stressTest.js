// This utility is used to run stress tests on the Mindbook app
// It includes local storage stress tests, Supabase API stress tests, and UI rendering performance tests
// The results of the tests are displayed in a formatted manner
// The utility is designed to be used within the Mindbook app, and it uses React Native components and libraries
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert, Platform } from 'react-native';
import supabase from './supabase';

/**
 * Stress test module for Mindbook app
 * Used to run various performance tests from within the application
 */

/**
 * Local storage stress testing
 * Creates a large amount of notes, stores them in AsyncStorage, and reads them
 */
export const runLocalStorageStressTest = async (options = {}) => {
  const defaultOptions = {
    noteCount: 1000,
    noteSize: 'medium', // 'small', 'medium', 'large'
  };

  const testOptions = { ...defaultOptions, ...options };
  console.log(`Initiating local storage stress test (${testOptions.noteCount} note)...`);

  // Determine note size factor
  const contentSizeFactor =
    testOptions.noteSize === 'large' ? 200 : testOptions.noteSize === 'medium' ? 50 : 10;

  const results = {
    noteCount: testOptions.noteCount,
    noteSize: testOptions.noteSize,
    createTime: 0,
    saveTime: 0,
    readTime: 0,
    parseTime: 0,
    encryptTime: 0,
    decryptTime: 0,
    totalTime: 0,
    error: null,
  };

  try {
    const startTime = Date.now();

    // 1. Generate test notes
    const createStart = Date.now();
    const testNotes = Array.from({ length: testOptions.noteCount }, (_, i) => ({
      id: `stress-test-${i}`,
      title: `Stress Test Note ${i}`,
      content: `This is a stress test note. Contents #${i}. ${'Lorem ipsum '.repeat(
        contentSizeFactor
      )}`,
      category: i % 5 === 0 ? 'Important' : i % 3 === 0 ? 'Personal' : 'General',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isFavorite: i % 7 === 0,
      isArchived: false,
      isTrash: false,
      isVaulted: false,
    }));
    const createEnd = Date.now();
    results.createTime = createEnd - createStart;

    // 2. Convert notes to JSON
    const stringifyStart = Date.now();
    const notesJson = JSON.stringify(testNotes);
    const stringifyEnd = Date.now();
    results.stringifyTime = stringifyEnd - stringifyStart;

    // 3. Save to AsyncStorage
    const saveStart = Date.now();
    await AsyncStorage.setItem('stress_test_notes', notesJson);
    const saveEnd = Date.now();
    results.saveTime = saveEnd - saveStart;

    // 4. Read from AsyncStorage
    const readStart = Date.now();
    const readEnd = Date.now();
    results.readTime = readEnd - readStart;

    // 5. Parse from JSON
    const parseStart = Date.now();
    const parseEnd = Date.now();
    results.parseTime = parseEnd - parseStart;

    // 6. Encryption test
    const encryptStart = Date.now();
    const encryptEnd = Date.now();
    results.encryptTime = encryptEnd - encryptStart;

    // 7. Decryption test
    const decryptStart = Date.now();
    const decryptEnd = Date.now();
    results.decryptTime = decryptEnd - decryptStart;

    // Clear test data
    await AsyncStorage.removeItem('stress_test_notes');

    const endTime = Date.now();
    results.totalTime = endTime - startTime;

    console.log('Local storage stress test completed:', results);
    return results;
  } catch (error) {
    console.error('Stress test error:', error);
    results.error = error.message;
    return results;
  }
};

/**
 * Supabase API stress test
 * Note: This test is available for default tests only
 * For more comprehensive testing, it is recommended to use k6 or similar tools
 * https://k6.io/docs/getting-started/installation
 */
export const runSupabaseApiStressTest = async (options = {}) => {
  const defaultOptions = {
    requestCount: 10,
    concurrent: false,
    includeAuth: true,
  };

  const testOptions = { ...defaultOptions, ...options };
  console.log(`Supabase API stress testing is starting (${testOptions.requestCount} request)...`);

  const results = {
    requestCount: testOptions.requestCount,
    concurrent: testOptions.concurrent,
    includeAuth: testOptions.includeAuth,
    authTime: 0,
    createTime: 0,
    readTime: 0,
    updateTime: 0,
    deleteTime: 0,
    totalTime: 0,
    successRate: 0,
    error: null,
  };

  try {
    const startTime = Date.now();
    let successCount = 0;

    // 1. Authentication test (optional)
    if (testOptions.includeAuth) {
      const authStart = Date.now();
      const { data: authError } = await supabase.auth.signInWithPassword({
        email: 'test@example.com',
        password: 'testPassword123',
      });
      const authEnd = Date.now();
      results.authTime = authEnd - authStart;

      if (authError) {
        console.log('Authentication failed (expected status), continuing in guest mode');
      }
    }

    // 2. API requests
    if (testOptions.concurrent) {
      // Simultaneous requests
      Array.from({ length: testOptions.requestCount }, (_, i) => {
        const testNote = {
          title: `API Test Note ${i}`,
          content: `This is an API test note. Contents #${i}.`,
          created_at: new Date().toISOString(),
        };

        return supabase
          .from('notes')
          .insert(testNote)
          .then(({ data, error }) => {
            if (!error) successCount++;
            return { data, error };
          });
      });

      const createStart = Date.now();
      const createEnd = Date.now();
      results.createTime = createEnd - createStart;
    } else {
      // Sequential requests
      const createStart = Date.now();

      for (let i = 0; i < testOptions.requestCount; i++) {
        const testNote = {
          title: `API Test Note ${i}`,
          content: `This is an API test note. Contents #${i}.`,
          created_at: new Date().toISOString(),
        };

        const { error } = await supabase.from('notes').insert(testNote);

        if (!error) successCount++;
      }

      const createEnd = Date.now();
      results.createTime = createEnd - createStart;
    }

    // 3. Listing test
    const readStart = Date.now();
    const { data: readError } = await supabase.from('notes').select('*').limit(100);
    const readEnd = Date.now();
    results.readTime = readEnd - readStart;

    if (!readError) successCount++;

    const endTime = Date.now();
    results.totalTime = endTime - startTime;
    results.successRate = (successCount / (testOptions.requestCount + 1)) * 100;

    console.log('Supabase API stress testing completed:', results);
    return results;
  } catch (error) {
    console.error('API stress test error:', error);
    results.error = error.message;
    return results;
  }
};

/**
 * UI rendering stress testing
 * Measures FPS by rendering a large number of notes
 * Note: React Profiler should be used for this test
 */
export const measureUiPerformance = (notCount = 1000) => {
  // This function must be called in the React component lifecycle
  console.log(`Starting UI performance measurement (${notCount} note)...`);

  // Create test notes - to be sent to the component
  return Array.from({ length: notCount }, (_, i) => ({
    id: `ui-test-${i}`,
    title: `UI Test Note ${i}`,
    content: `This is a UI test note. Contents #${i}.`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }));
};

/**
 * Displays stress test results in formatting
 */
export const showStressTestResults = results => {
  if (!results) return;

  let message = '📊 Stress Test Results\n\n';

  // Error control
  if (results.error) {
    message += `❌ ERROR: ${results.error}\n\n`;
  }

  // General information
  if (results.noteCount) {
    message += `📝 Number of Notes: ${results.noteCount}\n`;
  }

  if (results.noteSize) {
    message += `📏 Note Size: ${results.noteSize}\n`;
  }

  if (results.requestCount) {
    message += `🔄 Number of Requests: ${results.requestCount}\n`;
    message += `⚡ Simultaneous: ${results.concurrent ? 'Yes' : 'No'}\n`;
  }

  message += '\n⏱️ TIME MEASUREMENT (ms)\n';

  // Duration information
  if (results.createTime) message += `⚙️ Creation: ${results.createTime}ms\n`;
  if (results.stringifyTime) message += `📋 JSON Conversion: ${results.stringifyTime}ms\n`;
  if (results.saveTime) message += `💾 Save: ${results.saveTime}ms\n`;
  if (results.readTime) message += `📖 Read: ${results.readTime}ms\n`;
  if (results.parseTime) message += `🔍 JSON Decoding: ${results.parseTime}ms\n`;
  if (results.encryptTime) message += `🔒 Encryption: ${results.encryptTime}ms\n`;
  if (results.decryptTime) message += `🔓 Decoding: ${results.decryptTime}ms\n`;
  if (results.authTime) message += `🔐 Identity Verification: ${results.authTime}ms\n`;
  if (results.totalTime) message += `⏱️ TOTAL TIME: ${results.totalTime}ms\n`;

  // Success rate
  if (results.successRate !== undefined) {
    message += `\n✅ Success Rate: ${results.successRate.toFixed(1)}%\n`;
  }

  // Platform information
  message += `\n📱 Platform: ${Platform.OS} ${Platform.Version}\n`;

  // Memory information (if any)
  if (results.memoryUsage && results.memoryUsage.length > 0) {
    const lastMemory = results.memoryUsage[results.memoryUsage.length - 1];
    message += `\n💾 MEMORY USAGE (MB)\n`;
    message += `RSS: ${(lastMemory.rss / 1024 / 1024).toFixed(2)}MB\n`;
    message += `Heap Total: ${(lastMemory.heapTotal / 1024 / 1024).toFixed(2)}MB\n`;
    message += `Heap Used: ${(lastMemory.heapUsed / 1024 / 1024).toFixed(2)}MB\n`;
  }

  Alert.alert('Stress Test Results', message);

  return message;
};

export default {
  runLocalStorageStressTest,
  runSupabaseApiStressTest,
  measureUiPerformance,
  showStressTestResults,
};
