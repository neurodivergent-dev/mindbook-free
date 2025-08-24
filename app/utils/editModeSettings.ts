// Edit mode settings utility
import AsyncStorage from '@react-native-async-storage/async-storage';

export const EDIT_MODE_SETTING_KEY = '@edit_mode_setting';

export type EditModeOption = 'reading' | 'editing';

// Get the default edit mode setting
export const getEditModeSetting = async (): Promise<EditModeOption> => {
  try {
    const setting = await AsyncStorage.getItem(EDIT_MODE_SETTING_KEY);
    return setting === 'reading' ? 'reading' : 'editing'; // Default to editing
  } catch (error) {
    console.error('Error getting edit mode setting:', error);
    return 'editing'; // Default fallback
  }
};

// Set the default edit mode setting
export const setEditModeSetting = async (mode: EditModeOption): Promise<void> => {
  try {
    await AsyncStorage.setItem(EDIT_MODE_SETTING_KEY, mode);
  } catch (error) {
    console.error('Error setting edit mode setting:', error);
  }
};
