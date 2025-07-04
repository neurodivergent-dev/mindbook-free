/// <reference types="https://deno.land/x/supabase@1.3.1/mod.ts" />

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.25.0';

// CORS headers for cross-origin requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*', // For development, consider restricting this in production
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

// Ensure API keys are properly formatted without extra whitespace or quotes
function sanitizeApiKey(key: string | undefined): string | undefined {
  if (!key) return undefined;

  // Remove any leading/trailing whitespaces, quotes, or newlines
  const sanitized = key
    .trim()
    .replace(/^["']|["']$/g, '')
    .replace(/[\r\n]+/g, '');

  // Log the sanitization result for debugging (hiding most of the key)
  if (sanitized) {
    const firstChars = sanitized.substring(0, 5);
    const lastChars = sanitized.substring(sanitized.length - 5);
    console.log(`Sanitized key: ${firstChars}...${lastChars}, length: ${sanitized.length}`);
    console.log(`Contains hyphens: ${sanitized.includes('-')}`);
    console.log(`Key format appears to be OpenRouter: ${sanitized.startsWith('sk-or-')}`);
  }

  return sanitized;
}

serve(async req => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Get authorization header
    const authHeader = req.headers.get('Authorization');

    // If no auth header, return unauthorized with specific error message
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized - Bearer token required' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Extract the token from bearer
    const token = authHeader.replace('Bearer ', '');

    // Creation of supabase client needs SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Verify the JWT token without any additional claims checking
    const { data, error } = await supabaseAdmin.auth.getUser(token);

    // Return error if token verification failed
    if (error || !data.user) {
      return new Response(
        JSON.stringify({
          error: 'Invalid authentication token',
          details: error?.message || 'User not found',
        }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Now we have a valid user, we can return the secure keys
    const rawEncryptionKey = Deno.env.get('ENCRYPTION_KEY');
    const rawOpenRouterApiKey = Deno.env.get('OPENROUTER_API_KEY');

    // Sanitize the keys to ensure proper formatting
    const encryptionKey = sanitizeApiKey(rawEncryptionKey);
    const openrouterApiKey = sanitizeApiKey(rawOpenRouterApiKey);

    // Log keys for debugging (obscuring actual values)
    console.log(`Encryption key present: ${!!encryptionKey}`);
    console.log(`OpenRouter API key present: ${!!openrouterApiKey}`);
    if (openrouterApiKey) {
      console.log(`OpenRouter API key length: ${openrouterApiKey.length}`);
      console.log(`OpenRouter API key format: ${openrouterApiKey.substring(0, 6)}...`);
    } else {
      console.log('WARNING: OpenRouter API key is null or empty!');
      console.log(
        'Raw OpenRouter API key value:',
        rawOpenRouterApiKey !== undefined ? 'Defined but possibly empty' : 'Undefined'
      );
    }

    // Return the keys
    return new Response(
      JSON.stringify({
        encryptionKey,
        openrouterApiKey,
        timestamp: new Date().toISOString(),
        version: '1.0.1',
      }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    // Return any errors
    console.error(
      `Error in Edge Function: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
    console.error(error);

    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
});
