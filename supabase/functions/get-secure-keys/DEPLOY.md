# Get-Secure-Keys Edge Function Deployment

## Local Development

To run the Edge Function locally:

```bash
cd supabase/functions
supabase start # if the Supabase CLI local environment is not already running
supabase functions serve get-secure-keys --env-file .env.local
```

> Note: Your `.env.local` file must define the `ENCRYPTION_KEY` variable.

## Production Deployment

To deploy the Supabase Edge Function to production:

```bash
# Go to the functions directory in your project
cd supabase/functions

# Deploy to production (Supabase CLI must be installed)
supabase functions deploy get-secure-keys --project-ref YOUR_PROJECT_REF

# Add environment variables
supabase secrets set ENCRYPTION_KEY=your-secure-key --project-ref YOUR_PROJECT_REF
```

## Important Notes

1. Make sure you are using the latest version of the Supabase CLI:

```bash
npm install -g supabase
```

2. For Deno compatibility, ensure that module imports use URL addresses.

3. Security steps:

   - Make CORS settings more restrictive for production (allow only specific origins)
   - JWT authentication is required
   - Only authenticated users should be able to access encryption keys

4. Limitations:
   - Function timeout may be around 1-2 seconds
   - Network latency will add overhead, so take this into account
