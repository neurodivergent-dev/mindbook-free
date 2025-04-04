// This file is part of Mindbook.
// Mindbook is Privacy Policy and Terms of Service for Mindbook app.
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useTheme } from '../context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useLanguage } from '../context/LanguageContext';

const PolicySection = ({ title, children, theme }) => (
  <View style={styles.section}>
    <Text style={[styles.sectionTitle, { color: theme.text }]}>{title}</Text>
    <Text style={[styles.sectionText, { color: theme.textSecondary }]}>{children}</Text>
  </View>
);

export default function PrivacyScreen() {
  const router = useRouter();
  const { theme, themeColors, accentColor } = useTheme();
  const { t } = useTranslation();
  const { currentLanguage } = useLanguage() as { currentLanguage: string };

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
        <Text style={styles.headerTitle}>{t('privacy.pageTitle')}</Text>
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <Text style={[styles.lastUpdated, { color: theme.textSecondary }]}>
          {t('privacy.lastUpdated')}
        </Text>

        <PolicySection title={t('privacy.overview')} theme={theme}>
          {t('privacy.overviewText')}
        </PolicySection>

        <PolicySection title={t('privacy.dataCollected')} theme={theme}>
          {t('privacy.dataCollectedText')}
        </PolicySection>

        <PolicySection title={t('privacy.endToEndEncryption')} theme={theme}>
          {t('privacy.endToEndEncryptionText')}
        </PolicySection>

        <PolicySection title={t('privacy.dataSecurity')} theme={theme}>
          {t('privacy.dataSecurityText')}
        </PolicySection>

        <PolicySection title={t('privacy.dataStorage')} theme={theme}>
          {t('privacy.dataStorageText')}
          {'\n\n'}• {t('privacy.localStorageInfo')}: {t('privacy.localStorageInfoText')}
          {'\n\n'}• {t('privacy.cloudStorageInfo')}: {t('privacy.cloudStorageInfoText')}
        </PolicySection>

        <PolicySection title={t('privacy.serviceProviders')} theme={theme}>
          {t('privacy.serviceProvidersText')}
          {'\n\n'}• {t('privacy.supabaseInfo')}: {t('privacy.supabaseInfoText')}
        </PolicySection>

        <PolicySection title={t('privacy.securityMeasures')} theme={theme}>
          {t('privacy.securityMeasuresText')}
          {'\n\n'}• {t('privacy.securityMeasuresBullet1')}
          {'\n'}• {t('privacy.securityMeasuresBullet2')}
          {'\n'}• {t('privacy.securityMeasuresBullet3')}
          {'\n'}• {t('privacy.securityMeasuresBullet4')}
          {'\n'}• {t('privacy.securityMeasuresBullet5')}
        </PolicySection>

        <PolicySection title={t('privacy.dataUsage')} theme={theme}>
          {t('privacy.dataUsageText')}
          {'\n\n'}• {t('privacy.dataUsageBullet1')}
          {'\n'}• {t('privacy.dataUsageBullet2')}
          {'\n'}• {t('privacy.dataUsageBullet3')}
        </PolicySection>

        <PolicySection title={t('privacy.userRights')} theme={theme}>
          {t('privacy.userRightsText')}
          {'\n\n'}• {t('privacy.userRightsBullet1')}
          {'\n'}• {t('privacy.userRightsBullet2')}
          {'\n'}• {t('privacy.userRightsBullet3')}
          {'\n'}• {t('privacy.userRightsBullet4')}
          {'\n'}• {t('privacy.userRightsBullet5')}
        </PolicySection>

        <PolicySection title={t('privacy.cookiesTracking')} theme={theme}>
          {t('privacy.cookiesTrackingText')}
        </PolicySection>

        <PolicySection title={t('privacy.childrenPrivacy')} theme={theme}>
          {t('privacy.childrenPrivacyText')}
        </PolicySection>

        <PolicySection title={t('privacy.changes')} theme={theme}>
          {t('privacy.changesText')}
        </PolicySection>

        <PolicySection title={t('privacy.contact')} theme={theme}>
          {t('privacy.contactText')}
        </PolicySection>

        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: theme.textSecondary }]}>
            {currentLanguage === 'tr'
              ? `© ${new Date().getFullYear()} Mindbook. Tüm hakları saklıdır.`
              : `© ${new Date().getFullYear()} Mindbook. All rights reserved.`}
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  closeButton: {
    marginRight: 8,
    padding: 8,
  },
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  footer: {
    alignItems: 'center',
    marginBottom: Platform.OS === 'ios' ? 40 : 20,
    marginTop: 32,
  },
  footerText: {
    fontSize: 14,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    padding: 16,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
  },
  headerTitle: {
    color: '#FFFFFF' as string,
    fontSize: 20,
    fontWeight: '600',
  },
  lastUpdated: {
    fontSize: 14,
    marginBottom: 24,
    textAlign: 'center',
  },
  scrollContent: {
    padding: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionText: {
    fontSize: 15,
    lineHeight: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
  },
});
