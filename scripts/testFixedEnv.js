// Corrected .env Test
// This script is used to test the .env file.
const path = require('path');
const fs = require('fs');

console.log('Starting corrected .env test...');

// Specify the path to the main .env file
const envPath = path.resolve(process.cwd(), '.env');
console.log('The .env path used is:', envPath);

// Check if file exists
console.log('Is there a file?', fs.existsSync(envPath) ? 'Yes' : 'No');

// Install dotenv if not already installed
try {
  require('dotenv').config({ path: envPath });
  console.log('dotenv installed successfully.');
} catch (error) {
  console.error('Error while loading dotenv:', error.message);
}

// Check variables
console.log('\nEnvironment variables:');
console.log('SUPABASE_URL:', process.env.SUPABASE_URL || 'undefined');
console.log('SUPABASE_ANON_KEY:', process.env.SUPABASE_ANON_KEY ? 'defined (hidden)' : 'undefined');
console.log('ENCRYPTION_KEY:', process.env.ENCRYPTION_KEY ? 'defined (hidden)' : 'undefined');
console.log('NODE_ENV:', process.env.NODE_ENV || 'undefined');
