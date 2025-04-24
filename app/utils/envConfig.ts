/**
 * Environment configuration utility
 * Centralizes the management of environment variables for the app
 */

// Default cloud name if not found in environment
const DEFAULT_CLOUDINARY_CLOUD_NAME = 'Mindbook'; // Added correct cloud name with capital M

/**
 * Gets environment variables with fallbacks
 */
export const ENV = {
  // Cloudinary configuration
  CLOUDINARY_CLOUD_NAME:
    process.env.EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME || DEFAULT_CLOUDINARY_CLOUD_NAME,

  // Check if Cloudinary is configured
  isCloudinaryConfigured: () => {
    return !!ENV.CLOUDINARY_CLOUD_NAME;
  },

  // Get a validation report of the environment configuration
  getConfigReport: () => {
    const report = {
      cloudinary: ENV.isCloudinaryConfigured() ? 'Configured ✅' : 'Not configured ❌',
    };

    return report;
  },

  // Log validation warnings for missing configurations
  logValidationWarnings: () => {
    if (!ENV.isCloudinaryConfigured()) {
      console.warn(
        '⚠️ Cloudinary cloud name is not configured. Profile image uploads may not work.'
      );
      console.warn('Set EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME in your environment or app.config.js');
    }
  },
};

// Log validation warnings during development
if (__DEV__) {
  ENV.logValidationWarnings();
}
