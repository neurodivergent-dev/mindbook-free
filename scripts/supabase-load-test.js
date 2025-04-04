// Supabase Load Test
// This script is used to test the Supabase load.
import http from 'k6/http';
import { sleep, check } from 'k6';
import { Counter } from 'k6/metrics';
//import { SharedArray } from 'k6/data';

// Note: This script is designed to run on k6
// Command: k6 run scripts/supabase-load-test.js
// Environment variables must be provided:
// k6 run -e SUPABASE_URL=your_url -e SUPABASE_ANON_KEY=your_key scripts/supabase-load-test.js

// Test metrics
const errors = new Counter('errors');

// Test configuration
export const options = {
  // Basic configuration
  vus: 1, // Number of initial users

  // Progressive load testing - up to 100 concurrent users
  stages: [
    { duration: '10s', target: 10 }, // Increase to 10 users in 10 seconds
    { duration: '20s', target: 30 }, // Increase to 30 users in 20 seconds
    { duration: '20s', target: 60 }, // Increase to 60 users in 20 seconds
    { duration: '30s', target: 100 }, // Increase to 100 users in 30 seconds
    { duration: '60s', target: 100 }, // Keep at 100 users for 60 seconds
    { duration: '30s', target: 0 }, // Close in 30 seconds
  ],

  // Threshold values
  thresholds: {
    http_req_duration: ['p(95)<1000'], // 95% of requests must be faster than 1000ms (higher threshold)
    http_req_failed: ['rate<0.2'], // Error rate should be less than 20% (higher threshold)
    errors: ['count<=100'], // Up to 100 errors are acceptable (higher threshold)
  },
};

// Get Supabase credentials from environment variables
// CRITICAL: Never hardcode these values in your scripts!
const SUPABASE_URL = __ENV.SUPABASE_URL;
const SUPABASE_ANON_KEY = __ENV.SUPABASE_ANON_KEY;

// Validate that credentials are provided
if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('ERROR: Supabase credentials must be provided as environment variables');
  console.error(
    'Example: k6 run -e SUPABASE_URL=your_url -e SUPABASE_ANON_KEY=your_key scripts/supabase-load-test.js'
  );
  // k6 will exit with an error
  throw new Error('Missing required environment variables');
}

// HTTP headers
const headers = {
  'Content-Type': 'application/json',
  apikey: SUPABASE_ANON_KEY,
  Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
  Prefer: 'return=minimal',
};

// Test scenario
export default function () {
  // Unique identifier for each user
  const testId = `${__VU}-${__ITER}-${Date.now()}`;

  // To avoid excessive logging, log only for every 10th user.
  if (__VU % 10 === 0) {
    console.log(`Testing is running... VU: ${__VU}, Iteration: ${__ITER}, ID: ${testId}`);
  }

  // 1. GET request test
  const getRes = http.get(`${SUPABASE_URL}/rest/v1/backups?select=*&limit=5`, { headers });

  check(getRes, {
    'GET request successful': r => r.status === 200,
    'GET response in JSON format': r => {
      try {
        JSON.parse(r.body);
        return true;
      } catch (e) {
        console.log('GET response is not JSON:', r.body);
        return false;
      }
    },
  }) || errors.add(1);

  sleep(Math.random() * 0.5 + 0.2); // Random wait between 0.2-0.7 seconds (shorter)

  // 2. POST request testing
  const testBackup = {
    user_id: `test_user_${testId}`,
    data: {
      notes: `This encrypted note data is for testing purposes - ${testId}`,
      categories: `Test categories - ${testId}`,
      app_version: '4.0.1',
      backup_date: new Date().toISOString(),
    },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const postRes = http.post(`${SUPABASE_URL}/rest/v1/backups`, JSON.stringify(testBackup), {
    headers,
  });

  check(postRes, {
    'POST request successful': r => r.status === 201,
    'POST response format valid': r => {
      // When 'return=minimal' an empty response is expected
      const preferenceApplied = r.headers['Preference-Applied'] || r.headers['preference-applied'];
      if (preferenceApplied === 'return=minimal') {
        return true; // Accept as true since we expect an empty response
      }

      // If there is no Preference-Applied, we expect JSON
      if (r.body.length === 0) {
        return true; // Blank response is also acceptable
      }

      try {
        JSON.parse(r.body);
        return true;
      } catch (e) {
        console.log('POST response is not JSON:', r.body);
        return false;
      }
    },
  }) || errors.add(1);

  // Avoid slowing down the server by waiting a bit at the end of the test
  sleep(Math.random() * 1 + 0.5); // Random wait between 0.5-1.5 seconds (shorter)
}
