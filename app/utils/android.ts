/**
 * Platform-specific Android utilities
 * This file provides a shared interface that will be implemented differently on Android and iOS
 */

// Platform-specific code for Android
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const showToast = (_message: string): void => {
  // This will be overridden by platform-specific implementation
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const useBackButtonHandler = (_callback: () => boolean): void => {
  // This will be overridden by platform-specific implementation
};

export default { showToast, useBackButtonHandler };
