// Simplified Settings screen for Mindbook Free - Offline version
// Removed cloud backup, profile images, and all server-related features
import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Modal,
  TextInput,
  Share,
  Platform,
  Linking,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';
import { useTranslation } from 'react-i18next';
import { getEditModeSetting, setEditModeSetting, EditModeOption } from '../utils/editModeSettings';
import { createBackup, restoreBackup } from '../utils/storage';
import { showToast } from '../utils/android';
import { LinearGradient } from 'expo-linear-gradient';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import * as Print from 'expo-print';
import { getAllNotes } from '../utils/storage';

const OVERLAY_BACKGROUND_COLOR = 'rgba(0,0,0,0.5)';
const TRANSPARENT = 'transparent';
const WHITE = '#fff';
const BORDER_WIDTH = 1;
const BORDER_COLOR = 'rgba(0,0,0,0.1)';
const SHADOW_COLOR = '#000';

const hexToRgba = (hex: string, opacity: number) => {
  let c: any;
  if (/^#([A-Fa-f0-9]{3}){1,2}$/.test(hex)) {
    c = hex.substring(1).split('');
    if (c.length === 3) {
      c = [c[0], c[0], c[1], c[1], c[2], c[2]];
    }
    c = '0x' + c.join('');
    return 'rgba(' + [(c >> 16) & 255, (c >> 8) & 255, c & 255].join(',') + ',' + opacity + ')';
  }
  return hex;
};

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
  const [showFontModal, setShowFontModal] = useState(false);
  const [showLanguageModal, setShowLanguageModal] = useState(false);
  const [showColorOptions, setShowColorOptions] = useState(false);
  const [defaultEditMode, setDefaultEditMode] = useState<EditModeOption>('editing');

  // Vault password feature removed for free version

  useEffect(() => {
    // Load edit mode setting
    const loadSettings = async () => {
      const editMode = await getEditModeSetting();
      setDefaultEditMode(editMode);
    };
    loadSettings();
  }, []);

  const handleEditModeChange = async (mode: EditModeOption) => {
    setDefaultEditMode(mode);
    try {
      await setEditModeSetting(mode);
    } catch (error) {
      console.error('Error saving edit mode setting:', error);
      Alert.alert(t('common.error'), t('common.error'));
    }
  };

  const handleExportToFile = async () => {
    try {
      const backupData = await createBackup();
      const fileName = `mindbook_backup_${new Date().toISOString().split('T')[0]}.json`;

      if (Platform.OS === 'android') {
        // Android: Use Storage Access Framework to pick a directory and save
        const permissions = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
        
        if (!permissions.granted) {
          showToast('Permission denied');
          return;
        }

        try {
          const fileUri = await FileSystem.StorageAccessFramework.createFileAsync(
            permissions.directoryUri,
            fileName,
            'application/json'
          );

          await FileSystem.writeAsStringAsync(fileUri, backupData, {
            encoding: FileSystem.EncodingType.UTF8,
          });
          
          Alert.alert(t('common.success'), t('settings.backupReady'));
        } catch (e) {
          console.error('Android SAF error:', e);
          // Fallback to regular sharing if SAF fails
          await fallbackShare(backupData, fileName);
        }
      } else {
        // iOS: Use regular sharing (which includes "Save to Files")
        await fallbackShare(backupData, fileName);
      }
    } catch (error) {
      console.error('Export error:', error);
      Alert.alert(t('common.error'), 'Backup export failed');
    }
  };

  const fallbackShare = async (data: string, fileName: string) => {
    const fileUri = FileSystem.documentDirectory + fileName;
    await FileSystem.writeAsStringAsync(fileUri, data, {
      encoding: FileSystem.EncodingType.UTF8,
    });

    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(fileUri, {
        mimeType: 'application/json',
        dialogTitle: t('settings.shareBackup'),
        UTI: 'public.json',
      });
    } else {
      Alert.alert(t('common.error'), 'Sharing is not available on this device');
    }
  };

  const handleImportFromFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/json', 'text/plain'],
        copyToCacheDirectory: true,
      });

      if (result.canceled) return;

      const file = result.assets[0];
      const fileContent = await FileSystem.readAsStringAsync(file.uri, {
        encoding: FileSystem.EncodingType.UTF8,
      });

      Alert.alert(t('settings.importData'), t('settings.confirmImport'), [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.confirm'),
          style: 'destructive',
          onPress: async () => {
            const success = await restoreBackup(fileContent);
            if (success) {
              Alert.alert(t('common.success'), t('settings.importSuccess'));
            } else {
              Alert.alert(t('common.error'), t('settings.importError'));
            }
          },
        },
      ]);
    } catch (error) {
      console.error('Import error:', error);
      Alert.alert(t('common.error'), 'Backup import failed');
    }
  };

  const handleExportToPDF = async () => {
    try {
      const allNotes = await getAllNotes();
      if (allNotes.length === 0) {
        Alert.alert(t('common.warning'), t('notes.emptyNotesMessage'));
        return;
      }

      let htmlContent = `
        <html>
          <head>
            <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no" />
            <style>
              body { font-family: 'Helvetica', sans-serif; padding: 40px; color: #333; }
              .note { margin-bottom: 40px; page-break-inside: avoid; border-bottom: 1px solid #eee; padding-bottom: 20px; }
              h1 { margin-bottom: 10px; color: #000; }
              .meta { color: #666; font-size: 12px; margin-bottom: 15px; }
              .content { white-space: pre-wrap; line-height: 1.6; font-size: 14px; }
            </style>
          </head>
          <body>
            <div style="text-align: center; margin-bottom: 50px;">
              <h1>Mindbook Notes Backup</h1>
              <p>Date: ${new Date().toLocaleDateString()}</p>
              <p>Total Notes: ${allNotes.length}</p>
            </div>
      `;

      allNotes.forEach(note => {
        htmlContent += `
          <div class="note">
            <h1>${note.title || 'Untitled Note'}</h1>
            <div class="meta">
              <strong>Date:</strong> ${new Date(note.createdAt).toLocaleDateString()}<br/>
              ${note.category ? `<strong>Category:</strong> ${note.category}` : ''}
            </div>
            <div class="content">${note.content || ''}</div>
          </div>
        `;
      });

      htmlContent += `</body></html>`;

      const { uri } = await Print.printToFileAsync({ html: htmlContent });

      if (Platform.OS === 'android') {
        try {
          // Android: Use Storage Access Framework to save file directly
          const permissions = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
          
          if (permissions.granted) {
            const base64 = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
            const fileName = `mindbook-notes-${new Date().toISOString().split('T')[0]}.pdf`;
            const newFileUri = await FileSystem.StorageAccessFramework.createFileAsync(permissions.directoryUri, fileName, 'application/pdf');
            await FileSystem.writeAsStringAsync(newFileUri, base64, { encoding: FileSystem.EncodingType.Base64 });
            Alert.alert(t('common.success'), 'PDF kaydedildi.');
          } else {
            // Permission denied - do nothing or show toast
            showToast('İzin reddedildi');
          }
        } catch (e) {
          console.error(e);
          Alert.alert(t('common.error'), 'PDF kaydedilemedi.');
        }
      } else {
        // iOS: Use share sheet which includes "Save to Files"
        await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });
      }
    } catch (error) {
      console.error('PDF Export error:', error);
      Alert.alert(t('common.error'), 'Failed to export PDF');
    }
  };

  // Vault password functions removed for free version

  const colors = [
    { id: 'blue', color: themeColors.blue },
    { id: 'red', color: themeColors.red },
    { id: 'green', color: themeColors.green },
    { id: 'orange', color: themeColors.orange },
    { id: 'purple', color: themeColors.purple },
    { id: 'pink', color: themeColors.pink },
    { id: 'teal', color: themeColors.teal },
    { id: 'cyan', color: themeColors.cyan },
    { id: 'indigo', color: themeColors.indigo },
    { id: 'slate', color: themeColors.slate },
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

  // Vault password UI and modal removed for free version

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <LinearGradient
        colors={[
          hexToRgba(themeColors[accentColor], themeMode === 'dark' ? 0.15 : 0.08),
          hexToRgba(themeColors[accentColor], 0),
          theme.background,
        ]}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 0.5 }}
      />
      <FontModal />
      <LanguageModal />
      <ScrollView style={styles.content}>
        {/* Free Version Info Card */}
        <View
          style={[
            styles.infoCard,
            {
              backgroundColor: theme.card,
              borderColor: themeColors[accentColor],
            },
          ]}
        >
          <View style={styles.infoCardContent}>
            <Ionicons
              name="information-circle"
              size={24}
              color={themeColors[accentColor]}
            />
            <View style={styles.infoCardText}>
              <Text style={[styles.infoCardTitle, { color: theme.text }]}>
                {t('settings.freeVersion') || 'Mindbook Free'}
              </Text>
              <Text style={[styles.infoCardDescription, { color: theme.textSecondary }]}>
                {t('settings.allDataStoredLocally') || 'All your data is stored locally on your device. No cloud sync, no account required.'}
              </Text>
            </View>
          </View>
        </View>

        {/* Upgrade to Pro Button */}
        <TouchableOpacity
          style={[
            styles.proButton,
            {
              backgroundColor: themeColors[accentColor],
              shadowColor: themeColors[accentColor],
            },
          ]}
          onPress={() =>
            Linking.openURL(
              'https://play.google.com/store/apps/details?id=com.melihcandemir.mindbook&hl=en'
            )
          }
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={['rgba(255,255,255,0.2)', 'rgba(255,255,255,0)']}
            style={StyleSheet.absoluteFill}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          />
          <Ionicons name="rocket" size={24} color={WHITE} />
          <View style={styles.proButtonTextContainer}>
            <Text style={styles.proButtonTitle}>{t('settings.upgradeToPro') || 'Upgrade to Pro'}</Text>
            <Text style={styles.proButtonSubtitle}>
              {t('settings.proFeaturesDesc') || 'Cloud sync, AI features and more'}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={WHITE} />
        </TouchableOpacity>

        {/* Manual Backup Section */}
        <View style={[styles.section, { borderBottomColor: theme.border }]}>
          <SectionHeader title={t('settings.manualBackup')} />
          <View style={styles.backupButtonsContainer}>
            <TouchableOpacity
              style={[
                styles.backupButton,
                { backgroundColor: theme.card, borderColor: themeColors[accentColor] },
              ]}
              onPress={handleExportToFile}
            >
              <Ionicons name="document-text-outline" size={24} color={themeColors[accentColor]} />
              <View style={styles.backupButtonTextContainer}>
                <Text style={[styles.backupButtonTitle, { color: theme.text }]}>
                  {t('settings.exportData')}
                </Text>
                <Text style={[styles.backupButtonDesc, { color: theme.textSecondary }]}>
                  {t('settings.exportDescription')}
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.backupButton,
                { backgroundColor: theme.card, borderColor: themeColors[accentColor] },
              ]}
              onPress={handleImportFromFile}
            >
              <Ionicons name="folder-open-outline" size={24} color={themeColors[accentColor]} />
              <View style={styles.backupButtonTextContainer}>
                <Text style={[styles.backupButtonTitle, { color: theme.text }]}>
                  {t('settings.importData')}
                </Text>
                <Text style={[styles.backupButtonDesc, { color: theme.textSecondary }]}>
                  {t('settings.importDescription')}
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.backupButton,
                { backgroundColor: theme.card, borderColor: themeColors[accentColor] },
              ]}
              onPress={handleExportToPDF}
            >
              <Ionicons name="document-text-outline" size={24} color={themeColors[accentColor]} />
              <View style={styles.backupButtonTextContainer}>
                <Text style={[styles.backupButtonTitle, { color: theme.text }]}>
                  Export to PDF
                </Text>
                <Text style={[styles.backupButtonDesc, { color: theme.textSecondary }]}>
                  Save all notes as a PDF document
                </Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>

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

        {/* Default Edit Mode */}
        <View style={[styles.section, { borderBottomColor: theme.border }]}>
          <SectionHeader title={t('settings.defaultEditMode')} />
          <View
            style={[
              styles.settingButton,
              { backgroundColor: theme.card, borderColor: themeColors[accentColor] },
            ]}
          >
            <View style={styles.themeContainer}>
              {[
                { id: 'editing', name: t('settings.editingMode'), icon: 'create-outline' as const },
                { id: 'reading', name: t('settings.readingMode'), icon: 'eye-outline' as const },
              ].map(mode => (
                <TouchableOpacity
                  key={mode.id}
                  style={[
                    styles.themeOption,
                    {
                      backgroundColor:
                        defaultEditMode === mode.id ? themeColors[accentColor] : TRANSPARENT,
                    },
                  ]}
                  onPress={() => handleEditModeChange(mode.id as EditModeOption)}
                >
                  <Ionicons
                    name={mode.icon}
                    size={20}
                    color={defaultEditMode === mode.id ? WHITE : theme.text}
                  />
                  <Text
                    style={[
                      styles.themeText,
                      { color: defaultEditMode === mode.id ? WHITE : theme.text },
                    ]}
                  >
                    {mode.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <View
              style={[styles.settingContent, { borderTopColor: theme.border, borderTopWidth: 1 }]}
            >
              <Text style={[styles.settingPreview, { color: theme.textSecondary }]}>
                {t('settings.defaultEditModeDescription')}
              </Text>
            </View>
          </View>
        </View>

        {/* Security section removed for free version (vault password) */}

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

        {/* Version Information */}
        <View style={styles.versionContainer}>
          <Text style={[styles.versionText, { color: theme.textSecondary }]}>
            {t('settings.version')} 4.2.2
          </Text>
        </View>
      </ScrollView>
    </View>
  );
};

export default Settings;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  infoCard: {
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 24,
    padding: 16,
  },
  infoCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  infoCardText: {
    flex: 1,
  },
  infoCardTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  infoCardDescription: {
    fontSize: 14,
    lineHeight: 20,
  },
  proButton: {
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    marginBottom: 24,
    elevation: 8,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    overflow: 'hidden',
  },
  proButtonTextContainer: {
    flex: 1,
    marginLeft: 12,
  },
  proButtonTitle: {
    color: WHITE,
    fontSize: 18,
    fontWeight: '700',
  },
  proButtonSubtitle: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
    marginTop: 2,
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
  settingInfo: {
    flex: 1,
  },
  settingValue: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  settingPreview: {
    fontSize: 14,
    opacity: 0.7,
  },
  settingGroup: {
    backgroundColor: TRANSPARENT,
    borderRadius: 12,
    overflow: 'hidden',
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
  selectedColorPreview: {
    borderColor: BORDER_COLOR,
    borderRadius: 14,
    borderWidth: BORDER_WIDTH,
    height: 28,
    width: 28,
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    justifyContent: 'center',
    padding: 20,
  },
  colorButton: {
    alignItems: 'center',
    borderRadius: 22,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  selectedColor: {
    elevation: 6,
    shadowColor: SHADOW_COLOR,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    transform: [{ scale: 1.1 }],
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
  fontSizeInfo: {
    flex: 1,
  },
  fontSizeValue: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  fontSizePreview: {
    fontSize: 12,
    opacity: 0.7,
  },
  fontSizeControls: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
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
  modalOverlay: {
    alignItems: 'center',
    backgroundColor: OVERLAY_BACKGROUND_COLOR,
    flex: 1,
    justifyContent: 'center',
  },
  modalOverlayBackground: {
    backgroundColor: OVERLAY_BACKGROUND_COLOR,
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
  modalHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    width: '100%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  closeButton: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
  },
  scrollContentContainer: {
    flexGrow: 0,
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
  modalContent: {
    borderRadius: 16,
    elevation: 5,
    maxHeight: '80%',
    maxWidth: 350,
    padding: 20,
    shadowColor: SHADOW_COLOR,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    width: '90%',
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  passwordInputContainer: {
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: BORDER_WIDTH,
    flexDirection: 'row',
    height: 48,
    paddingHorizontal: 16,
  },
  passwordInput: {
    flex: 1,
    fontSize: 16,
    height: '100%',
  },
  eyeButton: {
    alignItems: 'center',
    height: 40,
    justifyContent: 'center',
    marginLeft: 8,
    width: 40,
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
  dangerButton: {
    backgroundColor: '#ef4444',
  },
  marginTop12: {
    marginTop: 12,
  },
  versionContainer: {
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 40,
    paddingVertical: 16,
  },
  versionText: {
    fontSize: 14,
    fontWeight: '500',
    opacity: 0.6,
  },
  // Backup Styles
  backupButtonsContainer: {
    gap: 12,
  },
  backupButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: BORDER_WIDTH,
    gap: 16,
  },
  backupButtonTextContainer: {
    flex: 1,
  },
  backupButtonTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  backupButtonDesc: {
    fontSize: 12,
  },
});
