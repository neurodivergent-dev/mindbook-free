import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

/**
 * Write a JSON backup string to a file. On Android this uses the Storage Access
 * Framework if available; on iOS it writes to documentDirectory and opens the
 * share sheet. If SAF is unavailable, falls back to sharing.
 *
 * @param backupData - already-serialized JSON string
 * @returns the URI of the saved file (for debugging/alert purposes)
 * @throws Error('permission-denied') if the user cancels directory pick on
 * Android or permission is otherwise denied.
 * @throws Error('unsupported') if SAF is not available and we can't proceed
 */
export const exportBackupToFile = async (backupData: string): Promise<string> => {
  const fileName = `mindbook_backup_${new Date().toISOString().split('T')[0]}.json`;

  if (Platform.OS === 'android') {
    // check if SAF is available - it may not be in older expo-file-system versions
    const SAF = (FileSystem as any).StorageAccessFramework;
    if (!SAF) {
      // expo-file-system may not have StorageAccessFramework in this SDK version
      // fall back to sharing instead - the caller will handle the fallbackShare
      throw new Error('saf-unavailable');
    }

    const permissions = await SAF.requestDirectoryPermissionsAsync();
    if (!permissions.granted) {
      // let caller decide what fallback to perform
      throw new Error('permission-denied');
    }

    const fileUri = await SAF.createFileAsync(
      permissions.directoryUri,
      fileName,
      'application/json'
    );

    await FileSystem.writeAsStringAsync(fileUri, backupData, {
      encoding: 'utf8',
    });

    return fileUri;
  } else {
    await FileSystem.writeAsStringAsync(fileUri, backupData, {
      encoding: 'utf8',
    });

    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(fileUri, {
        mimeType: 'application/json',
        dialogTitle: 'Share Backup',
        UTI: 'public.json',
      });
    }

    return fileUri;
  }
};

// We might add similar helpers for PDF export later
export default { exportBackupToFile };
