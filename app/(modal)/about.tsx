// This file AboutScreen is part of the Mindbook Pro app.
import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
  Platform,
  Dimensions,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useTheme } from '../context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { Logo } from '../../components/Logo';
import { useTranslation } from 'react-i18next';

const APP_VERSION = '4.0.2';
const BUILD_DATE = 'buildDate';
const SCREEN_WIDTH = Dimensions.get('window').width;

const FeatureCard = ({ icon, title, description, color, theme }) => (
  <View style={[styles.featureCard, { backgroundColor: theme.card }]}>
    <View style={[styles.featureIcon, { backgroundColor: color + '20' }]}>
      <Ionicons name={icon} size={24} color={color} />
    </View>
    <Text style={[styles.featureTitle, { color: theme.text }]}>{title}</Text>
    <Text style={[styles.featureDescription, { color: theme.textSecondary }]}>{description}</Text>
  </View>
);

const SocialButton = ({ icon, title, url, color, theme }) => (
  <TouchableOpacity
    style={[styles.socialButton, { backgroundColor: color + '20' }]}
    onPress={() => Linking.openURL(url)}
    activeOpacity={0.7}
  >
    <Ionicons name={icon} size={24} color={color} />
    <Text style={[styles.socialButtonText, { color: theme.text }]}>{title}</Text>
  </TouchableOpacity>
);

export default function AboutScreen() {
  const router = useRouter();
  const { theme, themeColors, accentColor } = useTheme();
  const [showAllFeatures, setShowAllFeatures] = useState(false);
  const { t } = useTranslation();

  const features = [
    {
      icon: 'document-text',
      title: t('about.noteFeature'),
      description: t('about.noteFeatureDesc'),
    },
    {
      icon: 'lock-closed',
      title: t('about.vaultFeature'),
      description: t('about.vaultFeatureDesc'),
    },
    {
      icon: 'color-palette',
      title: t('about.customizationFeature'),
      description: t('about.customizationFeatureDesc'),
    },
    {
      icon: 'folder',
      title: t('about.categoriesFeature'),
      description: t('about.categoriesFeatureDesc'),
    },
    {
      icon: 'archive',
      title: t('about.archiveFeature'),
      description: t('about.archiveFeatureDesc'),
    },
    {
      icon: 'search',
      title: t('about.searchFeature'),
      description: t('about.searchFeatureDesc'),
    },
    {
      icon: 'heart',
      title: t('about.favoritesFeature'),
      description: t('about.favoritesFeatureDesc'),
    },
    {
      icon: 'trash-bin',
      title: t('about.trashFeature'),
      description: t('about.trashFeatureDesc'),
    },
    {
      icon: 'cloud-upload',
      title: t('about.cloudFeature'),
      description: t('about.cloudFeatureDesc'),
    },
    {
      icon: 'language',
      title: t('about.languageFeature'),
      description: t('about.languageFeatureDesc'),
    },
  ];

  const displayedFeatures = showAllFeatures ? features : features.slice(0, 4);

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
        <Text style={styles.headerTitle}>{t('about.pageTitle')}</Text>
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* App Info */}
        <View style={styles.appInfo}>
          <View
            style={[
              styles.logoContainer,
              {
                backgroundColor: themeColors[accentColor] + '15',
                borderWidth: 1 as number,
                borderColor: themeColors[accentColor] + '30',
              },
            ]}
          >
            <Logo
              size={120}
              color={themeColors[accentColor]}
              style={{
                opacity: 1 as number,
                transform: [{ scale: 1 }],
              }}
            />
          </View>
          <Text style={[styles.appName, { color: theme.text }]}>Mindbook Pro</Text>
          <Text style={[styles.appVersion, { color: theme.textSecondary }]}>
            {t('about.version')} {APP_VERSION}
          </Text>
          <Text style={[styles.buildDate, { color: theme.textSecondary }]}>
            {t(`about.${BUILD_DATE}`)}
          </Text>
          <Text style={[styles.appDescription, { color: theme.textSecondary }]}>
            {t('about.appDescription')}
          </Text>
        </View>

        {/* Features */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>{t('about.features')}</Text>
          <View style={styles.featuresGrid}>
            {displayedFeatures.map((feature, index) => (
              <FeatureCard
                key={index}
                icon={feature.icon}
                title={feature.title}
                description={feature.description}
                color={themeColors[accentColor]}
                theme={theme}
              />
            ))}
          </View>
          {features.length > 4 && (
            <TouchableOpacity
              style={[styles.showMoreButton, { backgroundColor: themeColors[accentColor] }]}
              onPress={() => setShowAllFeatures(!showAllFeatures)}
            >
              <Text style={styles.showMoreButtonText}>
                {showAllFeatures ? t('about.showLess') : t('about.showMore')}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Contact & Social */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>
            {t('about.contactSocial')}
          </Text>
          <View style={styles.socialButtons}>
            <SocialButton
              icon="logo-linkedin"
              title={t('about.linkedin')}
              url="https://linkedin.com/in/melihcandemir"
              color="#0A66C2"
              theme={theme}
            />
            <SocialButton
              icon="logo-instagram"
              title={t('about.instagram')}
              url="https://instagram.com/melihcandemir"
              color="#E1306C"
              theme={theme}
            />
            <SocialButton
              icon="logo-github"
              title={t('about.github')}
              url="https://github.com/melihcanndemir"
              color={theme.text}
              theme={theme}
            />
            <SocialButton
              icon="mail"
              title={t('about.email')}
              url="mailto:melihcandemir@protonmail.com"
              color={themeColors[accentColor]}
              theme={theme}
            />
          </View>
        </View>

        {/* Credits */}
        <View style={styles.credits}>
          <Text style={[styles.creditsText, { color: theme.textSecondary }]}>
            {t('about.madeWith')}
          </Text>
          <TouchableOpacity
            style={styles.privacyButton}
            onPress={() => router.push('/(modal)/privacy')}
          >
            <Text style={[styles.privacyButtonText, { color: themeColors[accentColor] }]}>
              {t('about.privacyPolicy')}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

// AboutScreen styles
const styles = StyleSheet.create({
  appDescription: {
    fontSize: 16,
    lineHeight: 24,
    paddingHorizontal: 20,
    textAlign: 'center',
  },
  appInfo: {
    alignItems: 'center',
    marginBottom: 32,
  },
  appName: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 8,
  },
  appVersion: {
    fontSize: 15,
    marginBottom: 12,
  },
  buildDate: {
    fontSize: 14,
    marginBottom: 12,
    marginTop: 4,
    opacity: 0.7,
  },
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
  credits: {
    alignItems: 'center',
    marginBottom: Platform.OS === 'ios' ? 40 : 20,
    marginTop: 16,
  },
  creditsText: {
    fontSize: 14,
    marginBottom: 8,
  },
  featureCard: {
    borderRadius: 16,
    elevation: 2,
    marginBottom: 16,
    marginHorizontal: 8,
    padding: 16,
    shadowColor: '#000' as string,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    width: (SCREEN_WIDTH - 56) / 2,
  },
  featureDescription: {
    fontSize: 14,
    lineHeight: 20,
  },
  featureIcon: {
    alignItems: 'center',
    borderRadius: 12,
    height: 48,
    justifyContent: 'center',
    marginBottom: 12,
    width: 48,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  featuresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginHorizontal: -8,
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
  logoContainer: {
    alignItems: 'center',
    borderRadius: 30,
    height: 120,
    justifyContent: 'center',
    marginBottom: 16,
    padding: 4,
    width: 120,
  },
  privacyButton: {
    padding: 8,
  },
  privacyButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  scrollContent: {
    padding: 20,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 16,
  },
  showMoreButton: {
    alignSelf: 'center',
    borderRadius: 12,
    marginTop: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  showMoreButtonText: {
    color: '#FFFFFF' as string,
    fontSize: 15,
    fontWeight: '600',
  },
  socialButton: {
    alignItems: 'center',
    borderRadius: 12,
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  socialButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
  socialButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
});
