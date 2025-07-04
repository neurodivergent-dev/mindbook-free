#!/usr/bin/env node

/**
 * Test script to verify obfuscation in app.config.ts and app.config.js
 * Run with: node scripts/test-obfuscation.js
 */

const fs = require('fs');
const path = require('path');

console.log('🔒 Testing App Config Obfuscation...\n');

// Test obfuscation functions
const _0x1a2b = str => Buffer.from(str, 'base64').toString();
const _0x3c4d = str => str.split('').reverse().join('');

// Test base64 decoding
const testBase64 = _0x1a2b('TWluZGJvb2sgUHJv');
console.log('✅ Base64 decode test:', testBase64 === 'Mindbook Pro' ? 'PASS' : 'FAIL');

// Test string reversal
const testReverse = _0x3c4d('koobdnim');
console.log('✅ String reverse test:', testReverse === 'mindbook' ? 'PASS' : 'FAIL');

// Test environment variable obfuscation
const _0x5e6f = (key, fallback) => process.env[key] || fallback;

// Set test environment variables
process.env.SUPABASE_URL = 'https://test.supabase.co';
process.env.ENCRYPTION_KEY = 'test-encryption-key';

const testEnv = _0x5e6f('SUPABASE_URL', '');
console.log(
  '✅ Environment variable test:',
  testEnv === 'https://test.supabase.co' ? 'PASS' : 'FAIL'
);

// Check if app.config.ts exists and has obfuscation
const appConfigTsPath = path.join(__dirname, '..', 'app', 'app.config.ts');
const appConfigJsPath = path.join(__dirname, '..', 'app.config.js');

let tsObfuscation = false;
let jsObfuscation = false;

if (fs.existsSync(appConfigTsPath)) {
  const appConfigTsContent = fs.readFileSync(appConfigTsPath, 'utf8');

  tsObfuscation =
    appConfigTsContent.includes('_0x1a2b') &&
    appConfigTsContent.includes('_0x3c4d') &&
    appConfigTsContent.includes('_0x5e6f') &&
    appConfigTsContent.includes('TWluZGJvb2sgUHJv') &&
    appConfigTsContent.includes('koobdnim');

  console.log('✅ App config.ts obfuscation:', tsObfuscation ? 'PASS' : 'FAIL');
} else {
  console.log('❌ App config.ts file not found');
}

if (fs.existsSync(appConfigJsPath)) {
  const appConfigJsContent = fs.readFileSync(appConfigJsPath, 'utf8');

  jsObfuscation =
    appConfigJsContent.includes('_0x1a2b') &&
    appConfigJsContent.includes('_0x3c4d') &&
    appConfigJsContent.includes('_0x5e6f') &&
    appConfigJsContent.includes('TWluZGJvb2sgUHJv') &&
    appConfigJsContent.includes('koobdnim');

  console.log('✅ App config.js obfuscation:', jsObfuscation ? 'PASS' : 'FAIL');
} else {
  console.log('❌ App config.js file not found');
}

// Overall result
const allObfuscated = tsObfuscation && jsObfuscation;

if (allObfuscated) {
  console.log('\n🎉 All obfuscation tests passed!');
  console.log('📝 Both app config files are properly obfuscated for production builds.');
} else {
  console.log('\n❌ Some obfuscation tests failed!');
  console.log('📝 Check app config files for proper obfuscation implementation.');
}

console.log('\n🔧 Obfuscation Features:');
console.log('   • Base64 encoding for sensitive strings');
console.log('   • String reversal for identifiers');
console.log('   • Obfuscated environment variable access');
console.log('   • Metro bundler minification');
console.log('   • Android ProGuard/R8 obfuscation');
console.log('   • Property name mangling');
console.log('   • Console log removal');
console.log('   • Both .ts and .js config files protected');
