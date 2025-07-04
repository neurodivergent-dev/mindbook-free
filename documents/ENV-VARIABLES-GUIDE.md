# Guide to Environment Variables in MindBook Pro

This guide explains how to obtain the necessary environment variables specified in the `.env.example` file for MindBook Pro.

## Supabase Configuration

### SUPABASE_URL, SUPABASE_ANON_KEY

1. Create an account on [Supabase](https://supabase.com/)
2. Create a new project
3. Navigate to Project Settings > API
4. Copy the values from:
   - **Project URL**: use as `SUPABASE_URL`
   - **anon public** key: use as `SUPABASE_ANON_KEY`

## App Encryption

### ENCRYPTION_KEY

Generate a secure 64-character random string:

```bash
# Using OpenSSL (recommended)
openssl rand -hex 32

# Alternative online tools
# Visit https://www.random.org/strings/ and generate a 64-character string
```

### NODE_ENV

Set to `development` for local development or `production` for production builds.

## Logging Configuration

### EXPO_METRO_MIN_LOG_LEVEL

Set to `error` to reduce console output or other values like `info`, `warning` (see [Metro documentation](https://facebook.github.io/metro/docs/configuration/)).

### EXPO_METRO_QUIET

Set to `1` to reduce Metro bundler's output in the console.

## Google OAuth Configuration

### GOOGLE_WEB_CLIENT_ID, GOOGLE_ANDROID_CLIENT_ID

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project
3. Navigate to APIs & Services > Credentials
4. Create OAuth 2.0 Client IDs:
   - For Web application (use as `GOOGLE_WEB_CLIENT_ID`)
   - For Android application (use as `GOOGLE_ANDROID_CLIENT_ID`)
   - Configure authorized JavaScript origins and redirect URIs
5. For Android, you'll need your app's SHA-1 certificate fingerprint:
   ```bash
   keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android -keypass android
   ```

## AI Assistant Configuration

### AI_GENERATE_ENDPOINT_PROD, AI_GENERATE_ENDPOINT_DEV

- For development: `http://your_development_ip:5000/generate` (local server IP)
- For production: Deploy the AI model to a server and use that URL

### AI_MODEL_NAME

Use `microsoft/phi-1_5` or another Hugging Face model ID.

### PORT

Port for the AI server, typically `5000` for Flask.

### FLASK_DEBUG

Set to `false` for production, `true` for development.

## Expo Development Configuration

### EXPO_DEV_HOST

Your local IP address (e.g., `192.168.1.100`). Find it by:

```bash
# On Windows
ipconfig

# On macOS/Linux
ifconfig
# or
ip addr show
```

### EXPO_DEV_PORT

Default Metro bundler port is `8081`. Change only if this port is in use.

## Expo Application Services

### EAS_PROJECT_ID

1. Install EAS CLI:
   ```bash
   npm install -g eas-cli
   ```
2. Log in:
   ```bash
   eas login
   ```
3. Create a new project:
   ```bash
   eas init
   ```
4. Or find your existing project ID:
   ```bash
   eas project:list
   ```
5. The output will contain your EAS Project ID.

## Security Best Practices

1. **Never commit** your `.env` file to version control
2. Use different encryption keys for development and production
3. Regularly rotate your production keys
4. Restrict API access with proper permissions in Supabase
5. For production, use a secrets management service like:
   - GitHub Secrets for CI/CD
   - Expo's EAS Secrets (`eas secret:create`)

## Validation

After setting up your environment variables, validate them:

```bash
npm run env-check
```

This script (defined in package.json) ensures all required variables are properly set.

For further assistance, refer to [EAS-SECRETS-GUIDE.md](EAS-SECRETS-GUIDE.md) for more detailed information on managing environment variables in Expo Application Services.
