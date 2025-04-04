// .env Variables Control File - Corrected Version
// Load dotenv module early and run in debug mode
try {
  const dotenv = require('dotenv');
  const result = dotenv.config({ debug: true });
  console.log('Dotenv installed, result:', result.error ? 'ERROR!' : 'SUCCESSFUL');
} catch (error) {
  console.error('Dotenv installation error:', error.message);
}

console.log('=====================================');
console.log('🔍 .ENV VARIABLES CONTROL RESULTS');
console.log('=====================================');

// Check working directory
console.log('Working directory:', process.cwd());

// Read .env file directly
const fs = require('fs');
const path = require('path');
const envPath = path.resolve(process.cwd(), '.env');

console.log('\n.env file status:');
if (fs.existsSync(envPath)) {
  console.log('- .env file exists');
  const stats = fs.statSync(envPath);
  console.log('- File size:', stats.size, 'bayt');
  console.log('- Last edit:', stats.mtime);

  // Check the first line of the file content
  try {
    const content = fs.readFileSync(envPath, 'utf8');
    const lines = content.split('\n').filter(line => line.trim().length > 0);
    console.log('- Number of lines:', lines.length);
    if (lines.length > 0) {
      console.log('- First line:', lines[0]);
    }
  } catch (error) {
    console.error('File reading error:', error.message);
  }
} else {
  console.log('⚠️ .env file not found!');
}

// Check critical variables
const criticalVars = ['SUPABASE_URL', 'SUPABASE_ANON_KEY', 'ENCRYPTION_KEY'];

console.log('\n🔐 CRITICAL VARIABLES STATUS:');
console.log('-------------------------------------');
criticalVars.forEach(varName => {
  const exists = typeof process.env[varName] !== 'undefined';
  console.log(`${varName}: ${exists ? '✅ AVAILABLE' : '❌ MISSING'}`);

  if (exists) {
    // Show the first and last characters of the value (for security)
    const value = process.env[varName];
    console.log(`   └─ Value: ${value.substring(0, 3)}...${value.substring(value.length - 3)}`);
  }
});

console.log('\n⚙️ EXPO/REACT NATIVE CONFIG STATUS:');
console.log('-------------------------------------');
console.log('In the Expo environment?:', typeof global.expo !== 'undefined' ? '✅ Yes' : '❌ No');
console.log(
  'In a React Native environment?:',
  typeof global.HermesInternal !== 'undefined' ? '✅ Yes' : '❌ No'
);

console.log('\n=====================================');
console.log('📝 NOT: For security purposes, only some of the sensitive values ​​are shown.');
console.log('=====================================');
