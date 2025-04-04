// Simple .env Test
// This script is used to test the .env file.
console.log('Simple test begins...');

// Before loading the module
console.log('Before loading the module:');
console.log('SUPABASE_URL:', process.env.SUPABASE_URL || 'undefined');

// load dotenv
try {
  require('dotenv').config();
  console.log('dotenv installed');
} catch (error) {
  console.error('Error while installing dotenv:', error.message);
}

// After the module is loaded
console.log('\nAfter the module is loaded:');
console.log('SUPABASE_URL:', process.env.SUPABASE_URL || 'undefined');

// Check file existence
const fs = require('fs');
console.log('\nIs there an .env file?', fs.existsSync('.env') ? 'Yes' : 'No');
