// Test file for obfuscated environment variables
import Constants from 'expo-constants';

export const testObfuscatedEnvVars = () => {
  console.log('🔍 Testing obfuscated environment variables...');

  const extra = Constants.expoConfig?.extra;

  if (!extra) {
    console.error('❌ Constants.expoConfig.extra is not defined');
    return false;
  }

  console.log('📦 Available keys in extra:', Object.keys(extra));

  // Test obfuscated keys
  const tests = [
    { name: 'SUPABASE_URL', obfuscated: '_s', original: 'supabaseUrl' },
    { name: 'SUPABASE_ANON_KEY', obfuscated: '_a', original: 'supabaseAnonKey' },
    { name: 'ENCRYPTION_KEY', obfuscated: '_e', original: 'encryptionKey' },
    { name: 'VAULT_ENCRYPTION_KEY', obfuscated: '_v', original: 'vaultEncryptionKey' },
    { name: 'GOOGLE_WEB_CLIENT_ID', obfuscated: '_g', original: 'googleWebClientId' },
    { name: 'GOOGLE_ANDROID_CLIENT_ID', obfuscated: '_ga', original: 'googleAndroidClientId' },
    { name: 'OPENROUTER_API_KEY', obfuscated: '_o', original: 'openrouterApiKey' },
    { name: 'OPENROUTER_MODEL', obfuscated: '_om', original: 'openrouterModel' },
    { name: 'EXPO_DEV_HOST', obfuscated: '_ed', original: 'expoDevHost' },
    { name: 'EXPO_DEV_PORT', obfuscated: '_ep', original: 'expoDevPort' },
  ];

  let allPassed = true;

  tests.forEach(test => {
    const obfuscatedValue = extra[test.obfuscated];
    const originalValue = extra[test.original];

    console.log(`🔑 ${test.name}:`);
    console.log(`  Obfuscated (${test.obfuscated}): ${obfuscatedValue ? '✅ Set' : '❌ Missing'}`);
    console.log(`  Original (${test.original}): ${originalValue ? '✅ Set' : '❌ Missing'}`);

    if (!obfuscatedValue && !originalValue) {
      console.log(`  ⚠️  Both missing for ${test.name}`);
      allPassed = false;
    }
  });

  console.log(`\n🎯 Overall result: ${allPassed ? '✅ All tests passed' : '❌ Some tests failed'}`);

  return allPassed;
};

export default testObfuscatedEnvVars;
