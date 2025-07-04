// Edge Function Test Script
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

async function testEdgeFunction() {
  console.log('🧪 TESTING EDGE FUNCTION');
  console.log('========================');

  // Check environment variables
  console.log('\n📋 Environment Variables:');
  console.log('SUPABASE_URL:', process.env.SUPABASE_URL ? '✅ Set' : '❌ Missing');
  console.log('SUPABASE_ANON_KEY:', process.env.SUPABASE_ANON_KEY ? '✅ Set' : '❌ Missing');
  console.log('OPENROUTER_API_KEY:', process.env.OPENROUTER_API_KEY ? '✅ Set' : '❌ Missing');
  console.log('ENCRYPTION_KEY:', process.env.ENCRYPTION_KEY ? '✅ Set' : '❌ Missing');

  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
    console.error('❌ Missing required Supabase environment variables');
    return;
  }

  try {
    // Create Supabase client
    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

    // Test authentication
    console.log('\n🔐 Testing Authentication...');
    const {
      data: { session },
      error: authError,
    } = await supabase.auth.getSession();

    if (authError) {
      console.error('❌ Authentication error:', authError.message);
      return;
    }

    if (!session) {
      console.log('⚠️ No active session - creating test session...');
      // Try to sign in anonymously for testing
      const { data, error } = await supabase.auth.signInAnonymously();
      if (error) {
        console.error('❌ Anonymous sign-in failed:', error.message);
        return;
      }
      console.log('✅ Anonymous session created');
    } else {
      console.log('✅ Active session found');
    }

    // Test Edge Function
    console.log('\n🌐 Testing Edge Function...');
    const edgeFunctionUrl = `${process.env.SUPABASE_URL}/functions/v1/get-secure-keys`;
    console.log('URL:', edgeFunctionUrl);

    const {
      data: { session: currentSession },
    } = await supabase.auth.getSession();
    if (!currentSession?.access_token) {
      console.error('❌ No access token available');
      return;
    }

    const response = await fetch(edgeFunctionUrl, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${currentSession.access_token}`,
        'Content-Type': 'application/json',
      },
    });

    console.log('Response status:', response.status);

    if (response.ok) {
      const result = await response.json();
      console.log('✅ Edge Function response:');
      console.log('- Has encryption key:', !!result.encryptionKey);
      console.log('- Has OpenRouter API key:', !!result.openrouterApiKey);
      console.log('- Version:', result.version);
      console.log('- Timestamp:', result.timestamp);
    } else {
      const errorText = await response.text();
      console.error('❌ Edge Function error:', errorText);
    }
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testEdgeFunction();
