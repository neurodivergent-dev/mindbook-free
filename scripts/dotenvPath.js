// .env Full Path Test
// This script is used to test the full path of the .env file.
const path = require('path');
const fs = require('fs');

console.log('The full road test begins...');
console.log('Working directory:', process.cwd());

// Create .env full path
const envPath = path.resolve(process.cwd(), '.env');
console.log('.env full path:', envPath);

// Check file existence
console.log('File exists:', fs.existsSync(envPath) ? 'Yes' : 'No');

if (fs.existsSync(envPath)) {
  // Read file contents
  try {
    const envContent = fs.readFileSync(envPath, 'utf8').trim();
    console.log('\nFile content (first 50 characters):', envContent.substring(0, 50) + '...');

    // Check the number of lines
    const lines = envContent.split('\n').filter(line => line.trim().length > 0);
    console.log('Total number of rows:', lines.length);

    // Show variables in file
    console.log('\nVariables in the file:');
    lines.forEach(line => {
      const parts = line.split('=');
      if (parts.length > 1) {
        const key = parts[0].trim();
        console.log('- ' + key);
      }
    });
  } catch (error) {
    console.error('File reading error:', error.message);
  }
}

// Install dotenv by specifying the full path
console.log('\nInstalling dotenv using full path...');
try {
  require('dotenv').config({ path: envPath, debug: true });
  console.log('dotenv installed successfully!');
} catch (error) {
  console.error('Error while installing dotenv:', error.message);
}

// Check variables after module is loaded
console.log('\nAfter the module is loaded:');
console.log('SUPABASE_URL:', process.env.SUPABASE_URL || 'undefined');
console.log('SUPABASE_ANON_KEY:', process.env.SUPABASE_ANON_KEY ? 'defined (hidden)' : 'undefined');
console.log('ENCRYPTION_KEY:', process.env.ENCRYPTION_KEY ? 'defined (hidden)' : 'undefined');
