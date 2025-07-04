# Managing Environment Variables with EAS Secrets

This document explains how to manage environment variables in Expo projects using EAS Secrets. It focuses on securely and reliably integrating sensitive data, such as `ENCRYPTION_KEY`, into APK builds, ensuring a robust production-ready application.

## Why Use EAS Secrets?

EAS Secrets offers several advantages over traditional `.env` file management:

- **Security:** Sensitive keys (e.g., API keys, encryption keys) are stored securely on Expo's servers, not hardcoded in your repository or local files, reducing the risk of accidental leaks.
- **Consistency:** Eliminates dependency on local `.env` files, ensuring the same configuration across development, testing, and production environments.
- **Convenience:** Seamlessly integrates with the EAS Build process, automatically injecting secrets into your app during builds without manual intervention.

By adopting EAS Secrets, you streamline your workflow while adhering to modern security best practices.

## Prerequisites

Before you begin, ensure the following are in place:

- **EAS CLI Installed:** Install the Expo Application Services Command Line Interface globally:
  ```bash
  npm install -g eas-cli
  ```
  Verify installation with `eas --version`.
- **Expo Account:** Log in to your Expo account via the CLI:
  ```bash
  eas login
  ```
  Use your Expo credentials to authenticate.
- **Project Configuration:** Ensure your project root contains an `app.config.js` or `app.json` file where environment variables will be accessed.
- **Node.js Environment:** A working Node.js setup (version >= 16.0.0 recommended) for running EAS CLI commands.

## Step-by-Step Guide

Follow these steps to set up and manage environment variables with EAS Secrets.

### 1. Creating EAS Secrets

EAS Secrets are defined using the `eas secret:create` command. Each secret is a key-value pair stored securely in your Expo account, accessible during builds.

#### Command Syntax

```bash
eas secret:create --name <SECRET_NAME> --value "<SECRET_VALUE>"
```

#### Examples

Define the following environment variables for your project:

- **Encryption Key:**
  ```bash
  eas secret:create --name ENCRYPTION_KEY --value "your-secure-key-here-32chars"
  ```
  - Replace `"your-secure-key-here-32chars"` with a 32-character string (required for AES-256 encryption).
- **Supabase Configuration:**
  ```bash
  eas secret:create --name SUPABASE_URL --value "https://your-supabase-url.supabase.co"
  eas secret:create --name SUPABASE_ANON_KEY --value "your-supabase-anon-key"
  ```
  - Obtain these values from your Supabase dashboard.

Repeat this process for all sensitive variables (e.g., Google OAuth client IDs, AI endpoints).

#### Viewing Secrets

List all defined secrets to verify:

```bash
eas secret:list
```

This returns a table with names and values, ensuring you’ve added them correctly.

#### Updating Secrets

If a secret needs updating:

```bash
eas secret:edit --name ENCRYPTION_KEY
```

Follow the prompts to enter a new value.

### 2. Configuring Your Project

Integrate EAS Secrets into your app by updating the `app.config.js` file. This file dynamically pulls environment variables during the build process.

#### Example `app.config.js`

```javascript
module.exports = ({ config }) => {
  // Optional: Load local .env for development
  if (process.env.NODE_ENV === 'development') {
    require('dotenv').config();
  }

  return {
    ...config,
    expo: {
      name: 'Mindbook Pro',
      slug: 'mindbook',
      version: '4.0.1',
      extra: {
        encryptionKey: process.env.ENCRYPTION_KEY,
        supabaseUrl: process.env.SUPABASE_URL,
        supabaseAnonKey: process.env.SUPABASE_ANON_KEY,
      },
    },
  };
};
```

- **Key Points:**
  - `process.env.ENCRYPTION_KEY` pulls the value from EAS Secrets during builds.
  - The `extra` field makes these variables available in your app via `Constants.expoConfig.extra`.
  - Local `.env` fallback (via `dotenv`) ensures development flexibility.

#### Accessing Secrets in Code

Use the `expo-constants` module to retrieve secrets:

```javascript
import Constants from 'expo-constants';

const encryptionKey = Constants.expoConfig?.extra?.encryptionKey;
if (!encryptionKey) {
  console.error('ENCRYPTION_KEY is missing from EAS Secrets');
  throw new Error('Encryption key not found');
}
```

### 3. Building Your App

With secrets defined and configured, build your app using EAS Build.

#### Define Build Profiles

Create an `eas.json` file in your project root:

```json
{
  "build": {
    "release": {
      "android": {
        "buildType": "apk"
      }
    },
    "production": {
      "android": {
        "buildType": "aab"
      }
    }
  }
}
```

- `"release"`: Generates an APK for testing.
- `"production"`: Generates an Android App Bundle (AAB) for Google Play Store.

#### Run the Build

For an APK:

```bash
eas build --platform android --profile release
```

For Google Play Store (AAB):

```bash
eas build --platform android --profile production
```

- EAS Build automatically injects your secrets into the app during this process.

#### Download the Build

Once complete, download the artifact from the EAS dashboard or CLI:

```bash
eas build:download --platform android
```

### 4. Testing and Validation

Ensure secrets are correctly integrated:

#### Local Development

- Use a `.env` file for local testing:
  ```
  ENCRYPTION_KEY=your-secure-key-here-32chars
  SUPABASE_URL=https://your-supabase-url.supabase.co
  SUPABASE_ANON_KEY=your-supabase-anon-key
  ```
- Start the app:
  ```bash
  npm start
  ```
- Log the value:
  ```javascript
  console.log('ENCRYPTION_KEY:', Constants.expoConfig?.extra?.encryptionKey);
  ```

#### Production Build

- Install the APK/AAB on a device:
  ```bash
  adb install path-to-your-app.apk
  ```
- Check logs:
  ```bash
  adb logcat | grep "ReactNative"
  ```
- Look for `ENCRYPTION_KEY` in the output to confirm it’s loaded.

### 5. Managing Secrets

#### Deleting Secrets

Remove an unused secret:

```bash
eas secret:delete --name ENCRYPTION_KEY
```

#### Team Collaboration

If working in a team, share access via Expo’s organization features:

- Invite team members to your Expo project.
- They’ll inherit access to the secrets automatically.

## Common Issues and Solutions

- **Secret Not Loaded:**

  - **Cause:** Typo in secret name or build profile mismatch.
  - **Fix:** Verify with `eas secret:list` and ensure `app.config.js` matches the name exactly (case-sensitive).

- **Undefined Value in App:**

  - **Cause:** `app.config.js` incorrectly configured or build cache issue.
  - **Fix:** Clear build cache (`eas build --clear-cache`) and re-run.

- **Local vs. Production Mismatch:**
  - **Cause:** Local `.env` overrides EAS Secrets.
  - **Fix:** Use conditional loading in `app.config.js` (see example above).

## Best Practices

- **Naming Convention:** Use uppercase names (e.g., `ENCRYPTION_KEY`) for consistency with environment variable standards.
- **Secret Length:** For encryption keys, ensure 32 characters for AES-256 compatibility.
- **Backup:** Keep a secure offline record of your secrets (e.g., encrypted file).
- **Audit:** Periodically review secrets with `eas secret:list` to remove unused ones.

## Conclusion

EAS Secrets simplifies and secures environment variable management in Expo projects. By storing sensitive data like `ENCRYPTION_KEY` and `SUPABASE_URL` in Expo’s infrastructure, you eliminate local `.env` file dependencies and enhance your app’s security. Whether you’re building for testing or deploying to Google Play Store, this approach ensures a smooth, reliable workflow.

For further assistance, refer to the [Expo EAS Documentation](https://docs.expo.dev/eas/) or reach out via the Expo community forums.
