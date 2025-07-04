/// <reference types="https://deno.land/x/supabase@1.3.1/mod.ts" />

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.25.0';

// CORS headers for cross-origin requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

serve(async req => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Get authorization header
    const authHeader = req.headers.get('Authorization');

    // If no auth header, return unauthorized
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized - Bearer token required' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Extract the token
    const token = authHeader.replace('Bearer ', '');

    // Create Supabase client
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Verify the JWT token
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

    // Get the keys directly from environment
    const encryptionKey = Deno.env.get('ENCRYPTION_KEY')?.trim();
    const openrouterApiKey = Deno.env.get('OPENROUTER_API_KEY')?.trim();

    // Log for debugging
    console.log(`Encryption key present: ${!!encryptionKey}`);
    console.log(`OpenRouter API key present: ${!!openrouterApiKey}`);

    if (openrouterApiKey) {
      console.log(`OpenRouter API key length: ${openrouterApiKey.length}`);
      console.log(`OpenRouter API key format: ${openrouterApiKey.substring(0, 6)}...`);
      console.log(`Contains hyphens: ${openrouterApiKey.includes('-')}`);
    }

    // Return the keys
    return new Response(
      JSON.stringify({
        encryptionKey,
        openrouterApiKey,
        timestamp: new Date().toISOString(),
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
    // Log and return any errors
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
