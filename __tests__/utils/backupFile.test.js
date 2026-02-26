import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { exportBackupToFile } from '../../app/utils/backupFile';

jest.mock('expo-file-system', () => ({
  StorageAccessFramework: {
    requestDirectoryPermissionsAsync: jest.fn(),
    createFileAsync: jest.fn(),
  },
  writeAsStringAsync: jest.fn(),
  documentDirectory: '/documents/',
  EncodingType: { UTF8: 'utf8' },
}));

jest.mock('expo-sharing', () => ({
  isAvailableAsync: jest.fn(),
  shareAsync: jest.fn(),
}));

describe('exportBackupToFile', () => {
  const backupString = '{"foo":123}';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should use SAF on Android when permission granted', async () => {
    jest.spyOn(require('react-native'), 'Platform', 'get').mockReturnValue({ OS: 'android' });
    FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync.mockResolvedValue({ granted: true, directoryUri: 'content://test' });
    FileSystem.StorageAccessFramework.createFileAsync.mockResolvedValue('content://test/file.json');
    FileSystem.writeAsStringAsync.mockResolvedValue();

    const uri = await exportBackupToFile(backupString);
    expect(uri).toBe('content://test/file.json');
    expect(FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync).toHaveBeenCalled();
    expect(FileSystem.StorageAccessFramework.createFileAsync).toHaveBeenCalledWith(
      'content://test',
      expect.any(String),
      'application/json'
    );
    expect(FileSystem.writeAsStringAsync).toHaveBeenCalledWith(
      'content://test/file.json',
      backupString,
      { encoding: 'utf8' }
    );
  });

  it('should throw permission-denied when user cancels on Android', async () => {
    jest.spyOn(require('react-native'), 'Platform', 'get').mockReturnValue({ OS: 'android' });
    FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync.mockResolvedValue({ granted: false });

    await expect(exportBackupToFile(backupString)).rejects.toThrow('permission-denied');
  });

  it('should write to documentDirectory and share on iOS', async () => {
    jest.spyOn(require('react-native'), 'Platform', 'get').mockReturnValue({ OS: 'ios' });
    Sharing.isAvailableAsync.mockResolvedValue(true);
    Sharing.shareAsync.mockResolvedValue();
    FileSystem.writeAsStringAsync.mockResolvedValue();

    const uri = await exportBackupToFile(backupString);
    expect(uri).toMatch(/\/documents\/mindbook_backup_.*\.json/);
    expect(FileSystem.writeAsStringAsync).toHaveBeenCalledWith(
      expect.stringContaining('/documents/'),
      backupString,
      { encoding: 'utf8' }
    );
    expect(Sharing.shareAsync).toHaveBeenCalled();
  });
});
