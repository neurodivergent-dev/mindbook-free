// .env Test
// This script is used to test the .env file.
console.log('dotenv test starting...');

// Load dotenv module
require('dotenv').config();

console.log('-------------------------------------');
console.log('Environment variables:');
console.log('SUPABASE_URL:', process.env.SUPABASE_URL || 'undefined');
console.log('SUPABASE_ANON_KEY:', process.env.SUPABASE_ANON_KEY ? 'defined (hidden)' : 'undefined');
console.log('ENCRYPTION_KEY:', process.env.ENCRYPTION_KEY ? 'defined (hidden)' : 'undefined');
console.log('NODE_ENV:', process.env.NODE_ENV || 'undefined');

// Read .env file using file system module
const fs = require('fs');
console.log('\n-------------------------------------');
console.log('.env file content:');

try {
  const envFile = fs.readFileSync('.env', 'utf8');
  console.log('File found and read.');

  // Separate content line by line
  const lines = envFile.split('\n').filter(line => line.trim() !== '');
  console.log(`Total ${lines.length} contains lines.`);

  // Show the beginning of the first few lines
  lines.forEach((line, index) => {
    const [key] = line.split('=');
    if (key) {
      console.log(`${index + 1}. Beginning of line: ${key.trim()}=...`);
    }
  });
} catch (error) {
  console.error('File could not be read:', error.message);
}

console.log('\n-------------------------------------');
console.log('dotenv direct config() call:');

// Call dotenv's config function directly and display the result
const dotenv = require('dotenv');
const result = dotenv.config({ debug: true }); // Debug mode
console.log('Result:', result.error ? `Error: ${result.error.message}` : 'Successfully loaded.');

if (result.parsed) {
  console.log('Separated variables:', Object.keys(result.parsed).join(', '));
} else {
  console.log('The parsed variable is not present or is undefined');
}

console.log('\n-------------------------------------');
console.log('Working directory:', process.cwd());

// Let's check the PATH environment variable
console.log('\n-------------------------------------');
console.log('PATH contents:');
const pathEntries = (process.env.PATH || '').split(';');
pathEntries.forEach((entry, i) => console.log(`${i + 1}. ${entry}`));
