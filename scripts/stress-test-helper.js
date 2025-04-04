/**
 * Mindbook Stress Test Helper
 *
 * This file is used to help run stress tests.
 * It can be called from React Native application.
 */

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const os = require('os');

// Running k6 tests for Supabase
const runSupabaseLoadTest = (options = {}) => {
  return new Promise((resolve, reject) => {
    const defaultOptions = {
      vus: 10,
      duration: '30s',
      outputFile: path.join(os.tmpdir(), 'supabase-load-test-results.json'),
    };

    const testOptions = { ...defaultOptions, ...options };

    console.log('Starting Supabase load test...');
    console.log(`Number of virtual users: ${testOptions.vus}`);
    console.log(`Testing period: ${testOptions.duration}`);

    // Create K6 command
    const k6Command = `k6 run --vus ${testOptions.vus} --duration ${
      testOptions.duration
    } --out json=${testOptions.outputFile} ${path.join(__dirname, 'supabase-load-test.js')}`;

    exec(k6Command, (error, stdout, stderr) => {
      if (error) {
        console.error('An error occurred while running the load test:', error);
        reject(error);
        return;
      }

      if (stderr) {
        console.warn('Load test warnings:', stderr);
      }

      console.log('Test output:', stdout);

      // Try reading the results file
      try {
        if (fs.existsSync(testOptions.outputFile)) {
          const results = fs.readFileSync(testOptions.outputFile, 'utf8');
          const parsedResults = JSON.parse(results);
          resolve(parsedResults);
        } else {
          resolve({ message: 'Test completed but results file not found', raw: stdout });
        }
      } catch (err) {
        console.error('An error occurred while reading the results:', err);
        resolve({ message: 'Test completed but results could not be processed', raw: stdout });
      }
    });
  });
};

// CPU and memory load testing
const runCpuMemoryLoadTest = (options = {}) => {
  return new Promise(resolve => {
    const defaultOptions = {
      duration: 10000, // duration in ms
      intensity: 'medium', // 'low', 'medium', 'high'
    };

    const testOptions = { ...defaultOptions, ...options };
    console.log(`Starting CPU and memory load test (${testOptions.intensity} intensity)...`);

    const startTime = Date.now();
    const results = {
      startTime,
      endTime: null,
      duration: testOptions.duration,
      intensity: testOptions.intensity,
      memoryUsage: [],
    };

    // Create load
    const loadFactor =
      testOptions.intensity === 'high' ? 0.9 : testOptions.intensity === 'medium' ? 0.6 : 0.3;

    // Measure memory usage at regular intervals
    const memoryInterval = setInterval(() => {
      results.memoryUsage.push(process.memoryUsage());
    }, 1000);

    // Generate CPU load
    let counter = 0;
    const endTime = startTime + testOptions.duration;

    const generateLoad = () => {
      while (Date.now() < endTime) {
        // Unnecessary process that will create CPU load
        for (let i = 0; i < 10000 * loadFactor; i++) {
          counter++;
          Math.random() * Math.random();
          JSON.stringify({ test: 'data', counter });
        }
      }

      clearInterval(memoryInterval);
      results.endTime = Date.now();
      results.actualDuration = results.endTime - results.startTime;

      console.log(`CPU and memory load test completed (${results.actualDuration} ms)`);
      resolve(results);
    };

    // Start load generation
    setTimeout(generateLoad, 0);
  });
};

module.exports = {
  runSupabaseLoadTest,
  runCpuMemoryLoadTest,
};
