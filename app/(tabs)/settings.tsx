// This file is Settings screen component for a React Native application. It includes various settings options such as theme mode, font size, language selection, and backup/restore functionality. The component uses hooks for state management and context for theme and language settings. It also includes modals for selecting fonts and languages, as well as password management features. The component is styled using StyleSheet from React Native and includes error handling and user feedback through alerts.
import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Switch,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
  Image,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  backupToCloud,
  restoreFromCloud,
  getLastCloudBackupDate,
  getCurrentUserId,
} from '../utils/backup';
import { NOTES_KEY } from '../utils/storage';
import { useAuth } from '../context/AuthContext';
import * as Crypto from 'expo-crypto';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import i18n from 'i18next';
import NetInfo from '@react-native-community/netinfo';
import supabase from '../utils/supabase';
import * as ImagePicker from 'expo-image-picker';
import { cloudinaryService } from '../utils/cloudinaryService';

const OVERLAY_BACKGROUND_COLOR = 'rgba(0,0,0,0.5)';
const TRANSPARENT = 'transparent';
const WHITE = '#fff';
const BORDER_WIDTH = 1;
const BORDER_COLOR = 'rgba(0,0,0,0.1)';
const SHADOW_COLOR = '#000';
const AVATAR_PLACEHOLDER_COLOR = 'rgba(0,0,0,0.05)';
const DANGER_COLOR = '#ef4444';
const LOGIN_COLOR = '#3b82f6';
const ACTIVE_OPACITY = 1;
const DISABLED_OPACITY = 0.5;

const Settings = () => {
  const {
    theme,
    themeMode,
    changeThemeMode,
    accentColor,
    changeAccentColor,
    themeColors,
    fontSize,
    changeFontSize,
    fontSizes,
    fontFamily,
    changeFontFamily,
    fontFamilies,
  } = useTheme();
  const { currentLanguage, changeLanguage, languages } = useLanguage();
  const { t } = useTranslation();
  const [autoBackupEnabled, setAutoBackupEnabled] = useState(false);
  const [lastBackupTime, setLastBackupTime] = useState(null);
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const { user, logout, isGuestMode, forceLogin } = useAuth();
  const [showFontModal, setShowFontModal] = useState(false);
  const [showLanguageModal, setShowLanguageModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [hasPassword, setHasPassword] = useState(false);
  const [showColorOptions, setShowColorOptions] = useState(false);
  const [isConnected, setIsConnected] = useState(true);
  const [userDisplayName, setUserDisplayName] = useState('');
  const [profileImage, setProfileImage] = useState(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  const loadAutoBackupSetting = useCallback(async () => {
    try {
      const value = await AsyncStorage.getItem('@auto_backup_enabled');
      if (user && !user.isAnonymous) {
        if (value !== null) {
          setAutoBackupEnabled(JSON.parse(value));
        }
      } else {
        setAutoBackupEnabled(false);
      }
    } catch (error) {
      console.error('Error loading auto backup setting:', error);
    }
  }, [user]);

  // Get user display name from metadata
  const getUserDisplayName = useCallback(() => {
    if (!user) return '';

    // Try to get name from user metadata
    if (user.user_metadata?.full_name) {
      return user.user_metadata.full_name;
    }

    // Try to get from email (username part)
    if (user.email) {
      return user.email.split('@')[0];
    }

    return 'User';
  }, [user]);

  useEffect(() => {
    if (user) {
      setUserDisplayName(getUserDisplayName());
    }
  }, [user, getUserDisplayName]);

  const loadLastBackupTime = useCallback(async () => {
    try {
      const currentUserId = await getCurrentUserId();
      if (currentUserId) {
        const localTime = await AsyncStorage.getItem('@last_backup_time');
        const cloudBackupDate = await getLastCloudBackupDate(currentUserId);
        if (cloudBackupDate && (!localTime || new Date(cloudBackupDate) > new Date(localTime))) {
          setLastBackupTime(new Date(cloudBackupDate));
        } else if (localTime) {
          setLastBackupTime(new Date(localTime));
        } else {
          setLastBackupTime(null);
        }
      } else {
        const localTime = await AsyncStorage.getItem('@last_backup_time');
        setLastBackupTime(localTime ? new Date(localTime) : null);
      }
    } catch (error) {
      console.error('Error loading backup time:', error);
    }
  }, []); // Removed user from dependencies since it's not used

  const checkPasswordStatus = useCallback(async () => {
    try {
      const storedPassword = await AsyncStorage.getItem('vault_password');
      setHasPassword(!!storedPassword);
    } catch (error) {
      console.error('Error checking password status:', error);
    }
  }, []);

  useEffect(() => {
    loadAutoBackupSetting();
    loadLastBackupTime();
    checkPasswordStatus();

    // Monitor internet connection changes
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsConnected(!!state.isConnected);
    });

    // Clear the listener when the component is unmounted
    return () => unsubscribe();
  }, [loadAutoBackupSetting, loadLastBackupTime, checkPasswordStatus]);

  const handleManualBackup = async () => {
    // Internet connection control
    if (!isConnected) {
      return;
    }

    if (!user) {
      Alert.alert(t('common.warning'), t('settings.loginRequiredForBackup'));
      return;
    }

    try {
      // Get device notes from AsyncStorage
      const notesJson = await AsyncStorage.getItem(NOTES_KEY);
      const notes = notesJson ? JSON.parse(notesJson) : [];

      // Check if there are any notes to backup
      if (!notes || notes.length === 0) {
        Alert.alert(t('common.warning'), t('common.noLocalNotesToBackup'));
        return;
      }

      setIsBackingUp(true);
      // Cloud backup process
      const result = await backupToCloud(user.uid);

      if (result.success) {
        const now = new Date();
        await AsyncStorage.setItem('@last_backup_time', now.toISOString());
        setLastBackupTime(now);
        Alert.alert(t('common.success'), t('settings.backupSuccess'));
      } else {
        Alert.alert(t('common.error'), result.error || t('settings.backupError'));
      }
    } catch (error) {
      console.error('Error during manual backup:', error);
      Alert.alert(t('common.error'), t('settings.backupError'));
    } finally {
      setIsBackingUp(false);
    }
  };

  const handleRestoreBackup = async () => {
    // Internet connection control
    if (!isConnected) {
      return;
    }

    try {
      const currentUserId = await getCurrentUserId();
      if (!currentUserId) {
        Alert.alert(t('common.warning'), t('settings.loginRequiredForRestore'));
        return;
      }

      setIsRestoring(true);
      const result = await restoreFromCloud(currentUserId);

      if (result.success) {
        const backupDate = new Date(result.backupDate).toLocaleString(
          i18n.language === 'tr' ? 'tr-TR' : 'en-US',
          {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
          }
        );
        Alert.alert(t('common.success'), t('settings.restoreSuccess', { date: backupDate }));
        loadLastBackupTime();
      } else {
        Alert.alert(t('common.error'), result.error || t('settings.restoreError'));
      }
    } catch (error) {
      console.error('Error during restore:', error);
      Alert.alert(t('common.error'), t('settings.restoreError'));
    } finally {
      setIsRestoring(false);
    }
  };

  const saveAutoBackupSetting = async value => {
    try {
      // If logged in and not in guest mode, save user selection
      if (user && !user.isAnonymous) {
        await AsyncStorage.setItem('@auto_backup_enabled', JSON.stringify(value));
        setAutoBackupEnabled(value);
      } else {
        // Always closed if not logged in or in guest mode
        await AsyncStorage.setItem('@auto_backup_enabled', JSON.stringify(false));
        setAutoBackupEnabled(false);
      }
    } catch (error) {
      console.error('Error saving auto backup setting:', error);
    }
  };

  const validatePassword = password => {
    const minLength = 8;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

    const errors = [];
    if (password.length < minLength) {
      errors.push(t('settings.passwordMinLength', { length: minLength }));
    }
    if (!hasUpperCase) {
      errors.push(t('settings.passwordUppercase'));
    }
    if (!hasLowerCase) {
      errors.push(t('settings.passwordLowercase'));
    }
    if (!hasNumbers) {
      errors.push(t('settings.passwordNumbers'));
    }
    if (!hasSpecialChar) {
      errors.push(t('settings.passwordSpecialChar'));
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  };

  const handleSetPassword = async () => {
    if (hasPassword && !currentPassword) {
      Alert.alert(t('common.error'), t('settings.currentPasswordRequired'));
      return;
    }

    if (!newPassword || !confirmPassword) {
      Alert.alert(t('common.error'), t('settings.newPasswordRequired'));
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert(t('common.error'), t('settings.passwordsDoNotMatch'));
      return;
    }

    const validation = validatePassword(newPassword);
    if (!validation.isValid) {
      Alert.alert(
        t('settings.invalidPassword'),
        t('settings.passwordRequirements') +
          '\n\n' +
          validation.errors.map(error => '• ' + error).join('\n')
      );
      return;
    }

    try {
      if (hasPassword) {
        const storedPassword = await AsyncStorage.getItem('vault_password');
        const hashedCurrentPassword = await hashPassword(currentPassword);

        if (hashedCurrentPassword !== storedPassword) {
          Alert.alert(t('common.error'), t('settings.wrongCurrentPassword'));
          return;
        }
      }

      const hashedPassword = await hashPassword(newPassword);
      await AsyncStorage.setItem('vault_password', hashedPassword);

      await AsyncStorage.setItem('vault_password_updated', new Date().toISOString());

      setShowPasswordModal(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setHasPassword(true);

      Alert.alert(t('common.success'), t('settings.passwordUpdated'));
    } catch (error) {
      console.error('Error updating password:', error);
      Alert.alert(t('common.error'), t('settings.passwordUpdateError'));
    }
  };

  const hashPassword = async text => {
    const digest = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, text);
    return digest;
  };

  const handleRemovePassword = async () => {
    if (!currentPassword) {
      Alert.alert(t('common.error'), t('settings.currentPasswordRequired'));
      return;
    }

    try {
      const storedPassword = await AsyncStorage.getItem('vault_password');
      const hashedCurrentPassword = await hashPassword(currentPassword);

      if (hashedCurrentPassword !== storedPassword) {
        Alert.alert(t('common.error'), t('settings.wrongCurrentPassword'));
        return;
      }

      await AsyncStorage.removeItem('vault_password');

      setShowPasswordModal(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setHasPassword(false);

      Alert.alert(t('common.success'), t('settings.passwordRemoved'));
    } catch (error) {
      console.error('Error removing password:', error);
      Alert.alert(t('common.error'), t('settings.passwordRemoveError'));
    }
  };

  const handleClearAllData = async () => {
    // Internet connection control
    if (!isConnected) {
      return;
    }

    try {
      // First get the user ID
      const userId = await getCurrentUserId();

      if (!userId) {
        Alert.alert(t('common.error'), t('settings.userIdNotFound'));
        return;
      }

      // Check if user has backup in cloud
      const { data, error } = await supabase
        .from('backups')
        .select('id')
        .eq('user_id', userId)
        .limit(1);

      if (error) {
        console.error('Error checking cloud backups:', error);
        Alert.alert(t('common.error'), t('settings.generalError'));
        return;
      }

      // If there is no backup, stop the process
      if (!data || data.length === 0) {
        Alert.alert(t('common.warning'), t('common.noCloudBackupsFound'), [{ text: 'OK' }]);
        return;
      }

      // If there is a backup, continue deleting
      Alert.alert(
        t('common.warning'),
        t('settings.confirmCloudDataDelete'),
        [
          { text: t('common.cancel'), style: 'cancel' },
          {
            text: t('common.delete'),
            style: 'destructive',
            onPress: async () => {
              try {
                console.log('Cloud backups are deleted, user ID:', userId);

                const { error } = await supabase.from('backups').delete().eq('user_id', userId);

                if (error) {
                  console.error('Error while deleting cloud backups:', error);
                  Alert.alert(
                    t('common.error'),
                    t('settings.cloudBackupDeleteError'),
                    [{ text: 'OK' }],
                    { cancelable: false }
                  );
                  return;
                }

                // Successful deletion message
                Alert.alert(
                  t('common.success'),
                  t('settings.cloudBackupDeleteSuccess'),
                  [{ text: 'OK' }],
                  { cancelable: false }
                );
              } catch (cloudError) {
                console.error('Error while deleting cloud backups:', cloudError);
                Alert.alert(
                  t('common.error'),
                  t('settings.cloudBackupDeleteError'),
                  [{ text: 'OK' }],
                  { cancelable: false }
                );
              }
            },
          },
        ],
        { cancelable: true }
      );
    } catch (error) {
      console.error('Error in cloud backup check:', error);
      Alert.alert(t('common.error'), t('settings.generalError'));
    }
  };

  const colors = [
    // Basic colors
    { id: 'blue', color: themeColors.blue },
    { id: 'purple', color: themeColors.purple },
    { id: 'pink', color: themeColors.pink },
    { id: 'red', color: themeColors.red },
    { id: 'orange', color: themeColors.orange },
    { id: 'yellow', color: themeColors.yellow },
    { id: 'green', color: themeColors.green },
    { id: 'teal', color: themeColors.teal },
    { id: 'cyan', color: themeColors.cyan },
    { id: 'indigo', color: themeColors.indigo },
    { id: 'navy', color: themeColors.navy },
    { id: 'rose', color: themeColors.rose },
    // Modern colors
    { id: 'turquoise', color: themeColors.turquoise },
    { id: 'emerald', color: themeColors.emerald },
    { id: 'peterRiver', color: themeColors.peterRiver },
    { id: 'amethyst', color: themeColors.amethyst },
    { id: 'wetAsphalt', color: themeColors.wetAsphalt },
    { id: 'sunFlower', color: themeColors.sunFlower },
    { id: 'carrot', color: themeColors.carrot },
    { id: 'alizarin', color: themeColors.alizarin },
    { id: 'crimson', color: themeColors.crimson },
    { id: 'hotPink', color: themeColors.hotPink },
    { id: 'skyBlue', color: themeColors.skyBlue },
    { id: 'slateBlue', color: themeColors.slateBlue },
    { id: 'magenta', color: themeColors.magenta },
    { id: 'forestGreen', color: themeColors.forestGreen },
    { id: 'gold', color: themeColors.gold },
    { id: 'orchid', color: themeColors.orchid },
    // Pastel colors
    { id: 'pastelPink', color: themeColors.pastelPink },
    { id: 'pastelBlue', color: themeColors.pastelBlue },
    { id: 'pastelGreen', color: themeColors.pastelGreen },
    { id: 'pastelPurple', color: themeColors.pastelPurple },
    { id: 'pastelYellow', color: themeColors.pastelYellow },
    { id: 'pastelOrange', color: themeColors.pastelOrange },
    // Metallic colors
    { id: 'silver', color: themeColors.silver },
    { id: 'bronze', color: themeColors.bronze },
    { id: 'platinum', color: themeColors.platinum },
    { id: 'copper', color: themeColors.copper },
    // Nature colors
    { id: 'leafGreen', color: themeColors.leafGreen },
    { id: 'oceanBlue', color: themeColors.oceanBlue },
    { id: 'sandBeige', color: themeColors.sandBeige },
    { id: 'sunsetOrange', color: themeColors.sunsetOrange },
    { id: 'skyAzure', color: themeColors.skyAzure },
    { id: 'roseWood', color: themeColors.roseWood },
    // Neon/Vivid colors
    { id: 'neonPink', color: themeColors.neonPink },
    { id: 'electricBlue', color: themeColors.electricBlue },
    { id: 'neonGreen', color: themeColors.neonGreen },
    { id: 'brightYellow', color: themeColors.brightYellow },
    { id: 'neonOrange', color: themeColors.neonOrange },
    { id: 'vividPurple', color: themeColors.vividPurple },
    // Vintage renkler
    { id: 'vintageRose', color: themeColors.vintageRose },
    { id: 'vintageSeafoam', color: themeColors.vintageSeafoam },
    { id: 'vintageMustard', color: themeColors.vintageMustard },
    { id: 'vintageNavy', color: themeColors.vintageNavy },
    // Retro colors
    { id: 'retroTeal', color: themeColors.retroTeal },
    { id: 'retroOrange', color: themeColors.retroOrange },
    { id: 'retroPink', color: themeColors.retroPink },
    { id: 'retroPurple', color: themeColors.retroPurple },
    // Space themed colors
    { id: 'galaxyPurple', color: themeColors.galaxyPurple },
    { id: 'cosmicBlue', color: themeColors.cosmicBlue },
    { id: 'nebulaPink', color: themeColors.nebulaPink },
    { id: 'marsRed', color: themeColors.marsRed },
    // Gradient effect colors
    { id: 'sunsetGradient', color: themeColors.sunsetGradient },
    { id: 'blueLagoon', color: themeColors.blueLagoon },
    { id: 'cherryBlossom', color: themeColors.cherryBlossom },
    // Warm colors
    { id: 'flamingo', color: themeColors.flamingo },
    { id: 'tangerine', color: themeColors.tangerine },
    { id: 'terracotta', color: themeColors.terracotta },
    // Cool colors
    { id: 'mint', color: themeColors.mint },
    { id: 'aqua', color: themeColors.aqua },
    { id: 'iceBlue', color: themeColors.iceBlue },
    { id: 'periwinkle', color: themeColors.periwinkle },
    // Exotic colors
    { id: 'dragonFruit', color: themeColors.dragonFruit },
    { id: 'mango', color: themeColors.mango },
    { id: 'pistachio', color: themeColors.pistachio },
    { id: 'acai', color: themeColors.acai },
  ];

  const SectionHeader = ({ title }) => (
    <View style={styles.sectionHeader}>
      <Text style={[styles.sectionHeaderText, { color: theme.textSecondary }]}>{title}</Text>
    </View>
  );

  const FontModal = () => (
    <Modal
      animationType="slide"
      transparent={true}
      visible={showFontModal}
      onRequestClose={() => setShowFontModal(false)}
    >
      <TouchableOpacity
        style={[styles.modalOverlay, styles.modalOverlayBackground]}
        activeOpacity={1}
        onPress={() => setShowFontModal(false)}
      >
        <View style={[styles.modalView, { backgroundColor: theme.card }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>
              {t('settings.selectFont')}
            </Text>
            <TouchableOpacity style={styles.closeButton} onPress={() => setShowFontModal(false)}>
              <Ionicons name="close" size={24} color={theme.text} />
            </TouchableOpacity>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={true}
            contentContainerStyle={styles.scrollContentContainer}
          >
            {Object.values(fontFamilies).map(font => (
              <TouchableOpacity
                key={font.id}
                style={[
                  styles.modalItem,
                  {
                    backgroundColor:
                      fontFamily === font.id ? themeColors[accentColor] : TRANSPARENT,
                    borderBottomColor: theme.border,
                    borderBottomWidth: BORDER_WIDTH,
                  },
                ]}
                onPress={() => {
                  changeFontFamily(font.id);
                  setShowFontModal(false);
                }}
              >
                <Text
                  style={[
                    styles.modalItemText,
                    {
                      color: fontFamily === font.id ? WHITE : theme.text,
                      fontFamily: font.family,
                    },
                  ]}
                >
                  {font.id === 'system' ? t('settings.systemFont') : font.name()}
                </Text>
                {fontFamily === font.id && <Ionicons name="checkmark" size={24} color={WHITE} />}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </TouchableOpacity>
    </Modal>
  );

  const LanguageModal = () => (
    <Modal
      animationType="slide"
      transparent={true}
      visible={showLanguageModal}
      onRequestClose={() => setShowLanguageModal(false)}
    >
      <TouchableOpacity
        style={styles.modalOverlay}
        activeOpacity={1}
        onPress={() => setShowLanguageModal(false)}
      >
        <View style={[styles.modalView, { backgroundColor: theme.card }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>
              {t('settings.selectLanguage')}
            </Text>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setShowLanguageModal(false)}
            >
              <Ionicons name="close" size={24} color={theme.text} />
            </TouchableOpacity>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={true}
            contentContainerStyle={styles.scrollContentContainer}
          >
            {Object.entries(languages).map(([langCode, langName]) => (
              <TouchableOpacity
                key={langCode}
                style={[
                  styles.modalItem,
                  {
                    backgroundColor:
                      currentLanguage === langCode ? themeColors[accentColor] : TRANSPARENT,
                    borderBottomColor: theme.border,
                    borderBottomWidth: BORDER_WIDTH,
                  },
                ]}
                onPress={() => {
                  changeLanguage(langCode);
                  setShowLanguageModal(false);
                }}
              >
                <Text
                  style={[
                    styles.modalItemText,
                    {
                      color: currentLanguage === langCode ? WHITE : theme.text,
                    },
                  ]}
                >
                  {String(langName)}
                </Text>
                {currentLanguage === langCode && (
                  <Ionicons name="checkmark" size={24} color={WHITE} />
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </TouchableOpacity>
    </Modal>
  );

  const renderPasswordSettings = () => (
    <TouchableOpacity
      style={[
        styles.settingButton,
        {
          backgroundColor: theme.card,
          borderColor: themeColors[accentColor],
        },
      ]}
      onPress={() => setShowPasswordModal(true)}
    >
      <View style={styles.settingContent}>
        <View style={styles.settingInfo}>
          <Text style={[styles.settingValue, { color: theme.text }]}>
            {t(hasPassword ? 'settings.changePassword' : 'settings.setPassword')}
          </Text>
          <Text style={[styles.settingPreview, { color: theme.textSecondary }]}>
            {hasPassword ? t('settings.removePassword') : t('settings.lockNotes')}
          </Text>
        </View>
        <Ionicons name={hasPassword ? 'lock-closed' : 'lock-open'} size={20} color={theme.text} />
      </View>
    </TouchableOpacity>
  );

  const renderPasswordModal = () => (
    <Modal
      visible={showPasswordModal}
      transparent
      animationType="slide"
      onRequestClose={() => setShowPasswordModal(false)}
    >
      <TouchableOpacity
        style={[styles.modalOverlay, styles.modalOverlayBackground]}
        activeOpacity={1}
        onPress={() => setShowPasswordModal(false)}
      >
        <View style={[styles.modalContent, { backgroundColor: theme.card }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>
              {hasPassword ? t('settings.changePassword') : t('settings.setPassword')}
            </Text>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setShowPasswordModal(false)}
            >
              <Ionicons name="close" size={24} color={theme.text} />
            </TouchableOpacity>
          </View>

          {hasPassword ? (
            <>
              <View style={styles.inputContainer}>
                <Text style={[styles.inputLabel, { color: theme.text }]}>{t('auth.password')}</Text>
                <TextInput
                  style={[styles.modalInput, { borderColor: theme.border, color: theme.text }]}
                  placeholderTextColor={theme.textSecondary}
                  secureTextEntry
                  value={currentPassword}
                  onChangeText={setCurrentPassword}
                  placeholder={t('auth.password')}
                />
              </View>
              <View style={styles.inputContainer}>
                <Text style={[styles.inputLabel, { color: theme.text }]}>
                  {t('auth.confirmPassword')}
                </Text>
                <TextInput
                  style={[styles.modalInput, { borderColor: theme.border, color: theme.text }]}
                  placeholderTextColor={theme.textSecondary}
                  secureTextEntry
                  value={newPassword}
                  onChangeText={setNewPassword}
                  placeholder={t('settings.newPassword')}
                />
              </View>
              <View style={styles.inputContainer}>
                <Text style={[styles.inputLabel, { color: theme.text }]}>
                  {t('auth.confirmPassword')}
                </Text>
                <TextInput
                  style={[styles.modalInput, { borderColor: theme.border, color: theme.text }]}
                  placeholderTextColor={theme.textSecondary}
                  secureTextEntry
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  placeholder={t('auth.confirmPassword')}
                />
              </View>
            </>
          ) : (
            <>
              <View style={styles.inputContainer}>
                <Text style={[styles.inputLabel, { color: theme.text }]}>{t('auth.password')}</Text>
                <TextInput
                  style={[styles.modalInput, { borderColor: theme.border, color: theme.text }]}
                  placeholderTextColor={theme.textSecondary}
                  secureTextEntry
                  value={newPassword}
                  onChangeText={setNewPassword}
                  placeholder={t('auth.password')}
                />
              </View>
              <View style={styles.inputContainer}>
                <Text style={[styles.inputLabel, { color: theme.text }]}>
                  {t('auth.confirmPassword')}
                </Text>
                <TextInput
                  style={[styles.modalInput, { borderColor: theme.border, color: theme.text }]}
                  placeholderTextColor={theme.textSecondary}
                  secureTextEntry
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  placeholder={t('auth.confirmPassword')}
                />
              </View>
            </>
          )}

          <TouchableOpacity
            style={[styles.modalButton, { backgroundColor: themeColors[accentColor] }]}
            onPress={hasPassword ? handleSetPassword : handleSetPassword}
          >
            <Text style={styles.modalButtonText}>
              {hasPassword ? t('settings.changePassword') : t('settings.setPassword')}
            </Text>
          </TouchableOpacity>

          {hasPassword && (
            <TouchableOpacity
              style={[styles.dangerButton, styles.modalButton, styles.marginTop12]}
              onPress={handleRemovePassword}
            >
              <Text style={styles.modalButtonText}>{t('settings.removePassword')}</Text>
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>
    </Modal>
  );

  useEffect(() => {
    const checkPasswordExpiration = async () => {
      try {
        const passwordUpdated = await AsyncStorage.getItem('vault_password_updated');
        if (passwordUpdated) {
          const lastUpdate = new Date(passwordUpdated);
          const now = new Date();
          const daysSinceUpdate = Math.floor(
            (now.getTime() - lastUpdate.getTime()) / (1000 * 60 * 60 * 24)
          );

          if (daysSinceUpdate >= 90) {
            Alert.alert(t('settings.securityAlert'), t('settings.passwordExpired'), [
              { text: t('settings.later') },
              {
                text: t('settings.changeNow'),
                onPress: () => setShowPasswordModal(true),
              },
            ]);
          }
        }
      } catch (error) {
        console.error('Error checking password expiration:', error);
      }
    };

    if (hasPassword) {
      checkPasswordExpiration();
    }
  }, [hasPassword, t]);

  // Get user profile image
  const getUserProfileImage = useCallback(async () => {
    if (!user || user.isAnonymous) return;

    try {
      // Check for Cloudinary image first (new method)
      const publicId = user.user_metadata?.avatar_public_id;
      if (publicId) {
        // Use Cloudinary service to get URL with proper transformations and cache busting
        const imageUrl = cloudinaryService.getProfileImageUrl(publicId, 250, 250);
        if (imageUrl) {
          console.log('Using Cloudinary image URL:', imageUrl);
          setProfileImage(imageUrl);
          return;
        }
      }

      // Fallback to legacy method (direct URL from metadata)
      if (user.user_metadata?.profile_image_url) {
        console.log('Using legacy profile image URL from metadata');

        // Add timestamp for cache busting
        const url = user.user_metadata.profile_image_url;
        const timestamp = Date.now();
        const urlWithCacheBuster = url.includes('?')
          ? `${url}&t=${timestamp}`
          : `${url}?t=${timestamp}`;

        setProfileImage(urlWithCacheBuster);
      }
    } catch (error) {
      console.error('Error loading profile image:', error);
    }
  }, [user]);

  useEffect(() => {
    loadAutoBackupSetting();
    loadLastBackupTime();
    checkPasswordStatus();

    if (user) {
      setUserDisplayName(getUserDisplayName());
      getUserProfileImage();
    }

    // Monitor internet connection changes
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsConnected(!!state.isConnected);
    });

    // Clear the listener when the component is unmounted
    return () => unsubscribe();
  }, [
    loadAutoBackupSetting,
    loadLastBackupTime,
    checkPasswordStatus,
    getUserDisplayName,
    getUserProfileImage,
    user,
  ]);

  // Pick and upload profile image
  const handleProfileImageUpload = async () => {
    if (!user || user.isAnonymous) {
      Alert.alert(t('common.warning'), t('settings.loginRequiredForProfileImage'));
      return;
    }

    if (!isConnected) {
      Alert.alert(t('common.error'), t('common.noInternetConnection'));
      return;
    }

    try {
      // Request media library permissions
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (status !== 'granted') {
        Alert.alert(t('common.error'), t('settings.cameraPermissionDenied'));
        return;
      }

      // Launch image picker
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
      });

      if (result.canceled) return;

      setIsUploadingImage(true);

      // Get image URI
      const imageUri = result.assets[0].uri;

      // Upload to Cloudinary using our service
      const uploadResult = await cloudinaryService.uploadProfileImage(imageUri, user.id);

      if (!uploadResult.success) {
        console.error('Error uploading image:', uploadResult.error);
        Alert.alert(t('common.error'), `${t('settings.imageUploadFailed')}: ${uploadResult.error}`);
        return;
      }

      // Update UI with new image URL
      setProfileImage(uploadResult.url);
      Alert.alert(t('common.success'), t('settings.profileImageUpdated'));

      // Also refresh the user data to ensure we have the latest metadata
      try {
        const { data } = await supabase.auth.refreshSession();
        if (data.user) {
          // Update any other UI that depends on user data
          setUserDisplayName(getUserDisplayName());
        }
      } catch (refreshError) {
        console.error('Error refreshing session:', refreshError);
      }
    } catch (error) {
      console.error('Profile image upload error:', error);
      Alert.alert(t('common.error'), t('settings.imageUploadFailed'));
    } finally {
      setIsUploadingImage(false);
    }
  };

  // Remove profile image
  const handleRemoveProfileImage = async () => {
    if (!user || user.isAnonymous || !profileImage) return;

    if (!isConnected) {
      Alert.alert(t('common.error'), t('common.noInternetConnection'));
      return;
    }

    try {
      Alert.alert(t('settings.removeProfileImage'), t('settings.removeProfileImageConfirm'), [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.remove'),
          style: 'destructive',
          onPress: async () => {
            setIsUploadingImage(true);

            try {
              // Remove profile image using our Cloudinary service
              const result = await cloudinaryService.removeProfileImage(user.id);

              if (!result.success) {
                console.error('Error removing profile image:', result.error);
                Alert.alert(t('common.error'), t('settings.profileUpdateFailed'));
                return;
              }

              // Update UI
              setProfileImage(null);
              Alert.alert(t('common.success'), t('settings.profileImageRemoved'));

              // Refresh session to get updated metadata
              await supabase.auth.refreshSession();
            } catch (error) {
              console.error('Error in profile image removal:', error);
              Alert.alert(t('common.error'), t('settings.profileUpdateFailed'));
            } finally {
              setIsUploadingImage(false);
            }
          },
        },
      ]);
    } catch (error) {
      console.error('Error in remove profile image dialog:', error);
    }
  };

  // User Profile Card Component
  const UserProfileCard = () => {
    if (!user || isGuestMode) {
      return (
        <View
          style={[
            styles.profileCard,
            {
              backgroundColor: theme.card,
              borderColor: theme.border,
            },
            styles.profileCardMargin,
          ]}
        >
          <View style={styles.profileCardContent}>
            <View style={styles.avatarPlaceholder}>
              <Ionicons name="person" size={32} color={theme.textSecondary} />
            </View>
            <View style={styles.profileInfo}>
              <Text style={[styles.profileName, { color: theme.text }]}>
                {t('settings.guestUser')}
              </Text>
              <Text
                style={[styles.profileEmail, { color: theme.textSecondary }]}
                numberOfLines={2}
                ellipsizeMode="tail"
              >
                {t('settings.signInToSync')}
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.loginButton, { backgroundColor: themeColors[accentColor] }]}
              onPress={forceLogin}
            >
              <Text style={styles.loginButtonText}>{t('common.login')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    // First letter of name for avatar
    const avatarInitial = userDisplayName.charAt(0).toUpperCase();

    return (
      <View
        style={[
          styles.profileCard,
          {
            backgroundColor: theme.card,
            borderColor: theme.border,
          },
          styles.profileCardMargin,
        ]}
      >
        <View style={styles.profileCardContent}>
          <TouchableOpacity
            style={styles.profileImageContainer}
            onPress={handleProfileImageUpload}
            disabled={isUploadingImage}
          >
            {isUploadingImage ? (
              <View style={[styles.avatar, { backgroundColor: theme.card }]}>
                <ActivityIndicator color={themeColors[accentColor]} size="small" />
              </View>
            ) : profileImage ? (
              <View style={styles.avatarWithImage}>
                <Image
                  source={{ uri: profileImage }}
                  style={styles.profileImage}
                  resizeMode="cover"
                />
              </View>
            ) : (
              <View style={[styles.avatar, { backgroundColor: themeColors[accentColor] }]}>
                <Text style={styles.avatarText}>{avatarInitial}</Text>
              </View>
            )}
          </TouchableOpacity>

          <View style={styles.profileInfo}>
            <Text style={[styles.profileName, { color: theme.text }]}>{userDisplayName}</Text>
            <Text
              style={[styles.profileEmail, { color: theme.textSecondary }]}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {user.email}
            </Text>

            {profileImage && (
              <TouchableOpacity
                style={[styles.removePhotoButton, { borderColor: theme.border }]}
                onPress={handleRemoveProfileImage}
                disabled={isUploadingImage}
              >
                <Text style={[styles.removePhotoText, { color: DANGER_COLOR }]}>
                  {t('settings.removePhoto')}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <FontModal />
      <LanguageModal />
      <ScrollView style={styles.content}>
        {/* User Profile Card */}
        <UserProfileCard />

        {/* Theme Mode */}
        <View style={[styles.section, { borderBottomColor: theme.border }]}>
          <SectionHeader title={t('settings.themeMode')} />
          <View
            style={[
              styles.settingButton,
              { backgroundColor: theme.card, borderColor: themeColors[accentColor] },
            ]}
          >
            <View style={styles.themeContainer}>
              {[
                { id: 'light', name: t('settings.light'), icon: 'sunny-outline' as const },
                { id: 'dark', name: t('settings.dark'), icon: 'moon-outline' as const },
                {
                  id: 'system',
                  name: t('settings.system'),
                  icon: 'phone-portrait-outline' as const,
                },
              ].map(mode => (
                <TouchableOpacity
                  key={mode.id}
                  style={[
                    styles.themeOption,
                    {
                      backgroundColor:
                        themeMode === mode.id ? themeColors[accentColor] : TRANSPARENT,
                    },
                  ]}
                  onPress={() => changeThemeMode(mode.id)}
                >
                  <Ionicons
                    name={mode.icon}
                    size={20}
                    color={themeMode === mode.id ? WHITE : theme.text}
                  />
                  <Text
                    style={[
                      styles.themeText,
                      { color: themeMode === mode.id ? WHITE : theme.text },
                    ]}
                  >
                    {mode.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        {/* Theme Color */}
        <View style={[styles.section, { borderBottomColor: theme.border }]}>
          <SectionHeader title={t('settings.themeColor')} />
          <View
            style={[
              styles.settingButton,
              { backgroundColor: theme.card, borderColor: themeColors[accentColor] },
            ]}
          >
            <TouchableOpacity
              style={styles.colorHeader}
              onPress={() => setShowColorOptions(!showColorOptions)}
            >
              <View style={styles.colorPreview}>
                <View
                  style={[
                    styles.selectedColorPreview,
                    { backgroundColor: themeColors[accentColor] },
                  ]}
                />
                <Text style={[styles.settingValue, { color: theme.text }]}>
                  {t('settings.currentTheme')}
                </Text>
              </View>
              <Ionicons
                name={showColorOptions ? 'chevron-up' : 'chevron-down'}
                size={24}
                color={theme.text}
              />
            </TouchableOpacity>

            {showColorOptions && (
              <View style={styles.colorGrid}>
                {colors.map(item => (
                  <TouchableOpacity
                    key={item.id}
                    style={[
                      styles.colorButton,
                      { backgroundColor: item.color },
                      accentColor === item.id && styles.selectedColor,
                    ]}
                    onPress={() => {
                      changeAccentColor(item.id);
                    }}
                  >
                    {accentColor === item.id && (
                      <Ionicons name="checkmark" size={20} color={WHITE} />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        </View>

        {/* Font Size */}
        <View style={[styles.section, { borderBottomColor: theme.border }]}>
          <SectionHeader title={t('settings.fontSize')} />
          <TouchableOpacity
            style={[
              styles.fontSizeButton,
              {
                backgroundColor: theme.card,
                borderColor: themeColors[accentColor],
              },
            ]}
          >
            <View style={styles.fontSizeContent}>
              <View style={styles.fontSizeInfo}>
                <Text style={[styles.fontSizeValue, { color: theme.text }]}>
                  {t(`settings.${fontSizes[fontSize].id}`)}
                </Text>
                <Text
                  style={[
                    styles.fontSizePreview,
                    {
                      color: theme.textSecondary,
                      fontSize: fontSizes[fontSize].contentSize,
                    },
                  ]}
                >
                  {t('common.appName')}
                </Text>
              </View>
              <View style={styles.fontSizeControls}>
                {Object.values(fontSizes).map(size => (
                  <TouchableOpacity
                    key={size.id}
                    style={[
                      styles.sizeControl,
                      {
                        backgroundColor:
                          fontSize === size.id ? themeColors[accentColor] : TRANSPARENT,
                        borderColor: themeColors[accentColor],
                      },
                    ]}
                    onPress={() => changeFontSize(size.id)}
                  >
                    <Text
                      style={[
                        styles.sizeControlText,
                        {
                          color: fontSize === size.id ? WHITE : theme.text,
                        },
                      ]}
                    >
                      {t(`settings.${size.id}`)[0]}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </TouchableOpacity>
        </View>

        {/* Font Family */}
        <View style={[styles.section, { borderBottomColor: theme.border }]}>
          <SectionHeader title={t('settings.fontFamily')} />
          <TouchableOpacity
            style={[
              styles.settingButton,
              {
                backgroundColor: theme.card,
                borderColor: themeColors[accentColor],
              },
            ]}
            onPress={() => setShowFontModal(true)}
          >
            <View style={styles.settingContent}>
              <View style={styles.settingInfo}>
                <Text
                  style={[
                    styles.settingValue,
                    { color: theme.text, fontFamily: fontFamilies[fontFamily].family },
                  ]}
                >
                  {fontFamily === 'system'
                    ? t('settings.systemFont')
                    : fontFamilies[fontFamily].name()}
                </Text>
                <Text
                  style={[
                    styles.settingPreview,
                    { color: theme.textSecondary, fontFamily: fontFamilies[fontFamily].family },
                  ]}
                >
                  The quick brown fox jumps over the lazy dog
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={theme.text} />
            </View>
          </TouchableOpacity>
        </View>

        {/* Backup */}
        <View style={[styles.section, { borderBottomColor: theme.border }]}>
          <SectionHeader title={t('settings.backup')} />
          <View style={styles.settingGroup}>
            {!user?.isAnonymous ? (
              <>
                <View
                  style={[
                    styles.settingItem,
                    styles.settingItemContainer,
                    {
                      borderBottomColor: theme.border,
                      borderColor: themeColors[accentColor],
                      borderWidth: BORDER_WIDTH,
                    },
                  ]}
                >
                  <View style={styles.settingItemInfo}>
                    <Text style={[styles.settingItemTitle, { color: theme.text }]}>
                      {t('settings.autoBackup')}
                    </Text>
                    <Text style={[styles.settingItemSubtitle, { color: theme.textSecondary }]}>
                      {autoBackupEnabled
                        ? t('settings.lastBackup') +
                          ': ' +
                          (lastBackupTime
                            ? new Date(lastBackupTime).toLocaleString()
                            : t('common.notAvailable'))
                        : t('settings.autoBackupDescription') +
                          ' ' +
                          t('settings.realTimeBackupDescription')}
                    </Text>
                  </View>
                  <Switch
                    value={autoBackupEnabled}
                    onValueChange={saveAutoBackupSetting}
                    trackColor={{ false: '#ccc', true: themeColors[accentColor] + '99' }}
                    thumbColor={autoBackupEnabled ? themeColors[accentColor] : '#f4f3f4'}
                    disabled={!user || user?.isAnonymous}
                  />
                </View>
              </>
            ) : (
              <View
                style={[
                  styles.settingItem,
                  styles.settingItemContainer,
                  {
                    borderBottomColor: theme.border,
                    borderColor: themeColors[accentColor],
                    borderWidth: BORDER_WIDTH,
                  },
                ]}
              >
                <View style={styles.settingItemInfo}>
                  <Text style={[styles.settingItemTitle, { color: theme.text }]}>
                    {t('settings.autoBackup')}
                  </Text>
                  <Text style={[styles.settingItemSubtitle, { color: theme.textSecondary }]}>
                    {t('settings.loginRequiredForBackup')}
                  </Text>
                </View>
                <Ionicons name="log-in-outline" size={24} color={themeColors[accentColor]} />
              </View>
            )}
            {/* Before the View component containing the backupButtonContainer */}
            <View style={styles.backupButtonContainer}>
              <TouchableOpacity
                style={[
                  styles.manualBackupButton,
                  {
                    backgroundColor: theme.card,
                    borderColor: themeColors[accentColor],
                    opacity:
                      !user || user?.isAnonymous || isBackingUp || !isConnected
                        ? DISABLED_OPACITY
                        : ACTIVE_OPACITY,
                  },
                ]}
                onPress={handleManualBackup}
                disabled={!user || user?.isAnonymous || isBackingUp || !isConnected}
              >
                {isBackingUp ? (
                  <ActivityIndicator size="small" color={themeColors[accentColor]} />
                ) : (
                  <>
                    <Ionicons
                      name="cloud-upload-outline"
                      size={20}
                      color={
                        !user || user?.isAnonymous || !isConnected
                          ? theme.textSecondary
                          : themeColors[accentColor]
                      }
                    />
                    <Text
                      style={[
                        styles.manualBackupText,
                        {
                          color:
                            !user || user?.isAnonymous || !isConnected
                              ? theme.textSecondary
                              : themeColors[accentColor],
                        },
                      ]}
                    >
                      {t('settings.backupNow')}
                    </Text>
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.manualBackupButton,
                  {
                    backgroundColor: theme.card,
                    borderColor: themeColors[accentColor],
                    opacity:
                      !user || user?.isAnonymous || isRestoring || !isConnected
                        ? DISABLED_OPACITY
                        : ACTIVE_OPACITY,
                  },
                ]}
                onPress={handleRestoreBackup}
                disabled={!user || user?.isAnonymous || isRestoring || !isConnected}
              >
                {isRestoring ? (
                  <ActivityIndicator size="small" color={themeColors[accentColor]} />
                ) : (
                  <>
                    <Ionicons
                      name="cloud-download-outline"
                      size={20}
                      color={
                        !user || user?.isAnonymous || !isConnected
                          ? theme.textSecondary
                          : themeColors[accentColor]
                      }
                    />
                    <Text
                      style={[
                        styles.manualBackupText,
                        {
                          color:
                            !user || user?.isAnonymous || !isConnected
                              ? theme.textSecondary
                              : themeColors[accentColor],
                        },
                      ]}
                    >
                      {t('settings.restoreFromBackup')}
                    </Text>
                  </>
                )}
              </TouchableOpacity>

              {/* Clear entire database button */}
              <TouchableOpacity
                style={[
                  styles.manualBackupButton,
                  styles.marginTop16,
                  {
                    backgroundColor: theme.card,
                    borderColor: DANGER_COLOR,
                    opacity:
                      !user || user?.isAnonymous || !isConnected
                        ? DISABLED_OPACITY
                        : ACTIVE_OPACITY,
                  },
                ]}
                onPress={handleClearAllData}
                disabled={!user || user?.isAnonymous || !isConnected}
              >
                <Ionicons
                  name="trash-outline"
                  size={20}
                  color={
                    !user || user?.isAnonymous || !isConnected ? theme.textSecondary : DANGER_COLOR
                  }
                />
                <Text
                  style={[
                    styles.manualBackupText,
                    {
                      color:
                        !user || user?.isAnonymous || !isConnected
                          ? theme.textSecondary
                          : DANGER_COLOR,
                    },
                  ]}
                >
                  {t('settings.clearAllData')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Security */}
        <View style={[styles.section, { borderBottomColor: theme.border }]}>
          <SectionHeader title={t('settings.security')} />
          <View style={styles.settingGroup}>{renderPasswordSettings()}</View>
        </View>

        {/* Language */}
        <View style={[styles.section, { borderBottomColor: theme.border }]}>
          <SectionHeader title={t('settings.language')} />
          <TouchableOpacity
            style={[
              styles.settingButton,
              {
                backgroundColor: theme.card,
                borderColor: themeColors[accentColor],
              },
            ]}
            onPress={() => setShowLanguageModal(true)}
          >
            <View style={styles.settingContent}>
              <View style={styles.settingInfo}>
                <Text style={[styles.settingValue, { color: theme.text }]}>
                  {languages[currentLanguage]}
                </Text>
                <Text style={[styles.settingPreview, { color: theme.textSecondary }]}>
                  {currentLanguage === 'tr'
                    ? 'Dil seçeneğini değiştir'
                    : 'Change language preference'}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={theme.text} />
            </View>
          </TouchableOpacity>
        </View>

        {/* Session */}
        <View style={[styles.section, styles.marginTop24, { borderBottomColor: theme.border }]}>
          {isGuestMode ? (
            <TouchableOpacity
              style={[
                styles.settingButton,
                {
                  backgroundColor: theme.card,
                  borderColor: LOGIN_COLOR,
                  opacity: isConnected ? ACTIVE_OPACITY : DISABLED_OPACITY,
                },
              ]}
              onPress={() => {
                if (!isConnected) return;

                try {
                  forceLogin().then(result => {
                    if (result.success) {
                      router.replace('/(auth)/login');
                    } else {
                      console.error('Login redirect error:', result.error);
                    }
                  });
                } catch (error) {
                  console.error('Login process error:', error);
                  router.replace('/(auth)/login');
                }
              }}
              disabled={!isConnected}
            >
              <View style={styles.rowLayout}>
                <View style={styles.centerContainer}>
                  <Text style={styles.loginText}>{t('drawer.loginOption')}</Text>
                  <Ionicons name="log-in-outline" size={24} color={LOGIN_COLOR} />
                </View>
              </View>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[
                styles.settingButton,
                {
                  backgroundColor: theme.card,
                  borderColor: DANGER_COLOR,
                  opacity: isConnected ? ACTIVE_OPACITY : DISABLED_OPACITY,
                },
              ]}
              onPress={() => {
                if (!isConnected) return;

                Alert.alert(t('settings.signOut'), t('settings.confirmSignOut'), [
                  {
                    text: t('common.cancel'),
                    style: 'cancel',
                  },
                  {
                    text: t('settings.signOut'),
                    style: 'destructive',
                    onPress: async () => {
                      try {
                        const result = await logout();
                        if (!result.success) {
                          throw new Error(result.error || t('auth.logoutError'));
                        }
                        // We give a short delay for the Root Layout to load completely
                        console.log('Logout successful, redirecting to login page...');
                        setTimeout(() => {
                          router.replace('/(auth)/login');
                        }, 300);
                      } catch (error) {
                        console.error('Logout error:', error);
                        setTimeout(() => {
                          router.replace('/(auth)/login');
                        }, 300);
                      }
                    },
                  },
                ]);
              }}
              disabled={!isConnected}
            >
              <View style={styles.rowLayout}>
                <View style={styles.centerContainer}>
                  <Text style={styles.dangerText}>{t('settings.signOut')}</Text>
                  <Ionicons name="log-out-outline" size={24} color={DANGER_COLOR} />
                </View>
              </View>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
      {renderPasswordModal()}
    </View>
  );
};

export default Settings;

const styles = StyleSheet.create({
  avatar: {
    alignItems: 'center',
    borderRadius: 20,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  avatarPlaceholder: {
    alignItems: 'center',
    backgroundColor: AVATAR_PLACEHOLDER_COLOR,
    borderRadius: 20,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  avatarText: {
    color: WHITE,
    fontSize: 16,
    fontWeight: '600',
  },
  avatarWithImage: {
    alignItems: 'center',
    borderRadius: 30,
    height: 60,
    justifyContent: 'center',
    overflow: 'hidden',
    position: 'relative',
    width: 60,
  },
  backupButtonContainer: {
    alignItems: 'center',
    flexDirection: 'column',
    gap: 8,
    justifyContent: 'center',
    marginBottom: 16,
    marginTop: -8,
  },
  centerContainer: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'center',
  },
  closeButton: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
  },
  colorButton: {
    alignItems: 'center',
    borderRadius: 16,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'center',
    padding: 12,
  },
  colorHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  colorPreview: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
  },
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  dangerButton: {
    backgroundColor: DANGER_COLOR,
  },
  dangerText: {
    color: DANGER_COLOR,
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
  },
  fontSizeButton: {
    borderRadius: 12,
    borderWidth: BORDER_WIDTH,
    overflow: 'hidden',
  },
  fontSizeContent: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 12,
  },
  fontSizeControls: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  fontSizeInfo: {
    flex: 1,
  },
  fontSizePreview: {
    fontSize: 12,
    opacity: 0.7,
  },
  fontSizeValue: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  loginButton: {
    alignItems: 'center',
    borderRadius: 8,
    minWidth: 80,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  loginButtonText: {
    color: WHITE,
    fontSize: 14,
    fontWeight: '600',
  },
  loginText: {
    color: LOGIN_COLOR,
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
  },
  manualBackupButton: {
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: BORDER_WIDTH,
    elevation: 2,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    marginTop: 8,
    padding: 12,
    shadowColor: SHADOW_COLOR,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    width: '100%',
  },
  manualBackupText: {
    fontSize: 15,
    fontWeight: '500',
  },
  marginTop12: {
    marginTop: 12,
  },
  marginTop16: {
    marginTop: 16,
  },
  marginTop24: {
    marginTop: 24,
  },
  modalButton: {
    alignItems: 'center',
    borderRadius: 12,
    height: 48,
    justifyContent: 'center',
    marginTop: 16,
  },
  modalButtonText: {
    color: WHITE,
    fontSize: 16,
    fontWeight: '600',
  },
  modalContent: {
    borderRadius: 16,
    elevation: 5,
    maxWidth: 400,
    padding: 20,
    shadowColor: SHADOW_COLOR,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    width: '100%',
  },
  modalHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    width: '100%',
  },
  modalInput: {
    borderRadius: 12,
    borderWidth: BORDER_WIDTH,
    fontSize: 16,
    height: 48,
    paddingHorizontal: 16,
  },
  modalItem: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 16,
  },
  modalItemText: {
    fontSize: 16,
    fontWeight: '500',
  },
  modalOverlay: {
    alignItems: 'center',
    backgroundColor: OVERLAY_BACKGROUND_COLOR,
    flex: 1,
    justifyContent: 'center',
  },
  modalOverlayBackground: {
    backgroundColor: OVERLAY_BACKGROUND_COLOR,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  modalView: {
    borderRadius: 20,
    elevation: 5,
    margin: 20,
    maxHeight: '70%',
    padding: 20,
    shadowColor: SHADOW_COLOR,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    width: '90%',
  },
  profileCard: {
    borderRadius: 12,
    borderWidth: BORDER_WIDTH,
    marginBottom: 16,
    padding: 12,
  },
  profileCardContent: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  profileCardMargin: {
    marginBottom: 24,
  },
  profileEmail: {
    fontSize: 12,
    opacity: 0.7,
  },
  profileImage: {
    borderRadius: 30,
    height: '100%',
    width: '100%',
  },
  profileImageContainer: {
    position: 'relative',
  },
  profileInfo: {
    flex: 1,
    marginLeft: 12,
    marginRight: 8,
  },
  profileName: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  removePhotoButton: {
    alignSelf: 'flex-start',
    borderRadius: 4,
    borderWidth: 1,
    marginTop: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  removePhotoText: {
    fontSize: 12,
    fontWeight: '500',
  },
  rowLayout: {
    alignItems: 'center',
    flexDirection: 'row',
    height: 72,
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  scrollContentContainer: {
    flexGrow: 0,
  },
  section: {
    borderBottomWidth: BORDER_WIDTH,
    marginBottom: 24,
    paddingBottom: 0,
  },
  sectionHeader: {
    marginBottom: 16,
  },
  sectionHeaderText: {
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 1,
  },
  selectedColor: {
    elevation: 6,
    shadowColor: SHADOW_COLOR,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    transform: [{ scale: 1.1 }],
  },
  selectedColorPreview: {
    borderColor: BORDER_COLOR,
    borderRadius: 14,
    borderWidth: BORDER_WIDTH,
    height: 28,
    width: 28,
  },
  settingButton: {
    borderRadius: 12,
    borderWidth: BORDER_WIDTH,
    overflow: 'hidden',
  },
  settingContent: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
    padding: 16,
  },
  settingGroup: {
    backgroundColor: TRANSPARENT,
    borderRadius: 12,
    overflow: 'hidden',
  },
  settingInfo: {
    flex: 1,
  },
  settingItem: {
    alignItems: 'center',
    backgroundColor: TRANSPARENT,
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
  },
  settingItemContainer: {
    borderRadius: 12,
    marginBottom: 8,
    padding: 8,
  },
  settingItemInfo: {
    flex: 1,
  },
  settingItemSubtitle: {
    fontSize: 14,
    opacity: 0.7,
  },
  settingItemTitle: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  settingPreview: {
    fontSize: 14,
    opacity: 0.7,
  },
  settingValue: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  sizeControl: {
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: BORDER_WIDTH,
    height: 28,
    justifyContent: 'center',
    width: 28,
  },
  sizeControlText: {
    fontSize: 12,
    fontWeight: '600',
  },
  themeContainer: {
    flexDirection: 'row',
    gap: 8,
    padding: 4,
  },
  themeOption: {
    alignItems: 'center',
    borderRadius: 8,
    flex: 1,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    paddingVertical: 8,
  },
  themeText: {
    fontSize: 14,
    fontWeight: '500',
  },
});
