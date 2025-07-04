# Local Build Documentation for Mindbook Mobile App

## Introduction

This document provides comprehensive instructions for building and deploying the Mindbook mobile application on local environments. These instructions are designed for developers who need to create local builds for testing, debugging, or distribution purposes.

## Prerequisites

Before starting the build process, ensure you have the following tools and dependencies installed:

- Node.js (v18.x or higher recommended)
- npm or Yarn package manager
- Expo CLI (`npm install -g expo-cli`)
- For Android builds:
  - Android Studio
  - Android SDK (API level 33 recommended)
  - JDK 11 or newer
- For iOS builds:
  - macOS operating system
  - Xcode (latest version recommended)
  - CocoaPods

## Environment Setup

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   # or
   yarn install
   ```
3. Set up environment variables:
   ```bash
   cp .env.example .env
   # Edit .env file with your configuration
   ```

## Android Build Process

### Generating Android Build Files

First, you need to generate the native Android files using Expo's prebuild command:

```bash
npx expo prebuild --platform android
```

This command will create or update the Android directory with all necessary native files.

### Debug Build

To create a debug build that can be used for testing:

```bash
cd android
./gradlew assembleDebug
```

The debug APK will be available at: `android/app/build/outputs/apk/debug/app-debug.apk`

### Release Build

For creating a release build:

1. Generate a signing key (if you haven't already):

   ```bash
   keytool -genkeypair -v -storetype PKCS12 -keystore my-release-key.keystore -alias my-key-alias -keyalg RSA -keysize 2048 -validity 10000
   ```

2. Configure your signing key in `android/app/build.gradle`:

   ```gradle
   android {
       ...
       signingConfigs {
           release {
               storeFile file('your-key.keystore')
               storePassword 'your-store-password'
               keyAlias 'your-key-alias'
               keyPassword 'your-key-password'
           }
       }
       buildTypes {
           release {
               ...
               signingConfig signingConfigs.release
           }
       }
   }
   ```

3. Build the release version:

   ```bash
   cd android
   ./gradlew assembleRelease
   ```

4. The release APK will be generated at: `android/app/build/outputs/apk/release/app-release.apk`

### Installing the APK on a Device

To install the APK on a connected device or emulator:

```bash
adb install app-release.apk
```

Or for a specific device when multiple devices are connected:

```bash
adb -s <device_id> install app-release.apk
```

### Building App Bundle (AAB) for Google Play

To generate an Android App Bundle for Google Play Store distribution:

```bash
cd android
./gradlew bundleRelease
```

The AAB file will be available at: `android/app/build/outputs/bundle/release/app-release.aab`

## iOS Build Process

### Generating iOS Build Files

Generate the native iOS files:

```bash
npx expo prebuild --platform ios
```

### Building for Simulator

```bash
cd ios
pod install
npx react-native run-ios
```

### Building for Physical Device (Development)

1. Open the Xcode workspace:

   ```bash
   open ios/YourProjectName.xcworkspace
   ```

2. Select your development team and signing certificate in Xcode

3. Build and run on a connected device

### Creating an Archive for Distribution

1. In Xcode, select "Product" > "Archive"
2. Follow the distribution wizard to create an IPA file

## Using Expo EAS for Builds

Expo Application Services (EAS) provides an alternative to local builds:

### EAS Setup

1. Install the EAS CLI:

   ```bash
   npm install -g eas-cli
   ```

2. Log in to your Expo account:

   ```bash
   eas login
   ```

3. Configure EAS in your project:
   ```bash
   eas build:configure
   ```

### Building with EAS

For Android:

```bash
eas build --platform android
```

For iOS:

```bash
eas build --platform ios
```

For both platforms:

```bash
eas build --platform all
```

### Local Builds with EAS

You can also use EAS to generate local builds:

```bash
eas build --platform android --local
eas build --platform ios --local
```

## CI/CD Pipeline

The project includes automated CI/CD pipelines implemented with GitHub Actions. These workflows help ensure code quality and streamline the build process.

### Available Workflows

1. **Basic Checks (ci.yml)**

   - Triggered on push/PR to main and develop branches
   - Runs linting and type checking
   - For PRs, builds a preview using Expo prebuild

2. **Node.js CI (node.js.yml)**
   - Runs on Node.js 20.x
   - Performs dependency installation
   - Runs type checking
   - Lints the codebase
   - Checks for circular dependencies
   - Builds the application

### Setting Up Local Development with CI in Mind

To maintain compatibility with the CI pipeline locally:

1. Run the same checks locally before pushing:

   ```bash
   npm run typecheck
   npm run lint
   npm run check:circular
   npm run build
   ```

2. Review CI failures in GitHub and replicate the environment locally to debug issues

### Extending the CI/CD Pipeline

If you need to add custom build steps:

1. Create or modify workflows in the `.github/workflows` directory
2. Test changes locally before pushing to avoid breaking the CI pipeline

## Troubleshooting

### Common Android Build Issues

1. **Gradle Version Mismatch**:

   - Check `android/gradle/wrapper/gradle-wrapper.properties` for the correct Gradle version

2. **Missing Android SDK Components**:

   - Install missing components through Android Studio's SDK Manager

3. **JDK Version Issues**:

   - Ensure you're using the correct JDK version (JDK 11 recommended)

4. **Memory Issues During Build**:
   - Increase Gradle memory in `android/gradle.properties`:
     ```properties
     org.gradle.jvmargs=-Xmx4g
     ```

### Common iOS Build Issues

1. **CocoaPods Dependencies**:

   - Try cleaning the pods installation:
     ```bash
     cd ios
     pod deintegrate
     pod install
     ```

2. **Xcode Build Errors**:

   - Clean the build folder: Xcode menu > Product > Clean Build Folder
   - Delete derived data: `rm -rf ~/Library/Developer/Xcode/DerivedData`

3. **Signing Certificate Issues**:
   - Verify your Apple Developer account has the necessary certificates and provisioning profiles

## Performance Optimization

To optimize the size and performance of your builds:

1. Enable Proguard for Android (in `android/app/build.gradle`):

   ```gradle
   buildTypes {
       release {
           minifyEnabled true
           proguardFiles getDefaultProguardFile('proguard-android.txt'), 'proguard-rules.pro'
       }
   }
   ```

2. Remove unused libraries and assets

3. Implement code splitting and lazy loading of components

## Conclusion

This documentation covers the essential steps for creating local builds of the Mindbook mobile application. For further assistance or to report issues with the build process, please contact the development team.

## Additional Resources

- [React Native Documentation](https://reactnative.dev/docs/environment-setup)
- [Expo Documentation](https://docs.expo.dev/)
- [Android Developer Documentation](https://developer.android.com/studio/build)
- [iOS Developer Documentation](https://developer.apple.com/documentation/xcode)
