/**
 * NOTE: According to React Native's platform-specific file conventions,
 * this file should be renamed to android.android.ts.
 *
 * Correct usage:
 * - android.android.ts: Android-specific codes
 * - android.ios.ts: iOS-specific codes
 * - android.ts: Platform-independent generic code
 *
 * This way React Native will automatically choose the correct platform file.
 */

import { ToastAndroid, BackHandler } from 'react-native';
import { useEffect } from 'react';

export const showToast = (message: string): void => {
  ToastAndroid.show(message, ToastAndroid.SHORT);
};

export const useBackButtonHandler = (callback: () => boolean): void => {
  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', callback);
    return () => backHandler.remove();
  }, [callback]);
};

// Default export
export default { showToast, useBackButtonHandler };
