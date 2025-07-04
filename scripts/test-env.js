// Simple Node.js test for environment variables
const fs = require('fs');
const path = require('path');

console.log('🔍 Testing environment variables...');

// Check if .env file exists
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
  console.log('✅ .env file found');

  const envContent = fs.readFileSync(envPath, 'utf8');
  const envLines = envContent.split('\n');

  console.log('📦 Environment variables in .env:');
  envLines.forEach(line => {
    if (line.trim() && !line.startsWith('#')) {
      const [key] = line.split('=');
      console.log(`  ${key}`);
    }
  });
} else {
  console.log('❌ .env file not found');
}

// Check for obfuscated keys
const obfuscatedKeys = ['_s', '_a', '_e', '_v', '_g', '_ga', '_o', '_om', '_ed', '_ep'];

// Check app.config.ts
const appConfigPath = path.join(__dirname, 'app', 'app.config.ts');
if (fs.existsSync(appConfigPath)) {
  console.log('✅ app.config.ts found');

  const configContent = fs.readFileSync(appConfigPath, 'utf8');

  console.log('🔑 Checking obfuscated keys in app.config.ts:');
  obfuscatedKeys.forEach(key => {
    if (configContent.includes(key)) {
      console.log(`  ✅ ${key} found`);
    } else {
      console.log(`  ❌ ${key} not found`);
    }
  });
} else {
  console.log('❌ app.config.ts not found');
}

// Check app.config.js
const appConfigJsPath = path.join(__dirname, 'app.config.js');
if (fs.existsSync(appConfigJsPath)) {
  console.log('\n✅ app.config.js found');

  const configJsContent = fs.readFileSync(appConfigJsPath, 'utf8');

  console.log('🔑 Checking obfuscated keys in app.config.js:');
  obfuscatedKeys.forEach(key => {
    if (configJsContent.includes(key)) {
      console.log(`  ✅ ${key} found`);
    } else {
      console.log(`  ❌ ${key} not found`);
    }
  });
} else {
  console.log('\n❌ app.config.js not found');
}

console.log('\n�� Test completed!');
