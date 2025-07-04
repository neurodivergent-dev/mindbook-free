// This file is Vault screen component for a note-taking app, allowing users to securely store and manage their notes with encryption and biometric authentication.
// It includes features like password protection, biometric authentication, and auto-lock functionality.
// The component uses React hooks for state management and side effects, and it integrates with SecureStore for persistent storage of notes and passwords.
import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  TextInput,
  Dimensions,
  FlatList,
  Platform,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import * as LocalAuthentication from 'expo-local-authentication';
import * as Crypto from 'expo-crypto';
import NoteCard from '../components/NoteCard';
import { NOTES_KEY, getAllNotes } from '../utils/storage';
import {
  encryptVaultNotes,
  decryptVaultNotes,
  checkVaultDataIntegrity,
  emergencyVaultDataRecovery,
} from '../utils/vaultEncryption';
import EmptyState from '../components/EmptyState';
import { useTranslation } from 'react-i18next';

// Secure storage keys - session independent
const VAULT_PASSWORD_KEY = 'mindbook_vault_password';
const VAULT_NOTES_KEY = 'vault_notes';

const hashPassword = async text => {
  const digest = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, text);
  return digest;
};

export default function VaultScreen() {
  const router = useRouter();
  const { theme, accentColor, themeColors, themeMode } = useTheme();
  const { t } = useTranslation();
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [hasPassword, setHasPassword] = useState(false);
  const [password, setPassword] = useState('');
  const [vaultNotes, setVaultNotes] = useState([]);
  const [selectedNotes, setSelectedNotes] = useState([]);
  const [lastActivityTime, setLastActivityTime] = useState(Date.now());
  const [dataRecoveryInfo, setDataRecoveryInfo] = useState(null);
  const AUTO_LOCK_TIMEOUT = 5 * 60 * 1000; // 5 minutes

  useEffect(() => {
    checkVaultStatus();
    if (isUnlocked) {
      loadVaultNotes();
    }
  }, [isUnlocked]);

  useEffect(() => {
    const checkAutoLock = () => {
      if (isUnlocked && hasPassword && Date.now() - lastActivityTime > AUTO_LOCK_TIMEOUT) {
        setIsUnlocked(false);
        setPassword('');
        Alert.alert(t('notes.security'), t('notes.autoLock'));
      }
    };

    const interval = setInterval(checkAutoLock, 60000); // Check every minute
    return () => clearInterval(interval);
  }, [isUnlocked, lastActivityTime, hasPassword, t]);

  // Update last activity time on every user interaction
  const updateLastActivity = () => {
    setLastActivityTime(Date.now());
  };

  useEffect(() => {
    if (isUnlocked) {
      const dimensionsHandler = ({ window, screen }) => {
        updateLastActivity();
      };

      const subscription = Dimensions.addEventListener('change', dimensionsHandler);

      return () => {
        subscription?.remove();
      };
    }
  }, [isUnlocked]);

  // Add onPress event to all interactive components
  const handleNotePress = noteId => {
    updateLastActivity();
    if (selectedNotes.length > 0) {
      setSelectedNotes(prevSelected => {
        if (prevSelected.includes(noteId)) {
          return prevSelected.filter(id => id !== noteId);
        } else {
          return [...prevSelected, noteId];
        }
      });
    } else {
      router.push(`/(modal)/edit-note?id=${noteId}`);
    }
  };

  const handleLongPress = noteId => {
    updateLastActivity();
    setSelectedNotes(prevSelected => {
      if (prevSelected.includes(noteId)) {
        return prevSelected.filter(id => id !== noteId);
      } else {
        return [...prevSelected, noteId];
      }
    });
  };

  // Session-independent vault status check
  const checkVaultStatus = async () => {
    try {
      // Check for password in SecureStore first (preferred)
      let storedPassword = null;
      try {
        storedPassword = await SecureStore.getItemAsync(VAULT_PASSWORD_KEY);
      } catch (secureError) {
        console.log('SecureStore not available, checking AsyncStorage...');
        // Fallback to AsyncStorage for older versions
        storedPassword = await AsyncStorage.getItem('vault_password');
      }

      setHasPassword(!!storedPassword);

      if (!storedPassword) {
        setIsUnlocked(true); // If no password set, automatically unlock
      }
    } catch (error) {
      console.error('Error while checking vault status:', error);
      setHasPassword(false);
      setIsUnlocked(true);
    }
  };

  const migrateNotes = async oldEncryptedNotes => {
    try {
      if (!oldEncryptedNotes || typeof oldEncryptedNotes !== 'string') {
        console.log('Invalid data format, empty string returned');
        return [];
      }

      let notes = [];

      // 1. Plain JSON format control
      try {
        notes = JSON.parse(oldEncryptedNotes);
        if (Array.isArray(notes)) {
          return notes.map(note => ({
            ...note,
            isVaulted: false,
            updatedAt: note.updatedAt || new Date().toISOString(),
          }));
        }
      } catch (e) {
        console.error('Error while parsing plain JSON:', e);
      }

      // 2. Pre-v1.0 format control
      try {
        const oldData = JSON.parse(oldEncryptedNotes);
        if (oldData && typeof oldData === 'object') {
          // 2.1 Old encrypted format
          if (oldData.data && !oldData.version) {
            const parsedData = JSON.parse(oldData.data);
            if (Array.isArray(parsedData)) {
              return parsedData.map(note => ({
                ...note,
                isVaulted: false,
                updatedAt: note.updatedAt || new Date().toISOString(),
              }));
            }
          }
          // 2.2 New encrypted format
          if (oldData.data && typeof oldData.data === 'string') {
            try {
              const parsedData = JSON.parse(oldData.data);
              if (Array.isArray(parsedData)) {
                return parsedData.map(note => ({
                  ...note,
                  isVaulted: false,
                  updatedAt: note.updatedAt || new Date().toISOString(),
                }));
              }
            } catch (e) {
              console.error('Data parsing failed:', e);
            }
          }
        }
      } catch (e) {
        console.error('Error in format check before v1.0:', e);
      }

      // 3. Try other formats
      try {
        // Check for Base64 or other encoded formats
        const decodedData = decodeURIComponent(oldEncryptedNotes);
        try {
          const parsedData = JSON.parse(decodedData);
          if (Array.isArray(parsedData)) {
            return parsedData.map(note => ({
              ...note,
              isVaulted: false,
              updatedAt: note.updatedAt || new Date().toISOString(),
            }));
          }
        } catch (e) {
          console.error('Could not decode encoded format:', e);
        }
      } catch (e) {
        console.log('Not encoded format');
      }

      console.log('Unrecognized data format, empty string returned');
      return [];
    } catch (error) {
      console.error('Version upgrade error:', error);
      return [];
    }
  };

  const handleUnlock = async () => {
    try {
      // Try SecureStore first, fallback to AsyncStorage
      let storedPassword = null;
      try {
        storedPassword = await SecureStore.getItemAsync(VAULT_PASSWORD_KEY);
      } catch (secureError) {
        console.log('SecureStore not available, trying AsyncStorage...');
        storedPassword = await AsyncStorage.getItem('vault_password');
      }

      if (!storedPassword) {
        Alert.alert(t('common.error'), t('settings.noPasswordSet'));
        return;
      }

      const hashedPassword = await hashPassword(password);

      if (hashedPassword === storedPassword) {
        setIsUnlocked(true);
        setPassword('');
      } else {
        Alert.alert(t('common.error'), t('notes.wrongPassword'));
      }
    } catch (error) {
      console.error('Error while opening the vault:', error);
      Alert.alert(t('common.error'), t('notes.vaultUnlockError'));
    }
  };

  const handleBiometricAuth = async () => {
    try {
      const { success } = await LocalAuthentication.authenticateAsync({
        promptMessage: t('notes.biometricAuth'),
        fallbackLabel: t('notes.usePassword'),
      });

      if (success) {
        setIsUnlocked(true);
      }
    } catch (error) {
      console.error('Biometric authentication error:', error);
    }
  };

  const handleSelectAll = () => {
    if (selectedNotes.length === vaultNotes.length) {
      setSelectedNotes([]);
    } else {
      setSelectedNotes(vaultNotes.map(note => note.id));
    }
  };

  const handleMoveToNormal = async () => {
    if (selectedNotes.length === 0) {
      Alert.alert(t('common.warning'), t('notes.selectNotesToMove'));
      return;
    }

    const selectedCount = selectedNotes.length;

    Alert.alert(t('notes.moveToNormal'), t('notes.moveToNormalConfirmation'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.move'),
        style: 'default',
        onPress: async () => {
          try {
            // 1. Get current normal grades
            const allNotes = await getAllNotes();
            // 2. Find and clear selected notes
            const notesToMove = vaultNotes
              .filter(note => selectedNotes.includes(note.id))
              .map(note => {
                // Clear case properties
                const cleanNote = {
                  ...note,
                  isVaulted: false,
                  updatedAt: new Date().toISOString(),
                };
                delete cleanNote.encryptedContent;
                delete cleanNote.encryptedTitle;
                return cleanNote;
              });

            // 3. Determine the notes to remain in the safe
            const remainingVaultNotes = vaultNotes.filter(note => !selectedNotes.includes(note.id));
            // 4. Add to normal notes
            const updatedNotes = [...allNotes, ...notesToMove];
            // 5. Save changes
            await Promise.all([
              AsyncStorage.setItem(NOTES_KEY, JSON.stringify(updatedNotes)),
              AsyncStorage.setItem(
                'vault_notes',
                remainingVaultNotes.length > 0 ? await encryptVaultNotes(remainingVaultNotes) : ''
              ),
            ]);

            // 6. Update State
            setVaultNotes(remainingVaultNotes);
            setSelectedNotes([]);

            // 7. Return to home page and refresh
            router.back();
            Alert.alert(
              t('common.success'),
              t('notes.notesMovedToNormal', { count: selectedCount })
            );
          } catch (error) {
            Alert.alert(t('common.error'), t('notes.moveToNormalError'));
          }
        },
      },
    ]);
  };

  const handleRestoreNotes = async () => {
    if (selectedNotes.length === 0) {
      Alert.alert(t('common.warning'), t('notes.selectNotesToRestore'));
      return;
    }

    Alert.alert(t('notes.restoreNotes'), t('notes.restoreNotesConfirmation'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.restore'),
        onPress: async () => {
          try {
            // 1. Get current normal grades
            const allNotes = await getAllNotes();
            // 2. Find and clear selected notes
            const notesToRestore = vaultNotes
              .filter(note => selectedNotes.includes(note.id))
              .map(note => ({
                ...note,
                isVaulted: false,
                updatedAt: new Date().toISOString(),
              }));

            // 3. Determine the notes to remain in the safe
            const remainingVaultNotes = vaultNotes.filter(note => !selectedNotes.includes(note.id));

            // 4. Add to normal notes
            const updatedNotes = [...allNotes, ...notesToRestore];
            console.log('5. Toplam normal not sayısı:', updatedNotes.length);

            // 5. Save changes
            await Promise.all([
              AsyncStorage.setItem(NOTES_KEY, JSON.stringify(updatedNotes)),
              AsyncStorage.setItem(
                'vault_notes',
                remainingVaultNotes.length > 0 ? await encryptVaultNotes(remainingVaultNotes) : ''
              ),
            ]);

            // 6. Update State
            setVaultNotes(remainingVaultNotes);
            setSelectedNotes([]);

            Alert.alert(
              t('common.success'),
              t('notes.notesRestored', { count: notesToRestore.length })
            );
          } catch (error) {
            Alert.alert(t('common.error'), t('notes.restoreError'));
          }
        },
      },
    ]);
  };

  const renderActionBar = () => {
    const borderTopColor = themeMode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)';

    return (
      <View
        style={[
          styles.actionBar,
          {
            backgroundColor: theme.card,
            borderTopColor: borderTopColor,
          },
        ]}
      >
        <View style={styles.actionBarContent}>
          <View style={styles.actionBarLeft}>
            <TouchableOpacity
              style={[
                styles.selectionButton,
                {
                  backgroundColor: themeMode === 'dark' ? theme.card : '#FFFFFF',
                  borderColor: themeColors[accentColor],
                },
              ]}
              onPress={handleSelectAll}
            >
              <Ionicons
                name={
                  selectedNotes.length === vaultNotes.length ? 'close-circle' : 'checkmark-circle'
                }
                size={18}
                color={themeColors[accentColor]}
              />
              <Text
                style={[
                  styles.actionText,
                  {
                    color: themeColors[accentColor],
                  },
                ]}
              >
                {selectedNotes.length === vaultNotes.length
                  ? t('common.unselectAll')
                  : t('common.selectAll')}
              </Text>
            </TouchableOpacity>
            <Text style={[styles.selectedCount, { color: theme.textSecondary }]}>
              {selectedNotes.length} {t('notes.notesCount')} {t('common.selected')}
            </Text>
          </View>

          <View style={styles.actionBarRight}>
            <TouchableOpacity
              style={[
                styles.actionIconButton,
                {
                  backgroundColor: themeMode === 'dark' ? theme.card : '#FFFFFF',
                  borderColor: themeColors[accentColor],
                },
              ]}
              onPress={handleRestoreNotes}
              activeOpacity={0.6}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              accessibilityLabel={t('notes.restoreNotes')}
            >
              <Ionicons name="arrow-up-circle-outline" size={22} color={themeColors[accentColor]} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.actionIconButton,
                {
                  backgroundColor: themeMode === 'dark' ? theme.card : '#FFFFFF',
                  borderColor: '#dc2626',
                },
              ]}
              onPress={handleDelete}
              activeOpacity={0.6}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="trash-outline" size={22} color="#dc2626" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  const handleDelete = async () => {
    if (selectedNotes.length === 0) {
      Alert.alert(t('common.warning'), t('notes.selectNotesToMove'));
      return;
    }

    Alert.alert(t('notes.deleteNotes'), t('notes.deleteNotesConfirmation'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: async () => {
          try {
            // Find unselected notes
            const remainingNotes = vaultNotes.filter(note => !selectedNotes.includes(note.id));

            // Encrypt and save
            const encryptedNotes = await encryptVaultNotes(remainingNotes);
            await AsyncStorage.setItem('vault_notes', encryptedNotes);

            // Update State
            setVaultNotes(remainingNotes);
            setSelectedNotes([]);

            // Reload notes
            await loadVaultNotes();
            console.log('4. Notes reloaded successfully');

            console.log('=== NOTE DELETING PROCESS COMPLETED ===');
            Alert.alert(
              t('common.success'),
              t('notes.notesPermanentlyDeleted', { count: selectedNotes.length })
            );
          } catch (error) {
            Alert.alert(t('common.error'), t('notes.deleteNotesError'));
          }
        },
      },
    ]);
  };

  const loadVaultNotes = async () => {
    try {
      console.log('🔍 Loading vault notes with integrity check...');

      // Check data integrity and attempt recovery if needed
      const integrityResult = await checkVaultDataIntegrity();

      if (!integrityResult.success) {
        console.error('❌ Vault data integrity check failed completely');
        setVaultNotes([]);
        return;
      }

      if (integrityResult.recovered) {
        console.log('🔄 Vault data was recovered during integrity check');
        setDataRecoveryInfo({
          recovered: true,
          count: integrityResult.count,
          timestamp: new Date().toISOString(),
        });

        // Show user notification about recovery
        setTimeout(() => {
          Alert.alert(
            t('notes.dataRecoveryTitle', { fallback: 'Data Recovery' }),
            t('notes.dataRecoveryMessage', {
              fallback: `Successfully recovered ${integrityResult.count} encrypted notes from vault. Your data is safe.`,
              count: integrityResult.count,
            }),
            [{ text: t('common.ok', { fallback: 'OK' }) }]
          );
        }, 1000);
      }

      console.log(`📊 Found ${integrityResult.count} notes in vault`);

      // Load the verified/recovered notes
      const vaultNotesStr = await AsyncStorage.getItem('vault_notes');
      if (!vaultNotesStr) {
        setVaultNotes([]);
        return;
      }

      let decryptedNotes;
      try {
        decryptedNotes = await decryptVaultNotes(vaultNotesStr);
      } catch (error) {
        console.warn('⚠️ Normal decryption failed, trying emergency recovery...');
        decryptedNotes = await emergencyVaultDataRecovery(vaultNotesStr);

        if (decryptedNotes && Array.isArray(decryptedNotes) && decryptedNotes.length > 0) {
          // Re-encrypt recovered data
          const reEncrypted = await encryptVaultNotes(decryptedNotes);
          if (reEncrypted) {
            await AsyncStorage.setItem('vault_notes', reEncrypted);
            console.log('✅ Emergency recovery successful, data re-encrypted');

            // Notify user about emergency recovery
            setDataRecoveryInfo({
              recovered: true,
              count: decryptedNotes.length,
              timestamp: new Date().toISOString(),
              emergency: true,
            });

            setTimeout(() => {
              Alert.alert(
                t('notes.emergencyRecoveryTitle', { fallback: 'Emergency Data Recovery' }),
                t('notes.emergencyRecoveryMessage', {
                  fallback: `Emergency recovery successful! Recovered ${decryptedNotes.length} notes from corrupted vault data. Your notes have been re-encrypted with the latest security standards.`,
                  count: decryptedNotes.length,
                }),
                [{ text: t('common.ok', { fallback: 'OK' }) }]
              );
            }, 1500);
          }
        }
      }

      if (Array.isArray(decryptedNotes)) {
        console.log('✅ Vault notes loaded successfully:');
        decryptedNotes.forEach(note => {
          console.log(`📝 Note: ${note.title}`);
          console.log(`   - ID: ${note.id}`);
          console.log(`   - isArchived: ${note.isArchived}`);
          console.log(`   - isTrash: ${note.isTrash}`);
          console.log(`   - isVaulted: ${note.isVaulted}`);
          console.log('   ---');
        });
        setVaultNotes(decryptedNotes);
      } else {
        console.warn('⚠️ Invalid vault notes format, setting empty array');
        setVaultNotes([]);
      }
    } catch (error) {
      console.error('❌ Error loading vault notes:', error);
      setVaultNotes([]);
    }
  };

  const handleMoveToVault = async selectedNotes => {
    try {
      // Convert IDs to array
      const noteIds = Array.isArray(selectedNotes) ? selectedNotes : [];

      if (!noteIds || noteIds.length === 0) {
        return false;
      }

      // Check if vault password is set
      const storedPassword = await AsyncStorage.getItem('vault_password');
      if (!storedPassword) {
        // If no password, cannot proceed
        return false;
      }

      // 1. Read normal notes
      const normalNotesStr = await AsyncStorage.getItem(NOTES_KEY);
      const normalNotes = JSON.parse(normalNotesStr || '[]');

      // Clean up duplicate notes
      const uniqueNormalNotes = normalNotes.filter(
        (note, index, self) => index === self.findIndex(n => n.id === note.id)
      );

      // 2. Read cash notes
      const vaultNotesStr = await AsyncStorage.getItem('vault_notes');
      let vaultNotes = [];

      try {
        if (vaultNotesStr) {
          const decryptedNotes = await decryptVaultNotes(vaultNotesStr);
          vaultNotes = Array.isArray(decryptedNotes) ? decryptedNotes : [];
        }
      } catch (e) {
        console.error('Vault notes could not be deciphered:', e);
      }

      console.log(
        'Vault Notes:',
        vaultNotes.map(note => ({ id: note.id, title: note.title }))
      );

      // 3. Find selected notes
      const notesToMove = uniqueNormalNotes.filter(note => {
        const shouldMove = noteIds.includes(note.id.toString());
        return shouldMove;
      });

      if (notesToMove.length === 0) {
        console.error('No notes found to move');
        return false;
      }

      // 4. Add to vault
      const newVaultNotes = [...vaultNotes, ...notesToMove];

      // 5. Encrypt and save notes
      const encryptedNotes = await encryptVaultNotes(newVaultNotes);
      await AsyncStorage.setItem('vault_notes', encryptedNotes);

      return true;
    } catch (error) {
      console.error('Checkout error (detailed):', error);
      throw error;
    }
  };

  if (!isUnlocked) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <Stack.Screen
          options={{
            headerShown: false,
            presentation: 'modal',
          }}
        />

        {/* Header */}
        <View style={[styles.header, { backgroundColor: themeColors[accentColor] }]}>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => router.back()}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('notes.vault')}</Text>
        </View>

        {!hasPassword ? (
          <View
            style={[
              styles.emptyStateContainer,
              {
                flex: 1,
                justifyContent: 'center',
                alignItems: 'center',
              },
            ]}
          >
            <EmptyState
              icon="lock-closed"
              title={t('notes.vaultPasswordRequired')}
              message={t('notes.vaultPasswordMessage')}
              action={{
                label: t('settings.setPassword'),
                onPress: () => router.push('/(tabs)/settings'),
              }}
            />
          </View>
        ) : !isUnlocked ? (
          <View style={styles.unlockContainer}>
            <View style={[styles.lockIcon, { backgroundColor: themeColors[accentColor] + '20' }]}>
              <Ionicons name="lock-closed" size={48} color={themeColors[accentColor]} />
            </View>

            <Text style={[styles.unlockTitle, { color: theme.text }]}>{t('notes.secureArea')}</Text>

            <Text style={[styles.unlockSubtitle, { color: theme.textSecondary }]}>
              {t('notes.authenticationRequired')}
            </Text>

            <TextInput
              style={[
                styles.passwordInput,
                {
                  backgroundColor: theme.card,
                  borderColor: theme.border,
                  color: theme.text,
                },
              ]}
              placeholder={t('notes.enterPassword')}
              placeholderTextColor={theme.textSecondary}
              secureTextEntry={true}
              value={password}
              onChangeText={setPassword}
            />

            <TouchableOpacity
              style={[styles.unlockButton, { backgroundColor: themeColors[accentColor] }]}
              onPress={handleUnlock}
            >
              <Text style={styles.unlockButtonText}>{t('notes.unlockVault')}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.biometricButton, { borderColor: themeColors[accentColor] }]}
              onPress={handleBiometricAuth}
            >
              <Ionicons name="finger-print" size={24} color={themeColors[accentColor]} />
              <Text style={[styles.biometricButtonText, { color: themeColors[accentColor] }]}>
                {t('notes.unlockWithFingerprint')}
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          // Contents of the case
          <>
            {selectedNotes.length > 0 && renderActionBar()}
            <FlatList
              data={vaultNotes}
              renderItem={({ item: note }) => (
                <NoteCard
                  note={note}
                  onRefresh={loadVaultNotes}
                  isSelectionMode={selectedNotes.length > 0}
                  isSelected={selectedNotes.includes(note.id)}
                  onLongPress={() => handleLongPress(note.id)}
                  onPress={() => handleNotePress(note.id)}
                  style={{ marginHorizontal: 4 }}
                />
              )}
              keyExtractor={item => item.id}
              contentContainerStyle={[
                styles.notesList,
                vaultNotes.length === 0 && { flexGrow: 1, justifyContent: 'center' },
                selectedNotes.length > 0 && { paddingBottom: Platform.OS === 'ios' ? 100 : 80 },
              ]}
              ListEmptyComponent={
                <EmptyState
                  icon="lock-closed"
                  title={t('notes.emptyVault')}
                  message={t('notes.emptyVaultMessage')}
                />
              }
            />
          </>
        )}
      </View>
    );
  }

  return (
    <View
      style={[styles.container, { backgroundColor: theme.background }]}
      onStartShouldSetResponder={() => {
        updateLastActivity();
        return false;
      }}
    >
      <Stack.Screen
        options={{
          headerShown: false,
          presentation: 'modal',
        }}
      />

      {/* Header */}
      <View style={[styles.header, { backgroundColor: themeColors[accentColor] }]}>
        <TouchableOpacity
          style={styles.closeButton}
          onPress={() => router.back()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('notes.vault')}</Text>
      </View>

      {!hasPassword ? (
        <View
          style={[
            styles.emptyStateContainer,
            {
              flex: 1,
              justifyContent: 'center',
              alignItems: 'center',
            },
          ]}
        >
          <EmptyState
            icon="lock-closed"
            title={t('notes.vaultPasswordRequired')}
            message={t('notes.vaultPasswordMessage')}
            action={{
              label: t('settings.setPassword'),
              onPress: () => router.push('/(tabs)/settings'),
            }}
          />
        </View>
      ) : !isUnlocked ? (
        <View style={styles.unlockContainer}>
          <View style={[styles.lockIcon, { backgroundColor: themeColors[accentColor] + '20' }]}>
            <Ionicons name="lock-closed" size={48} color={themeColors[accentColor]} />
          </View>

          <Text style={[styles.unlockTitle, { color: theme.text }]}>{t('notes.secureArea')}</Text>

          <Text style={[styles.unlockSubtitle, { color: theme.textSecondary }]}>
            {t('notes.authenticationRequired')}
          </Text>

          <TextInput
            style={[
              styles.passwordInput,
              {
                backgroundColor: theme.card,
                borderColor: theme.border,
                color: theme.text,
              },
            ]}
            placeholder={t('notes.enterPassword')}
            placeholderTextColor={theme.textSecondary}
            secureTextEntry={true}
            value={password}
            onChangeText={setPassword}
          />

          <TouchableOpacity
            style={[styles.unlockButton, { backgroundColor: themeColors[accentColor] }]}
            onPress={handleUnlock}
          >
            <Text style={styles.unlockButtonText}>{t('notes.unlockVault')}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.biometricButton, { borderColor: themeColors[accentColor] }]}
            onPress={handleBiometricAuth}
          >
            <Ionicons name="finger-print" size={24} color={themeColors[accentColor]} />
            <Text style={[styles.biometricButtonText, { color: themeColors[accentColor] }]}>
              {t('notes.unlockWithFingerprint')}
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        // Vault contents
        <>
          {selectedNotes.length > 0 && renderActionBar()}
          <FlatList
            data={vaultNotes}
            renderItem={({ item: note }) => (
              <NoteCard
                note={note}
                onRefresh={loadVaultNotes}
                isSelectionMode={selectedNotes.length > 0}
                isSelected={selectedNotes.includes(note.id)}
                onLongPress={() => handleLongPress(note.id)}
                onPress={() => handleNotePress(note.id)}
                style={{ marginHorizontal: 4 }}
              />
            )}
            keyExtractor={item => item.id}
            contentContainerStyle={[
              styles.notesList,
              vaultNotes.length === 0 && { flexGrow: 1, justifyContent: 'center' },
              selectedNotes.length > 0 && { paddingBottom: Platform.OS === 'ios' ? 100 : 80 },
            ]}
            ListEmptyComponent={
              <EmptyState
                icon="lock-closed"
                title={t('notes.emptyVault')}
                message={t('notes.emptyVaultMessage')}
              />
            }
          />
        </>
      )}
    </View>
  );
}

// Vault screen styles
const styles = StyleSheet.create({
  actionBar: {
    borderTopWidth: 1,
    bottom: 0,
    elevation: 4,
    left: 0,
    paddingBottom: Platform.OS === 'ios' ? 28 : 12,
    paddingTop: 12,
    position: 'absolute',
    right: 0,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    zIndex: 999,
  },
  actionBarContent: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    zIndex: 1000,
  },
  actionBarLeft: {
    alignItems: 'flex-start',
    flexDirection: 'column',
    zIndex: 1001,
  },
  actionBarRight: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    zIndex: 1001,
  },
  actionButton: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 4,
    zIndex: 1002,
  },
  actionIconButton: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    elevation: 2,
    height: 40,
    justifyContent: 'center',
    padding: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
    width: 40,
    zIndex: 1002,
  },
  actionText: {
    fontWeight: '500',
    fontSize: 13,
    marginLeft: 6,
  },
  biometricButton: {
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1.5,
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  biometricButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
  checkmark: {
    alignItems: 'center',
    borderRadius: 12,
    height: 24,
    justifyContent: 'center',
    marginLeft: 12,
    width: 24,
  },
  container: {
    flex: 1,
  },
  emptyStateButton: {
    borderRadius: 14,
    elevation: 2,
    paddingHorizontal: 24,
    paddingVertical: 14,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
  },
  emptyStateButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  emptyStateContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  emptyStateIcon: {
    borderRadius: 24,
    marginBottom: 24,
    padding: 24,
  },
  emptyStateMessage: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 32,
    textAlign: 'center',
  },
  emptyStateTitle: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 12,
    textAlign: 'center',
  },
  lockIcon: {
    borderRadius: 24,
    marginBottom: 32,
    padding: 24,
  },
  mainActionButton: {
    marginBottom: 4,
  },
  noteContent: {
    flex: 1,
  },
  noteItem: {
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    padding: 16,
  },
  notePreview: {
    fontSize: 14,
    lineHeight: 20,
  },
  noteTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  notesList: {
    gap: 12,
    padding: 16,
  },
  passwordInput: {
    borderRadius: 16,
    borderWidth: 1,
    fontSize: 16,
    height: 56,
    marginBottom: 20,
    paddingHorizontal: 20,
    width: '100%',
  },
  selectedCount: {
    fontSize: 13,
    fontWeight: '500',
    marginTop: 8,
  },
  unlockButton: {
    alignItems: 'center',
    borderRadius: 16,
    elevation: 2,
    height: 56,
    justifyContent: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    width: '100%',
  },
  unlockButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '600',
  },
  unlockContainer: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  unlockSubtitle: {
    fontSize: 16,
    letterSpacing: 0.3,
    marginBottom: 32,
    opacity: 0.8,
    textAlign: 'center',
  },
  unlockTitle: {
    fontSize: 32,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 12,
    textAlign: 'center',
  },
  selectionButton: {
    alignItems: 'center',
    flexDirection: 'row',
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    padding: 16,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '600',
  },
  closeButton: {
    marginRight: 8,
    padding: 8,
  },
});
