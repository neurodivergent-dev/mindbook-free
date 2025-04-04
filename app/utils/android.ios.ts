// This file is for iOS only
// It contains the implementation of the showToast and useBackButtonHandler functions
import { Alert } from 'react-native';

// Show Toast messages as Alerts for iOS users
export const showToast = (message: string): void => {
  Alert.alert('', message);
};

// A noop app because there is no BackHandler on iOS
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const useBackButtonHandler = (_callback: () => boolean): void => {
  // No need for back handler control on iOS
};

export default { showToast, useBackButtonHandler };
