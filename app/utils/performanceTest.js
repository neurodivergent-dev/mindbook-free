// This utility module is used for performance testing in the Mindbook application.
// It includes functions to measure the performance of various operations, such as creating, saving, and reading notes.
// It also includes functions to check memory usage and measure UI render performance.
import { PerformanceObserver } from 'react-native-performance';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { encryptNotes } from './encryption';

/**
 * Comprehensive performance testing module for the Mindbook application.
 * This module is used to measure the performance of various parts of the application.
 */

// Performance monitor setup
let performanceObserver;
try {
  performanceObserver = new PerformanceObserver(list => {
    const entries = list.getEntries();
    entries.forEach(entry => {
      console.log(`${entry.name}: ${entry.duration.toFixed(2)}ms`);
    });
  });
  performanceObserver.observe({ entryTypes: ['measure'] });
} catch (error) {
  console.error('Performance monitoring is not supported:', error);
}

// Performance measurement functions
const measure = (name, fn) => {
  const startTime = performance.now();
  const result = fn();
  const endTime = performance.now();
  console.log(`${name}: ${(endTime - startTime).toFixed(2)}ms`);
  return { result, duration: endTime - startTime };
};

const measureAsync = async (name, asyncFn) => {
  const startTime = performance.now();
  try {
    const result = await asyncFn();
    const endTime = performance.now();
    console.log(`${name}: ${(endTime - startTime).toFixed(2)}ms`);
    return { result, duration: endTime - startTime, error: null };
  } catch (error) {
    const endTime = performance.now();
    console.error(`${name} hata: ${error.message}`);
    return { result: null, duration: endTime - startTime, error };
  }
};

// Constants for chunking and size limits
const CHUNK_SIZE = 500; // Maximum notes per chunk
const MAX_CONTENT_LENGTH = 5000; // Maximum content length per note
const MAX_NOTE_SIZE = 100 * 1024; // 100KB limit per note

// Helper function to calculate object size in bytes
const getObjectSize = obj => {
  const str = JSON.stringify(obj);
  // UTF-16 uses 2 bytes per character
  return str.length * 2;
};

// Helper function to chunk large datasets with size control
const chunkArray = (array, maxChunkSize) => {
  const chunks = [];
  let currentChunk = [];
  let currentSize = 0;

  for (const item of array) {
    const itemSize = getObjectSize(item);

    // Skip items that are too large
    if (itemSize > MAX_NOTE_SIZE) {
      console.warn(`Note ${item.id} exceeds maximum size limit of ${MAX_NOTE_SIZE} bytes`);
      continue;
    }

    // If adding this item would exceed chunk size, start a new chunk
    if (currentSize + itemSize > maxChunkSize) {
      chunks.push(currentChunk);
      currentChunk = [];
      currentSize = 0;
    }

    currentChunk.push(item);
    currentSize += itemSize;
  }

  // Add the last chunk if it has items
  if (currentChunk.length > 0) {
    chunks.push(currentChunk);
  }

  return chunks;
};

// Helper function to truncate content with size check
const truncateContent = (content, maxLength) => {
  if (!content) return '';

  // First truncate by character length
  let truncated = content.length > maxLength ? content.substring(0, maxLength) + '...' : content;

  // Then check actual byte size
  while (getObjectSize(truncated) > MAX_NOTE_SIZE) {
    maxLength = Math.floor(maxLength * 0.9); // Reduce by 10%
    truncated = content.substring(0, maxLength) + '...';
  }

  return truncated;
};

/**
 * Grade upload stress test.
 * Creates, saves and reads a specified number of notes.
 * @param {number} notCount - Number of notes to be tested
 */
export const runNoteLoadTest = async (notCount = 1000) => {
  console.log(`Starting: ${notCount} grade loading test...`);

  // Create test notes with size limits
  const createNotes = () => {
    return Array.from({ length: notCount }, (_, i) => ({
      id: `test-${i}`,
      title: `Test Note ${i}`,
      content: truncateContent(
        `This is a test note. Contents #${i}. ${'Lorem ipsum '.repeat(50)}`,
        MAX_CONTENT_LENGTH
      ),
      category: i % 5 === 0 ? 'Important' : i % 3 === 0 ? 'Personal' : 'General',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isFavorite: i % 7 === 0,
      isArchived: false,
      isTrash: false,
      isVaulted: false,
    }));
  };

  // Create notes
  const { result: testNotes, duration: createDuration } = measure(`${notCount} create notes`, () =>
    createNotes()
  );

  // Split notes into chunks for storage
  const chunks = chunkArray(testNotes, CHUNK_SIZE);
  let totalWriteDuration = 0;
  let totalReadDuration = 0;

  // Save chunks to AsyncStorage
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    const { duration: writeDuration, error: writeError } = await measureAsync(
      `Saving chunk ${i + 1}/${chunks.length}`,
      async () => await AsyncStorage.setItem(`notes_chunk_${i}`, JSON.stringify(chunk))
    );

    if (writeError) {
      return { error: 'Error saving notes chunk', details: writeError };
    }

    totalWriteDuration += writeDuration;
  }

  // Read and combine chunks
  let combinedNotes = [];
  for (let i = 0; i < chunks.length; i++) {
    const { duration: readDuration, error: readError } = await measureAsync(
      `Reading chunk ${i + 1}/${chunks.length}`,
      async () => {
        const chunk = await AsyncStorage.getItem(`notes_chunk_${i}`);
        if (chunk) {
          combinedNotes = combinedNotes.concat(JSON.parse(chunk));
        }
      }
    );

    if (readError) {
      return { error: 'Error reading notes chunk', details: readError };
    }

    totalReadDuration += readDuration;
  }

  // Clean up chunks
  for (let i = 0; i < chunks.length; i++) {
    await AsyncStorage.removeItem(`notes_chunk_${i}`);
  }

  // Encryption test
  const { duration: encryptDuration, error: encryptError } = await measureAsync(
    `${notCount} note encryption`,
    async () => encryptNotes(combinedNotes)
  );

  if (encryptError) {
    return { error: 'Note encryption error', details: encryptError };
  }

  return {
    noteCount: notCount,
    createDuration,
    writeDuration: totalWriteDuration,
    readDuration: totalReadDuration,
    encryptDuration,
    platformInfo: {
      os: Platform.OS,
      version: Platform.Version,
    },
  };
};

/**
 * Stress test suite with gradually increasing number of notes
 */
export const runStressTestSuite = async () => {
  const results = [];
  const counts = [10, 100, 500, 1000, 2500, 4000, 4500, 5000];

  for (const count of counts) {
    console.log(`\n========= ${count} NOTE TEST STARTS =========`);
    const result = await runNoteLoadTest(count);
    results.push(result);

    if (result.error) {
      console.error(`Testing stopped: ${result.error}`);
      break;
    }

    // After each test, let's wait a bit and clear the memory
    await AsyncStorage.removeItem('notes');
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  // Print results
  console.log('\n========= STRESS TEST RESULTS =========');
  results.forEach((result, index) => {
    if (result.error) {
      console.log(`Test #${index + 1}: ERROR - ${result.error}`);
    } else {
      console.log(`Test #${index + 1}: ${result.noteCount} note`);
      console.log(`  Creation: ${result.createDuration.toFixed(2)}ms`);
      console.log(`  Write: ${result.writeDuration.toFixed(2)}ms`);
      console.log(`  Read: ${result.readDuration.toFixed(2)}ms`);
      console.log(`  Encryption: ${result.encryptDuration.toFixed(2)}ms`);
    }
  });

  return results;
};

/**
 * Memory Usage Test
 * Note: This information may vary from platform to platform and may be limited.
 */
export const checkMemoryUsage = () => {
  if (global.performance && global.performance.memory) {
    const memoryInfo = global.performance.memory;
    return {
      totalJSHeapSize: memoryInfo.totalJSHeapSize,
      usedJSHeapSize: memoryInfo.usedJSHeapSize,
      jsHeapSizeLimit: memoryInfo.jsHeapSizeLimit,
    };
  }
  return { error: 'Memory information is not available on this platform' };
};

/**
 * UI Render Performance Test
 * Note list render times
 */
export const measureNoteListRender = (noteCount, renderFunction) => {
  // Create test notes
  const testNotes = Array.from({ length: noteCount }, (_, i) => ({
    id: `test-${i}`,
    title: `Test Note ${i}`,
    content: `This is a test note. Contents #${i}.`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }));

  // Measure render time
  const startTime = performance.now();
  renderFunction(testNotes);
  const endTime = performance.now();

  return {
    noteCount,
    renderTime: endTime - startTime,
  };
};

export default {
  runNoteLoadTest,
  runStressTestSuite,
  checkMemoryUsage,
  measureNoteListRender,
};
